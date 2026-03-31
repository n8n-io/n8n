'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.checklistResultSchema =
	exports.checklistItemSchema =
	exports.programmaticCheckSchema =
	exports.nodeParameterCheckSchema =
	exports.connectionExistsCheckSchema =
	exports.nodeCountGteCheckSchema =
	exports.triggerTypeCheckSchema =
	exports.nodeConnectedCheckSchema =
	exports.nodeExistsCheckSchema =
	exports.verificationStrategySchema =
	exports.checklistCategorySchema =
		void 0;
const zod_1 = require('zod');
exports.checklistCategorySchema = zod_1.z.enum(['structure', 'data', 'behavior', 'execution']);
exports.verificationStrategySchema = zod_1.z.enum(['programmatic', 'llm']);
exports.nodeExistsCheckSchema = zod_1.z.object({
	type: zod_1.z.literal('node-exists'),
	nodeType: zod_1.z.string(),
});
exports.nodeConnectedCheckSchema = zod_1.z.object({
	type: zod_1.z.literal('node-connected'),
	nodeType: zod_1.z.string(),
});
exports.triggerTypeCheckSchema = zod_1.z.object({
	type: zod_1.z.literal('trigger-type'),
	expectedTriggerType: zod_1.z.string(),
});
exports.nodeCountGteCheckSchema = zod_1.z.object({
	type: zod_1.z.literal('node-count-gte'),
	minCount: zod_1.z.number(),
});
exports.connectionExistsCheckSchema = zod_1.z.object({
	type: zod_1.z.literal('connection-exists'),
	sourceNodeType: zod_1.z.string(),
	targetNodeType: zod_1.z.string(),
});
exports.nodeParameterCheckSchema = zod_1.z.object({
	type: zod_1.z.literal('node-parameter'),
	nodeType: zod_1.z.string(),
	parameterPath: zod_1.z.string(),
	expectedValue: zod_1.z.unknown(),
});
exports.programmaticCheckSchema = zod_1.z.discriminatedUnion('type', [
	exports.nodeExistsCheckSchema,
	exports.nodeConnectedCheckSchema,
	exports.triggerTypeCheckSchema,
	exports.nodeCountGteCheckSchema,
	exports.connectionExistsCheckSchema,
	exports.nodeParameterCheckSchema,
]);
exports.checklistItemSchema = zod_1.z.object({
	id: zod_1.z.number(),
	description: zod_1.z.string(),
	category: exports.checklistCategorySchema,
	strategy: exports.verificationStrategySchema,
	check: exports.programmaticCheckSchema.optional(),
});
exports.checklistResultSchema = zod_1.z.object({
	id: zod_1.z.number(),
	pass: zod_1.z.boolean(),
	reasoning: zod_1.z.string(),
	strategy: exports.verificationStrategySchema,
	failureCategory: zod_1.z.string().optional(),
	rootCause: zod_1.z.string().optional(),
});
//# sourceMappingURL=types.js.map
