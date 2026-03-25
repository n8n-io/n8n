"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanParameterPrefixes = void 0;
const BooleanParameterPrefixes = (options) => {
    const prefixes = options.prefixes || ['is', 'has'];
    const regexp = new RegExp(`^(${prefixes.join('|')})[A-Z-_]`);
    const wrappedPrefixes = prefixes.map((p) => `\`${p}\``);
    const prefixesString = wrappedPrefixes.length === 1
        ? wrappedPrefixes[0]
        : wrappedPrefixes.slice(0, -1).join(', ') + ' or ' + wrappedPrefixes[prefixes.length - 1];
    return {
        Parameter: {
            Schema(schema, { report, parentLocations }, parents) {
                if (schema.type === 'boolean' && !regexp.test(parents.Parameter.name)) {
                    report({
                        message: `Boolean parameter \`${parents.Parameter.name}\` should have ${prefixesString} prefix.`,
                        location: parentLocations.Parameter.child(['name']),
                    });
                }
            },
        },
    };
};
exports.BooleanParameterPrefixes = BooleanParameterPrefixes;
