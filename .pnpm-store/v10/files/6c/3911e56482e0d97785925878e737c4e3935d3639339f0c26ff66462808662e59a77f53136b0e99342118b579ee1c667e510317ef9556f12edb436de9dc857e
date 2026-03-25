import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  version
} from "../_node-chunks/chunk-YJM63TNA.js";
import {
  globalSettings
} from "../_node-chunks/chunk-EQLFU5BD.js";
import "../_node-chunks/chunk-NKSLKQ5F.js";
import {
  require_dist
} from "../_node-chunks/chunk-SLZHVDN6.js";
import {
  require_picocolors
} from "../_node-chunks/chunk-LE232J7F.js";
import {
  __commonJS,
  __require,
  __toESM
} from "../_node-chunks/chunk-DRM3MJ7Y.js";

// ../node_modules/commander/lib/error.js
var require_error = __commonJS({
  "../node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message), Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name, this.code = code, this.exitCode = exitCode, this.nestedError = void 0;
      }
    }, InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message), Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// ../node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "../node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error(), Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        switch (this.description = description || "", this.variadic = !1, this.parseArg = void 0, this.defaultValue = void 0, this.defaultValueDescription = void 0, this.argChoices = void 0, name[0]) {
          case "<":
            this.required = !0, this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = !1, this._name = name.slice(1, -1);
            break;
          default:
            this.required = !0, this._name = name;
            break;
        }
        this._name.endsWith("...") && (this.variadic = !0, this._name = this._name.slice(0, -3));
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        return previous === this.defaultValue || !Array.isArray(previous) ? [value] : (previous.push(value), previous);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        return this.defaultValue = value, this.defaultValueDescription = description, this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        return this.parseArg = fn, this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        return this.argChoices = values.slice(), this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg))
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          return this.variadic ? this._collectValue(arg, previous) : arg;
        }, this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        return this.required = !0, this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        return this.required = !1, this;
      }
    };
    function humanReadableArgName(arg) {
      let nameOutput = arg.name() + (arg.variadic === !0 ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// ../node_modules/commander/lib/help.js
var require_help = __commonJS({
  "../node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument(), Help2 = class {
      constructor() {
        this.helpWidth = void 0, this.minWidthToWrap = 40, this.sortSubcommands = !1, this.sortOptions = !1, this.showGlobalOptions = !1;
      }
      /**
       * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
       * and just before calling `formatHelp()`.
       *
       * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
       *
       * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
       */
      prepareContext(contextOptions) {
        this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        let visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden), helpCommand = cmd._getHelpCommand();
        return helpCommand && !helpCommand._hidden && visibleCommands.push(helpCommand), this.sortSubcommands && visibleCommands.sort((a, b) => a.name().localeCompare(b.name())), visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        let getSortKey = (option) => option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        let visibleOptions = cmd.options.filter((option) => !option.hidden), helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          let removeShort = helpOption.short && cmd._findOption(helpOption.short), removeLong = helpOption.long && cmd._findOption(helpOption.long);
          !removeShort && !removeLong ? visibleOptions.push(helpOption) : helpOption.long && !removeLong ? visibleOptions.push(
            cmd.createOption(helpOption.long, helpOption.description)
          ) : helpOption.short && !removeShort && visibleOptions.push(
            cmd.createOption(helpOption.short, helpOption.description)
          );
        }
        return this.sortOptions && visibleOptions.sort(this.compareOptions), visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        let globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          let visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        return this.sortOptions && globalOptions.sort(this.compareOptions), globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        return cmd._argsDescription && cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        }), cmd.registeredArguments.find((argument) => argument.description) ? cmd.registeredArguments : [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        let args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command2) => Math.max(
          max,
          this.displayWidth(
            helper.styleSubcommandTerm(helper.subcommandTerm(command2))
          )
        ), 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => Math.max(
          max,
          this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
        ), 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => Math.max(
          max,
          this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
        ), 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => Math.max(
          max,
          this.displayWidth(
            helper.styleArgumentTerm(helper.argumentTerm(argument))
          )
        ), 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        cmd._aliases[0] && (cmdName = cmdName + "|" + cmd._aliases[0]);
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent)
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        let extraInfo = [];
        if (option.argChoices && extraInfo.push(
          // use stringify to match the display of the default value
          `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
        ), option.defaultValue !== void 0 && (option.required || option.optional || option.isBoolean() && typeof option.defaultValue == "boolean") && extraInfo.push(
          `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
        ), option.presetArg !== void 0 && option.optional && extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`), option.envVar !== void 0 && extraInfo.push(`env: ${option.envVar}`), extraInfo.length > 0) {
          let extraDescription = `(${extraInfo.join(", ")})`;
          return option.description ? `${option.description} ${extraDescription}` : extraDescription;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        let extraInfo = [];
        if (argument.argChoices && extraInfo.push(
          // use stringify to match the display of the default value
          `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
        ), argument.defaultValue !== void 0 && extraInfo.push(
          `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
        ), extraInfo.length > 0) {
          let extraDescription = `(${extraInfo.join(", ")})`;
          return argument.description ? `${argument.description} ${extraDescription}` : extraDescription;
        }
        return argument.description;
      }
      /**
       * Format a list of items, given a heading and an array of formatted items.
       *
       * @param {string} heading
       * @param {string[]} items
       * @param {Help} helper
       * @returns string[]
       */
      formatItemList(heading, items, helper) {
        return items.length === 0 ? [] : [helper.styleTitle(heading), ...items, ""];
      }
      /**
       * Group items by their help group heading.
       *
       * @param {Command[] | Option[]} unsortedItems
       * @param {Command[] | Option[]} visibleItems
       * @param {Function} getGroup
       * @returns {Map<string, Command[] | Option[]>}
       */
      groupItems(unsortedItems, visibleItems, getGroup) {
        let result = /* @__PURE__ */ new Map();
        return unsortedItems.forEach((item) => {
          let group = getGroup(item);
          result.has(group) || result.set(group, []);
        }), visibleItems.forEach((item) => {
          let group = getGroup(item);
          result.has(group) || result.set(group, []), result.get(group).push(item);
        }), result;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        let termWidth = helper.padWidth(cmd, helper), helpWidth = helper.helpWidth ?? 80;
        function callFormatItem(term, description) {
          return helper.formatItem(term, termWidth, description, helper);
        }
        let output = [
          `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
          ""
        ], commandDescription = helper.commandDescription(cmd);
        commandDescription.length > 0 && (output = output.concat([
          helper.boxWrap(
            helper.styleCommandDescription(commandDescription),
            helpWidth
          ),
          ""
        ]));
        let argumentList = helper.visibleArguments(cmd).map((argument) => callFormatItem(
          helper.styleArgumentTerm(helper.argumentTerm(argument)),
          helper.styleArgumentDescription(helper.argumentDescription(argument))
        ));
        if (output = output.concat(
          this.formatItemList("Arguments:", argumentList, helper)
        ), this.groupItems(
          cmd.options,
          helper.visibleOptions(cmd),
          (option) => option.helpGroupHeading ?? "Options:"
        ).forEach((options, group) => {
          let optionList = options.map((option) => callFormatItem(
            helper.styleOptionTerm(helper.optionTerm(option)),
            helper.styleOptionDescription(helper.optionDescription(option))
          ));
          output = output.concat(this.formatItemList(group, optionList, helper));
        }), helper.showGlobalOptions) {
          let globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => callFormatItem(
            helper.styleOptionTerm(helper.optionTerm(option)),
            helper.styleOptionDescription(helper.optionDescription(option))
          ));
          output = output.concat(
            this.formatItemList("Global Options:", globalOptionList, helper)
          );
        }
        return this.groupItems(
          cmd.commands,
          helper.visibleCommands(cmd),
          (sub) => sub.helpGroup() || "Commands:"
        ).forEach((commands, group) => {
          let commandList = commands.map((sub) => callFormatItem(
            helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
            helper.styleSubcommandDescription(helper.subcommandDescription(sub))
          ));
          output = output.concat(this.formatItemList(group, commandList, helper));
        }), output.join(`
`);
      }
      /**
       * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
       *
       * @param {string} str
       * @returns {number}
       */
      displayWidth(str) {
        return stripColor(str).length;
      }
      /**
       * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
       *
       * @param {string} str
       * @returns {string}
       */
      styleTitle(str) {
        return str;
      }
      styleUsage(str) {
        return str.split(" ").map((word) => word === "[options]" ? this.styleOptionText(word) : word === "[command]" ? this.styleSubcommandText(word) : word[0] === "[" || word[0] === "<" ? this.styleArgumentText(word) : this.styleCommandText(word)).join(" ");
      }
      styleCommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleOptionDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleSubcommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleArgumentDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleDescriptionText(str) {
        return str;
      }
      styleOptionTerm(str) {
        return this.styleOptionText(str);
      }
      styleSubcommandTerm(str) {
        return str.split(" ").map((word) => word === "[options]" ? this.styleOptionText(word) : word[0] === "[" || word[0] === "<" ? this.styleArgumentText(word) : this.styleSubcommandText(word)).join(" ");
      }
      styleArgumentTerm(str) {
        return this.styleArgumentText(str);
      }
      styleOptionText(str) {
        return str;
      }
      styleArgumentText(str) {
        return str;
      }
      styleSubcommandText(str) {
        return str;
      }
      styleCommandText(str) {
        return str;
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
       *
       * @param {string} str
       * @returns {boolean}
       */
      preformatted(str) {
        return /\n[^\S\r\n]/.test(str);
      }
      /**
       * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
       *
       * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
       *   TTT  DDD DDDD
       *        DD DDD
       *
       * @param {string} term
       * @param {number} termWidth
       * @param {string} description
       * @param {Help} helper
       * @returns {string}
       */
      formatItem(term, termWidth, description, helper) {
        let itemIndentStr = " ".repeat(2);
        if (!description) return itemIndentStr + term;
        let paddedTerm = term.padEnd(
          termWidth + term.length - helper.displayWidth(term)
        ), spacerWidth = 2, remainingWidth = (this.helpWidth ?? 80) - termWidth - spacerWidth - 2, formattedDescription;
        return remainingWidth < this.minWidthToWrap || helper.preformatted(description) ? formattedDescription = description : formattedDescription = helper.boxWrap(description, remainingWidth).replace(
          /\n/g,
          `
` + " ".repeat(termWidth + spacerWidth)
        ), itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
      }
      /**
       * Wrap a string at whitespace, preserving existing line breaks.
       * Wrapping is skipped if the width is less than `minWidthToWrap`.
       *
       * @param {string} str
       * @param {number} width
       * @returns {string}
       */
      boxWrap(str, width) {
        if (width < this.minWidthToWrap) return str;
        let rawLines = str.split(/\r\n|\n/), chunkPattern = /[\s]*[^\s]+/g, wrappedLines = [];
        return rawLines.forEach((line) => {
          let chunks = line.match(chunkPattern);
          if (chunks === null) {
            wrappedLines.push("");
            return;
          }
          let sumChunks = [chunks.shift()], sumWidth = this.displayWidth(sumChunks[0]);
          chunks.forEach((chunk) => {
            let visibleWidth = this.displayWidth(chunk);
            if (sumWidth + visibleWidth <= width) {
              sumChunks.push(chunk), sumWidth += visibleWidth;
              return;
            }
            wrappedLines.push(sumChunks.join(""));
            let nextChunk = chunk.trimStart();
            sumChunks = [nextChunk], sumWidth = this.displayWidth(nextChunk);
          }), wrappedLines.push(sumChunks.join(""));
        }), wrappedLines.join(`
`);
      }
    };
    function stripColor(str) {
      let sgrPattern = /\x1b\[\d*(;\d*)*m/g;
      return str.replace(sgrPattern, "");
    }
    exports.Help = Help2;
    exports.stripColor = stripColor;
  }
});

