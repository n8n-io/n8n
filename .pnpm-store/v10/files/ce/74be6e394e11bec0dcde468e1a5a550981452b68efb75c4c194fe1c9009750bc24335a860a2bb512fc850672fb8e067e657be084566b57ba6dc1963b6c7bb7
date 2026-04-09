"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Executable = void 0;
exports.parseProcessListOutputAsync = parseProcessListOutputAsync;
exports.parseProcessListOutput = parseProcessListOutput;
const os = __importStar(require("node:os"));
const child_process = __importStar(require("node:child_process"));
const path = __importStar(require("node:path"));
const EnvironmentMap_1 = require("./EnvironmentMap");
const FileSystem_1 = require("./FileSystem");
const PosixModeBits_1 = require("./PosixModeBits");
const Text_1 = require("./Text");
const InternalError_1 = require("./InternalError");
const OS_PLATFORM = os.platform();
async function parseProcessListOutputAsync(stream, platform = OS_PLATFORM) {
    const processInfoById = new Map();
    let seenHeaders = false;
    for await (const line of Text_1.Text.readLinesFromIterableAsync(stream, { ignoreEmptyLines: true })) {
        if (!seenHeaders) {
            seenHeaders = true;
        }
        else {
            parseProcessInfoEntry(line, processInfoById, platform);
        }
    }
    return processInfoById;
}
function parseProcessListOutput(
// eslint-disable-next-line @rushstack/no-new-null
output, platform = OS_PLATFORM) {
    const processInfoById = new Map();
    let seenHeaders = false;
    for (const line of Text_1.Text.readLinesFromIterable(output, { ignoreEmptyLines: true })) {
        if (!seenHeaders) {
            seenHeaders = true;
        }
        else {
            parseProcessInfoEntry(line, processInfoById, platform);
        }
    }
    return processInfoById;
}
// win32 format:
// PPID PID NAME
// 51234 56784 process name
// unix format:
//  PPID     PID   COMMAND
// 51234   56784   process name
const NAME_GROUP = 'name';
const PROCESS_ID_GROUP = 'pid';
const PARENT_PROCESS_ID_GROUP = 'ppid';
const PROCESS_LIST_ENTRY_REGEX = new RegExp(`^\\s*(?<${PARENT_PROCESS_ID_GROUP}>\\d+)\\s+(?<${PROCESS_ID_GROUP}>\\d+)\\s+(?<${NAME_GROUP}>.+?)\\s*$`);
function parseProcessInfoEntry(line, existingProcessInfoById, platform) {
    const processListEntryRegex = PROCESS_LIST_ENTRY_REGEX;
    const match = line.match(processListEntryRegex);
    if (!(match === null || match === void 0 ? void 0 : match.groups)) {
        throw new InternalError_1.InternalError(`Invalid process list entry: ${line}`);
    }
    const processName = match.groups[NAME_GROUP];
    const processId = parseInt(match.groups[PROCESS_ID_GROUP], 10);
    const parentProcessId = parseInt(match.groups[PARENT_PROCESS_ID_GROUP], 10);
    // Only care about the parent process if it is not the same as the current process.
    let parentProcessInfo;
    if (parentProcessId !== processId) {
        parentProcessInfo = existingProcessInfoById.get(parentProcessId);
        if (!parentProcessInfo) {
            // Create a new placeholder entry for the parent with the information we have so far
            parentProcessInfo = {
                processName: '',
                processId: parentProcessId,
                parentProcessInfo: undefined,
                childProcessInfos: []
            };
            existingProcessInfoById.set(parentProcessId, parentProcessInfo);
        }
    }
    let processInfo = existingProcessInfoById.get(processId);
    if (!processInfo) {
        // Create a new entry
        processInfo = {
            processName,
            processId,
            parentProcessInfo,
            childProcessInfos: []
        };
        existingProcessInfoById.set(processId, processInfo);
    }
    else {
        // Update placeholder entry
        processInfo.processName = processName;
        processInfo.parentProcessInfo = parentProcessInfo;
    }
    // Add the process as a child of the parent process
    parentProcessInfo === null || parentProcessInfo === void 0 ? void 0 : parentProcessInfo.childProcessInfos.push(processInfo);
}
function convertToProcessInfoByNameMap(processInfoById) {
    const processInfoByNameMap = new Map();
    for (const processInfo of processInfoById.values()) {
        let processInfoNameEntries = processInfoByNameMap.get(processInfo.processName);
        if (!processInfoNameEntries) {
            processInfoNameEntries = [];
            processInfoByNameMap.set(processInfo.processName, processInfoNameEntries);
        }
        processInfoNameEntries.push(processInfo);
    }
    return processInfoByNameMap;
}
function getProcessListProcessOptions() {
    let command;
    let args;
    if (OS_PLATFORM === 'win32') {
        command = 'powershell.exe';
        // Order of declared properties sets the order of the output.
        // Put name last to simplify parsing, since it can contain spaces.
        args = [
            '-NoProfile',
            '-Command',
            `'PPID PID Name'; Get-CimInstance Win32_Process | % { '{0} {1} {2}' -f $_.ParentProcessId, $_.ProcessId, $_.Name }`
        ];
    }
    else {
        command = 'ps';
        // -A: Select all processes
        // -w: Wide format
        // -o: User-defined format
        // Order of declared properties sets the order of the output. We will
        // need to request the "comm" property last in order to ensure that the
        // process names are not truncated on certain platforms
        args = ['-Awo', 'ppid,pid,comm'];
    }
    return { path: command, args };
}
/**
 * The Executable class provides a safe, portable, recommended solution for tools that need
 * to launch child processes.
 *
 * @remarks
 * The NodeJS child_process API provides a solution for launching child processes, however
 * its design encourages reliance on the operating system shell for certain features.
 * Invoking the OS shell is not safe, not portable, and generally not recommended:
 *
 * - Different shells have different behavior and command-line syntax, and which shell you
 *   will get with NodeJS is unpredictable.  There is no universal shell guaranteed to be
 *   available on all platforms.
 *
 * - If a command parameter contains symbol characters, a shell may interpret them, which
 *   can introduce a security vulnerability
 *
 * - Each shell has different rules for escaping these symbols.  On Windows, the default
 *   shell is incapable of escaping certain character sequences.
 *
 * The Executable API provides a pure JavaScript implementation of primitive shell-like
 * functionality for searching the default PATH, appending default file extensions on Windows,
 * and executing a file that may contain a POSIX shebang.  This primitive functionality
 * is sufficient (and recommended) for most tooling scenarios.
 *
 * If you need additional shell features such as wildcard globbing, environment variable
 * expansion, piping, or built-in commands, then we recommend to use the `@microsoft/rushell`
 * library instead.  Rushell is a pure JavaScript shell with a standard syntax that is
 * guaranteed to work consistently across all platforms.
 *
 * @public
 */
