/**
 * Workflow static data between n8n and `wfrt` (spec section 9.7 of
 * workflow-lang): n8n sends its copy with each load, stores each change that
 * `wfrt` reports, and reads the copy of `wfrt` after a gap in the event stream.
 */
import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { BinaryDataConfig, BinaryDataService, StorageConfig } from 'n8n-core';
import type { IDataObject, IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import type { NodeTypes } from '@/node-types';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import type { CompiledEngineCredentials } from '../compiled-engine-credentials';
import { CompiledEngineSync } from '../compiled-engine-sync.service';
import { CompiledEngineDispatcher } from '../compiled-engine.dispatcher';
import type { CompiledArtifact } from '../compiled-engine.types';
import { parseWfrtEvent } from '../compiled-engine.types';
import type { CompiledExecutionStore } from '../compiled-execution.store';
import type { CompiledWorkflowCompiler } from '../compiled-workflow.compiler';
import type { WfrtAdminClient, WfrtWorkflowUpload } from '../wfrt-admin.client';

const artifact: CompiledArtifact = {
	key: 'hash1',
	workflowId: 'wf1',
	versionId: 'v1',
	ok: true,
	diagnostics: [],
	nodes: {},
	module: Buffer.from('wfm'),
	slots: [],
	triggers: [{ kind: 'webhook', path: 'demo' }],
	compiledAt: '2026-11-12T00:00:00.000Z',
};

function setup() {
	const compiler = mock<CompiledWorkflowCompiler>();
	compiler.compile.mockResolvedValue(artifact);
	const client = mock<WfrtAdminClient>();
	client.listWorkflows.mockResolvedValue([]);
	const credentials = mock<CompiledEngineCredentials>();
	credentials.buildDocument.mockResolvedValue({});
	const workflowRepository = mock<WorkflowRepository>();
	const urlService = mock<UrlService>();
	urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');
	const globalConfig = mock<GlobalConfig>({
		endpoints: { webhookWaiting: 'webhook-waiting', formWaiting: 'form-waiting' },
	});
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const staticData = mock<WorkflowStaticDataService>();
	const sync = new CompiledEngineSync(
		compiler,
		client,
		credentials,
		workflowRepository,
		urlService,
		globalConfig,
		logger,
		staticData,
	);
	return { sync, client, staticData, workflowRepository };
}

const workflow = (id: string): WorkflowEntity =>
	mock<WorkflowEntity>({
		id,
		name: 'Demo',
		nodes: [],
		connections: {},
		settings: { engineType: 'compiled' },
		versionId: 'v1',
		activeVersion: null,
	});

describe('static data of compiled workflows', () => {
	it('sends n8n’s copy with the load of a published workflow', async () => {
		const { sync, client, staticData } = setup();
		staticData.getStaticDataById.mockResolvedValue({ global: { seen: ['a'] } });
		await sync.onConnected();
		await sync.activate(workflow('wf1'));
		const upload: WfrtWorkflowUpload = client.putWorkflow.mock.calls[0][1];
		expect(client.putWorkflow.mock.calls[0][0]).toBe('wf1');
		expect(upload.staticData).toEqual({ global: { seen: ['a'] } });
	});

	it('sends it with the draft of a manual run too', async () => {
		const { sync, client, staticData } = setup();
		staticData.getStaticDataById.mockResolvedValue({
			'node:Gmail Trigger': { lastTimeChecked: 1 },
		});
		await sync.onConnected();
		const draft = mock<IWorkflowBase>({ id: 'wf1', name: 'Demo', nodes: [], connections: {} });
		await sync.prepareManualRun(draft);
		expect(staticData.getStaticDataById).toHaveBeenCalledWith('wf1');
		expect(client.putWorkflow.mock.calls[0][0]).toBe('wf1~manual');
		expect(client.putWorkflow.mock.calls[0][1].staticData).toEqual({
			'node:Gmail Trigger': { lastTimeChecked: 1 },
		});
	});

	it('stores each change in the order of the events, and none for manual runs', async () => {
		const { sync, staticData } = setup();
		const saved: IDataObject[] = [];
		staticData.saveStaticDataById.mockImplementation(async (_id, doc) => {
			// The first save is the slower one: order must still hold.
			if (saved.length === 0) await new Promise((resolve) => setTimeout(resolve, 20));
			saved.push(doc);
		});
		await Promise.all([
			sync.saveStaticData('wf1', { global: { n: 1 } }),
			sync.saveStaticData('wf1', { global: { n: 2 } }),
			sync.saveStaticData('wf1~manual', { global: { n: 3 } }),
		]);
		expect(saved).toEqual([{ global: { n: 1 } }, { global: { n: 2 } }]);
	});

	it('on connect, keeps the copy of wfrt before it loads n8n’s copy again', async () => {
		const { sync, client, staticData } = setup();
		await sync.activate(workflow('wf1'));
		client.listWorkflows.mockResolvedValue([
			{ workflowId: 'wf1', versionId: 'hash1', active: true, executions: 0 },
		]);
		let stored: IDataObject = { global: { n: 1 } };
		staticData.getStaticDataById.mockImplementation(async () => stored);
		staticData.saveStaticDataById.mockImplementation(async (_id, doc) => {
			stored = doc;
		});
		client.getStaticData.mockResolvedValue({ global: { n: 7 } });
		await sync.onConnected();
		expect(staticData.saveStaticDataById).toHaveBeenCalledWith('wf1', { global: { n: 7 } });
		expect(client.putWorkflow.mock.calls[0][1].staticData).toEqual({ global: { n: 7 } });
	});

	it('keeps n8n’s copy when wfrt has none', async () => {
		const { sync, client, staticData } = setup();
		client.getStaticData.mockResolvedValue({});
		await sync.pullStaticData(['wf1']);
		expect(staticData.saveStaticDataById).not.toHaveBeenCalled();
	});

	it('reads the static data events of the stream', () => {
		expect(
			parseWfrtEvent(
				'{"type":"staticData","workflowId":"wf1","staticData":{"global":{"n":2}},"at":5}',
			),
		).toEqual({ type: 'staticData', workflowId: 'wf1', staticData: { global: { n: 2 } }, at: 5 });
		expect(parseWfrtEvent('{"type":"staticData","workflowId":"wf1","staticData":[1]}')).toBe(
			undefined,
		);
		expect(
			parseWfrtEvent('{"type":"staticDataRejected","message":"raise --max-static-data","at":6}'),
		).toEqual({ type: 'staticDataRejected', message: 'raise --max-static-data', at: 6 });
	});

	it('the dispatcher stores changes, and reads them again after dropped events', () => {
		const sync = mock<CompiledEngineSync>();
		sync.saveStaticData.mockResolvedValue();
		sync.pullStaticData.mockResolvedValue();
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const dispatcher = new CompiledEngineDispatcher(
			mock<ActiveExecutions>(),
			sync,
			mock<WfrtAdminClient>(),
			mock<NodeTypes>(),
			mock<CredentialsPermissionChecker>(),
			mock<StorageConfig>(),
			mock<CompiledExecutionStore>(),
			logger,
			mock<BinaryDataService>(),
			mock<BinaryDataConfig>({ mode: 'default' }),
		);
		dispatcher.handleEvent({
			type: 'staticData',
			workflowId: 'wf1',
			staticData: { global: {} },
			at: 1,
		});
		expect(sync.saveStaticData).toHaveBeenCalledWith('wf1', { global: {} });
		dispatcher.handleEvent({ type: 'dropped', count: 3, at: 2 });
		expect(sync.pullStaticData).toHaveBeenCalled();
		dispatcher.handleEvent({ type: 'staticDataRejected', message: 'full', at: 3 });
		expect(logger.warn).toHaveBeenCalledWith('wfrt did not keep a static data change: full');
	});
});
