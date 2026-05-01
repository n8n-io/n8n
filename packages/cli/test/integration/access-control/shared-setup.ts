import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User, Role } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE } from '@n8n/db';

import { UserManagementMailer } from '@/user-management/email';

import { createCustomRoleWithScopeSlugs, cleanupRolesAndScopes } from '../shared/db/roles';
import { createAdmin, createOwner, createMember } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

/**
 * Shared test setup and utilities for access control tests
 * Provides common infrastructure for user management, project setup, and role creation
 */

export interface TestContext {
	// Users
	owner: User;
	admin: User;
	member1: User;
	member2: User;
	member3: User;

	// Projects
	teamProjectA: Project;
	teamProjectB: Project;
	ownerPersonalProject: Project;
	member1PersonalProject: Project;

	// Custom roles
	customWorkflowReader: Role;
	customWorkflowWriter: Role;
	customCredentialReader: Role;
	customCredentialWriter: Role;
	customWorkflowWriteOnly: Role;
	customWorkflowDeleteOnly: Role;
	customCredentialWriteOnly: Role;
	customCredentialDeleteOnly: Role;
	customMixedReader: Role;

	// Authentication agents
	ownerAgent: SuperAgentTest;
	adminAgent: SuperAgentTest;
	member1Agent: SuperAgentTest;
	member2Agent: SuperAgentTest;
	member3Agent: SuperAgentTest;

	// Test server
	testServer: ReturnType<typeof utils.setupTestServer>;
}

/**
 * Creates the test server with required configuration
 */
export function createTestServer() {
	return utils.setupTestServer({
		endpointGroups: ['workflows', 'credentials'],
		enabledFeatures: ['feat:sharing', 'feat:customRoles'],
		quotas: {
			'quota:maxTeamProjects': -1,
		},
	});
}

/**
 * Sets up the complete test context with users, projects, roles, and authentication agents
 */
export async function setupTestContext(): Promise<TestContext> {
	// Mock required services
	mockInstance(UserManagementMailer, {
		invite: jest.fn(),
		passwordReset: jest.fn(),
	});

	// Create the test server
	const testServer = createTestServer();

	// Create standard users
	const owner = await createOwner();
	const admin = await createAdmin();
	const member1 = await createMember();
	const member2 = await createMember();
	const member3 = await createMember();

	// Get personal projects
	const ownerPersonalProject = await getPersonalProject(owner);
	const member1PersonalProject = await getPersonalProject(member1);

	// Create team projects for testing
	const teamProjectA = await createTeamProject('Team Project A', owner);
	const teamProjectB = await createTeamProject('Team Project B', owner);

	// Create authentication agents
	const ownerAgent = testServer.authAgentFor(owner);
	const adminAgent = testServer.authAgentFor(admin);
	const member1Agent = testServer.authAgentFor(member1);
	const member2Agent = testServer.authAgentFor(member2);
	const member3Agent = testServer.authAgentFor(member3);

	// Create custom roles using predefined scope slugs from the permissions system
	const customWorkflowReader = await createCustomRoleWithScopeSlugs(
		['workflow:read', 'workflow:list'],
		{
			roleType: 'project',
			displayName: 'Custom Workflow Reader',
			description: 'Can read and list workflows only',
		},
	);

	const customWorkflowWriter = await createCustomRoleWithScopeSlugs(
		['workflow:read', 'workflow:list', 'workflow:create', 'workflow:update'],
		{
			roleType: 'project',
			displayName: 'Custom Workflow Writer',
			description: 'Can read, list, create and update workflows',
		},
	);

	const customCredentialReader = await createCustomRoleWithScopeSlugs(
		['credential:read', 'credential:list'],
		{
			roleType: 'project',
			displayName: 'Custom Credential Reader',
			description: 'Can read and list credentials only',
		},
	);

	const customCredentialWriter = await createCustomRoleWithScopeSlugs(
		['credential:read', 'credential:list', 'credential:create', 'credential:update'],
		{
			roleType: 'project',
			displayName: 'Custom Credential Writer',
			description: 'Can read, list, create and update credentials',
		},
	);

	const customWorkflowWriteOnly = await createCustomRoleWithScopeSlugs(
		['workflow:create', 'workflow:update'],
		{
			roleType: 'project',
			displayName: 'Custom Workflow Write-Only',
			description: 'Can create and update workflows but not read them',
		},
	);

	const customWorkflowDeleteOnly = await createCustomRoleWithScopeSlugs(['workflow:delete'], {
		roleType: 'project',
		displayName: 'Custom Workflow Delete-Only',
		description: 'Can only delete workflows',
	});

	const customCredentialWriteOnly = await createCustomRoleWithScopeSlugs(
		['credential:create', 'credential:update'],
		{
			roleType: 'project',
			displayName: 'Custom Credential Write-Only',
			description: 'Can create and update credentials but not read them',
		},
	);

	const customCredentialDeleteOnly = await createCustomRoleWithScopeSlugs(['credential:delete'], {
		roleType: 'project',
		displayName: 'Custom Credential Delete-Only',
		description: 'Can only delete credentials',
	});

	const customMixedReader = await createCustomRoleWithScopeSlugs(
		['workflow:read', 'workflow:list', 'credential:read', 'credential:list'],
		{
			roleType: 'project',
			displayName: 'Custom Mixed Reader',
			description: 'Can read and list both workflows and credentials',
		},
	);

	return {
		// Users
		owner,
		admin,
		member1,
		member2,
		member3,

		// Projects
		teamProjectA,
		teamProjectB,
		ownerPersonalProject,
		member1PersonalProject,

		// Custom roles
		customWorkflowReader,
		customWorkflowWriter,
		customCredentialReader,
		customCredentialWriter,
		customWorkflowWriteOnly,
		customWorkflowDeleteOnly,
		customCredentialWriteOnly,
		customCredentialDeleteOnly,
		customMixedReader,

		// Authentication agents
		ownerAgent,
		adminAgent,
		member1Agent,
		member2Agent,
		member3Agent,

		// Test server
		testServer,
	};
}

