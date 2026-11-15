import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import {
	getContainerLimit,
	getOldGenerationLimit,
	readMemoryUsage,
} from '@/memory-guard/memory-usage';

/**
 * Tells whether the memory of this main is too high to take more agent work.
 *
 * A main also serves the UI and webhooks, and usually has a fixed memory
 * limit. Above `N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL` it starts no agent turn and
 * opens no live chat stream, so that agent load cannot end the process.
 */
@Service()
export class AgentMainMemory {
	/** How long one memory reading stays valid. Many checks run at once after a scan. */
	static readonly READ_TTL_MS = 1_000;

	private limits?: { container: number | undefined; oldGeneration: number };

	private reading?: { at: number; high: boolean };

	constructor(private readonly agentsConfig: AgentsConfig) {}

	/** True when memory use is at or above the hold level. A level of 1 turns the check off. */
	isHigh(): boolean {
		const level = this.agentsConfig.mainMemoryHoldLevel;
		if (level >= 1) return false;
		const now = Date.now();
		if (this.reading && now - this.reading.at < AgentMainMemory.READ_TTL_MS) {
			return this.reading.high;
		}
		if (!this.limits) {
			const container = getContainerLimit();
			this.limits = { container, oldGeneration: getOldGenerationLimit(container) };
		}
		const { utilization } = readMemoryUsage(this.limits.container, this.limits.oldGeneration);
		this.reading = { at: now, high: utilization >= level };
		return this.reading.high;
	}
}
