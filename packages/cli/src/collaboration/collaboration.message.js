'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.parseWorkflowMessage =
	exports.workflowMessageSchema =
	exports.workflowCursorMessageSchema =
	exports.workflowEditMessageSchema =
	exports.workflowEditOperationSchema =
	exports.workflowClosedMessageSchema =
	exports.workflowOpenedMessageSchema =
		void 0;
const zod_1 = require('zod');
exports.workflowOpenedMessageSchema = zod_1.z
	.object({
		type: zod_1.z.literal('workflowOpened'),
		workflowId: zod_1.z.string().min(1),
	})
	.strict();
exports.workflowClosedMessageSchema = zod_1.z
	.object({
		type: zod_1.z.literal('workflowClosed'),
		workflowId: zod_1.z.string().min(1),
	})
	.strict();
exports.workflowEditOperationSchema = zod_1.z.discriminatedUnion('action', [
	zod_1.z.object({
		action: zod_1.z.literal('addNode'),
		nodeData: zod_1.z.object({
			id: zod_1.z.string(),
			name: zod_1.z.string(),
			type: zod_1.z.string(),
			typeVersion: zod_1.z.number(),
			position: zod_1.z.array(zod_1.z.number()).length(2),
			parameters: zod_1.z.record(zod_1.z.any()).optional(),
		}),
		position: zod_1.z.number().optional(),
	}),
	zod_1.z.object({
		action: zod_1.z.literal('removeNode'),
		nodeId: zod_1.z.string(),
		position: zod_1.z.number().optional(),
	}),
	zod_1.z.object({
		action: zod_1.z.literal('updateNode'),
		nodeId: zod_1.z.string(),
		changes: zod_1.z.record(zod_1.z.any()),
		position: zod_1.z.number().optional(),
	}),
	zod_1.z.object({
		action: zod_1.z.literal('addConnection'),
		connection: zod_1.z.object({
			source: zod_1.z.string(),
			sourceIndex: zod_1.z.number(),
			destination: zod_1.z.string(),
			destinationIndex: zod_1.z.number(),
			type: zod_1.z.string().optional(),
		}),
		position: zod_1.z.number().optional(),
	}),
	zod_1.z.object({
		action: zod_1.z.literal('removeConnection'),
		connection: zod_1.z.object({
			source: zod_1.z.string(),
			sourceIndex: zod_1.z.number(),
			destination: zod_1.z.string(),
			destinationIndex: zod_1.z.number(),
		}),
		position: zod_1.z.number().optional(),
	}),
]);
exports.workflowEditMessageSchema = zod_1.z
	.object({
		type: zod_1.z.literal('workflowEdit'),
		workflowId: zod_1.z.string().min(1),
		operation: exports.workflowEditOperationSchema,
		timestamp: zod_1.z.number(),
		userId: zod_1.z.string(),
		operationId: zod_1.z.string(),
	})
	.strict();
exports.workflowCursorMessageSchema = zod_1.z
	.object({
		type: zod_1.z.literal('workflowCursor'),
		workflowId: zod_1.z.string().min(1),
		position: zod_1.z
			.object({
				x: zod_1.z.number(),
				y: zod_1.z.number(),
			})
			.optional(),
		selectedNodeId: zod_1.z.string().optional(),
		userId: zod_1.z.string(),
	})
	.strict();
exports.workflowMessageSchema = zod_1.z.discriminatedUnion('type', [
	exports.workflowOpenedMessageSchema,
	exports.workflowClosedMessageSchema,
	exports.workflowEditMessageSchema,
	exports.workflowCursorMessageSchema,
]);
const parseWorkflowMessage = async (msg) => {
	return await exports.workflowMessageSchema.parseAsync(msg);
};
exports.parseWorkflowMessage = parseWorkflowMessage;
//# sourceMappingURL=collaboration.message.js.map