// ../node_modules/commander/lib/option.js
var require_option = __commonJS({
  "../node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error(), Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags, this.description = description || "", this.required = flags.includes("<"), this.optional = flags.includes("["), this.variadic = /\w\.\.\.[>\]]$/.test(flags), this.mandatory = !1;
        let optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag, this.long = optionFlags.longFlag, this.negate = !1, this.long && (this.negate = this.long.startsWith("--no-")), this.defaultValue = void 0, this.defaultValueDescription = void 0, this.presetArg = void 0, this.envVar = void 0, this.parseArg = void 0, this.hidden = !1, this.argChoices = void 0, this.conflictsWith = [], this.implied = void 0, this.helpGroupHeading = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        return this.defaultValue = value, this.defaultValueDescription = description, this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        return this.presetArg = arg, this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        return this.conflictsWith = this.conflictsWith.concat(names), this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        return typeof impliedOptionValues == "string" && (newImplied = { [impliedOptionValues]: !0 }), this.implied = Object.assign(this.implied || {}, newImplied), this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        return this.envVar = name, this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        return this.parseArg = fn, this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = !0) {
        return this.mandatory = !!mandatory, this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = !0) {
        return this.hidden = !!hide, this;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        return previous === this.defaultValue || !Array.isArray(previous) ? [value] : (previous.push(value), previous);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        return this.argChoices = values.slice(), this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg))
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          return this.variadic ? this._collectValue(arg, previous) : arg;
        }, this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        return this.long ? this.long.replace(/^--/, "") : this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as an object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        return this.negate ? camelcase(this.name().replace(/^no-/, "")) : camelcase(this.name());
      }
      /**
       * Set the help group heading.
       *
       * @param {string} heading
       * @return {Option}
       */
      helpGroup(heading) {
        return this.helpGroupHeading = heading, this;
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    }, DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map(), this.negativeOptions = /* @__PURE__ */ new Map(), this.dualOptions = /* @__PURE__ */ new Set(), options.forEach((option) => {
          option.negate ? this.negativeOptions.set(option.attributeName(), option) : this.positiveOptions.set(option.attributeName(), option);
        }), this.negativeOptions.forEach((value, key) => {
          this.positiveOptions.has(key) && this.dualOptions.add(key);
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        let optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return !0;
        let preset = this.negativeOptions.get(optionKey).presetArg, negativeValue = preset !== void 0 ? preset : !1;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => str2 + word[0].toUpperCase() + word.slice(1));
    }
    function splitOptionFlags(flags) {
      let shortFlag, longFlag, shortFlagExp = /^-[^-]$/, longFlagExp = /^--[^-]/, flagParts = flags.split(/[ |,]+/).concat("guard");
      if (shortFlagExp.test(flagParts[0]) && (shortFlag = flagParts.shift()), longFlagExp.test(flagParts[0]) && (longFlag = flagParts.shift()), !shortFlag && shortFlagExp.test(flagParts[0]) && (shortFlag = flagParts.shift()), !shortFlag && longFlagExp.test(flagParts[0]) && (shortFlag = longFlag, longFlag = flagParts.shift()), flagParts[0].startsWith("-")) {
        let unsupportedFlag = flagParts[0], baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
        throw /^-[^-][^-]/.test(unsupportedFlag) ? new Error(
          `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
        ) : shortFlagExp.test(unsupportedFlag) ? new Error(`${baseError}
- too many short flags`) : longFlagExp.test(unsupportedFlag) ? new Error(`${baseError}
- too many long flags`) : new Error(`${baseError}
- unrecognised flag format`);
      }
      if (shortFlag === void 0 && longFlag === void 0)
        throw new Error(
          `option creation failed due to no flags found in '${flags}'.`
        );
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// ../node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "../node_modules/commander/lib/suggestSimilar.js"(exports) {
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > 3)
        return Math.max(a.length, b.length);
      let d = [];
      for (let i = 0; i <= a.length; i++)
        d[i] = [i];
      for (let j = 0; j <= b.length; j++)
        d[0][j] = j;
      for (let j = 1; j <= b.length; j++)
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          a[i - 1] === b[j - 1] ? cost = 0 : cost = 1, d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          ), i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && (d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1));
        }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      let searchingOptions = word.startsWith("--");
      searchingOptions && (word = word.slice(2), candidates = candidates.map((candidate) => candidate.slice(2)));
      let similar = [], bestDistance = 3, minSimilarity = 0.4;
      return candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        let distance = editDistance(word, candidate), length = Math.max(word.length, candidate.length);
        (length - distance) / length > minSimilarity && (distance < bestDistance ? (bestDistance = distance, similar = [candidate]) : distance === bestDistance && similar.push(candidate));
      }), similar.sort((a, b) => a.localeCompare(b)), searchingOptions && (similar = similar.map((candidate) => `--${candidate}`)), similar.length > 1 ? `
(Did you mean one of ${similar.join(", ")}?)` : similar.length === 1 ? `
(Did you mean ${similar[0]}?)` : "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// ../node_modules/commander/lib/command.js
var require_command = __commonJS({
  "../node_modules/commander/lib/command.js"(exports) {
    var EventEmitter = __require("node:events").EventEmitter, childProcess = __require("node:child_process"), path = __require("node:path"), fs = __require("node:fs"), process2 = __require("node:process"), { Argument: Argument2, humanReadableArgName } = require_argument(), { CommanderError: CommanderError2 } = require_error(), { Help: Help2, stripColor } = require_help(), { Option: Option2, DualOptions } = require_option(), { suggestSimilar } = require_suggestSimilar(), Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super(), this.commands = [], this.options = [], this.parent = null, this._allowUnknownOption = !1, this._allowExcessArguments = !1, this.registeredArguments = [], this._args = this.registeredArguments, this.args = [], this.rawArgs = [], this.processedArgs = [], this._scriptPath = null, this._name = name || "", this._optionValues = {}, this._optionValueSources = {}, this._storeOptionsAsProperties = !1, this._actionHandler = null, this._executableHandler = !1, this._executableFile = null, this._executableDir = null, this._defaultCommandName = null, this._exitCallback = null, this._aliases = [], this._combineFlagAndOptionalValue = !0, this._description = "", this._summary = "", this._argsDescription = void 0, this._enablePositionalOptions = !1, this._passThroughOptions = !1, this._lifeCycleHooks = {}, this._showHelpAfterError = !1, this._showSuggestionAfterError = !0, this._savedState = null, this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          outputError: (str, write) => write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
          stripColor: (str) => stripColor(str)
        }, this._hidden = !1, this._helpOption = void 0, this._addImplicitHelpCommand = void 0, this._helpCommand = void 0, this._helpConfiguration = {}, this._helpGroupHeading = void 0, this._defaultCommandGroup = void 0, this._defaultOptionGroup = void 0;
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        return this._outputConfiguration = sourceCommand._outputConfiguration, this._helpOption = sourceCommand._helpOption, this._helpCommand = sourceCommand._helpCommand, this._helpConfiguration = sourceCommand._helpConfiguration, this._exitCallback = sourceCommand._exitCallback, this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties, this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue, this._allowExcessArguments = sourceCommand._allowExcessArguments, this._enablePositionalOptions = sourceCommand._enablePositionalOptions, this._showHelpAfterError = sourceCommand._showHelpAfterError, this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError, this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        let result = [];
        for (let command2 = this; command2; command2 = command2.parent)
          result.push(command2);
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc, opts = execOpts;
        typeof desc == "object" && desc !== null && (opts = desc, desc = null), opts = opts || {};
        let [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/), cmd = this.createCommand(name);
        return desc && (cmd.description(desc), cmd._executableHandler = !0), opts.isDefault && (this._defaultCommandName = cmd._name), cmd._hidden = !!(opts.noHelp || opts.hidden), cmd._executableFile = opts.executableFile || null, args && cmd.arguments(args), this._registerCommand(cmd), cmd.parent = this, cmd.copyInheritedSettings(this), desc ? this : cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        return configuration === void 0 ? this._helpConfiguration : (this._helpConfiguration = configuration, this);
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // change how output being written, defaults to stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // change how output being written for errors, defaults to writeErr
       *     outputError(str, write) // used for displaying errors and not used for displaying help
       *     // specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // color support, currently only used with Help
       *     getOutHasColors()
       *     getErrHasColors()
       *     stripColor() // used to remove ANSI escape codes if output does not have colors
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        return configuration === void 0 ? this._outputConfiguration : (this._outputConfiguration = {
          ...this._outputConfiguration,
          ...configuration
        }, this);
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = !0) {
        return typeof displayHelp != "string" && (displayHelp = !!displayHelp), this._showHelpAfterError = displayHelp, this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = !0) {
        return this._showSuggestionAfterError = !!displaySuggestion, this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name)
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        return opts = opts || {}, opts.isDefault && (this._defaultCommandName = cmd._name), (opts.noHelp || opts.hidden) && (cmd._hidden = !0), this._registerCommand(cmd), cmd.parent = this, cmd._checkForBrokenPassThrough(), this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom argument processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, parseArg, defaultValue) {
        let argument = this.createArgument(name, description);
        return typeof parseArg == "function" ? argument.default(defaultValue).argParser(parseArg) : argument.default(parseArg), this.addArgument(argument), this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        return names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        }), this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        let previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument?.variadic)
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0)
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        return this.registeredArguments.push(argument), this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs == "boolean")
          return this._addImplicitHelpCommand = enableOrNameAndArgs, enableOrNameAndArgs && this._defaultCommandGroup && this._initCommandGroup(this._getHelpCommand()), this;
        let nameAndArgs = enableOrNameAndArgs ?? "help [command]", [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/), helpDescription = description ?? "display help for command", helpCommand = this.createCommand(helpName);
        return helpCommand.helpOption(!1), helpArgs && helpCommand.arguments(helpArgs), helpDescription && helpCommand.description(helpDescription), this._addImplicitHelpCommand = !0, this._helpCommand = helpCommand, (enableOrNameAndArgs || description) && this._initCommandGroup(helpCommand), this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        return typeof helpCommand != "object" ? (this.helpCommand(helpCommand, deprecatedDescription), this) : (this._addImplicitHelpCommand = !0, this._helpCommand = helpCommand, this._initCommandGroup(helpCommand), this);
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        return this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help")) ? (this._helpCommand === void 0 && this.helpCommand(void 0, void 0), this._helpCommand) : null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        let allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event))
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        return this._lifeCycleHooks[event] ? this._lifeCycleHooks[event].push(listener) : this._lifeCycleHooks[event] = [listener], this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        return fn ? this._exitCallback = fn : this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync")
            throw err;
        }, this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        this._exitCallback && this._exitCallback(new CommanderError2(exitCode, code, message)), process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        let listener = (args) => {
          let expectedArgsCount = this.registeredArguments.length, actionArgs = args.slice(0, expectedArgsCount);
          return this._storeOptionsAsProperties ? actionArgs[expectedArgsCount] = this : actionArgs[expectedArgsCount] = this.opts(), actionArgs.push(this), fn.apply(this, actionArgs);
        };
        return this._actionHandler = listener, this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            let message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        let matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          let matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this._initOptionGroup(option), this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command2) {
        let knownBy = (cmd) => [cmd.name()].concat(cmd.aliases()), alreadyUsed = knownBy(command2).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          let existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|"), newCmd = knownBy(command2).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this._initCommandGroup(command2), this.commands.push(command2);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        let oname = option.name(), name = option.attributeName();
        if (option.negate) {
          let positiveLongFlag = option.long.replace(/^--no-/, "--");
          this._findOption(positiveLongFlag) || this.setOptionValueWithSource(
            name,
            option.defaultValue === void 0 ? !0 : option.defaultValue,
            "default"
          );
        } else option.defaultValue !== void 0 && this.setOptionValueWithSource(name, option.defaultValue, "default");
        let handleOptionValue = (val, invalidValueMessage, valueSource) => {
          val == null && option.presetArg !== void 0 && (val = option.presetArg);
          let oldValue = this.getOptionValue(name);
          val !== null && option.parseArg ? val = this._callParseArg(option, val, oldValue, invalidValueMessage) : val !== null && option.variadic && (val = option._collectValue(val, oldValue)), val == null && (option.negate ? val = !1 : option.isBoolean() || option.optional ? val = !0 : val = ""), this.setOptionValueWithSource(name, val, valueSource);
        };
        return this.on("option:" + oname, (val) => {
          let invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        }), option.envVar && this.on("optionEnv:" + oname, (val) => {
          let invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        }), this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags == "object" && flags instanceof Option2)
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        let option = this.createOption(flags, description);
        if (option.makeOptionMandatory(!!config.mandatory), typeof fn == "function")
          option.default(defaultValue).argParser(fn);
        else if (fn instanceof RegExp) {
          let regex = fn;
          fn = (val, def) => {
            let m = regex.exec(val);
            return m ? m[0] : def;
          }, option.default(defaultValue).argParser(fn);
        } else
          option.default(fn);
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: !0 },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = !0) {
        return this._combineFlagAndOptionalValue = !!combine, this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = !0) {
        return this._allowUnknownOption = !!allowUnknown, this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = !0) {
        return this._allowExcessArguments = !!allowExcess, this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = !0) {
        return this._enablePositionalOptions = !!positional, this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = !0) {
        return this._passThroughOptions = !!passThrough, this._checkForBrokenPassThrough(), this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions)
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = !0) {
        if (this.options.length)
          throw new Error("call .storeOptionsAsProperties() before adding options");
        if (Object.keys(this._optionValues).length)
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        return this._storeOptionsAsProperties = !!storeAsProperties, this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        return this._storeOptionsAsProperties ? this[key] : this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        return this._storeOptionsAsProperties ? this[key] = value : this._optionValues[key] = value, this._optionValueSources[key] = source, this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        return this._getCommandAndAncestors().forEach((cmd) => {
          cmd.getOptionValueSource(key) !== void 0 && (source = cmd.getOptionValueSource(key));
        }), source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv))
          throw new Error("first parameter to parse must be array or undefined");
        if (parseOptions = parseOptions || {}, argv === void 0 && parseOptions.from === void 0) {
          process2.versions?.electron && (parseOptions.from = "electron");
          let execArgv = process2.execArgv ?? [];
          (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) && (parseOptions.from = "eval");
        }
        argv === void 0 && (argv = process2.argv), this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1], userArgs = argv.slice(2);
            break;
          case "electron":
            process2.defaultApp ? (this._scriptPath = argv[1], userArgs = argv.slice(2)) : userArgs = argv.slice(1);
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        return !this._name && this._scriptPath && this.nameFromFilename(this._scriptPath), this._name = this._name || "program", userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        this._prepareForParse();
        let userArgs = this._prepareUserArgs(argv, parseOptions);
        return this._parseCommand([], userArgs), this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        this._prepareForParse();
        let userArgs = this._prepareUserArgs(argv, parseOptions);
        return await this._parseCommand([], userArgs), this;
      }
      _prepareForParse() {
        this._savedState === null ? this.saveStateBeforeParse() : this.restoreStateBeforeParse();
      }
      /**
       * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state saved.
       */
      saveStateBeforeParse() {
        this._savedState = {
          // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
          _name: this._name,
          // option values before parse have default values (including false for negated options)
          // shallow clones
          _optionValues: { ...this._optionValues },
          _optionValueSources: { ...this._optionValueSources }
        };
      }
      /**
       * Restore state before parse for calls after the first.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state restored.
       */
      restoreStateBeforeParse() {
        if (this._storeOptionsAsProperties)
          throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
        this._name = this._savedState._name, this._scriptPath = null, this.rawArgs = [], this._optionValues = { ...this._savedState._optionValues }, this._optionValueSources = { ...this._savedState._optionValueSources }, this.args = [], this.processedArgs = [];
      }
      /**
       * Throw if expected executable is missing. Add lots of help for author.
       *
       * @param {string} executableFile
       * @param {string} executableDir
       * @param {string} subcommandName
       */
      _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
        if (fs.existsSync(executableFile)) return;
        let executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory", executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = !1, sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          let localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName))) return;
          let foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
        }
        this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`, executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            let legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            legacyName !== this._name && (localFile = findFile(
              executableDir,
              `${legacyName}-${subcommand._name}`
            ));
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        process2.platform !== "win32" ? launchWithNode ? (args.unshift(executableFile), args = incrementNodeInspectorPort(process2.execArgv).concat(args), proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" })) : proc = childProcess.spawn(executableFile, args, { stdio: "inherit" }) : (this._checkForMissingExecutable(
          executableFile,
          executableDir,
          subcommand._name
        ), args.unshift(executableFile), args = incrementNodeInspectorPort(process2.execArgv).concat(args), proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" })), proc.killed || ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"].forEach((signal) => {
          process2.on(signal, () => {
            proc.killed === !1 && proc.exitCode === null && proc.kill(signal);
          });
        });
        let exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1, exitCallback ? exitCallback(
            new CommanderError2(
              code,
              "commander.executeSubCommandAsync",
              "(close)"
            )
          ) : process2.exit(code);
        }), proc.on("error", (err) => {
          if (err.code === "ENOENT")
            this._checkForMissingExecutable(
              executableFile,
              executableDir,
              subcommand._name
            );
          else if (err.code === "EACCES")
            throw new Error(`'${executableFile}' not executable`);
          if (!exitCallback)
            process2.exit(1);
          else {
            let wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err, exitCallback(wrappedError);
          }
        }), this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        let subCommand = this._findCommand(commandName);
        subCommand || this.help({ error: !0 }), subCommand._prepareForParse();
        let promiseChain;
        return promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        ), promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler)
            this._executeSubCommand(subCommand, operands.concat(unknown));
          else
            return subCommand._parseCommand(operands, unknown);
        }), promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        subcommandName || this.help();
        let subCommand = this._findCommand(subcommandName);
        return subCommand && !subCommand._executableHandler && subCommand.help(), this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          arg.required && this.args[i] == null && this.missingArgument(arg.name());
        }), !(this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) && this.args.length > this.registeredArguments.length && this._excessArguments(this.args);
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        let myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            let invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        let processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          declaredArg.variadic ? index < this.args.length ? (value = this.args.slice(index), declaredArg.parseArg && (value = value.reduce((processed, v) => myParseArg(declaredArg, v, processed), declaredArg.defaultValue))) : value === void 0 && (value = []) : index < this.args.length && (value = this.args[index], declaredArg.parseArg && (value = myParseArg(declaredArg, value, declaredArg.defaultValue))), processedArgs[index] = value;
        }), this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        return promise?.then && typeof promise.then == "function" ? promise.then(() => fn()) : fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise, hooks = [];
        return this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        }), event === "postAction" && hooks.reverse(), hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => hookDetail.callback(hookDetail.hookedCommand, this));
        }), result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        return this._lifeCycleHooks[event] !== void 0 && this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => hook(this, subCommand));
        }), result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        let parsed = this.parseOptions(unknown);
        if (this._parseOptionsEnv(), this._parseOptionsImplied(), operands = operands.concat(parsed.operands), unknown = parsed.unknown, this.args = operands.concat(unknown), operands && this._findCommand(operands[0]))
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name())
          return this._dispatchHelpCommand(operands[1]);
        if (this._defaultCommandName)
          return this._outputHelpIfRequested(unknown), this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName && this.help({ error: !0 }), this._outputHelpIfRequested(parsed.unknown), this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions();
        let checkForUnknownOptions = () => {
          parsed.unknown.length > 0 && this.unknownOption(parsed.unknown[0]);
        }, commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions(), this._processArguments();
          let promiseChain;
          return promiseChain = this._chainOrCallHooks(promiseChain, "preAction"), promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          ), this.parent && (promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          })), promiseChain = this._chainOrCallHooks(promiseChain, "postAction"), promiseChain;
        }
        if (this.parent?.listenerCount(commandEvent))
          checkForUnknownOptions(), this._processArguments(), this.parent.emit(commandEvent, operands, unknown);
        else if (operands.length) {
          if (this._findCommand("*"))
            return this._dispatchSubcommand("*", operands, unknown);
          this.listenerCount("command:*") ? this.emit("command:*", operands, unknown) : this.commands.length ? this.unknownCommand() : (checkForUnknownOptions(), this._processArguments());
        } else this.commands.length ? (checkForUnknownOptions(), this.help({ error: !0 })) : (checkForUnknownOptions(), this._processArguments());
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (name)
          return this.commands.find(
            (cmd) => cmd._name === name || cmd._aliases.includes(name)
          );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0 && cmd.missingMandatoryOptionValue(anOption);
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        let definedNonDefaultOptions = this.options.filter((option) => {
          let optionKey = option.attributeName();
          return this.getOptionValue(optionKey) === void 0 ? !1 : this.getOptionValueSource(optionKey) !== "default";
        });
        definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        ).forEach((option) => {
          let conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          conflictingAndDefined && this._conflictingOption(option, conflictingAndDefined);
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Side effects: modifies command by storing options. Does not reset state if called again.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} args
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(args) {
        let operands = [], unknown = [], dest = operands;
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let negativeNumberArg = (arg) => /^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg) ? !this._getCommandAndAncestors().some(
          (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
        ) : !1, activeVariadicOption = null, activeGroup = null, i = 0;
        for (; i < args.length || activeGroup; ) {
          let arg = activeGroup ?? args[i++];
          if (activeGroup = null, arg === "--") {
            dest === unknown && dest.push(arg), dest.push(...args.slice(i));
            break;
          }
          if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          if (activeVariadicOption = null, maybeOption(arg)) {
            let option = this._findOption(arg);
            if (option) {
              if (option.required) {
                let value = args[i++];
                value === void 0 && this.optionMissingArgument(option), this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i])) && (value = args[i++]), this.emit(`option:${option.name()}`, value);
              } else
                this.emit(`option:${option.name()}`);
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            let option = this._findOption(`-${arg[1]}`);
            if (option) {
              option.required || option.optional && this._combineFlagAndOptionalValue ? this.emit(`option:${option.name()}`, arg.slice(2)) : (this.emit(`option:${option.name()}`), activeGroup = `-${arg.slice(2)}`);
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            let index = arg.indexOf("="), option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg)) && (dest = unknown), (this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg), unknown.push(...args.slice(i));
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg, ...args.slice(i));
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg, ...args.slice(i));
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg, ...args.slice(i));
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          let result = {}, len = this.options.length;
          for (let i = 0; i < len; i++) {
            let key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        ), typeof this._showHelpAfterError == "string" ? this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`) : this._showHelpAfterError && (this._outputConfiguration.writeErr(`
