import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import { bindNativeOutputSchema, tryBindNativeOutputSchema } from './bindNativeOutputSchema';
import type { N8nOutputParser } from '../output_parsers/N8nOutputParser';

const fakeParser = (schema?: z.ZodSchema<unknown>): N8nOutputParser =>
	({ getSchema: () => schema }) as unknown as N8nOutputParser;

const newAnthropic = () => new ChatAnthropic({ model: 'claude-sonnet-4-6', apiKey: 'sk-ant-test' });
const newOpenAI = () => new ChatOpenAI({ model: 'gpt-4.1', apiKey: 'sk-test' });

describe('bindNativeOutputSchema', () => {
	const schema = z.object({ output: z.object({ answer: z.string() }) });

	it('returns false when no parser is connected', () => {
		expect(bindNativeOutputSchema(newAnthropic(), undefined)).toBe(false);
	});

	it('returns false when the parser has no schema', () => {
		expect(bindNativeOutputSchema(newAnthropic(), fakeParser(undefined))).toBe(false);
	});

	it('returns false on a provider we do not support', () => {
		// Stand-in for a chat model that isn't an instance of ChatAnthropic or
		// ChatOpenAI — the binder should leave it untouched.
		const unsupported = {
			_llmType: () => 'ollama',
		} as unknown as Parameters<typeof bindNativeOutputSchema>[0];
		expect(bindNativeOutputSchema(unsupported, fakeParser(schema))).toBe(false);
	});

	it('sets outputConfig.format on a ChatAnthropic instance', () => {
		const model = newAnthropic();
		expect(bindNativeOutputSchema(model, fakeParser(schema))).toBe(true);
		expect(model.outputConfig?.format).toMatchObject({ type: 'json_schema' });
	});

	it('preserves existing outputConfig fields on ChatAnthropic (e.g. effort)', () => {
		const model = new ChatAnthropic({
			model: 'claude-opus-4-7',
			apiKey: 'sk-ant-test',
			outputConfig: { effort: 'medium' },
		});
		bindNativeOutputSchema(model, fakeParser(schema));
		expect(model.outputConfig?.effort).toBe('medium');
		expect(model.outputConfig?.format).toMatchObject({ type: 'json_schema' });
	});

	it('sets response_format with strict:true on a ChatOpenAI instance', () => {
		const model = newOpenAI();
		expect(bindNativeOutputSchema(model, fakeParser(schema))).toBe(true);
		const defaults = (model as unknown as { defaultOptions: Record<string, unknown> })
			.defaultOptions;
		expect(defaults.response_format).toMatchObject({
			type: 'json_schema',
			json_schema: { name: 'output', strict: true },
		});
	});
});

describe('tryBindNativeOutputSchema', () => {
	const schema = z.object({ output: z.string() });

	it('returns false when no parser is connected', () => {
		expect(tryBindNativeOutputSchema([newAnthropic()], undefined)).toBe(false);
	});

	it('returns false when no eligible models are passed (all null)', () => {
		expect(tryBindNativeOutputSchema([null, undefined], fakeParser(schema))).toBe(false);
	});

	it('returns true when every model accepts the binding', () => {
		const primary = newAnthropic();
		const fallback = newAnthropic();
		expect(tryBindNativeOutputSchema([primary, fallback], fakeParser(schema))).toBe(true);
		expect(primary.outputConfig?.format).toBeDefined();
		expect(fallback.outputConfig?.format).toBeDefined();
	});

	it('returns false when any model fails — caller must use the legacy path uniformly', () => {
		const primary = newAnthropic();
		const unsupported = {
			_llmType: () => 'ollama',
		} as unknown as Parameters<typeof bindNativeOutputSchema>[0];
		expect(tryBindNativeOutputSchema([primary, unsupported], fakeParser(schema))).toBe(false);
	});
});
