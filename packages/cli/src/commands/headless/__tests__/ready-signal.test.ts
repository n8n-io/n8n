import { signalReady } from '../ready-signal';

describe('signalReady', () => {
	let writeSpy: jest.SpyInstance;

	beforeEach(() => {
		writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	it('writes exactly one line `headless: ready` to stdout', () => {
		signalReady();

		expect(writeSpy).toHaveBeenCalledTimes(1);
		expect(writeSpy).toHaveBeenCalledWith('headless: ready\n');
	});

	it('emits a fresh line every time it is invoked', () => {
		signalReady();
		signalReady();

		expect(writeSpy).toHaveBeenCalledTimes(2);
		expect(writeSpy).toHaveBeenNthCalledWith(1, 'headless: ready\n');
		expect(writeSpy).toHaveBeenNthCalledWith(2, 'headless: ready\n');
	});
});
