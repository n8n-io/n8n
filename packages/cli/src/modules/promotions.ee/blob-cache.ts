/**
 * A bounded cache for results that depend only on the content of one Git blob. A blob never
 * changes, so a file that two commits share is read once, and a repeated preview reads nothing.
 */
export class BlobCache<T> {
	private readonly entries = new Map<string, T>();

	constructor(private readonly limit: number) {}

	get(blobSha: string | undefined): T | undefined {
		if (blobSha === undefined) return undefined;
		const value = this.entries.get(blobSha);
		if (value === undefined) return undefined;
		// Last in the map is the most recently used.
		this.entries.delete(blobSha);
		this.entries.set(blobSha, value);
		return value;
	}

	set(blobSha: string | undefined, value: T): void {
		if (blobSha === undefined) return;
		this.entries.delete(blobSha);
		if (this.entries.size >= this.limit) {
			const oldest = this.entries.keys().next();
			if (!oldest.done) this.entries.delete(oldest.value);
		}
		this.entries.set(blobSha, value);
	}
}
