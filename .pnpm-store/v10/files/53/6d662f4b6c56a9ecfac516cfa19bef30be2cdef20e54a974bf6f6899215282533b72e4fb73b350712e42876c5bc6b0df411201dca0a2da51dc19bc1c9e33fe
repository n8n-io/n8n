declare const detectNewline: {
	/**
	Detect the dominant newline character of a string.

	@returns The detected newline or `undefined` when no newline character is found.

	@example
	```
	import detectNewline = require('detect-newline');

	detectNewline('foo\nbar\nbaz\r\n');
	//=> '\n'
	```
	*/
	(string: string): '\r\n' | '\n' | undefined;

	/**
	Detect the dominant newline character of a string.

	@returns The detected newline or `\n` when no newline character is found or the input is not a string.
	*/
	graceful(string: string): '\r\n' | '\n';
	graceful(string?: unknown): '\n';
};

export = detectNewline;
