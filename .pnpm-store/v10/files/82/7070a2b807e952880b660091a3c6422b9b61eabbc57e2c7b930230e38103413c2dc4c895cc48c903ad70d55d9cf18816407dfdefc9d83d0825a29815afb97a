/*
  @license
	Rollup.js v2.80.0
	Sun, 22 Feb 2026 06:16:40 GMT - commit d17ae15336a45c3c59b2a4aacac2b14186035d28

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const require$$0 = require('path');
const process = require('process');
const rollup = require('./rollup.js');
const mergeOptions = require('./mergeOptions.js');
const require$$2 = require('os');
const index = require('./index.js');
require('perf_hooks');
require('crypto');
require('fs');
require('events');
require('util');
require('stream');

class FileWatcher {
    constructor(task, chokidarOptions) {
        this.transformWatchers = new Map();
        this.chokidarOptions = chokidarOptions;
        this.task = task;
        this.watcher = this.createWatcher(null);
    }
    close() {
        this.watcher.close();
        for (const watcher of this.transformWatchers.values()) {
            watcher.close();
        }
    }
    unwatch(id) {
        this.watcher.unwatch(id);
        const transformWatcher = this.transformWatchers.get(id);
        if (transformWatcher) {
            this.transformWatchers.delete(id);
            transformWatcher.close();
        }
    }
    watch(id, isTransformDependency) {
        var _a;
        if (isTransformDependency) {
            const watcher = (_a = this.transformWatchers.get(id)) !== null && _a !== void 0 ? _a : this.createWatcher(id);
            watcher.add(id);
            this.transformWatchers.set(id, watcher);
        }
        else {
            this.watcher.add(id);
        }
    }
    createWatcher(transformWatcherId) {
        const task = this.task;
        const isLinux = require$$2.platform() === 'linux';
        const isTransformDependency = transformWatcherId !== null;
        const handleChange = (id, event) => {
            const changedId = transformWatcherId || id;
            if (isLinux) {
                // unwatching and watching fixes an issue with chokidar where on certain systems,
                // a file that was unlinked and immediately recreated would create a change event
                // but then no longer any further events
                watcher.unwatch(changedId);
                watcher.add(changedId);
            }
            task.invalidate(changedId, { event, isTransformDependency });
        };
        const watcher = index.chokidar
            .watch([], this.chokidarOptions)
            .on('add', id => handleChange(id, 'create'))
            .on('change', id => handleChange(id, 'update'))
            .on('unlink', id => handleChange(id, 'delete'));
        return watcher;
    }
}

const eventsRewrites = {
    create: {
        create: 'buggy',
        delete: null,
        update: 'create'
    },
    delete: {
        create: 'update',
        delete: 'buggy',
        update: 'buggy'
    },
    update: {
        create: 'buggy',
        delete: 'delete',
        update: 'update'
    }
};
class Watcher {
    constructor(configs, emitter) {
        this.buildDelay = 0;
        this.buildTimeout = null;
        this.invalidatedIds = new Map();
        this.rerun = false;
        this.running = true;
        this.emitter = emitter;
        emitter.close = this.close.bind(this);
        this.tasks = configs.map(config => new Task(this, config));
        this.buildDelay = configs.reduce((buildDelay, { watch }) => watch && typeof watch.buildDelay === 'number'
            ? Math.max(buildDelay, watch.buildDelay)
            : buildDelay, this.buildDelay);
        process.nextTick(() => this.run());
    }
    async close() {
        if (this.buildTimeout)
            clearTimeout(this.buildTimeout);
        for (const task of this.tasks) {
            task.close();
        }
        await this.emitter.emitAndAwait('close');
        this.emitter.removeAllListeners();
    }
    invalidate(file) {
        if (file) {
            const prevEvent = this.invalidatedIds.get(file.id);
            const event = prevEvent ? eventsRewrites[prevEvent][file.event] : file.event;
            if (event === 'buggy') {
                //TODO: throws or warn? Currently just ignore, uses new event
                this.invalidatedIds.set(file.id, file.event);
            }
            else if (event === null) {
                this.invalidatedIds.delete(file.id);
            }
            else {
                this.invalidatedIds.set(file.id, event);
            }
        }
        if (this.running) {
            this.rerun = true;
            return;
        }
        if (this.buildTimeout)
            clearTimeout(this.buildTimeout);
        this.buildTimeout = setTimeout(async () => {
            this.buildTimeout = null;
            try {
                await Promise.all([...this.invalidatedIds].map(([id, event]) => this.emitter.emitAndAwait('change', id, { event })));
                this.invalidatedIds.clear();
                this.emitter.emit('restart');
                this.emitter.removeAwaited();
                this.run();
            }
            catch (error) {
                this.invalidatedIds.clear();
                this.emitter.emit('event', {
                    code: 'ERROR',
                    error,
                    result: null
                });
                this.emitter.emit('event', {
                    code: 'END'
                });
            }
        }, this.buildDelay);
    }
    async run() {
        this.running = true;
        this.emitter.emit('event', {
            code: 'START'
        });
        for (const task of this.tasks) {
            await task.run();
        }
        this.running = false;
        this.emitter.emit('event', {
            code: 'END'
        });
        if (this.rerun) {
            this.rerun = false;
            this.invalidate();
        }
    }
}
class Task {
    constructor(watcher, config) {
        this.cache = { modules: [] };
        this.watchFiles = [];
        this.closed = false;
        this.invalidated = true;
        this.watched = new Set();
        this.watcher = watcher;
        this.skipWrite = Boolean(config.watch && config.watch.skipWrite);
        this.options = mergeOptions.mergeOptions(config);
        this.outputs = this.options.output;
        this.outputFiles = this.outputs.map(output => {
            if (output.file || output.dir)
                return require$$0.resolve(output.file || output.dir);
            return undefined;
        });
        const watchOptions = this.options.watch || {};
        this.filter = rollup.createFilter(watchOptions.include, watchOptions.exclude);
        this.fileWatcher = new FileWatcher(this, {
            ...watchOptions.chokidar,
            disableGlobbing: true,
            ignoreInitial: true
        });
    }
    close() {
        this.closed = true;
        this.fileWatcher.close();
    }
    invalidate(id, details) {
        this.invalidated = true;
        if (details.isTransformDependency) {
            for (const module of this.cache.modules) {
                if (!module.transformDependencies.includes(id))
                    continue;
                // effective invalidation
                module.originalCode = null;
            }
        }
        this.watcher.invalidate({ event: details.event, id });
    }
    async run() {
        if (!this.invalidated)
            return;
        this.invalidated = false;
        const options = {
            ...this.options,
            cache: this.cache
        };
        const start = Date.now();
        this.watcher.emitter.emit('event', {
            code: 'BUNDLE_START',
            input: this.options.input,
            output: this.outputFiles
        });
        let result = null;
        try {
            result = await rollup.rollupInternal(options, this.watcher.emitter);
            if (this.closed) {
                return;
            }
            this.updateWatchedFiles(result);
            this.skipWrite || (await Promise.all(this.outputs.map(output => result.write(output))));
            this.watcher.emitter.emit('event', {
                code: 'BUNDLE_END',
                duration: Date.now() - start,
                input: this.options.input,
                output: this.outputFiles,
                result
            });
        }
        catch (error) {
            if (!this.closed) {
                if (Array.isArray(error.watchFiles)) {
                    for (const id of error.watchFiles) {
                        this.watchFile(id);
                    }
                }
                if (error.id) {
                    this.cache.modules = this.cache.modules.filter(module => module.id !== error.id);
                }
            }
            this.watcher.emitter.emit('event', {
                code: 'ERROR',
                error,
                result
            });
        }
    }
    updateWatchedFiles(result) {
        const previouslyWatched = this.watched;
        this.watched = new Set();
        this.watchFiles = result.watchFiles;
        this.cache = result.cache;
        for (const id of this.watchFiles) {
            this.watchFile(id);
        }
        for (const module of this.cache.modules) {
            for (const depId of module.transformDependencies) {
                this.watchFile(depId, true);
            }
        }
        for (const id of previouslyWatched) {
            if (!this.watched.has(id)) {
                this.fileWatcher.unwatch(id);
            }
        }
    }
    watchFile(id, isTransformDependency = false) {
        if (!this.filter(id))
            return;
        this.watched.add(id);
        if (this.outputFiles.some(file => file === id)) {
            throw new Error('Cannot import the generated bundle');
        }
        // this is necessary to ensure that any 'renamed' files
        // continue to be watched following an error
        this.fileWatcher.watch(id, isTransformDependency);
    }
}

exports.Task = Task;
exports.Watcher = Watcher;
//# sourceMappingURL=watch.js.map
