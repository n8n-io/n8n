import { randomUUID } from 'node:crypto';

import { ForbiddenError, LockedError, NotFoundError, BadRequestError } from '@n8n/errors';

import { exportWorkflowPackage } from '@/modules/n8n-packages/capabilities/workflow-package-export';

import { expectRejection, CLOUD, user } from '../../__tests__/linked-instances.test-helpers';
import { LINK_NOT_FOUND_MESSAGE } from '../../linked-instances.service';
import { RemoteInstanceError } from '../../remote/remote-instance.errors';
import { TRANSFER_MESSAGES, TRANSFER_WARNINGS } from '../transfer-errors';
import { OPS, serialised, transferSetup, workflowEntity } from './transfer.test-helpers';

vi.mock('@/modules/n8n-packages/capabilities/workflow-package-export', () => ({
	exportWorkflowPackage: vi.fn(),
}));
vi.mock('@/modules/n8n-packages/capabilities/workflow-package-import', () => ({
	importWorkflowPackage: vi.fn(),
}));
vi.mock('@/modules/n8n-packages/capabilities/mcp-package-size-limit', () => ({
	instanceMcpPackageSizeLimit: () => ({ maxBytes: 1024, setting: 'N8N_PAYLOAD_SIZE_MAX' }),
}));

const PACKAGE = Buffer.from('local-package').toString('base64');

const REFUSED_PROJECT =
	'The project does not exist, or you do not have permission to create workflows in it.';

async function pushSetup(options: { defaultProject?: typeof OPS | null } = {}) {
	const context = transferSetup();
	const alice = user();
	const link = await context.link(
		alice,
		options.defaultProject === undefined ? OPS : options.defaultProject,
	);
	const workflow = workflowEntity();
	context.workflowFinder.findWorkflowForUser.mockResolvedValue(workflow);
	vi.mocked(exportWorkflowPackage).mockImplementation(async ({ workflowId, findWorkflow }) => {
		const found = await findWorkflow(workflowId);
		return {
			packageBase64: PACKAGE,
			workflowName: found.name,
			sizeBytes: 13,
			requirements: { nodeTypes: [], credentials: [] },
			warnings: [],
		};
	});
	return { ...context, alice, linkId: link.id, token: link.token, workflow };
}

beforeEach(() => {
	vi.mocked(exportWorkflowPackage).mockReset();
});

