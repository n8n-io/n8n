import {
	GenerateSpecError,
	generateSpec,
	validateGeneratedSpec,
	validateSpecStructure,
} from './generate';
import { buildWorkflowUiPayload, type WorkflowUiPayload } from './workflowPayload';

const payload: WorkflowUiPayload = {
	name: 'Lead flow',
	nodes: [],
	connections: [],
};

describe('generateSpec', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('parses the generated spec and sends the API key', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				content: [
					{
						type: 'text',
						text: '{"root":"s","elements":{"s":{"type":"Screen","props":{}}}}',
					},
				],
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await generateSpec({
			apiKey: 'test-api-key',
			view: 'story',
			payload,
		});

		expect(result).toEqual({
			root: 's',
			elements: {
				s: {
					type: 'Screen',
					props: {},
				},
			},
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'/dev/anthropic',
			expect.objectContaining({
				headers: expect.objectContaining({ 'x-api-key': 'test-api-key' }),
			}),
		);
	});

	it('parses a fenced JSON response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					content: [
						{
							type: 'text',
							text: '```json\n{"root":"screen","elements":{}}\n```',
						},
					],
				}),
			}),
		);

		await expect(
			generateSpec({
				apiKey: 'test-api-key',
				view: 'play',
				payload,
			}),
		).resolves.toEqual({ root: 'screen', elements: {} });
	});

	it('throws a typed unauthorized error for an HTTP 401 response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
			}),
		);

		const request = generateSpec({
			apiKey: 'test-api-key',
			view: 'story',
			payload,
		});

		await expect(request).rejects.toBeInstanceOf(GenerateSpecError);
		await expect(request).rejects.toMatchObject({ code: 'unauthorized' });
	});

	it('compiles a SpecStream patch response into a spec', async () => {
		const stream = [
			'{"op":"add","path":"/root","value":"screen"}',
			'{"op":"add","path":"/elements/screen","value":{"type":"Screen","props":{"title":"Leads"},"children":["beat"]}}',
			'{"op":"add","path":"/elements/beat","value":{"type":"Step","props":{"title":"Send email"},"children":[]}}',
		].join('\n');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					stop_reason: 'end_turn',
					content: [{ type: 'text', text: stream }],
				}),
			}),
		);

		await expect(generateSpec({ apiKey: 'test-api-key', view: 'story', payload })).resolves.toEqual(
			{
				root: 'screen',
				elements: {
					screen: { type: 'Screen', props: { title: 'Leads' }, children: ['beat'] },
					beat: { type: 'Step', props: { title: 'Send email' }, children: [] },
				},
			},
		);
	});

	it('applies a follow-up SpecStream patch onto the current spec', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					stop_reason: 'end_turn',
					content: [
						{
							type: 'text',
							text: '{"op":"replace","path":"/elements/screen/props/title","value":"Renamed"}',
						},
					],
				}),
			}),
		);

		const currentSpec = {
			root: 'screen',
			elements: { screen: { type: 'Screen', props: { title: 'Leads' }, children: [] } },
		};

		await expect(
			generateSpec({
				apiKey: 'test-api-key',
				view: 'story',
				payload,
				currentSpec,
				instruction: 'rename it',
			}),
		).resolves.toEqual({
			root: 'screen',
			elements: { screen: { type: 'Screen', props: { title: 'Renamed' }, children: [] } },
		});
		expect(currentSpec.elements.screen.props.title).toBe('Leads');
	});

	it('reads the text block when a thinking block comes first', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					stop_reason: 'end_turn',
					content: [
						{ type: 'thinking', thinking: 'planning the spec' },
						{ type: 'text', text: '{"root":"screen","elements":{}}' },
					],
				}),
			}),
		);

		await expect(generateSpec({ apiKey: 'test-api-key', view: 'story', payload })).resolves.toEqual(
			{ root: 'screen', elements: {} },
		);
	});

	it('reports a truncated response instead of a JSON parse failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					stop_reason: 'max_tokens',
					content: [{ type: 'text', text: '{"root":"screen","eleme' }],
				}),
			}),
		);

		const request = generateSpec({ apiKey: 'test-api-key', view: 'story', payload });

		await expect(request).rejects.toMatchObject({
			code: 'invalid-response',
			message: 'Anthropic hit the output token limit before finishing the spec',
		});
	});

	it('extracts the JSON object when the model wraps it in prose', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					stop_reason: 'end_turn',
					content: [
						{
							type: 'text',
							text: 'Here is the spec:\n{"root":"screen","elements":{}}\nHope that helps.',
						},
					],
				}),
			}),
		);

		await expect(generateSpec({ apiKey: 'test-api-key', view: 'story', payload })).resolves.toEqual(
			{ root: 'screen', elements: {} },
		);
	});

	it('carries the Anthropic error message as the failure detail', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: vi.fn().mockResolvedValue({
					type: 'error',
					error: { type: 'authentication_error', message: 'invalid x-api-key' },
				}),
			}),
		);

		const request = generateSpec({
			apiKey: 'test-api-key',
			view: 'story',
			payload,
		});

		await expect(request).rejects.toMatchObject({
			code: 'unauthorized',
			detail: 'invalid x-api-key',
		});
	});

	it('throws a typed invalid response error for malformed JSON', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					content: [{ type: 'text', text: '{not-json}' }],
				}),
			}),
		);

		const request = generateSpec({
			apiKey: 'test-api-key',
			view: 'story',
			payload,
		});

		await expect(request).rejects.toBeInstanceOf(GenerateSpecError);
		await expect(request).rejects.toMatchObject({ code: 'invalid-response' });
	});
});

