"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpawnOpts = void 0;
const supports_color_1 = __importDefault(require("supports-color"));
const getSpawnOpts = ({ colorSupport = supports_color_1.default.stdout, cwd, process = global.process, raw = false, env = {}, }) => ({
    cwd: cwd || process.cwd(),
    ...(raw && { stdio: 'inherit' }),
    ...(/^win/.test(process.platform) && { detached: false }),
    env: {
        ...(colorSupport ? { FORCE_COLOR: colorSupport.level.toString() } : {}),
        ...process.env,
        ...env,
    },
});
exports.getSpawnOpts = getSpawnOpts;
