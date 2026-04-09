import { EmbeddingModelV2, EmbeddingModelV3 } from '@ai-sdk/provider';
import { logV2CompatibilityWarning } from '../util/log-v2-compatibility-warning';

export function asEmbeddingModelV3(
  model: EmbeddingModelV2<string> | EmbeddingModelV3,
): EmbeddingModelV3 {
  if (model.specificationVersion === 'v3') {
    return model;
  }

  logV2CompatibilityWarning({
    provider: model.provider,
    modelId: model.modelId,
  });

  // TODO this could break, we need to properly map v2 to v3
  // and support all relevant v3 properties:
  return new Proxy(model, {
    get(target, prop: keyof EmbeddingModelV2<string>) {
      if (prop === 'specificationVersion') return 'v3';
      return target[prop];
    },
  }) as unknown as EmbeddingModelV3;
}
