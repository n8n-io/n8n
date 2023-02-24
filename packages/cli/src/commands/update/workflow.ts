/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { flags } from '@oclif/command';
import type { FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import * as Db from '@/Db';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { BaseCommand } from '../BaseCommand';

export class UpdateWorkflowCommand extends BaseCommand {
	static description = 'Update workflows';

	static examples = [
		'$ n8n update:workflow --all --active=false',
		'$ n8n update:workflow --id=5 --active=true',
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		active: flags.string({
			description: 'Active state the workflow/s should be set to',
		}),
		all: flags.boolean({
			description: 'Operate on all workflows',
		}),
		id: flags.string({
			description: 'The ID of the workflow to operate on',
		}),
	};

	async run() {
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(UpdateWorkflowCommand);

		if (!flags.all && !flags.id) {
			console.info('Either option "--all" or "--id" have to be set!');
			return;
		}

		if (flags.all && flags.id) {
			console.info(
				'Either something else on top should be "--all" or "--id" can be set never both!',
			);
			return;
		}

		const updateQuery: QueryDeepPartialEntity<WorkflowEntity> = {};
		if (flags.active === undefined) {
			console.info('No update flag like "--active=true" has been set!');
			return;
		}

		if (!['false', 'true'].includes(flags.active)) {
			console.info('Valid values for flag "--active" are only "false" or "true"!');
			return;
		}

		updateQuery.active = flags.active === 'true';

		const findQuery: FindOptionsWhere<WorkflowEntity> = {};
		if (flags.id) {
			this.logger.info(`Deactivating workflow with ID: ${flags.id}`);
			findQuery.id = flags.id;
		} else {
			this.logger.info('Deactivating all workflows');
			findQuery.active = true;
		}

		await Db.collections.Workflow.update(findQuery, updateQuery);
		this.logger.info('Done');
	}

	async catch(error: Error) {
		this.logger.error('Error updating database. See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
