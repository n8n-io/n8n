import type {
  EmbeddingFunctionConfiguration,
  HnswIndexConfig as ApiHnswIndexConfig,
  Schema as InternalSchema,
  Space,
  SpannIndexConfig as ApiSpannIndexConfig,
  ValueTypes as ApiValueTypes,
} from "./api";
import {
  AnyEmbeddingFunction,
  EmbeddingFunction,
  getEmbeddingFunction,
  getSparseEmbeddingFunction,
  SparseEmbeddingFunction,
} from "./embedding-function";
import { Key } from "./execution";
import { ChromaClient } from "./chroma-client";

export const DOCUMENT_KEY = "#document";
export const EMBEDDING_KEY = "#embedding";

// ============================================================================
// CMEK (Customer-Managed Encryption Key) Support
// ============================================================================

/**
 * Supported cloud providers for customer-managed encryption keys.
 * Currently only Google Cloud Platform (GCP) is supported.
 */
export enum CmekProvider {
  GCP = "gcp",
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
export class Cmek {
  private static readonly GCP_PATTERN =
    /^projects\/.+\/locations\/.+\/keyRings\/.+\/cryptoKeys\/.+$/;

  readonly provider: CmekProvider;
  readonly resource: string;

  private constructor(provider: CmekProvider, resource: string) {
    this.provider = provider;
    this.resource = resource;
  }

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
  static gcp(resource: string): Cmek {
    return new Cmek(CmekProvider.GCP, resource);
  }

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
  validatePattern(): boolean {
    if (this.provider === CmekProvider.GCP) {
      return Cmek.GCP_PATTERN.test(this.resource);
    }
    return false;
  }

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
  toJSON(): Record<string, unknown> {
    if (this.provider === CmekProvider.GCP) {
      return { gcp: this.resource };
    }
    // Unreachable with current providers, but future-proof
    throw new Error(`Unknown CMEK provider: ${this.provider}`);
  }

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
  static fromJSON(data: Record<string, unknown>): Cmek {
    if ("gcp" in data && typeof data.gcp === "string") {
      return Cmek.gcp(data.gcp);
    }
    throw new Error(
      `Unsupported or missing CMEK provider in data: ${JSON.stringify(data)}`,
    );
  }
}

const STRING_VALUE_NAME = "string";
const FLOAT_LIST_VALUE_NAME = "float_list";
const SPARSE_VECTOR_VALUE_NAME = "sparse_vector";
const INT_VALUE_NAME = "int";
const FLOAT_VALUE_NAME = "float";
const BOOL_VALUE_NAME = "bool";

const FTS_INDEX_NAME = "fts_index";
const STRING_INVERTED_INDEX_NAME = "string_inverted_index";
const VECTOR_INDEX_NAME = "vector_index";
const SPARSE_VECTOR_INDEX_NAME = "sparse_vector_index";
const INT_INVERTED_INDEX_NAME = "int_inverted_index";
const FLOAT_INVERTED_INDEX_NAME = "float_inverted_index";
const BOOL_INVERTED_INDEX_NAME = "bool_inverted_index";

export class FtsIndexConfig {
  readonly type = "FtsIndexConfig";
}

export class StringInvertedIndexConfig {
  readonly type = "StringInvertedIndexConfig";
}

export class IntInvertedIndexConfig {
  readonly type = "IntInvertedIndexConfig";
}

export class FloatInvertedIndexConfig {
  readonly type = "FloatInvertedIndexConfig";
}

export class BoolInvertedIndexConfig {
  readonly type = "BoolInvertedIndexConfig";
}

export interface VectorIndexConfigOptions {
  space?: Space | null;
  embeddingFunction?: EmbeddingFunction | null;
  sourceKey?: string | Key | null;
  hnsw?: ApiHnswIndexConfig | null;
  spann?: ApiSpannIndexConfig | null;
}

export class VectorIndexConfig {
  readonly type = "VectorIndexConfig";
  space: Space | null;
  embeddingFunction?: EmbeddingFunction | null;
  sourceKey: string | null;
  hnsw: ApiHnswIndexConfig | null;
  spann: ApiSpannIndexConfig | null;

  constructor(options: VectorIndexConfigOptions = {}) {
    this.space = options.space ?? null;
    this.embeddingFunction = options.embeddingFunction;
    this.sourceKey =
      options.sourceKey instanceof Key
        ? options.sourceKey.name
        : (options.sourceKey ?? null);
    this.hnsw = options.hnsw ?? null;
    this.spann = options.spann ?? null;
  }
}

export interface SparseVectorIndexConfigOptions {
  embeddingFunction?: SparseEmbeddingFunction | null;
  sourceKey?: string | Key | null;
  bm25?: boolean | null;
}

export class SparseVectorIndexConfig {
  readonly type = "SparseVectorIndexConfig";
  embeddingFunction?: SparseEmbeddingFunction | null;
  sourceKey: string | null;
  bm25: boolean | null;

