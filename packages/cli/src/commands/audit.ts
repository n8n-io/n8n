import { flags } from '@oclif/command';
import { audit } from '@/audit';
import { RISK_CATEGORIES } from '@/audit/constants';
import config from '@/config';
import type { Risk } from '@/audit/types';
import { BaseCommand } from './BaseCommand';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';

export class SecurityAudit extends BaseCommand {
	static description = 'Generate a security audit report for this n8n instance';

	static examples = [
		'$ n8n audit',
		'$ n8n audit --categories=database,credentials',
		'$ n8n audit --days-abandoned-workflow=10',
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		categories: flags.string({
			default: RISK_CATEGORIES.join(','),
			description: 'Comma-separated list of categories to include in the audit',
		}),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'days-abandoned-workflow': flags.integer({
			default: config.getEnv('security.audit.daysAbandonedWorkflow'),
			description: 'Days for a workflow to be considered abandoned if not executed',
		}),
	};

	async run() {
		const { flags: auditFlags } = this.parse(SecurityAudit);

		const categories =
			auditFlags.categories?.split(',').filter((c): c is Risk.Category => c !== '') ??
			RISK_CATEGORIES;

		const invalidCategories = categories.filter((c) => !RISK_CATEGORIES.includes(c));

		if (invalidCategories.length > 0) {
			const message =
				invalidCategories.length > 1
					? `Invalid categories received: ${invalidCategories.join(', ')}`
					: `Invalid category received: ${invalidCategories[0]}`;

			const hint = `Valid categories are: ${RISK_CATEGORIES.join(', ')}`;

			throw new Error([message, hint].join('. '));
		}

		const result = await audit(categories, auditFlags['days-abandoned-workflow']);

		if (Array.isArray(result) && result.length === 0) {
			this.logger.info('No security issues found');
		} else {
			process.stdout.write(JSON.stringify(result, null, 2));
		}

		void Container.get(InternalHooks).onAuditGeneratedViaCli();
	}

	async catch(error: Error) {
		this.logger.error('Failed to generate security audit');
		this.logger.error(error.message);
	}
}
