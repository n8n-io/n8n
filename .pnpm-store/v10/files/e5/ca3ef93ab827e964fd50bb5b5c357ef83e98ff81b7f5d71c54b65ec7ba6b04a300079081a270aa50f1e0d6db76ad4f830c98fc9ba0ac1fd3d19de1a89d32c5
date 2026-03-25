"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractArgs = exports.hasWatchCommand = exports.isCommandExist = void 0;
function removeRunnerArgs(args) {
    return args.splice(2); // removing "node tsc-watch.js"
}
function getCommandIdx(args, command) {
    const lowerCasedCommand = command.toLowerCase();
    return args.map(arg => arg.toLowerCase()).indexOf(lowerCasedCommand);
}
function isCommandExist(args, command) {
    return getCommandIdx(args, command) > 0;
}
exports.isCommandExist = isCommandExist;
function hasWatchCommand(args) {
    return isCommandExist(args, '-w') || isCommandExist(args, '--watch');
}
exports.hasWatchCommand = hasWatchCommand;
function forceWatch(args) {
    if (!hasWatchCommand(args)) {
        args.push('--watch');
    }
    return args;
}
function extractCommandWithValue(args, command) {
    let commandValue = null;
    let commandIdx = getCommandIdx(args, command);
    if (commandIdx > -1) {
        commandValue = args[commandIdx + 1];
        args.splice(commandIdx, 2);
    }
    return commandValue;
}
function extractCommand(args, command) {
    let commandIdx = getCommandIdx(args, command);
    if (commandIdx > -1) {
        args.splice(commandIdx, 1);
        return true;
    }
    return false;
}
function extractArgs(inputArgs) {
    const args = forceWatch(removeRunnerArgs(inputArgs));
    const onFirstSuccessCommand = extractCommandWithValue(args, '--onFirstSuccess');
    const onSuccessCommand = extractCommandWithValue(args, '--onSuccess');
    const onFailureCommand = extractCommandWithValue(args, '--onFailure');
    const onEmitCommand = extractCommandWithValue(args, '--onEmit');
    const onEmitDebounceMs = Number(extractCommandWithValue(args, '--onEmitDebounceMs')) || 300;
    const onCompilationStarted = extractCommandWithValue(args, '--onCompilationStarted');
    const onCompilationComplete = extractCommandWithValue(args, '--onCompilationComplete');
    const maxNodeMem = extractCommandWithValue(args, '--maxNodeMem');
    const noColors = extractCommand(args, '--noColors');
    const noClear = extractCommand(args, '--noClear');
    const silent = extractCommand(args, '--silent');
    const signalEmittedFiles = extractCommand(args, '--signalEmittedFiles');
    const requestedToListEmittedFiles = extractCommand(args, '--listEmittedFiles');
    let compiler = extractCommandWithValue(args, '--compiler');
    if (!compiler) {
        compiler = 'typescript/bin/tsc';
    }
    else {
        compiler = require.resolve(compiler, { paths: [process.cwd()] });
    }
    if (signalEmittedFiles || requestedToListEmittedFiles) {
        if (args[0] === '--build' || args[0] === '-b') {
            // TS6369: Option '--build' must be the first command line argument.
            args.splice(1, 0, '--listEmittedFiles');
        }
        else {
            args.unshift('--listEmittedFiles');
        }
    }
    return {
        onFirstSuccessCommand,
        onSuccessCommand,
        onFailureCommand,
        onEmitCommand,
        onEmitDebounceMs,
        onCompilationStarted,
        onCompilationComplete,
        maxNodeMem,
        noColors,
        noClear,
        requestedToListEmittedFiles,
        signalEmittedFiles,
        silent,
        compiler,
        args,
    };
}
exports.extractArgs = extractArgs;
