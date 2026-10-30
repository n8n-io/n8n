interface SubmitInput {
	items: Array<{ inputIndex: number; json: Record<string, unknown> }>;
	error?: string;
}

// Hoisted so the module mock factories below can resolve them.
const { submitQueue, submitCapture, promptCapture, mockAgent } = vi.hoisted(() => {
	const submitQueue: SubmitInput[] = [];
	const submitCapture: {
		handler?: (input: SubmitInput) => Promise<string>;
		endsTurn?: (output: unknown) => boolean;
	} = {};
	const promptCapture: { prompts: string[]; replies: string[] } = { prompts: [], replies: [] };

	const mockAgent = {
		tool: vi.fn(function (
			this: unknown,
			builtTool: { _handler?: unknown; _endsTurn?: (output: unknown) => boolean },
		) {
			submitCapture.handler = builtTool._handler as (input: SubmitInput) => Promise<string>;
			submitCapture.endsTurn = builtTool._endsTurn;
			return this;
		}),
		// One generate call submits every queued step, as a model retries in one turn.
		generate: vi.fn(async (prompt: string) => {
			promptCapture.prompts.push(prompt);
			while (submitQueue.length > 0) {
				const reply = await submitCapture.handler!(submitQueue.shift()!);
				promptCapture.replies.push(reply);
				if (reply === 'Accepted.') break;
			}
			return { messages: [] };
		}),
	};

	return { submitQueue, submitCapture, promptCapture, mockAgent };
});

function toolBuilderMock() {
	const built: { _handler?: unknown; _endsTurn?: (output: unknown) => boolean } = {};
	return {
		description: vi.fn().mockReturnThis(),
		input: vi.fn().mockReturnThis(),
		handler: vi.fn(function (this: unknown, h: unknown) {
			built._handler = h;
			return this;
		}),
		endsTurnWhen: vi.fn(function (this: unknown, fn: (output: unknown) => boolean) {
			built._endsTurn = fn;
			return this;
		}),
		build: vi.fn(() => built),
	};
}

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(() => mockAgent),
	extractText: vi.fn(() => ''),
}));

vi.mock('@n8n/agents/tool', () => ({
	Tool: vi.fn().mockImplementation(toolBuilderMock),
}));

import { Tool } from '@n8n/agents/tool';
import { createEvalAgent } from '@n8n/instance-ai';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, OperationalError } from 'n8n-workflow';

import { createNodeRunMockHandler } from '../node-run-mock';

const sendEmail: INode = {
	id: '1',
	name: 'Send Email',
	type: 'n8n-nodes-base.emailSend',
	typeVersion: 2.1,
	position: [0, 0],
	parameters: { toEmail: '={{ $json.email }}', subject: 'Hello' },
};

function contextFor(node: INode, items: INodeExecutionData[]): IExecuteFunctions {
	return {
		getNode: () => node,
		getInputData: () => items,
		getNodeParameter: (name: string, itemIndex: number) =>
			name === 'toEmail' ? items[itemIndex].json.email : node.parameters[name],
	} as unknown as IExecuteFunctions;
}

const twoRecipients: INodeExecutionData[] = [
	{ json: { email: 'ana@example.com' } },
	{ json: { email: 'ben@example.com' } },
];

