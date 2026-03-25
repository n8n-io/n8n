type BoolInvertedIndexConfig$1 = {
    [key: string]: never;
};
type BoolInvertedIndexType$1 = {
    config: BoolInvertedIndexConfig$1;
    enabled: boolean;
};
/**
 * Boolean value type index configurations
 */
type BoolValueType$1 = {
    bool_inverted_index?: null | BoolInvertedIndexType$1;
};
type ChecklistResponse = {
    max_batch_size: number;
    supports_base64_encoding: boolean;
};
type Database = {
    id: string;
    name: string;
    tenant: string;
};
type EmbeddingFunctionConfiguration = {
    type: 'legacy';
} | (EmbeddingFunctionNewConfiguration & {
    type: 'known';
}) | {
    type: 'unknown';
};
type EmbeddingFunctionNewConfiguration = {
    config: unknown;
    name: string;
};
type FloatInvertedIndexConfig$1 = {
    [key: string]: never;
};
type FloatInvertedIndexType$1 = {
    config: FloatInvertedIndexConfig$1;
    enabled: boolean;
};
/**
 * Float list value type index configurations (for vectors)
 */
type FloatListValueType$1 = {
    vector_index?: null | VectorIndexType$1;
};
/**
 * Float value type index configurations
 */
type FloatValueType$1 = {
    float_inverted_index?: null | FloatInvertedIndexType$1;
};
type FtsIndexConfig$1 = {
    [key: string]: never;
};
type FtsIndexType$1 = {
    config: FtsIndexConfig$1;
    enabled: boolean;
};
type GetUserIdentityResponse = {
    databases: Array<string>;
    tenant: string;
    user_id: string;
};
type HashMap = {
    [key: string]: boolean | number | string | SparseVector | null;
};
type HnswConfiguration = {
    ef_construction?: number | null;
    ef_search?: number | null;
    max_neighbors?: number | null;
    resize_factor?: number | null;
    space?: null | Space;
    sync_threshold?: number | null;
};
/**
 * Configuration for HNSW vector index algorithm parameters
 */
type HnswIndexConfig = {
    batch_size?: number | null;
    ef_construction?: number | null;
    ef_search?: number | null;
    max_neighbors?: number | null;
    num_threads?: number | null;
    resize_factor?: number | null;
    sync_threshold?: number | null;
};
type Include = 'distances' | 'documents' | 'embeddings' | 'metadatas' | 'uris';
type IntInvertedIndexConfig$1 = {
    [key: string]: never;
};
type IntInvertedIndexType$1 = {
    config: IntInvertedIndexConfig$1;
    enabled: boolean;
};
/**
 * Integer value type index configurations
 */
type IntValueType$1 = {
    int_inverted_index?: null | IntInvertedIndexType$1;
};
/**
 * Represents a field key in search queries.
 *
 * Used for both selecting fields to return and building filter expressions.
 * Predefined keys access special fields, while custom keys access metadata.
 *
 * # Predefined Keys
 *
 * - `Key::Document` - Document text content (`#document`)
 * - `Key::Embedding` - Vector embeddings (`#embedding`)
 * - `Key::Metadata` - All metadata fields (`#metadata`)
 * - `Key::Score` - Search scores (`#score`)
 *
 * # Custom Keys
 *
 * Use `Key::field()` or `Key::from()` to reference metadata fields:
 *
 * ```
 * use chroma_types::operator::Key;
 *
 * let key = Key::field("author");
 * let key = Key::from("title");
 * ```
 *
 * # Examples
 *
 * ## Building filters
 *
 * ```
 * use chroma_types::operator::Key;
 *
 * // Equality
 * let filter = Key::field("status").eq("published");
 *
 * // Comparisons
 * let filter = Key::field("year").gte(2020);
 * let filter = Key::field("score").lt(0.9);
 *
 * // Set operations
 * let filter = Key::field("category").is_in(vec!["tech", "science"]);
 * let filter = Key::field("status").not_in(vec!["deleted", "archived"]);
 *
 * // Document content
 * let filter = Key::Document.contains("machine learning");
 * let filter = Key::Document.regex(r"\bAPI\b");
 *
 * // Combining filters
 * let filter = Key::field("status").eq("published")
 * & Key::field("year").gte(2020);
 * ```
 *
 * ## Selecting fields
 *
 * ```
 * use chroma_types::plan::SearchPayload;
 * use chroma_types::operator::Key;
 *
 * let search = SearchPayload::default()
 * .select([
 * Key::Document,
 * Key::Score,
 * Key::field("title"),
 * Key::field("author"),
 * ]);
 * ```
 */
type Key$1 = 'Document' | 'Embedding' | 'Metadata' | 'Score' | {
    MetadataField: string;
};
/**
 * Schema representation for collection index configurations
 *
 * This represents the server-side schema structure used for index management
 */
type Schema$1 = {
    /**
     * Customer-managed encryption key for collection data
     */
    cmek?: {
        [key: string]: unknown;
    } | null;
    /**
     * Default index configurations for each value type
     */
    defaults: ValueTypes$1;
    /**
     * Key-specific index overrides
     * TODO(Sanket): Needed for backwards compatibility. Should remove after deploy.
     */
    keys: {
        [key: string]: ValueTypes$1;
    };
    /**
     * ID of the attached function that created this output collection (if applicable)
     */
    source_attached_function_id?: string | null;
};
type SearchPayload = {
    filter?: {
        query_ids?: Array<string>;
        where_clause?: {
            [key: string]: unknown;
        };
    };
    group_by?: {
        aggregate?: {
            [key: string]: unknown;
        };
        keys?: Array<string>;
    };
    limit?: {
        limit?: number;
        offset?: number;
    };
    rank?: {
        [key: string]: unknown;
    };
    select?: {
        keys?: Array<string>;
    };
};
type SearchResponse = {
    documents: Array<Array<string | null> | null>;
    embeddings: Array<Array<Array<number> | null> | null>;
    ids: Array<Array<string>>;
    metadatas: Array<Array<null | HashMap> | null>;
    scores: Array<Array<number | null> | null>;
    select: Array<Array<Key$1>>;
};
type Space = 'l2' | 'cosine' | 'ip';
type SpannConfiguration = {
    ef_construction?: number | null;
    ef_search?: number | null;
    max_neighbors?: number | null;
    merge_threshold?: number | null;
    reassign_neighbor_count?: number | null;
    search_nprobe?: number | null;
    space?: null | Space;
    split_threshold?: number | null;
    write_nprobe?: number | null;
};
/**
 * Configuration for SPANN vector index algorithm parameters
 */
type SpannIndexConfig = {
    ef_construction?: number | null;
    ef_search?: number | null;
    initial_lambda?: number | null;
    max_neighbors?: number | null;
    merge_threshold?: number | null;
    nreplica_count?: number | null;
    num_centers_to_merge_to?: number | null;
    num_samples_kmeans?: number | null;
    reassign_neighbor_count?: number | null;
    search_nprobe?: number | null;
    search_rng_epsilon?: number | null;
    search_rng_factor?: number | null;
    split_threshold?: number | null;
    write_nprobe?: number | null;
    write_rng_epsilon?: number | null;
    write_rng_factor?: number | null;
};
/**
 * Represents a sparse vector using parallel arrays for indices and values.
 *
 * On deserialization: accepts both old format `{"indices": [...], "values": [...]}`
 * and new format `{"#type": "sparse_vector", "indices": [...], "values": [...]}`.
 *
 * On serialization: always includes `#type` field with value `"sparse_vector"`.
 */
