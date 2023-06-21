export interface ExportResult {
	count: number;
	folder: string;
	files: Array<{
		id: string;
		name: string;
	}>;
	removedFiles?: string[];
}
