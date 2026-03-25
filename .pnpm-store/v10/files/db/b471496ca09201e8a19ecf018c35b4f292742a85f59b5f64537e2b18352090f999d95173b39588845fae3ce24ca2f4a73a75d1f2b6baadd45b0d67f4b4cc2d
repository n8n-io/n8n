const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
let zod_v3 = require("zod/v3");

//#region src/agents/middleware/constants.ts
const RetrySchema = zod_v3.z.object({
	maxRetries: zod_v3.z.number().min(0).default(2),
	retryOn: zod_v3.z.union([zod_v3.z.function().args(zod_v3.z.instanceof(Error)).returns(zod_v3.z.boolean()), zod_v3.z.array(zod_v3.z.custom())]).default(() => () => true),
	backoffFactor: zod_v3.z.number().min(0).default(2),
	initialDelayMs: zod_v3.z.number().min(0).default(1e3),
	maxDelayMs: zod_v3.z.number().min(0).default(6e4),
	jitter: zod_v3.z.boolean().default(true)
});

//#endregion
exports.RetrySchema = RetrySchema;
//# sourceMappingURL=constants.cjs.map