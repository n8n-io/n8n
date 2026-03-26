import { CreateRoleMappingRuleDto, type PatchRoleMappingRuleInput } from '@n8n/api-types';
import {
	ProjectRepository,
	RoleMappingRule,
	RoleMappingRuleRepository,
	RoleRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import type { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	assertAndNormalizeProjectIdsForRuleType,
	assertRoleCompatibleWithMappingType,
} from './role-mapping-rule.validation';

type CreateRoleMappingRuleInput = z.infer<(typeof CreateRoleMappingRuleDto)['schema']>;

export type RoleMappingRuleResponse = {
	id: string;
	expression: string;
	role: string;
	type: 'instance' | 'project';
	order: number;
	projectIds: string[];
	createdAt: string;
	updatedAt: string;
};

@Service()
export class RoleMappingRuleService {
	constructor(
		private readonly roleMappingRuleRepository: RoleMappingRuleRepository,
		private readonly roleRepository: RoleRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	async create(dto: CreateRoleMappingRuleInput): Promise<RoleMappingRuleResponse> {
		const uniqueProjectIds = assertAndNormalizeProjectIdsForRuleType(dto.type, dto.projectIds, []);

		const role = await this.roleRepository.findOne({ where: { slug: dto.role } });
		if (!role) {
			throw new NotFoundError(`Could not find role with slug "${dto.role}"`);
		}

		assertRoleCompatibleWithMappingType(role, dto.type);

		await this.assertOrderAvailable(dto.type, dto.order);

		const projects =
			uniqueProjectIds.length > 0
				? await this.projectRepository.findBy({ id: In(uniqueProjectIds) })
				: [];

		if (projects.length !== uniqueProjectIds.length) {
			throw new BadRequestError('One or more projects were not found');
		}

		const rule = new RoleMappingRule();
		rule.expression = dto.expression;
		rule.role = role;
		rule.type = dto.type;
		rule.order = dto.order;
		rule.projects = projects;

		const saved = await this.roleMappingRuleRepository.save(rule);

		const loaded = await this.roleMappingRuleRepository.findOneOrFail({
			where: { id: saved.id },
			relations: ['projects', 'role'],
		});

		return this.toResponse(loaded);
	}

	async patch(id: string, dto: PatchRoleMappingRuleInput): Promise<RoleMappingRuleResponse> {
		if (typeof id !== 'string' || id.length === 0) {
			throw new BadRequestError('Rule id is required');
		}

		if (dto === undefined || dto === null || Object.keys(dto).length === 0) {
			throw new BadRequestError('At least one field is required');
		}

		const rule = await this.roleMappingRuleRepository.findOne({
			where: { id },
			relations: ['projects', 'role'],
		});

		if (!rule) {
			throw new NotFoundError('Could not find role mapping rule');
		}

		const mergedType = dto.type ?? (rule.type as 'instance' | 'project');
		const mergedOrder = dto.order ?? rule.order;
		const mergedExpression = dto.expression ?? rule.expression;
		const mergedRoleSlug = dto.role ?? rule.role.slug;

		const fallbackProjectIds = rule.projects.map((p) => p.id);
		const uniqueProjectIds = assertAndNormalizeProjectIdsForRuleType(
			mergedType,
			dto.projectIds,
			fallbackProjectIds,
		);

		const role =
			mergedRoleSlug === rule.role.slug
				? rule.role
				: await this.roleRepository.findOne({ where: { slug: mergedRoleSlug } });

		if (!role) {
			throw new NotFoundError(`Could not find role with slug "${mergedRoleSlug}"`);
		}

		assertRoleCompatibleWithMappingType(role, mergedType);

		await this.assertOrderAvailable(mergedType, mergedOrder, id);

		const projects =
			uniqueProjectIds.length > 0
				? await this.projectRepository.findBy({ id: In(uniqueProjectIds) })
				: [];

		if (projects.length !== uniqueProjectIds.length) {
			throw new BadRequestError('One or more projects were not found');
		}

		rule.expression = mergedExpression;
		rule.role = role;
		rule.type = mergedType;
		rule.order = mergedOrder;
		rule.projects = projects;

		await this.roleMappingRuleRepository.save(rule);

		const loaded = await this.roleMappingRuleRepository.findOneOrFail({
			where: { id: rule.id },
			relations: ['projects', 'role'],
		});

		return this.toResponse(loaded);
	}

	private async assertOrderAvailable(
		type: 'instance' | 'project',
		order: number,
		excludeRuleId?: string,
	): Promise<void> {
		const existingAtOrder = await this.roleMappingRuleRepository.findOne({
			where: { type, order },
		});

		if (existingAtOrder && existingAtOrder.id !== excludeRuleId) {
			throw new ConflictError(
				`A role mapping rule already exists with type "${type}" and order ${order}. Use a different order value.`,
			);
		}
	}

	private toResponse(loaded: RoleMappingRule): RoleMappingRuleResponse {
		return {
			id: loaded.id,
			expression: loaded.expression,
			role: loaded.role.slug,
			type: loaded.type as 'instance' | 'project',
			order: loaded.order,
			projectIds: loaded.projects.map((p) => p.id),
			createdAt: loaded.createdAt.toISOString(),
			updatedAt: loaded.updatedAt.toISOString(),
		};
	}
}
