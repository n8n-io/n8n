import { BaseCommand } from './BaseCommand';
import { audit } from '@/audit';
import { InternalHooksManager } from '@/InternalHooksManager';

export class SecurityAuditCommand extends BaseCommand {
	static description = 'Generate a security audit report for this n8n instance';

	static examples = ['$ n8n audit'];

	async run() {
		this.initLogger();

		await this.initInternalHooksManager();

		const result = await audit();

		process.stdout.write(JSON.stringify(result, null, 2));

		void InternalHooksManager.getInstance().onAuditGeneratedViaCli();
	}

	async catch(error: Error) {
		this.logger.error('Failed to generate security audit report');
		this.logger.error(error.message);
		this.exit(1);
	}
}
