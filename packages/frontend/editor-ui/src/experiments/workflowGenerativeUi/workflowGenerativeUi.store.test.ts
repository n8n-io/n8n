import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { GenerateSpecError, generateSpec, validateSpecStructure } from './generate';
import { buildFallbackSpec, useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';
import { buildWorkflowUiPayload } from './workflowPayload';

vi.mock('@n8n/composables/useStorage', () => ({
	useStorage: () => ref('test-api-key'),
}));

vi.mock('./generate', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./generate')>();
	return {
		...actual,
		generateSpec: vi.fn(),
	};
});

const workflow = {
	id: 'workflow-1',
	name: 'Lead flow',
	nodes: [
		{
			id: 'node-1',
			name: 'Send lead',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			parameters: { method: 'POST' },
		},
	],
	connections: {},
};

const compliantSpec = {
	root: 'screen',
	elements: {
		screen: {
			type: 'Screen',
			props: { title: 'Lead flow', summary: 'Routes incoming leads.' },
			children: ['board'],
		},
		board: { type: 'GuidedTimeline', props: {}, children: ['s1', 's2', 's3'] },
		s1: { type: 'Group', props: { title: 'Intake' }, children: [] },
		s2: { type: 'Group', props: { title: 'Process' }, children: [] },
		s3: { type: 'Group', props: { title: 'Deliver' }, children: [] },
	},
};

describe('useWorkflowGenerativeUiStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(generateSpec).mockReset();
	});

	it('keeps the rendered spec and surfaces the error when a follow-up fails', async () => {
		vi.mocked(generateSpec)
			.mockResolvedValueOnce(compliantSpec)
			.mockRejectedValueOnce(new GenerateSpecError('request-failed', 'Request failed'));
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		await store.setView('story');

		await store.followUp('Make it shorter');

		expect(store.activeSpec).toEqual(compliantSpec);
		expect(store.error).toBe('generate-failed');
	});

	it('surfaces the detail of a failure that is not a spec error', async () => {
		vi.mocked(generateSpec).mockRejectedValueOnce(new TypeError('Failed to fetch'));
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);

		await store.setView('story');

		expect(store.error).toBe('generate-failed');
		expect(store.errorDetail).toBe('Failed to fetch');
	});

	it('stores parsed catalog data instead of raw generated props', async () => {
		vi.mocked(generateSpec).mockResolvedValue({
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: {
						title: 'Lead flow',
						summary: 'Routes incoming leads.',
						untrustedStyle: 'position: fixed',
					},
					children: ['board'],
				},
				board: { type: 'GuidedTimeline', props: {}, children: ['s1', 's2', 's3'] },
				s1: { type: 'Group', props: { title: 'Intake' }, children: [] },
				s2: { type: 'Group', props: { title: 'Process' }, children: [] },
				s3: { type: 'Group', props: { title: 'Deliver' }, children: [] },
			},
		});
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);

		await store.setView('story');

		expect(store.activeSpec).toEqual(compliantSpec);
	});

	it('falls back when an initial generated spec fails structural validation', async () => {
		vi.mocked(generateSpec).mockResolvedValue({
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Lead flow', summary: 'Routes incoming leads.' },
					children: [],
				},
			},
		});
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);

		await store.setView('story');

		expect(store.error).toBe('generate-failed');
		expect(store.activeSpec).toMatchObject({
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { summary: 'A plain list of every step in Lead flow.' },
				},
			},
		});
	});

	it('preserves the previous spec when a follow-up fails structural validation', async () => {
		vi.mocked(generateSpec)
			.mockResolvedValueOnce(compliantSpec)
			.mockResolvedValueOnce({
				root: 'screen',
				elements: {
					screen: {
						type: 'Screen',
						props: { title: 'Missing archetype', summary: 'No archetype here.' },
						children: ['step'],
					},
					step: {
						type: 'Step',
						props: { title: 'Send lead', summary: 'Posts the lead', nodeId: 'node-1' },
						children: [],
					},
				},
			});
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		await store.setView('story');

		await store.followUp('Make it shorter');

		expect(store.error).toBe('generate-failed');
		expect(store.activeSpec).toEqual(compliantSpec);
	});

	it('preserves the previous spec when regeneration fails structural validation', async () => {
		vi.mocked(generateSpec)
			.mockResolvedValueOnce(compliantSpec)
			.mockResolvedValueOnce({
				root: 'screen',
				elements: {
					screen: {
						type: 'Screen',
						props: { title: 'Missing summary' },
						children: [],
					},
				},
			});
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		await store.setView('story');

		await store.regenerate();

		expect(store.error).toBe('generate-failed');
		expect(store.activeSpec).toEqual(compliantSpec);
	});

	it('keeps the generated view after the workflow is edited', async () => {
		vi.mocked(generateSpec).mockResolvedValue(compliantSpec);
		const edited = { ...workflow, nodes: [...workflow.nodes] };
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => edited);
		await store.setView('story');
		expect(generateSpec).toHaveBeenCalledTimes(1);

		edited.nodes.push({
			id: 'node-2',
			name: 'Notify sales',
			type: 'n8n-nodes-base.slack',
			typeVersion: 1,
			parameters: { method: 'GET' },
		});
		await store.setView('canvas');
		await store.setView('story');

		expect(generateSpec).toHaveBeenCalledTimes(1);
		expect(store.activeSpec).toEqual(compliantSpec);
	});

	it('reports staleness after an edit and clears it on regeneration', async () => {
		vi.mocked(generateSpec).mockResolvedValue(compliantSpec);
		const nodes = ref([...workflow.nodes]);
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => ({ ...workflow, nodes: nodes.value }));
		await store.setView('story');
		expect(store.isStale).toBe(false);

		nodes.value = [
			...nodes.value,
			{
				id: 'node-2',
				name: 'Notify sales',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				parameters: { method: 'GET' },
			},
		];
		expect(store.isStale).toBe(true);

		await store.regenerate();

		expect(store.isStale).toBe(false);
	});

	it('does not reuse one workflow view for another workflow', async () => {
		vi.mocked(generateSpec).mockResolvedValue(compliantSpec);
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		await store.setView('story');

		store.setWorkflowGetter(() => ({ ...workflow, id: 'workflow-2' }));
		await store.setView('canvas');
		await store.setView('story');

		expect(generateSpec).toHaveBeenCalledTimes(2);
	});

	it('regenerates only when asked, even though the workflow is unchanged', async () => {
		vi.mocked(generateSpec).mockResolvedValue(compliantSpec);
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		await store.setView('story');

		await store.regenerate();

		expect(generateSpec).toHaveBeenCalledTimes(2);
	});

	it('uses an archetype fallback and surfaces the error when a follow-up has no previous spec', async () => {
		vi.mocked(generateSpec).mockRejectedValue(
			new GenerateSpecError('invalid-response', 'Invalid response'),
		);
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		store.view = 'play';

		await store.followUp('Make it shorter');

		expect(store.error).toBe('generate-failed');
		expect(store.activeSpec).toEqual({
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: {
						title: 'Lead flow',
						summary: 'A plain list of every step in Lead flow.',
					},
					children: ['archetype'],
				},
				archetype: {
					type: 'GuidedTimeline',
					props: {},
					children: ['section-0', 'section-1', 'section-2'],
				},
				'section-0': {
					type: 'Group',
					props: { title: 'Stage 1' },
					children: ['step-0'],
				},
				'step-0': {
					type: 'Step',
					props: {
						title: 'Send lead',
						summary: 'n8n-nodes-base.httpRequest',
						nodeId: 'node-1',
					},
					on: {
						press: {
							action: 'openNode',
							params: { nodeId: 'node-1' },
						},
					},
					children: [],
				},
				'section-1': {
					type: 'Group',
					props: { title: 'Stage 2' },
					children: [],
				},
				'section-2': {
					type: 'Group',
					props: { title: 'Stage 3' },
					children: [],
				},
			},
		});
	});
});

