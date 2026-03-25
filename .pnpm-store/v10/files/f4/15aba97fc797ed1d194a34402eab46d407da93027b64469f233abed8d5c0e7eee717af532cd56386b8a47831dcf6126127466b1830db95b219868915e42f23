import { getMatchingStatusCodeRange } from '../../utils';

import type { Oas3Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ResponseContainsProperty: Oas3Rule = (options) => {
  const names: Record<string, string[]> = options.names || {};
  let key: string | number;
  return {
    Operation: {
      Response: {
        skip: (_response, key) => {
          return `${key}` === '204';
        },
        enter: (_response, ctx: UserContext) => {
          key = ctx.key;
        },
        MediaType: {
          Schema(schema, { report, location }) {
            if (schema.type !== 'object') return;
            const expectedProperties =
              names[key] ||
              names[getMatchingStatusCodeRange(key)] ||
              names[getMatchingStatusCodeRange(key).toLowerCase()] ||
              [];
            for (const expectedProperty of expectedProperties) {
              if (!schema.properties?.[expectedProperty]) {
                report({
                  message: `Response object must contain a top-level "${expectedProperty}" property.`,
                  location: location.child('properties').key(),
                });
              }
            }
          },
        },
      },
    },
  };
};
