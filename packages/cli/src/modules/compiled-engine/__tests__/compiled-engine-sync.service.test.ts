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

	const artifact = (mints: CompiledArtifact['mints']) =>
		mock<CompiledArtifact>({
			ok: true,
			key: 'k1',
			module: Buffer.from('module'),
			slots: [],
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

	it('loads the workflow again with new tokens before the first token expires', async () => {
		compiler.compile.mockResolvedValue(artifact(mints));
		credentials.buildDocument.mockImplementation(async () => documentThatExpiresIn(60 * MINUTE));
		await sync.activate(workflow);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(54 * MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(2);
		expect(credentials.buildDocument.mock.lastCall?.[3]).toEqual(mints);

		await vi.advanceTimersByTimeAsync(56 * MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(3);
	});

	it('tries again after a minute when n8n could not make the token', async () => {
		compiler.compile.mockResolvedValue(artifact(mints));
		credentials.buildDocument.mockResolvedValue({});
		await sync.activate(workflow);

		await vi.advanceTimersByTimeAsync(MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(2);
	});

	it('sets no timer for a workflow without minted tokens', async () => {
		compiler.compile.mockResolvedValue(artifact(undefined));
		credentials.buildDocument.mockResolvedValue({});
		await sync.activate(workflow);

		await vi.advanceTimersByTimeAsync(24 * 60 * MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);
	});

	it('stops the renewal when the workflow is unloaded', async () => {
		compiler.compile.mockResolvedValue(artifact(mints));
		credentials.buildDocument.mockImplementation(async () => documentThatExpiresIn(60 * MINUTE));
		await sync.activate(workflow);
		await sync.deactivate('wf1');

		await vi.advanceTimersByTimeAsync(120 * MINUTE);
		expect(client.putWorkflow).toHaveBeenCalledTimes(1);
	});
});
