"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var programWithTestStub_exports = {};
__export(programWithTestStub_exports, {
  program: () => import_program2.program
});
module.exports = __toCommonJS(programWithTestStub_exports);
var import_processLauncher = require("../server/utils/processLauncher");
var import_utils = require("../utils");
var import_program = require("./program");
var import_program2 = require("./program");
function printPlaywrightTestError(command) {
  const packages = [];
  for (const pkg of ["playwright", "playwright-chromium", "playwright-firefox", "playwright-webkit"]) {
    try {
      require.resolve(pkg);
      packages.push(pkg);
    } catch (e) {
    }
  }
  if (!packages.length)
    packages.push("playwright");
  const packageManager = (0, import_utils.getPackageManager)();
  if (packageManager === "yarn") {
    console.error(`Please install @playwright/test package before running "yarn playwright ${command}"`);
    console.error(`  yarn remove ${packages.join(" ")}`);
    console.error("  yarn add -D @playwright/test");
  } else if (packageManager === "pnpm") {
    console.error(`Please install @playwright/test package before running "pnpm exec playwright ${command}"`);
    console.error(`  pnpm remove ${packages.join(" ")}`);
    console.error("  pnpm add -D @playwright/test");
  } else {
    console.error(`Please install @playwright/test package before running "npx playwright ${command}"`);
    console.error(`  npm uninstall ${packages.join(" ")}`);
    console.error("  npm install -D @playwright/test");
  }
}
const kExternalPlaywrightTestCommands = [
  ["test", "Run tests with Playwright Test."],
  ["show-report", "Show Playwright Test HTML report."],
  ["merge-reports", "Merge Playwright Test Blob reports"]
];
function addExternalPlaywrightTestCommands() {
  for (const [command, description] of kExternalPlaywrightTestCommands) {
    const playwrightTest = import_program.program.command(command).allowUnknownOption(true).allowExcessArguments(true);
    playwrightTest.description(`${description} Available in @playwright/test package.`);
    playwrightTest.action(async () => {
      printPlaywrightTestError(command);
      (0, import_processLauncher.gracefullyProcessExitDoNotHang)(1);
    });
  }
}
if (!process.env.PW_LANG_NAME)
  addExternalPlaywrightTestCommands();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  program
});
