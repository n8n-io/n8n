import { Attributes, AttributeValue } from '@opentelemetry/api';
import { CallSettings, getTotalTimeoutMs } from '../prompt/call-settings';
import { TelemetrySettings } from './telemetry-settings';

export function getBaseTelemetryAttributes({
  model,
  settings,
  telemetry,
  headers,
}: {
  model: { modelId: string; provider: string };
  settings: Omit<CallSettings, 'abortSignal' | 'headers' | 'temperature'>;
  telemetry: TelemetrySettings | undefined;
  headers: Record<string, string | undefined> | undefined;
}): Attributes {
  return {
    'ai.model.provider': model.provider,
    'ai.model.id': model.modelId,

    // settings:
    ...Object.entries(settings).reduce((attributes, [key, value]) => {
      // Handle timeout specially since it can be a number or object
      if (key === 'timeout') {
        const totalTimeoutMs = getTotalTimeoutMs(
          value as Parameters<typeof getTotalTimeoutMs>[0],
        );
        if (totalTimeoutMs != null) {
          attributes[`ai.settings.${key}`] = totalTimeoutMs;
        }
      } else {
        attributes[`ai.settings.${key}`] = value as AttributeValue;
      }
      return attributes;
    }, {} as Attributes),

    // add metadata as attributes:
    ...Object.entries(telemetry?.metadata ?? {}).reduce(
      (attributes, [key, value]) => {
        attributes[`ai.telemetry.metadata.${key}`] = value;
        return attributes;
      },
      {} as Attributes,
    ),

    // request headers
    ...Object.entries(headers ?? {}).reduce((attributes, [key, value]) => {
      if (value !== undefined) {
        attributes[`ai.request.headers.${key}`] = value;
      }
      return attributes;
    }, {} as Attributes),
  };
}
