export namespace n8n {
	export interface PackageJson {
		name: string;
		version: string;
		n8n?: {
			credentials?: string[];
			nodes?: string[];
			/** A positive integer or `"<major>.<minor>"`, as declared by the package. */
			n8nNodesApiVersion?: number | string;
		};
		author?: {
			name?: string;
			email?: string;
		};
	}
}
