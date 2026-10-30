import { buildResumeTraceInput } from '../resume-trace-input';

describe('buildResumeTraceInput', () => {
	it('records the values that the user typed or chose', () => {
		const answers = [{ questionId: 'q-1', selectedOptions: ['Slack'] }];
		const resourceDecision = 'allowForSession';

		expect(
			buildResumeTraceInput({
				approved: true,
				userInput: 'Post it to #general',
				action: 'apply',
				resourceDecision,
				answers,
			}),
		).toEqual({
			resumeFields: ['approved', 'userInput', 'action', 'resourceDecision', 'answers'],
			approved: true,
			userInput: 'Post it to #general',
			action: 'apply',
			resourceDecision,
			answers,
		});
	});

	it('records setup fields by name only', () => {
		expect(
			buildResumeTraceInput({
				approved: true,
				credentials: { slackApi: 'cred-1' },
				nodeParameters: { Slack: { channel: '#private' } },
			}),
		).toEqual({ resumeFields: ['approved', 'credentials', 'nodeParameters'], approved: true });
	});

	it('leaves out an empty text answer', () => {
		expect(buildResumeTraceInput({ approved: false, userInput: '' })).toEqual({
			resumeFields: ['approved', 'userInput'],
			approved: false,
		});
	});

	it('records nothing for resume data that is not an object', () => {
		expect(buildResumeTraceInput('approved')).toEqual({});
		expect(buildResumeTraceInput(undefined)).toEqual({});
	});
});