type SparseVector = {
    /**
     * Dimension indices
     */
    indices: Array<number>;
    /**
     * Tokens corresponding to each index
     */
    tokens?: Array<string> | null;
    /**
     * Values corresponding to each index
     */
    values: Array<number>;
};
type SparseVectorIndexConfig$1 = {
    /**
     * Whether this embedding is BM25
     */
    bm25?: boolean | null;
    embedding_function?: null | EmbeddingFunctionConfiguration;
    /**
     * Key to source the sparse vector from
     */
    source_key?: string | null;
};
type SparseVectorIndexType$1 = {
    config: SparseVectorIndexConfig$1;
    enabled: boolean;
};
/**
 * Sparse vector value type index configurations
 */
type SparseVectorValueType$1 = {
    sparse_vector_index?: null | SparseVectorIndexType$1;
};
type StringInvertedIndexConfig$1 = {
    [key: string]: never;
};
type StringInvertedIndexType$1 = {
    config: StringInvertedIndexConfig$1;
    enabled: boolean;
};
/**
 * String value type index configurations
 */
type StringValueType$1 = {
    fts_index?: null | FtsIndexType$1;
    string_inverted_index?: null | StringInvertedIndexType$1;
};
type UpdateCollectionConfiguration$1 = {
    embedding_function?: null | EmbeddingFunctionConfiguration;
    hnsw?: null | UpdateHnswConfiguration;
    spann?: null | UpdateSpannConfiguration;
};
type UpdateHnswConfiguration = {
    batch_size?: number | null;
    ef_search?: number | null;
    max_neighbors?: number | null;
    num_threads?: number | null;
    resize_factor?: number | null;
    sync_threshold?: number | null;
};
type UpdateSpannConfiguration = {
    ef_search?: number | null;
    search_nprobe?: number | null;
};
/**
 * Strongly-typed value type configurations
 * Contains optional configurations for each supported value type
 */
type ValueTypes$1 = {
    bool?: null | BoolValueType$1;
    float?: null | FloatValueType$1;
    float_list?: null | FloatListValueType$1;
    int?: null | IntValueType$1;
    sparse_vector?: null | SparseVectorValueType$1;
    string?: null | StringValueType$1;
};
type VectorIndexConfig$1 = {
    embedding_function?: null | EmbeddingFunctionConfiguration;
    hnsw?: null | HnswIndexConfig;
    /**
     * Key to source the vector from
     */
    source_key?: string | null;
    space?: null | Space;
    spann?: null | SpannIndexConfig;
};
type VectorIndexType$1 = {
    config: VectorIndexConfig$1;
    enabled: boolean;
};

/**
 * User identity information including tenant and database access.
 */
type UserIdentity = GetUserIdentityResponse;

/**
 * Metadata that can be associated with a collection.
 * Values must be boolean, number, or string types.
 */
type CollectionMetadata = Record<string, boolean | number | string | SparseVector | null>;
/**
 * Metadata that can be associated with individual records.
 * Values must be boolean, number, or string types.
 */
type Metadata = Record<string, boolean | number | string | SparseVector | null>;
/**
 * Base interface for record sets containing optional fields.
 */
interface BaseRecordSet {
    /** Array of embedding vectors */
    embeddings?: number[][];
    /** Array of metadata objects */
    metadatas?: Metadata[];
    /** Array of document text content */
    documents?: string[];
    /** Array of URIs/URLs */
    uris?: string[];
}
declare const baseRecordSetFields: string[];
/**
 * Complete record set with required IDs for operations like add/update.
 */
interface RecordSet extends BaseRecordSet {
    /** Array of unique record identifiers */
    ids: string[];
}
interface PreparedRecordSet extends Omit<RecordSet, "embeddings"> {
    embeddings?: number[][] | string[];
}
interface PreparedInsertRecordSet extends PreparedRecordSet {
    embeddings: number[][] | string[];
}
declare const recordSetFields: string[];
/**
 * Record set for query operations with required embeddings.
 */
interface QueryRecordSet extends BaseRecordSet {
    /** Optional array of record IDs to filter by */
    ids?: string[];
    /** Array of query embedding vectors (required for queries) */
    embeddings: number[][];
}
type LiteralValue = string | number | boolean;
type OperatorExpression = {
    $gt: LiteralValue;
} | {
    $gte: LiteralValue;
} | {
    $lt: LiteralValue;
} | {
    $lte: LiteralValue;
} | {
    $ne: LiteralValue;
} | {
    $eq: LiteralValue;
} | {
    $and: LiteralValue;
} | {
    $or: LiteralValue;
} | {
    $in: LiteralValue[];
} | {
    $nin: LiteralValue[];
};
/**
 * Where clause for filtering records based on metadata.
 * Supports field equality, comparison operators, and logical operators.
 */
type Where = {
    [key: string]: LiteralValue | OperatorExpression;
} | {
    $and: Where[];
} | {
    $or: Where[];
};
/**
 * Where clause for filtering based on document content.
 * Supports text search operators and logical combinations.
 */
type WhereDocument = {
    $contains: string;
} | {
    $not_contains: string;
} | {
    $matches: string;
} | {
    $not_matches: string;
} | {
    $regex: string;
} | {
    $not_regex: string;
} | {
    $and: WhereDocument[];
} | {
    $or: WhereDocument[];
};
/**
 * Enum specifying which fields to include in query results.
 */
declare enum IncludeEnum {
    /** Include similarity distances in results */
    distances = "distances",
    /** Include document text content in results */
    documents = "documents",
    /** Include embedding vectors in results */
    embeddings = "embeddings",
    /** Include metadata objects in results */
    metadatas = "metadatas",
    /** Include URIs in results */
    uris = "uris"
}
/**
 * Result class for get operations, containing retrieved records.
 * @template TMeta - The type of metadata associated with records
 */
declare class GetResult<TMeta extends Metadata = Metadata> {
    readonly documents: (string | null)[];
    readonly embeddings: number[][];
    readonly ids: string[];
    readonly include: Include[];
    readonly metadatas: (TMeta | null)[];
    readonly uris: (string | null)[];
    /**
     * Creates a new GetResult instance.
     * @param data - The result data containing all fields
     */
    constructor({ documents, embeddings, ids, include, metadatas, uris, }: {
        documents: (string | null)[];
        embeddings: number[][];
        ids: string[];
        include: Include[];
        metadatas: (TMeta | null)[];
        uris: (string | null)[];
    });
    /**
     * Converts the result to a row-based format for easier iteration.
     * @returns Object containing include fields and array of record objects
     */
    rows(): {
        id: string;
        document: string | null | undefined;
        embedding: number[] | undefined;
        metadata: TMeta | null | undefined;
        uri: string | null | undefined;
    }[];
}
/**
 * Interface for query results in row format.
 * @template TMeta - The type of metadata associated with records
 */
interface QueryRowResult<TMeta extends Metadata = Metadata> {
    /** Similarity distance to the query (if included) */
    distance?: number | null;
    /** Document text content (if included) */
    document?: string | null;
    /** Embedding vector (if included) */
    embedding?: number[] | null;
    /** Unique record identifier */
    id: string;
    /** Record metadata (if included) */
    metadata?: TMeta | null;
    /** Record URI (if included) */
    uri?: string | null;
}
/**
 * Result class for query operations, containing search results.
 * @template TMeta - The type of metadata associated with records
 */
declare class QueryResult<TMeta extends Metadata = Metadata> {
    readonly distances: (number | null)[][];
    readonly documents: (string | null)[][];
    readonly embeddings: (number[] | null)[][];
    readonly ids: string[][];
    readonly include: Include[];
    readonly metadatas: (TMeta | null)[][];
    readonly uris: (string | null)[][];
    /**
     * Creates a new QueryResult instance.
     * @param data - The query result data containing all fields
     */
    constructor({ distances, documents, embeddings, ids, include, metadatas, uris, }: {
        distances: (number | null)[][];
        documents: (string | null)[][];
        embeddings: (number[] | null)[][];
        ids: string[][];
        include: Include[];
        metadatas: (TMeta | null)[][];
        uris: (string | null)[][];
    });
    /**
     * Converts the query result to a row-based format for easier iteration.
     * @returns Object containing include fields and structured query results
     */
    rows(): QueryRowResult<TMeta>[][];
}

