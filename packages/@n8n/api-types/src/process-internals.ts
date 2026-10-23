/**
 * Counts of a process's in-memory state, served by the test-only
 * `GET /rest/e2e/internals` route on mains, workers, and webhook processes.
 *
 * Counts only, never contents. Tests diff two readings to find state that
 * grows without bound, for example a map that never evicts entries.
 */
export interface ProcessInternals {
	/** Bumped when a field is renamed or removed. Adding a field is not a breaking change. */
	version: 1;
	instanceType: 'main' | 'worker' | 'webhook' | 'engine';
	hostId: string;
	/** Changes on process restart, including restarts with the same container hostname. */
	processStartId: string;
	isLeader: boolean;
	/** `process.memoryUsage()`, in bytes. */
	memory: {
		rss: number;
		heapTotal: number;
		heapUsed: number;
		external: number;
		arrayBuffers: number;
	};
	/** Live libuv resources by type, e.g. `{ Timeout: 12, TCPSocketWrap: 4 }`. */
	resources: Record<string, number>;
	/**
	 * Sizes of known in-memory collections, keyed `<owner>.<collection>`,
	 * e.g. `scaling.jobResults`. A key is absent when its owner does not run
	 * in this process.
	 */
	collections: Record<string, number>;
}
