import { UserError } from 'n8n-workflow';

/**
 * Convert path array to PostgreSQL JSON arrow notation
 * Uses -> for object access and array indices, ->> for final text extraction
 * Examples:
 *   ['a', 'b', 0, 'c'] -> ->'a'->'b'->0->>'c'
 *   ['key.with.dots', 2] -> ->'key.with.dots'->>2
 */
export function toPostgresPath(pathArray: Array<string | number>) {
	if (pathArray.length === 0) return '';

	const segments = pathArray.map((segment, index) => {
		const isLast = index === pathArray.length - 1;
		const arrow = isLast ? '->>' : '->';

		if (typeof segment === 'number') {
			return `${arrow}${segment}`;
		} else {
			// Escape single quotes in the key
			const escaped = segment.replaceAll("'", "''");
			return `${arrow}'${escaped}'`;
		}
	});

	return segments.join('');
}

/**
 * Convert path array to SQLite json_extract path notation
 * Complex keys need to be quoted with double quotes
 */
export function toSQLitePath(pathArray: Array<string | number>) {
	let result = '$';

	for (const segment of pathArray) {
		if (typeof segment === 'number') {
			result += `[${segment}]`;
		} else {
			if (segment.includes('"') && (segment.includes('.') || segment.includes('['))) {
				throw new UserError(
					`Path segments like '${segment}' containing both '"' and ('.' or '[') are not supported in sqlite`,
				);
			}
			// sqlite requires quotes if key includes `.`, `[` or starts with `"` only
			// https://stackoverflow.com/a/67994603
			const escaped = segment.replace(/"/g, '\\"');
			if (needsQuoting(segment)) {
				result += `."${escaped}"`;
			} else {
				result += `.${escaped}`;
			}
		}
	}

	return result;
}

/**
 * Check if a key needs quoting (contains special characters)
 */
export function needsQuoting(key: string) {
	return /[.[]/.test(key) || key === '';
}

const numericRegex = /^\d+$/;

// eslint-disable-next-line complexity
export function parsePath(path: string) {
	const result = [];
	let current = '';
	let i = 0;

	while (i < path.length) {
		const char = path[i];

		if (current === '' && (char === '"' || char === "'")) {
			// parse quoted field name
			if (current) {
				result.push(current);
				current = '';
			}

			i++;

			let key = '';
			while (i < path.length && path[i] !== char) {
				if (path[i] === '\\' && '"\'\\'.includes(path[i + 1])) {
					// skip \ in \<quote or \> only
					i++;
				}
				key += path[i];
				i++;
			}

			if (path[i] !== char) {
				throw new UserError(
					`Encountered end of string while parsing quoted path segment '${char + key}' in path '${path}'`,
				);
			}

			result.push(key);

			// skip closing quote
			i++;
		} else if (char === '[') {
			// Parse index
			if (current) {
				result.push(current);
				current = '';
			}

			i++;

			let index = '';
			while (i < path.length && path[i] !== ']') {
				index += path[i];
				i++;
			}
			if (!numericRegex.test(index)) {
				throw new UserError(`Encountered non-numeric index '${index}' in path '${path}'`);
			}
			const indexNum = parseInt(index, 10);
			result.push(indexNum);

			if (path[i] === ']') {
				i++;
			} else {
				throw new UserError(`Missing closing bracket ] after index ${index} in path ${path}`);
			}

			if (path[i] === '.') {
				i++;
			}
		} else if (char === '.') {
			if (current) {
				result.push(current);
				current = '';
			}
			i++;
		} else {
			current += char;
			i++;
		}
	}

	if (current) {
		result.push(current);
	}

	return result;
}