/**
 * Supported vector space types.
 */
type EmbeddingFunctionSpace = "cosine" | "l2" | "ip";
/**
 * Interface for embedding functions.
 * Embedding functions transform text documents into numerical representations
 * that can be used for similarity search and other vector operations.
 */
interface EmbeddingFunction {
    /**
     * Generates embeddings for the given texts.
     * @param texts - Array of text strings to embed
     * @returns Promise resolving to array of embedding vectors
     */
    generate(texts: string[]): Promise<number[][]>;
    /**
     * Generates embeddings specifically for query texts.
     * The client will fall back to using the implementation of `generate`
     * if this function is not provided.
     * @param texts - Array of query text strings to embed
     * @returns Promise resolving to array of embedding vectors
     */
    generateForQueries?(texts: string[]): Promise<number[][]>;
    /** Optional name identifier for the embedding function */
    name?: string;
    /** Returns the default vector space for this embedding function */
    defaultSpace?(): EmbeddingFunctionSpace;
    /** Returns all supported vector spaces for this embedding function */
    supportedSpaces?(): EmbeddingFunctionSpace[];
    /** Creates an instance from configuration object */
    buildFromConfig?(config: Record<string, any>, client?: ChromaClient): EmbeddingFunction;
    /** Returns the current configuration as an object */
    getConfig?(): Record<string, any>;
    /**
     * Validates that a configuration update is allowed.
     * @param newConfig - New configuration to validate
     */
    validateConfigUpdate?(newConfig: Record<string, any>): void;
    /**
     * Validates that a configuration object is valid.
     * @param config - Configuration to validate
     */
    validateConfig?(config: Record<string, any>): void;
}
/**
 * Interface for sparse embedding functions.
 * Sparse embedding functions transform text documents into sparse numerical representations
 * where only non-zero values are stored, making them efficient for high-dimensional spaces.
 */
interface SparseEmbeddingFunction {
    /**
     * Generates sparse embeddings for the given texts.
     * @param texts - Array of text strings to embed
     * @returns Promise resolving to array of sparse vectors
     */
    generate(texts: string[]): Promise<SparseVector[]>;
    /**
     * Generates sparse embeddings specifically for query texts.
     * The client will fall back to using the implementation of `generate`
     * if this function is not provided.
     * @param texts - Array of query text strings to embed
     * @returns Promise resolving to array of sparse vectors
     */
    generateForQueries?(texts: string[]): Promise<SparseVector[]>;
    /** Optional name identifier for the embedding function */
    name?: string;
    /** Creates an instance from configuration object */
    buildFromConfig?(config: Record<string, any>, client?: ChromaClient): SparseEmbeddingFunction;
    /** Returns the current configuration as an object */
    getConfig?(): Record<string, any>;
    /**
     * Validates that a configuration update is allowed.
     * @param newConfig - New configuration to validate
     */
    validateConfigUpdate?(newConfig: Record<string, any>): void;
    /**
     * Validates that a configuration object is valid.
     * @param config - Configuration to validate
     */
    validateConfig?(config: Record<string, any>): void;
}
/**
 * Interface for embedding function constructor classes.
 * Used for registering and instantiating embedding functions.
 */
interface EmbeddingFunctionClass {
    /** Constructor for creating new instances */
    new (...args: any[]): EmbeddingFunction;
    /** Name identifier for the embedding function */
    name: string;
    /** Static method to build instance from configuration */
    buildFromConfig(config: Record<string, any>, client?: ChromaClient): EmbeddingFunction;
}
/**
 * Interface for sparse embedding function constructor classes.
 * Used for registering and instantiating sparse embedding functions.
 */
interface SparseEmbeddingFunctionClass {
    /** Constructor for creating new instances */
    new (...args: any[]): SparseEmbeddingFunction;
    /** Name identifier for the embedding function */
    name: string;
    /** Static method to build instance from configuration */
    buildFromConfig(config: Record<string, any>, client?: ChromaClient): SparseEmbeddingFunction;
}
/**
 * Registry of available embedding functions.
 * Maps function names to their constructor classes.
 */
declare const knownEmbeddingFunctions: Map<string, EmbeddingFunctionClass>;
/**
 * Registry of available sparse embedding functions.
 * Maps function names to their constructor classes.
 */
declare const knownSparseEmbeddingFunctions: Map<string, SparseEmbeddingFunctionClass>;
/**
 * Union type covering both dense and sparse embedding functions.
 */
type AnyEmbeddingFunction = EmbeddingFunction | SparseEmbeddingFunction;
/**
 * Registers an embedding function in the global registry.
 * @param name - Unique name for the embedding function
 * @param fn - Embedding function class to register
 * @throws ChromaValueError if name is already registered
 */
declare const registerEmbeddingFunction: (name: string, fn: EmbeddingFunctionClass) => void;
/**
 * Registers a sparse embedding function in the global registry.
 * @param name - Unique name for the sparse embedding function
 * @param fn - Sparse embedding function class to register
 * @throws ChromaValueError if name is already registered
 */
declare const registerSparseEmbeddingFunction: (name: string, fn: SparseEmbeddingFunctionClass) => void;
/**
 * Retrieves and instantiates an embedding function from configuration.
 * @returns EmbeddingFunction instance or undefined if it cannot be constructed
 */
declare const getEmbeddingFunction: (args: {
    collectionName: string;
    client: ChromaClient;
    efConfig?: EmbeddingFunctionConfiguration;
}) => Promise<EmbeddingFunction | undefined>;
/**
 * Retrieves and instantiates a sparse embedding function from configuration.
 * @returns SparseEmbeddingFunction instance or undefined if it cannot be constructed
 */
declare const getSparseEmbeddingFunction: (collectionName: string, client: ChromaClient, efConfig?: EmbeddingFunctionConfiguration) => Promise<SparseEmbeddingFunction | undefined>;
/**
 * Serializes an embedding function to configuration format.
 * @param embeddingFunction - User provided embedding function
 * @param configEmbeddingFunction - Collection config embedding function
 * @returns Configuration object that can recreate the function
 */
declare const serializeEmbeddingFunction: ({ embeddingFunction, configEmbeddingFunction, }: {
    embeddingFunction?: EmbeddingFunction;
    configEmbeddingFunction?: EmbeddingFunction;
}) => EmbeddingFunctionConfiguration | undefined;
/**
 * Gets the configuration for the default embedding function.
 * Dynamically imports and registers the default embedding function if needed.
 * @returns Promise resolving to default embedding function configuration
 * @throws Error if default embedding function cannot be loaded
 */
declare const getDefaultEFConfig: () => Promise<EmbeddingFunctionConfiguration>;

type WhereJSON = Record<string, unknown>;
type WhereInput = WhereExpression | WhereJSON | null | undefined;
declare abstract class WhereExpressionBase {
    abstract toJSON(): WhereJSON;
    and(other: WhereInput): WhereExpression;
    or(other: WhereInput): WhereExpression;
}
declare abstract class WhereExpression extends WhereExpressionBase {
    static from(input: WhereInput): WhereExpression | undefined;
}

type IterableInput<T> = Iterable<T> | ArrayLike<T>;

