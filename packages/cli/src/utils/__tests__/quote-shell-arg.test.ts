import { quoteShellArg } from '../quote-shell-arg';

describe('quoteShellArg', () => {
	it('should wrap a plain value in single quotes', () => {
		expect(quoteShellArg('plain-value')).toBe("'plain-value'");
	});

	it('should escape one single quote', () => {
		expect(quoteShellArg("o'clock")).toBe("'o'\"'\"'clock'");
	});

	it('should escape several single quotes', () => {
		expect(quoteShellArg("'; rm -rf /; echo '")).toBe("''\"'\"'; rm -rf /; echo '\"'\"''");
	});
});
