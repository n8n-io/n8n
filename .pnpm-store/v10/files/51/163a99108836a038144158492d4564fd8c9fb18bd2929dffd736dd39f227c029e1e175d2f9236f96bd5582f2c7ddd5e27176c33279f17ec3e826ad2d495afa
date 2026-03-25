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
var toMatchAriaSnapshot_exports = {};
__export(toMatchAriaSnapshot_exports, {
  toMatchAriaSnapshot: () => toMatchAriaSnapshot
});
module.exports = __toCommonJS(toMatchAriaSnapshot_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_util = require("../util");
var import_globals = require("../common/globals");
async function toMatchAriaSnapshot(locator, expectedParam, options = {}) {
  const matcherName = "toMatchAriaSnapshot";
  const testInfo = (0, import_globals.currentTestInfo)();
  if (!testInfo)
    throw new Error(`toMatchAriaSnapshot() must be called during the test`);
  if (testInfo._projectInternal.ignoreSnapshots)
    return { pass: !this.isNot, message: () => "", name: "toMatchAriaSnapshot", expected: "" };
  const updateSnapshots = testInfo.config.updateSnapshots;
  let expected;
  let timeout;
  let expectedPath;
  if ((0, import_utils.isString)(expectedParam)) {
    expected = expectedParam;
    timeout = options.timeout ?? this.timeout;
  } else {
    const legacyPath = testInfo._resolveSnapshotPaths("aria", expectedParam?.name, "dontUpdateSnapshotIndex", ".yml").absoluteSnapshotPath;
    expectedPath = testInfo._resolveSnapshotPaths("aria", expectedParam?.name, "updateSnapshotIndex").absoluteSnapshotPath;
    if (!await (0, import_util.fileExistsAsync)(expectedPath) && await (0, import_util.fileExistsAsync)(legacyPath))
      expectedPath = legacyPath;
    expected = await import_fs.default.promises.readFile(expectedPath, "utf8").catch(() => "");
    timeout = expectedParam?.timeout ?? this.timeout;
  }
  const generateMissingBaseline = updateSnapshots === "missing" && !expected;
  if (generateMissingBaseline) {
    if (this.isNot) {
      const message2 = `Matchers using ".not" can't generate new baselines`;
      return { pass: this.isNot, message: () => message2, name: "toMatchAriaSnapshot" };
    } else {
      expected = `- none "Generating new baseline"`;
    }
  }
  expected = unshift(expected);
  const { matches: pass, received, log, timedOut, errorMessage } = await locator._expect("to.match.aria", { expectedValue: expected, isNot: this.isNot, timeout });
  const typedReceived = received;
  const message = () => {
    let printedExpected;
    let printedReceived;
    let printedDiff;
    if (errorMessage) {
      printedExpected = `Expected: ${this.isNot ? "not " : ""}${this.utils.printExpected(expected)}`;
    } else if (pass) {
      const receivedString = (0, import_utils.printReceivedStringContainExpectedSubstring)(this.utils, typedReceived.raw, typedReceived.raw.indexOf(expected), expected.length);
      printedExpected = `Expected: not ${this.utils.printExpected(expected)}`;
      printedReceived = `Received: ${receivedString}`;
    } else {
      printedDiff = this.utils.printDiffOrStringify(expected, typedReceived.raw, "Expected", "Received", false);
    }
    return (0, import_utils.formatMatcherMessage)(this.utils, {
      isNot: this.isNot,
      promise: this.promise,
      matcherName,
      expectation: "expected",
      locator: locator.toString(),
      timeout,
      timedOut,
      printedExpected,
      printedReceived,
      printedDiff,
      errorMessage,
      log
    });
  };
  if (errorMessage)
    return { pass: this.isNot, message, name: "toMatchAriaSnapshot", expected };
  if (!this.isNot) {
    if (updateSnapshots === "all" || updateSnapshots === "changed" && pass === this.isNot || generateMissingBaseline) {
      if (expectedPath) {
        await import_fs.default.promises.mkdir(import_path.default.dirname(expectedPath), { recursive: true });
        await import_fs.default.promises.writeFile(expectedPath, typedReceived.regex, "utf8");
        const relativePath = import_path.default.relative(process.cwd(), expectedPath);
        if (updateSnapshots === "missing") {
          const message2 = `A snapshot doesn't exist at ${relativePath}, writing actual.`;
          testInfo._hasNonRetriableError = true;
          testInfo._failWithError(new Error(message2));
        } else {
          const message2 = `A snapshot is generated at ${relativePath}.`;
          console.log(message2);
        }
        return { pass: true, message: () => "", name: "toMatchAriaSnapshot" };
      } else {
        const suggestedRebaseline = `\`
${(0, import_utils.escapeTemplateString)(indent(typedReceived.regex, "{indent}  "))}
{indent}\``;
        if (updateSnapshots === "missing") {
          const message2 = "A snapshot is not provided, generating new baseline.";
          testInfo._hasNonRetriableError = true;
          testInfo._failWithError(new Error(message2));
        }
        return { pass: false, message: () => "", name: "toMatchAriaSnapshot", suggestedRebaseline };
      }
    }
  }
  return {
    name: matcherName,
    expected,
    message,
    pass,
    actual: received,
    log,
    timeout: timedOut ? timeout : void 0
  };
}
function unshift(snapshot) {
  const lines = snapshot.split("\n");
  let whitespacePrefixLength = 100;
  for (const line of lines) {
    if (!line.trim())
      continue;
    const match = line.match(/^(\s*)/);
    if (match && match[1].length < whitespacePrefixLength)
      whitespacePrefixLength = match[1].length;
  }
  return lines.filter((t) => t.trim()).map((line) => line.substring(whitespacePrefixLength)).join("\n");
}
function indent(snapshot, indent2) {
  return snapshot.split("\n").map((line) => indent2 + line).join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toMatchAriaSnapshot
});