  constructor(options: SparseVectorIndexConfigOptions = {}) {
    this.embeddingFunction = options.embeddingFunction;
    this.sourceKey =
      options.sourceKey instanceof Key
        ? options.sourceKey.name
        : (options.sourceKey ?? null);
    this.bm25 = options.bm25 ?? null;
  }
}

export class FtsIndexType {
  constructor(
    public enabled: boolean,
    public config: FtsIndexConfig,
  ) {}
}

export class StringInvertedIndexType {
  constructor(
    public enabled: boolean,
    public config: StringInvertedIndexConfig,
  ) {}
}

export class VectorIndexType {
  constructor(
    public enabled: boolean,
    public config: VectorIndexConfig,
  ) {}
}

export class SparseVectorIndexType {
  constructor(
    public enabled: boolean,
    public config: SparseVectorIndexConfig,
  ) {}
}

export class IntInvertedIndexType {
  constructor(
    public enabled: boolean,
    public config: IntInvertedIndexConfig,
  ) {}
}

export class FloatInvertedIndexType {
  constructor(
    public enabled: boolean,
    public config: FloatInvertedIndexConfig,
  ) {}
}

export class BoolInvertedIndexType {
  constructor(
    public enabled: boolean,
    public config: BoolInvertedIndexConfig,
  ) {}
}

export class StringValueType {
  constructor(
    public ftsIndex: FtsIndexType | null = null,
    public stringInvertedIndex: StringInvertedIndexType | null = null,
  ) {}
}

export class FloatListValueType {
  constructor(public vectorIndex: VectorIndexType | null = null) {}
}

export class SparseVectorValueType {
  constructor(public sparseVectorIndex: SparseVectorIndexType | null = null) {}
}

export class IntValueType {
  constructor(public intInvertedIndex: IntInvertedIndexType | null = null) {}
}

export class FloatValueType {
  constructor(
    public floatInvertedIndex: FloatInvertedIndexType | null = null,
  ) {}
}

export class BoolValueType {
  constructor(public boolInvertedIndex: BoolInvertedIndexType | null = null) {}
}

export class ValueTypes {
  string: StringValueType | null = null;
  floatList: FloatListValueType | null = null;
  sparseVector: SparseVectorValueType | null = null;
  intValue: IntValueType | null = null;
  floatValue: FloatValueType | null = null;
  boolean: BoolValueType | null = null;
}

export type IndexConfig =
  | FtsIndexConfig
  | VectorIndexConfig
  | SparseVectorIndexConfig
  | StringInvertedIndexConfig
  | IntInvertedIndexConfig
  | FloatInvertedIndexConfig
  | BoolInvertedIndexConfig;

type ValueTypesJson = ApiValueTypes;

type JsonDict = Record<string, any>;

const cloneObject = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  return Array.isArray(value)
    ? (value.map((item) => cloneObject(item)) as T)
    : (Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          cloneObject(v),
        ]),
      ) as T);
};

const resolveEmbeddingFunctionName = (
  fn: AnyEmbeddingFunction | null | undefined,
): string | undefined => {
  if (!fn) return undefined;
  if (typeof (fn as any).name === "function") {
    try {
      const value = (fn as any).name();
      return typeof value === "string" ? value : undefined;
    } catch (_err) {
      return undefined;
    }
  }
  if (typeof (fn as any).name === "string") {
    return (fn as any).name;
  }
  return undefined;
};

const prepareEmbeddingFunctionConfig = (
  fn: AnyEmbeddingFunction | null | undefined,
): EmbeddingFunctionConfiguration => {
  if (!fn) {
    return { type: "legacy" };
  }

  const name = resolveEmbeddingFunctionName(fn);
  const getConfig =
    typeof fn.getConfig === "function" ? fn.getConfig.bind(fn) : undefined;
  const buildFromConfig = (fn.constructor as any)?.buildFromConfig;

  if (!name || !getConfig || typeof buildFromConfig !== "function") {
    return { type: "legacy" };
  }

  const config = getConfig();
  if (typeof fn.validateConfig === "function") {
    fn.validateConfig(config);
  }

  return {
    type: "known",
    name,
    config,
  };
};

const ensureValueTypes = (
  valueTypes: ValueTypes | null | undefined,
): ValueTypes => valueTypes ?? new ValueTypes();

const ensureStringValueType = (valueTypes: ValueTypes): StringValueType => {
  if (!valueTypes.string) {
    valueTypes.string = new StringValueType();
  }
  return valueTypes.string;
};

const ensureFloatListValueType = (
  valueTypes: ValueTypes,
): FloatListValueType => {
  if (!valueTypes.floatList) {
    valueTypes.floatList = new FloatListValueType();
  }
  return valueTypes.floatList;
};

const ensureSparseVectorValueType = (
  valueTypes: ValueTypes,
): SparseVectorValueType => {
  if (!valueTypes.sparseVector) {
    valueTypes.sparseVector = new SparseVectorValueType();
  }
  return valueTypes.sparseVector;
};

