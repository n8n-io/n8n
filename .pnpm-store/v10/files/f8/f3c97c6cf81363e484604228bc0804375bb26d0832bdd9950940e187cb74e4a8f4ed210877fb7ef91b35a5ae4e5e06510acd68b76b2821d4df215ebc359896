import type { Async2Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const NoChannelTrailingSlash: Async2Rule = () => {
  return {
    Channel(_channel: any, { report, key, location }: UserContext) {
      if ((key as string).endsWith('/') && key !== '/') {
        report({
          message: `\`${key}\` should not have a trailing slash.`,
          location: location.key(),
        });
      }
    },
  };
};
