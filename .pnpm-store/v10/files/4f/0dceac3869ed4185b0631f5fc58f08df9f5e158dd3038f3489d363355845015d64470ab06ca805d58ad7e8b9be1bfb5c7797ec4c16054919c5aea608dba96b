const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/hooks.ts
const toolCallRequestSchema = zod_v3.z.object({
	serverName: zod_v3.z.string(),
	name: zod_v3.z.string(),
	args: zod_v3.z.unknown()
});
const toolResultBeforeSchema = zod_v3.z.tuple([zod_v3.z.custom(), zod_v3.z.array(zod_v3.z.union([zod_v3.z.custom(), zod_v3.z.custom()]))]);
/**
* Tool result schema that users can return within the `afterToolCall` callback
*/
const toolResultSchema = zod_v3.z.union([
	zod_v3.z.string(),
	zod_v3.z.custom(),
	toolResultBeforeSchema,
	zod_v3.z.custom()
]);
const toolCallResultSchema = zod_v3.z.object({
	...toolCallRequestSchema.shape,
	result: toolResultBeforeSchema
});
const modifiedToolCallResultSchema = zod_v3.z.object({
	...toolCallRequestSchema.shape,
	result: toolResultSchema
});
const toolCallModificationSchema = zod_v3.z.object({
	headers: zod_v3.z.record(zod_v3.z.string()),
	args: zod_v3.z.unknown()
}).partial();
const toolHooksSchema = zod_v3.z.object({
	beforeToolCall: zod_v3.z.function().args(toolCallRequestSchema, zod_v3.z.custom(), zod_v3.z.custom()).returns(zod_v3.z.union([
		zod_v3.z.promise(toolCallModificationSchema),
		toolCallModificationSchema,
		zod_v3.z.void(),
		zod_v3.z.promise(zod_v3.z.void())
	])).optional(),
	afterToolCall: zod_v3.z.function().args(toolCallResultSchema, zod_v3.z.custom(), zod_v3.z.custom()).returns(zod_v3.z.union([
		zod_v3.z.promise(modifiedToolCallResultSchema.pick({ result: true })),
		modifiedToolCallResultSchema.pick({ result: true }),
		zod_v3.z.void(),
		zod_v3.z.promise(zod_v3.z.void())
	])).optional()
});

//#endregion
exports.toolHooksSchema = toolHooksSchema;
//# sourceMappingURL=hooks.cjs.map