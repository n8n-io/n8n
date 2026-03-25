import { z } from "zod/v3";

//#region src/hooks.ts
const toolCallRequestSchema = z.object({
	serverName: z.string(),
	name: z.string(),
	args: z.unknown()
});
const toolResultBeforeSchema = z.tuple([z.custom(), z.array(z.union([z.custom(), z.custom()]))]);
/**
* Tool result schema that users can return within the `afterToolCall` callback
*/
const toolResultSchema = z.union([
	z.string(),
	z.custom(),
	toolResultBeforeSchema,
	z.custom()
]);
const toolCallResultSchema = z.object({
	...toolCallRequestSchema.shape,
	result: toolResultBeforeSchema
});
const modifiedToolCallResultSchema = z.object({
	...toolCallRequestSchema.shape,
	result: toolResultSchema
});
const toolCallModificationSchema = z.object({
	headers: z.record(z.string()),
	args: z.unknown()
}).partial();
const toolHooksSchema = z.object({
	beforeToolCall: z.function().args(toolCallRequestSchema, z.custom(), z.custom()).returns(z.union([
		z.promise(toolCallModificationSchema),
		toolCallModificationSchema,
		z.void(),
		z.promise(z.void())
	])).optional(),
	afterToolCall: z.function().args(toolCallResultSchema, z.custom(), z.custom()).returns(z.union([
		z.promise(modifiedToolCallResultSchema.pick({ result: true })),
		modifiedToolCallResultSchema.pick({ result: true }),
		z.void(),
		z.promise(z.void())
	])).optional()
});

//#endregion
export { toolHooksSchema };
//# sourceMappingURL=hooks.js.map