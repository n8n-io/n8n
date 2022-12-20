/* eslint-disable @typescript-eslint/no-use-before-define */
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '@/Logger';
import { BaseCommand } from '@/commands/BaseCommand';
import * as Db from '@/Db';
import { reportSqlInjection, reportInactiveCreds } from '@/SecurityAudit';

// @TODO: Documentation

export class SecurityAuditCommand extends BaseCommand {
	static description = 'Generate a security audit report for this n8n instance';

	static examples = ['$ n8n security:audit'];

	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		const workflows = await Db.collections.Workflow.find();
		const sqlInjectionRiskReport = await reportSqlInjection(workflows);
		const inactiveCredsReport = await reportInactiveCreds(workflows);
		console.log(JSON.stringify(inactiveCredsReport, null, 2));

		this.logger.info('Successfully generated security audit report');
		process.exit();
	}

	async catch(error: Error) {
		this.logger.error('Failed to generate security audit report');
		this.logger.error(error.message);
		this.exit(1);
	}
}
