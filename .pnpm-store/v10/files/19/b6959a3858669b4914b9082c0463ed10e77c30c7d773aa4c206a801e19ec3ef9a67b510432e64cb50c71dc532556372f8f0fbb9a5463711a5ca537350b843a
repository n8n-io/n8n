import { EventEmitter } from 'eventemitter3';
import { ErrnoError } from '../internal/error.js';
import { isStatsEqual } from '../stats.js';
import { normalizePath } from '../utils.js';
import { basename, dirname, join, relative } from './path.js';
import { statSync } from './sync.js';
/**
 * Base class for file system watchers.
 * Provides event handling capabilities for watching file system changes.
 *
 * @template TEvents The type of events emitted by the watcher.
 */
class Watcher extends EventEmitter {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    off(event, fn, context, once) {
        return super.off(event, fn, context, once);
    }
    removeListener(event, fn, context, once) {
        return super.removeListener(event, fn, context, once);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    constructor(
    /**
     * @internal
     */
    _context, path) {
        super();
        this._context = _context;
        this.path = path;
    }
    setMaxListeners() {
        throw ErrnoError.With('ENOSYS', this.path, 'Watcher.setMaxListeners');
    }
    getMaxListeners() {
        throw ErrnoError.With('ENOSYS', this.path, 'Watcher.getMaxListeners');
    }
    prependListener() {
        throw ErrnoError.With('ENOSYS', this.path, 'Watcher.prependListener');
    }
    prependOnceListener() {
        throw ErrnoError.With('ENOSYS', this.path, 'Watcher.prependOnceListener');
    }
    rawListeners() {
        throw ErrnoError.With('ENOSYS', this.path, 'Watcher.rawListeners');
    }
    ref() {
        return this;
    }
    unref() {
        return this;
    }
}
/**
 * Watches for changes on the file system.
 *
 * @template T The type of the filename, either `string` or `Buffer`.
 */
export class FSWatcher extends Watcher {
    constructor(context, path, options) {
        super(context, path);
        this.options = options;
        this.realpath = (context === null || context === void 0 ? void 0 : context.root) ? join(context.root, path) : path;
        addWatcher(this.realpath, this);
    }
    close() {
        super.emit('close');
        removeWatcher(this.realpath, this);
    }
    [Symbol.dispose]() {
        this.close();
    }
}
/**
 * Watches for changes to a file's stats.
 *
 * Instances of `StatWatcher` are used by `fs.watchFile()` to monitor changes to a file's statistics.
 */
export class StatWatcher extends Watcher {
    constructor(context, path, options) {
        super(context, path);
        this.options = options;
        this.start();
    }
    onInterval() {
        try {
            const current = statSync(this.path);
            if (!isStatsEqual(this.previous, current)) {
                this.emit('change', current, this.previous);
                this.previous = current;
            }
        }
        catch (e) {
            this.emit('error', e);
        }
    }
    start() {
        const interval = this.options.interval || 5000;
        try {
            this.previous = statSync(this.path);
        }
        catch (e) {
            this.emit('error', e);
            return;
        }
        this.intervalId = setInterval(this.onInterval.bind(this), interval);
        if (!this.options.persistent && typeof this.intervalId == 'object') {
            this.intervalId.unref();
        }
    }
    /**
     * @internal
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.removeAllListeners();
    }
}
const watchers = new Map();
export function addWatcher(path, watcher) {
    const normalizedPath = normalizePath(path);
    if (!watchers.has(normalizedPath)) {
        watchers.set(normalizedPath, new Set());
    }
    watchers.get(normalizedPath).add(watcher);
}
export function removeWatcher(path, watcher) {
    const normalizedPath = normalizePath(path);
    if (watchers.has(normalizedPath)) {
        watchers.get(normalizedPath).delete(watcher);
        if (watchers.get(normalizedPath).size === 0) {
            watchers.delete(normalizedPath);
        }
    }
}
/**
 * @internal @hidden
 */
export function emitChange(context, eventType, filename) {
    var _a;
    if (context)
        filename = join((_a = context.root) !== null && _a !== void 0 ? _a : '/', filename);
    filename = normalizePath(filename);
    // Notify watchers, including ones on parent directories if they are watching recursively
    for (let path = filename; path != '/'; path = dirname(path)) {
        const watchersForPath = watchers.get(path);
        if (!watchersForPath)
            continue;
        for (const watcher of watchersForPath) {
            watcher.emit('change', eventType, relative(path, filename) || basename(filename));
        }
    }
}
