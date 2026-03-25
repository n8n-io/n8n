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
var testTools_exports = {};
__export(testTools_exports, {
  debugTest: () => debugTest,
  listTests: () => listTests,
  runTests: () => runTests
});
module.exports = __toCommonJS(testTools_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_listModeReporter = __toESM(require("../../reporters/listModeReporter"));
var import_testTool = require("./testTool");
const listTests = (0, import_testTool.defineTestTool)({
  schema: {
    name: "test_list",
    title: "List tests",
    description: "List tests",
    inputSchema: import_mcpBundle.z.object({}),
    type: "readOnly"
  },
  handle: async (context) => {
    const { testRunner, screen, output } = await context.createTestRunner();
    const reporter = new import_listModeReporter.default({ screen, includeTestId: true });
    await testRunner.listTests(reporter, {});
    return { content: output.map((text) => ({ type: "text", text })) };
  }
});
const runTests = (0, import_testTool.defineTestTool)({
  schema: {
    name: "test_run",
    title: "Run tests",
    description: "Run tests",
    inputSchema: import_mcpBundle.z.object({
      locations: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe('Folder, file or location to run: "test/e2e" or "test/e2e/file.spec.ts" or "test/e2e/file.spec.ts:20"'),
      projects: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe('Projects to run, projects from playwright.config.ts, by default runs all projects. Running with "chromium" is a good start')
    }),
    type: "readOnly"
  },
  handle: async (context, params) => {
    const { output } = await context.runTestsWithGlobalSetupAndPossiblePause({
      locations: params.locations ?? [],
      projects: params.projects,
      disableConfigReporters: true
    });
    return { content: [{ type: "text", text: output }] };
  }
});
const debugTest = (0, import_testTool.defineTestTool)({
  schema: {
    name: "test_debug",
    title: "Debug single test",
    description: "Debug single test",
    inputSchema: import_mcpBundle.z.object({
      test: import_mcpBundle.z.object({
        id: import_mcpBundle.z.string().describe("Test ID to debug."),
        title: import_mcpBundle.z.string().describe("Human readable test title for granting permission to debug the test.")
      })
    }),
    type: "readOnly"
  },
  handle: async (context, params) => {
    const { output, status } = await context.runTestsWithGlobalSetupAndPossiblePause({
      headed: context.computedHeaded,
      locations: [],
      // we can make this faster by passing the test's location, so we don't need to scan all tests to find the ID
      testIds: [params.test.id],
      // For automatic recovery
      timeout: 0,
      workers: 1,
      pauseOnError: true,
      disableConfigReporters: true,
      actionTimeout: 5e3
    });
    return { content: [{ type: "text", text: output }], isError: status !== "paused" && status !== "passed" };
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  debugTest,
  listTests,
  runTests
});
