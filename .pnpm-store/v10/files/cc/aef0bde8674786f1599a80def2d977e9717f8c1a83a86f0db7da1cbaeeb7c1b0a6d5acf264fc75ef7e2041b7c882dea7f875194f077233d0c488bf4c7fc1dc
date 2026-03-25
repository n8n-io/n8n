"use strict";

/**
 * An instance of this class is returned by {@link sync} and {@link async}.
 * It contains information about how the process was spawned, how it exited, and its output.
 */
module.exports = class Process {
  /**
   * @param {object} props - Initial property values
   */
  constructor ({ command, args, pid, stdout, stderr, output, status, signal, options }) {
    options = options || {};
    stdout = stdout || (options.encoding === "buffer" ? Buffer.from([]) : "");
    stderr = stderr || (options.encoding === "buffer" ? Buffer.from([]) : "");
    output = output || [options.input || null, stdout, stderr];

    /**
     * The command that was used to spawn the process
     *
     * @type {string}
     */
    this.command = command || "";

    /**
     * The command-line arguments that were passed to the process.
     *
     * @type {string[]}
     */
    this.args = args || [];

    /**
     * The numeric process ID assigned by the operating system
     *
     * @type {number}
     */
    this.pid = pid || 0;

    /**
     * The process's standard output
     *
     * @type {Buffer|string}
     */

    this.stdout = output[1];

    /**
     * The process's error output
     *
     * @type {Buffer|string}
     */
    this.stderr = output[2];

    /**
     * The process's stdio [stdin, stdout, stderr]
     *
     * @type {Buffer[]|string[]}
     */
    this.output = output;

    /**
     * The process's status code
     *
     * @type {number}
     */
    this.status = status;

    /**
     * The signal used to kill the process, if applicable
     *
     * @type {string}
     */
    this.signal = signal || null;
  }

  /**
   * Returns the full command and arguments used to spawn the process
   *
   * @type {string}
   */
  toString () {
    let string = this.command;

    for (let arg of this.args) {
      // Escape quotes
      arg = arg.replace(/"/g, '\\"');

      if (arg.indexOf(" ") >= 0) {
        // Add quotes if the arg contains whitespace
        string += ` "${arg}"`;
      }
      else {
        string += ` ${arg}`;
      }
    }

    return string;
  }
};
