import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

@Service()
export class MyFeatureService {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('environments' /* Add scope to logging.config.ts */);
	}

	start() {
		this.logger.debug('Starting environments service...');
	}

	async shutdown() {
		this.logger.debug('Shutting down environments service...');
	}

	async sayHello() {
		return 'Hello World from environments service';
	}
}
