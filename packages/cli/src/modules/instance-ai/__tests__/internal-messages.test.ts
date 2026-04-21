import { cleanStoredUserMessage, AUTO_FOLLOW_UP_MESSAGE } from '../internal-messages';

describe('cleanStoredUserMessage', () => {
	it('returns plain text unchanged', () => {
		expect(cleanStoredUserMessage('Hello world')).toBe('Hello world');
	});

	it('strips <running-tasks> block from the beginning', () => {
		const stored =
			'<running-tasks>\n[task-1 builder running]\n</running-tasks>\n\nActual user message';
		expect(cleanStoredUserMessage(stored)).toBe('Actual user message');
	});

	it('strips <planned-task-follow-up> block', () => {
		const stored =
			'<planned-task-follow-up taskId="t1">\nfollow up details\n</planned-task-follow-up>\n\nContinue building';
		expect(cleanStoredUserMessage(stored)).toBe('Continue building');
	});

	it('strips <background-task-completed> block', () => {
		const stored =
			'<background-task-completed>\ntask-1 completed with result\n</background-task-completed>\n\nUser reply';
		expect(cleanStoredUserMessage(stored)).toBe('User reply');
	});

	it('returns null for auto-follow-up message', () => {
		expect(cleanStoredUserMessage(AUTO_FOLLOW_UP_MESSAGE)).toBeNull();
	});

	it('returns null for auto-follow-up after stripping task block', () => {
		const stored = `<running-tasks>\n[task info]\n</running-tasks>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
		expect(cleanStoredUserMessage(stored)).toBeNull();
	});

	it('does not strip task blocks that are not at the beginning', () => {
		const stored = 'Some text\n<running-tasks>\ntask\n</running-tasks>\n\nMore text';
		expect(cleanStoredUserMessage(stored)).toBe(stored);
	});
});
