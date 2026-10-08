import { exportWorkflowPackage } from '@/modules/n8n-packages/capabilities/workflow-package-export';

import { RemoteInstanceError } from '../../remote/remote-instance.errors';
import { TRANSFER_WARNINGS } from '../transfer-errors';
import {
	EDITOR_LOCK,
	importReturns,
	pushSetup,
	STUB_CREDENTIAL,
} from './transfer.test-helpers';

vi.mock('@/modules/n8n-packages/capabilities/workflow-package-export', () => ({
	exportWorkflowPackage: vi.fn(),
}));
vi.mock('@/modules/n8n-packages/capabilities/workflow-package-import', () => ({
	importWorkflowPackage: vi.fn(),
}));
vi.mock('@/modules/n8n-packages/capabilities/mcp-package-size-limit', () => ({
	instanceMcpPackageSizeLimit: () => ({ maxBytes: 1024, setting: 'N8N_PAYLOAD_SIZE_MAX' }),
}));

beforeEach(() => {
	vi.mocked(exportWorkflowPackage).mockReset();
});

// The texts of the import there for a re-import into a copy that is live there.
const NEW_VERSION_LIVE =
	'The workflow was published, so the import published the new version. The new version is live now.';
const ACTIVATION_FAILED =
	'The new version is not live, because the import could not publish it: The webhook path is in use. An earlier version stays live.';