/**
 * Cleanup function to be called after all tests complete
 */
export async function cleanupTestContext(): Promise<void> {
	await cleanupRolesAndScopes();
}

/**
 * Validates that users have the correct global roles
 */
export function validateUserRoles(context: TestContext): void {
	expect(context.owner.role.slug).toBe(GLOBAL_OWNER_ROLE.slug);
	expect(context.member1.role.slug).toBe(GLOBAL_MEMBER_ROLE.slug);
	expect(context.member2.role.slug).toBe(GLOBAL_MEMBER_ROLE.slug);
	expect(context.member3.role.slug).toBe(GLOBAL_MEMBER_ROLE.slug);
}

/**
 * Validates that all required projects were created correctly
 */
export function validateProjects(context: TestContext): void {
	expect(context.teamProjectA.name).toBe('Team Project A');
	expect(context.teamProjectB.name).toBe('Team Project B');
	expect(context.ownerPersonalProject).toBeDefined();
	expect(context.member1PersonalProject).toBeDefined();
}

/**
 * Validates that all custom roles were created with correct scopes
 */
export function validateCustomRoles(context: TestContext): void {
	// Workflow roles
	expect(context.customWorkflowReader.scopes).toHaveLength(2);
	expect(context.customWorkflowWriter.scopes).toHaveLength(4);
	expect(context.customWorkflowWriteOnly.scopes).toHaveLength(2);
	expect(context.customWorkflowDeleteOnly.scopes).toHaveLength(1);

	// Credential roles
	expect(context.customCredentialReader.scopes).toHaveLength(2);
	expect(context.customCredentialWriter.scopes).toHaveLength(4);
	expect(context.customCredentialWriteOnly.scopes).toHaveLength(2);
	expect(context.customCredentialDeleteOnly.scopes).toHaveLength(1);

	// Mixed reader role
	expect(context.customMixedReader.scopes).toHaveLength(4);
}

/**
 * Helper to link a user to a project with a specific role
 */
export { linkUserToProject };
