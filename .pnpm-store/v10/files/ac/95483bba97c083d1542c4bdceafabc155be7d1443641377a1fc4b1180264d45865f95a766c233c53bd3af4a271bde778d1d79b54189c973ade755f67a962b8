/******************************************************************************
nodeCleanup() installs functions -- cleanup handlers -- that perform cleanup activities just before the node process exits, except on SIGKILL, which can't be intercepted. nodeCleanup() can also install messages to be written to stderr on either SIGINT or an uncaught exception.

Each cleanup handler has the following (FlowType) signature:

    cleanupHandler(exitCode: number|null, signal: string|null): boolean?

If the process is terminating for a reason other than a signal, exitCode is an integer that provides the reason for termination, and signal is null. If the process received a POSIX signal, signal is the signal's string name, and exitCode is null. These are also the arguments passed to a process' `exit` event handler, mirrored in node-cleanup for consistency.

The process terminates after cleanup, except possibly on signals. If any cleanup handler returns a boolean false for a signal, the process will not exit; otherwise the process exits. SIGKILL cannot be intercepted.

Install a cleanup handler as follows:

    var nodeCleanup = require('node-cleanup');
    nodeCleanup(cleanupHandler, stderrMessages);
    
Or to only install stderr messages:

    nodeCleanup(stderrMessages);

Or to install the default stderr messages:

    nodeCleanup();

nodeCleanup() may be called multiple times to install multiple cleanup handlers. However, only the most recently installed stderr messages get used. The messages available are ctrl_C and uncaughtException.

The following uninstalls all cleanup handlers and may be called multiple times in succession:

    nodeCleanup.uninstall();

This module has its origin in code by  @CanyonCasa at  http://stackoverflow.com/a/21947851/650894, but the module was significantly rewritten to resolve issues raised by @Banjocat at http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits#comment68567869_21947851. It has also been extended for greater configurability.
******************************************************************************/
 
//// CONSTANTS ////////////////////////////////////////////////////////////////

var DEFAULT_MESSAGES = {
    ctrl_C: '[ctrl-C]',
    uncaughtException: 'Uncaught exception...'
};
 
//// CONFIGURATION ////////////////////////////////////////////////////////////

var cleanupHandlers = null; // array of cleanup handlers to call
var messages = null; // messages to write to stderr

var sigintHandler; // POSIX signal handlers
var sighupHandler;
var sigquitHandler;
var sigtermHandler;

//// HANDLERS /////////////////////////////////////////////////////////////////

function signalHandler(signal)
{
    var exit = true;
    cleanupHandlers.forEach(function (cleanup) {
        if (cleanup(null, signal) === false)
            exit = false;
    });
    if (exit) {
        if (signal === 'SIGINT' && messages && messages.ctrl_C !== '')
            process.stderr.write(messages.ctrl_C + "\n");
        uninstall(); // don't cleanup again
        // necessary to communicate the signal to the parent process
        process.kill(process.pid, signal);
    }
}

function exceptionHandler(e)
{
    if (messages && messages.uncaughtException !== '')
        process.stderr.write(messages.uncaughtException + "\n");
    process.stderr.write(e.stack + "\n");
    process.exit(1); // will call exitHandler() for cleanup
}

function exitHandler(exitCode, signal)
{
    cleanupHandlers.forEach(function (cleanup) {
        cleanup(exitCode, signal);
    });
}

//// MAIN /////////////////////////////////////////////////////////////////////

function install(cleanupHandler, stderrMessages)
{
    if (cleanupHandler) {
        if (typeof cleanupHandler === 'object') {
            stderrMessages = cleanupHandler;
            cleanupHandler = null;
        }
    }
    else if (!stderrMessages)
        stderrMessages = DEFAULT_MESSAGES;
    
    if (stderrMessages) {
        if (messages === null)
            messages = { ctrl_C: '', uncaughtException: '' };
        if (typeof stderrMessages.ctrl_C === 'string')
            messages.ctrl_C = stderrMessages.ctrl_C;
        if (typeof stderrMessages.uncaughtException === 'string')
            messages.uncaughtException = stderrMessages.uncaughtException;
    }
    
    if (cleanupHandlers === null) {
        cleanupHandlers = []; // establish before installing handlers
        
        sigintHandler = signalHandler.bind(this, 'SIGINT');
        sighupHandler = signalHandler.bind(this, 'SIGHUP');
        sigquitHandler = signalHandler.bind(this, 'SIGQUIT');
        sigtermHandler = signalHandler.bind(this, 'SIGTERM');
        
        process.on('SIGINT', sigintHandler);
        process.on('SIGHUP', sighupHandler);
        process.on('SIGQUIT', sigquitHandler);
        process.on('SIGTERM', sigtermHandler);
        process.on('uncaughtException', exceptionHandler);
        process.on('exit', exitHandler);

        cleanupHandlers.push(cleanupHandler || noCleanup);
    }
    else if (cleanupHandler)
        cleanupHandlers.push(cleanupHandler);
}

function uninstall()
{
    if (cleanupHandlers !== null) {
        process.removeListener('SIGINT', sigintHandler);
        process.removeListener('SIGHUP', sighupHandler);
        process.removeListener('SIGQUIT', sigquitHandler);
        process.removeListener('SIGTERM', sigtermHandler);
        process.removeListener('uncaughtException', exceptionHandler);
        process.removeListener('exit', exitHandler);
        cleanupHandlers = null; // null only after uninstalling
    }
}

function noCleanup()
{
    return true; // signals will always terminate process
}

//// EXPORTS //////////////////////////////////////////////////////////////////

module.exports = install;
install.uninstall = uninstall;
