import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { RoleResolverService } from '../role-resolver.service.ee';
import type {
	ProjectInfo,
	RoleMappingConfig,
	RoleMappingRule,
	RoleResolverContext,
} from '../role-resolver-types';

const logger = mock<Logger>();
const projectRepository = mock<ProjectRepository>();

const service = new RoleResolverService(logger, projectRepository);

function makeRule(overrides: Partial<RoleMappingRule> = {}): RoleMappingRule {
	return {
		id: 'rule-1',
		expression: '{{ true }}',
		role: 'global:admin',
		enabled: true,
		...overrides,
	};
}

function makeConfig(overrides: Partial<RoleMappingConfig> = {}): RoleMappingConfig {
	return {
		instanceRoleRules: [],
		projectRoleRules: [],
		fallbackInstanceRole: 'global:member',
		...overrides,
	};
}

function makeContext(overrides: Partial<RoleResolverContext> = {}): RoleResolverContext {
	return {
		$claims: {},
		$provider: 'oidc',
		...overrides,
	};
}

function makeProject(overrides: Partial<ProjectInfo> = {}): ProjectInfo {
	return {
		id: 'proj-1',
		name: 'Engineering',
		type: 'team',
		description: null,
		...overrides,
	};
}

describe('RoleResolverService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		projectRepository.find.mockResolvedValue([]);
	});

	describe('resolveRoles - instance role rules', () => {
		it('should return the role of the first matching rule', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({ id: 'r1', expression: '{{ false }}', role: 'global:owner' }),
					makeRule({ id: 'r2', expression: '{{ true }}', role: 'global:admin' }),
					makeRule({ id: 'r3', expression: '{{ true }}', role: 'global:member' }),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:admin');
		});

		it('should fallback to fallbackInstanceRole when no rule matches', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({ id: 'r1', expression: '{{ false }}', role: 'global:admin' }),
				],
				fallbackInstanceRole: 'global:member',
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:member');
		});

		it('should fallback when there are no rules', async () => {
			const config = makeConfig({ instanceRoleRules: [] });

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:member');
		});

		it('should skip disabled rules', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({ id: 'r1', expression: '{{ true }}', role: 'global:admin', enabled: false }),
					makeRule({ id: 'r2', expression: '{{ true }}', role: 'global:member' }),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:member');
		});

		it('should evaluate expressions against $claims context', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ $claims.role === "admin" }}',
						role: 'global:admin',
					}),
				],
			});
			const context = makeContext({ $claims: { role: 'admin' } });

			const result = await service.resolveRoles(config, context);

			expect(result.instanceRole).toBe('global:admin');
		});

		it('should evaluate expressions against $oidc context', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ $oidc.userInfo.groups.includes("admins") }}',
						role: 'global:admin',
					}),
				],
			});
			const context = makeContext({
				$claims: {},
				$oidc: {
					idToken: {},
					userInfo: { groups: ['admins', 'users'] },
				},
			});

			const result = await service.resolveRoles(config, context);

			expect(result.instanceRole).toBe('global:admin');
		});

		it('should evaluate expressions against $saml context', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ $saml.attributes.role === "admin" }}',
						role: 'global:admin',
					}),
				],
			});
			const context = makeContext({
				$claims: {},
				$provider: 'saml',
				$saml: { attributes: { role: 'admin' } },
			});

			const result = await service.resolveRoles(config, context);

			expect(result.instanceRole).toBe('global:admin');
		});

		it('should treat expressions that access non-existent paths as false', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ $claims.nonExistent.deep.path }}',
						role: 'global:admin',
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:member');
		});

		it('should treat throwing expressions as false and log a warning', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ throw new Error("bad") }}',
						role: 'global:admin',
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:member');
			expect(logger.warn).toHaveBeenCalledWith(
				'Role resolver expression evaluation failed, treating as false',
				expect.objectContaining({ expression: '{{ throw new Error("bad") }}' }),
			);
		});

		it('should not match truthy non-boolean values', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({ id: 'r1', expression: '{{ 1 }}', role: 'global:admin' }),
					makeRule({ id: 'r2', expression: '{{ "yes" }}', role: 'global:admin' }),
					makeRule({ id: 'r3', expression: '{{ [] }}', role: 'global:admin' }),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:member');
		});

		it('should match string "true"', async () => {
			const config = makeConfig({
				instanceRoleRules: [
					makeRule({ id: 'r1', expression: '{{ "true" }}', role: 'global:admin' }),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.instanceRole).toBe('global:admin');
		});
	});

	describe('resolveRoles - project role rules', () => {
		it('should assign roles per project with first-match-wins', async () => {
			const projects = [
				makeProject({ id: 'proj-1', name: 'Engineering' }),
				makeProject({ id: 'proj-2', name: 'Marketing' }),
			];
			projectRepository.find.mockResolvedValue(projects as never);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ true }}',
						role: 'project:admin',
						projectId: 'proj-1',
					}),
					makeRule({
						id: 'r2',
						expression: '{{ true }}',
						role: 'project:viewer',
						projectId: 'proj-1',
					}),
					makeRule({
						id: 'r3',
						expression: '{{ true }}',
						role: 'project:editor',
						projectId: 'proj-2',
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.projectRoles.get('proj-1')).toBe('project:admin');
			expect(result.projectRoles.get('proj-2')).toBe('project:editor');
		});

		it('should return empty map when no project rules match', async () => {
			const projects = [makeProject({ id: 'proj-1' })];
			projectRepository.find.mockResolvedValue(projects as never);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ false }}',
						role: 'project:admin',
						projectId: 'proj-1',
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.projectRoles.size).toBe(0);
		});

		it('should skip rules for non-existent projects with a warning', async () => {
			projectRepository.find.mockResolvedValue([]);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ true }}',
						role: 'project:admin',
						projectId: 'proj-deleted',
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.projectRoles.size).toBe(0);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping role mapping rule "r1": project "proj-deleted" not found',
			);
		});

		it('should make $project available in project role expressions', async () => {
			const projects = [makeProject({ id: 'proj-1', name: 'Engineering' })];
			projectRepository.find.mockResolvedValue(projects as never);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ $project.name === "Engineering" }}',
						role: 'project:admin',
						projectId: 'proj-1',
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.projectRoles.get('proj-1')).toBe('project:admin');
		});

		it('should allow expressions using both $claims and $project', async () => {
			const projects = [makeProject({ id: 'proj-1', name: 'engineering' })];
			projectRepository.find.mockResolvedValue(projects as never);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ $claims.groups.includes($project.name) }}',
						role: 'project:editor',
						projectId: 'proj-1',
					}),
				],
			});
			const context = makeContext({
				$claims: { groups: ['engineering', 'devops'] },
			});

			const result = await service.resolveRoles(config, context);

			expect(result.projectRoles.get('proj-1')).toBe('project:editor');
		});

		it('should allow expressions using $project.type', async () => {
			const projects = [makeProject({ id: 'proj-1', type: 'team' })];
			projectRepository.find.mockResolvedValue(projects as never);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ $project.type === "team" }}',
						role: 'project:viewer',
						projectId: 'proj-1',
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.projectRoles.get('proj-1')).toBe('project:viewer');
		});

		it('should skip disabled project rules', async () => {
			const projects = [makeProject({ id: 'proj-1' })];
			projectRepository.find.mockResolvedValue(projects as never);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ true }}',
						role: 'project:admin',
						projectId: 'proj-1',
						enabled: false,
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.projectRoles.size).toBe(0);
		});

		it('should skip project rules without projectId', async () => {
			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ true }}',
						role: 'project:admin',
						projectId: undefined,
					}),
				],
			});

			const result = await service.resolveRoles(config, makeContext());

			expect(result.projectRoles.size).toBe(0);
		});
	});

	describe('collectProjectInfoForRules', () => {
		it('should not query DB when there are no project rules', async () => {
			const config = makeConfig({ projectRoleRules: [] });

			await service.resolveRoles(config, makeContext());

			expect(projectRepository.find).not.toHaveBeenCalled();
		});

		it('should not query DB when all project rules are disabled', async () => {
			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ true }}',
						role: 'project:admin',
						projectId: 'proj-1',
						enabled: false,
					}),
				],
			});

			await service.resolveRoles(config, makeContext());

			expect(projectRepository.find).not.toHaveBeenCalled();
		});

		it('should fetch only projects referenced by enabled rules', async () => {
			projectRepository.find.mockResolvedValue([]);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ true }}',
						role: 'project:admin',
						projectId: 'proj-1',
					}),
					makeRule({
						id: 'r2',
						expression: '{{ true }}',
						role: 'project:editor',
						projectId: 'proj-2',
						enabled: false,
					}),
					makeRule({
						id: 'r3',
						expression: '{{ true }}',
						role: 'project:viewer',
						projectId: 'proj-3',
					}),
				],
			});

			await service.resolveRoles(config, makeContext());

			expect(projectRepository.find).toHaveBeenCalledTimes(1);
			const callArgs = projectRepository.find.mock.calls[0][0]!;
			expect(callArgs.select).toEqual(['id', 'name', 'type', 'description']);
		});

		it('should deduplicate project IDs', async () => {
			projectRepository.find.mockResolvedValue([]);

			const config = makeConfig({
				projectRoleRules: [
					makeRule({
						id: 'r1',
						expression: '{{ true }}',
						role: 'project:admin',
						projectId: 'proj-1',
					}),
					makeRule({
						id: 'r2',
						expression: '{{ false }}',
						role: 'project:viewer',
						projectId: 'proj-1',
					}),
				],
			});

			await service.resolveRoles(config, makeContext());

			expect(projectRepository.find).toHaveBeenCalledTimes(1);
		});
	});

	describe('resolveRoles - combined instance and project rules', () => {
		it('should resolve both instance and project roles together', async () => {
			const projects = [makeProject({ id: 'proj-1' })];
			projectRepository.find.mockResolvedValue(projects as never);

			const config = makeConfig({
				instanceRoleRules: [
					makeRule({
						id: 'ir1',
						expression: '{{ $claims.role === "admin" }}',
						role: 'global:admin',
					}),
				],
				projectRoleRules: [
					makeRule({
						id: 'pr1',
						expression: '{{ true }}',
						role: 'project:editor',
						projectId: 'proj-1',
					}),
				],
			});
			const context = makeContext({ $claims: { role: 'admin' } });

			const result = await service.resolveRoles(config, context);

			expect(result.instanceRole).toBe('global:admin');
			expect(result.projectRoles.get('proj-1')).toBe('project:editor');
		});
	});
});
