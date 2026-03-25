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
var html_exports = {};
__export(html_exports, {
  default: () => html_default,
  showHTMLReport: () => showHTMLReport,
  startHtmlReportServer: () => startHtmlReportServer
});
module.exports = __toCommonJS(html_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_stream = require("stream");
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_utilsBundle2 = require("playwright-core/lib/utilsBundle");
var import_zipBundle = require("playwright-core/lib/zipBundle");
var import_base = require("./base");
var import_babelBundle = require("../transform/babelBundle");
var import_util = require("../util");
const htmlReportOptions = ["always", "never", "on-failure"];
const isHtmlReportOption = (type) => {
  return htmlReportOptions.includes(type);
};
class HtmlReporter {
  constructor(options) {
    this._topLevelErrors = [];
    this._machines = [];
    this._options = options;
  }
  version() {
    return "v2";
  }
  printsToStdio() {
    return false;
  }
  onConfigure(config) {
    this.config = config;
  }
  onBegin(suite) {
    const { outputFolder, open: open2, attachmentsBaseURL, host, port } = this._resolveOptions();
    this._outputFolder = outputFolder;
    this._open = open2;
    this._host = host;
    this._port = port;
    this._attachmentsBaseURL = attachmentsBaseURL;
    const reportedWarnings = /* @__PURE__ */ new Set();
    for (const project of this.config.projects) {
      if (this._isSubdirectory(outputFolder, project.outputDir) || this._isSubdirectory(project.outputDir, outputFolder)) {
        const key = outputFolder + "|" + project.outputDir;
        if (reportedWarnings.has(key))
          continue;
        reportedWarnings.add(key);
        writeLine(import_utils2.colors.red(`Configuration Error: HTML reporter output folder clashes with the tests output folder:`));
        writeLine(`
    html reporter folder: ${import_utils2.colors.bold(outputFolder)}
    test results folder: ${import_utils2.colors.bold(project.outputDir)}`);
        writeLine("");
        writeLine(`HTML reporter will clear its output directory prior to being generated, which will lead to the artifact loss.
`);
      }
    }
    this.suite = suite;
  }
  _resolveOptions() {
    const outputFolder = reportFolderFromEnv() ?? (0, import_util.resolveReporterOutputPath)("playwright-report", this._options.configDir, this._options.outputFolder);
    return {
      outputFolder,
      open: getHtmlReportOptionProcessEnv() || this._options.open || "on-failure",
      attachmentsBaseURL: process.env.PLAYWRIGHT_HTML_ATTACHMENTS_BASE_URL || this._options.attachmentsBaseURL || "data/",
      host: process.env.PLAYWRIGHT_HTML_HOST || this._options.host,
      port: process.env.PLAYWRIGHT_HTML_PORT ? +process.env.PLAYWRIGHT_HTML_PORT : this._options.port
    };
  }
  _isSubdirectory(parentDir, dir) {
    const relativePath = import_path.default.relative(parentDir, dir);
    return !!relativePath && !relativePath.startsWith("..") && !import_path.default.isAbsolute(relativePath);
  }
  onError(error) {
    this._topLevelErrors.push(error);
  }
  onMachineEnd(result) {
    this._machines.push(result);
  }
  async onEnd(result) {
    const projectSuites = this.suite.suites;
    await (0, import_utils.removeFolders)([this._outputFolder]);
    let noSnippets;
    if (process.env.PLAYWRIGHT_HTML_NO_SNIPPETS === "false" || process.env.PLAYWRIGHT_HTML_NO_SNIPPETS === "0")
      noSnippets = false;
    else if (process.env.PLAYWRIGHT_HTML_NO_SNIPPETS)
      noSnippets = true;
    noSnippets = noSnippets || this._options.noSnippets;
    let noCopyPrompt;
    if (process.env.PLAYWRIGHT_HTML_NO_COPY_PROMPT === "false" || process.env.PLAYWRIGHT_HTML_NO_COPY_PROMPT === "0")
      noCopyPrompt = false;
    else if (process.env.PLAYWRIGHT_HTML_NO_COPY_PROMPT)
      noCopyPrompt = true;
    noCopyPrompt = noCopyPrompt || this._options.noCopyPrompt;
    const builder = new HtmlBuilder(this.config, this._outputFolder, this._attachmentsBaseURL, {
      title: process.env.PLAYWRIGHT_HTML_TITLE || this._options.title,
      noSnippets,
      noCopyPrompt
    });
    this._buildResult = await builder.build(this.config.metadata, projectSuites, result, this._topLevelErrors, this._machines);
  }
  async onExit() {
    if (process.env.CI || !this._buildResult)
      return;
    const { ok, singleTestId } = this._buildResult;
    const shouldOpen = !!process.stdin.isTTY && (this._open === "always" || !ok && this._open === "on-failure");
    if (shouldOpen) {
      await showHTMLReport(this._outputFolder, this._host, this._port, singleTestId);
    } else if (this._options._mode === "test" && !!process.stdin.isTTY) {
      const packageManagerCommand = (0, import_utils.getPackageManagerExecCommand)();
      const relativeReportPath = this._outputFolder === standaloneDefaultFolder() ? "" : " " + import_path.default.relative(process.cwd(), this._outputFolder);
      const hostArg = this._host ? ` --host ${this._host}` : "";
      const portArg = this._port ? ` --port ${this._port}` : "";
      writeLine("");
      writeLine("To open last HTML report run:");
      writeLine(import_utils2.colors.cyan(`
  ${packageManagerCommand} playwright show-report${relativeReportPath}${hostArg}${portArg}
`));
    }
  }
}
function reportFolderFromEnv() {
  const envValue = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR || process.env.PLAYWRIGHT_HTML_REPORT;
  return envValue ? import_path.default.resolve(envValue) : void 0;
}
function getHtmlReportOptionProcessEnv() {
  const htmlOpenEnv = process.env.PLAYWRIGHT_HTML_OPEN || process.env.PW_TEST_HTML_REPORT_OPEN;
  if (!htmlOpenEnv)
    return void 0;
  if (!isHtmlReportOption(htmlOpenEnv)) {
    writeLine(import_utils2.colors.red(`Configuration Error: HTML reporter Invalid value for PLAYWRIGHT_HTML_OPEN: ${htmlOpenEnv}. Valid values are: ${htmlReportOptions.join(", ")}`));
    return void 0;
  }
  return htmlOpenEnv;
}
function standaloneDefaultFolder() {
  return reportFolderFromEnv() ?? (0, import_util.resolveReporterOutputPath)("playwright-report", process.cwd(), void 0);
}
async function showHTMLReport(reportFolder, host = "localhost", port, testId) {
  const folder = reportFolder ?? standaloneDefaultFolder();
  try {
    (0, import_utils.assert)(import_fs.default.statSync(folder).isDirectory());
  } catch (e) {
    writeLine(import_utils2.colors.red(`No report found at "${folder}"`));
    (0, import_utils.gracefullyProcessExitDoNotHang)(1);
    return;
  }
  const server = startHtmlReportServer(folder);
  await server.start({ port, host, preferredPort: port ? void 0 : 9323 });
  let url = server.urlPrefix("human-readable");
  writeLine("");
  writeLine(import_utils2.colors.cyan(`  Serving HTML report at ${url}. Press Ctrl+C to quit.`));
  if (testId)
    url += `#?testId=${testId}`;
  url = url.replace("0.0.0.0", "localhost");
  await (0, import_utilsBundle.open)(url, { wait: true }).catch(() => {
  });
  await new Promise(() => {
  });
}
function startHtmlReportServer(folder) {
  const server = new import_utils.HttpServer();
  server.routePrefix("/", (request, response) => {
    let relativePath = new URL("http://localhost" + request.url).pathname;
    if (relativePath.startsWith("/trace/file")) {
      const url = new URL("http://localhost" + request.url);
      try {
        return server.serveFile(request, response, url.searchParams.get("path"));
      } catch (e) {
        return false;
      }
    }
    if (relativePath === "/")
      relativePath = "/index.html";
    const absolutePath = import_path.default.join(folder, ...relativePath.split("/"));
    return server.serveFile(request, response, absolutePath);
  });
  return server;
}
class HtmlBuilder {
  constructor(config, outputDir, attachmentsBaseURL, options) {
    this._stepsInFile = new import_utils.MultiMap();
    this._hasTraces = false;
    this._config = config;
    this._reportFolder = outputDir;
    this._options = options;
    import_fs.default.mkdirSync(this._reportFolder, { recursive: true });
    this._dataZipFile = new import_zipBundle.yazl.ZipFile();
    this._attachmentsBaseURL = attachmentsBaseURL;
  }
  async build(metadata, projectSuites, result, topLevelErrors, machines) {
    const data = /* @__PURE__ */ new Map();
    for (const projectSuite of projectSuites) {
      const projectName = projectSuite.project().name;
      for (const fileSuite of projectSuite.suites) {
        const fileName = this._relativeLocation(fileSuite.location).file;
        this._createEntryForSuite(data, projectName, fileSuite, fileName, true);
      }
    }
    if (!this._options.noSnippets)
      createSnippets(this._stepsInFile);
    let ok = true;
    for (const [fileId, { testFile, testFileSummary }] of data) {
      const stats = testFileSummary.stats;
      for (const test of testFileSummary.tests) {
        if (test.outcome === "expected")
          ++stats.expected;
        if (test.outcome === "skipped")
          ++stats.skipped;
        if (test.outcome === "unexpected")
          ++stats.unexpected;
        if (test.outcome === "flaky")
          ++stats.flaky;
        ++stats.total;
      }
      stats.ok = stats.unexpected + stats.flaky === 0;
      if (!stats.ok)
        ok = false;
      const testCaseSummaryComparator = (t1, t2) => {
        const w1 = (t1.outcome === "unexpected" ? 1e3 : 0) + (t1.outcome === "flaky" ? 1 : 0);
        const w2 = (t2.outcome === "unexpected" ? 1e3 : 0) + (t2.outcome === "flaky" ? 1 : 0);
        return w2 - w1;
      };
      testFileSummary.tests.sort(testCaseSummaryComparator);
      this._addDataFile(fileId + ".json", testFile);
    }
    const htmlReport = {
      metadata,
      startTime: result.startTime.getTime(),
      duration: result.duration,
      files: [...data.values()].map((e) => e.testFileSummary),
      projectNames: projectSuites.map((r) => r.project().name),
      stats: { ...[...data.values()].reduce((a, e) => addStats(a, e.testFileSummary.stats), emptyStats()) },
      errors: topLevelErrors.map((error) => (0, import_base.formatError)(import_base.internalScreen, error).message),
      options: this._options,
      machines: machines.map((s) => ({
        duration: s.duration,
        startTime: s.startTime.getTime(),
        tag: s.tag,
        shardIndex: s.shardIndex
      }))
    };
    htmlReport.files.sort((f1, f2) => {
      const w1 = f1.stats.unexpected * 1e3 + f1.stats.flaky;
      const w2 = f2.stats.unexpected * 1e3 + f2.stats.flaky;
      return w2 - w1;
    });
    this._addDataFile("report.json", htmlReport);
    let singleTestId;
    if (htmlReport.stats.total === 1) {
      const testFile = data.values().next().value.testFile;
      singleTestId = testFile.tests[0].testId;
    }
    const appFolder = import_path.default.join(require.resolve("playwright-core"), "..", "lib", "vite", "htmlReport");
    await (0, import_utils.copyFileAndMakeWritable)(import_path.default.join(appFolder, "index.html"), import_path.default.join(this._reportFolder, "index.html"));
    if (this._hasTraces) {
      const traceViewerFolder = import_path.default.join(require.resolve("playwright-core"), "..", "lib", "vite", "traceViewer");
      const traceViewerTargetFolder = import_path.default.join(this._reportFolder, "trace");
      const traceViewerAssetsTargetFolder = import_path.default.join(traceViewerTargetFolder, "assets");
      import_fs.default.mkdirSync(traceViewerAssetsTargetFolder, { recursive: true });
      for (const file of import_fs.default.readdirSync(traceViewerFolder)) {
        if (file.endsWith(".map") || file.includes("watch") || file.includes("assets"))
          continue;
        await (0, import_utils.copyFileAndMakeWritable)(import_path.default.join(traceViewerFolder, file), import_path.default.join(traceViewerTargetFolder, file));
      }
      for (const file of import_fs.default.readdirSync(import_path.default.join(traceViewerFolder, "assets"))) {
        if (file.endsWith(".map") || file.includes("xtermModule"))
          continue;
        await (0, import_utils.copyFileAndMakeWritable)(import_path.default.join(traceViewerFolder, "assets", file), import_path.default.join(traceViewerAssetsTargetFolder, file));
      }
    }
    await this._writeReportData(import_path.default.join(this._reportFolder, "index.html"));
    return { ok, singleTestId };
  }
  async _writeReportData(filePath) {
    import_fs.default.appendFileSync(filePath, '<script id="playwrightReportBase64" type="application/zip">data:application/zip;base64,');
    await new Promise((f) => {
      this._dataZipFile.end(void 0, () => {
        this._dataZipFile.outputStream.pipe(new Base64Encoder()).pipe(import_fs.default.createWriteStream(filePath, { flags: "a" })).on("close", f);
      });
    });
    import_fs.default.appendFileSync(filePath, "</script>");
  }
  _addDataFile(fileName, data) {
    this._dataZipFile.addBuffer(Buffer.from(JSON.stringify(data)), fileName);
  }
  _createEntryForSuite(data, projectName, suite, fileName, deep) {
    const fileId = (0, import_utils.calculateSha1)(fileName).slice(0, 20);
    let fileEntry = data.get(fileId);
    if (!fileEntry) {
      fileEntry = {
        testFile: { fileId, fileName, tests: [] },
        testFileSummary: { fileId, fileName, tests: [], stats: emptyStats() }
      };
      data.set(fileId, fileEntry);
    }
    const { testFile, testFileSummary } = fileEntry;
    const testEntries = [];
    this._processSuite(suite, projectName, [], deep, testEntries);
    for (const test of testEntries) {
      testFile.tests.push(test.testCase);
      testFileSummary.tests.push(test.testCaseSummary);
    }
  }
  _processSuite(suite, projectName, path2, deep, outTests) {
    const newPath = [...path2, suite.title];
    suite.entries().forEach((e) => {
      if (e.type === "test")
        outTests.push(this._createTestEntry(e, projectName, newPath));
      else if (deep)
        this._processSuite(e, projectName, newPath, deep, outTests);
    });
  }
  _createTestEntry(test, projectName, path2) {
    const duration = test.results.reduce((a, r) => a + r.duration, 0);
    const location = this._relativeLocation(test.location);
    path2 = path2.slice(1).filter((path3) => path3.length > 0);
    const results = test.results.map((r) => this._createTestResult(test, r));
    return {
      testCase: {
        testId: test.id,
        title: test.title,
        projectName,
        location,
        duration,
        annotations: this._serializeAnnotations(test.annotations),
        tags: test.tags,
        outcome: test.outcome(),
        path: path2,
        results,
        ok: test.outcome() === "expected" || test.outcome() === "flaky"
      },
      testCaseSummary: {
        testId: test.id,
        title: test.title,
        projectName,
        location,
        duration,
        annotations: this._serializeAnnotations(test.annotations),
        tags: test.tags,
        outcome: test.outcome(),
        path: path2,
        ok: test.outcome() === "expected" || test.outcome() === "flaky",
        results: results.map((result) => {
          return { attachments: result.attachments.map((a) => ({ name: a.name, contentType: a.contentType, path: a.path })) };
        })
      }
    };
  }
  _serializeAttachments(attachments) {
    let lastAttachment;
    return attachments.map((a) => {
      if (a.name === "trace")
        this._hasTraces = true;
      if ((a.name === "stdout" || a.name === "stderr") && a.contentType === "text/plain") {
        if (lastAttachment && lastAttachment.name === a.name && lastAttachment.contentType === a.contentType) {
          lastAttachment.body += (0, import_util.stripAnsiEscapes)(a.body);
          return null;
        }
        a.body = (0, import_util.stripAnsiEscapes)(a.body);
        lastAttachment = a;
        return a;
      }
      if (a.path) {
        let fileName = a.path;
        try {
          const buffer = import_fs.default.readFileSync(a.path);
          const sha1 = (0, import_utils.calculateSha1)(buffer) + import_path.default.extname(a.path);
          fileName = this._attachmentsBaseURL + sha1;
          import_fs.default.mkdirSync(import_path.default.join(this._reportFolder, "data"), { recursive: true });
          import_fs.default.writeFileSync(import_path.default.join(this._reportFolder, "data", sha1), buffer);
        } catch (e) {
        }
        return {
          name: a.name,
          contentType: a.contentType,
          path: fileName,
          body: a.body
        };
      }
      if (a.body instanceof Buffer) {
        if (isTextContentType(a.contentType)) {
          const charset = a.contentType.match(/charset=(.*)/)?.[1];
          try {
            const body = a.body.toString(charset || "utf-8");
            return {
              name: a.name,
              contentType: a.contentType,
              body
            };
          } catch (e) {
          }
        }
        import_fs.default.mkdirSync(import_path.default.join(this._reportFolder, "data"), { recursive: true });
        const extension = (0, import_utils.sanitizeForFilePath)(import_path.default.extname(a.name).replace(/^\./, "")) || import_utilsBundle2.mime.getExtension(a.contentType) || "dat";
        const sha1 = (0, import_utils.calculateSha1)(a.body) + "." + extension;
        import_fs.default.writeFileSync(import_path.default.join(this._reportFolder, "data", sha1), a.body);
        return {
          name: a.name,
          contentType: a.contentType,
          path: this._attachmentsBaseURL + sha1
        };
      }
      return {
        name: a.name,
        contentType: a.contentType,
        body: a.body
      };
    }).filter(Boolean);
  }
  _serializeAnnotations(annotations) {
    return annotations.map((a) => ({
      type: a.type,
      description: a.description === void 0 ? void 0 : String(a.description),
      location: a.location ? {
        file: a.location.file,
        line: a.location.line,
        column: a.location.column
      } : void 0
    }));
  }
  _createTestResult(test, result) {
    return {
      duration: result.duration,
      startTime: result.startTime.toISOString(),
      retry: result.retry,
      steps: dedupeSteps(result.steps).map((s) => this._createTestStep(s, result)),
      errors: (0, import_base.formatResultFailure)(import_base.internalScreen, test, result, "").map((error) => {
        return {
          message: error.message,
          codeframe: error.location ? createErrorCodeframe(error.message, error.location) : void 0
        };
      }),
      status: result.status,
      annotations: this._serializeAnnotations(result.annotations),
      attachments: this._serializeAttachments([
        ...result.attachments,
        ...result.stdout.map((m) => stdioAttachment(m, "stdout")),
        ...result.stderr.map((m) => stdioAttachment(m, "stderr"))
      ])
    };
  }
  _createTestStep(dedupedStep, result) {
    const { step, duration, count } = dedupedStep;
    const skipped = dedupedStep.step.annotations?.find((a) => a.type === "skip");
    let title = step.title;
    if (skipped)
      title = `${title} (skipped${skipped.description ? ": " + skipped.description : ""})`;
    const testStep = {
      title,
      startTime: step.startTime.toISOString(),
      duration,
      steps: dedupeSteps(step.steps).map((s) => this._createTestStep(s, result)),
      attachments: step.attachments.map((s) => {
        const index = result.attachments.indexOf(s);
        if (index === -1)
          throw new Error("Unexpected, attachment not found");
        return index;
      }),
      location: this._relativeLocation(step.location),
      error: step.error?.message,
      count,
      skipped: !!skipped
    };
    if (step.location)
      this._stepsInFile.set(step.location.file, testStep);
    return testStep;
  }
  _relativeLocation(location) {
    if (!location)
      return void 0;
    const file = (0, import_utils.toPosixPath)(import_path.default.relative(this._config.rootDir, location.file));
    return {
      file,
      line: location.line,
      column: location.column
    };
  }
}
const emptyStats = () => {
  return {
    total: 0,
    expected: 0,
    unexpected: 0,
    flaky: 0,
    skipped: 0,
    ok: true
  };
};
const addStats = (stats, delta) => {
  stats.total += delta.total;
  stats.skipped += delta.skipped;
  stats.expected += delta.expected;
  stats.unexpected += delta.unexpected;
  stats.flaky += delta.flaky;
  stats.ok = stats.ok && delta.ok;
  return stats;
};
class Base64Encoder extends import_stream.Transform {
  _transform(chunk, encoding, callback) {
    if (this._remainder) {
      chunk = Buffer.concat([this._remainder, chunk]);
      this._remainder = void 0;
    }
    const remaining = chunk.length % 3;
    if (remaining) {
      this._remainder = chunk.slice(chunk.length - remaining);
      chunk = chunk.slice(0, chunk.length - remaining);
    }
    chunk = chunk.toString("base64");
    this.push(Buffer.from(chunk));
    callback();
  }
  _flush(callback) {
    if (this._remainder)
      this.push(Buffer.from(this._remainder.toString("base64")));
    callback();
  }
}
function isTextContentType(contentType) {
  return contentType.startsWith("text/") || contentType.startsWith("application/json");
}
function stdioAttachment(chunk, type) {
  return {
    name: type,
    contentType: "text/plain",
    body: typeof chunk === "string" ? chunk : chunk.toString("utf-8")
  };
}
function dedupeSteps(steps) {
  const result = [];
  let lastResult = void 0;
  for (const step of steps) {
    const canDedupe = !step.error && step.duration >= 0 && step.location?.file && !step.steps.length;
    const lastStep = lastResult?.step;
    if (canDedupe && lastResult && lastStep && step.category === lastStep.category && step.title === lastStep.title && step.location?.file === lastStep.location?.file && step.location?.line === lastStep.location?.line && step.location?.column === lastStep.location?.column) {
      ++lastResult.count;
      lastResult.duration += step.duration;
      continue;
    }
    lastResult = { step, count: 1, duration: step.duration };
    result.push(lastResult);
    if (!canDedupe)
      lastResult = void 0;
  }
  return result;
}
function createSnippets(stepsInFile) {
  for (const file of stepsInFile.keys()) {
    let source;
    try {
      source = import_fs.default.readFileSync(file, "utf-8") + "\n//";
    } catch (e) {
      continue;
    }
    const lines = source.split("\n").length;
    const highlighted = (0, import_babelBundle.codeFrameColumns)(source, { start: { line: lines, column: 1 } }, { highlightCode: true, linesAbove: lines, linesBelow: 0 });
    const highlightedLines = highlighted.split("\n");
    const lineWithArrow = highlightedLines[highlightedLines.length - 1];
    for (const step of stepsInFile.get(file)) {
      if (step.location.line < 2 || step.location.line >= lines)
        continue;
      const snippetLines = highlightedLines.slice(step.location.line - 2, step.location.line + 1);
      const index = lineWithArrow.indexOf("^");
      const shiftedArrow = lineWithArrow.slice(0, index) + " ".repeat(step.location.column - 1) + lineWithArrow.slice(index);
      snippetLines.splice(2, 0, shiftedArrow);
      step.snippet = snippetLines.join("\n");
    }
  }
}
function createErrorCodeframe(message, location) {
  let source;
  try {
    source = import_fs.default.readFileSync(location.file, "utf-8") + "\n//";
  } catch (e) {
    return;
  }
  return (0, import_babelBundle.codeFrameColumns)(
    source,
    {
      start: {
        line: location.line,
        column: location.column
      }
    },
    {
      highlightCode: false,
      linesAbove: 100,
      linesBelow: 100,
      message: (0, import_util.stripAnsiEscapes)(message).split("\n")[0] || void 0
    }
  );
}
function writeLine(line) {
  process.stdout.write(line + "\n");
}
var html_default = HtmlReporter;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  showHTMLReport,
  startHtmlReportServer
});
