import { Service } from '@n8n/di';

/** Paths that accept GET and HEAD requests while the migrated database is disconnected. */
@Service()
export class DatabaseIndependentRoutes {
	private readonly paths = new Set<string>();

	add(path: string) {
		this.paths.add(withoutTrailingSlash(path));
	}

	/** Matches the path with or without a trailing slash. */
	has(path: string) {
		return this.paths.has(withoutTrailingSlash(path));
	}
}

function withoutTrailingSlash(path: string) {
	return path.replace(/\/$/, '');
}
