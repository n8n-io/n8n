import { ChromaValueError } from "./errors";
import {
  EmbeddingFunctionConfiguration,
  HnswConfiguration as ApiHnswConfiguration,
  SpannConfiguration,
  UpdateCollectionConfiguration as ApiUpdateCollectionConfiguration,
} from "./api";
import {
  EmbeddingFunction,
  EmbeddingFunctionSpace,
  getDefaultEFConfig,
  getEmbeddingFunction,
  serializeEmbeddingFunction,
} from "./embedding-function";
import { CollectionMetadata } from "./types";
import { Schema } from "./schema";
import { ChromaClient } from "./chroma-client";

export interface CollectionConfiguration {
  embeddingFunction?: EmbeddingFunctionConfiguration | null;
  hnsw?: HNSWConfiguration | null;
  spann?: SpannConfiguration | null;
}

export type HNSWConfiguration = ApiHnswConfiguration & {
  batch_size?: number | null;
  num_threads?: number | null;
};

export type CreateCollectionConfiguration = Omit<
  CollectionConfiguration,
  "embeddingFunction"
> & { embeddingFunction?: EmbeddingFunction };

export interface UpdateCollectionConfiguration {
  embeddingFunction?: EmbeddingFunction;
  hnsw?: UpdateHNSWConfiguration;
  spann?: UpdateSPANNConfiguration;
}

export interface UpdateHNSWConfiguration {
  batch_size?: number;
  ef_search?: number;
  num_threads?: number;
  resize_factor?: number;
  sync_threshold?: number;
}

export interface UpdateSPANNConfiguration {
  search_nprobe?: number;
  ef_search?: number;
}

/**
 * Validate user provided collection configuration and embedding function. Returns a
 * CollectionConfiguration to be used in collection creation.
 */
export const processCreateCollectionConfig = async ({
  configuration,
  embeddingFunction,
  metadata,
  schema,
}: {
  configuration?: CreateCollectionConfiguration;
  embeddingFunction?: EmbeddingFunction | null;
  metadata?: CollectionMetadata;
  schema?: Schema;
}) => {
  let schemaEmbeddingFunction: EmbeddingFunction | null | undefined = undefined;
  if (schema) {
    schemaEmbeddingFunction = schema.resolveEmbeddingFunction();
  }
  if (configuration?.hnsw && configuration?.spann) {
    throw new ChromaValueError(
      "Cannot specify both HNSW and SPANN configurations",
    );
  }

  let embeddingFunctionConfiguration = serializeEmbeddingFunction({
    embeddingFunction: embeddingFunction ?? undefined,
    configEmbeddingFunction: configuration?.embeddingFunction,
  });

  if (
    !embeddingFunctionConfiguration &&
    embeddingFunction !== null &&
    schemaEmbeddingFunction === undefined
  ) {
    embeddingFunctionConfiguration = await getDefaultEFConfig();
  }

  const overallEf = embeddingFunction || configuration?.embeddingFunction;

  if (overallEf && overallEf.defaultSpace && overallEf.supportedSpaces) {
    if (
      configuration?.hnsw === undefined &&
      configuration?.spann === undefined
    ) {
      if (metadata === undefined || metadata?.["hnsw:space"] === undefined) {
        if (!configuration) configuration = {};
        configuration.hnsw = { space: overallEf.defaultSpace() };
      }
    }

    if (
      configuration?.hnsw &&
      !configuration.hnsw.space &&
      overallEf.defaultSpace
    ) {
      configuration.hnsw.space = overallEf.defaultSpace();
    }

    if (
      configuration?.spann &&
      !configuration.spann.space &&
      overallEf.defaultSpace
    ) {
      configuration.spann.space = overallEf.defaultSpace();
    }

    if (overallEf.supportedSpaces) {
      const supportedSpaces = overallEf.supportedSpaces();

      if (
        configuration?.hnsw?.space &&
        !supportedSpaces.includes(configuration.hnsw.space)
      ) {
        console.warn(
          `Space '${configuration.hnsw.space}' is not supported by embedding function '${overallEf.name || "unknown"}'. ` +
            `Supported spaces: ${supportedSpaces.join(", ")}`,
        );
      }

      if (
        configuration?.spann?.space &&
        !supportedSpaces.includes(configuration.spann.space)
      ) {
        console.warn(
          `Space '${configuration.spann.space}' is not supported by embedding function '${overallEf.name || "unknown"}'. ` +
            `Supported spaces: ${supportedSpaces.join(", ")}`,
        );
      }

      if (
        !configuration?.hnsw &&
        !configuration?.spann &&
        metadata &&
        typeof metadata["hnsw:space"] === "string" &&
        !supportedSpaces.includes(
          metadata["hnsw:space"] as EmbeddingFunctionSpace,
        )
      ) {
        console.warn(
          `Space '${metadata["hnsw:space"]}' from metadata is not supported by embedding function '${overallEf.name || "unknown"}'. ` +
            `Supported spaces: ${supportedSpaces.join(", ")}`,
        );
      }
    }
  }

  return {
    ...(configuration || {}),
    embedding_function: embeddingFunctionConfiguration,
  } as CollectionConfiguration;
};

/**
 *
 */
export const processUpdateCollectionConfig = async ({
  collectionName,
  currentConfiguration,
  currentEmbeddingFunction,
  newConfiguration,
  client,
}: {
  collectionName: string;
  currentConfiguration: CollectionConfiguration;
  currentEmbeddingFunction?: EmbeddingFunction;
  newConfiguration: UpdateCollectionConfiguration;
  client: ChromaClient;
}): Promise<{
  updateConfiguration?: ApiUpdateCollectionConfiguration;
  updateEmbeddingFunction?: EmbeddingFunction;
}> => {
  if (newConfiguration.hnsw && typeof newConfiguration.hnsw !== "object") {
    throw new ChromaValueError(
      "Invalid HNSW config provided in UpdateCollectionConfiguration",
    );
  }

  if (newConfiguration.spann && typeof newConfiguration.spann !== "object") {
    throw new ChromaValueError(
      "Invalid SPANN config provided in UpdateCollectionConfiguration",
    );
  }

  const embeddingFunction =
    currentEmbeddingFunction ||
    (await getEmbeddingFunction({
      collectionName: collectionName,
      client,
      efConfig: currentConfiguration.embeddingFunction ?? undefined,
    }));

  const newEmbeddingFunction = newConfiguration.embeddingFunction;

  if (
    embeddingFunction &&
    embeddingFunction.validateConfigUpdate &&
    newEmbeddingFunction &&
    newEmbeddingFunction.getConfig
  ) {
    embeddingFunction.validateConfigUpdate(newEmbeddingFunction.getConfig());
  }

  return {
    updateConfiguration: {
      hnsw: newConfiguration.hnsw,
      spann: newConfiguration.spann,
      embedding_function:
        newEmbeddingFunction &&
        serializeEmbeddingFunction({ embeddingFunction: newEmbeddingFunction }),
    },
    updateEmbeddingFunction: newEmbeddingFunction,
  };
};
