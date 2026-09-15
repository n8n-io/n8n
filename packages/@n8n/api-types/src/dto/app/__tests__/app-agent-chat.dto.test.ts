import { appAgentChatRequestSchema, appAgentResumeRequestSchema } from '../app-agent-chat.dto';

const sessionId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('app-agent-chat.dto', () => {
	describe('appAgentChatRequestSchema', () => {
		it('accepts a message with a uuid session id', () => {
			expect(appAgentChatRequestSchema.safeParse({ message: 'Hi', sessionId }).success).toBe(true);
			expect(
				appAgentChatRequestSchema.safeParse({ message: 'x'.repeat(8000), sessionId }).success,
			).toBe(true);
		});

		it('rejects an empty or too long message', () => {
			expect(appAgentChatRequestSchema.safeParse({ message: '', sessionId }).success).toBe(false);
			expect(
				appAgentChatRequestSchema.safeParse({ message: 'x'.repeat(8001), sessionId }).success,
			).toBe(false);
		});

		it('rejects a missing or non-uuid session id', () => {
			expect(appAgentChatRequestSchema.safeParse({ message: 'Hi' }).success).toBe(false);
			expect(
				appAgentChatRequestSchema.safeParse({ message: 'Hi', sessionId: 'visitor-1' }).success,
			).toBe(false);
		});
	});

	describe('appAgentResumeRequestSchema', () => {
		const resume = {
			sessionId,
			runId: 'run-1',
			toolCallId: 'call-1',
			resumeData: { approved: true },
		};

		it('accepts a resume with any resume data', () => {
			expect(appAgentResumeRequestSchema.safeParse(resume).success).toBe(true);
			expect(appAgentResumeRequestSchema.safeParse({ ...resume, resumeData: 'yes' }).success).toBe(
				true,
			);
		});

		it('rejects a non-uuid session id or an empty run or tool call id', () => {
			expect(
				appAgentResumeRequestSchema.safeParse({ ...resume, sessionId: 'visitor-1' }).success,
			).toBe(false);
			expect(appAgentResumeRequestSchema.safeParse({ ...resume, runId: '' }).success).toBe(false);
			expect(appAgentResumeRequestSchema.safeParse({ ...resume, toolCallId: '' }).success).toBe(
				false,
			);
		});
	});
});
