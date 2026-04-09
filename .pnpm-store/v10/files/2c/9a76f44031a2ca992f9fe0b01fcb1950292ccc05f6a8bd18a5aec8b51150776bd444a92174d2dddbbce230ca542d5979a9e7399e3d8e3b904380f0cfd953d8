"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const cross_spawn_1 = __importDefault(require("cross-spawn"));
const string_argv_1 = __importDefault(require("string-argv"));
const killer_1 = require("./killer");
function runCommand(fullCommand) {
    const parts = (0, string_argv_1.default)(fullCommand);
    const exec = parts[0];
    const args = parts.splice(1);
    return (0, cross_spawn_1.default)(exec, args, {
        stdio: 'inherit',
    });
}
function run(command) {
    const process = runCommand(command);
    const exitPromise = new Promise((resolve) => process.on('exit', resolve));
    return () => Promise.all([(0, killer_1.kill)(process), exitPromise]);
}