`), this.outputHelp({ error: !0 }));
        let config = errorOptions || {}, exitCode = config.exitCode || 1, code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            let optionKey = option.attributeName();
            (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) && (option.required || option.optional ? this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]) : this.emit(`optionEnv:${option.name()}`));
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        let dualHelper = new DualOptions(this.options), hasCustomOptionValue = (optionKey) => this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        let message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        let message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        let message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        let findBestOptionFromValue = (option2) => {
          let optionKey = option2.attributeName(), optionValue = this.getOptionValue(optionKey), negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          ), positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          return negativeOption && (negativeOption.presetArg === void 0 && optionValue === !1 || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg) ? negativeOption : positiveOption || option2;
        }, getErrorMessage = (option2) => {
          let bestOption = findBestOptionFromValue(option2), optionKey = bestOption.attributeName();
          return this.getOptionValueSource(optionKey) === "env" ? `environment variable '${bestOption.envVar}'` : `option '${bestOption.flags}'`;
        }, message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [], command2 = this;
          do {
            let moreFlags = command2.createHelp().visibleOptions(command2).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags), command2 = command2.parent;
          } while (command2 && !command2._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        let message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        let expected = this.registeredArguments.length, s = expected === 1 ? "" : "s", message = `error: too many arguments${this.parent ? ` for '${this.name()}'` : ""}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        let unknownName = this.args[0], suggestion = "";
        if (this._showSuggestionAfterError) {
          let candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command2) => {
            candidateNames.push(command2.name()), command2.alias() && candidateNames.push(command2.alias());
          }), suggestion = suggestSimilar(unknownName, candidateNames);
        }
        let message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str, flags = flags || "-V, --version", description = description || "output the version number";
        let versionOption = this.createOption(flags, description);
        return this._versionOptionName = versionOption.attributeName(), this._registerOption(versionOption), this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`), this._exit(0, "commander.version", str);
        }), this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str, argsDescription) {
        return str === void 0 && argsDescription === void 0 ? this._description : (this._description = str, argsDescription && (this._argsDescription = argsDescription), this);
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str) {
        return str === void 0 ? this._summary : (this._summary = str, this);
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command2 = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler && (command2 = this.commands[this.commands.length - 1]), alias === command2._name)
          throw new Error("Command alias can't be the same as its name");
        let matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          let existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        return command2._aliases.push(alias), this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        return aliases === void 0 ? this._aliases : (aliases.forEach((alias) => this.alias(alias)), this);
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          let args = this.registeredArguments.map((arg) => humanReadableArgName(arg));
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        return this._usage = str, this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str) {
        return str === void 0 ? this._name : (this._name = str, this);
      }
      /**
       * Set/get the help group heading for this subcommand in parent command's help.
       *
       * @param {string} [heading]
       * @return {Command | string}
       */
      helpGroup(heading) {
        return heading === void 0 ? this._helpGroupHeading ?? "" : (this._helpGroupHeading = heading, this);
      }
      /**
       * Set/get the default help group heading for subcommands added to this command.
       * (This does not override a group set directly on the subcommand using .helpGroup().)
       *
       * @example
       * program.commandsGroup('Development Commands:);
       * program.command('watch')...
       * program.command('lint')...
       * ...
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      commandsGroup(heading) {
        return heading === void 0 ? this._defaultCommandGroup ?? "" : (this._defaultCommandGroup = heading, this);
      }
      /**
       * Set/get the default help group heading for options added to this command.
       * (This does not override a group set directly on the option using .helpGroup().)
       *
       * @example
       * program
       *   .optionsGroup('Development Options:')
       *   .option('-d, --debug', 'output extra debugging')
       *   .option('-p, --profile', 'output profiling information')
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      optionsGroup(heading) {
        return heading === void 0 ? this._defaultOptionGroup ?? "" : (this._defaultOptionGroup = heading, this);
      }
      /**
       * @param {Option} option
       * @private
       */
      _initOptionGroup(option) {
        this._defaultOptionGroup && !option.helpGroupHeading && option.helpGroup(this._defaultOptionGroup);
      }
      /**
       * @param {Command} cmd
       * @private
       */
      _initCommandGroup(cmd) {
        this._defaultCommandGroup && !cmd.helpGroup() && cmd.helpGroup(this._defaultCommandGroup);
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        return this._name = path.basename(filename, path.extname(filename)), this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        return path2 === void 0 ? this._executableDir : (this._executableDir = path2, this);
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        let helper = this.createHelp(), context = this._getOutputContext(contextOptions);
        helper.prepareContext({
          error: context.error,
          helpWidth: context.helpWidth,
          outputHasColors: context.hasColors
        });
        let text = helper.formatHelp(this, helper);
        return context.hasColors ? text : this._outputConfiguration.stripColor(text);
      }
      /**
       * @typedef HelpContext
       * @type {object}
       * @property {boolean} error
       * @property {number} helpWidth
       * @property {boolean} hasColors
       * @property {function} write - includes stripColor if needed
       *
       * @returns {HelpContext}
       * @private
       */
      _getOutputContext(contextOptions) {
        contextOptions = contextOptions || {};
        let error = !!contextOptions.error, baseWrite, hasColors, helpWidth;
        return error ? (baseWrite = (str) => this._outputConfiguration.writeErr(str), hasColors = this._outputConfiguration.getErrHasColors(), helpWidth = this._outputConfiguration.getErrHelpWidth()) : (baseWrite = (str) => this._outputConfiguration.writeOut(str), hasColors = this._outputConfiguration.getOutHasColors(), helpWidth = this._outputConfiguration.getOutHelpWidth()), { error, write: (str) => (hasColors || (str = this._outputConfiguration.stripColor(str)), baseWrite(str)), hasColors, helpWidth };
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        typeof contextOptions == "function" && (deprecatedCallback = contextOptions, contextOptions = void 0);
        let outputContext = this._getOutputContext(contextOptions), eventContext = {
          error: outputContext.error,
          write: outputContext.write,
          command: this
        };
        this._getCommandAndAncestors().reverse().forEach((command2) => command2.emit("beforeAllHelp", eventContext)), this.emit("beforeHelp", eventContext);
        let helpInformation = this.helpInformation({ error: outputContext.error });
        if (deprecatedCallback && (helpInformation = deprecatedCallback(helpInformation), typeof helpInformation != "string" && !Buffer.isBuffer(helpInformation)))
          throw new Error("outputHelp callback must return a string or a Buffer");
        outputContext.write(helpInformation), this._getHelpOption()?.long && this.emit(this._getHelpOption().long), this.emit("afterHelp", eventContext), this._getCommandAndAncestors().forEach(
          (command2) => command2.emit("afterAllHelp", eventContext)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        return typeof flags == "boolean" ? (flags ? (this._helpOption === null && (this._helpOption = void 0), this._defaultOptionGroup && this._initOptionGroup(this._getHelpOption())) : this._helpOption = null, this) : (this._helpOption = this.createOption(
          flags ?? "-h, --help",
          description ?? "display help for command"
        ), (flags || description) && this._initOptionGroup(this._helpOption), this);
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        return this._helpOption === void 0 && this.helpOption(void 0, void 0), this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        return this._helpOption = option, this._initOptionGroup(option), this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = Number(process2.exitCode ?? 0);
        exitCode === 0 && contextOptions && typeof contextOptions != "function" && contextOptions.error && (exitCode = 1), this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * // Do a little typing to coordinate emit and listener for the help text events.
       * @typedef HelpTextEventContext
       * @type {object}
       * @property {boolean} error
       * @property {Command} command
       * @property {function} write
       */
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        let allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position))
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        let helpEvent = `${position}Help`;
        return this.on(helpEvent, (context) => {
          let helpStr;
          typeof text == "function" ? helpStr = text({ error: context.error, command: context.command }) : helpStr = text, helpStr && context.write(`${helpStr}
