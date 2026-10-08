import type { CredentialsEntity } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { exportWorkflowPackage } from '@/modules/n8n-packages/capabilities/workflow-package-export';

import { expectRejection, user } from '../../__tests__/linked-instances.test-helpers';
import { LINK_NOT_FOUND_MESSAGE } from '../../linked-instances.service';
import { RemoteInstanceError } from '../../remote/remote-instance.errors';
import { TRANSFER_MESSAGES } from '../transfer-errors';
import {
	node,
	OPS,
	REMOTE_PERSONAL_PROJECT_ID,
	serialised,
	transferSetup,
	workflowEntity,
} from './transfer.test-helpers';

vi.mock('@/modules/n8n-packages/capabilities/workflow-package-export', () => ({
	exportWorkflowPackage: vi.fn(),
}));

const slackNode = node({
	credentials: { slackApi: { id: 'cred-slack', name: 'Old Slack name' } },
});
const stripeNode = node({
	id: 'node-2',
	name: 'Charge',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	credentials: { httpHeaderAuth: { id: 'cred-stripe', name: 'Stripe' } },
});
const subWorkflowNode = (workflowId: string, id = workflowId) =>
	node({
		id: `call-${id}`,
		name: `Call ${id}`,
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1.2,
		parameters: { workflowId: { __rl: true, mode: 'list', value: workflowId } },
	});

const storedCredential = (id: string, name: string, type: string) =>
	mock<CredentialsEntity>({ id, name, type });

async function preflightSetup(nodes = [slackNode, stripeNode]) {
	const context = transferSetup();
	const alice = user();
	const link = await context.link(alice);
	context.workflowFinder.findWorkflowForUser.mockResolvedValue(workflowEntity({ nodes }));
	context.credentialsFinder.findCredentialForUser.mockImplementation(async (id) =>
		id === 'cred-slack' ? storedCredential(id, 'Team Slack', 'slackApi') : null,
	);
	return { ...context, alice, linkId: link.id, token: link.token };
}

