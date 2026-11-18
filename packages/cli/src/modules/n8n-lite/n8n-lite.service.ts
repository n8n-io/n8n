import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { InstanceSettings } from 'n8n-core';
import {
	createRunExecutionData,
	Workflow,
	WorkflowOperationError,
	type IConnections,
	type INode,
} from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { NodeTypes } from '@/node-types';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { N8nLiteConfig } from './n8n-lite.config';
import { findUnsupported, runnableNodes } from './n8n-lite-support';
import type { LiteRunReport, LiteTarget } from './n8n-lite.schemas';

// Binary layout: [runner][config JSON][u64 LE config length][MAGIC]
const MAGIC = Buffer.from('N8NLITE1', 'ascii');

interface LiteRunnerConfig {
	version: 1;
	workflow: {
		id: string;
		name: string;
		nodes: INode[];
		connections: IConnections;
	};
	report: {
		url: string;
		token: string;
	};
}

@Service()
export class N8nLiteService {
	constructor(
		private readonly config: N8nLiteConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly urlService: UrlService,
		private readonly instanceSettings: InstanceSettings,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly executionPersistence: ExecutionPersistence,
	) {}

	async buildBinary(workflowId: string, user: User, target: LiteTarget) {
		const workflowData = await this.workflowFinder.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflowData) throw new NotFoundError(`Workflow ${workflowId} not found`);

		// Fills in the default parameter values that the saved workflow omits.
		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: this.nodeTypes,
			settings: workflowData.settings,
		});
		const nodes = runnableNodes(Object.values(workflow.nodes));

		const unsupported = findUnsupported(nodes, workflow.connectionsBySourceNode);
		if (unsupported.length > 0) {
			const details = unsupported.map(({ node, reason }) => `"${node}": ${reason}`).join('\n');
			throw new BadRequestError(`n8n-lite cannot run this workflow:\n${details}`);
		}

		const runnerConfig: LiteRunnerConfig = {
			version: 1,
			workflow: {
				id: workflowData.id,
				name: workflowData.name,
				nodes,
				connections: workflow.connectionsBySourceNode,
			},
			report: {
				url: `${this.reportBaseUrl()}/${this.globalConfig.endpoints.rest}/n8n-lite/runs`,
				token: this.reportToken(workflowData.id),
			},
		};

		const runner = await this.readRunner(target);
		const payload = Buffer.from(JSON.stringify(runnerConfig), 'utf8');
		const length = Buffer.alloc(8);
		length.writeBigUInt64LE(BigInt(payload.length));

		const webhook = nodes.find((node) => node.type === 'n8n-nodes-base.webhook');

		return {
			binary: Buffer.concat([runner, payload, length, MAGIC]),
			filename: `${slugify(workflowData.name)}-${target}`,
			reportUrl: runnerConfig.report.url,
			webhookPath:
				typeof webhook?.parameters.path === 'string' ? webhook.parameters.path : undefined,
		};
	}

	async saveReport(report: LiteRunReport, authorization: string | undefined) {
		const workflowData = await this.workflowRepository.findById(report.workflowId);
		if (!workflowData) throw new NotFoundError(`Workflow ${report.workflowId} not found`);

		if (!this.isValidToken(report.workflowId, authorization)) {
			throw new ForbiddenError('Invalid n8n-lite report token');
		}

		const data = createRunExecutionData({
			resultData: {
				runData: report.runData,
				lastNodeExecuted: report.lastNodeExecuted,
				error:
					report.status === 'error'
						? new WorkflowOperationError(report.error?.message ?? 'The lite run failed')
						: undefined,
			},
			executionData: null,
		});

		const executionId = await this.executionPersistence.create({
			data,
			workflowData,
			workflowId: workflowData.id,
			mode: 'webhook',
			status: report.status,
			finished: report.status === 'success',
			startedAt: new Date(report.startedAt),
			stoppedAt: new Date(report.stoppedAt),
			waitTill: null,
		});

		return { executionId };
	}

	private reportBaseUrl() {
		const base = this.config.reportBaseUrl || this.urlService.getInstanceBaseUrl();
		return base.replace(/\/+$/, '');
	}

	private reportToken(workflowId: string) {
		return createHmac('sha256', this.instanceSettings.hmacSignatureSecret)
			.update(`n8n-lite:report:${workflowId}`)
			.digest('hex');
	}

	private isValidToken(workflowId: string, authorization: string | undefined) {
		const presented = authorization?.match(/^Bearer (.+)$/)?.[1];
		if (!presented) return false;
		const expected = Buffer.from(this.reportToken(workflowId));
		const actual = Buffer.from(presented);
		return actual.length === expected.length && timingSafeEqual(actual, expected);
	}

	private async readRunner(target: LiteTarget) {
		if (!this.config.runnerDir) {
			throw new BadRequestError('Set N8N_LITE_RUNNER_DIR to the folder with the lite runners');
		}
		const runnerPath = path.join(this.config.runnerDir, `n8n-lite-runner-${target}`);
		try {
			return await readFile(runnerPath);
		} catch {
			throw new BadRequestError(`No lite runner for target "${target}" at ${runnerPath}`);
		}
	}
}

function slugify(name: string) {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'workflow';
}
