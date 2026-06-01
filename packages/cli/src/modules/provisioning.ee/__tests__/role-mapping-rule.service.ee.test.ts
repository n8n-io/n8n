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
	const defaultUpdateSpy = jest.fn().mockResolvedValue(undefined);
	const defaultTransactionSpy = jest
		.fn()
		.mockImplementation(async (cb: (tx: { update: typeof defaultUpdateSpy }) => Promise<void>) => {
			await cb({ update: defaultUpdateSpy });
		});

	beforeEach(() => {
		jest.clearAllMocks();
		roleMappingRuleRepository.findOne.mockResolvedValue(null);
		// normalizeOrderForType calls find after every mutation; default to empty
		// so existing tests hit the early-exit path and require no transaction mock.
		roleMappingRuleRepository.find.mockResolvedValue([]);
		// create() always calls applyOrder (which uses a transaction) to splice the
		// newly-saved rule into the existing order. Inner describes may override.
		(roleMappingRuleRepository as unknown as Record<string, unknown>).manager = {
			transaction: defaultTransactionSpy,
		};
		defaultUpdateSpy.mockClear();
		defaultTransactionSpy.mockClear();
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

		it('should append when order is omitted', async () => {
			roleRepository.findOne.mockResolvedValue(globalRole);
			roleMappingRuleRepository.find.mockResolvedValue([
				{ id: 'rule-a', order: 0 } as RoleMappingRule,
				{ id: 'rule-b', order: 1 } as RoleMappingRule,
			]);

			const savedRule = {
				id: 'rule-c',
				expression: 'claims.c',
				role: globalRole,
				type: 'instance',
				order: 2,
				projects: [],
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2025-01-01T00:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockImplementation(async (r) => ({
				...(r as RoleMappingRule),
				id: 'rule-c',
			}));
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(savedRule);

			await service.create({
				expression: 'claims.c',
				role: globalRole.slug,
				type: 'instance',
			});

			// applyOrder should renumber [rule-a, rule-b, rule-c] to [0, 1, 2]
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-a' },
				{ order: 0 },
			);
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-b' },
				{ order: 1 },
			);
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-c' },
				{ order: 2 },
			);
		});

		it('should insert at index 0 and shift existing rules down', async () => {
			roleRepository.findOne.mockResolvedValue(globalRole);
			roleMappingRuleRepository.find.mockResolvedValue([
				{ id: 'rule-a', order: 0 } as RoleMappingRule,
				{ id: 'rule-b', order: 1 } as RoleMappingRule,
			]);

			const savedRule = {
				id: 'rule-new',
				expression: 'claims.new',
				role: globalRole,
				type: 'instance',
				order: 0,
				projects: [],
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2025-01-01T00:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockImplementation(async (r) => ({
				...(r as RoleMappingRule),
				id: 'rule-new',
			}));
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(savedRule);

			await service.create({
				expression: 'claims.new',
				role: globalRole.slug,
				type: 'instance',
				order: 0,
			});

			// applyOrder should renumber [rule-new, rule-a, rule-b] to [0, 1, 2]
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-new' },
				{ order: 0 },
			);
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-a' },
				{ order: 1 },
			);
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-b' },
				{ order: 2 },
			);
		});

		it('should clamp supplied order beyond existing list length to the end', async () => {
			roleRepository.findOne.mockResolvedValue(globalRole);
			roleMappingRuleRepository.find.mockResolvedValue([
				{ id: 'rule-a', order: 0 } as RoleMappingRule,
			]);

			const savedRule = {
				id: 'rule-new',
				expression: 'claims.new',
				role: globalRole,
				type: 'instance',
				order: 1,
				projects: [],
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2025-01-01T00:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.save.mockImplementation(async (r) => ({
				...(r as RoleMappingRule),
				id: 'rule-new',
			}));
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue(savedRule);

			await service.create({
				expression: 'claims.new',
				role: globalRole.slug,
				type: 'instance',
				order: 999,
			});

			// Clamped to end: [rule-a, rule-new] → orders [0, 1]
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-a' },
				{ order: 0 },
			);
			expect(defaultUpdateSpy).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'rule-new' },
				{ order: 1 },
			);
		});
	});

	describe('list', () => {
		it('should return paginated rules with default order sort', async () => {
			const ruleA = {
				id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
				expression: 'a',
				role: globalRole,
				type: 'instance',
				order: 0,
				projects: [],
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2025-01-01T00:00:00.000Z'),
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.findAndCount.mockResolvedValue([[ruleA], 1]);

			const result = await service.list({ skip: 0, take: 10 });

			expect(result.count).toBe(1);
			expect(result.items).toHaveLength(1);
			expect(result.items[0]).toMatchObject({
				id: ruleA.id,
				expression: 'a',
				order: 0,
				type: 'instance',
			});

			expect(roleMappingRuleRepository.findAndCount).toHaveBeenCalledWith({
				where: {},
				relations: ['projects', 'role'],
				order: { order: 'ASC', id: 'ASC' },
				skip: 0,
				take: 10,
			});
		});

		it('should filter by type and apply sortBy', async () => {
			roleMappingRuleRepository.findAndCount.mockResolvedValue([[], 0]);

			await service.list({
				skip: 0,
				take: 5,
				type: 'project',
				sortBy: 'createdAt:desc',
			});

			expect(roleMappingRuleRepository.findAndCount).toHaveBeenCalledWith({
				where: { type: 'project' },
				relations: ['projects', 'role'],
				order: { createdAt: 'DESC', id: 'ASC' },
				skip: 0,
				take: 5,
			});
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

	describe('delete', () => {
		const rule = {
			id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			expression: 'true',
			role: globalRole,
			type: 'instance',
			order: 0,
			projects: [],
			createdAt: new Date('2025-01-01T00:00:00.000Z'),
			updatedAt: new Date('2025-01-01T00:00:00.000Z'),
		} as unknown as RoleMappingRule;

		it('should reject an empty id', async () => {
			await expect(service.delete('')).rejects.toThrow(BadRequestError);
		});

		it('should return 404 when rule id is unknown', async () => {
			roleMappingRuleRepository.findOne.mockResolvedValue(null);

			await expect(service.delete('00000000-0000-4000-8000-000000000000')).rejects.toThrow(
				NotFoundError,
			);
			expect(roleMappingRuleRepository.remove).not.toHaveBeenCalled();
		});

		it('should remove the rule when it exists', async () => {
			roleMappingRuleRepository.findOne.mockResolvedValue(rule);
			roleMappingRuleRepository.remove.mockResolvedValue(rule);

			await service.delete(rule.id);

			expect(roleMappingRuleRepository.remove).toHaveBeenCalledWith(rule);
		});
	});

	describe('deleteAllOfType', () => {
		it('should delete all rules of the given type using the direct repository when no tx is provided', async () => {
			roleMappingRuleRepository.delete.mockResolvedValue({ affected: 3, raw: {} });

			const count = await service.deleteAllOfType('project');

			expect(roleMappingRuleRepository.delete).toHaveBeenCalledWith({ type: 'project' });
			expect(count).toBe(3);
		});

		it('should use the transactional repository when an EntityManager is provided', async () => {
			const txRepoDelete = jest.fn().mockResolvedValue({ affected: 2, raw: {} });
			const txRepository = { delete: txRepoDelete };
			const getRepository = jest.fn().mockReturnValue(txRepository);
			const tx = { getRepository } as unknown as Parameters<typeof service.deleteAllOfType>[1];

			const count = await service.deleteAllOfType('instance', tx);

			expect(getRepository).toHaveBeenCalled();
			expect(txRepoDelete).toHaveBeenCalledWith({ type: 'instance' });
			expect(count).toBe(2);
			expect(roleMappingRuleRepository.delete).not.toHaveBeenCalled();
		});

		it('should return 0 when no rows match', async () => {
			roleMappingRuleRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

			const count = await service.deleteAllOfType('project');

			expect(count).toBe(0);
		});

		it('should treat missing affected count as 0', async () => {
			roleMappingRuleRepository.delete.mockResolvedValue({ affected: undefined, raw: {} });

			const count = await service.deleteAllOfType('project');

			expect(count).toBe(0);
		});
	});

	describe('move', () => {
		const updateSpy = jest.fn().mockResolvedValue(undefined);
		const transactionSpy = jest.fn().mockImplementation(async (cb) => {
			await cb({ update: updateSpy });
		});

		beforeEach(() => {
			(roleMappingRuleRepository as unknown as Record<string, unknown>).manager = {
				transaction: transactionSpy,
			};
			updateSpy.mockClear();
			transactionSpy.mockClear();
		});

		const makeRule = (id: string, order: number, type = 'instance') =>
			({
				id,
				order,
				type,
				role: { slug: 'global:member' },
				projects: [],
			}) as unknown as RoleMappingRule;

		it('should throw NotFoundError when rule does not exist', async () => {
			roleMappingRuleRepository.findOne.mockResolvedValue(null);

			await expect(service.move('nonexistent', 0)).rejects.toThrow(NotFoundError);
		});

		it('should move first rule to last position', async () => {
			const rules = [makeRule('a', 0), makeRule('b', 1), makeRule('c', 2)];
			roleMappingRuleRepository.findOne.mockResolvedValue(rules[0]);
			roleMappingRuleRepository.find.mockResolvedValue(rules);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue({
				...rules[0],
				order: 2,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as RoleMappingRule);

			await service.move('a', 2);

			// Verify applyOrder called with correct sequence: b, c, a
			expect(transactionSpy).toHaveBeenCalledTimes(1);
		});

		it('should move last rule to first position', async () => {
			const rules = [makeRule('a', 0), makeRule('b', 1), makeRule('c', 2)];
			roleMappingRuleRepository.findOne.mockResolvedValue(rules[2]);
			roleMappingRuleRepository.find.mockResolvedValue(rules);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue({
				...rules[2],
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as RoleMappingRule);

			await service.move('c', 0);

			expect(transactionSpy).toHaveBeenCalledTimes(1);
		});

		it('should clamp targetIndex to last position when out of bounds', async () => {
			const rules = [makeRule('a', 0), makeRule('b', 1)];
			roleMappingRuleRepository.findOne.mockResolvedValue(rules[0]);
			roleMappingRuleRepository.find.mockResolvedValue(rules);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue({
				...rules[0],
				order: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as RoleMappingRule);

			// targetIndex 999 should clamp to 1 (last valid index)
			await service.move('a', 999);

			expect(transactionSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('normalizeOrderForType', () => {
		const makeRule = (id: string, order: number, type = 'instance') =>
			({ id, order, type }) as unknown as RoleMappingRule;

		const updateSpy = jest.fn().mockResolvedValue(undefined);
		const transactionSpy = jest.fn();

		beforeEach(() => {
			updateSpy.mockClear();
			transactionSpy.mockImplementation(
				async (cb: (tx: { update: typeof updateSpy }) => Promise<void>) => {
					await cb({ update: updateSpy });
				},
			);
			// jest-mock-extended creates a Proxy; assigning manager directly
			// is the reliable way to inject the transaction mock.
			(roleMappingRuleRepository as unknown as Record<string, unknown>).manager = {
				transaction: transactionSpy,
			};
		});

		it('should not call transaction when sequence has no gaps', async () => {
			roleMappingRuleRepository.find.mockResolvedValue([
				makeRule('a', 0),
				makeRule('b', 1),
				makeRule('c', 2),
			]);

			roleMappingRuleRepository.findOne.mockResolvedValue(makeRule('a', 0));
			roleMappingRuleRepository.remove.mockResolvedValue(makeRule('a', 0));

			await service.delete('a');

			expect(transactionSpy).not.toHaveBeenCalled();
		});

		it('should renumber rules to close a gap after delete', async () => {
			// Simulates [0, 2, 3] after deleting the rule at order 1
			roleMappingRuleRepository.find.mockResolvedValue([
				makeRule('a', 0),
				makeRule('b', 2),
				makeRule('c', 3),
			]);

			roleMappingRuleRepository.findOne.mockResolvedValue(makeRule('x', 0));
			roleMappingRuleRepository.remove.mockResolvedValue(makeRule('x', 0));

			await service.delete('x');

			expect(transactionSpy).toHaveBeenCalledTimes(1);

			// Phase 2 should assign contiguous orders 0, 1, 2
			expect(updateSpy).toHaveBeenCalledWith(expect.anything(), { id: 'a' }, { order: 0 });
			expect(updateSpy).toHaveBeenCalledWith(expect.anything(), { id: 'b' }, { order: 1 });
			expect(updateSpy).toHaveBeenCalledWith(expect.anything(), { id: 'c' }, { order: 2 });
		});

		it('should normalize both types when type changes during patch', async () => {
			const existingRule = {
				id: 'rule-1',
				expression: 'true',
				role: globalRole,
				type: 'instance',
				order: 1,
				projects: [],
			} as unknown as RoleMappingRule;

			roleMappingRuleRepository.findOne.mockImplementation(async (opts) => {
				if (opts?.where && 'id' in opts.where) return existingRule;
				return null;
			});
			roleMappingRuleRepository.save.mockResolvedValue(existingRule);
			roleMappingRuleRepository.findOneOrFail.mockResolvedValue({
				...existingRule,
				type: 'project',
				role: projectRole,
				projects: [{ id: 'p1' } as Project],
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
				updatedAt: new Date('2025-01-01T00:00:00.000Z'),
			} as unknown as RoleMappingRule);
			projectRepository.findBy.mockResolvedValue([{ id: 'p1' } as Project]);
			roleRepository.findOne.mockResolvedValue(projectRole);

			roleMappingRuleRepository.find
				.mockResolvedValueOnce([makeRule('rule-1', 0, 'project')]) // new type: project — no gap
				.mockResolvedValueOnce([
					makeRule('rule-2', 0, 'instance'),
					makeRule('rule-3', 2, 'instance'),
				]); // old type: instance has gap

			await service.patch('rule-1', {
				type: 'project',
				role: projectRole.slug,
				projectIds: ['p1'],
				order: 0,
			});

			// Called twice: once for new type (project), once for old type (instance)
			expect(roleMappingRuleRepository.find).toHaveBeenCalledTimes(2);
			// Project sequence has no gap — no transaction needed for it
			// Instance sequence has gap [0, 2] — transaction called once
			expect(transactionSpy).toHaveBeenCalledTimes(1);
		});
	});
});
