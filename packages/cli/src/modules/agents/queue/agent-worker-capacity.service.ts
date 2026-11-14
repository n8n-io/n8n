import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

/**
 * Counts the agent work that runs on this process against
 * `N8N_AGENTS_WORKER_CONCURRENCY`.
 *
 * Bull already caps the jobs that run at once. Background sub-agents do not
 * come from jobs: a turn starts them and they outlive it. When they use
 * capacity, the turn queue stops pulling jobs here until a slot is free.
 */
@Service()
export class AgentWorkerCapacity {
	private jobs = 0;

	private backgroundRuns = 0;

	private holding = false;

	private listener?: (hold: boolean) => void;

	constructor(private readonly agentsConfig: AgentsConfig) {}

	get limit(): number {
		return this.agentsConfig.workerConcurrency;
	}

	get inUse(): number {
		return this.jobs + this.backgroundRuns;
	}

	get activeJobs(): number {
		return this.jobs;
	}

	get activeBackgroundRuns(): number {
		return this.backgroundRuns;
	}

	/** Whether this process must stop pulling jobs to keep within the limit. */
	get shouldHold(): boolean {
		return this.backgroundRuns > 0 && this.inUse >= this.limit;
	}

	/** Called each time `shouldHold` changes. */
	onHoldChange(listener: (hold: boolean) => void): void {
		this.listener = listener;
	}

	jobStarted(): void {
		this.jobs++;
		this.update();
	}

	jobFinished(): void {
		this.jobs = Math.max(0, this.jobs - 1);
		this.update();
	}

	setBackgroundRuns(count: number): void {
		this.backgroundRuns = count;
		this.update();
	}

	private update(): void {
		const hold = this.shouldHold;
		if (hold === this.holding) return;
		this.holding = hold;
		this.listener?.(hold);
	}
}
