import { z } from 'zod';

import { Z } from '../zod-class';

// `concurrency` is the optional number of evaluation test cases to run in
// parallel for a single test run. Clamped 1–10 here as a hard upper bound;
// the backend further clamps this against the effective evaluation
// concurrency limit (env override or license-tier default). Omitting the
// field is equivalent to sending `1` — sequential execution, the legacy
// behaviour.
const startTestRunPayloadShape = {
	concurrency: z.number().int().min(1).max(10).optional(),
};

export const startTestRunPayloadSchema = z.object(startTestRunPayloadShape);
export type StartTestRunPayload = z.infer<typeof startTestRunPayloadSchema>;

// Controller-side DTO used by the @Body decorator's reflection-based
// validation. Shares the same shape as `startTestRunPayloadSchema` —
// single source of truth so the two validators cannot silently diverge.
export class StartTestRunRequestDto extends Z.class(startTestRunPayloadShape) {}