describe('TransferPreflightService', () => {
	it('lists what moves, matches the credentials there and names the target project', async () => {
		const { preflightService, alice, linkId, remote } = await preflightSetup();
		remote.handlers.list_credentials = () => ({
			data: [{ id: 'c9', name: 'Team Slack', type: 'slackApi', scopes: [] }],
			count: 1,
		});

		const preflight = await preflightService.preflight(alice, linkId, 'wf1');

		expect(preflight).toEqual({
			workflowName: 'Daily report',
			moves: { nodes: 2 },
			nodeTypeCheck: 'unknown',
			missingNodeTypes: [],
			credentials: [
				{ name: 'Stripe', type: 'httpHeaderAuth', status: 'needs-set-up' },
				{ name: 'Team Slack', type: 'slackApi', status: 'matched' },
			],
			targetProject: OPS,
			subWorkflowCalls: [],
		});
		expect(remote.callsOf('list_credentials')).toEqual([{ limit: 200, projectId: OPS.id }]);
	});

	it('changes nothing in either instance', async () => {
		const { preflightService, alice, linkId, client, deactivator } = await preflightSetup();

		await preflightService.preflight(alice, linkId, 'wf1');

		expect(client.callTool.mock.calls.map(([name]) => name)).toEqual(['list_credentials']);
		expect(exportWorkflowPackage).not.toHaveBeenCalled();
		expect(deactivator.turnOff).not.toHaveBeenCalled();
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('uses the stored credential name, as the export does, and the node name when the user cannot read it', async () => {
		const { preflightService, alice, linkId, credentialsFinder } = await preflightSetup();

		const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

		expect(credentials.map(({ name }) => name)).toEqual(['Stripe', 'Team Slack']);
		expect(credentialsFinder.findCredentialForUser).toHaveBeenCalledWith('cred-slack', alice, [
			'credential:read',
		]);
	});

	it('lists a credential that several nodes use once', async () => {
		const { preflightService, alice, linkId } = await preflightSetup([
			slackNode,
			{ ...slackNode, id: 'node-3', name: 'Post again' },
		]);

		const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

		expect(credentials).toEqual([{ name: 'Team Slack', type: 'slackApi', status: 'needs-set-up' }]);
	});

	it('lists every credential without a list from a partial result as unknown', async () => {
		const { preflightService, alice, linkId, remote } = await preflightSetup();
		remote.handlers.list_credentials = () => ({
			data: Array.from({ length: 200 }, (_, i) => ({ name: `Key ${i}`, type: 'apiKey' })),
			count: 200,
		});

		const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

		expect(credentials.map(({ status }) => status)).toEqual(['unknown', 'unknown']);
	});

	it('gives unknown when the token cannot list credentials there', async () => {
		const { preflightService, alice, linkId, client, remote } = await preflightSetup();
		client.probe.mockResolvedValue({ ok: true, toolNames: ['import_workflow_package'] });

		const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

		expect(credentials.every(({ status }) => status === 'unknown')).toBe(true);
		expect(remote.callsOf('list_credentials')).toEqual([]);
	});

	it('gives unknown and logs ids only when the credential list fails', async () => {
		const { preflightService, alice, linkId, remote, logger } = await preflightSetup();
		remote.handlers.list_credentials = () => {
			throw new RemoteInstanceError('timeout');
		};

		const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

		expect(credentials.every(({ status }) => status === 'unknown')).toBe(true);
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not list the credentials of a linked instance',
			{
				linkedInstanceId: linkId,
				reason: 'timeout',
			},
		);
	});

	describe('without a default project', () => {
		async function personalSetup() {
			const context = transferSetup();
			const alice = user();
			const link = await context.link(alice, null);
			context.workflowFinder.findWorkflowForUser.mockResolvedValue(
				workflowEntity({ nodes: [slackNode] }),
			);
			context.credentialsFinder.findCredentialForUser.mockResolvedValue(
				storedCredential('cred-slack', 'Team Slack', 'slackApi'),
			);
			return { ...context, alice, linkId: link.id };
		}

		it('matches the credentials of the personal project there, where the move goes', async () => {
			const { preflightService, alice, linkId, remote } = await personalSetup();
			remote.handlers.list_credentials = (args) => ({
				data:
					args.projectId === REMOTE_PERSONAL_PROJECT_ID
						? [{ id: 'c9', name: 'Team Slack', type: 'slackApi' }]
						: [],
			});

			const preflight = await preflightService.preflight(alice, linkId, 'wf1');

			expect(preflight.targetProject).toBeNull();
			expect(preflight.credentials).toEqual([
				{ name: 'Team Slack', type: 'slackApi', status: 'matched' },
			]);
			expect(remote.callsOf('search_projects')).toEqual([{ type: 'personal', limit: 1 }]);
			expect(remote.callsOf('list_credentials')).toEqual([
				{ limit: 200, projectId: REMOTE_PERSONAL_PROJECT_ID },
			]);
		});

		it('gives unknown, and lists nothing, when the token cannot list projects', async () => {
			const { preflightService, alice, linkId, client, remote } = await personalSetup();
			client.probe.mockResolvedValue({
				ok: true,
				toolNames: ['import_workflow_package', 'list_credentials'],
			});

			const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

			expect(credentials).toEqual([{ name: 'Team Slack', type: 'slackApi', status: 'unknown' }]);
			expect(remote.callsOf('list_credentials')).toEqual([]);
		});

		it('gives unknown when the instance lists no personal project', async () => {
			const { preflightService, alice, linkId, remote } = await personalSetup();
			remote.handlers.search_projects = () => ({ data: [], count: 0 });

			const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

			expect(credentials.map(({ status }) => status)).toEqual(['unknown']);
			expect(remote.callsOf('list_credentials')).toEqual([]);
		});

		it('gives unknown and logs ids only when the project list fails', async () => {
			const { preflightService, alice, linkId, remote, logger } = await personalSetup();
			remote.handlers.search_projects = () => ({ unexpected: true });

			const { credentials } = await preflightService.preflight(alice, linkId, 'wf1');

			expect(credentials.map(({ status }) => status)).toEqual(['unknown']);
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not list the credentials of a linked instance',
				{ linkedInstanceId: linkId, reason: 'tool-error' },
			);
		});
	});

	it('names the sub-workflows that block the move, when the user can read them', async () => {
		const { preflightService, alice, linkId, workflowFinder } = await preflightSetup([
			subWorkflowNode('wf-3'),
			subWorkflowNode('wf-2'),
			subWorkflowNode('wf-2', 'again'),
		]);
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([
			workflowEntity({ id: 'wf-2', name: 'Send invoice' }),
		]);

		const { subWorkflowCalls } = await preflightService.preflight(alice, linkId, 'wf1');

		expect(subWorkflowCalls).toEqual([
			{ id: 'wf-2', name: 'Send invoice' },
			{ id: 'wf-3', name: null },
		]);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(['wf-2', 'wf-3'], alice, [
			'workflow:read',
		]);
	});

	it('does not look up sub-workflows for a workflow without calls', async () => {
		const { preflightService, alice, linkId, workflowFinder } = await preflightSetup();

		await preflightService.preflight(alice, linkId, 'wf1');

		expect(workflowFinder.findWorkflowsByIdsForUser).not.toHaveBeenCalled();
	});

	it('answers 404 for a link of another user and for a workflow that the user cannot read', async () => {
		const { preflightService, alice, linkId, workflowFinder, clientFactory } =
			await preflightSetup();

		await expectRejection(
			preflightService.preflight(user(), linkId, 'wf1'),
			NotFoundError,
			LINK_NOT_FOUND_MESSAGE,
		);
		workflowFinder.findWorkflowForUser.mockResolvedValue(null);
		await expectRejection(
			preflightService.preflight(alice, linkId, 'wf1'),
			NotFoundError,
			TRANSFER_MESSAGES.workflowNotFound,
		);
		expect(clientFactory.create).not.toHaveBeenCalled();
	});

	it('maps a failed probe and a missing import tool to a 400', async () => {
		const { preflightService, alice, linkId, client } = await preflightSetup();

		client.probe.mockResolvedValueOnce({ ok: false, reason: 'unreachable' });
		await expectRejection(
			preflightService.preflight(alice, linkId, 'wf1'),
			BadRequestError,
			"Can't reach Cloud. Check that it's running, then try again.",
		);
		client.probe.mockResolvedValueOnce({ ok: true, toolNames: ['search_workflows'] });
		await expectRejection(
			preflightService.preflight(alice, linkId, 'wf1'),
			BadRequestError,
			TRANSFER_MESSAGES.cannotReceive('Cloud'),
		);
	});

	it('never shows or logs the access token', async () => {
		const { preflightService, alice, linkId, token, logger, remote } = await preflightSetup();
		remote.handlers.list_credentials = () => {
			throw new RemoteInstanceError('tool-error', 'Refused [REDACTED]');
		};

		const preflight = await preflightService.preflight(alice, linkId, 'wf1');

		expect(serialised(preflight, logger.warn.mock.calls, logger.info.mock.calls)).not.toContain(
			token,
		);
	});
});
