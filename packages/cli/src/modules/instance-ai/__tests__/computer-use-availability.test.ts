import { resolveConnectableComputerUseChannels } from '../computer-use-availability';

const adminDefaults = {
	localGatewayDisabledGlobally: false,
	browserUseEnabledGlobally: true,
};

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
