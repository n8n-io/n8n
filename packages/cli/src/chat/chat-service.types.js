'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.chatMessageSchema = void 0;
const zod_1 = require('zod');
exports.chatMessageSchema = zod_1.z.object({
	sessionId: zod_1.z.string(),
	action: zod_1.z.literal('sendMessage'),
	chatInput: zod_1.z.string(),
	files: zod_1.z
		.array(
			zod_1.z.object({
				name: zod_1.z.string(),
				type: zod_1.z.string(),
				data: zod_1.z.string(),
			}),
		)
		.optional(),
});
//# sourceMappingURL=chat-service.types.js.map
