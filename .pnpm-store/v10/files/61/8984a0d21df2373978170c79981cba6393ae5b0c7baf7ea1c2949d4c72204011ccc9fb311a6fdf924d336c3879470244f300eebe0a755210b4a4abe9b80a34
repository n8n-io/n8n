"use strict";

const normalizeArgs = require("./normalize-args");
const normalizeResult = require("./normalize-result");
const maybe = require("call-me-maybe");
const spawn = require("cross-spawn");

module.exports = async;

/**
 * Executes the given command asynchronously, and returns the buffered
 * results via a callback or Promise.
 *
 * @param {string|string[]} command - The command to run
 * @param {string|string[]} [args] - The command arguments
 * @param {object} [options] - options
 * @param {function} [callback] - callback that will receive the results
 *
 * @returns {Promise<Process>|undefined}
 * Returns a Promise if no callback is given. The promise resolves with
 * a {@link Process} object.
 *
 * @see {@link normalizeArgs} for argument details
 */
function async () {
  // Normalize the function arguments
  let { command, args, options, callback, error } = normalizeArgs(arguments);

  return maybe(callback, new Promise((resolve, reject) => {
    if (error) {
      // Invalid arguments
      normalizeResult({ command, args, options, error });
    }
    else {
      let spawnedProcess;

      try {
        // Spawn the program
        spawnedProcess = spawn(command, args, options);
      }
      catch (error) {
        // An error occurred while spawning the process
        normalizeResult({ error, command, args, options });
      }

      let pid = spawnedProcess.pid;
      let stdout = options.encoding === "buffer" ? Buffer.from([]) : "";
      let stderr = options.encoding === "buffer" ? Buffer.from([]) : "";

      spawnedProcess.stdout && spawnedProcess.stdout.on("data", (data) => {
        if (typeof stdout === "string") {
          stdout += data.toString();
        }
        else {
          stdout = Buffer.concat([stdout, data]);
        }
      });

      spawnedProcess.stderr && spawnedProcess.stderr.on("data", (data) => {
        if (typeof stderr === "string") {
          stderr += data.toString();
        }
        else {
          stderr = Buffer.concat([stderr, data]);
        }
      });

      spawnedProcess.on("error", (error) => {
        try {
          normalizeResult({ error, command, args, options, pid, stdout, stderr });
        }
        catch (error) {
          reject(error);
        }
      });

      spawnedProcess.on("exit", (status, signal) => {
        try {
          resolve(normalizeResult({ command, args, options, pid, stdout, stderr, status, signal }));
        }
        catch (error) {
          reject(error);
        }
      });
    }
  }));
}
