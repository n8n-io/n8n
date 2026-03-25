/// <reference types="node" />
import { FilterValue } from '../filters/index.js';
import { MultiTargetVectorJoin, ReturnVectors } from '../index.js';
import { Sorting } from '../sort/classes.js';
import { GroupByOptions, GroupByReturn, QueryMetadata, QueryProperty, QueryReference, RerankOptions, WeaviateObject, WeaviateReturn } from '../types/index.js';
import { IncludeVector, PrimitiveKeys } from '../types/internal.js';
/** Options available in the `query.fetchObjectById` method */
export type FetchObjectByIdOptions<T, I> = {
    /** Whether to include the vector of the object in the response. If using named vectors, pass an array of strings to include only specific vectors. */
    includeVector?: I;
    /**
     * Which properties of the object to return. Can be primitive, in which case specify their names, or nested, in which case
     * use the QueryNested<T> type. If not specified, all properties are returned.
     */
    returnProperties?: QueryProperty<T>[];
    /** Which references of the object to return. If not specified, no references are returned. */
    returnReferences?: QueryReference<T>[];
};
/** Options available in the `query.fetchObjects` method */
export type FetchObjectsOptions<T, I> = {
    /** How many objects to return in the query */
    limit?: number;
    /** How many objects to skip in the query. Incompatible with the `after` cursor */
    offset?: number;
    /** The cursor to start the query from. Incompatible with the `offset` param */
    after?: string;
    /** The filters to be applied to the query. Use `weaviate.filter.*` to create filters */
    filters?: FilterValue;
    /** The sorting to be applied to the query. Use `weaviate.sort.*` to create sorting */
    sort?: Sorting<T>;
    /** Whether to include the vector of the object in the response. If using named vectors, pass an array of strings to include only specific vectors. */
    includeVector?: I;
    /** Which metadata of the object to return. If not specified, no metadata is returned. */
    returnMetadata?: QueryMetadata;
    /**
     * Which properties of the object to return. Can be primitive, in which case specify their names, or nested, in which case
     * use the QueryNested<T> type. If not specified, all properties are returned.
     */
    returnProperties?: QueryProperty<T>[];
    /** Which references of the object to return. If not specified, no references are returned. */
    returnReferences?: QueryReference<T>[];
};
/** Base options available to all the query methods that involve searching. */
export type SearchOptions<T, I> = {
    /** How many objects to return in the query */
    limit?: number;
    /** How many objects to skip in the query. Incompatible with the `after` cursor */
    offset?: number;
    /** The [autocut](https://weaviate.io/developers/weaviate/api/graphql/additional-operators#autocut) parameter */
    autoLimit?: number;
    /** The filters to be applied to the query. Use `weaviate.filter.*` to create filters */
    filters?: FilterValue;
    /** How to rerank the query results. Requires a configured [reranking](https://weaviate.io/developers/weaviate/concepts/reranking) module. */
    rerank?: RerankOptions<T>;
    /** Whether to include the vector of the object in the response. If using named vectors, pass an array of strings to include only specific vectors. */
    includeVector?: I;
    /** Which metadata of the object to return. If not specified, no metadata is returned. */
    returnMetadata?: QueryMetadata;
    /**
     * Which properties of the object to return. Can be primitive, in which case specify their names, or nested, in which case
     * use the QueryNested<T> type. If not specified, all properties are returned.
     */
    returnProperties?: QueryProperty<T>[];
    /** Which references of the object to return. If not specified, no references are returned. */
    returnReferences?: QueryReference<T>[];
};
/** Which property of the collection to perform the keyword search on. */
export type Bm25QueryProperty<T> = {
    /** The property name to search on. */
    name: PrimitiveKeys<T>;
    /** The weight to provide to the keyword search for this property. */
    weight: number;
};
export type Bm25OperatorOr = {
    operator: 'Or';
    minimumMatch: number;
};
export type Bm25OperatorAnd = {
    operator: 'And';
};
export type Bm25OperatorOptions = Bm25OperatorOr | Bm25OperatorAnd;
export type Bm25SearchOptions<T> = {
    /** Which properties of the collection to perform the keyword search on. */
    queryProperties?: (PrimitiveKeys<T> | Bm25QueryProperty<T>)[];
    operator?: Bm25OperatorOptions;
};
/** Base options available in the `query.bm25` method */
export type BaseBm25Options<T, I> = SearchOptions<T, I> & Bm25SearchOptions<T>;
/** Options available in the `query.bm25` method when specifying the `groupBy` parameter. */
export type GroupByBm25Options<T, I> = BaseBm25Options<T, I> & {
    /** The group by options to apply to the search. */
    groupBy: GroupByOptions<T>;
};
/** Options available in the `query.bm25` method */
export type Bm25Options<T, I> = BaseBm25Options<T, I> | GroupByBm25Options<T, I> | undefined;
/** Options available to the hybrid search type only */
export type HybridSearchOptions<T, V> = {
    /** The weight of the vector score. If not specified, the default weight specified by the server is used. */
    alpha?: number;
    /** The type of fusion to apply. If not specified, the default fusion type specified by the server is used. */
    fusionType?: 'Ranked' | 'RelativeScore';
    /** The maximum tolerated similarity in the vector search before the results are cutoff from the result set. */
    maxVectorDistance?: number;
    /** The properties to search in. If not specified, all properties are searched. */
    queryProperties?: (PrimitiveKeys<T> | Bm25QueryProperty<T>)[];
    /** Specify which vector(s) to search on if using named vectors. */
    targetVector?: TargetVectorInputType<V>;
    /** The specific vector to search for or a specific vector subsearch. If not specified, the query is vectorized and used in the similarity search. */
    vector?: NearVectorInputType | HybridNearTextSubSearch | HybridNearVectorSubSearch;
    bm25Operator?: Bm25OperatorOptions;
};
/** Base options available in the `query.hybrid` method */
export type BaseHybridOptions<T, V, I> = SearchOptions<T, I> & HybridSearchOptions<T, V>;
export type HybridSubSearchBase = {
    certainty?: number;
    distance?: number;
};
export type HybridNearTextSubSearch = HybridSubSearchBase & {
    query: string | string[];
    moveTo?: MoveOptions;
    moveAway?: MoveOptions;
};
export type HybridNearVectorSubSearch = HybridSubSearchBase & {
    vector: NearVectorInputType;
};
/** Options available in the `query.hybrid` method when specifying the `groupBy` parameter. */
export type GroupByHybridOptions<T, V, I> = BaseHybridOptions<T, V, I> & {
    /** The group by options to apply to the search. */
    groupBy: GroupByOptions<T>;
};
/** Options available in the `query.hybrid` method */
export type HybridOptions<T, V, I> = BaseHybridOptions<T, V, I> | GroupByHybridOptions<T, V, I> | undefined;
export type NearSearchOptions<V> = {
    /** The minimum similarity score to return. Incompatible with the `distance` param. */
    certainty?: number;
    /** The maximum distance to search. Incompatible with the `certainty` param. */
    distance?: number;
    /** Specify which vector to search on if using named vectors. */
    targetVector?: TargetVectorInputType<V>;
};
/** Base options for the near search queries. */
export type BaseNearOptions<T, V, I> = SearchOptions<T, I> & NearSearchOptions<V>;
/** Options available in the near search queries when specifying the `groupBy` parameter. */
export type GroupByNearOptions<T, V, I> = BaseNearOptions<T, V, I> & {
    /** The group by options to apply to the search. */
    groupBy: GroupByOptions<T>;
};
/** Options available when specifying `moveTo` and `moveAway` in the `query.nearText` method. */
export type MoveOptions = {
    force: number;
    objects?: string[];
    concepts?: string[];
};
/** Base options for the `query.nearText` method. */
export type BaseNearTextOptions<T, V, I> = BaseNearOptions<T, V, I> & {
    moveTo?: MoveOptions;
    moveAway?: MoveOptions;
};
/** Options available in the near text search queries when specifying the `groupBy` parameter. */
export type GroupByNearTextOptions<T, V, I> = BaseNearTextOptions<T, V, I> & {
    groupBy: GroupByOptions<T>;
};
/** The type of the media to search for in the `query.nearMedia` method */
export type NearMediaType = 'audio' | 'depth' | 'image' | 'imu' | 'thermal' | 'video';
export type SingleVectorType = number[];
export type MultiVectorType = number[][];
/** The allowed types of primitive vectors as stored in Weaviate.
 *
 * These correspond to 1-dimensional vectors, created by modules named `x2vec-`, and 2-dimensional vectors, created by modules named `x2colbert-`.
 */
