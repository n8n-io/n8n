"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewProject = void 0;
const path = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const constants_1 = require("./constants");
const platform_1 = require("../../utils/platform");
const previewProject = async ({ argv }) => {
    const { plan, port } = argv;
    const projectDir = argv['project-dir'];
    const product = argv.product || tryGetProductFromPackageJson(projectDir);
    if (!isValidProduct(product)) {
        process.stderr.write(`Invalid product ${product}.`);
        throw new Error(`Project preview launch failed.`);
    }
    const productName = constants_1.PRODUCT_NAMES[product];
    const packageName = constants_1.PRODUCT_PACKAGES[product];
    process.stdout.write(`\nLaunching preview of ${productName} ${plan} using NPX.\n\n`);
    const { npxExecutableName, shell } = (0, platform_1.getPlatformSpawnArgs)();
    const child = (0, child_process_1.spawn)(npxExecutableName, ['-y', packageName, 'preview', `--plan=${plan}`, `--port=${port || 4000}`], {
        stdio: 'inherit',
        cwd: projectDir,
        shell,
    });
    child.on('error', (error) => {
        process.stderr.write(`Project preview launch failed: ${error.message}`);
        throw new Error(`Project preview launch failed.`);
    });
};
exports.previewProject = previewProject;
const isValidProduct = (product) => {
    if (!product) {
        return false;
    }
    return !!constants_1.PRODUCT_NAMES[product];
};
const tryGetProductFromPackageJson = (projectDir) => {
    const packageJsonPath = path.join(process.cwd(), projectDir, 'package.json');
    if ((0, fs_1.existsSync)(packageJsonPath)) {
        try {
            const packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, 'utf-8'));
            const packageJsonDeps = packageJson.dependencies || {};
            for (const [product, packageName] of Object.entries(constants_1.PRODUCT_PACKAGES)) {
                if (packageJsonDeps[packageName]) {
                    process.stdout.write(`\n${packageName} detected in project's 'package.json'`);
                    return product;
                }
            }
        }
        catch (error) {
            process.stdout.write(`Invalid 'package.json': ${packageJsonPath}. Using Realm.`);
        }
    }
    return 'realm';
};
