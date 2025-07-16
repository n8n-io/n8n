import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { HIGHEST_SHUTDOWN_PRIORITY, LOWEST_SHUTDOWN_PRIORITY } from './constants';
import type { ShutdownHandler } from './types';

@Service()
export class ShutdownMetadata {
	private handlersByPriority: ShutdownHandler[][] = [];

	register(priority: number, handler: ShutdownHandler) {
		if (priority < LOWEST_SHUTDOWN_PRIORITY || priority > HIGHEST_SHUTDOWN_PRIORITY) {
			throw new UserError(
				`Invalid shutdown priority. Please set it between ${LOWEST_SHUTDOWN_PRIORITY} and ${HIGHEST_SHUTDOWN_PRIORITY}.`,
				{ extra: { priority } },
			);
		}

		if (!this.handlersByPriority[priority]) this.handlersByPriority[priority] = [];

		this.handlersByPriority[priority].push(handler);
	}

	getHandlersByPriority(): ShutdownHandler[][] {
		return this.handlersByPriority;
	}

	clear() {
		this.handlersByPriority = [];
	}
}
