import { createNode } from '../../../__tests__/test-helpers';
import { AGENT_NODE_TYPE } from '../../../rules/v3/agent-node-mode';
import { agentToolsV1ToV2 } from '../agent-tools-v1-to-v2.migration';

const createAgentNode = (typeVersion: number, parameters: Record<string, unknown> = {}) => ({
	...createNode('AI Agent', AGENT_NODE_TYPE, parameters),
	typeVersion,
});

describe('agentToolsV1ToV2 migration', () => {
	it('is keyed by the AI Agent version rule id', () => {
		expect(agentToolsV1ToV2.ruleId).toBe('agent-node-version-v3');
	});

	it('moves a Tools Agent node to version 2.2 and keeps its parameters', () => {
		const node = createAgentNode(1.9, {
			agent: 'toolsAgent',
			promptType: 'define',
			text: '={{ $json.question }}',
			hasOutputParser: true,
			options: { systemMessage: 'Be brief', maxIterations: 5 },
		});

		const result = agentToolsV1ToV2.migrate(node);

		expect(result.node).toEqual({
			type: AGENT_NODE_TYPE,
			typeVersion: 2.2,
			parameters: {
				promptType: 'define',
				text: '={{ $json.question }}',
				hasOutputParser: true,
				options: { systemMessage: 'Be brief', maxIterations: 5, enableStreaming: false },
			},
		});
		expect(result.unmapped).toBeUndefined();
		expect(result.notes).toBeUndefined();
	});

	it('turns streaming off when the node has no options', () => {
		// Versions below 2 never stream, but 2.2 streams by default.
		const result = agentToolsV1ToV2.migrate(createAgentNode(1.7));

		expect(result.node.parameters).toEqual({ options: { enableStreaming: false } });
	});

	it('keeps the prompt source and output parser from version 1.3', () => {
		const result = agentToolsV1ToV2.migrate(
			createAgentNode(1.3, { agent: 'toolsAgent', promptType: 'auto', hasOutputParser: false }),
		);

		expect(result.node.parameters).toEqual({
			promptType: 'auto',
			hasOutputParser: false,
			options: { enableStreaming: false },
		});
	});

	it('refuses a node whose options are not an object', () => {
		const node = createAgentNode(1.9, { agent: 'toolsAgent', options: '={{ $json.options }}' });

		expect(() => agentToolsV1ToV2.migrate(node)).toThrow('not in a supported format');
	});

	it('does not change the input node', () => {
		const node = createAgentNode(1.9, { agent: 'toolsAgent', options: { maxIterations: 5 } });

		agentToolsV1ToV2.migrate(node);

		expect(node.parameters).toEqual({ agent: 'toolsAgent', options: { maxIterations: 5 } });
	});

	describe('below version 1.3', () => {
		// These versions hide the prompt source and output parser settings, so they fall back to
		// a defined prompt and a connected output parser instead of the version 2.2 defaults.
		it('sets the prompt source and output parser explicitly', () => {
			const node = createAgentNode(1.2, {
				agent: 'toolsAgent',
				text: '={{ $json.question }}',
				promptType: 'auto',
				hasOutputParser: false,
			});

			const result = agentToolsV1ToV2.migrate(node);

			expect(result.node.parameters).toEqual({
				promptType: 'define',
				text: '={{ $json.question }}',
				hasOutputParser: true,
				options: { enableStreaming: false },
			});
		});

		it.each([undefined, ''])('refuses a node with prompt %j', (text) => {
			const node = createAgentNode(1, { agent: 'toolsAgent', text });

			expect(() => agentToolsV1ToV2.migrate(node)).toThrow('no prompt');
		});
	});
});
