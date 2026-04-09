// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { BrowserbaseError } from '../../error';

/**
 * Basic re-implementation of `qs.stringify` for primitive types.
 */
export function stringifyQuery(query: object | Record<string, unknown>) {
  return Object.entries(query)
    .filter(([_, value]) => typeof value !== 'undefined')
    .map(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new BrowserbaseError(
        `Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`,
      );
    })
    .join('&');
}
