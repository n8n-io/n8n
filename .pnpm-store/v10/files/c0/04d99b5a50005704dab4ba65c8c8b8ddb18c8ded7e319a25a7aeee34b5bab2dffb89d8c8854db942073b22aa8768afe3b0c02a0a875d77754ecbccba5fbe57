import type { Oas3Rule } from '../../visitors';
import type { Problem, UserContext } from '../../walk';
import type { Location } from '../../ref-utils';

export const SpecComponentsInvalidMapName: Oas3Rule = () => {
  const KEYS_REGEX = '^[a-zA-Z0-9\\.\\-_]+$';

  function validateKey(
    key: string | number,
    report: (problem: Problem) => void,
    location: Location,
    component: string
  ) {
    if (!new RegExp(KEYS_REGEX).test(key as string)) {
      report({
        message: `The map key in ${component} "${key}" does not match the regular expression "${KEYS_REGEX}"`,
        location: location.key(),
      });
    }
  }

  return {
    NamedSchemas: {
      Schema(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'schemas');
      },
    },
    NamedParameters: {
      Parameter(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'parameters');
      },
    },
    NamedResponses: {
      Response(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'responses');
      },
    },
    NamedExamples: {
      Example(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'examples');
      },
    },
    NamedRequestBodies: {
      RequestBody(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'requestBodies');
      },
    },
    NamedHeaders: {
      Header(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'headers');
      },
    },
    NamedSecuritySchemes: {
      SecurityScheme(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'securitySchemes');
      },
    },
    NamedLinks: {
      Link(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'links');
      },
    },
    NamedCallbacks: {
      Callback(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'callbacks');
      },
    },
  };
};
