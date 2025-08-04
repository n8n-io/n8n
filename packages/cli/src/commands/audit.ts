import { SecurityConfig } from '@n8n/config';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import { RISK_CATEGORIES } from '@/security-audit/constants';
import type { Risk } from '@/security-audit/types';

import { BaseCommand } from './base-command';

const flagsSchema = z.object({
	categories: z
		.string()
		.default(RISK_CATEGORIES.join(','))
		.describe('Comma-separated list of categories to include in the audit'),
	'days-abandoned-workflow': z
		.number()
		.int()
		.default(Container.get(SecurityConfig).daysAbandonedWorkflow)
		.describe('Days for a workflow to be considered abandoned if not executed'),
});

@Command({
	name: 'audit',
	description: 'Generate a security audit report for this n8n instance',
	examples: ['', '--categories=database,credentials', '--days-abandoned-workflow=10'],
	flagsSchema,
})
export class SecurityAudit extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { flags: auditFlags } = this;
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

		const { SecurityAuditService } = await import('@/security-audit/security-audit.service');

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
