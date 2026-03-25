import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { createRule, moduleVisitor, resolve, pkgUp, importType, getFilePackageName, getNpmInstallCommand, } from '../utils/index.js';
const depFieldCache = new Map();
function hasKeys(obj = {}) {
    return Object.keys(obj).length > 0;
}
function arrayOrKeys(arrayOrObject) {
    return Array.isArray(arrayOrObject)
        ? arrayOrObject
        : Object.keys(arrayOrObject);
}
function readJSON(jsonPath, throwException) {
    try {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    catch (error) {
        if (throwException) {
            throw error;
        }
    }
}
function extractDepFields(pkg) {
    return {
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        optionalDependencies: pkg.optionalDependencies || {},
        peerDependencies: pkg.peerDependencies || {},
        bundledDependencies: arrayOrKeys(pkg.bundleDependencies || pkg.bundledDependencies || []),
    };
}
function getPackageDepFields(packageJsonPath, throwAtRead) {
    if (!depFieldCache.has(packageJsonPath)) {
        const packageJson = readJSON(packageJsonPath, throwAtRead);
        if (packageJson) {
            const depFields = extractDepFields(packageJson);
            depFieldCache.set(packageJsonPath, depFields);
        }
    }
    return depFieldCache.get(packageJsonPath);
}
function getDependencies(context, packageDir) {
    let paths = [];
    try {
        let packageContent = {
            dependencies: {},
            devDependencies: {},
            optionalDependencies: {},
            peerDependencies: {},
            bundledDependencies: [],
        };
        if (packageDir && packageDir.length > 0) {
            paths = Array.isArray(packageDir)
                ? packageDir.map(dir => path.resolve(dir))
                : [path.resolve(packageDir)];
        }
        if (paths.length > 0) {
            for (const dir of paths) {
                const packageJsonPath = path.resolve(dir, 'package.json');
                const packageContent_ = getPackageDepFields(packageJsonPath, paths.length === 1);
                if (packageContent_) {
                    for (const depsKey of Object.keys(packageContent)) {
                        const key = depsKey;
                        Object.assign(packageContent[key], packageContent_[key]);
                    }
                }
            }
        }
        else {
            const packageJsonPath = pkgUp({
                cwd: context.physicalFilename,
            });
            const packageContent_ = getPackageDepFields(packageJsonPath, false);
            if (packageContent_) {
                packageContent = packageContent_;
            }
        }
        if (![
            packageContent.dependencies,
            packageContent.devDependencies,
            packageContent.optionalDependencies,
            packageContent.peerDependencies,
            packageContent.bundledDependencies,
        ].some(hasKeys)) {
            return;
        }
        return packageContent;
    }
    catch (error_) {
        const error = error_;
        if (paths.length > 0 && error.code === 'ENOENT') {
            context.report({
                messageId: 'pkgNotFound',
                loc: { line: 0, column: 0 },
            });
        }
        if (error.name === 'JSONError' || error instanceof SyntaxError) {
            context.report({
                messageId: 'pkgUnparsable',
                data: { error: error.message },
                loc: { line: 0, column: 0 },
            });
        }
    }
}
function getModuleOriginalName(name) {
    const [first, second] = name.split('/');
    return first.startsWith('@') ? `${first}/${second}` : first;
}
function checkDependencyDeclaration(deps, packageName, declarationStatus) {
    const newDeclarationStatus = declarationStatus || {
        isInDeps: false,
        isInDevDeps: false,
        isInOptDeps: false,
        isInPeerDeps: false,
        isInBundledDeps: false,
    };
    const packageHierarchy = [];
    const packageNameParts = packageName ? packageName.split('/') : [];
    for (const [index, namePart] of packageNameParts.entries()) {
        if (!namePart.startsWith('@')) {
            const ancestor = packageNameParts.slice(0, index + 1).join('/');
            packageHierarchy.push(ancestor);
        }
    }
    return packageHierarchy.reduce((result, ancestorName) => ({
        isInDeps: result.isInDeps || deps.dependencies[ancestorName] !== undefined,
        isInDevDeps: result.isInDevDeps || deps.devDependencies[ancestorName] !== undefined,
        isInOptDeps: result.isInOptDeps ||
            deps.optionalDependencies[ancestorName] !== undefined,
        isInPeerDeps: result.isInPeerDeps ||
            deps.peerDependencies[ancestorName] !== undefined,
        isInBundledDeps: result.isInBundledDeps ||
            deps.bundledDependencies.includes(ancestorName),
    }), newDeclarationStatus);
}
function reportIfMissing(context, deps, depsOptions, node, name, whitelist) {
    if (!depsOptions.verifyTypeImports &&
        (('importKind' in node &&
            (node.importKind === 'type' ||
                node.importKind === 'typeof')) ||
            ('exportKind' in node && node.exportKind === 'type') ||
            ('specifiers' in node &&
                Array.isArray(node.specifiers) &&
                node.specifiers.length > 0 &&
                node.specifiers.every(specifier => 'importKind' in specifier &&
                    (specifier.importKind === 'type' ||
                        specifier.importKind === 'typeof'))))) {
        return;
    }
    const typeOfImport = importType(name, context);
    if (typeOfImport !== 'external' &&
        (typeOfImport !== 'internal' || !depsOptions.verifyInternalDeps)) {
        return;
    }
    const resolved = resolve(name, context);
    if (!resolved) {
        return;
    }
    const importPackageName = getModuleOriginalName(name);
    let declarationStatus = checkDependencyDeclaration(deps, importPackageName);
    if (declarationStatus.isInDeps ||
        (depsOptions.allowDevDeps && declarationStatus.isInDevDeps) ||
        (depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps) ||
        (depsOptions.allowOptDeps && declarationStatus.isInOptDeps) ||
        (depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps)) {
        return;
    }
    const realPackageName = getFilePackageName(resolved);
    if (realPackageName && realPackageName !== importPackageName) {
        declarationStatus = checkDependencyDeclaration(deps, realPackageName, declarationStatus);
        if (declarationStatus.isInDeps ||
            (depsOptions.allowDevDeps && declarationStatus.isInDevDeps) ||
            (depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps) ||
            (depsOptions.allowOptDeps && declarationStatus.isInOptDeps) ||
            (depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps)) {
            return;
        }
    }
    const packageName = realPackageName || importPackageName;
    if (whitelist?.has(packageName)) {
        return;
    }
    if (declarationStatus.isInDevDeps && !depsOptions.allowDevDeps) {
        context.report({
            node,
            messageId: 'devDep',
            data: {
                packageName,
            },
        });
        return;
    }
    if (declarationStatus.isInOptDeps && !depsOptions.allowOptDeps) {
        context.report({
            node,
            messageId: 'optDep',
            data: {
                packageName,
            },
        });
        return;
    }
    context.report({
        node,
        messageId: 'missing',
        data: {
            packageName,
        },
    });
}
function testConfig(config, context) {
    if (typeof config === 'boolean' || config === undefined) {
        return config;
    }
    const filename = context.physicalFilename;
    return config.some(c => minimatch(filename, c) ||
        minimatch(filename, path.resolve(context.cwd, c), {
            windowsPathsNoEscape: true,
        }) ||
        minimatch(filename, path.resolve(c), { windowsPathsNoEscape: true }));
}
export default createRule({
    name: 'no-extraneous-dependencies',
    meta: {
        type: 'problem',
        docs: {
            category: 'Helpful warnings',
            description: 'Forbid the use of extraneous packages.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    devDependencies: { type: ['boolean', 'array'] },
                    optionalDependencies: { type: ['boolean', 'array'] },
                    peerDependencies: { type: ['boolean', 'array'] },
                    bundledDependencies: { type: ['boolean', 'array'] },
                    packageDir: { type: ['string', 'array'] },
                    includeInternal: { type: ['boolean'] },
                    includeTypes: { type: ['boolean'] },
                    whitelist: { type: ['array'] },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            pkgNotFound: 'The package.json file could not be found.',
            pkgUnparsable: 'The package.json file could not be parsed: {{error}}',
            devDep: "'{{packageName}}' should be listed in the project's dependencies, not devDependencies.",
            optDep: "'{{packageName}}' should be listed in the project's dependencies, not optionalDependencies.",
            missing: `'{{packageName}}' should be listed in the project's dependencies. Run '${getNpmInstallCommand('{{packageName}}')}' to add it`,
        },
    },
    defaultOptions: [],
    create(context) {
        const options = context.options[0] || {};
        const deps = getDependencies(context, options.packageDir) || extractDepFields({});
        const depsOptions = {
            allowDevDeps: testConfig(options.devDependencies, context) !== false,
            allowOptDeps: testConfig(options.optionalDependencies, context) !== false,
            allowPeerDeps: testConfig(options.peerDependencies, context) !== false,
            allowBundledDeps: testConfig(options.bundledDependencies, context) !== false,
            verifyInternalDeps: !!options.includeInternal,
            verifyTypeImports: !!options.includeTypes,
        };
        return {
            ...moduleVisitor((source, node) => {
                reportIfMissing(context, deps, depsOptions, node, source.value, options.whitelist ? new Set(options.whitelist) : undefined);
            }, { commonjs: true }),
            'Program:exit'() {
                depFieldCache.clear();
            },
        };
    },
});
//# sourceMappingURL=no-extraneous-dependencies.js.map