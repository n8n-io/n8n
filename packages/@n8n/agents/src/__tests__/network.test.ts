/* eslint-disable @typescript-eslint/naming-convention */
import { Agent } from '../agent';
import { Network } from '../network';

/** Exposes protected build() for testing. */
class TestableAgent extends Agent {
	override build() {
		return super.build();
	}
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
	const researcher = new TestableAgent('researcher')
		.model('openai/gpt-4o')
		.instructions('Research things')
		.build();

	const writer = new TestableAgent('writer')
		.model('openai/gpt-4o')
		.instructions('Write things')
		.build();

	const coordinator = new TestableAgent('coordinator')
		.model('openai/gpt-4o')
		.instructions('Coordinate tasks')
		.build();

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
		expect(result.text).toBe('mock response');
	});
});
