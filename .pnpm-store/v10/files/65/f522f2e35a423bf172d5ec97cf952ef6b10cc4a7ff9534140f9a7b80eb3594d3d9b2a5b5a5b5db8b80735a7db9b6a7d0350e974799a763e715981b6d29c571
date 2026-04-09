"use strict";
var Dr = Object.create;
var st = Object.defineProperty;
var $r = Object.getOwnPropertyDescriptor;
var Mr = Object.getOwnPropertyNames;
var Lr = Object.getPrototypeOf, Ur = Object.prototype.hasOwnProperty;
var d = (s, e) => st(s, "name", { value: e, configurable: !0 });
var I = (s, e) => () => (e || s((e = { exports: {} }).exports, e), e.exports);
var Fr = (s, e, t, r) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let i of Mr(e))
      !Ur.call(s, i) && i !== t && st(s, i, { get: () => e[i], enumerable: !(r = $r(e, i)) || r.enumerable });
  return s;
};
var Y = (s, e, t) => (t = s != null ? Dr(Lr(s)) : {}, Fr(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !s || !s.__esModule ? st(t, "default", { value: s, enumerable: !0 }) : t,
  s
));

// ../node_modules/commander/lib/error.js
var Oe = I((nt) => {
  var Ne = class extends Error {
    static {
      d(this, "CommanderError");
    }
    /**
     * Constructs the CommanderError class
     * @param {number} exitCode suggested exit code which could be used with process.exit
     * @param {string} code an id string representing the error
     * @param {string} message human-readable description of the error
     */
    constructor(e, t, r) {
      super(r), Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name, this.code = t, this.exitCode = e, this.nestedError =
      void 0;
    }
  }, it = class extends Ne {
    static {
      d(this, "InvalidArgumentError");
    }
    /**
     * Constructs the InvalidArgumentError class
     * @param {string} [message] explanation of why argument is invalid
     */
    constructor(e) {
      super(1, "commander.invalidArgument", e), Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name;
    }
  };
  nt.CommanderError = Ne;
  nt.InvalidArgumentError = it;
});

