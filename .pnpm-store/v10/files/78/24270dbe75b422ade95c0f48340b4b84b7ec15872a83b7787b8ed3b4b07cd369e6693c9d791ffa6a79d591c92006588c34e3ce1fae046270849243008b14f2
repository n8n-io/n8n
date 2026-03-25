import type { Async2Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ChannelsKebabCase: Async2Rule = () => {
  return {
    Channel(_channel: object, { report, key }: UserContext) {
      const segments = (key as string)
        .split(/[/.:]/) // split on / or : as likely channel namespacers
        .filter((s) => s !== ''); // filter out empty segments
      if (!segments.every((segment) => /^{.+}$/.test(segment) || /^[a-z0-9-.]+$/.test(segment))) {
        report({
          message: `\`${key}\` does not use kebab-case.`,
          location: { reportOnKey: true },
        });
      }
    },
  };
};
