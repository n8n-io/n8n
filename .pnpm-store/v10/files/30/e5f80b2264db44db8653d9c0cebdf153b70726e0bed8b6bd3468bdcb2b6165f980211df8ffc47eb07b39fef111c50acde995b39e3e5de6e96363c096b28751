import type { Async3Rule } from '../../visitors';
import type { UserContext } from '../../walk';
import type { Channel } from '../../typings/asyncapi3';

export const NoChannelTrailingSlash: Async3Rule = () => {
  return {
    Channel(channel: Channel, { report, location }: UserContext) {
      if ((channel.address as string).endsWith('/') && channel.address !== '/') {
        report({
          message: `\`${channel.address}\` should not have a trailing slash.`,
          location: location.key(),
        });
      }
    },
  };
};
