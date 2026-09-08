import { resolveConnectableComputerUseChannels } from '../computer-use-availability';

/** Admin defaults: gateway not disabled, browser-use on (see instance-ai.config.ts). */
const adminDefaults = {
	localGatewayDisabledGlobally: false,
	browserUseEnabledGlobally: true,
};

/** Both rollouts off — what PostHog returns when it is unreachable or the user is not enrolled. */
const rolloutsOff = {
	computerUseExperimentEnabled: false,
	browserUseExperimentEnabled: false,
};

const rolloutsOn = {
	computerUseExperimentEnabled: true,
	browserUseExperimentEnabled: true,
};

describe('resolveConnectableComputerUseChannels', () => {
	describe('when neither rollout is enabled for the user', () => {
		it('reports no connectable channels, even on an instance with admin defaults', () => {
			// The regression this guards (INS-1293): the client hides both + menu entries
			// unless the rollout says otherwise, so with the rollouts off there is nothing
			// for the agent to point the user at.
			expect(resolveConnectableComputerUseChannels({ ...adminDefaults, ...rolloutsOff })).toEqual(
				[],
			);
		});
	});

	describe('when both rollouts are enabled for the user', () => {
		it('reports both channels on an instance with admin defaults', () => {
			expect(resolveConnectableComputerUseChannels({ ...adminDefaults, ...rolloutsOn })).toEqual([
				'localComputer',
				'browser',
			]);
		});
	});

	describe('the local-computer channel', () => {
		it('is connectable when its rollout is on and the admin has not disabled the gateway', () => {
			expect(
				resolveConnectableComputerUseChannels({
					...adminDefaults,
					computerUseExperimentEnabled: true,
					browserUseExperimentEnabled: false,
				}),
			).toEqual(['localComputer']);
		});

		it('is not connectable when the admin disabled the local gateway', () => {
			expect(
				resolveConnectableComputerUseChannels({
					...adminDefaults,
					localGatewayDisabledGlobally: true,
					...rolloutsOn,
				}),
			).toEqual(['browser']);
		});
	});

	describe('the browser channel', () => {
		it('is connectable when its rollout is on and the admin enabled browser-use', () => {
			expect(
				resolveConnectableComputerUseChannels({
					...adminDefaults,
					computerUseExperimentEnabled: false,
					browserUseExperimentEnabled: true,
				}),
			).toEqual(['browser']);
		});

		it('is not connectable when the admin disabled browser-use', () => {
			expect(
				resolveConnectableComputerUseChannels({
					...adminDefaults,
					browserUseEnabledGlobally: false,
					...rolloutsOn,
				}),
			).toEqual(['localComputer']);
		});
	});
});
