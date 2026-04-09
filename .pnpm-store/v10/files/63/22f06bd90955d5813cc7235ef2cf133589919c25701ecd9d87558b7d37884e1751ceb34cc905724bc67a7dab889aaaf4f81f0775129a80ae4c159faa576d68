import { JSONObject, RerankingModelV3CallOptions } from '@ai-sdk/provider';
import { ProviderOptions } from '@ai-sdk/provider-utils';
import { prepareRetries } from '../../src/util/prepare-retries';
import { assembleOperationName } from '../telemetry/assemble-operation-name';
import { getBaseTelemetryAttributes } from '../telemetry/get-base-telemetry-attributes';
import { getTracer } from '../telemetry/get-tracer';
import { recordSpan } from '../telemetry/record-span';
import { selectTelemetryAttributes } from '../telemetry/select-telemetry-attributes';
import { TelemetrySettings } from '../telemetry/telemetry-settings';
import { RerankingModel } from '../types';
import { RerankResult } from './rerank-result';
import { logWarnings } from '../logger/log-warnings';

/**
 * Rerank documents using a reranking model. The type of the value is defined by the reranking model.
 *
 * @param model - The reranking model to use.
 * @param documents - The documents that should be reranked.
 * @param query - The query to rerank the documents against.
 * @param topN - Number of top documents to return.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 * @param providerOptions - Additional provider-specific options.
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @returns A result object that contains the reranked documents, the reranked indices, and additional information.
 */
export async function rerank<VALUE extends JSONObject | string>({
  model,
  documents,
  query,
  topN,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  providerOptions,
  experimental_telemetry: telemetry,
}: {
  /**
   * The reranking model to use.
   */
  model: RerankingModel;

  /**
   * The documents that should be reranked.
   */
  documents: Array<VALUE>;

  /**
   * The query to rerank the documents against.
   */
  query: string;

  /**
   * Number of top documents to return.
   */
  topN?: number;

  /**
   * Maximum number of retries per reranking model call. Set to 0 to disable retries.
   *
   * @default 2
   */
  maxRetries?: number;

  /**
   * Abort signal.
   */
  abortSignal?: AbortSignal;

  /**
   * Additional headers to include in the request.
   * Only applicable for HTTP-based providers.
   */
  headers?: Record<string, string>;

  /**
   * Optional telemetry configuration (experimental).
   */
  experimental_telemetry?: TelemetrySettings;

  /**
   * Additional provider-specific options. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
}): Promise<RerankResult<VALUE>> {
  if (documents.length === 0) {
    return new DefaultRerankResult({
      originalDocuments: [],
      ranking: [],
      providerMetadata: undefined,
      response: {
        timestamp: new Date(),
        modelId: model.modelId,
      },
    });
  }

  const { maxRetries, retry } = prepareRetries({
    maxRetries: maxRetriesArg,
    abortSignal,
  });

  // detect the type of the documents:
  const documentsToSend: RerankingModelV3CallOptions['documents'] =
    typeof documents[0] === 'string'
      ? { type: 'text', values: documents as string[] }
      : { type: 'object', values: documents as JSONObject[] };

  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model,
    telemetry,
    headers,
    settings: { maxRetries },
  });

  const tracer = getTracer(telemetry);

  return recordSpan({
    name: 'ai.rerank',
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({ operationId: 'ai.rerank', telemetry }),
        ...baseTelemetryAttributes,
        'ai.documents': {
          input: () => documents.map(document => JSON.stringify(document)),
        },
      },
    }),
    tracer,
    fn: async () => {
      const { ranking, response, providerMetadata, warnings } = await retry(
        () =>
          recordSpan({
            name: 'ai.rerank.doRerank',
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: 'ai.rerank.doRerank',
                  telemetry,
                }),
                ...baseTelemetryAttributes,
                // specific settings that only make sense on the outer level:
                'ai.documents': {
                  input: () =>
                    documents.map(document => JSON.stringify(document)),
                },
              },
            }),
            tracer,
            fn: async doRerankSpan => {
              const modelResponse = await model.doRerank({
                documents: documentsToSend,
                query,
                topN,
                providerOptions,
                abortSignal,
                headers,
              });

              const ranking = modelResponse.ranking;

              doRerankSpan.setAttributes(
                await selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    'ai.ranking.type': documentsToSend.type,
                    'ai.ranking': {
                      output: () =>
                        ranking.map(ranking => JSON.stringify(ranking)),
                    },
                  },
                }),
              );

              return {
                ranking,
                providerMetadata: modelResponse.providerMetadata,
                response: modelResponse.response,
                warnings: modelResponse.warnings,
              };
            },
          }),
      );

      logWarnings({
        warnings: warnings ?? [],
        provider: model.provider,
        model: model.modelId,
      });

      return new DefaultRerankResult({
        originalDocuments: documents,
        ranking: ranking.map(ranking => ({
          originalIndex: ranking.index,
          score: ranking.relevanceScore,
          document: documents[ranking.index],
        })),
        providerMetadata,
        response: {
          id: response?.id,
          timestamp: response?.timestamp ?? new Date(),
          modelId: response?.modelId ?? model.modelId,
          headers: response?.headers,
          body: response?.body,
        },
      });
    },
  });
}

class DefaultRerankResult<VALUE> implements RerankResult<VALUE> {
  readonly originalDocuments: RerankResult<VALUE>['originalDocuments'];
  readonly ranking: RerankResult<VALUE>['ranking'];
  readonly response: RerankResult<VALUE>['response'];
  readonly providerMetadata: RerankResult<VALUE>['providerMetadata'];

  constructor(options: {
    originalDocuments: RerankResult<VALUE>['originalDocuments'];
    ranking: RerankResult<VALUE>['ranking'];
    providerMetadata?: RerankResult<VALUE>['providerMetadata'];
    response: RerankResult<VALUE>['response'];
  }) {
    this.originalDocuments = options.originalDocuments;
    this.ranking = options.ranking;
    this.response = options.response;
    this.providerMetadata = options.providerMetadata;
  }

  get rerankedDocuments(): RerankResult<VALUE>['rerankedDocuments'] {
    return this.ranking.map(ranking => ranking.document);
  }
}