declare class Key {
    readonly name: string;
    static readonly ID: Key;
    static readonly DOCUMENT: Key;
    static readonly EMBEDDING: Key;
    static readonly METADATA: Key;
    static readonly SCORE: Key;
    constructor(name: string);
    eq(value: unknown): WhereExpression;
    ne(value: unknown): WhereExpression;
    gt(value: unknown): WhereExpression;
    gte(value: unknown): WhereExpression;
    lt(value: unknown): WhereExpression;
    lte(value: unknown): WhereExpression;
    isIn(values: IterableInput<unknown>): WhereExpression;
    notIn(values: IterableInput<unknown>): WhereExpression;
    contains(value: string): WhereExpression;
    notContains(value: string): WhereExpression;
    regex(pattern: string): WhereExpression;
    notRegex(pattern: string): WhereExpression;
}
interface KeyFactory {
    (name: string): Key;
    ID: Key;
    DOCUMENT: Key;
    EMBEDDING: Key;
    METADATA: Key;
    SCORE: Key;
}
declare const K: KeyFactory;

interface LimitOptions {
    offset?: number;
    limit?: number | null | undefined;
}
type LimitInput = Limit | number | LimitOptions | null | undefined;
declare class Limit {
    readonly offset: number;
    readonly limit?: number;
    constructor(options?: LimitOptions);
    static from(input: LimitInput, offsetOverride?: number): Limit;
    toJSON(): {
        offset: number;
        limit?: number;
    };
}

type SelectKeyInput = string | Key;
type SelectInput = Select | Iterable<SelectKeyInput> | {
    keys?: Iterable<SelectKeyInput>;
} | null | undefined;
declare class Select {
    private readonly keys;
    constructor(keys?: Iterable<SelectKeyInput>);
    static from(input: SelectInput): Select;
    static all(): Select;
    get values(): string[];
    toJSON(): {
        keys: string[];
    };
}

type RankLiteral = Record<string, unknown>;
type RankInput = RankExpression | RankLiteral | number | null | undefined;
declare abstract class RankExpressionBase {
    abstract toJSON(): Record<string, unknown>;
    add(...others: RankInput[]): RankExpression;
    subtract(other: RankInput): RankExpression;
    multiply(...others: RankInput[]): RankExpression;
    divide(other: RankInput): RankExpression;
    negate(): RankExpression;
    abs(): RankExpression;
    exp(): RankExpression;
    log(): RankExpression;
    max(...others: RankInput[]): RankExpression;
    min(...others: RankInput[]): RankExpression;
}
declare abstract class RankExpression extends RankExpressionBase {
    static from(input: RankInput): RankExpression | undefined;
}
interface KnnOptions {
    query: IterableInput<number> | SparseVector | string;
    key?: string | Key;
    limit?: number;
    default?: number | null;
    returnRank?: boolean;
}
declare const Val: (value: number) => RankExpression;
declare const Knn: (options: KnnOptions) => RankExpression;
interface RrfOptions {
    ranks: RankInput[];
    k?: number;
    weights?: number[];
    normalize?: boolean;
}
declare const Rrf: ({ ranks, k, weights, normalize }: RrfOptions) => RankExpression;
declare const Sum: (...inputs: RankInput[]) => RankExpression;
declare const Sub: (left: RankInput, right: RankInput) => RankExpression;
declare const Mul: (...inputs: RankInput[]) => RankExpression;
declare const Div: (left: RankInput, right: RankInput) => RankExpression;
declare const Abs: (input: RankInput) => RankExpression;
declare const Exp: (input: RankInput) => RankExpression;
declare const Log: (input: RankInput) => RankExpression;
declare const Max: (...inputs: RankInput[]) => RankExpression;
declare const Min: (...inputs: RankInput[]) => RankExpression;

interface MinKJSON {
    keys: string[];
    k: number;
}
interface MaxKJSON {
    keys: string[];
    k: number;
}
type AggregateJSON = {
    $min_k: MinKJSON;
} | {
    $max_k: MaxKJSON;
};
type AggregateInput = Aggregate | AggregateJSON;
declare abstract class Aggregate {
    abstract toJSON(): AggregateJSON;
    static from(input: AggregateInput): Aggregate;
    static minK(keys: (Key | string)[], k: number): MinK;
    static maxK(keys: (Key | string)[], k: number): MaxK;
}
declare class MinK extends Aggregate {
    readonly keys: Key[];
    readonly k: number;
    constructor(keys: Key[], k: number);
    toJSON(): AggregateJSON;
}
declare class MaxK extends Aggregate {
    readonly keys: Key[];
    readonly k: number;
    constructor(keys: Key[], k: number);
    toJSON(): AggregateJSON;
}
interface GroupByJSON {
    keys: string[];
    aggregate: AggregateJSON;
}
type GroupByInput = GroupBy | GroupByJSON;
declare class GroupBy {
    readonly keys: Key[];
    readonly aggregate: Aggregate;
    constructor(keys: Key[], aggregate: Aggregate);
    static from(input: GroupByInput | undefined): GroupBy | undefined;
    toJSON(): GroupByJSON;
}

interface SearchInit {
    where?: WhereInput;
    rank?: RankInput;
    groupBy?: GroupByInput;
    limit?: LimitInput;
    select?: SelectInput;
}
declare class Search {
    private _where?;
    private _rank?;
    private _groupBy?;
    private _limit;
    private _select;
    constructor(init?: SearchInit);
    private clone;
    where(where?: WhereInput): Search;
    rank(rank?: RankInput): Search;
    groupBy(groupBy?: GroupByInput): Search;
    limit(limit?: LimitInput, offset?: number): Search;
    select(keys?: SelectInput): Search;
    select(...keys: SelectKeyInput[]): Search;
    selectAll(): Search;
    get whereClause(): WhereExpression | undefined;
    get rankExpression(): RankExpression | undefined;
    get groupByConfig(): GroupBy | undefined;
    get limitConfig(): Limit;
    get selectConfig(): Select;
    toPayload(): SearchPayload;
}
type SearchLike = Search | SearchInit;
declare const toSearch: (input: SearchLike) => Search;

interface SearchResultRow {
    id: string;
    document?: string | null;
    embedding?: number[] | null;
    metadata?: Metadata | null;
    score?: number | null;
}
declare class SearchResult {
    readonly ids: string[][];
    readonly documents: Array<Array<string | null> | null>;
    readonly embeddings: Array<Array<Array<number> | null> | null>;
    readonly metadatas: Array<Array<Metadata | null> | null>;
    readonly scores: Array<Array<number | null> | null>;
    readonly select: SearchResponse["select"];
    constructor(response: SearchResponse);
    rows(): SearchResultRow[][];
}

declare const DOCUMENT_KEY = "#document";
declare const EMBEDDING_KEY = "#embedding";
/**
 * Supported cloud providers for customer-managed encryption keys.
 * Currently only Google Cloud Platform (GCP) is supported.
 */
declare enum CmekProvider {
    GCP = "gcp"
}
/**
 * Customer-managed encryption key (CMEK) for collection data encryption.
 *
 * CMEK allows you to use your own encryption keys managed by cloud providers'
 * key management services (KMS) instead of default provider-managed keys. This
 * gives you greater control over key lifecycle, access policies, and audit logging.
 *
 * @example
 * ```typescript
 * // Create a CMEK for GCP
 * const cmek = Cmek.gcp(
 *   "projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key"
 * );
 *
 * // Validate the resource name format
 * if (cmek.validatePattern()) {
 *   console.log("Valid CMEK format");
 * }
 *
 * // Use in collection schema
 * const schema = new Schema();
 * schema.setCmek(cmek);
 * ```
 *
 * @note Pattern validation only checks format correctness. It does not verify
 * that the key exists or is accessible. Key permissions and access control
 * must be configured separately in your cloud provider's console.
 */
