"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSys = createSys;
const path = require("path-browserify");
const utilities_1 = require("../typescript/utilities");
const vscode_uri_1 = require("vscode-uri");
let currentCwd = '';
function createSys(sys, env, getCurrentDirectory, uriConverter) {
    let version = 0;
    const caseSensitive = sys?.useCaseSensitiveFileNames ?? false;
    const root = {
        name: '',
        dirs: new Map(),
        files: new Map(),
        requestedRead: false,
    };
    const promises = new Set();
    const fileWatcher = env.onDidChangeWatchedFiles?.(({ changes }) => {
        version++;
        for (const change of changes) {
            const changeUri = vscode_uri_1.URI.parse(change.uri);
            const fileName = uriConverter.asFileName(changeUri);
            const dirName = path.dirname(fileName);
            const baseName = path.basename(fileName);
            const fileExists = change.type === 1
                || change.type === 2;
            const dir = getDir(dirName, fileExists);
            dir.files.set(normalizeFileId(baseName), fileExists ? {
                name: baseName,
                stat: {
                    type: 1,
                    ctime: Date.now(),
                    mtime: Date.now(),
                    size: -1,
                },
                requestedStat: false,
                requestedText: false,
            } : {
                name: baseName,
                stat: undefined,
                text: undefined,
                requestedStat: true,
                requestedText: true,
            });
        }
    });
    return {
        dispose() {
            fileWatcher?.dispose();
        },
        args: sys?.args ?? [],
        newLine: sys?.newLine ?? '\n',
        useCaseSensitiveFileNames: caseSensitive,
        realpath: sys?.realpath,
        write: sys?.write ?? (() => { }),
        writeFile: sys?.writeFile ?? (() => { }),
        createDirectory: sys?.createDirectory ?? (() => { }),
        exit: sys?.exit ?? (() => { }),
        getExecutingFilePath: sys?.getExecutingFilePath ?? (() => getCurrentDirectory + '/__fake__.js'),
        getCurrentDirectory,
        getModifiedTime,
        readFile,
        readDirectory,
        getDirectories,
        resolvePath,
        fileExists,
        directoryExists,
        get version() {
            return version;
        },
        async sync() {
            while (promises.size) {
                await Promise.all(promises);
            }
            return version;
        },
    };
    function resolvePath(fsPath) {
        if (sys) {
            const currentDirectory = getCurrentDirectory();
            if (currentCwd !== currentDirectory) {
                currentCwd = currentDirectory;
                // https://github.com/vuejs/language-tools/issues/2039
                // https://github.com/vuejs/language-tools/issues/2234
                if (sys.directoryExists(currentDirectory)) {
                    // https://github.com/vuejs/language-tools/issues/2480
                    try {
                        // @ts-ignore
                        process.chdir(currentDirectory);
                    }
                    catch { }
                }
            }
            return sys.resolvePath(fsPath).replace(/\\/g, '/');
        }
        return path.resolve(fsPath).replace(/\\/g, '/');
    }
    function readFile(fileName, encoding) {
        fileName = resolvePath(fileName);
        const dirPath = path.dirname(fileName);
        const dir = getDir(dirPath);
        const name = path.basename(fileName);
        readFileWorker(fileName, encoding, dir);
        return dir.files.get(normalizeFileId(name))?.text;
    }
    function directoryExists(dirName) {
        dirName = resolvePath(dirName);
        const dir = getDir(dirName);
        if (dir.exists === undefined) {
            dir.exists = false;
            const result = env.fs?.stat(uriConverter.asUri(dirName));
            if (typeof result === 'object' && 'then' in result) {
                const promise = result;
                promises.add(promise);
                result.then(result => {
                    promises.delete(promise);
                    dir.exists = result?.type === 2;
                    if (dir.exists) {
                        version++;
                    }
                });
            }
            else {
                dir.exists = result?.type === 2;
            }
        }
        return dir.exists;
    }
    function getModifiedTime(fileName) {
        fileName = resolvePath(fileName);
        const file = getFile(fileName);
        if (!file.requestedStat) {
            file.requestedStat = true;
            handleStat(fileName, file);
        }
        return file.stat ? new Date(file.stat.mtime) : new Date(0);
    }
    function fileExists(fileName) {
        fileName = resolvePath(fileName);
        const file = getFile(fileName);
        const exists = () => file.text !== undefined || file.stat?.type === 1;
        if (exists()) {
            return true;
        }
        if (!file.requestedStat) {
            file.requestedStat = true;
            handleStat(fileName, file);
        }
        return exists();
    }
    function handleStat(fileName, file) {
        const result = env.fs?.stat(uriConverter.asUri(fileName));
        if (typeof result === 'object' && 'then' in result) {
            const promise = result;
            promises.add(promise);
            result.then(result => {
                promises.delete(promise);
                if (file.stat?.type !== result?.type || file.stat?.mtime !== result?.mtime) {
                    version++;
                }
                file.stat = result;
            });
        }
        else {
            file.stat = result;
        }
    }
    function getFile(fileName) {
        fileName = resolvePath(fileName);
        const dirPath = path.dirname(fileName);
        const baseName = path.basename(fileName);
        const dir = getDir(dirPath);
        let file = dir.files.get(normalizeFileId(baseName));
        if (!file) {
            dir.files.set(normalizeFileId(baseName), file = {
                name: baseName,
                requestedStat: false,
                requestedText: false,
            });
        }
        return file;
    }
    // for import path completion
    function getDirectories(dirName) {
        dirName = resolvePath(dirName);
        readDirectoryWorker(dirName);
        const dir = getDir(dirName);
        return [...dir.dirs.values()]
            .filter(dir => dir.exists)
            .map(dir => dir.name);
    }
    function readDirectory(dirName, extensions, excludes, includes, depth) {
        dirName = resolvePath(dirName);
        const currentDirectory = getCurrentDirectory();
        const matches = (0, utilities_1.matchFiles)(dirName, extensions, excludes, includes, caseSensitive, currentDirectory, depth, dirPath => {
            dirPath = resolvePath(dirPath);
            readDirectoryWorker(dirPath);
            const dir = getDir(dirPath);
            return {
                files: [...dir.files.values()]
                    .filter(file => file.stat?.type === 1)
                    .map(file => file.name),
                directories: [...dir.dirs.values()]
                    .filter(dir => dir.exists)
                    .map(dir => dir.name),
            };
        }, sys?.realpath ? (path => sys.realpath(path)) : (path => path));
        return [...new Set(matches)];
    }
    function readFileWorker(fileName, encoding, dir) {
        const name = path.basename(fileName);
        let file = dir.files.get(normalizeFileId(name));
        if (!file) {
            dir.files.set(normalizeFileId(name), file = {
                name,
                requestedStat: false,
                requestedText: false,
            });
        }
        if (file.requestedText) {
            return;
        }
        file.requestedText = true;
        const uri = uriConverter.asUri(fileName);
        const result = env.fs?.readFile(uri, encoding);
        if (typeof result === 'object' && 'then' in result) {
            const promise = result;
            promises.add(promise);
            result.then(result => {
                promises.delete(promise);
                if (result !== undefined) {
                    file.text = result;
                    if (file.stat) {
                        file.stat.mtime++;
                    }
                    version++;
                }
            });
        }
        else if (result !== undefined) {
            file.text = result;
        }
    }
    function readDirectoryWorker(dirName) {
        const dir = getDir(dirName);
        if (dir.requestedRead) {
            return;
        }
        dir.requestedRead = true;
        const result = env.fs?.readDirectory(uriConverter.asUri(dirName || '.'));
        if (typeof result === 'object' && 'then' in result) {
            const promise = result;
            promises.add(promise);
            result.then(result => {
                promises.delete(promise);
                if (onReadDirectoryResult(dirName, dir, result)) {
                    version++;
                }
            });
        }
        else {
            onReadDirectoryResult(dirName, dir, result ?? []);
        }
    }
    function onReadDirectoryResult(dirName, dir, result) {
        // See https://github.com/microsoft/TypeScript/blob/e1a9290051a3b0cbdfbadc3adbcc155a4641522a/src/compiler/sys.ts#L1853-L1857
        result = result.filter(([name]) => name !== '.' && name !== '..');
        let updated = false;
        for (const [name, _fileType] of result) {
            let fileType = _fileType;
            if (fileType === 64) {
                const stat = env.fs?.stat(uriConverter.asUri(dirName + '/' + name));
                if (typeof stat === 'object' && 'then' in stat) {
                    const promise = stat;
                    promises.add(promise);
                    stat.then(stat => {
                        promises.delete(promise);
                        if (stat?.type === 1) {
                            let file = dir.files.get(normalizeFileId(name));
                            if (!file) {
                                dir.files.set(normalizeFileId(name), file = {
                                    name,
                                    requestedStat: false,
                                    requestedText: false,
                                });
                            }
                            if (stat.type !== file.stat?.type || stat.mtime !== file.stat?.mtime) {
                                version++;
                            }
                            file.stat = stat;
                            file.requestedStat = true;
                        }
                        else if (stat?.type === 2) {
                            const childDir = getDirFromDir(dir, name);
                            if (!childDir.exists) {
                                childDir.exists = true;
                                version++;
                            }
                        }
                    });
                }
                else if (stat) {
                    fileType = stat.type;
                }
            }
            if (fileType === 1) {
                let file = dir.files.get(normalizeFileId(name));
                if (!file) {
                    dir.files.set(normalizeFileId(name), file = {
                        name,
                        requestedStat: false,
                        requestedText: false,
                    });
                }
                if (!file.stat) {
                    file.stat = {
                        type: 1,
                        mtime: 0,
                        ctime: 0,
                        size: 0,
                    };
                    updated = true;
                }
            }
            else if (fileType === 2) {
                const childDir = getDirFromDir(dir, name);
                if (!childDir.exists) {
                    childDir.exists = true;
                    updated = true;
                }
            }
        }
        return updated;
    }
    function getDir(dirName, markExists = false) {
        const dirNames = [];
        let currentDirPath = dirName;
        let currentDirName = path.basename(currentDirPath);
        let lastDirPath;
        while (lastDirPath !== currentDirPath) {
            lastDirPath = currentDirPath;
            dirNames.push(currentDirName);
            currentDirPath = path.dirname(currentDirPath);
            currentDirName = path.basename(currentDirPath);
        }
        let currentDir = root;
        for (let i = dirNames.length - 1; i >= 0; i--) {
            const nextDirName = dirNames[i];
            currentDir = getDirFromDir(currentDir, nextDirName);
            if (markExists && !currentDir.exists) {
                currentDir.exists = true;
                version++;
            }
        }
        return currentDir;
    }
    function getDirFromDir(dir, name) {
        let target = dir.dirs.get(normalizeFileId(name));
        if (!target) {
            dir.dirs.set(normalizeFileId(name), target = {
                name,
                dirs: new Map(),
                files: new Map(),
            });
        }
        return target;
    }
    function normalizeFileId(fileName) {
        return caseSensitive ? fileName : fileName.toLowerCase();
    }
}
//# sourceMappingURL=createSys.js.map