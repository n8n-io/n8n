import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, collectStreamChunks, chunksOfType, getModel } from './helpers';
import { Agent, Tool } from '../../index';
import type { StreamChunk } from '../../index';

const answerSchema = z.object({
	city: z.string().describe('The name of the city'),
	country: z.string().describe('The country the city is in'),
	population_millions: z.number().describe('Approximate population in millions'),
});

function createStructuredAgent(provider: 'anthropic' | 'openai'): Agent {
	return new Agent('structured-output-test')
		.model(getModel(provider))
		.instructions(
			'You answer geography questions. Always respond with the structured output schema. Be precise and factual.',
		)
		.structuredOutput(answerSchema);
}

function createStructuredAgentWithTool(provider: 'anthropic' | 'openai'): Agent {
	const lookupTool = new Tool('lookup_capital')
		.description('Look up the capital city of a country')
		.input(z.object({ country: z.string().describe('Country name') }))
		.output(z.object({ capital: z.string(), population_millions: z.number() }))
		.handler(async ({ country }) => {
			const data: Record<string, { capital: string; population_millions: number }> = {
				france: { capital: 'Paris', population_millions: 2.1 },
				japan: { capital: 'Tokyo', population_millions: 13.9 },
				brazil: { capital: 'Brasília', population_millions: 3.0 },
			};
			return data[country.toLowerCase()] ?? { capital: 'Unknown', population_millions: 0 };
		});

	return new Agent('structured-tool-test')
		.model(getModel(provider))
		.instructions(
			'You answer geography questions. Use the lookup_capital tool when asked about capitals. Always respond with the structured output schema.',
		)
		.tool(lookupTool)
		.structuredOutput(answerSchema);
}

function createStructuredAgentWithInterruptibleTool(provider: 'anthropic' | 'openai'): Agent {
	const deleteTool = new Tool('delete_record')
		.description('Delete a geographic record — requires confirmation')
		.input(z.object({ city: z.string().describe('City to delete') }))
		.output(z.object({ deleted: z.boolean(), city: z.string() }))
		.suspend(z.object({ message: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ city }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete record for "${city}"?` });
			}
			return { deleted: ctx.resumeData.approved, city };
		});

	const resultSchema = z.object({
		action: z.string().describe('The action that was performed'),
		city: z.string().describe('The city affected'),
		success: z.boolean().describe('Whether the action succeeded'),
	});

	return new Agent('structured-interrupt-test')
		.model(getModel(provider))
		.instructions(
			'You manage geographic records. When asked to delete a record, use the delete_record tool. Always respond with the structured output schema.',
		)
		.tool(deleteTool)
		.structuredOutput(resultSchema)
		.checkpoint('memory');
}

const describe = describeIf('anthropic');

describe('structured output integration', () => {
	it('returns parsed structuredOutput via generate()', async () => {
		const agent = createStructuredAgent('anthropic');

		const result = await agent.generate('What is the capital of France?');

		expect(result.finishReason).toBe('stop');
		expect(result.structuredOutput).toBeDefined();

		const parsed = answerSchema.safeParse(result.structuredOutput);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.city.toLowerCase()).toContain('paris');
			expect(parsed.data.country.toLowerCase()).toContain('france');
			expect(parsed.data.population_millions).toBeGreaterThan(0);
		}
	});

	it('returns parsed structuredOutput in stream finish chunk', async () => {
		const agent = createStructuredAgent('anthropic');

		const { stream } = await agent.stream('What is the capital of Japan?');
		const chunks = await collectStreamChunks(stream);

		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);

		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.structuredOutput).toBeDefined();

		const parsed = answerSchema.safeParse(finish.structuredOutput);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.city.toLowerCase()).toContain('tokyo');
		}
	});

	it('returns structuredOutput after tool use via generate()', async () => {
		const agent = createStructuredAgentWithTool('anthropic');

		const result = await agent.generate('What is the capital of France? Use the lookup tool.');

		expect(result.finishReason).toBe('stop');
		expect(result.structuredOutput).toBeDefined();

		const parsed = answerSchema.safeParse(result.structuredOutput);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.city.toLowerCase()).toContain('paris');
		}
	});

	it('returns structuredOutput after tool use via stream()', async () => {
		const agent = createStructuredAgentWithTool('anthropic');

		const { stream } = await agent.stream('What is the capital of Japan? Use the lookup tool.');
		const chunks = await collectStreamChunks(stream);

		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);

		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.structuredOutput).toBeDefined();

		const parsed = answerSchema.safeParse(finish.structuredOutput);
		expect(parsed.success).toBe(true);
	});

	it('returns structuredOutput after resume("generate")', async () => {
		const agent = createStructuredAgentWithInterruptibleTool('anthropic');

		const first = await agent.generate('Delete the record for Paris');
		expect(first.pendingSuspend).toBeDefined();
		const { runId, toolCallId } = first.pendingSuspend![0];

		const resumed = await agent.resume('generate', { approved: true }, { runId, toolCallId });

		expect(resumed.finishReason).toBe('stop');
		expect(resumed.structuredOutput).toBeDefined();

		const resultSchema = z.object({
			action: z.string(),
			city: z.string(),
			success: z.boolean(),
		});
		const parsed = resultSchema.safeParse(resumed.structuredOutput);
		expect(parsed.success).toBe(true);
	});

	it('returns structuredOutput after resume("stream")', async () => {
		const agent = createStructuredAgentWithInterruptibleTool('anthropic');

		const first = await agent.generate('Delete the record for Tokyo');
		expect(first.pendingSuspend).toBeDefined();
		const { runId, toolCallId } = first.pendingSuspend![0];

		const resumedStream = await agent.resume('stream', { approved: true }, { runId, toolCallId });

		const chunks = await collectStreamChunks(resumedStream.stream);
		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);

		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.structuredOutput).toBeDefined();

		const resultSchema = z.object({
			action: z.string(),
			city: z.string(),
			success: z.boolean(),
		});
		const parsed = resultSchema.safeParse(finish.structuredOutput);
		expect(parsed.success).toBe(true);
	});

	it('structuredOutput conforms to the schema', async () => {
		const strictSchema = z.object({
			name: z.string(),
			is_capital: z.boolean(),
			continent: z.enum([
				'Africa',
				'Antarctica',
				'Asia',
				'Europe',
				'North America',
				'Oceania',
				'South America',
			]),
		});

		const agent = new Agent('strict-schema-test')
			.model(getModel('anthropic'))
			.instructions('Answer geography questions using the structured output schema.')
			.structuredOutput(strictSchema);

		const result = await agent.generate('Tell me about Berlin');

		expect(result.structuredOutput).toBeDefined();
		const parsed = strictSchema.safeParse(result.structuredOutput);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.name.toLowerCase()).toContain('berlin');
			expect(parsed.data.continent).toBe('Europe');
			expect(typeof parsed.data.is_capital).toBe('boolean');
		}
	});
});
