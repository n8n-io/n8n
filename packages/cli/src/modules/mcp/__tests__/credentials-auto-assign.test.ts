import type { User } from '@n8n/db';
import type {
	INode,
	INodeTypeDescription,
	INodeCredentialDescription,
	IWorkflowBase,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { autoPopulateNodeCredentials } from '../tools/workflow-builder/credentials-auto-assign';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';

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
		getCredentialsAUserCanUseInAWorkflow: jest.fn().mockResolvedValue(usableCredentials),
	} as unknown as CredentialsService;

	const nodeTypes = {
		getByNameAndVersion: jest.fn().mockImplementation((type: string) => {
			const desc = nodeTypeDescriptions.get(type);
			if (!desc) throw new Error(`Unknown node type: ${type}`);
			return { description: desc };
		}),
	} as unknown as NodeTypes;

	return { credentialsService, nodeTypes };
}

describe('autoPopulateNodeCredentials', () => {
	afterEach(() => jest.restoreAllMocks());

	test('assigns credential when node needs one and a matching credential exists', async () => {
		const node = makeNode();
		const workflow = makeWorkflow([node]);
		const desc = makeNodeTypeDescription();
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'My Slack Token', type: 'slackApi' }],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', desc]]),
		});

		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([
			{ nodeName: 'Test Node', credentialName: 'My Slack Token', credentialType: 'slackApi' },
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

		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

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

		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

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

		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(false);

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

		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

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

		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);

		const result = await autoPopulateNodeCredentials(
			workflow,
			user,
			nodeTypes,
			credentialsService,
			projectId,
		);

		expect(result.assignments).toEqual([
			{ nodeName: 'Slack', credentialName: 'My Slack', credentialType: 'slackApi' },
			{ nodeName: 'Gmail', credentialName: 'My Gmail', credentialType: 'gmailOAuth2' },
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
});
