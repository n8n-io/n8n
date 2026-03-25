"use strict";

const { parseArgsStringToArgv } = require("string-argv");  // possible alternative: parse-spawn-args
const detectType = require("type-detect");

module.exports = normalizeArgs;

/**
 * This function normalizes the arguments of the {@link sync} and {@link async}
 * so they can be passed to Node's {@link child_process.spawn} or
 * {@link child_process.spawn} functions.
 *
 * @param {string|string[]} command
 * The command to run (e.g. "git"), or the command and its arguments as a string
 * (e.g. "git commit -a -m fixed_stuff"), or the command and its arguments as an
 * array (e.g. ["git", "commit", "-a", "-m", "fixed stuff"]).
 *
 * @param {string|string[]} [args]
 * The command arguments as a string (e.g. "git commit -a -m fixed_stuff") or as an array
 * (e.g. ["git", "commit", "-a", "-m", "fixed stuff"]).
 *
 * @param {object} [options]
 * The same options as {@link child_process.spawn} or {@link child_process.spawnSync}.
 *
 * @param {function} [callback]
 * The callback that will receive the results, if applicable.
 *
 * @returns {object}
 */
function normalizeArgs (params) {
  let command, args, options, callback, error;

  try {
    // Shift the arguments, if necessary
    ({ command, args, options, callback } = shiftArgs(params));

    let commandArgs = [];

    if (typeof command === "string" && args === undefined) {
      // The command parameter is actually the command AND arguments,
      // so split the string into an array
      command = splitArgString(command);
    }

    if (Array.isArray(command)) {
      // Split the command from the arguments
      commandArgs = command.slice(1);
      command = command[0];
    }

    if (typeof args === "string") {
      // Convert the `args` argument from a string an array
      args = splitArgString(args);
    }

    if (Array.isArray(args)) {
      // Add these arguments to any arguments from above
      args = commandArgs.concat(args);
    }

    if (args === undefined || args === null) {
      args = commandArgs;
    }

    if (options === undefined || options === null) {
      options = {};
    }

    // Set default options
    options.encoding = options.encoding || "utf8";

    // Validate all arguments
    validateArgs(command, args, options, callback);
  }
  catch (err) {
    error = err;

    // Sanitize args that are used as output
    command = String(command || "");
    args = (Array.isArray(args) ? args : []).map((arg) => String(arg || ""));
  }

  return { command, args, options, callback, error };
}

/**
 * Detects whether any optional arguments have been omitted,
 * and shifts the other arguments as needed.
 *
 * @param {string|string[]} command
 * @param {string|string[]} [args]
 * @param {object} [options]
 * @param {function} [callback]
 * @returns {object}
 */
function shiftArgs (params) {
  params = Array.prototype.slice.call(params);
  let command, args, options, callback;

  // Check for a callback as the final parameter
  let lastParam = params[params.length - 1];
  if (typeof lastParam === "function") {
    callback = lastParam;
    params.pop();
  }

  // Check for an options object as the second-to-last parameter
  lastParam = params[params.length - 1];
  if (lastParam === null || lastParam === undefined ||
  (typeof lastParam === "object" && !Array.isArray(lastParam))) {
    options = lastParam;
    params.pop();
  }

  // The first parameter is the command
  command = params.shift();

  // All remaining parameters are the args
  if (params.length === 0) {
    args = undefined;
  }
  else if (params.length === 1 && Array.isArray(params[0])) {
    args = params[0];
  }
  else if (params.length === 1 && params[0] === "") {
    args = [];
  }
  else {
    args = params;
  }

  return { command, args, options, callback };
}

/**
 * Validates all arguments, and throws an error if any are invalid.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 * @param {function} [callback]
 */
function validateArgs (command, args, options, callback) {
  if (command === undefined || command === null) {
    throw new Error("The command to execute is missing.");
  }

  if (typeof command !== "string") {
    throw new Error("The command to execute should be a string, not " + friendlyType(command));
  }

  if (!Array.isArray(args)) {
    throw new Error(
      "The command arguments should be a string or an array, not " +
      friendlyType(args)
    );
  }

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];

    if (typeof arg !== "string") {
      throw new Error(
        `The command arguments should be strings, but argument #${i + 1} is ` +
        friendlyType(arg)
      );
    }
  }

  if (typeof options !== "object") {
    throw new Error(
      "The options should be an object, not " +
      friendlyType(options)
    );
  }

  if (callback !== undefined && callback !== null) {
    if (typeof callback !== "function") {
      throw new Error("The callback should be a function, not " + friendlyType(callback));
    }
  }
}

/**
 * Splits an argument string (e.g. git commit -a -m "fixed stuff")
 * into an array (e.g. ["git", "commit", "-a", "-m", "fixed stuff"]).
 *
 * @param {string} argString
 * @returns {string[]}
 */
function splitArgString (argString) {
  try {
    return parseArgsStringToArgv(argString);
  }
  catch (error) {
    throw new Error(`Could not parse the string: ${argString}\n${error.message}`);
  }
}

/**
 * Returns the friendly type name of the given value, for use in error messages.
 *
 * @param {*} val
 * @returns {string}
 */
function friendlyType (val) {
  let type = detectType(val);
  let firstChar = String(type)[0].toLowerCase();

  if (["a", "e", "i", "o", "u"].indexOf(firstChar) === -1) {
    return `a ${type}.`;
  }
  else {
    return `an ${type}.`;
  }
}
