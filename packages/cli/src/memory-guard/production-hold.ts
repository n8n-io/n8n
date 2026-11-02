import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { isProductionMode } from './memory-guard.utils';

interface HeldExecution {
	executionId: string;
	heldAt: number;
	admit: () => void;
}

/**
 * Production executions that wait because memory is high. The memory guard starts and
 * ends the hold. Concurrency control makes executions wait here, so this must depend on
 * nothing that depends on concurrency control.
 */
@Service()
export class ProductionHold {
	private holding = false;

	/** Oldest first. */
	private readonly held: HeldExecution[] = [];

	constructor(private readonly eventService: EventService) {}

	/** Make new production executions wait until the hold ends and `admit()` lets them start. */
	start() {
		this.holding = true;
	}

	/** Stop holding new production executions. Executions held so far wait for `admit()`. */
	end() {
		this.holding = false;
	}

	/** New arrivals also wait while executions from an ended hold still wait. */
	shouldHold(mode: WorkflowExecuteMode) {
		return isProductionMode(mode) && (this.holding || this.held.length > 0);
	}

	/** Resolves when `admit()` lets the execution start. */
	async wait(executionId: string) {
		this.eventService.emit('memory-guard-execution-held', { executionId });
		await new Promise<void>((admit) => {
			this.held.push({ executionId, heldAt: Date.now(), admit });
		});
	}

	/** Let up to `count` held executions start, oldest first. Returns how many started. */
	admit(count: number) {
		let started = 0;
		while (started < count) {
			const item = this.held.shift();
			if (!item) break;
			item.admit();
			this.release(item, true);
			started++;
		}
		return started;
	}

	/** Like the concurrency queue, never resume a removed execution. Returns whether it was held. */
	remove(executionId: string) {
		const index = this.held.findIndex((item) => item.executionId === executionId);
		if (index === -1) return false;
		const [item] = this.held.splice(index, 1);
		this.release(item, false);
		return true;
	}

	/** Report how long the execution waited, and whether it starts or was cancelled. */
	private release({ executionId, heldAt }: HeldExecution, started: boolean) {
		this.eventService.emit('memory-guard-execution-released', {
			executionId,
			waitedMs: Date.now() - heldAt,
			started,
		});
	}

	has(executionId: string) {
		return this.held.some((item) => item.executionId === executionId);
	}

	get heldCount() {
		return this.held.length;
	}

	/** When the oldest held execution started to wait, or `undefined` if none waits. */
	get oldestHeldAt(): number | undefined {
		return this.held[0]?.heldAt;
	}
}