// ../node_modules/commander/lib/argument.js
var Ve = I((at) => {
  var { InvalidArgumentError: Wr } = Oe(), ot = class {
    static {
      d(this, "Argument");
    }
    /**
     * Initialize a new command argument with the given name and description.
     * The default is that the argument is required, and you can explicitly
     * indicate this with <> around the name. Put [] around the name for an optional argument.
     *
     * @param {string} name
     * @param {string} [description]
     */
    constructor(e, t) {
      switch (this.description = t || "", this.variadic = !1, this.parseArg = void 0, this.defaultValue = void 0, this.defaultValueDescription =
      void 0, this.argChoices = void 0, e[0]) {
        case "<":
          this.required = !0, this._name = e.slice(1, -1);
          break;
        case "[":
          this.required = !1, this._name = e.slice(1, -1);
          break;
        default:
          this.required = !0, this._name = e;
          break;
      }
      this._name.length > 3 && this._name.slice(-3) === "..." && (this.variadic = !0, this._name = this._name.slice(0, -3));
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
    _concatValue(e, t) {
      return t === this.defaultValue || !Array.isArray(t) ? [e] : t.concat(e);
    }
    /**
     * Set the default value, and optionally supply the description to be displayed in the help.
     *
     * @param {*} value
     * @param {string} [description]
     * @return {Argument}
     */
    default(e, t) {
      return this.defaultValue = e, this.defaultValueDescription = t, this;
    }
    /**
     * Set the custom handler for processing CLI command arguments into argument values.
     *
     * @param {Function} [fn]
     * @return {Argument}
     */
    argParser(e) {
      return this.parseArg = e, this;
    }
    /**
     * Only allow argument value to be one of choices.
     *
     * @param {string[]} values
     * @return {Argument}
     */
    choices(e) {
      return this.argChoices = e.slice(), this.parseArg = (t, r) => {
        if (!this.argChoices.includes(t))
          throw new Wr(
            `Allowed choices are ${this.argChoices.join(", ")}.`
          );
        return this.variadic ? this._concatValue(t, r) : t;
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
  function Br(s) {
    let e = s.name() + (s.variadic === !0 ? "..." : "");
    return s.required ? "<" + e + ">" : "[" + e + "]";
  }
  d(Br, "humanReadableArgName");
  at.Argument = ot;
  at.humanReadableArgName = Br;
});

// ../node_modules/commander/lib/help.js
var ut = I((Pt) => {
  var { humanReadableArgName: qr } = Ve(), dt = class {
    static {
      d(this, "Help");
    }
    constructor() {
      this.helpWidth = void 0, this.sortSubcommands = !1, this.sortOptions = !1, this.showGlobalOptions = !1;
    }
    /**
     * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
     *
     * @param {Command} cmd
     * @returns {Command[]}
     */
    visibleCommands(e) {
      let t = e.commands.filter((i) => !i._hidden), r = e._getHelpCommand();
      return r && !r._hidden && t.push(r), this.sortSubcommands && t.sort((i, n) => i.name().localeCompare(n.name())), t;
    }
    /**
     * Compare options for sort.
     *
     * @param {Option} a
     * @param {Option} b
     * @returns {number}
     */
    compareOptions(e, t) {
      let r = /* @__PURE__ */ d((i) => i.short ? i.short.replace(/^-/, "") : i.long.replace(/^--/, ""), "getSortKey");
      return r(e).localeCompare(r(t));
    }
    /**
     * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
     *
     * @param {Command} cmd
     * @returns {Option[]}
     */
    visibleOptions(e) {
      let t = e.options.filter((i) => !i.hidden), r = e._getHelpOption();
      if (r && !r.hidden) {
        let i = r.short && e._findOption(r.short), n = r.long && e._findOption(r.long);
        !i && !n ? t.push(r) : r.long && !n ? t.push(
          e.createOption(r.long, r.description)
        ) : r.short && !i && t.push(
          e.createOption(r.short, r.description)
        );
      }
      return this.sortOptions && t.sort(this.compareOptions), t;
    }
    /**
     * Get an array of the visible global options. (Not including help.)
     *
     * @param {Command} cmd
     * @returns {Option[]}
     */
    visibleGlobalOptions(e) {
      if (!this.showGlobalOptions) return [];
      let t = [];
      for (let r = e.parent; r; r = r.parent) {
        let i = r.options.filter(
          (n) => !n.hidden
        );
        t.push(...i);
      }
      return this.sortOptions && t.sort(this.compareOptions), t;
    }
    /**
     * Get an array of the arguments if any have a description.
     *
     * @param {Command} cmd
     * @returns {Argument[]}
     */
    visibleArguments(e) {
      return e._argsDescription && e.registeredArguments.forEach((t) => {
        t.description = t.description || e._argsDescription[t.name()] || "";
      }), e.registeredArguments.find((t) => t.description) ? e.registeredArguments : [];
    }
    /**
     * Get the command term to show in the list of subcommands.
     *
     * @param {Command} cmd
     * @returns {string}
     */
    subcommandTerm(e) {
      let t = e.registeredArguments.map((r) => qr(r)).join(" ");
      return e._name + (e._aliases[0] ? "|" + e._aliases[0] : "") + (e.options.length ? " [options]" : "") + // simplistic check for non-help option
      (t ? " " + t : "");
    }
    /**
     * Get the option term to show in the list of options.
     *
     * @param {Option} option
     * @returns {string}
     */
    optionTerm(e) {
      return e.flags;
    }
    /**
     * Get the argument term to show in the list of arguments.
     *
     * @param {Argument} argument
     * @returns {string}
     */
    argumentTerm(e) {
      return e.name();
    }
    /**
     * Get the longest command term length.
     *
     * @param {Command} cmd
     * @param {Help} helper
     * @returns {number}
     */
    longestSubcommandTermLength(e, t) {
      return t.visibleCommands(e).reduce((r, i) => Math.max(r, t.subcommandTerm(i).length), 0);
    }
    /**
     * Get the longest option term length.
     *
     * @param {Command} cmd
     * @param {Help} helper
     * @returns {number}
     */
    longestOptionTermLength(e, t) {
      return t.visibleOptions(e).reduce((r, i) => Math.max(r, t.optionTerm(i).length), 0);
    }
    /**
     * Get the longest global option term length.
     *
     * @param {Command} cmd
     * @param {Help} helper
     * @returns {number}
     */
    longestGlobalOptionTermLength(e, t) {
      return t.visibleGlobalOptions(e).reduce((r, i) => Math.max(r, t.optionTerm(i).length), 0);
    }
    /**
     * Get the longest argument term length.
     *
     * @param {Command} cmd
     * @param {Help} helper
     * @returns {number}
     */
    longestArgumentTermLength(e, t) {
      return t.visibleArguments(e).reduce((r, i) => Math.max(r, t.argumentTerm(i).length), 0);
    }
    /**
     * Get the command usage to be displayed at the top of the built-in help.
     *
     * @param {Command} cmd
     * @returns {string}
     */
    commandUsage(e) {
      let t = e._name;
      e._aliases[0] && (t = t + "|" + e._aliases[0]);
      let r = "";
      for (let i = e.parent; i; i = i.parent)
        r = i.name() + " " + r;
      return r + t + " " + e.usage();
    }
    /**
     * Get the description for the command.
     *
     * @param {Command} cmd
     * @returns {string}
     */
    commandDescription(e) {
      return e.description();
    }
    /**
     * Get the subcommand summary to show in the list of subcommands.
     * (Fallback to description for backwards compatibility.)
     *
     * @param {Command} cmd
     * @returns {string}
     */
    subcommandDescription(e) {
      return e.summary() || e.description();
    }
    /**
     * Get the option description to show in the list of options.
     *
     * @param {Option} option
     * @return {string}
     */
    optionDescription(e) {
      let t = [];
      return e.argChoices && t.push(
        // use stringify to match the display of the default value
        `choices: ${e.argChoices.map((r) => JSON.stringify(r)).join(", ")}`
      ), e.defaultValue !== void 0 && (e.required || e.optional || e.isBoolean() && typeof e.defaultValue == "boolean") && t.push(
        `default: ${e.defaultValueDescription || JSON.stringify(e.defaultValue)}`
      ), e.presetArg !== void 0 && e.optional && t.push(`preset: ${JSON.stringify(e.presetArg)}`), e.envVar !== void 0 && t.push(`env: ${e.envVar}`),
      t.length > 0 ? `${e.description} (${t.join(", ")})` : e.description;
    }
    /**
     * Get the argument description to show in the list of arguments.
     *
     * @param {Argument} argument
     * @return {string}
     */
    argumentDescription(e) {
      let t = [];
      if (e.argChoices && t.push(
        // use stringify to match the display of the default value
        `choices: ${e.argChoices.map((r) => JSON.stringify(r)).join(", ")}`
      ), e.defaultValue !== void 0 && t.push(
        `default: ${e.defaultValueDescription || JSON.stringify(e.defaultValue)}`
      ), t.length > 0) {
        let r = `(${t.join(", ")})`;
        return e.description ? `${e.description} ${r}` : r;
      }
      return e.description;
    }
    /**
     * Generate the built-in help text.
     *
     * @param {Command} cmd
     * @param {Help} helper
     * @returns {string}
     */
    formatHelp(e, t) {
      let r = t.padWidth(e, t), i = t.helpWidth || 80, n = 2, o = 2;
      function a(O, q) {
        if (q) {
          let rt = `${O.padEnd(r + o)}${q}`;
          return t.wrap(
            rt,
            i - n,
            r + o
          );
        }
        return O;
      }
      d(a, "formatItem");
      function l(O) {
        return O.join(`
`).replace(/^/gm, " ".repeat(n));
      }
      d(l, "formatList");
      let h = [`Usage: ${t.commandUsage(e)}`, ""], p = t.commandDescription(e);
      p.length > 0 && (h = h.concat([
        t.wrap(p, i, 0),
        ""
      ]));
      let y = t.visibleArguments(e).map((O) => a(
        t.argumentTerm(O),
        t.argumentDescription(O)
      ));
      y.length > 0 && (h = h.concat(["Arguments:", l(y), ""]));
      let k = t.visibleOptions(e).map((O) => a(
        t.optionTerm(O),
        t.optionDescription(O)
      ));
      if (k.length > 0 && (h = h.concat(["Options:", l(k), ""])), this.showGlobalOptions) {
        let O = t.visibleGlobalOptions(e).map((q) => a(
          t.optionTerm(q),
          t.optionDescription(q)
        ));
        O.length > 0 && (h = h.concat([
          "Global Options:",
          l(O),
          ""
        ]));
      }
      let S = t.visibleCommands(e).map((O) => a(
        t.subcommandTerm(O),
        t.subcommandDescription(O)
      ));
      return S.length > 0 && (h = h.concat(["Commands:", l(S), ""])), h.join(`
`);
    }
    /**
     * Calculate the pad width from the maximum term length.
     *
     * @param {Command} cmd
     * @param {Help} helper
     * @returns {number}
     */
    padWidth(e, t) {
      return Math.max(
        t.longestOptionTermLength(e, t),
        t.longestGlobalOptionTermLength(e, t),
        t.longestSubcommandTermLength(e, t),
        t.longestArgumentTermLength(e, t)
      );
    }
    /**
     * Wrap the given string to width characters per line, with lines after the first indented.
     * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
     *
     * @param {string} str
     * @param {number} width
     * @param {number} indent
     * @param {number} [minColumnWidth=40]
     * @return {string}
     *
     */
    wrap(e, t, r, i = 40) {
      let n = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF", o = new RegExp(`[\\n][${n}]+`);
      if (e.match(o)) return e;
      let a = t - r;
      if (a < i) return e;
      let l = e.slice(0, r), h = e.slice(r).replace(`\r
`, `
`), p = " ".repeat(r), k = "\\s\u200B", S = new RegExp(
        `
|.{1,${a - 1}}([${k}]|$)|[^${k}]+?([${k}]|$)`,
        "g"
      ), O = h.match(S) || [];
      return l + O.map((q, rt) => q === `
` ? "" : (rt > 0 ? p : "") + q.trimEnd()).join(`
`);
    }
  };
  Pt.Help = dt;
});

// ../node_modules/commander/lib/option.js
var pt = I((ht) => {
  var { InvalidArgumentError: Hr } = Oe(), ct = class {
    static {
      d(this, "Option");
    }
    /**
     * Initialize a new `Option` with the given `flags` and `description`.
     *
     * @param {string} flags
     * @param {string} [description]
     */
    constructor(e, t) {
      this.flags = e, this.description = t || "", this.required = e.includes("<"), this.optional = e.includes("["), this.variadic = /\w\.\.\.[>\]]$/.
      test(e), this.mandatory = !1;
      let r = zr(e);
      this.short = r.shortFlag, this.long = r.longFlag, this.negate = !1, this.long && (this.negate = this.long.startsWith("--no-")), this.defaultValue =
      void 0, this.defaultValueDescription = void 0, this.presetArg = void 0, this.envVar = void 0, this.parseArg = void 0, this.hidden = !1,
      this.argChoices = void 0, this.conflictsWith = [], this.implied = void 0;
    }
    /**
     * Set the default value, and optionally supply the description to be displayed in the help.
     *
     * @param {*} value
     * @param {string} [description]
     * @return {Option}
     */
    default(e, t) {
      return this.defaultValue = e, this.defaultValueDescription = t, this;
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
    preset(e) {
      return this.presetArg = e, this;
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
    conflicts(e) {
      return this.conflictsWith = this.conflictsWith.concat(e), this;
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
    implies(e) {
      let t = e;
      return typeof e == "string" && (t = { [e]: !0 }), this.implied = Object.assign(this.implied || {}, t), this;
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
    env(e) {
      return this.envVar = e, this;
    }
    /**
     * Set the custom handler for processing CLI option arguments into option values.
     *
     * @param {Function} [fn]
     * @return {Option}
     */
    argParser(e) {
      return this.parseArg = e, this;
    }
    /**
     * Whether the option is mandatory and must have a value after parsing.
     *
     * @param {boolean} [mandatory=true]
     * @return {Option}
     */
    makeOptionMandatory(e = !0) {
      return this.mandatory = !!e, this;
    }
    /**
     * Hide option in help.
     *
     * @param {boolean} [hide=true]
     * @return {Option}
     */
    hideHelp(e = !0) {
      return this.hidden = !!e, this;
    }
    /**
     * @package
     */
    _concatValue(e, t) {
      return t === this.defaultValue || !Array.isArray(t) ? [e] : t.concat(e);
    }
    /**
     * Only allow option value to be one of choices.
     *
     * @param {string[]} values
     * @return {Option}
     */
    choices(e) {
      return this.argChoices = e.slice(), this.parseArg = (t, r) => {
        if (!this.argChoices.includes(t))
          throw new Hr(
            `Allowed choices are ${this.argChoices.join(", ")}.`
          );
        return this.variadic ? this._concatValue(t, r) : t;
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
     * as a object attribute key.
     *
     * @return {string}
     */
    attributeName() {
      return Kr(this.name().replace(/^no-/, ""));
    }
    /**
     * Check if `arg` matches the short or long flag.
     *
     * @param {string} arg
     * @return {boolean}
     * @package
     */
    is(e) {
      return this.short === e || this.long === e;
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
  }, lt = class {
    static {
      d(this, "DualOptions");
    }
    /**
     * @param {Option[]} options
     */
    constructor(e) {
      this.positiveOptions = /* @__PURE__ */ new Map(), this.negativeOptions = /* @__PURE__ */ new Map(), this.dualOptions = /* @__PURE__ */ new Set(),
      e.forEach((t) => {
        t.negate ? this.negativeOptions.set(t.attributeName(), t) : this.positiveOptions.set(t.attributeName(), t);
      }), this.negativeOptions.forEach((t, r) => {
        this.positiveOptions.has(r) && this.dualOptions.add(r);
      });
    }
    /**
     * Did the value come from the option, and not from possible matching dual option?
     *
     * @param {*} value
     * @param {Option} option
     * @returns {boolean}
     */
    valueFromOption(e, t) {
      let r = t.attributeName();
      if (!this.dualOptions.has(r)) return !0;
      let i = this.negativeOptions.get(r).presetArg, n = i !== void 0 ? i : !1;
      return t.negate === (n === e);
    }
  };
  function Kr(s) {
    return s.split("-").reduce((e, t) => e + t[0].toUpperCase() + t.slice(1));
  }
  d(Kr, "camelcase");
  function zr(s) {
    let e, t, r = s.split(/[ |,]+/);
    return r.length > 1 && !/^[[<]/.test(r[1]) && (e = r.shift()), t = r.shift(), !e && /^-[^-]$/.test(t) && (e = t, t = void 0), { shortFlag: e,
    longFlag: t };
  }
  d(zr, "splitOptionFlags");
  ht.Option = ct;
  ht.DualOptions = lt;
});

// ../node_modules/commander/lib/suggestSimilar.js
var Vt = I((Nt) => {
  function Gr(s, e) {
    if (Math.abs(s.length - e.length) > 3)
      return Math.max(s.length, e.length);
    let t = [];
    for (let r = 0; r <= s.length; r++)
      t[r] = [r];
    for (let r = 0; r <= e.length; r++)
      t[0][r] = r;
    for (let r = 1; r <= e.length; r++)
      for (let i = 1; i <= s.length; i++) {
        let n = 1;
        s[i - 1] === e[r - 1] ? n = 0 : n = 1, t[i][r] = Math.min(
          t[i - 1][r] + 1,
          // deletion
          t[i][r - 1] + 1,
          // insertion
          t[i - 1][r - 1] + n
          // substitution
        ), i > 1 && r > 1 && s[i - 1] === e[r - 2] && s[i - 2] === e[r - 1] && (t[i][r] = Math.min(t[i][r], t[i - 2][r - 2] + 1));
      }
    return t[s.length][e.length];
  }
  d(Gr, "editDistance");
  function Yr(s, e) {
    if (!e || e.length === 0) return "";
    e = Array.from(new Set(e));
    let t = s.startsWith("--");
    t && (s = s.slice(2), e = e.map((o) => o.slice(2)));
    let r = [], i = 3, n = 0.4;
    return e.forEach((o) => {
      if (o.length <= 1) return;
      let a = Gr(s, o), l = Math.max(s.length, o.length);
      (l - a) / l > n && (a < i ? (i = a, r = [o]) : a === i && r.push(o));
    }), r.sort((o, a) => o.localeCompare(a)), t && (r = r.map((o) => `--${o}`)), r.length > 1 ? `
(Did you mean one of ${r.join(", ")}?)` : r.length === 1 ? `
(Did you mean ${r[0]}?)` : "";
  }
  d(Yr, "suggestSimilar");
  Nt.suggestSimilar = Yr;
});

// ../node_modules/commander/lib/command.js
var Ut = I((Lt) => {
  var Jr = require("node:events").EventEmitter, ft = require("node:child_process"), U = require("node:path"), mt = require("node:fs"), w = require("node:process"),
  { Argument: Xr, humanReadableArgName: Qr } = Ve(), { CommanderError: gt } = Oe(), { Help: es } = ut(), { Option: Dt, DualOptions: ts } = pt(),
  { suggestSimilar: $t } = Vt(), yt = class s extends Jr {
    static {
      d(this, "Command");
    }
    /**
     * Initialize a new `Command`.
     *
     * @param {string} [name]
     */
    constructor(e) {
      super(), this.commands = [], this.options = [], this.parent = null, this._allowUnknownOption = !1, this._allowExcessArguments = !0, this.
      registeredArguments = [], this._args = this.registeredArguments, this.args = [], this.rawArgs = [], this.processedArgs = [], this._scriptPath =
      null, this._name = e || "", this._optionValues = {}, this._optionValueSources = {}, this._storeOptionsAsProperties = !1, this._actionHandler =
      null, this._executableHandler = !1, this._executableFile = null, this._executableDir = null, this._defaultCommandName = null, this._exitCallback =
      null, this._aliases = [], this._combineFlagAndOptionalValue = !0, this._description = "", this._summary = "", this._argsDescription = void 0,
      this._enablePositionalOptions = !1, this._passThroughOptions = !1, this._lifeCycleHooks = {}, this._showHelpAfterError = !1, this._showSuggestionAfterError =
      !0, this._outputConfiguration = {
        writeOut: /* @__PURE__ */ d((t) => w.stdout.write(t), "writeOut"),
        writeErr: /* @__PURE__ */ d((t) => w.stderr.write(t), "writeErr"),
        getOutHelpWidth: /* @__PURE__ */ d(() => w.stdout.isTTY ? w.stdout.columns : void 0, "getOutHelpWidth"),
        getErrHelpWidth: /* @__PURE__ */ d(() => w.stderr.isTTY ? w.stderr.columns : void 0, "getErrHelpWidth"),
        outputError: /* @__PURE__ */ d((t, r) => r(t), "outputError")
      }, this._hidden = !1, this._helpOption = void 0, this._addImplicitHelpCommand = void 0, this._helpCommand = void 0, this._helpConfiguration =
      {};
    }
    /**
     * Copy settings that are useful to have in common across root command and subcommands.
     *
     * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
     *
     * @param {Command} sourceCommand
     * @return {Command} `this` command for chaining
     */
    copyInheritedSettings(e) {
      return this._outputConfiguration = e._outputConfiguration, this._helpOption = e._helpOption, this._helpCommand = e._helpCommand, this.
      _helpConfiguration = e._helpConfiguration, this._exitCallback = e._exitCallback, this._storeOptionsAsProperties = e._storeOptionsAsProperties,
      this._combineFlagAndOptionalValue = e._combineFlagAndOptionalValue, this._allowExcessArguments = e._allowExcessArguments, this._enablePositionalOptions =
      e._enablePositionalOptions, this._showHelpAfterError = e._showHelpAfterError, this._showSuggestionAfterError = e._showSuggestionAfterError,
      this;
    }
    /**
     * @returns {Command[]}
     * @private
     */
    _getCommandAndAncestors() {
      let e = [];
      for (let t = this; t; t = t.parent)
        e.push(t);
      return e;
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
    command(e, t, r) {
      let i = t, n = r;
      typeof i == "object" && i !== null && (n = i, i = null), n = n || {};
      let [, o, a] = e.match(/([^ ]+) *(.*)/), l = this.createCommand(o);
      return i && (l.description(i), l._executableHandler = !0), n.isDefault && (this._defaultCommandName = l._name), l._hidden = !!(n.noHelp ||
      n.hidden), l._executableFile = n.executableFile || null, a && l.arguments(a), this._registerCommand(l), l.parent = this, l.copyInheritedSettings(
      this), i ? this : l;
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
    createCommand(e) {
      return new s(e);
    }
    /**
     * You can customise the help with a subclass of Help by overriding createHelp,
     * or by overriding Help properties using configureHelp().
     *
     * @return {Help}
     */
    createHelp() {
      return Object.assign(new es(), this.configureHelp());
    }
    /**
     * You can customise the help by overriding Help properties using configureHelp(),
     * or with a subclass of Help by overriding createHelp().
     *
     * @param {object} [configuration] - configuration options
     * @return {(Command | object)} `this` command for chaining, or stored configuration
     */
    configureHelp(e) {
      return e === void 0 ? this._helpConfiguration : (this._helpConfiguration = e, this);
    }
    /**
     * The default output goes to stdout and stderr. You can customise this for special
     * applications. You can also customise the display of errors by overriding outputError.
     *
     * The configuration properties are all functions:
     *
     *     // functions to change where being written, stdout and stderr
     *     writeOut(str)
     *     writeErr(str)
     *     // matching functions to specify width for wrapping help
     *     getOutHelpWidth()
     *     getErrHelpWidth()
     *     // functions based on what is being written out
     *     outputError(str, write) // used for displaying errors, and not used for displaying help
     *
     * @param {object} [configuration] - configuration options
     * @return {(Command | object)} `this` command for chaining, or stored configuration
     */
    configureOutput(e) {
      return e === void 0 ? this._outputConfiguration : (Object.assign(this._outputConfiguration, e), this);
    }
    /**
     * Display the help or a custom message after an error occurs.
     *
     * @param {(boolean|string)} [displayHelp]
     * @return {Command} `this` command for chaining
     */
    showHelpAfterError(e = !0) {
      return typeof e != "string" && (e = !!e), this._showHelpAfterError = e, this;
    }
    /**
     * Display suggestion of similar commands for unknown commands, or options for unknown options.
     *
     * @param {boolean} [displaySuggestion]
     * @return {Command} `this` command for chaining
     */
    showSuggestionAfterError(e = !0) {
      return this._showSuggestionAfterError = !!e, this;
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
    addCommand(e, t) {
      if (!e._name)
        throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      return t = t || {}, t.isDefault && (this._defaultCommandName = e._name), (t.noHelp || t.hidden) && (e._hidden = !0), this._registerCommand(
      e), e.parent = this, e._checkForBrokenPassThrough(), this;
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
    createArgument(e, t) {
      return new Xr(e, t);
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
     * @param {(Function|*)} [fn] - custom argument processing function
     * @param {*} [defaultValue]
     * @return {Command} `this` command for chaining
     */
    argument(e, t, r, i) {
      let n = this.createArgument(e, t);
      return typeof r == "function" ? n.default(i).argParser(r) : n.default(r), this.addArgument(n), this;
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
    arguments(e) {
      return e.trim().split(/ +/).forEach((t) => {
        this.argument(t);
      }), this;
    }
    /**
     * Define argument syntax for command, adding a prepared argument.
     *
     * @param {Argument} argument
     * @return {Command} `this` command for chaining
     */
    addArgument(e) {
      let t = this.registeredArguments.slice(-1)[0];
      if (t && t.variadic)
        throw new Error(
          `only the last argument can be variadic '${t.name()}'`
        );
      if (e.required && e.defaultValue !== void 0 && e.parseArg === void 0)
        throw new Error(
          `a default value for a required argument is never used: '${e.name()}'`
        );
      return this.registeredArguments.push(e), this;
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
    helpCommand(e, t) {
      if (typeof e == "boolean")
        return this._addImplicitHelpCommand = e, this;
      e = e ?? "help [command]";
      let [, r, i] = e.match(/([^ ]+) *(.*)/), n = t ?? "display help for command", o = this.createCommand(r);
      return o.helpOption(!1), i && o.arguments(i), n && o.description(n), this._addImplicitHelpCommand = !0, this._helpCommand = o, this;
    }
    /**
     * Add prepared custom help command.
     *
     * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
     * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
     * @return {Command} `this` command for chaining
     */
    addHelpCommand(e, t) {
      return typeof e != "object" ? (this.helpCommand(e, t), this) : (this._addImplicitHelpCommand = !0, this._helpCommand = e, this);
    }
    /**
     * Lazy create help command.
     *
     * @return {(Command|null)}
     * @package
     */
    _getHelpCommand() {
      return this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help")) ? (this._helpCommand ===
      void 0 && this.helpCommand(void 0, void 0), this._helpCommand) : null;
    }
    /**
     * Add hook for life cycle event.
     *
     * @param {string} event
     * @param {Function} listener
     * @return {Command} `this` command for chaining
     */
    hook(e, t) {
      let r = ["preSubcommand", "preAction", "postAction"];
      if (!r.includes(e))
        throw new Error(`Unexpected value for event passed to hook : '${e}'.
Expecting one of '${r.join("', '")}'`);
      return this._lifeCycleHooks[e] ? this._lifeCycleHooks[e].push(t) : this._lifeCycleHooks[e] = [t], this;
    }
    /**
     * Register callback to use as replacement for calling process.exit.
     *
     * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
     * @return {Command} `this` command for chaining
     */
    exitOverride(e) {
      return e ? this._exitCallback = e : this._exitCallback = (t) => {
        if (t.code !== "commander.executeSubCommandAsync")
          throw t;
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
    _exit(e, t, r) {
      this._exitCallback && this._exitCallback(new gt(e, t, r)), w.exit(e);
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
    action(e) {
      let t = /* @__PURE__ */ d((r) => {
        let i = this.registeredArguments.length, n = r.slice(0, i);
        return this._storeOptionsAsProperties ? n[i] = this : n[i] = this.opts(), n.push(this), e.apply(this, n);
      }, "listener");
      return this._actionHandler = t, this;
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
    createOption(e, t) {
      return new Dt(e, t);
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
    _callParseArg(e, t, r, i) {
      try {
        return e.parseArg(t, r);
      } catch (n) {
        if (n.code === "commander.invalidArgument") {
          let o = `${i} ${n.message}`;
          this.error(o, { exitCode: n.exitCode, code: n.code });
        }
        throw n;
      }
    }
    /**
     * Check for option flag conflicts.
     * Register option if no conflicts found, or throw on conflict.
     *
     * @param {Option} option
     * @private
     */
    _registerOption(e) {
      let t = e.short && this._findOption(e.short) || e.long && this._findOption(e.long);
      if (t) {
        let r = e.long && this._findOption(e.long) ? e.long : e.short;
        throw new Error(`Cannot add option '${e.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${r}'
-  already used by option '${t.flags}'`);
      }
      this.options.push(e);
    }
    /**
     * Check for command name and alias conflicts with existing commands.
     * Register command if no conflicts found, or throw on conflict.
     *
     * @param {Command} command
     * @private
     */
    _registerCommand(e) {
      let t = /* @__PURE__ */ d((i) => [i.name()].concat(i.aliases()), "knownBy"), r = t(e).find(
        (i) => this._findCommand(i)
      );
      if (r) {
        let i = t(this._findCommand(r)).join("|"), n = t(e).join("|");
        throw new Error(
          `cannot add command '${n}' as already have command '${i}'`
        );
      }
      this.commands.push(e);
    }
    /**
     * Add an option.
     *
     * @param {Option} option
     * @return {Command} `this` command for chaining
     */
    addOption(e) {
      this._registerOption(e);
      let t = e.name(), r = e.attributeName();
      if (e.negate) {
        let n = e.long.replace(/^--no-/, "--");
        this._findOption(n) || this.setOptionValueWithSource(
          r,
          e.defaultValue === void 0 ? !0 : e.defaultValue,
          "default"
        );
      } else e.defaultValue !== void 0 && this.setOptionValueWithSource(r, e.defaultValue, "default");
      let i = /* @__PURE__ */ d((n, o, a) => {
        n == null && e.presetArg !== void 0 && (n = e.presetArg);
        let l = this.getOptionValue(r);
        n !== null && e.parseArg ? n = this._callParseArg(e, n, l, o) : n !== null && e.variadic && (n = e._concatValue(n, l)), n == null &&
        (e.negate ? n = !1 : e.isBoolean() || e.optional ? n = !0 : n = ""), this.setOptionValueWithSource(r, n, a);
      }, "handleOptionValue");
      return this.on("option:" + t, (n) => {
        let o = `error: option '${e.flags}' argument '${n}' is invalid.`;
        i(n, o, "cli");
      }), e.envVar && this.on("optionEnv:" + t, (n) => {
        let o = `error: option '${e.flags}' value '${n}' from env '${e.envVar}' is invalid.`;
        i(n, o, "env");
      }), this;
    }
    /**
     * Internal implementation shared by .option() and .requiredOption()
     *
     * @return {Command} `this` command for chaining
     * @private
     */
    _optionEx(e, t, r, i, n) {
      if (typeof t == "object" && t instanceof Dt)
        throw new Error(
          "To add an Option object use addOption() instead of option() or requiredOption()"
        );
      let o = this.createOption(t, r);
      if (o.makeOptionMandatory(!!e.mandatory), typeof i == "function")
        o.default(n).argParser(i);
      else if (i instanceof RegExp) {
        let a = i;
        i = /* @__PURE__ */ d((l, h) => {
          let p = a.exec(l);
          return p ? p[0] : h;
        }, "fn"), o.default(n).argParser(i);
      } else
        o.default(i);
      return this.addOption(o);
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
     *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
     *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
     *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
     *
     * @param {string} flags
     * @param {string} [description]
     * @param {(Function|*)} [parseArg] - custom option processing function or default value
     * @param {*} [defaultValue]
     * @return {Command} `this` command for chaining
     */
    option(e, t, r, i) {
      return this._optionEx({}, e, t, r, i);
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
    requiredOption(e, t, r, i) {
      return this._optionEx(
        { mandatory: !0 },
        e,
        t,
        r,
        i
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
    combineFlagAndOptionalValue(e = !0) {
      return this._combineFlagAndOptionalValue = !!e, this;
    }
    /**
     * Allow unknown options on the command line.
     *
     * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
     * @return {Command} `this` command for chaining
     */
    allowUnknownOption(e = !0) {
      return this._allowUnknownOption = !!e, this;
    }
    /**
     * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
     *
     * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
     * @return {Command} `this` command for chaining
     */
    allowExcessArguments(e = !0) {
      return this._allowExcessArguments = !!e, this;
    }
    /**
     * Enable positional options. Positional means global options are specified before subcommands which lets
     * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
     * The default behaviour is non-positional and global options may appear anywhere on the command line.
     *
     * @param {boolean} [positional]
     * @return {Command} `this` command for chaining
     */
    enablePositionalOptions(e = !0) {
      return this._enablePositionalOptions = !!e, this;
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
    passThroughOptions(e = !0) {
      return this._passThroughOptions = !!e, this._checkForBrokenPassThrough(), this;
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
    storeOptionsAsProperties(e = !0) {
      if (this.options.length)
        throw new Error("call .storeOptionsAsProperties() before adding options");
      if (Object.keys(this._optionValues).length)
        throw new Error(
          "call .storeOptionsAsProperties() before setting option values"
        );
      return this._storeOptionsAsProperties = !!e, this;
    }
    /**
     * Retrieve option value.
     *
     * @param {string} key
     * @return {object} value
     */
    getOptionValue(e) {
      return this._storeOptionsAsProperties ? this[e] : this._optionValues[e];
    }
    /**
     * Store option value.
     *
     * @param {string} key
     * @param {object} value
     * @return {Command} `this` command for chaining
     */
    setOptionValue(e, t) {
      return this.setOptionValueWithSource(e, t, void 0);
    }
    /**
     * Store option value and where the value came from.
     *
     * @param {string} key
     * @param {object} value
     * @param {string} source - expected values are default/config/env/cli/implied
     * @return {Command} `this` command for chaining
     */
    setOptionValueWithSource(e, t, r) {
      return this._storeOptionsAsProperties ? this[e] = t : this._optionValues[e] = t, this._optionValueSources[e] = r, this;
    }
    /**
     * Get source of option value.
     * Expected values are default | config | env | cli | implied
     *
     * @param {string} key
     * @return {string}
     */
    getOptionValueSource(e) {
      return this._optionValueSources[e];
    }
    /**
     * Get source of option value. See also .optsWithGlobals().
     * Expected values are default | config | env | cli | implied
     *
     * @param {string} key
     * @return {string}
     */
    getOptionValueSourceWithGlobals(e) {
      let t;
      return this._getCommandAndAncestors().forEach((r) => {
        r.getOptionValueSource(e) !== void 0 && (t = r.getOptionValueSource(e));
      }), t;
    }
    /**
     * Get user arguments from implied or explicit arguments.
     * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
     *
     * @private
     */
    _prepareUserArgs(e, t) {
      if (e !== void 0 && !Array.isArray(e))
        throw new Error("first parameter to parse must be array or undefined");
      if (t = t || {}, e === void 0 && t.from === void 0) {
        w.versions?.electron && (t.from = "electron");
        let i = w.execArgv ?? [];
        (i.includes("-e") || i.includes("--eval") || i.includes("-p") || i.includes("--print")) && (t.from = "eval");
      }
      e === void 0 && (e = w.argv), this.rawArgs = e.slice();
      let r;
      switch (t.from) {
        case void 0:
        case "node":
          this._scriptPath = e[1], r = e.slice(2);
          break;
        case "electron":
          w.defaultApp ? (this._scriptPath = e[1], r = e.slice(2)) : r = e.slice(1);
          break;
        case "user":
          r = e.slice(0);
          break;
        case "eval":
          r = e.slice(1);
          break;
        default:
          throw new Error(
            `unexpected parse option { from: '${t.from}' }`
          );
      }
      return !this._name && this._scriptPath && this.nameFromFilename(this._scriptPath), this._name = this._name || "program", r;
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
    parse(e, t) {
      let r = this._prepareUserArgs(e, t);
      return this._parseCommand([], r), this;
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
    async parseAsync(e, t) {
      let r = this._prepareUserArgs(e, t);
      return await this._parseCommand([], r), this;
    }
    /**
     * Execute a sub-command executable.
     *
     * @private
     */
    _executeSubCommand(e, t) {
      t = t.slice();
      let r = !1, i = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function n(p, y) {
        let k = U.resolve(p, y);
        if (mt.existsSync(k)) return k;
        if (i.includes(U.extname(y))) return;
        let S = i.find(
          (O) => mt.existsSync(`${k}${O}`)
        );
        if (S) return `${k}${S}`;
      }
      d(n, "findFile"), this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions();
      let o = e._executableFile || `${this._name}-${e._name}`, a = this._executableDir || "";
      if (this._scriptPath) {
        let p;
        try {
          p = mt.realpathSync(this._scriptPath);
        } catch {
          p = this._scriptPath;
        }
        a = U.resolve(
          U.dirname(p),
          a
        );
      }
      if (a) {
        let p = n(a, o);
        if (!p && !e._executableFile && this._scriptPath) {
          let y = U.basename(
            this._scriptPath,
            U.extname(this._scriptPath)
          );
          y !== this._name && (p = n(
            a,
            `${y}-${e._name}`
          ));
        }
        o = p || o;
      }
      r = i.includes(U.extname(o));
      let l;
      w.platform !== "win32" ? r ? (t.unshift(o), t = Mt(w.execArgv).concat(t), l = ft.spawn(w.argv[0], t, { stdio: "inherit" })) : l = ft.spawn(
      o, t, { stdio: "inherit" }) : (t.unshift(o), t = Mt(w.execArgv).concat(t), l = ft.spawn(w.execPath, t, { stdio: "inherit" })), l.killed ||
      ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"].forEach((y) => {
        w.on(y, () => {
          l.killed === !1 && l.exitCode === null && l.kill(y);
        });
      });
      let h = this._exitCallback;
      l.on("close", (p) => {
        p = p ?? 1, h ? h(
          new gt(
            p,
            "commander.executeSubCommandAsync",
            "(close)"
          )
        ) : w.exit(p);
      }), l.on("error", (p) => {
        if (p.code === "ENOENT") {
          let y = a ? `searched for local subcommand relative to directory '${a}'` : "no directory for search for local subcommand, use .exe\
cutableDir() to supply a custom directory", k = `'${o}' does not exist
 - if '${e._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead\

 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${y}`;
          throw new Error(k);
        } else if (p.code === "EACCES")
          throw new Error(`'${o}' not executable`);
        if (!h)
          w.exit(1);
        else {
          let y = new gt(
            1,
            "commander.executeSubCommandAsync",
            "(error)"
          );
          y.nestedError = p, h(y);
        }
      }), this.runningCommand = l;
    }
    /**
     * @private
     */
    _dispatchSubcommand(e, t, r) {
      let i = this._findCommand(e);
      i || this.help({ error: !0 });
      let n;
      return n = this._chainOrCallSubCommandHook(
        n,
        i,
        "preSubcommand"
      ), n = this._chainOrCall(n, () => {
        if (i._executableHandler)
          this._executeSubCommand(i, t.concat(r));
        else
          return i._parseCommand(t, r);
      }), n;
    }
    /**
     * Invoke help directly if possible, or dispatch if necessary.
     * e.g. help foo
     *
     * @private
     */
    _dispatchHelpCommand(e) {
      e || this.help();
      let t = this._findCommand(e);
      return t && !t._executableHandler && t.help(), this._dispatchSubcommand(
        e,
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
      this.registeredArguments.forEach((e, t) => {
        e.required && this.args[t] == null && this.missingArgument(e.name());
      }), !(this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) && this.args.length >
      this.registeredArguments.length && this._excessArguments(this.args);
    }
    /**
     * Process this.args using this.registeredArguments and save as this.processedArgs!
     *
     * @private
     */
    _processArguments() {
      let e = /* @__PURE__ */ d((r, i, n) => {
        let o = i;
        if (i !== null && r.parseArg) {
          let a = `error: command-argument value '${i}' is invalid for argument '${r.name()}'.`;
          o = this._callParseArg(
            r,
            i,
            n,
            a
          );
        }
        return o;
      }, "myParseArg");
      this._checkNumberOfArguments();
      let t = [];
      this.registeredArguments.forEach((r, i) => {
        let n = r.defaultValue;
        r.variadic ? i < this.args.length ? (n = this.args.slice(i), r.parseArg && (n = n.reduce((o, a) => e(r, a, o), r.defaultValue))) : n ===
        void 0 && (n = []) : i < this.args.length && (n = this.args[i], r.parseArg && (n = e(r, n, r.defaultValue))), t[i] = n;
      }), this.processedArgs = t;
    }
    /**
     * Once we have a promise we chain, but call synchronously until then.
     *
     * @param {(Promise|undefined)} promise
     * @param {Function} fn
     * @return {(Promise|undefined)}
     * @private
     */
    _chainOrCall(e, t) {
      return e && e.then && typeof e.then == "function" ? e.then(() => t()) : t();
    }
    /**
     *
     * @param {(Promise|undefined)} promise
     * @param {string} event
     * @return {(Promise|undefined)}
     * @private
     */
    _chainOrCallHooks(e, t) {
      let r = e, i = [];
      return this._getCommandAndAncestors().reverse().filter((n) => n._lifeCycleHooks[t] !== void 0).forEach((n) => {
        n._lifeCycleHooks[t].forEach((o) => {
          i.push({ hookedCommand: n, callback: o });
        });
      }), t === "postAction" && i.reverse(), i.forEach((n) => {
        r = this._chainOrCall(r, () => n.callback(n.hookedCommand, this));
      }), r;
    }
    /**
     *
     * @param {(Promise|undefined)} promise
     * @param {Command} subCommand
     * @param {string} event
     * @return {(Promise|undefined)}
     * @private
     */
    _chainOrCallSubCommandHook(e, t, r) {
      let i = e;
      return this._lifeCycleHooks[r] !== void 0 && this._lifeCycleHooks[r].forEach((n) => {
        i = this._chainOrCall(i, () => n(this, t));
      }), i;
    }
    /**
     * Process arguments in context of this command.
     * Returns action result, in case it is a promise.
     *
     * @private
     */
    _parseCommand(e, t) {
      let r = this.parseOptions(t);
      if (this._parseOptionsEnv(), this._parseOptionsImplied(), e = e.concat(r.operands), t = r.unknown, this.args = e.concat(t), e && this.
      _findCommand(e[0]))
        return this._dispatchSubcommand(e[0], e.slice(1), t);
      if (this._getHelpCommand() && e[0] === this._getHelpCommand().name())
        return this._dispatchHelpCommand(e[1]);
      if (this._defaultCommandName)
        return this._outputHelpIfRequested(t), this._dispatchSubcommand(
          this._defaultCommandName,
          e,
          t
        );
      this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName && this.help({ error: !0 }), this.
      _outputHelpIfRequested(r.unknown), this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions();
      let i = /* @__PURE__ */ d(() => {
        r.unknown.length > 0 && this.unknownOption(r.unknown[0]);
      }, "checkForUnknownOptions"), n = `command:${this.name()}`;
      if (this._actionHandler) {
        i(), this._processArguments();
        let o;
        return o = this._chainOrCallHooks(o, "preAction"), o = this._chainOrCall(
          o,
          () => this._actionHandler(this.processedArgs)
        ), this.parent && (o = this._chainOrCall(o, () => {
          this.parent.emit(n, e, t);
        })), o = this._chainOrCallHooks(o, "postAction"), o;
      }
      if (this.parent && this.parent.listenerCount(n))
        i(), this._processArguments(), this.parent.emit(n, e, t);
      else if (e.length) {
        if (this._findCommand("*"))
          return this._dispatchSubcommand("*", e, t);
        this.listenerCount("command:*") ? this.emit("command:*", e, t) : this.commands.length ? this.unknownCommand() : (i(), this._processArguments());
      } else this.commands.length ? (i(), this.help({ error: !0 })) : (i(), this._processArguments());
    }
    /**
     * Find matching command.
     *
     * @private
     * @return {Command | undefined}
     */
    _findCommand(e) {
      if (e)
        return this.commands.find(
          (t) => t._name === e || t._aliases.includes(e)
        );
    }
    /**
     * Return an option matching `arg` if any.
     *
     * @param {string} arg
     * @return {Option}
     * @package
     */
    _findOption(e) {
      return this.options.find((t) => t.is(e));
    }
    /**
     * Display an error message if a mandatory option does not have a value.
     * Called after checking for help flags in leaf subcommand.
     *
     * @private
     */
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((e) => {
        e.options.forEach((t) => {
          t.mandatory && e.getOptionValue(t.attributeName()) === void 0 && e.missingMandatoryOptionValue(t);
        });
      });
    }
    /**
     * Display an error message if conflicting options are used together in this.
     *
     * @private
     */
    _checkForConflictingLocalOptions() {
      let e = this.options.filter((r) => {
        let i = r.attributeName();
        return this.getOptionValue(i) === void 0 ? !1 : this.getOptionValueSource(i) !== "default";
      });
      e.filter(
        (r) => r.conflictsWith.length > 0
      ).forEach((r) => {
        let i = e.find(
          (n) => r.conflictsWith.includes(n.attributeName())
        );
        i && this._conflictingOption(r, i);
      });
    }
    /**
     * Display an error message if conflicting options are used together.
     * Called after checking for help flags in leaf subcommand.
     *
     * @private
     */
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((e) => {
        e._checkForConflictingLocalOptions();
      });
    }
    /**
     * Parse options from `argv` removing known options,
     * and return argv split into operands and unknown arguments.
     *
     * Examples:
     *
     *     argv => operands, unknown
     *     --known kkk op => [op], []
     *     op --known kkk => [op], []
     *     sub --unknown uuu op => [sub], [--unknown uuu op]
     *     sub -- --unknown uuu op => [sub --unknown uuu op], []
     *
     * @param {string[]} argv
     * @return {{operands: string[], unknown: string[]}}
     */
    parseOptions(e) {
      let t = [], r = [], i = t, n = e.slice();
      function o(l) {
        return l.length > 1 && l[0] === "-";
      }
      d(o, "maybeOption");
      let a = null;
      for (; n.length; ) {
        let l = n.shift();
        if (l === "--") {
          i === r && i.push(l), i.push(...n);
          break;
        }
        if (a && !o(l)) {
          this.emit(`option:${a.name()}`, l);
          continue;
        }
        if (a = null, o(l)) {
          let h = this._findOption(l);
          if (h) {
            if (h.required) {
              let p = n.shift();
              p === void 0 && this.optionMissingArgument(h), this.emit(`option:${h.name()}`, p);
            } else if (h.optional) {
              let p = null;
              n.length > 0 && !o(n[0]) && (p = n.shift()), this.emit(`option:${h.name()}`, p);
            } else
              this.emit(`option:${h.name()}`);
            a = h.variadic ? h : null;
            continue;
          }
        }
        if (l.length > 2 && l[0] === "-" && l[1] !== "-") {
          let h = this._findOption(`-${l[1]}`);
          if (h) {
            h.required || h.optional && this._combineFlagAndOptionalValue ? this.emit(`option:${h.name()}`, l.slice(2)) : (this.emit(`option\
:${h.name()}`), n.unshift(`-${l.slice(2)}`));
            continue;
          }
        }
        if (/^--[^=]+=/.test(l)) {
          let h = l.indexOf("="), p = this._findOption(l.slice(0, h));
          if (p && (p.required || p.optional)) {
            this.emit(`option:${p.name()}`, l.slice(h + 1));
            continue;
          }
        }
        if (o(l) && (i = r), (this._enablePositionalOptions || this._passThroughOptions) && t.length === 0 && r.length === 0) {
          if (this._findCommand(l)) {
            t.push(l), n.length > 0 && r.push(...n);
            break;
          } else if (this._getHelpCommand() && l === this._getHelpCommand().name()) {
            t.push(l), n.length > 0 && t.push(...n);
            break;
          } else if (this._defaultCommandName) {
            r.push(l), n.length > 0 && r.push(...n);
            break;
          }
        }
        if (this._passThroughOptions) {
          i.push(l), n.length > 0 && i.push(...n);
          break;
        }
        i.push(l);
      }
      return { operands: t, unknown: r };
    }
    /**
     * Return an object containing local option values as key-value pairs.
     *
     * @return {object}
     */
    opts() {
      if (this._storeOptionsAsProperties) {
        let e = {}, t = this.options.length;
        for (let r = 0; r < t; r++) {
          let i = this.options[r].attributeName();
          e[i] = i === this._versionOptionName ? this._version : this[i];
        }
        return e;
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
        (e, t) => Object.assign(e, t.opts()),
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
    error(e, t) {
      this._outputConfiguration.outputError(
        `${e}
`,
        this._outputConfiguration.writeErr
      ), typeof this._showHelpAfterError == "string" ? this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`) : this._showHelpAfterError && (this._outputConfiguration.writeErr(`
`), this.outputHelp({ error: !0 }));
      let r = t || {}, i = r.exitCode || 1, n = r.code || "commander.error";
      this._exit(i, n, e);
    }
    /**
     * Apply any option related environment variables, if option does
     * not have a value from cli or client code.
     *
     * @private
     */
    _parseOptionsEnv() {
      this.options.forEach((e) => {
        if (e.envVar && e.envVar in w.env) {
          let t = e.attributeName();
          (this.getOptionValue(t) === void 0 || ["default", "config", "env"].includes(
            this.getOptionValueSource(t)
          )) && (e.required || e.optional ? this.emit(`optionEnv:${e.name()}`, w.env[e.envVar]) : this.emit(`optionEnv:${e.name()}`));
        }
      });
    }
    /**
     * Apply any implied option values, if option is undefined or default value.
     *
     * @private
     */
    _parseOptionsImplied() {
      let e = new ts(this.options), t = /* @__PURE__ */ d((r) => this.getOptionValue(r) !== void 0 && !["default", "implied"].includes(this.
      getOptionValueSource(r)), "hasCustomOptionValue");
      this.options.filter(
        (r) => r.implied !== void 0 && t(r.attributeName()) && e.valueFromOption(
          this.getOptionValue(r.attributeName()),
          r
        )
      ).forEach((r) => {
        Object.keys(r.implied).filter((i) => !t(i)).forEach((i) => {
          this.setOptionValueWithSource(
            i,
            r.implied[i],
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
    missingArgument(e) {
      let t = `error: missing required argument '${e}'`;
      this.error(t, { code: "commander.missingArgument" });
    }
    /**
     * `Option` is missing an argument.
     *
     * @param {Option} option
     * @private
     */
    optionMissingArgument(e) {
      let t = `error: option '${e.flags}' argument missing`;
      this.error(t, { code: "commander.optionMissingArgument" });
    }
    /**
     * `Option` does not have a value, and is a mandatory option.
     *
     * @param {Option} option
     * @private
     */
    missingMandatoryOptionValue(e) {
      let t = `error: required option '${e.flags}' not specified`;
      this.error(t, { code: "commander.missingMandatoryOptionValue" });
    }
    /**
     * `Option` conflicts with another option.
     *
     * @param {Option} option
     * @param {Option} conflictingOption
     * @private
     */
    _conflictingOption(e, t) {
      let r = /* @__PURE__ */ d((o) => {
        let a = o.attributeName(), l = this.getOptionValue(a), h = this.options.find(
          (y) => y.negate && a === y.attributeName()
        ), p = this.options.find(
          (y) => !y.negate && a === y.attributeName()
        );
        return h && (h.presetArg === void 0 && l === !1 || h.presetArg !== void 0 && l === h.presetArg) ? h : p || o;
      }, "findBestOptionFromValue"), i = /* @__PURE__ */ d((o) => {
        let a = r(o), l = a.attributeName();
        return this.getOptionValueSource(l) === "env" ? `environment variable '${a.envVar}'` : `option '${a.flags}'`;
      }, "getErrorMessage"), n = `error: ${i(e)} cannot be used with ${i(t)}`;
      this.error(n, { code: "commander.conflictingOption" });
    }
    /**
     * Unknown option `flag`.
     *
     * @param {string} flag
     * @private
     */
    unknownOption(e) {
      if (this._allowUnknownOption) return;
      let t = "";
      if (e.startsWith("--") && this._showSuggestionAfterError) {
        let i = [], n = this;
        do {
          let o = n.createHelp().visibleOptions(n).filter((a) => a.long).map((a) => a.long);
          i = i.concat(o), n = n.parent;
        } while (n && !n._enablePositionalOptions);
        t = $t(e, i);
      }
      let r = `error: unknown option '${e}'${t}`;
      this.error(r, { code: "commander.unknownOption" });
    }
    /**
     * Excess arguments, more than expected.
     *
     * @param {string[]} receivedArgs
     * @private
     */
    _excessArguments(e) {
      if (this._allowExcessArguments) return;
      let t = this.registeredArguments.length, r = t === 1 ? "" : "s", n = `error: too many arguments${this.parent ? ` for '${this.name()}'` :
      ""}. Expected ${t} argument${r} but got ${e.length}.`;
      this.error(n, { code: "commander.excessArguments" });
    }
    /**
     * Unknown command.
     *
     * @private
     */
    unknownCommand() {
      let e = this.args[0], t = "";
      if (this._showSuggestionAfterError) {
        let i = [];
        this.createHelp().visibleCommands(this).forEach((n) => {
          i.push(n.name()), n.alias() && i.push(n.alias());
        }), t = $t(e, i);
      }
      let r = `error: unknown command '${e}'${t}`;
      this.error(r, { code: "commander.unknownCommand" });
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
    version(e, t, r) {
      if (e === void 0) return this._version;
      this._version = e, t = t || "-V, --version", r = r || "output the version number";
      let i = this.createOption(t, r);
      return this._versionOptionName = i.attributeName(), this._registerOption(i), this.on("option:" + i.name(), () => {
        this._outputConfiguration.writeOut(`${e}
`), this._exit(0, "commander.version", e);
      }), this;
    }
    /**
     * Set the description.
     *
     * @param {string} [str]
     * @param {object} [argsDescription]
     * @return {(string|Command)}
     */
    description(e, t) {
      return e === void 0 && t === void 0 ? this._description : (this._description = e, t && (this._argsDescription = t), this);
    }
    /**
     * Set the summary. Used when listed as subcommand of parent.
     *
     * @param {string} [str]
     * @return {(string|Command)}
     */
    summary(e) {
      return e === void 0 ? this._summary : (this._summary = e, this);
    }
    /**
     * Set an alias for the command.
     *
     * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
     *
     * @param {string} [alias]
     * @return {(string|Command)}
     */
    alias(e) {
      if (e === void 0) return this._aliases[0];
      let t = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler && (t = this.commands[this.commands.length -
      1]), e === t._name)
        throw new Error("Command alias can't be the same as its name");
      let r = this.parent?._findCommand(e);
      if (r) {
        let i = [r.name()].concat(r.aliases()).join("|");
        throw new Error(
          `cannot add alias '${e}' to command '${this.name()}' as already have command '${i}'`
        );
      }
      return t._aliases.push(e), this;
    }
    /**
     * Set aliases for the command.
     *
     * Only the first alias is shown in the auto-generated help.
     *
     * @param {string[]} [aliases]
     * @return {(string[]|Command)}
     */
    aliases(e) {
      return e === void 0 ? this._aliases : (e.forEach((t) => this.alias(t)), this);
    }
    /**
     * Set / get the command usage `str`.
     *
     * @param {string} [str]
     * @return {(string|Command)}
     */
    usage(e) {
      if (e === void 0) {
        if (this._usage) return this._usage;
        let t = this.registeredArguments.map((r) => Qr(r));
        return [].concat(
          this.options.length || this._helpOption !== null ? "[options]" : [],
          this.commands.length ? "[command]" : [],
          this.registeredArguments.length ? t : []
        ).join(" ");
      }
      return this._usage = e, this;
    }
    /**
     * Get or set the name of the command.
     *
     * @param {string} [str]
     * @return {(string|Command)}
     */
    name(e) {
      return e === void 0 ? this._name : (this._name = e, this);
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
    nameFromFilename(e) {
      return this._name = U.basename(e, U.extname(e)), this;
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
    executableDir(e) {
      return e === void 0 ? this._executableDir : (this._executableDir = e, this);
    }
    /**
     * Return program help documentation.
     *
     * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
     * @return {string}
     */
    helpInformation(e) {
      let t = this.createHelp();
      return t.helpWidth === void 0 && (t.helpWidth = e && e.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.
      getOutHelpWidth()), t.formatHelp(this, t);
    }
    /**
     * @private
     */
    _getHelpContext(e) {
      e = e || {};
      let t = { error: !!e.error }, r;
      return t.error ? r = /* @__PURE__ */ d((i) => this._outputConfiguration.writeErr(i), "write") : r = /* @__PURE__ */ d((i) => this._outputConfiguration.
      writeOut(i), "write"), t.write = e.write || r, t.command = this, t;
    }
    /**
     * Output help information for this command.
     *
     * Outputs built-in help, and custom text added using `.addHelpText()`.
     *
     * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
     */
    outputHelp(e) {
      let t;
      typeof e == "function" && (t = e, e = void 0);
      let r = this._getHelpContext(e);
      this._getCommandAndAncestors().reverse().forEach((n) => n.emit("beforeAllHelp", r)), this.emit("beforeHelp", r);
      let i = this.helpInformation(r);
      if (t && (i = t(i), typeof i != "string" && !Buffer.isBuffer(i)))
        throw new Error("outputHelp callback must return a string or a Buffer");
      r.write(i), this._getHelpOption()?.long && this.emit(this._getHelpOption().long), this.emit("afterHelp", r), this._getCommandAndAncestors().
      forEach(
        (n) => n.emit("afterAllHelp", r)
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
    helpOption(e, t) {
      return typeof e == "boolean" ? (e ? this._helpOption = this._helpOption ?? void 0 : this._helpOption = null, this) : (e = e ?? "-h, --\
help", t = t ?? "display help for command", this._helpOption = this.createOption(e, t), this);
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
    addHelpOption(e) {
      return this._helpOption = e, this;
    }
    /**
     * Output help information and exit.
     *
     * Outputs built-in help, and custom text added using `.addHelpText()`.
     *
     * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
     */
    help(e) {
      this.outputHelp(e);
      let t = w.exitCode || 0;
      t === 0 && e && typeof e != "function" && e.error && (t = 1), this._exit(t, "commander.help", "(outputHelp)");
    }
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
    addHelpText(e, t) {
      let r = ["beforeAll", "before", "after", "afterAll"];
      if (!r.includes(e))
        throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${r.join("', '")}'`);
      let i = `${e}Help`;
      return this.on(i, (n) => {
        let o;
        typeof t == "function" ? o = t({ error: n.error, command: n.command }) : o = t, o && n.write(`${o}
`);
      }), this;
    }
    /**
     * Output help information if help flags specified
     *
     * @param {Array} args - array of options to search for help flags
     * @private
     */
    _outputHelpIfRequested(e) {
      let t = this._getHelpOption();
      t && e.find((i) => t.is(i)) && (this.outputHelp(), this._exit(0, "commander.helpDisplayed", "(outputHelp)"));
    }
  };
  function Mt(s) {
    return s.map((e) => {
      if (!e.startsWith("--inspect"))
        return e;
      let t, r = "127.0.0.1", i = "9229", n;
      return (n = e.match(/^(--inspect(-brk)?)$/)) !== null ? t = n[1] : (n = e.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null ? (t =
      n[1], /^\d+$/.test(n[3]) ? i = n[3] : r = n[3]) : (n = e.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null && (t = n[1], r =
      n[3], i = n[4]), t && i !== "0" ? `${t}=${r}:${parseInt(i) + 1}` : e;
    });
  }
  d(Mt, "incrementNodeInspectorPort");
  Lt.Command = yt;
});

// ../node_modules/commander/index.js
var qt = I((Z) => {
  var { Argument: Ft } = Ve(), { Command: _t } = Ut(), { CommanderError: rs, InvalidArgumentError: Wt } = Oe(), { Help: ss } = ut(), { Option: Bt } = pt();
  Z.program = new _t();
  Z.createCommand = (s) => new _t(s);
  Z.createOption = (s, e) => new Bt(s, e);
  Z.createArgument = (s, e) => new Ft(s, e);
  Z.Command = _t;
  Z.Option = Bt;
  Z.Argument = Ft;
  Z.Help = ss;
  Z.CommanderError = rs;
  Z.InvalidArgumentError = Wt;
  Z.InvalidOptionArgumentError = Wt;
});

// ../node_modules/walk-up-path/dist/cjs/index.js
var Kt = I((De) => {
  "use strict";
  Object.defineProperty(De, "__esModule", { value: !0 });
  De.walkUp = void 0;
  var Ht = require("path"), is = /* @__PURE__ */ d(function* (s) {
    for (s = (0, Ht.resolve)(s); s; ) {
      yield s;
      let e = (0, Ht.dirname)(s);
      if (e === s)
        break;
      s = e;
    }
  }, "walkUp");
  De.walkUp = is;
});

// ../node_modules/picocolors/picocolors.js
var er = I((sn, xt) => {
  var Xt = process.argv || [], Me = process.env, as = !("NO_COLOR" in Me || Xt.includes("--no-color")) && ("FORCE_COLOR" in Me || Xt.includes(
  "--color") || process.platform === "win32" || require != null && require("tty").isatty(1) && Me.TERM !== "dumb" || "CI" in Me), ds = /* @__PURE__ */ d(
  (s, e, t = s) => (r) => {
    let i = "" + r, n = i.indexOf(e, s.length);
    return ~n ? s + us(i, e, t, n) + e : s + i + e;
  }, "formatter"), us = /* @__PURE__ */ d((s, e, t, r) => {
    let i = "", n = 0;
    do
      i += s.substring(n, r) + t, n = r + e.length, r = s.indexOf(e, n);
    while (~r);
    return i + s.substring(n);
  }, "replaceClose"), Qt = /* @__PURE__ */ d((s = as) => {
    let e = s ? ds : () => String;
    return {
      isColorSupported: s,
      reset: e("\x1B[0m", "\x1B[0m"),
      bold: e("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: e("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: e("\x1B[3m", "\x1B[23m"),
      underline: e("\x1B[4m", "\x1B[24m"),
      inverse: e("\x1B[7m", "\x1B[27m"),
      hidden: e("\x1B[8m", "\x1B[28m"),
      strikethrough: e("\x1B[9m", "\x1B[29m"),
      black: e("\x1B[30m", "\x1B[39m"),
      red: e("\x1B[31m", "\x1B[39m"),
      green: e("\x1B[32m", "\x1B[39m"),
      yellow: e("\x1B[33m", "\x1B[39m"),
      blue: e("\x1B[34m", "\x1B[39m"),
      magenta: e("\x1B[35m", "\x1B[39m"),
      cyan: e("\x1B[36m", "\x1B[39m"),
      white: e("\x1B[37m", "\x1B[39m"),
      gray: e("\x1B[90m", "\x1B[39m"),
      bgBlack: e("\x1B[40m", "\x1B[49m"),
      bgRed: e("\x1B[41m", "\x1B[49m"),
      bgGreen: e("\x1B[42m", "\x1B[49m"),
      bgYellow: e("\x1B[43m", "\x1B[49m"),
      bgBlue: e("\x1B[44m", "\x1B[49m"),
      bgMagenta: e("\x1B[45m", "\x1B[49m"),
      bgCyan: e("\x1B[46m", "\x1B[49m"),
      bgWhite: e("\x1B[47m", "\x1B[49m"),
      blackBright: e("\x1B[90m", "\x1B[39m"),
      redBright: e("\x1B[91m", "\x1B[39m"),
      greenBright: e("\x1B[92m", "\x1B[39m"),
      yellowBright: e("\x1B[93m", "\x1B[39m"),
      blueBright: e("\x1B[94m", "\x1B[39m"),
      magentaBright: e("\x1B[95m", "\x1B[39m"),
      cyanBright: e("\x1B[96m", "\x1B[39m"),
      whiteBright: e("\x1B[97m", "\x1B[39m"),
      bgBlackBright: e("\x1B[100m", "\x1B[49m"),
      bgRedBright: e("\x1B[101m", "\x1B[49m"),
      bgGreenBright: e("\x1B[102m", "\x1B[49m"),
      bgYellowBright: e("\x1B[103m", "\x1B[49m"),
      bgBlueBright: e("\x1B[104m", "\x1B[49m"),
      bgMagentaBright: e("\x1B[105m", "\x1B[49m"),
      bgCyanBright: e("\x1B[106m", "\x1B[49m"),
      bgWhiteBright: e("\x1B[107m", "\x1B[49m")
    };
  }, "createColors");
  xt.exports = Qt();
  xt.exports.createColors = Qt;
});

// ../node_modules/ts-dedent/dist/index.js
var kt = I((Ie) => {
  "use strict";
  Object.defineProperty(Ie, "__esModule", { value: !0 });
  Ie.dedent = void 0;
  function ir(s) {
    for (var e = [], t = 1; t < arguments.length; t++)
      e[t - 1] = arguments[t];
    var r = Array.from(typeof s == "string" ? [s] : s);
    r[r.length - 1] = r[r.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var i = r.reduce(function(a, l) {
      var h = l.match(/\n([\t ]+|(?!\s).)/g);
      return h ? a.concat(h.map(function(p) {
        var y, k;
        return (k = (y = p.match(/[\t ]/g)) === null || y === void 0 ? void 0 : y.length) !== null && k !== void 0 ? k : 0;
      })) : a;
    }, []);
    if (i.length) {
      var n = new RegExp(`
[	 ]{` + Math.min.apply(Math, i) + "}", "g");
      r = r.map(function(a) {
        return a.replace(n, `
`);
      });
    }
    r[0] = r[0].replace(/^\r?\n/, "");
    var o = r[0];
    return e.forEach(function(a, l) {
      var h = o.match(/(?:^|\n)( *)$/), p = h ? h[1] : "", y = a;
      typeof a == "string" && a.includes(`
`) && (y = String(a).split(`
`).map(function(k, S) {
        return S === 0 ? k : "" + p + k;
      }).join(`
`)), o += y + r[l + 1];
    }), o;
  }
  d(ir, "dedent");
  Ie.dedent = ir;
  Ie.default = ir;
});

// ../node_modules/zod/lib/helpers/util.js
var Te = I((C) => {
  "use strict";
  Object.defineProperty(C, "__esModule", { value: !0 });
  C.getParsedType = C.ZodParsedType = C.objectUtil = C.util = void 0;
  var Ot;
  (function(s) {
    s.assertEqual = (i) => i;
    function e(i) {
    }
    d(e, "assertIs"), s.assertIs = e;
    function t(i) {
      throw new Error();
    }
    d(t, "assertNever"), s.assertNever = t, s.arrayToEnum = (i) => {
      let n = {};
      for (let o of i)
        n[o] = o;
      return n;
    }, s.getValidEnumValues = (i) => {
      let n = s.objectKeys(i).filter((a) => typeof i[i[a]] != "number"), o = {};
      for (let a of n)
        o[a] = i[a];
      return s.objectValues(o);
    }, s.objectValues = (i) => s.objectKeys(i).map(function(n) {
      return i[n];
    }), s.objectKeys = typeof Object.keys == "function" ? (i) => Object.keys(i) : (i) => {
      let n = [];
      for (let o in i)
        Object.prototype.hasOwnProperty.call(i, o) && n.push(o);
      return n;
    }, s.find = (i, n) => {
      for (let o of i)
        if (n(o))
          return o;
    }, s.isInteger = typeof Number.isInteger == "function" ? (i) => Number.isInteger(i) : (i) => typeof i == "number" && isFinite(i) && Math.
    floor(i) === i;
    function r(i, n = " | ") {
      return i.map((o) => typeof o == "string" ? `'${o}'` : o).join(n);
    }
    d(r, "joinValues"), s.joinValues = r, s.jsonStringifyReplacer = (i, n) => typeof n == "bigint" ? n.toString() : n;
  })(Ot || (C.util = Ot = {}));
  var ar;
  (function(s) {
    s.mergeShapes = (e, t) => ({
      ...e,
      ...t
      // second overwrites first
    });
  })(ar || (C.objectUtil = ar = {}));
  C.ZodParsedType = Ot.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  var ps = /* @__PURE__ */ d((s) => {
    switch (typeof s) {
      case "undefined":
        return C.ZodParsedType.undefined;
      case "string":
        return C.ZodParsedType.string;
      case "number":
        return isNaN(s) ? C.ZodParsedType.nan : C.ZodParsedType.number;
      case "boolean":
        return C.ZodParsedType.boolean;
      case "function":
        return C.ZodParsedType.function;
      case "bigint":
        return C.ZodParsedType.bigint;
      case "symbol":
        return C.ZodParsedType.symbol;
      case "object":
        return Array.isArray(s) ? C.ZodParsedType.array : s === null ? C.ZodParsedType.null : s.then && typeof s.then == "function" && s.catch &&
        typeof s.catch == "function" ? C.ZodParsedType.promise : typeof Map < "u" && s instanceof Map ? C.ZodParsedType.map : typeof Set < "\
u" && s instanceof Set ? C.ZodParsedType.set : typeof Date < "u" && s instanceof Date ? C.ZodParsedType.date : C.ZodParsedType.object;
      default:
        return C.ZodParsedType.unknown;
    }
  }, "getParsedType");
  C.getParsedType = ps;
});

// ../node_modules/zod/lib/ZodError.js
var Fe = I((H) => {
  "use strict";
  Object.defineProperty(H, "__esModule", { value: !0 });
  H.ZodError = H.quotelessJson = H.ZodIssueCode = void 0;
  var dr = Te();
  H.ZodIssueCode = dr.util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  var fs = /* @__PURE__ */ d((s) => JSON.stringify(s, null, 2).replace(/"([^"]+)":/g, "$1:"), "quotelessJson");
  H.quotelessJson = fs;
  var Ee = class s extends Error {
    static {
      d(this, "ZodError");
    }
    get errors() {
      return this.issues;
    }
    constructor(e) {
      super(), this.issues = [], this.addIssue = (r) => {
        this.issues = [...this.issues, r];
      }, this.addIssues = (r = []) => {
        this.issues = [...this.issues, ...r];
      };
      let t = new.target.prototype;
      Object.setPrototypeOf ? Object.setPrototypeOf(this, t) : this.__proto__ = t, this.name = "ZodError", this.issues = e;
    }
    format(e) {
      let t = e || function(n) {
        return n.message;
      }, r = { _errors: [] }, i = /* @__PURE__ */ d((n) => {
        for (let o of n.issues)
          if (o.code === "invalid_union")
            o.unionErrors.map(i);
          else if (o.code === "invalid_return_type")
            i(o.returnTypeError);
          else if (o.code === "invalid_arguments")
            i(o.argumentsError);
          else if (o.path.length === 0)
            r._errors.push(t(o));
          else {
            let a = r, l = 0;
            for (; l < o.path.length; ) {
              let h = o.path[l];
              l === o.path.length - 1 ? (a[h] = a[h] || { _errors: [] }, a[h]._errors.push(t(o))) : a[h] = a[h] || { _errors: [] }, a = a[h],
              l++;
            }
          }
      }, "processError");
      return i(this), r;
    }
    static assert(e) {
      if (!(e instanceof s))
        throw new Error(`Not a ZodError: ${e}`);
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, dr.util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(e = (t) => t.message) {
      let t = {}, r = [];
      for (let i of this.issues)
        i.path.length > 0 ? (t[i.path[0]] = t[i.path[0]] || [], t[i.path[0]].push(e(i))) : r.push(e(i));
      return { formErrors: r, fieldErrors: t };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  H.ZodError = Ee;
  Ee.create = (s) => new Ee(s);
});

// ../node_modules/zod/lib/locales/en.js
var Tt = I((It) => {
  "use strict";
  Object.defineProperty(It, "__esModule", { value: !0 });
  var Q = Te(), T = Fe(), ms = /* @__PURE__ */ d((s, e) => {
    let t;
    switch (s.code) {
      case T.ZodIssueCode.invalid_type:
        s.received === Q.ZodParsedType.undefined ? t = "Required" : t = `Expected ${s.expected}, received ${s.received}`;
        break;
      case T.ZodIssueCode.invalid_literal:
        t = `Invalid literal value, expected ${JSON.stringify(s.expected, Q.util.jsonStringifyReplacer)}`;
        break;
      case T.ZodIssueCode.unrecognized_keys:
        t = `Unrecognized key(s) in object: ${Q.util.joinValues(s.keys, ", ")}`;
        break;
      case T.ZodIssueCode.invalid_union:
        t = "Invalid input";
        break;
      case T.ZodIssueCode.invalid_union_discriminator:
        t = `Invalid discriminator value. Expected ${Q.util.joinValues(s.options)}`;
        break;
      case T.ZodIssueCode.invalid_enum_value:
        t = `Invalid enum value. Expected ${Q.util.joinValues(s.options)}, received '${s.received}'`;
        break;
      case T.ZodIssueCode.invalid_arguments:
        t = "Invalid function arguments";
        break;
      case T.ZodIssueCode.invalid_return_type:
        t = "Invalid function return type";
        break;
      case T.ZodIssueCode.invalid_date:
        t = "Invalid date";
        break;
      case T.ZodIssueCode.invalid_string:
        typeof s.validation == "object" ? "includes" in s.validation ? (t = `Invalid input: must include "${s.validation.includes}"`, typeof s.
        validation.position == "number" && (t = `${t} at one or more positions greater than or equal to ${s.validation.position}`)) : "start\
sWith" in s.validation ? t = `Invalid input: must start with "${s.validation.startsWith}"` : "endsWith" in s.validation ? t = `Invalid input\
: must end with "${s.validation.endsWith}"` : Q.util.assertNever(s.validation) : s.validation !== "regex" ? t = `Invalid ${s.validation}` : t =
        "Invalid";
        break;
      case T.ZodIssueCode.too_small:
        s.type === "array" ? t = `Array must contain ${s.exact ? "exactly" : s.inclusive ? "at least" : "more than"} ${s.minimum} element(s)` :
        s.type === "string" ? t = `String must contain ${s.exact ? "exactly" : s.inclusive ? "at least" : "over"} ${s.minimum} character(s)` :
        s.type === "number" ? t = `Number must be ${s.exact ? "exactly equal to " : s.inclusive ? "greater than or equal to " : "greater tha\
n "}${s.minimum}` : s.type === "date" ? t = `Date must be ${s.exact ? "exactly equal to " : s.inclusive ? "greater than or equal to " : "gre\
ater than "}${new Date(Number(s.minimum))}` : t = "Invalid input";
        break;
      case T.ZodIssueCode.too_big:
        s.type === "array" ? t = `Array must contain ${s.exact ? "exactly" : s.inclusive ? "at most" : "less than"} ${s.maximum} element(s)` :
        s.type === "string" ? t = `String must contain ${s.exact ? "exactly" : s.inclusive ? "at most" : "under"} ${s.maximum} character(s)` :
        s.type === "number" ? t = `Number must be ${s.exact ? "exactly" : s.inclusive ? "less than or equal to" : "less than"} ${s.maximum}` :
        s.type === "bigint" ? t = `BigInt must be ${s.exact ? "exactly" : s.inclusive ? "less than or equal to" : "less than"} ${s.maximum}` :
        s.type === "date" ? t = `Date must be ${s.exact ? "exactly" : s.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(
        Number(s.maximum))}` : t = "Invalid input";
        break;
      case T.ZodIssueCode.custom:
        t = "Invalid input";
        break;
      case T.ZodIssueCode.invalid_intersection_types:
        t = "Intersection results could not be merged";
        break;
      case T.ZodIssueCode.not_multiple_of:
        t = `Number must be a multiple of ${s.multipleOf}`;
        break;
      case T.ZodIssueCode.not_finite:
        t = "Number must be finite";
        break;
      default:
        t = e.defaultError, Q.util.assertNever(s);
    }
    return { message: t };
  }, "errorMap");
  It.default = ms;
});

// ../node_modules/zod/lib/errors.js
var We = I(($) => {
  "use strict";
  var gs = $ && $.__importDefault || function(s) {
    return s && s.__esModule ? s : { default: s };
  };
  Object.defineProperty($, "__esModule", { value: !0 });
  $.getErrorMap = $.setErrorMap = $.defaultErrorMap = void 0;
  var ur = gs(Tt());
  $.defaultErrorMap = ur.default;
  var cr = ur.default;
  function ys(s) {
    cr = s;
  }
  d(ys, "setErrorMap");
  $.setErrorMap = ys;
  function _s() {
    return cr;
  }
  d(_s, "getErrorMap");
  $.getErrorMap = _s;
});

// ../node_modules/zod/lib/helpers/parseUtil.js
var At = I((x) => {
  "use strict";
  var bs = x && x.__importDefault || function(s) {
    return s && s.__esModule ? s : { default: s };
  };
  Object.defineProperty(x, "__esModule", { value: !0 });
  x.isAsync = x.isValid = x.isDirty = x.isAborted = x.OK = x.DIRTY = x.INVALID = x.ParseStatus = x.addIssueToContext = x.EMPTY_PATH = x.makeIssue =
  void 0;
  var vs = We(), lr = bs(Tt()), xs = /* @__PURE__ */ d((s) => {
    let { data: e, path: t, errorMaps: r, issueData: i } = s, n = [...t, ...i.path || []], o = {
      ...i,
      path: n
    };
    if (i.message !== void 0)
      return {
        ...i,
        path: n,
        message: i.message
      };
    let a = "", l = r.filter((h) => !!h).slice().reverse();
    for (let h of l)
      a = h(o, { data: e, defaultError: a }).message;
    return {
      ...i,
      path: n,
      message: a
    };
  }, "makeIssue");
  x.makeIssue = xs;
  x.EMPTY_PATH = [];
  function Cs(s, e) {
    let t = (0, vs.getErrorMap)(), r = (0, x.makeIssue)({
      issueData: e,
      data: s.data,
      path: s.path,
      errorMaps: [
        s.common.contextualErrorMap,
        // contextual error map is first priority
        s.schemaErrorMap,
        // then schema-bound map if available
        t,
        // then global override map
        t === lr.default ? void 0 : lr.default
        // then global default map
      ].filter((i) => !!i)
    });
    s.common.issues.push(r);
  }
  d(Cs, "addIssueToContext");
  x.addIssueToContext = Cs;
  var Et = class s {
    static {
      d(this, "ParseStatus");
    }
    constructor() {
      this.value = "valid";
    }
    dirty() {
      this.value === "valid" && (this.value = "dirty");
    }
    abort() {
      this.value !== "aborted" && (this.value = "aborted");
    }
    static mergeArray(e, t) {
      let r = [];
      for (let i of t) {
        if (i.status === "aborted")
          return x.INVALID;
        i.status === "dirty" && e.dirty(), r.push(i.value);
      }
      return { status: e.value, value: r };
    }
    static async mergeObjectAsync(e, t) {
      let r = [];
      for (let i of t) {
        let n = await i.key, o = await i.value;
        r.push({
          key: n,
          value: o
        });
      }
      return s.mergeObjectSync(e, r);
    }
    static mergeObjectSync(e, t) {
      let r = {};
      for (let i of t) {
        let { key: n, value: o } = i;
        if (n.status === "aborted" || o.status === "aborted")
          return x.INVALID;
        n.status === "dirty" && e.dirty(), o.status === "dirty" && e.dirty(), n.value !== "__proto__" && (typeof o.value < "u" || i.alwaysSet) &&
        (r[n.value] = o.value);
      }
      return { status: e.value, value: r };
    }
  };
  x.ParseStatus = Et;
  x.INVALID = Object.freeze({
    status: "aborted"
  });
  var ks = /* @__PURE__ */ d((s) => ({ status: "dirty", value: s }), "DIRTY");
  x.DIRTY = ks;
  var ws = /* @__PURE__ */ d((s) => ({ status: "valid", value: s }), "OK");
  x.OK = ws;
  var Os = /* @__PURE__ */ d((s) => s.status === "aborted", "isAborted");
  x.isAborted = Os;
  var Is = /* @__PURE__ */ d((s) => s.status === "dirty", "isDirty");
  x.isDirty = Is;
  var Ts = /* @__PURE__ */ d((s) => s.status === "valid", "isValid");
  x.isValid = Ts;
  var Es = /* @__PURE__ */ d((s) => typeof Promise < "u" && s instanceof Promise, "isAsync");
  x.isAsync = Es;
});

// ../node_modules/zod/lib/helpers/typeAliases.js
var pr = I((hr) => {
  "use strict";
  Object.defineProperty(hr, "__esModule", { value: !0 });
});

// ../node_modules/zod/lib/helpers/errorUtil.js
var mr = I((Be) => {
  "use strict";
  Object.defineProperty(Be, "__esModule", { value: !0 });
  Be.errorUtil = void 0;
  var fr;
  (function(s) {
    s.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, s.toString = (e) => typeof e == "string" ? e : e?.message;
  })(fr || (Be.errorUtil = fr = {}));
});

// ../node_modules/zod/lib/types.js
var Tr = I((u) => {
  "use strict";
  var He = u && u.__classPrivateFieldGet || function(s, e, t, r) {
    if (t === "a" && !r) throw new TypeError("Private accessor was defined without a getter");
    if (typeof e == "function" ? s !== e || !r : !e.has(s)) throw new TypeError("Cannot read private member from an object whose class did n\
ot declare it");
    return t === "m" ? r : t === "a" ? r.call(s) : r ? r.value : e.get(s);
  }, yr = u && u.__classPrivateFieldSet || function(s, e, t, r, i) {
    if (r === "m") throw new TypeError("Private method is not writable");
    if (r === "a" && !i) throw new TypeError("Private accessor was defined without a setter");
    if (typeof e == "function" ? s !== e || !i : !e.has(s)) throw new TypeError("Cannot write private member to an object whose class did no\
t declare it");
    return r === "a" ? i.call(s, t) : i ? i.value = t : e.set(s, t), t;
  }, Ae, Se;
  Object.defineProperty(u, "__esModule", { value: !0 });
  u.boolean = u.bigint = u.array = u.any = u.coerce = u.ZodFirstPartyTypeKind = u.late = u.ZodSchema = u.Schema = u.custom = u.ZodReadonly =
  u.ZodPipeline = u.ZodBranded = u.BRAND = u.ZodNaN = u.ZodCatch = u.ZodDefault = u.ZodNullable = u.ZodOptional = u.ZodTransformer = u.ZodEffects =
  u.ZodPromise = u.ZodNativeEnum = u.ZodEnum = u.ZodLiteral = u.ZodLazy = u.ZodFunction = u.ZodSet = u.ZodMap = u.ZodRecord = u.ZodTuple = u.
  ZodIntersection = u.ZodDiscriminatedUnion = u.ZodUnion = u.ZodObject = u.ZodArray = u.ZodVoid = u.ZodNever = u.ZodUnknown = u.ZodAny = u.ZodNull =
  u.ZodUndefined = u.ZodSymbol = u.ZodDate = u.ZodBoolean = u.ZodBigInt = u.ZodNumber = u.ZodString = u.datetimeRegex = u.ZodType = void 0;
  u.NEVER = u.void = u.unknown = u.union = u.undefined = u.tuple = u.transformer = u.symbol = u.string = u.strictObject = u.set = u.record =
  u.promise = u.preprocess = u.pipeline = u.ostring = u.optional = u.onumber = u.oboolean = u.object = u.number = u.nullable = u.null = u.never =
  u.nativeEnum = u.nan = u.map = u.literal = u.lazy = u.intersection = u.instanceof = u.function = u.enum = u.effect = u.discriminatedUnion =
  u.date = void 0;
  var qe = We(), g = mr(), c = At(), m = Te(), f = Fe(), P = class {
    static {
      d(this, "ParseInputLazyPath");
    }
    constructor(e, t, r, i) {
      this._cachedPath = [], this.parent = e, this.data = t, this._path = r, this._key = i;
    }
    get path() {
      return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.
      push(...this._path, this._key)), this._cachedPath;
    }
  }, gr = /* @__PURE__ */ d((s, e) => {
    if ((0, c.isValid)(e))
      return { success: !0, data: e.value };
    if (!s.common.issues.length)
      throw new Error("Validation failed but no issues detected.");
    return {
      success: !1,
      get error() {
        if (this._error)
          return this._error;
        let t = new f.ZodError(s.common.issues);
        return this._error = t, this._error;
      }
    };
  }, "handleResult");
  function b(s) {
    if (!s)
      return {};
    let { errorMap: e, invalid_type_error: t, required_error: r, description: i } = s;
    if (e && (t || r))
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    return e ? { errorMap: e, description: i } : { errorMap: /* @__PURE__ */ d((o, a) => {
      var l, h;
      let { message: p } = s;
      return o.code === "invalid_enum_value" ? { message: p ?? a.defaultError } : typeof a.data > "u" ? { message: (l = p ?? r) !== null && l !==
      void 0 ? l : a.defaultError } : o.code !== "invalid_type" ? { message: a.defaultError } : { message: (h = p ?? t) !== null && h !== void 0 ?
      h : a.defaultError };
    }, "customMap"), description: i };
  }
  d(b, "processCreateParams");
  var v = class {
    static {
      d(this, "ZodType");
    }
    get description() {
      return this._def.description;
    }
    _getType(e) {
      return (0, m.getParsedType)(e.data);
    }
    _getOrReturnCtx(e, t) {
      return t || {
        common: e.parent.common,
        data: e.data,
        parsedType: (0, m.getParsedType)(e.data),
        schemaErrorMap: this._def.errorMap,
        path: e.path,
        parent: e.parent
      };
    }
    _processInputParams(e) {
      return {
        status: new c.ParseStatus(),
        ctx: {
          common: e.parent.common,
          data: e.data,
          parsedType: (0, m.getParsedType)(e.data),
          schemaErrorMap: this._def.errorMap,
          path: e.path,
          parent: e.parent
        }
      };
    }
    _parseSync(e) {
      let t = this._parse(e);
      if ((0, c.isAsync)(t))
        throw new Error("Synchronous parse encountered promise.");
      return t;
    }
    _parseAsync(e) {
      let t = this._parse(e);
      return Promise.resolve(t);
    }
    parse(e, t) {
      let r = this.safeParse(e, t);
      if (r.success)
        return r.data;
      throw r.error;
    }
    safeParse(e, t) {
      var r;
      let i = {
        common: {
          issues: [],
          async: (r = t?.async) !== null && r !== void 0 ? r : !1,
          contextualErrorMap: t?.errorMap
        },
        path: t?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: (0, m.getParsedType)(e)
      }, n = this._parseSync({ data: e, path: i.path, parent: i });
      return gr(i, n);
    }
    "~validate"(e) {
      var t, r;
      let i = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: (0, m.getParsedType)(e)
      };
      if (!this["~standard"].async)
        try {
          let n = this._parseSync({ data: e, path: [], parent: i });
          return (0, c.isValid)(n) ? {
            value: n.value
          } : {
            issues: i.common.issues
          };
        } catch (n) {
          !((r = (t = n?.message) === null || t === void 0 ? void 0 : t.toLowerCase()) === null || r === void 0) && r.includes("encountered") &&
          (this["~standard"].async = !0), i.common = {
            issues: [],
            async: !0
          };
        }
      return this._parseAsync({ data: e, path: [], parent: i }).then((n) => (0, c.isValid)(n) ? {
        value: n.value
      } : {
        issues: i.common.issues
      });
    }
    async parseAsync(e, t) {
      let r = await this.safeParseAsync(e, t);
      if (r.success)
        return r.data;
      throw r.error;
    }
    async safeParseAsync(e, t) {
      let r = {
        common: {
          issues: [],
          contextualErrorMap: t?.errorMap,
          async: !0
        },
        path: t?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: (0, m.getParsedType)(e)
      }, i = this._parse({ data: e, path: r.path, parent: r }), n = await ((0, c.isAsync)(i) ? i : Promise.resolve(i));
      return gr(r, n);
    }
    refine(e, t) {
      let r = /* @__PURE__ */ d((i) => typeof t == "string" || typeof t > "u" ? { message: t } : typeof t == "function" ? t(i) : t, "getIssu\
eProperties");
      return this._refinement((i, n) => {
        let o = e(i), a = /* @__PURE__ */ d(() => n.addIssue({
          code: f.ZodIssueCode.custom,
          ...r(i)
        }), "setError");
        return typeof Promise < "u" && o instanceof Promise ? o.then((l) => l ? !0 : (a(), !1)) : o ? !0 : (a(), !1);
      });
    }
    refinement(e, t) {
      return this._refinement((r, i) => e(r) ? !0 : (i.addIssue(typeof t == "function" ? t(r, i) : t), !1));
    }
    _refinement(e) {
      return new R({
        schema: this,
        typeName: _.ZodEffects,
        effect: { type: "refinement", refinement: e }
      });
    }
    superRefine(e) {
      return this._refinement(e);
    }
    constructor(e) {
      this.spa = this.safeParseAsync, this._def = e, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync =
      this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.
      bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.
      bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.
      promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(
      this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe =
      this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.
      bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: /* @__PURE__ */ d((t) => this["~validate"](t), "validate")
      };
    }
    optional() {
      return j.create(this, this._def);
    }
    nullable() {
      return L.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return B.create(this);
    }
    promise() {
      return G.create(this, this._def);
    }
    or(e) {
      return oe.create([this, e], this._def);
    }
    and(e) {
      return ae.create(this, e, this._def);
    }
    transform(e) {
      return new R({
        ...b(this._def),
        schema: this,
        typeName: _.ZodEffects,
        effect: { type: "transform", transform: e }
      });
    }
    default(e) {
      let t = typeof e == "function" ? e : () => e;
      return new he({
        ...b(this._def),
        innerType: this,
        defaultValue: t,
        typeName: _.ZodDefault
      });
    }
    brand() {
      return new Re({
        typeName: _.ZodBranded,
        type: this,
        ...b(this._def)
      });
    }
    catch(e) {
      let t = typeof e == "function" ? e : () => e;
      return new pe({
        ...b(this._def),
        innerType: this,
        catchValue: t,
        typeName: _.ZodCatch
      });
    }
    describe(e) {
      let t = this.constructor;
      return new t({
        ...this._def,
        description: e
      });
    }
    pipe(e) {
      return Ze.create(this, e);
    }
    readonly() {
      return fe.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  u.ZodType = v;
  u.Schema = v;
  u.ZodSchema = v;
  var As = /^c[^\s-]{8,}$/i, Ss = /^[0-9a-z]+$/, Rs = /^[0-9A-HJKMNP-TV-Z]{26}$/i, Zs = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
  js = /^[a-z0-9_-]{21}$/i, Ps = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, Ns = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
  Vs = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, Ds = "^(\\p{Extended_Pictographic}|\\p{Emoji_Comp\
onent})+$", St, $s = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, Ms = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  Ls = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  Us = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  Fs = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, Ws = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  _r = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469\
]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", Bs = new RegExp(`^${_r}$`);
  function br(s) {
    let e = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
    return s.precision ? e = `${e}\\.\\d{${s.precision}}` : s.precision == null && (e = `${e}(\\.\\d+)?`), e;
  }
  d(br, "timeRegexSource");
  function qs(s) {
    return new RegExp(`^${br(s)}$`);
  }
  d(qs, "timeRegex");
  function vr(s) {
    let e = `${_r}T${br(s)}`, t = [];
    return t.push(s.local ? "Z?" : "Z"), s.offset && t.push("([+-]\\d{2}:?\\d{2})"), e = `${e}(${t.join("|")})`, new RegExp(`^${e}$`);
  }
  d(vr, "datetimeRegex");
  u.datetimeRegex = vr;
  function Hs(s, e) {
    return !!((e === "v4" || !e) && $s.test(s) || (e === "v6" || !e) && Ls.test(s));
  }
  d(Hs, "isValidIP");
  function Ks(s, e) {
    if (!Ps.test(s))
      return !1;
    try {
      let [t] = s.split("."), r = t.replace(/-/g, "+").replace(/_/g, "/").padEnd(t.length + (4 - t.length % 4) % 4, "="), i = JSON.parse(atob(
      r));
      return !(typeof i != "object" || i === null || !i.typ || !i.alg || e && i.alg !== e);
    } catch {
      return !1;
    }
  }
  d(Ks, "isValidJWT");
  function zs(s, e) {
    return !!((e === "v4" || !e) && Ms.test(s) || (e === "v6" || !e) && Us.test(s));
  }
  d(zs, "isValidCidr");
  var K = class s extends v {
    static {
      d(this, "ZodString");
    }
    _parse(e) {
      if (this._def.coerce && (e.data = String(e.data)), this._getType(e) !== m.ZodParsedType.string) {
        let n = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(n, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.string,
          received: n.parsedType
        }), c.INVALID;
      }
      let r = new c.ParseStatus(), i;
      for (let n of this._def.checks)
        if (n.kind === "min")
          e.data.length < n.value && (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            code: f.ZodIssueCode.too_small,
            minimum: n.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: n.message
          }), r.dirty());
        else if (n.kind === "max")
          e.data.length > n.value && (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            code: f.ZodIssueCode.too_big,
            maximum: n.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: n.message
          }), r.dirty());
        else if (n.kind === "length") {
          let o = e.data.length > n.value, a = e.data.length < n.value;
          (o || a) && (i = this._getOrReturnCtx(e, i), o ? (0, c.addIssueToContext)(i, {
            code: f.ZodIssueCode.too_big,
            maximum: n.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: n.message
          }) : a && (0, c.addIssueToContext)(i, {
            code: f.ZodIssueCode.too_small,
            minimum: n.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: n.message
          }), r.dirty());
        } else if (n.kind === "email")
          Vs.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            validation: "email",
            code: f.ZodIssueCode.invalid_string,
            message: n.message
          }), r.dirty());
        else if (n.kind === "emoji")
          St || (St = new RegExp(Ds, "u")), St.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            validation: "emoji",
            code: f.ZodIssueCode.invalid_string,
            message: n.message
          }), r.dirty());
        else if (n.kind === "uuid")
          Zs.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            validation: "uuid",
            code: f.ZodIssueCode.invalid_string,
            message: n.message
          }), r.dirty());
        else if (n.kind === "nanoid")
          js.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            validation: "nanoid",
            code: f.ZodIssueCode.invalid_string,
            message: n.message
          }), r.dirty());
        else if (n.kind === "cuid")
          As.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            validation: "cuid",
            code: f.ZodIssueCode.invalid_string,
            message: n.message
          }), r.dirty());
        else if (n.kind === "cuid2")
          Ss.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            validation: "cuid2",
            code: f.ZodIssueCode.invalid_string,
            message: n.message
          }), r.dirty());
        else if (n.kind === "ulid")
          Rs.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
            validation: "ulid",
            code: f.ZodIssueCode.invalid_string,
            message: n.message
          }), r.dirty());
        else if (n.kind === "url")
          try {
            new URL(e.data);
          } catch {
            i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
              validation: "url",
              code: f.ZodIssueCode.invalid_string,
              message: n.message
            }), r.dirty();
          }
        else n.kind === "regex" ? (n.regex.lastIndex = 0, n.regex.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(
        i, {
          validation: "regex",
          code: f.ZodIssueCode.invalid_string,
          message: n.message
        }), r.dirty())) : n.kind === "trim" ? e.data = e.data.trim() : n.kind === "includes" ? e.data.includes(n.value, n.position) || (i = this.
        _getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.invalid_string,
          validation: { includes: n.value, position: n.position },
          message: n.message
        }), r.dirty()) : n.kind === "toLowerCase" ? e.data = e.data.toLowerCase() : n.kind === "toUpperCase" ? e.data = e.data.toUpperCase() :
        n.kind === "startsWith" ? e.data.startsWith(n.value) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.invalid_string,
          validation: { startsWith: n.value },
          message: n.message
        }), r.dirty()) : n.kind === "endsWith" ? e.data.endsWith(n.value) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.invalid_string,
          validation: { endsWith: n.value },
          message: n.message
        }), r.dirty()) : n.kind === "datetime" ? vr(n).test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.invalid_string,
          validation: "datetime",
          message: n.message
        }), r.dirty()) : n.kind === "date" ? Bs.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.invalid_string,
          validation: "date",
          message: n.message
        }), r.dirty()) : n.kind === "time" ? qs(n).test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.invalid_string,
          validation: "time",
          message: n.message
        }), r.dirty()) : n.kind === "duration" ? Ns.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          validation: "duration",
          code: f.ZodIssueCode.invalid_string,
          message: n.message
        }), r.dirty()) : n.kind === "ip" ? Hs(e.data, n.version) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          validation: "ip",
          code: f.ZodIssueCode.invalid_string,
          message: n.message
        }), r.dirty()) : n.kind === "jwt" ? Ks(e.data, n.alg) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          validation: "jwt",
          code: f.ZodIssueCode.invalid_string,
          message: n.message
        }), r.dirty()) : n.kind === "cidr" ? zs(e.data, n.version) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          validation: "cidr",
          code: f.ZodIssueCode.invalid_string,
          message: n.message
        }), r.dirty()) : n.kind === "base64" ? Fs.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          validation: "base64",
          code: f.ZodIssueCode.invalid_string,
          message: n.message
        }), r.dirty()) : n.kind === "base64url" ? Ws.test(e.data) || (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          validation: "base64url",
          code: f.ZodIssueCode.invalid_string,
          message: n.message
        }), r.dirty()) : m.util.assertNever(n);
      return { status: r.value, value: e.data };
    }
    _regex(e, t, r) {
      return this.refinement((i) => e.test(i), {
        validation: t,
        code: f.ZodIssueCode.invalid_string,
        ...g.errorUtil.errToObj(r)
      });
    }
    _addCheck(e) {
      return new s({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    email(e) {
      return this._addCheck({ kind: "email", ...g.errorUtil.errToObj(e) });
    }
    url(e) {
      return this._addCheck({ kind: "url", ...g.errorUtil.errToObj(e) });
    }
    emoji(e) {
      return this._addCheck({ kind: "emoji", ...g.errorUtil.errToObj(e) });
    }
    uuid(e) {
      return this._addCheck({ kind: "uuid", ...g.errorUtil.errToObj(e) });
    }
    nanoid(e) {
      return this._addCheck({ kind: "nanoid", ...g.errorUtil.errToObj(e) });
    }
    cuid(e) {
      return this._addCheck({ kind: "cuid", ...g.errorUtil.errToObj(e) });
    }
    cuid2(e) {
      return this._addCheck({ kind: "cuid2", ...g.errorUtil.errToObj(e) });
    }
    ulid(e) {
      return this._addCheck({ kind: "ulid", ...g.errorUtil.errToObj(e) });
    }
    base64(e) {
      return this._addCheck({ kind: "base64", ...g.errorUtil.errToObj(e) });
    }
    base64url(e) {
      return this._addCheck({
        kind: "base64url",
        ...g.errorUtil.errToObj(e)
      });
    }
    jwt(e) {
      return this._addCheck({ kind: "jwt", ...g.errorUtil.errToObj(e) });
    }
    ip(e) {
      return this._addCheck({ kind: "ip", ...g.errorUtil.errToObj(e) });
    }
    cidr(e) {
      return this._addCheck({ kind: "cidr", ...g.errorUtil.errToObj(e) });
    }
    datetime(e) {
      var t, r;
      return typeof e == "string" ? this._addCheck({
        kind: "datetime",
        precision: null,
        offset: !1,
        local: !1,
        message: e
      }) : this._addCheck({
        kind: "datetime",
        precision: typeof e?.precision > "u" ? null : e?.precision,
        offset: (t = e?.offset) !== null && t !== void 0 ? t : !1,
        local: (r = e?.local) !== null && r !== void 0 ? r : !1,
        ...g.errorUtil.errToObj(e?.message)
      });
    }
    date(e) {
      return this._addCheck({ kind: "date", message: e });
    }
    time(e) {
      return typeof e == "string" ? this._addCheck({
        kind: "time",
        precision: null,
        message: e
      }) : this._addCheck({
        kind: "time",
        precision: typeof e?.precision > "u" ? null : e?.precision,
        ...g.errorUtil.errToObj(e?.message)
      });
    }
    duration(e) {
      return this._addCheck({ kind: "duration", ...g.errorUtil.errToObj(e) });
    }
    regex(e, t) {
      return this._addCheck({
        kind: "regex",
        regex: e,
        ...g.errorUtil.errToObj(t)
      });
    }
    includes(e, t) {
      return this._addCheck({
        kind: "includes",
        value: e,
        position: t?.position,
        ...g.errorUtil.errToObj(t?.message)
      });
    }
    startsWith(e, t) {
      return this._addCheck({
        kind: "startsWith",
        value: e,
        ...g.errorUtil.errToObj(t)
      });
    }
    endsWith(e, t) {
      return this._addCheck({
        kind: "endsWith",
        value: e,
        ...g.errorUtil.errToObj(t)
      });
    }
    min(e, t) {
      return this._addCheck({
        kind: "min",
        value: e,
        ...g.errorUtil.errToObj(t)
      });
    }
    max(e, t) {
      return this._addCheck({
        kind: "max",
        value: e,
        ...g.errorUtil.errToObj(t)
      });
    }
    length(e, t) {
      return this._addCheck({
        kind: "length",
        value: e,
        ...g.errorUtil.errToObj(t)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(e) {
      return this.min(1, g.errorUtil.errToObj(e));
    }
    trim() {
      return new s({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new s({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new s({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((e) => e.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((e) => e.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((e) => e.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((e) => e.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((e) => e.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((e) => e.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((e) => e.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((e) => e.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((e) => e.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((e) => e.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((e) => e.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((e) => e.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((e) => e.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((e) => e.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((e) => e.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((e) => e.kind === "base64url");
    }
    get minLength() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "min" && (e === null || t.value > e) && (e = t.value);
      return e;
    }
    get maxLength() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "max" && (e === null || t.value < e) && (e = t.value);
      return e;
    }
  };
  u.ZodString = K;
  K.create = (s) => {
    var e;
    return new K({
      checks: [],
      typeName: _.ZodString,
      coerce: (e = s?.coerce) !== null && e !== void 0 ? e : !1,
      ...b(s)
    });
  };
  function Gs(s, e) {
    let t = (s.toString().split(".")[1] || "").length, r = (e.toString().split(".")[1] || "").length, i = t > r ? t : r, n = parseInt(s.toFixed(
    i).replace(".", "")), o = parseInt(e.toFixed(i).replace(".", ""));
    return n % o / Math.pow(10, i);
  }
  d(Gs, "floatSafeRemainder");
  var ee = class s extends v {
    static {
      d(this, "ZodNumber");
    }
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
    }
    _parse(e) {
      if (this._def.coerce && (e.data = Number(e.data)), this._getType(e) !== m.ZodParsedType.number) {
        let n = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(n, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.number,
          received: n.parsedType
        }), c.INVALID;
      }
      let r, i = new c.ParseStatus();
      for (let n of this._def.checks)
        n.kind === "int" ? m.util.isInteger(e.data) || (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: "integer",
          received: "float",
          message: n.message
        }), i.dirty()) : n.kind === "min" ? (n.inclusive ? e.data < n.value : e.data <= n.value) && (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(
        r, {
          code: f.ZodIssueCode.too_small,
          minimum: n.value,
          type: "number",
          inclusive: n.inclusive,
          exact: !1,
          message: n.message
        }), i.dirty()) : n.kind === "max" ? (n.inclusive ? e.data > n.value : e.data >= n.value) && (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(
        r, {
          code: f.ZodIssueCode.too_big,
          maximum: n.value,
          type: "number",
          inclusive: n.inclusive,
          exact: !1,
          message: n.message
        }), i.dirty()) : n.kind === "multipleOf" ? Gs(e.data, n.value) !== 0 && (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(r,
        {
          code: f.ZodIssueCode.not_multiple_of,
          multipleOf: n.value,
          message: n.message
        }), i.dirty()) : n.kind === "finite" ? Number.isFinite(e.data) || (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.not_finite,
          message: n.message
        }), i.dirty()) : m.util.assertNever(n);
      return { status: i.value, value: e.data };
    }
    gte(e, t) {
      return this.setLimit("min", e, !0, g.errorUtil.toString(t));
    }
    gt(e, t) {
      return this.setLimit("min", e, !1, g.errorUtil.toString(t));
    }
    lte(e, t) {
      return this.setLimit("max", e, !0, g.errorUtil.toString(t));
    }
    lt(e, t) {
      return this.setLimit("max", e, !1, g.errorUtil.toString(t));
    }
    setLimit(e, t, r, i) {
      return new s({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: e,
            value: t,
            inclusive: r,
            message: g.errorUtil.toString(i)
          }
        ]
      });
    }
    _addCheck(e) {
      return new s({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    int(e) {
      return this._addCheck({
        kind: "int",
        message: g.errorUtil.toString(e)
      });
    }
    positive(e) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !1,
        message: g.errorUtil.toString(e)
      });
    }
    negative(e) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !1,
        message: g.errorUtil.toString(e)
      });
    }
    nonpositive(e) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !0,
        message: g.errorUtil.toString(e)
      });
    }
    nonnegative(e) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !0,
        message: g.errorUtil.toString(e)
      });
    }
    multipleOf(e, t) {
      return this._addCheck({
        kind: "multipleOf",
        value: e,
        message: g.errorUtil.toString(t)
      });
    }
    finite(e) {
      return this._addCheck({
        kind: "finite",
        message: g.errorUtil.toString(e)
      });
    }
    safe(e) {
      return this._addCheck({
        kind: "min",
        inclusive: !0,
        value: Number.MIN_SAFE_INTEGER,
        message: g.errorUtil.toString(e)
      })._addCheck({
        kind: "max",
        inclusive: !0,
        value: Number.MAX_SAFE_INTEGER,
        message: g.errorUtil.toString(e)
      });
    }
    get minValue() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "min" && (e === null || t.value > e) && (e = t.value);
      return e;
    }
    get maxValue() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "max" && (e === null || t.value < e) && (e = t.value);
      return e;
    }
    get isInt() {
      return !!this._def.checks.find((e) => e.kind === "int" || e.kind === "multipleOf" && m.util.isInteger(e.value));
    }
    get isFinite() {
      let e = null, t = null;
      for (let r of this._def.checks) {
        if (r.kind === "finite" || r.kind === "int" || r.kind === "multipleOf")
          return !0;
        r.kind === "min" ? (t === null || r.value > t) && (t = r.value) : r.kind === "max" && (e === null || r.value < e) && (e = r.value);
      }
      return Number.isFinite(t) && Number.isFinite(e);
    }
  };
  u.ZodNumber = ee;
  ee.create = (s) => new ee({
    checks: [],
    typeName: _.ZodNumber,
    coerce: s?.coerce || !1,
    ...b(s)
  });
  var te = class s extends v {
    static {
      d(this, "ZodBigInt");
    }
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte;
    }
    _parse(e) {
      if (this._def.coerce)
        try {
          e.data = BigInt(e.data);
        } catch {
          return this._getInvalidInput(e);
        }
      if (this._getType(e) !== m.ZodParsedType.bigint)
        return this._getInvalidInput(e);
      let r, i = new c.ParseStatus();
      for (let n of this._def.checks)
        n.kind === "min" ? (n.inclusive ? e.data < n.value : e.data <= n.value) && (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(
        r, {
          code: f.ZodIssueCode.too_small,
          type: "bigint",
          minimum: n.value,
          inclusive: n.inclusive,
          message: n.message
        }), i.dirty()) : n.kind === "max" ? (n.inclusive ? e.data > n.value : e.data >= n.value) && (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(
        r, {
          code: f.ZodIssueCode.too_big,
          type: "bigint",
          maximum: n.value,
          inclusive: n.inclusive,
          message: n.message
        }), i.dirty()) : n.kind === "multipleOf" ? e.data % n.value !== BigInt(0) && (r = this._getOrReturnCtx(e, r), (0, c.addIssueToContext)(
        r, {
          code: f.ZodIssueCode.not_multiple_of,
          multipleOf: n.value,
          message: n.message
        }), i.dirty()) : m.util.assertNever(n);
      return { status: i.value, value: e.data };
    }
    _getInvalidInput(e) {
      let t = this._getOrReturnCtx(e);
      return (0, c.addIssueToContext)(t, {
        code: f.ZodIssueCode.invalid_type,
        expected: m.ZodParsedType.bigint,
        received: t.parsedType
      }), c.INVALID;
    }
    gte(e, t) {
      return this.setLimit("min", e, !0, g.errorUtil.toString(t));
    }
    gt(e, t) {
      return this.setLimit("min", e, !1, g.errorUtil.toString(t));
    }
    lte(e, t) {
      return this.setLimit("max", e, !0, g.errorUtil.toString(t));
    }
    lt(e, t) {
      return this.setLimit("max", e, !1, g.errorUtil.toString(t));
    }
    setLimit(e, t, r, i) {
      return new s({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: e,
            value: t,
            inclusive: r,
            message: g.errorUtil.toString(i)
          }
        ]
      });
    }
    _addCheck(e) {
      return new s({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    positive(e) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !1,
        message: g.errorUtil.toString(e)
      });
    }
    negative(e) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !1,
        message: g.errorUtil.toString(e)
      });
    }
    nonpositive(e) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !0,
        message: g.errorUtil.toString(e)
      });
    }
    nonnegative(e) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !0,
        message: g.errorUtil.toString(e)
      });
    }
    multipleOf(e, t) {
      return this._addCheck({
        kind: "multipleOf",
        value: e,
        message: g.errorUtil.toString(t)
      });
    }
    get minValue() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "min" && (e === null || t.value > e) && (e = t.value);
      return e;
    }
    get maxValue() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "max" && (e === null || t.value < e) && (e = t.value);
      return e;
    }
  };
  u.ZodBigInt = te;
  te.create = (s) => {
    var e;
    return new te({
      checks: [],
      typeName: _.ZodBigInt,
      coerce: (e = s?.coerce) !== null && e !== void 0 ? e : !1,
      ...b(s)
    });
  };
  var re = class extends v {
    static {
      d(this, "ZodBoolean");
    }
    _parse(e) {
      if (this._def.coerce && (e.data = !!e.data), this._getType(e) !== m.ZodParsedType.boolean) {
        let r = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.boolean,
          received: r.parsedType
        }), c.INVALID;
      }
      return (0, c.OK)(e.data);
    }
  };
  u.ZodBoolean = re;
  re.create = (s) => new re({
    typeName: _.ZodBoolean,
    coerce: s?.coerce || !1,
    ...b(s)
  });
  var se = class s extends v {
    static {
      d(this, "ZodDate");
    }
    _parse(e) {
      if (this._def.coerce && (e.data = new Date(e.data)), this._getType(e) !== m.ZodParsedType.date) {
        let n = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(n, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.date,
          received: n.parsedType
        }), c.INVALID;
      }
      if (isNaN(e.data.getTime())) {
        let n = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(n, {
          code: f.ZodIssueCode.invalid_date
        }), c.INVALID;
      }
      let r = new c.ParseStatus(), i;
      for (let n of this._def.checks)
        n.kind === "min" ? e.data.getTime() < n.value && (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.too_small,
          message: n.message,
          inclusive: !0,
          exact: !1,
          minimum: n.value,
          type: "date"
        }), r.dirty()) : n.kind === "max" ? e.data.getTime() > n.value && (i = this._getOrReturnCtx(e, i), (0, c.addIssueToContext)(i, {
          code: f.ZodIssueCode.too_big,
          message: n.message,
          inclusive: !0,
          exact: !1,
          maximum: n.value,
          type: "date"
        }), r.dirty()) : m.util.assertNever(n);
      return {
        status: r.value,
        value: new Date(e.data.getTime())
      };
    }
    _addCheck(e) {
      return new s({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    min(e, t) {
      return this._addCheck({
        kind: "min",
        value: e.getTime(),
        message: g.errorUtil.toString(t)
      });
    }
    max(e, t) {
      return this._addCheck({
        kind: "max",
        value: e.getTime(),
        message: g.errorUtil.toString(t)
      });
    }
    get minDate() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "min" && (e === null || t.value > e) && (e = t.value);
      return e != null ? new Date(e) : null;
    }
    get maxDate() {
      let e = null;
      for (let t of this._def.checks)
        t.kind === "max" && (e === null || t.value < e) && (e = t.value);
      return e != null ? new Date(e) : null;
    }
  };
  u.ZodDate = se;
  se.create = (s) => new se({
    checks: [],
    coerce: s?.coerce || !1,
    typeName: _.ZodDate,
    ...b(s)
  });
  var ye = class extends v {
    static {
      d(this, "ZodSymbol");
    }
    _parse(e) {
      if (this._getType(e) !== m.ZodParsedType.symbol) {
        let r = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.symbol,
          received: r.parsedType
        }), c.INVALID;
      }
      return (0, c.OK)(e.data);
    }
  };
  u.ZodSymbol = ye;
  ye.create = (s) => new ye({
    typeName: _.ZodSymbol,
    ...b(s)
  });
  var ie = class extends v {
    static {
      d(this, "ZodUndefined");
    }
    _parse(e) {
      if (this._getType(e) !== m.ZodParsedType.undefined) {
        let r = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.undefined,
          received: r.parsedType
        }), c.INVALID;
      }
      return (0, c.OK)(e.data);
    }
  };
  u.ZodUndefined = ie;
  ie.create = (s) => new ie({
    typeName: _.ZodUndefined,
    ...b(s)
  });
  var ne = class extends v {
    static {
      d(this, "ZodNull");
    }
    _parse(e) {
      if (this._getType(e) !== m.ZodParsedType.null) {
        let r = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.null,
          received: r.parsedType
        }), c.INVALID;
      }
      return (0, c.OK)(e.data);
    }
  };
  u.ZodNull = ne;
  ne.create = (s) => new ne({
    typeName: _.ZodNull,
    ...b(s)
  });
  var z = class extends v {
    static {
      d(this, "ZodAny");
    }
    constructor() {
      super(...arguments), this._any = !0;
    }
    _parse(e) {
      return (0, c.OK)(e.data);
    }
  };
  u.ZodAny = z;
  z.create = (s) => new z({
    typeName: _.ZodAny,
    ...b(s)
  });
  var W = class extends v {
    static {
      d(this, "ZodUnknown");
    }
    constructor() {
      super(...arguments), this._unknown = !0;
    }
    _parse(e) {
      return (0, c.OK)(e.data);
    }
  };
  u.ZodUnknown = W;
  W.create = (s) => new W({
    typeName: _.ZodUnknown,
    ...b(s)
  });
  var V = class extends v {
    static {
      d(this, "ZodNever");
    }
    _parse(e) {
      let t = this._getOrReturnCtx(e);
      return (0, c.addIssueToContext)(t, {
        code: f.ZodIssueCode.invalid_type,
        expected: m.ZodParsedType.never,
        received: t.parsedType
      }), c.INVALID;
    }
  };
  u.ZodNever = V;
  V.create = (s) => new V({
    typeName: _.ZodNever,
    ...b(s)
  });
  var _e = class extends v {
    static {
      d(this, "ZodVoid");
    }
    _parse(e) {
      if (this._getType(e) !== m.ZodParsedType.undefined) {
        let r = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.void,
          received: r.parsedType
        }), c.INVALID;
      }
      return (0, c.OK)(e.data);
    }
  };
  u.ZodVoid = _e;
  _e.create = (s) => new _e({
    typeName: _.ZodVoid,
    ...b(s)
  });
  var B = class s extends v {
    static {
      d(this, "ZodArray");
    }
    _parse(e) {
      let { ctx: t, status: r } = this._processInputParams(e), i = this._def;
      if (t.parsedType !== m.ZodParsedType.array)
        return (0, c.addIssueToContext)(t, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.array,
          received: t.parsedType
        }), c.INVALID;
      if (i.exactLength !== null) {
        let o = t.data.length > i.exactLength.value, a = t.data.length < i.exactLength.value;
        (o || a) && ((0, c.addIssueToContext)(t, {
          code: o ? f.ZodIssueCode.too_big : f.ZodIssueCode.too_small,
          minimum: a ? i.exactLength.value : void 0,
          maximum: o ? i.exactLength.value : void 0,
          type: "array",
          inclusive: !0,
          exact: !0,
          message: i.exactLength.message
        }), r.dirty());
      }
      if (i.minLength !== null && t.data.length < i.minLength.value && ((0, c.addIssueToContext)(t, {
        code: f.ZodIssueCode.too_small,
        minimum: i.minLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: i.minLength.message
      }), r.dirty()), i.maxLength !== null && t.data.length > i.maxLength.value && ((0, c.addIssueToContext)(t, {
        code: f.ZodIssueCode.too_big,
        maximum: i.maxLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: i.maxLength.message
      }), r.dirty()), t.common.async)
        return Promise.all([...t.data].map((o, a) => i.type._parseAsync(new P(t, o, t.path, a)))).then((o) => c.ParseStatus.mergeArray(r, o));
      let n = [...t.data].map((o, a) => i.type._parseSync(new P(t, o, t.path, a)));
      return c.ParseStatus.mergeArray(r, n);
    }
    get element() {
      return this._def.type;
    }
    min(e, t) {
      return new s({
        ...this._def,
        minLength: { value: e, message: g.errorUtil.toString(t) }
      });
    }
    max(e, t) {
      return new s({
        ...this._def,
        maxLength: { value: e, message: g.errorUtil.toString(t) }
      });
    }
    length(e, t) {
      return new s({
        ...this._def,
        exactLength: { value: e, message: g.errorUtil.toString(t) }
      });
    }
    nonempty(e) {
      return this.min(1, e);
    }
  };
  u.ZodArray = B;
  B.create = (s, e) => new B({
    type: s,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: _.ZodArray,
    ...b(e)
  });
  function ge(s) {
    if (s instanceof E) {
      let e = {};
      for (let t in s.shape) {
        let r = s.shape[t];
        e[t] = j.create(ge(r));
      }
      return new E({
        ...s._def,
        shape: /* @__PURE__ */ d(() => e, "shape")
      });
    } else return s instanceof B ? new B({
      ...s._def,
      type: ge(s.element)
    }) : s instanceof j ? j.create(ge(s.unwrap())) : s instanceof L ? L.create(ge(s.unwrap())) : s instanceof M ? M.create(s.items.map((e) => ge(
    e))) : s;
  }
  d(ge, "deepPartialify");
  var E = class s extends v {
    static {
      d(this, "ZodObject");
    }
    constructor() {
      super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      let e = this._def.shape(), t = m.util.objectKeys(e);
      return this._cached = { shape: e, keys: t };
    }
    _parse(e) {
      if (this._getType(e) !== m.ZodParsedType.object) {
        let h = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(h, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.object,
          received: h.parsedType
        }), c.INVALID;
      }
      let { status: r, ctx: i } = this._processInputParams(e), { shape: n, keys: o } = this._getCached(), a = [];
      if (!(this._def.catchall instanceof V && this._def.unknownKeys === "strip"))
        for (let h in i.data)
          o.includes(h) || a.push(h);
      let l = [];
      for (let h of o) {
        let p = n[h], y = i.data[h];
        l.push({
          key: { status: "valid", value: h },
          value: p._parse(new P(i, y, i.path, h)),
          alwaysSet: h in i.data
        });
      }
      if (this._def.catchall instanceof V) {
        let h = this._def.unknownKeys;
        if (h === "passthrough")
          for (let p of a)
            l.push({
              key: { status: "valid", value: p },
              value: { status: "valid", value: i.data[p] }
            });
        else if (h === "strict")
          a.length > 0 && ((0, c.addIssueToContext)(i, {
            code: f.ZodIssueCode.unrecognized_keys,
            keys: a
          }), r.dirty());
        else if (h !== "strip")
          throw new Error("Internal ZodObject error: invalid unknownKeys value.");
      } else {
        let h = this._def.catchall;
        for (let p of a) {
          let y = i.data[p];
          l.push({
            key: { status: "valid", value: p },
            value: h._parse(
              new P(i, y, i.path, p)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: p in i.data
          });
        }
      }
      return i.common.async ? Promise.resolve().then(async () => {
        let h = [];
        for (let p of l) {
          let y = await p.key, k = await p.value;
          h.push({
            key: y,
            value: k,
            alwaysSet: p.alwaysSet
          });
        }
        return h;
      }).then((h) => c.ParseStatus.mergeObjectSync(r, h)) : c.ParseStatus.mergeObjectSync(r, l);
    }
    get shape() {
      return this._def.shape();
    }
    strict(e) {
      return g.errorUtil.errToObj, new s({
        ...this._def,
        unknownKeys: "strict",
        ...e !== void 0 ? {
          errorMap: /* @__PURE__ */ d((t, r) => {
            var i, n, o, a;
            let l = (o = (n = (i = this._def).errorMap) === null || n === void 0 ? void 0 : n.call(i, t, r).message) !== null && o !== void 0 ?
            o : r.defaultError;
            return t.code === "unrecognized_keys" ? {
              message: (a = g.errorUtil.errToObj(e).message) !== null && a !== void 0 ? a : l
            } : {
              message: l
            };
          }, "errorMap")
        } : {}
      });
    }
    strip() {
      return new s({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new s({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(e) {
      return new s({
        ...this._def,
        shape: /* @__PURE__ */ d(() => ({
          ...this._def.shape(),
          ...e
        }), "shape")
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(e) {
      return new s({
        unknownKeys: e._def.unknownKeys,
        catchall: e._def.catchall,
        shape: /* @__PURE__ */ d(() => ({
          ...this._def.shape(),
          ...e._def.shape()
        }), "shape"),
        typeName: _.ZodObject
      });
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(e, t) {
      return this.augment({ [e]: t });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(e) {
      return new s({
        ...this._def,
        catchall: e
      });
    }
    pick(e) {
      let t = {};
      return m.util.objectKeys(e).forEach((r) => {
        e[r] && this.shape[r] && (t[r] = this.shape[r]);
      }), new s({
        ...this._def,
        shape: /* @__PURE__ */ d(() => t, "shape")
      });
    }
    omit(e) {
      let t = {};
      return m.util.objectKeys(this.shape).forEach((r) => {
        e[r] || (t[r] = this.shape[r]);
      }), new s({
        ...this._def,
        shape: /* @__PURE__ */ d(() => t, "shape")
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return ge(this);
    }
    partial(e) {
      let t = {};
      return m.util.objectKeys(this.shape).forEach((r) => {
        let i = this.shape[r];
        e && !e[r] ? t[r] = i : t[r] = i.optional();
      }), new s({
        ...this._def,
        shape: /* @__PURE__ */ d(() => t, "shape")
      });
    }
    required(e) {
      let t = {};
      return m.util.objectKeys(this.shape).forEach((r) => {
        if (e && !e[r])
          t[r] = this.shape[r];
        else {
          let n = this.shape[r];
          for (; n instanceof j; )
            n = n._def.innerType;
          t[r] = n;
        }
      }), new s({
        ...this._def,
        shape: /* @__PURE__ */ d(() => t, "shape")
      });
    }
    keyof() {
      return xr(m.util.objectKeys(this.shape));
    }
  };
  u.ZodObject = E;
  E.create = (s, e) => new E({
    shape: /* @__PURE__ */ d(() => s, "shape"),
    unknownKeys: "strip",
    catchall: V.create(),
    typeName: _.ZodObject,
    ...b(e)
  });
  E.strictCreate = (s, e) => new E({
    shape: /* @__PURE__ */ d(() => s, "shape"),
    unknownKeys: "strict",
    catchall: V.create(),
    typeName: _.ZodObject,
    ...b(e)
  });
  E.lazycreate = (s, e) => new E({
    shape: s,
    unknownKeys: "strip",
    catchall: V.create(),
    typeName: _.ZodObject,
    ...b(e)
  });
  var oe = class extends v {
    static {
      d(this, "ZodUnion");
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e), r = this._def.options;
      function i(n) {
        for (let a of n)
          if (a.result.status === "valid")
            return a.result;
        for (let a of n)
          if (a.result.status === "dirty")
            return t.common.issues.push(...a.ctx.common.issues), a.result;
        let o = n.map((a) => new f.ZodError(a.ctx.common.issues));
        return (0, c.addIssueToContext)(t, {
          code: f.ZodIssueCode.invalid_union,
          unionErrors: o
        }), c.INVALID;
      }
      if (d(i, "handleResults"), t.common.async)
        return Promise.all(r.map(async (n) => {
          let o = {
            ...t,
            common: {
              ...t.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await n._parseAsync({
              data: t.data,
              path: t.path,
              parent: o
            }),
            ctx: o
          };
        })).then(i);
      {
        let n, o = [];
        for (let l of r) {
          let h = {
            ...t,
            common: {
              ...t.common,
              issues: []
            },
            parent: null
          }, p = l._parseSync({
            data: t.data,
            path: t.path,
            parent: h
          });
          if (p.status === "valid")
            return p;
          p.status === "dirty" && !n && (n = { result: p, ctx: h }), h.common.issues.length && o.push(h.common.issues);
        }
        if (n)
          return t.common.issues.push(...n.ctx.common.issues), n.result;
        let a = o.map((l) => new f.ZodError(l));
        return (0, c.addIssueToContext)(t, {
          code: f.ZodIssueCode.invalid_union,
          unionErrors: a
        }), c.INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  u.ZodUnion = oe;
  oe.create = (s, e) => new oe({
    options: s,
    typeName: _.ZodUnion,
    ...b(e)
  });
  var F = /* @__PURE__ */ d((s) => s instanceof de ? F(s.schema) : s instanceof R ? F(s.innerType()) : s instanceof ue ? [s.value] : s instanceof
  ce ? s.options : s instanceof le ? m.util.objectValues(s.enum) : s instanceof he ? F(s._def.innerType) : s instanceof ie ? [void 0] : s instanceof
  ne ? [null] : s instanceof j ? [void 0, ...F(s.unwrap())] : s instanceof L ? [null, ...F(s.unwrap())] : s instanceof Re || s instanceof fe ?
  F(s.unwrap()) : s instanceof pe ? F(s._def.innerType) : [], "getDiscriminator"), Ke = class s extends v {
    static {
      d(this, "ZodDiscriminatedUnion");
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e);
      if (t.parsedType !== m.ZodParsedType.object)
        return (0, c.addIssueToContext)(t, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.object,
          received: t.parsedType
        }), c.INVALID;
      let r = this.discriminator, i = t.data[r], n = this.optionsMap.get(i);
      return n ? t.common.async ? n._parseAsync({
        data: t.data,
        path: t.path,
        parent: t
      }) : n._parseSync({
        data: t.data,
        path: t.path,
        parent: t
      }) : ((0, c.addIssueToContext)(t, {
        code: f.ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [r]
      }), c.INVALID);
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(e, t, r) {
      let i = /* @__PURE__ */ new Map();
      for (let n of t) {
        let o = F(n.shape[e]);
        if (!o.length)
          throw new Error(`A discriminator value for key \`${e}\` could not be extracted from all schema options`);
        for (let a of o) {
          if (i.has(a))
            throw new Error(`Discriminator property ${String(e)} has duplicate value ${String(a)}`);
          i.set(a, n);
        }
      }
      return new s({
        typeName: _.ZodDiscriminatedUnion,
        discriminator: e,
        options: t,
        optionsMap: i,
        ...b(r)
      });
    }
  };
  u.ZodDiscriminatedUnion = Ke;
  function Rt(s, e) {
    let t = (0, m.getParsedType)(s), r = (0, m.getParsedType)(e);
    if (s === e)
      return { valid: !0, data: s };
    if (t === m.ZodParsedType.object && r === m.ZodParsedType.object) {
      let i = m.util.objectKeys(e), n = m.util.objectKeys(s).filter((a) => i.indexOf(a) !== -1), o = { ...s, ...e };
      for (let a of n) {
        let l = Rt(s[a], e[a]);
        if (!l.valid)
          return { valid: !1 };
        o[a] = l.data;
      }
      return { valid: !0, data: o };
    } else if (t === m.ZodParsedType.array && r === m.ZodParsedType.array) {
      if (s.length !== e.length)
        return { valid: !1 };
      let i = [];
      for (let n = 0; n < s.length; n++) {
        let o = s[n], a = e[n], l = Rt(o, a);
        if (!l.valid)
          return { valid: !1 };
        i.push(l.data);
      }
      return { valid: !0, data: i };
    } else return t === m.ZodParsedType.date && r === m.ZodParsedType.date && +s == +e ? { valid: !0, data: s } : { valid: !1 };
  }
  d(Rt, "mergeValues");
  var ae = class extends v {
    static {
      d(this, "ZodIntersection");
    }
    _parse(e) {
      let { status: t, ctx: r } = this._processInputParams(e), i = /* @__PURE__ */ d((n, o) => {
        if ((0, c.isAborted)(n) || (0, c.isAborted)(o))
          return c.INVALID;
        let a = Rt(n.value, o.value);
        return a.valid ? (((0, c.isDirty)(n) || (0, c.isDirty)(o)) && t.dirty(), { status: t.value, value: a.data }) : ((0, c.addIssueToContext)(
        r, {
          code: f.ZodIssueCode.invalid_intersection_types
        }), c.INVALID);
      }, "handleParsed");
      return r.common.async ? Promise.all([
        this._def.left._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        }),
        this._def.right._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        })
      ]).then(([n, o]) => i(n, o)) : i(this._def.left._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      }), this._def.right._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      }));
    }
  };
  u.ZodIntersection = ae;
  ae.create = (s, e, t) => new ae({
    left: s,
    right: e,
    typeName: _.ZodIntersection,
    ...b(t)
  });
  var M = class s extends v {
    static {
      d(this, "ZodTuple");
    }
    _parse(e) {
      let { status: t, ctx: r } = this._processInputParams(e);
      if (r.parsedType !== m.ZodParsedType.array)
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.array,
          received: r.parsedType
        }), c.INVALID;
      if (r.data.length < this._def.items.length)
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: "array"
        }), c.INVALID;
      !this._def.rest && r.data.length > this._def.items.length && ((0, c.addIssueToContext)(r, {
        code: f.ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), t.dirty());
      let n = [...r.data].map((o, a) => {
        let l = this._def.items[a] || this._def.rest;
        return l ? l._parse(new P(r, o, r.path, a)) : null;
      }).filter((o) => !!o);
      return r.common.async ? Promise.all(n).then((o) => c.ParseStatus.mergeArray(t, o)) : c.ParseStatus.mergeArray(t, n);
    }
    get items() {
      return this._def.items;
    }
    rest(e) {
      return new s({
        ...this._def,
        rest: e
      });
    }
  };
  u.ZodTuple = M;
  M.create = (s, e) => {
    if (!Array.isArray(s))
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    return new M({
      items: s,
      typeName: _.ZodTuple,
      rest: null,
      ...b(e)
    });
  };
  var ze = class s extends v {
    static {
      d(this, "ZodRecord");
    }
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(e) {
      let { status: t, ctx: r } = this._processInputParams(e);
      if (r.parsedType !== m.ZodParsedType.object)
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.object,
          received: r.parsedType
        }), c.INVALID;
      let i = [], n = this._def.keyType, o = this._def.valueType;
      for (let a in r.data)
        i.push({
          key: n._parse(new P(r, a, r.path, a)),
          value: o._parse(new P(r, r.data[a], r.path, a)),
          alwaysSet: a in r.data
        });
      return r.common.async ? c.ParseStatus.mergeObjectAsync(t, i) : c.ParseStatus.mergeObjectSync(t, i);
    }
    get element() {
      return this._def.valueType;
    }
    static create(e, t, r) {
      return t instanceof v ? new s({
        keyType: e,
        valueType: t,
        typeName: _.ZodRecord,
        ...b(r)
      }) : new s({
        keyType: K.create(),
        valueType: e,
        typeName: _.ZodRecord,
        ...b(t)
      });
    }
  };
  u.ZodRecord = ze;
  var be = class extends v {
    static {
      d(this, "ZodMap");
    }
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(e) {
      let { status: t, ctx: r } = this._processInputParams(e);
      if (r.parsedType !== m.ZodParsedType.map)
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.map,
          received: r.parsedType
        }), c.INVALID;
      let i = this._def.keyType, n = this._def.valueType, o = [...r.data.entries()].map(([a, l], h) => ({
        key: i._parse(new P(r, a, r.path, [h, "key"])),
        value: n._parse(new P(r, l, r.path, [h, "value"]))
      }));
      if (r.common.async) {
        let a = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (let l of o) {
            let h = await l.key, p = await l.value;
            if (h.status === "aborted" || p.status === "aborted")
              return c.INVALID;
            (h.status === "dirty" || p.status === "dirty") && t.dirty(), a.set(h.value, p.value);
          }
          return { status: t.value, value: a };
        });
      } else {
        let a = /* @__PURE__ */ new Map();
        for (let l of o) {
          let h = l.key, p = l.value;
          if (h.status === "aborted" || p.status === "aborted")
            return c.INVALID;
          (h.status === "dirty" || p.status === "dirty") && t.dirty(), a.set(h.value, p.value);
        }
        return { status: t.value, value: a };
      }
    }
  };
  u.ZodMap = be;
  be.create = (s, e, t) => new be({
    valueType: e,
    keyType: s,
    typeName: _.ZodMap,
    ...b(t)
  });
  var ve = class s extends v {
    static {
      d(this, "ZodSet");
    }
    _parse(e) {
      let { status: t, ctx: r } = this._processInputParams(e);
      if (r.parsedType !== m.ZodParsedType.set)
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.set,
          received: r.parsedType
        }), c.INVALID;
      let i = this._def;
      i.minSize !== null && r.data.size < i.minSize.value && ((0, c.addIssueToContext)(r, {
        code: f.ZodIssueCode.too_small,
        minimum: i.minSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: i.minSize.message
      }), t.dirty()), i.maxSize !== null && r.data.size > i.maxSize.value && ((0, c.addIssueToContext)(r, {
        code: f.ZodIssueCode.too_big,
        maximum: i.maxSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: i.maxSize.message
      }), t.dirty());
      let n = this._def.valueType;
      function o(l) {
        let h = /* @__PURE__ */ new Set();
        for (let p of l) {
          if (p.status === "aborted")
            return c.INVALID;
          p.status === "dirty" && t.dirty(), h.add(p.value);
        }
        return { status: t.value, value: h };
      }
      d(o, "finalizeSet");
      let a = [...r.data.values()].map((l, h) => n._parse(new P(r, l, r.path, h)));
      return r.common.async ? Promise.all(a).then((l) => o(l)) : o(a);
    }
    min(e, t) {
      return new s({
        ...this._def,
        minSize: { value: e, message: g.errorUtil.toString(t) }
      });
    }
    max(e, t) {
      return new s({
        ...this._def,
        maxSize: { value: e, message: g.errorUtil.toString(t) }
      });
    }
    size(e, t) {
      return this.min(e, t).max(e, t);
    }
    nonempty(e) {
      return this.min(1, e);
    }
  };
  u.ZodSet = ve;
  ve.create = (s, e) => new ve({
    valueType: s,
    minSize: null,
    maxSize: null,
    typeName: _.ZodSet,
    ...b(e)
  });
  var Ge = class s extends v {
    static {
      d(this, "ZodFunction");
    }
    constructor() {
      super(...arguments), this.validate = this.implement;
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e);
      if (t.parsedType !== m.ZodParsedType.function)
        return (0, c.addIssueToContext)(t, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.function,
          received: t.parsedType
        }), c.INVALID;
      function r(a, l) {
        return (0, c.makeIssue)({
          data: a,
          path: t.path,
          errorMaps: [
            t.common.contextualErrorMap,
            t.schemaErrorMap,
            (0, qe.getErrorMap)(),
            qe.defaultErrorMap
          ].filter((h) => !!h),
          issueData: {
            code: f.ZodIssueCode.invalid_arguments,
            argumentsError: l
          }
        });
      }
      d(r, "makeArgsIssue");
      function i(a, l) {
        return (0, c.makeIssue)({
          data: a,
          path: t.path,
          errorMaps: [
            t.common.contextualErrorMap,
            t.schemaErrorMap,
            (0, qe.getErrorMap)(),
            qe.defaultErrorMap
          ].filter((h) => !!h),
          issueData: {
            code: f.ZodIssueCode.invalid_return_type,
            returnTypeError: l
          }
        });
      }
      d(i, "makeReturnsIssue");
      let n = { errorMap: t.common.contextualErrorMap }, o = t.data;
      if (this._def.returns instanceof G) {
        let a = this;
        return (0, c.OK)(async function(...l) {
          let h = new f.ZodError([]), p = await a._def.args.parseAsync(l, n).catch((S) => {
            throw h.addIssue(r(l, S)), h;
          }), y = await Reflect.apply(o, this, p);
          return await a._def.returns._def.type.parseAsync(y, n).catch((S) => {
            throw h.addIssue(i(y, S)), h;
          });
        });
      } else {
        let a = this;
        return (0, c.OK)(function(...l) {
          let h = a._def.args.safeParse(l, n);
          if (!h.success)
            throw new f.ZodError([r(l, h.error)]);
          let p = Reflect.apply(o, this, h.data), y = a._def.returns.safeParse(p, n);
          if (!y.success)
            throw new f.ZodError([i(p, y.error)]);
          return y.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...e) {
      return new s({
        ...this._def,
        args: M.create(e).rest(W.create())
      });
    }
    returns(e) {
      return new s({
        ...this._def,
        returns: e
      });
    }
    implement(e) {
      return this.parse(e);
    }
    strictImplement(e) {
      return this.parse(e);
    }
    static create(e, t, r) {
      return new s({
        args: e || M.create([]).rest(W.create()),
        returns: t || W.create(),
        typeName: _.ZodFunction,
        ...b(r)
      });
    }
  };
  u.ZodFunction = Ge;
  var de = class extends v {
    static {
      d(this, "ZodLazy");
    }
    get schema() {
      return this._def.getter();
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e);
      return this._def.getter()._parse({ data: t.data, path: t.path, parent: t });
    }
  };
  u.ZodLazy = de;
  de.create = (s, e) => new de({
    getter: s,
    typeName: _.ZodLazy,
    ...b(e)
  });
  var ue = class extends v {
    static {
      d(this, "ZodLiteral");
    }
    _parse(e) {
      if (e.data !== this._def.value) {
        let t = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(t, {
          received: t.data,
          code: f.ZodIssueCode.invalid_literal,
          expected: this._def.value
        }), c.INVALID;
      }
      return { status: "valid", value: e.data };
    }
    get value() {
      return this._def.value;
    }
  };
  u.ZodLiteral = ue;
  ue.create = (s, e) => new ue({
    value: s,
    typeName: _.ZodLiteral,
    ...b(e)
  });
  function xr(s, e) {
    return new ce({
      values: s,
      typeName: _.ZodEnum,
      ...b(e)
    });
  }
  d(xr, "createZodEnum");
  var ce = class s extends v {
    static {
      d(this, "ZodEnum");
    }
    constructor() {
      super(...arguments), Ae.set(this, void 0);
    }
    _parse(e) {
      if (typeof e.data != "string") {
        let t = this._getOrReturnCtx(e), r = this._def.values;
        return (0, c.addIssueToContext)(t, {
          expected: m.util.joinValues(r),
          received: t.parsedType,
          code: f.ZodIssueCode.invalid_type
        }), c.INVALID;
      }
      if (He(this, Ae, "f") || yr(this, Ae, new Set(this._def.values), "f"), !He(this, Ae, "f").has(e.data)) {
        let t = this._getOrReturnCtx(e), r = this._def.values;
        return (0, c.addIssueToContext)(t, {
          received: t.data,
          code: f.ZodIssueCode.invalid_enum_value,
          options: r
        }), c.INVALID;
      }
      return (0, c.OK)(e.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      let e = {};
      for (let t of this._def.values)
        e[t] = t;
      return e;
    }
    get Values() {
      let e = {};
      for (let t of this._def.values)
        e[t] = t;
      return e;
    }
    get Enum() {
      let e = {};
      for (let t of this._def.values)
        e[t] = t;
      return e;
    }
    extract(e, t = this._def) {
      return s.create(e, {
        ...this._def,
        ...t
      });
    }
    exclude(e, t = this._def) {
      return s.create(this.options.filter((r) => !e.includes(r)), {
        ...this._def,
        ...t
      });
    }
  };
  u.ZodEnum = ce;
  Ae = /* @__PURE__ */ new WeakMap();
  ce.create = xr;
  var le = class extends v {
    static {
      d(this, "ZodNativeEnum");
    }
    constructor() {
      super(...arguments), Se.set(this, void 0);
    }
    _parse(e) {
      let t = m.util.getValidEnumValues(this._def.values), r = this._getOrReturnCtx(e);
      if (r.parsedType !== m.ZodParsedType.string && r.parsedType !== m.ZodParsedType.number) {
        let i = m.util.objectValues(t);
        return (0, c.addIssueToContext)(r, {
          expected: m.util.joinValues(i),
          received: r.parsedType,
          code: f.ZodIssueCode.invalid_type
        }), c.INVALID;
      }
      if (He(this, Se, "f") || yr(this, Se, new Set(m.util.getValidEnumValues(this._def.values)), "f"), !He(this, Se, "f").has(e.data)) {
        let i = m.util.objectValues(t);
        return (0, c.addIssueToContext)(r, {
          received: r.data,
          code: f.ZodIssueCode.invalid_enum_value,
          options: i
        }), c.INVALID;
      }
      return (0, c.OK)(e.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  u.ZodNativeEnum = le;
  Se = /* @__PURE__ */ new WeakMap();
  le.create = (s, e) => new le({
    values: s,
    typeName: _.ZodNativeEnum,
    ...b(e)
  });
  var G = class extends v {
    static {
      d(this, "ZodPromise");
    }
    unwrap() {
      return this._def.type;
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e);
      if (t.parsedType !== m.ZodParsedType.promise && t.common.async === !1)
        return (0, c.addIssueToContext)(t, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.promise,
          received: t.parsedType
        }), c.INVALID;
      let r = t.parsedType === m.ZodParsedType.promise ? t.data : Promise.resolve(t.data);
      return (0, c.OK)(r.then((i) => this._def.type.parseAsync(i, {
        path: t.path,
        errorMap: t.common.contextualErrorMap
      })));
    }
  };
  u.ZodPromise = G;
  G.create = (s, e) => new G({
    type: s,
    typeName: _.ZodPromise,
    ...b(e)
  });
  var R = class extends v {
    static {
      d(this, "ZodEffects");
    }
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === _.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(e) {
      let { status: t, ctx: r } = this._processInputParams(e), i = this._def.effect || null, n = {
        addIssue: /* @__PURE__ */ d((o) => {
          (0, c.addIssueToContext)(r, o), o.fatal ? t.abort() : t.dirty();
        }, "addIssue"),
        get path() {
          return r.path;
        }
      };
      if (n.addIssue = n.addIssue.bind(n), i.type === "preprocess") {
        let o = i.transform(r.data, n);
        if (r.common.async)
          return Promise.resolve(o).then(async (a) => {
            if (t.value === "aborted")
              return c.INVALID;
            let l = await this._def.schema._parseAsync({
              data: a,
              path: r.path,
              parent: r
            });
            return l.status === "aborted" ? c.INVALID : l.status === "dirty" || t.value === "dirty" ? (0, c.DIRTY)(l.value) : l;
          });
        {
          if (t.value === "aborted")
            return c.INVALID;
          let a = this._def.schema._parseSync({
            data: o,
            path: r.path,
            parent: r
          });
          return a.status === "aborted" ? c.INVALID : a.status === "dirty" || t.value === "dirty" ? (0, c.DIRTY)(a.value) : a;
        }
      }
      if (i.type === "refinement") {
        let o = /* @__PURE__ */ d((a) => {
          let l = i.refinement(a, n);
          if (r.common.async)
            return Promise.resolve(l);
          if (l instanceof Promise)
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          return a;
        }, "executeRefinement");
        if (r.common.async === !1) {
          let a = this._def.schema._parseSync({
            data: r.data,
            path: r.path,
            parent: r
          });
          return a.status === "aborted" ? c.INVALID : (a.status === "dirty" && t.dirty(), o(a.value), { status: t.value, value: a.value });
        } else
          return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((a) => a.status === "aborted" ? c.INVALID : (a.
          status === "dirty" && t.dirty(), o(a.value).then(() => ({ status: t.value, value: a.value }))));
      }
      if (i.type === "transform")
        if (r.common.async === !1) {
          let o = this._def.schema._parseSync({
            data: r.data,
            path: r.path,
            parent: r
          });
          if (!(0, c.isValid)(o))
            return o;
          let a = i.transform(o.value, n);
          if (a instanceof Promise)
            throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
          return { status: t.value, value: a };
        } else
          return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((o) => (0, c.isValid)(o) ? Promise.resolve(i.transform(
          o.value, n)).then((a) => ({ status: t.value, value: a })) : o);
      m.util.assertNever(i);
    }
  };
  u.ZodEffects = R;
  u.ZodTransformer = R;
  R.create = (s, e, t) => new R({
    schema: s,
    typeName: _.ZodEffects,
    effect: e,
    ...b(t)
  });
  R.createWithPreprocess = (s, e, t) => new R({
    schema: e,
    effect: { type: "preprocess", transform: s },
    typeName: _.ZodEffects,
    ...b(t)
  });
  var j = class extends v {
    static {
      d(this, "ZodOptional");
    }
    _parse(e) {
      return this._getType(e) === m.ZodParsedType.undefined ? (0, c.OK)(void 0) : this._def.innerType._parse(e);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  u.ZodOptional = j;
  j.create = (s, e) => new j({
    innerType: s,
    typeName: _.ZodOptional,
    ...b(e)
  });
  var L = class extends v {
    static {
      d(this, "ZodNullable");
    }
    _parse(e) {
      return this._getType(e) === m.ZodParsedType.null ? (0, c.OK)(null) : this._def.innerType._parse(e);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  u.ZodNullable = L;
  L.create = (s, e) => new L({
    innerType: s,
    typeName: _.ZodNullable,
    ...b(e)
  });
  var he = class extends v {
    static {
      d(this, "ZodDefault");
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e), r = t.data;
      return t.parsedType === m.ZodParsedType.undefined && (r = this._def.defaultValue()), this._def.innerType._parse({
        data: r,
        path: t.path,
        parent: t
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  u.ZodDefault = he;
  he.create = (s, e) => new he({
    innerType: s,
    typeName: _.ZodDefault,
    defaultValue: typeof e.default == "function" ? e.default : () => e.default,
    ...b(e)
  });
  var pe = class extends v {
    static {
      d(this, "ZodCatch");
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e), r = {
        ...t,
        common: {
          ...t.common,
          issues: []
        }
      }, i = this._def.innerType._parse({
        data: r.data,
        path: r.path,
        parent: {
          ...r
        }
      });
      return (0, c.isAsync)(i) ? i.then((n) => ({
        status: "valid",
        value: n.status === "valid" ? n.value : this._def.catchValue({
          get error() {
            return new f.ZodError(r.common.issues);
          },
          input: r.data
        })
      })) : {
        status: "valid",
        value: i.status === "valid" ? i.value : this._def.catchValue({
          get error() {
            return new f.ZodError(r.common.issues);
          },
          input: r.data
        })
      };
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  u.ZodCatch = pe;
  pe.create = (s, e) => new pe({
    innerType: s,
    typeName: _.ZodCatch,
    catchValue: typeof e.catch == "function" ? e.catch : () => e.catch,
    ...b(e)
  });
  var xe = class extends v {
    static {
      d(this, "ZodNaN");
    }
    _parse(e) {
      if (this._getType(e) !== m.ZodParsedType.nan) {
        let r = this._getOrReturnCtx(e);
        return (0, c.addIssueToContext)(r, {
          code: f.ZodIssueCode.invalid_type,
          expected: m.ZodParsedType.nan,
          received: r.parsedType
        }), c.INVALID;
      }
      return { status: "valid", value: e.data };
    }
  };
  u.ZodNaN = xe;
  xe.create = (s) => new xe({
    typeName: _.ZodNaN,
    ...b(s)
  });
  u.BRAND = Symbol("zod_brand");
  var Re = class extends v {
    static {
      d(this, "ZodBranded");
    }
    _parse(e) {
      let { ctx: t } = this._processInputParams(e), r = t.data;
      return this._def.type._parse({
        data: r,
        path: t.path,
        parent: t
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  u.ZodBranded = Re;
  var Ze = class s extends v {
    static {
      d(this, "ZodPipeline");
    }
    _parse(e) {
      let { status: t, ctx: r } = this._processInputParams(e);
      if (r.common.async)
        return (/* @__PURE__ */ d(async () => {
          let n = await this._def.in._parseAsync({
            data: r.data,
            path: r.path,
            parent: r
          });
          return n.status === "aborted" ? c.INVALID : n.status === "dirty" ? (t.dirty(), (0, c.DIRTY)(n.value)) : this._def.out._parseAsync(
          {
            data: n.value,
            path: r.path,
            parent: r
          });
        }, "handleAsync"))();
      {
        let i = this._def.in._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return i.status === "aborted" ? c.INVALID : i.status === "dirty" ? (t.dirty(), {
          status: "dirty",
          value: i.value
        }) : this._def.out._parseSync({
          data: i.value,
          path: r.path,
          parent: r
        });
      }
    }
    static create(e, t) {
      return new s({
        in: e,
        out: t,
        typeName: _.ZodPipeline
      });
    }
  };
  u.ZodPipeline = Ze;
  var fe = class extends v {
    static {
      d(this, "ZodReadonly");
    }
    _parse(e) {
      let t = this._def.innerType._parse(e), r = /* @__PURE__ */ d((i) => ((0, c.isValid)(i) && (i.value = Object.freeze(i.value)), i), "fre\
eze");
      return (0, c.isAsync)(t) ? t.then((i) => r(i)) : r(t);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  u.ZodReadonly = fe;
  fe.create = (s, e) => new fe({
    innerType: s,
    typeName: _.ZodReadonly,
    ...b(e)
  });
  function Cr(s, e = {}, t) {
    return s ? z.create().superRefine((r, i) => {
      var n, o;
      if (!s(r)) {
        let a = typeof e == "function" ? e(r) : typeof e == "string" ? { message: e } : e, l = (o = (n = a.fatal) !== null && n !== void 0 ?
        n : t) !== null && o !== void 0 ? o : !0, h = typeof a == "string" ? { message: a } : a;
        i.addIssue({ code: "custom", ...h, fatal: l });
      }
    }) : z.create();
  }
  d(Cr, "custom");
  u.custom = Cr;
  u.late = {
    object: E.lazycreate
  };
  var _;
  (function(s) {
    s.ZodString = "ZodString", s.ZodNumber = "ZodNumber", s.ZodNaN = "ZodNaN", s.ZodBigInt = "ZodBigInt", s.ZodBoolean = "ZodBoolean", s.ZodDate =
    "ZodDate", s.ZodSymbol = "ZodSymbol", s.ZodUndefined = "ZodUndefined", s.ZodNull = "ZodNull", s.ZodAny = "ZodAny", s.ZodUnknown = "ZodUn\
known", s.ZodNever = "ZodNever", s.ZodVoid = "ZodVoid", s.ZodArray = "ZodArray", s.ZodObject = "ZodObject", s.ZodUnion = "ZodUnion", s.ZodDiscriminatedUnion =
    "ZodDiscriminatedUnion", s.ZodIntersection = "ZodIntersection", s.ZodTuple = "ZodTuple", s.ZodRecord = "ZodRecord", s.ZodMap = "ZodMap",
    s.ZodSet = "ZodSet", s.ZodFunction = "ZodFunction", s.ZodLazy = "ZodLazy", s.ZodLiteral = "ZodLiteral", s.ZodEnum = "ZodEnum", s.ZodEffects =
    "ZodEffects", s.ZodNativeEnum = "ZodNativeEnum", s.ZodOptional = "ZodOptional", s.ZodNullable = "ZodNullable", s.ZodDefault = "ZodDefaul\
t", s.ZodCatch = "ZodCatch", s.ZodPromise = "ZodPromise", s.ZodBranded = "ZodBranded", s.ZodPipeline = "ZodPipeline", s.ZodReadonly = "ZodRe\
adonly";
  })(_ || (u.ZodFirstPartyTypeKind = _ = {}));
  var Ys = /* @__PURE__ */ d((s, e = {
    message: `Input not instance of ${s.name}`
  }) => Cr((t) => t instanceof s, e), "instanceOfType");
  u.instanceof = Ys;
  var kr = K.create;
  u.string = kr;
  var wr = ee.create;
  u.number = wr;
  var Js = xe.create;
  u.nan = Js;
  var Xs = te.create;
  u.bigint = Xs;
  var Or = re.create;
  u.boolean = Or;
  var Qs = se.create;
  u.date = Qs;
  var ei = ye.create;
  u.symbol = ei;
  var ti = ie.create;
  u.undefined = ti;
  var ri = ne.create;
  u.null = ri;
  var si = z.create;
  u.any = si;
  var ii = W.create;
  u.unknown = ii;
  var ni = V.create;
  u.never = ni;
  var oi = _e.create;
  u.void = oi;
  var ai = B.create;
  u.array = ai;
  var di = E.create;
  u.object = di;
  var ui = E.strictCreate;
  u.strictObject = ui;
  var ci = oe.create;
  u.union = ci;
  var li = Ke.create;
  u.discriminatedUnion = li;
  var hi = ae.create;
  u.intersection = hi;
  var pi = M.create;
  u.tuple = pi;
  var fi = ze.create;
  u.record = fi;
  var mi = be.create;
  u.map = mi;
  var gi = ve.create;
  u.set = gi;
  var yi = Ge.create;
  u.function = yi;
  var _i = de.create;
  u.lazy = _i;
  var bi = ue.create;
  u.literal = bi;
  var vi = ce.create;
  u.enum = vi;
  var xi = le.create;
  u.nativeEnum = xi;
  var Ci = G.create;
  u.promise = Ci;
  var Ir = R.create;
  u.effect = Ir;
  u.transformer = Ir;
  var ki = j.create;
  u.optional = ki;
  var wi = L.create;
  u.nullable = wi;
  var Oi = R.createWithPreprocess;
  u.preprocess = Oi;
  var Ii = Ze.create;
  u.pipeline = Ii;
  var Ti = /* @__PURE__ */ d(() => kr().optional(), "ostring");
  u.ostring = Ti;
  var Ei = /* @__PURE__ */ d(() => wr().optional(), "onumber");
  u.onumber = Ei;
  var Ai = /* @__PURE__ */ d(() => Or().optional(), "oboolean");
  u.oboolean = Ai;
  u.coerce = {
    string: /* @__PURE__ */ d((s) => K.create({ ...s, coerce: !0 }), "string"),
    number: /* @__PURE__ */ d((s) => ee.create({ ...s, coerce: !0 }), "number"),
    boolean: /* @__PURE__ */ d((s) => re.create({
      ...s,
      coerce: !0
    }), "boolean"),
    bigint: /* @__PURE__ */ d((s) => te.create({ ...s, coerce: !0 }), "bigint"),
    date: /* @__PURE__ */ d((s) => se.create({ ...s, coerce: !0 }), "date")
  };
  u.NEVER = c.INVALID;
});

// ../node_modules/zod/lib/external.js
var Zt = I((N) => {
  "use strict";
  var Si = N && N.__createBinding || (Object.create ? function(s, e, t, r) {
    r === void 0 && (r = t);
    var i = Object.getOwnPropertyDescriptor(e, t);
    (!i || ("get" in i ? !e.__esModule : i.writable || i.configurable)) && (i = { enumerable: !0, get: /* @__PURE__ */ d(function() {
      return e[t];
    }, "get") }), Object.defineProperty(s, r, i);
  } : function(s, e, t, r) {
    r === void 0 && (r = t), s[r] = e[t];
  }), Ce = N && N.__exportStar || function(s, e) {
    for (var t in s) t !== "default" && !Object.prototype.hasOwnProperty.call(e, t) && Si(e, s, t);
  };
  Object.defineProperty(N, "__esModule", { value: !0 });
  Ce(We(), N);
  Ce(At(), N);
  Ce(pr(), N);
  Ce(Te(), N);
  Ce(Tr(), N);
  Ce(Fe(), N);
});

// ../node_modules/zod/lib/index.js
var Sr = I((A) => {
  "use strict";
  var Er = A && A.__createBinding || (Object.create ? function(s, e, t, r) {
    r === void 0 && (r = t);
    var i = Object.getOwnPropertyDescriptor(e, t);
    (!i || ("get" in i ? !e.__esModule : i.writable || i.configurable)) && (i = { enumerable: !0, get: /* @__PURE__ */ d(function() {
      return e[t];
    }, "get") }), Object.defineProperty(s, r, i);
  } : function(s, e, t, r) {
    r === void 0 && (r = t), s[r] = e[t];
  }), Ri = A && A.__setModuleDefault || (Object.create ? function(s, e) {
    Object.defineProperty(s, "default", { enumerable: !0, value: e });
  } : function(s, e) {
    s.default = e;
  }), Zi = A && A.__importStar || function(s) {
    if (s && s.__esModule) return s;
    var e = {};
    if (s != null) for (var t in s) t !== "default" && Object.prototype.hasOwnProperty.call(s, t) && Er(e, s, t);
    return Ri(e, s), e;
  }, ji = A && A.__exportStar || function(s, e) {
    for (var t in s) t !== "default" && !Object.prototype.hasOwnProperty.call(e, t) && Er(e, s, t);
  };
  Object.defineProperty(A, "__esModule", { value: !0 });
  A.z = void 0;
  var Ar = Zi(Zt());
  A.z = Ar;
  ji(Zt(), A);
  A.default = Ar;
});

// src/cli/bin/index.ts
var me = require("@storybook/core/common"), Nr = require("@storybook/core/telemetry"), jt = require("@storybook/core/node-logger"), je = Y(qt(), 1);

// ../node_modules/fd-package-json/dist/esm/main.js
var zt = Y(Kt(), 1), Gt = require("node:path"), $e = require("node:fs/promises"), Yt = require("node:fs");
async function ns(s) {
  try {
    return (await (0, $e.stat)(s)).isFile();
  } catch {
    return !1;
  }
}
d(ns, "fileExists");
async function os(s) {
  for (let e of (0, zt.walkUp)(s)) {
    let t = (0, Gt.resolve)(e, "package.json");
    if (await ns(t))
      return t;
  }
  return null;
}
d(os, "findPackagePath");
async function J(s) {
  let e = await os(s);
  if (!e)
    return null;
  try {
    let t = await (0, $e.readFile)(e, { encoding: "utf8" });
    return JSON.parse(t);
  } catch {
    return null;
  }
}
d(J, "findPackage");

// node_modules/leven/index.js
var bt = [], Jt = [];
function vt(s, e) {
  if (s === e)
    return 0;
  let t = s;
  s.length > e.length && (s = e, e = t);
  let r = s.length, i = e.length;
  for (; r > 0 && s.charCodeAt(~-r) === e.charCodeAt(~-i); )
    r--, i--;
  let n = 0;
  for (; n < r && s.charCodeAt(n) === e.charCodeAt(n); )
    n++;
  if (r -= n, i -= n, r === 0)
    return i;
  let o, a, l, h, p = 0, y = 0;
  for (; p < r; )
    Jt[p] = s.charCodeAt(n + p), bt[p] = ++p;
  for (; y < i; )
    for (o = e.charCodeAt(n + y), l = y++, a = y, p = 0; p < r; p++)
      h = o === Jt[p] ? l : l + 1, l = bt[p], a = bt[p] = l > a ? h > a ? a + 1 : h : h > l ? l + 1 : h;
  return a;
}
d(vt, "leven");

// src/cli/bin/index.ts
var tt = Y(er(), 1);

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var cs = process.env.NODE_ENV === "production", Ct = "Invariant failed";
function X(s, e) {
  if (!s) {
    if (cs)
      throw new Error(Ct);
    var t = typeof e == "function" ? e() : e, r = t ? "".concat(Ct, ": ").concat(t) : Ct;
    throw new Error(r);
  }
}
d(X, "invariant");

// package.json
var tr = "8.6.14";

// src/cli/build.ts
var rr = require("@storybook/core/common"), Le = require("@storybook/core/core-server");
var sr = /* @__PURE__ */ d(async (s) => {
  let e = await J(__dirname);
  X(e, "Failed to find the closest package.json file.");
  let t = {
    ...s,
    configDir: s.configDir || "./.storybook",
    outputDir: s.outputDir || "./storybook-static",
    ignorePreview: !!s.previewUrl && !s.forceBuildPreview,
    configType: "PRODUCTION",
    cache: rr.cache,
    packageJson: e
  };
  await (0, Le.withTelemetry)(
    "build",
    { cliOptions: s, presetOptions: t },
    () => (0, Le.buildStaticStandalone)(t)
  );
}, "build");

// src/cli/dev.ts
var nr = require("@storybook/core/common"), Ue = require("@storybook/core/core-server"), D = require("@storybook/core/node-logger");
var wt = Y(kt(), 1);
function hs(s) {
  D.instance.heading = "", s instanceof Error ? s.error ? D.logger.error(s.error) : s.stats && s.stats.compilation.errors ? s.stats.compilation.
  errors.forEach((e) => D.logger.plain(e)) : D.logger.error(s) : s.compilation?.errors && s.compilation.errors.forEach((e) => D.logger.plain(
  e)), D.logger.line(), D.logger.warn(
    s.close ? wt.dedent`
          FATAL broken build!, will close the process,
          Fix the error below and restart storybook.
        ` : wt.dedent`
          Broken build, fix the error above.
          You may need to refresh the browser.
        `
  ), D.logger.line();
}
d(hs, "printError");
var or = /* @__PURE__ */ d(async (s) => {
  let { env: e } = process;
  e.NODE_ENV = e.NODE_ENV || "development";
  let t = await J(__dirname);
  X(t, "Failed to find the closest package.json file.");
  let r = {
    ...s,
    configDir: s.configDir || "./.storybook",
    configType: "DEVELOPMENT",
    ignorePreview: !!s.previewUrl && !s.forceBuildPreview,
    cache: nr.cache,
    packageJson: t
  };
  await (0, Ue.withTelemetry)(
    "dev",
    {
      cliOptions: s,
      presetOptions: r,
      printError: hs
    },
    () => (0, Ue.buildDevStandalone)(r)
  );
}, "dev");

// src/cli/globalSettings.ts
var Xe = Y(require("node:fs/promises"), 1), jr = require("node:os"), et = require("node:path"), we = Y(Sr(), 1);

// src/server-errors.ts
var Zr = Y(kt(), 1);

// src/storybook-error.ts
function Rr({
  code: s,
  category: e
}) {
  let t = String(s).padStart(4, "0");
  return `SB_${e}_${t}`;
}
d(Rr, "parseErrorCode");
var Ye = class s extends Error {
  constructor(t) {
    super(s.getFullMessage(t));
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    this.data = {};
    /** Flag used to easily determine if the error originates from Storybook. */
    this.fromStorybook = !0;
    this.category = t.category, this.documentation = t.documentation ?? !1, this.code = t.code;
  }
  static {
    d(this, "StorybookError");
  }
  get fullErrorCode() {
    return Rr({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let t = this.constructor.name;
    return `${this.fullErrorCode} (${t})`;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation: t,
    code: r,
    category: i,
    message: n
  }) {
    let o;
    return t === !0 ? o = `https://storybook.js.org/error/${Rr({ code: r, category: i })}` : typeof t == "string" ? o = t : Array.isArray(t) &&
    (o = `
${t.map((a) => `	- ${a}`).join(`
`)}`), `${n}${o != null ? `

More info: ${o}
` : ""}`;
  }
};

// src/server-errors.ts
var Je = class extends Ye {
  constructor(t) {
    super({
      category: "CORE-SERVER",
      code: 1,
      message: Zr.dedent`
        Unable to save global settings file to ${t.filePath}
        ${t.error && `Reason: ${t.error}`}`
    });
    this.data = t;
  }
  static {
    d(this, "SavingGlobalSettingsFileError");
  }
};

// src/cli/globalSettings.ts
var Pi = (0, et.join)((0, jr.homedir)(), ".storybook", "settings.json"), Ni = 1, Vi = we.z.object({
  version: we.z.number(),
  // NOTE: every key (and subkey) below must be optional, for forwards compatibility reasons
  // (we can remove keys once they are deprecated)
  userSince: we.z.number().optional(),
  init: we.z.object({ skipOnboarding: we.z.boolean().optional() }).optional()
}), ke;
async function Pr(s = Pi) {
  if (ke)
    return ke;
  try {
    let e = await Xe.default.readFile(s, "utf8"), t = Vi.parse(JSON.parse(e));
    ke = new Qe(s, t);
  } catch {
    ke = new Qe(s, { version: Ni, userSince: Date.now() }), await ke.save();
  }
  return ke;
}
d(Pr, "globalSettings");
var Qe = class {
  static {
    d(this, "Settings");
  }
  /**
   * Create a new Settings instance
   *
   * @param filePath Path to the JSON settings file
   * @param value Loaded value of settings
   */
  constructor(e, t) {
    this.filePath = e, this.value = t;
  }
  /** Save settings to the file */
  async save() {
    try {
      await Xe.default.mkdir((0, et.dirname)(this.filePath), { recursive: !0 }), await Xe.default.writeFile(this.filePath, JSON.stringify(this.
      value, null, 2));
    } catch (e) {
      throw new Je({
        filePath: this.filePath,
        error: e
      });
    }
  }
};

// src/cli/bin/index.ts
(0, Nr.addToGlobalContext)("cliVersion", me.versions.storybook);
var Pe = console, Vr = /* @__PURE__ */ d((s) => je.program.command(s).option(
  "--disable-telemetry",
  "Disable sending telemetry data",
  // default value is false, but if the user sets STORYBOOK_DISABLE_TELEMETRY, it can be true
  process.env.STORYBOOK_DISABLE_TELEMETRY && process.env.STORYBOOK_DISABLE_TELEMETRY !== "false"
).option("--debug", "Get more logs in debug mode", !1).option("--enable-crash-reports", "Enable sending crash reports to telemetry data").hook(
"preAction", async () => {
  try {
    await Pr();
  } catch (e) {
    Pe.error("Error loading global settings", e);
  }
}), "command");
Vr("dev").option("-p, --port <number>", "Port to run Storybook", (s) => parseInt(s, 10)).option("-h, --host <string>", "Host to run Storyboo\
k").option("-c, --config-dir <dir-name>", "Directory where to load Storybook configurations from").option(
  "--https",
  "Serve Storybook over HTTPS. Note: You must provide your own certificate information."
).option(
  "--ssl-ca <ca>",
  "Provide an SSL certificate authority. (Optional with --https, required if using a self-signed certificate)",
  me.parseList
).option("--ssl-cert <cert>", "Provide an SSL certificate. (Required with --https)").option("--ssl-key <key>", "Provide an SSL key. (Require\
d with --https)").option("--smoke-test", "Exit after successful start").option("--ci", "CI mode (skip interactive prompts, don't open browse\
r)").option("--no-open", "Do not open Storybook automatically in the browser").option("--loglevel <level>", "Control level of logging during\
 build").option("--quiet", "Suppress verbose build output").option("--no-version-updates", "Suppress update check", !0).option("--debug-webp\
ack", "Display final webpack configurations for debugging purposes").option(
  "--webpack-stats-json [directory]",
  "Write Webpack stats JSON to disk (synonym for `--stats-json`)"
).option("--stats-json [directory]", "Write stats JSON to disk").option(
  "--preview-url <string>",
  "Disables the default storybook preview and lets your use your own"
).option("--force-build-preview", "Build the preview iframe even if you are using --preview-url").option("--docs", "Build a documentation-on\
ly site using addon-docs").option("--exact-port", "Exit early if the desired port is not available").option(
  "--initial-path [path]",
  "URL path to be appended when visiting Storybook for the first time"
).action(async (s) => {
  jt.logger.setLevel(s.loglevel);
  let e = await J(__dirname);
  X(e, "Failed to find the closest package.json file."), Pe.log(tt.default.bold(`${e.name} v${e.version}`) + tt.default.reset(`
`)), (0, me.getEnvConfig)(s, {
    port: "SBCONFIG_PORT",
    host: "SBCONFIG_HOSTNAME",
    staticDir: "SBCONFIG_STATIC_DIR",
    configDir: "SBCONFIG_CONFIG_DIR",
    ci: "CI"
  }), parseInt(`${s.port}`, 10) && (s.port = parseInt(`${s.port}`, 10)), await or({ ...s, packageJson: e }).catch(() => process.exit(1));
});
Vr("build").option("-o, --output-dir <dir-name>", "Directory where to store built files").option("-c, --config-dir <dir-name>", "Directory w\
here to load Storybook configurations from").option("--quiet", "Suppress verbose build output").option("--loglevel <level>", "Control level \
of logging during build").option("--debug-webpack", "Display final webpack configurations for debugging purposes").option(
  "--webpack-stats-json [directory]",
  "Write Webpack stats JSON to disk (synonym for `--stats-json`)"
).option("--stats-json [directory]", "Write stats JSON to disk").option(
  "--preview-url <string>",
  "Disables the default storybook preview and lets your use your own"
).option("--force-build-preview", "Build the preview iframe even if you are using --preview-url").option("--docs", "Build a documentation-on\
ly site using addon-docs").option("--test", "Build stories optimized for testing purposes.").action(async (s) => {
  let { env: e } = process;
  e.NODE_ENV = e.NODE_ENV || "production";
  let t = await J(__dirname);
  X(t, "Failed to find the closest package.json file."), jt.logger.setLevel(s.loglevel), Pe.log(tt.default.bold(`${t.name} v${t.version}
`)), (0, me.getEnvConfig)(s, {
    staticDir: "SBCONFIG_STATIC_DIR",
    outputDir: "SBCONFIG_OUTPUT_DIR",
    configDir: "SBCONFIG_CONFIG_DIR"
  }), await sr({
    ...s,
    packageJson: t,
    test: !!s.test || process.env.SB_TESTBUILD === "true"
  }).catch(() => process.exit(1));
});
je.program.on("command:*", ([s]) => {
  Pe.error(
    ` Invalid command: %s.
 See --help for a list of available commands.`,
    s
  );
  let t = je.program.commands.map((r) => r.name()).find((r) => vt(r, s) < 3);
  t && Pe.info(`
 Did you mean ${t}?`), process.exit(1);
});
je.program.usage("<command> [options]").version(String(tr)).parse(process.argv);
