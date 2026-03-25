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
var launchApp_exports = {};
__export(launchApp_exports, {
  launchApp: () => launchApp,
  syncLocalStorageWithSettings: () => syncLocalStorageWithSettings
});
module.exports = __toCommonJS(launchApp_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("../utils");
var import_registry = require("./registry");
var import_registry2 = require("./registry");
var import_progress = require("./progress");
async function launchApp(browserType, options) {
  const args = [...options.persistentContextOptions?.args ?? []];
  let channel = options.persistentContextOptions?.channel;
  if (browserType.name() === "chromium") {
    args.push(
      "--app=data:text/html,",
      `--window-size=${options.windowSize.width},${options.windowSize.height}`,
      ...options.windowPosition ? [`--window-position=${options.windowPosition.x},${options.windowPosition.y}`] : [],
      "--test-type="
    );
    if (!channel && !options.persistentContextOptions?.executablePath)
      channel = (0, import_registry.findChromiumChannelBestEffort)(options.sdkLanguage);
  }
  const controller = new import_progress.ProgressController();
  let context;
  try {
    context = await controller.run((progress) => browserType.launchPersistentContext(progress, "", {
      ignoreDefaultArgs: ["--enable-automation"],
      ...options?.persistentContextOptions,
      channel,
      noDefaultViewport: options.persistentContextOptions?.noDefaultViewport ?? true,
      acceptDownloads: options?.persistentContextOptions?.acceptDownloads ?? ((0, import_utils.isUnderTest)() ? "accept" : "internal-browser-default"),
      colorScheme: options?.persistentContextOptions?.colorScheme ?? "no-override",
      args
    }), 0);
  } catch (error) {
    if (channel) {
      error = (0, import_utils.rewriteErrorMessage)(error, [
        `Failed to launch "${channel}" channel.`,
        "Using custom channels could lead to unexpected behavior due to Enterprise policies (chrome://policy).",
        "Install the default browser instead:",
        (0, import_utils.wrapInASCIIBox)(`${(0, import_registry.buildPlaywrightCLICommand)(options.sdkLanguage, "install")}`, 2)
      ].join("\n"));
    }
    throw error;
  }
  const [page] = context.pages();
  if (browserType.name() === "chromium" && process.platform === "darwin") {
    context.on("page", async (newPage) => {
      if (newPage.mainFrame().url() === "chrome://new-tab-page/") {
        await page.bringToFront();
        await newPage.close();
      }
    });
  }
  if (browserType.name() === "chromium")
    await installAppIcon(page);
  return { context, page };
}
async function installAppIcon(page) {
  const icon = await import_fs.default.promises.readFile(require.resolve("./chromium/appIcon.png"));
  const crPage = page.delegate;
  await crPage._mainFrameSession._client.send("Browser.setDockTile", {
    image: icon.toString("base64")
  });
}
async function syncLocalStorageWithSettings(page, appName) {
  if ((0, import_utils.isUnderTest)())
    return;
  const settingsFile = import_path.default.join(import_registry2.registryDirectory, ".settings", `${appName}.json`);
  const controller = new import_progress.ProgressController();
  await controller.run(async (progress) => {
    await page.exposeBinding(progress, "_saveSerializedSettings", false, (_, settings2) => {
      import_fs.default.mkdirSync(import_path.default.dirname(settingsFile), { recursive: true });
      import_fs.default.writeFileSync(settingsFile, settings2);
    });
    const settings = await import_fs.default.promises.readFile(settingsFile, "utf-8").catch(() => "{}");
    await page.addInitScript(
      progress,
      `(${String((settings2) => {
        if (location && location.protocol === "data:")
          return;
        if (window.top !== window)
          return;
        Object.entries(settings2).map(([k, v]) => localStorage[k] = v);
        window.saveSettings = () => {
          window._saveSerializedSettings(JSON.stringify({ ...localStorage }));
        };
      })})(${settings});
    `
    );
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  launchApp,
  syncLocalStorageWithSettings
});