function specWithPressBinding(
	press: unknown = { action: 'openNode', params: { nodeId: 'node-1' } },
) {
	return {
		root: 'screen',
		elements: {
			screen: {
				type: 'Screen',
				props: { title: 'Lead flow', summary: 'Routes incoming leads.' },
				children: ['step'],
			},
			step: {
				type: 'Step',
				props: { title: 'Send lead', summary: 'Posts the lead', nodeId: 'node-1' },
				on: { press },
				children: [],
			},
		},
	};
}

describe('validateGeneratedSpec', () => {
	it('returns parsed catalog data with unknown props stripped', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: {
						title: 'Lead flow',
						summary: 'Routes incoming leads.',
						untrustedStyle: 'position: fixed',
					},
					children: [],
				},
			},
		};

		expect(validateGeneratedSpec(spec)).toEqual({
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: {
						title: 'Lead flow',
						summary: 'Routes incoming leads.',
					},
					children: [],
				},
			},
		});
	});

	it('rejects specs that fail catalog validation', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Lead flow' },
					children: [],
				},
			},
		};

		expect(() => validateGeneratedSpec(spec)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({
				code: 'invalid-response',
			}),
		);
	});

	it('accepts a schedule When trigger that omits app', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Daily report', summary: 'Runs every morning.' },
					children: ['when-8am'],
				},
				'when-8am': {
					type: 'When',
					props: { kind: 'schedule', summary: 'Every day at 8am', nodeId: 'node-1' },
					children: [],
				},
			},
		};

		expect(() => validateGeneratedSpec(spec)).not.toThrow();
	});

	it('accepts a leaf element that omits children', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Daily report', summary: 'Runs every morning.' },
					children: ['filter-text'],
				},
				'filter-text': { type: 'Text', props: { text: 'Only unhealthy runs continue.' } },
			},
		};

		const parsed = validateGeneratedSpec(spec);

		expect(parsed.elements['filter-text'].children).toEqual([]);
	});

	it('accepts an element that omits props', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Daily report', summary: 'Runs every morning.' },
					children: ['board'],
				},
				board: { type: 'OutcomeBoard', children: [] },
			},
		};

		const parsed = validateGeneratedSpec(spec);

		expect(parsed.elements.board.props).toEqual({});
	});

	it('keeps the rest of the view when one element has an invalid prop', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Invoices', summary: 'Chases overdue invoices.' },
					children: ['good', 'bad'],
				},
				good: { type: 'Text', props: { text: 'This one is fine.' }, children: [] },
				bad: {
					type: 'Email',
					props: { title: 'Chase the customer', nodeId: 'node-7' },
					children: [],
				},
			},
		};

		const parsed = validateGeneratedSpec(spec);

		expect(parsed.elements.good.type).toBe('Text');
		expect(parsed.elements.bad.type).toBe('Step');
		expect(parsed.elements.bad.props.title).toBe('Chase the customer');
	});

	it('keeps the node binding on a degraded element', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Invoices', summary: 'Chases overdue invoices.' },
					children: ['bad'],
				},
				bad: {
					type: 'Email',
					props: { title: 'Chase the customer', nodeId: 'node-7' },
					children: [],
				},
			},
		};

		const parsed = validateGeneratedSpec(spec);

		expect(parsed.elements.bad.on).toEqual({
			press: { action: 'openNode', params: { nodeId: 'node-7' } },
		});
	});

	it('still fails when the screen itself is invalid', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: { type: 'Screen', props: { title: 'Invoices' }, children: [] },
			},
		};

		expect(() => validateGeneratedSpec(spec)).toThrow(GenerateSpecError);
	});

	it('binds press to openNode for an element that names a node', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Daily report', summary: 'Runs every morning.' },
					children: ['step'],
				},
				step: {
					type: 'Step',
					props: { title: 'Send email', summary: 'Emails the customer.', nodeId: 'node-1' },
					children: [],
				},
			},
		};

		const parsed = validateGeneratedSpec(spec);

		expect(parsed.elements.step.on).toEqual({
			press: { action: 'openNode', params: { nodeId: 'node-1' } },
		});
	});

	it('leaves an element without a nodeId unbound', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Daily report', summary: 'Runs every morning.' },
					children: ['note'],
				},
				note: { type: 'Text', props: { text: 'Nothing to open here.' }, children: [] },
			},
		};

		const parsed = validateGeneratedSpec(spec);

		expect(parsed.elements.note.on).toBeUndefined();
	});

	it('keeps a press binding the model already supplied', () => {
		const spec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Daily report', summary: 'Runs every morning.' },
					children: ['step'],
				},
				step: {
					type: 'Step',
					props: { title: 'Send email', summary: 'Emails the customer.', nodeId: 'node-1' },
					children: [],
					on: { press: { action: 'openNode', params: { nodeId: 'node-2' } } },
				},
			},
		};

		const parsed = validateGeneratedSpec(spec);

		expect(parsed.elements.step.on).toEqual({
			press: { action: 'openNode', params: { nodeId: 'node-2' } },
		});
	});

	it('preserves an openNode press binding', () => {
		const parsed = validateGeneratedSpec(specWithPressBinding());

		expect(parsed.elements.step.on).toEqual({
			press: { action: 'openNode', params: { nodeId: 'node-1' } },
		});
	});

	it('strips unknown keys from an event binding', () => {
		const parsed = validateGeneratedSpec(
			specWithPressBinding({
				action: 'openNode',
				params: { nodeId: 'node-1' },
				injectedScript: 'alert(1)',
			}),
		);

		expect(parsed.elements.step.on).toEqual({
			press: { action: 'openNode', params: { nodeId: 'node-1' } },
		});
	});

	it('rejects an event binding without an action', () => {
		expect(() =>
			validateGeneratedSpec(specWithPressBinding({ params: { nodeId: 'node-1' } })),
		).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({
				code: 'invalid-response',
			}),
		);
	});
});

