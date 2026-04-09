/*
 * Jake JavaScript build tool
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

let parseargs = {};
let isOpt = function (arg) { return arg.indexOf('-') === 0; };
let removeOptPrefix = function (opt) { return opt.replace(/^--/, '').replace(/^-/, ''); };

/**
 * @constructor
 * Parses a list of command-line args into a key/value object of
 * options and an array of positional commands.
 * @ param {Array} opts A list of options in the following format:
 * [{full: 'foo', abbr: 'f'}, {full: 'bar', abbr: 'b'}]]
 */
parseargs.Parser = function (opts) {
  // A key/value object of matching options parsed out of the args
  this.opts = {};
  this.taskNames = null;
  this.envVars = null;

  // Data structures used for parsing
  this.reg = opts;
  this.shortOpts = {};
  this.longOpts = {};

  let self = this;
  [].forEach.call(opts, function (item) {
    self.shortOpts[item.abbr] = item;
    self.longOpts[item.full] = item;
  });
};

parseargs.Parser.prototype = new function () {

  let _trueOrNextVal = function (argParts, args) {
    if (argParts[1]) {
      return argParts[1];
    }
    else {
      return (!args[0] || isOpt(args[0])) ?
        true : args.shift();
    }
  };

  /**
   * Parses an array of arguments into options and positional commands
   * @param {Array} args The command-line args to parse
   */
  this.parse = function (args) {
    let cmds = [];
    let cmd;
    let envVars = {};
    let opts = {};
    let arg;
    let argItem;
    let argParts;
    let cmdItems;
    let taskNames = [];
    let preempt;

    while (args.length) {
      arg = args.shift();

      if (isOpt(arg)) {
        arg = removeOptPrefix(arg);
        argParts = arg.split('=');
        argItem = this.longOpts[argParts[0]] || this.shortOpts[argParts[0]];
        if (argItem) {
          // First-encountered preemptive opt takes precedence -- no further opts
          // or possibility of ambiguity, so just look for a value, or set to
          // true and then bail
          if (argItem.preempts) {
            opts[argItem.full] = _trueOrNextVal(argParts, args);
            preempt = true;
            break;
          }
          // If the opt requires a value, see if we can get a value from the
          // next arg, or infer true from no-arg -- if it's followed by another
          // opt, throw an error
          if (argItem.expectValue || argItem.allowValue) {
            opts[argItem.full] = _trueOrNextVal(argParts, args);
            if (argItem.expectValue && !opts[argItem.full]) {
              throw new Error(argItem.full + ' option expects a value.');
            }
          }
          else {
            opts[argItem.full] = true;
          }
        }
      }
      else {
        cmds.unshift(arg);
      }
    }

    if (!preempt) {
      // Parse out any env-vars and task-name
      while ((cmd = cmds.pop())) {
        cmdItems = cmd.split('=');
        if (cmdItems.length > 1) {
          envVars[cmdItems[0]] = cmdItems[1];
        }
        else {
          taskNames.push(cmd);
        }
      }

    }

    return {
      opts: opts,
      envVars: envVars,
      taskNames: taskNames
    };
  };

};

module.exports = parseargs;