const ensureIntValueType = (valueTypes: ValueTypes): IntValueType => {
  if (!valueTypes.intValue) {
    valueTypes.intValue = new IntValueType();
  }
  return valueTypes.intValue;
};

const ensureFloatValueType = (valueTypes: ValueTypes): FloatValueType => {
  if (!valueTypes.floatValue) {
    valueTypes.floatValue = new FloatValueType();
  }
  return valueTypes.floatValue;
};

const ensureBoolValueType = (valueTypes: ValueTypes): BoolValueType => {
  if (!valueTypes.boolean) {
    valueTypes.boolean = new BoolValueType();
  }
  return valueTypes.boolean;
};

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
export class Schema {
  defaults: ValueTypes;
  keys: Record<string, ValueTypes>;
  cmek: Cmek | null;

  constructor() {
    this.defaults = new ValueTypes();
    this.keys = {};
    this.cmek = null;
    this.initializeDefaults();
    this.initializeKeys();
  }

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
  setCmek(cmek: Cmek | null): this {
    this.cmek = cmek;
    return this;
  }

  createIndex(config?: IndexConfig, key?: string): this {
    const configProvided = config !== undefined && config !== null;
    const keyProvided = key !== undefined && key !== null;

    if (!configProvided && !keyProvided) {
      throw new Error(
        "Cannot enable all index types globally. Must specify either config or key.",
      );
    }

    if (keyProvided && key && (key === EMBEDDING_KEY || key === DOCUMENT_KEY)) {
      throw new Error(
        `Cannot create index on special key '${key}'. These keys are managed automatically by the system.`,
      );
    }

    if (config instanceof VectorIndexConfig) {
      if (!keyProvided) {
        this.setVectorIndexConfig(config);
        return this;
      }
      throw new Error(
        "Vector index cannot be enabled on specific keys. Use createIndex(config=VectorIndexConfig(...)) without specifying a key to configure the vector index globally.",
      );
    }

    if (config instanceof FtsIndexConfig) {
      if (!keyProvided) {
        this.setFtsIndexConfig(config);
        return this;
      }
      throw new Error(
        "FTS index cannot be enabled on specific keys. Use createIndex(config=FtsIndexConfig(...)) without specifying a key to configure the FTS index globally.",
      );
    }

    if (config instanceof SparseVectorIndexConfig && !keyProvided) {
      throw new Error(
        "Sparse vector index must be created on a specific key. Please specify a key using: createIndex(config=SparseVectorIndexConfig(...), key='your_key')",
      );
    }

    // TODO: Consider removing this check in the future to allow enabling all indexes for a key
    // Disallow enabling all index types for a key (config=undefined, key="some_key")
    if (!configProvided && keyProvided && key) {
      throw new Error(
        `Cannot enable all index types for key '${key}'. Please specify a specific index configuration.`,
      );
    }

    if (configProvided && !keyProvided) {
      this.setIndexInDefaults(config as IndexConfig, true);
    } else if (configProvided && keyProvided && key) {
      this.setIndexForKey(key, config as IndexConfig, true);
    }

    return this;
  }

  deleteIndex(config?: IndexConfig, key?: string): this {
    const configProvided = config !== undefined && config !== null;
    const keyProvided = key !== undefined && key !== null;

    if (!configProvided && !keyProvided) {
      throw new Error(
        "Cannot disable all indexes. Must specify either config or key.",
      );
    }

    if (keyProvided && key && (key === EMBEDDING_KEY || key === DOCUMENT_KEY)) {
      throw new Error(
        `Cannot delete index on special key '${key}'. These keys are managed automatically by the system.`,
      );
    }

    if (config instanceof VectorIndexConfig) {
      throw new Error("Deleting vector index is not currently supported.");
    }

    if (config instanceof FtsIndexConfig) {
      throw new Error("Deleting FTS index is not currently supported.");
    }

    if (config instanceof SparseVectorIndexConfig) {
      throw new Error(
        "Deleting sparse vector index is not currently supported.",
      );
    }

    // TODO: Consider removing this check in the future to allow disabling all indexes for a key
    // Disallow disabling all index types for a key (config=undefined, key="some_key")
    if (keyProvided && !configProvided && key) {
      throw new Error(
        `Cannot disable all index types for key '${key}'. Please specify a specific index configuration.`,
      );
    }

    if (keyProvided && configProvided && key) {
      this.setIndexForKey(key, config as IndexConfig, false);
    } else if (!keyProvided && configProvided) {
      this.setIndexInDefaults(config as IndexConfig, false);
    }

    return this;
  }

  serializeToJSON(): InternalSchema {
    const defaults = this.serializeValueTypes(this.defaults);

    const keys: Record<string, ValueTypesJson> = {};
    for (const [keyName, valueTypes] of Object.entries(this.keys)) {
      keys[keyName] = this.serializeValueTypes(valueTypes);
    }

    const result: InternalSchema = {
      defaults,
      keys,
    };

    // Add CMEK if present
    if (this.cmek !== null) {
      result.cmek = this.cmek.toJSON();
    }

    return result;
  }

