import type {
	GlobKnowledgeFilesRequest,
	GlobKnowledgeFilesResult,
	ReadKnowledgeRequest,
	ReadKnowledgeResult,
	SearchKnowledgeRequest,
	SearchKnowledgeResult,
} from '@/modules/agents/agent-knowledge-retrieval';

import type { KnowledgeConsumerScope } from './knowledge-consumer-scope';

/**
 * What the knowledge module offers to a consumer. The agents module exposes
 * these operations as the `find_file`, `search_text` and `read_file` tools.
 *
 * The request and result types are shared with the agents module so that tool
 * inputs and outputs stay identical.
 */
export interface KnowledgeRetriever {
	/** Whether the scope holds any knowledge files. Consumers attach the tools only when it does. */
	hasFiles(scope: KnowledgeConsumerScope): Promise<boolean>;

	/** Matches uploaded file names against a glob. Runs in-process, without a sandbox. */
	findFiles(
		scope: KnowledgeConsumerScope,
		request: GlobKnowledgeFilesRequest,
	): Promise<GlobKnowledgeFilesResult>;

	/** Line-based regex search over file contents in the consumer's sandbox mirror. */
	searchText(
		scope: KnowledgeConsumerScope,
		request: SearchKnowledgeRequest,
	): Promise<SearchKnowledgeResult>;

	/** Reads line ranges of one file and returns a citation for each range. */
	readFile(
		scope: KnowledgeConsumerScope,
		request: ReadKnowledgeRequest,
	): Promise<ReadKnowledgeResult>;
}
