import type { User } from '@n8n/db';
import type { INode, INodeTypeDescription, INodeCredentialDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { validateWorkflowCredentialReferences } from '../tools/workflow-builder/credential-validation';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { NodeTypes } from '@/node-types';

const user = { id: 'user-1' } as User;
const projectId = 'project-1';

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'node-1',
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function makeNodeTypeDescription(
	overrides: Partial<INodeTypeDescription> = {},
): INodeTypeDescription {
	const credentials: INodeCredentialDescription[] = [{ name: 'slackApi', required: true }];
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
		credentials,
		...overrides,
	} as unknown as INodeTypeDescription;
}

function createMocks({
	usableCredentials = [],
	getOneImpl,
	nodeTypeDescriptions = new Map<string, INodeTypeDescription>(),
}: {
	usableCredentials?: Array<{ id: string; name: string; type: string }>;
	getOneImpl?: (id: string) => Promise<{ id: string; name: string; type: string }>;
	nodeTypeDescriptions?: Map<string, INodeTypeDescription>;
} = {}) {
	const credentialsService = {
		getCredentialsAUserCanUseInAWorkflow: jest.fn().mockResolvedValue(usableCredentials),
		getOne: jest.fn().mockImplementation(async (_user: User, id: string) => {
			if (getOneImpl) return await getOneImpl(id);
			throw new NotFoundError(`Credential with ID "${id}" could not be found.`);
		}),
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

describe('validateWorkflowCredentialReferences', () => {
	beforeEach(() => {
		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(true);
	});

	afterEach(() => jest.restoreAllMocks());

	test('passes when no node has a credential reference', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', makeNodeTypeDescription()]]),
		});

		const result = await validateWorkflowCredentialReferences(
			[makeNode()],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(true);
		// Lazy: never builds the classifier when there's nothing to check.
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
	});

	test('passes when the credential is reachable from the project', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', makeNodeTypeDescription()]]),
		});

		const result = await validateWorkflowCredentialReferences(
			[makeNode({ credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } } })],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(true);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId,
		});
	});

	test('fails for a credential that exists but belongs to another project', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [],
			getOneImpl: async (id) => ({ id, name: 'Other Project Slack', type: 'slackApi' }),
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', makeNodeTypeDescription()]]),
		});

		const result = await validateWorkflowCredentialReferences(
			[
				makeNode({
					credentials: { slackApi: { id: 'cred-foreign', name: 'Other Project Slack' } },
				}),
			],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('unreachable');
		expect(result.error).toContain('Slack');
		expect(result.error).toContain("credential 'cred-foreign' is not usable");
		expect(result.error).toContain("this workflow's project");
	});

	test('fails for a credential that cannot be found at all', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', makeNodeTypeDescription()]]),
		});

		const result = await validateWorkflowCredentialReferences(
			[makeNode({ credentials: { slackApi: { id: 'ghost', name: 'Ghost' } } })],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('unreachable');
		expect(result.error).toContain("credential 'ghost' not found or not accessible");
	});

	test('fails when the usable credential has a mismatched type', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [{ id: 'cred-1', name: 'Wrong', type: 'discordApi' }],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', makeNodeTypeDescription()]]),
		});

		const result = await validateWorkflowCredentialReferences(
			[makeNode({ credentials: { slackApi: { id: 'cred-1', name: 'Wrong' } } })],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('unreachable');
		expect(result.error).toContain("is type 'discordApi'");
	});

	test('skips disabled nodes', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', makeNodeTypeDescription()]]),
		});

		const result = await validateWorkflowCredentialReferences(
			[
				makeNode({
					disabled: true,
					credentials: { slackApi: { id: 'cred-foreign', name: 'Foreign' } },
				}),
			],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(true);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
	});

	test('skips credential types the node does not actively use', async () => {
		jest.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(false);
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [],
			nodeTypeDescriptions: new Map([['n8n-nodes-base.slack', makeNodeTypeDescription()]]),
		});

		const result = await validateWorkflowCredentialReferences(
			[makeNode({ credentials: { slackApi: { id: 'cred-foreign', name: 'Foreign' } } })],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		// slackApi is not displayed, so it isn't an active type → not checked.
		expect(result.ok).toBe(true);
	});

	test('checks HTTP Request credentials declared via nodeCredentialType', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [],
			getOneImpl: async (id) => ({ id, name: 'GitHub account', type: 'githubApi' }),
			nodeTypeDescriptions: new Map([
				[
					'n8n-nodes-base.httpRequest',
					makeNodeTypeDescription({ name: 'n8n-nodes-base.httpRequest', credentials: [] }),
				],
			]),
		});

		const result = await validateWorkflowCredentialReferences(
			[
				makeNode({
					name: 'Fetch PR Comments',
					type: 'n8n-nodes-base.httpRequest',
					parameters: {
						authentication: 'predefinedCredentialType',
						nodeCredentialType: 'githubApi',
					},
					credentials: { githubApi: { id: 'cred-foreign', name: 'GitHub account' } },
				}),
			],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('unreachable');
		expect(result.error).toContain('Fetch PR Comments');
		expect(result.error).toContain("credential 'cred-foreign' is not usable");
	});

	test('validates every credential when the node type cannot be resolved', async () => {
		const { credentialsService, nodeTypes } = createMocks({
			usableCredentials: [],
			getOneImpl: async (id) => ({ id, name: 'Foreign', type: 'slackApi' }),
			nodeTypeDescriptions: new Map(), // no types registered → getByNameAndVersion throws
		});

		const result = await validateWorkflowCredentialReferences(
			[makeNode({ credentials: { slackApi: { id: 'cred-foreign', name: 'Foreign' } } })],
			user,
			credentialsService,
			nodeTypes,
			projectId,
		);

		expect(result.ok).toBe(false);
	});
});
