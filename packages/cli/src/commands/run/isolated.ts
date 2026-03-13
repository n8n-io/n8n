import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Credentials } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import {
	ExecutionBaseError,
	UnexpectedError,
	createRunExecutionData,
	jsonParse,
} from 'n8n-workflow';
import { mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { ActiveExecutions } from '@/active-executions';
import { OwnershipService } from '@/services/ownership.service';
import { findCliWorkflowStart } from '@/utils';
import { WorkflowRunner } from '@/workflow-runner';

import type { AnalyzePackageResult } from '../../modules/import-export/import-export.service';
import type { PackageCredentialRequirement } from '../../modules/import-export/import-export.types';
import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	package: z.string().describe('Path to .n8np package file'),
	credentialsFile: z.string().describe('Path to JSON file with credential data').optional(),
	workflow: z
		.string()
		.describe('Name or ID of the workflow to run (defaults to first workflow)')
		.optional(),
	input: z
		.string()
		.describe('JSON input data for the workflow trigger (array of {json: ...} objects)')
		.optional(),
	once: z.boolean().describe('Execute once and exit (default for now)').optional(),
	rawOutput: z.boolean().describe('Output only JSON data, with no other text').optional(),
});

interface CredentialFileEntry {
	name: string;
	type: string;
	data: ICredentialDataDecryptedObject;
}

@Command({
	name: 'run:isolated',
	description:
		'Run workflows from a .n8np package in isolation with minimal dependencies.\n' +
		'Uses an ephemeral in-process database — no external DB, editor, or server required.',
	examples: [
		'--package=workflow.n8np --once',
		'--package=workflow.n8np --once --credentialsFile=creds.json',
		'--package=workflow.n8np --once --workflow="Send Report"',
		'--package=workflow.n8np --once --input=\'[{"json":{"date":"2026-03-10"}}]\'',
		'--package=workflow.n8np --once --rawOutput',
	],
	flagsSchema,
})
export class IsolatedRunner extends BaseCommand<z.infer<typeof flagsSchema>> {
	/**
	 * Stripped-down init — skips Sentry, telemetry, PostHog, license,
	 * community packages, message bus, external hooks, and signal handlers.
	 * Uses an ephemeral SQLite database in a temp directory.
	 */
	override async init() {
		// Do NOT call super.init() — that pulls in the full CLI init chain.

		// 1. Load node types and credential definitions
		const { LoadNodesAndCredentials } = await import('@/load-nodes-and-credentials');
		await Container.get(LoadNodesAndCredentials).init();

		// 2. Force ephemeral SQLite — set config BEFORE DbConnection is instantiated.
		//    Use an absolute path so path.resolve() in DbConnectionOptions returns it as-is.
		const tmpDir = mkdtempSync(path.join(tmpdir(), 'n8n-isolated-'));
		this.globalConfig.database.type = 'sqlite';
		this.globalConfig.database.sqlite.database = path.join(tmpDir, 'isolated.sqlite');
		this.globalConfig.database.sqlite.poolSize = 1;
		this.globalConfig.database.sqlite.executeVacuumOnStartup = false;

		// Force regular execution mode (not queue)
		this.globalConfig.executions.mode = 'regular';

		const { DbConnection } = await import('@n8n/db');
		this.dbConnection = Container.get(DbConnection);
		await this.dbConnection.init();
		await this.dbConnection.migrate();

		// 3. Binary data — database mode only (no S3, no filesystem)
		const { BinaryDataService } = await import('n8n-core');
		const binaryDataService = Container.get(BinaryDataService);
		const { DatabaseManager } = await import('@/binary-data/database.manager');
		binaryDataService.setManager('database', Container.get(DatabaseManager));
		await binaryDataService.init();

		// 4. Task runner — needed for Code nodes
		const taskRunnersConfig = this.globalConfig.taskRunners;
		if (taskRunnersConfig.enabled) {
			const { TaskRunnerModule } = await import('@/task-runners/task-runner-module');
			await Container.get(TaskRunnerModule).start();
		}
	}

	async run() {
		const { flags } = this;

		// Phase 1: only --once mode is supported
		if (!flags.once) {
			if (!flags.rawOutput) {
				this.logger.info(
					'Long-running mode is not yet supported. Running in --once mode by default.',
				);
			}
		}

		// 1. Read package
		const buffer = await readFile(flags.package);
		const { ImportExportService } = await import(
			'../../modules/import-export/import-export.service'
		);
		const service = Container.get(ImportExportService);
		const user = await Container.get(OwnershipService).getInstanceOwner();

		// 2. Analyze package to get requirements
		const analysis = await service.analyzePackage(buffer);
		if (!flags.rawOutput) {
			this.logger.info(
				`Package: ${analysis.summary.workflows} workflow(s), ${analysis.summary.credentials} credential(s)`,
			);
		}

		// 3. Inject real credentials if provided
		let credentialBindings: Record<string, string> = {};
		if (flags.credentialsFile) {
			credentialBindings = await this.injectCredentials(flags.credentialsFile, analysis, user.id);
		}

		// 4. Import package into owner's personal project
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			user.id,
		);

