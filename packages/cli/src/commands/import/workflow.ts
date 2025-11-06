import type { WorkflowEntity } from '@n8n/db';
import {
	generateNanoId,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	UserRepository,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import glob from 'fast-glob';
import fs from 'fs';
import type { IWorkflowBase, WorkflowId } from 'n8n-workflow';
import { jsonParse, UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { UM_FIX_INSTRUCTION } from '@/constants';
import type { IWorkflowToImport } from '@/interfaces';
import { ImportService } from '@/services/import.service';

function assertHasWorkflowsToImport(
	workflows: unknown[],
): asserts workflows is IWorkflowToImport[] {
	for (const workflow of workflows) {
		if (
			typeof workflow !== 'object' ||
			!Object.prototype.hasOwnProperty.call(workflow, 'nodes') ||
			!Object.prototype.hasOwnProperty.call(workflow, 'connections')
		) {
			throw new UserError('File does not seem to contain valid workflows.');
		}
	}
}

const flagsSchema = z.object({
	input: z
		.string()
		.alias('i')
		.describe('Input file name or directory if --separate is used')
		.optional(),
	separate: z
		.boolean()
		.describe('Imports *.json files from directory provided by --input')
		.default(false),
	userId: z.string().describe('The ID of the user to assign the imported workflows to').optional(),
	projectId: z
		.string()
		.describe('The ID of the project to assign the imported workflows to')
		.optional(),
});

@Command({
	name: 'import:workflow',
	description: 'Import workflows',
	examples: [
		'--input=file.json',
		'--separate --input=backups/latest/',
		'--input=file.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'--input=file.json --projectId=Ox8O54VQrmBrb4qL',
		'--separate --input=backups/latest/ --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
	],
	flagsSchema,
})
export class ImportWorkflowsCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run(): Promise<void> {
		const { flags } = this;

		if (!flags.input) {
			this.logger.info('An input file or directory with --input must be provided');
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					this.logger.info('The argument to --input must be a directory');
					return;
				}
			}
		}

		if (flags.projectId && flags.userId) {
			throw new UserError(
				'You cannot use `--userId` and `--projectId` together. Use one or the other.',
			);
		}

		const project = await this.getProject(flags.userId, flags.projectId);

		const workflows = await this.readWorkflows(flags.input, flags.separate);

		const result = await this.checkRelations(workflows, flags.projectId, flags.userId);

		if (!result.success) {
			throw new UserError(result.message);
		}

		this.logger.info(`Importing ${workflows.length} workflows...`);

		await Container.get(ImportService).importWorkflows(workflows, project.id);

		this.reportSuccess(workflows.length);
	}

	private async checkRelations(workflows: IWorkflowBase[], projectId?: string, userId?: string) {
		// The credential is not supposed to be re-owned.
		if (!userId && !projectId) {
			return {
				success: true as const,
				message: undefined,
			};
		}

		for (const workflow of workflows) {
			if (!(await this.workflowExists(workflow.id))) {
				continue;
			}

			const { user, project: ownerProject } = await this.getWorkflowOwner(workflow.id);

			if (!ownerProject) {
				continue;
			}

			if (ownerProject.id !== projectId) {
				const currentOwner =
					ownerProject.type === 'personal'
						? `the user with the ID "${user.id}"`
						: `the project with the ID "${ownerProject.id}"`;
				const newOwner = userId
					? // The user passed in `--userId`, so let's use the user ID in the error
						// message as opposed to the project ID.
						`the user with the ID "${userId}"`
					: `the project with the ID "${projectId}"`;

				return {
					success: false as const,
					message: `The credential with ID "${workflow.id}" is already owned by ${currentOwner}. It can't be re-owned by ${newOwner}.`,
				};
			}
		}

		return {
			success: true as const,
			message: undefined,
		};
	}

	async catch(error: Error) {
		this.logger.error('An error occurred while importing workflows. See log messages for details.');
		this.logger.error(error.message);
	}

	private reportSuccess(total: number) {
		this.logger.info(`Successfully imported ${total} ${total === 1 ? 'workflow.' : 'workflows.'}`);
	}

	private async getWorkflowOwner(workflowId: WorkflowId) {
		const sharing = await Container.get(SharedWorkflowRepository).findOne({
			where: { workflowId, role: 'workflow:owner' },
			relations: { project: true },
		});

		if (sharing && sharing.project.type === 'personal') {
			const user = await Container.get(UserRepository).findOneByOrFail({
				projectRelations: {
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
					projectId: sharing.projectId,
				},
			});

			return { user, project: sharing.project };
		}

		return {};
	}

	private async workflowExists(workflowId: WorkflowId) {
		return await Container.get(WorkflowRepository).existsBy({ id: workflowId });
	}

	private async readWorkflows(path: string, separate: boolean): Promise<WorkflowEntity[]> {
		if (process.platform === 'win32') {
			path = path.replace(/\\/g, '/');
		}

		const workflowRepository = Container.get(WorkflowRepository);

		if (separate) {
			const files = await glob('*.json', {
				cwd: path,
				absolute: true,
			});
			return files.map((file) => {
				const workflow = jsonParse<IWorkflowToImport>(fs.readFileSync(file, { encoding: 'utf8' }));
				if (!workflow.id) {
					workflow.id = generateNanoId();
				}
				return workflowRepository.create(workflow);
			});
		} else {
			const workflows = jsonParse<IWorkflowToImport | IWorkflowToImport[]>(
				fs.readFileSync(path, { encoding: 'utf8' }),
			);
			const workflowsArray = Array.isArray(workflows) ? workflows : [workflows];
			assertHasWorkflowsToImport(workflowsArray);

			return workflowRepository.create(workflowsArray);
		}
	}

	private async getProject(userId?: string, projectId?: string) {
		if (projectId) {
			return await Container.get(ProjectRepository).findOneByOrFail({ id: projectId });
		}

		if (!userId) {
			const owner = await Container.get(UserRepository).findOneBy({
				role: { slug: GLOBAL_OWNER_ROLE.slug },
			});
			if (!owner) {
				throw new UserError(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
			}
			userId = owner.id;
		}

		return await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(userId);
	}
}
