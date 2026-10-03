export namespace n8n {
	export interface PackageJson {
		name: string;
		version: string;
		n8n?: {
			credentials?: string[];
			nodes?: string[];
			/** `"<major>"` or `"<major>.<minor>"`; a number is the legacy `<major>.0` form. */
			n8nNodesApiVersion?: number | string;
		};
		author?: {
			name?: string;
			email?: string;
		};
	}
}