declare class Cmek {
    private static readonly GCP_PATTERN;
    readonly provider: CmekProvider;
    readonly resource: string;
    private constructor();
    /**
     * Create a CMEK instance for Google Cloud Platform.
     *
     * @param resource - GCP Cloud KMS resource name in the format:
     *   projects/{project-id}/locations/{location}/keyRings/{key-ring}/cryptoKeys/{key-name}
     *
     * @returns A new CMEK instance configured for GCP
     *
     * @example
     * ```typescript
     * const cmek = Cmek.gcp(
     *   "projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key"
     * );
     * ```
     */
    static gcp(resource: string): Cmek;
    /**
     * Validate the CMEK resource name format.
     *
     * Validates that the resource name matches the expected pattern for the
     * provider. This is a format check only and does not verify that the key
     * exists or that you have access to it.
     *
     * For GCP, the expected format is:
     *   projects/{project}/locations/{location}/keyRings/{keyRing}/cryptoKeys/{cryptoKey}
     *
     * @returns true if the resource name format is valid, false otherwise
     *
     * @example
     * ```typescript
     * const cmek = Cmek.gcp("projects/p/locations/l/keyRings/r/cryptoKeys/k");
     * cmek.validatePattern(); // Returns true
     *
     * const badCmek = Cmek.gcp("invalid-format");
     * badCmek.validatePattern(); // Returns false
     * ```
     */
    validatePattern(): boolean;
    /**
     * Serialize CMEK to object format for API transport.
     *
     * Returns an object with the provider variant as the key and resource as the value.
     *
     * @returns Object containing the provider variant and resource identifier
     *
     * @example
     * ```typescript
     * const cmek = Cmek.gcp("projects/p/locations/l/keyRings/r/cryptoKeys/k");
     * cmek.toJSON();
     * // Returns: { gcp: 'projects/p/locations/l/keyRings/r/cryptoKeys/k' }
     * ```
     */
    toJSON(): Record<string, unknown>;
    /**
     * Deserialize CMEK from object format.
     *
     * Expects the provider variant as the key and resource as the value.
     *
     * @param data - Object containing provider variant and resource
     * @returns Deserialized CMEK instance
     * @throws Error if the provider is unsupported or data is malformed
     *
     * @example
     * ```typescript
     * const data = { gcp: 'projects/p/locations/l/keyRings/r/cryptoKeys/k' };
     * const cmek = Cmek.fromJSON(data);
     * ```
     */
    static fromJSON(data: Record<string, unknown>): Cmek;
}
declare class FtsIndexConfig {
    readonly type = "FtsIndexConfig";
}
declare class StringInvertedIndexConfig {
    readonly type = "StringInvertedIndexConfig";
}
declare class IntInvertedIndexConfig {
    readonly type = "IntInvertedIndexConfig";
}
declare class FloatInvertedIndexConfig {
    readonly type = "FloatInvertedIndexConfig";
}
declare class BoolInvertedIndexConfig {
    readonly type = "BoolInvertedIndexConfig";
}
interface VectorIndexConfigOptions {
    space?: Space | null;
    embeddingFunction?: EmbeddingFunction | null;
    sourceKey?: string | Key | null;
    hnsw?: HnswIndexConfig | null;
    spann?: SpannIndexConfig | null;
}
declare class VectorIndexConfig {
    readonly type = "VectorIndexConfig";
    space: Space | null;
    embeddingFunction?: EmbeddingFunction | null;
    sourceKey: string | null;
    hnsw: HnswIndexConfig | null;
    spann: SpannIndexConfig | null;
    constructor(options?: VectorIndexConfigOptions);
}
interface SparseVectorIndexConfigOptions {
    embeddingFunction?: SparseEmbeddingFunction | null;
    sourceKey?: string | Key | null;
    bm25?: boolean | null;
}
declare class SparseVectorIndexConfig {
    readonly type = "SparseVectorIndexConfig";
    embeddingFunction?: SparseEmbeddingFunction | null;
    sourceKey: string | null;
    bm25: boolean | null;
    constructor(options?: SparseVectorIndexConfigOptions);
}
declare class FtsIndexType {
    enabled: boolean;
    config: FtsIndexConfig;
    constructor(enabled: boolean, config: FtsIndexConfig);
}
declare class StringInvertedIndexType {
    enabled: boolean;
    config: StringInvertedIndexConfig;
    constructor(enabled: boolean, config: StringInvertedIndexConfig);
}
declare class VectorIndexType {
    enabled: boolean;
    config: VectorIndexConfig;
    constructor(enabled: boolean, config: VectorIndexConfig);
}
declare class SparseVectorIndexType {
    enabled: boolean;
    config: SparseVectorIndexConfig;
    constructor(enabled: boolean, config: SparseVectorIndexConfig);
}
declare class IntInvertedIndexType {
    enabled: boolean;
    config: IntInvertedIndexConfig;
    constructor(enabled: boolean, config: IntInvertedIndexConfig);
}
declare class FloatInvertedIndexType {
    enabled: boolean;
    config: FloatInvertedIndexConfig;
    constructor(enabled: boolean, config: FloatInvertedIndexConfig);
}
declare class BoolInvertedIndexType {
    enabled: boolean;
    config: BoolInvertedIndexConfig;
    constructor(enabled: boolean, config: BoolInvertedIndexConfig);
}
declare class StringValueType {
    ftsIndex: FtsIndexType | null;
    stringInvertedIndex: StringInvertedIndexType | null;
    constructor(ftsIndex?: FtsIndexType | null, stringInvertedIndex?: StringInvertedIndexType | null);
}
declare class FloatListValueType {
    vectorIndex: VectorIndexType | null;
    constructor(vectorIndex?: VectorIndexType | null);
}
declare class SparseVectorValueType {
    sparseVectorIndex: SparseVectorIndexType | null;
    constructor(sparseVectorIndex?: SparseVectorIndexType | null);
}
declare class IntValueType {
    intInvertedIndex: IntInvertedIndexType | null;
    constructor(intInvertedIndex?: IntInvertedIndexType | null);
}
declare class FloatValueType {
    floatInvertedIndex: FloatInvertedIndexType | null;
    constructor(floatInvertedIndex?: FloatInvertedIndexType | null);
}
declare class BoolValueType {
    boolInvertedIndex: BoolInvertedIndexType | null;
    constructor(boolInvertedIndex?: BoolInvertedIndexType | null);
}
declare class ValueTypes {
    string: StringValueType | null;
    floatList: FloatListValueType | null;
    sparseVector: SparseVectorValueType | null;
    intValue: IntValueType | null;
    floatValue: FloatValueType | null;
    boolean: BoolValueType | null;
}
type IndexConfig = FtsIndexConfig | VectorIndexConfig | SparseVectorIndexConfig | StringInvertedIndexConfig | IntInvertedIndexConfig | FloatInvertedIndexConfig | BoolInvertedIndexConfig;
type JsonDict = Record<string, any>;
/**
 * Collection schema for configuring indexes and encryption.
 *
 * The schema controls how data is indexed and can optionally specify
 * customer-managed encryption keys (CMEK) for data at rest.
 *
 * @example
 * ```typescript
 * const schema = new Schema();
 * // Optionally add CMEK
 * schema.setCmek(Cmek.gcp("projects/p/locations/l/keyRings/r/cryptoKeys/k"));
 * ```
 */
