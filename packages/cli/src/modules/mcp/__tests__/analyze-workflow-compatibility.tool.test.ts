import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository, User } from '@n8n/db';
import {
	NodeConnectionTypes,
	NodeHelpers,
	NodeVersionNotFoundError,
	type INodeTypeDescription,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import { z } from 'zod';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';

import { createAnalyzeWorkflowCompatibilityTool } from '../tools/workflow-builder/analyze-workflow-compatibility.tool';

const SLACK = 'n8n-nodes-base.slack';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';
const OPENAI = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
const ANTHROPIC = '@n8n/n8n-nodes-langchain.lmChatAnthropic';
const GEMINI = '@n8n/n8n-nodes-langchain.lmChatGoogleGemini';

const user = Object.assign(new User(), { id: 'user-1' });
const personalProject = { id: 'project-1', name: 'Personal', type: 'personal' as const };

function nodeDescription(name: string, credentialType?: string, version = 1): INodeTypeDescription {
	return {
		displayName: name,
		name,
		group: ['transform'],
		version,
		description: '',
		defaults: { name },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		...(credentialType ? { credentials: [{ name: credentialType, required: true }] } : {}),
	} as unknown as INodeTypeDescription;
}

function workflowNode(
	type: string,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		id: `${type}-id`,
		name: type,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function workflow(
	nodes: Array<Record<string, unknown>>,
	connections: Record<string, unknown> = {},
) {
	return { name: 'Template', nodes, connections, settings: {} };
}

describe('analyze_workflow_compatibility MCP tool', () => {
	let projectRepository: ProjectRepository;
	let credentialsService: CredentialsService;
	let nodeTypes: NodeTypes;
	let telemetry: Telemetry;
	let descriptions: Map<string, INodeTypeDescription>;

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		descriptions = new Map([
			[SLACK, nodeDescription(SLACK, 'slackApi')],
			[HTTP_REQUEST, nodeDescription(HTTP_REQUEST, 'httpHeaderAuth', 4)],
			[
				OPENAI,
				{
					...nodeDescription(OPENAI, 'openAiApi'),
					outputs: [NodeConnectionTypes.AiLanguageModel],
				},
			],
			[
				ANTHROPIC,
				{
					...nodeDescription(ANTHROPIC, 'anthropicApi', 1.5),
					outputs: [NodeConnectionTypes.AiLanguageModel],
				},
			],
			[
				GEMINI,
				{
					...nodeDescription(GEMINI, 'googlePalmApi', 1.1),
					outputs: [NodeConnectionTypes.AiLanguageModel],
				},
			],
			['n8n-nodes-base.noOp', nodeDescription('n8n-nodes-base.noOp')],
		]);

		projectRepository = mockInstance(ProjectRepository, {
			getPersonalProjectForUserOrFail: vi.fn().mockResolvedValue(personalProject),
			getAccessibleProjects: vi.fn().mockResolvedValue([personalProject]),
		});
		credentialsService = mockInstance(CredentialsService, {
			getCredentialsAUserCanUseInAWorkflow: vi.fn().mockResolvedValue([]),
			getOne: vi.fn().mockRejectedValue(new NotFoundError('Credential not found')),
		});
		nodeTypes = mockInstance(NodeTypes, {
			getByNameAndVersion: vi.fn().mockImplementation((type: string, version?: number) => {
				const description = descriptions.get(type);
				if (!description) throw new Error(`Unrecognized node type: ${type}`);
				if (version !== undefined) {
					const available = Array.isArray(description.version)
						? description.version
						: [description.version];
					if (!available.includes(version)) {
						throw new NodeVersionNotFoundError(type, version, available);
					}
				}
				return { description };
			}),
		});
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
	});

	const createTool = () =>
		createAnalyzeWorkflowCompatibilityTool(
			user,
			projectRepository,
			credentialsService,
			nodeTypes,
			telemetry,
		);

	const analyze = async (
		inputWorkflow: Record<string, unknown>,
		projectId?: string,
	): Promise<Record<string, unknown>> => {
		const tool = createTool();
		const result = await tool.handler({ workflow: inputWorkflow, projectId }, {} as never);
		return result.structuredContent as Record<string, unknown>;
	};

	test('publishes a read-only contract that accepts success and error responses', async () => {
		const tool = createTool();
		const outputShape = tool.config.outputSchema;
		if (!outputShape) throw new Error('Expected an output schema');
		const output = z.object(outputShape).strict();
		const success = await tool.handler(
			{ workflow: workflow([workflowNode('n8n-nodes-base.noOp')]) },
			{} as never,
		);
		const error = await tool.handler({ workflow: {} }, {} as never);

		expect(tool.config.annotations).toMatchObject({
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		});
		expect(output.safeParse(success.structuredContent).success).toBe(true);
		expect(output.safeParse(error.structuredContent).success).toBe(true);
	});

	test('reports a compatible workflow with no issues', async () => {
		const result = await analyze(workflow([workflowNode('n8n-nodes-base.noOp')]));

		expect(result).toMatchObject({
			status: 'compatible',
			summary: { compatible: 1, repairable: 0, blocked: 0, warnings: 0 },
			issues: [],
		});
	});

	test('reports the complete demo fixture as compatible, repairable, and blocked', async () => {
		descriptions.set(
			'n8n-nodes-base.rssFeedReadTrigger',
			nodeDescription('n8n-nodes-base.rssFeedReadTrigger'),
		);
		descriptions.set(
			'@n8n/n8n-nodes-langchain.chainLlm',
			nodeDescription('@n8n/n8n-nodes-langchain.chainLlm', undefined, 1.7),
		);
		descriptions.set(OPENAI, {
			...nodeDescription(OPENAI, 'openAiApi', 1.3),
			outputs: [NodeConnectionTypes.AiLanguageModel],
		});
		descriptions.set('n8n-nodes-base.notion', nodeDescription('Notion', 'notionApi', 2.2));
		descriptions.set(SLACK, nodeDescription(SLACK, 'slackApi', 2.3));
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'anthropic-1', name: 'Claude', type: 'anthropicApi' },
			{ id: 'notion-1', name: 'Demo Notion', type: 'notionApi' },
		]);
		const fixture = JSON.parse(
			readFileSync(join(__dirname, 'fixtures/ai-rss-digest-template.json'), 'utf8'),
		) as Record<string, unknown>;

		const result = await analyze(fixture);

		expect(result).toMatchObject({
			status: 'has_blockers',
			summary: { compatible: 2, repairable: 2, blocked: 1, warnings: 0 },
		});
	});

	test('recommends the only exact credential candidate', async () => {
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'slack-1', name: 'Production Slack', type: 'slackApi' },
		]);

		const result = await analyze(workflow([workflowNode(SLACK)]));
		const issues = result.issues as Array<Record<string, unknown>>;
		const proposals = issues[0].proposals as Array<Record<string, unknown>>;

		expect(issues[0]).toMatchObject({ status: 'repairable', problem: 'credential_missing' });
		expect(proposals).toEqual([
			expect.objectContaining({
				kind: 'assign_credential',
				recommended: true,
				credential: { id: 'slack-1', name: 'Production Slack', type: 'slackApi' },
			}),
		]);
	});

	test('returns all exact credential candidates without recommending one', async () => {
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'slack-2', name: 'Slack B', type: 'slackApi' },
			{ id: 'slack-1', name: 'Slack A', type: 'slackApi' },
		]);

		const result = await analyze(workflow([workflowNode(SLACK)]));
		const issues = result.issues as Array<Record<string, unknown>>;
		const proposals = issues[0].proposals as Array<Record<string, unknown>>;

		expect(proposals).toHaveLength(2);
		expect(proposals.every(({ recommended }) => recommended === false)).toBe(true);
	});

	test('classifies a credential from another project and offers an exact replacement', async () => {
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'slack-local', name: 'Local Slack', type: 'slackApi' },
		]);
		(credentialsService.getOne as Mock).mockResolvedValue({
			id: 'slack-foreign',
			name: 'Foreign Slack',
			type: 'slackApi',
		});

		const result = await analyze(
			workflow([
				workflowNode(SLACK, {
					credentials: {
						slackApi: { id: 'slack-foreign', name: 'Foreign Slack' },
					},
				}),
			]),
		);
		const issues = result.issues as Array<Record<string, unknown>>;

		expect(issues[0]).toMatchObject({
			status: 'repairable',
			problem: 'credential_not_usable_in_project',
		});
	});

	test('repairs a dangling credential reference with the project credential', async () => {
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'slack-local', name: 'Local Slack', type: 'slackApi' },
		]);

		const result = await analyze(
			workflow([
				workflowNode(SLACK, {
					credentials: { slackApi: { id: 'ghost', name: 'Old Slack', password: 'hidden' } },
				}),
			]),
		);
		const serialized = JSON.stringify(result);

		expect(result).toMatchObject({ status: 'needs_input' });
		expect(serialized).not.toContain('password');
		expect(serialized).not.toContain('hidden');
	});

	test('never proposes exact credential assignment for HTTP Request', async () => {
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'header-1', name: 'Header', type: 'httpHeaderAuth' },
		]);

		const result = await analyze(workflow([workflowNode(HTTP_REQUEST, { typeVersion: 4 })]));
		const issues = result.issues as Array<Record<string, unknown>>;

		expect(issues[0]).toMatchObject({ status: 'blocked', proposals: [] });
	});

	test('offers an Anthropic replacement for a portable OpenAI chat model', async () => {
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'anthropic-1', name: 'Claude', type: 'anthropicApi' },
		]);
		const openAiNode = workflowNode(OPENAI, { name: 'Generate digest', parameters: {} });
		const connections = {
			'Generate digest': {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Summarize', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
		};

		const result = await analyze(workflow([openAiNode], connections));
		const issues = result.issues as Array<Record<string, unknown>>;
		const proposals = issues[0].proposals as Array<Record<string, unknown>>;

		expect(proposals).toEqual([
			expect.objectContaining({
				kind: 'replace_chat_model',
				recommended: true,
				replacement: { type: ANTHROPIC, typeVersion: 1.5 },
				requires: [expect.objectContaining({ key: 'model', kind: 'resource_choice' })],
			}),
		]);
	});

	test('blocks chat-model replacement when provider-specific options are present', async () => {
		(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
			{ id: 'anthropic-1', name: 'Claude', type: 'anthropicApi' },
		]);
		const openAiNode = workflowNode(OPENAI, {
			name: 'Generate digest',
			parameters: { options: { responseFormat: 'json_object' } },
		});
		const connections = {
			'Generate digest': {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Summarize', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
		};

		const result = await analyze(workflow([openAiNode], connections));
		const issues = result.issues as Array<Record<string, unknown>>;

		expect(issues[0]).toMatchObject({
			status: 'blocked',
			problem: 'unsupported_configuration',
			proposals: [],
		});
	});

	test('reports an unavailable node and downgrades disabled incompatibilities to warnings', async () => {
		const active = await analyze(workflow([workflowNode('community.missing')]));
		const disabled = await analyze(
			workflow([workflowNode('community.missing', { disabled: true })]),
		);

		expect(active).toMatchObject({
			status: 'has_blockers',
			summary: { blocked: 1 },
		});
		expect(disabled).toMatchObject({
			status: 'compatible',
			summary: { blocked: 0, warnings: 1 },
			issues: [],
		});
	});

	test('distinguishes an unavailable node version', async () => {
		const result = await analyze(workflow([workflowNode(SLACK, { typeVersion: 99 })]));
		const issues = result.issues as Array<Record<string, unknown>>;

		expect(issues[0]).toMatchObject({ problem: 'node_version_unavailable' });
	});

	test('returns a structured error when the workflow exceeds 100 nodes', async () => {
		const nodes = Array.from({ length: 101 }, (_, index) =>
			workflowNode('n8n-nodes-base.noOp', { id: `node-${index}`, name: `Node ${index}` }),
		);

		const result = await analyze(workflow(nodes));

		expect(result.error).toContain('100-node');
		expect(result).not.toHaveProperty('issues');
	});
});
