import type { User } from '@n8n/db';
import type {
	INode,
	INodeTypeDescription,
	INodeCredentialDescription,
	IWorkflowBase,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';

import {
	autoPopulateNodeCredentials,
	trackAutoassignOutcomes,
	type SlotOutcome,
} from '../tools/workflow-builder/credentials-auto-assign';

const user = { id: 'user-1' } as User;
const projectId = 'project-1';

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'node-1',
		name: 'Test Node',
		type: 'n8n-nodes-base.slack',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function makeWorkflow(nodes: INode[]): IWorkflowBase {
	return { name: 'Test', nodes, connections: {}, active: false } as IWorkflowBase;
}

function makeCredentialDescription(
	overrides: Partial<INodeCredentialDescription> = {},
): INodeCredentialDescription {
	return { name: 'slackApi', required: true, ...overrides };
}

function makeNodeTypeDescription(
	overrides: Partial<INodeTypeDescription> = {},
): INodeTypeDescription {
	return {
		displayName: 'Slack',
		name: 'n8n-nodes-base.slack',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Slack' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		credentials: [makeCredentialDescription()],
		...overrides,
	} as unknown as INodeTypeDescription;
}

function createMocks({
	usableCredentials = [],
	nodeTypeDescriptions = new Map<string, INodeTypeDescription>(),
}: {
	usableCredentials?: Array<{ id: string; name: string; type: string }>;
	nodeTypeDescriptions?: Map<string, INodeTypeDescription>;
} = {}) {
	const credentialsService = {
		getCredentialsAUserCanUseInAWorkflow: vi.fn().mockResolvedValue(usableCredentials),
	} as unknown as CredentialsService;

	const nodeTypes = {
		getByNameAndVersion: vi.fn().mockImplementation((type: string) => {
			const desc = nodeTypeDescriptions.get(type);
			if (!desc) throw new Error(`Unknown node type: ${type}`);
			return { description: desc };
		}),
	} as unknown as NodeTypes;

	return { credentialsService, nodeTypes };
}

describe('autoPopulateNodeCredentials', () => {
	afterEach(() => vi.restoreAllMocks());

	test('assigns credential when node needs one and a matching credential exists', async () => {
		const node = makeNode();
		const workflow = makeWorkflow([node]);
		const desc = makeNodeTypeDescription();
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'My Slack Token', type: 'slackApi' }],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
		});

		vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([
			{
				nodeName: 'Test Node',
				credentialName: 'My Slack Token',
				credentialType: 'slackApi',
				source: 'user',
			},
		]);
		expect(node.credentials).toEqual({ slackApi: { id: 'cred-1', name: 'My Slack Token' } });
		expect(result.skippedHttpNodes).toEqual([]);
	});

	test('returns empty assignments when no credentials are available', async () => {
		const node = makeNode();
		const workflow = makeWorkflow([node]);
		const desc = makeNodeTypeDescription();
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
		});

		vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([]);
		expect(node.credentials).toBeUndefined();
	});

	test('skips disabled nodes', async () => {
		const node = makeNode({ disabled: true });
		const workflow = makeWorkflow([node]);
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'My Slack Token', type: 'slackApi' }],
		});

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([]);
		expect(nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
	});

	test('skips HTTP Request nodes and reports them', async () => {
		const httpNodes = [
			makeNode({ id: '1', name: 'HTTP 1', type: 'n8n-nodes-base.httpRequest' }),
			makeNode({ id: '2', name: 'HTTP 2', type: '@n8n/n8n-nodes-langchain.toolHttpRequest' }),
			makeNode({ id: '3', name: 'HTTP 3', type: 'n8n-nodes-base.httpRequestTool' }),
		];
		const workflow = makeWorkflow(httpNodes);
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'Some Cred', type: 'httpHeaderAuth' }],
		});

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.skippedHttpNodes).toEqual(['HTTP 1', 'HTTP 2', 'HTTP 3']);
		expect(result.assignments).toEqual([]);
	});

	test('skips node when credential is already assigned', async () => {
		const node = makeNode({
			credentials: { slackApi: { id: 'existing-cred', name: 'Existing' } },
		});
		const workflow = makeWorkflow([node]);
		const desc = makeNodeTypeDescription();
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'Another Slack Token', type: 'slackApi' }],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
		});

		vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([]);
		expect(node.credentials).toEqual({ slackApi: { id: 'existing-cred', name: 'Existing' } });
	});

	test('skips node when nodeType is unknown', async () => {
		const node = makeNode({ type: 'n8n-nodes-base.unknown' });
		const workflow = makeWorkflow([node]);
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'Cred', type: 'someApi' }],
			nodeTypeDescriptions: new Map(), // no types registered
		});

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([]);
	});

	test('skips node when nodeType has no credential descriptions', async () => {
		const node = makeNode({ type: 'n8n-nodes-base.set' });
		const workflow = makeWorkflow([node]);
		const desc = makeNodeTypeDescription({
			name: 'n8n-nodes-base.set',
			credentials: undefined,
		});
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'Cred', type: 'someApi' }],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.set', desc]]),
		});

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([]);
	});

	test('skips credential when displayParameter returns false', async () => {
		const node = makeNode();
		const workflow = makeWorkflow([node]);
		const desc = makeNodeTypeDescription();
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'My Slack Token', type: 'slackApi' }],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
		});

		vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(false);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([]);
	});

	test('assigns first available credential when multiple candidates exist', async () => {
		const node = makeNode();
		const workflow = makeWorkflow([node]);
		const desc = makeNodeTypeDescription();
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [
				{ id: 'cred-1', name: 'Slack Token A', type: 'slackApi' },
				{ id: 'cred-2', name: 'Slack Token B', type: 'slackApi' },
			],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
		});

		vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toHaveLength(1);
		expect(result.assignments[0].credentialName).toBe('Slack Token A');
		expect(node.credentials?.slackApi).toEqual({ id: 'cred-1', name: 'Slack Token A' });
	});

	test('handles multiple nodes with different credential types', async () => {
		const slackNode = makeNode({ id: '1', name: 'Slack', type: 'n8n-nodes-base.slack' });
		const gmailNode = makeNode({ id: '2', name: 'Gmail', type: 'n8n-nodes-base.gmail' });
		const workflow = makeWorkflow([slackNode, gmailNode]);

		const slackDesc = makeNodeTypeDescription({
			name: 'n8n-nodes-base.slack',
			credentials: [makeCredentialDescription({ name: 'slackApi' })],
		});
		const gmailDesc = makeNodeTypeDescription({
			name: 'n8n-nodes-base.gmail',
			credentials: [makeCredentialDescription({ name: 'gmailOAuth2' })],
		});

		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [
				{ id: 'cred-1', name: 'My Slack', type: 'slackApi' },
				{ id: 'cred-2', name: 'My Gmail', type: 'gmailOAuth2' },
			],
			nodeTypeDescriptions: new Map([
				['n8n-nodes-base.slack', slackDesc],
				['n8n-nodes-base.gmail', gmailDesc],
			]),
		});

		vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([
			{
				nodeName: 'Slack',
				credentialName: 'My Slack',
				credentialType: 'slackApi',
				source: 'user',
			},
			{
				nodeName: 'Gmail',
				credentialName: 'My Gmail',
				credentialType: 'gmailOAuth2',
				source: 'user',
			},
		]);
	});

	test('passes projectId to credentialsService', async () => {
		const workflow = makeWorkflow([]);
		const { credentialsService, nodeTypes } = createMocks();

		await autoPopulateNodeCredentials(workflow, user, nodeTypes, credentialsService, projectId);

		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId,
		});
	});

	describe('AI Gateway fallback', () => {
		const gatewayConfig = {
			nodes: ['n8n-nodes-base.slack'],
			credentialTypes: ['slackApi'],
			providerConfig: {
				slackApi: { gatewayPath: '/v1/gateway/slack', urlField: 'url', apiKeyField: 'apiKey' },
			},
		} as const;

		function makeAiGatewayService(available: boolean) {
			const isAvailable = vi
				.fn()
				.mockResolvedValue(
					available ? { available: true, config: gatewayConfig } : { available: false },
				);
			return { isAvailable } as unknown as import('@/services/ai-gateway.service').AiGatewayService;
		}

		test('attaches the AI Gateway sentinel when user has no cred and gateway is eligible', async () => {
			const node = makeNode();
			const workflow = makeWorkflow([node]);
			const desc = makeNodeTypeDescription();
			const { credentialsService, nodeTypes } = createMocks({
				usableCredentials: [],
				nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
			});
			vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

			const result = await autoPopulateNodeCredentials(
				workflow,
				user,
				nodeTypes,
				credentialsService,
				projectId,
				makeAiGatewayService(true),
			);

			expect(node.credentials).toEqual({
				slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(result.assignments).toEqual([
				{
					nodeName: 'Test Node',
					credentialName: 'n8n credits',
					credentialType: 'slackApi',
					source: 'aiGateway',
				},
			]);
			expect(result.outcomes).toEqual([
				{
					nodeName: 'Test Node',
					credentialType: 'slackApi',
					source: 'aiGateway',
					hadUserCredential: false,
					aiGatewayAvailable: true,
				},
			]);
		});

		test('prefers user credential when both exist', async () => {
			const node = makeNode();
			const workflow = makeWorkflow([node]);
			const desc = makeNodeTypeDescription();
			const { credentialsService, nodeTypes } = createMocks({
				usableCredentials: [{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }],
				nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
			});
			vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

			const result = await autoPopulateNodeCredentials(
				workflow,
				user,
				nodeTypes,
				credentialsService,
				projectId,
				makeAiGatewayService(true),
			);

			expect(node.credentials).toEqual({ slackApi: { id: 'cred-1', name: 'My Slack' } });
			expect(result.outcomes).toEqual([
				{
					nodeName: 'Test Node',
					credentialType: 'slackApi',
					source: 'user',
					hadUserCredential: true,
					aiGatewayAvailable: true,
				},
			]);
		});

		test('leaves slot empty and records reasonNotAiGateway when gateway unavailable', async () => {
			const node = makeNode();
			const workflow = makeWorkflow([node]);
			const desc = makeNodeTypeDescription();
			const { credentialsService, nodeTypes } = createMocks({
				usableCredentials: [],
				nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
			});
			vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

			const result = await autoPopulateNodeCredentials(
				workflow,
				user,
				nodeTypes,
				credentialsService,
				projectId,
				makeAiGatewayService(false),
			);

			expect(node.credentials).toBeUndefined();
			expect(result.outcomes).toEqual([
				{
					nodeName: 'Test Node',
					credentialType: 'slackApi',
					source: 'none',
					hadUserCredential: false,
					aiGatewayAvailable: false,
					reasonNotAiGateway: 'notAvailable',
				},
			]);
		});

		test('leaves slot empty when gateway is available but node is not covered', async () => {
			const node = makeNode({ type: 'n8n-nodes-base.gmail' });
			const workflow = makeWorkflow([node]);
			const desc = makeNodeTypeDescription({
				name: 'n8n-nodes-base.gmail',
				credentials: [makeCredentialDescription({ name: 'gmailOAuth2' })],
			});
			const { credentialsService, nodeTypes } = createMocks({
				usableCredentials: [],
				nodeTypeDescriptions: new Map([['n8n-nodes-base.gmail', desc]]),
			});
			vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

			const result = await autoPopulateNodeCredentials(
				workflow,
				user,
				nodeTypes,
				credentialsService,
				projectId,
				makeAiGatewayService(true),
			);

			expect(node.credentials).toBeUndefined();
			expect(result.outcomes).toEqual([
				{
					nodeName: 'Test Node',
					credentialType: 'gmailOAuth2',
					source: 'none',
					hadUserCredential: false,
					aiGatewayAvailable: true,
					reasonNotAiGateway: 'nodeNotCovered',
				},
			]);
		});

		test('isAvailable() returning unavailable falls through to empty slot', async () => {
			const node = makeNode();
			const workflow = makeWorkflow([node]);
			const desc = makeNodeTypeDescription();
			const { credentialsService, nodeTypes } = createMocks({
				usableCredentials: [],
				nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
			});
			vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

			const aiGatewayService = {
				isAvailable: vi.fn().mockResolvedValue({ available: false }),
			} as unknown as import('@/services/ai-gateway.service').AiGatewayService;

			const result = await autoPopulateNodeCredentials(
				workflow,
				user,
				nodeTypes,
				credentialsService,
				projectId,
				aiGatewayService,
			);

			expect(node.credentials).toBeUndefined();
			expect(result.outcomes[0]).toMatchObject({
				source: 'none',
				aiGatewayAvailable: false,
				reasonNotAiGateway: 'notAvailable',
			});
		});

		test('legacy call (no aiGatewayService) preserves pre-change behavior', async () => {
			const node = makeNode();
			const workflow = makeWorkflow([node]);
			const desc = makeNodeTypeDescription();
			const { credentialsService, nodeTypes } = createMocks({
				usableCredentials: [],
				nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
			});
			vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

			const result = await autoPopulateNodeCredentials(
				workflow,
				user,
				nodeTypes,
				credentialsService,
				projectId,
			);

			expect(node.credentials).toBeUndefined();
			expect(result.assignments).toEqual([]);
			expect(result.outcomes).toEqual([
				{
					nodeName: 'Test Node',
					credentialType: 'slackApi',
					source: 'none',
					hadUserCredential: false,
					aiGatewayAvailable: false,
					reasonNotAiGateway: 'notAvailable',
				},
			]);
		});

		describe('incoming n8n Connect markers', () => {
			const suppliedMarker = { id: null, name: 'supplied name', __aiGatewayManaged: true } as const;

			test('keeps an eligible incoming marker and honors it over the user credential', async () => {
				const node = makeNode({ credentials: { slackApi: { ...suppliedMarker } } });
				const workflow = makeWorkflow([node]);
				const desc = makeNodeTypeDescription();
				const { credentialsService, nodeTypes } = createMocks({
					usableCredentials: [{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }],
					nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
				});
				vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

				const result = await autoPopulateNodeCredentials(
					workflow,
					user,
					nodeTypes,
					credentialsService,
					projectId,
					makeAiGatewayService(true),
				);

				// Canonicalized to the sentinel and kept — the explicit n8n Connect request
				// wins over the owned credential, and no assignment is recorded for it.
				expect(node.credentials).toEqual({
					slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
				});
				expect(result.assignments).toEqual([]);
				expect(result.outcomes).toEqual([]);
			});

			test('strips an ineligible incoming marker when the node is not covered', async () => {
				const node = makeNode({
					type: 'n8n-nodes-base.gmail',
					credentials: { gmailOAuth2: { ...suppliedMarker } },
				});
				const workflow = makeWorkflow([node]);
				const desc = makeNodeTypeDescription({
					name: 'n8n-nodes-base.gmail',
					credentials: [makeCredentialDescription({ name: 'gmailOAuth2' })],
				});
				const { credentialsService, nodeTypes } = createMocks({
					usableCredentials: [],
					nodeTypeDescriptions: new Map([['n8n-nodes-base.gmail', desc]]),
				});
				vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

				const result = await autoPopulateNodeCredentials(
					workflow,
					user,
					nodeTypes,
					credentialsService,
					projectId,
					makeAiGatewayService(true),
				);

				expect(node.credentials?.gmailOAuth2).toBeUndefined();
				expect(result.outcomes[0]).toMatchObject({
					source: 'none',
					reasonNotAiGateway: 'nodeNotCovered',
				});
			});

			test('strips a marker on an HTTP Request node', async () => {
				const node = makeNode({
					name: 'HTTP',
					type: 'n8n-nodes-base.httpRequest',
					credentials: { slackApi: { ...suppliedMarker } },
				});
				const workflow = makeWorkflow([node]);
				const { credentialsService, nodeTypes } = createMocks({ usableCredentials: [] });

				const result = await autoPopulateNodeCredentials(
					workflow,
					user,
					nodeTypes,
					credentialsService,
					projectId,
					makeAiGatewayService(true),
				);

				expect(node.credentials?.slackApi).toBeUndefined();
				expect(result.skippedHttpNodes).toEqual(['HTTP']);
			});

			test('strips a marker placed under an undeclared credential key', async () => {
				const node = makeNode({
					credentials: {
						slackApi: { id: 'cred-1', name: 'My Slack' },
						bogusApi: { ...suppliedMarker },
					},
				});
				const workflow = makeWorkflow([node]);
				const desc = makeNodeTypeDescription();
				const { credentialsService, nodeTypes } = createMocks({
					nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
				});
				vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

				await autoPopulateNodeCredentials(
					workflow,
					user,
					nodeTypes,
					credentialsService,
					projectId,
					makeAiGatewayService(true),
				);

				expect(node.credentials?.bogusApi).toBeUndefined();
				// The explicit credential id on the declared slot is left untouched.
				expect(node.credentials?.slackApi).toEqual({ id: 'cred-1', name: 'My Slack' });
			});

			test('strips an incoming marker when the gateway is unavailable', async () => {
				const node = makeNode({ credentials: { slackApi: { ...suppliedMarker } } });
				const workflow = makeWorkflow([node]);
				const desc = makeNodeTypeDescription();
				const { credentialsService, nodeTypes } = createMocks({
					usableCredentials: [],
					nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
				});
				vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

				const result = await autoPopulateNodeCredentials(
					workflow,
					user,
					nodeTypes,
					credentialsService,
					projectId,
					makeAiGatewayService(false),
				);

				expect(node.credentials?.slackApi).toBeUndefined();
				expect(result.outcomes[0]).toMatchObject({
					source: 'none',
					reasonNotAiGateway: 'notAvailable',
				});
			});
		});
	});
});

