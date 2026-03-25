import path from 'node:path';
import isGlob from 'is-glob';
import { Minimatch } from 'minimatch';
import { importType, createRule, moduleVisitor, resolve, } from '../utils/index.js';
const containsPath = (filepath, target) => {
    const relative = path.relative(target, filepath);
    return relative === '' || !relative.startsWith('..');
};
function isMatchingTargetPath(filename, targetPath) {
    if (isGlob(targetPath)) {
        const mm = new Minimatch(targetPath, { windowsPathsNoEscape: true });
        return mm.match(filename);
    }
    return containsPath(filename, targetPath);
}
function areBothGlobPatternAndAbsolutePath(areGlobPatterns) {
    return (areGlobPatterns.some(Boolean) && areGlobPatterns.some(isGlob => !isGlob));
}
export default createRule({
    name: 'no-restricted-paths',
    meta: {
        type: 'problem',
        docs: {
            category: 'Static analysis',
            description: 'Enforce which files can be imported in a given folder.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    zones: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            properties: {
                                target: {
                                    anyOf: [
                                        { type: 'string' },
                                        {
                                            type: 'array',
                                            items: { type: 'string' },
                                            uniqueItems: true,
                                            minItems: 1,
                                        },
                                    ],
                                },
                                from: {
                                    anyOf: [
                                        { type: 'string' },
                                        {
                                            type: 'array',
                                            items: { type: 'string' },
                                            uniqueItems: true,
                                            minItems: 1,
                                        },
                                    ],
                                },
                                except: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                    },
                                    uniqueItems: true,
                                },
                                message: { type: 'string' },
                            },
                            additionalProperties: false,
                        },
                    },
                    basePath: { type: 'string' },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            path: 'Restricted path exceptions must be descendants of the configured `from` path for that zone.',
            mixedGlob: 'Restricted path `from` must contain either only glob patterns or none',
            glob: 'Restricted path exceptions must be glob patterns when `from` contains glob patterns',
            zone: 'Unexpected path "{{importPath}}" imported in restricted zone.{{extra}}',
        },
    },
    defaultOptions: [],
    create(context) {
        const options = context.options[0] || {};
        const restrictedPaths = options.zones || [];
        const basePath = options.basePath || process.cwd();
        const filename = context.physicalFilename;
        const matchingZones = restrictedPaths.filter(zone => [zone.target]
            .flat()
            .map(target => path.resolve(basePath, target))
            .some(targetPath => isMatchingTargetPath(filename, targetPath)));
        function isValidExceptionPath(absoluteFromPath, absoluteExceptionPath) {
            const relativeExceptionPath = path.relative(absoluteFromPath, absoluteExceptionPath);
            return importType(relativeExceptionPath, context) !== 'parent';
        }
        function reportInvalidExceptionPath(node) {
            context.report({
                node,
                messageId: 'path',
            });
        }
        function reportInvalidExceptionMixedGlobAndNonGlob(node) {
            context.report({
                node,
                messageId: 'mixedGlob',
            });
        }
        function reportInvalidExceptionGlob(node) {
            context.report({
                node,
                messageId: 'glob',
            });
        }
        function computeMixedGlobAndAbsolutePathValidator() {
            return {
                isPathRestricted: () => true,
                hasValidExceptions: false,
                reportInvalidException: reportInvalidExceptionMixedGlobAndNonGlob,
            };
        }
        function computeGlobPatternPathValidator(absoluteFrom, zoneExcept) {
            let isPathException;
            const mm = new Minimatch(absoluteFrom, { windowsPathsNoEscape: true });
            const isPathRestricted = (absoluteImportPath) => mm.match(absoluteImportPath);
            const hasValidExceptions = zoneExcept.every(it => isGlob(it));
            if (hasValidExceptions) {
                const exceptionsMm = zoneExcept.map(except => new Minimatch(except, { windowsPathsNoEscape: true }));
                isPathException = (absoluteImportPath) => exceptionsMm.some(mm => mm.match(absoluteImportPath));
            }
            const reportInvalidException = reportInvalidExceptionGlob;
            return {
                isPathRestricted,
                hasValidExceptions,
                isPathException,
                reportInvalidException,
            };
        }
        function computeAbsolutePathValidator(absoluteFrom, zoneExcept) {
            let isPathException;
            const isPathRestricted = (absoluteImportPath) => containsPath(absoluteImportPath, absoluteFrom);
            const absoluteExceptionPaths = zoneExcept.map(exceptionPath => path.resolve(absoluteFrom, exceptionPath));
            const hasValidExceptions = absoluteExceptionPaths.every(absoluteExceptionPath => isValidExceptionPath(absoluteFrom, absoluteExceptionPath));
            if (hasValidExceptions) {
                isPathException = absoluteImportPath => absoluteExceptionPaths.some(absoluteExceptionPath => containsPath(absoluteImportPath, absoluteExceptionPath));
            }
            const reportInvalidException = reportInvalidExceptionPath;
            return {
                isPathRestricted,
                hasValidExceptions,
                isPathException,
                reportInvalidException,
            };
        }
        function reportInvalidExceptions(validators, node) {
            for (const validator of validators)
                validator.reportInvalidException(node);
        }
        function reportImportsInRestrictedZone(validators, node, importPath, customMessage) {
            for (const _ of validators) {
                context.report({
                    node,
                    messageId: 'zone',
                    data: {
                        importPath,
                        extra: customMessage ? ` ${customMessage}` : '',
                    },
                });
            }
        }
        const makePathValidators = (zoneFrom, zoneExcept = []) => {
            const allZoneFrom = [zoneFrom].flat();
            const areGlobPatterns = allZoneFrom.map(it => isGlob(it));
            if (areBothGlobPatternAndAbsolutePath(areGlobPatterns)) {
                return [computeMixedGlobAndAbsolutePathValidator()];
            }
            const isGlobPattern = areGlobPatterns.every(Boolean);
            return allZoneFrom.map(singleZoneFrom => {
                const absoluteFrom = path.resolve(basePath, singleZoneFrom);
                if (isGlobPattern) {
                    return computeGlobPatternPathValidator(absoluteFrom, zoneExcept);
                }
                return computeAbsolutePathValidator(absoluteFrom, zoneExcept);
            });
        };
        const validators = [];
        return moduleVisitor(source => {
            const importPath = source.value;
            const absoluteImportPath = resolve(importPath, context);
            if (!absoluteImportPath) {
                return;
            }
            for (const [index, zone] of matchingZones.entries()) {
                if (!validators[index]) {
                    validators[index] = makePathValidators(zone.from, zone.except);
                }
                const applicableValidatorsForImportPath = validators[index].filter(validator => validator.isPathRestricted(absoluteImportPath));
                const validatorsWithInvalidExceptions = applicableValidatorsForImportPath.filter(validator => !validator.hasValidExceptions);
                reportInvalidExceptions(validatorsWithInvalidExceptions, source);
                const applicableValidatorsForImportPathExcludingExceptions = applicableValidatorsForImportPath.filter(validator => validator.hasValidExceptions &&
                    !validator.isPathException(absoluteImportPath));
                reportImportsInRestrictedZone(applicableValidatorsForImportPathExcludingExceptions, source, importPath, zone.message);
            }
        }, { commonjs: true });
    },
});
//# sourceMappingURL=no-restricted-paths.js.map