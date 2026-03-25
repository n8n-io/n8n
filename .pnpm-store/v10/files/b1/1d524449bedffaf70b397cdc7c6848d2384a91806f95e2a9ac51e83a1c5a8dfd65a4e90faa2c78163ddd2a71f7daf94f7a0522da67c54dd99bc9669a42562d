import type { Oas2Rule } from '../../visitors';

export type BooleanParameterPrefixesOptions = {
  prefixes?: string[];
};

export const BooleanParameterPrefixes: Oas2Rule = (options: BooleanParameterPrefixesOptions) => {
  const prefixes = options.prefixes || ['is', 'has'];
  const regexp = new RegExp(`^(${prefixes.join('|')})[A-Z-_]`);
  const wrappedPrefixes = prefixes.map((p) => `\`${p}\``);
  const prefixesString =
    wrappedPrefixes.length === 1
      ? wrappedPrefixes[0]
      : wrappedPrefixes.slice(0, -1).join(', ') + ' or ' + wrappedPrefixes[prefixes.length - 1];

  return {
    Parameter(param, { report, location }) {
      if (param.type === 'boolean' && !regexp.test(param.name)) {
        report({
          message: `Boolean parameter \`${param.name}\` should have ${prefixesString} prefix.`,
          location: location.child('name'),
        });
      }
    },
  };
};
