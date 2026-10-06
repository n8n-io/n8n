import { isRecord } from '@n8n/utils/is-record';

const DATA_VALUED_KEYS = new Set(['example', 'examples', 'default', 'enum']);

/**
 * Adds `type: object` in place to every `oneOf` whose members are all objects. zod-to-openapi
 * emits a discriminated union as a bare `oneOf`, and its metadata cannot add a sibling `type`
 * without replacing the union.
 */
export function addObjectTypeToObjectUnions(node: unknown): void {
	if (Array.isArray(node)) {
		node.forEach((item) => addObjectTypeToObjectUnions(item));
		return;
	}

	if (!isRecord(node)) {
		return;
	}

	const members = node.oneOf;
	if (
		node.type === undefined &&
		Array.isArray(members) &&
		members.length > 0 &&
		members.every((member) => isRecord(member) && member.type === 'object')
	) {
		node.type = 'object';
	}

	for (const [key, value] of Object.entries(node)) {
		if (DATA_VALUED_KEYS.has(key)) {
			continue;
		}
		addObjectTypeToObjectUnions(value);
	}
}
