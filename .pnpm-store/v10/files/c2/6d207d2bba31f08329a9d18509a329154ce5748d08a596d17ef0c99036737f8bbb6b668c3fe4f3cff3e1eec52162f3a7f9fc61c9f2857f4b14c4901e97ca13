"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerThread = registerThread;
exports.threadPoll = threadPoll;
exports.captureStackTrace = captureStackTrace;
exports.getThreadsLastSeen = getThreadsLastSeen;
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_process_1 = require("node:process");
const node_worker_threads_1 = require("node:worker_threads");
const detect_libc_1 = require("detect-libc");
const node_abi_1 = require("node-abi");
const stdlib = (0, detect_libc_1.familySync)();
const platform = process.env['BUILD_PLATFORM'] || (0, node_os_1.platform)();
const arch = process.env['BUILD_ARCH'] || (0, node_os_1.arch)();
const abi = (0, node_abi_1.getAbi)(node_process_1.versions.node, 'node');
const identifier = [platform, arch, stdlib, abi].filter(c => c !== undefined && c !== null).join('-');
// eslint-disable-next-line complexity
function getNativeModule() {
    // If a binary path is specified, use that.
    if (node_process_1.env['SENTRY_STACK_TRACE_BINARY_PATH']) {
        const envPath = node_process_1.env['SENTRY_STACK_TRACE_BINARY_PATH'];
        return require(envPath);
    }
    // If a user specifies a different binary dir, they are in control of the binaries being moved there
    if (node_process_1.env['SENTRY_STACK_TRACE_BINARY_DIR']) {
        const binaryPath = (0, node_path_1.join)((0, node_path_1.resolve)(node_process_1.env['SENTRY_STACK_TRACE_BINARY_DIR']), `stack-trace-${identifier}.node`);
        return require(binaryPath);
    }
    if (process.versions.electron) {
        try {
            return require('../build/Release/stack-trace.node');
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.warn('The \'@sentry-internal/node-native-stacktrace\' binary could not be found. Use \'@electron/rebuild\' to ensure the native module is built for Electron.');
            throw e;
        }
    }
    // We need the fallthrough so that in the end, we can fallback to the dynamic require.
    // This is for cases where precompiled binaries were not provided, but may have been compiled from source.
    if (platform === 'darwin') {
        if (arch === 'x64') {
            if (abi === '108') {
                return require('./stack-trace-darwin-x64-108.node');
            }
            if (abi === '115') {
                return require('./stack-trace-darwin-x64-115.node');
            }
            if (abi === '127') {
                return require('./stack-trace-darwin-x64-127.node');
            }
            if (abi === '137') {
                return require('./stack-trace-darwin-x64-137.node');
            }
        }
        if (arch === 'arm64') {
            if (abi === '108') {
                return require('./stack-trace-darwin-arm64-108.node');
            }
            if (abi === '115') {
                return require('./stack-trace-darwin-arm64-115.node');
            }
            if (abi === '127') {
                return require('./stack-trace-darwin-arm64-127.node');
            }
            if (abi === '137') {
                return require('./stack-trace-darwin-arm64-137.node');
            }
        }
    }
    if (platform === 'win32') {
        if (arch === 'x64') {
            if (abi === '108') {
                return require('./stack-trace-win32-x64-108.node');
            }
            if (abi === '115') {
                return require('./stack-trace-win32-x64-115.node');
            }
            if (abi === '127') {
                return require('./stack-trace-win32-x64-127.node');
            }
            if (abi === '137') {
                return require('./stack-trace-win32-x64-137.node');
            }
        }
    }
    if (platform === 'linux') {
        if (arch === 'x64') {
            if (stdlib === 'musl') {
                if (abi === '108') {
                    return require('./stack-trace-linux-x64-musl-108.node');
                }
                if (abi === '115') {
                    return require('./stack-trace-linux-x64-musl-115.node');
                }
                if (abi === '127') {
                    return require('./stack-trace-linux-x64-musl-127.node');
                }
                if (abi === '137') {
                    return require('./stack-trace-linux-x64-musl-137.node');
                }
            }
            if (stdlib === 'glibc') {
                if (abi === '108') {
                    return require('./stack-trace-linux-x64-glibc-108.node');
                }
                if (abi === '115') {
                    return require('./stack-trace-linux-x64-glibc-115.node');
                }
                if (abi === '127') {
                    return require('./stack-trace-linux-x64-glibc-127.node');
                }
                if (abi === '137') {
                    return require('./stack-trace-linux-x64-glibc-137.node');
                }
            }
        }
        if (arch === 'arm64') {
            if (stdlib === 'musl') {
                if (abi === '108') {
                    return require('./stack-trace-linux-arm64-musl-108.node');
                }
                if (abi === '115') {
                    return require('./stack-trace-linux-arm64-musl-115.node');
                }
                if (abi === '127') {
                    return require('./stack-trace-linux-arm64-musl-127.node');
                }
                if (abi === '137') {
                    return require('./stack-trace-linux-arm64-musl-137.node');
                }
            }
            if (stdlib === 'glibc') {
                if (abi === '108') {
                    return require('./stack-trace-linux-arm64-glibc-108.node');
                }
                if (abi === '115') {
                    return require('./stack-trace-linux-arm64-glibc-115.node');
                }
                if (abi === '127') {
                    return require('./stack-trace-linux-arm64-glibc-127.node');
                }
                if (abi === '137') {
                    return require('./stack-trace-linux-arm64-glibc-137.node');
                }
            }
        }
    }
    return require(`./stack-trace-${identifier}.node`);
}
const native = getNativeModule();
/**
 * Registers the current thread with the native module.
 *
 * This should be called on every thread that you want to capture stack traces from.
 *
 * @param storageOrThreadName Either the name of the thread, or an object containing an AsyncLocalStorage instance and optional storage key.
 * @param threadName The name of the thread, if the first argument is an object.
 *
 * threadName defaults to the `threadId` if not provided.
 */
function registerThread(storageOrThreadName, threadName) {
    if (typeof storageOrThreadName === 'object') {
        native.registerThread(storageOrThreadName, threadName || String(node_worker_threads_1.threadId));
    }
    else {
        native.registerThread(storageOrThreadName || String(node_worker_threads_1.threadId));
    }
}
/**
 * Tells the native module that the thread is still running and updates the state.
 *
 * @param enableLastSeen If true, enables the last seen tracking for this thread.
 */
function threadPoll(enableLastSeen = true, pollState) {
    native.threadPoll(enableLastSeen, pollState);
}
/**
 * Captures stack traces for all registered threads.
 */
function captureStackTrace() {
    return native.captureStackTrace();
}
/**
 * Returns the number of milliseconds since the last time each thread was seen.
 *
 * This is useful for determining if a threads event loop has been blocked for a long time.
 */
function getThreadsLastSeen() {
    return native.getThreadsLastSeen();
}
//# sourceMappingURL=index.js.map