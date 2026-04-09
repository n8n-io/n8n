import { TranscriptionModelV2, TranscriptionModelV3 } from '@ai-sdk/provider';
import { logV2CompatibilityWarning } from '../util/log-v2-compatibility-warning';

export function asTranscriptionModelV3(
  model: TranscriptionModelV3 | TranscriptionModelV2,
): TranscriptionModelV3 {
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
    get(target, prop: keyof TranscriptionModelV2) {
      if (prop === 'specificationVersion') return 'v3';
      return target[prop];
    },
  }) as unknown as TranscriptionModelV3;
}
