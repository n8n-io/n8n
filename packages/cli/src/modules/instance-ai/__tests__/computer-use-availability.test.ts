import { enabledToolCategories, resolveComputerUseState } from '../computer-use-availability';

const adminAllowsBoth = {
	localGatewayDisabledGlobally: false,
	localGatewayDisabledForUser: false,
	browserUseEnabledGlobally: true,
};

const nothingConnected = {
	localComputerToolCategories: undefined,
	browserConnected: false,
};

describe('resolveComputerUseState', () => {
	describe('when the client reported no channels', () => {
		it('reports both unavailable, so a client that stays silent advertises nothing', () => {
			expect(
				resolveComputerUseState({
					...adminAllowsBoth,
					clientChannels: [],
					...nothingConnected,
				}),
			).toEqual({
				localComputer: { status: 'unavailable' },
				browser: { status: 'unavailable' },
			});
		});

		it('reports both unavailable when the client sent nothing at all', () => {
			expect(
				resolveComputerUseState({
					...adminAllowsBoth,
					clientChannels: undefined,
					...nothingConnected,
				}),
			).toEqual({
				localComputer: { status: 'unavailable' },
				browser: { status: 'unavailable' },
			});
		});
	});

	describe('when the client reported both channels', () => {
		it('reports both disconnected while nothing is paired', () => {
			expect(
				resolveComputerUseState({
					...adminAllowsBoth,
					clientChannels: ['localComputer', 'browser'],
					...nothingConnected,
				}),
			).toEqual({
				localComputer: { status: 'disconnected' },
				browser: { status: 'disconnected' },
			});
		});
	});

	describe('the client can only narrow, never widen', () => {
		it('keeps the local computer unavailable when the admin disabled the gateway', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				localGatewayDisabledGlobally: true,
				localGatewayDisabledForUser: true,
				clientChannels: ['localComputer', 'browser'],
				...nothingConnected,
			});

			expect(state.localComputer).toEqual({ status: 'unavailable' });
			expect(state.browser).toEqual({ status: 'disconnected' });
		});

		it('keeps the browser unavailable when the admin disabled browser-use', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				browserUseEnabledGlobally: false,
				clientChannels: ['localComputer', 'browser'],
				...nothingConnected,
			});

			expect(state.browser).toEqual({ status: 'unavailable' });
			expect(state.localComputer).toEqual({ status: 'disconnected' });
		});

		it('does not advertise a channel the client left out, even with a live session', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				clientChannels: ['localComputer'],
				localComputerToolCategories: ['filesystem'],
				browserConnected: true,
			});

			expect(state.browser).toEqual({ status: 'unavailable' });
			expect(state.localComputer).toEqual({
				status: 'connected',
				toolCategories: ['filesystem'],
			});
		});
	});

	describe('the local-computer channel', () => {
		it('is disabledByUser when the user turned it off but the admin allows it', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				localGatewayDisabledForUser: true,
				clientChannels: ['localComputer', 'browser'],
				...nothingConnected,
			});

			expect(state.localComputer).toEqual({ status: 'disabledByUser' });
		});

		it('carries the tool categories the connected daemon serves', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				clientChannels: ['localComputer', 'browser'],
				localComputerToolCategories: ['filesystem', 'shell'],
				browserConnected: false,
			});

			expect(state.localComputer).toEqual({
				status: 'connected',
				toolCategories: ['filesystem', 'shell'],
			});
		});
	});

	describe('the browser channel', () => {
		it('serves the browser tool category when the extension session is live', () => {
			const state = resolveComputerUseState({
				...adminAllowsBoth,
				clientChannels: ['browser'],
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
					clientChannels: ['localComputer', 'browser'],
					localComputerToolCategories: undefined,
					browserConnected: true,
				}),
			).toEqual({
				localComputer: { status: 'disconnected' },
				browser: { status: 'connected', toolCategories: ['browser'] },
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
