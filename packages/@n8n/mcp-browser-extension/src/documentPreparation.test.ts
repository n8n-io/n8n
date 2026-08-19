import { DocumentPreparation, OPT_OUT_SCRIPT } from './documentPreparation';

const { warn, debug } = vi.hoisted(() => ({ warn: vi.fn(), debug: vi.fn() }));

vi.mock('./logger', () => ({
	createLogger: () => ({ warn, debug, info: vi.fn(), error: vi.fn() }),
}));

const sendCommand = vi.fn();

beforeEach(() => {
	sendCommand.mockReset().mockResolvedValue({});
	warn.mockReset();
	debug.mockReset();
	vi.stubGlobal('chrome', { debugger: { sendCommand } });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function callsTo(method: string) {
	return sendCommand.mock.calls.filter((call) => call[1] === method);
}

describe('DocumentPreparation.applyToTab', () => {
	it('registers the script for every document the tab opens from now on', async () => {
		await new DocumentPreparation().applyToTab(7);

		expect(sendCommand).toHaveBeenCalledWith(
			{ tabId: 7 },
			'Page.addScriptToEvaluateOnNewDocument',
			{ source: OPT_OUT_SCRIPT },
		);
	});

	it('marks the document that already exists', async () => {
		await new DocumentPreparation().applyToTab(7);

		expect(sendCommand).toHaveBeenCalledWith(
			{ tabId: 7 },
			'Runtime.evaluate',
			expect.objectContaining({ expression: OPT_OUT_SCRIPT }),
		);
	});

	it('does not touch the Runtime domain state the client owns', async () => {
		await new DocumentPreparation().applyToTab(7);

		// A second Runtime.enable reports no contexts, which would starve the client's own wait.
		expect(callsTo('Runtime.enable')).toHaveLength(0);
		expect(callsTo('Runtime.disable')).toHaveLength(0);
	});

	it('still marks the current document when registration fails', async () => {
		sendCommand.mockImplementation(async (_d: unknown, method: string) => {
			if (method === 'Page.addScriptToEvaluateOnNewDocument') throw new Error('detached');
			return await Promise.resolve({});
		});

		await new DocumentPreparation().applyToTab(7);

		expect(callsTo('Runtime.evaluate')).toHaveLength(1);
	});

	it('does not reject when the tab is gone', async () => {
		sendCommand.mockRejectedValue(new Error('No tab with given id'));

		await expect(new DocumentPreparation().applyToTab(7)).resolves.toBeUndefined();
	});

	it('gives up on a renderer that never answers, so attach is not held up', async () => {
		vi.useFakeTimers();
		try {
			sendCommand.mockImplementation(async (_d: unknown, method: string) =>
				method === 'Runtime.evaluate' ? await new Promise(() => {}) : await Promise.resolve({}),
			);

			const applied = new DocumentPreparation().applyToTab(7);
			await vi.advanceTimersByTimeAsync(10_000);

			await expect(applied).resolves.toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it('reports a page that rejected the script instead of swallowing it', async () => {
		sendCommand.mockImplementation(async (_d: unknown, method: string) =>
			method === 'Runtime.evaluate'
				? await Promise.resolve({ exceptionDetails: { text: 'blocked by policy' } })
				: await Promise.resolve({}),
		);

		await new DocumentPreparation().applyToTab(7);

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('rejected'), 'blocked by policy');
	});

	it('keeps an expected race quiet', async () => {
		sendCommand.mockRejectedValue(new Error('No tab with given id'));

		await new DocumentPreparation().applyToTab(7);

		expect(warn).not.toHaveBeenCalled();
		expect(debug).toHaveBeenCalled();
	});
});
