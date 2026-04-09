"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var import_crypto = require("crypto");
var import_vitest = require("vitest");
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_token_io = require("./token-io");
var tokenUtil = __toESM(require("./token-util"));
var import_token = require("./token");
import_vitest.vi.mock("./token-io");
(0, import_vitest.describe)("refreshToken", () => {
  let rootDir;
  let userDataDir;
  let cliDataDir;
  let tokenDataDir;
  const projectId = "test-project-id";
  (0, import_vitest.beforeEach)(() => {
    import_vitest.vi.clearAllMocks();
    process.env.VERCEL_OIDC_TOKEN = void 0;
    const random = `test-${(0, import_crypto.randomUUID)()}`;
    rootDir = path.join(os.tmpdir(), random);
    userDataDir = path.join(rootDir, "data");
    cliDataDir = path.join(userDataDir, "com.vercel.cli");
    tokenDataDir = path.join(userDataDir, "com.vercel.token");
    fs.mkdirSync(cliDataDir, { recursive: true });
    fs.mkdirSync(tokenDataDir, { recursive: true });
    fs.mkdirSync(path.join(rootDir, ".vercel"), {
      recursive: true
    });
    fs.writeFileSync(path.join(cliDataDir, "auth.json"), '{token: "test"}');
    fs.writeFileSync(
      path.join(rootDir, ".vercel", "project.json"),
      JSON.stringify({ projectId })
    );
    import_vitest.vi.spyOn(process, "cwd").mockReturnValue(rootDir);
    import_vitest.vi.mocked(import_token_io.findRootDir).mockReturnValue(rootDir);
    import_vitest.vi.mocked(import_token_io.getUserDataDir).mockReturnValue(userDataDir);
    import_vitest.vi.spyOn(tokenUtil, "getVercelCliToken").mockResolvedValue("test");
    import_vitest.vi.spyOn(tokenUtil, "getVercelOidcToken").mockResolvedValue({
      token: "test-token"
    });
    import_vitest.vi.spyOn(tokenUtil, "getTokenPayload").mockReturnValue({
      sub: "test-sub",
      name: "test-name",
      exp: Date.now() + 1e5
    });
  });
  (0, import_vitest.test)("should correctly load saved token from file", async () => {
    const token = { token: "test-saved" };
    const tokenPath = path.join(tokenDataDir, `${projectId}.json`);
    fs.writeFileSync(tokenPath, JSON.stringify(token));
    await (0, import_token.refreshToken)();
    (0, import_vitest.expect)(process.env.VERCEL_OIDC_TOKEN).toBe("test-saved");
  });
  (0, import_vitest.test)("should correctly save token to file", async () => {
    await (0, import_token.refreshToken)();
    (0, import_vitest.expect)(process.env.VERCEL_OIDC_TOKEN).toBe("test-token");
    const tokenPath = path.join(tokenDataDir, `${projectId}.json`);
    const token = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    (0, import_vitest.expect)(token).toEqual({ token: "test-token" });
  });
});
