// Integration tests that wire `bindNativeOutputSchema` against real
// `ChatAnthropic` and `ChatOpenAI` instances from `@langchain/anthropic` and
// `@langchain/openai`. These verify that the mutation actually flows through
// the LangChain invocation-params pipeline into the request body that would be
// sent to each provider's API — it isn't enough that we set a field on the JS
// object; the field has to land on the wire.
//
// These also exercise the `bindTools(...)` flow that the AI Agent uses, since
// `bindTools` re-clones the model via `withConfig` for OpenAI — a clone path
// that's easy to break by accident.

import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import { bindNativeOutputSchema } from './bindNativeOutputSchema';
import type { N8nOutputParser } from '../output_parsers/N8nOutputParser';

const fakeParser = (schema: z.ZodSchema<unknown>): N8nOutputParser =>
	({ getSchema: () => schema }) as unknown as N8nOutputParser;

const fakeTool = { name: 'Calculator', description: 'do math', schema: { type: 'object' } };

describe('bindNativeOutputSchema — wire payload integration', () => {
	const userSchema = z.object({
		output: z.object({
			summary: z.string(),
			confidence: z.number(),
		}),
	});

	describe('ChatAnthropic', () => {
		it('emits output_config.format on invocationParams after binding', () => {
			const model = new ChatAnthropic({
				model: 'claude-sonnet-4-6',
				apiKey: 'sk-ant-test',
			});

			expect(bindNativeOutputSchema(model, fakeParser(userSchema))).toBe(true);

			const params = model.invocationParams() as {
				output_config?: { format?: { type: string; schema: Record<string, unknown> } };
			};
			expect(params.output_config?.format?.type).toBe('json_schema');
		});

		it('keeps output_config.format on the wire after bindTools', () => {
			// The AI Agent calls `bindTools(tools)` after we mutate. For
			// ChatAnthropic this returns a `RunnableBinding` whose underlying
			// model still has the mutated `outputConfig`, so the binding
			// survives.
			const model = new ChatAnthropic({
				model: 'claude-sonnet-4-6',
				apiKey: 'sk-ant-test',
			});
			bindNativeOutputSchema(model, fakeParser(userSchema));

			model.bindTools?.([fakeTool]);

			const params = model.invocationParams() as {
				output_config?: { format?: { type: string } };
			};
			expect(params.output_config?.format?.type).toBe('json_schema');
		});

		it('preserves constructor-level output_config (e.g. effort) when binding', () => {
			const model = new ChatAnthropic({
				model: 'claude-opus-4-7',
				apiKey: 'sk-ant-test',
				outputConfig: { effort: 'medium' },
			});

			bindNativeOutputSchema(model, fakeParser(userSchema));

			const params = model.invocationParams() as {
				output_config?: { effort?: string; format?: { type: string } };
			};
			expect(params.output_config?.effort).toBe('medium');
			expect(params.output_config?.format?.type).toBe('json_schema');
		});
	});

	describe('ChatOpenAI — Chat Completions path', () => {
		it('emits response_format on invocationParams after binding', () => {
			const model = new ChatOpenAI({ model: 'gpt-4.1', apiKey: 'sk-test' });

			expect(bindNativeOutputSchema(model, fakeParser(userSchema))).toBe(true);

			const params = model.invocationParams() as {
				response_format?: {
					type: string;
					json_schema?: { name: string; strict: boolean };
				};
			};
			expect(params.response_format?.type).toBe('json_schema');
			expect(params.response_format?.json_schema?.name).toBe('output');
			expect(params.response_format?.json_schema?.strict).toBe(true);
		});

		it('keeps response_format on the wire after bindTools (AI Agent path)', () => {
			// `bindTools` on ChatOpenAI re-clones via `withConfig`, which
			// merges constructor + bound options — response_format must
			// survive that clone or it's silently dropped on the wire.
			const model = new ChatOpenAI({ model: 'gpt-4.1', apiKey: 'sk-test' });
			bindNativeOutputSchema(model, fakeParser(userSchema));

			const bound = model.bindTools!([fakeTool]) as ChatOpenAI;

			const params = bound.invocationParams() as {
				response_format?: { type: string };
				tools?: unknown[];
			};
			expect(params.response_format?.type).toBe('json_schema');
			expect(params.tools?.length).toBe(1);
		});
	});

	describe('ChatOpenAI — Responses API path (n8n default for v1.3+)', () => {
		// n8n's `LmChatOpenAi` node at typeVersion ≥ 1.3 defaults
		// `useResponsesApi: true`. The Responses API converts
		// `options.response_format` into `text.format` server-side, so the
		// same mutation must produce the right shape on this path too.

		it('emits text.format on invocationParams after binding', () => {
			const model = new ChatOpenAI({
				model: 'gpt-4.1',
				apiKey: 'sk-test',
				useResponsesApi: true,
			});

			expect(bindNativeOutputSchema(model, fakeParser(userSchema))).toBe(true);

			const params = model.invocationParams() as {
				text?: { format?: { type: string; name?: string; strict?: boolean } };
			};
			expect(params.text?.format?.type).toBe('json_schema');
			expect(params.text?.format?.name).toBe('output');
			expect(params.text?.format?.strict).toBe(true);
		});

		it('keeps text.format on the wire after bindTools (AI Agent path)', () => {
			const model = new ChatOpenAI({
				model: 'gpt-4.1',
				apiKey: 'sk-test',
				useResponsesApi: true,
			});
			bindNativeOutputSchema(model, fakeParser(userSchema));

			const bound = model.bindTools!([fakeTool]) as ChatOpenAI;

			const params = bound.invocationParams() as {
				text?: { format?: { type: string } };
				tools?: unknown[];
			};
			expect(params.text?.format?.type).toBe('json_schema');
			expect(params.tools?.length).toBe(1);
		});
	});
});
