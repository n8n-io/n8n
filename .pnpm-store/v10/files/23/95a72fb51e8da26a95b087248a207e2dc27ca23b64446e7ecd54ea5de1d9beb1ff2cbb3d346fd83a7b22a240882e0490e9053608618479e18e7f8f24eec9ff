"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityDefined = void 0;
const SecurityDefined = (opts) => {
    const referencedSchemes = new Map();
    const operationsWithoutSecurity = [];
    let eachOperationHasSecurity = true;
    let path;
    return {
        Root: {
            leave(root, { report }) {
                for (const [name, scheme] of referencedSchemes.entries()) {
                    if (scheme.defined)
                        continue;
                    for (const reportedFromLocation of scheme.from) {
                        report({
                            message: `There is no \`${name}\` security scheme defined.`,
                            location: reportedFromLocation.key(),
                        });
                    }
                }
                if (root.security || eachOperationHasSecurity) {
                    return;
                }
                else {
                    for (const operationLocation of operationsWithoutSecurity) {
                        report({
                            message: `Every operation should have security defined on it or on the root level.`,
                            location: operationLocation.key(),
                        });
                    }
                }
            },
        },
        SecurityScheme(_securityScheme, { key }) {
            referencedSchemes.set(key.toString(), { defined: true, from: [] });
        },
        SecurityRequirement(requirements, { location }) {
            for (const requirement of Object.keys(requirements)) {
                const authScheme = referencedSchemes.get(requirement);
                const requirementLocation = location.child([requirement]);
                if (!authScheme) {
                    referencedSchemes.set(requirement, { from: [requirementLocation] });
                }
                else {
                    authScheme.from.push(requirementLocation);
                }
            }
        },
        PathItem: {
            enter(pathItem, { key }) {
                path = key;
            },
            Operation(operation, { location, key }) {
                const isException = opts.exceptions?.some((item) => item.path === path &&
                    (!item.methods || item.methods?.some((method) => method.toLowerCase() === key)));
                if (!operation?.security && !isException) {
                    eachOperationHasSecurity = false;
                    operationsWithoutSecurity.push(location);
                }
            },
        },
    };
};
exports.SecurityDefined = SecurityDefined;
