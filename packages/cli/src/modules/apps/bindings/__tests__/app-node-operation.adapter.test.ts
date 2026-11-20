import type { AppNodeOperationBinding } from '@n8n/api-types';
import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, CredentialsRepository, User } from '@n8n/db';
import { BadRequestError, NotFoundError, UserError } from '@n8n/errors';
import type { INodeType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { validateNodeToolConfigs } from '@/modules/agents/utils/node-tool-validation';
import type { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import type { NodeTypes } from '@/node-types';

import { AppNodeOperationAdapter } from '../app-node-operation.adapter';

vi.mock('@/node-execution/resolve-tool-node-type', () => ({
	resolveToolNodeType: (nodeType: string) => `${nodeType}Tool`,
}));
// The real check loads the node schemas of the workflow SDK.
vi.mock('@/modules/agents/utils/node-tool-validation', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/modules/agents/utils/node-tool-validation')>()),
	validateNodeToolConfigs: vi.fn(),
}));

const user = mock<User>({ id: 'user-1' });

const binding: AppNodeOperationBinding = {
	key: 'availability',
	kind: 'nodeOperation',
	node: {
		nodeType: 'n8n-nodes-base.googleCalendar',
		nodeTypeVersion: 1.3,
		nodeParameters: {
			resource: 'calendar',
			operation: 'availability',
			timeMin: "={{ $fromAI('from', 'Start of the range', 'string') }}",
		},
		credentials: { googleCalendarOAuth2Api: { id: 'c1', name: 'Team calendar' } },
	},
};

const httpBinding = (url: string): AppNodeOperationBinding => ({
	key: 'fetch',
	kind: 'nodeOperation',
	node: { nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 4.2, nodeParameters: { url } },
});

function setup() {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue(
		mock<INodeType>({
			description: {
				displayName: 'Google Calendar',
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						default: 'availability',
						options: [{ name: 'Availability', value: 'availability' }],
					},
				],
			},
		}),
	);
	const executor = mock<EphemeralNodeExecutor>();
	const credentialsFinder = mock<CredentialsFinderService>();
	credentialsFinder.findCredentialForUser.mockResolvedValue(
		mock<CredentialsEntity>({ id: 'c1', name: 'Team calendar', isResolvable: false }),
	);
	const credentialsRepository = mock<CredentialsRepository>();
	credentialsRepository.findCredentialsUsableInProject.mockResolvedValue([
		{ id: 'c1', name: 'Team calendar', type: 'googleCalendarOAuth2Api' },
	]);
	vi.mocked(validateNodeToolConfigs).mockResolvedValue(null);
	const adapter = new AppNodeOperationAdapter(
		nodeTypes,
		executor,
		credentialsFinder,
		credentialsRepository,
	);
	return { adapter, nodeTypes, executor, credentialsFinder, credentialsRepository };
}

describe('AppNodeOperationAdapter', () => {
	describe('assertCanBind', () => {
		it('accepts a node the binder can run with a credential they can read', async () => {
			const { adapter, executor, credentialsFinder, credentialsRepository } = setup();

			await expect(adapter.assertCanBind(user, 'project-1', binding)).resolves.toBeUndefined();

			expect(executor.validateNodeForExecution).toHaveBeenCalledWith(
				'n8n-nodes-base.googleCalendarTool',
				1.3,
				binding.node.nodeParameters,
			);
			expect(credentialsFinder.findCredentialForUser).toHaveBeenCalledWith('c1', user, [
				'credential:read',
			]);
			expect(credentialsRepository.findCredentialsUsableInProject).toHaveBeenCalledWith(
				'project-1',
				['c1'],
			);
		});

		it('refuses a node that cannot run outside a workflow', async () => {
			const { adapter, executor } = setup();
			executor.validateNodeForExecution.mockImplementation(() => {
				throw new UserError('Node is not usable as a tool');
			});

			await expect(adapter.assertCanBind(user, 'project-1', binding)).rejects.toThrow(
				'Binding "availability": Node is not usable as a tool',
			);
		});

		it('refuses an HTTP Request node whose URL the app sets', async () => {
			const { adapter } = setup();

			await expect(
				adapter.assertCanBind(user, 'project-1', httpBinding("={{ $fromAI('url') }}")),
			).rejects.toThrow(BadRequestError);
			await expect(
				adapter.assertCanBind(user, 'project-1', httpBinding('https://api.example.com/items')),
			).resolves.toBeUndefined();
		});

		it('refuses parameters that do not match the node', async () => {
			const { adapter } = setup();
			vi.mocked(validateNodeToolConfigs).mockResolvedValue('Unknown parameter "foo"');

			await expect(adapter.assertCanBind(user, 'project-1', binding)).rejects.toThrow(
				'Binding "availability": Unknown parameter "foo"',
			);
		});

		it('refuses a credential that the binder cannot read', async () => {
			const { adapter, credentialsFinder } = setup();
			credentialsFinder.findCredentialForUser.mockResolvedValue(null);

			await expect(adapter.assertCanBind(user, 'project-1', binding)).rejects.toThrow(
				NotFoundError,
			);
		});

		it.each([
			['is not in the app project', []],
			[
				'has another type than its slot',
				[{ id: 'c1', name: 'Team calendar', type: 'googleSheetsOAuth2Api' }],
			],
		])('refuses a credential that %s', async (_, usable) => {
			const { adapter, credentialsRepository } = setup();
			credentialsRepository.findCredentialsUsableInProject.mockResolvedValue(usable);

			await expect(adapter.assertCanBind(user, 'project-1', binding)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('refuses an end-user credential', async () => {
			const { adapter, credentialsFinder } = setup();
			credentialsFinder.findCredentialForUser.mockResolvedValue(
				mock<CredentialsEntity>({ id: 'c1', name: 'My calendar', isResolvable: true }),
			);

			await expect(adapter.assertCanBind(user, 'project-1', binding)).rejects.toThrow(
				'Binding "availability": "My calendar" is an end-user credential. Use a fixed credential.',
			);
		});
	});

	describe('describe', () => {
		it('names the operation and describes the $fromAI inputs', async () => {
			const { adapter } = setup();

			const described = await adapter.describe('project-1', binding);

			expect(described).toEqual({
				...binding,
				name: 'Google Calendar: Availability',
				input: {
					type: 'object',
					properties: { from: { type: 'string', description: 'Start of the range' } },
					required: ['from'],
					additionalProperties: false,
				},
			});
		});

		it('describes a node without inputs as an empty object', async () => {
			const { adapter } = setup();
			const fixed = {
				...binding,
				node: { ...binding.node, nodeParameters: { operation: 'availability' } },
			};

			expect((await adapter.describe('project-1', fixed))?.input).toEqual({
				type: 'object',
				properties: {},
				additionalProperties: false,
			});
		});

		it('returns null when the node type is not available', async () => {
			const { adapter, nodeTypes } = setup();
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unknown node type');
			});

			await expect(adapter.describe('project-1', binding)).resolves.toBeNull();
		});

		it('returns null when a credential left the project', async () => {
			const { adapter, credentialsRepository } = setup();
			credentialsRepository.findCredentialsUsableInProject.mockResolvedValue([]);

			await expect(adapter.describe('project-1', binding)).resolves.toBeNull();
		});
	});
});
