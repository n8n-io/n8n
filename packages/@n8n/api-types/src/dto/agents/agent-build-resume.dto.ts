import { z } from 'zod';

import { interactiveResumeDataSchema } from '../../agent-builder-interactive';
import { Z } from '../../zod-class';

/**
 * Body of `POST /:agentId/build/resume`.
 *
 * `runId` is sent by the frontend; it originates from the
 * `tool-call-suspended` chunk (live) or the `openSuspensions` sidecar
 * returned by `GET /build/messages` (history reload).
 */
export class AgentBuildResumeDto extends Z.class({
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
	resumeData: interactiveResumeDataSchema,
}) {}
