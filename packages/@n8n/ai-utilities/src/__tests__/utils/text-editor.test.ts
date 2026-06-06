import { FileNotFoundError, InvalidPathError } from 'src/utils/text-editor';

describe('text editor compatibility exports', () => {
	it('keeps the ai-utilities InvalidPathError default supported path', () => {
		const error = new InvalidPathError('/tmp/workflow.js');

		expect(error.message).toBe('Invalid path "/tmp/workflow.js". Only /workflow.js is supported.');
	});

	it('keeps the ai-utilities FileNotFoundError default message', () => {
		const error = new FileNotFoundError();

		expect(error.message).toBe('No workflow code exists yet. Use create first.');
	});
});
