import { spawn as nodeSpawn, } from 'child_process';
import crossSpawn from 'cross-spawn';
import { onExit } from 'signal-exit';
import { proxySignals } from './proxy-signals.js';
import { watchdog } from './watchdog.js';
/* c8 ignore start */
const spawn = process?.platform === 'win32' ? crossSpawn : nodeSpawn;
/**
 * Normalizes the arguments passed to `foregroundChild`.
 *
 * Exposed for testing.
 *
 * @internal
 */
export const normalizeFgArgs = (fgArgs) => {
    let [program, args = [], spawnOpts = {}, cleanup = () => { }] = fgArgs;
    if (typeof args === 'function') {
        cleanup = args;
        spawnOpts = {};
        args = [];
    }
    else if (!!args && typeof args === 'object' && !Array.isArray(args)) {
        if (typeof spawnOpts === 'function')
            cleanup = spawnOpts;
        spawnOpts = args;
        args = [];
    }
    else if (typeof spawnOpts === 'function') {
        cleanup = spawnOpts;
        spawnOpts = {};
    }
    if (Array.isArray(program)) {
        const [pp, ...pa] = program;
        program = pp;
        args = pa;
    }
    return [program, args, { ...spawnOpts }, cleanup];
};
export function foregroundChild(...fgArgs) {
    const [program, args, spawnOpts, cleanup] = normalizeFgArgs(fgArgs);
    spawnOpts.stdio = [0, 1, 2];
    if (process.send) {
        spawnOpts.stdio.push('ipc');
    }
    const child = spawn(program, args, spawnOpts);
    const childHangup = () => {
        try {
            child.kill('SIGHUP');
            /* c8 ignore start */
        }
        catch (_) {
            // SIGHUP is weird on windows
            child.kill('SIGTERM');
        }
        /* c8 ignore stop */
    };
    const removeOnExit = onExit(childHangup);
    proxySignals(child);
    const dog = watchdog(child);
    let done = false;
    child.on('close', async (code, signal) => {
        /* c8 ignore start */
        if (done)
            return;
        /* c8 ignore stop */
        done = true;
        const result = cleanup(code, signal, {
            watchdogPid: dog.pid,
        });
        const res = isPromise(result) ? await result : result;
        removeOnExit();
        if (res === false)
            return;
        else if (typeof res === 'string') {
            signal = res;
            code = null;
        }
        else if (typeof res === 'number') {
            code = res;
            signal = null;
        }
        if (signal) {
            // If there is nothing else keeping the event loop alive,
            // then there's a race between a graceful exit and getting
            // the signal to this process.  Put this timeout here to
            // make sure we're still alive to get the signal, and thus
            // exit with the intended signal code.
            /* istanbul ignore next */
            setTimeout(() => { }, 2000);
            try {
                process.kill(process.pid, signal);
                /* c8 ignore start */
            }
            catch (_) {
                process.kill(process.pid, 'SIGTERM');
            }
            /* c8 ignore stop */
        }
        else {
            process.exit(code || 0);
        }
    });
    if (process.send) {
        process.removeAllListeners('message');
        child.on('message', (message, sendHandle) => {
            process.send?.(message, sendHandle);
        });
        process.on('message', (message, sendHandle) => {
            child.send(message, sendHandle);
        });
    }
    return child;
}
const isPromise = (o) => !!o && typeof o === 'object' && typeof o.then === 'function';
//# sourceMappingURL=index.js.map