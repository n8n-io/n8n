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
var toMatchSnapshot_exports = {};
__export(toMatchSnapshot_exports, {
  toHaveScreenshot: () => toHaveScreenshot,
  toHaveScreenshotStepTitle: () => toHaveScreenshotStepTitle,
  toMatchSnapshot: () => toMatchSnapshot
});
module.exports = __toCommonJS(toMatchSnapshot_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_util = require("../util");
var import_globals = require("../common/globals");
const NonConfigProperties = [
  "clip",
  "fullPage",
  "mask",
  "maskColor",
  "omitBackground",
  "timeout"
];
class SnapshotHelper {
  constructor(state, testInfo, matcherName, locator, anonymousSnapshotExtension, configOptions, nameOrOptions, optOptions) {
    let name;
    if (Array.isArray(nameOrOptions) || typeof nameOrOptions === "string") {
      name = nameOrOptions;
      this.options = { ...optOptions };
    } else {
      const { name: nameFromOptions, ...options } = nameOrOptions;
      this.options = options;
      name = nameFromOptions;
    }
    this.name = Array.isArray(name) ? name.join(import_path.default.sep) : name || "";
    const resolvedPaths = testInfo._resolveSnapshotPaths(matcherName === "toHaveScreenshot" ? "screenshot" : "snapshot", name, "updateSnapshotIndex", anonymousSnapshotExtension);
    this.expectedPath = resolvedPaths.absoluteSnapshotPath;
    this.attachmentBaseName = resolvedPaths.relativeOutputPath;
    const outputBasePath = testInfo._getOutputPath(resolvedPaths.relativeOutputPath);
    this.legacyExpectedPath = (0, import_util.addSuffixToFilePath)(outputBasePath, "-expected");
    this.previousPath = (0, import_util.addSuffixToFilePath)(outputBasePath, "-previous");
    this.actualPath = (0, import_util.addSuffixToFilePath)(outputBasePath, "-actual");
    this.diffPath = (0, import_util.addSuffixToFilePath)(outputBasePath, "-diff");
    const filteredConfigOptions = { ...configOptions };
    for (const prop of NonConfigProperties)
      delete filteredConfigOptions[prop];
    this.options = {
      ...filteredConfigOptions,
      ...this.options
    };
    if (this.options._comparator) {
      this.options.comparator = this.options._comparator;
      delete this.options._comparator;
    }
    if (this.options.maxDiffPixels !== void 0 && this.options.maxDiffPixels < 0)
      throw new Error("`maxDiffPixels` option value must be non-negative integer");
    if (this.options.maxDiffPixelRatio !== void 0 && (this.options.maxDiffPixelRatio < 0 || this.options.maxDiffPixelRatio > 1))
      throw new Error("`maxDiffPixelRatio` option value must be between 0 and 1");
    this.matcherName = matcherName;
    this.locator = locator;
    this.updateSnapshots = testInfo.config.updateSnapshots;
    this.mimeType = import_utilsBundle.mime.getType(import_path.default.basename(this.expectedPath)) ?? "application/octet-stream";
    this.comparator = (0, import_utils.getComparator)(this.mimeType);
    this.testInfo = testInfo;
    this.state = state;
    this.kind = this.mimeType.startsWith("image/") ? "Screenshot" : "Snapshot";
  }
  createMatcherResult(message, pass, log) {
    const unfiltered = {
      name: this.matcherName,
      expected: this.expectedPath,
      actual: this.actualPath,
      diff: this.diffPath,
      pass,
      message: () => message,
      log
    };
    return Object.fromEntries(Object.entries(unfiltered).filter(([_, v]) => v !== void 0));
  }
  handleMissingNegated() {
    const isWriteMissingMode = this.updateSnapshots !== "none";
    const message = `A snapshot doesn't exist at ${this.expectedPath}${isWriteMissingMode ? `, matchers using ".not" won't write them automatically.` : "."}`;
    return this.createMatcherResult(message, true);
  }
  handleDifferentNegated() {
    return this.createMatcherResult("", false);
  }
  handleMatchingNegated() {
    const message = [
      import_utils2.colors.red(`${this.kind} comparison failed:`),
      "",
      indent("Expected result should be different from the actual one.", "  ")
    ].join("\n");
    return this.createMatcherResult(message, true);
  }
  handleMissing(actual, step) {
    const isWriteMissingMode = this.updateSnapshots !== "none";
    if (isWriteMissingMode)
      writeFileSync(this.expectedPath, actual);
    step?._attachToStep({ name: (0, import_util.addSuffixToFilePath)(this.attachmentBaseName, "-expected"), contentType: this.mimeType, path: this.expectedPath });
    writeFileSync(this.actualPath, actual);
    step?._attachToStep({ name: (0, import_util.addSuffixToFilePath)(this.attachmentBaseName, "-actual"), contentType: this.mimeType, path: this.actualPath });
    const message = `A snapshot doesn't exist at ${this.expectedPath}${isWriteMissingMode ? ", writing actual." : "."}`;
    if (this.updateSnapshots === "all" || this.updateSnapshots === "changed") {
      console.log(message);
      return this.createMatcherResult(message, true);
    }
    if (this.updateSnapshots === "missing") {
      this.testInfo._hasNonRetriableError = true;
      this.testInfo._failWithError(new Error(message));
      return this.createMatcherResult("", true);
    }
    return this.createMatcherResult(message, false);
  }
  handleDifferent(actual, expected, previous, diff, header, diffError, log, step) {
    const output = [`${header}${indent(diffError, "  ")}`];
    if (this.name) {
      output.push("");
      output.push(`  Snapshot: ${this.name}`);
    }
    if (expected !== void 0) {
      writeFileSync(this.legacyExpectedPath, expected);
      step?._attachToStep({ name: (0, import_util.addSuffixToFilePath)(this.attachmentBaseName, "-expected"), contentType: this.mimeType, path: this.expectedPath });
    }
    if (previous !== void 0) {
      writeFileSync(this.previousPath, previous);
      step?._attachToStep({ name: (0, import_util.addSuffixToFilePath)(this.attachmentBaseName, "-previous"), contentType: this.mimeType, path: this.previousPath });
    }
    if (actual !== void 0) {
      writeFileSync(this.actualPath, actual);
      step?._attachToStep({ name: (0, import_util.addSuffixToFilePath)(this.attachmentBaseName, "-actual"), contentType: this.mimeType, path: this.actualPath });
    }
    if (diff !== void 0) {
      writeFileSync(this.diffPath, diff);
      step?._attachToStep({ name: (0, import_util.addSuffixToFilePath)(this.attachmentBaseName, "-diff"), contentType: this.mimeType, path: this.diffPath });
    }
    if (log?.length)
      output.push((0, import_utils.callLogText)(this.state.utils, log));
    else
      output.push("");
    return this.createMatcherResult(output.join("\n"), false, log);
  }
  handleMatching() {
    return this.createMatcherResult("", true);
  }
}
function toMatchSnapshot(received, nameOrOptions = {}, optOptions = {}) {
  const testInfo = (0, import_globals.currentTestInfo)();
  if (!testInfo)
    throw new Error(`toMatchSnapshot() must be called during the test`);
  if (received instanceof Promise)
    throw new Error("An unresolved Promise was passed to toMatchSnapshot(), make sure to resolve it by adding await to it.");
  if (testInfo._projectInternal.ignoreSnapshots)
    return { pass: !this.isNot, message: () => "", name: "toMatchSnapshot", expected: nameOrOptions };
  const configOptions = testInfo._projectInternal.expect?.toMatchSnapshot || {};
  const helper = new SnapshotHelper(
    this,
    testInfo,
    "toMatchSnapshot",
    void 0,
    "." + determineFileExtension(received),
    configOptions,
    nameOrOptions,
    optOptions
  );
  if (this.isNot) {
    if (!import_fs.default.existsSync(helper.expectedPath))
      return helper.handleMissingNegated();
    const isDifferent = !!helper.comparator(received, import_fs.default.readFileSync(helper.expectedPath), helper.options);
    return isDifferent ? helper.handleDifferentNegated() : helper.handleMatchingNegated();
  }
  if (!import_fs.default.existsSync(helper.expectedPath))
    return helper.handleMissing(received, this._stepInfo);
  const expected = import_fs.default.readFileSync(helper.expectedPath);
  if (helper.updateSnapshots === "all") {
    if (!(0, import_utils.compareBuffersOrStrings)(received, expected))
      return helper.handleMatching();
    writeFileSync(helper.expectedPath, received);
    console.log(helper.expectedPath + " is not the same, writing actual.");
    return helper.createMatcherResult(helper.expectedPath + " running with --update-snapshots, writing actual.", true);
  }
  if (helper.updateSnapshots === "changed") {
    const result2 = helper.comparator(received, expected, helper.options);
    if (!result2)
      return helper.handleMatching();
    writeFileSync(helper.expectedPath, received);
    console.log(helper.expectedPath + " does not match, writing actual.");
    return helper.createMatcherResult(helper.expectedPath + " running with --update-snapshots, writing actual.", true);
  }
  const result = helper.comparator(received, expected, helper.options);
  if (!result)
    return helper.handleMatching();
  const header = (0, import_utils.formatMatcherMessage)(this.utils, { promise: this.promise, isNot: this.isNot, matcherName: "toMatchSnapshot", receiver: (0, import_utils.isString)(received) ? "string" : "Buffer", expectation: "expected" });
  return helper.handleDifferent(received, expected, void 0, result.diff, header, result.errorMessage, void 0, this._stepInfo);
}
function toHaveScreenshotStepTitle(nameOrOptions = {}, optOptions = {}) {
  let name;
  if (typeof nameOrOptions === "object" && !Array.isArray(nameOrOptions))
    name = nameOrOptions.name;
  else
    name = nameOrOptions;
  return Array.isArray(name) ? name.join(import_path.default.sep) : name || "";
}
async function toHaveScreenshot(pageOrLocator, nameOrOptions = {}, optOptions = {}) {
  const testInfo = (0, import_globals.currentTestInfo)();
  if (!testInfo)
    throw new Error(`toHaveScreenshot() must be called during the test`);
  if (testInfo._projectInternal.ignoreSnapshots)
    return { pass: !this.isNot, message: () => "", name: "toHaveScreenshot", expected: nameOrOptions };
  (0, import_util.expectTypes)(pageOrLocator, ["Page", "Locator"], "toHaveScreenshot");
  const [page, locator] = pageOrLocator.constructor.name === "Page" ? [pageOrLocator, void 0] : [pageOrLocator.page(), pageOrLocator];
  const configOptions = testInfo._projectInternal.expect?.toHaveScreenshot || {};
  const helper = new SnapshotHelper(this, testInfo, "toHaveScreenshot", locator, void 0, configOptions, nameOrOptions, optOptions);
  if (!helper.expectedPath.toLowerCase().endsWith(".png"))
    throw new Error(`Screenshot name "${import_path.default.basename(helper.expectedPath)}" must have '.png' extension`);
  (0, import_util.expectTypes)(pageOrLocator, ["Page", "Locator"], "toHaveScreenshot");
  const style = await loadScreenshotStyles(helper.options.stylePath);
  const timeout = helper.options.timeout ?? this.timeout;
  const expectScreenshotOptions = {
    locator,
    animations: helper.options.animations ?? "disabled",
    caret: helper.options.caret ?? "hide",
    clip: helper.options.clip,
    fullPage: helper.options.fullPage,
    mask: helper.options.mask,
    maskColor: helper.options.maskColor,
    omitBackground: helper.options.omitBackground,
    scale: helper.options.scale ?? "css",
    style,
    isNot: !!this.isNot,
    timeout,
    comparator: helper.options.comparator,
    maxDiffPixels: helper.options.maxDiffPixels,
    maxDiffPixelRatio: helper.options.maxDiffPixelRatio,
    threshold: helper.options.threshold
  };
  const hasSnapshot = import_fs.default.existsSync(helper.expectedPath);
  if (this.isNot) {
    if (!hasSnapshot)
      return helper.handleMissingNegated();
    expectScreenshotOptions.expected = await import_fs.default.promises.readFile(helper.expectedPath);
    const isDifferent = !(await page._expectScreenshot(expectScreenshotOptions)).errorMessage;
    return isDifferent ? helper.handleDifferentNegated() : helper.handleMatchingNegated();
  }
  if (helper.updateSnapshots === "none" && !hasSnapshot)
    return helper.createMatcherResult(`A snapshot doesn't exist at ${helper.expectedPath}.`, false);
  if (!hasSnapshot) {
    const { actual: actual2, previous: previous2, diff: diff2, errorMessage: errorMessage2, log: log2, timedOut: timedOut2 } = await page._expectScreenshot(expectScreenshotOptions);
    if (errorMessage2) {
      const header2 = (0, import_utils.formatMatcherMessage)(this.utils, { promise: this.promise, isNot: this.isNot, matcherName: "toHaveScreenshot", locator: locator?.toString(), expectation: "expected", timeout, timedOut: timedOut2 });
      return helper.handleDifferent(actual2, void 0, previous2, diff2, header2, errorMessage2, log2, this._stepInfo);
    }
    return helper.handleMissing(actual2, this._stepInfo);
  }
  const expected = await import_fs.default.promises.readFile(helper.expectedPath);
  expectScreenshotOptions.expected = helper.updateSnapshots === "all" ? void 0 : expected;
  const { actual, previous, diff, errorMessage, log, timedOut } = await page._expectScreenshot(expectScreenshotOptions);
  const writeFiles = (actualBuffer) => {
    writeFileSync(helper.expectedPath, actualBuffer);
    writeFileSync(helper.actualPath, actualBuffer);
    console.log(helper.expectedPath + " is re-generated, writing actual.");
    return helper.createMatcherResult(helper.expectedPath + " running with --update-snapshots, writing actual.", true);
  };
  if (!errorMessage) {
    if (helper.updateSnapshots === "all" && actual && (0, import_utils.compareBuffersOrStrings)(actual, expected)) {
      console.log(helper.expectedPath + " is re-generated, writing actual.");
      return writeFiles(actual);
    }
    return helper.handleMatching();
  }
  if (helper.updateSnapshots === "changed" || helper.updateSnapshots === "all") {
    if (actual)
      return writeFiles(actual);
    let header2 = (0, import_utils.formatMatcherMessage)(this.utils, { promise: this.promise, isNot: this.isNot, matcherName: "toHaveScreenshot", locator: locator?.toString(), expectation: "expected", timeout, timedOut });
    header2 += "  Failed to re-generate expected.\n";
    return helper.handleDifferent(actual, expectScreenshotOptions.expected, previous, diff, header2, errorMessage, log, this._stepInfo);
  }
  const header = (0, import_utils.formatMatcherMessage)(this.utils, { promise: this.promise, isNot: this.isNot, matcherName: "toHaveScreenshot", locator: locator?.toString(), expectation: "expected", timeout, timedOut });
  return helper.handleDifferent(actual, expectScreenshotOptions.expected, previous, diff, header, errorMessage, log, this._stepInfo);
}
function writeFileSync(aPath, content) {
  import_fs.default.mkdirSync(import_path.default.dirname(aPath), { recursive: true });
  import_fs.default.writeFileSync(aPath, content);
}
function indent(lines, tab) {
  return lines.replace(/^(?=.+$)/gm, tab);
}
function determineFileExtension(file) {
  if (typeof file === "string")
    return "txt";
  if (compareMagicBytes(file, [137, 80, 78, 71, 13, 10, 26, 10]))
    return "png";
  if (compareMagicBytes(file, [255, 216, 255]))
    return "jpg";
  return "dat";
}
function compareMagicBytes(file, magicBytes) {
  return Buffer.compare(Buffer.from(magicBytes), file.slice(0, magicBytes.length)) === 0;
}
async function loadScreenshotStyles(stylePath) {
  if (!stylePath)
    return;
  const stylePaths = Array.isArray(stylePath) ? stylePath : [stylePath];
  const styles = await Promise.all(stylePaths.map(async (stylePath2) => {
    const text = await import_fs.default.promises.readFile(stylePath2, "utf8");
    return text.trim();
  }));
  return styles.join("\n").trim() || void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toHaveScreenshot,
  toHaveScreenshotStepTitle,
  toMatchSnapshot
});
