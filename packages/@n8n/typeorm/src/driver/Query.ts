/**
 * This class stores query and its parameters
 */
export class Query {
	readonly '@instanceof' = Symbol.for('Query');

	constructor(
		public query: string,
		public parameters?: any[],
	) {}
}
