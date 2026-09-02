import {
	FileNotFoundError,
	InvalidPathError,
	TextEditorDocument,
} from 'src/utils/workflow-text-editor';

describe('text editor compatibility exports', () => {
	it('keeps the ai-utilities InvalidPathError default supported path', () => {
		const error = new InvalidPathError('/tmp/workflow.js');

		expect(error.message).toBe('Invalid path "/tmp/workflow.js". Only /workflow.js is supported.');
	});

	it('keeps the ai-utilities FileNotFoundError default message', () => {
		const error = new FileNotFoundError();

		expect(error.message).toBe('No workflow code exists yet. Use create first.');
	});

	it('keeps TextEditorDocument missing-file errors workflow-specific', () => {
		const editor = new TextEditorDocument();

		expect(() => editor.execute({ command: 'view', path: '/workflow.js' })).toThrow(
			FileNotFoundError,
		);
		expect(() => editor.execute({ command: 'view', path: '/workflow.js' })).toThrow(
			'No workflow code exists yet. Use create first.',
		);
	});

	it('keeps TextEditorDocument path errors workflow-specific', () => {
		const editor = new TextEditorDocument({ supportedPath: '/workflow.js' });

		expect(() => editor.execute({ command: 'view', path: '/tmp/workflow.js' })).toThrow(
			InvalidPathError,
		);
	});
});