  static async deserializeFromJSON(
    json: InternalSchema | JsonDict | null,
    client: ChromaClient,
  ): Promise<Schema | undefined> {
    if (json == null) {
      return undefined;
    }

    const data = json as JsonDict;
    const instance = Object.create(Schema.prototype) as Schema;
    instance.defaults = await Schema.deserializeValueTypes(
      (data.defaults ?? {}) as Record<string, any>,
      client,
    );
    instance.keys = {};
    const keys = (data.keys ?? {}) as Record<string, Record<string, any>>;
    for (const [keyName, value] of Object.entries(keys)) {
      instance.keys[keyName] = await Schema.deserializeValueTypes(
        value,
        client,
      );
    }

    // Deserialize CMEK if present
    instance.cmek = null;
    if (data.cmek && typeof data.cmek === "object") {
      instance.cmek = Cmek.fromJSON(data.cmek as Record<string, unknown>);
    }

    return instance;
  }

  private setVectorIndexConfig(config: VectorIndexConfig): void {
    const defaultsFloatList = ensureFloatListValueType(this.defaults);
    const currentDefaultsVector =
      defaultsFloatList.vectorIndex ??
      new VectorIndexType(false, new VectorIndexConfig());
    defaultsFloatList.vectorIndex = new VectorIndexType(
      currentDefaultsVector.enabled,
      new VectorIndexConfig({
        space: config.space ?? null,
        embeddingFunction: config.embeddingFunction,
        sourceKey: config.sourceKey ?? null,
        hnsw: config.hnsw ? cloneObject(config.hnsw) : null,
        spann: config.spann ? cloneObject(config.spann) : null,
      }),
    );

    const embeddingValueTypes = ensureValueTypes(this.keys[EMBEDDING_KEY]);
    this.keys[EMBEDDING_KEY] = embeddingValueTypes;
    const overrideFloatList = ensureFloatListValueType(embeddingValueTypes);
    const currentOverrideVector =
      overrideFloatList.vectorIndex ??
      new VectorIndexType(
        true,
        new VectorIndexConfig({ sourceKey: DOCUMENT_KEY }),
      );
    const preservedSourceKey =
      currentOverrideVector.config.sourceKey ?? DOCUMENT_KEY;
    overrideFloatList.vectorIndex = new VectorIndexType(
      currentOverrideVector.enabled,
      new VectorIndexConfig({
        space: config.space ?? null,
        embeddingFunction: config.embeddingFunction,
        sourceKey: preservedSourceKey,
        hnsw: config.hnsw ? cloneObject(config.hnsw) : null,
        spann: config.spann ? cloneObject(config.spann) : null,
      }),
    );
  }

  private setFtsIndexConfig(config: FtsIndexConfig): void {
    const defaultsString = ensureStringValueType(this.defaults);
    const currentDefaultsFts =
      defaultsString.ftsIndex ?? new FtsIndexType(false, new FtsIndexConfig());
    defaultsString.ftsIndex = new FtsIndexType(
      currentDefaultsFts.enabled,
      config,
    );

    const documentValueTypes = ensureValueTypes(this.keys[DOCUMENT_KEY]);
    this.keys[DOCUMENT_KEY] = documentValueTypes;
    const overrideString = ensureStringValueType(documentValueTypes);
    const currentOverrideFts =
      overrideString.ftsIndex ?? new FtsIndexType(true, new FtsIndexConfig());
    overrideString.ftsIndex = new FtsIndexType(
      currentOverrideFts.enabled,
      config,
    );
  }

  private setIndexInDefaults(config: IndexConfig, enabled: boolean): void {
    if (config instanceof FtsIndexConfig) {
      const valueType = ensureStringValueType(this.defaults);
      valueType.ftsIndex = new FtsIndexType(enabled, config);
    } else if (config instanceof StringInvertedIndexConfig) {
      const valueType = ensureStringValueType(this.defaults);
      valueType.stringInvertedIndex = new StringInvertedIndexType(
        enabled,
        config,
      );
    } else if (config instanceof VectorIndexConfig) {
      const valueType = ensureFloatListValueType(this.defaults);
      valueType.vectorIndex = new VectorIndexType(enabled, config);
    } else if (config instanceof SparseVectorIndexConfig) {
      const valueType = ensureSparseVectorValueType(this.defaults);
      valueType.sparseVectorIndex = new SparseVectorIndexType(enabled, config);
    } else if (config instanceof IntInvertedIndexConfig) {
      const valueType = ensureIntValueType(this.defaults);
      valueType.intInvertedIndex = new IntInvertedIndexType(enabled, config);
    } else if (config instanceof FloatInvertedIndexConfig) {
      const valueType = ensureFloatValueType(this.defaults);
      valueType.floatInvertedIndex = new FloatInvertedIndexType(
        enabled,
        config,
      );
    } else if (config instanceof BoolInvertedIndexConfig) {
      const valueType = ensureBoolValueType(this.defaults);
      valueType.boolInvertedIndex = new BoolInvertedIndexType(enabled, config);
    }
  }