const canvasPayload = buildWorkflowUiPayload({
	name: 'Ops flow',
	nodes: [
		{ id: 'a', name: 'A', type: 'trigger', typeVersion: 1, parameters: {} },
		{ id: 'b', name: 'B', type: 'action', typeVersion: 1, parameters: {} },
	],
	connections: {
		A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
	},
});

type Element = {
	type: string;
	props?: Record<string, unknown>;
	children?: string[];
};

function specFrom(elements: Record<string, Element>) {
	return { root: 'screen', elements };
}

function archetypeSpec(overrides: Record<string, Element> = {}, sectionIds?: string[]) {
	const ids = sectionIds ?? ['sec-1', 'sec-2', 'sec-3'];
	const defaults: Record<string, Element> = {};
	for (const id of ids) {
		if (!(id in overrides)) {
			defaults[id] = { type: 'Group', props: { title: id }, children: [] };
		}
	}
	return specFrom({
		screen: {
			type: 'Screen',
			props: { title: 'Ops flow', summary: 'What it does.' },
			children: ['board'],
		},
		board: { type: 'OutcomeBoard', props: {}, children: ids },
		...defaults,
		...overrides,
	});
}

describe('validateSpecStructure', () => {
	it('accepts a short workflow that yields only two sections', () => {
		const spec = archetypeSpec({}, ['sec-1', 'sec-2']);

		expect(() => validateSpecStructure(spec, canvasPayload)).not.toThrow();
	});

	it('rejects an archetype with no sections', () => {
		const spec = archetypeSpec({}, []);

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({
				detail: 'Archetype must have at least one section',
			}),
		);
	});

	it('accepts a derived-only canvas without explicit connections', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['n-a', 'n-b'] },
			'n-a': { type: 'FlowNode', props: { nodeId: 'a' }, children: [] },
			'n-b': { type: 'FlowNode', props: { nodeId: 'b' }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).not.toThrow();
	});

	it('accepts an explicit connection that matches the normalized payload', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['n-a', 'n-b', 'edge'] },
			'n-a': { type: 'FlowNode', props: { nodeId: 'a' }, children: [] },
			'n-b': { type: 'FlowNode', props: { nodeId: 'b' }, children: [] },
			edge: {
				type: 'FlowConnection',
				props: { fromNodeId: 'a', toNodeId: 'b', type: 'main', outputIndex: 0 },
				children: [],
			},
		});

		expect(() => validateGeneratedSpec(spec, canvasPayload)).not.toThrow();
	});

	it('rejects an invented explicit connection', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['n-a', 'n-b', 'edge'] },
			'n-a': { type: 'FlowNode', props: { nodeId: 'a' }, children: [] },
			'n-b': { type: 'FlowNode', props: { nodeId: 'b' }, children: [] },
			edge: {
				type: 'FlowConnection',
				props: { fromNodeId: 'a', toNodeId: 'b', type: 'main', outputIndex: 3 },
				children: [],
			},
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects a connection whose endpoint is missing from the canvas', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['n-a', 'edge'] },
			'n-a': { type: 'FlowNode', props: { nodeId: 'a' }, children: [] },
			edge: {
				type: 'FlowConnection',
				props: { fromNodeId: 'a', toNodeId: 'b', type: 'main', outputIndex: 0 },
				children: [],
			},
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects a nested FlowCanvas', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['inner'] },
			inner: { type: 'FlowCanvas', props: {}, children: ['n-a'] },
			'n-a': { type: 'FlowNode', props: { nodeId: 'a' }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects a FlowCanvas directly under the archetype', () => {
		const spec = archetypeSpec(
			{
				canvas: { type: 'FlowCanvas', props: {}, children: ['n-a'] },
				'n-a': { type: 'FlowNode', props: { nodeId: 'a' }, children: [] },
			},
			['canvas', 'sec-2', 'sec-3'],
		);

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects a FlowNode referencing an unknown node id', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['n-x'] },
			'n-x': { type: 'FlowNode', props: { nodeId: 'ghost' }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects a FlowNode that sets both nodeId and nodeIds', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['n-a'] },
			'n-a': { type: 'FlowNode', props: { nodeId: 'a', nodeIds: ['b'] }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects duplicate explicit edges', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['canvas'] },
			canvas: { type: 'FlowCanvas', props: {}, children: ['n-a', 'n-b', 'edge-1', 'edge-2'] },
			'n-a': { type: 'FlowNode', props: { nodeId: 'a' }, children: [] },
			'n-b': { type: 'FlowNode', props: { nodeId: 'b' }, children: [] },
			'edge-1': {
				type: 'FlowConnection',
				props: { fromNodeId: 'a', toNodeId: 'b', type: 'main', outputIndex: 0 },
				children: [],
			},
			'edge-2': {
				type: 'FlowConnection',
				props: { fromNodeId: 'a', toNodeId: 'b', type: 'main', outputIndex: 0 },
				children: [],
			},
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects a spec without an archetype under Screen', () => {
		const spec = specFrom({
			screen: {
				type: 'Screen',
				props: { title: 'Ops flow', summary: 'What it does.' },
				children: [],
			},
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects more than one archetype', () => {
		const spec = specFrom({
			screen: {
				type: 'Screen',
				props: { title: 'Ops flow', summary: 'What it does.' },
				children: ['board'],
			},
			board: { type: 'OutcomeBoard', props: {}, children: ['sec-1', 'sec-2', 'sec-3'] },
			'sec-1': { type: 'GuidedTimeline', props: {}, children: [] },
			'sec-2': { type: 'Group', props: { title: 'B' }, children: [] },
			'sec-3': { type: 'Group', props: { title: 'C' }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('rejects forbidden presentation props', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow', x: 12 }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('accepts a Hero alongside the archetype under Screen', () => {
		const spec = specFrom({
			screen: {
				type: 'Screen',
				props: { title: 'Ops flow', summary: 'What it does.' },
				children: ['hero', 'board'],
			},
			hero: { type: 'Hero', props: { title: 'Keeps the service healthy' }, children: [] },
			board: { type: 'OutcomeBoard', props: {}, children: ['sec-1', 'sec-2', 'sec-3'] },
			'sec-1': { type: 'Group', props: { title: 'Detect' }, children: [] },
			'sec-2': { type: 'Group', props: { title: 'Recover' }, children: [] },
			'sec-3': { type: 'Group', props: { title: 'Report' }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).not.toThrow();
	});

	it('rejects an archetype that is not a direct child of Screen', () => {
		const spec = specFrom({
			screen: {
				type: 'Screen',
				props: { title: 'Ops flow', summary: 'What it does.' },
				children: ['wrapper'],
			},
			wrapper: { type: 'Group', props: { title: 'Wrapper' }, children: ['board'] },
			board: { type: 'OutcomeBoard', props: {}, children: ['sec-1', 'sec-2', 'sec-3'] },
			'sec-1': { type: 'Group', props: { title: 'Detect' }, children: [] },
			'sec-2': { type: 'Group', props: { title: 'Recover' }, children: [] },
			'sec-3': { type: 'Group', props: { title: 'Report' }, children: [] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});

	it('accepts a catalog prop that shares a name with a presentation prop', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['transfer'] },
			transfer: {
				type: 'FileTransfer',
				props: { direction: 'upload', app: 'Drive', path: '/reports/latest.csv', nodeId: 'a' },
				children: [],
			},
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).not.toThrow();
	});

	it('rejects cyclic element graphs', () => {
		const spec = archetypeSpec({
			'sec-1': { type: 'Group', props: { title: 'Flow' }, children: ['cycle'] },
			cycle: { type: 'Group', props: { title: 'Cycle' }, children: ['sec-1'] },
		});

		expect(() => validateSpecStructure(spec, canvasPayload)).toThrowError(
			expect.objectContaining<Partial<GenerateSpecError>>({ code: 'invalid-response' }),
		);
	});
});
