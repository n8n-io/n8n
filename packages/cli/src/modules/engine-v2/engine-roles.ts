import { ENGINE_ROLES, type EngineRole } from '@n8n/engine';
import { UserError } from '@n8n/errors';

/** Reads the `--roles` flag of `n8n engine`. Without the flag, the process runs every role. */
export function parseEngineRoles(flag: string | undefined): readonly EngineRole[] {
	if (flag === undefined) return ENGINE_ROLES;

	const names = flag
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	const unknown = [...new Set(names)].filter((name) => !ENGINE_ROLES.some((role) => role === name));
	const validRoles = `The valid roles are ${ENGINE_ROLES.join(', ')}.`;

	if (unknown.length > 0) {
		const noun = unknown.length === 1 ? 'role' : 'roles';
		throw new UserError(`Unknown engine ${noun}: ${unknown.join(', ')}. ${validRoles}`);
	}

	if (names.length === 0) {
		throw new UserError(`Give at least one engine role in --roles. ${validRoles}`);
	}

	return ENGINE_ROLES.filter((role) => names.includes(role));
}
