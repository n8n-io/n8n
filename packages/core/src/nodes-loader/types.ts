export namespace n8n {
	export interface PackageJson {
		name: string;
		version: string;
		n8n?: {
			credentials?: string[];
			nodes?: string[];
			n8nNodesApiVersion?: number;
		};
		author?: {
			name?: string;
			email?: string;
		};
	}
}
