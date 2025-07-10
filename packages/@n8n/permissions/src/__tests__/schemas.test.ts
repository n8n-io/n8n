import {
	roleNamespaceSchema,
	globalRoleSchema,
	assignableGlobalRoleSchema,
	projectRoleSchema,
	credentialSharingRoleSchema,
	workflowSharingRoleSchema,
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
		{ name: 'invalid role', value: 'global:invalid', expected: false },
		{ name: 'invalid prefix', value: 'invalid:admin', expected: false },
		{ name: 'object value', value: {}, expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = assignableGlobalRoleSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('projectRoleSchema', () => {
	test.each([
		{ name: 'valid role: project:personalOwner', value: 'project:personalOwner', expected: true },
		{ name: 'valid role: project:admin', value: 'project:admin', expected: true },
		{ name: 'valid role: project:editor', value: 'project:editor', expected: true },
		{ name: 'valid role: project:viewer', value: 'project:viewer', expected: true },
		{ name: 'invalid role', value: 'invalid-role', expected: false },
	])('should validate $name', ({ value, expected }) => {
		const result = projectRoleSchema.safeParse(value);
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
