import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiObservationCursor } from '../entities/instance-ai-observation-cursor.entity';

@Service()
export class InstanceAiObservationCursorRepository extends Repository<InstanceAiObservationCursor> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservationCursor, dataSource.manager);
	}

	/** Observational memory is thread-scoped, so the scope id is the thread id.
	 *  Null means the observer never ran for this thread. */
	async findForThread(threadId: string): Promise<InstanceAiObservationCursor | null> {
		return await this.findOneBy({ observationScopeId: threadId });
	}
}
