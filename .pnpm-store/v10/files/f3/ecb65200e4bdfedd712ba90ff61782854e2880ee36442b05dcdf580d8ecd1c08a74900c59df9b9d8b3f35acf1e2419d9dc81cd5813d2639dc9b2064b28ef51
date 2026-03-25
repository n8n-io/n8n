import { validateDefinedAndNonEmpty } from '../utils';

import type { Oas3Rule, Oas2Rule } from '../../visitors';

export const InfoLicenseUrl: Oas3Rule | Oas2Rule = () => {
  return {
    License(license, ctx) {
      validateDefinedAndNonEmpty('url', license, ctx);
    },
  };
};
