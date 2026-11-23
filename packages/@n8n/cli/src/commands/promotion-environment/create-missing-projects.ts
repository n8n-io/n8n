import { Args, Flags } from '@oclif/core';

import { BaseCommand, EXIT_ERROR } from '../../base-command';
import { ApiError } from '../../client';

type CreationResult = {
	id: string;
	name?: string;
	status: 'created' | 'already-exists' | 'failed' | 'admin-failed';
	admin?: string;
	message?: string;
};

// Any failure goes into the results, so the output still lists the projects created before it.
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Parses repeated `<projectId>=<userId>` values. */
function parseAdmins(values: string[]): Map<string, string> | string {
	const admins = new Map<string, string>();
	for (const value of values) {
		const [projectId, userId, ...rest] = value.split('=');
		if (!projectId || !userId || rest.length > 0) return value;
		admins.set(projectId, userId);
	}
	return admins;
}

export default class PromotionEnvironmentCreateMissingProjects extends BaseCommand {
	static override description =
		'Create the team projects of the Apply package whose IDs do not exist on this instance. Each project is created empty, with the ID, name, icon, description, and telemetry tags from the package. You become its project admin, and --admin adds another user as project admin. Then apply changes to each project with apply-selection. Exits 1 when a project could not be created or its admin could not be assigned.';

	static override examples = [
		'<%= config.bin %> promotion-environment create-missing-projects env-1',
		'<%= config.bin %> promotion-environment create-missing-projects env-1 -p proj-1 -p proj-2',
		'<%= config.bin %> promotion-environment create-missing-projects env-1 --admin proj-1=user-1',
	];

	static override args = {
		id: Args.string({ description: 'Apply environment ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		project: Flags.string({
			char: 'p',
			description:
				'Project ID to create (repeat for more than one). Without it, all missing projects are created.',
			multiple: true,
		}),
		admin: Flags.string({
			description:
				'Project admin to assign, as <projectId>=<userId> (repeat for more than one). The user is added as project admin after the project is created.',
			multiple: true,
		}),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentCreateMissingProjects);
		const admins = parseAdmins(flags.admin ?? []);
		if (typeof admins === 'string') {
			this.error(`Invalid --admin value "${admins}". Use <projectId>=<userId>.`);
		}
		await this.execute(async () => {
			const client = this.getClient(flags);
			const { data } = await client.listMissingPromotionProjects(args.id);
			const missing = new Map(data.map((project) => [project.id, project]));

			const ids = flags.project ?? [...missing.keys()];
			const unknownAdmin = [...admins.keys()].find((id) => !ids.includes(id));
			if (unknownAdmin) {
				this.error(`--admin names project ${unknownAdmin}, which this command does not create.`);
			}

			const results: CreationResult[] = [];
			// One at a time, because each creation checks the team project quota.
			for (const id of ids) {
				const project = missing.get(id);
				if (!project) {
					results.push({
						id,
						status: 'failed',
						message: 'Not a missing project of this environment',
					});
					continue;
				}
				try {
					await client.createProject(project);
				} catch (error) {
					results.push(
						error instanceof ApiError && error.statusCode === 409
							? { id, name: project.name, status: 'already-exists' }
							: { id, name: project.name, status: 'failed', message: errorMessage(error) },
					);
					continue;
				}
				const admin = admins.get(id);
				try {
					if (admin) await client.addProjectMember(id, admin, 'project:admin');
					results.push({ id, name: project.name, status: 'created', admin });
				} catch (error) {
					results.push({
						id,
						name: project.name,
						status: 'admin-failed',
						admin,
						message: errorMessage(error),
					});
				}
			}

			this.output(results, flags);
			if (results.some(({ status }) => status === 'failed' || status === 'admin-failed')) {
				this.exit(EXIT_ERROR);
			}
		});
	}
}
