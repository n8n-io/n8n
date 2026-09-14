import { Service } from '@n8n/di';

import { ReplayableRegistry } from '../replayable-registry';
import type { SystemTaskClass } from './system-task';

@Service()
export class SystemTaskMetadata extends ReplayableRegistry<SystemTaskClass> {
	constructor() {
		super('system task', (taskClass) => taskClass.name);
	}

	getClasses() {
		return this.getEntries();
	}
}