class Executable {
    /**
     * Synchronously create a child process and optionally capture its output.
     *
     * @remarks
     * This function is similar to child_process.spawnSync().  The main differences are:
     *
     * - It does not invoke the OS shell unless the executable file is a shell script.
     * - Command-line arguments containing special characters are more accurately passed
     *   through to the child process.
     * - If the filename is missing a path, then the shell's default PATH will be searched.
     * - If the filename is missing a file extension, then Windows default file extensions
     *   will be searched.
     *
     * @param filename - The name of the executable file.  This string must not contain any
     * command-line arguments.  If the name contains any path delimiters, then the shell's
     * default PATH will not be searched.
     * @param args - The command-line arguments to be passed to the process.
     * @param options - Additional options
     * @returns the same data type as returned by the NodeJS child_process.spawnSync() API
     *
     * @privateRemarks
     *
     * NOTE: The NodeJS spawnSync() returns SpawnSyncReturns<string> or SpawnSyncReturns<Buffer>
     * polymorphically based on the options.encoding parameter value.  This is a fairly confusing
     * design.  In most cases, developers want string with the default encoding.  If/when someone
     * wants binary output or a non-default text encoding, we will introduce a separate API function
     * with a name like "spawnWithBufferSync".
     */
    static spawnSync(filename, args, options) {
        if (!options) {
            options = {};
        }
        const context = Executable._getExecutableContext(options);
        const resolvedPath = Executable._tryResolve(filename, options, context);
        if (!resolvedPath) {
            throw new Error(`The executable file was not found: "${filename}"`);
        }
        const spawnOptions = {
            cwd: context.currentWorkingDirectory,
            env: context.environmentMap.toObject(),
            input: options.input,
            stdio: options.stdio,
            timeout: options.timeoutMs,
            maxBuffer: options.maxBuffer,
            // Contrary to what the NodeJS typings imply, we must explicitly specify "utf8" here
            // if we want the result to be SpawnSyncReturns<string> instead of SpawnSyncReturns<Buffer>.
            encoding: 'utf8',
            // NOTE: This is always false, because Rushell will be recommended instead of relying on the OS shell.
            shell: false
        };
        const normalizedCommandLine = Executable._buildCommandLineFixup(resolvedPath, args, context);
        return child_process.spawnSync(normalizedCommandLine.path, normalizedCommandLine.args, spawnOptions);
    }
    /**
     * Start a child process.
     *
     * @remarks
     * This function is similar to child_process.spawn().  The main differences are:
     *
     * - It does not invoke the OS shell unless the executable file is a shell script.
     * - Command-line arguments containing special characters are more accurately passed
     *   through to the child process.
     * - If the filename is missing a path, then the shell's default PATH will be searched.
     * - If the filename is missing a file extension, then Windows default file extensions
     *   will be searched.
     *
     * This command is asynchronous, but it does not return a `Promise`.  Instead it returns
     * a Node.js `ChildProcess` supporting event notifications.
     *
     * @param filename - The name of the executable file.  This string must not contain any
     * command-line arguments.  If the name contains any path delimiters, then the shell's
     * default PATH will not be searched.
     * @param args - The command-line arguments to be passed to the process.
     * @param options - Additional options
     * @returns the same data type as returned by the NodeJS child_process.spawnSync() API
     */
    static spawn(filename, args, options) {
        if (!options) {
            options = {};
        }
        const context = Executable._getExecutableContext(options);
        const resolvedPath = Executable._tryResolve(filename, options, context);
        if (!resolvedPath) {
            throw new Error(`The executable file was not found: "${filename}"`);
        }
        const spawnOptions = {
            cwd: context.currentWorkingDirectory,
            env: context.environmentMap.toObject(),
            stdio: options.stdio,
            // NOTE: This is always false, because Rushell will be recommended instead of relying on the OS shell.
            shell: false
        };
        const normalizedCommandLine = Executable._buildCommandLineFixup(resolvedPath, args, context);
        return child_process.spawn(normalizedCommandLine.path, normalizedCommandLine.args, spawnOptions);
    }
    static async waitForExitAsync(childProcess, options = {}) {
        const { throwOnNonZeroExitCode, throwOnSignal, encoding } = options;
        if (encoding && (!childProcess.stdout || !childProcess.stderr)) {
            throw new Error('An encoding was specified, but stdout and/or stderr on the child process are not defined');
        }
        const collectedStdout = [];
        const collectedStderr = [];
        const useBufferEncoding = encoding === 'buffer';
        function normalizeChunk(chunk) {
            if (typeof chunk === 'string') {
                return (useBufferEncoding ? Buffer.from(chunk) : chunk);
            }
            else {
                return (useBufferEncoding ? chunk : chunk.toString(encoding));
            }
        }
        let errorThrown = undefined;
        const { exitCode, signal } = await new Promise((resolve, reject) => {
            if (encoding) {
                childProcess.stdout.on('data', (chunk) => {
                    collectedStdout.push(normalizeChunk(chunk));
                });
                childProcess.stderr.on('data', (chunk) => {
                    collectedStderr.push(normalizeChunk(chunk));
                });
            }
            childProcess.on('error', (error) => {
                // Wait to call reject() until any output is collected
                errorThrown = error;
            });
            childProcess.on('close', (closeExitCode, closeSignal) => {
                if (errorThrown) {
                    reject(errorThrown);
                }
                if (closeSignal && throwOnSignal) {
                    reject(new Error(`Process terminated by ${closeSignal}`));
                }
                else if (closeExitCode !== 0 && throwOnNonZeroExitCode) {
                    reject(new Error(`Process exited with code ${closeExitCode}`));
                }
                else {
                    resolve({ exitCode: closeExitCode, signal: closeSignal });
                }
            });
        });
        let result;
        if (encoding) {
            let stdout;
            let stderr;
            if (encoding === 'buffer') {
                stdout = Buffer.concat(collectedStdout);
                stderr = Buffer.concat(collectedStderr);
            }
            else if (encoding !== undefined) {
                stdout = collectedStdout.join('');
                stderr = collectedStderr.join('');
            }
            result = {
                stdout: stdout,
                stderr: stderr,
                exitCode,
                signal
            };
        }
        else {
            result = {
                exitCode,
                signal
            };
        }
        return result;
    }
    /**
     * Get the list of processes currently running on the system, keyed by the process ID.
     *
     * @remarks The underlying implementation depends on the operating system:
     * - On Windows, this uses `powershell.exe` and the `Get-CimInstance` cmdlet.
     * - On Unix, this uses the `ps` utility.
     */
    static async getProcessInfoByIdAsync() {
        const { path: command, args } = getProcessListProcessOptions();
        const process = Executable.spawn(command, args, {
            stdio: ['ignore', 'pipe', 'ignore']
        });
        if (process.stdout === null) {
            throw new InternalError_1.InternalError('Child process did not provide stdout');
        }
        const [processInfoByIdMap] = await Promise.all([
            parseProcessListOutputAsync(process.stdout),
            // Don't collect output in the result since we process it directly
            Executable.waitForExitAsync(process, { throwOnNonZeroExitCode: true, throwOnSignal: true })
        ]);
        return processInfoByIdMap;
    }
    /**
     * {@inheritDoc Executable.getProcessInfoByIdAsync}
     */
    static getProcessInfoById() {
        const { path: command, args } = getProcessListProcessOptions();
        const processOutput = Executable.spawnSync(command, args);
        if (processOutput.error) {
            throw new Error(`Unable to list processes: ${command} failed with error ${processOutput.error}`);
        }
        if (processOutput.status !== 0) {
            throw new Error(`Unable to list processes: ${command} exited with code ${processOutput.status}`);
        }
        return parseProcessListOutput(processOutput.output);
    }
    /**
     * Get the list of processes currently running on the system, keyed by the process name. All processes
     * with the same name will be grouped.
     *
     * @remarks The underlying implementation depends on the operating system:
     * - On Windows, this uses `powershell.exe` and the `Get-CimInstance` cmdlet.
     * - On Unix, this uses the `ps` utility.
     */
    static async getProcessInfoByNameAsync() {
        const processInfoById = await Executable.getProcessInfoByIdAsync();
        return convertToProcessInfoByNameMap(processInfoById);
    }
    /**
     * {@inheritDoc Executable.getProcessInfoByNameAsync}
     */
    static getProcessInfoByName() {
        const processInfoByIdMap = Executable.getProcessInfoById();
        return convertToProcessInfoByNameMap(processInfoByIdMap);
    }
    // PROBLEM: Given an "args" array of strings that may contain special characters (e.g. spaces,
    // backslashes, quotes), ensure that these strings pass through to the child process's ARGV array
    // without anything getting corrupted along the way.
    //
    // On Unix you just pass the array to spawnSync().  But on Windows, this is a very complex problem:
    // - The Win32 CreateProcess() API expects the args to be encoded as a single text string
    // - The decoding of this string is up to the application (not the OS), and there are 3 different
    //   algorithms in common usage:  the cmd.exe shell, the Microsoft CRT library init code, and
    //   the Win32 CommandLineToArgvW()
    // - The encodings are counterintuitive and have lots of special cases
    // - NodeJS spawnSync() tries do the encoding without knowing which decoder will be used
    //
    // See these articles for a full analysis:
    // http://www.windowsinspired.com/understanding-the-command-line-string-and-arguments-received-by-a-windows-program/
    // http://www.windowsinspired.com/how-a-windows-programs-splits-its-command-line-into-individual-arguments/
    static _buildCommandLineFixup(resolvedPath, args, context) {
        const fileExtension = path.extname(resolvedPath);
        if (OS_PLATFORM === 'win32') {
            // Do we need a custom handler for this file type?
            switch (fileExtension.toUpperCase()) {
                case '.EXE':
                case '.COM':
                    // okay to execute directly
                    break;
                case '.BAT':
                case '.CMD': {
                    Executable._validateArgsForWindowsShell(args);
                    // These file types must be invoked via the Windows shell
                    let shellPath = context.environmentMap.get('COMSPEC');
                    if (!shellPath || !Executable._canExecute(shellPath, context)) {
                        shellPath = Executable.tryResolve('cmd.exe');
                    }
                    if (!shellPath) {
                        throw new Error(`Unable to execute "${path.basename(resolvedPath)}" ` +
                            `because CMD.exe was not found in the PATH`);
                    }
                    const shellArgs = [];
                    // /D: Disable execution of AutoRun commands when starting the new shell context
                    shellArgs.push('/d');
                    // /S: Disable Cmd.exe's parsing of double-quote characters inside the command-line
                    shellArgs.push('/s');
                    // /C: Execute the following command and then exit immediately
                    shellArgs.push('/c');
                    // If the path contains special charactrers (e.g. spaces), escape them so that
                    // they don't get interpreted by the shell
                    shellArgs.push(Executable._getEscapedForWindowsShell(resolvedPath));
                    shellArgs.push(...args);
                    return { path: shellPath, args: shellArgs };
                }
                default:
                    throw new Error(`Cannot execute "${path.basename(resolvedPath)}" because the file type is not supported`);
            }
        }
        return {
            path: resolvedPath,
            args: args
        };
    }
    /**
     * Given a filename, this determines the absolute path of the executable file that would
     * be executed by a shell:
     *
     * - If the filename is missing a path, then the shell's default PATH will be searched.
     * - If the filename is missing a file extension, then Windows default file extensions
     *   will be searched.
     *
     * @remarks
     *
     * @param filename - The name of the executable file.  This string must not contain any
     * command-line arguments.  If the name contains any path delimiters, then the shell's
     * default PATH will not be searched.
     * @param options - optional other parameters
     * @returns the absolute path of the executable, or undefined if it was not found
     */
    static tryResolve(filename, options) {
        return Executable._tryResolve(filename, options || {}, Executable._getExecutableContext(options));
    }
    static _tryResolve(filename, options, context) {
        // NOTE: Since "filename" cannot contain command-line arguments, the "/" here
        // must be interpreted as a path delimiter
        const hasPathSeparators = filename.indexOf('/') >= 0 || (OS_PLATFORM === 'win32' && filename.indexOf('\\') >= 0);
        // Are there any path separators?
        if (hasPathSeparators) {
            // If so, then don't search the PATH.  Just resolve relative to the current working directory
            const resolvedPath = path.resolve(context.currentWorkingDirectory, filename);
            return Executable._tryResolveFileExtension(resolvedPath, context);
        }
        else {
            // Otherwise if it's a bare name, then try everything in the shell PATH
            const pathsToSearch = Executable._getSearchFolders(context);
            for (const pathToSearch of pathsToSearch) {
                const resolvedPath = path.join(pathToSearch, filename);
                const result = Executable._tryResolveFileExtension(resolvedPath, context);
                if (result) {
                    return result;
                }
            }
            // No match was found
            return undefined;
        }
    }
    static _tryResolveFileExtension(resolvedPath, context) {
        if (Executable._canExecute(resolvedPath, context)) {
            return resolvedPath;
        }
        // Try the default file extensions
        for (const shellExtension of context.windowsExecutableExtensions) {
            const resolvedNameWithExtension = resolvedPath + shellExtension;
            if (Executable._canExecute(resolvedNameWithExtension, context)) {
                return resolvedNameWithExtension;
            }
        }
        return undefined;
    }
    static _buildEnvironmentMap(options) {
        const environmentMap = new EnvironmentMap_1.EnvironmentMap();
        if (options.environment !== undefined && options.environmentMap !== undefined) {
            throw new Error('IExecutableResolveOptions.environment and IExecutableResolveOptions.environmentMap' +
                ' cannot both be specified');
        }
        if (options.environment !== undefined) {
            environmentMap.mergeFromObject(options.environment);
        }
        else if (options.environmentMap !== undefined) {
            environmentMap.mergeFrom(options.environmentMap);
        }
        else {
            environmentMap.mergeFromObject(process.env);
        }
        return environmentMap;
    }
    /**
     * This is used when searching the shell PATH for an executable, to determine
     * whether a match should be skipped or not.  If it returns true, this does not
     * guarantee that the file can be successfully executed.
     */
    static _canExecute(filePath, context) {
        if (!FileSystem_1.FileSystem.exists(filePath)) {
            return false;
        }
        if (OS_PLATFORM === 'win32') {
            // NOTE: For Windows, we don't validate that the file extension appears in PATHEXT.
            // That environment variable determines which extensions can be appended if the
            // extension is missing, but it does not affect whether a file may be executed or not.
            // Windows does have a (seldom used) ACL that can be used to deny execution permissions
            // for a file, but NodeJS doesn't expose that API, so we don't bother checking it.
            // However, Windows *does* require that the file has some kind of file extension
            if (path.extname(filePath) === '') {
                return false;
            }
        }
        else {
            // For Unix, check whether any of the POSIX execute bits are set
            try {
                // eslint-disable-next-line no-bitwise
                if ((FileSystem_1.FileSystem.getPosixModeBits(filePath) & PosixModeBits_1.PosixModeBits.AllExecute) === 0) {
                    return false; // not executable
                }
            }
            catch (error) {
                // If we have trouble accessing the file, ignore the error and consider it "not executable"
                // since that's what a shell would do
            }
        }
        return true;
    }
    /**
     * Returns the list of folders where we will search for an executable,
     * based on the PATH environment variable.
     */
    static _getSearchFolders(context) {
        const pathList = context.environmentMap.get('PATH') || '';
        const folders = [];
        // Avoid processing duplicates
        const seenPaths = new Set();
        // NOTE: Cmd.exe on Windows always searches the current working directory first.
        // PowerShell and Unix shells do NOT do that, because it's a security concern.
        // We follow their behavior.
        for (const splitPath of pathList.split(path.delimiter)) {
            const trimmedPath = splitPath.trim();
            if (trimmedPath !== '') {
                if (!seenPaths.has(trimmedPath)) {
                    // Fun fact: If you put relative paths in your PATH environment variable,
                    // all shells will dynamically match them against the current working directory.
                    // This is a terrible design, and in practice nobody does that, but it is supported...
                    // so we allow it here.
                    const resolvedPath = path.resolve(context.currentWorkingDirectory, trimmedPath);
                    if (!seenPaths.has(resolvedPath)) {
                        if (FileSystem_1.FileSystem.exists(resolvedPath)) {
                            folders.push(resolvedPath);
                        }
                        seenPaths.add(resolvedPath);
                    }
                    seenPaths.add(trimmedPath);
                }
            }
        }
        return folders;
    }
    static _getExecutableContext(options) {
        if (!options) {
            options = {};
        }
        const environment = Executable._buildEnvironmentMap(options);
        let currentWorkingDirectory;
        if (options.currentWorkingDirectory) {
            currentWorkingDirectory = path.resolve(options.currentWorkingDirectory);
        }
        else {
            currentWorkingDirectory = process.cwd();
        }
        const windowsExecutableExtensions = [];
        if (OS_PLATFORM === 'win32') {
            const pathExtVariable = environment.get('PATHEXT') || '';
            for (const splitValue of pathExtVariable.split(';')) {
                const trimmed = splitValue.trim().toLowerCase();
                // Ignore malformed extensions
                if (/^\.[a-z0-9\.]*[a-z0-9]$/i.test(trimmed)) {
                    // Don't add the same extension twice
                    if (windowsExecutableExtensions.indexOf(trimmed) < 0) {
                        windowsExecutableExtensions.push(trimmed);
                    }
                }
            }
        }
        return {
            environmentMap: environment,
            currentWorkingDirectory,
            windowsExecutableExtensions
        };
    }
    /**
     * Given an input string containing special symbol characters, this inserts the "^" escape
     * character to ensure the symbols are interpreted literally by the Windows shell.
     */
    static _getEscapedForWindowsShell(text) {
        const escapableCharRegExp = /[%\^&|<> ]/g;
        return text.replace(escapableCharRegExp, (value) => '^' + value);
    }
    /**
     * Checks for characters that are unsafe to pass to a Windows batch file
     * due to the way that cmd.exe implements escaping.
     */
    static _validateArgsForWindowsShell(args) {
        const specialCharRegExp = /[%\^&|<>\r\n]/g;
        for (const arg of args) {
            const match = arg.match(specialCharRegExp);
            if (match) {
                // NOTE: It is possible to escape some of these characters by prefixing them
                // with a caret (^), which allows these characters to be successfully passed
                // through to the batch file %1 variables.  But they will be expanded again
                // whenever they are used.  For example, NPM's binary wrapper batch files
                // use "%*" to pass their arguments to Node.exe, which causes them to be expanded
                // again.  Unfortunately the Cmd.exe batch language provides native escaping
                // function (that could be used to insert the carets again).
                //
                // We could work around that by adding double carets, but in general there
                // is no way to predict how many times the variable will get expanded.
                // Thus, there is no generally reliable way to pass these characters.
                throw new Error(`The command line argument ${JSON.stringify(arg)} contains a` +
                    ` special character ${JSON.stringify(match[0])} that cannot be escaped for the Windows shell`);
            }
        }
    }
}
exports.Executable = Executable;
//# sourceMappingURL=Executable.js.map