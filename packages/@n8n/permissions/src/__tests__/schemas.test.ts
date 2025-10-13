import {
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
} from '@/constants.ee';

import {
	roleNamespaceSchema,
	globalRoleSchema,
	assignableGlobalRoleSchema,
	systemProjectRoleSchema,
	credentialSharingRoleSchema,
	workflowSharingRoleSchema,
	customProjectRoleSchema,
} from '../schemas.ee';

describe('roleNamespaceSchema', () => {
	test.each([
		{ name: 'valid namespace: global', value: 'global', expected: true },
		{ name: 'valid namespace: project', value: 'project', expected: true },
		{ name: 'valid namespace: credential', value: 'credential', expected: true },
		{ name: 'valid namespace: workflow', value: 'workflow', expected: true },
		{ name: 'invalid namespace', value: 'invalid-namespace', expected: false },
		{ name: 'numeric value', value: 123, expected: false },
		{ name: 'null value', value: null, expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = roleNamespaceSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('globalRoleSchema', () => {
	test.each([
		{ name: 'valid role: global:owner', value: 'global:owner', expected: true },
		{ name: 'valid role: global:admin', value: 'global:admin', expected: true },
		{ name: 'valid role: global:member', value: 'global:member', expected: true },
		{ name: 'invalid role', value: 'global:invalid', expected: false },
		{ name: 'invalid prefix', value: 'invalid:admin', expected: false },
		{ name: 'empty string', value: '', expected: false },
		{ name: 'undefined value', value: undefined, expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = globalRoleSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('assignableGlobalRoleSchema', () => {
	test.each([
		{ name: 'excluded role: global:owner', value: 'global:owner', expected: false },
		{ name: 'valid role: global:admin', value: 'global:admin', expected: true },
		{ name: 'valid role: global:member', value: 'global:member', expected: true },
		{ name: 'object value', value: {}, expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = assignableGlobalRoleSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('systemProjectRoleSchema', () => {
	test.each([
		{
			name: `valid role: ${PROJECT_OWNER_ROLE_SLUG}`,
			value: PROJECT_OWNER_ROLE_SLUG,
			expected: true,
		},
		{
			name: `valid role: ${PROJECT_ADMIN_ROLE_SLUG}`,
			value: PROJECT_ADMIN_ROLE_SLUG,
			expected: true,
		},
		{
			name: `valid role: ${PROJECT_EDITOR_ROLE_SLUG}`,
			value: PROJECT_EDITOR_ROLE_SLUG,
			expected: true,
		},
		{
			name: `valid role: ${PROJECT_VIEWER_ROLE_SLUG}`,
			value: PROJECT_VIEWER_ROLE_SLUG,
			expected: true,
		},
		{ name: 'invalid role', value: 'invalid-role', expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = systemProjectRoleSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('credentialSharingRoleSchema', () => {
	test.each([
		{ name: 'valid role: credential:owner', value: 'credential:owner', expected: true },
		{ name: 'valid role: credential:user', value: 'credential:user', expected: true },
		{ name: 'invalid role', value: 'credential:admin', expected: false },
		{ name: 'invalid prefix', value: 'cred:owner', expected: false },
		{ name: 'boolean value', value: true, expected: false },
		{ name: 'array value', value: ['credential:owner'], expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = credentialSharingRoleSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('workflowSharingRoleSchema', () => {
	test.each([
		{ name: 'valid role: workflow:owner', value: 'workflow:owner', expected: true },
		{ name: 'valid role: workflow:editor', value: 'workflow:editor', expected: true },
		{ name: 'invalid role', value: 'workflow:viewer', expected: false },
		{ name: 'invalid prefix', value: 'work:owner', expected: false },
		{ name: 'undefined value', value: undefined, expected: false },
		{ name: 'empty string', value: '', expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = workflowSharingRoleSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('customProjectRoleSchema', () => {
	test.each([
		{ name: 'valid role: custom:role', value: 'custom:role', expected: true },
		{ name: 'undefined value', value: undefined, expected: false },
		{ name: 'empty string', value: '', expected: false },
		{ name: 'system role', value: PROJECT_ADMIN_ROLE_SLUG, expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = customProjectRoleSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});
