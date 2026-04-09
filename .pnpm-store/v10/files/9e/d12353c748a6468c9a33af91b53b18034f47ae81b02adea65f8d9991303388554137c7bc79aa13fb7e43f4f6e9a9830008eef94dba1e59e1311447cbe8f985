import ESM_COMPAT_Module from "node:module";
import { fileURLToPath as ESM_COMPAT_fileURLToPath } from 'node:url';
import { dirname as ESM_COMPAT_dirname } from 'node:path';
const __filename = ESM_COMPAT_fileURLToPath(import.meta.url);
const __dirname = ESM_COMPAT_dirname(__filename);
const require = ESM_COMPAT_Module.createRequire(import.meta.url);
var ae = Object.create;
var x = Object.defineProperty;
var ie = Object.getOwnPropertyDescriptor;
var ce = Object.getOwnPropertyNames;
var ue = Object.getPrototypeOf, le = Object.prototype.hasOwnProperty;
var s = (t, e) => x(t, "name", { value: e, configurable: !0 }), f = /* @__PURE__ */ ((t) => typeof require < "u" ? require : typeof Proxy < "\
u" ? new Proxy(t, {
  get: (e, o) => (typeof require < "u" ? require : e)[o]
}) : t)(function(t) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + t + '" is not supported');
});
var O = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports);
var me = (t, e, o, n) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let c of ce(e))
      !le.call(t, c) && c !== o && x(t, c, { get: () => e[c], enumerable: !(n = ie(e, c)) || n.enumerable });
  return t;
};
var A = (t, e, o) => (o = t != null ? ae(ue(t)) : {}, me(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !t || !t.__esModule ? x(o, "default", { value: t, enumerable: !0 }) : o,
  t
));

