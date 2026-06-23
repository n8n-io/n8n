import { generateSlug } from './slug.utils';

export class UniqueFilenameAllocator {
	private readonly used = new Set<string>();

	constructor(
		private readonly baseDir: string,
		private readonly fallback?: string,
	) {}

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
