import type { EngineLogger } from '../logging';
import type { Detector, Finding, Repairs } from './reconciliation.types';

type RepairOutcome = 'repaired' | 'unchanged' | 'failed';

/**
 * Finds the rows that a failure left in a stuck state, and repairs them.
 *
 * The sweeper owns the timers. It runs each detector at the interval of that
 * detector, and it passes each finding to the repair of its kind. It reads only
 * the kind of a finding, so it has no knowledge of executions or steps.
 *
 * The passes of one detector do not overlap: the sweeper sets the next timer
 * after the current pass ends. An error in one finding or in one detector is
 * logged, and the other findings and detectors continue.
 */
export class ReconciliationSweeper {
	private readonly timers = new Map<Detector, NodeJS.Timeout>();
	/** The passes in progress, so `stop` can wait for them. */
	private readonly passes = new Set<Promise<void>>();
	private stopped = true;

	constructor(
		private readonly detectors: readonly Detector[],
		private readonly repairs: Repairs,
		private readonly logger: EngineLogger,
	) {}

	start(): void {
		this.stopped = false;
		this.detectors.forEach((detector) => this.schedule(detector));
	}

	/** Clears the timers and waits for the passes in progress. */
	async stop(): Promise<void> {
		this.stopped = true;
		this.timers.forEach((timer) => clearTimeout(timer));
		this.timers.clear();
		await Promise.all(this.passes);
	}

	private schedule(detector: Detector): void {
		if (this.stopped) return;
		const timer = setTimeout(() => {
			const pass = this.runPass(detector).finally(() => {
				this.passes.delete(pass);
				this.schedule(detector);
			});
			this.passes.add(pass);
		}, detector.intervalMs);
		// The timer must not keep the process alive.
		timer.unref();
		this.timers.set(detector, timer);
	}

	/** Never rejects: a rejected pass would stop the timer chain of its detector. */
	private async runPass(detector: Detector): Promise<void> {
		const at = new Date();
		try {
			const findings = await detector.detect(at);
			if (findings.length === 0) return;

			const counts: Record<RepairOutcome, number> = { repaired: 0, unchanged: 0, failed: 0 };
			for (const finding of findings) {
				// The queues stop after the sweeper, so a repair after `stop` could publish too late.
				if (this.stopped) break;
				counts[await this.repair(finding, at)] += 1;
			}
			this.logger.info('Reconciliation pass repaired stuck rows', {
				detector: detector.name,
				found: findings.length,
				...counts,
			});
		} catch (error) {
			this.logger.error('Reconciliation pass failed', { detector: detector.name, error });
		}
	}

	private async repair<K extends Finding['kind']>(
		finding: Extract<Finding, { kind: K }>,
		at: Date,
	): Promise<RepairOutcome> {
		try {
			const repair = this.repairs[finding.kind];
			if (repair === undefined) {
				this.logger.error('Reconciliation finding has no repair', { finding });
				return 'failed';
			}
			return (await repair.apply(finding, at)) ? 'repaired' : 'unchanged';
		} catch (error) {
			this.logger.error('Reconciliation repair failed', { finding, error });
			return 'failed';
		}
	}
}
