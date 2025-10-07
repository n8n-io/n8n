import { Role, RoleRepository, Scope, ScopeRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope as ScopeType } from '@n8n/permissions';

/**
 * Creates a test role with given parameters
 */
export async function createRole(overrides: Partial<Role> = {}): Promise<Role> {
	const roleRepository = Container.get(RoleRepository);

	const defaultRole: Partial<Role> = {
		slug: `test-role-${Math.random().toString(36).substring(7)}`,
		displayName: 'Test Role',
		description: 'A test role for integration testing',
		systemRole: false,
		roleType: 'project',
		scopes: [],
	};

	const roleData = { ...defaultRole, ...overrides };
	const role = Object.assign(new Role(), roleData);

	return await roleRepository.save(role);
}

/**
 * Creates a system role (cannot be deleted/modified)
 */
export async function createSystemRole(overrides: Partial<Role> = {}): Promise<Role> {
	return await createRole({
		systemRole: true,
		slug: `system-role-${Math.random().toString(36).substring(7)}`,
		displayName: 'System Test Role',
		...overrides,
	});
}

/**
 * Creates a custom role with specific scopes
 */
export async function createCustomRoleWithScopes(
	scopes: Scope[],
	overrides: Partial<Role> = {},
): Promise<Role> {
	return await createRole({
		scopes,
		systemRole: false,
		...overrides,
	});
}

/**
 * Creates a custom role with specific scope slugs (using existing permission system scopes)
 */
export async function createCustomRoleWithScopeSlugs(
	scopeSlugs: string[],
	overrides: Partial<Role> = {},
): Promise<Role> {
	const scopeRepository = Container.get(ScopeRepository);

	// Find existing scopes by their slugs
	const scopes = await scopeRepository.findByList(scopeSlugs);

	if (scopes.length !== scopeSlugs.length) {
		const missingScopes = scopeSlugs.filter((slug) => !scopes.some((scope) => scope.slug === slug));
		throw new Error(
			`Could not find all scopes. Expected ${scopeSlugs.length}, found ${scopes.length}, missing: ${missingScopes.join(', ')}`,
		);
	}

	return await createRole({
		scopes,
		systemRole: false,
		...overrides,
	});
}

/**
 * Creates a test scope with given parameters
 */
export async function createScope(overrides: Partial<Scope> = {}): Promise<Scope> {
	const scopeRepository = Container.get(ScopeRepository);

	const defaultScope: Partial<Scope> = {
		slug: `test:scope:${Math.random().toString(36).substring(7)}` as ScopeType,
		displayName: 'Test Scope',
		description: 'A test scope for integration testing',
	};

	const scopeData = { ...defaultScope, ...overrides };
	const scope = Object.assign(new Scope(), scopeData);

	return await scopeRepository.save(scope);
}

/**
 * Creates multiple test scopes
 */
export async function createScopes(
	count: number,
	baseOverrides: Partial<Scope> = {},
): Promise<Scope[]> {
	const scopes: Scope[] = [];

	for (let i = 0; i < count; i++) {
		const scope = await createScope({
			slug: `test:scope:${i}:${Math.random().toString(36).substring(7)}` as ScopeType,
			displayName: `Test Scope ${i}`,
			...baseOverrides,
		});
		scopes.push(scope);
	}

	return scopes;
}

/**
 * Creates predefined test scopes for common test scenarios
 */
export async function createTestScopes(): Promise<{
	readScope: Scope;
	writeScope: Scope;
	deleteScope: Scope;
	adminScope: Scope;
}> {
	const [readScope, writeScope, deleteScope, adminScope] = await Promise.all([
		createScope({
			slug: 'test:read' as ScopeType,
			displayName: 'Test Read',
			description: 'Test read access',
		}),
		createScope({
			slug: 'test:write' as ScopeType,
			displayName: 'Test Write',
			description: 'Test write access',
		}),
		createScope({
			slug: 'test:delete' as ScopeType,
			displayName: 'Test Delete',
			description: 'Test delete access',
		}),
		createScope({
			slug: 'test:admin' as ScopeType,
			displayName: 'Test Admin',
			description: 'Test admin access',
		}),
	]);

	return { readScope, writeScope, deleteScope, adminScope };
}

/**
 * Cleans up test roles and scopes
 */
export async function cleanupRolesAndScopes(): Promise<void> {
	const roleRepository = Container.get(RoleRepository);
	const scopeRepository = Container.get(ScopeRepository);

	// Delete test roles (excluding system roles for safety)
	const testRoles = await roleRepository
		.createQueryBuilder('role')
		.where('role.slug LIKE :testPattern', { testPattern: 'test-role-%' })
		.orWhere('role.slug LIKE :systemPattern', { systemPattern: 'system-role-%' })
		.getMany();

	for (const role of testRoles) {
		try {
			await roleRepository.delete({ slug: role.slug });
		} catch (error) {
			// Ignore errors for system roles or roles with dependencies
		}
	}

	// Delete test scopes
	const testScopes = await scopeRepository
		.createQueryBuilder('scope')
		.where('scope.slug LIKE :pattern', { pattern: 'test:%' })
		.getMany();

	for (const scope of testScopes) {
		try {
			await scopeRepository.delete({ slug: scope.slug });
		} catch (error) {
			// Ignore errors for scopes with dependencies
		}
	}
}
