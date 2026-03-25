export declare function debug(...scope: string[]): (..._: any) => void;
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
export declare function findRoot(name: string | undefined, root: string): Promise<string | undefined>;
