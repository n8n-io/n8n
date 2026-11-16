import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import type { CompiledEngineCredentials } from '../compiled-engine-credentials';
import { CompiledEngineSync } from '../compiled-engine-sync.service';
import type { CompiledArtifact } from '../compiled-engine.types';
import type { CompiledWorkflowCompiler } from '../compiled-workflow.compiler';
import type { WfrtAdminClient } from '../wfrt-admin.client';

vi.mock('@/workflow-helpers', () => ({ getVariables: vi.fn(async () => ({})) }));

const MINUTE = 60 * 1000;

describe('CompiledEngineSync: minted tokens', () => {
	const compiler = mock<CompiledWorkflowCompiler>();
	const client = mock<WfrtAdminClient>();
	const credentials = mock<CompiledEngineCredentials>();
	const logger = mock<Logger>();
	const urlService = mock<UrlService>();
	const staticData = mock<WorkflowStaticDataService>();
	const globalConfig = mock<GlobalConfig>({
		endpoints: { webhookWaiting: 'webhook-waiting', formWaiting: 'form-waiting' },
	});

	const slots = [{ slot: 'sa', type: 'googleApi', credentialId: 'c1', credentialName: 'SA' }];
	const artifact = (mints: CompiledArtifact['mints']) =>
		mock<CompiledArtifact>({
			ok: true,
			key: 'k1',
			module: Buffer.from('module'),
			slots,
			derivations: undefined,
			mints,
			diagnostics: [],
		});
	const mints: CompiledArtifact['mints'] = {
		sa: [{ name: 'm1', kind: 'google-service-account', service: 'docs', scopes: ['s'] }],
	};
	const documentThatExpiresIn = (ms: number) => ({
		sa: { data: { n8nMinted: { m1: { access_token: 't', expires_at: Date.now() + ms } } } },
	});
	const workflow = mock<WorkflowEntity>({ id: 'wf1', activeVersion: null, settings: {} });

	let sync: CompiledEngineSync;

	beforeEach(async () => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		logger.scoped.mockReturnValue(logger);
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');
		client.listWorkflows.mockResolvedValue([]);
		client.putWorkflow.mockResolvedValue(undefined);
		staticData.getStaticDataById.mockResolvedValue({});
		sync = new CompiledEngineSync(
			compiler,
			client,
			credentials,
			mock<WorkflowRepository>(),
			urlService,
			globalConfig,
			logger,
			staticData,
		);
		await sync.onConnected();
	});

	afterEach(() => {
		sync.onDisconnected();
		vi.useRealTimers();
	});

	it('sends new tokens before the first token expires, and does not load the module again', async () => {
		compiler.compile.mockResolvedValue(artifact(mints));
		credentials.buildDocument.mockImplementation(async () => documentThatExpiresIn(60 * MINUTE));
		await sync.activate(workflow);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(54 * MINUTE);
		expect(client.putWorkflowCredentials).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		expect(client.putWorkflowCredentials).toHaveBeenCalledTimes(1);
		expect(client.putWorkflowCredentials.mock.lastCall?.[0]).toBe('wf1');
		expect(credentials.renew).toHaveBeenCalledWith(slots[0], 'wf1', true);
		expect(credentials.buildDocument.mock.lastCall?.[1]).toEqual(slots);
		expect(credentials.buildDocument.mock.lastCall?.[3]).toEqual(mints);
		expect(credentials.buildDocument.mock.lastCall?.[4]).toMatchObject({ strict: true });

		await vi.advanceTimersByTimeAsync(56 * MINUTE);
		expect(client.putWorkflowCredentials).toHaveBeenCalledTimes(2);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);
	});

	it('tries again after a minute when n8n could not make the token', async () => {
		compiler.compile.mockResolvedValue(artifact(mints));
		credentials.buildDocument.mockResolvedValue({});
		await sync.activate(workflow);

		await vi.advanceTimersByTimeAsync(MINUTE);
		expect(client.putWorkflowCredentials).toHaveBeenCalledTimes(1);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);
	});

	it('sets no timer for a workflow without minted tokens', async () => {
		compiler.compile.mockResolvedValue(artifact(undefined));
		credentials.buildDocument.mockResolvedValue({});
		await sync.activate(workflow);

		await vi.advanceTimersByTimeAsync(24 * 60 * MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);
		expect(client.putWorkflowCredentials).not.toHaveBeenCalled();
	});

	it('stops the renewal when the workflow is unloaded', async () => {
		compiler.compile.mockResolvedValue(artifact(mints));
		credentials.buildDocument.mockImplementation(async () => documentThatExpiresIn(60 * MINUTE));
		await sync.activate(workflow);
		await sync.deactivate('wf1');

		await vi.advanceTimersByTimeAsync(120 * MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);
		expect(client.putWorkflowCredentials).not.toHaveBeenCalled();
	});

	describe('a credential that changes', () => {
		const guard = { name: 'g1', code: '', kind: 'guard' as const, flags: ['f00000001'], node: 'A' };
		const withKey = (key: string, derivations: CompiledArtifact['derivations']) =>
			mock<CompiledArtifact>({
				ok: true,
				key,
				module: Buffer.from(key),
				slots,
				derivations,
				mints: undefined,
				diagnostics: [],
			});

		beforeEach(() => {
			credentials.buildDocument.mockResolvedValue({});
		});

		it('compiles the workflow again and loads the other module', async () => {
			compiler.compile.mockResolvedValue(withKey('compiled', { sa: [guard] }));
			await sync.activate(workflow);
			expect(client.putWorkflow.mock.lastCall?.[1]).toMatchObject({ versionId: 'compiled' });

			// The new values of the credential are not checked: a node runs in the host.
			compiler.compile.mockResolvedValue(withKey('host', undefined));
			await sync.onCredentialChanged('c1');
			expect(client.putWorkflow).toHaveBeenCalledTimes(2);
			expect(client.putWorkflow.mock.lastCall?.[1]).toMatchObject({ versionId: 'host' });
			expect(credentials.buildDocument.mock.lastCall?.[2]).toBeUndefined();

			// The values are checked again: the compiled node is back.
			compiler.compile.mockResolvedValue(withKey('compiled', { sa: [guard] }));
			await sync.onCredentialChanged('c1');
			expect(client.putWorkflow.mock.lastCall?.[1]).toMatchObject({ versionId: 'compiled' });
		});

		it('keeps the loaded module when the new compile has errors', async () => {
			compiler.compile.mockResolvedValue(withKey('compiled', undefined));
			await sync.activate(workflow);
			compiler.compile.mockResolvedValue(mock<CompiledArtifact>({ ok: false, key: 'broken' }));
			await sync.onCredentialChanged('c1');
			expect(client.putWorkflow.mock.lastCall?.[1]).toMatchObject({ versionId: 'compiled' });
		});

		it('loads the other module when a renewal gives values that are not checked', async () => {
			compiler.compile.mockResolvedValue(withKey('compiled', { sa: [guard] }));
			await sync.activate(workflow);
			compiler.compile.mockResolvedValue(withKey('host', undefined));

			await sync.renewCredential('c1', 'wf1');

			expect(client.putWorkflow).toHaveBeenCalledTimes(2);
			expect(client.putWorkflow.mock.lastCall?.[1]).toMatchObject({ versionId: 'host' });
			expect(client.putWorkflowCredentials).not.toHaveBeenCalled();
		});
	});

	describe('renewCredential', () => {
		const other = mock<WorkflowEntity>({ id: 'wf2', activeVersion: null, settings: {} });

		beforeEach(async () => {
			compiler.compile.mockResolvedValue(artifact(mints));
			credentials.buildDocument.mockImplementation(async () => documentThatExpiresIn(60 * MINUTE));
			await sync.activate(workflow);
			await sync.activate(other);
			await sync.prepareManualRun({ ...workflow, id: 'wf1' });
			client.putWorkflow.mockClear();
			credentials.buildDocument.mockClear();
		});

		it('renews once for requests at the same time, and every workflow of the credential gets the values', async () => {
			let finish = () => {};
			credentials.renew.mockImplementation(
				async () => await new Promise<void>((resolve) => (finish = resolve)),
			);

			const requests = [
				sync.renewCredential('c1', 'wf1'),
				sync.renewCredential('c1', 'wf2'),
				sync.renewCredential('c1', 'wf1~manual'),
			];
			await vi.advanceTimersByTimeAsync(0);
			finish();
			await Promise.all(requests);

			expect(credentials.renew).toHaveBeenCalledTimes(1);
			expect(client.putWorkflowCredentials.mock.calls.map(([id]) => id).sort()).toEqual([
				'wf1',
				'wf1~manual',
				'wf2',
			]);
			// The modules stay: only credential values go to `wfrt`.
			expect(client.putWorkflow).not.toHaveBeenCalled();
			// One token table for the renewal: the workflows share each minted token.
			const tables = credentials.buildDocument.mock.calls.map(
				([, , , , options]) => options?.minted,
			);
			expect(tables[0]).toBeInstanceOf(Map);
			expect(new Set(tables).size).toBe(1);
		});

		it('renews again for a request after the first renewal ended', async () => {
			await sync.renewCredential('c1', 'wf1');
			await sync.renewCredential('c1', 'wf1');
			expect(credentials.renew).toHaveBeenCalledTimes(2);
		});

		it('fails the request of a workflow that did not get the values', async () => {
			client.putWorkflowCredentials.mockImplementation(async (id) => {
				if (id === 'wf2') throw new Error('wfrt said no');
			});
			await expect(sync.renewCredential('c1', 'wf1')).resolves.toBeUndefined();
			await expect(sync.renewCredential('c1', 'wf2')).rejects.toThrow('wfrt said no');
		});

		it('fails every request when n8n cannot renew the credential', async () => {
			credentials.renew.mockRejectedValue(new Error('The grant was revoked'));
			await expect(sync.renewCredential('c1', 'wf1')).rejects.toThrow('The grant was revoked');
			expect(client.putWorkflowCredentials).not.toHaveBeenCalled();
			await expect(sync.renewCredential('none', 'wf1')).rejects.toThrow(
				'No loaded workflow uses this credential',
			);
		});
	});
});
