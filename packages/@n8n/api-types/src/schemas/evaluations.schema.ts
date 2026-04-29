import { z } from 'zod';

import { Z } from '../zod-class';

// Single source of truth for the parallel-execution rollout flag id, shared
// between the FE checkbox-rendering gate and the BE controller's safety net.
// Strings can drift if duplicated; importing from a shared module cannot.
export const EVAL_PARALLEL_EXECUTION_FLAG = '080_eval_parallel_execution';

// `concurrency` is the optional number of evaluation test cases to run in
// parallel for a single test run. Clamped 1–10. When omitted, the runner
// falls back to sequential execution (concurrency = 1). The PostHog
// rollout flag `080_eval_parallel_execution` gates whether the controller
// honours values > 1; flag-off requests are silently coerced to 1 so the
// flag id never leaks into HTTP responses.
const startTestRunPayloadShape = {
	concurrency: z.number().int().min(1).max(10).optional(),
};

export const startTestRunPayloadSchema = z.object(startTestRunPayloadShape);
export type StartTestRunPayload = z.infer<typeof startTestRunPayloadSchema>;

// Controller-side DTO used by the @Body decorator's reflection-based
// validation. Shares the same shape as `startTestRunPayloadSchema` —
// single source of truth so the two validators cannot silently diverge.
export class StartTestRunRequestDto extends Z.class(startTestRunPayloadShape) {}
