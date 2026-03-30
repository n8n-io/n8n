import { expect, it } from 'vitest';

import {
	chunksOfType,
	collectStreamChunks,
	collectTextDeltas,
	describeIf,
	findAllToolResults,
	getModel,
} from './helpers';
import type { StreamChunk } from '../../index';
import { Agent } from '../../index';

const describe = describeIf('anthropic');

describe('sub-agent (asTool) integration', () => {
	it('orchestrator calls a sub-agent as a tool and gets its response', async () => {
		const mathAgent = new Agent('math-specialist')
			.model(getModel('anthropic'))
			.instructions(
				'You are a math specialist. When given a math problem, compute the answer and reply with just the number. No explanation.',
			);

		const orchestrator = new Agent('orchestrator')
			.model(getModel('anthropic'))
			.instructions(
				'You are a coordinator. When asked a math question, delegate to the math_specialist tool. ' +
					'Pass the question as the prompt. Then relay the answer back.',
			)
			.tool(mathAgent.asTool('A math specialist that can solve math problems'));

		const { stream: fullStream } = await orchestrator.stream('What is 15 * 4?');

		const chunks = await collectStreamChunks(fullStream);
		const text = collectTextDeltas(chunks);
		const messageChunks = chunksOfType(chunks, 'message') as Array<
			StreamChunk & { type: 'message' }
		>;
		const toolResults = findAllToolResults(messageChunks.map((c) => c.message));

		// The orchestrator should have called the sub-agent tool
		expect(toolResults.length).toBeGreaterThan(0);
		const mathCall = toolResults.find((tc) => tc.toolName === 'math-specialist');
		expect(mathCall).toBeDefined();

		// The output should contain the sub-agent's response
		expect(mathCall!.result).toBeDefined();

		// The final text should reference 60
		expect(text).toBeTruthy();
		expect(text).toContain('60');
	});

	it('handles a chain of two sub-agents', async () => {
		const translatorAgent = new Agent('translator')
			.model(getModel('anthropic'))
			.instructions(
				'You are a translator. Translate the given text to French. Reply with only the French translation.',
			);

		const uppercaseAgent = new Agent('uppercaser')
			.model(getModel('anthropic'))
			.instructions(
				'You convert text to uppercase. Reply with the input text in all uppercase letters. Nothing else.',
			);

		const orchestrator = new Agent('chain-orchestrator')
			.model(getModel('anthropic'))
			.instructions(
				'You are a coordinator with two tools. ' +
					'When asked to translate and uppercase text: ' +
					'1. First use the translator tool to translate to French. ' +
					'2. Then use the uppercaser tool to convert the French text to uppercase. ' +
					'Return the final uppercase French text.',
			)
			.tool(translatorAgent.asTool('Translates text to French'))
			.tool(uppercaseAgent.asTool('Converts text to uppercase'));

		const { stream: fullStream } = await orchestrator.stream(
			'Translate "hello" to French and then make it uppercase.',
		);
		const chunks = await collectStreamChunks(fullStream);
		const messageChunks = chunksOfType(chunks, 'message') as Array<
			StreamChunk & { type: 'message' }
		>;
		const toolResults = findAllToolResults(messageChunks.map((c) => c.message));

		// Should have called both tools
		expect(toolResults.length).toBeGreaterThanOrEqual(2);

		const text = collectTextDeltas(chunks);
		expect(text).toBeTruthy();
		// The result should contain BONJOUR (or SALUT) — uppercase French for hello
		expect(text).toMatch(/BONJOUR/i);
	});
});
