"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var program_exports = {};
__export(program_exports, {
  program: () => import_program2.program
});
module.exports = __toCommonJS(program_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_program = require("playwright-core/lib/cli/program");
var import_utils = require("playwright-core/lib/utils");
var import_config = require("./common/config");
var import_configLoader = require("./common/configLoader");
var import_program2 = require("playwright-core/lib/cli/program");
var import_base = require("./reporters/base");
var import_html = require("./reporters/html");
var import_merge = require("./reporters/merge");
var import_projectUtils = require("./runner/projectUtils");
var testServer = __toESM(require("./runner/testServer"));
var import_watchMode = require("./runner/watchMode");
var import_testRunner = require("./runner/testRunner");
var import_reporters = require("./runner/reporters");
var mcp = __toESM(require("./mcp/sdk/exports"));
var import_testBackend = require("./mcp/test/testBackend");
var import_program3 = require("./mcp/program");
var import_watchdog = require("./mcp/browser/watchdog");
var import_generateAgents = require("./agents/generateAgents");
const packageJSON = require("../package.json");
function addTestCommand(program3) {
  const command = program3.command("test [test-filter...]");
  command.description("run tests with Playwright Test");
  const options = testOptions.sort((a, b) => a[0].replace(/-/g, "").localeCompare(b[0].replace(/-/g, "")));
  options.forEach(([name, { description, choices, preset }]) => {
    const option = command.createOption(name, description);
    if (choices)
      option.choices(choices);
    if (preset)
      option.preset(preset);
    command.addOption(option);
    return command;
  });
  command.action(async (args, opts) => {
    try {
      await runTests(args, opts);
    } catch (e) {
      console.error(e);
      (0, import_utils.gracefullyProcessExitDoNotHang)(1);
    }
  });
  command.addHelpText("afterAll", `
Arguments [test-filter...]:
  Pass arguments to filter test files. Each argument is treated as a regular expression. Matching is performed against the absolute file paths.

Examples:
  $ npx playwright test my.spec.ts
  $ npx playwright test some.spec.ts:42
  $ npx playwright test --headed
  $ npx playwright test --project=webkit`);
}
function addClearCacheCommand(program3) {
  const command = program3.command("clear-cache");
  command.description("clears build and test caches");
  command.option("-c, --config <file>", `Configuration file, or a test directory with optional "playwright.config.{m,c}?{js,ts}"`);
  command.action(async (opts) => {
    const runner = new import_testRunner.TestRunner((0, import_configLoader.resolveConfigLocation)(opts.config), {});
    const { status } = await runner.clearCache((0, import_reporters.createErrorCollectingReporter)(import_base.terminalScreen));
    const exitCode = status === "interrupted" ? 130 : status === "passed" ? 0 : 1;
    (0, import_utils.gracefullyProcessExitDoNotHang)(exitCode);
  });
}
function addDevServerCommand(program3) {
  const command = program3.command("dev-server", { hidden: true });
  command.description("start dev server");
  command.option("-c, --config <file>", `Configuration file, or a test directory with optional "playwright.config.{m,c}?{js,ts}"`);
  command.action(async (options) => {
    const runner = new import_testRunner.TestRunner((0, import_configLoader.resolveConfigLocation)(options.config), {});
    await runner.startDevServer((0, import_reporters.createErrorCollectingReporter)(import_base.terminalScreen), "in-process");
  });
}
function addTestServerCommand(program3) {
  const command = program3.command("test-server", { hidden: true });
  command.description("start test server");
  command.option("-c, --config <file>", `Configuration file, or a test directory with optional "playwright.config.{m,c}?{js,ts}"`);
  command.option("--host <host>", "Host to start the server on", "localhost");
  command.option("--port <port>", "Port to start the server on", "0");
  command.action((opts) => runTestServer(opts));
}
function addShowReportCommand(program3) {
  const command = program3.command("show-report [report]");
  command.description("show HTML report");
  command.action((report, options) => (0, import_html.showHTMLReport)(report, options.host, +options.port));
  command.option("--host <host>", "Host to serve report on", "localhost");
  command.option("--port <port>", "Port to serve report on", "9323");
  command.addHelpText("afterAll", `
Arguments [report]:
  When specified, opens given report, otherwise opens last generated report.

Examples:
  $ npx playwright show-report
  $ npx playwright show-report playwright-report`);
}
function addMergeReportsCommand(program3) {
  const command = program3.command("merge-reports [dir]");
  command.description("merge multiple blob reports (for sharded tests) into a single report");
  command.action(async (dir, options) => {
    try {
      await mergeReports(dir, options);
    } catch (e) {
      console.error(e);
      (0, import_utils.gracefullyProcessExitDoNotHang)(1);
    }
  });
  command.option("-c, --config <file>", `Configuration file. Can be used to specify additional configuration for the output report.`);
  command.option("--reporter <reporter>", `Reporter to use, comma-separated, can be ${import_config.builtInReporters.map((name) => `"${name}"`).join(", ")} (default: "${import_config.defaultReporter}")`);
  command.addHelpText("afterAll", `
Arguments [dir]:
  Directory containing blob reports.

Examples:
  $ npx playwright merge-reports playwright-report`);
}
function addBrowserMCPServerCommand(program3) {
  const command = program3.command("run-mcp-server", { hidden: true });
  command.description("Interact with the browser over MCP");
  (0, import_program3.decorateCommand)(command, packageJSON.version);
}
function addTestMCPServerCommand(program3) {
  const command = program3.command("run-test-mcp-server", { hidden: true });
  command.description("Interact with the test runner over MCP");
  command.option("--headless", "run browser in headless mode, headed by default");
  command.option("-c, --config <file>", `Configuration file, or a test directory with optional "playwright.config.{m,c}?{js,ts}"`);
  command.option("--host <host>", "host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.");
  command.option("--port <port>", "port to listen on for SSE transport.");
  command.action(async (options) => {
    (0, import_watchdog.setupExitWatchdog)();
    const factory = {
      name: "Playwright Test Runner",
      nameInConfig: "playwright-test-runner",
      version: packageJSON.version,
      create: () => new import_testBackend.TestServerBackend(options.config, { muteConsole: options.port === void 0, headless: options.headless })
    };
    await mcp.start(factory, { port: options.port === void 0 ? void 0 : +options.port, host: options.host });
  });
}
function addInitAgentsCommand(program3) {
  const command = program3.command("init-agents");
  command.description("Initialize repository agents");
  const option = command.createOption("--loop <loop>", "Agentic loop provider");
  option.choices(["claude", "copilot", "opencode", "vscode", "vscode-legacy"]);
  command.addOption(option);
  command.option("-c, --config <file>", `Configuration file to find a project to use for seed test`);
  command.option("--project <project>", "Project to use for seed test");
  command.option("--prompts", "Whether to include prompts in the agent initialization");
  command.action(async (opts) => {
    const config = await (0, import_configLoader.loadConfigFromFile)(opts.config);
    if (opts.loop === "opencode") {
      await import_generateAgents.OpencodeGenerator.init(config, opts.project, opts.prompts);
    } else if (opts.loop === "vscode-legacy") {
      await import_generateAgents.VSCodeGenerator.init(config, opts.project);
    } else if (opts.loop === "claude") {
      await import_generateAgents.ClaudeGenerator.init(config, opts.project, opts.prompts);
    } else {
      await import_generateAgents.CopilotGenerator.init(config, opts.project, opts.prompts);
      return;
    }
  });
}
async function runTests(args, opts) {
  await (0, import_utils.startProfiling)();
  const cliOverrides = overridesFromOptions(opts);
  const config = await (0, import_configLoader.loadConfigFromFile)(opts.config, cliOverrides, opts.deps === false);
  config.cliArgs = args;
  config.cliGrep = opts.grep;
  config.cliOnlyChanged = opts.onlyChanged === true ? "HEAD" : opts.onlyChanged;
  config.cliGrepInvert = opts.grepInvert;
  config.cliListOnly = !!opts.list;
  config.cliProjectFilter = opts.project || void 0;
  config.cliPassWithNoTests = !!opts.passWithNoTests;
  config.cliLastFailed = !!opts.lastFailed;
  config.cliTestList = opts.testList ? import_path.default.resolve(process.cwd(), opts.testList) : void 0;
  config.cliTestListInvert = opts.testListInvert ? import_path.default.resolve(process.cwd(), opts.testListInvert) : void 0;
  (0, import_projectUtils.filterProjects)(config.projects, config.cliProjectFilter);
  if (opts.ui || opts.uiHost || opts.uiPort) {
    if (opts.onlyChanged)
      throw new Error(`--only-changed is not supported in UI mode. If you'd like that to change, see https://github.com/microsoft/playwright/issues/15075 for more details.`);
    const status2 = await testServer.runUIMode(opts.config, cliOverrides, {
      host: opts.uiHost,
      port: opts.uiPort ? +opts.uiPort : void 0,
      args,
      grep: opts.grep,
      grepInvert: opts.grepInvert,
      project: opts.project || void 0,
      reporter: Array.isArray(opts.reporter) ? opts.reporter : opts.reporter ? [opts.reporter] : void 0
    });
    await (0, import_utils.stopProfiling)("runner");
    const exitCode2 = status2 === "interrupted" ? 130 : status2 === "passed" ? 0 : 1;
    (0, import_utils.gracefullyProcessExitDoNotHang)(exitCode2);
    return;
  }
  if (process.env.PWTEST_WATCH) {
    if (opts.onlyChanged)
      throw new Error(`--only-changed is not supported in watch mode. If you'd like that to change, file an issue and let us know about your usecase for it.`);
    const status2 = await (0, import_watchMode.runWatchModeLoop)(
      (0, import_configLoader.resolveConfigLocation)(opts.config),
      {
        projects: opts.project,
        files: args,
        grep: opts.grep
      }
    );
    await (0, import_utils.stopProfiling)("runner");
    const exitCode2 = status2 === "interrupted" ? 130 : status2 === "passed" ? 0 : 1;
    (0, import_utils.gracefullyProcessExitDoNotHang)(exitCode2);
    return;
  }
  const status = await (0, import_testRunner.runAllTestsWithConfig)(config);
  await (0, import_utils.stopProfiling)("runner");
  const exitCode = status === "interrupted" ? 130 : status === "passed" ? 0 : 1;
  (0, import_utils.gracefullyProcessExitDoNotHang)(exitCode);
}
async function runTestServer(opts) {
  const host = opts.host;
  const port = opts.port ? +opts.port : void 0;
  const status = await testServer.runTestServer(opts.config, {}, { host, port });
  const exitCode = status === "interrupted" ? 130 : status === "passed" ? 0 : 1;
  (0, import_utils.gracefullyProcessExitDoNotHang)(exitCode);
}
async function mergeReports(reportDir, opts) {
  const configFile = opts.config;
  const config = configFile ? await (0, import_configLoader.loadConfigFromFile)(configFile) : await (0, import_configLoader.loadEmptyConfigForMergeReports)();
  const dir = import_path.default.resolve(process.cwd(), reportDir || "");
  const dirStat = await import_fs.default.promises.stat(dir).catch((e) => null);
  if (!dirStat)
    throw new Error("Directory does not exist: " + dir);
  if (!dirStat.isDirectory())
    throw new Error(`"${dir}" is not a directory`);
  let reporterDescriptions = resolveReporterOption(opts.reporter);
  if (!reporterDescriptions && configFile)
    reporterDescriptions = config.config.reporter;
  if (!reporterDescriptions)
    reporterDescriptions = [[import_config.defaultReporter]];
  const rootDirOverride = configFile ? config.config.rootDir : void 0;
  await (0, import_merge.createMergedReport)(config, dir, reporterDescriptions, rootDirOverride);
  (0, import_utils.gracefullyProcessExitDoNotHang)(0);
}
function overridesFromOptions(options) {
  const overrides = {
    failOnFlakyTests: options.failOnFlakyTests ? true : void 0,
    forbidOnly: options.forbidOnly ? true : void 0,
    fullyParallel: options.fullyParallel ? true : void 0,
    globalTimeout: options.globalTimeout ? parseInt(options.globalTimeout, 10) : void 0,
    maxFailures: options.x ? 1 : options.maxFailures ? parseInt(options.maxFailures, 10) : void 0,
    outputDir: options.output ? import_path.default.resolve(process.cwd(), options.output) : void 0,
    quiet: options.quiet ? options.quiet : void 0,
    repeatEach: options.repeatEach ? parseInt(options.repeatEach, 10) : void 0,
    retries: options.retries ? parseInt(options.retries, 10) : void 0,
    reporter: resolveReporterOption(options.reporter),
    shard: resolveShardOption(options.shard),
    shardWeights: resolveShardWeightsOption(),
    timeout: options.timeout ? parseInt(options.timeout, 10) : void 0,
    tsconfig: options.tsconfig ? import_path.default.resolve(process.cwd(), options.tsconfig) : void 0,
    ignoreSnapshots: options.ignoreSnapshots ? !!options.ignoreSnapshots : void 0,
    updateSnapshots: options.updateSnapshots,
    updateSourceMethod: options.updateSourceMethod,
    runAgents: options.runAgents,
    workers: options.workers,
    pause: process.env.PWPAUSE ? true : void 0
  };
  if (options.browser) {
    const browserOpt = options.browser.toLowerCase();
    if (!["all", "chromium", "firefox", "webkit"].includes(browserOpt))
      throw new Error(`Unsupported browser "${options.browser}", must be one of "all", "chromium", "firefox" or "webkit"`);
    const browserNames = browserOpt === "all" ? ["chromium", "firefox", "webkit"] : [browserOpt];
    overrides.projects = browserNames.map((browserName) => {
      return {
        name: browserName,
        use: { browserName }
      };
    });
  }
  if (options.headed || options.debug || overrides.pause)
    overrides.use = { headless: false };
  if (!options.ui && options.debug) {
    overrides.debug = true;
    process.env.PWDEBUG = "1";
  }
  if (!options.ui && options.trace) {
    overrides.use = overrides.use || {};
    overrides.use.trace = options.trace;
  }
  if (overrides.tsconfig && !import_fs.default.existsSync(overrides.tsconfig))
    throw new Error(`--tsconfig "${options.tsconfig}" does not exist`);
  return overrides;
}
function resolveReporterOption(reporter) {
  if (!reporter || !reporter.length)
    return void 0;
  return reporter.split(",").map((r) => [resolveReporter(r)]);
}
function resolveShardOption(shard) {
  if (!shard)
    return void 0;
  const shardPair = shard.split("/");
  if (shardPair.length !== 2) {
    throw new Error(
      `--shard "${shard}", expected format is "current/all", 1-based, for example "3/5".`
    );
  }
  const current = parseInt(shardPair[0], 10);
  const total = parseInt(shardPair[1], 10);
  if (isNaN(total) || total < 1)
    throw new Error(`--shard "${shard}" total must be a positive number`);
  if (isNaN(current) || current < 1 || current > total) {
    throw new Error(
      `--shard "${shard}" current must be a positive number, not greater than shard total`
    );
  }
  return { current, total };
}
function resolveShardWeightsOption() {
  const shardWeights = process.env.PWTEST_SHARD_WEIGHTS;
  if (!shardWeights)
    return void 0;
  return shardWeights.split(":").map((w) => {
    const weight = parseInt(w, 10);
    if (isNaN(weight) || weight < 0)
      throw new Error(`PWTEST_SHARD_WEIGHTS="${shardWeights}" weights must be non-negative numbers`);
    return weight;
  });
}
function resolveReporter(id) {
  if (import_config.builtInReporters.includes(id))
    return id;
  const localPath = import_path.default.resolve(process.cwd(), id);
  if (import_fs.default.existsSync(localPath))
    return localPath;
  return require.resolve(id, { paths: [process.cwd()] });
}
const kTraceModes = ["on", "off", "on-first-retry", "on-all-retries", "retain-on-failure", "retain-on-first-failure"];
const testOptions = [
  /* deprecated */
  ["--browser <browser>", { description: `Browser to use for tests, one of "all", "chromium", "firefox" or "webkit" (default: "chromium")` }],
  ["-c, --config <file>", { description: `Configuration file, or a test directory with optional "playwright.config.{m,c}?{js,ts}"` }],
  ["--debug", { description: `Run tests with Playwright Inspector. Shortcut for "PWDEBUG=1" environment variable and "--timeout=0 --max-failures=1 --headed --workers=1" options` }],
  ["--fail-on-flaky-tests", { description: `Fail if any test is flagged as flaky (default: false)` }],
  ["--forbid-only", { description: `Fail if test.only is called (default: false)` }],
  ["--fully-parallel", { description: `Run all tests in parallel (default: false)` }],
  ["--global-timeout <timeout>", { description: `Maximum time this test suite can run in milliseconds (default: unlimited)` }],
  ["-g, --grep <grep>", { description: `Only run tests matching this regular expression (default: ".*")` }],
  ["--grep-invert <grep>", { description: `Only run tests that do not match this regular expression` }],
  ["--headed", { description: `Run tests in headed browsers (default: headless)` }],
  ["--ignore-snapshots", { description: `Ignore screenshot and snapshot expectations` }],
  ["--last-failed", { description: `Only re-run the failures` }],
  ["--list", { description: `Collect all the tests and report them, but do not run` }],
  ["--max-failures <N>", { description: `Stop after the first N failures` }],
  ["--no-deps", { description: `Do not run project dependencies` }],
  ["--output <dir>", { description: `Folder for output artifacts (default: "test-results")` }],
  ["--only-changed [ref]", { description: `Only run test files that have been changed between 'HEAD' and 'ref'. Defaults to running all uncommitted changes. Only supports Git.` }],
  ["--pass-with-no-tests", { description: `Makes test run succeed even if no tests were found` }],
  ["--project <project-name...>", { description: `Only run tests from the specified list of projects, supports '*' wildcard (default: run all projects)` }],
  ["--quiet", { description: `Suppress stdio` }],
  ["--repeat-each <N>", { description: `Run each test N times (default: 1)` }],
  ["--reporter <reporter>", { description: `Reporter to use, comma-separated, can be ${import_config.builtInReporters.map((name) => `"${name}"`).join(", ")} (default: "${import_config.defaultReporter}")` }],
  ["--retries <retries>", { description: `Maximum retry count for flaky tests, zero for no retries (default: no retries)` }],
  ["--shard <shard>", { description: `Shard tests and execute only the selected shard, specify in the form "current/all", 1-based, for example "3/5"` }],
  ["--test-list <file>", { description: `Path to a file containing a list of tests to run. See https://playwright.dev/docs/test-cli for more details.` }],
  ["--test-list-invert <file>", { description: `Path to a file containing a list of tests to skip. See https://playwright.dev/docs/test-cli for more details.` }],
  ["--timeout <timeout>", { description: `Specify test timeout threshold in milliseconds, zero for unlimited (default: ${import_config.defaultTimeout})` }],
  ["--trace <mode>", { description: `Force tracing mode`, choices: kTraceModes }],
  ["--tsconfig <path>", { description: `Path to a single tsconfig applicable to all imported files (default: look up tsconfig for each imported file separately)` }],
  ["--ui", { description: `Run tests in interactive UI mode` }],
  ["--ui-host <host>", { description: `Host to serve UI on; specifying this option opens UI in a browser tab` }],
  ["--ui-port <port>", { description: `Port to serve UI on, 0 for any free port; specifying this option opens UI in a browser tab` }],
  ["-u, --update-snapshots [mode]", { description: `Update snapshots with actual results. Running tests without the flag defaults to "missing"`, choices: ["all", "changed", "missing", "none"], preset: "changed" }],
  ["--update-source-method <method>", { description: `Chooses the way source is updated (default: "patch")`, choices: ["overwrite", "3way", "patch"] }],
  ["-j, --workers <workers>", { description: `Number of concurrent workers or percentage of logical CPU cores, use 1 to run in a single worker (default: 50%)` }],
  ["-x", { description: `Stop after the first failure` }]
];
addTestCommand(import_program.program);
addShowReportCommand(import_program.program);
addMergeReportsCommand(import_program.program);
addClearCacheCommand(import_program.program);
addBrowserMCPServerCommand(import_program.program);
addTestMCPServerCommand(import_program.program);
addDevServerCommand(import_program.program);
addTestServerCommand(import_program.program);
addInitAgentsCommand(import_program.program);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  program
});
