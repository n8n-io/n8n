import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

/** Parse repeated `key=value` flags into an object; later keys win. */
export function parseOptions(pairs: string[] | undefined): Record<string, unknown> {
	const options: Record<string, unknown> = {};
	for (const pair of pairs ?? []) {
		const separator = pair.indexOf('=');
		if (separator === -1) {
			throw new Error(`Invalid --option "${pair}", expected key=value`);
		}
		options[pair.slice(0, separator)] = pair.slice(separator + 1);
	}
	return options;
}

export default class PromotionSubmit extends BaseCommand {
	static override description = 'POC: Submit a promotion of a unit of work';

	static override examples = [
		'<%= config.bin %> promotion submit --model direct-push --project-id abc',
		'<%= config.bin %> promotion submit --model direct-push --unit-type project --unit-id abc',
		'<%= config.bin %> promotion submit --model git --project-id abc --option repoUrl=/tmp/promo.git',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		model: Flags.string({
			char: 'm',
			description: 'Promotion model that owns the lifecycle',
			default: 'direct-push',
		}),
		projectId: Flags.string({
			char: 'p',
			description: 'Project to promote (shorthand for --unit-type project --unit-id)',
			aliases: ['project-id'],
		}),
		unitType: Flags.string({
			description: 'Kind of unit to promote',
			aliases: ['unit-type'],
		}),
		unitId: Flags.string({
			description: 'Id of the unit to promote',
			aliases: ['unit-id'],
		}),
		option: Flags.string({
			description: 'Model-specific option as key=value (repeat for multiple)',
			multiple: true,
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PromotionSubmit);
		await this.execute(async () => {
			// Some models (git-review destination) derive the unit from elsewhere,
			// so a missing unit is validated server-side per model.
			const unitOfWork = flags.projectId
				? { type: 'project', id: flags.projectId }
				: flags.unitType && flags.unitId
					? { type: flags.unitType, id: flags.unitId }
					: undefined;

			const client = this.getClient(flags);
			const data = await client.createPromotion({
				model: flags.model,
				unitOfWork,
				options: parseOptions(flags.option),
			});
			this.output(data, flags, {
				columns: ['id', 'model', 'role', 'unitOfWorkType', 'unitOfWorkId', 'state'],
			});
		});
	}
}
