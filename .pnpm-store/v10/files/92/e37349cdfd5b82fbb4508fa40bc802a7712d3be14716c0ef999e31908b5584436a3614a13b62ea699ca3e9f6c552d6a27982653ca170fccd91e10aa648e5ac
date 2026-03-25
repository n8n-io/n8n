"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeSSH = exports.SSHError = void 0;
const assert_1 = __importStar(require("assert"));
const fs_1 = __importDefault(require("fs"));
const is_stream_1 = __importDefault(require("is-stream"));
const make_dir_1 = __importDefault(require("make-dir"));
const path_1 = __importDefault(require("path"));
const sb_promise_queue_1 = require("sb-promise-queue");
const sb_scandir_1 = __importDefault(require("sb-scandir"));
const shell_escape_1 = __importDefault(require("shell-escape"));
const ssh2_1 = __importDefault(require("ssh2"));
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_VALIDATE = (path) => !path_1.default.basename(path).startsWith('.');
const DEFAULT_TICK = () => {
    /* No Op */
};
class SSHError extends Error {
    constructor(message, code = null) {
        super(message);
        this.code = code;
    }
}
exports.SSHError = SSHError;
function unixifyPath(path) {
    if (path.includes('\\')) {
        return path.split('\\').join('/');
    }
    return path;
}
async function readFile(filePath) {
    return new Promise((resolve, reject) => {
        fs_1.default.readFile(filePath, 'utf8', (err, res) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
}
const SFTP_MKDIR_ERR_CODE_REGEXP = /Error: (E[\S]+): /;
async function makeDirectoryWithSftp(path, sftp) {
    let stats = null;
    try {
        stats = await new Promise((resolve, reject) => {
            sftp.stat(path, (err, res) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    }
    catch (_) {
        /* No Op */
    }
    if (stats) {
        if (stats.isDirectory()) {
            // Already exists, nothing to worry about
            return;
        }
        throw new Error('mkdir() failed, target already exists and is not a directory');
    }
    try {
        await new Promise((resolve, reject) => {
            sftp.mkdir(path, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    catch (err) {
        if (err != null && typeof err.stack === 'string') {
            const matches = SFTP_MKDIR_ERR_CODE_REGEXP.exec(err.stack);
            if (matches != null) {
                throw new SSHError(err.message, matches[1]);
            }
            throw err;
        }
    }
}
class NodeSSH {
    constructor() {
        this.connection = null;
    }
    getConnection() {
        const { connection } = this;
        if (connection == null) {
            throw new Error('Not connected to server');
        }
        return connection;
    }
    async connect(givenConfig) {
        (0, assert_1.default)(givenConfig != null && typeof givenConfig === 'object', 'config must be a valid object');
        const config = { ...givenConfig };
        (0, assert_1.default)(config.username != null && typeof config.username === 'string', 'config.username must be a valid string');
        if (config.host != null) {
            (0, assert_1.default)(typeof config.host === 'string', 'config.host must be a valid string');
        }
        else if (config.sock != null) {
            (0, assert_1.default)(typeof config.sock === 'object', 'config.sock must be a valid object');
        }
        else {
            throw new assert_1.AssertionError({ message: 'Either config.host or config.sock must be provided' });
        }
        if (config.privateKey != null || config.privateKeyPath != null) {
            if (config.privateKey != null) {
                (0, assert_1.default)(typeof config.privateKey === 'string', 'config.privateKey must be a valid string');
                (0, assert_1.default)(config.privateKeyPath == null, 'config.privateKeyPath must not be specified when config.privateKey is specified');
            }
            else if (config.privateKeyPath != null) {
                (0, assert_1.default)(typeof config.privateKeyPath === 'string', 'config.privateKeyPath must be a valid string');
                (0, assert_1.default)(config.privateKey == null, 'config.privateKey must not be specified when config.privateKeyPath is specified');
            }
            (0, assert_1.default)(config.passphrase == null || typeof config.passphrase === 'string', 'config.passphrase must be null or a valid string');
            if (config.privateKeyPath != null) {
                // Must be an fs path
                try {
                    config.privateKey = await readFile(config.privateKeyPath);
                }
                catch (err) {
                    if (err != null && err.code === 'ENOENT') {
                        throw new assert_1.AssertionError({ message: 'config.privateKeyPath does not exist at given fs path' });
                    }
                    throw err;
                }
            }
        }
        else if (config.password != null) {
            (0, assert_1.default)(typeof config.password === 'string', 'config.password must be a valid string');
        }
        if (config.tryKeyboard != null) {
            (0, assert_1.default)(typeof config.tryKeyboard === 'boolean', 'config.tryKeyboard must be a valid boolean');
        }
        if (config.tryKeyboard) {
            const { password } = config;
            if (config.onKeyboardInteractive != null) {
                (0, assert_1.default)(typeof config.onKeyboardInteractive === 'function', 'config.onKeyboardInteractive must be a valid function');
            }
            else if (password != null) {
                config.onKeyboardInteractive = (name, instructions, instructionsLang, prompts, finish) => {
                    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
                        finish([password]);
                    }
                };
            }
        }
        const connection = new ssh2_1.default.Client();
        this.connection = connection;
        await new Promise((resolve, reject) => {
            connection.on('error', reject);
            if (config.onKeyboardInteractive) {
                connection.on('keyboard-interactive', config.onKeyboardInteractive);
            }
            connection.on('ready', () => {
                connection.removeListener('error', reject);
                resolve();
            });
            connection.on('end', () => {
                if (this.connection === connection) {
                    this.connection = null;
                }
            });
            connection.on('close', () => {
                if (this.connection === connection) {
                    this.connection = null;
                }
                reject(new SSHError('No response from server', 'ETIMEDOUT'));
            });
            connection.connect(config);
        });
        return this;
    }
    isConnected() {
        return this.connection != null;
    }
    async requestShell(options) {
        const connection = this.getConnection();
        return new Promise((resolve, reject) => {
            connection.on('error', reject);
            const callback = (err, res) => {
                connection.removeListener('error', reject);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            };
            if (options == null) {
                connection.shell(callback);
            }
            else {
                connection.shell(options, callback);
            }
        });
    }
    async withShell(callback, options) {
        (0, assert_1.default)(typeof callback === 'function', 'callback must be a valid function');
        const shell = await this.requestShell(options);
        try {
            await callback(shell);
        }
        finally {
            shell.destroy();
        }
    }
    async requestSFTP() {
        const connection = this.getConnection();
        return new Promise((resolve, reject) => {
            connection.on('error', reject);
            connection.sftp((err, res) => {
                connection.removeListener('error', reject);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    }
    async withSFTP(callback) {
        (0, assert_1.default)(typeof callback === 'function', 'callback must be a valid function');
        const sftp = await this.requestSFTP();
        try {
            await callback(sftp);
        }
        finally {
            sftp.end();
        }
    }
    async execCommand(givenCommand, options = {}) {
        (0, assert_1.default)(typeof givenCommand === 'string', 'command must be a valid string');
        (0, assert_1.default)(options != null && typeof options === 'object', 'options must be a valid object');
        (0, assert_1.default)(options.cwd == null || typeof options.cwd === 'string', 'options.cwd must be a valid string');
        (0, assert_1.default)(options.stdin == null || typeof options.stdin === 'string' || is_stream_1.default.readable(options.stdin), 'options.stdin must be a valid string or readable stream');
        (0, assert_1.default)(options.execOptions == null || typeof options.execOptions === 'object', 'options.execOptions must be a valid object');
        (0, assert_1.default)(options.encoding == null || typeof options.encoding === 'string', 'options.encoding must be a valid string');
        (0, assert_1.default)(options.onChannel == null || typeof options.onChannel === 'function', 'options.onChannel must be a valid function');
        (0, assert_1.default)(options.onStdout == null || typeof options.onStdout === 'function', 'options.onStdout must be a valid function');
        (0, assert_1.default)(options.onStderr == null || typeof options.onStderr === 'function', 'options.onStderr must be a valid function');
        (0, assert_1.default)(options.noTrim == null || typeof options.noTrim === 'boolean', 'options.noTrim must be a boolean');
        let command = givenCommand;
        if (options.cwd) {
            command = `cd ${(0, shell_escape_1.default)([options.cwd])} ; ${command}`;
        }
        const connection = this.getConnection();
        const output = { stdout: [], stderr: [] };
        return new Promise((resolve, reject) => {
            connection.on('error', reject);
            connection.exec(command, options.execOptions != null ? options.execOptions : {}, (err, channel) => {
                connection.removeListener('error', reject);
                if (err) {
                    reject(err);
                    return;
                }
                if (options.onChannel) {
                    options.onChannel(channel);
                }
                channel.on('data', (chunk) => {
                    if (options.onStdout)
                        options.onStdout(chunk);
                    output.stdout.push(chunk.toString(options.encoding));
                });
                channel.stderr.on('data', (chunk) => {
                    if (options.onStderr)
                        options.onStderr(chunk);
                    output.stderr.push(chunk.toString(options.encoding));
                });
                if (options.stdin != null) {
                    if (is_stream_1.default.readable(options.stdin)) {
                        options.stdin.pipe(channel, {
                            end: true,
                        });
                    }
                    else {
                        channel.write(options.stdin);
                        channel.end();
                    }
                }
                else {
                    channel.end();
                }
                let code = null;
                let signal = null;
                channel.on('exit', (code_, signal_) => {
                    code = code_ !== null && code_ !== void 0 ? code_ : null;
                    signal = signal_ !== null && signal_ !== void 0 ? signal_ : null;
                });
                channel.on('close', () => {
                    let stdout = output.stdout.join('');
                    let stderr = output.stderr.join('');
                    if (options.noTrim !== true) {
                        stdout = stdout.trim();
                        stderr = stderr.trim();
                    }
                    resolve({
                        code: code != null ? code : null,
                        signal: signal != null ? signal : null,
                        stdout,
                        stderr,
                    });
                });
            });
        });
    }
    async exec(command, parameters, options = {}) {
        (0, assert_1.default)(typeof command === 'string', 'command must be a valid string');
        (0, assert_1.default)(Array.isArray(parameters), 'parameters must be a valid array');
        (0, assert_1.default)(options != null && typeof options === 'object', 'options must be a valid object');
        (0, assert_1.default)(options.stream == null || ['both', 'stdout', 'stderr'].includes(options.stream), 'options.stream must be one of both, stdout, stderr');
        for (let i = 0, { length } = parameters; i < length; i += 1) {
            (0, assert_1.default)(typeof parameters[i] === 'string', `parameters[${i}] must be a valid string`);
        }
        const completeCommand = `${command}${parameters.length > 0 ? ` ${(0, shell_escape_1.default)(parameters)}` : ''}`;
        const response = await this.execCommand(completeCommand, options);
        if (options.stream == null || options.stream === 'stdout') {
            if (response.stderr) {
                throw new Error(response.stderr);
            }
            return response.stdout;
        }
        if (options.stream === 'stderr') {
            return response.stderr;
        }
        return response;
    }
    async mkdir(path, method = 'sftp', givenSftp = null) {
        (0, assert_1.default)(typeof path === 'string', 'path must be a valid string');
        (0, assert_1.default)(typeof method === 'string' && (method === 'sftp' || method === 'exec'), 'method must be either sftp or exec');
        (0, assert_1.default)(givenSftp == null || typeof givenSftp === 'object', 'sftp must be a valid object');
        if (method === 'exec') {
            await this.exec('mkdir', ['-p', unixifyPath(path)]);
            return;
        }
        const sftp = givenSftp || (await this.requestSFTP());
        const makeSftpDirectory = async (retry) => makeDirectoryWithSftp(unixifyPath(path), sftp).catch(async (error) => {
            if (!retry || error == null || (error.message !== 'No such file' && error.code !== 'ENOENT')) {
                throw error;
            }
            await this.mkdir(path_1.default.dirname(path), 'sftp', sftp);
            await makeSftpDirectory(false);
        });
        try {
            await makeSftpDirectory(true);
        }
        finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
    }
    async getFile(localFile, remoteFile, givenSftp = null, transferOptions = null) {
        (0, assert_1.default)(typeof localFile === 'string', 'localFile must be a valid string');
        (0, assert_1.default)(typeof remoteFile === 'string', 'remoteFile must be a valid string');
        (0, assert_1.default)(givenSftp == null || typeof givenSftp === 'object', 'sftp must be a valid object');
        (0, assert_1.default)(transferOptions == null || typeof transferOptions === 'object', 'transferOptions must be a valid object');
        const sftp = givenSftp || (await this.requestSFTP());
        try {
            await new Promise((resolve, reject) => {
                sftp.fastGet(unixifyPath(remoteFile), localFile, transferOptions || {}, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
    }
    async putFile(localFile, remoteFile, givenSftp = null, transferOptions = null) {
        (0, assert_1.default)(typeof localFile === 'string', 'localFile must be a valid string');
        (0, assert_1.default)(typeof remoteFile === 'string', 'remoteFile must be a valid string');
        (0, assert_1.default)(givenSftp == null || typeof givenSftp === 'object', 'sftp must be a valid object');
        (0, assert_1.default)(transferOptions == null || typeof transferOptions === 'object', 'transferOptions must be a valid object');
        (0, assert_1.default)(await new Promise((resolve) => {
            fs_1.default.access(localFile, fs_1.default.constants.R_OK, (err) => {
                resolve(err === null);
            });
        }), `localFile does not exist at ${localFile}`);
        const sftp = givenSftp || (await this.requestSFTP());
        const putFile = (retry) => {
            return new Promise((resolve, reject) => {
                sftp.fastPut(localFile, unixifyPath(remoteFile), transferOptions || {}, (err) => {
                    if (err == null) {
                        resolve();
                        return;
                    }
                    if (err.message === 'No such file' && retry) {
                        resolve(this.mkdir(path_1.default.dirname(remoteFile), 'sftp', sftp).then(() => putFile(false)));
                    }
                    else {
                        reject(err);
                    }
                });
            });
        };
        try {
            await putFile(true);
        }
        finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
    }
    async putFiles(files, { concurrency = DEFAULT_CONCURRENCY, sftp: givenSftp = null, transferOptions = {} } = {}) {
        (0, assert_1.default)(Array.isArray(files), 'files must be an array');
        for (let i = 0, { length } = files; i < length; i += 1) {
            const file = files[i];
            (0, assert_1.default)(file, 'files items must be valid objects');
            (0, assert_1.default)(file.local && typeof file.local === 'string', `files[${i}].local must be a string`);
            (0, assert_1.default)(file.remote && typeof file.remote === 'string', `files[${i}].remote must be a string`);
        }
        const transferred = [];
        const sftp = givenSftp || (await this.requestSFTP());
        const queue = new sb_promise_queue_1.PromiseQueue({ concurrency });
        try {
            await new Promise((resolve, reject) => {
                files.forEach((file) => {
                    queue
                        .add(async () => {
                        await this.putFile(file.local, file.remote, sftp, transferOptions);
                        transferred.push(file);
                    })
                        .catch(reject);
                });
                queue.waitTillIdle().then(resolve);
            });
        }
        catch (error) {
            if (error != null) {
                error.transferred = transferred;
            }
            throw error;
        }
        finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
    }
    async putDirectory(localDirectory, remoteDirectory, { concurrency = DEFAULT_CONCURRENCY, sftp: givenSftp = null, transferOptions = {}, recursive = true, tick = DEFAULT_TICK, validate = DEFAULT_VALIDATE, } = {}) {
        (0, assert_1.default)(typeof localDirectory === 'string' && localDirectory, 'localDirectory must be a string');
        (0, assert_1.default)(typeof remoteDirectory === 'string' && remoteDirectory, 'remoteDirectory must be a string');
        const localDirectoryStat = await new Promise((resolve) => {
            fs_1.default.stat(localDirectory, (err, stat) => {
                resolve(stat || null);
            });
        });
        (0, assert_1.default)(localDirectoryStat != null, `localDirectory does not exist at ${localDirectory}`);
        (0, assert_1.default)(localDirectoryStat.isDirectory(), `localDirectory is not a directory at ${localDirectory}`);
        const sftp = givenSftp || (await this.requestSFTP());
        const scanned = await (0, sb_scandir_1.default)(localDirectory, {
            recursive,
            validate,
        });
        const files = scanned.files.map((item) => path_1.default.relative(localDirectory, item));
        const directories = scanned.directories.map((item) => path_1.default.relative(localDirectory, item));
        // Sort shortest to longest
        directories.sort((a, b) => a.length - b.length);
        let failed = false;
        try {
            // Do the directories first.
            await new Promise((resolve, reject) => {
                const queue = new sb_promise_queue_1.PromiseQueue({ concurrency });
                directories.forEach((directory) => {
                    queue
                        .add(async () => {
                        await this.mkdir(path_1.default.join(remoteDirectory, directory), 'sftp', sftp);
                    })
                        .catch(reject);
                });
                resolve(queue.waitTillIdle());
            });
            // and now the files
            await new Promise((resolve, reject) => {
                const queue = new sb_promise_queue_1.PromiseQueue({ concurrency });
                files.forEach((file) => {
                    queue
                        .add(async () => {
                        const localFile = path_1.default.join(localDirectory, file);
                        const remoteFile = path_1.default.join(remoteDirectory, file);
                        try {
                            await this.putFile(localFile, remoteFile, sftp, transferOptions);
                            tick(localFile, remoteFile, null);
                        }
                        catch (_) {
                            failed = true;
                            tick(localFile, remoteFile, _);
                        }
                    })
                        .catch(reject);
                });
                resolve(queue.waitTillIdle());
            });
        }
        finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
        return !failed;
    }
    async getDirectory(localDirectory, remoteDirectory, { concurrency = DEFAULT_CONCURRENCY, sftp: givenSftp = null, transferOptions = {}, recursive = true, tick = DEFAULT_TICK, validate = DEFAULT_VALIDATE, } = {}) {
        (0, assert_1.default)(typeof localDirectory === 'string' && localDirectory, 'localDirectory must be a string');
        (0, assert_1.default)(typeof remoteDirectory === 'string' && remoteDirectory, 'remoteDirectory must be a string');
        const localDirectoryStat = await new Promise((resolve) => {
            fs_1.default.stat(localDirectory, (err, stat) => {
                resolve(stat || null);
            });
        });
        (0, assert_1.default)(localDirectoryStat != null, `localDirectory does not exist at ${localDirectory}`);
        (0, assert_1.default)(localDirectoryStat.isDirectory(), `localDirectory is not a directory at ${localDirectory}`);
        const sftp = givenSftp || (await this.requestSFTP());
        const scanned = await (0, sb_scandir_1.default)(remoteDirectory, {
            recursive,
            validate,
            concurrency,
            fileSystem: {
                basename(path) {
                    return path_1.default.posix.basename(path);
                },
                join(pathA, pathB) {
                    return path_1.default.posix.join(pathA, pathB);
                },
                readdir(path) {
                    return new Promise((resolve, reject) => {
                        sftp.readdir(path, (err, res) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(res.map((item) => item.filename));
                            }
                        });
                    });
                },
                stat(path) {
                    return new Promise((resolve, reject) => {
                        sftp.stat(path, (err, res) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                resolve(res);
                            }
                        });
                    });
                },
            },
        });
        const files = scanned.files.map((item) => path_1.default.relative(remoteDirectory, item));
        const directories = scanned.directories.map((item) => path_1.default.relative(remoteDirectory, item));
        // Sort shortest to longest
        directories.sort((a, b) => a.length - b.length);
        let failed = false;
        try {
            // Do the directories first.
            await new Promise((resolve, reject) => {
                const queue = new sb_promise_queue_1.PromiseQueue({ concurrency });
                directories.forEach((directory) => {
                    queue
                        .add(async () => {
                        await (0, make_dir_1.default)(path_1.default.join(localDirectory, directory));
                    })
                        .catch(reject);
                });
                resolve(queue.waitTillIdle());
            });
            // and now the files
            await new Promise((resolve, reject) => {
                const queue = new sb_promise_queue_1.PromiseQueue({ concurrency });
                files.forEach((file) => {
                    queue
                        .add(async () => {
                        const localFile = path_1.default.join(localDirectory, file);
                        const remoteFile = path_1.default.join(remoteDirectory, file);
                        try {
                            await this.getFile(localFile, remoteFile, sftp, transferOptions);
                            tick(localFile, remoteFile, null);
                        }
                        catch (_) {
                            failed = true;
                            tick(localFile, remoteFile, _);
                        }
                    })
                        .catch(reject);
                });
                resolve(queue.waitTillIdle());
            });
        }
        finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
        return !failed;
    }
    forwardIn(remoteAddr, remotePort, onConnection) {
        const connection = this.getConnection();
        return new Promise((resolve, reject) => {
            connection.forwardIn(remoteAddr, remotePort, (error, port) => {
                if (error) {
                    reject(error);
                    return;
                }
                const handler = (details, acceptConnection, rejectConnection) => {
                    if (details.destIP === remoteAddr && details.destPort === port) {
                        onConnection === null || onConnection === void 0 ? void 0 : onConnection(details, acceptConnection, rejectConnection);
                    }
                };
                if (onConnection) {
                    connection.on('tcp connection', handler);
                }
                const dispose = () => {
                    return new Promise((_resolve, _reject) => {
                        connection.off('tcp connection', handler);
                        connection.unforwardIn(remoteAddr, port, (_error) => {
                            if (_error) {
                                _reject(error);
                            }
                            _resolve();
                        });
                    });
                };
                resolve({ port, dispose });
            });
        });
    }
    forwardOut(srcIP, srcPort, dstIP, dstPort) {
        const connection = this.getConnection();
        return new Promise((resolve, reject) => {
            connection.forwardOut(srcIP, srcPort, dstIP, dstPort, (error, channel) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(channel);
            });
        });
    }
    forwardInStreamLocal(socketPath, onConnection) {
        const connection = this.getConnection();
        return new Promise((resolve, reject) => {
            connection.openssh_forwardInStreamLocal(socketPath, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                const handler = (details, acceptConnection, rejectConnection) => {
                    if (details.socketPath === socketPath) {
                        onConnection === null || onConnection === void 0 ? void 0 : onConnection(details, acceptConnection, rejectConnection);
                    }
                };
                if (onConnection) {
                    connection.on('unix connection', handler);
                }
                const dispose = () => {
                    return new Promise((_resolve, _reject) => {
                        connection.off('unix connection', handler);
                        connection.openssh_unforwardInStreamLocal(socketPath, (_error) => {
                            if (_error) {
                                _reject(_error);
                            }
                            _resolve();
                        });
                    });
                };
                resolve({ dispose });
            });
        });
    }
    forwardOutStreamLocal(socketPath) {
        const connection = this.getConnection();
        return new Promise((resolve, reject) => {
            connection.openssh_forwardOutStreamLocal(socketPath, (error, channel) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(channel);
            });
        });
    }
    dispose() {
        if (this.connection) {
            this.connection.end();
            this.connection = null;
        }
    }
}
exports.NodeSSH = NodeSSH;
