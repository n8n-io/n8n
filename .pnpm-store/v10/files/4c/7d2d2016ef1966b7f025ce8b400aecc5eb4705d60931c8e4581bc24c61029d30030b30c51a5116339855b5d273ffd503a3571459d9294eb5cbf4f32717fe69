import { missingRequiredField } from '../utils';

import type { Oas3Rule, Oas2Rule } from '../../visitors';

export const InfoLicense: Oas3Rule | Oas2Rule = () => {
  return {
    Info(info, { report }) {
      if (!info.license) {
        report({
          message: missingRequiredField('Info', 'license'),
          location: { reportOnKey: true },
        });
      }
    },
  };
};
