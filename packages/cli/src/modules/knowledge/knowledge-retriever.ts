import type { KnowledgeConsumerScope } from './knowledge-consumer-scope';
import type {
	FindKnowledgeFilesRequest,
	FindKnowledgeFilesResult,
	ReadKnowledgeFileRequest,
	ReadKnowledgeFileResult,
	SearchKnowledgeTextRequest,
	SearchKnowledgeTextResult,
} from './retrieval/retrieval-schemas';

/** How long one search or read waited before its command ran. */
export interface KnowledgePreparationWait {
	/** Time to get a running sandbox. */
	sandboxWaitMs: number;
	/** Time spent waiting for the mirror. 0 when the call did not wait for another sync and did not change the mirror. */
	mirrorWaitMs: number;
}

/** Reports what happened during a search or read, without changing its result. */
export interface KnowledgeRetrievalObserver {
	/**
	 * Called once after the call reached the sandbox step, also when a step failed.
	 * Not called when the call ended before that step. Must not throw.
	 */
	onPreparationWait?: (wait: KnowledgePreparationWait) => void;
}

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
		request: FindKnowledgeFilesRequest,
	): Promise<FindKnowledgeFilesResult>;

	/** Line-based regex search over file contents in the consumer's sandbox mirror. */
	searchText(
		scope: KnowledgeConsumerScope,
		request: SearchKnowledgeTextRequest,
		observer?: KnowledgeRetrievalObserver,
	): Promise<SearchKnowledgeTextResult>;

	/** Reads line ranges of one file and returns a citation for each range. */
	readFile(
		scope: KnowledgeConsumerScope,
		request: ReadKnowledgeFileRequest,
		observer?: KnowledgeRetrievalObserver,
	): Promise<ReadKnowledgeFileResult>;
}
