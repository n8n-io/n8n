import { ARAZZO_VERSIONS_SUPPORTED_BY_SPOT } from '../../typings/arazzo';
import { pluralize } from '../../utils';

import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const SpotSupportedVersions: Arazzo1Rule = () => {
  const supportedVersions = ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.join(', ');
  return {
    Root: {
      enter(root, { report, location }: UserContext) {
        if (!ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.includes(root.arazzo)) {
          report({
            message: `Only ${supportedVersions} Arazzo ${pluralize(
              'version is',
              ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.length
            )} supported by Spot.`,
            location: location.child('arazzo'),
          });
        }
      },
    },
  };
};
