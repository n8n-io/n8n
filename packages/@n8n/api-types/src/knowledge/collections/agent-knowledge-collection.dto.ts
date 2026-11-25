/** One row of the collection picker in the Knowledge tab of an agent. */
export interface AgentKnowledgeCollectionDto {
	id: string;
	name: string;
	description: string;
	/** The number of files in the collection. */
	fileCount: number;
	/** True when the collection is on this agent. */
	added: boolean;
}
