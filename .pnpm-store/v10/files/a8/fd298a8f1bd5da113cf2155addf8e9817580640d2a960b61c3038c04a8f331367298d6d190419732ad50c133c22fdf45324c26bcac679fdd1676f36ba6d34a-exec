#!/usr/bin/env node

/******************************************************************************
Child process that installs node-cleanup for testing in situations that may entail forking a grandchild process in the same process group. It accepts a single argument of serialized JSON having the following (FlowType) structure:

{
    grandchild: boolean; // whether to fork a grandchild process
    grandchildHeedsSIGINT: boolean; // whether grandchild heeds SIGINT
    messages: object|null; // messages argument for nodeCleanup()
    exception: boolean; // whether to throw an uncaught exception
    skipTermination: boolean; // true => cleanup handler returns false
    exitReturn: 'true'|'undefined'; // value that cleanup handler should
        // return to indicate whether the process should exit
    maxDuration: number; // max duration of process in millisecs
}

exitReturn indicates the type of value that the cleanup handler returns to indicate whether the process should exit on SIGINT. Ideally, the handler would always return a boolean, but for backwards compatibility, for compatibility with the Stackoverflow solution, and to allow programmers some room for laziness when there are no child processes, an undefined return value also indicates 'true'.

This process implements the WCE solution described for SIGINT at https://www.cons.org/cracauer/sigint.html. That is, the process ignores a SIGINT received while a nested process is running, but sends a SIGINT to itself after a nested process terminates with SIGINT. SIGQUIT is not handled this way because it is not expected that child processes would override and ignore it.

The process writes behavioral results to stdout for comparison with expectations. The output includes space-delimited strings from the following list, ordered in the string by their order of occurrence:

    cleanup - child's cleanup handler was called and performed cleanup
    skipped_cleanup - child's cleanup handler was called for SIGINT but
        did not perform cleanup because a child was running.
    grandchild=<reason> - grandchild exited for the given reason, which is
        either an integer exit code or the string name of a signal

The process also writes to stderr for comparison with expectations.
******************************************************************************/

//// MODULES //////////////////////////////////////////////////////////////////

var path = require('path');
var fork = require('child_process').fork;
var nodeCleanup = require('../../');

//// CONFIGURATION ////////////////////////////////////////////////////////////

var config = JSON.parse(process.argv[2]);
var grandchildFile = path.resolve(__dirname, "./grandchild.js");
var grandchildMaxDuration = Math.round(config.maxDuration*0.5);

//// STATE ////////////////////////////////////////////////////////////////////

var grandchild = null;

//// MAIN /////////////////////////////////////////////////////////////////////

nodeCleanup(function (exitCode, signal) {
    var reason = (exitCode !== null ? exitCode : signal);
    if (grandchild !== null && reason === 'SIGINT') {
        process.stdout.write('skipped_cleanup ');
        return false;
    }
    process.stdout.write('cleanup ');
    if (config.skipTermination) {
        nodeCleanup.uninstall(); // don't cleanup again
        return false;
    }
    if (config.exitReturn === 'true')
        return true;
}, config.messages);

setTimeout(function () {
    // disconnect IPC so can exit when stdout, stderr,
    // child processes, and other resources complete.
    process.disconnect();
    if (config.exception)
        throw new Error("unexpected exception");
    process.exit(0);
}, config.maxDuration);

if (config.grandchild) {
    grandchild = fork(grandchildFile, [
        config.grandchildHeedsSIGINT,
        grandchildMaxDuration
    ]);
    grandchild.on('message', function (msg) {
        if (msg === 'ready')
            process.send('ready');
    });
    grandchild.on('exit', function (exitCode, signal) {
        grandchild = null; // allow process to heed forthcoming SIGINT
        process.stdout.write('grandchild='+
                (exitCode !== null ? exitCode : signal) +' ');
        if (signal === 'SIGINT')
            process.kill(process.pid, signal);
    });
}
else
    process.send('ready');
