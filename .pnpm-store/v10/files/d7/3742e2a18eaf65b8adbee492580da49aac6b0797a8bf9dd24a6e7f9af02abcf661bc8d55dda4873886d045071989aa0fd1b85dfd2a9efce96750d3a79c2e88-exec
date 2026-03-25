/******************************************************************************
Library of functions for running child processes.
******************************************************************************/

//// MODULES //////////////////////////////////////////////////////////////////

var MemoryStream = require('memory-streams').WritableStream;
var path = require('path');
var spawn = require('child_process').spawn;

//// PUBLIC CONSTANTS /////////////////////////////////////////////////////////

exports.DEFAULT_SIGINT_OUT = "[ctrl-C]\n";
exports.DEFAULT_EXCEPTION_OUT = /^Uncaught exception\.\.\./;

//// PRIVATE CONSTANTS ////////////////////////////////////////////////////////

var MAX_DURATION = 250; // max duration of child process in millisecs

var childEnv = {};
Object.keys(process.env).forEach(function (key) {
    childEnv[key] = process.env[key];
});
var childOptions = {
    env: childEnv,
    stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
    detached: true
};

//// FUNCTIONS ////////////////////////////////////////////////////////////////

/**
 * Launch a child process that uses nodeCleanup(), performing an action once the child is running, and provide the results of the run when the child exits. The child runs in a new process group, separate from the test process, so that the caller may signal the group as a whole.
 *
 * @param config Child process configuration. See the description of this structure in the comments of tests/bin/child.js.
 * @param action A callback function(childPID) that may send signals to the child or the child's process group (-childPID). Must be synchronous.
 * @param done A callback function(reason, stdoutString, stderrString) providing the output of the child. This callback should test this output against expectations. reason is the exit code, unless the process was terminated by a signal, in which case it is the string name of the signal.
 */

exports.launch = function (config, action, done)
{
    config.maxDuration = MAX_DURATION;
    var childPath = path.resolve(__dirname, "../bin/"+ config.child +".js");
    var childArgs = [ childPath, JSON.stringify(config) ];
    var child = spawn(process.execPath, childArgs, childOptions);
    var stdoutStream = new MemoryStream();
    var stderrStream = new MemoryStream();
    child.stdout.pipe(stdoutStream);
    child.stderr.pipe(stderrStream);
        
    child.on('message', function (msg) {
        if (msg === 'ready')
            action(child.pid);
    });
    
    child.on('exit', function (exitCode, signal) {
        done((exitCode !== null ? exitCode : signal),
                stdoutStream.toString(), stderrStream.toString());
    });
};

/**
 * Shorthand function for launching a process, optionally sending a signal to it, and testing the resulting output. It calls t.equal() or t.match() on each of the expected results, depending on whether it is a string or a regular expression, and then t.end() to complete the test.
 *
 * @param t tap test instance
 * @param config See launch() config.
 * @param action See launch() action.
 * @param expectedResults A structure of the form {exitCode, stdout, stderr} containing the expected output of the test. exitCode is an integer. stdout and stderr are strings or regular expressions. stdout is compared against the result trimmed of preceding and trailing whitespace. When stdout or stderr is a string, it is tested for being identical with the actual result.
 */

exports.test = function (t, config, action, expectedResults)
{
    exports.launch(config, action, function (reason, stdout, stderr) {
        t.equal(reason, expectedResults.exitReason, "exit reason");
        
        stdout = stdout.trim();
        if (typeof expectedResults.stdout === 'string')
            t.equal(stdout, expectedResults.stdout, "stdout");
        else
            t.match(stdout, expectedResults.stdout, "stdout");
            
        if (typeof expectedResults.stderr === 'string')
            t.equal(stderr, expectedResults.stderr, "stderr");
        else
            t.match(stderr, expectedResults.stderr, "stderr");
        t.end();
    });
};
