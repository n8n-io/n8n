import { ENGINE_ROLES, type EngineRole } from '@n8n/engine';
import { UserError } from '@n8n/errors';

/**
 * Reads the roles of `n8n engine`: the `--roles` flag, else `N8N_ENGINE_ROLES`,
 * else every role. An empty variable counts as unset, an empty flag does not.
 */
export function parseEngineRoles(flag: string | undefined, envValue = ''): readonly EngineRole[] {
	if (flag !== undefined) return parseRoleList(flag, '--roles');
	if (envValue !== '') return parseRoleList(envValue, 'N8N_ENGINE_ROLES');
	return ENGINE_ROLES;
}

function parseRoleList(value: string, source: string): readonly EngineRole[] {
	const names = value
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	const unknown = [...new Set(names)].filter((name) => !ENGINE_ROLES.some((role) => role === name));
	const validRoles = `The valid roles are ${ENGINE_ROLES.join(', ')}.`;

	if (unknown.length > 0) {
		const noun = unknown.length === 1 ? 'role' : 'roles';
		throw new UserError(
			`Unknown engine ${noun} in ${source}: ${unknown.join(', ')}. ${validRoles}`,
		);
	}

	if (names.length === 0) {
		throw new UserError(
			`Give at least one engine role in ${source}. Got "${value}". ${validRoles}`,
		);
	}

	return ENGINE_ROLES.filter((role) => names.includes(role));
}
