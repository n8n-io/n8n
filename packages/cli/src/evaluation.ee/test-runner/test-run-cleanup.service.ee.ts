import { Logger } from '@n8n/backend-common';
import { TestRunRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * This service is responsible for cleaning up pending Test Runs on application startup.
 */
@Service()
export class TestRunCleanupService {
	constructor(
		private readonly logger: Logger,
		private readonly testRunRepository: TestRunRepository,
	) {}

	/**
	 * As Test Runner does not have a recovery mechanism, it can not resume Test Runs interrupted by the server restart.
	 * All Test Runs in incomplete state will be marked as failed.
	 */
	async cleanupIncompleteRuns() {
		const result = await this.testRunRepository.markAllIncompleteAsFailed();
		if (result.affected && result.affected > 0) {
			this.logger.debug(`Marked ${result.affected} incomplete test runs as failed`);
		}
	}
}