describe('createNodeRunMockHandler', () => {
	beforeEach(() => {
		submitQueue.length = 0;
		promptCapture.prompts = [];
		promptCapture.replies = [];
		// `restoreMocks: true` wipes factory implementations before each test.
		vi.mocked(createEvalAgent).mockReturnValue(mockAgent as never);
		vi.mocked(Tool).mockImplementation(toolBuilderMock as never);
	});

	it('leaves nodes outside its set to run for real', async () => {
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Other']) });

		expect(await handler(contextFor(sendEmail, twoRecipients))).toBeUndefined();
		expect(mockAgent.generate).not.toHaveBeenCalled();
	});

	it('answers with the real input items and pairs each output item with its input', async () => {
		const onRun = vi.fn();
		const handler = createNodeRunMockHandler({
			nodeNames: new Set(['Send Email']),
			scenarioHints: 'Both emails are delivered.',
			onRun,
		});
		submitQueue.push({
			items: [
				{ inputIndex: 0, json: { accepted: ['ana@example.com'] } },
				{ inputIndex: 1, json: { accepted: ['ben@example.com'] } },
			],
		});

		const output = await handler(contextFor(sendEmail, twoRecipients));

		expect(output).toEqual([
			[
				{ json: { accepted: ['ana@example.com'] }, pairedItem: { item: 0 } },
				{ json: { accepted: ['ben@example.com'] }, pairedItem: { item: 1 } },
			],
		]);
		const prompt = promptCapture.prompts[0];
		expect(prompt).toContain('n8n-nodes-base.emailSend');
		expect(prompt).toContain('"toEmail":"ben@example.com"');
		expect(prompt).toContain('Both emails are delivered.');
		expect(onRun).toHaveBeenCalledWith(
			sendEmail,
			expect.objectContaining({ items: expect.any(Array) }),
			output?.[0],
		);
	});

	it('asks again when an output item names an input item that does not exist', async () => {
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']) });
		submitQueue.push(
			{ items: [{ inputIndex: 5, json: {} }] },
			{ items: [{ inputIndex: 1, json: {} }] },
		);

		const output = await handler(contextFor(sendEmail, twoRecipients));

		expect(promptCapture.replies[0]).toMatch(/^Invalid:/);
		expect(output).toEqual([[{ json: {}, pairedItem: { item: 1 } }]]);
	});

	it('scrubs secret-shaped values in the input items before the model sees them', async () => {
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']) });
		submitQueue.push({ items: [{ inputIndex: 0, json: {} }] });

		await handler(
			contextFor(sendEmail, [
				{ json: { email: 'ana@example.com', note: 'use xoxb-1234567890-abcdef please' } },
			]),
		);

		expect(promptCapture.prompts[0]).not.toContain('xoxb-');
	});

	it('shows only whole input items that fit, and accepts only the indexes it showed', async () => {
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']) });
		const bigItems = [0, 1, 2].map((i) => ({
			json: { email: `user${i}@example.com`, body: 'x'.repeat(10_000) },
		}));
		submitQueue.push(
			{ items: [{ inputIndex: 2, json: {} }] },
			{ items: [{ inputIndex: 1, json: {} }] },
		);

		const output = await handler(contextFor(sendEmail, bigItems));

		const prompt = promptCapture.prompts[0];
		expect(prompt).toContain('user1@example.com');
		expect(prompt).not.toContain('user2@example.com');
		expect(promptCapture.replies[0]).toMatch(/^Invalid:/);
		expect(output).toEqual([[{ json: {}, pairedItem: { item: 1 } }]]);
	});

	it('shows parameters that are the same for every item once, so more items fit', async () => {
		const newsletter: INode = {
			...sendEmail,
			parameters: { ...sendEmail.parameters, html: `<p>${'trends '.repeat(500)}</p>` },
		};
		const recipients = Array.from({ length: 20 }, (_, i) => ({
			json: { email: `user${i}@example.com` },
		}));
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']) });
		submitQueue.push({ items: [{ inputIndex: 19, json: {} }] });

		await handler(contextFor(newsletter, recipients));

		const prompt = promptCapture.prompts[0];
		expect(prompt).toContain('user19@example.com');
		expect(prompt).not.toContain('fit in this message');
		expect(prompt.split('<p>trends').length - 1).toBe(1);
	});

	it.each([
		[1.2, { chatInput: 'Ship it', sessionId: 's1' }],
		[1.1, { data: { chatInput: 'Ship it', sessionId: 's1' } }],
	])(
		'gives a Chat node v%s its reply layout and passes the reply through as submitted',
		async (typeVersion, reply) => {
			const chat: INode = {
				id: '2',
				name: 'Ask In Chat',
				type: '@n8n/n8n-nodes-langchain.chat',
				typeVersion,
				position: [0, 0],
				parameters: { operation: 'sendAndWait', message: 'Ship it?', responseType: 'freeText' },
			};
			const handler = createNodeRunMockHandler({ nodeNames: new Set(['Ask In Chat']) });
			submitQueue.push({ items: [{ inputIndex: 0, json: reply }] });

			const output = await handler(contextFor(chat, [{ json: {} }]));

			const { instructions } = vi.mocked(createEvalAgent).mock.calls[0][1];
			expect(instructions).toMatch(/n8n-nodes-langchain\.chat[\s\S]*1\.2 or later[\s\S]*chatInput/);
			expect(promptCapture.prompts[0]).toContain(
				`@n8n/n8n-nodes-langchain.chat, version ${typeVersion}`,
			);
			expect(output).toEqual([[{ json: reply, pairedItem: { item: 0 } }]]);
		},
	);

	it('shows a varying parameter whose name is an inherited object key', async () => {
		const node: INode = {
			...sendEmail,
			parameters: { constructor: '={{ $json.email }}', subject: 'Hello' },
		};
		const context = {
			getNode: () => node,
			getInputData: () => twoRecipients,
			getNodeParameter: (name: string, itemIndex: number) =>
				name === 'constructor' ? twoRecipients[itemIndex].json.email : node.parameters[name],
		} as unknown as IExecuteFunctions;
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']) });
		submitQueue.push({ items: [{ inputIndex: 0, json: {} }] });

		await handler(context);

		expect(promptCapture.prompts[0]).toContain('"constructor":"ana@example.com"');
		expect(promptCapture.prompts[0]).toContain('"constructor":"ben@example.com"');
	});

	it('ends the model loop once the output is accepted, but not after a rejection', async () => {
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']) });
		submitQueue.push({ items: [{ inputIndex: 0, json: {} }] });
		await handler(contextFor(sendEmail, twoRecipients));

		expect(submitCapture.endsTurn?.('Accepted.')).toBe(true);
		expect(submitCapture.endsTurn?.('Invalid: inputIndex 5 is out of range 0-1.')).toBe(false);
	});

	it('fails the node with the service error that the scenario asks for', async () => {
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']) });
		submitQueue.push({ items: [], error: '550 Mailbox unavailable' });

		const run = handler(contextFor(sendEmail, twoRecipients));

		await expect(run).rejects.toThrow(NodeOperationError);
		await expect(run).rejects.toThrow('550 Mailbox unavailable');
	});

	it('reports a mock failure when the model submits no output', async () => {
		const onRun = vi.fn();
		const handler = createNodeRunMockHandler({ nodeNames: new Set(['Send Email']), onRun });

		await expect(handler(contextFor(sendEmail, twoRecipients))).rejects.toThrow(OperationalError);
		expect(onRun).toHaveBeenCalledWith(
			sendEmail,
			expect.anything(),
			expect.objectContaining({ _evalMockError: true }),
		);
	});
});
