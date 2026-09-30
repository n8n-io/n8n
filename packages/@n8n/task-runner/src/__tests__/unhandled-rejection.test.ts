import { onUnhandledRejection } from '../unhandled-rejection';

const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing. Reason: ';
const FALLBACK_TEXT =
	'Unhandled promise rejection in task runner, continuing. Reason could not be described';

describe('onUnhandledRejection', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should log the fallback text when the reason cannot be described', () => {
		const reason = new Proxy(
			{},
			{
				get() {
					throw new Error('get trap');
				},
			},
		);

		expect(() => onUnhandledRejection(reason)).not.toThrow();
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(FALLBACK_TEXT));
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('should log one warning with the described reason and keep the process running', () => {
		onUnhandledRejection(new Error('boom'));

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`${LOG_PREFIX}Error\n`));
		expect(warnSpy).toHaveBeenCalledWith(expect.not.stringContaining('boom'));
		expect(exitSpy).not.toHaveBeenCalled();
	});
});
