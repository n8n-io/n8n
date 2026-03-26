import { mock } from 'jest-mock-extended';

import { RoleMappingRuleService } from '@/modules/provisioning.ee/role-mapping-rule.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type {
	Project,
	ProjectRepository,
	Role,
	RoleMappingRule,
	RoleMappingRuleRepository,
	RoleRepository,
} from '@n8n/db';

const roleMappingRuleRepository = mock<RoleMappingRuleRepository>();
const roleRepository = mock<RoleRepository>();
const projectRepository = mock<ProjectRepository>();

const service = new RoleMappingRuleService(
	roleMappingRuleRepository,
	roleRepository,
	projectRepository,
);

const globalRole: Role = {
	slug: 'global:member',
	displayName: 'Member',
	description: null,
	systemRole: true,
	roleType: 'global',
	projectRelations: [],
	roleMappingRules: [],
	scopes: [],
	createdAt: new Date(),
	updatedAt: new Date(),
	setUpdateDate: () => {},
};

const projectRole: Role = {
	slug: 'project:editor',
	displayName: 'Editor',
	description: null,
	systemRole: true,
	roleType: 'project',
	projectRelations: [],
	roleMappingRules: [],
	scopes: [],
	createdAt: new Date(),
	updatedAt: new Date(),
	setUpdateDate: () => {},
};

