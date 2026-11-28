import { RunAgentPublicDto } from '../dto';

describe('RunAgentPublicDto', () => {
	it('accepts a message and an optional session id', () => {
		expect(RunAgentPublicDto.parse({ message: ' Hello ' })).toEqual({ message: 'Hello' });
		expect(RunAgentPublicDto.parse({ message: 'Hello', sessionId: 'session-1' })).toEqual({
			message: 'Hello',
			sessionId: 'session-1',
		});
	});

	it('rejects an empty message, a blank session id, and unknown fields', () => {
		expect(RunAgentPublicDto.safeParse({ message: '   ' }).success).toBe(false);
		expect(RunAgentPublicDto.safeParse({ message: 'Hello', sessionId: '' }).success).toBe(false);
		expect(RunAgentPublicDto.safeParse({ message: 'Hello', newSession: true }).success).toBe(false);
	});
});
