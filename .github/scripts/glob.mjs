/**
 * Minimal glob matcher for changed-file paths.
 *
 * Supports `**` (any number of path segments), `*` (any run of characters
 * inside one segment) and literal text. Dot segments match like any other,
 * so patterns reach files under `.github/`. Only node builtins, so scripts
 * that run through `run-workflow-script` can use it without an install.
 */

/** @type { Map<string, RegExp> } */
const cache = new Map();

/**
 * @param { string } pattern
 * @returns { RegExp }
 */
export function globToRegExp(pattern) {
	const cached = cache.get(pattern);
	if (cached) return cached;

	let source = '';
	const segments = pattern.split('/');
	for (const [index, segment] of segments.entries()) {
		const last = index === segments.length - 1;
		if (segment === '**') {
			// `**/` matches zero or more segments; a trailing `**` matches the rest.
			source += last ? '.*' : '(?:[^/]+/)*';
			continue;
		}
		source += segment
			.split('*')
			.map((literal) => literal.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
			.join('[^/]*');
		if (!last) source += '/';
	}

	const regExp = new RegExp(`^${source}$`);
	cache.set(pattern, regExp);
	return regExp;
}

/**
 * @param { string } file Repository-relative path with `/` separators.
 * @param { string } pattern
 * @returns { boolean }
 */
export function matchesGlob(file, pattern) {
	return globToRegExp(pattern).test(file);
}
