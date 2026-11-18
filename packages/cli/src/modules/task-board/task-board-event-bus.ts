import { Logger, TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { TaskBoardEvent } from 'n8n-workflow';

type TaskBoardEventMap = {
	event: TaskBoardEvent;
};

/**
 * In-process bus for task events. Task Board Trigger nodes subscribe to it through the proxy,
 * so events reach only the main instance that wrote the task.
 */
@Service()
export class TaskBoardEventBus extends TypedEmitter<TaskBoardEventMap> {
	constructor(private readonly logger: Logger) {
		super();
		this.logger = this.logger.scoped('task-board');
		// Each active Task Board Trigger adds a listener.
		this.setMaxListeners(0);
	}

	publish(event: TaskBoardEvent) {
		this.emit('event', event);
	}

	/**
	 * Returns a function that removes the listener. A listener that throws does not fail the
	 * write that published the event.
	 */
	subscribe(listener: (event: TaskBoardEvent) => void) {
		const safeListener = (event: TaskBoardEvent) => {
			try {
				listener(event);
			} catch (error) {
				this.logger.error('A task board event listener failed', { error, event: event.event });
			}
		};
		this.on('event', safeListener);
		return () => {
			this.off('event', safeListener);
		};
	}
}