  private setIndexForKey(
    key: string,
    config: IndexConfig,
    enabled: boolean,
  ): void {
    if (config instanceof SparseVectorIndexConfig && enabled) {
      this.validateSingleSparseVectorIndex(key);
      this.validateSparseVectorConfig(config);
    }

    const current = (this.keys[key] = ensureValueTypes(this.keys[key]));

    if (config instanceof StringInvertedIndexConfig) {
      const valueType = ensureStringValueType(current);
      valueType.stringInvertedIndex = new StringInvertedIndexType(
        enabled,
        config,
      );
    } else if (config instanceof FtsIndexConfig) {
      const valueType = ensureStringValueType(current);
      valueType.ftsIndex = new FtsIndexType(enabled, config);
    } else if (config instanceof SparseVectorIndexConfig) {
      const valueType = ensureSparseVectorValueType(current);
      valueType.sparseVectorIndex = new SparseVectorIndexType(enabled, config);
    } else if (config instanceof VectorIndexConfig) {
      const valueType = ensureFloatListValueType(current);
      valueType.vectorIndex = new VectorIndexType(enabled, config);
    } else if (config instanceof IntInvertedIndexConfig) {
      const valueType = ensureIntValueType(current);
      valueType.intInvertedIndex = new IntInvertedIndexType(enabled, config);
    } else if (config instanceof FloatInvertedIndexConfig) {
      const valueType = ensureFloatValueType(current);
      valueType.floatInvertedIndex = new FloatInvertedIndexType(
        enabled,
        config,
      );
    } else if (config instanceof BoolInvertedIndexConfig) {
      const valueType = ensureBoolValueType(current);
      valueType.boolInvertedIndex = new BoolInvertedIndexType(enabled, config);
    }
  }

  private enableAllIndexesForKey(key: string): void {
    if (key === EMBEDDING_KEY || key === DOCUMENT_KEY) {
      throw new Error(
        `Cannot enable all indexes for special key '${key}'. These keys are managed automatically by the system.`,
      );
    }

    const current = (this.keys[key] = ensureValueTypes(this.keys[key]));
    current.string = new StringValueType(
      new FtsIndexType(true, new FtsIndexConfig()),
      new StringInvertedIndexType(true, new StringInvertedIndexConfig()),
    );
    current.floatList = new FloatListValueType(
      new VectorIndexType(true, new VectorIndexConfig()),
    );
    // Sparse vector indexes require both sourceKey and embeddingFunction,
    // so they cannot be auto-enabled and must be configured explicitly
    current.sparseVector = new SparseVectorValueType(
      new SparseVectorIndexType(false, new SparseVectorIndexConfig()),
    );
    current.intValue = new IntValueType(
      new IntInvertedIndexType(true, new IntInvertedIndexConfig()),
    );
    current.floatValue = new FloatValueType(
      new FloatInvertedIndexType(true, new FloatInvertedIndexConfig()),
    );
    current.boolean = new BoolValueType(
      new BoolInvertedIndexType(true, new BoolInvertedIndexConfig()),
    );
  }

  private disableAllIndexesForKey(key: string): void {
    if (key === EMBEDDING_KEY || key === DOCUMENT_KEY) {
      throw new Error(
        `Cannot disable all indexes for special key '${key}'. These keys are managed automatically by the system.`,
      );
    }

    const current = (this.keys[key] = ensureValueTypes(this.keys[key]));
    current.string = new StringValueType(
      new FtsIndexType(false, new FtsIndexConfig()),
      new StringInvertedIndexType(false, new StringInvertedIndexConfig()),
    );
    current.floatList = new FloatListValueType(
      new VectorIndexType(false, new VectorIndexConfig()),
    );
    current.sparseVector = new SparseVectorValueType(
      new SparseVectorIndexType(false, new SparseVectorIndexConfig()),
    );
    current.intValue = new IntValueType(
      new IntInvertedIndexType(false, new IntInvertedIndexConfig()),
    );
    current.floatValue = new FloatValueType(
      new FloatInvertedIndexType(false, new FloatInvertedIndexConfig()),
    );
    current.boolean = new BoolValueType(
      new BoolInvertedIndexType(false, new BoolInvertedIndexConfig()),
    );
  }

  private validateSingleSparseVectorIndex(targetKey: string): void {
    for (const [existingKey, valueTypes] of Object.entries(this.keys)) {
      if (existingKey === targetKey) continue;
      const sparseIndex = valueTypes.sparseVector?.sparseVectorIndex;
      if (sparseIndex?.enabled) {
        throw new Error(
          `Cannot enable sparse vector index on key '${targetKey}'. A sparse vector index is already enabled on key '${existingKey}'. Only one sparse vector index is allowed per collection.`,
        );
      }
    }
  }

