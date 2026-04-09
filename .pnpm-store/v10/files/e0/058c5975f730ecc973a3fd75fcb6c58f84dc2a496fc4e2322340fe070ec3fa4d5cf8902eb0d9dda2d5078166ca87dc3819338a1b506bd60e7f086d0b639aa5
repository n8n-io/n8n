import { Errno, ErrnoError } from '../../internal/error.js';
import { LazyFile } from '../../internal/file.js';
import { err, info } from '../../internal/log.js';
import { Stats } from '../../stats.js';
import { handleRequest } from './fs.js';
function isFileData(value) {
    return typeof value == 'object' && value != null && 'path' in value && 'flag' in value;
}
// general types
export function isMessage(arg) {
    return typeof arg == 'object' && arg != null && '_zenfs' in arg && !!arg._zenfs;
}
const executors = new Map();
export function request(request, { port, timeout = 1000, fs } = {}) {
    const stack = '\n' + new Error().stack.slice('Error:'.length);
    if (!port)
        throw err(new ErrnoError(Errno.EINVAL, 'Can not make an RPC request without a port'));
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(16).slice(10);
        executors.set(id, { resolve, reject, fs });
        port.postMessage({ ...request, _zenfs: true, id, stack });
        const _ = setTimeout(() => {
            const error = err(new ErrnoError(Errno.EIO, 'RPC Failed', typeof request.args[0] == 'string' ? request.args[0] : '', request.method), {
                fs,
            });
            error.stack += stack;
            reject(error);
            if (typeof _ == 'object')
                _.unref();
        }, timeout);
    });
}
export function handleResponse(response) {
    if (!isMessage(response)) {
        return;
    }
    const { id, value, error, stack } = response;
    if (!executors.has(id)) {
        const error = err(new ErrnoError(Errno.EIO, 'Invalid RPC id:' + id));
        error.stack += stack;
        throw error;
    }
    const { resolve, reject, fs } = executors.get(id);
    if (error) {
        const e = ErrnoError.fromJSON({ code: 'EIO', errno: Errno.EIO, ...value });
        e.stack += stack;
        reject(e);
        executors.delete(id);
        return;
    }
    if (isFileData(value)) {
        const { path, flag, stats } = value;
        const file = new LazyFile(fs, path, flag, new Stats(stats));
        resolve(file);
        executors.delete(id);
        return;
    }
    resolve(value);
    executors.delete(id);
    return;
}
export function attach(port, handler) {
    if (!port)
        throw err(new ErrnoError(Errno.EINVAL, 'Cannot attach to non-existent port'));
    info('Attached handler to port: ' + handler.name);
    port['on' in port ? 'on' : 'addEventListener']('message', (message) => {
        handler(typeof message == 'object' && message !== null && 'data' in message ? message.data : message);
    });
}
export function detach(port, handler) {
    if (!port)
        throw err(new ErrnoError(Errno.EINVAL, 'Cannot detach from non-existent port'));
    info('Detached handler from port: ' + handler.name);
    port['off' in port ? 'off' : 'removeEventListener']('message', (message) => {
        handler(typeof message == 'object' && message !== null && 'data' in message ? message.data : message);
    });
}
export function catchMessages(port) {
    const events = [];
    const handler = events.push.bind(events);
    attach(port, handler);
    return async function (fs) {
        detach(port, handler);
        for (const event of events) {
            const request = 'data' in event ? event.data : event;
            await handleRequest(port, fs, request);
        }
    };
}
/**
 * @internal
 */
export async function waitOnline(port) {
    if (!('on' in port))
        return; // Only need to wait in Node.js
    const online = Promise.withResolvers();
    setTimeout(online.reject, 500);
    port.on('online', online.resolve);
    await online.promise;
}