describe('TransferService.push with publish', () => {
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
				publishFailed: true,
			});
			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.publishFailed('Cloud', 'Workflow has no node to start the workflow.'),
			]);
		});

		it('keeps published true but says that the publish failed when an earlier version stays live', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			await service.push(alice, linkId, { workflowId: 'wf1' });
			importReturns(remote, { published: true, newVersionLive: false });
			remote.handlers.publish_workflow = () => ({ success: false, error: 'Locked.' });

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result).toMatchObject({ created: false, published: true, publishFailed: true });
			expect(result.warnings).toEqual([TRANSFER_WARNINGS.publishFailed('Cloud', 'Locked.')]);
		});

		it('does not ask for a publish failure when the move did not ask to publish', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			await service.push(alice, linkId, { workflowId: 'wf1' });
			importReturns(remote, { published: true, credentialsNeedingSetup: [STUB_CREDENTIAL] });

			const result = await service.push(alice, linkId, { workflowId: 'wf1' });

			expect(result).toMatchObject({ published: true, publishFailed: false, warnings: [] });
			expect(remote.callsOf('publish_workflow')).toEqual([]);
		});

		it('warns when the access token cannot publish workflows there', async () => {
			const { service, alice, linkId, client, remote } = await pushSetup();
			client.probe.mockResolvedValue({ ok: true, toolNames: ['import_workflow_package'] });

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result).toMatchObject({ published: false, publishFailed: true });
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
			importReturns(remote, { missingNodeTypes: ['n8n-nodes-acme.crm@2'] });

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result).toMatchObject({
				published: false,
				publishFailed: true,
				missingNodeTypes: ['n8n-nodes-acme.crm@2'],
			});
			expect(result.warnings).toEqual([TRANSFER_WARNINGS.missingNodeTypes('Cloud')]);
			expect(remote.callsOf('publish_workflow')).toEqual([]);
		});

		it('does not publish a copy with credentials without a value, and says how many', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			importReturns(remote, {
				credentialsNeedingSetup: [
					STUB_CREDENTIAL,
					{ ...STUB_CREDENTIAL, id: 'c2', name: 'Stripe' },
				],
			});

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result).toMatchObject({ published: false, publishFailed: true });
			expect(result.warnings).toEqual([TRANSFER_WARNINGS.credentialsNeedSetup('Cloud', 2)]);
			expect(result.warnings[0]).toContain('2 credentials that it uses there have no value');
			expect(remote.callsOf('publish_workflow')).toEqual([]);
		});

		it('names every reason that blocks the publish', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			importReturns(remote, {
				missingNodeTypes: ['n8n-nodes-acme.crm@2'],
				credentialsNeedingSetup: [STUB_CREDENTIAL],
			});

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.missingNodeTypes('Cloud'),
				TRANSFER_WARNINGS.credentialsNeedSetup('Cloud', 1),
			]);
			expect(remote.callsOf('publish_workflow')).toEqual([]);
		});

		it('shows the refusal of the publish on one line and without characters without width', async () => {
			const { service, alice, linkId, remote } = await pushSetup();
			remote.handlers.publish_workflow = () => {
				throw new RemoteInstanceError(
					'tool-error',
					'Cannot publish:\nthe trigger\u202E is\u0007 invalid',
				);
			};

			const result = await service.push(alice, linkId, { workflowId: 'wf1', publish: true });

			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.publishFailed('Cloud', 'Cannot publish: the trigger is  invalid'),
			]);
		});
	});

	describe('a repeated move of a workflow that is on here, to a copy that is live there', () => {
		/** Moves the workflow once, then lets the import there report a copy that was live. */
		async function repushSetup(fields: Record<string, unknown>) {
			const context = await pushSetup();
			const { service, alice, linkId, remote } = context;
			await service.push(alice, linkId, { workflowId: 'wf1' });
			importReturns(remote, { published: true, ...fields });
			// Someone has the copy open there, so a publish would fail.
			remote.handlers.publish_workflow = () => ({ success: false, error: EDITOR_LOCK });
			context.deactivator.turnOff.mockResolvedValue(true);
			return context;
		}

		const moveAndTurnOff = { workflowId: 'wf1', publish: true, deactivateLocal: true };

		it('turns off the workflow here when the import put the new version live by itself', async () => {
			const { service, alice, linkId, remote, deactivator } = await repushSetup({
				newVersionLive: true,
				warnings: [NEW_VERSION_LIVE],
			});

			const result = await service.push(alice, linkId, moveAndTurnOff);

			expect(result).toMatchObject({
				created: false,
				published: true,
				publishFailed: false,
				localDeactivated: true,
			});
			expect(result.warnings).toEqual([NEW_VERSION_LIVE]);
			expect(remote.callsOf('publish_workflow')).toEqual([]);
			expect(deactivator.turnOff).toHaveBeenCalledTimes(1);
		});

		it('turns off the workflow here when the live new version uses an empty credential that the copy used before', async () => {
			const { service, alice, linkId, remote, deactivator } = await repushSetup({
				newVersionLive: true,
				credentialsNeedingSetup: [STUB_CREDENTIAL],
			});

			const result = await service.push(alice, linkId, moveAndTurnOff);

			expect(result).toMatchObject({
				publishFailed: false,
				localDeactivated: true,
				credentialsNeedingSetup: [STUB_CREDENTIAL],
			});
			expect(result.warnings).toEqual([]);
			expect(remote.callsOf('publish_workflow')).toEqual([]);
			expect(deactivator.turnOff).toHaveBeenCalledTimes(1);
		});

		it('keeps the workflow on here when an earlier version stays live there and the publish fails', async () => {
			const { service, alice, linkId, remote, deactivator } = await repushSetup({
				newVersionLive: false,
				warnings: [ACTIVATION_FAILED],
			});

			const result = await service.push(alice, linkId, moveAndTurnOff);

			expect(result).toMatchObject({
				created: false,
				published: true,
				publishFailed: true,
				localDeactivated: false,
			});
			expect(result.warnings).toEqual([
				TRANSFER_WARNINGS.publishFailed('Cloud', EDITOR_LOCK),
				TRANSFER_WARNINGS.keptLocalLive('Cloud'),
				ACTIVATION_FAILED,
			]);
			expect(remote.callsOf('publish_workflow')).toEqual([{ workflowId: 'remote1' }]);
			expect(deactivator.turnOff).not.toHaveBeenCalled();
		});

		it('publishes and turns off as before for an instance that does not tell which version is live', async () => {
			const { service, alice, linkId, remote, deactivator } = await repushSetup({
				newVersionLive: undefined,
			});
			remote.handlers.publish_workflow = () => ({ success: true });

			const result = await service.push(alice, linkId, moveAndTurnOff);

			expect(result).toMatchObject({ publishFailed: false, localDeactivated: true });
			expect(remote.callsOf('publish_workflow')).toEqual([{ workflowId: 'remote1' }]);
			expect(deactivator.turnOff).toHaveBeenCalledTimes(1);
		});
	});
});
