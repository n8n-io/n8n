export interface SerializedVariable {
	id: string;
	key: string;
	type: string;
	value: string;
}

export interface ManifestVariableEntry {
	id: string;
	name: string;
	target: string;
}
