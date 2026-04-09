import { ProviderOptions, withUserAgentSuffix } from '@ai-sdk/provider-utils';
import { logWarnings } from '../logger/log-warnings';
import { resolveEmbeddingModel } from '../model/resolve-model';
import { assembleOperationName } from '../telemetry/assemble-operation-name';
import { getBaseTelemetryAttributes } from '../telemetry/get-base-telemetry-attributes';
import { getTracer } from '../telemetry/get-tracer';
import { recordSpan } from '../telemetry/record-span';
import { selectTelemetryAttributes } from '../telemetry/select-telemetry-attributes';
import { TelemetrySettings } from '../telemetry/telemetry-settings';
import { EmbeddingModel } from '../types';
import { prepareRetries } from '../util/prepare-retries';
import { EmbedResult } from './embed-result';
import { VERSION } from '../version';

/**
 * Embed a value using an embedding model. The type of the value is defined by the embedding model.
 *
 * @param model - The embedding model to use.
 * @param value - The value that should be embedded.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @param providerOptions - Additional provider-specific options. They are passed through
 * to the provider from the AI SDK and enable provider-specific
 * functionality that can be fully encapsulated in the provider.
 *
 * @returns A result object that contains the embedding, the value, and additional information.
 */
export async function embed({
  model: modelArg,
  value,
  providerOptions,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  experimental_telemetry: telemetry,
}: {
  /**
   * The embedding model to use.
   */
  model: EmbeddingModel;

  /**
   * The value that should be embedded.
   */
  value: string;

  /**
   * Maximum number of retries per embedding model call. Set to 0 to disable retries.
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
   * Additional provider-specific options. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;

  /**
   * Optional telemetry configuration (experimental).
   */
  experimental_telemetry?: TelemetrySettings;
}): Promise<EmbedResult> {
  const model = resolveEmbeddingModel(modelArg);

  const { maxRetries, retry } = prepareRetries({
    maxRetries: maxRetriesArg,
    abortSignal,
  });

  const headersWithUserAgent = withUserAgentSuffix(
    headers ?? {},
    `ai/${VERSION}`,
  );

  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model: model,
    telemetry,
    headers: headersWithUserAgent,
    settings: { maxRetries },
  });

  const tracer = getTracer(telemetry);

  return recordSpan({
    name: 'ai.embed',
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({ operationId: 'ai.embed', telemetry }),
        ...baseTelemetryAttributes,
        'ai.value': { input: () => JSON.stringify(value) },
      },
    }),
    tracer,
    fn: async span => {
      const { embedding, usage, warnings, response, providerMetadata } =
        await retry(() =>
          // nested spans to align with the embedMany telemetry data:
          recordSpan({
            name: 'ai.embed.doEmbed',
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: 'ai.embed.doEmbed',
                  telemetry,
                }),
                ...baseTelemetryAttributes,
                // specific settings that only make sense on the outer level:
                'ai.values': { input: () => [JSON.stringify(value)] },
              },
            }),
            tracer,
            fn: async doEmbedSpan => {
              const modelResponse = await model.doEmbed({
                values: [value],
                abortSignal,
                headers: headersWithUserAgent,
                providerOptions,
              });

              const embedding = modelResponse.embeddings[0];
              const usage = modelResponse.usage ?? { tokens: NaN };

              doEmbedSpan.setAttributes(
                await selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    'ai.embeddings': {
                      output: () =>
                        modelResponse.embeddings.map(embedding =>
                          JSON.stringify(embedding),
                        ),
                    },
                    'ai.usage.tokens': usage.tokens,
                  },
                }),
              );

              return {
                embedding,
                usage,
                warnings: modelResponse.warnings,
                providerMetadata: modelResponse.providerMetadata,
                response: modelResponse.response,
              };
            },
          }),
        );

      span.setAttributes(
        await selectTelemetryAttributes({
          telemetry,
          attributes: {
            'ai.embedding': { output: () => JSON.stringify(embedding) },
            'ai.usage.tokens': usage.tokens,
          },
        }),
      );

      logWarnings({ warnings, provider: model.provider, model: model.modelId });

      return new DefaultEmbedResult({
        value,
        embedding,
        usage,
        warnings,
        providerMetadata,
        response,
      });
    },
  });
}

class DefaultEmbedResult implements EmbedResult {
  readonly value: EmbedResult['value'];
  readonly embedding: EmbedResult['embedding'];
  readonly usage: EmbedResult['usage'];
  readonly warnings: EmbedResult['warnings'];
  readonly providerMetadata: EmbedResult['providerMetadata'];
  readonly response: EmbedResult['response'];

  constructor(options: {
    value: EmbedResult['value'];
    embedding: EmbedResult['embedding'];
    usage: EmbedResult['usage'];
    warnings: EmbedResult['warnings'];
    providerMetadata?: EmbedResult['providerMetadata'];
    response?: EmbedResult['response'];
  }) {
    this.value = options.value;
    this.embedding = options.embedding;
    this.usage = options.usage;
    this.warnings = options.warnings;
    this.providerMetadata = options.providerMetadata;
    this.response = options.response;
  }
}
