const MAX_KEY_LENGTH = 64;

/**
 * Turns a display name into a binding key that satisfies the API's
 * `/^[a-z][a-z0-9-]{0,63}$/`, appending `-2`, `-3`, … while the key is taken.
 */
export function deriveBindingKey(name: string, taken: string[]): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const base = (/^[a-z]/.test(slug) ? slug : `w-${slug}`.replace(/-+$/, '')).slice(
		0,
		MAX_KEY_LENGTH,
	);

	const takenKeys = new Set(taken);
	if (!takenKeys.has(base)) return base;
	for (let suffix = 2; ; suffix++) {
		const tail = `-${suffix}`;
		const candidate = `${base.slice(0, MAX_KEY_LENGTH - tail.length)}${tail}`;
		if (!takenKeys.has(candidate)) return candidate;
	}
}
