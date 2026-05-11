import { ModuleRegistry } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings, UnrecognizedNodeTypeError } from 'n8n-core';
import { DebugHelper } from 'n8n-nodes-base/nodes/DebugHelper/DebugHelper.node';
import { ManualTrigger } from 'n8n-nodes-base/nodes/ManualTrigger/ManualTrigger.node';

import { TestNodeWithTracing } from './test-node-with-tracing';
import { createRunExecutionData } from 'n8n-workflow';
import type { INodeType, INodeTypeData, NodeLoadingDetails } from 'n8n-workflow';
import { readFileSync } from 'fs';
import path from 'path';

import { WorkflowRunner } from '@/workflow-runner';
import { OtelConfig } from '../../otel.config';
import * as utils from '@test-integration/utils';

import { OtelTestProvider } from './otel-test-provider';

const BASE_DIR = path.resolve(__dirname, '../../../../../..');

function loadNodesFromDist(nodeNames: string[]): INodeTypeData {
	const nodeTypes: INodeTypeData = {};
	const knownNodes = JSON.parse(
		readFileSync(path.join(BASE_DIR, 'nodes-base/dist/known/nodes.json'), 'utf-8'),
	) as Record<string, NodeLoadingDetails>;

	for (const nodeName of nodeNames) {
		const loadInfo = knownNodes[nodeName.replace('n8n-nodes-base.', '')];
		if (!loadInfo) {
			throw new UnrecognizedNodeTypeError('n8n-nodes-base', nodeName);
		}
		const nodeDistPath = path.join(BASE_DIR, 'nodes-base', loadInfo.sourcePath);
		const node = new (require(nodeDistPath)[loadInfo.className])() as INodeType;
		nodeTypes[nodeName] = { sourcePath: '', type: node };
	}

	return nodeTypes;
}

export async function initOtelTestEnvironment() {
	const otel = OtelTestProvider.create();

	await testModules.loadModules(['otel']);
	await testDb.init();
	await Container.get(ModuleRegistry).initModules('main');
	const distNodes = loadNodesFromDist([
		'n8n-nodes-base.executeWorkflow',
		'n8n-nodes-base.executeWorkflowTrigger',
	]);
	await utils.initNodeTypes({
		'n8n-nodes-base.manualTrigger': { type: new ManualTrigger(), sourcePath: '' },
		'n8n-nodes-base.debugHelper': { type: new DebugHelper(), sourcePath: '' },
		'n8n-nodes-base.tracingTestNode': { type: new TestNodeWithTracing(), sourcePath: '' },
		...distNodes,
	});
	await utils.initBinaryDataService();

	Container.get(InstanceSettings).markAsLeader();

	const config = Container.get(OtelConfig);
	config.includeNodeSpans = true;
	config.injectOutbound = true;

	return {
		otel,
		workflowRunner: Container.get(WorkflowRunner),
		executionRepository: Container.get(ExecutionRepository),
	};
}

export async function terminateOtelTestEnvironment(otel: OtelTestProvider) {
	await otel.shutdown();
	await testDb.terminate();
}

export function saveAndSetEnv(vars: Record<string, string>): Record<string, string | undefined> {
	const saved: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(vars)) {
		saved[key] = process.env[key];
		process.env[key] = value;
	}
	return saved;
}

export function restoreEnv(saved: Record<string, string | undefined>) {
	for (const [key, value] of Object.entries(saved)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

export async function executeWorkflow(
	workflowRunner: WorkflowRunner,
	workflow: WorkflowEntity,
	projectId: string,
	options: {
		mode?: 'webhook' | 'trigger' | 'manual' | 'retry';
		retryOf?: string;
		tracingContext?: { traceparent: string; tracestate?: string };
	} = {},
): Promise<string> {
	const { mode = 'webhook', retryOf, tracingContext } = options;
	const triggerNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.manualTrigger')!;
	const executionData = createRunExecutionData({
		executionData: {
			nodeExecutionStack: [
				{
					node: triggerNode,
					data: { main: [[{ json: {}, pairedItem: { item: 0 } }]] },
					source: null,
				},
			],
		},
		startData: {
			startNodes: [{ name: triggerNode.name, sourceData: null }],
		},
	});

	return await workflowRunner.run(
		{
			workflowData: workflow,
			userId: projectId,
			executionMode: mode,
			executionData,
			retryOf,
			tracingContext,
		},
		true,
	);
}

export async function waitForExecution(
	executionRepository: ExecutionRepository,
	executionId: string,
	timeout = 10_000,
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const execution = await executionRepository.findOneBy({ id: executionId });
		if (execution?.stoppedAt) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
}
