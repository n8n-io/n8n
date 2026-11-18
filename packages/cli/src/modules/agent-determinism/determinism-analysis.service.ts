import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import pLimit from 'p-limit';

import type { DeterminismSource } from './agent-determinism.contracts';

@Service()
export class DeterminismAnalysisService {
	private readonly queue = pLimit(1);

	constructor(private readonly logger: Logger) {
		this.logger = logger.scoped('agent-determinism');
	}

	enqueue(source: DeterminismSource, userId: string | null): void {
		this.logger.info('Determinism analysis queued', { source, userId });
		void this.queue(async () => await this.analyze(source, userId));
	}

	private async analyze(_source: DeterminismSource, _userId: string | null): Promise<void> {}
}
