import { z } from 'zod';

// Zod schemas instead of `Z.class`: the app runtime routes are `skipAuth` and parse the
// body by hand, like `CreateAppBindingDto`.

/** Body of `POST /apps/<ns>/api/agents/<key>/chat`. The SDK always mints the session id. */
export const appAgentChatRequestSchema = z.object({
	message: z.string().min(1).max(8000),
	sessionId: z.string().uuid(),
});
export type AppAgentChatRequest = z.infer<typeof appAgentChatRequestSchema>;

/** Body of `POST /apps/<ns>/api/agents/<key>/chat/resume`. */
export const appAgentResumeRequestSchema = z.object({
	sessionId: z.string().uuid(),
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
	// Untyped at this boundary for the same reason as `AgentChatResumeDto.resumeData`:
	// each interactive tool validates its own resume payload.
	resumeData: z.unknown(),
});
export type AppAgentResumeRequest = z.infer<typeof appAgentResumeRequestSchema>;
