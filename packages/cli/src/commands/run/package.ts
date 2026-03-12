import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { readFile } from 'fs/promises';
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
import { z } from 'zod';

import { ActiveExecutions } from '@/active-executions';
import { EventService } from '@/events/event.service';
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
	rawOutput: z.boolean().describe('Output only JSON data, with no other text').optional(),
});

interface CredentialFileEntry {
	name: string;
	type: string;
	data: ICredentialDataDecryptedObject;
}

@Command({
	name: 'run:package',
	description: 'Run a workflow from a .n8np package file',
	examples: [
		'--package=workflow.n8np',
		'--package=workflow.n8np --credentialsFile=creds.json',
		'--package=workflow.n8np --workflow="Send Report"',
		'--package=workflow.n8np --input=\'[{"json":{"date":"2026-03-10"}}]\'',
	],
	flagsSchema,
})
export class RunPackage extends BaseCommand<z.infer<typeof flagsSchema>> {
	override needsCommunityPackages = true;

	override needsTaskRunner = true;

	async init() {
		await super.init();
		await this.initBinaryDataService();
		await this.initDataDeduplicationService();
		await this.initExternalHooks();
	}

	async run() {
		const { flags } = this;

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

		// 5. Find target workflow — read IDs from the package manifest so we don't
		//    pick up pre-existing workflows in the owner's personal project.
		const { TarPackageReader } = await import('../../modules/import-export/tar-package-reader');
		const reader = await TarPackageReader.fromBuffer(buffer);
		const manifest = jsonParse<{
			workflows?: Array<{ id: string }>;
			projects?: Array<{ workflows?: Array<{ id: string }> }>;
		}>(reader.readFile('manifest.json'));

		const packageWorkflowIds: string[] = [];
		for (const w of manifest.workflows ?? []) packageWorkflowIds.push(w.id);
		for (const p of manifest.projects ?? []) {
			for (const w of p.workflows ?? []) packageWorkflowIds.push(w.id);
		}

		const allWorkflows =
			packageWorkflowIds.length > 0
				? await Container.get(WorkflowRepository).findByIds(packageWorkflowIds)
				: await Container.get(WorkflowRepository).findByIds(
						(
							await Container.get(SharedWorkflowRepository).find({
								where: { projectId: personalProject.id },
								select: ['workflowId'],
							})
						).map((sw) => sw.workflowId),
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

		if (this.globalConfig.executions.mode === 'queue') {
			this.logger.warn(
				'CLI command `run:package` does not support queue mode. Falling back to regular mode.',
			);
			this.globalConfig.executions.mode = 'regular';
		}

		const workflowRunner = Container.get(WorkflowRunner);
		const executionId = await workflowRunner.run(runData);

		Container.get(EventService).emit('workflow-executed', {
			user: { id: user.id },
			workflowId: workflow.id,
			workflowName: workflow.name,
			executionId,
			source: 'cli',
		});

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
			// Match to a requirement from the package by name + type
			const requirement = this.findRequirement(analysis.requirements.credentials, entry);
			if (!requirement) {
				this.logger.warn(
					`Credential "${entry.name}" (${entry.type}) does not match any package requirement — skipping`,
				);
				continue;
			}

			// Create a real credential with encrypted data
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
		this.logger.error('Error running package workflow. See log messages for details.');
		this.logger.error('\nExecution error:');
		this.logger.error(error.message);
		if (error instanceof ExecutionBaseError) this.logger.error(error.description!);
		this.logger.error(error.stack!);
	}
}