`);
        }), this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        let helpOption = this._getHelpOption();
        helpOption && args.find((arg) => helpOption.is(arg)) && (this.outputHelp(), this._exit(0, "commander.helpDisplayed", "(outputHelp)"));
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect"))
          return arg;
        let debugOption, debugHost = "127.0.0.1", debugPort = "9229", match;
        return (match = arg.match(/^(--inspect(-brk)?)$/)) !== null ? debugOption = match[1] : (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null ? (debugOption = match[1], /^\d+$/.test(match[3]) ? debugPort = match[3] : debugHost = match[3]) : (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null && (debugOption = match[1], debugHost = match[3], debugPort = match[4]), debugOption && debugPort !== "0" ? `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}` : arg;
      });
    }
    function useColor() {
      if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
        return !1;
      if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== void 0)
        return !0;
    }
    exports.Command = Command2;
    exports.useColor = useColor;
  }
});

// ../node_modules/commander/index.js
var require_commander = __commonJS({
  "../node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument(), { Command: Command2 } = require_command(), { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error(), { Help: Help2 } = require_help(), { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// src/bin/core.ts
import { getEnvConfig, optionalEnvToBoolean, parseList } from "storybook/internal/common";
import { logTracker, logger as logger2 } from "storybook/internal/node-logger";
import { addToGlobalContext } from "storybook/internal/telemetry";

// ../node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1), {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// ../node_modules/leven/index.js
var array = [], characterCodeCache = [];
function leven(first, second, options) {
  if (first === second)
    return 0;
  let maxDistance = options?.maxDistance, swap = first;
  first.length > second.length && (first = second, second = swap);
  let firstLength = first.length, secondLength = second.length;
  for (; firstLength > 0 && first.charCodeAt(~-firstLength) === second.charCodeAt(~-secondLength); )
    firstLength--, secondLength--;
  let start = 0;
  for (; start < firstLength && first.charCodeAt(start) === second.charCodeAt(start); )
    start++;
  if (firstLength -= start, secondLength -= start, maxDistance !== void 0 && secondLength - firstLength > maxDistance)
    return maxDistance;
  if (firstLength === 0)
    return maxDistance !== void 0 && secondLength > maxDistance ? maxDistance : secondLength;
  let bCharacterCode, result, temporary, temporary2, index = 0, index2 = 0;
  for (; index < firstLength; )
    characterCodeCache[index] = first.charCodeAt(start + index), array[index] = ++index;
  for (; index2 < secondLength; ) {
    for (bCharacterCode = second.charCodeAt(start + index2), temporary = index2++, result = index2, index = 0; index < firstLength; index++)
      temporary2 = bCharacterCode === characterCodeCache[index] ? temporary : temporary + 1, temporary = array[index], result = array[index] = temporary > result ? temporary2 > result ? result + 1 : temporary2 : temporary2 > temporary ? temporary + 1 : temporary2;
    if (maxDistance !== void 0) {
      let rowMinimum = result;
      for (index = 0; index < firstLength; index++)
        array[index] < rowMinimum && (rowMinimum = array[index]);
      if (rowMinimum > maxDistance)
        return maxDistance;
    }
  }
  return array.length = firstLength, characterCodeCache.length = firstLength, maxDistance !== void 0 && result > maxDistance ? maxDistance : result;
}

// src/bin/core.ts
var import_picocolors = __toESM(require_picocolors(), 1);

// src/cli/build.ts
import { cache } from "storybook/internal/common";
import { buildStaticStandalone, withTelemetry } from "storybook/internal/core-server";
var build = async (cliOptions) => {
  let { default: packageJson } = await import("storybook/package.json", { with: { type: "json" } }), options = {
    ...cliOptions,
    configDir: cliOptions.configDir || "./.storybook",
    outputDir: cliOptions.outputDir || "./storybook-static",
    ignorePreview: !!cliOptions.previewUrl && !cliOptions.forceBuildPreview,
    configType: "PRODUCTION",
    cache,
    packageJson
  };
  await withTelemetry(
    "build",
    { cliOptions, presetOptions: options },
    () => buildStaticStandalone(options)
  );
};

// src/cli/buildIndex.ts
import { cache as cache2 } from "storybook/internal/common";
import { buildIndexStandalone, withTelemetry as withTelemetry2 } from "storybook/internal/core-server";
var buildIndex = async (cliOptions) => {
  let options = {
    ...cliOptions,
    configDir: cliOptions.configDir || ".storybook",
    outputFile: cliOptions.outputFile || "index.json",
    ignorePreview: !0,
    configType: "PRODUCTION",
    cache: cache2,
    packageJson: cliOptions.packageJson
  }, presetOptions = {
    ...options,
    corePresets: [],
    overridePresets: []
  };
  await withTelemetry2("index", { cliOptions, presetOptions }, () => buildIndexStandalone(options));
};

// src/cli/dev.ts
var import_ts_dedent = __toESM(require_dist(), 1);
import { cache as cache3 } from "storybook/internal/common";
import { buildDevStandalone, withTelemetry as withTelemetry3 } from "storybook/internal/core-server";
import { logger, instance as npmLog } from "storybook/internal/node-logger";
function printError(error) {
  npmLog.heading = "", error instanceof Error ? error.error ? logger.error(error.error) : error.stats && error.stats.compilation.errors ? error.stats.compilation.errors.forEach((e) => logger.log(e)) : logger.error(error) : error.compilation?.errors && error.compilation.errors.forEach((e) => logger.log(e)), logger.warn(
    error.close ? import_ts_dedent.dedent`
          FATAL broken build!, will close the process,
          Fix the error below and restart storybook.
        ` : import_ts_dedent.dedent`
          Broken build, fix the error above.
          You may need to refresh the browser.
        `
  );
}
var dev = async (cliOptions) => {
  let { env } = process;
  env.NODE_ENV = env.NODE_ENV || "development";
  let { default: packageJson } = await import("storybook/package.json", { with: { type: "json" } }), options = {
    ...cliOptions,
    configDir: cliOptions.configDir || "./.storybook",
    configType: "DEVELOPMENT",
    ignorePreview: !!cliOptions.previewUrl && !cliOptions.forceBuildPreview,
    cache: cache3,
    packageJson
    // type-fest types are wrong here because we're on an outdated version of the package
  };
  await withTelemetry3(
    "dev",
    {
      cliOptions,
      presetOptions: options,
      printError
    },
    () => buildDevStandalone(options)
  );
};

// src/bin/core.ts
addToGlobalContext("cliVersion", version);
var handleCommandFailure = async (logFilePath) => {
  try {
    let logFile = await logTracker.writeToFile(logFilePath);
    logger2.log(`Debug logs are written to: ${logFile}`);
  } catch {
  }
  logger2.outro("Storybook exited with an error"), process.exit(1);
}, command = (name) => program.command(name).option(
  "--disable-telemetry",
  "Disable sending telemetry data",
  optionalEnvToBoolean(process.env.STORYBOOK_DISABLE_TELEMETRY)
).option("--debug", "Get more logs in debug mode", !1).option("--enable-crash-reports", "Enable sending crash reports to telemetry data").option("--loglevel <trace | debug | info | warn | error | silent>", "Define log level", "info").option(
  "--logfile [path]",
  "Write all debug logs to the specified file at the end of the run. Defaults to debug-storybook.log when [path] is not provided"
).hook("preAction", async (self) => {
  try {
    let options = self.opts();
    options.loglevel && logger2.setLogLevel(options.loglevel), options.logfile && logTracker.enableLogWriting(), await globalSettings();
  } catch (e) {
    logger2.error(`Error loading global settings:
