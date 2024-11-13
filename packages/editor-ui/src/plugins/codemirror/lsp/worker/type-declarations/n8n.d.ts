export {};

declare global {
	interface N8nJson {
		[key: string]: number | boolean | string | Object | Array<any> | Date;
	}
	interface N8nBinary {}
	interface N8nItem {
		json: N8nJson;
		binary: N8nBinary;
	}

	interface N8nInput {
		all(branchIndex?: number, runIndex?: number): Array<N8nItem>;
		first(branchIndex?: number, runIndex?: number): N8nItem;
		last(branchIndex?: number, runIndex?: number): N8nItem;
		item: N8nItem;
	}

	const $input: N8nInput;

	interface String {
		hash(algo?: 'md5');
	}
}
