"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A postinstall script runs after `@swc/core` is installed.
 *
 * It checks if corresponding optional dependencies for native binary is installed and can be loaded properly.
 * If it fails, it'll internally try to install `@swc/wasm` as fallback.
 */
const fs_1 = require("fs");
const assert = __importStar(require("assert"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
function removeRecursive(dir) {
    for (const entry of fs.readdirSync(dir)) {
        const entryPath = path.join(dir, entry);
        let stats;
        try {
            stats = fs.lstatSync(entryPath);
        }
        catch (_a) {
            continue; // Guard against https://github.com/nodejs/node/issues/4760
        }
        if (stats.isDirectory())
            removeRecursive(entryPath);
        else
            fs.unlinkSync(entryPath);
    }
    fs.rmdirSync(dir);
}
/**
 * Trying to validate @swc/core's native binary installation, then installs if it is not supported.
 */
const validateBinary = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name } = require(path.resolve(process.env.INIT_CWD, "package.json"));
        if (name === "@swc/core" || name === "@swc/workspace") {
            return;
        }
    }
    catch (_) {
        return;
    }
    // TODO: We do not take care of the case if user try to install with `--no-optional`.
    // For now, it is considered as deliberate decision.
    let binding;
    try {
        binding = require("./binding.js");
        // Check if binding binary actually works.
        // For the latest version, checks target triple. If it's old version doesn't have target triple, use parseSync instead.
        const triple = binding.getTargetTriple
            ? binding.getTargetTriple()
            : binding.parseSync("console.log()", Buffer.from(JSON.stringify({ syntax: "ecmascript" })));
        assert.ok(triple, "Failed to read target triple from native binary.");
    }
    catch (error) {
        // if error is unsupported architecture, ignore to display.
        if (!((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("Unsupported architecture"))) {
            console.warn(error);
        }
        console.warn(`@swc/core was not able to resolve native bindings installation. It'll try to use @swc/wasm as fallback instead.`);
    }
    if (!!binding) {
        return;
    }
    // User choose to override the binary installation. Skip remanining validation.
    if (!!process.env["SWC_BINARY_PATH"]) {
        console.warn(`@swc/core could not resolve native bindings installation, but found manual override config SWC_BINARY_PATH specified. Skipping remaning validation.`);
        return;
    }
    // Check if top-level package.json installs @swc/wasm separately already
    let wasmBinding;
    try {
        wasmBinding = require.resolve(`@swc/wasm`);
    }
    catch (_) { }
    if (!!wasmBinding && (0, fs_1.existsSync)(wasmBinding)) {
        return;
    }
    const env = Object.assign(Object.assign({}, process.env), { npm_config_global: undefined });
    const { version } = require(path.join(path.dirname(require.resolve("@swc/core")), "package.json"));
    // We want to place @swc/wasm next to the @swc/core as if normal installation was done,
    // but can't directly set cwd to INIT_CWD as npm seems to acquire lock to the working dir.
    // Instead, create a temporary inner and move it out.
    const coreDir = path.dirname(require.resolve("@swc/core"));
    const installDir = path.join(coreDir, "npm-install");
    try {
        fs.mkdirSync(installDir);
        fs.writeFileSync(path.join(installDir, "package.json"), "{}");
        // Instead of carrying over own dependencies to download & resolve package which increases installation sizes of `@swc/core`,
        // assume & relies on system's npm installation.
        child_process.execSync(`npm install --no-save --loglevel=error --prefer-offline --no-audit --progress=false @swc/wasm@${version}`, { cwd: installDir, stdio: "pipe", env });
        const installedBinPath = path.join(installDir, "node_modules", `@swc/wasm`);
        // INIT_CWD is injected via npm. If it doesn't exists, can't proceed.
        fs.renameSync(installedBinPath, path.resolve(process.env.INIT_CWD, "node_modules", `@swc/wasm`));
    }
    catch (error) {
        console.error(error);
        console.error(`Failed to install fallback @swc/wasm@${version}. @swc/core will not properly.
Please install @swc/wasm manually, or retry whole installation.
If there are unexpected errors, please report at https://github.com/swc-project/swc/issues`);
    }
    finally {
        try {
            removeRecursive(installDir);
        }
        catch (_) {
            // Gracefully ignore any failures. This'll make few leftover files but it shouldn't block installation.
        }
    }
});
validateBinary().catch((error) => {
    // for now just throw the error as-is.
    throw error;
});
