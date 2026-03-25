import { GetUserIdentityResponse, Include, SparseVector } from "./api";

/**
 * User identity information including tenant and database access.
 */
export type UserIdentity = GetUserIdentityResponse;

/**
 * Re-export SparseVector type for external use
 */
export type { SparseVector };

/**
 * Metadata that can be associated with a collection.
 * Values must be boolean, number, or string types.
 */
export type CollectionMetadata = Record<
  string,
  boolean | number | string | SparseVector | null
>;

/**
 * Metadata that can be associated with individual records.
 * Values must be boolean, number, or string types.
 */
export type Metadata = Record<
  string,
  boolean | number | string | SparseVector | null
>;

/**
 * Base interface for record sets containing optional fields.
 */
export interface BaseRecordSet {
  /** Array of embedding vectors */
  embeddings?: number[][];
  /** Array of metadata objects */
  metadatas?: Metadata[];
  /** Array of document text content */
  documents?: string[];
  /** Array of URIs/URLs */
  uris?: string[];
}

export const baseRecordSetFields = [
  "ids",
  "embeddings",
  "metadatas",
  "documents",
  "uris",
];

/**
 * Complete record set with required IDs for operations like add/update.
 */
export interface RecordSet extends BaseRecordSet {
  /** Array of unique record identifiers */
  ids: string[];
}

export interface PreparedRecordSet extends Omit<RecordSet, "embeddings"> {
  embeddings?: number[][] | string[];
}

export interface PreparedInsertRecordSet extends PreparedRecordSet {
  embeddings: number[][] | string[];
}

export const recordSetFields = [...baseRecordSetFields, "ids"];

/**
 * Record set for query operations with required embeddings.
 */
export interface QueryRecordSet extends BaseRecordSet {
  /** Optional array of record IDs to filter by */
  ids?: string[];
  /** Array of query embedding vectors (required for queries) */
  embeddings: number[][];
}

type LiteralValue = string | number | boolean;

type LogicalOperator = "$and" | "$or";

type WhereOperator = "$gt" | "$gte" | "$lt" | "$lte" | "$ne" | "$eq";

type InclusionExclusionOperator = "$in" | "$nin";

type OperatorExpression =
  | { $gt: LiteralValue }
  | { $gte: LiteralValue }
  | { $lt: LiteralValue }
  | { $lte: LiteralValue }
  | { $ne: LiteralValue }
  | { $eq: LiteralValue }
  | { $and: LiteralValue }
  | { $or: LiteralValue }
  | { $in: LiteralValue[] }
  | { $nin: LiteralValue[] };

/**
 * Where clause for filtering records based on metadata.
 * Supports field equality, comparison operators, and logical operators.
 */
export type Where =
  | { [key: string]: LiteralValue | OperatorExpression }
  | { $and: Where[] }
  | { $or: Where[] };

type WhereDocumentOperator =
  | "$contains"
  | "$not_contains"
  | "$matches"
  | "$not_matches"
  | "$regex"
  | "$not_regex"
  | LogicalOperator;

/**
 * Where clause for filtering based on document content.
 * Supports text search operators and logical combinations.
 */
export type WhereDocument =
  | { $contains: string }
  | { $not_contains: string }
  | { $matches: string }
  | { $not_matches: string }
  | { $regex: string }
  | { $not_regex: string }
  | { $and: WhereDocument[] }
  | { $or: WhereDocument[] };

/**
 * Enum specifying which fields to include in query results.
 */
export enum IncludeEnum {
  /** Include similarity distances in results */
  distances = "distances",
  /** Include document text content in results */
  documents = "documents",
  /** Include embedding vectors in results */
  embeddings = "embeddings",
  /** Include metadata objects in results */
  metadatas = "metadatas",
  /** Include URIs in results */
  uris = "uris",
}

/**
 * Result class for get operations, containing retrieved records.
 * @template TMeta - The type of metadata associated with records
 */
export class GetResult<TMeta extends Metadata = Metadata> {
  public readonly documents: (string | null)[];
  public readonly embeddings: number[][];
  public readonly ids: string[];
  public readonly include: Include[];
  public readonly metadatas: (TMeta | null)[];
  public readonly uris: (string | null)[];

  /**
   * Creates a new GetResult instance.
   * @param data - The result data containing all fields
   */
  constructor({
    documents,
    embeddings,
    ids,
    include,
    metadatas,
    uris,
  }: {
    documents: (string | null)[];
    embeddings: number[][];
    ids: string[];
    include: Include[];
    metadatas: (TMeta | null)[];
    uris: (string | null)[];
  }) {
    this.documents = documents;
    this.embeddings = embeddings;
    this.ids = ids;
    this.include = include;
    this.metadatas = metadatas;
    this.uris = uris;
  }

  /**
   * Converts the result to a row-based format for easier iteration.
   * @returns Object containing include fields and array of record objects
   */
  public rows() {
    return this.ids.map((id, index) => {
      return {
        id,
        document: this.include.includes("documents")
          ? this.documents[index]
          : undefined,
        embedding: this.include.includes("embeddings")
          ? this.embeddings[index]
          : undefined,
        metadata: this.include.includes("metadatas")
          ? this.metadatas[index]
          : undefined,
        uri: this.include.includes("uris") ? this.uris[index] : undefined,
      };
    });
  }
}

/**
 * Interface for query results in row format.
 * @template TMeta - The type of metadata associated with records
 */
export interface QueryRowResult<TMeta extends Metadata = Metadata> {
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
export class QueryResult<TMeta extends Metadata = Metadata> {
  public readonly distances: (number | null)[][];
  public readonly documents: (string | null)[][];
  public readonly embeddings: (number[] | null)[][];
  public readonly ids: string[][];
  public readonly include: Include[];
  public readonly metadatas: (TMeta | null)[][];
  public readonly uris: (string | null)[][];

  /**
   * Creates a new QueryResult instance.
   * @param data - The query result data containing all fields
   */
  constructor({
    distances,
    documents,
    embeddings,
    ids,
    include,
    metadatas,
    uris,
  }: {
    distances: (number | null)[][];
    documents: (string | null)[][];
    embeddings: (number[] | null)[][];
    ids: string[][];
    include: Include[];
    metadatas: (TMeta | null)[][];
    uris: (string | null)[][];
  }) {
    this.distances = distances;
    this.documents = documents;
    this.embeddings = embeddings;
    this.ids = ids;
    this.include = include;
    this.metadatas = metadatas;
    this.uris = uris;
  }

  /**
   * Converts the query result to a row-based format for easier iteration.
   * @returns Object containing include fields and structured query results
   */
  public rows(): QueryRowResult<TMeta>[][] {
    const queries: {
      distance?: number | null;
      document?: string | null;
      embedding?: number[] | null;
      id: string;
      metadata?: TMeta | null;
      uri?: string | null;
    }[][] = [];

    for (let q = 0; q < this.ids.length; q++) {
      const records = this.ids[q].map((id, index) => {
        return {
          id,
          document: this.include.includes("documents")
            ? this.documents[q][index]
            : undefined,
          embedding: this.include.includes("embeddings")
            ? this.embeddings[q][index]
            : undefined,
          metadata: this.include.includes("metadatas")
            ? this.metadatas[q][index]
            : undefined,
          uri: this.include.includes("uris") ? this.uris[q][index] : undefined,
          distance: this.include.includes("distances")
            ? this.distances[q][index]
            : undefined,
        };
      });

      queries.push(records);
    }

    return queries;
  }
}
