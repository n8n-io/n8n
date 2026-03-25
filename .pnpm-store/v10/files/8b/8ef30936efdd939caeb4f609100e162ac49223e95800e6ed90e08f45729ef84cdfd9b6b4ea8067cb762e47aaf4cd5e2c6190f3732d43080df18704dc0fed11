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
  StorybookError
} from "./chunk-WANDQWBR.js";
import {
  require_dist
} from "./chunk-SLZHVDN6.js";
import {
  require_picocolors
} from "./chunk-LE232J7F.js";
import {
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// src/server-errors.ts
var import_picocolors = __toESM(require_picocolors(), 1), import_ts_dedent = __toESM(require_dist(), 1);
var Category = /* @__PURE__ */ ((Category2) => (Category2.CLI = "CLI", Category2.CLI_INIT = "CLI_INIT", Category2.CLI_AUTOMIGRATE = "CLI_AUTOMIGRATE", Category2.CLI_UPGRADE = "CLI_UPGRADE", Category2.CLI_ADD = "CLI_ADD", Category2.CODEMOD = "CODEMOD", Category2.CORE_SERVER = "CORE-SERVER", Category2.CSF_PLUGIN = "CSF-PLUGIN", Category2.CSF_TOOLS = "CSF-TOOLS", Category2.CORE_COMMON = "CORE-COMMON", Category2.NODE_LOGGER = "NODE-LOGGER", Category2.TELEMETRY = "TELEMETRY", Category2.BUILDER_MANAGER = "BUILDER-MANAGER", Category2.BUILDER_VITE = "BUILDER-VITE", Category2.BUILDER_WEBPACK5 = "BUILDER-WEBPACK5", Category2.SOURCE_LOADER = "SOURCE-LOADER", Category2.POSTINSTALL = "POSTINSTALL", Category2.DOCS_TOOLS = "DOCS-TOOLS", Category2.CORE_WEBPACK = "CORE-WEBPACK", Category2.FRAMEWORK_ANGULAR = "FRAMEWORK_ANGULAR", Category2.FRAMEWORK_EMBER = "FRAMEWORK_EMBER", Category2.FRAMEWORK_HTML_VITE = "FRAMEWORK_HTML-VITE", Category2.FRAMEWORK_HTML_WEBPACK5 = "FRAMEWORK_HTML-WEBPACK5", Category2.FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS", Category2.FRAMEWORK_PREACT_VITE = "FRAMEWORK_PREACT-VITE", Category2.FRAMEWORK_PREACT_WEBPACK5 = "FRAMEWORK_PREACT-WEBPACK5", Category2.FRAMEWORK_REACT_VITE = "FRAMEWORK_REACT-VITE", Category2.FRAMEWORK_REACT_WEBPACK5 = "FRAMEWORK_REACT-WEBPACK5", Category2.FRAMEWORK_SERVER_WEBPACK5 = "FRAMEWORK_SERVER-WEBPACK5", Category2.FRAMEWORK_SVELTE_VITE = "FRAMEWORK_SVELTE-VITE", Category2.FRAMEWORK_SVELTEKIT = "FRAMEWORK_SVELTEKIT", Category2.FRAMEWORK_VUE_VITE = "FRAMEWORK_VUE-VITE", Category2.FRAMEWORK_VUE_WEBPACK5 = "FRAMEWORK_VUE-WEBPACK5", Category2.FRAMEWORK_VUE3_VITE = "FRAMEWORK_VUE3-VITE", Category2.FRAMEWORK_VUE3_WEBPACK5 = "FRAMEWORK_VUE3-WEBPACK5", Category2.FRAMEWORK_WEB_COMPONENTS_VITE = "FRAMEWORK_WEB-COMPONENTS-VITE", Category2.FRAMEWORK_WEB_COMPONENTS_WEBPACK5 = "FRAMEWORK_WEB-COMPONENTS-WEBPACK5", Category2))(Category || {}), NxProjectDetectedError = class extends StorybookError {
  constructor() {
    super({
      name: "NxProjectDetectedError",
      category: "CLI_INIT" /* CLI_INIT */,
      code: 1,
      documentation: "https://nx.dev/nx-api/storybook#generating-storybook-configuration",
      message: import_ts_dedent.dedent`
        We have detected Nx in your project. Nx has its own Storybook initializer, so please use it instead.
        Run "nx g @nx/storybook:configuration <your-project-name>" to add Storybook to a given Nx app or lib.`
    });
  }
}, MissingFrameworkFieldError = class extends StorybookError {
  constructor() {
    super({
      name: "MissingFrameworkFieldError",
      category: "CORE-COMMON" /* CORE_COMMON */,
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#new-framework-api",
      message: import_ts_dedent.dedent`
        Could not find a 'framework' field in Storybook config.
        
        Please run 'npx storybook automigrate' to automatically fix your config.`
    });
  }
}, InvalidFrameworkNameError = class extends StorybookError {
  constructor(data) {
    super({
      name: "InvalidFrameworkNameError",
      category: "CORE-COMMON" /* CORE_COMMON */,
      code: 2,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#new-framework-api",
      message: import_ts_dedent.dedent`
        Invalid value of '${data.frameworkName}' in the 'framework' field of Storybook config.
        
        Please run 'npx storybook automigrate' to automatically fix your config.
      `
    });
    this.data = data;
  }
}, CouldNotEvaluateFrameworkError = class extends StorybookError {
  constructor(data) {
    super({
      name: "CouldNotEvaluateFrameworkError",
      category: "CORE-COMMON" /* CORE_COMMON */,
      code: 3,
      documentation: "",
      message: import_ts_dedent.dedent`
        Could not evaluate the '${data.frameworkName}' package from the 'framework' field of Storybook config.
        
        Are you sure it's a valid package and is installed?`
    });
    this.data = data;
  }
}, ConflictingStaticDirConfigError = class extends StorybookError {
  constructor() {
    super({
      name: "ConflictingStaticDirConfigError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 1,
      documentation: "https://storybook.js.org/docs/configure/integration/images-and-assets#serving-static-files-via-storybook-configuration",
      message: import_ts_dedent.dedent`
        Storybook encountered a conflict when trying to serve statics. You have configured both:
        * Storybook's option in the config file: 'staticDirs'
        * Storybook's (deprecated) CLI flag: '--staticDir' or '-s'
        
        Please remove the CLI flag from your storybook script and use only the 'staticDirs' option instead.`
    });
  }
}, InvalidStoriesEntryError = class extends StorybookError {
  constructor() {
    super({
      name: "InvalidStoriesEntryError",
      category: "CORE-COMMON" /* CORE_COMMON */,
      code: 4,
      documentation: "https://storybook.js.org/docs/faq#can-i-have-a-storybook-with-no-local-stories",
      message: import_ts_dedent.dedent`
        Storybook could not index your stories.
        Your main configuration does not contain a 'stories' field, or it resolved to an empty array.
        
        Please check your main configuration file and make sure it exports a 'stories' field that is not an empty array.`
    });
  }
}, WebpackMissingStatsError = class extends StorybookError {
  constructor() {
    super({
      name: "WebpackMissingStatsError",
      category: "BUILDER-WEBPACK5" /* BUILDER_WEBPACK5 */,
      code: 1,
      documentation: [
        "https://webpack.js.org/configuration/stats/",
        "https://storybook.js.org/docs/builders/webpack#configure"
      ],
      message: import_ts_dedent.dedent`
        No Webpack stats found. Did you turn off stats reporting in your Webpack config?
        Storybook needs Webpack stats (including errors) in order to build correctly.`
    });
  }
}, WebpackInvocationError = class extends StorybookError {
  constructor(data) {
    super({
      name: "WebpackInvocationError",
      category: "BUILDER-WEBPACK5" /* BUILDER_WEBPACK5 */,
      code: 2,
      message: data.error.message.trim()
    });
    this.data = data;
  }
};
function removeAnsiEscapeCodes(input = "") {
  return input.replace(/\u001B\[[0-9;]*m/g, "");
}
var WebpackCompilationError = class extends StorybookError {
  constructor(data) {
    data.errors = data.errors.map((err) => ({
      ...err,
      message: removeAnsiEscapeCodes(err.message),
      stack: removeAnsiEscapeCodes(err.stack),
      name: err.name
    }));
    super({
      name: "WebpackCompilationError",
      category: "BUILDER-WEBPACK5" /* BUILDER_WEBPACK5 */,
      code: 3,
      // This error message is a followup of errors logged by Webpack to the user
      message: import_ts_dedent.dedent`
        There were problems when compiling your code with Webpack.
        Run Storybook with --debug-webpack for more information.
      `
    });
    this.data = data;
  }
}, MissingAngularJsonError = class extends StorybookError {
  constructor(data) {
    super({
      name: "MissingAngularJsonError",
      category: "CLI_INIT" /* CLI_INIT */,
      code: 2,
      documentation: "https://storybook.js.org/docs/faq#error-no-angularjson-file-found?ref=error",
      message: import_ts_dedent.dedent`
        An angular.json file was not found in the current working directory: ${data.path}
        Storybook needs it to work properly, so please rerun the command at the root of your project, where the angular.json file is located.`
    });
    this.data = data;
  }
}, AngularLegacyBuildOptionsError = class extends StorybookError {
  constructor() {
    super({
      name: "AngularLegacyBuildOptionsError",
      category: "FRAMEWORK_ANGULAR" /* FRAMEWORK_ANGULAR */,
      code: 1,
      documentation: [
        "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#angular-drop-support-for-calling-storybook-directly",
        "https://github.com/storybookjs/storybook/tree/next/code/frameworks/angular#how-do-i-migrate-to-an-angular-storybook-builder"
      ],
      message: import_ts_dedent.dedent`
        Your Storybook startup script uses a solution that is not supported anymore.
        You must use Angular builder to have an explicit configuration on the project used in angular.json.
        
        Please run 'npx storybook automigrate' to automatically fix your config.`
    });
  }
}, CriticalPresetLoadError = class extends StorybookError {
  constructor(data) {
    super({
      name: "CriticalPresetLoadError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 2,
      documentation: "",
      message: import_ts_dedent.dedent`
        Storybook failed to load the following preset: ${data.presetName}.
        
        Please check whether your setup is correct, the Storybook dependencies (and their peer dependencies) are installed correctly and there are no package version clashes.
        
        If you believe this is a bug, please open an issue on Github.
        
        ${data.error.stack || data.error.message}`
    });
    this.data = data;
  }
}, MissingBuilderError = class extends StorybookError {
  constructor() {
    super({
      name: "MissingBuilderError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 3,
      documentation: "https://github.com/storybookjs/storybook/issues/24071",
      message: import_ts_dedent.dedent`
        Storybook could not find a builder configuration for your project. 
        Builders normally come from a framework package e.g. '@storybook/react-vite', or from builder packages e.g. '@storybook/builder-vite'.
        
        - Does your main config file contain a 'framework' field configured correctly?
        - Is the Storybook framework package installed correctly?
        - If you don't use a framework, does your main config contain a 'core.builder' configured correctly?
        - Are you in a monorepo and perhaps the framework package is hoisted incorrectly?
        
        If you believe this is a bug, please describe your issue in detail on Github.`
    });
  }
}, GoogleFontsDownloadError = class extends StorybookError {
  constructor(data) {
    super({
      name: "GoogleFontsDownloadError",
      category: "FRAMEWORK_NEXTJS" /* FRAMEWORK_NEXTJS */,
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/blob/next/code/frameworks/nextjs/README.md#nextjs-font-optimization",
      message: import_ts_dedent.dedent`
        Failed to fetch \`${data.fontFamily}\` from Google Fonts with URL: \`${data.url}\``
    });
    this.data = data;
  }
}, GoogleFontsLoadingError = class extends StorybookError {
  constructor(data) {
    super({
      name: "GoogleFontsLoadingError",
      category: "FRAMEWORK_NEXTJS" /* FRAMEWORK_NEXTJS */,
      code: 2,
      documentation: "https://github.com/storybookjs/storybook/blob/next/code/frameworks/nextjs/README.md#nextjs-font-optimization",
      message: import_ts_dedent.dedent`
        An error occurred when trying to load Google Fonts with URL \`${data.url}\`.
        
        ${data.error instanceof Error ? data.error.message : ""}`
    });
    this.data = data;
  }
}, SvelteViteWithSvelteKitError = class extends StorybookError {
  constructor() {
    super({
      name: "SvelteViteWithSvelteKitError",
      category: "FRAMEWORK_SVELTE-VITE" /* FRAMEWORK_SVELTE_VITE */,
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#sveltekit-needs-the-storybooksveltekit-framework",
      message: import_ts_dedent.dedent`
        We've detected a SvelteKit project using the @storybook/svelte-vite framework, which is not supported.
        Please use the @storybook/sveltekit framework instead.`
    });
  }
}, NoMatchingExportError = class extends StorybookError {
  constructor(data) {
    super({
      name: "NoMatchingExportError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 4,
      documentation: "",
      message: import_ts_dedent.dedent`
        There was an exports mismatch error when trying to build Storybook.
        Please check whether the versions of your Storybook packages match whenever possible, as this might be the cause.
        
        Problematic example:
        { "@storybook/react": "7.5.3", "@storybook/react-vite": "7.4.5", "storybook": "7.3.0" }
        
        Correct example:
        { "@storybook/react": "7.5.3", "@storybook/react-vite": "7.5.3", "storybook": "7.5.3" }
        
        Please run \`npx storybook doctor\` for guidance on how to fix this issue.`
    });
    this.data = data;
  }
}, MainFileMissingError = class extends StorybookError {
  constructor(data) {
    let map = {
      storybook: {
        helperMessage: "You can pass a --config-dir flag to tell Storybook, where your main.js file is located at.",
        documentation: "https://storybook.js.org/docs/configure?ref=error"
      },
      vitest: {
        helperMessage: "You can pass a configDir plugin option to tell where your main.js file is located at.",
        // TODO: add proper docs once available
        documentation: "https://storybook.js.org/docs/configure?ref=error"
      }
    }, { documentation, helperMessage } = map[data.source || "storybook"];
    super({
      name: "MainFileMissingError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 6,
      documentation,
      message: import_ts_dedent.dedent`
        No configuration files have been found in your configDir: ${import_picocolors.default.yellow(data.location)}.
        Storybook needs a "main.js" file, please add it.
        
        ${helperMessage}`
    });
    this.data = data;
  }
}, MainFileEvaluationError = class extends StorybookError {
  constructor(data) {
    let errorText = import_picocolors.default.white(
      (data.error.stack || data.error.message).replaceAll(process.cwd(), "")
    );
    super({
      name: "MainFileEvaluationError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 7,
      message: import_ts_dedent.dedent`
        Storybook couldn't evaluate your ${import_picocolors.default.yellow(data.location)} file.
        
        Original error:
        ${errorText}`
    });
    this.data = data;
  }
}, StatusTypeIdMismatchError = class extends StorybookError {
  constructor(data) {
    super({
      name: "StatusTypeIdMismatchError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 16,
      message: `Status has typeId "${data.status.typeId}" but was added to store with typeId "${data.typeId}". Full status: ${JSON.stringify(
        data.status,
        null,
        2
      )}`
    });
    this.data = data;
  }
}, GenerateNewProjectOnInitError = class extends StorybookError {
  constructor(data) {
    super({
      name: "GenerateNewProjectOnInitError",
      category: "CLI_INIT" /* CLI_INIT */,
      code: 3,
      documentation: "",
      message: import_ts_dedent.dedent`
        There was an error while using ${data.packageManager} to create a new ${data.projectType} project.
        
        ${data.error instanceof Error ? data.error.message : ""}`
    });
    this.data = data;
  }
}, AddonVitestPostinstallPrerequisiteCheckError = class extends StorybookError {
  constructor(data) {
    super({
      name: "AddonVitestPostinstallPrerequisiteCheckError",
      category: "CLI_INIT" /* CLI_INIT */,
      isHandledError: !0,
      code: 4,
      documentation: "",
      message: "The prerequisite check for the Vitest addon failed."
    });
    this.data = data;
  }
}, AddonVitestPostinstallFailedAddonA11yError = class extends StorybookError {
  constructor(data) {
    super({
      name: "AddonVitestPostinstallFailedAddonA11yError",
      message: "The @storybook/addon-a11y couldn't be set up for the Vitest addon",
      category: "CLI_INIT" /* CLI_INIT */,
      isHandledError: !0,
      code: 6
    });
    this.data = data;
  }
}, AddonVitestPostinstallExistingSetupFileError = class extends StorybookError {
  constructor(data) {
    super({
      name: "AddonVitestPostinstallExistingSetupFileError",
      category: "CLI_INIT" /* CLI_INIT */,
      isHandledError: !0,
      code: 7,
      documentation: "https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup",
      message: import_ts_dedent.dedent`
        Found an existing Vitest setup file: ${data.filePath}
        Please refer to the documentation to complete the setup manually.
      `
    });
    this.data = data;
  }
}, AddonVitestPostinstallWorkspaceUpdateError = class extends StorybookError {
  constructor(data) {
    super({
      name: "AddonVitestPostinstallWorkspaceUpdateError",
      category: "CLI_INIT" /* CLI_INIT */,
      isHandledError: !0,
      code: 8,
      documentation: "https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup",
      message: import_ts_dedent.dedent`
        Could not update existing Vitest workspace file: ${data.filePath}
        Please refer to the documentation to complete the setup manually.
      `
    });
    this.data = data;
  }
}, AddonVitestPostinstallConfigUpdateError = class extends StorybookError {
  constructor(data) {
    super({
      name: "AddonVitestPostinstallConfigUpdateError",
      category: "CLI_INIT" /* CLI_INIT */,
      isHandledError: !0,
      code: 9,
      documentation: "https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup",
      message: import_ts_dedent.dedent`
        Unable to update existing Vitest config file: ${data.filePath}
        Please refer to the documentation to complete the setup manually.
      `
    });
    this.data = data;
  }
}, AddonVitestPostinstallError = class extends StorybookError {
  constructor(data) {
    super({
      name: "AddonVitestPostinstallError",
      category: "CLI_INIT" /* CLI_INIT */,
      isHandledError: !0,
      code: 5,
      message: "The Vitest addon setup failed.",
      subErrors: data.errors
    });
    this.data = data;
  }
}, UpgradeStorybookToLowerVersionError = class extends StorybookError {
  constructor(data) {
    super({
      name: "UpgradeStorybookToLowerVersionError",
      category: "CLI_UPGRADE" /* CLI_UPGRADE */,
      code: 3,
      message: import_ts_dedent.dedent`
        You are trying to upgrade Storybook to a lower version than the version currently installed. This is not supported.
        
        Storybook version ${data.beforeVersion} was detected in your project, but you are trying to "upgrade" to version ${data.currentVersion}.
        
        This usually happens when running the upgrade command without a version specifier, e.g. "npx storybook upgrade".
        This will cause npm to run the globally cached storybook binary, which might be an older version.
        
        Instead you should always run the Storybook CLI with a version specifier to force npm to download the latest version:
        
        "npx storybook@latest upgrade"`
    });
    this.data = data;
  }
}, UpgradeStorybookUnknownCurrentVersionError = class extends StorybookError {
  constructor() {
    super({
      name: "UpgradeStorybookUnknownCurrentVersionError",
      category: "CLI_UPGRADE" /* CLI_UPGRADE */,
      code: 5,
      message: import_ts_dedent.dedent`
        We couldn't determine the current version of Storybook in your project.
        
        Are you running the Storybook CLI in a project without Storybook?
        It might help if you specify your Storybook config directory with the --config-dir flag.`
    });
  }
}, NoStatsForViteDevError = class extends StorybookError {
  constructor() {
    super({
      name: "NoStatsForViteDevError",
      category: "BUILDER-VITE" /* BUILDER_VITE */,
      code: 1,
      message: import_ts_dedent.dedent`
        Unable to write preview stats as the Vite builder does not support stats in dev mode.
        
        Please remove the \`--stats-json\` flag when running in dev mode.`
    });
  }
}, FindPackageVersionsError = class extends StorybookError {
  constructor(data) {
    super({
      name: "FindPackageVersionsError",
      category: "CLI" /* CLI */,
      code: 1,
      message: import_ts_dedent.dedent`
        Unable to find versions of "${data.packageName}" using ${data.packageManager}
        ${data.error && `Reason: ${data.error}`}`
    });
    this.data = data;
  }
}, IncompatiblePostCssConfigError = class extends StorybookError {
  constructor(data) {
    super({
      name: "IncompatiblePostCssConfigError",
      category: "FRAMEWORK_NEXTJS" /* FRAMEWORK_NEXTJS */,
      code: 3,
      message: import_ts_dedent.dedent`
        Incompatible PostCSS configuration format detected.

        Next.js uses an array-based format for plugins which is not compatible with Vite:
        
        // ❌ Incompatible format (used by Next.js)
        const config = {
          plugins: ["@tailwindcss/postcss"],
        };
        
        Please transform your PostCSS config to use the object-based format, which is compatible with Next.js and Vite:
        
        // ✅ Compatible format (works with Next.js and Vite)
        const config = {
          plugins: {
            "@tailwindcss/postcss": {},
          },
        };
        
        Original error: ${data.error.message}
      `
    });
    this.data = data;
  }
}, SavingGlobalSettingsFileError = class extends StorybookError {
  constructor(data) {
    super({
      name: "SavingGlobalSettingsFileError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 1,
      message: import_ts_dedent.dedent`
        Unable to save global settings file to ${data.filePath}
        ${data.error && `Reason: ${data.error}`}`
    });
    this.data = data;
  }
}, CommonJsConfigNotSupportedError = class extends StorybookError {
  constructor() {
    super({
      name: "CommonJsConfigNotSupportedError",
      category: "CLI_AUTOMIGRATE" /* CLI_AUTOMIGRATE */,
      code: 1,
      documentation: "https://storybook.js.org/docs/configure/overview?ref=error#es-modules",
      message: import_ts_dedent.dedent`
        Support for CommonJS Storybook config files has been removed in Storybook 10.0.0.
        Please migrate your config to a valid ESM file.
        
        CommonJS files (ending in .cjs, .cts, .cjsx, .ctsx) or files containing 'module.exports' are no longer supported.
        Please convert your config to use ES modules (import/export syntax).`
    });
  }
}, AutomigrateError = class extends StorybookError {
  constructor(data) {
    super({
      name: "AutomigrateError",
      category: "CLI_AUTOMIGRATE" /* CLI_AUTOMIGRATE */,
      code: 2,
      message: import_ts_dedent.dedent`
        An error occurred while running the automigrate command.
      `
    });
    this.data = data;
  }
};

export {
  Category,
  NxProjectDetectedError,
  MissingFrameworkFieldError,
  InvalidFrameworkNameError,
  CouldNotEvaluateFrameworkError,
  ConflictingStaticDirConfigError,
  InvalidStoriesEntryError,
  WebpackMissingStatsError,
  WebpackInvocationError,
  WebpackCompilationError,
  MissingAngularJsonError,
  AngularLegacyBuildOptionsError,
  CriticalPresetLoadError,
  MissingBuilderError,
  GoogleFontsDownloadError,
  GoogleFontsLoadingError,
  SvelteViteWithSvelteKitError,
  NoMatchingExportError,
  MainFileMissingError,
  MainFileEvaluationError,
  StatusTypeIdMismatchError,
  GenerateNewProjectOnInitError,
  AddonVitestPostinstallPrerequisiteCheckError,
  AddonVitestPostinstallFailedAddonA11yError,
  AddonVitestPostinstallExistingSetupFileError,
  AddonVitestPostinstallWorkspaceUpdateError,
  AddonVitestPostinstallConfigUpdateError,
  AddonVitestPostinstallError,
  UpgradeStorybookToLowerVersionError,
  UpgradeStorybookUnknownCurrentVersionError,
  NoStatsForViteDevError,
  FindPackageVersionsError,
  IncompatiblePostCssConfigError,
  SavingGlobalSettingsFileError,
  CommonJsConfigNotSupportedError,
  AutomigrateError
};
