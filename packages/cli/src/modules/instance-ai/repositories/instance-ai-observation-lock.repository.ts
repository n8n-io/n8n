import { Service } from '@n8n/di';
import { DataSource, MoreThan, Repository } from '@n8n/typeorm';

import { InstanceAiObservationLock } from '../entities/instance-ai-observation-lock.entity';

@Service()
export class InstanceAiObservationLockRepository extends Repository<InstanceAiObservationLock> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservationLock, dataSource.manager);
	}

	async hasActiveLocks(observationScopeId: string, now: Date = new Date()): Promise<boolean> {
		const count = await this.countBy({
			observationScopeId,
			heldUntil: MoreThan(now),
		});

		return count > 0;
	}
}
