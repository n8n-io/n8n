import spawn from 'cross-spawn';
import process from 'node:process';
import { PassThrough } from 'node:stream';
import { ReadBuffer, serializeMessage } from '../shared/stdio.js';
/**
 * Environment variables to inherit by default, if an environment is not explicitly given.
 */
export const DEFAULT_INHERITED_ENV_VARS = process.platform === 'win32'
    ? [
        'APPDATA',
        'HOMEDRIVE',
        'HOMEPATH',
        'LOCALAPPDATA',
        'PATH',
        'PROCESSOR_ARCHITECTURE',
        'SYSTEMDRIVE',
        'SYSTEMROOT',
        'TEMP',
        'USERNAME',
        'USERPROFILE',
        'PROGRAMFILES'
    ]
    : /* list inspired by the default env inheritance of sudo */
        ['HOME', 'LOGNAME', 'PATH', 'SHELL', 'TERM', 'USER'];
/**
 * Returns a default environment object including only environment variables deemed safe to inherit.
 */
export function getDefaultEnvironment() {
    const env = {};
    for (const key of DEFAULT_INHERITED_ENV_VARS) {
        const value = process.env[key];
        if (value === undefined) {
            continue;
        }
        if (value.startsWith('()')) {
            // Skip functions, which are a security risk.
            continue;
        }
        env[key] = value;
    }
    return env;
}
/**
 * Client transport for stdio: this will connect to a server by spawning a process and communicating with it over stdin/stdout.
 *
 * This transport is only available in Node.js environments.
 */
export class StdioClientTransport {
    constructor(server) {
        this._readBuffer = new ReadBuffer();
        this._stderrStream = null;
        this._serverParams = server;
        if (server.stderr === 'pipe' || server.stderr === 'overlapped') {
            this._stderrStream = new PassThrough();
        }
    }
    /**
     * Starts the server process and prepares to communicate with it.
     */
    async start() {
        if (this._process) {
            throw new Error('StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.');
        }
        return new Promise((resolve, reject) => {
            this._process = spawn(this._serverParams.command, this._serverParams.args ?? [], {
                // merge default env with server env because mcp server needs some env vars
                env: {
                    ...getDefaultEnvironment(),
                    ...this._serverParams.env
                },
                stdio: ['pipe', 'pipe', this._serverParams.stderr ?? 'inherit'],
                shell: false,
                windowsHide: process.platform === 'win32' && isElectron(),
                cwd: this._serverParams.cwd
            });
            this._process.on('error', error => {
                reject(error);
                this.onerror?.(error);
            });
            this._process.on('spawn', () => {
                resolve();
            });
            this._process.on('close', _code => {
                this._process = undefined;
                this.onclose?.();
            });
            this._process.stdin?.on('error', error => {
                this.onerror?.(error);
            });
            this._process.stdout?.on('data', chunk => {
                this._readBuffer.append(chunk);
                this.processReadBuffer();
            });
            this._process.stdout?.on('error', error => {
                this.onerror?.(error);
            });
            if (this._stderrStream && this._process.stderr) {
                this._process.stderr.pipe(this._stderrStream);
            }
        });
    }
    /**
     * The stderr stream of the child process, if `StdioServerParameters.stderr` was set to "pipe" or "overlapped".
     *
     * If stderr piping was requested, a PassThrough stream is returned _immediately_, allowing callers to
     * attach listeners before the start method is invoked. This prevents loss of any early
     * error output emitted by the child process.
     */
    get stderr() {
        if (this._stderrStream) {
            return this._stderrStream;
        }
        return this._process?.stderr ?? null;
    }
    /**
     * The child process pid spawned by this transport.
     *
     * This is only available after the transport has been started.
     */
    get pid() {
        return this._process?.pid ?? null;
    }
    processReadBuffer() {
        while (true) {
            try {
                const message = this._readBuffer.readMessage();
                if (message === null) {
                    break;
                }
                this.onmessage?.(message);
            }
            catch (error) {
                this.onerror?.(error);
            }
        }
    }
    async close() {
        if (this._process) {
            const processToClose = this._process;
            this._process = undefined;
            const closePromise = new Promise(resolve => {
                processToClose.once('close', () => {
                    resolve();
                });
            });
            try {
                processToClose.stdin?.end();
            }
            catch {
                // ignore
            }
            await Promise.race([closePromise, new Promise(resolve => setTimeout(resolve, 2000).unref())]);
            if (processToClose.exitCode === null) {
                try {
                    processToClose.kill('SIGTERM');
                }
                catch {
                    // ignore
                }
                await Promise.race([closePromise, new Promise(resolve => setTimeout(resolve, 2000).unref())]);
            }
            if (processToClose.exitCode === null) {
                try {
                    processToClose.kill('SIGKILL');
                }
                catch {
                    // ignore
                }
            }
        }
        this._readBuffer.clear();
    }
    send(message) {
        return new Promise(resolve => {
            if (!this._process?.stdin) {
                throw new Error('Not connected');
            }
            const json = serializeMessage(message);
            if (this._process.stdin.write(json)) {
                resolve();
            }
            else {
                this._process.stdin.once('drain', resolve);
            }
        });
    }
}
function isElectron() {
    return 'type' in process;
}
//# sourceMappingURL=stdio.js.map