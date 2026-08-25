import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { INodeTypeDescription, INodeTypes } from 'n8n-workflow';

import type { InstanceAiContext } from '../../../types';
import { validateSkeleton } from '../validate-skeleton.service';
import type {
	SkeletonConnection,
	SkeletonNode,
	ValidateSkeletonResult,
	WorkflowSkeleton,
} from '../workflow-skeleton.schema';

vi.mock('@n8n/agents/catalog', () => ({
	getCachedCatalog: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeTypeDescription(overrides: Partial<INodeTypeDescription>): INodeTypeDescription {
	return {
		displayName: 'Test Node',
		name: 'test',
		group: [],
		description: '',
		version: 1,
		defaults: {},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		...overrides,
	} as INodeTypeDescription;
}

const NODE_TYPES: Record<string, INodeTypeDescription> = {
	'n8n-nodes-base.manualTrigger': makeTypeDescription({
		name: 'n8n-nodes-base.manualTrigger',
		group: ['trigger'],
		inputs: [],
	}),
	'n8n-nodes-base.set': makeTypeDescription({
		name: 'n8n-nodes-base.set',
		version: [1, 2, 3, 3.4],
	}),
	'n8n-nodes-base.if': makeTypeDescription({
		name: 'n8n-nodes-base.if',
		version: 2,
		outputs: ['main', 'main'],
	}),
	'@n8n/n8n-nodes-langchain.agent': makeTypeDescription({
		name: '@n8n/n8n-nodes-langchain.agent',
		version: 2,
		inputs: ['main', { type: 'ai_languageModel', displayName: 'Chat Model', required: true }],
	}),
	'@n8n/n8n-nodes-langchain.lmChatOpenAi': makeTypeDescription({
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		version: 1,
		inputs: [],
		outputs: [{ type: 'ai_languageModel', displayName: 'Model' }],
	}),
};

function makeNodeTypesProvider(): INodeTypes {
	return {
		getByNameAndVersion(type: string) {
			const description = NODE_TYPES[type];
			if (!description) throw new Error(`Unknown node type: ${type}`);
			return { description };
		},
	} as unknown as INodeTypes;
}

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'test-user',
		nodeService: {
			getDescription: vi.fn(
				async (type: string) => await Promise.resolve(NODE_TYPES[type] ?? null),
			),
			getParameterIssues: vi.fn().mockResolvedValue({}),
			// Canvas-parity input resolution: serve the static inputs of the fixture type.
			getResolvedNodeInputs: vi.fn(async (workflowJson: WorkflowJSON, nodeName: string) => {
				const node = workflowJson.nodes.find((candidate) => candidate.name === nodeName);
				return await Promise.resolve(node ? (NODE_TYPES[node.type]?.inputs ?? []) : []);
			}),
		},
		nodeTypesProvider: makeNodeTypesProvider(),
		...overrides,
	} as unknown as InstanceAiContext;
}

function node(name: string, type: string, overrides: Partial<SkeletonNode> = {}): SkeletonNode {
	return { name, type, purpose: 'test purpose', ...overrides };
}

function edge(
	from: string,
	to: string,
	overrides: Partial<SkeletonConnection> = {},
): SkeletonConnection {
	return { from, to, type: 'main', fromIndex: 0, toIndex: 0, ...overrides };
}

function makeSkeleton(overrides: Partial<WorkflowSkeleton> = {}): WorkflowSkeleton {
	return {
		name: 'Test workflow',
		nodes: [node('Trigger', 'n8n-nodes-base.manualTrigger'), node('Set', 'n8n-nodes-base.set')],
		connections: [edge('Trigger', 'Set')],
		...overrides,
	};
}

function codesOf(result: ValidateSkeletonResult): string[] {
	return result.diagnostics.map((diagnostic) => diagnostic.code);
}

function diagnostic(result: ValidateSkeletonResult, code: string) {
	return result.diagnostics.find((candidate) => candidate.code === code);
}

// ---------------------------------------------------------------------------
// validateSkeleton
// ---------------------------------------------------------------------------

describe('validateSkeleton', () => {
	describe('happy path', () => {
		it('accepts a linear trigger → node skeleton with no diagnostics', async () => {
			const result = await validateSkeleton(createMockContext(), makeSkeleton());

			expect(result.valid).toBe(true);
			expect(result.diagnostics).toEqual([]);
		});

		it('resolves the latest typeVersion when omitted and pins an explicit one', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Set', 'n8n-nodes-base.set'),
						node('Old Set', 'n8n-nodes-base.set', { typeVersion: 2 }),
					],
					connections: [edge('Trigger', 'Set'), edge('Set', 'Old Set')],
				}),
			);

			expect(result.resolvedVersions).toEqual({ Trigger: 1, Set: 3.4, 'Old Set': 2 });
		});
	});

	describe('naming and wiring errors', () => {
		it('rejects duplicate node names', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Set', 'n8n-nodes-base.set'),
						node('Set', 'n8n-nodes-base.set'),
					],
				}),
			);

			expect(result.valid).toBe(false);
			expect(diagnostic(result, 'DUPLICATE_NODE_NAME')).toMatchObject({
				severity: 'error',
				node: 'Set',
			});
		});

		it('rejects connections referencing undeclared nodes', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({ connections: [edge('Trigger', 'Set'), edge('Set', 'Ghost')] }),
			);

			expect(result.valid).toBe(false);
			expect(diagnostic(result, 'UNKNOWN_CONNECTION_ENDPOINT')?.message).toContain('"Ghost"');
		});

		it('rejects unknown node types and falls back to typeVersion 1 for them', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Mystery', 'n8n-nodes-base.doesNotExist'),
					],
					connections: [edge('Trigger', 'Mystery')],
				}),
			);

			expect(result.valid).toBe(false);
			expect(diagnostic(result, 'UNKNOWN_NODE_TYPE')).toMatchObject({ node: 'Mystery' });
			expect(result.resolvedVersions.Mystery).toBe(1);
		});

		it('rejects a skeleton without any trigger node', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [node('Set A', 'n8n-nodes-base.set'), node('Set B', 'n8n-nodes-base.set')],
					connections: [edge('Set A', 'Set B')],
				}),
			);

			expect(result.valid).toBe(false);
			expect(codesOf(result)).toContain('NO_TRIGGER');
		});

		it('rejects connections with an unknown connection type', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					connections: [edge('Trigger', 'Set'), edge('Trigger', 'Set', { type: 'bogus' })],
				}),
			);

			expect(result.valid).toBe(false);
			expect(diagnostic(result, 'UNKNOWN_CONNECTION_TYPE')?.message).toContain('"bogus"');
		});
	});

	describe('branch and isolation warnings', () => {
		it('warns when a multi-output node wires only some main outputs', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('If', 'n8n-nodes-base.if'),
						node('Set', 'n8n-nodes-base.set'),
					],
					connections: [edge('Trigger', 'If'), edge('If', 'Set', { fromIndex: 0 })],
				}),
			);

			expect(result.valid).toBe(true);
			expect(diagnostic(result, 'UNWIRED_OUTPUT_BRANCH')).toMatchObject({
				severity: 'warning',
				node: 'If',
			});
		});

		it('does not warn when every main output is wired', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('If', 'n8n-nodes-base.if'),
						node('Set A', 'n8n-nodes-base.set'),
						node('Set B', 'n8n-nodes-base.set'),
					],
					connections: [
						edge('Trigger', 'If'),
						edge('If', 'Set A', { fromIndex: 0 }),
						edge('If', 'Set B', { fromIndex: 1 }),
					],
				}),
			);

			expect(result.diagnostics).toEqual([]);
		});

		it('warns about nodes that take part in no connection', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Set', 'n8n-nodes-base.set'),
						node('Orphan', 'n8n-nodes-base.set'),
					],
				}),
			);

			expect(result.valid).toBe(true);
			expect(diagnostic(result, 'ISOLATED_NODE')).toMatchObject({
				severity: 'warning',
				node: 'Orphan',
			});
		});
	});

	describe('required input connections (canvas parity)', () => {
		it('rejects an AI Agent without a chat model connection', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Agent', '@n8n/n8n-nodes-langchain.agent'),
					],
					connections: [edge('Trigger', 'Agent')],
				}),
			);

			expect(result.valid).toBe(false);
			expect(diagnostic(result, 'MISSING_REQUIRED_INPUT')).toMatchObject({
				severity: 'error',
				node: 'Agent',
			});
			expect(diagnostic(result, 'MISSING_REQUIRED_INPUT')?.message).toContain('Chat Model');
		});

		it('accepts an AI Agent once its chat model is connected', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Agent', '@n8n/n8n-nodes-langchain.agent'),
						node('Chat Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi'),
					],
					connections: [
						edge('Trigger', 'Agent'),
						edge('Chat Model', 'Agent', { type: 'ai_languageModel' }),
					],
				}),
			);

			expect(result.valid).toBe(true);
			expect(result.diagnostics).toEqual([]);
		});
	});

	describe('node groups', () => {
		it('warns when a group is not a single connected subgraph', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Set A', 'n8n-nodes-base.set'),
						node('Set B', 'n8n-nodes-base.set'),
						node('Set C', 'n8n-nodes-base.set'),
					],
					connections: [edge('Trigger', 'Set A'), edge('Set A', 'Set B'), edge('Set B', 'Set C')],
					groups: [{ name: 'Steps', nodes: ['Set A', 'Set C'] }],
				}),
			);

			expect(result.valid).toBe(true);
			const violation = diagnostic(result, 'NODE_GROUP_INVALID');
			expect(violation?.severity).toBe('warning');
			expect(violation?.message).toContain('would be dropped on save');
			expect(violation?.message).toContain('must form a single connected subgraph');
		});

		it('warns when a group splits an AI Agent from its sub-nodes', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Agent', '@n8n/n8n-nodes-langchain.agent'),
						node('Chat Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi'),
					],
					connections: [
						edge('Trigger', 'Agent'),
						edge('Chat Model', 'Agent', { type: 'ai_languageModel' }),
					],
					groups: [{ name: 'Agent block', nodes: ['Agent'] }],
				}),
			);

			expect(result.valid).toBe(true);
			expect(diagnostic(result, 'NODE_GROUP_INVALID')?.message).toContain(
				'cannot cross the "ai_languageModel" connection',
			);
		});

		it('accepts a group that keeps the agent and its sub-nodes together', async () => {
			const result = await validateSkeleton(
				createMockContext(),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Agent', '@n8n/n8n-nodes-langchain.agent'),
						node('Chat Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi'),
					],
					connections: [
						edge('Trigger', 'Agent'),
						edge('Chat Model', 'Agent', { type: 'ai_languageModel' }),
					],
					groups: [{ name: 'Agent block', nodes: ['Agent', 'Chat Model'] }],
				}),
			);

			expect(result.diagnostics).toEqual([]);
		});
	});

	describe('without a nodeTypesProvider', () => {
		it('degrades gracefully: name-based trigger detection, no type resolution', async () => {
			const result = await validateSkeleton(
				createMockContext({ nodeTypesProvider: undefined }),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Mystery', 'n8n-nodes-base.doesNotExist'),
					],
					connections: [edge('Trigger', 'Mystery')],
				}),
			);

			// Unknown types cannot be detected without the provider, so no error.
			expect(codesOf(result)).not.toContain('UNKNOWN_NODE_TYPE');
			expect(codesOf(result)).not.toContain('NO_TRIGGER');
			expect(result.valid).toBe(true);
			expect(result.resolvedVersions).toEqual({ Trigger: 1, Mystery: 1 });
		});

		it('still reports missing required inputs via the config validator', async () => {
			const result = await validateSkeleton(
				createMockContext({ nodeTypesProvider: undefined }),
				makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Agent', '@n8n/n8n-nodes-langchain.agent'),
					],
					connections: [edge('Trigger', 'Agent')],
				}),
			);

			expect(result.valid).toBe(false);
			expect(diagnostic(result, 'MISSING_REQUIRED_INPUT')).toMatchObject({ node: 'Agent' });
		});
	});
});