  private validateSparseVectorConfig(config: SparseVectorIndexConfig): void {
    // Validate that if source_key is provided then embedding_function is also provided
    // since there is no default embedding function
    if (
      config.sourceKey !== null &&
      config.sourceKey !== undefined &&
      !config.embeddingFunction
    ) {
      throw new Error(
        `If sourceKey is provided then embeddingFunction must also be provided since there is no default embedding function. Config: ${JSON.stringify(config)}`,
      );
    }
  }

  private initializeDefaults(): void {
    this.defaults.string = new StringValueType(
      new FtsIndexType(false, new FtsIndexConfig()),
      new StringInvertedIndexType(true, new StringInvertedIndexConfig()),
    );

    this.defaults.floatList = new FloatListValueType(
      new VectorIndexType(false, new VectorIndexConfig()),
    );

    this.defaults.sparseVector = new SparseVectorValueType(
      new SparseVectorIndexType(false, new SparseVectorIndexConfig()),
    );

    this.defaults.intValue = new IntValueType(
      new IntInvertedIndexType(true, new IntInvertedIndexConfig()),
    );

    this.defaults.floatValue = new FloatValueType(
      new FloatInvertedIndexType(true, new FloatInvertedIndexConfig()),
    );

    this.defaults.boolean = new BoolValueType(
      new BoolInvertedIndexType(true, new BoolInvertedIndexConfig()),
    );
  }

  private initializeKeys(): void {
    this.keys[DOCUMENT_KEY] = new ValueTypes();
    this.keys[DOCUMENT_KEY].string = new StringValueType(
      new FtsIndexType(true, new FtsIndexConfig()),
      new StringInvertedIndexType(false, new StringInvertedIndexConfig()),
    );

    this.keys[EMBEDDING_KEY] = new ValueTypes();
    this.keys[EMBEDDING_KEY].floatList = new FloatListValueType(
      new VectorIndexType(
        true,
        new VectorIndexConfig({ sourceKey: DOCUMENT_KEY }),
      ),
    );
  }

  private serializeValueTypes(valueTypes: ValueTypes): ValueTypesJson {
    const result: ValueTypesJson = {};

    if (valueTypes.string) {
      const serialized = this.serializeStringValueType(valueTypes.string);
      if (Object.keys(serialized).length > 0) {
        result[STRING_VALUE_NAME] = serialized;
      }
    }

    if (valueTypes.floatList) {
      const serialized = this.serializeFloatListValueType(valueTypes.floatList);
      if (Object.keys(serialized).length > 0) {
        result[FLOAT_LIST_VALUE_NAME] = serialized;
      }
    }

    if (valueTypes.sparseVector) {
      const serialized = this.serializeSparseVectorValueType(
        valueTypes.sparseVector,
      );
      if (Object.keys(serialized).length > 0) {
        result[SPARSE_VECTOR_VALUE_NAME] = serialized;
      }
    }

    if (valueTypes.intValue) {
      const serialized = this.serializeIntValueType(valueTypes.intValue);
      if (Object.keys(serialized).length > 0) {
        result[INT_VALUE_NAME] = serialized;
      }
    }

    if (valueTypes.floatValue) {
      const serialized = this.serializeFloatValueType(valueTypes.floatValue);
      if (Object.keys(serialized).length > 0) {
        result[FLOAT_VALUE_NAME] = serialized;
      }
    }

    if (valueTypes.boolean) {
      const serialized = this.serializeBoolValueType(valueTypes.boolean);
      if (Object.keys(serialized).length > 0) {
        result[BOOL_VALUE_NAME] = serialized;
      }
    }

    return result;
  }

  private serializeStringValueType(valueType: StringValueType): JsonDict {
    const result: JsonDict = {};
    if (valueType.ftsIndex) {
      result[FTS_INDEX_NAME] = {
        enabled: valueType.ftsIndex.enabled,
        config: this.serializeConfig(valueType.ftsIndex.config),
      };
    }
    if (valueType.stringInvertedIndex) {
      result[STRING_INVERTED_INDEX_NAME] = {
        enabled: valueType.stringInvertedIndex.enabled,
        config: this.serializeConfig(valueType.stringInvertedIndex.config),
      };
    }
    return result;
  }

  private serializeFloatListValueType(valueType: FloatListValueType): JsonDict {
    const result: JsonDict = {};
    if (valueType.vectorIndex) {
      result[VECTOR_INDEX_NAME] = {
        enabled: valueType.vectorIndex.enabled,
        config: this.serializeConfig(valueType.vectorIndex.config),
      };
    }
    return result;
  }

  private serializeSparseVectorValueType(
    valueType: SparseVectorValueType,
  ): JsonDict {
    const result: JsonDict = {};
    if (valueType.sparseVectorIndex) {
      result[SPARSE_VECTOR_INDEX_NAME] = {
        enabled: valueType.sparseVectorIndex.enabled,
        config: this.serializeConfig(valueType.sparseVectorIndex.config),
      };
    }
    return result;
  }

