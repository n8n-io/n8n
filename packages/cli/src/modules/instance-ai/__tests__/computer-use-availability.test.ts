import { enabledToolCategories, resolveComputerUseState } from '../computer-use-availability';

const adminAllowsBoth = {
	localGatewayDisabledGlobally: false,
	localGatewayDisabledForUser: false,
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

const nothingConnected = {
	localComputerToolCategories: undefined,
	browserConnected: false,
};

describe('resolveComputerUseState', () => {
	describe('when neither rollout covers the user', () => {
		it('reports both channels unavailable, even on an instance with admin defaults', () => {
			expect(
				resolveComputerUseState({ ...adminAllowsBoth, ...rolloutsOff, ...nothingConnected }),
			).toEqual({
				localComputer: { status: 'unavailable' },
				browser: { status: 'unavailable' },
			});
		});
	});

	describe('when both rollouts cover the user', () => {
		it('reports both channels disconnected while nothing is paired', () => {
			expect(
				resolveComputerUseState({ ...adminAllowsBoth, ...rolloutsOn, ...nothingConnected }),
			).toEqual({
				localComputer: { status: 'disconnected' },
				browser: { status: 'disconnected' },
			});
		});
	});

	describe('the local-computer channel', () => {
		it('is unavailable when the admin disabled the local gateway', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				localGatewayDisabledGlobally: true,
				localGatewayDisabledForUser: true,
				...rolloutsOn,
				...nothingConnected,
			});

			expect(state.localComputer).toEqual({ status: 'unavailable' });
			expect(state.browser).toEqual({ status: 'disconnected' });
		});

		it('is disabledByUser when the user turned it off but the admin allows it', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				localGatewayDisabledForUser: true,
				...rolloutsOn,
				...nothingConnected,
			});

			expect(state.localComputer).toEqual({ status: 'disabledByUser' });
		});

		it('carries the tool categories the connected daemon serves', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				...rolloutsOn,
				localComputerToolCategories: ['filesystem', 'shell'],
				browserConnected: false,
			});

			expect(state.localComputer).toEqual({
				status: 'connected',
				toolCategories: ['filesystem', 'shell'],
			});
		});

		it('stays unavailable when connected but the rollout does not cover the user', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				...rolloutsOff,
				localComputerToolCategories: ['filesystem'],
				browserConnected: false,
			});

			expect(state.localComputer).toEqual({ status: 'unavailable' });
		});
	});

	describe('the browser channel', () => {
		it('is unavailable when the admin disabled browser-use', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				browserUseEnabledGlobally: false,
				...rolloutsOn,
				...nothingConnected,
			});

			expect(state.browser).toEqual({ status: 'unavailable' });
			expect(state.localComputer).toEqual({ status: 'disconnected' });
		});

		it('serves the browser tool category when the extension session is live', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				...rolloutsOn,
				localComputerToolCategories: undefined,
				browserConnected: true,
			});

			expect(state.browser).toEqual({ status: 'connected', toolCategories: ['browser'] });
		});
	});

	describe('the two channels are independent', () => {
		it('reports a live browser session while the local computer is only connectable', () => {
			expect(
				resolveComputerUseState({
					...adminAllowsBoth,
					...rolloutsOn,
					localComputerToolCategories: undefined,
					browserConnected: true,
				}),
			).toEqual({
				localComputer: { status: 'disconnected' },
				browser: { status: 'connected', toolCategories: ['browser'] },
			});
		});

		it('reports a live daemon while the browser channel is unavailable', () => {
			expect(
				resolveComputerUseState({
					...adminAllowsBoth,
					browserUseEnabledGlobally: false,
					...rolloutsOn,
					localComputerToolCategories: ['filesystem', 'shell'],
					browserConnected: false,
				}),
			).toEqual({
				localComputer: { status: 'connected', toolCategories: ['filesystem', 'shell'] },
				browser: { status: 'unavailable' },
			});
		});
	});
});

describe('enabledToolCategories', () => {
	it('keeps the categories the daemon reports as enabled', () => {
		expect(
			enabledToolCategories([
				{ name: 'filesystem', enabled: true },
				{ name: 'shell', enabled: true },
			]),
		).toEqual(['filesystem', 'shell']);
	});

	it('drops a category the daemon disabled', () => {
		expect(
			enabledToolCategories([
				{ name: 'filesystem', enabled: true },
				{ name: 'browser', enabled: false },
			]),
		).toEqual(['filesystem']);
	});
});
