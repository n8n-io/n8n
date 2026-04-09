import type { Attributes, AttributeValue } from '@opentelemetry/api';
import type { TelemetrySettings } from './telemetry-settings';

type ResolvableAttributeValue = () =>
  | AttributeValue
  | PromiseLike<AttributeValue>
  | undefined;

export async function selectTelemetryAttributes({
  telemetry,
  attributes,
}: {
  telemetry?: TelemetrySettings;
  attributes: {
    [attributeKey: string]:
      | AttributeValue
      | { input: ResolvableAttributeValue }
      | { output: ResolvableAttributeValue }
      | undefined;
  };
}): Promise<Attributes> {
  // when telemetry is disabled, return an empty object to avoid serialization overhead:
  if (telemetry?.isEnabled !== true) {
    return {};
  }

  const resultAttributes: Attributes = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value == null) {
      continue;
    }

    // input value, check if it should be recorded:
    if (
      typeof value === 'object' &&
      'input' in value &&
      typeof value.input === 'function'
    ) {
      // default to true:
      if (telemetry?.recordInputs === false) {
        continue;
      }

      const result = await value.input();

      if (result != null) {
        resultAttributes[key] = result;
      }

      continue;
    }

    // output value, check if it should be recorded:
    if (
      typeof value === 'object' &&
      'output' in value &&
      typeof value.output === 'function'
    ) {
      // default to true:
      if (telemetry?.recordOutputs === false) {
        continue;
      }

      const result = await value.output();

      if (result != null) {
        resultAttributes[key] = result;
      }
      continue;
    }

    // value is an attribute value already:
    resultAttributes[key] = value as AttributeValue;
  }

  return resultAttributes;
}
