import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { SystemTaskClass } from './system-task';

@Service()
export class SystemTaskMetadata {
	private readonly taskClasses: SystemTaskClass[] = [];

	private onRegister?: (taskClass: SystemTaskClass) => void;

	register(taskClass: SystemTaskClass) {
		this.taskClasses.push(taskClass);
		this.onRegister?.(taskClass);
	}

	getClasses() {
		return [...this.taskClasses];
	}

	/**
	 * Subscribe to task registrations. Immediately replays every task class
	 * registered so far, then notifies the listener on each subsequent
	 * registration. This lets the listener be wired regardless of when the
	 * decorated class's module is loaded.
	 */
	subscribe(listener: (taskClass: SystemTaskClass) => void) {
		if (this.onRegister) {
			throw new UnexpectedError('A listener is already subscribed to system task registrations');
		}

		this.onRegister = listener;
		for (const taskClass of this.taskClasses) {
			listener(taskClass);
		}
	}
}
