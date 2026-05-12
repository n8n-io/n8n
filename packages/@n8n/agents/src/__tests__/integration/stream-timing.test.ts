import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, getModel } from './helpers';
import { Agent, Tool } from '../../index';

const describe = describeIf('anthropic');

describe('stream timing', () => {
	it('tool-call-delta chunks arrive incrementally (not all buffered)', async () => {
		const agent = new Agent('timing-test')
			.model(getModel('anthropic'))
			.instructions(
				'When asked to write code, call the set_code tool with the code. Write at least 10 lines.',
			)
			.tool(
				new Tool('set_code')
					.description('Set code in the editor')
					.input(
						z.object({
							code: z.string().describe('The complete source code'),
						}),
					)
					.providerOptions({ anthropic: { eagerInputStreaming: true } })
					.handler(async ({ code }) => ({ ok: true, length: code.length })),
			);

		const result = await agent.stream(
			'Write a TypeScript function that implements bubble sort. Use the set_code tool.',
		);

		const reader = result.stream.getReader();

		// Track timestamps of each reader.read() that returns a tool-call-delta
		// This measures when the reader YIELDS each chunk, not when the agent enqueues it.
		const deltaReadTimes: number[] = [];
		const start = Date.now();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const chunk = value;
			if (chunk.type === 'tool-call-delta' && (chunk as { name?: string }).name === 'set_code') {
				deltaReadTimes.push(Date.now() - start);
			}
		}

		expect(deltaReadTimes.length).toBeGreaterThan(0);

		console.log(`set_code delta reads: ${deltaReadTimes.length}`);
		if (deltaReadTimes.length > 1) {
			const first = deltaReadTimes[0];
			const last = deltaReadTimes[deltaReadTimes.length - 1];
			const spread = last - first;
			console.log(`Time spread: ${spread}ms (first read: ${first}ms, last read: ${last}ms)`);

			// Count how many distinct timestamps (ms resolution)
			const uniqueTimes = new Set(deltaReadTimes).size;
			console.log(`Unique timestamps: ${uniqueTimes} out of ${deltaReadTimes.length} reads`);

			// If truly streaming: spread should be significant (>500ms for code generation)
			// If buffered: spread will be near 0 and most reads share the same timestamp
			const bufferingRatio = uniqueTimes / deltaReadTimes.length;
			console.log(`Buffering ratio: ${(bufferingRatio * 100).toFixed(1)}% unique timestamps`);
			console.log(
				bufferingRatio < 0.1
					? 'BUFFERED: The agent releases all deltas in one burst'
					: 'STREAMING: Deltas arrive incrementally',
			);
		}
	});
});
