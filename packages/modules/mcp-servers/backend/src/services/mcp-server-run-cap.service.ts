import { Service } from '@n8n/di';

import { McpServersConfig } from '../mcp-servers.config';

/** Frees the slot. A second call does nothing. */
export type ReleaseRunSlot = () => void;

/**
 * Limits the tool runs in flight for each server, in this main process. Workflow runs in the
 * mode `integrated` skip the instance concurrency queue, so one busy server could otherwise
 * take every worker slot.
 */
@Service()
export class McpServerRunCap {
	private readonly inFlight = new Map<string, number>();

	constructor(private readonly config: McpServersConfig) {}

	/** Takes a slot for one run of the server, or returns `null` when the server is full. */
	tryAcquire(serverId: string): ReleaseRunSlot | null {
		const max = this.config.maxConcurrentRuns;
		const count = this.inFlight.get(serverId) ?? 0;
		if (max > 0 && count >= max) return null;

		this.inFlight.set(serverId, count + 1);
		let released = false;
		return () => {
			if (released) return;
			released = true;
			const left = (this.inFlight.get(serverId) ?? 1) - 1;
			if (left > 0) this.inFlight.set(serverId, left);
			else this.inFlight.delete(serverId);
		};
	}
}
