"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRoot = exports.debug = void 0;
const node_path_1 = require("node:path");
const logger_1 = require("../logger");
const fs_1 = require("./fs");
function debug(...scope) {
    return (formatter, ...args) => (0, logger_1.getLogger)(['find-root', ...scope].join(':')).debug(formatter, ...args);
}
exports.debug = debug;
// essentially just "cd .."
function* up(from) {
    while ((0, node_path_1.dirname)(from) !== from) {
        yield from;
        from = (0, node_path_1.dirname)(from);
    }
    yield from;
}
/**
 * Return the plugin root directory from a given file. This will `cd` up the file system until it finds
 * a package.json and then return the dirname of that path.
 *
 * Example: node_modules/@oclif/plugin-version/dist/index.js -> node_modules/@oclif/plugin-version
 */
async function findPluginRoot(root, name) {
    // If we know the plugin name then we just need to traverse the file
    // system until we find the directory that matches the plugin name.
    debug(name ?? 'root-plugin')(`Finding root starting at ${root}`);
    if (name) {
        for (const next of up(root)) {
            if (next.endsWith((0, node_path_1.basename)(name))) {
                debug(name)('Found root based on plugin name!');
                return next;
            }
        }
    }
    // If there's no plugin name (typically just the root plugin), then we need
    // to traverse the file system until we find a directory with a package.json
    for (const next of up(root)) {
        // Skip the bin directory
        if ((0, node_path_1.basename)((0, node_path_1.dirname)(next)) === 'bin' &&
            ['dev', 'dev.cmd', 'dev.js', 'run', 'run.cmd', 'run.js'].includes((0, node_path_1.basename)(next))) {
            continue;
        }
        try {
            const cur = (0, node_path_1.join)(next, 'package.json');
            debug(name ?? 'root-plugin')(`Checking ${cur}`);
            if (await (0, fs_1.safeReadJson)(cur)) {
                debug(name ?? 'root-plugin')('Found root by traversing up from starting point!');
                return (0, node_path_1.dirname)(cur);
            }
        }
        catch { }
    }
}
/**
 * Find plugin root directory for plugins installed into node_modules that don't have a `main` or `export`.
 * This will go up directories until it finds a directory with the plugin installed into it.
 *
 * See https://github.com/oclif/config/pull/289#issuecomment-983904051
 */
async function findRootLegacy(name, root) {
    debug(name ?? 'root-plugin')('Finding root using legacy method');
    for (const next of up(root)) {
        let cur;
        if (name) {
            cur = (0, node_path_1.join)(next, 'node_modules', name, 'package.json');
            if (await (0, fs_1.safeReadJson)(cur))
                return (0, node_path_1.dirname)(cur);
            const pkg = await (0, fs_1.safeReadJson)((0, node_path_1.join)(next, 'package.json'));
            if (pkg?.name === name)
                return next;
        }
        else {
            cur = (0, node_path_1.join)(next, 'package.json');
            if (await (0, fs_1.safeReadJson)(cur))
                return (0, node_path_1.dirname)(cur);
        }
    }
}
let pnp;
/**
 * The pnpapi module is only available if running in a pnp environment. Because of that
 * we have to require it from the plugin.
 *
 * Solution taken from here: https://github.com/yarnpkg/berry/issues/1467#issuecomment-642869600
 */
function maybeRequirePnpApi(root) {
    if (pnp)
        return pnp;
    try {
        // eslint-disable-next-line n/no-missing-require
        pnp = require(require.resolve('pnpapi', { paths: [root] }));
        return pnp;
    }
    catch { }
}
const getKey = (locator) => JSON.stringify(locator);
const isPeerDependency = (pkg, parentPkg, name) => getKey(pkg?.packageDependencies.get(name)) === getKey(parentPkg?.packageDependencies.get(name));
/**
 * Traverse PnP dependency tree to find plugin root directory.
 *
 * Implementation adapted from https://yarnpkg.com/advanced/pnpapi#traversing-the-dependency-tree
 */
function findPnpRoot(name, root) {
    maybeRequirePnpApi(root);
    if (!pnp)
        return;
    debug(name)('Finding root for using pnp method');
    const seen = new Set();
    const traverseDependencyTree = (locator, parentPkg) => {
        // Prevent infinite recursion when A depends on B which depends on A
        const key = getKey(locator);
        if (seen.has(key))
            return;
        const pkg = pnp.getPackageInformation(locator);
        if (locator.name === name) {
            return pkg.packageLocation;
        }
        seen.add(key);
        for (const [name, referencish] of pkg.packageDependencies) {
            // Unmet peer dependencies
            if (referencish === null)
                continue;
            // Avoid iterating on peer dependencies - very expensive
            if (parentPkg !== null && isPeerDependency(pkg, parentPkg, name))
                continue;
            const childLocator = pnp.getLocator(name, referencish);
            const foundSomething = traverseDependencyTree(childLocator, pkg);
            if (foundSomething)
                return foundSomething;
        }
        // Important: This `delete` here causes the traversal to go over nodes even
        // if they have already been traversed in another branch. If you don't need
        // that, remove this line for a hefty speed increase.
        seen.delete(key);
    };
    // Iterate on each workspace
    for (const locator of pnp.getDependencyTreeRoots()) {
        const foundSomething = traverseDependencyTree(locator);
        if (foundSomething)
            return foundSomething;
    }
}
/**
 * Returns the root directory of the plugin.
 *
 * It first attempts to use require.resolve to find the plugin root.
 * If that returns a path, it will `cd` up the file system until if finds the package.json for the plugin
 * Example: node_modules/@oclif/plugin-version/dist/index.js -> node_modules/@oclif/plugin-version
 *
 * If require.resolve throws an error, it will attempt to find the plugin root by traversing the file system.
 * If we're in a PnP environment (determined by process.versions.pnp), it will use the pnpapi module to
 * traverse the dependency tree. Otherwise, it will traverse the node_modules until it finds a package.json
 * with a matching name.
 *
 * If no path is found, undefined is returned which will eventually result in a thrown Error from Plugin.
 */
async function findRoot(name, root) {
    if (name) {
        debug(name)(`Finding root using ${root}`);
        let pkgPath;
        try {
            pkgPath = require.resolve(name, { paths: [root] });
            debug(name)(`Found starting point with require.resolve`);
        }
        catch {
            debug(name)(`require.resolve could not find plugin starting point`);
        }
        if (pkgPath) {
            const found = await findPluginRoot((0, node_path_1.dirname)(pkgPath), name);
            if (found) {
                debug(name)(`Found root at ${found}`);
                return found;
            }
        }
        const found = process.versions.pnp ? findPnpRoot(name, root) : await findRootLegacy(name, root);
        debug(name)(found ? `Found root at ${found}` : 'No root found!');
        return found;
    }
    debug('root-plugin')(`Finding root plugin using ${root}`);
    const found = await findPluginRoot(root);
    debug('root-plugin')(found ? `Found root at ${found}` : 'No root found!');
    return found;
}
exports.findRoot = findRoot;
