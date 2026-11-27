import { createPlanLlm, type HydrationModel } from '../hydration-llm';

const created: Array<{
	name: string;
	modelConfig?: unknown;
	fetch?: unknown;
	instructions?: string;
	tools: Array<{ name: string; handler: (input: unknown) => Promise<unknown> }>;
	generateArgs?: unknown[];
}> = [];
let messages: unknown[] = [];

vi.mock('@n8n/agents', () => {
	class Agent {
		state: (typeof created)[number];
		constructor(name: string) {
			this.state = { name, tools: [] };
			created.push(this.state);
		}
		model(config: unknown) {
			this.state.modelConfig = config;
			return this;
		}
		modelFetch(fetch: unknown) {
			this.state.fetch = fetch;
			return this;
		}
		instructions(text: string) {
			this.state.instructions = text;
			return this;
		}
		tool(built: { name: string; handler: (input: unknown) => Promise<unknown> }) {
			this.state.tools.push(built);
			return this;
		}
		async generate(...args: unknown[]) {
			this.state.generateArgs = args;
			return { messages };
		}
	}
	class Tool {
		built: { name: string; handler?: (input: unknown) => Promise<unknown> };
		constructor(name: string) {
			this.built = { name };
		}
		description() {
			return this;
		}
		input() {
			return this;
		}
		handler(fn: (input: unknown) => Promise<unknown>) {
			this.built.handler = fn;
			return this;
		}
		build() {
			return this.built;
		}
	}
	return { Agent, Tool };
});

describe('hydration LLM adapters', () => {
	const config = { id: 'model-1' };
	const fetch = vi.fn();
	const model: HydrationModel = { resolve: async () => config as never, fetch: fetch as never };

	beforeEach(() => {
		created.length = 0;
		messages = [];
	});

	describe('createPlanLlm', () => {
		it('should run one model turn with the model and fetch of the agent under test', async () => {
			messages = [
				{ role: 'user', content: [{ type: 'text', text: 'ignored' }] },
				{ role: 'assistant', content: [{ type: 'text', text: 'first' }] },
				{
					role: 'assistant',
					content: [
						{ type: 'text', text: '{"over' },
						{ type: 'tool-call', toolName: 'x' },
						{ type: 'text', text: 'lay":{}}' },
					],
				},
			];
			const answer = await createPlanLlm(model)({ instructions: 'be exact', prompt: 'plan it' });
			expect(answer).toBe('{"overlay":{}}');
			expect(created[0]).toMatchObject({
				modelConfig: config,
				fetch,
				instructions: 'be exact',
				generateArgs: ['plan it', { maxIterations: 1 }],
			});
		});

		it('should return an empty answer when the model gave no assistant text', async () => {
			messages = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }];
			expect(await createPlanLlm(model)({ instructions: '', prompt: '' })).toBe('');
		});

		it('should not set a fetch when the model has none', async () => {
			await createPlanLlm({ resolve: async () => config as never })({
				instructions: '',
				prompt: '',
			});
			expect(created[0].fetch).toBeUndefined();
		});
	});
});
