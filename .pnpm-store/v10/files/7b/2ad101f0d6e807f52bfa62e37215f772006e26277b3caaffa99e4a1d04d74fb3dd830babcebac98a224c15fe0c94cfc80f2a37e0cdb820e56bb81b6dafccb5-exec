#!/usr/bin/env node

/******************************************************************************
Child process that installs node-cleanup for testing zero, one, or multiple (two) concurrent cleanup handlers. It accepts a single argument of serialized JSON having the following (FlowType) structure:

{
    handlers; number; // 0, 1, or 2 concurrent cleanup handlers
    messages0: object|null; // messages argument for no-cleanup call, if any
    messages1: object|null; // messages argument for 1st nodeCleanup() call
    messages2: object|null; // messages argument for 2nd nodeCleanup() call
    return1: boolean; // return value of 1st cleanup handler
    return2: boolean; // return value of 2nd cleanup handler
    uninstall: boolean; // whether to uninstall handlers before test
    maxDuration: number; // max duration of process in millisecs
}

The process writes behavioral results to stdout for comparison with expectations. The output includes space-delimited strings from the following list, ordered in the string by their order of occurrence:

    cleanup1 - the first cleanup handler ran
    cleanup2 - the second cleanup handler ran

The process also writes to stderr for comparison with expectations.
******************************************************************************/

//// MODULES //////////////////////////////////////////////////////////////////

var nodeCleanup = require('../../');

//// CONFIGURATION ////////////////////////////////////////////////////////////

var config = JSON.parse(process.argv[2]);

//// CLEANUP HANDLERS /////////////////////////////////////////////////////////

function cleanup1(exitCode, signal) {
    process.stdout.write('cleanup1 ');
    if (!config.return1)
        nodeCleanup.uninstall(); // don't cleanup again
    return config.return1;
}

function cleanup2(exitCode, signal) {
    process.stdout.write('cleanup2 ');
    if (!config.return2)
        nodeCleanup.uninstall(); // don't cleanup again
    return config.return2;
}

//// MAIN /////////////////////////////////////////////////////////////////////

if (config.handlers === 0) {
    if (config.messages0)
        nodeCleanup(config.messages0);
    else
        nodeCleanup();
}
else {
    nodeCleanup(cleanup1, config.messages1);
    if (config.handlers > 1)
        nodeCleanup(cleanup2, config.messages2);
}

if (config.uninstall)
    nodeCleanup.uninstall();

setTimeout(function () {
    // disconnect IPC so can exit when stdout, stderr,
    // child processes, and other resources complete.
    process.disconnect();
    if (config.exception)
        throw new Error("unexpected exception");
    process.exit(0);
}, config.maxDuration);

process.send('ready');
