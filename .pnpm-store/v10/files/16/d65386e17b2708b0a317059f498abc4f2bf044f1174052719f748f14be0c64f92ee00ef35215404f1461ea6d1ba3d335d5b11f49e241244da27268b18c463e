"use strict";

/**
 * An instance of this class is returned by {@link sync} and {@link async} when the process exits
 * with a non-zero status code.
 */
module.exports = class ProcessError extends Error {
  constructor (process) {
    let message = `${process.toString()} exited with a status of ${process.status}.`;

    if (process.stderr.length > 0) {
      message += "\n\n" + process.stderr.toString().trim();
    }

    super(message);
    Object.assign(this, process);
    this.name = ProcessError.name;
  }
};
