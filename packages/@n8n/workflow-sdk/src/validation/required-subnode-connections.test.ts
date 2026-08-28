import type { INodeTypes } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	connectRequiredSubnodeInputs,
	type WorkflowForSubnodeWiring,
} from './required-subnode-connections';

const AGENT = '@n8n/n8n-nodes-langchain.agent';
const PARSER = '@n8n/n8n-nodes-langchain.outputParserStructured';
const LOADER = '@n8n/n8n-nodes-langchain.documentDefaultDataLoader';
const MODEL = '@n8n/n8n-nodes-langchain.lmChatOpenAi';

const BUILDER_HINTS: Record<string, unknown> = {
	[AGENT]: {
		ai_languageModel: { required: true },
		ai_outputParser: { required: false, displayOptions: { show: { hasOutputParser: [true] } } },
	},
	[PARSER]: {
		ai_languageModel: { required: true, displayOptions: { show: { autoFix: [true] } } },
	},
	[LOADER]: {
		ai_textSplitter: {
			required: true,
			displayOptions: { show: { textSplittingMode: ['custom'] } },
		},
	},
};

const nodeTypes = {
	getByNameAndVersion: (type: string) => {
		const inputs = BUILDER_HINTS[type];
		if (!inputs) return undefined;
		return { description: { builderHint: { inputs } } };
	},
} as unknown as INodeTypes;

/** Agent with a model and a parser whose capability needs a model of its own. */
function agentWithParser(
	parserParameters: Record<string, unknown>,
	options: { models?: string[] } = {},
): WorkflowForSubnodeWiring {
	const models = options.models ?? ['OpenAI Chat Model'];
	const connections: WorkflowForSubnodeWiring['connections'] = {
		'Output Parser': {
			ai_outputParser: [[{ node: 'Feature Release Agent', type: 'ai_outputParser', index: 0 }]],
		},
	};
	for (const model of models) {
		connections[model] = {
			ai_languageModel: [[{ node: 'Feature Release Agent', type: 'ai_languageModel', index: 0 }]],
		};
	}

	return {
		nodes: [
			{
				name: 'Feature Release Agent',
				type: AGENT,
				typeVersion: 3.1,
				parameters: { hasOutputParser: true },
			},
			{ name: 'Output Parser', type: PARSER, typeVersion: 1.3, parameters: parserParameters },
			...models.map((name) => ({ name, type: MODEL, typeVersion: 1.3, parameters: {} })),
		],
		connections,
	};
}

describe('connectRequiredSubnodeInputs', () => {
	it("wires the agent's model into an autoFix parser that has none", () => {
		const workflow = agentWithParser({ schemaType: 'fromJson', autoFix: true });

		const result = connectRequiredSubnodeInputs(workflow, nodeTypes);

		expect(result).toEqual([
			{
				sourceNode: 'OpenAI Chat Model',
				targetNode: 'Output Parser',
				connectionType: 'ai_languageModel',
				viaParent: 'Feature Release Agent',
			},
		]);
		expect(workflow.connections['OpenAI Chat Model']?.ai_languageModel?.[0]).toEqual([
			{ node: 'Feature Release Agent', type: 'ai_languageModel', index: 0 },
			{ node: 'Output Parser', type: 'ai_languageModel', index: 0 },
		]);
	});

	it('leaves a parser alone when autoFix is off, since it needs no model', () => {
		const workflow = agentWithParser({ schemaType: 'fromJson' });

		const result = connectRequiredSubnodeInputs(workflow, nodeTypes);

		expect(result).toEqual([]);
		expect(workflow.connections['OpenAI Chat Model']?.ai_languageModel?.[0]).toHaveLength(1);
	});

	it('leaves an already-wired required input alone', () => {
		const workflow = agentWithParser({ autoFix: true });
		workflow.connections['OpenAI Chat Model']!.ai_languageModel![0]!.push({
			node: 'Output Parser',
			type: 'ai_languageModel',
			index: 0,
		});

		const result = connectRequiredSubnodeInputs(workflow, nodeTypes);

		expect(result).toEqual([]);
	});

	it('does not repair an input the caller just cleared', () => {
		const workflow = agentWithParser({ autoFix: true });

		const result = connectRequiredSubnodeInputs(workflow, nodeTypes, {
			clearedInputs: [{ nodeName: 'Output Parser', connectionType: 'ai_languageModel' }],
		});

		expect(result).toEqual([]);
		expect(workflow.connections['OpenAI Chat Model']?.ai_languageModel?.[0]).toHaveLength(1);
	});

	it('still repairs inputs the caller did not clear', () => {
		const workflow = agentWithParser({ autoFix: true });

		const result = connectRequiredSubnodeInputs(workflow, nodeTypes, {
			clearedInputs: [{ nodeName: 'Some Other Node', connectionType: 'ai_languageModel' }],
		});

		expect(result).toHaveLength(1);
	});

	it('wires nothing when the parent has no model to take', () => {
		const workflow = agentWithParser({ autoFix: true }, { models: [] });

		expect(connectRequiredSubnodeInputs(workflow, nodeTypes)).toEqual([]);
	});

	it('wires nothing when the parent has two models, rather than picking one', () => {
		const workflow = agentWithParser({ autoFix: true }, { models: ['Primary', 'Fallback'] });

		expect(connectRequiredSubnodeInputs(workflow, nodeTypes)).toEqual([]);
		expect(workflow.connections.Primary?.ai_languageModel?.[0]).toHaveLength(1);
		expect(workflow.connections.Fallback?.ai_languageModel?.[0]).toHaveLength(1);
	});

	it('does not treat an ungated required input as missing', () => {
		// The agent's own ai_languageModel is ungated and already connected.
		const workflow = agentWithParser({ autoFix: true });

		const result = connectRequiredSubnodeInputs(workflow, nodeTypes);

		expect(result.map((a) => a.targetNode)).toEqual(['Output Parser']);
	});

	it('handles a non-boolean gate on a different connection type', () => {
		const workflow: WorkflowForSubnodeWiring = {
			nodes: [
				{ name: 'Agent', type: AGENT, typeVersion: 3.1, parameters: {} },
				{
					name: 'Loader',
					type: LOADER,
					typeVersion: 1,
					parameters: { textSplittingMode: 'custom' },
				},
				{ name: 'Splitter', type: 'ts', typeVersion: 1, parameters: {} },
			],
			connections: {
				Loader: { ai_document: [[{ node: 'Agent', type: 'ai_document', index: 0 }]] },
				Splitter: { ai_textSplitter: [[{ node: 'Agent', type: 'ai_textSplitter', index: 0 }]] },
			},
		};

		const result = connectRequiredSubnodeInputs(workflow, nodeTypes);

		expect(result).toEqual([
			{
				sourceNode: 'Splitter',
				targetNode: 'Loader',
				connectionType: 'ai_textSplitter',
				viaParent: 'Agent',
			},
		]);
	});

	it('ignores node types it cannot resolve', () => {
		const workflow: WorkflowForSubnodeWiring = {
			nodes: [{ name: 'Mystery', type: 'community.unknown', typeVersion: 1, parameters: {} }],
			connections: {},
		};

		expect(connectRequiredSubnodeInputs(workflow, nodeTypes)).toEqual([]);
	});

	it('survives a provider that throws on an unknown version', () => {
		const throwingNodeTypes = {
			getByNameAndVersion: () => {
				throw new Error('Node version not found');
			},
		} as unknown as INodeTypes;

		const workflow = agentWithParser({ autoFix: true });

		expect(connectRequiredSubnodeInputs(workflow, throwingNodeTypes)).toEqual([]);
	});
});