export type PrimitiveVectorType = SingleVectorType | MultiVectorType;
export type ListOfVectors<V extends PrimitiveVectorType> = {
    kind: 'listOfVectors';
    dimensionality: '1D' | '2D';
    vectors: V[];
};
/**
 * The vector(s) to search for in the `query/generate.nearVector` and `query/generate.hybrid` methods. One of:
 * - a single 1-dimensional vector, in which case pass a single number array.
 * - a single 2-dimensional vector, in which case pas a single array of number arrays.
 * - multiple named vectors, in which case pass an object of type `Record<string, PrimitiveVectorType>`.
 */
export type NearVectorInputType = PrimitiveVectorType | Record<string, PrimitiveVectorType | ListOfVectors<SingleVectorType> | ListOfVectors<MultiVectorType>>;
/**
 * Over which vector spaces to perform the vector search query in the `nearX` search method. One of:
 * - a single vector space search, in which case pass a string with the name of the vector space to search in.
 * - a multi-vector space search, in which case pass an array of strings with the names of the vector spaces to search in.
 * - a weighted multi-vector space search, in which case pass an object of type `MultiTargetVectorJoin` detailing the vector spaces to search in.
 */
export type TargetVectorInputType<V> = TargetVector<V> | TargetVector<V>[] | MultiTargetVectorJoin<V>;
export type TargetVector<V> = V extends undefined ? string : keyof V & string;
interface Bm25<T, V> {
    /**
     * Search for objects in this collection using the keyword-based BM25 algorithm.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/bm25) for a more detailed explanation.
     *
     * This overload is for performing a search without the `groupBy` param.
     *
     * @typeParam I - The vector(s) to include in the response. If using named vectors, pass an array of strings to include only specific vectors.
     * @typeParam RV - The vectors(s) to be returned in the response depending on the input in opts.includeVector.
     * @param {string} query - The query to search for.
     * @param {BaseBm25Options<T, I>} [opts] - The available options for the search excluding the `groupBy` param.
     * @returns {Promise<WeaviateReturn<T, ReturnVectors<V, I>>>} - The result of the search within the fetched collection.
     */
    bm25<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts?: BaseBm25Options<T, I>): Promise<WeaviateReturn<T, RV>>;
    /**
     * Search for objects in this collection using the keyword-based BM25 algorithm.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/bm25) for a more detailed explanation.
     *
     * This overload is for performing a search with the `groupBy` param.
     *
     * @typeParam I - The vector(s) to include in the response. If using named vectors, pass an array of strings to include only specific vectors.
     * @typeParam RV - The vectors(s) to be returned in the response depending on the input in opts.includeVector.
     * @param {string} query - The query to search for.
     * @param {GroupByBm25Options<T, I>} opts - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The result of the search within the fetched collection.
     */
    bm25<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts: GroupByBm25Options<T, I>): Promise<GroupByReturn<T, RV>>;
    /**
     * Search for objects in this collection using the keyword-based BM25 algorithm.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/bm25) for a more detailed explanation.
     *
     * This overload is for performing a search with a programmatically defined `opts` param.
     *
     * @typeParam I - The vector(s) to include in the response. If using named vectors, pass an array of strings to include only specific vectors.
     * @typeParam RV - The vectors(s) to be returned in the response depending on the input in opts.includeVector.
     * @param {string} query - The query to search for.
     * @param {Bm25Options<T, V>} [opts] - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The result of the search within the fetched collection.
     */
    bm25<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts?: Bm25Options<T, I>): QueryReturn<T, RV>;
}
interface Hybrid<T, V> {
    /**
     * Search for objects in this collection using the hybrid algorithm blending keyword-based BM25 and vector-based similarity.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/hybrid) for a more detailed explanation.
     *
     * This overload is for performing a search without the `groupBy` param.
     *
     * @typeParam I - The vector(s) to include in the response. If using named vectors, pass an array of strings to include only specific vectors.
     * @typeParam RV - The vectors(s) to be returned in the response depending on the input in opts.includeVector.
     * @param {string} query - The query to search for in the BM25 keyword search..
     * @param {BaseHybridOptions<T, V>} [opts] - The available options for the search excluding the `groupBy` param.
     * @returns {Promise<WeaviateReturn<T, V>>} - The result of the search within the fetched collection.
     */
    hybrid<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts?: BaseHybridOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    /**
     * Search for objects in this collection using the hybrid algorithm blending keyword-based BM25 and vector-based similarity.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/hybrid) for a more detailed explanation.
     *
     * This overload is for performing a search with the `groupBy` param.
     *
     * @typeParam I - The vector(s) to include in the response. If using named vectors, pass an array of strings to include only specific vectors.
     * @typeParam RV - The vectors(s) to be returned in the response depending on the input in opts.includeVector.
     * @param {string} query - The query to search for in the BM25 keyword search..
     * @param {GroupByHybridOptions<T, V>} opts - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The result of the search within the fetched collection.
     */
    hybrid<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts: GroupByHybridOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    /**
     * Search for objects in this collection using the hybrid algorithm blending keyword-based BM25 and vector-based similarity.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/hybrid) for a more detailed explanation.
     *
     * This overload is for performing a search with a programmatically defined `opts` param.
     *
     * @param {string} query - The query to search for in the BM25 keyword search..
     * @param {HybridOptions<T, V>} [opts] - The available options for the search including the `groupBy` param.
     * @returns {Promise<QueryReturn<T, V>>} - The result of the search within the fetched collection.
     */
    hybrid<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts?: HybridOptions<T, V, I>): QueryReturn<T, RV>;
}
interface NearImage<T, V> {
    /**
     * Search for objects by image in this collection using an image-capable vectorization module and vector-based similarity search.
     * You must have an image-capable vectorization module installed in order to use this method,
     * e.g. `img2vec-neural`, `multi2vec-clip`, or `multi2vec-bind.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/image) for a more detailed explanation.
     *
     * This overload is for performing a search without the `groupBy` param.
     *
     * @param {string | Buffer} image - The image to search on. This can be a base64 string, a file path string, or a buffer.
     * @param {BaseNearOptions<T, V>} [opts] - The available options for the search excluding the `groupBy` param.
     * @returns {Promise<WeaviateReturn<T, V>>} - The result of the search within the fetched collection.
     */
    nearImage<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(image: string | Buffer, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    /**
     * Search for objects by image in this collection using an image-capable vectorization module and vector-based similarity search.
     * You must have an image-capable vectorization module installed in order to use this method,
     * e.g. `img2vec-neural`, `multi2vec-clip`, or `multi2vec-bind.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/similarity) for a more detailed explanation.
     *
     * This overload is for performing a search with the `groupBy` param.
     *
     * @param {string | Buffer} image - The image to search on. This can be a base64 string, a file path string, or a buffer.
     * @param {GroupByNearOptions<T, V>} opts - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The group by result of the search within the fetched collection.
     */
    nearImage<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(image: string | Buffer, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    /**
     * Search for objects by image in this collection using an image-capable vectorization module and vector-based similarity search.
     * You must have an image-capable vectorization module installed in order to use this method,
     * e.g. `img2vec-neural`, `multi2vec-clip`, or `multi2vec-bind.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/similarity) for a more detailed explanation.
     *
     * This overload is for performing a search with a programmatically defined `opts` param.
     *
     * @param {string | Buffer} image - The image to search on. This can be a base64 string, a file path string, or a buffer.
     * @param {NearOptions<T, V>} [opts] - The available options for the search.
     * @returns {QueryReturn<T, V>} - The result of the search within the fetched collection.
     */
    nearImage<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(image: string | Buffer, opts?: NearOptions<T, V, I>): QueryReturn<T, RV>;
}
interface NearMedia<T, V> {
    /**
     * Search for objects by image in this collection using an image-capable vectorization module and vector-based similarity search.
     * You must have a multi-media-capable vectorization module installed in order to use this method, e.g. `multi2vec-bind` or `multi2vec-palm`.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/modules/retriever-vectorizer-modules/multi2vec-bind) for a more detailed explanation.
     *
     * This overload is for performing a search without the `groupBy` param.
     *
     * @param {string | Buffer} media - The media to search on. This can be a base64 string, a file path string, or a buffer.
     * @param {NearMediaType} type - The type of media to search for, e.g. 'audio'.
     * @param {BaseNearOptions<T, V>} [opts] - The available options for the search excluding the `groupBy` param.
     * @returns {Promise<WeaviateReturn<T, V>>} - The result of the search within the fetched collection.
     */
    nearMedia<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(media: string | Buffer, type: NearMediaType, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    /**
     * Search for objects by image in this collection using an image-capable vectorization module and vector-based similarity search.
     * You must have a multi-media-capable vectorization module installed in order to use this method, e.g. `multi2vec-bind` or `multi2vec-palm`.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/modules/retriever-vectorizer-modules/multi2vec-bind) for a more detailed explanation.
     *
     * This overload is for performing a search with the `groupBy` param.
     *
     * @param {string | Buffer} media - The media to search on. This can be a base64 string, a file path string, or a buffer.
     * @param {NearMediaType} type - The type of media to search for, e.g. 'audio'.
     * @param {GroupByNearOptions<T, V>} opts - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The group by result of the search within the fetched collection.
     */
    nearMedia<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(media: string | Buffer, type: NearMediaType, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    /**
     * Search for objects by image in this collection using an image-capable vectorization module and vector-based similarity search.
     * You must have a multi-media-capable vectorization module installed in order to use this method, e.g. `multi2vec-bind` or `multi2vec-palm`.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/modules/retriever-vectorizer-modules/multi2vec-bind) for a more detailed explanation.
     *
     * This overload is for performing a search with a programmatically defined `opts` param.
     *
     * @param {string | Buffer} media - The media to search on. This can be a base64 string, a file path string, or a buffer.
     * @param {NearMediaType} type - The type of media to search for, e.g. 'audio'.
     * @param {NearOptions<T, V>} [opts] - The available options for the search.
     * @returns {QueryReturn<T, V>} - The result of the search within the fetched collection.
     */
    nearMedia<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(media: string | Buffer, type: NearMediaType, opts?: NearOptions<T, V, I>): QueryReturn<T, RV>;
}
interface NearObject<T, V> {
    /**
     * Search for objects in this collection by another object using a vector-based similarity search.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/api/graphql/search-operators#nearobject) for a more detailed explanation.
     *
     * This overload is for performing a search without the `groupBy` param.
     *
     * @param {string} id - The UUID of the object to search for.
     * @param {BaseNearOptions<T, V>} [opts] - The available options for the search excluding the `groupBy` param.
     * @returns {Promise<WeaviateReturn<T, V>>} - The result of the search within the fetched collection.
     */
    nearObject<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(id: string, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    /**
     * Search for objects in this collection by another object using a vector-based similarity search.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/api/graphql/search-operators#nearobject) for a more detailed explanation.
     *
     * This overload is for performing a search with the `groupBy` param.
     *
     * @param {string} id - The UUID of the object to search for.
     * @param {GroupByNearOptions<T, V>} opts - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The group by result of the search within the fetched collection.
     */
    nearObject<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(id: string, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    /**
     * Search for objects in this collection by another object using a vector-based similarity search.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/similarity) for a more detailed explanation.
     *
     * This overload is for performing a search with a programmatically defined `opts` param.
     *
     * @param {number[]} id - The UUID of the object to search for.
     * @param {NearOptions<T, V>} [opts] - The available options for the search.
     * @returns {QueryReturn<T, V>} - The result of the search within the fetched collection.
     */
    nearObject<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(id: string, opts?: NearOptions<T, V, I>): QueryReturn<T, RV>;
}
interface NearText<T, V> {
    /**
     * Search for objects in this collection by text using text-capable vectorization module and vector-based similarity search.
     * You must have a text-capable vectorization module installed in order to use this method,
     * e.g. any of the `text2vec-` and `multi2vec-` modules.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/api/graphql/search-operators#neartext) for a more detailed explanation.
     *
     * This overload is for performing a search without the `groupBy` param.
     *
     * @param {string | string[]} query - The text query to search for.
     * @param {BaseNearTextOptions<T, V>} [opts] - The available options for the search excluding the `groupBy` param.
     * @returns {Promise<WeaviateReturn<T, V>>} - The result of the search within the fetched collection.
     */
    nearText<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string | string[], opts?: BaseNearTextOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    /**
     * Search for objects in this collection by text using text-capable vectorization module and vector-based similarity search.
     * You must have a text-capable vectorization module installed in order to use this method,
     * e.g. any of the `text2vec-` and `multi2vec-` modules.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/api/graphql/search-operators#neartext) for a more detailed explanation.
     *
     * This overload is for performing a search with the `groupBy` param.
     *
     * @param {string | string[]} query - The text query to search for.
     * @param {GroupByNearTextOptions<T, V>} opts - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The group by result of the search within the fetched collection.
     */
    nearText<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string | string[], opts: GroupByNearTextOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    /**
     * Search for objects in this collection by text using text-capable vectorization module and vector-based similarity search.
     * You must have a text-capable vectorization module installed in order to use this method,
     * e.g. any of the `text2vec-` and `multi2vec-` modules.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/api/graphql/search-operators#neartext) for a more detailed explanation.
     *
     * This overload is for performing a search with a programmatically defined `opts` param.
     *
     * @param {string | string[]} query - The text query to search for.
     * @param {NearTextOptions<T, V>} [opts] - The available options for the search.
     * @returns {QueryReturn<T, V>} - The result of the search within the fetched collection.
     */
    nearText<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string | string[], opts?: NearTextOptions<T, V, I>): QueryReturn<T, RV>;
}
interface NearVector<T, V> {
    /**
     * Search for objects by vector in this collection using a vector-based similarity search.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/similarity) for a more detailed explanation.
     *
     * This overload is for performing a search without the `groupBy` param.
     *
     * @param {NearVectorInputType} vector - The vector(s) to search on.
     * @param {BaseNearOptions<T, V>} [opts] - The available options for the search excluding the `groupBy` param.
     * @returns {Promise<WeaviateReturn<T, V>>} - The result of the search within the fetched collection.
     */
    nearVector<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(vector: NearVectorInputType, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    /**
     * Search for objects by vector in this collection using a vector-based similarity search.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/similarity) for a more detailed explanation.
     *
     * This overload is for performing a search with the `groupBy` param.
     *
     * @param {NearVectorInputType} vector - The vector(s) to search for.
     * @param {GroupByNearOptions<T, V>} opts - The available options for the search including the `groupBy` param.
     * @returns {Promise<GroupByReturn<T, V>>} - The group by result of the search within the fetched collection.
     */
    nearVector<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(vector: NearVectorInputType, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    /**
     * Search for objects by vector in this collection using a vector-based similarity search.
     *
     * See the [docs](https://weaviate.io/developers/weaviate/search/similarity) for a more detailed explanation.
     *
     * This overload is for performing a search with a programmatically defined `opts` param.
     *
     * @param {NearVectorInputType} vector - The vector(s) to search for.
     * @param {NearOptions<T, V>} [opts] - The available options for the search.
     * @returns {QueryReturn<T, V>} - The result of the search within the fetched collection.
     */
    nearVector<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(vector: NearVectorInputType, opts?: NearOptions<T, V, I>): QueryReturn<T, RV>;
}
/** All the available methods on the `.query` namespace. */
export interface Query<T, V> extends Bm25<T, V>, Hybrid<T, V>, NearImage<T, V>, NearMedia<T, V>, NearObject<T, V>, NearText<T, V>, NearVector<T, V> {
    /**
     * Retrieve an object from the server by its UUID.
     *
     * @param {string} id - The UUID of the object to retrieve.
     * @param {FetchObjectByIdOptions} [opts] - The available options for fetching the object.
     * @returns {Promise<WeaviateObject<T, V> | null>} - The object with the given UUID, or null if it does not exist.
     */
    fetchObjectById: <I extends IncludeVector<V>>(id: string, opts?: FetchObjectByIdOptions<T, I>) => Promise<WeaviateObject<T, ReturnVectors<V, I>> | null>;
    /**
     * Retrieve objects from the server without searching.
     *
     * @param {FetchObjectsOptions} [opts] - The available options for fetching the objects.
     * @returns {Promise<WeaviateReturn<T, V>>} - The objects within the fetched collection.
     */
    fetchObjects: <I extends IncludeVector<V>>(opts?: FetchObjectsOptions<T, I>) => Promise<WeaviateReturn<T, ReturnVectors<V, I>>>;
}
/** Options available in the `query.nearImage`, `query.nearMedia`, `query.nearObject`, and `query.nearVector` methods */
export type NearOptions<T, V, I> = BaseNearOptions<T, V, I> | GroupByNearOptions<T, V, I> | undefined;
/** Options available in the `query.nearText` method */
export type NearTextOptions<T, V, I> = BaseNearTextOptions<T, V, I> | GroupByNearTextOptions<T, V, I> | undefined;
/** The return type of the `query` methods. It is a union of a standard query and a group by query due to function overloading. */
export type QueryReturn<T, V> = Promise<WeaviateReturn<T, V>> | Promise<GroupByReturn<T, V>>;
export {};
