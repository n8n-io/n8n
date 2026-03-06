export interface AnalyzePackageResponse {
	packageFormatVersion: string;
	sourceN8nVersion: string;
	sourceId: string;
	exportedAt: string;
	summary: {
		projects: number;
		workflows: number;
		credentials: number;
		variables: number;
		dataTables: number;
		folders: number;
	};
	requirements: {
		credentials: Array<{
			id: string;
			name: string;
			type: string;
			usedByWorkflows: string[];
		}>;
		subWorkflows: Array<{
			id: string;
			usedByWorkflows: string[];
		}>;
		nodeTypes: Array<{
			type: string;
			typeVersion: number;
			usedByWorkflows: string[];
		}>;
		variables: Array<{
			name: string;
			usedByWorkflows: string[];
		}>;
	};
}
