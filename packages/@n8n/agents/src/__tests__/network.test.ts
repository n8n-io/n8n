/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any */
import { Agent } from '../agent';
import type { Message } from '../message';
import { Network } from '../network';

function findTextContent(messages: Message[]): string | undefined {
	for (const msg of messages) {
		for (const block of msg.content) {
			if (block.type === 'text') return block.text;
		}
	}
	return undefined;
}

/** Exposes protected build() for testing. */
class TestableAgent extends Agent<any> {
	override build() {
		return super.build();
	}
}

function buildAgent(agent: Agent<any>): ReturnType<TestableAgent['build']> {
	return (agent as TestableAgent).build();
}

/** Exposes protected build() for testing. */
class TestableNetwork extends Network {
	override build() {
		return super.build();
	}
}

jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
		name: config.name,
		__setLogger: jest.fn(),
		generate: jest.fn().mockResolvedValue({
			text: 'mock response',
			usage: { inputTokens: 10, outputTokens: 5 },
			steps: [{ toolCalls: [], toolResults: [] }],
		}),
	})),
}));

jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
		id: config.id,
		description: config.description,
	})),
}));

describe('Network', () => {
	const researcher = buildAgent(
		new TestableAgent('researcher').model('openai/gpt-4o').instructions('Research things'),
	);

	const writer = buildAgent(
		new TestableAgent('writer').model('openai/gpt-4o').instructions('Write things'),
	);

	const coordinator = buildAgent(
		new TestableAgent('coordinator').model('openai/gpt-4o').instructions('Coordinate tasks'),
	);

	it('should build a network with coordinator and agents', () => {
		const network = new TestableNetwork('team')
			.coordinator(coordinator)
			.agent(researcher)
			.agent(writer)
			.build();

		expect(network.name).toBe('team');
	});

	it('should throw if coordinator is missing', () => {
		expect(() => new TestableNetwork('team').agent(researcher).build()).toThrow(
			'Network "team" requires a coordinator',
		);
	});

	it('should throw if no agents are added', () => {
		expect(() => new TestableNetwork('team').coordinator(coordinator).build()).toThrow(
			'Network "team" requires at least one agent',
		);
	});

	it('should return a Run from .run()', () => {
		const network = new TestableNetwork('team')
			.coordinator(coordinator)
			.agent(researcher)
			.agent(writer)
			.build();

		const run = network.run('Do research and write');
		expect(run.state).toBe('running');
		expect(run.result).toBeInstanceOf(Promise);
	});

	it('should resolve run result via coordinator', async () => {
		const network = new TestableNetwork('team').coordinator(coordinator).agent(researcher).build();

		const run = network.run('Research something');
		const result = await run.result;
		expect(findTextContent(result.messages)).toBe('mock response');
	});
});
