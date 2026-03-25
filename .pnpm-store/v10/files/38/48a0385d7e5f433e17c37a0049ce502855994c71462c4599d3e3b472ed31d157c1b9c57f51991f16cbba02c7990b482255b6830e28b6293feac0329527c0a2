"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callInChild = void 0;
const child_process_1 = require("child_process");
const url_1 = require("url");
const util_1 = require("../util");
const argv_payload_1 = require("./argv-payload");
/**
 * @internal
 * @param state Bootstrap state to be transferred into the child process.
 * @param targetCwd Working directory to be preserved when transitioning to
 *   the child process.
 */
function callInChild(state) {
    if (!(0, util_1.versionGteLt)(process.versions.node, '12.17.0')) {
        throw new Error('`ts-node-esm` and `ts-node --esm` require node version 12.17.0 or newer.');
    }
    const child = (0, child_process_1.spawn)(process.execPath, [
        '--require',
        require.resolve('./child-require.js'),
        '--loader',
        // Node on Windows doesn't like `c:\` absolute paths here; must be `file:///c:/`
        (0, url_1.pathToFileURL)(require.resolve('../../child-loader.mjs')).toString(),
        require.resolve('./child-entrypoint.js'),
        `${argv_payload_1.argPrefix}${(0, argv_payload_1.compress)(state)}`,
        ...state.parseArgvResult.restArgs,
    ], {
        stdio: 'inherit',
        argv0: process.argv0,
    });
    child.on('error', (error) => {
        console.error(error);
        process.exit(1);
    });
    child.on('exit', (code) => {
        child.removeAllListeners();
        process.off('SIGINT', sendSignalToChild);
        process.off('SIGTERM', sendSignalToChild);
        process.exitCode = code === null ? 1 : code;
    });
    // Ignore sigint and sigterm in parent; pass them to child
    process.on('SIGINT', sendSignalToChild);
    process.on('SIGTERM', sendSignalToChild);
    function sendSignalToChild(signal) {
        process.kill(child.pid, signal);
    }
}
exports.callInChild = callInChild;
//# sourceMappingURL=spawn-child.js.map