declare class Schema {
    defaults: ValueTypes;
    keys: Record<string, ValueTypes>;
    cmek: Cmek | null;
    constructor();
    /**
     * Set the customer-managed encryption key for this collection.
     *
     * CMEK allows you to use your own encryption keys managed by cloud providers'
     * key management services instead of default provider-managed keys.
     *
     * @param cmek - CMEK instance or null to remove encryption
     * @returns this for method chaining
     *
     * @example
     * ```typescript
     * const schema = new Schema();
     * schema.setCmek(Cmek.gcp(
     *   "projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key"
     * ));
     * ```
     */
    setCmek(cmek: Cmek | null): this;
    createIndex(config?: IndexConfig, key?: string): this;
    deleteIndex(config?: IndexConfig, key?: string): this;
    serializeToJSON(): Schema$1;
    static deserializeFromJSON(json: Schema$1 | JsonDict | null, client: ChromaClient): Promise<Schema | undefined>;
    private setVectorIndexConfig;
    private setFtsIndexConfig;
    private setIndexInDefaults;
    private setIndexForKey;
    private enableAllIndexesForKey;
    private disableAllIndexesForKey;
    private validateSingleSparseVectorIndex;
    private validateSparseVectorConfig;
    private initializeDefaults;
    private initializeKeys;
    private serializeValueTypes;
    private serializeStringValueType;
    private serializeFloatListValueType;
    private serializeSparseVectorValueType;
    private serializeIntValueType;
    private serializeFloatValueType;
    private serializeBoolValueType;
    private serializeConfig;
    private serializeVectorConfig;
    private serializeSparseVectorConfig;
    private static deserializeValueTypes;
    private static deserializeStringValueType;
    private static deserializeFloatListValueType;
    private static deserializeSparseVectorValueType;
    private static deserializeIntValueType;
    private static deserializeFloatValueType;
    private static deserializeBoolValueType;
    private static deserializeVectorConfig;
    private static deserializeSparseVectorConfig;
    resolveEmbeddingFunction(): EmbeddingFunction | null | undefined;
}

interface CollectionConfiguration {
    embeddingFunction?: EmbeddingFunctionConfiguration | null;
    hnsw?: HNSWConfiguration | null;
    spann?: SpannConfiguration | null;
}
type HNSWConfiguration = HnswConfiguration & {
    batch_size?: number | null;
    num_threads?: number | null;
};
type CreateCollectionConfiguration = Omit<CollectionConfiguration, "embeddingFunction"> & {
    embeddingFunction?: EmbeddingFunction;
};
interface UpdateCollectionConfiguration {
    embeddingFunction?: EmbeddingFunction;
    hnsw?: UpdateHNSWConfiguration;
    spann?: UpdateSPANNConfiguration;
}
interface UpdateHNSWConfiguration {
    batch_size?: number;
    ef_search?: number;
    num_threads?: number;
    resize_factor?: number;
    sync_threshold?: number;
}
interface UpdateSPANNConfiguration {
    search_nprobe?: number;
    ef_search?: number;
}
/**
 * Validate user provided collection configuration and embedding function. Returns a
 * CollectionConfiguration to be used in collection creation.
 */
declare const processCreateCollectionConfig: ({ configuration, embeddingFunction, metadata, schema, }: {
    configuration?: CreateCollectionConfiguration;
    embeddingFunction?: EmbeddingFunction | null;
    metadata?: CollectionMetadata;
    schema?: Schema;
}) => Promise<CollectionConfiguration>;
/**
 *
 */
declare const processUpdateCollectionConfig: ({ collectionName, currentConfiguration, currentEmbeddingFunction, newConfiguration, client, }: {
    collectionName: string;
    currentConfiguration: CollectionConfiguration;
    currentEmbeddingFunction?: EmbeddingFunction;
    newConfiguration: UpdateCollectionConfiguration;
    client: ChromaClient;
}) => Promise<{
    updateConfiguration?: UpdateCollectionConfiguration$1;
    updateEmbeddingFunction?: EmbeddingFunction;
}>;

/**
 * Configuration options for the ChromaClient.
 */
interface ChromaClientArgs {
    /** The host address of the Chroma server. Defaults to 'localhost' */
    host?: string;
    /** The port number of the Chroma server. Defaults to 8000 */
    port?: number;
    /** Whether to use SSL/HTTPS for connections. Defaults to false */
    ssl?: boolean;
    /** The tenant name in the Chroma server to connect to */
    tenant?: string;
    /** The database name to connect to */
    database?: string;
    /** Additional HTTP headers to send with requests */
    headers?: Record<string, string>;
    /** Additional fetch options for HTTP requests */
    fetchOptions?: RequestInit;
    /** @deprecated Use host, port, and ssl instead */
    path?: string;
    /** @deprecated */
    auth?: Record<string, string>;
}
/**
 * Main client class for interacting with ChromaDB.
 * Provides methods for managing collections and performing operations on them.
 */
declare class ChromaClient {
    private _tenant;
    private _database;
    private _preflightChecks;
    private _headers;
    private readonly apiClient;
    /**
     * Creates a new ChromaClient instance.
     * @param args - Configuration options for the client
     */
    constructor(args?: Partial<ChromaClientArgs>);
    /**
     * Gets the current tenant name.
     * @returns The tenant name or undefined if not set
     */
    get tenant(): string | undefined;
    protected set tenant(tenant: string | undefined);
    /**
     * Gets the current database name.
     * @returns The database name or undefined if not set
     */
    get database(): string | undefined;
    protected set database(database: string | undefined);
    /**
     * Gets the preflight checks
     * @returns The preflight checks or undefined if not set
     */
    get preflightChecks(): ChecklistResponse | undefined;
    protected set preflightChecks(preflightChecks: ChecklistResponse | undefined);
    get headers(): Record<string, string> | undefined;
    /** @ignore */
    _path(): Promise<{
        tenant: string;
        database: string;
    }>;
    /**
     * Gets the user identity information including tenant and accessible databases.
     * @returns Promise resolving to user identity data
     */
    getUserIdentity(): Promise<UserIdentity>;
    /**
     * Sends a heartbeat request to check server connectivity.
     * @returns Promise resolving to the server's nanosecond heartbeat timestamp
     */
    heartbeat(): Promise<number>;
    /**
     * Lists all collections in the current database.
     * @param args - Optional pagination parameters
     * @param args.limit - Maximum number of collections to return (default: 100)
     * @param args.offset - Number of collections to skip (default: 0)
     * @returns Promise resolving to an array of Collection instances
     */
    listCollections(args?: Partial<{
        limit: number;
        offset: number;
    }>): Promise<Collection[]>;
    /**
     * Gets the total number of collections in the current database.
     * @returns Promise resolving to the collection count
     */
    countCollections(): Promise<number>;
    /**
     * Creates a new collection with the specified configuration.
     * @param options - Collection creation options
     * @param options.name - The name of the collection
     * @param options.configuration - Optional collection configuration
     * @param options.metadata - Optional metadata for the collection
     * @param options.embeddingFunction - Optional embedding function to use. Defaults to `DefaultEmbeddingFunction` from @chroma-core/default-embed
     * @returns Promise resolving to the created Collection instance
     * @throws Error if a collection with the same name already exists
     */
    createCollection({ name, configuration, metadata, embeddingFunction, schema, }: {
        name: string;
        configuration?: CreateCollectionConfiguration;
        metadata?: CollectionMetadata;
        embeddingFunction?: EmbeddingFunction | null;
        schema?: Schema;
    }): Promise<Collection>;
    /**
     * Retrieves an existing collection by name.
     * @param options - Collection retrieval options
     * @param options.name - The name of the collection to retrieve
     * @param options.embeddingFunction - Optional embedding function. Should match the one used to create the collection.
     * @returns Promise resolving to the Collection instance
     * @throws Error if the collection does not exist
     */
    getCollection({ name, embeddingFunction, }: {
        name: string;
        embeddingFunction?: EmbeddingFunction;
    }): Promise<Collection>;
    /**
     * Retrieves an existing collection by its Chroma Resource Name (CRN).
     * @param crn - The Chroma Resource Name of the collection to retrieve
     * @returns Promise resolving to the Collection instance
     * @throws Error if the collection does not exist
     */
    getCollectionByCrn(crn: string): Promise<Collection>;
    /**
     * Retrieves multiple collections by name.
     * @param items - Array of collection names or objects with name and optional embedding function (should match the ones used to create the collections)
     * @returns Promise resolving to an array of Collection instances
     */
    getCollections(items: string[] | {
        name: string;
        embeddingFunction?: EmbeddingFunction;
    }[]): Promise<Collection[]>;
    /**
     * Gets an existing collection or creates it if it doesn't exist.
     * @param options - Collection options
     * @param options.name - The name of the collection
     * @param options.configuration - Optional collection configuration (used only if creating)
     * @param options.metadata - Optional metadata for the collection (used only if creating)
     * @param options.embeddingFunction - Optional embedding function to use
     * @returns Promise resolving to the Collection instance
     */
    getOrCreateCollection({ name, configuration, metadata, embeddingFunction, schema, }: {
        name: string;
        configuration?: CreateCollectionConfiguration;
        metadata?: CollectionMetadata;
        embeddingFunction?: EmbeddingFunction | null;
        schema?: Schema;
    }): Promise<Collection>;
    /**
     * Deletes a collection and all its data.
     * @param options - Deletion options
     * @param options.name - The name of the collection to delete
     */
    deleteCollection({ name }: {
        name: string;
    }): Promise<void>;
    /**
     * Resets the entire database, deleting all collections and data.
     * @returns Promise that resolves when the reset is complete
     * @warning This operation is irreversible and will delete all data
     */
    reset(): Promise<void>;
    /**
     * Gets the version of the Chroma server.
     * @returns Promise resolving to the server version string
     */
    version(): Promise<string>;
    /**
     * Gets the preflight checks
     * @returns Promise resolving to the preflight checks
     */
    getPreflightChecks(): Promise<ChecklistResponse>;
    /**
     * Gets the max batch size
     * @returns Promise resolving to the max batch size
     */
    getMaxBatchSize(): Promise<number>;
    /**
     * Gets whether base64_encoding is supported by the connected server
     * @returns Promise resolving to whether base64_encoding is supported
     */
    supportsBase64Encoding(): Promise<boolean>;
}

