import { expect, it } from 'vitest';

import { describeIf, collectStreamChunks, getModel, findTextContent } from './helpers';
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

		const { fullStream, getResult } = await orchestrator.streamText('What is 15 * 4?');

		await collectStreamChunks(fullStream);
		const result = await getResult();

		// The orchestrator should have called the sub-agent tool
		expect(result.toolCalls?.length).toBeGreaterThan(0);
		const mathCall = result.toolCalls!.find((tc) => tc.tool === 'math-specialist');
		expect(mathCall).toBeDefined();

		// The output should contain the sub-agent's response
		expect(mathCall!.output).toBeDefined();

		// The final text should reference 60
		const text = findTextContent(result.messages);
		expect(text).toBeTruthy();
		expect(text).toContain('60');
	});

	it('reports token usage from the orchestrator (includes sub-agent overhead)', async () => {
		const echoAgent = new Agent('echo-specialist')
			.model(getModel('anthropic'))
			.instructions('Echo back exactly what you receive. Nothing else.');

		const orchestrator = new Agent('token-orchestrator')
			.model(getModel('anthropic'))
			.instructions(
				'You are a coordinator. Use the echo_tool for every request. Pass the user message as the prompt.',
			)
			.tool(echoAgent.asTool('An echo tool that repeats what you say'));

		// Baseline: simple agent without sub-agent
		const simpleAgent = new Agent('simple-agent')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly what the user says. Nothing else.');

		const orchestratorStream = await orchestrator.streamText('Hello world');
		await collectStreamChunks(orchestratorStream.fullStream);
		const orchestratorResult = await orchestratorStream.getResult();

		const simpleStream = await simpleAgent.streamText('Hello world');
		await collectStreamChunks(simpleStream.fullStream);
		const simpleResult = await simpleStream.getResult();

		// Both should report usage
		expect(orchestratorResult.usage).toBeDefined();
		expect(simpleResult.usage).toBeDefined();

		// Orchestrator should use more tokens (tool call overhead + sub-agent)
		expect(orchestratorResult.usage!.totalTokens).toBeGreaterThan(simpleResult.usage!.totalTokens);
	});

	it('orchestrator handles sub-agent response via run() path', async () => {
		const factAgent = new Agent('fact-specialist')
			.model(getModel('anthropic'))
			.instructions(
				'You are a fact specialist. When asked about the capital of France, reply with just "Paris". Nothing else.',
			);

		const orchestrator = new Agent('fact-orchestrator')
			.model(getModel('anthropic'))
			.instructions(
				'You are a coordinator. When asked about geography, delegate to the fact_specialist tool.',
			)
			.tool(factAgent.asTool('A geography fact specialist'));

		const run = orchestrator.run('What is the capital of France?');
		const result = await run.result;

		expect(result.toolCalls?.length).toBeGreaterThan(0);

		const text = findTextContent(result.messages)?.toLowerCase();
		expect(text).toBeTruthy();
		expect(text).toContain('paris');
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

		const { fullStream, getResult } = await orchestrator.streamText(
			'Translate "hello" to French and then make it uppercase.',
		);

		await collectStreamChunks(fullStream);
		const result = await getResult();

		// Should have called both tools
		expect(result.toolCalls?.length).toBeGreaterThanOrEqual(2);

		const text = findTextContent(result.messages);
		expect(text).toBeTruthy();
		// The result should contain BONJOUR (or SALUT) — uppercase French for hello
		expect(text!.toUpperCase()).toContain('BONJOUR');
	});
});
