import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { INodeTypeDescription, INodeTypes } from 'n8n-workflow';
import type { Mock } from 'vitest';

import type { InstanceAiContext } from '../../../types';
import { generateValidatedJson } from '../../../utils/generate-validated-json';
import { writeWorkspaceFile } from '../../../workspace/workspace-files';
import type { FillWorkflowParametersInput } from '../fill-workflow-parameters.schema';
import { fillWorkflowParameters } from '../fill-workflow-parameters.service';
import type {
	SkeletonConnection,
	SkeletonNode,
	WorkflowSkeleton,
} from '../workflow-skeleton.schema';

vi.mock('@n8n/agents/catalog', () => ({
	getCachedCatalog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../utils/generate-validated-json', () => ({
	generateValidatedJson: vi.fn(),
}));
vi.mock('../../../workspace/workspace-files', () => ({
	writeWorkspaceFile: vi.fn().mockResolvedValue(undefined),
}));

const generateValidatedJsonMock = vi.mocked(generateValidatedJson);
const writeWorkspaceFileMock = vi.mocked(writeWorkspaceFile);

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
		// No properties: the fill for this node must be skipped without an LLM call.
		properties: [],
	}),
	'n8n-nodes-base.set': makeTypeDescription({
		name: 'n8n-nodes-base.set',
		version: [1, 2, 3],
		properties: [
			{ displayName: 'Fields', name: 'fields', type: 'string', default: '' },
		] as INodeTypeDescription['properties'],
	}),
	'n8n-nodes-base.slack': makeTypeDescription({
		name: 'n8n-nodes-base.slack',
		version: 2,
		properties: [
			{ displayName: 'Channel', name: 'channel', type: 'string', default: '' },
		] as INodeTypeDescription['properties'],
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
		logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		workspace: {},
		nodeService: {
			getDescription: vi.fn(
				async (type: string) => await Promise.resolve(NODE_TYPES[type] ?? null),
			),
			getParameterIssues: vi.fn().mockResolvedValue({}),
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
		name: 'Fill test workflow',
		nodes: [
			node('Trigger', 'n8n-nodes-base.manualTrigger'),
			node('Set', 'n8n-nodes-base.set'),
			node('Slack', 'n8n-nodes-base.slack'),
		],
		connections: [edge('Trigger', 'Set'), edge('Set', 'Slack')],
		...overrides,
	};
}

function makeInput(
	overrides: Partial<FillWorkflowParametersInput> = {},
): FillWorkflowParametersInput {
	return {
		skeleton: makeSkeleton(),
		brief: 'Set a field, then notify #orders on Slack',
		filePath: 'fill-test.workflow.ts',
		...overrides,
	};
}

function okFill(parameters: Record<string, string>, assumptions: string[] = []) {
	return { ok: true as const, data: { parameters, assumptions } };
}

beforeEach(() => {
	vi.clearAllMocks();
	writeWorkspaceFileMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// fillWorkflowParameters
// ---------------------------------------------------------------------------

describe('fillWorkflowParameters', () => {
	it('fills every parameterized node, skips property-less nodes, and writes the assembled source', async () => {
		generateValidatedJsonMock.mockImplementation(async (_name, options) => {
			if (options.userText.includes('Name: Set')) {
				return await Promise.resolve(okFill({ fields: 'handled=true' }));
			}
			return okFill({ channel: '#orders' });
		});

		const result = await fillWorkflowParameters(createMockContext(), makeInput());

		expect(result.success).toBe(true);
		expect(result.filePath).toBe('fill-test.workflow.ts');
		expect(result.filledNodes).toEqual(expect.arrayContaining(['Trigger', 'Set', 'Slack']));
		expect(result.failedNodes).toEqual([]);
		// A clean skeleton reports no diagnostics, and the result steers to build-workflow.
		expect(result.skeletonDiagnostics).toBeUndefined();
		expect(result.nextStep).toContain('build-workflow');
		expect(result.nextStep).toContain('fill-test.workflow.ts');
		// Two LLM calls: the trigger has no properties, so no call for it.
		expect(generateValidatedJsonMock).toHaveBeenCalledTimes(2);

		expect(writeWorkspaceFileMock).toHaveBeenCalledTimes(1);
		const [, writtenPath, source] = writeWorkspaceFileMock.mock.calls[0];
		expect(writtenPath).toBe('fill-test.workflow.ts');
		expect(source).toContain('n8n-nodes-base.slack');
		expect(source).toContain('#orders');
		expect(source).toContain('Fill test workflow');
	});

	it('rejects an invalid skeleton without any LLM call or file write', async () => {
		const result = await fillWorkflowParameters(
			createMockContext(),
			makeInput({
				skeleton: makeSkeleton({
					nodes: [node('Set', 'n8n-nodes-base.set')],
					connections: [],
				}),
			}),
		);

		expect(result.success).toBe(false);
		expect(result.skeletonDiagnostics?.some((d) => d.code === 'NO_TRIGGER')).toBe(true);
		expect(result.nextStep).toContain('call fill-workflow-parameters again');
		expect(generateValidatedJsonMock).not.toHaveBeenCalled();
		expect(writeWorkspaceFileMock).not.toHaveBeenCalled();
	});

	it('fails fast when no runtime workspace is available', async () => {
		const result = await fillWorkflowParameters(
			createMockContext({ workspace: undefined }),
			makeInput(),
		);

		expect(result.success).toBe(false);
		expect(result.failedNodes[0]?.reason).toContain('workspace');
		expect(result.nextStep).toContain('blocking');
		expect(generateValidatedJsonMock).not.toHaveBeenCalled();
	});

	it('surfaces skeleton warnings on a successful fill', async () => {
		generateValidatedJsonMock.mockResolvedValue(okFill({ fields: 'x' }));

		const result = await fillWorkflowParameters(
			createMockContext(),
			makeInput({
				skeleton: makeSkeleton({
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Set', 'n8n-nodes-base.set'),
						node('Orphan', 'n8n-nodes-base.set'),
					],
					connections: [edge('Trigger', 'Set')],
				}),
			}),
		);

		expect(result.success).toBe(true);
		expect(result.skeletonDiagnostics).toEqual([
			expect.objectContaining({ severity: 'warning', code: 'ISOLATED_NODE', node: 'Orphan' }),
		]);
	});

	it('isolates a failed fill: the node is reported, the others still land in the source', async () => {
		generateValidatedJsonMock.mockImplementation(async (_name, options) => {
			if (options.userText.includes('Name: Set')) {
				return await Promise.resolve({ ok: false as const, reason: 'generation_failed' as const });
			}
			return okFill({ channel: '#orders' });
		});

		const result = await fillWorkflowParameters(createMockContext(), makeInput());

		expect(result.success).toBe(true);
		expect(result.failedNodes).toEqual([
			{ node: 'Set', reason: 'parameter generation failed (generation_failed)' },
		]);
		expect(result.filledNodes).toEqual(expect.arrayContaining(['Trigger', 'Slack']));
		const [, , source] = writeWorkspaceFileMock.mock.calls[0];
		expect(source).toContain('#orders');
	});

	it('runs one repair round when canvas parameter issues appear, and keeps leftovers visible', async () => {
		const context = createMockContext();
		const getParameterIssues = context.nodeService.getParameterIssues as Mock;
		// Slack: issues on the first fill, clean after repair. Set: always clean.
		getParameterIssues.mockImplementation(async (type: string, _v: number, params: object) => {
			if (type !== 'n8n-nodes-base.slack') return await Promise.resolve({});
			return 'channel' in params ? {} : { channel: ['Channel is required'] };
		});
		generateValidatedJsonMock.mockImplementation(async (name, options) => {
			if (options.userText.includes('Name: Set'))
				return await Promise.resolve(okFill({ fields: 'x' }));
			if (name === 'fill-node-parameters-repair') return okFill({ channel: '#orders' });
			return okFill({ text: 'missing the channel' });
		});

		const result = await fillWorkflowParameters(context, makeInput());

		// initial Set + initial Slack + Slack repair
		expect(generateValidatedJsonMock).toHaveBeenCalledTimes(3);
		const repairCall = generateValidatedJsonMock.mock.calls.find(
			([name]) => name === 'fill-node-parameters-repair',
		);
		expect(repairCall?.[1].userText).toContain('Channel is required');
		expect(result.parameterIssues).toEqual({});
	});

	it('surfaces leftover issues when the repair round does not resolve them', async () => {
		const context = createMockContext();
		const getParameterIssues = context.nodeService.getParameterIssues as Mock;
		getParameterIssues.mockImplementation(
			async (type: string) =>
				await Promise.resolve(
					type === 'n8n-nodes-base.slack' ? { channel: ['Channel is required'] } : {},
				),
		);
		generateValidatedJsonMock.mockImplementation(async (_name, options) => {
			if (options.userText.includes('Name: Set'))
				return await Promise.resolve(okFill({ fields: 'x' }));
			return okFill({ text: 'still no channel' });
		});

		const result = await fillWorkflowParameters(context, makeInput());

		expect(result.success).toBe(true);
		expect(result.parameterIssues.Slack).toEqual(['channel: Channel is required']);
	});

	it('collects per-node assumptions across fill and repair rounds', async () => {
		generateValidatedJsonMock.mockImplementation(async (_name, options) => {
			if (options.userText.includes('Name: Set'))
				return await Promise.resolve(okFill({ fields: 'x' }));
			return okFill({ channel: '<__PLACEHOLDER_VALUE__Slack channel__>' }, [
				'Channel not specified — inserted a placeholder',
			]);
		});

		const result = await fillWorkflowParameters(createMockContext(), makeInput());

		expect(result.assumptions.Slack).toEqual(['Channel not specified — inserted a placeholder']);
		// The SDK codegen recognizes the sentinel and re-emits its placeholder()
		// helper, which round-trips back to the sentinel at build time.
		const [, , source] = writeWorkspaceFileMock.mock.calls[0];
		expect(source).toContain("placeholder('Slack channel')");
	});

	it('reports nodes whose type schema is unavailable as failed and keeps building', async () => {
		const context = createMockContext();
		(context.nodeService.getDescription as Mock).mockImplementation(
			async (type: string) =>
				await Promise.resolve(type === 'n8n-nodes-base.slack' ? null : (NODE_TYPES[type] ?? null)),
		);
		generateValidatedJsonMock.mockResolvedValue(okFill({ fields: 'x' }));

		const result = await fillWorkflowParameters(context, makeInput());

		expect(result.failedNodes).toEqual([{ node: 'Slack', reason: 'node type schema unavailable' }]);
		expect(writeWorkspaceFileMock).toHaveBeenCalledTimes(1);
	});
});
