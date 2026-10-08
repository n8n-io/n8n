import type { Project } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { ImportedWorkflowPackage } from '@/modules/n8n-packages/capabilities/import-summary';
import { importWorkflowPackage } from '@/modules/n8n-packages/capabilities/workflow-package-import';

import { expectRejection, user } from '../../__tests__/linked-instances.test-helpers';
import { LINK_NOT_FOUND_MESSAGE } from '../../linked-instances.service';
import { RemoteInstanceError } from '../../remote/remote-instance.errors';
import { RESPONSE_OVER_LIMIT_MESSAGE } from '../../remote/remote-instance.transports';
import { TRANSFER_MESSAGES } from '../transfer-errors';
import { serialised, transferSetup } from './transfer.test-helpers';

vi.mock('@/modules/n8n-packages/capabilities/workflow-package-export', () => ({
	exportWorkflowPackage: vi.fn(),
}));
vi.mock('@/modules/n8n-packages/capabilities/workflow-package-import', () => ({
	importWorkflowPackage: vi.fn(),
}));
vi.mock('@/modules/n8n-packages/capabilities/mcp-package-size-limit', () => ({
	instanceMcpPackageSizeLimit: () => ({ maxBytes: 1024, setting: 'N8N_PAYLOAD_SIZE_MAX' }),
}));

const REMOTE_PACKAGE = Buffer.from('remote-package').toString('base64');

const IMPORTED: ImportedWorkflowPackage = {
	workflowId: 'local1',
	workflowName: 'Daily report',
	created: true,
	published: false,
	credentialsNeedingSetup: [{ id: 'cred1', name: 'Stripe', type: 'httpHeaderAuth' }],
	missingNodeTypes: [],
	warnings: ['The import did not add 1 tag(s), because this instance does not have them: ops.'],
};

async function pullSetup() {
	const context = transferSetup();
	const alice = user();
	const link = await context.link(alice);
	vi.mocked(importWorkflowPackage).mockResolvedValue(IMPORTED);
	return { ...context, alice, linkId: link.id, token: link.token };
}

beforeEach(() => {
	vi.mocked(importWorkflowPackage).mockReset();
});

