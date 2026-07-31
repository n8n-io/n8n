import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';
import { N8nClient } from '../../client';

/**
 * Courier for the direct-push model: the CLI moves the package, neither
 * instance talks to the other. Other models apply server-side via
 * `promotion action <id> apply`.
 */
export default class PromotionApply extends BaseCommand {
	static override description =
		'POC: Apply an approved direct-push promotion by pushing the package to a destination instance';

	static override examples = [
		'<%= config.bin %> promotion apply prom-abc --dest-url http://localhost:5679 --dest-api-key n8n_api_...',
	];

	static override args = {
		id: Args.string({ description: 'Promotion ID on the source instance', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		destUrl: Flags.string({
			description: 'Destination n8n instance URL',
			aliases: ['dest-url'],
			required: true,
		}),
		destApiKey: Flags.string({
			description: 'Destination API key',
			aliases: ['dest-api-key'],
			required: true,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(PromotionApply);
		await this.execute(async () => {
			const source = this.getClient(flags);

			const promotion = await source.getPromotion(args.id);
			if (promotion.model !== 'direct-push') {
				this.error(
					`Promotion "${args.id}" uses model "${String(promotion.model)}"; the CLI courier only applies direct-push promotions. Use 'promotion action ${args.id} apply' on the applying instance instead.`,
				);
			}
			if (promotion.state !== 'approved') {
				this.error(
					`Promotion "${args.id}" is in state "${String(promotion.state)}", not approved.`,
				);
			}
			const unitType = String(promotion.unitOfWorkType);
			const unitId = String(promotion.unitOfWorkId);
			if (unitType !== 'project' && unitType !== 'workflow') {
				this.error(`Unit of work type "${unitType}" is not supported yet.`);
			}

			if (!flags.quiet) {
				this.log(
					`Exporting ${unitType} ${unitId} from source (snapshot is taken now, at apply time — not at submit time)`,
				);
			}
			const { archive } = await source.exportPackage(
				unitType === 'project' ? { projectIds: [unitId] } : { workflowIds: [unitId] },
			);

			const destination = new N8nClient({ baseUrl: flags.destUrl, apiKey: flags.destApiKey });
			if (!flags.quiet) this.log(`Importing package into ${flags.destUrl}`);
			await destination.importPackage(
				{ buffer: archive, filename: `promotion-${args.id}.n8np` },
				{
					credentialMatchingMode: 'name-and-type',
					credentialMissingMode: 'create-stub',
					workflowConflictPolicy: 'new-version',
					workflowPublishingPolicy: 'match-source',
					workflowIdPolicy: 'source',
					missingNodeTypeMode: 'import-anyway',
					folderConflictPolicy: 'merge',
				},
			);

			const updated = await source.runPromotionAction(args.id, 'mark-promoted');
			this.output(updated, flags, { columns: ['id', 'model', 'state'] });
		});
	}
}