describe('TransferService.push', () => {
	it('exports the workflow here, imports it into the default project there and reports the copy', async () => {
		const { service, alice, linkId, remote, client, clientFactory, deactivator } =
			await pushSetup();

		const result = await service.push(alice, linkId, { workflowId: 'wf1' });

		expect(result).toEqual({
			remoteWorkflowId: 'remote1',
			remoteUrl: `${CLOUD}/workflow/remote1`,
			targetProject: OPS,
			created: true,
			published: false,
			credentialsNeedingSetup: [],
			missingNodeTypes: [],
			localDeactivated: false,
			warnings: [],
		});
		expect(remote.callsOf('import_workflow_package')).toEqual([
			{ packageBase64: PACKAGE, sourceWorkflowId: 'wf1', projectId: OPS.id },
		]);
		expect(remote.callsOf('publish_workflow')).toEqual([]);
		expect(deactivator.turnOff).not.toHaveBeenCalled();
		expect(clientFactory.create).toHaveBeenCalledTimes(1);
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('exports with the normal read access and the size limit of this instance', async () => {
		const { service, alice, linkId, workflowFinder, workflow } = await pushSetup();

		await service.push(alice, linkId, { workflowId: 'wf1' });

		expect(workflowFinder.findWorkflowForUser).toHaveBeenCalledWith('wf1', alice, [
			'workflow:read',
		]);
		expect(exportWorkflowPackage).toHaveBeenCalledWith(
			expect.objectContaining({
				user: alice,
				workflowId: workflow.id,
				limit: { maxBytes: 1024, setting: 'N8N_PAYLOAD_SIZE_MAX' },
			}),
		);
	});

	it('probes the linked instance before it exports, so that no package is made for an instance that cannot take it', async () => {
		const { service, alice, linkId, client } = await pushSetup();
		client.probe.mockResolvedValue({ ok: true, toolNames: ['export_workflow_package'] });

		await expectRejection(
			service.push(alice, linkId, { workflowId: 'wf1' }),
			BadRequestError,
			TRANSFER_MESSAGES.builderOff('Cloud'),
		);
		expect(exportWorkflowPackage).not.toHaveBeenCalled();
		expect(client.callTool).not.toHaveBeenCalled();
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('updates the same copy when the workflow moves again', async () => {
		const { service, alice, linkId, remote } = await pushSetup();

		const first = await service.push(alice, linkId, { workflowId: 'wf1' });
		const second = await service.push(alice, linkId, { workflowId: 'wf1' });

		expect(first.created).toBe(true);
		expect(second).toMatchObject({ created: false, remoteWorkflowId: first.remoteWorkflowId });
		expect(remote.copies.size).toBe(1);
	});

	it('emits an audit event with ids only', async () => {
		const { service, alice, linkId, eventService } = await pushSetup();

		await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

		expect(eventService.emit).toHaveBeenCalledWith('linked-instance-workflow-pushed', {
			user: alice,
			linkedInstanceId: linkId,
			workflowId: 'wf1',
			remoteWorkflowId: 'remote1',
			remoteProjectId: OPS.id,
			created: true,
			published: true,
			localDeactivated: false,
		});
	});

	describe('publish', () => {
		it('publishes the copy when asked', async () => {
			const { service, alice, linkId, remote } = await pushSetup();

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result.published).toBe(true);
			expect(result.warnings).toEqual([]);
			expect(remote.callsOf('publish_workflow')).toEqual([{ workflowId: 'remote1' }]);
		});

		it('returns success with published false and a warning when the publish fails', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			remote.handlers.publish_workflow = (args) => ({
				success: false,
				workflowId: args.workflowId,
				activeVersionId: null,
				error: 'Workflow has no node to start the workflow.',
			});

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result).toMatchObject({
				remoteWorkflowId: 'remote1',
				created: true,
				published: false,
			});
			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.publishFailed('Cloud', 'Workflow has no node to start the workflow.'),
			]);
		});

		it('keeps published true when an earlier version stays live after a failed publish', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			const importCopy = remote.handlers.import_workflow_package;
			remote.handlers.import_workflow_package = (args) => ({
				...(importCopy(args) as object),
				published: true,
			});
			remote.handlers.publish_workflow = () => ({ success: false, error: 'Locked.' });

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result.published).toBe(true);
			expect(result.warnings).toHaveLength(1);
		});

		it('warns when the access token cannot publish workflows there', async () => {
			const { service, alice, linkId, client, remote } = await pushSetup();
			client.probe.mockResolvedValue({ ok: true, toolNames: ['import_workflow_package'] });

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result.published).toBe(false);
			expect(result.warnings).toEqual([TRANSFER_WARNINGS.cannotPublish('Cloud')]);
			expect(remote.callsOf('publish_workflow')).toEqual([]);
		});

		it('turns a failed publish request into a warning', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			remote.handlers.publish_workflow = () => {
				throw new RemoteInstanceError('timeout');
			};

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result.published).toBe(false);
			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.publishFailed('Cloud', 'The linked instance did not answer in time.'),
			]);
		});

		it('does not publish a copy with missing node types, and says why', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			const importCopy = remote.handlers.import_workflow_package;
			remote.handlers.import_workflow_package = (args) => ({
				...(importCopy(args) as object),
				missingNodeTypes: ['n8n-nodes-acme.crm@2'],
			});

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result).toMatchObject({
				published: false,
				missingNodeTypes: ['n8n-nodes-acme.crm@2'],
			});
			expect(result.warnings).toEqual([TRANSFER_WARNINGS.missingNodeTypes('Cloud')]);
			expect(remote.callsOf('publish_workflow')).toEqual([]);
		});
	});

	describe('deactivateLocal', () => {
		it('refuses with 403 before any request when the user cannot turn off the workflow', async () => {
			const { service, alice, linkId, workflowFinder, clientFactory, eventService } =
				await pushSetup();
			workflowFinder.findWorkflowForUser.mockImplementation(async (_id, _user, scopes) =>
				scopes.includes('workflow:unpublish') ? null : workflowEntity(),
			);

			await expectRejection(
				service.push(alice, linkId, { workflowId: 'wf1', deactivateLocal: true }),
				ForbiddenError,
				TRANSFER_MESSAGES.cannotTurnOff,
			);
			expect(clientFactory.create).not.toHaveBeenCalled();
			expect(exportWorkflowPackage).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'linked-instance-workflow-transfer-failed',
				expect.objectContaining({ direction: 'push', workflowId: 'wf1', reason: 'refused' }),
			);
		});

		it('turns off the workflow here after the move, with the editor tab of the request', async () => {
			const { service, alice, linkId, deactivator, client } = await pushSetup();
			deactivator.turnOff.mockResolvedValue(true);

			const result = await service.push(
				alice,
				linkId,
				{ workflowId: 'wf1', publish: true, deactivateLocal: true },
				{ clientId: 'tab-1' },
			);

			expect(result).toMatchObject({ published: true, localDeactivated: true, warnings: [] });
			expect(deactivator.turnOff).toHaveBeenCalledWith(alice, 'wf1', { clientId: 'tab-1' });
			// After the connection closed: nothing here changes before the copy is there.
			expect(client.close.mock.invocationCallOrder[0]).toBeLessThan(
				deactivator.turnOff.mock.invocationCallOrder[0],
			);
		});

		it('keeps the workflow on here when the copy could not go live there', async () => {
			const { service, alice, linkId, deactivator, remote } = await pushSetup();
			remote.handlers.publish_workflow = () => ({ success: false, error: 'Invalid trigger.' });

			const result = await service.push(alice, linkId, {
				workflowId: 'wf1',
				publish: true,
				deactivateLocal: true,
			});

			expect(result.localDeactivated).toBe(false);
			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.publishFailed('Cloud', 'Invalid trigger.'),
				TRANSFER_WARNINGS.keptLocalLive('Cloud'),
			]);
			expect(deactivator.turnOff).not.toHaveBeenCalled();
		});

		it('turns off the workflow here without a publish when the user asks only for that', async () => {
			const { service, alice, linkId, deactivator } = await pushSetup();
			deactivator.turnOff.mockResolvedValue(true);

			const result = await service.push(alice, linkId, {
				workflowId: 'wf1',
				deactivateLocal: true,
			});

			expect(result.localDeactivated).toBe(true);
			expect(deactivator.turnOff).toHaveBeenCalledTimes(1);
		});

		it('reports a failed turn-off as a warning, because the copy is there already', async () => {
			const { service, alice, linkId, deactivator } = await pushSetup();
			deactivator.turnOff.mockRejectedValue(
				new LockedError('Cannot deactivate workflow - another user currently has write access'),
			);

			const result = await service.push(alice, linkId, {
				workflowId: 'wf1',
				deactivateLocal: true,
			});

			expect(result).toMatchObject({ remoteWorkflowId: 'remote1', localDeactivated: false });
			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.turnOffFailed(
					'Cannot deactivate workflow - another user currently has write access',
				),
			]);
		});

		it('hides the text of an unexpected turn-off failure', async () => {
			const { service, alice, linkId, deactivator } = await pushSetup();
			deactivator.turnOff.mockRejectedValue(new Error('SQLITE_BUSY: table workflow_entity'));

			const result = await service.push(alice, linkId, {
				workflowId: 'wf1',
				deactivateLocal: true,
			});

			expect(result.warnings[0]).not.toContain('SQLITE');
			expect(result.warnings[0]).toContain('The server log has the details');
		});
	});

	describe('target project', () => {
		it('moves the workflow to the personal project when the instance refuses the default project', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			const importCopy = remote.handlers.import_workflow_package;
			remote.handlers.import_workflow_package = (args) => {
				if (args.projectId !== undefined)
					throw new RemoteInstanceError('tool-error', REFUSED_PROJECT);
				return importCopy(args);
			};

			const result = await service.push(alice, linkId, { workflowId: 'wf1' });

			expect(result.targetProject).toBeNull();
			expect(result.warnings).toEqual([TRANSFER_WARNINGS.personalProjectFallback('Cloud', 'Ops')]);
			expect(remote.callsOf('import_workflow_package')).toEqual([
				{ packageBase64: PACKAGE, sourceWorkflowId: 'wf1', projectId: OPS.id },
				{ packageBase64: PACKAGE, sourceWorkflowId: 'wf1' },
			]);
		});

		it('imports into the personal project when the link has no default project', async () => {
			const { service, alice, linkId, remote } = await pushSetup({ defaultProject: null });

			const result = await service.push(alice, linkId, { workflowId: 'wf1' });

			expect(result.targetProject).toBeNull();
			expect(result.warnings).toEqual([]);
			expect(remote.callsOf('import_workflow_package')).toEqual([
				{ packageBase64: PACKAGE, sourceWorkflowId: 'wf1' },
			]);
		});

		it('does not retry for another refusal', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			remote.handlers.import_workflow_package = () => {
				throw new RemoteInstanceError(
					'tool-error',
					"Workflow 'remote1' is archived and cannot be accessed.",
				);
			};

			await expectRejection(
				service.push(alice, linkId, { workflowId: 'wf1' }),
				BadRequestError,
				'This workflow is archived in Ops on Cloud. Restore it there, then try again.',
			);
			expect(remote.callsOf('import_workflow_package')).toHaveLength(1);
		});
	});

	describe('failures', () => {
		it('answers 404 for a link of another user, before any other step', async () => {
			const { service, linkId, clientFactory, workflowFinder } = await pushSetup();

			await expectRejection(
				service.push(user(), linkId, { workflowId: 'wf1' }),
				NotFoundError,
				LINK_NOT_FOUND_MESSAGE,
			);
			await expectRejection(
				service.push(user(), randomUUID(), { workflowId: 'wf1' }),
				NotFoundError,
				LINK_NOT_FOUND_MESSAGE,
			);
			expect(workflowFinder.findWorkflowForUser).not.toHaveBeenCalled();
			expect(clientFactory.create).not.toHaveBeenCalled();
		});

		it('answers 404 for a workflow that the user cannot read', async () => {
			const { service, alice, linkId, workflowFinder, clientFactory } = await pushSetup();
			workflowFinder.findWorkflowForUser.mockResolvedValue(null);

			await expectRejection(
				service.push(alice, linkId, { workflowId: 'wf1' }),
				NotFoundError,
				TRANSFER_MESSAGES.workflowNotFound,
			);
			expect(clientFactory.create).not.toHaveBeenCalled();
		});

		it('refuses an archived workflow', async () => {
			const { service, alice, linkId, workflowFinder } = await pushSetup();
			workflowFinder.findWorkflowForUser.mockResolvedValue(workflowEntity({ isArchived: true }));

			await expectRejection(
				service.push(alice, linkId, { workflowId: 'wf1' }),
				BadRequestError,
				TRANSFER_MESSAGES.archived,
			);
		});

		it.each([
			['unreachable', "Can't reach Cloud. Check that it's running, then try again."],
			[
				'unauthorised',
				'Cloud refused the access token. Change the token in Settings > Linked instances.',
			],
			['mcp-disabled', TRANSFER_MESSAGES.mcpDisabled('Cloud')],
		] as const)(
			'maps a failed probe (%s) to a 400 with an en-GB message',
			async (reason, message) => {
				const { service, alice, linkId, client, eventService } = await pushSetup();
				client.probe.mockResolvedValue({ ok: false, reason });

				await expectRejection(
					service.push(alice, linkId, { workflowId: 'wf1' }),
					BadRequestError,
					message,
				);
				expect(exportWorkflowPackage).not.toHaveBeenCalled();
				expect(eventService.emit).toHaveBeenCalledWith(
					'linked-instance-workflow-transfer-failed',
					expect.objectContaining({ reason }),
				);
			},
		);

		it('asks for MCP access on a copy that someone made unavailable in MCP', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			remote.handlers.import_workflow_package = () => {
				throw new RemoteInstanceError(
					'tool-error',
					'The package matches the workflow "Daily report" (remote1) in the target project, so the import would update that workflow. Workflow is not available in MCP. Enable MCP access.',
				);
			};

			await expectRejection(
				service.push(alice, linkId, { workflowId: 'wf1' }),
				BadRequestError,
				'Turn on MCP access for this workflow in Ops on Cloud, then try again.',
			);
		});

		it('refuses a result in an unknown format', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			remote.handlers.import_workflow_package = () => ({ workflowId: '../admin', created: true });

			const error = await service
				.push(alice, linkId, { workflowId: 'wf1' })
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect(error).toHaveProperty('message', expect.stringContaining('unknown format'));
		});

		it('keeps a local export error as it is and audits it as refused', async () => {
			const { service, alice, linkId, eventService } = await pushSetup();
			const blocked = new BadRequestError('The workflow calls 1 sub-workflow(s) by a fixed ID.');
			vi.mocked(exportWorkflowPackage).mockRejectedValue(blocked);

			await expect(service.push(alice, linkId, { workflowId: 'wf1' })).rejects.toBe(blocked);
			expect(eventService.emit).toHaveBeenCalledWith(
				'linked-instance-workflow-transfer-failed',
				expect.objectContaining({ reason: 'refused' }),
			);
		});

		it('audits an unexpected error as internal and passes it on', async () => {
			const { service, alice, linkId, eventService, client } = await pushSetup();
			const bug = new Error('bug');
			vi.mocked(exportWorkflowPackage).mockRejectedValue(bug);

			await expect(service.push(alice, linkId, { workflowId: 'wf1' })).rejects.toBe(bug);
			expect(client.close).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('linked-instance-workflow-transfer-failed', {
				user: alice,
				linkedInstanceId: linkId,
				direction: 'push',
				workflowId: 'wf1',
				reason: 'internal',
			});
		});
	});

	it('never shows, logs or emits the access token, also when the instance repeats it', async () => {
		const { service, alice, linkId, token, remote, logger, eventService } = await pushSetup();
		const importCopy = remote.handlers.import_workflow_package;
		remote.handlers.import_workflow_package = (args) => ({
			...(importCopy(args) as object),
			warnings: [`Token ${token} was used.`],
			credentialsNeedingSetup: [{ id: 'cred1', name: `Key ${token}`, type: 'httpHeaderAuth' }],
		});
		remote.handlers.publish_workflow = () => ({ success: false, error: `Bad ${token}` });

		const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });
		remote.handlers.import_workflow_package = () => {
			throw new RemoteInstanceError('tool-error', 'Refused [REDACTED]');
		};
		const error = await service.push(alice, linkId, { workflowId: 'wf1' }).catch((e: unknown) => e);

		const seen = serialised(
			result,
			error,
			eventService.emit.mock.calls,
			logger.info.mock.calls,
			logger.warn.mock.calls,
		);
		expect(seen).not.toContain(token);
		expect(result.warnings).toContain('Token [REDACTED] was used.');
		expect(result.credentialsNeedingSetup).toEqual([
			{ id: 'cred1', name: 'Key [REDACTED]', type: 'httpHeaderAuth' },
		]);
	});
});
