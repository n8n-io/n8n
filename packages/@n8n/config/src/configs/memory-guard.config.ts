import { Config, Env } from '../decorators';

@Config
export class MemoryGuardConfig {
	/**
	 * Whether to shed load under memory pressure: hold back new executions when
	 * memory nears its limit, and cancel the running execution retaining the most
	 * data when memory is about to run out. Regular mode only.
	 */
	@Env('N8N_MEMORY_GUARD_ENABLED')
	enabled: boolean = false;

	/** Share of available memory (0-1) above which new production executions are held back. */
	@Env('N8N_MEMORY_GUARD_HOLD_THRESHOLD')
	holdThreshold: number = 0.8;

	/**
	 * Share of available memory (0-1) above which the guard kills a running
	 * execution.
	 *
	 * Must sit well below 1.0, because a process never reaches 100% of its
	 * memory limit before dying. It dies earlier, in practice around 90%, for
	 * two reasons: V8 aborts as soon as memory in use plus the next single
	 * allocation would cross the limit, and near the limit GC consumes almost
	 * all CPU, so the guard may not get another chance to act. The threshold
	 * needs enough headroom for the guard to run and for the cancelled
	 * execution's in-flight work to wind down.
	 */
	@Env('N8N_MEMORY_GUARD_KILL_THRESHOLD')
	killThreshold: number = 0.85;

	/** How often (ms) to sample memory when calm. Sampling speeds up under pressure. */
	@Env('N8N_MEMORY_GUARD_INTERVAL_MS')
	intervalMs: number = 2000;

	/**
	 * Cancellations of the same workflow's executions before the workflow is
	 * deactivated. `0` disables auto-deactivation.
	 */
	@Env('N8N_MEMORY_GUARD_DEACTIVATE_AFTER_KILLS')
	deactivateAfterKills: number = 3;
}