describe('buildFallbackSpec', () => {
	it('produces an archetype-compliant spec that passes structural validation', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Ops flow',
			nodes: [
				{
					id: 'a',
					name: 'Trigger',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					parameters: {},
				},
				{ id: 'b', name: 'Process', type: 'n8n-nodes-base.set', typeVersion: 1, parameters: {} },
				{ id: 'c', name: 'Notify', type: 'n8n-nodes-base.slack', typeVersion: 1, parameters: {} },
			],
			connections: {
				Trigger: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
				Process: { main: [[{ node: 'Notify', type: 'main', index: 0 }]] },
			},
		});

		const spec = buildFallbackSpec(payload);

		expect(spec.root).toBe('screen');
		expect(spec.elements.archetype.type).toBe('GuidedTimeline');
		expect(spec.elements.archetype.children).toHaveLength(3);
		expect(() => validateSpecStructure(spec, payload)).not.toThrow();
	});

	it('chooses a branching archetype when the graph branches', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Branch flow',
			nodes: [
				{ id: 'a', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 1, parameters: {} },
				{ id: 'b', name: 'Yes', type: 'n8n-nodes-base.set', typeVersion: 1, parameters: {} },
				{ id: 'c', name: 'No', type: 'n8n-nodes-base.set', typeVersion: 1, parameters: {} },
			],
			connections: {
				IF: {
					main: [
						[{ node: 'Yes', type: 'main', index: 0 }],
						[{ node: 'No', type: 'main', index: 1 }],
					],
				},
			},
		});

		const spec = buildFallbackSpec(payload);

		expect(spec.elements.archetype.type).toBe('AdaptiveStoryboard');
	});

	it.each([0, 1, 2])('produces three valid sections for %i nodes', (nodeCount) => {
		const payload = buildWorkflowUiPayload({
			name: 'Small flow',
			nodes: Array.from({ length: nodeCount }, (_, index) => ({
				id: `node-${index}`,
				name: `Node ${index}`,
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				parameters: {},
			})),
			connections: {},
		});

		const spec = buildFallbackSpec(payload);

		expect(spec.elements.archetype.children).toHaveLength(3);
		expect(() => validateSpecStructure(spec, payload)).not.toThrow();
	});
});