describe('RoleMappingRuleService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		roleMappingRuleRepository.findOne.mockResolvedValue(null);
	});

	describe('create', () => {
		it('should reject project type without projectIds', async () => {
			await expect(
				service.create({
					expression: 'true',
					role: 'project:editor',
					type: 'project',
					order: 0,
				}),
			).rejects.toThrow(BadRequestError);

			await expect(
				service.create({
					expression: 'true',
					role: 'project:editor',
					type: 'project',
					order: 0,
					projectIds: [],
				}),
			).rejects.toThrow(BadRequestError);
		});

		it('should reject instance type with non-empty projectIds', async () => {
			await expect(
				service.create({
					expression: 'true',
					role: 'global:member',
					type: 'instance',
					order: 0,
					projectIds: ['proj-1'],
				}),
			).rejects.toThrow(BadRequestError);
		});

		it('should reject when role slug is unknown', async () => {
			roleRepository.findOne.mockResolvedValue(null);

			await expect(
				service.create({
					expression: 'true',
					role: 'global:missing',
					type: 'instance',
					order: 0,
				}),
			).rejects.toThrow(NotFoundError);
		});

		it('should reject instance rule with a non-global role', async () => {
			roleRepository.findOne.mockResolvedValue(projectRole);

			await expect(
				service.create({
					expression: 'true',
					role: 'project:editor',
					type: 'instance',
					order: 0,
				}),
			).rejects.toThrow(BadRequestError);
		});

		it('should reject project rule with a non-project role', async () => {
			roleRepository.findOne.mockResolvedValue(globalRole);

			await expect(
				service.create({
					expression: 'true',
					role: 'global:member',
					type: 'project',
					order: 0,
					projectIds: ['p1'],
				}),
			).rejects.toThrow(BadRequestError);
		});

		it('should reject when another rule already uses the same type and order', async () => {
			roleRepository.findOne.mockResolvedValue(globalRole);
			roleMappingRuleRepository.findOne.mockResolvedValue({
				id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
			} as RoleMappingRule);

			await expect(
				service.create({
					expression: 'true',
					role: globalRole.slug,
					type: 'instance',
					order: 2,
				}),
			).rejects.toThrow(ConflictError);
		});

		it('should reject when some project ids do not exist', async () => {
			roleRepository.findOne.mockResolvedValue(projectRole);
			projectRepository.findBy.mockResolvedValue([{ id: 'p1' } as Project]);

			await expect(
				service.create({
					expression: 'true',
					role: 'project:editor',
					type: 'project',
					order: 0,
					projectIds: ['p1', 'p2'],
				}),
			).rejects.toThrow(BadRequestError);
		});

		it('should create an instance rule and return a response DTO', async () => {
			roleRepository.findOne.mockResolvedValue(globalRole);

			const savedRule = {
				id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
				expression: 'claims.group === "admins"',
				role: globalRole,
				type: 'instance',
				order: 2,
				projects: [],
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2025-01-01T00:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockImplementation(async (r) => {
				expect(r).toBeInstanceOf(Object);
				return { ...savedRule } as unknown as RoleMappingRule;
			});

			const loadedRule = {
				...savedRule,
				role: globalRole,
				projects: [],
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(loadedRule);

			const result = await service.create({
				expression: savedRule.expression,
				role: globalRole.slug,
				type: 'instance',
				order: 2,
			});

			expect(result).toEqual({
				id: savedRule.id,
				expression: savedRule.expression,
				role: globalRole.slug,
				type: 'instance',
				order: 2,
				projectIds: [],
				createdAt: '2025-01-01T00:00:00.000Z',
				updatedAt: '2025-01-01T00:00:00.000Z',
			});

			expect(roleMappingRuleRepository.save).toHaveBeenCalledTimes(1);
			expect(projectRepository.findBy).not.toHaveBeenCalled();
		});

		it('should create a project rule linked to projects', async () => {
			roleRepository.findOne.mockResolvedValue(projectRole);

			const projA = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as Project;
			const projB = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } as Project;
			projectRepository.findBy.mockResolvedValue([projA, projB]);

			const savedRule = {
				id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
				expression: 'true',
				role: projectRole,
				type: 'project',
				order: 1,
				projects: [projA, projB],
				createdAt: new Date('2025-02-01T12:00:00.000Z'),
				updatedAt: new Date('2025-02-01T12:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockResolvedValue({
				...savedRule,
			} as unknown as RoleMappingRule);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(savedRule);

			const projectIds = [projA.id, projB.id];
			const result = await service.create({
				expression: 'true',
				role: projectRole.slug,
				type: 'project',
				order: 1,
				projectIds,
			});

			expect(result.projectIds).toEqual(expect.arrayContaining(projectIds));
			expect(result.projectIds).toHaveLength(2);
			expect(result.type).toBe('project');
			expect(projectRepository.findBy).toHaveBeenCalled();
		});

		it('should dedupe duplicate projectIds before loading projects', async () => {
			roleRepository.findOne.mockResolvedValue(projectRole);

			const projA = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as Project;
			projectRepository.findBy.mockResolvedValue([projA]);

			const savedRule = {
				id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
				expression: 'true',
				role: projectRole,
				type: 'project',
				order: 1,
				projects: [projA],
				createdAt: new Date('2025-02-01T12:00:00.000Z'),
				updatedAt: new Date('2025-02-01T12:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockResolvedValue({
				...savedRule,
			} as unknown as RoleMappingRule);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(savedRule);

			const result = await service.create({
				expression: 'true',
				role: projectRole.slug,
				type: 'project',
				order: 1,
				projectIds: [projA.id, projA.id],
			});

			expect(result.projectIds).toEqual([projA.id]);
			expect(projectRepository.findBy).toHaveBeenCalledTimes(1);
		});
	});

	describe('patch', () => {
		const existingInstanceRule = {
			id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			expression: 'claims.group === "admins"',
			role: globalRole,
			type: 'instance',
			order: 0,
			projects: [],
			createdAt: new Date('2025-01-01T00:00:00.000Z'),
			updatedAt: new Date('2025-01-01T00:00:00.000Z'),
		} as unknown as RoleMappingRule;

		beforeEach(() => {
			roleMappingRuleRepository.findOne.mockImplementation(async (options) => {
				if (
					options?.where &&
					'id' in options.where &&
					options.where.id === existingInstanceRule.id
				) {
					return {
						...existingInstanceRule,
						role: globalRole,
						projects: [],
					} as unknown as RoleMappingRule;
				}
				return null;
			});
		});

		it('should return 404 when rule id is unknown', async () => {
			await expect(
				service.patch('00000000-0000-4000-8000-000000000000', { expression: 'true' }),
			).rejects.toThrow(NotFoundError);
		});

		it('should reject an empty patch payload', async () => {
			await expect(service.patch(existingInstanceRule.id, {})).rejects.toThrow(BadRequestError);
		});

		it('should update expression and return loaded rule', async () => {
			const updatedRule = {
				...existingInstanceRule,
				expression: 'claims.new === 1',
				role: globalRole,
				projects: [],
				updatedAt: new Date('2025-06-01T00:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockImplementation(async (r) => r as RoleMappingRule);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(updatedRule);

			const result = await service.patch(existingInstanceRule.id, {
				expression: 'claims.new === 1',
			});

			expect(result.expression).toBe('claims.new === 1');
			expect(result.role).toBe(globalRole.slug);
			expect(roleMappingRuleRepository.save).toHaveBeenCalledTimes(1);
		});

		it('should return 409 when order collides with another rule', async () => {
			const otherId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
			roleMappingRuleRepository.findOne.mockImplementation(async (options) => {
				if (
					options?.where &&
					'id' in options.where &&
					options.where.id === existingInstanceRule.id
				) {
					return {
						...existingInstanceRule,
						role: globalRole,
						projects: [],
					} as unknown as RoleMappingRule;
				}
				if (
					options?.where &&
					'type' in options.where &&
					options.where.type === 'instance' &&
					options.where.order === 5
				) {
					return { id: otherId } as unknown as RoleMappingRule;
				}
				return null;
			});

			await expect(service.patch(existingInstanceRule.id, { order: 5 })).rejects.toThrow(
				ConflictError,
			);
		});

		it('should allow patch that keeps the same type and order', async () => {
			roleMappingRuleRepository.findOne.mockImplementation(async (options) => {
				if (
					options?.where &&
					'id' in options.where &&
					options.where.id === existingInstanceRule.id
				) {
					return {
						...existingInstanceRule,
						role: globalRole,
						projects: [],
					} as unknown as RoleMappingRule;
				}
				if (
					options?.where &&
					'type' in options.where &&
					'order' in options.where &&
					options.where.type === 'instance' &&
					options.where.order === 0
				) {
					return { ...existingInstanceRule } as unknown as RoleMappingRule;
				}
				return null;
			});

			const updatedRule = {
				...existingInstanceRule,
				expression: 'true',
				role: globalRole,
				projects: [],
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockImplementation(async (r) => r as RoleMappingRule);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(updatedRule);

			await expect(
				service.patch(existingInstanceRule.id, { expression: 'true' }),
			).resolves.toMatchObject({ order: 0, type: 'instance' });
		});
	});
});
