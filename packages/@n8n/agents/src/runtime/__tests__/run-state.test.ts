import type { SerializableAgentState } from '../../types';
import { RunStateManager, StaleResumeError } from '../state/run-state';

function makeState(status: 'suspended' | 'running'): SerializableAgentState {
	return { status } as SerializableAgentState;
}

describe('RunStateManager', () => {
	it('resumes a suspended run and claims it exactly once', async () => {
		const manager = new RunStateManager();
		await manager.suspend('run-1', makeState('suspended'));

		const state = await manager.resume('run-1');
		expect(state?.status).toBe('suspended');

		expect(await manager.claimResume('run-1', state!)).toBe(true);
	});

	it('loses the claim when the stored state was already claimed', async () => {
		const manager = new RunStateManager();
		await manager.suspend('run-1', makeState('suspended'));
		const state = await manager.resume('run-1');

		expect(await manager.claimResume('run-1', state!)).toBe(true);
		// Second claim with the same loaded state: the store already moved on.
		expect(await manager.claimResume('run-1', state!)).toBe(false);
	});

	it('throws a warning-level StaleResumeError when the run is not suspended', async () => {
		const manager = new RunStateManager();
		await manager.checkpointStep('run-1', makeState('running'));

		const thrown = await manager.resume('run-1').catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(StaleResumeError);
		expect((thrown as StaleResumeError).name).toBe('StaleResumeError');
		expect((thrown as StaleResumeError).level).toBe('warning');
	});
});
