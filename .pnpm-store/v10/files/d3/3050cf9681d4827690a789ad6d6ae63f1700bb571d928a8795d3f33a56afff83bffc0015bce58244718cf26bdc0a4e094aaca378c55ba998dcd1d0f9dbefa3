import type { APICallError } from '@ai-sdk/provider';

export function extractApiCallResponse(error: APICallError): unknown {
  if (error.data !== undefined) {
    return error.data;
  }
  if (error.responseBody != null) {
    try {
      return JSON.parse(error.responseBody);
    } catch {
      return error.responseBody;
    }
  }
  return {};
}
