"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const path_1 = __importDefault(require("path"));
const virtual_stats_1 = require("./virtual-stats");
let inode = 45000000;
function checkActivation(instance) {
    if (!instance._compiler) {
        throw new Error('You must use this plugin only after creating webpack instance!');
    }
}
function getModulePath(filePath, compiler) {
    return path_1.default.isAbsolute(filePath) ? filePath : path_1.default.join(compiler.context, filePath);
}
function createWebpackData(result) {
    return (backendOrStorage) => {
        if (backendOrStorage._data) {
            const curLevelIdx = backendOrStorage._currentLevel;
            const curLevel = backendOrStorage._levels[curLevelIdx];
            return {
                result,
                level: curLevel,
            };
        }
        return [null, result];
    };
}
function getData(storage, key) {
    if (storage._data instanceof Map) {
        return storage._data.get(key);
    }
    else if (storage._data) {
        return storage.data[key];
    }
    else if (storage.data instanceof Map) {
        return storage.data.get(key);
    }
    else {
        return storage.data[key];
    }
}
function setData(backendOrStorage, key, valueFactory) {
    const value = valueFactory(backendOrStorage);
    if (backendOrStorage._data instanceof Map) {
        backendOrStorage._data.set(key, value);
    }
    else if (backendOrStorage._data) {
        backendOrStorage.data[key] = value;
    }
    else if (backendOrStorage.data instanceof Map) {
        backendOrStorage.data.set(key, value);
    }
    else {
        backendOrStorage.data[key] = value;
    }
}
function getStatStorage(fileSystem) {
    if (fileSystem._statStorage) {
        return fileSystem._statStorage;
    }
    else if (fileSystem._statBackend) {
        return fileSystem._statBackend;
    }
    else {
        throw new Error("Couldn't find a stat storage");
    }
}
function getFileStorage(fileSystem) {
    if (fileSystem._readFileStorage) {
        return fileSystem._readFileStorage;
    }
    else if (fileSystem._readFileBackend) {
        return fileSystem._readFileBackend;
    }
    else {
        throw new Error("Couldn't find a readFileStorage");
    }
}
function getReadDirBackend(fileSystem) {
    if (fileSystem._readdirBackend) {
        return fileSystem._readdirBackend;
    }
    else if (fileSystem._readdirStorage) {
        return fileSystem._readdirStorage;
    }
    else {
        throw new Error("Couldn't find a readDirStorage from Webpack Internals");
    }
}
class VirtualModulesPlugin {
    constructor(modules) {
        this._compiler = null;
        this._watcher = null;
        this._staticModules = modules || null;
    }
    writeModule(filePath, contents) {
        if (!this._compiler) {
            throw new Error(`Plugin has not been initialized`);
        }
        checkActivation(this);
        const len = contents ? contents.length : 0;
        const time = Date.now();
        const date = new Date(time);
        const stats = new virtual_stats_1.VirtualStats({
            dev: 8675309,
            nlink: 0,
            uid: 1000,
            gid: 1000,
            rdev: 0,
            blksize: 4096,
            ino: inode++,
            mode: 33188,
            size: len,
            blocks: Math.floor(len / 4096),
            atime: date,
            mtime: date,
            ctime: date,
            birthtime: date,
        });
        const modulePath = getModulePath(filePath, this._compiler);
        if (process.env.WVM_DEBUG)
            console.log(this._compiler.name, 'Write virtual module:', modulePath, contents);
        let finalWatchFileSystem = this._watcher && this._watcher.watchFileSystem;
        while (finalWatchFileSystem && finalWatchFileSystem.wfs) {
            finalWatchFileSystem = finalWatchFileSystem.wfs;
        }
        let finalInputFileSystem = this._compiler.inputFileSystem;
        while (finalInputFileSystem && finalInputFileSystem._inputFileSystem) {
            finalInputFileSystem = finalInputFileSystem._inputFileSystem;
        }
        finalInputFileSystem._writeVirtualFile(modulePath, stats, contents);
        if (finalWatchFileSystem &&
            (finalWatchFileSystem.watcher.fileWatchers.size || finalWatchFileSystem.watcher.fileWatchers.length)) {
            const fileWatchers = finalWatchFileSystem.watcher.fileWatchers instanceof Map
                ? Array.from(finalWatchFileSystem.watcher.fileWatchers.values())
                : finalWatchFileSystem.watcher.fileWatchers;
            for (let fileWatcher of fileWatchers) {
                if ('watcher' in fileWatcher) {
                    fileWatcher = fileWatcher.watcher;
                }
                if (fileWatcher.path === modulePath) {
                    if (process.env.DEBUG)
                        console.log(this._compiler.name, 'Emit file change:', modulePath, time);
                    delete fileWatcher.directoryWatcher._cachedTimeInfoEntries;
                    fileWatcher.emit('change', time, null);
                }
            }
        }
    }
    apply(compiler) {
        this._compiler = compiler;
        const afterEnvironmentHook = () => {
            let finalInputFileSystem = compiler.inputFileSystem;
            while (finalInputFileSystem && finalInputFileSystem._inputFileSystem) {
                finalInputFileSystem = finalInputFileSystem._inputFileSystem;
            }
            if (!finalInputFileSystem._writeVirtualFile) {
                const originalPurge = finalInputFileSystem.purge;
                finalInputFileSystem.purge = () => {
                    originalPurge.apply(finalInputFileSystem, []);
                    if (finalInputFileSystem._virtualFiles) {
                        Object.keys(finalInputFileSystem._virtualFiles).forEach((file) => {
                            const data = finalInputFileSystem._virtualFiles[file];
                            finalInputFileSystem._writeVirtualFile(file, data.stats, data.contents);
                        });
                    }
                };
                finalInputFileSystem._writeVirtualFile = (file, stats, contents) => {
                    const statStorage = getStatStorage(finalInputFileSystem);
                    const fileStorage = getFileStorage(finalInputFileSystem);
                    const readDirStorage = getReadDirBackend(finalInputFileSystem);
                    finalInputFileSystem._virtualFiles = finalInputFileSystem._virtualFiles || {};
                    finalInputFileSystem._virtualFiles[file] = { stats: stats, contents: contents };
                    setData(statStorage, file, createWebpackData(stats));
                    setData(fileStorage, file, createWebpackData(contents));
                    const segments = file.split(/[\\/]/);
                    let count = segments.length - 1;
                    const minCount = segments[0] ? 1 : 0;
                    while (count > minCount) {
                        const dir = segments.slice(0, count).join(path_1.default.sep) || path_1.default.sep;
                        try {
                            finalInputFileSystem.readdirSync(dir);
                        }
                        catch (e) {
                            const time = Date.now();
                            const dirStats = new virtual_stats_1.VirtualStats({
                                dev: 8675309,
                                nlink: 0,
                                uid: 1000,
                                gid: 1000,
                                rdev: 0,
                                blksize: 4096,
                                ino: inode++,
                                mode: 16877,
                                size: stats.size,
                                blocks: Math.floor(stats.size / 4096),
                                atime: time,
                                mtime: time,
                                ctime: time,
                                birthtime: time,
                            });
                            setData(readDirStorage, dir, createWebpackData([]));
                            setData(statStorage, dir, createWebpackData(dirStats));
                        }
                        let dirData = getData(getReadDirBackend(finalInputFileSystem), dir);
                        dirData = dirData[1] || dirData.result;
                        const filename = segments[count];
                        if (dirData.indexOf(filename) < 0) {
                            const files = dirData.concat([filename]).sort();
                            setData(getReadDirBackend(finalInputFileSystem), dir, createWebpackData(files));
                        }
                        else {
                            break;
                        }
                        count--;
                    }
                };
            }
        };
        const afterResolversHook = () => {
            if (this._staticModules) {
                for (const [filePath, contents] of Object.entries(this._staticModules)) {
                    this.writeModule(filePath, contents);
                }
                this._staticModules = null;
            }
        };
        const version = typeof compiler.webpack === 'undefined' ? 4 : 5;
        const watchRunHook = (watcher, callback) => {
            this._watcher = watcher.compiler || watcher;
            const virtualFiles = compiler.inputFileSystem._virtualFiles;
            const fts = compiler.fileTimestamps;
            if (virtualFiles && fts && typeof fts.set === 'function') {
                Object.keys(virtualFiles).forEach((file) => {
                    const mtime = +virtualFiles[file].stats.mtime;
                    fts.set(file, version === 4
                        ? mtime
                        : {
                            safeTime: mtime,
                            timestamp: mtime,
                        });
                });
            }
            callback();
        };
        if (compiler.hooks) {
            compiler.hooks.afterEnvironment.tap('VirtualModulesPlugin', afterEnvironmentHook);
            compiler.hooks.afterResolvers.tap('VirtualModulesPlugin', afterResolversHook);
            compiler.hooks.watchRun.tapAsync('VirtualModulesPlugin', watchRunHook);
        }
        else {
            compiler.plugin('after-environment', afterEnvironmentHook);
            compiler.plugin('after-resolvers', afterResolversHook);
            compiler.plugin('watch-run', watchRunHook);
        }
    }
}
module.exports = VirtualModulesPlugin;
//# sourceMappingURL=index.js.map