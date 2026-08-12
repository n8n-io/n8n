import { LineAssembler } from '../line-assembler';

describe('LineAssembler', () => {
	let lines: string[];
	let onLine: (line: string) => void;

	beforeEach(() => {
		vi.useFakeTimers();
		lines = [];
		onLine = (line) => lines.push(line);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('splits a multi-line chunk', () => {
		const assembler = new LineAssembler({ onLine });

		assembler.push('one\ntwo\nthree\n');

		expect(lines).toEqual(['one', 'two', 'three']);
	});

	it('reassembles a line delivered as several chunks', () => {
		const assembler = new LineAssembler({ onLine });

		assembler.push('hel');
		assembler.push('lo wo');
		expect(lines).toEqual([]);

		assembler.push('rld\n');
		expect(lines).toEqual(['hello world']);
	});

	it('holds a partial tail back until the flush timer fires', () => {
		const assembler = new LineAssembler({ onLine, flushDelayMs: 50 });

		assembler.push('no newline yet');
		expect(lines).toEqual([]);

		vi.advanceTimersByTime(49);
		expect(lines).toEqual([]);

		vi.advanceTimersByTime(1);
		expect(lines).toEqual(['no newline yet']);
	});

	it('does not re-arm the timer once everything has been emitted', () => {
		const assembler = new LineAssembler({ onLine, flushDelayMs: 50 });

		assembler.push('complete\n');
		vi.advanceTimersByTime(1000);

		expect(lines).toEqual(['complete']);
	});

	it('keeps buffering while chunks keep arriving before the timer', () => {
		const assembler = new LineAssembler({ onLine, flushDelayMs: 50 });

		assembler.push('a');
		vi.advanceTimersByTime(30);
		assembler.push('b');
		vi.advanceTimersByTime(30);

		// The timer is armed once and not reset per chunk, so both chunks land together.
		expect(lines).toEqual(['ab']);
	});

	it('strips a trailing carriage return', () => {
		const assembler = new LineAssembler({ onLine });

		assembler.push('windows\r\nunix\n');

		expect(lines).toEqual(['windows', 'unix']);
	});

	it('drops blank lines', () => {
		const assembler = new LineAssembler({ onLine });

		assembler.push('one\n\n\ntwo\n');

		expect(lines).toEqual(['one', 'two']);
	});

	it('flushes a tail that outgrows the pending cap without waiting', () => {
		const assembler = new LineAssembler({ onLine, maxPendingChars: 8 });

		assembler.push('0123456789');

		expect(lines).toEqual(['0123456789']);
	});

	it('emits the pending tail on dispose', () => {
		const assembler = new LineAssembler({ onLine });

		assembler.push('partial');
		assembler.dispose();

		expect(lines).toEqual(['partial']);
	});

	it('ignores empty chunks', () => {
		const assembler = new LineAssembler({ onLine });

		assembler.push('');
		vi.advanceTimersByTime(1000);

		expect(lines).toEqual([]);
	});
});
