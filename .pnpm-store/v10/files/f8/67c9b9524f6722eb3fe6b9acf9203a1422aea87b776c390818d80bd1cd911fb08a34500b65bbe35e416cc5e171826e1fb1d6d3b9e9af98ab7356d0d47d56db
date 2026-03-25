import { z } from "zod/v3";

//#region src/agents/middleware/constants.ts
const RetrySchema = z.object({
	maxRetries: z.number().min(0).default(2),
	retryOn: z.union([z.function().args(z.instanceof(Error)).returns(z.boolean()), z.array(z.custom())]).default(() => () => true),
	backoffFactor: z.number().min(0).default(2),
	initialDelayMs: z.number().min(0).default(1e3),
	maxDelayMs: z.number().min(0).default(6e4),
	jitter: z.boolean().default(true)
});

//#endregion
export { RetrySchema };
//# sourceMappingURL=constants.js.map