// ../node_modules/picocolors/picocolors.js
var w = O((he, k) => {
  var _ = process.argv || [], h = process.env, ge = !("NO_COLOR" in h || _.includes("--no-color")) && ("FORCE_COLOR" in h || _.includes("--c\
olor") || process.platform === "win32" || f != null && f("tty").isatty(1) && h.TERM !== "dumb" || "CI" in h), be = /* @__PURE__ */ s((t, e, o = t) => (n) => {
    let c = "" + n, u = c.indexOf(e, t.length);
    return ~u ? t + de(c, e, o, u) + e : t + c + e;
  }, "formatter"), de = /* @__PURE__ */ s((t, e, o, n) => {
    let c = "", u = 0;
    do
      c += t.substring(u, n) + o, u = n + e.length, n = t.indexOf(e, u);
    while (~n);
    return c + t.substring(u);
  }, "replaceClose"), C = /* @__PURE__ */ s((t = ge) => {
    let e = t ? be : () => String;
    return {
      isColorSupported: t,
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
  k.exports = C();
  k.exports.createColors = C;
});

// ../node_modules/ts-dedent/dist/index.js
var I = O((y) => {
  "use strict";
  Object.defineProperty(y, "__esModule", { value: !0 });
  y.dedent = void 0;
  function M(t) {
    for (var e = [], o = 1; o < arguments.length; o++)
      e[o - 1] = arguments[o];
    var n = Array.from(typeof t == "string" ? [t] : t);
    n[n.length - 1] = n[n.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var c = n.reduce(function(m, E) {
      var p = E.match(/\n([\t ]+|(?!\s).)/g);
      return p ? m.concat(p.map(function(R) {
        var b, d;
        return (d = (b = R.match(/[\t ]/g)) === null || b === void 0 ? void 0 : b.length) !== null && d !== void 0 ? d : 0;
      })) : m;
    }, []);
    if (c.length) {
      var u = new RegExp(`
[	 ]{` + Math.min.apply(Math, c) + "}", "g");
      n = n.map(function(m) {
        return m.replace(u, `
`);
      });
    }
    n[0] = n[0].replace(/^\r?\n/, "");
    var g = n[0];
    return e.forEach(function(m, E) {
      var p = g.match(/(?:^|\n)( *)$/), R = p ? p[1] : "", b = m;
      typeof m == "string" && m.includes(`
`) && (b = String(m).split(`
`).map(function(d, ne) {
        return ne === 0 ? d : "" + R + d;
      }).join(`
`)), g += b + n[E + 1];
    }), g;
  }
  s(M, "dedent");
  y.dedent = M;
  y.default = M;
});

// src/server-errors.ts
var l = A(w(), 1), i = A(I(), 1);

// src/storybook-error.ts
function S({
  code: t,
  category: e
}) {
  let o = String(t).padStart(4, "0");
  return `SB_${e}_${o}`;
}
s(S, "parseErrorCode");
var a = class t extends Error {
  constructor(o) {
    super(t.getFullMessage(o));
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    this.data = {};
    /** Flag used to easily determine if the error originates from Storybook. */
    this.fromStorybook = !0;
    this.category = o.category, this.documentation = o.documentation ?? !1, this.code = o.code;
  }
  static {
    s(this, "StorybookError");
  }
  get fullErrorCode() {
    return S({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let o = this.constructor.name;
    return `${this.fullErrorCode} (${o})`;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation: o,
    code: n,
    category: c,
    message: u
  }) {
    let g;
    return o === !0 ? g = `https://storybook.js.org/error/${S({ code: n, category: c })}` : typeof o == "string" ? g = o : Array.isArray(o) &&
    (g = `
${o.map((m) => `	- ${m}`).join(`
`)}`), `${u}${g != null ? `

More info: ${g}
` : ""}`;
  }
};

// src/server-errors.ts
var pe = /* @__PURE__ */ ((r) => (r.CLI = "CLI", r.CLI_INIT = "CLI_INIT", r.CLI_AUTOMIGRATE = "CLI_AUTOMIGRATE", r.CLI_UPGRADE = "CLI_UPGRAD\
E", r.CLI_ADD = "CLI_ADD", r.CODEMOD = "CODEMOD", r.CORE_SERVER = "CORE-SERVER", r.CSF_PLUGIN = "CSF-PLUGIN", r.CSF_TOOLS = "CSF-TOOLS", r.CORE_COMMON =
"CORE-COMMON", r.NODE_LOGGER = "NODE-LOGGER", r.TELEMETRY = "TELEMETRY", r.BUILDER_MANAGER = "BUILDER-MANAGER", r.BUILDER_VITE = "BUILDER-VI\
TE", r.BUILDER_WEBPACK5 = "BUILDER-WEBPACK5", r.SOURCE_LOADER = "SOURCE-LOADER", r.POSTINSTALL = "POSTINSTALL", r.DOCS_TOOLS = "DOCS-TOOLS",
r.CORE_WEBPACK = "CORE-WEBPACK", r.FRAMEWORK_ANGULAR = "FRAMEWORK_ANGULAR", r.FRAMEWORK_EMBER = "FRAMEWORK_EMBER", r.FRAMEWORK_HTML_VITE = "\
FRAMEWORK_HTML-VITE", r.FRAMEWORK_HTML_WEBPACK5 = "FRAMEWORK_HTML-WEBPACK5", r.FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS", r.FRAMEWORK_PREACT_VITE =
"FRAMEWORK_PREACT-VITE", r.FRAMEWORK_PREACT_WEBPACK5 = "FRAMEWORK_PREACT-WEBPACK5", r.FRAMEWORK_REACT_VITE = "FRAMEWORK_REACT-VITE", r.FRAMEWORK_REACT_WEBPACK5 =
"FRAMEWORK_REACT-WEBPACK5", r.FRAMEWORK_SERVER_WEBPACK5 = "FRAMEWORK_SERVER-WEBPACK5", r.FRAMEWORK_SVELTE_VITE = "FRAMEWORK_SVELTE-VITE", r.
FRAMEWORK_SVELTE_WEBPACK5 = "FRAMEWORK_SVELTE-WEBPACK5", r.FRAMEWORK_SVELTEKIT = "FRAMEWORK_SVELTEKIT", r.FRAMEWORK_VUE_VITE = "FRAMEWORK_VU\
E-VITE", r.FRAMEWORK_VUE_WEBPACK5 = "FRAMEWORK_VUE-WEBPACK5", r.FRAMEWORK_VUE3_VITE = "FRAMEWORK_VUE3-VITE", r.FRAMEWORK_VUE3_WEBPACK5 = "FR\
AMEWORK_VUE3-WEBPACK5", r.FRAMEWORK_WEB_COMPONENTS_VITE = "FRAMEWORK_WEB-COMPONENTS-VITE", r.FRAMEWORK_WEB_COMPONENTS_WEBPACK5 = "FRAMEWORK_\
WEB-COMPONENTS-WEBPACK5", r))(pe || {}), T = class extends a {
  static {
    s(this, "NxProjectDetectedError");
  }
  constructor() {
    super({
      category: "CLI_INIT",
      code: 1,
      documentation: "https://nx.dev/packages/storybook",
      message: i.dedent`
        We have detected Nx in your project. Nx has its own Storybook initializer, so please use it instead.
        Run "nx g @nx/storybook:configuration" to add Storybook to your project.`
    });
  }
}, W = class extends a {
  static {
    s(this, "MissingFrameworkFieldError");
  }
  constructor() {
    super({
      category: "CORE-COMMON",
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#new-framework-api",
      message: i.dedent`
        Could not find a 'framework' field in Storybook config.
        
        Please run 'npx storybook automigrate' to automatically fix your config.`
    });
  }
}, K = class extends a {
  constructor(o) {
    super({
      category: "CORE-COMMON",
      code: 2,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#new-framework-api",
      message: i.dedent`
        Invalid value of '${o.frameworkName}' in the 'framework' field of Storybook config.
        
        Please run 'npx storybook automigrate' to automatically fix your config.
      `
    });
    this.data = o;
  }
  static {
    s(this, "InvalidFrameworkNameError");
  }
}, v = class extends a {
  constructor(o) {
    super({
      category: "CORE-COMMON",
      code: 3,
      documentation: "",
      message: i.dedent`
        Could not evaluate the '${o.frameworkName}' package from the 'framework' field of Storybook config.
        
        Are you sure it's a valid package and is installed?`
    });
    this.data = o;
  }
  static {
    s(this, "CouldNotEvaluateFrameworkError");
  }
}, L = class extends a {
  static {
    s(this, "ConflictingStaticDirConfigError");
  }
  constructor() {
    super({
      category: "CORE-SERVER",
      code: 1,
      documentation: "https://storybook.js.org/docs/configure/integration/images-and-assets#serving-static-files-via-storybook-configuration",
      message: i.dedent`
        Storybook encountered a conflict when trying to serve statics. You have configured both:
        * Storybook's option in the config file: 'staticDirs'
        * Storybook's (deprecated) CLI flag: '--staticDir' or '-s'
        
        Please remove the CLI flag from your storybook script and use only the 'staticDirs' option instead.`
    });
  }
}, B = class extends a {
  static {
    s(this, "InvalidStoriesEntryError");
  }
  constructor() {
    super({
      category: "CORE-COMMON",
      code: 4,
      documentation: "https://storybook.js.org/docs/faq#can-i-have-a-storybook-with-no-local-stories",
      message: i.dedent`
        Storybook could not index your stories.
        Your main configuration somehow does not contain a 'stories' field, or it resolved to an empty array.
        
        Please check your main configuration file and make sure it exports a 'stories' field that is not an empty array.`
    });
  }
}, P = class extends a {
  static {
    s(this, "WebpackMissingStatsError");
  }
  constructor() {
    super({
      category: "BUILDER-WEBPACK5",
      code: 1,
      documentation: [
        "https://webpack.js.org/configuration/stats/",
        "https://storybook.js.org/docs/builders/webpack#configure"
      ],
      message: i.dedent`
        No Webpack stats found. Did you turn off stats reporting in your Webpack config?
        Storybook needs Webpack stats (including errors) in order to build correctly.`
    });
  }
}, V = class extends a {
  constructor(o) {
    super({
      category: "BUILDER-WEBPACK5",
      code: 2,
      message: o.error.message.trim()
    });
    this.data = o;
  }
  static {
    s(this, "WebpackInvocationError");
  }
};
function N(t = "") {
  return t.replace(/\u001B\[[0-9;]*m/g, "");
}
s(N, "removeAnsiEscapeCodes");
var $ = class extends a {
  constructor(o) {
    o.errors = o.errors.map((n) => ({
      ...n,
      message: N(n.message),
      stack: N(n.stack),
      name: n.name
    }));
    super({
      category: "BUILDER-WEBPACK5",
      code: 3,
      // This error message is a followup of errors logged by Webpack to the user
      message: i.dedent`
        There were problems when compiling your code with Webpack.
        Run Storybook with --debug-webpack for more information.
      `
    });
    this.data = o;
  }
  static {
    s(this, "WebpackCompilationError");
  }
}, j = class extends a {
  constructor(o) {
    super({
      category: "CLI_INIT",
      code: 2,
      documentation: "https://storybook.js.org/docs/faq#error-no-angularjson-file-found",
      message: i.dedent`
        An angular.json file was not found in the current working directory: ${o.path}
        Storybook needs it to work properly, so please rerun the command at the root of your project, where the angular.json file is located.`
    });
    this.data = o;
  }
  static {
    s(this, "MissingAngularJsonError");
  }
}, F = class extends a {
  static {
    s(this, "AngularLegacyBuildOptionsError");
  }
  constructor() {
    super({
      category: "FRAMEWORK_ANGULAR",
      code: 1,
      documentation: [
        "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#angular-drop-support-for-calling-storybook-directly",
        "https://github.com/storybookjs/storybook/tree/next/code/frameworks/angular#how-do-i-migrate-to-an-angular-storybook-builder"
      ],
      message: i.dedent`
        Your Storybook startup script uses a solution that is not supported anymore.
        You must use Angular builder to have an explicit configuration on the project used in angular.json.
        
        Please run 'npx storybook automigrate' to automatically fix your config.`
    });
  }
}, D = class extends a {
  constructor(o) {
    super({
      category: "CORE-SERVER",
      code: 2,
      documentation: "",
      message: i.dedent`
        Storybook failed to load the following preset: ${o.presetName}.
        
        Please check whether your setup is correct, the Storybook dependencies (and their peer dependencies) are installed correctly and there are no package version clashes.
        
        If you believe this is a bug, please open an issue on Github.
        
        ${o.error.stack || o.error.message}`
    });
    this.data = o;
  }
  static {
    s(this, "CriticalPresetLoadError");
  }
}, U = class extends a {
  static {
    s(this, "MissingBuilderError");
  }
  constructor() {
    super({
      category: "CORE-SERVER",
      code: 3,
      documentation: "https://github.com/storybookjs/storybook/issues/24071",
      message: i.dedent`
        Storybook could not find a builder configuration for your project. 
        Builders normally come from a framework package e.g. '@storybook/react-vite', or from builder packages e.g. '@storybook/builder-vite'.
        
        - Does your main config file contain a 'framework' field configured correctly?
        - Is the Storybook framework package installed correctly?
        - If you don't use a framework, does your main config contain a 'core.builder' configured correctly?
        - Are you in a monorepo and perhaps the framework package is hoisted incorrectly?
        
        If you believe this is a bug, please describe your issue in detail on Github.`
    });
  }
}, G = class extends a {
  constructor(o) {
    super({
      category: "FRAMEWORK_NEXTJS",
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/blob/next/code/frameworks/nextjs/README.md#nextjs-font-optimization",
      message: i.dedent`
        Failed to fetch \`${o.fontFamily}\` from Google Fonts with URL: \`${o.url}\``
    });
    this.data = o;
  }
  static {
    s(this, "GoogleFontsDownloadError");
  }
}, Y = class extends a {
  constructor(o) {
    super({
      category: "FRAMEWORK_NEXTJS",
      code: 2,
      documentation: "https://github.com/storybookjs/storybook/blob/next/code/frameworks/nextjs/README.md#nextjs-font-optimization",
      message: i.dedent`
        An error occurred when trying to load Google Fonts with URL \`${o.url}\`.
        
        ${o.error instanceof Error ? o.error.message : ""}`
    });
    this.data = o;
  }
  static {
    s(this, "GoogleFontsLoadingError");
  }
}, q = class extends a {
  constructor(o) {
    super({
      category: "CORE-SERVER",
      code: 4,
      documentation: "",
      message: i.dedent`
        There was an exports mismatch error when trying to build Storybook.
        Please check whether the versions of your Storybook packages match whenever possible, as this might be the cause.
        
        Problematic example:
        { "@storybook/react": "7.5.3", "@storybook/react-vite": "7.4.5", "storybook": "7.3.0" }
        
        Correct example:
        { "@storybook/react": "7.5.3", "@storybook/react-vite": "7.5.3", "storybook": "7.5.3" }
        
        Please run \`npx storybook doctor\` for guidance on how to fix this issue.`
    });
    this.data = o;
  }
  static {
    s(this, "NoMatchingExportError");
  }
}, H = class extends a {
  constructor(o) {
    let n = [
      `Storybook failed to load ${o.location}`,
      "",
      "It looks like the file tried to load/import an ESM only module.",
      `Support for this is currently limited in ${o.location}`,
      "You can import ESM modules in your main file, but only as dynamic import.",
      ""
    ];
    o.line && n.push(
      l.default.white(
        `In your ${l.default.yellow(o.location)} file, line ${l.default.bold(
          l.default.cyan(o.num)
        )} threw an error:`
      ),
      l.default.gray(o.line)
    ), n.push(
      "",
      l.default.white(
        `Convert the static import to a dynamic import ${l.default.underline("where they are used")}.`
      ),
      l.default.white("Example:") + " " + l.default.gray("await import(<your ESM only module>);"),
      ""
    );
    super({
      category: "CORE-SERVER",
      code: 5,
      documentation: "https://github.com/storybookjs/storybook/issues/23972#issuecomment-1948534058",
      message: n.join(`
`)
    });
    this.data = o;
  }
  static {
    s(this, "MainFileESMOnlyImportError");
  }
}, X = class extends a {
  constructor(o) {
    let n = {
      storybook: {
        helperMessage: "You can pass a --config-dir flag to tell Storybook, where your main.js file is located at.",
        documentation: "https://storybook.js.org/docs/configure"
      },
      vitest: {
        helperMessage: "You can pass a configDir plugin option to tell where your main.js file is located at.",
        // TODO: add proper docs once available
        documentation: "https://storybook.js.org/docs/configure"
      }
    }, { documentation: c, helperMessage: u } = n[o.source || "storybook"];
    super({
      category: "CORE-SERVER",
      code: 6,
      documentation: c,
      message: i.dedent`
        No configuration files have been found in your configDir: ${l.default.yellow(o.location)}.
        Storybook needs a "main.js" file, please add it.
        
        ${u}`
    });
    this.data = o;
  }
  static {
    s(this, "MainFileMissingError");
  }
}, z = class extends a {
  constructor(o) {
    let n = l.default.white(
      (o.error.stack || o.error.message).replaceAll(process.cwd(), "")
    );
    super({
      category: "CORE-SERVER",
      code: 7,
      message: i.dedent`
        Storybook couldn't evaluate your ${l.default.yellow(o.location)} file.
        
        Original error:
        ${n}`
    });
    this.data = o;
  }
  static {
    s(this, "MainFileEvaluationError");
  }
}, J = class extends a {
  constructor(o) {
    super({
      category: "CLI_INIT",
      code: 3,
      documentation: "",
      message: i.dedent`
        There was an error while using ${o.packageManager} to create a new ${o.projectType} project.
        
        ${o.error instanceof Error ? o.error.message : ""}`
    });
    this.data = o;
  }
  static {
    s(this, "GenerateNewProjectOnInitError");
  }
}, Q = class extends a {
  constructor(o) {
    super({
      category: "CLI_UPGRADE",
      code: 3,
      message: i.dedent`
        You are trying to upgrade Storybook to a lower version than the version currently installed. This is not supported.
        
        Storybook version ${o.beforeVersion} was detected in your project, but you are trying to "upgrade" to version ${o.currentVersion}.
        
        This usually happens when running the upgrade command without a version specifier, e.g. "npx storybook upgrade".
        This will cause npm to run the globally cached storybook binary, which might be an older version.
        
        Instead you should always run the Storybook CLI with a version specifier to force npm to download the latest version:
        
        "npx storybook@latest upgrade"`
    });
    this.data = o;
  }
  static {
    s(this, "UpgradeStorybookToLowerVersionError");
  }
}, Z = class extends a {
  constructor(o) {
    super({
      category: "CLI_UPGRADE",
      code: 4,
      message: i.dedent`
        You are upgrading Storybook to the same version that is currently installed in the project, version ${o.beforeVersion}.
        
        This usually happens when running the upgrade command without a version specifier, e.g. "npx storybook upgrade".
        This will cause npm to run the globally cached storybook binary, which might be the same version that you already have.
        This also happens if you're running the Storybook CLI that is locally installed in your project.
        
        If you intended to upgrade to the latest version, you should always run the Storybook CLI with a version specifier to force npm to download the latest version:
        
        "npx storybook@latest upgrade"
        
        If you intended to re-run automigrations, you should run the "automigrate" command directly instead:
        
        "npx storybook automigrate"`
    });
    this.data = o;
  }
  static {
    s(this, "UpgradeStorybookToSameVersionError");
  }
}, ee = class extends a {
  static {
    s(this, "UpgradeStorybookUnknownCurrentVersionError");
  }
  constructor() {
    super({
      category: "CLI_UPGRADE",
      code: 5,
      message: i.dedent`
        We couldn't determine the current version of Storybook in your project.
        
        Are you running the Storybook CLI in a project without Storybook?
        It might help if you specify your Storybook config directory with the --config-dir flag.`
    });
  }
}, oe = class extends a {
  static {
    s(this, "UpgradeStorybookInWrongWorkingDirectory");
  }
  constructor() {
    super({
      category: "CLI_UPGRADE",
      code: 6,
      message: i.dedent`
        You are running the upgrade command in a CWD that does not contain Storybook dependencies.
        
        Did you mean to run it in a different directory? Make sure the directory you run this command in contains a package.json with your Storybook dependencies.`
    });
  }
}, te = class extends a {
  static {
    s(this, "NoStatsForViteDevError");
  }
  constructor() {
    super({
      category: "BUILDER-VITE",
      code: 1,
      message: i.dedent`
        Unable to write preview stats as the Vite builder does not support stats in dev mode.
        
        Please remove the \`--stats-json\` flag when running in dev mode.`
    });
  }
}, re = class extends a {
  constructor(o) {
    super({
      category: "CLI",
      code: 1,
      message: i.dedent`
        Unable to find versions of "${o.packageName}" using ${o.packageManager}
        ${o.error && `Reason: ${o.error}`}`
    });
    this.data = o;
  }
  static {
    s(this, "FindPackageVersionsError");
  }
}, se = class extends a {
  constructor(o) {
    super({
      category: "CORE-SERVER",
      code: 1,
      message: i.dedent`
        Unable to save global settings file to ${o.filePath}
        ${o.error && `Reason: ${o.error}`}`
    });
    this.data = o;
  }
  static {
    s(this, "SavingGlobalSettingsFileError");
  }
};
export {
  F as AngularLegacyBuildOptionsError,
  pe as Category,
  L as ConflictingStaticDirConfigError,
  v as CouldNotEvaluateFrameworkError,
  D as CriticalPresetLoadError,
  re as FindPackageVersionsError,
  J as GenerateNewProjectOnInitError,
  G as GoogleFontsDownloadError,
  Y as GoogleFontsLoadingError,
  K as InvalidFrameworkNameError,
  B as InvalidStoriesEntryError,
  H as MainFileESMOnlyImportError,
  z as MainFileEvaluationError,
  X as MainFileMissingError,
  j as MissingAngularJsonError,
  U as MissingBuilderError,
  W as MissingFrameworkFieldError,
  q as NoMatchingExportError,
  te as NoStatsForViteDevError,
  T as NxProjectDetectedError,
  se as SavingGlobalSettingsFileError,
  oe as UpgradeStorybookInWrongWorkingDirectory,
  Q as UpgradeStorybookToLowerVersionError,
  Z as UpgradeStorybookToSameVersionError,
  ee as UpgradeStorybookUnknownCurrentVersionError,
  $ as WebpackCompilationError,
  V as WebpackInvocationError,
  P as WebpackMissingStatsError
};
