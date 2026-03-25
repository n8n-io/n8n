#!/usr/bin/env node

/******************************************************************************
Grandchild process used to test process group signals. It conditionally ignores SIGINTs in order to emulate programs that catch and discard them.
******************************************************************************/

var heedSignal = (process.argv[2] === 'true');
var waitMillis = parseInt(process.argv[3]);

if (!heedSignal) {
    process.on('SIGINT', function () {
        // ignore it
    });
}

setTimeout(function () {
    // disconnect IPC so can exit when stdout, stderr,
    // child processes, and other resources complete.
    process.disconnect();
    process.exit(0);
}, waitMillis);

process.send('ready');
