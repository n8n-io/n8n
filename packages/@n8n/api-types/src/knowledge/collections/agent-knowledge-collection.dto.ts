/** One row of the collection picker in the Knowledge tab of an agent. */
export interface AgentKnowledgeCollectionDto {
	id: string;
	name: string;
	description: string;
	fileCount: number;
	usedByAgent: boolean;
}
