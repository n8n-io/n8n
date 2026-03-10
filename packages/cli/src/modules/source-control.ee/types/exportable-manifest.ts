export interface ExportableManifest {
	version: '1.0.0';
	name: string;
	description?: string;
	projects: Array<{ id: string; name: string; dirName: string }>;
	dependencies: {
		credentialTypes: string[];
		nodeTypes: string[];
	};
	exportedAt: string;
	exportedBy: string;
}
