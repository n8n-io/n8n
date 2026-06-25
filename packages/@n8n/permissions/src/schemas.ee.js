'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.roleSchema =
	exports.scopeSchema =
	exports.workflowSharingRoleSchema =
	exports.credentialSharingRoleSchema =
	exports.projectRoleSchema =
	exports.assignableProjectRoleSchema =
	exports.systemProjectRoleSchema =
	exports.customProjectRoleSchema =
	exports.teamRoleSchema =
	exports.personalRoleSchema =
	exports.assignableGlobalRoleSchema =
	exports.globalRoleSchema =
	exports.roleNamespaceSchema =
		void 0;
const zod_1 = require('zod');
const constants_ee_1 = require('./constants.ee');
const scope_information_1 = require('./scope-information');
exports.roleNamespaceSchema = zod_1.z.enum(['global', 'project', 'credential', 'workflow']);
exports.globalRoleSchema = zod_1.z.enum(['global:owner', 'global:admin', 'global:member']);
const customGlobalRoleSchema = zod_1.z
	.string()
	.nonempty()
	.refine((val) => !exports.globalRoleSchema.safeParse(val).success, {
		message: 'This global role value is not assignable',
	});
exports.assignableGlobalRoleSchema = zod_1.z.union([
	exports.globalRoleSchema.exclude(['global:owner']),
	customGlobalRoleSchema,
]);
exports.personalRoleSchema = zod_1.z.enum(['project:personalOwner']);
exports.teamRoleSchema = zod_1.z.enum(['project:admin', 'project:editor', 'project:viewer']);
exports.customProjectRoleSchema = zod_1.z
	.string()
	.nonempty()
	.refine(
		(val) =>
			val !== constants_ee_1.PROJECT_OWNER_ROLE_SLUG &&
			!exports.teamRoleSchema.safeParse(val).success,
		{
			message: 'This global role value is not assignable',
		},
	);
exports.systemProjectRoleSchema = zod_1.z.union([
	exports.personalRoleSchema,
	exports.teamRoleSchema,
]);
exports.assignableProjectRoleSchema = zod_1.z.union([
	exports.teamRoleSchema,
	exports.customProjectRoleSchema,
]);
exports.projectRoleSchema = zod_1.z.union([
	exports.systemProjectRoleSchema,
	exports.customProjectRoleSchema,
]);
exports.credentialSharingRoleSchema = zod_1.z.enum(['credential:owner', 'credential:user']);
exports.workflowSharingRoleSchema = zod_1.z.enum(['workflow:owner', 'workflow:editor']);
const ALL_SCOPES_LOOKUP_SET = new Set(scope_information_1.ALL_SCOPES);
exports.scopeSchema = zod_1.z.string().refine((val) => ALL_SCOPES_LOOKUP_SET.has(val), {
	message: 'Invalid scope',
});
exports.roleSchema = zod_1.z.object({
	slug: zod_1.z.string().min(1),
	displayName: zod_1.z.string().min(1),
	description: zod_1.z.string().nullable(),
	systemRole: zod_1.z.boolean(),
	roleType: exports.roleNamespaceSchema,
	licensed: zod_1.z.boolean(),
	scopes: zod_1.z.array(exports.scopeSchema),
	createdAt: zod_1.z.date().optional(),
	updatedAt: zod_1.z.date().optional(),
	usedByUsers: zod_1.z.number().optional(),
});
//# sourceMappingURL=schemas.ee.js.map