describe('trackAutoassignOutcomes', () => {
	const makeTelemetry = () => ({ track: vi.fn() }) as unknown as Telemetry;

	const gatewayOutcome: SlotOutcome = {
		nodeName: 'Slack',
		credentialType: 'slackApi',
		source: 'aiGateway',
		hadUserCredential: false,
		aiGatewayAvailable: true,
	};
	const userOutcome: SlotOutcome = {
		nodeName: 'Gmail',
		credentialType: 'gmailOAuth2',
		source: 'user',
		hadUserCredential: true,
		aiGatewayAvailable: true,
	};
	const noneOutcome: SlotOutcome = {
		nodeName: 'HTTP',
		credentialType: 'httpBasicAuth',
		source: 'none',
		hadUserCredential: false,
		aiGatewayAvailable: false,
		reasonNotAiGateway: 'notAvailable',
	};

	it("emits 'Node credential assigned' with source mcp and kind n8n_connect for a gateway slot", () => {
		const telemetry = makeTelemetry();

		trackAutoassignOutcomes(
			telemetry,
			'user-1',
			'update_workflow',
			[gatewayOutcome],
			undefined,
			'wf-1',
		);

		expect(telemetry.track).toHaveBeenCalledWith('Node credential assigned', {
			credential_type: 'slackApi',
			node_type: 'Slack',
			workflow_id: 'wf-1',
			credential_kind: 'n8n_connect',
			source: 'mcp',
		});
	});

	it('maps a user-credential slot to credential_kind own', () => {
		const telemetry = makeTelemetry();

		trackAutoassignOutcomes(
			telemetry,
			'user-1',
			'update_workflow',
			[userOutcome],
			undefined,
			'wf-1',
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			'Node credential assigned',
			expect.objectContaining({ credential_kind: 'own', source: 'mcp' }),
		);
	});

	it("does not emit 'Node credential assigned' for an unfilled slot", () => {
		const telemetry = makeTelemetry();

		trackAutoassignOutcomes(telemetry, 'user-1', 'create_workflow_from_code', [noneOutcome]);

		expect(telemetry.track).not.toHaveBeenCalledWith('Node credential assigned', expect.anything());
	});

	it('resolves node_type from the map and defaults workflow_id to empty when omitted', () => {
		const telemetry = makeTelemetry();
		const nodesByName = new Map([['Slack', 'n8n-nodes-base.slack']]);

		trackAutoassignOutcomes(
			telemetry,
			'user-1',
			'create_workflow_from_code',
			[gatewayOutcome],
			nodesByName,
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			'Node credential assigned',
			expect.objectContaining({ node_type: 'n8n-nodes-base.slack', workflow_id: '' }),
		);
	});

	it('still emits the MCP-specific detail event for every outcome', () => {
		const telemetry = makeTelemetry();

		trackAutoassignOutcomes(
			telemetry,
			'user-1',
			'update_workflow',
			[gatewayOutcome, noneOutcome],
			undefined,
			'wf-1',
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			'MCP credentials autoassign',
			expect.objectContaining({ source: 'aiGateway' }),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			'MCP credentials autoassign',
			expect.objectContaining({ source: 'none', reason_not_ai_gateway: 'notAvailable' }),
		);
	});
});
