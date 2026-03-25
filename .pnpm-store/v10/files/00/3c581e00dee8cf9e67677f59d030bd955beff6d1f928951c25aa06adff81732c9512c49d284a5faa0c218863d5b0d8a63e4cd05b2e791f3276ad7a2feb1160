/* eslint-disable import/no-extraneous-dependencies */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { sep } from "path";
/**
 * Resolve vitest ESM module from correct workspace
 * This is necessary for monorepos where langsmith is hoisted to
 * the top level of the monorepo but Vitest is not.
 * This can occur if you have multiple versions of vitest installed in the monorepo
 * and there is only one shared, hoisted version of langsmith.
 */
export const importVitestModule = async (entrypoint) => {
    let importedModule;
    try {
        const require = createRequire(import.meta.url);
        // Find the package.json to get the correct ESM entry point
        const packagePath = require.resolve(`vitest/package.json`, {
            paths: [process.cwd()],
        });
        const pkg = require(packagePath);
        const pkgDir = packagePath.replace(`${sep}package.json`, "");
        const esmEntry = !entrypoint
            ? pkg.module ?? pkg.exports?.["."]?.import ?? "dist/index.js"
            : pkg.exports?.[`./${entrypoint}`]?.import ??
                pkg.exports?.[`./${entrypoint}`]?.default;
        const modulePath = `${pkgDir}${sep}${esmEntry}`;
        const path = pathToFileURL(modulePath).href;
        importedModule = await import(path);
        if (!importedModule) {
            throw new Error(`Failed to import vitest entrypoint${entrypoint ? ` ${entrypoint}` : ""}`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
    catch (error) {
        importedModule = await import(`vitest${entrypoint ? `/${entrypoint}` : ""}`);
    }
    return importedModule;
};