` + String(e));
  }
}).hook("postAction", async (command2) => {
  if (logTracker.shouldWriteLogsToFile)
    try {
      let logFile = await logTracker.writeToFile(command2.getOptionValue("logfile"));
      logger2.outro(`Debug logs are written to: ${logFile}`);
    } catch {
    }
});
command("dev").option("-p, --port <number>", "Port to run Storybook", (str) => parseInt(str, 10)).option("-h, --host <string>", "Host to run Storybook").option("-c, --config-dir <dir-name>", "Directory where to load Storybook configurations from").option(
  "--https",
  "Serve Storybook over HTTPS. Note: You must provide your own certificate information."
).option(
  "--ssl-ca <ca>",
  "Provide an SSL certificate authority. (Optional with --https, required if using a self-signed certificate)",
  parseList
).option("--ssl-cert <cert>", "Provide an SSL certificate. (Required with --https)").option("--ssl-key <key>", "Provide an SSL key. (Required with --https)").option("--smoke-test", "Exit after successful start").option("--ci", "CI mode (skip interactive prompts, don't open browser)").option("--no-open", "Do not open Storybook automatically in the browser").option("--quiet", "Suppress verbose build output").option("--no-version-updates", "Suppress update check", !0).option("--debug-webpack", "Display final webpack configurations for debugging purposes").option(
  "--webpack-stats-json [directory]",
  "Write Webpack stats JSON to disk (synonym for `--stats-json`)"
).option("--stats-json [directory]", "Write stats JSON to disk").option(
  "--preview-url <string>",
  "Disables the default storybook preview and lets your use your own"
).option("--force-build-preview", "Build the preview iframe even if you are using --preview-url").option("--docs", "Build a documentation-only site using addon-docs").option("--exact-port", "Exit early if the desired port is not available").option(
  "--initial-path [path]",
  "URL path to be appended when visiting Storybook for the first time"
).option("--preview-only", "Use the preview without the manager UI").action(async (options) => {
  let { default: packageJson } = await import("storybook/package.json", { with: { type: "json" } });
  logger2.intro(`${packageJson.name} v${packageJson.version}`), getEnvConfig(options, {
    port: "SBCONFIG_PORT",
    host: "SBCONFIG_HOSTNAME",
    staticDir: "SBCONFIG_STATIC_DIR",
    configDir: "SBCONFIG_CONFIG_DIR",
    ci: "CI"
  }), parseInt(`${options.port}`, 10) && (options.port = parseInt(`${options.port}`, 10)), await dev({ ...options, packageJson }).catch(() => {
    handleCommandFailure(options.logfile);
  });
});
command("build").option("-o, --output-dir <dir-name>", "Directory where to store built files").option("-c, --config-dir <dir-name>", "Directory where to load Storybook configurations from").option("--quiet", "Suppress verbose build output").option("--debug-webpack", "Display final webpack configurations for debugging purposes").option(
  "--webpack-stats-json [directory]",
  "Write Webpack stats JSON to disk (synonym for `--stats-json`)"
).option("--stats-json [directory]", "Write stats JSON to disk").option(
  "--preview-url <string>",
  "Disables the default storybook preview and lets your use your own"
).option("--force-build-preview", "Build the preview iframe even if you are using --preview-url").option("--docs", "Build a documentation-only site using addon-docs").option("--test", "Build stories optimized for testing purposes.").option("--preview-only", "Use the preview without the manager UI").action(async (options) => {
  let { env } = process;
  env.NODE_ENV = env.NODE_ENV || "production";
  let { default: packageJson } = await import("storybook/package.json", { with: { type: "json" } });
  logger2.intro(`Building ${packageJson.name} v${packageJson.version}`), getEnvConfig(options, {
    staticDir: "SBCONFIG_STATIC_DIR",
    outputDir: "SBCONFIG_OUTPUT_DIR",
    configDir: "SBCONFIG_CONFIG_DIR"
  }), await build({
    ...options,
    packageJson,
    test: !!options.test || optionalEnvToBoolean(process.env.SB_TESTBUILD)
  }).catch(() => {
    logger2.outro("Storybook exited with an error"), process.exit(1);
  }), logger2.outro("Storybook build completed successfully");
});
command("index").option("-o, --output-file <file-name>", "JSON file to output index").option("-c, --config-dir <dir-name>", "Directory where to load Storybook configurations from").option("--quiet", "Suppress verbose build output").action(async (options) => {
  let { env } = process;
  env.NODE_ENV = env.NODE_ENV || "production";
  let { default: packageJson } = await import("storybook/package.json", { with: { type: "json" } });
  logger2.log(import_picocolors.default.bold(`${packageJson.name} v${packageJson.version}
`)), getEnvConfig(options, {
    configDir: "SBCONFIG_CONFIG_DIR",
    outputFile: "SBCONFIG_OUTPUT_FILE"
  }), await buildIndex({
    ...options,
    packageJson
  }).catch(() => process.exit(1));
});
program.on("command:*", ([invalidCmd]) => {
  let errorMessage = ` Invalid command: ${import_picocolors.default.bold(invalidCmd)}.
 See --help for a list of available commands.`, suggestion = program.commands.map((cmd) => cmd.name()).find((cmd) => leven(cmd, invalidCmd) < 3);
  suggestion && (errorMessage += `
 Did you mean ${import_picocolors.default.yellow(suggestion)}?`), logger2.error(errorMessage), process.exit(1);
});
program.usage("<command> [options]").version(String(version)).parse(process.argv);
