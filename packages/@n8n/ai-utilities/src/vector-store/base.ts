import type {
	VectorStore,
	VectorStoreConfig,
	VectorStoreDocument,
	VectorStoreSearchResult,
} from '../types/vector-store';

export abstract class BaseVectorStore<TConfig extends VectorStoreConfig = VectorStoreConfig>
	implements VectorStore<TConfig>
{
	constructor(
		public provider: string,
		public storeId: string,
		public defaultConfig?: TConfig,
	) {}

	abstract addDocuments(documents: VectorStoreDocument[], config?: TConfig): Promise<string[]>;

	abstract similaritySearch(
		query: string,
		embeddings: number[],
		config?: TConfig,
	): Promise<VectorStoreSearchResult[]>;

	abstract deleteDocuments(ids: string[], config?: TConfig): Promise<void>;

	/**
	 * Merge configuration with defaults
	 */
	protected mergeConfig(config?: Partial<TConfig>): TConfig {
		return {
			...this.defaultConfig,
			...config,
		} as TConfig;
	}
}
