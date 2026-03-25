import type { Oas3Rule } from '../../visitors';

export const NoEmptyServers: Oas3Rule = () => {
  return {
    Root(root, { report, location }) {
      if (!root.hasOwnProperty('servers')) {
        report({
          message: 'Servers must be present.',
          location: location.child(['openapi']).key(),
        });
        return;
      }

      if (!Array.isArray(root.servers) || root.servers.length === 0) {
        report({
          message: 'Servers must be a non-empty array.',
          location: location.child(['servers']).key(),
        });
      }
    },
  };
};
