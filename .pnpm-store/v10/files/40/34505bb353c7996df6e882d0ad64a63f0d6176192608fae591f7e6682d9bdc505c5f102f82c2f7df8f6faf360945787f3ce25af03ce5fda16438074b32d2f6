import { makeRe } from 'minimatch';
import { importType, createRule, moduleVisitor, resolve, } from '../utils/index.js';
function normalizeSep(somePath) {
    return somePath.split('\\').join('/');
}
function toSteps(somePath) {
    return normalizeSep(somePath)
        .split('/')
        .filter(step => step && step !== '.')
        .reduce((acc, step) => {
        if (step === '..') {
            return acc.slice(0, -1);
        }
        return [...acc, step];
    }, []);
}
const potentialViolationTypes = new Set([
    'parent',
    'index',
    'sibling',
    'external',
    'internal',
]);
export default createRule({
    name: 'no-internal-modules',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Static analysis',
            description: 'Forbid importing the submodules of other modules.',
        },
        schema: [
            {
                anyOf: [
                    {
                        type: 'object',
                        properties: {
                            allow: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                        additionalProperties: false,
                    },
                    {
                        type: 'object',
                        properties: {
                            forbid: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                        additionalProperties: false,
                    },
                ],
            },
        ],
        messages: {
            noAllowed: `Reaching to "{{importPath}}" is not allowed.`,
        },
    },
    defaultOptions: [],
    create(context) {
        const options = context.options[0] || {};
        const allowRegexps = (options.allow || [])
            .map(p => makeRe(p))
            .filter(Boolean);
        const forbidRegexps = (options.forbid || [])
            .map(p => makeRe(p))
            .filter(Boolean);
        function reachingAllowed(importPath) {
            return allowRegexps.some(re => re.test(importPath));
        }
        function reachingForbidden(importPath) {
            return forbidRegexps.some(re => re.test(importPath));
        }
        function isAllowViolation(importPath) {
            const steps = toSteps(importPath);
            const nonScopeSteps = steps.filter(step => step.indexOf('@') !== 0);
            if (nonScopeSteps.length <= 1) {
                return false;
            }
            const justSteps = steps.join('/');
            if (reachingAllowed(justSteps) || reachingAllowed(`/${justSteps}`)) {
                return false;
            }
            const resolved = resolve(importPath, context);
            if (!resolved || reachingAllowed(normalizeSep(resolved))) {
                return false;
            }
            return true;
        }
        function isForbidViolation(importPath) {
            const steps = toSteps(importPath);
            const justSteps = steps.join('/');
            if (reachingForbidden(justSteps) || reachingForbidden(`/${justSteps}`)) {
                return true;
            }
            const resolved = resolve(importPath, context);
            if (resolved && reachingForbidden(normalizeSep(resolved))) {
                return true;
            }
            return false;
        }
        const isReachViolation = options.forbid
            ? isForbidViolation
            : isAllowViolation;
        return moduleVisitor(source => {
            const importPath = source.value;
            if (potentialViolationTypes.has(importType(importPath, context)) &&
                isReachViolation(importPath)) {
                context.report({
                    node: source,
                    messageId: 'noAllowed',
                    data: {
                        importPath,
                    },
                });
            }
        }, { commonjs: true });
    },
});
//# sourceMappingURL=no-internal-modules.js.map