		await service.importPackage(buffer, {
			user,
			targetProjectId: personalProject.id,
			mode: 'force',
			bindings: { credentials: credentialBindings },
			createCredentialStubs: true,
			withVariableValues: true,
			overwriteVariableValues: true,
		});

		// 5. Find target workflow — query the DB directly.
		// In the ephemeral DB, workflow IDs may change during import (new prefix added).
		// Since this is a fresh DB with only the imported workflows, we can query all
		// workflows belonging to the owner's personal project directly.
		const sharedWorkflows = await Container.get(SharedWorkflowRepository).find({
			where: { projectId: personalProject.id },
			select: ['workflowId'],
		});
		const allWorkflows = await Container.get(WorkflowRepository).findByIds(
			sharedWorkflows.map((sw) => sw.workflowId),
		);

		if (allWorkflows.length === 0) {
			throw new UnexpectedError('No workflows found after importing package');
		}

		let workflow;
		if (flags.workflow) {
			workflow = allWorkflows.find((w) => w.name === flags.workflow || w.id === flags.workflow);
			if (!workflow) {
				throw new UnexpectedError(
					`Workflow "${flags.workflow}" not found. Available: ${allWorkflows.map((w) => w.name).join(', ')}`,
				);
			}
		} else {
			workflow = allWorkflows[0];
		}

		if (!flags.rawOutput) {
			this.logger.info(`Running workflow: "${workflow.name}" (${workflow.id})`);
			this.logger.info(`  Nodes: ${workflow.nodes.map((n) => `${n.name} [${n.type}]`).join(', ')}`);
		}

		// 6. Execute workflow
		const startingNode = findCliWorkflowStart(workflow.nodes);

		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'cli',
			startNodes: [{ name: startingNode.name, sourceData: null }],
			workflowData: workflow,
			userId: user.id,
		};

		// Inject input data if provided
		if (flags.input) {
			const inputData = jsonParse<INodeExecutionData[]>(flags.input);
			runData.executionData = createRunExecutionData({
				executionData: {
					nodeExecutionStack: [
						{
							node: startingNode,
							data: {
								main: [inputData],
							},
							source: null,
						},
					],
				},
			});
		}

		const workflowRunner = Container.get(WorkflowRunner);
		const executionId = await workflowRunner.run(runData);

		const data = await Container.get(ActiveExecutions).getPostExecutePromise(executionId);

		if (data === undefined) {
			throw new UnexpectedError('Workflow did not return any data');
		}

		if (data.data.resultData.error) {
			this.logger.error('Execution was NOT successful:');
			this.logger.error(JSON.stringify(data, null, 2));
			const { error } = data.data.resultData;
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw {
				...error,
				stack: error.stack,
			};
		}

		if (!flags.rawOutput) {
			this.logger.info('Execution was successful:');
			this.logger.info('====================================');
		}
		this.logger.info(JSON.stringify(data, null, 2));
	}

	/**
	 * Read credentials file, create real credentials in DB, and return
	 * a binding map of sourceId → newId for the import.
	 */
	private async injectCredentials(
		filePath: string,
		analysis: AnalyzePackageResult,
		userId: string,
	): Promise<Record<string, string>> {
		const raw = await readFile(filePath, 'utf-8');
		const entries = jsonParse<CredentialFileEntry[]>(raw);
		const bindings: Record<string, string> = {};

		const personalProject =
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(userId);

		const credentialsRepo = Container.get(CredentialsRepository);
		const sharedCredentialsRepo = Container.get(SharedCredentialsRepository);

		for (const entry of entries) {
			const requirement = this.findRequirement(analysis.requirements.credentials, entry);
			if (!requirement) {
				this.logger.warn(
					`Credential "${entry.name}" (${entry.type}) does not match any package requirement — skipping`,
				);
				continue;
			}

			const credentials = new Credentials({ id: null, name: entry.name }, entry.type);
			credentials.setData(entry.data);
			const encryptedData = credentials.getDataToSave();

			const saved = await credentialsRepo.manager.transaction(async (tx) => {
				const entity = credentialsRepo.create({
					name: entry.name,
					type: entry.type,
					data: encryptedData.data as string,
				});
				const savedEntity = await tx.save(entity);

				const shared = sharedCredentialsRepo.create({
					role: 'credential:owner',
					credentials: savedEntity,
					projectId: personalProject.id,
				});
				await tx.save(shared);

				return savedEntity;
			});

			bindings[requirement.id] = saved.id;

			if (!this.flags.rawOutput) {
				this.logger.info(`Created credential "${entry.name}" (${entry.type}) → ${saved.id}`);
			}
		}

		return bindings;
	}

	private findRequirement(
		requirements: PackageCredentialRequirement[],
		entry: CredentialFileEntry,
	): PackageCredentialRequirement | undefined {
		return requirements.find((r) => r.name === entry.name && r.type === entry.type);
	}

	async catch(error: Error) {
		this.logger.error('Error running isolated workflow. See log messages for details.');
		this.logger.error('\nExecution error:');
		this.logger.error(error.message);
		if (error instanceof ExecutionBaseError) this.logger.error(error.description!);
		this.logger.error(error.stack!);
	}
}