/**
 * Interface for collection operations using collection ID.
 * Provides methods for adding, querying, updating, and deleting records.
 */
interface Collection {
    /** Tenant name */
    tenant: string;
    /** Database name */
    database: string;
    /** Unique identifier for the collection */
    id: string;
    /** Name of the collection */
    name: string;
    /** Collection-level metadata */
    metadata: CollectionMetadata | undefined;
    /** Collection configuration settings */
    configuration: CollectionConfiguration;
    /** Optional embedding function. Must match the one used to create the collection. */
    embeddingFunction?: EmbeddingFunction;
    /** Collection schema describing index configuration */
    schema?: Schema;
    /** Gets the total number of records in the collection */
    count(): Promise<number>;
    /**
     * Adds new records to the collection.
     * @param args - Record data to add
     */
    add(args: {
        /** Unique identifiers for the records */
        ids: string[];
        /** Optional pre-computed embeddings */
        embeddings?: number[][];
        /** Optional metadata for each record */
        metadatas?: Metadata[];
        /** Optional document text (will be embedded if embeddings not provided) */
        documents?: string[];
        /** Optional URIs for the records */
        uris?: string[];
    }): Promise<void>;
    /**
     * Retrieves records from the collection based on filters.
     * @template TMeta - Type of metadata for type safety
     * @param args - Query parameters for filtering records
     * @returns Promise resolving to matching records
     */
    get<TMeta extends Metadata = Metadata>(args?: {
        /** Specific record IDs to retrieve */
        ids?: string[];
        /** Metadata-based filtering conditions */
        where?: Where;
        /** Maximum number of records to return */
        limit?: number;
        /** Number of records to skip */
        offset?: number;
        /** Document content-based filtering conditions */
        whereDocument?: WhereDocument;
        /** Fields to include in the response */
        include?: Include[];
    }): Promise<GetResult<TMeta>>;
    /**
     * Retrieves a preview of records from the collection.
     * @param args - Preview options
     * @returns Promise resolving to a sample of records
     */
    peek(args: {
        limit?: number;
    }): Promise<GetResult>;
    /**
     * Performs similarity search on the collection.
     * @template TMeta - Type of metadata for type safety
     * @param args - Query parameters for similarity search
     * @returns Promise resolving to similar records ranked by distance
     */
    query<TMeta extends Metadata = Metadata>(args: {
        /** Pre-computed query embedding vectors */
        queryEmbeddings?: number[][];
        /** Query text to be embedded and searched */
        queryTexts?: string[];
        /** Query URIs to be processed */
        queryURIs?: string[];
        /** Filter to specific record IDs */
        ids?: string[];
        /** Maximum number of results per query (default: 10) */
        nResults?: number;
        /** Metadata-based filtering conditions */
        where?: Where;
        /** Full-text search conditions */
        whereDocument?: WhereDocument;
        /** Fields to include in the response */
        include?: Include[];
    }): Promise<QueryResult<TMeta>>;
    /**
     * Modifies collection properties like name, metadata, or configuration.
     * @param args - Properties to update
     */
    modify(args: {
        /** New name for the collection */
        name?: string;
        /** New metadata for the collection */
        metadata?: CollectionMetadata;
        /** New configuration settings */
        configuration?: UpdateCollectionConfiguration;
    }): Promise<void>;
    /**
     * Creates a copy of the collection with a new name.
     * @param args - Fork options
     * @returns Promise resolving to the new Collection instance
     */
    fork({ name }: {
        name: string;
    }): Promise<Collection>;
    /**
     * Updates existing records in the collection.
     * @param args - Record data to update
     */
    update(args: {
        /** IDs of records to update */
        ids: string[];
        /** New embedding vectors */
        embeddings?: number[][];
        /** New metadata */
        metadatas?: Metadata[];
        /** New document text */
        documents?: string[];
        /** New URIs */
        uris?: string[];
    }): Promise<void>;
    /**
     * Inserts new records or updates existing ones (upsert operation).
     * @param args - Record data to upsert
     */
    upsert(args: {
        /** IDs of records to upsert */
        ids: string[];
        /** Embedding vectors */
        embeddings?: number[][];
        /** Metadata */
        metadatas?: Metadata[];
        /** Document text */
        documents?: string[];
        /** URIs */
        uris?: string[];
    }): Promise<void>;
    /**
     * Deletes records from the collection based on filters.
     * @param args - Deletion criteria
     */
    delete(args: {
        /** Specific record IDs to delete */
        ids?: string[];
        /** Metadata-based filtering for deletion */
        where?: Where;
        /** Document content-based filtering for deletion */
        whereDocument?: WhereDocument;
    }): Promise<void>;
    /**
     * Performs hybrid search on the collection using expression builders.
     * @param searches - Single search payload or array of payloads
     * @returns Promise resolving to column-major search results
     */
    search(searches: SearchLike | SearchLike[]): Promise<SearchResult>;
}

declare function withChroma(userNextConfig?: any): any;

/**
 * Configuration options for the AdminClient.
 */
interface AdminClientArgs {
    /** The host address of the Chroma server */
    host: string;
    /** The port number of the Chroma server */
    port: number;
    /** Whether to use SSL/HTTPS for connections */
    ssl: boolean;
    /** Additional HTTP headers to send with requests */
    headers?: Record<string, string>;
    /** Additional fetch options for HTTP requests */
    fetchOptions?: RequestInit;
}
/**
 * Arguments for listing databases within a tenant.
 */
