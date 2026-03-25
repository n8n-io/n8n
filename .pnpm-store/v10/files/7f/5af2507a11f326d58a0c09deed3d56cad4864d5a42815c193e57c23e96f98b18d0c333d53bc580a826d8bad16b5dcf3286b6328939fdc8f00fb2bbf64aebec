"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubprocessTerminator = void 0;
const process_1 = __importDefault(require("process"));
const Executable_1 = require("./Executable");
/**
 * When a child process is created, registering it with the SubprocessTerminator will ensure
 * that the child gets terminated when the current process terminates.
 *
 * @remarks
 * This works by hooking the current process's events for SIGTERM/SIGINT/exit, and ensuring the
 * child process gets terminated in those cases.
 *
 * SubprocessTerminator doesn't do anything on Windows, since by default Windows automatically
 * terminates child processes when their parent is terminated.
 *
 * @beta
 */
class SubprocessTerminator {
    /**
     * Registers a child process so that it will be terminated automatically if the current process
     * is terminated.
     */
    static killProcessTreeOnExit(subprocess, subprocessOptions) {
        if (typeof subprocess.exitCode === 'number') {
            // Process has already been killed
            return;
        }
        SubprocessTerminator._validateSubprocessOptions(subprocessOptions);
        SubprocessTerminator._ensureInitialized();
        // Closure variable
        const pid = subprocess.pid;
        if (pid === undefined) {
            // The process failed to spawn.
            return;
        }
        subprocess.on('close', (exitCode, signal) => {
            if (SubprocessTerminator._subprocessesByPid.delete(pid)) {
                SubprocessTerminator._logDebug(`untracking #${pid}`);
            }
        });
        SubprocessTerminator._subprocessesByPid.set(pid, {
            subprocess,
            subprocessOptions
        });
        SubprocessTerminator._logDebug(`tracking #${pid}`);
    }
    /**
     * Terminate the child process and all of its children.
     */
    static killProcessTree(subprocess, subprocessOptions) {
        const pid = subprocess.pid;
        if (pid === undefined) {
            // The process failed to spawn.
            return;
        }
        // Don't attempt to kill the same process twice
        if (SubprocessTerminator._subprocessesByPid.delete(pid)) {
            SubprocessTerminator._logDebug(`untracking #${pid} via killProcessTree()`);
        }
        SubprocessTerminator._validateSubprocessOptions(subprocessOptions);
        if (typeof subprocess.exitCode === 'number') {
            // Process has already been killed
            return;
        }
        SubprocessTerminator._logDebug(`terminating #${pid}`);
        if (SubprocessTerminator._isWindows) {
            // On Windows we have a problem that CMD.exe launches child processes, but when CMD.exe is killed
            // the child processes may continue running.  Also if we send signals to CMD.exe the child processes
            // will not receive them.  The safest solution is not to attempt a graceful shutdown, but simply
            // kill the entire process tree.
            const result = Executable_1.Executable.spawnSync('TaskKill.exe', [
                '/T', // "Terminates the specified process and any child processes which were started by it."
                '/F', // Without this, TaskKill will try to use WM_CLOSE which doesn't work with CLI tools
                '/PID',
                pid.toString()
            ]);
            if (result.status) {
                const output = result.output.join('\n');
                // Nonzero exit code
                if (output.indexOf('not found') >= 0) {
                    // The PID does not exist
                }
                else {
                    // Another error occurred, for example TaskKill.exe does not support
                    // the expected CLI syntax
                    throw new Error(`TaskKill.exe returned exit code ${result.status}:\n` + output + '\n');
                }
            }
        }
        else {
            // Passing a negative PID terminates the entire group instead of just the one process
            process_1.default.kill(-pid, 'SIGKILL');
        }
    }
    // Install the hooks
    static _ensureInitialized() {
        if (!SubprocessTerminator._initialized) {
            SubprocessTerminator._initialized = true;
            SubprocessTerminator._logDebug('initialize');
            process_1.default.prependListener('SIGTERM', SubprocessTerminator._onTerminateSignal);
            process_1.default.prependListener('SIGINT', SubprocessTerminator._onTerminateSignal);
            process_1.default.prependListener('exit', SubprocessTerminator._onExit);
        }
    }
    // Uninstall the hooks and perform cleanup
    static _cleanupChildProcesses() {
        if (SubprocessTerminator._initialized) {
            SubprocessTerminator._initialized = false;
            process_1.default.removeListener('SIGTERM', SubprocessTerminator._onTerminateSignal);
            process_1.default.removeListener('SIGINT', SubprocessTerminator._onTerminateSignal);
            const trackedSubprocesses = Array.from(SubprocessTerminator._subprocessesByPid.values());
            let firstError = undefined;
            for (const trackedSubprocess of trackedSubprocesses) {
                try {
                    SubprocessTerminator.killProcessTree(trackedSubprocess.subprocess, { detached: true });
                }
                catch (error) {
                    if (firstError === undefined) {
                        firstError = error;
                    }
                }
            }
            if (firstError !== undefined) {
                // This is generally an unexpected error such as the TaskKill.exe command not being found,
                // not a trivial issue such as a nonexistent PID.   Since this occurs during process shutdown,
                // we should not interfere with control flow by throwing an exception  or calling process.exit().
                // So simply write to STDERR and ensure our exit code indicates the problem.
                // eslint-disable-next-line no-console
                console.error('\nAn unexpected error was encountered while attempting to clean up child processes:');
                // eslint-disable-next-line no-console
                console.error(firstError.toString());
                if (!process_1.default.exitCode) {
                    process_1.default.exitCode = 1;
                }
            }
        }
    }
    static _validateSubprocessOptions(subprocessOptions) {
        if (!SubprocessTerminator._isWindows) {
            if (!subprocessOptions.detached) {
                // Setting detached=true is what creates the process group that we use to kill the children
                throw new Error('killProcessTree() requires detached=true on this operating system');
            }
        }
    }
    static _onExit(exitCode) {
        SubprocessTerminator._logDebug(`received exit(${exitCode})`);
        SubprocessTerminator._cleanupChildProcesses();
        SubprocessTerminator._logDebug(`finished exit()`);
    }
    static _onTerminateSignal(signal) {
        SubprocessTerminator._logDebug(`received signal ${signal}`);
        SubprocessTerminator._cleanupChildProcesses();
        // When a listener is added to SIGTERM, Node.js strangely provides no way to reference
        // the original handler.  But we can invoke it by removing our listener and then resending
        // the signal to our own process.
        SubprocessTerminator._logDebug(`relaying ${signal}`);
        process_1.default.kill(process_1.default.pid, signal);
    }
    // For debugging
    static _logDebug(message) {
        //const logLine: string = `SubprocessTerminator: [${process.pid}] ${message}`;
        // fs.writeFileSync('trace.log', logLine + '\n', { flag: 'a' });
        //console.log(logLine);
    }
}
exports.SubprocessTerminator = SubprocessTerminator;
/**
 * Whether the hooks are installed
 */
SubprocessTerminator._initialized = false;
/**
 * The list of registered child processes.  Processes are removed from this set if they
 * terminate on their own.
 */
SubprocessTerminator._subprocessesByPid = new Map();
SubprocessTerminator._isWindows = process_1.default.platform === 'win32';
/**
 * The recommended options when creating a child process.
 */
SubprocessTerminator.RECOMMENDED_OPTIONS = {
    detached: process_1.default.platform !== 'win32'
};
//# sourceMappingURL=SubprocessTerminator.js.map