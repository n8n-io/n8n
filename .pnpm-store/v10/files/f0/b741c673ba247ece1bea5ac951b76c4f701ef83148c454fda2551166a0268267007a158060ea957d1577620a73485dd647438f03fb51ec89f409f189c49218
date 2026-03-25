"use strict";

const Process = require("./process");
const ProcessError = require("./process-error");

module.exports = normalizeResult;

/**
 * @param {string} [command] - The command used to run the process
 * @param {string[]} [args] - The command-line arguments that were passed to the process
 * @param {number} [pid] - The process ID
 * @param {string|Buffer} [stdout] - The process's stdout
 * @param {string|Buffer} [stderr] - The process's stderr
 * @param {string[]|Buffer[]} [output] - The process's stdio
 * @param {number} [status] - The process's status code
 * @param {string} [signal] - The signal that was used to kill the process, if any
 * @param {object} [options] - The options used to run the process
 * @param {Error} [error] - An error, if one occurred
 * @returns {Process}
 */
function normalizeResult ({ command, args, pid, stdout, stderr, output, status, signal, options, error }) {
  let process = new Process({ command, args, pid, stdout, stderr, output, status, signal, options });

  if (error) {
    if (process.status === undefined) {
      process.status = null;
    }
    throw Object.assign(error, process);
  }
  else if (process.status) {
    throw new ProcessError(process);
  }
  else {
    return process;
  }
}