interface ListDatabasesArgs {
    /** The tenant name to list databases for */
    tenant: string;
    /** Maximum number of databases to return (default: 100) */
    limit?: number;
    /** Number of databases to skip (default: 0) */
    offset?: number;
}
/**
 * Administrative client for managing ChromaDB tenants and databases.
 * Provides methods for creating, deleting, and listing tenants and databases.
 */
declare class AdminClient {
    private readonly apiClient;
    /**
     * Creates a new AdminClient instance.
     * @param args - Optional configuration for the admin client
     */
    constructor(args?: AdminClientArgs);
    /**
     * Creates a new database within a tenant.
     * @param options - Database creation options
     * @param options.name - Name of the database to create
     * @param options.tenant - Tenant that will own the database
     */
    createDatabase({ name, tenant, }: {
        name: string;
        tenant: string;
    }): Promise<void>;
    /**
     * Retrieves information about a specific database.
     * @param options - Database retrieval options
     * @param options.name - Name of the database to retrieve
     * @param options.tenant - Tenant that owns the database
     * @returns Promise resolving to database information
     */
    getDatabase({ name, tenant, }: {
        name: string;
        tenant: string;
    }): Promise<Database>;
    /**
     * Deletes a database and all its data.
     * @param options - Database deletion options
     * @param options.name - Name of the database to delete
     * @param options.tenant - Tenant that owns the database
     * @warning This operation is irreversible and will delete all data
     */
    deleteDatabase({ name, tenant, }: {
        name: string;
        tenant: string;
    }): Promise<void>;
    /**
     * Lists all databases within a tenant.
     * @param args - Listing parameters including tenant and pagination
     * @returns Promise resolving to an array of database information
     */
    listDatabases(args: ListDatabasesArgs): Promise<Database[]>;
    /**
     * Creates a new tenant.
     * @param options - Tenant creation options
     * @param options.name - Name of the tenant to create
     */
    createTenant({ name }: {
        name: string;
    }): Promise<void>;
    /**
     * Retrieves information about a specific tenant.
     * @param options - Tenant retrieval options
     * @param options.name - Name of the tenant to retrieve
     * @returns Promise resolving to the tenant name
     */
    getTenant({ name }: {
        name: string;
    }): Promise<string>;
}

/**
 * ChromaDB cloud client for connecting to hosted Chroma instances.
 * Extends ChromaClient with cloud-specific authentication and configuration.
 */
declare class CloudClient extends ChromaClient {
    /**
     * Creates a new CloudClient instance for Chroma Cloud.
     * @param args - Cloud client configuration options
     */
    constructor(args?: Partial<{
        /** API key for authentication (or set CHROMA_API_KEY env var) */
        apiKey?: string;
        /** Host address of the Chroma cloud server. Defaults to 'api.trychroma.com' */
        host?: string;
        /** Port number of the Chroma cloud server. Defaults to 443 */
        port?: number;
        /** Tenant name for multi-tenant deployments */
        tenant?: string;
        /** Database name to connect to */
        database?: string;
        /** Additional fetch options for HTTP requests */
        fetchOptions?: RequestInit;
    }>);
}
/**
 * Admin client for Chroma Cloud administrative operations.
 * Extends AdminClient with cloud-specific authentication.
 */
declare class AdminCloudClient extends AdminClient {
    /**
     * Creates a new AdminCloudClient instance for cloud admin operations.
     * @param args - Admin cloud client configuration options
     */
    constructor(args?: Partial<{
        /** API key for authentication (or set CHROMA_API_KEY env var) */
        apiKey?: string;
        /** Host address of the Chroma cloud server. Defaults to 'api.trychroma.com' */
        host?: string;
        /** Port number of the Chroma cloud server. Defaults to 443 */
        port?: number;
        /** Additional fetch options for HTTP requests */
        fetchOptions?: RequestInit;
    }>);
}

/**
 * This is a generic Chroma error.
 */
declare class ChromaError extends Error {
    readonly cause?: unknown | undefined;
    constructor(name: string, message: string, cause?: unknown | undefined);
}
/**
 * Indicates that there was a problem with the connection to the Chroma server (e.g. the server is down or the client is not connected to the internet)
 */
declare class ChromaConnectionError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
/** Indicates that the server encountered an error while handling the request. */
declare class ChromaServerError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
/** Indicate that there was an issue with the request that the client made. */
declare class ChromaClientError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
/** The request lacked valid authentication. */
declare class ChromaUnauthorizedError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
/** The user does not have permission to access the requested resource. */
declare class ChromaForbiddenError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare class ChromaNotFoundError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare class ChromaValueError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare class InvalidCollectionError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare class InvalidArgumentError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare class ChromaUniqueError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare class ChromaQuotaExceededError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare class ChromaRateLimitError extends Error {
    readonly cause?: unknown | undefined;
    name: string;
    constructor(message: string, cause?: unknown | undefined);
}
declare function createErrorByType(type: string, message: string): InvalidCollectionError | InvalidArgumentError | undefined;

export { Abs, AdminClient, type AdminClientArgs, AdminCloudClient, Aggregate, type AggregateInput, type AggregateJSON, type AnyEmbeddingFunction, type BaseRecordSet, BoolInvertedIndexConfig, BoolInvertedIndexType, BoolValueType, ChromaClient, type ChromaClientArgs, ChromaClientError, ChromaConnectionError, ChromaError, ChromaForbiddenError, ChromaNotFoundError, ChromaQuotaExceededError, ChromaRateLimitError, ChromaServerError, ChromaUnauthorizedError, ChromaUniqueError, ChromaValueError, CloudClient, Cmek, CmekProvider, type Collection, type CollectionConfiguration, type CollectionMetadata, type CreateCollectionConfiguration, DOCUMENT_KEY, Div, EMBEDDING_KEY, type EmbeddingFunction, type EmbeddingFunctionClass, type EmbeddingFunctionSpace, Exp, FloatInvertedIndexConfig, FloatInvertedIndexType, FloatListValueType, FloatValueType, FtsIndexConfig, FtsIndexType, GetResult, GroupBy, type GroupByInput, type GroupByJSON, type HNSWConfiguration, IncludeEnum, type IndexConfig, IntInvertedIndexConfig, IntInvertedIndexType, IntValueType, InvalidArgumentError, InvalidCollectionError, K, Key, type KeyFactory, Knn, type KnnOptions, Limit, type LimitInput, type LimitOptions, type ListDatabasesArgs, Log, Max, MaxK, type Metadata, Min, MinK, Mul, type PreparedInsertRecordSet, type PreparedRecordSet, type QueryRecordSet, QueryResult, type QueryRowResult, RankExpression, type RankInput, type RankLiteral, type RecordSet, Rrf, type RrfOptions, Schema, Search, type SearchInit, type SearchLike, SearchResult, type SearchResultRow, Select, type SelectInput, type SelectKeyInput, type SparseEmbeddingFunction, type SparseEmbeddingFunctionClass, type SparseVector, SparseVectorIndexConfig, type SparseVectorIndexConfigOptions, SparseVectorIndexType, SparseVectorValueType, StringInvertedIndexConfig, StringInvertedIndexType, StringValueType, Sub, Sum, type UpdateCollectionConfiguration, type UpdateHNSWConfiguration, type UpdateSPANNConfiguration, type UserIdentity, Val, ValueTypes, VectorIndexConfig, type VectorIndexConfigOptions, VectorIndexType, type Where, type WhereDocument, WhereExpression, type WhereInput, type WhereJSON, baseRecordSetFields, createErrorByType, getDefaultEFConfig, getEmbeddingFunction, getSparseEmbeddingFunction, knownEmbeddingFunctions, knownSparseEmbeddingFunctions, processCreateCollectionConfig, processUpdateCollectionConfig, recordSetFields, registerEmbeddingFunction, registerSparseEmbeddingFunction, serializeEmbeddingFunction, toSearch, withChroma };