  private serializeIntValueType(valueType: IntValueType): JsonDict {
    const result: JsonDict = {};
    if (valueType.intInvertedIndex) {
      result[INT_INVERTED_INDEX_NAME] = {
        enabled: valueType.intInvertedIndex.enabled,
        config: this.serializeConfig(valueType.intInvertedIndex.config),
      };
    }
    return result;
  }

  private serializeFloatValueType(valueType: FloatValueType): JsonDict {
    const result: JsonDict = {};
    if (valueType.floatInvertedIndex) {
      result[FLOAT_INVERTED_INDEX_NAME] = {
        enabled: valueType.floatInvertedIndex.enabled,
        config: this.serializeConfig(valueType.floatInvertedIndex.config),
      };
    }
    return result;
  }

  private serializeBoolValueType(valueType: BoolValueType): JsonDict {
    const result: JsonDict = {};
    if (valueType.boolInvertedIndex) {
      result[BOOL_INVERTED_INDEX_NAME] = {
        enabled: valueType.boolInvertedIndex.enabled,
        config: this.serializeConfig(valueType.boolInvertedIndex.config),
      };
    }
    return result;
  }

  private serializeConfig(config: IndexConfig): JsonDict {
    if (config instanceof VectorIndexConfig) {
      return this.serializeVectorConfig(config);
    }
    if (config instanceof SparseVectorIndexConfig) {
      return this.serializeSparseVectorConfig(config);
    }
    return {};
  }

  private serializeVectorConfig(config: VectorIndexConfig): JsonDict {
    const serialized: JsonDict = {};
    const embeddingFunction = config.embeddingFunction;
    const efConfig = prepareEmbeddingFunctionConfig(embeddingFunction);
    serialized["embedding_function"] = efConfig;

    let resolvedSpace = config.space ?? null;
    if (!resolvedSpace && embeddingFunction?.defaultSpace) {
      resolvedSpace = embeddingFunction.defaultSpace();
    }

    if (
      resolvedSpace &&
      embeddingFunction?.supportedSpaces &&
      !embeddingFunction.supportedSpaces().includes(resolvedSpace)
    ) {
      console.warn(
        `Space '${resolvedSpace}' is not supported by embedding function '${resolveEmbeddingFunctionName(embeddingFunction) ?? "unknown"}'. Supported spaces: ${embeddingFunction
          .supportedSpaces()
          .join(", ")}`,
      );
    }

    if (resolvedSpace) {
      serialized.space = resolvedSpace;
    }

    if (config.sourceKey) {
      serialized.source_key = config.sourceKey;
    }

    if (config.hnsw) {
      serialized.hnsw = cloneObject(config.hnsw);
    }

    if (config.spann) {
      serialized.spann = cloneObject(config.spann);
    }

    return serialized;
  }

  private serializeSparseVectorConfig(
    config: SparseVectorIndexConfig,
  ): JsonDict {
    const serialized: JsonDict = {};
    const embeddingFunction = config.embeddingFunction;
    serialized["embedding_function"] =
      prepareEmbeddingFunctionConfig(embeddingFunction);

    if (config.sourceKey) {
      serialized.source_key = config.sourceKey;
    }

    if (typeof config.bm25 === "boolean") {
      serialized.bm25 = config.bm25;
    }

    return serialized;
  }

  private static async deserializeValueTypes(
    json: Record<string, any>,
    client: ChromaClient,
  ): Promise<ValueTypes> {
    const result = new ValueTypes();

    if (json[STRING_VALUE_NAME]) {
      result.string = Schema.deserializeStringValueType(
        json[STRING_VALUE_NAME],
      );
    }

    if (json[FLOAT_LIST_VALUE_NAME]) {
      result.floatList = await Schema.deserializeFloatListValueType(
        json[FLOAT_LIST_VALUE_NAME],
        client,
      );
    }

    if (json[SPARSE_VECTOR_VALUE_NAME]) {
      result.sparseVector = await Schema.deserializeSparseVectorValueType(
        json[SPARSE_VECTOR_VALUE_NAME],
        client,
      );
    }

    if (json[INT_VALUE_NAME]) {
      result.intValue = Schema.deserializeIntValueType(json[INT_VALUE_NAME]);
    }

    if (json[FLOAT_VALUE_NAME]) {
      result.floatValue = Schema.deserializeFloatValueType(
        json[FLOAT_VALUE_NAME],
      );
    }

    if (json[BOOL_VALUE_NAME]) {
      result.boolean = Schema.deserializeBoolValueType(json[BOOL_VALUE_NAME]);
    }

    return result;
  }

