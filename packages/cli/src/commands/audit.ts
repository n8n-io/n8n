import Command, { flags } from '@oclif/command';
import { LoggerProxy } from 'n8n-workflow';
import { UserSettings } from 'n8n-core';
import type { Logger } from '@/Logger';
import { getLogger } from '@/Logger';
import { audit } from '@/audit';
import { RISK_CATEGORIES } from '@/audit/constants';
import { CredentialTypes } from '@/CredentialTypes';
import { NodeTypes } from '@/NodeTypes';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { InternalHooksManager } from '@/InternalHooksManager';
import config from '@/config';
import * as Db from '@/Db';
import type { Risk } from '@/audit/types';

export class SecurityAudit extends Command {
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

	logger: Logger;

	async run() {
		await this.init();

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

		void InternalHooksManager.getInstance().onAuditGeneratedViaCli();
	}

	async init() {
		await Db.init();

		this.initLogger();

		await this.initInternalHooksManager();
	}

	initLogger() {
		this.logger = getLogger();
		LoggerProxy.init(this.logger);
	}

	async initInternalHooksManager(): Promise<void> {
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		await loadNodesAndCredentials.init();

		const nodeTypes = NodeTypes(loadNodesAndCredentials);
		CredentialTypes(loadNodesAndCredentials);

		const instanceId = await UserSettings.getInstanceId();
		await InternalHooksManager.init(instanceId, nodeTypes);
	}

	async catch(error: Error) {
		this.logger.error('Failed to generate security audit');
		this.logger.error(error.message);

		this.exit(1);
	}

	async finally() {
		this.exit();
	}
}
