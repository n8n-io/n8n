'use strict';

var spawn = require('child_process').spawn;

function stripStderr(stderr) {
  if (!stderr) return;
  stderr = stderr.trim();
  // Strip bogus screen size error.
  // See https://github.com/microsoft/vscode/issues/98590
  var regex = /your \d+x\d+ screen size is bogus\. expect trouble/gi;
  stderr = stderr.replace(regex, '');

  return stderr.trim();
}

/**
 * Spawn a binary and read its stdout.
 * @param  {String} cmd The name of the binary to spawn.
 * @param  {String[]} args The arguments for the binary.
 * @param  {Object} [options] Optional option for the spawn function.
 * @param  {Function} done(err, stdout)
 */
function run(cmd, args, options, done) {
  if (typeof options === 'function') {
    done = options;
    options = undefined;
  }

  var executed = false;
  var ch = spawn(cmd, args, options);
  var stdout = '';
  var stderr = '';

  ch.stdout.on('data', function(d) {
    stdout += d.toString();
  });

  ch.stderr.on('data', function(d) {
    stderr += d.toString();
  });

  ch.on('error', function(err) {
    if (executed) return;
    executed = true;
    done(new Error(err));
  });

  ch.on('close', function(code) {
    if (executed) return;
    executed = true;

    stderr = stripStderr(stderr);
    if (stderr) {
      return done(new Error(stderr));
    }

    done(null, stdout, code);
  });
}

module.exports = run;
