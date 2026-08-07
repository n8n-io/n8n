import { UnexpectedError } from 'n8n-workflow';

import { generateSlug } from './slug.utils';
import type { PathStyle } from '../n8n-packages.types';

export class UniqueFilenameAllocator {
	private readonly used = new Set<string>();

	constructor(
		private readonly baseDir: string,
		private readonly fallback: string,
		private readonly pathStyle: PathStyle = 'slug',
	) {}

	reserve(segment: string): void {
		this.used.add(`${this.baseDir}/${segment}`);
	}

	reservePath(path: string): void {
		// baseDir is always the parent of the reserved path, so a mismatch can only
		// be a wiring bug — reserving it would be a no-op and let allocate() later
		// collide with it, silently overwriting a file in the package.
		if (!path.startsWith(`${this.baseDir}/`)) {
			throw new UnexpectedError('Cannot reserve a path outside the allocator base directory', {
				extra: { path, baseDir: this.baseDir },
			});
		}
		this.used.add(path);
	}

	allocate(name: string, id?: string): string {
		// 'id' paths stay stable across renames and allocation order — required for
		// long-lived git trees (source control sync), where slug churn is destructive.
		const segment =
			this.pathStyle === 'id' && id !== undefined ? id : generateSlug(name, this.fallback);
		const base = `${this.baseDir}/${segment}`;

		if (!this.used.has(base)) {
			this.used.add(base);
			return base;
		}

		for (let suffix = 2; ; suffix++) {
			const candidate = `${base}-${suffix}`;
			if (!this.used.has(candidate)) {
				this.used.add(candidate);
				return candidate;
			}
		}
	}
}
