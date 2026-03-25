import { YamlParseError } from '../resolve';

import type { Oas3Rule } from '../visitors';
import type { ResolveResult, Problem } from '../walk';
import type { Location } from '../ref-utils';

export const NoUnresolvedRefs: Oas3Rule = () => {
  return {
    ref: {
      leave(_, { report, location }, resolved) {
        if (resolved.node !== undefined) return;
        reportUnresolvedRef(resolved, report, location);
      },
    },
    DiscriminatorMapping(mapping, { report, resolve, location }) {
      for (const mappingName of Object.keys(mapping)) {
        const resolved = resolve({ $ref: mapping[mappingName] });
        if (resolved.node !== undefined) return;

        reportUnresolvedRef(resolved, report, location.child(mappingName));
      }
    },
  };
};

export function reportUnresolvedRef(
  resolved: ResolveResult<any>,
  report: (m: Problem) => void,
  location: Location
) {
  const error = resolved.error;
  if (error instanceof YamlParseError) {
    report({
      message: 'Failed to parse: ' + error.message,
      location: {
        source: error.source,
        pointer: undefined,
        start: {
          col: error.col,
          line: error.line,
        },
      },
    });
  }

  const message = resolved.error?.message;

  report({
    location,
    message: `Can't resolve $ref${message ? ': ' + message : ''}`,
  });
}
