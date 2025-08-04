'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateExecutionUpdatePayload = validateExecutionUpdatePayload;
const zod_1 = require('zod');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const executionUpdateSchema = zod_1.z.object({
	tags: zod_1.z.array(zod_1.z.string()).optional(),
	vote: zod_1.z.enum(['up', 'down']).nullable().optional(),
});
function validateExecutionUpdatePayload(payload) {
	try {
		const validatedPayload = executionUpdateSchema.parse(payload);
		const { tags, vote } = validatedPayload;
		if (!tags && vote === undefined) {
			throw new bad_request_error_1.BadRequestError('No annotation provided');
		}
		return validatedPayload;
	} catch (e) {
		if (e instanceof zod_1.z.ZodError) {
			throw new bad_request_error_1.BadRequestError(e.message);
		}
		throw e;
	}
}
//# sourceMappingURL=validation.js.map
