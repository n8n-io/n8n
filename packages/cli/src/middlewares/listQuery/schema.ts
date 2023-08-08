export class Schema {
	constructor(private data: unknown = {}) {}

	static get fieldNames(): string[] {
		return [];
	}
}
