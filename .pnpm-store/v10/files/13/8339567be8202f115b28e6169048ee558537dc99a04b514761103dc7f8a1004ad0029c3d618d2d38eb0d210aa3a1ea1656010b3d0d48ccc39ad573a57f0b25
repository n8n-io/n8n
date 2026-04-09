"use strict";
const node_child_process_1 = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const constants_js_1 = require("./constants.js");
const helpers_js_1 = require("./helpers.js");
const EXECUTORS = {
    npm: 'npx',
    pnpm: 'pnpm',
    yarn: 'yarn',
    bun: 'bun',
    deno: (args) => ['deno', 'run', `npm:${args[0]}`, ...args.slice(1)],
};
function constructCommand(value, args) {
    const list = typeof value === 'function'
        ? value(args)
        :
            [].concat(value, args);
    return {
        command: list[0],
        args: list.slice(1),
    };
}
function fallback(packageJsonPath, checkVersion) {
    const packageJson = require(packageJsonPath);
    const { name, version: pkgVersion, optionalDependencies } = packageJson;
    const { napi, version = pkgVersion } = (0, helpers_js_1.getNapiInfoFromPackageJson)(packageJson, checkVersion);
    if (checkVersion && pkgVersion !== version) {
        throw new Error((0, helpers_js_1.errorMessage)(`Inconsistent package versions found for \`${name}\` v${pkgVersion} vs \`${napi.packageName}\` v${version}.`));
    }
    if (process.versions.webcontainer) {
        const bindingPkgName = `${napi.packageName}-${constants_js_1.WASM32_WASI}`;
        if (!optionalDependencies?.[bindingPkgName]) {
            throw new Error((0, helpers_js_1.errorMessage)(`\`${constants_js_1.WASM32_WASI}\` target is unavailable for \`${name}\` v${version}`));
        }
        const baseDir = path.resolve(os.tmpdir(), `${name}-${version}`);
        const bindingEntry = path.resolve(baseDir, `node_modules/${bindingPkgName}/${napi.binaryName}.wasi.cjs`);
        if (!fs.existsSync(bindingEntry)) {
            fs.rmSync(baseDir, { recursive: true, force: true });
            fs.mkdirSync(baseDir, { recursive: true });
            const bindingPkg = `${bindingPkgName}@${version}`;
            console.log((0, helpers_js_1.errorMessage)(`Downloading \`${bindingPkg}\` on WebContainer...`));
            (0, node_child_process_1.execFileSync)('pnpm', ['i', bindingPkg], {
                cwd: baseDir,
                stdio: 'inherit',
            });
        }
        return require(bindingEntry);
    }
    const userAgent = ((process.env.npm_config_user_agent || '').split('/')[0] ||
        'npm');
    const executor = EXECUTORS[userAgent];
    if (!executor) {
        throw new Error((0, helpers_js_1.errorMessage)(`Unsupported package manager: ${userAgent}. Supported managers are: ${Object.keys(EXECUTORS).join(', ')}.`));
    }
    const { command, args } = constructCommand(executor, [
        'napi-postinstall',
        name,
        version,
        checkVersion ? '1' : '0',
    ]);
    const pkgDir = path.dirname(packageJsonPath);
    (0, node_child_process_1.execFileSync)(command, args, {
        cwd: pkgDir,
        stdio: 'inherit',
    });
    process.env[`SKIP_${name.replace(/-/g, '_').toUpperCase()}_FALLBACK`] = '1';
    const PKG_RESOLVED_PATH = require.resolve(pkgDir);
    delete require.cache[PKG_RESOLVED_PATH];
    return require(pkgDir);
}
module.exports = fallback;
//# sourceMappingURL=fallback.js.map