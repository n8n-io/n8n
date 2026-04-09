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
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = exports.currentTarget = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function currentTarget() {
    let os = null;
    switch (process.platform) {
        case 'android':
            switch (process.arch) {
                case 'arm':
                    return 'android-arm-eabi';
                case 'arm64':
                    return 'android-arm64';
            }
            os = 'Android';
            break;
        case 'win32':
            switch (process.arch) {
                case 'x64':
                    return 'win32-x64-msvc';
                case 'arm64':
                    return 'win32-arm64-msvc';
                case 'ia32':
                    return 'win32-ia32-msvc';
            }
            os = 'Windows';
            break;
        case 'darwin':
            switch (process.arch) {
                case 'x64':
                    return 'darwin-x64';
                case 'arm64':
                    return 'darwin-arm64';
            }
            os = 'macOS';
            break;
        case 'linux':
            switch (process.arch) {
                case 'x64':
                case 'arm64':
                    return isGlibc()
                        ? `linux-${process.arch}-gnu`
                        : `linux-${process.arch}-musl`;
                case 'arm':
                    return 'linux-arm-gnueabihf';
            }
            os = 'Linux';
            break;
        case 'freebsd':
            if (process.arch === 'x64') {
                return 'freebsd-x64';
            }
            os = 'FreeBSD';
            break;
    }
    if (os) {
        throw new Error(`Neon: unsupported ${os} architecture: ${process.arch}`);
    }
    throw new Error(`Neon: unsupported system: ${process.platform}`);
}
exports.currentTarget = currentTarget;
function isGlibc() {
    // Cast to unknown to work around a bug in the type definition:
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/40140
    const report = process.report?.getReport();
    if ((typeof report !== 'object') || !report || (!('header' in report))) {
        return false;
    }
    const header = report.header;
    return (typeof header === 'object') &&
        !!header &&
        ('glibcVersionRuntime' in header);
}
function load(dirname) {
    const m = path.join(dirname, "index.node");
    return fs.existsSync(m) ? require(m) : null;
}
exports.load = load;
