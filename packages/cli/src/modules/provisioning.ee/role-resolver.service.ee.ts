import { Logger } from '@n8n/backend-common';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { Expression, type IDataObject } from 'n8n-workflow';

import { withProjectContext } from './claims-context.builder';
import type {
	ProjectInfo,
	ResolvedRoles,
	RoleMappingConfig,
	RoleMappingRule,
	RoleResolverContext,
} from './role-resolver-types';

@Service()
export class RoleResolverService {
	constructor(
		private readonly logger: Logger,
		private readonly projectRepository: ProjectRepository,
	) {}

	async resolveRoles(
		config: RoleMappingConfig,
		context: RoleResolverContext,
	): Promise<ResolvedRoles> {
		const projects = await this.collectProjectInfoForRules(config.projectRoleRules);

		const instanceRole = this.resolveInstanceRole(
			config.instanceRoleRules,
			context,
			config.fallbackInstanceRole,
		);

		const projectRoles = this.resolveProjectRoles(config.projectRoleRules, context, projects);

		return { instanceRole, projectRoles };
	}

	private async collectProjectInfoForRules(
		rules: RoleMappingRule[],
	): Promise<Map<string, ProjectInfo>> {
		const projectIds = [
			...new Set(rules.filter((r) => r.enabled && r.projectId).map((r) => r.projectId as string)),
		];

		if (projectIds.length === 0) {
			return new Map();
		}

		const projects = await this.projectRepository.find({
			where: { id: In(projectIds) },
			select: ['id', 'name', 'type', 'description'],
		});

		const map = new Map<string, ProjectInfo>();
		for (const project of projects) {
			map.set(project.id, {
				id: project.id,
				name: project.name,
				type: project.type,
				description: project.description,
			});
		}
		return map;
	}

	private resolveInstanceRole(
		rules: RoleMappingRule[],
		context: RoleResolverContext,
		fallback: string,
	): string {
		for (const rule of rules) {
			if (!rule.enabled) continue;
			if (this.evaluateExpression(rule.expression, context)) {
				return rule.role;
			}
		}
		return fallback;
	}

	private resolveProjectRoles(
		rules: RoleMappingRule[],
		context: RoleResolverContext,
		projects: Map<string, ProjectInfo>,
	): Map<string, string> {
		const result = new Map<string, string>();

		for (const rule of rules) {
			if (!rule.enabled) continue;
			if (!rule.projectId) continue;
			if (result.has(rule.projectId)) continue;

			const project = projects.get(rule.projectId);
			if (!project) {
				this.logger.warn(
					`Skipping role mapping rule "${rule.id}": project "${rule.projectId}" not found`,
				);
				continue;
			}

			const enrichedContext = withProjectContext(context, project);
			if (this.evaluateExpression(rule.expression, enrichedContext)) {
				result.set(rule.projectId, rule.role);
			}
		}

		return result;
	}

	private evaluateExpression(expression: string, context: RoleResolverContext): boolean {
		try {
			const result = Expression.resolveWithoutWorkflow(
				expression,
				context as unknown as IDataObject,
			);
			return String(result) === 'true';
		} catch (error) {
			this.logger.warn('Role resolver expression evaluation failed, treating as false', {
				expression,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}
}
