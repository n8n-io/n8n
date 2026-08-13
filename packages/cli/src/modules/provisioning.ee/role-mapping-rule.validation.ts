import type { Role } from '@n8n/db';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export function assertRoleCompatibleWithMappingType(
	role: Role,
	type: 'instance' | 'project',
): void {
	if (type === 'instance' && role.roleType !== 'global') {
		throw new BadRequestError('Instance mapping rules must use a global role');
	}

	if (type === 'project' && role.roleType !== 'project') {
		throw new BadRequestError('Project mapping rules must use a project role');
	}
}

/**
 * Returns the project id list to persist for the given mapping type.
 * For `project` rules, uses `explicitProjectIds` when provided, otherwise `fallbackWhenOmitted`.
 */
export function assertAndNormalizeProjectIdsForRuleType(
	type: 'instance' | 'project',
	explicitProjectIds: string[] | undefined,
	fallbackWhenOmitted: string[],
): string[] {
	if (type === 'instance') {
		if (explicitProjectIds !== undefined && explicitProjectIds.length > 0) {
			throw new BadRequestError('projectIds must be omitted or empty when type is instance');
		}
		return [];
	}

	const ids =
		explicitProjectIds !== undefined
			? [...new Set(explicitProjectIds)]
			: [...new Set(fallbackWhenOmitted)];

	if (ids.length === 0) {
		throw new BadRequestError('projectIds is required when type is project');
	}

	return ids;
}
