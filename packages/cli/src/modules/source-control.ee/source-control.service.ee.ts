import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

@Service()
export class SourceControlService {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('source-control' /* Add scope to logging.config.ts */);
	}

	start() {
		this.logger.debug('Starting source control service...');
	}

	async shutdown() {
		this.logger.debug('Shutting down source control service...');
	}

	async sayHello() {
		return 'Hello World from source control service';
	}
}
