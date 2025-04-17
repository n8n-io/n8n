import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';
import { UserError } from 'n8n-workflow';

import { RISK_CATEGORIES } from '@/security-audit/constants';
import { SecurityAuditService } from '@/security-audit/security-audit.service';
import type { Risk } from '@/security-audit/types';

import { BaseCommand } from './base-command';

export class SecurityAudit extends BaseCommand {
	static description = 'Generate a security audit report for this n8n instance';

	static examples = [
		'$ n8n audit',
		'$ n8n audit --categories=database,credentials',
		'$ n8n audit --days-abandoned-workflow=10',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		categories: Flags.string({
			default: RISK_CATEGORIES.join(','),
			description: 'Comma-separated list of categories to include in the audit',
		}),

		'days-abandoned-workflow': Flags.integer({
			default: Container.get(SecurityConfig).daysAbandonedWorkflow,
			description: 'Days for a workflow to be considered abandoned if not executed',
		}),
	};

	async run() {
		const { flags: auditFlags } = await this.parse(SecurityAudit);

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

			throw new UserError([message, hint].join('. '));
		}

		const result = await Container.get(SecurityAuditService).run(
			categories,
			auditFlags['days-abandoned-workflow'],
		);

		if (Array.isArray(result) && result.length === 0) {
			this.logger.info('No security issues found');
		} else {
			process.stdout.write(JSON.stringify(result, null, 2));
		}
	}

	async catch(error: Error) {
		this.logger.error('Failed to generate security audit');
		this.logger.error(error.message);
	}
}
