import { booleanSelector, SelectorType } from "@smithy/util-config-provider";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getNodeModulesParentDirs } from "./getNodeModulesParentDirs";
import { getSanitizedDevTypeScriptVersion } from "./getSanitizedDevTypeScriptVersion";
import { getSanitizedTypeScriptVersion } from "./getSanitizedTypeScriptVersion";
let tscVersion;
const TS_PACKAGE_JSON = join("node_modules", "typescript", "package.json");
export const getTypeScriptUserAgentPair = async () => {
    if (tscVersion === null) {
        return undefined;
    }
    else if (typeof tscVersion === "string") {
        return ["md/tsc", tscVersion];
    }
    let isTypeScriptDetectionDisabled = false;
    try {
        isTypeScriptDetectionDisabled =
            booleanSelector(process.env, "AWS_SDK_JS_TYPESCRIPT_DETECTION_DISABLED", SelectorType.ENV) || false;
    }
    catch { }
    if (isTypeScriptDetectionDisabled) {
        tscVersion = null;
        return undefined;
    }
    const dirname = typeof __dirname !== "undefined" ? __dirname : undefined;
    const nodeModulesParentDirs = getNodeModulesParentDirs(dirname);
    let versionFromApp;
    for (const nodeModulesParentDir of nodeModulesParentDirs) {
        try {
            const appPackageJsonPath = join(nodeModulesParentDir, "package.json");
            const packageJson = await readFile(appPackageJsonPath, "utf-8");
            const { dependencies, devDependencies } = JSON.parse(packageJson);
            const version = devDependencies?.typescript ?? dependencies?.typescript;
            if (typeof version !== "string") {
                continue;
            }
            versionFromApp = version;
            break;
        }
        catch {
        }
    }
    if (!versionFromApp) {
        tscVersion = null;
        return undefined;
    }
    let versionFromNodeModules;
    for (const nodeModulesParentDir of nodeModulesParentDirs) {
        try {
            const tsPackageJsonPath = join(nodeModulesParentDir, TS_PACKAGE_JSON);
            const packageJson = await readFile(tsPackageJsonPath, "utf-8");
            const { version } = JSON.parse(packageJson);
            const sanitizedVersion = getSanitizedTypeScriptVersion(version);
            if (typeof sanitizedVersion !== "string") {
                continue;
            }
            versionFromNodeModules = sanitizedVersion;
            break;
        }
        catch {
        }
    }
    if (versionFromNodeModules) {
        tscVersion = versionFromNodeModules;
        return ["md/tsc", tscVersion];
    }
    const sanitizedVersion = getSanitizedDevTypeScriptVersion(versionFromApp);
    if (typeof sanitizedVersion !== "string") {
        tscVersion = null;
        return undefined;
    }
    tscVersion = `dev_${sanitizedVersion}`;
    return ["md/tsc", tscVersion];
};
