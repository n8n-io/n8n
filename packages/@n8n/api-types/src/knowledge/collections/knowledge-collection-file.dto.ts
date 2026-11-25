/** Same fields as AgentFileDto, so the editor can reuse its file components. */
export interface KnowledgeCollectionFileDto {
	id: string;
	collectionId: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: string;
}

export interface KnowledgeCollectionFileListResponse {
	count: number;
	totalSizeBytes: number;
	data: KnowledgeCollectionFileDto[];
}
