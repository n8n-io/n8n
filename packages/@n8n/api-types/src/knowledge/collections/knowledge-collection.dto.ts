import type { ProjectType } from '../../schemas/project.schema';

/** A shared knowledge collection, as the collection list and the collection page show it. */
export interface KnowledgeCollectionDto {
	id: string;
	name: string;
	description: string;
	/** Unique on the instance. The agent tool names of the collection contain it. */
	slug: string;
	/** Same shape as on credentials and workflows. */
	homeProject: { id: string; name: string; type: ProjectType };
	fileCount: number;
	totalFileSizeBytes: number;
	agentCount: number;
	createdAt: string;
	updatedAt: string;
}

/** Same shape as the data table list. */
export interface KnowledgeCollectionListResponse {
	count: number;
	data: KnowledgeCollectionDto[];
}
