import { UnexpectedError } from 'n8n-workflow';

import { generateSlug } from './slug.utils';

export class UniqueFilenameAllocator {
	private readonly used = new Set<string>();

	constructor(
		private readonly baseDir: string,
		private readonly fallback: string,
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

	allocate(name: string): string {
		const base = `${this.baseDir}/${generateSlug(name, this.fallback)}`;

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
