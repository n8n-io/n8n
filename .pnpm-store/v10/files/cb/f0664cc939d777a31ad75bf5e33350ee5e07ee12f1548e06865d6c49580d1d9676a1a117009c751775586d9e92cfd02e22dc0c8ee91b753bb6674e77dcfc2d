import { LoadAPIKeyError } from '@ai-sdk/provider';

export function loadApiKey({
  apiKey,
  environmentVariableName,
  apiKeyParameterName = 'apiKey',
  description,
}: {
  apiKey: string | undefined;
  environmentVariableName: string;
  apiKeyParameterName?: string;
  description: string;
}): string {
  if (typeof apiKey === 'string') {
    return apiKey;
  }

  if (apiKey != null) {
    throw new LoadAPIKeyError({
      message: `${description} API key must be a string.`,
    });
  }

  if (typeof process === 'undefined') {
    throw new LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter. Environment variables is not supported in this environment.`,
    });
  }

  apiKey = process.env[environmentVariableName];

  if (apiKey == null) {
    throw new LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter or the ${environmentVariableName} environment variable.`,
    });
  }

  if (typeof apiKey !== 'string') {
    throw new LoadAPIKeyError({
      message: `${description} API key must be a string. The value of the ${environmentVariableName} environment variable is not a string.`,
    });
  }

  return apiKey;
}