  private static deserializeStringValueType(
    json: Record<string, any>,
  ): StringValueType {
    let ftsIndex: FtsIndexType | null = null;
    let stringIndex: StringInvertedIndexType | null = null;

    if (json[FTS_INDEX_NAME]) {
      const data = json[FTS_INDEX_NAME];
      ftsIndex = new FtsIndexType(Boolean(data.enabled), new FtsIndexConfig());
    }

    if (json[STRING_INVERTED_INDEX_NAME]) {
      const data = json[STRING_INVERTED_INDEX_NAME];
      stringIndex = new StringInvertedIndexType(
        Boolean(data.enabled),
        new StringInvertedIndexConfig(),
      );
    }

    return new StringValueType(ftsIndex, stringIndex);
  }

  private static async deserializeFloatListValueType(
    json: Record<string, any>,
    client: ChromaClient,
  ): Promise<FloatListValueType> {
    let vectorIndex: VectorIndexType | null = null;
    if (json[VECTOR_INDEX_NAME]) {
      const data = json[VECTOR_INDEX_NAME];
      const enabled = Boolean(data.enabled);
      const config = await Schema.deserializeVectorConfig(
        data.config ?? {},
        client,
      );
      vectorIndex = new VectorIndexType(enabled, config);
    }
    return new FloatListValueType(vectorIndex);
  }

  private static async deserializeSparseVectorValueType(
    json: Record<string, any>,
    client: ChromaClient,
  ): Promise<SparseVectorValueType> {
    let sparseIndex: SparseVectorIndexType | null = null;
    if (json[SPARSE_VECTOR_INDEX_NAME]) {
      const data = json[SPARSE_VECTOR_INDEX_NAME];
      const enabled = Boolean(data.enabled);
      const config = await Schema.deserializeSparseVectorConfig(
        data.config ?? {},
        client,
      );
      sparseIndex = new SparseVectorIndexType(enabled, config);
    }
    return new SparseVectorValueType(sparseIndex);
  }

  private static deserializeIntValueType(
    json: Record<string, any>,
  ): IntValueType {
    let index: IntInvertedIndexType | null = null;
    if (json[INT_INVERTED_INDEX_NAME]) {
      const data = json[INT_INVERTED_INDEX_NAME];
      index = new IntInvertedIndexType(
        Boolean(data.enabled),
        new IntInvertedIndexConfig(),
      );
    }
    return new IntValueType(index);
  }

  private static deserializeFloatValueType(
    json: Record<string, any>,
  ): FloatValueType {
    let index: FloatInvertedIndexType | null = null;
    if (json[FLOAT_INVERTED_INDEX_NAME]) {
      const data = json[FLOAT_INVERTED_INDEX_NAME];
      index = new FloatInvertedIndexType(
        Boolean(data.enabled),
        new FloatInvertedIndexConfig(),
      );
    }
    return new FloatValueType(index);
  }

  private static deserializeBoolValueType(
    json: Record<string, any>,
  ): BoolValueType {
    let index: BoolInvertedIndexType | null = null;
    if (json[BOOL_INVERTED_INDEX_NAME]) {
      const data = json[BOOL_INVERTED_INDEX_NAME];
      index = new BoolInvertedIndexType(
        Boolean(data.enabled),
        new BoolInvertedIndexConfig(),
      );
    }
    return new BoolValueType(index);
  }

  private static async deserializeVectorConfig(
    json: Record<string, any>,
    client: ChromaClient,
  ): Promise<VectorIndexConfig> {
    const config = new VectorIndexConfig({
      space: (json.space as Space | null | undefined) ?? null,
      sourceKey: (json.source_key as string | null | undefined) ?? null,
      hnsw: json.hnsw ? cloneObject(json.hnsw) : null,
      spann: json.spann ? cloneObject(json.spann) : null,
    });

    config.embeddingFunction = await getEmbeddingFunction({
      collectionName: "schema deserialization",
      client,
      efConfig: json.embedding_function as EmbeddingFunctionConfiguration,
    });
    if (!config.space && config.embeddingFunction?.defaultSpace) {
      config.space = config.embeddingFunction.defaultSpace();
    }

    return config;
  }

  private static async deserializeSparseVectorConfig(
    json: Record<string, any>,
    client: ChromaClient,
  ): Promise<SparseVectorIndexConfig> {
    const config = new SparseVectorIndexConfig({
      sourceKey: (json.source_key as string | null | undefined) ?? null,
      bm25: typeof json.bm25 === "boolean" ? json.bm25 : null,
    });

    const embeddingFunction =
      (await getSparseEmbeddingFunction(
        "schema deserialization",
        client,
        json.embedding_function as EmbeddingFunctionConfiguration,
      )) ??
      (config.embeddingFunction as
        | SparseEmbeddingFunction
        | null
        | undefined) ??
      undefined;

    config.embeddingFunction = embeddingFunction ?? null;
    return config;
  }

  public resolveEmbeddingFunction(): EmbeddingFunction | null | undefined {
    const embeddingOverride =
      this.keys[EMBEDDING_KEY]?.floatList?.vectorIndex?.config
        .embeddingFunction;
    if (embeddingOverride !== undefined) {
      return embeddingOverride;
    }
    return this.defaults.floatList?.vectorIndex?.config.embeddingFunction;
  }
}
