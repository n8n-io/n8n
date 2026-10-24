import { UnexpectedError } from 'n8n-workflow';

/**
 * Returns `prefix` as a directory-style listing prefix (trailing slash), so `a/binary_data`
 * never matches `a/binary_data_old`. Throws on a prefix that can match the whole container.
 */
export function toDirectoryPrefix(prefix: string) {
	const segments = prefix.split('/').filter((segment) => segment !== '');

	if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
		throw new UnexpectedError('Refusing to delete with an empty or unsafe prefix', {
			extra: { prefix },
		});
	}

	return `${segments.join('/')}/`;
}
