import { appBindingKeySchema, type AppBindingKind } from '@n8n/api-types';

const MAX_KEY_LENGTH = 64;

const KIND_PREFIX: Record<AppBindingKind, string> = {
	workflow: 'workflow',
	dataTable: 'table',
	agent: 'agent',
};

function camelCase(name: string) {
	const words = name
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean);
	return words
		.map((word, index) =>
			index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1),
		)
		.join('');
}

export function deriveBindingKey(
	name: string,
	kind: AppBindingKind,
	takenKeys: Iterable<string>,
): string {
	const taken = new Set(takenKeys);
	let base = camelCase(name);
	if (!/^[a-z]/.test(base)) {
		base = KIND_PREFIX[kind] + base.charAt(0).toUpperCase() + base.slice(1);
	}
	let key = base.slice(0, MAX_KEY_LENGTH);
	for (let suffix = 2; taken.has(key); suffix++) {
		key = base.slice(0, MAX_KEY_LENGTH - String(suffix).length) + suffix;
	}
	return appBindingKeySchema.parse(key);
}
