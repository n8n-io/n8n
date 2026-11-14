import type { AgentsConfig } from '@n8n/config';

import { AgentWorkerCapacity } from '../queue/agent-worker-capacity.service';

describe('AgentWorkerCapacity', () => {
	function setup(workerConcurrency = 2) {
		const capacity = new AgentWorkerCapacity({ workerConcurrency } as AgentsConfig);
		const listener = vi.fn();
		capacity.onHoldChange(listener);
		return { capacity, listener };
	}

	it('does not hold when only jobs use the worker, because Bull caps them', () => {
		const { capacity, listener } = setup();
		capacity.jobStarted();
		capacity.jobStarted();
		expect(capacity.inUse).toBe(2);
		expect(capacity.shouldHold).toBe(false);
		expect(listener).not.toHaveBeenCalled();
	});

	it('holds when background runs and jobs reach the limit, and releases when a slot is free', () => {
		const { capacity, listener } = setup();
		capacity.jobStarted();
		capacity.setBackgroundRuns(1);
		expect(listener).toHaveBeenLastCalledWith(true);

		capacity.jobFinished();
		expect(listener).toHaveBeenLastCalledWith(false);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('tells the listener only when the hold state changes', () => {
		const { capacity, listener } = setup(1);
		capacity.setBackgroundRuns(1);
		capacity.setBackgroundRuns(2);
		capacity.setBackgroundRuns(3);
		expect(listener).toHaveBeenCalledOnce();

		capacity.setBackgroundRuns(0);
		expect(listener).toHaveBeenLastCalledWith(false);
	});

	it('never counts below zero jobs', () => {
		const { capacity } = setup();
		capacity.jobFinished();
		expect(capacity.activeJobs).toBe(0);
	});
});
