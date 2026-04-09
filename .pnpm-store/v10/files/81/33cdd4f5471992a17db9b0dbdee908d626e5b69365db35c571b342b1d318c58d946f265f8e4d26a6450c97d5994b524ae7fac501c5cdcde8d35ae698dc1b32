import { JSONValue } from '@ai-sdk/provider';
import { safeParseJSON } from '@ai-sdk/provider-utils';
import { fixJson } from './fix-json';

export async function parsePartialJson(jsonText: string | undefined): Promise<{
  value: JSONValue | undefined;
  state:
    | 'undefined-input'
    | 'successful-parse'
    | 'repaired-parse'
    | 'failed-parse';
}> {
  if (jsonText === undefined) {
    return { value: undefined, state: 'undefined-input' };
  }

  let result = await safeParseJSON({ text: jsonText });

  if (result.success) {
    return { value: result.value, state: 'successful-parse' };
  }

  result = await safeParseJSON({ text: fixJson(jsonText) });

  if (result.success) {
    return { value: result.value, state: 'repaired-parse' };
  }

  return { value: undefined, state: 'failed-parse' };
}