describe('TransferService.pull', () => {
	it('exports the workflow there and imports it into the personal project here', async () => {
		const { service, alice, linkId, remote, projectService, client } = await pullSetup();

		const result = await service.pull(alice, linkId, { remoteWorkflowId: 'r1' });

		expect(result).toEqual(IMPORTED);
		expect(remote.callsOf('export_workflow_package')).toEqual([{ workflowId: 'r1' }]);
		expect(importWorkflowPackage).toHaveBeenCalledWith({
			user: alice,
			packageBase64: REMOTE_PACKAGE,
			limit: { maxBytes: 1024, setting: 'N8N_PAYLOAD_SIZE_MAX' },
			projectId: undefined,
			sourceWorkflowId: 'r1',
			// The rules of a pull: see local-package-import.test.ts.
			rules: { assertUpdatable: expect.any(Function), afterImport: expect.any(Function) },
		});
		// The import checks the personal project itself.
		expect(projectService.getProjectWithScope).not.toHaveBeenCalled();
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('imports into a project where the user can create workflows', async () => {
		const { service, alice, linkId, projectService } = await pullSetup();
		projectService.getProjectWithScope.mockResolvedValue(mock<Project>({ id: 'p1' }));

		await service.pull(alice, linkId, { remoteWorkflowId: 'r1', projectId: 'p1' });

		expect(projectService.getProjectWithScope).toHaveBeenCalledWith(alice, 'p1', [
			'workflow:import',
			'workflow:create',
		]);
		expect(importWorkflowPackage).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'p1', sourceWorkflowId: 'r1' }),
		);
	});

	it('refuses with 403 before any request when the user cannot create workflows in the project', async () => {
		const { service, alice, linkId, projectService, clientFactory, eventService } =
			await pullSetup();
		projectService.getProjectWithScope.mockResolvedValue(null);

		await expectRejection(
			service.pull(alice, linkId, { remoteWorkflowId: 'r1', projectId: 'p1' }),
			ForbiddenError,
			TRANSFER_MESSAGES.cannotCreateInProject,
		);
		expect(clientFactory.create).not.toHaveBeenCalled();
		expect(importWorkflowPackage).not.toHaveBeenCalled();
		expect(eventService.emit).toHaveBeenCalledWith('linked-instance-workflow-transfer-failed', {
			user: alice,
			linkedInstanceId: linkId,
			direction: 'pull',
			remoteWorkflowId: 'r1',
			projectId: 'p1',
			reason: 'refused',
		});
	});

	it('emits an audit event with ids only', async () => {
		const { service, alice, linkId, eventService, projectService } = await pullSetup();
		projectService.getProjectWithScope.mockResolvedValue(mock<Project>({ id: 'p1' }));

		await service.pull(alice, linkId, { remoteWorkflowId: 'r1', projectId: 'p1' });
		await service.pull(alice, linkId, { remoteWorkflowId: 'r1' });

		expect(eventService.emit).toHaveBeenNthCalledWith(1, 'linked-instance-workflow-pulled', {
			user: alice,
			linkedInstanceId: linkId,
			remoteWorkflowId: 'r1',
			workflowId: 'local1',
			projectId: 'p1',
			created: true,
		});
		expect(eventService.emit).toHaveBeenNthCalledWith(2, 'linked-instance-workflow-pulled', {
			user: alice,
			linkedInstanceId: linkId,
			remoteWorkflowId: 'r1',
			workflowId: 'local1',
			created: true,
		});
	});

	it('answers 404 for a link of another user', async () => {
		const { service, linkId, clientFactory } = await pullSetup();

		await expectRejection(
			service.pull(user(), linkId, { remoteWorkflowId: 'r1' }),
			NotFoundError,
			LINK_NOT_FOUND_MESSAGE,
		);
		expect(clientFactory.create).not.toHaveBeenCalled();
	});

	it('says that the instance cannot send workflows when it has no export tool', async () => {
		const { service, alice, linkId, client } = await pullSetup();
		client.probe.mockResolvedValue({ ok: true, toolNames: ['import_workflow_package'] });

		await expectRejection(
			service.pull(alice, linkId, { remoteWorkflowId: 'r1' }),
			BadRequestError,
			TRANSFER_MESSAGES.cannotSend('Cloud'),
		);
		expect(client.callTool).not.toHaveBeenCalled();
	});

	it.each([
		[
			'a workflow that is not available in MCP',
			new RemoteInstanceError('tool-error', 'Workflow is not available in MCP. Enable MCP access.'),
			'Turn on MCP access for this workflow in Cloud, then try again.',
		],
		[
			'an archived workflow',
			new RemoteInstanceError('tool-error', "Workflow 'r1' is archived and cannot be accessed."),
			'This workflow is archived in Cloud. Restore it there, then try again.',
		],
		[
			'a workflow that the token cannot read',
			new RemoteInstanceError(
				'tool-error',
				"Workflow not found or you don't have permission to access it.",
			),
			"Cloud could not send the workflow: Workflow not found or you don't have permission to access it.",
		],
		[
			'a response over 5 MiB',
			new RemoteInstanceError('unreachable', RESPONSE_OVER_LIMIT_MESSAGE),
			TRANSFER_MESSAGES.pullTooLarge('Cloud'),
		],
		['a timeout', new RemoteInstanceError('timeout'), TRANSFER_MESSAGES.timeout('Cloud')],
	])('maps the remote failure for %s to a 400', async (_, failure, message) => {
		const { service, alice, linkId, remote } = await pullSetup();
		remote.handlers.export_workflow_package = () => {
			throw failure;
		};

		await expectRejection(
			service.pull(alice, linkId, { remoteWorkflowId: 'r1' }),
			BadRequestError,
			message,
		);
		expect(importWorkflowPackage).not.toHaveBeenCalled();
	});

	it('refuses an export result without a package', async () => {
		const { service, alice, linkId, remote } = await pullSetup();
		remote.handlers.export_workflow_package = () => ({ workflowName: 'Daily report' });

		await expectRejection(
			service.pull(alice, linkId, { remoteWorkflowId: 'r1' }),
			BadRequestError,
			'Cloud could not send the workflow: The linked instance sent the workflow in an unknown format.',
		);
	});

	it('passes an error of the local import on as it is', async () => {
		const { service, alice, linkId } = await pullSetup();
		const refused = new BadRequestError('The package contains workflow "x", not workflow "r1".');
		vi.mocked(importWorkflowPackage).mockRejectedValue(refused);

		await expect(service.pull(alice, linkId, { remoteWorkflowId: 'r1' })).rejects.toBe(refused);
	});

	it('never shows, logs or emits the access token', async () => {
		const { service, alice, linkId, token, logger, eventService, remote } = await pullSetup();

		const result = await service.pull(alice, linkId, { remoteWorkflowId: 'r1' });
		remote.handlers.export_workflow_package = () => {
			throw new RemoteInstanceError('timeout');
		};
		const error = await service
			.pull(alice, linkId, { remoteWorkflowId: 'r1' })
			.catch((e: unknown) => e);

		expect(
			serialised(
				result,
				error,
				eventService.emit.mock.calls,
				logger.info.mock.calls,
				logger.warn.mock.calls,
			),
		).not.toContain(token);
	});
});
