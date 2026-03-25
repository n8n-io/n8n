import { CreateRoleMappingRuleDto } from '@n8n/api-types';
import type { z } from 'zod';
import {
	ProjectRepository,
	RoleMappingRule,
	RoleMappingRuleRepository,
	RoleRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
		if (dto.type === 'project') {
			if (!dto.projectIds?.length) {
				throw new BadRequestError('projectIds is required when type is project');
			}
		} else if (dto.projectIds !== undefined && dto.projectIds.length > 0) {
			throw new BadRequestError('projectIds must be omitted or empty when type is instance');
		}

		const role = await this.roleRepository.findOne({ where: { slug: dto.role } });
		if (!role) {
			throw new NotFoundError(`Could not find role with slug "${dto.role}"`);
		}

		if (dto.type === 'instance' && role.roleType !== 'global') {
			throw new BadRequestError('Instance mapping rules must use a global role');
		}

		if (dto.type === 'project' && role.roleType !== 'project') {
			throw new BadRequestError('Project mapping rules must use a project role');
		}

		const projectIds = dto.type === 'project' ? (dto.projectIds ?? []) : [];
		const projects =
			projectIds.length > 0 ? await this.projectRepository.findBy({ id: In(projectIds) }) : [];

		if (projects.length !== projectIds.length) {
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
