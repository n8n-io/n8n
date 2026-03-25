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
var registry_exports = {};
__export(registry_exports, {
  Registry: () => Registry,
  browserDirectoryToMarkerFilePath: () => browserDirectoryToMarkerFilePath,
  buildPlaywrightCLICommand: () => buildPlaywrightCLICommand,
  findChromiumChannelBestEffort: () => findChromiumChannelBestEffort,
  installBrowsersForNpmInstall: () => installBrowsersForNpmInstall,
  registry: () => registry,
  registryDirectory: () => registryDirectory,
  writeDockerVersion: () => import_dependencies3.writeDockerVersion
});
module.exports = __toCommonJS(registry_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var util = __toESM(require("util"));
var import_browserFetcher = require("./browserFetcher");
var import_dependencies = require("./dependencies");
var import_dependencies2 = require("./dependencies");
var import_utils = require("../../utils");
var import_ascii = require("../utils/ascii");
var import_debugLogger = require("../utils/debugLogger");
var import_hostPlatform = require("../utils/hostPlatform");
var import_network = require("../utils/network");
var import_spawnAsync = require("../utils/spawnAsync");
var import_userAgent = require("../utils/userAgent");
var import_utilsBundle = require("../../utilsBundle");
var import_fileUtils = require("../utils/fileUtils");
var import_dependencies3 = require("./dependencies");
const PACKAGE_PATH = import_path.default.join(__dirname, "..", "..", "..");
const BIN_PATH = import_path.default.join(__dirname, "..", "..", "..", "bin");
const PLAYWRIGHT_CDN_MIRRORS = [
  "https://cdn.playwright.dev/dbazure/download/playwright",
  // ESRP CDN
  "https://playwright.download.prss.microsoft.com/dbazure/download/playwright",
  // Directly hit ESRP CDN
  "https://cdn.playwright.dev"
  // Hit the Storage Bucket directly
];
if (process.env.PW_TEST_CDN_THAT_SHOULD_WORK) {
  for (let i = 0; i < PLAYWRIGHT_CDN_MIRRORS.length; i++) {
    const cdn = PLAYWRIGHT_CDN_MIRRORS[i];
    if (cdn !== process.env.PW_TEST_CDN_THAT_SHOULD_WORK) {
      const parsedCDN = new URL(cdn);
      parsedCDN.hostname = parsedCDN.hostname + ".does-not-resolve.playwright.dev";
      PLAYWRIGHT_CDN_MIRRORS[i] = parsedCDN.toString();
    }
  }
}
const EXECUTABLE_PATHS = {
  "chromium": {
    "<unknown>": void 0,
    "linux-x64": ["chrome-linux64", "chrome"],
    "linux-arm64": ["chrome-linux", "chrome"],
    // non-cft build
    "mac-x64": ["chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
    "mac-arm64": ["chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
    "win-x64": ["chrome-win64", "chrome.exe"]
  },
  "chromium-headless-shell": {
    "<unknown>": void 0,
    "linux-x64": ["chrome-headless-shell-linux64", "chrome-headless-shell"],
    "linux-arm64": ["chrome-linux", "headless_shell"],
    // non-cft build
    "mac-x64": ["chrome-headless-shell-mac-x64", "chrome-headless-shell"],
    "mac-arm64": ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"],
    "win-x64": ["chrome-headless-shell-win64", "chrome-headless-shell.exe"]
  },
  "chromium-tip-of-tree": {
    "<unknown>": void 0,
    "linux-x64": ["chrome-linux64", "chrome"],
    "linux-arm64": ["chrome-linux", "chrome"],
    // non-cft build
    "mac-x64": ["chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
    "mac-arm64": ["chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
    "win-x64": ["chrome-win64", "chrome.exe"]
  },
  "chromium-tip-of-tree-headless-shell": {
    "<unknown>": void 0,
    "linux-x64": ["chrome-headless-shell-linux64", "chrome-headless-shell"],
    "linux-arm64": ["chrome-linux", "headless_shell"],
    // non-cft build
    "mac-x64": ["chrome-headless-shell-mac-x64", "chrome-headless-shell"],
    "mac-arm64": ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"],
    "win-x64": ["chrome-headless-shell-win64", "chrome-headless-shell.exe"]
  },
  "firefox": {
    "<unknown>": void 0,
    "linux-x64": ["firefox", "firefox"],
    "linux-arm64": ["firefox", "firefox"],
    "mac-x64": ["firefox", "Nightly.app", "Contents", "MacOS", "firefox"],
    "mac-arm64": ["firefox", "Nightly.app", "Contents", "MacOS", "firefox"],
    "win-x64": ["firefox", "firefox.exe"]
  },
  "webkit": {
    "<unknown>": void 0,
    "linux-x64": ["pw_run.sh"],
    "linux-arm64": ["pw_run.sh"],
    "mac-x64": ["pw_run.sh"],
    "mac-arm64": ["pw_run.sh"],
    "win-x64": ["Playwright.exe"]
  },
  "ffmpeg": {
    "<unknown>": void 0,
    "linux-x64": ["ffmpeg-linux"],
    "linux-arm64": ["ffmpeg-linux"],
    "mac-x64": ["ffmpeg-mac"],
    "mac-arm64": ["ffmpeg-mac"],
    "win-x64": ["ffmpeg-win64.exe"]
  },
  "winldd": {
    "<unknown>": void 0,
    "linux-x64": void 0,
    "linux-arm64": void 0,
    "mac-x64": void 0,
    "mac-arm64": void 0,
    "win-x64": ["PrintDeps.exe"]
  }
};
function cftUrl(suffix) {
  return ({ browserVersion }) => {
    return {
      path: `${browserVersion}/${suffix}`,
      mirrors: [
        "https://cdn.playwright.dev/chrome-for-testing-public"
      ]
    };
  };
}
const DOWNLOAD_PATHS = {
  "chromium": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": cftUrl("linux64/chrome-linux64.zip"),
    "ubuntu22.04-x64": cftUrl("linux64/chrome-linux64.zip"),
    "ubuntu24.04-x64": cftUrl("linux64/chrome-linux64.zip"),
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/chromium/%s/chromium-linux-arm64.zip",
    "ubuntu22.04-arm64": "builds/chromium/%s/chromium-linux-arm64.zip",
    "ubuntu24.04-arm64": "builds/chromium/%s/chromium-linux-arm64.zip",
    "debian11-x64": cftUrl("linux64/chrome-linux64.zip"),
    "debian11-arm64": "builds/chromium/%s/chromium-linux-arm64.zip",
    "debian12-x64": cftUrl("linux64/chrome-linux64.zip"),
    "debian12-arm64": "builds/chromium/%s/chromium-linux-arm64.zip",
    "debian13-x64": cftUrl("linux64/chrome-linux64.zip"),
    "debian13-arm64": "builds/chromium/%s/chromium-linux-arm64.zip",
    "mac10.13": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac10.14": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac10.15": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac11": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac11-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac12": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac12-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac13": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac13-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac14": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac14-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac15": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac15-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "win64": cftUrl("win64/chrome-win64.zip")
  },
  "chromium-headless-shell": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "ubuntu22.04-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "ubuntu24.04-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/chromium/%s/chromium-headless-shell-linux-arm64.zip",
    "ubuntu22.04-arm64": "builds/chromium/%s/chromium-headless-shell-linux-arm64.zip",
    "ubuntu24.04-arm64": "builds/chromium/%s/chromium-headless-shell-linux-arm64.zip",
    "debian11-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "debian11-arm64": "builds/chromium/%s/chromium-headless-shell-linux-arm64.zip",
    "debian12-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "debian12-arm64": "builds/chromium/%s/chromium-headless-shell-linux-arm64.zip",
    "debian13-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "debian13-arm64": "builds/chromium/%s/chromium-headless-shell-linux-arm64.zip",
    "mac10.13": void 0,
    "mac10.14": void 0,
    "mac10.15": void 0,
    "mac11": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac11-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac12": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac12-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac13": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac13-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac14": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac14-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac15": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac15-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "win64": cftUrl("win64/chrome-headless-shell-win64.zip")
  },
  "chromium-tip-of-tree": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": cftUrl("linux64/chrome-linux64.zip"),
    "ubuntu22.04-x64": cftUrl("linux64/chrome-linux64.zip"),
    "ubuntu24.04-x64": cftUrl("linux64/chrome-linux64.zip"),
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip",
    "ubuntu22.04-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip",
    "ubuntu24.04-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip",
    "debian11-x64": cftUrl("linux64/chrome-linux64.zip"),
    "debian11-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip",
    "debian12-x64": cftUrl("linux64/chrome-linux64.zip"),
    "debian12-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip",
    "debian13-x64": cftUrl("linux64/chrome-linux64.zip"),
    "debian13-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip",
    "mac10.13": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac10.14": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac10.15": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac11": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac11-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac12": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac12-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac13": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac13-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac14": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac14-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "mac15": cftUrl("mac-x64/chrome-mac-x64.zip"),
    "mac15-arm64": cftUrl("mac-arm64/chrome-mac-arm64.zip"),
    "win64": cftUrl("win64/chrome-win64.zip")
  },
  "chromium-tip-of-tree-headless-shell": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "ubuntu22.04-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "ubuntu24.04-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-headless-shell-linux-arm64.zip",
    "ubuntu22.04-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-headless-shell-linux-arm64.zip",
    "ubuntu24.04-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-headless-shell-linux-arm64.zip",
    "debian11-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "debian11-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-headless-shell-linux-arm64.zip",
    "debian12-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "debian12-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-headless-shell-linux-arm64.zip",
    "debian13-x64": cftUrl("linux64/chrome-headless-shell-linux64.zip"),
    "debian13-arm64": "builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-headless-shell-linux-arm64.zip",
    "mac10.13": void 0,
    "mac10.14": void 0,
    "mac10.15": void 0,
    "mac11": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac11-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac12": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac12-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac13": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac13-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac14": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac14-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "mac15": cftUrl("mac-x64/chrome-headless-shell-mac-x64.zip"),
    "mac15-arm64": cftUrl("mac-arm64/chrome-headless-shell-mac-arm64.zip"),
    "win64": cftUrl("win64/chrome-headless-shell-win64.zip")
  },
  "firefox": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": "builds/firefox/%s/firefox-ubuntu-20.04.zip",
    "ubuntu22.04-x64": "builds/firefox/%s/firefox-ubuntu-22.04.zip",
    "ubuntu24.04-x64": "builds/firefox/%s/firefox-ubuntu-24.04.zip",
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/firefox/%s/firefox-ubuntu-20.04-arm64.zip",
    "ubuntu22.04-arm64": "builds/firefox/%s/firefox-ubuntu-22.04-arm64.zip",
    "ubuntu24.04-arm64": "builds/firefox/%s/firefox-ubuntu-24.04-arm64.zip",
    "debian11-x64": "builds/firefox/%s/firefox-debian-11.zip",
    "debian11-arm64": "builds/firefox/%s/firefox-debian-11-arm64.zip",
    "debian12-x64": "builds/firefox/%s/firefox-debian-12.zip",
    "debian12-arm64": "builds/firefox/%s/firefox-debian-12-arm64.zip",
    "debian13-x64": "builds/firefox/%s/firefox-debian-13.zip",
    "debian13-arm64": "builds/firefox/%s/firefox-debian-13-arm64.zip",
    "mac10.13": "builds/firefox/%s/firefox-mac.zip",
    "mac10.14": "builds/firefox/%s/firefox-mac.zip",
    "mac10.15": "builds/firefox/%s/firefox-mac.zip",
    "mac11": "builds/firefox/%s/firefox-mac.zip",
    "mac11-arm64": "builds/firefox/%s/firefox-mac-arm64.zip",
    "mac12": "builds/firefox/%s/firefox-mac.zip",
    "mac12-arm64": "builds/firefox/%s/firefox-mac-arm64.zip",
    "mac13": "builds/firefox/%s/firefox-mac.zip",
    "mac13-arm64": "builds/firefox/%s/firefox-mac-arm64.zip",
    "mac14": "builds/firefox/%s/firefox-mac.zip",
    "mac14-arm64": "builds/firefox/%s/firefox-mac-arm64.zip",
    "mac15": "builds/firefox/%s/firefox-mac.zip",
    "mac15-arm64": "builds/firefox/%s/firefox-mac-arm64.zip",
    "win64": "builds/firefox/%s/firefox-win64.zip"
  },
  "firefox-beta": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": "builds/firefox-beta/%s/firefox-beta-ubuntu-20.04.zip",
    "ubuntu22.04-x64": "builds/firefox-beta/%s/firefox-beta-ubuntu-22.04.zip",
    "ubuntu24.04-x64": "builds/firefox-beta/%s/firefox-beta-ubuntu-24.04.zip",
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": void 0,
    "ubuntu22.04-arm64": "builds/firefox-beta/%s/firefox-beta-ubuntu-22.04-arm64.zip",
    "ubuntu24.04-arm64": "builds/firefox-beta/%s/firefox-beta-ubuntu-24.04-arm64.zip",
    "debian11-x64": "builds/firefox-beta/%s/firefox-beta-debian-11.zip",
    "debian11-arm64": "builds/firefox-beta/%s/firefox-beta-debian-11-arm64.zip",
    "debian12-x64": "builds/firefox-beta/%s/firefox-beta-debian-12.zip",
    "debian12-arm64": "builds/firefox-beta/%s/firefox-beta-debian-12-arm64.zip",
    "debian13-x64": "builds/firefox-beta/%s/firefox-beta-debian-12.zip",
    "debian13-arm64": "builds/firefox-beta/%s/firefox-beta-debian-12-arm64.zip",
    "mac10.13": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac10.14": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac10.15": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac11": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac11-arm64": "builds/firefox-beta/%s/firefox-beta-mac-arm64.zip",
    "mac12": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac12-arm64": "builds/firefox-beta/%s/firefox-beta-mac-arm64.zip",
    "mac13": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac13-arm64": "builds/firefox-beta/%s/firefox-beta-mac-arm64.zip",
    "mac14": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac14-arm64": "builds/firefox-beta/%s/firefox-beta-mac-arm64.zip",
    "mac15": "builds/firefox-beta/%s/firefox-beta-mac.zip",
    "mac15-arm64": "builds/firefox-beta/%s/firefox-beta-mac-arm64.zip",
    "win64": "builds/firefox-beta/%s/firefox-beta-win64.zip"
  },
  "webkit": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": "builds/webkit/%s/webkit-ubuntu-20.04.zip",
    "ubuntu22.04-x64": "builds/webkit/%s/webkit-ubuntu-22.04.zip",
    "ubuntu24.04-x64": "builds/webkit/%s/webkit-ubuntu-24.04.zip",
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/webkit/%s/webkit-ubuntu-20.04-arm64.zip",
    "ubuntu22.04-arm64": "builds/webkit/%s/webkit-ubuntu-22.04-arm64.zip",
    "ubuntu24.04-arm64": "builds/webkit/%s/webkit-ubuntu-24.04-arm64.zip",
    "debian11-x64": "builds/webkit/%s/webkit-debian-11.zip",
    "debian11-arm64": "builds/webkit/%s/webkit-debian-11-arm64.zip",
    "debian12-x64": "builds/webkit/%s/webkit-debian-12.zip",
    "debian12-arm64": "builds/webkit/%s/webkit-debian-12-arm64.zip",
    "debian13-x64": "builds/webkit/%s/webkit-debian-13.zip",
    "debian13-arm64": "builds/webkit/%s/webkit-debian-13-arm64.zip",
    "mac10.13": void 0,
    "mac10.14": void 0,
    "mac10.15": void 0,
    "mac11": void 0,
    "mac11-arm64": void 0,
    "mac12": void 0,
    "mac12-arm64": void 0,
    "mac13": void 0,
    "mac13-arm64": void 0,
    "mac14": "builds/webkit/%s/webkit-mac-14.zip",
    "mac14-arm64": "builds/webkit/%s/webkit-mac-14-arm64.zip",
    "mac15": "builds/webkit/%s/webkit-mac-15.zip",
    "mac15-arm64": "builds/webkit/%s/webkit-mac-15-arm64.zip",
    "win64": "builds/webkit/%s/webkit-win64.zip"
  },
  "ffmpeg": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": "builds/ffmpeg/%s/ffmpeg-linux.zip",
    "ubuntu22.04-x64": "builds/ffmpeg/%s/ffmpeg-linux.zip",
    "ubuntu24.04-x64": "builds/ffmpeg/%s/ffmpeg-linux.zip",
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/ffmpeg/%s/ffmpeg-linux-arm64.zip",
    "ubuntu22.04-arm64": "builds/ffmpeg/%s/ffmpeg-linux-arm64.zip",
    "ubuntu24.04-arm64": "builds/ffmpeg/%s/ffmpeg-linux-arm64.zip",
    "debian11-x64": "builds/ffmpeg/%s/ffmpeg-linux.zip",
    "debian11-arm64": "builds/ffmpeg/%s/ffmpeg-linux-arm64.zip",
    "debian12-x64": "builds/ffmpeg/%s/ffmpeg-linux.zip",
    "debian12-arm64": "builds/ffmpeg/%s/ffmpeg-linux-arm64.zip",
    "debian13-x64": "builds/ffmpeg/%s/ffmpeg-linux.zip",
    "debian13-arm64": "builds/ffmpeg/%s/ffmpeg-linux-arm64.zip",
    "mac10.13": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac10.14": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac10.15": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac11": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac11-arm64": "builds/ffmpeg/%s/ffmpeg-mac-arm64.zip",
    "mac12": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac12-arm64": "builds/ffmpeg/%s/ffmpeg-mac-arm64.zip",
    "mac13": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac13-arm64": "builds/ffmpeg/%s/ffmpeg-mac-arm64.zip",
    "mac14": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac14-arm64": "builds/ffmpeg/%s/ffmpeg-mac-arm64.zip",
    "mac15": "builds/ffmpeg/%s/ffmpeg-mac.zip",
    "mac15-arm64": "builds/ffmpeg/%s/ffmpeg-mac-arm64.zip",
    "win64": "builds/ffmpeg/%s/ffmpeg-win64.zip"
  },
  "winldd": {
    "<unknown>": void 0,
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": void 0,
    "ubuntu22.04-x64": void 0,
    "ubuntu24.04-x64": void 0,
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": void 0,
    "ubuntu22.04-arm64": void 0,
    "ubuntu24.04-arm64": void 0,
    "debian11-x64": void 0,
    "debian11-arm64": void 0,
    "debian12-x64": void 0,
    "debian12-arm64": void 0,
    "debian13-x64": void 0,
    "debian13-arm64": void 0,
    "mac10.13": void 0,
    "mac10.14": void 0,
    "mac10.15": void 0,
    "mac11": void 0,
    "mac11-arm64": void 0,
    "mac12": void 0,
    "mac12-arm64": void 0,
    "mac13": void 0,
    "mac13-arm64": void 0,
    "mac14": void 0,
    "mac14-arm64": void 0,
    "mac15": void 0,
    "mac15-arm64": void 0,
    "win64": "builds/winldd/%s/winldd-win64.zip"
  },
  "android": {
    "<unknown>": "builds/android/%s/android.zip",
    "ubuntu18.04-x64": void 0,
    "ubuntu20.04-x64": "builds/android/%s/android.zip",
    "ubuntu22.04-x64": "builds/android/%s/android.zip",
    "ubuntu24.04-x64": "builds/android/%s/android.zip",
    "ubuntu18.04-arm64": void 0,
    "ubuntu20.04-arm64": "builds/android/%s/android.zip",
    "ubuntu22.04-arm64": "builds/android/%s/android.zip",
    "ubuntu24.04-arm64": "builds/android/%s/android.zip",
    "debian11-x64": "builds/android/%s/android.zip",
    "debian11-arm64": "builds/android/%s/android.zip",
    "debian12-x64": "builds/android/%s/android.zip",
    "debian12-arm64": "builds/android/%s/android.zip",
    "debian13-x64": "builds/android/%s/android.zip",
    "debian13-arm64": "builds/android/%s/android.zip",
    "mac10.13": "builds/android/%s/android.zip",
    "mac10.14": "builds/android/%s/android.zip",
    "mac10.15": "builds/android/%s/android.zip",
    "mac11": "builds/android/%s/android.zip",
    "mac11-arm64": "builds/android/%s/android.zip",
    "mac12": "builds/android/%s/android.zip",
    "mac12-arm64": "builds/android/%s/android.zip",
    "mac13": "builds/android/%s/android.zip",
    "mac13-arm64": "builds/android/%s/android.zip",
    "mac14": "builds/android/%s/android.zip",
    "mac14-arm64": "builds/android/%s/android.zip",
    "mac15": "builds/android/%s/android.zip",
    "mac15-arm64": "builds/android/%s/android.zip",
    "win64": "builds/android/%s/android.zip"
  }
};
const registryDirectory = (() => {
  let result;
  const envDefined = (0, import_utils.getFromENV)("PLAYWRIGHT_BROWSERS_PATH");
  if (envDefined === "0") {
    result = import_path.default.join(__dirname, "..", "..", "..", ".local-browsers");
  } else if (envDefined) {
    result = envDefined;
  } else {
    let cacheDirectory;
    if (process.platform === "linux")
      cacheDirectory = process.env.XDG_CACHE_HOME || import_path.default.join(import_os.default.homedir(), ".cache");
    else if (process.platform === "darwin")
      cacheDirectory = import_path.default.join(import_os.default.homedir(), "Library", "Caches");
    else if (process.platform === "win32")
      cacheDirectory = process.env.LOCALAPPDATA || import_path.default.join(import_os.default.homedir(), "AppData", "Local");
    else
      throw new Error("Unsupported platform: " + process.platform);
    result = import_path.default.join(cacheDirectory, "ms-playwright");
  }
  if (!import_path.default.isAbsolute(result)) {
    result = import_path.default.resolve((0, import_utils.getFromENV)("INIT_CWD") || process.cwd(), result);
  }
  return result;
})();
function isBrowserDirectory(browserDirectory) {
  const baseName = import_path.default.basename(browserDirectory);
  for (const browserName of allDownloadableDirectoriesThatEverExisted) {
    if (baseName.startsWith(browserName.replace(/-/g, "_") + "-"))
      return true;
  }
  return false;
}
function readDescriptors(browsersJSON) {
  return browsersJSON["browsers"].map((obj) => {
    const name = obj.name;
    const revisionOverride = (obj.revisionOverrides || {})[import_hostPlatform.hostPlatform];
    const revision = revisionOverride || obj.revision;
    const browserDirectoryPrefix = revisionOverride ? `${name}_${import_hostPlatform.hostPlatform}_special` : `${name}`;
    const descriptor = {
      name,
      revision,
      hasRevisionOverride: !!revisionOverride,
      // We only put browser version for the supported operating systems.
      browserVersion: revisionOverride ? void 0 : obj.browserVersion,
      title: obj["title"],
      installByDefault: !!obj.installByDefault,
      // Method `isBrowserDirectory` determines directory to be browser iff
      // it starts with some browser name followed by '-'. Some browser names
      // are prefixes of others, e.g. 'webkit' is a prefix of `webkit-technology-preview`.
      // To avoid older registries erroneously removing 'webkit-technology-preview', we have to
      // ensure that browser folders to never include dashes inside.
      dir: import_path.default.join(registryDirectory, browserDirectoryPrefix.replace(/-/g, "_") + "-" + revision)
    };
    return descriptor;
  });
}
const allDownloadableDirectoriesThatEverExisted = ["android", "chromium", "firefox", "webkit", "ffmpeg", "firefox-beta", "chromium-tip-of-tree", "chromium-headless-shell", "chromium-tip-of-tree-headless-shell", "winldd"];
const chromiumAliases = ["bidi-chromium", "chrome-for-testing"];
class Registry {
  constructor(browsersJSON) {
    const descriptors = readDescriptors(browsersJSON);
    const findExecutablePath = (dir, name) => {
      const tokens = EXECUTABLE_PATHS[name][import_hostPlatform.shortPlatform];
      return tokens ? import_path.default.join(dir, ...tokens) : void 0;
    };
    const executablePathOrDie = (name, e, installByDefault, sdkLanguage) => {
      if (!e)
        throw new Error(`${name} is not supported on ${import_hostPlatform.hostPlatform}`);
      const installCommand = buildPlaywrightCLICommand(sdkLanguage, `install${installByDefault ? "" : " " + name}`);
      if (!(0, import_fileUtils.canAccessFile)(e)) {
        const currentDockerVersion = (0, import_dependencies.readDockerVersionSync)();
        const preferredDockerVersion = currentDockerVersion ? (0, import_dependencies.dockerVersion)(currentDockerVersion.dockerImageNameTemplate) : null;
        const isOutdatedDockerImage = currentDockerVersion && preferredDockerVersion && currentDockerVersion.dockerImageName !== preferredDockerVersion.dockerImageName;
        const prettyMessage = isOutdatedDockerImage ? [
          `Looks like ${sdkLanguage === "javascript" ? "Playwright Test or " : ""}Playwright was just updated to ${preferredDockerVersion.driverVersion}.`,
          `Please update docker image as well.`,
          `-  current: ${currentDockerVersion.dockerImageName}`,
          `- required: ${preferredDockerVersion.dockerImageName}`,
          ``,
          `<3 Playwright Team`
        ].join("\n") : [
          `Looks like ${sdkLanguage === "javascript" ? "Playwright Test or " : ""}Playwright was just installed or updated.`,
          `Please run the following command to download new browser${installByDefault ? "s" : ""}:`,
          ``,
          `    ${installCommand}`,
          ``,
          `<3 Playwright Team`
        ].join("\n");
        throw new Error(`Executable doesn't exist at ${e}
${(0, import_ascii.wrapInASCIIBox)(prettyMessage, 1)}`);
      }
      return e;
    };
    this._executables = [];
    const chromium = descriptors.find((d) => d.name === "chromium");
    const chromiumExecutable = findExecutablePath(chromium.dir, "chromium");
    this._executables.push({
      name: "chromium",
      browserName: "chromium",
      directory: chromium.dir,
      executablePath: () => chromiumExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("chromium", chromiumExecutable, chromium.installByDefault, sdkLanguage),
      installType: chromium.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: (sdkLanguage) => this._validateHostRequirements(sdkLanguage, chromium.dir, ["chrome-linux"], [], ["chrome-win"]),
      downloadURLs: this._downloadURLs(chromium),
      title: chromium.title,
      revision: chromium.revision,
      browserVersion: chromium.browserVersion,
      _install: (force) => this._downloadExecutable(chromium, force, chromiumExecutable),
      _dependencyGroup: "chromium",
      _isHermeticInstallation: true
    });
    const chromiumHeadlessShell = descriptors.find((d) => d.name === "chromium-headless-shell");
    const chromiumHeadlessShellExecutable = findExecutablePath(chromiumHeadlessShell.dir, "chromium-headless-shell");
    this._executables.push({
      name: "chromium-headless-shell",
      browserName: "chromium",
      directory: chromiumHeadlessShell.dir,
      executablePath: () => chromiumHeadlessShellExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("chromium", chromiumHeadlessShellExecutable, chromiumHeadlessShell.installByDefault, sdkLanguage),
      installType: chromiumHeadlessShell.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: (sdkLanguage) => this._validateHostRequirements(sdkLanguage, chromiumHeadlessShell.dir, ["chrome-linux"], [], ["chrome-win"]),
      downloadURLs: this._downloadURLs(chromiumHeadlessShell),
      title: chromiumHeadlessShell.title,
      revision: chromiumHeadlessShell.revision,
      browserVersion: chromiumHeadlessShell.browserVersion,
      _install: (force) => this._downloadExecutable(chromiumHeadlessShell, force, chromiumHeadlessShellExecutable),
      _dependencyGroup: "chromium",
      _isHermeticInstallation: true
    });
    const chromiumTipOfTreeHeadlessShell = descriptors.find((d) => d.name === "chromium-tip-of-tree-headless-shell");
    const chromiumTipOfTreeHeadlessShellExecutable = findExecutablePath(chromiumTipOfTreeHeadlessShell.dir, "chromium-tip-of-tree-headless-shell");
    this._executables.push({
      name: "chromium-tip-of-tree-headless-shell",
      browserName: "chromium",
      directory: chromiumTipOfTreeHeadlessShell.dir,
      executablePath: () => chromiumTipOfTreeHeadlessShellExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("chromium", chromiumTipOfTreeHeadlessShellExecutable, chromiumTipOfTreeHeadlessShell.installByDefault, sdkLanguage),
      installType: chromiumTipOfTreeHeadlessShell.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: (sdkLanguage) => this._validateHostRequirements(sdkLanguage, chromiumTipOfTreeHeadlessShell.dir, ["chrome-linux"], [], ["chrome-win"]),
      downloadURLs: this._downloadURLs(chromiumTipOfTreeHeadlessShell),
      title: chromiumTipOfTreeHeadlessShell.title,
      revision: chromiumTipOfTreeHeadlessShell.revision,
      browserVersion: chromiumTipOfTreeHeadlessShell.browserVersion,
      _install: (force) => this._downloadExecutable(chromiumTipOfTreeHeadlessShell, force, chromiumTipOfTreeHeadlessShellExecutable),
      _dependencyGroup: "chromium",
      _isHermeticInstallation: true
    });
    const chromiumTipOfTree = descriptors.find((d) => d.name === "chromium-tip-of-tree");
    const chromiumTipOfTreeExecutable = findExecutablePath(chromiumTipOfTree.dir, "chromium-tip-of-tree");
    this._executables.push({
      name: "chromium-tip-of-tree",
      browserName: "chromium",
      directory: chromiumTipOfTree.dir,
      executablePath: () => chromiumTipOfTreeExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("chromium-tip-of-tree", chromiumTipOfTreeExecutable, chromiumTipOfTree.installByDefault, sdkLanguage),
      installType: chromiumTipOfTree.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: (sdkLanguage) => this._validateHostRequirements(sdkLanguage, chromiumTipOfTree.dir, ["chrome-linux"], [], ["chrome-win"]),
      downloadURLs: this._downloadURLs(chromiumTipOfTree),
      title: chromiumTipOfTree.title,
      revision: chromiumTipOfTree.revision,
      browserVersion: chromiumTipOfTree.browserVersion,
      _install: (force) => this._downloadExecutable(chromiumTipOfTree, force, chromiumTipOfTreeExecutable),
      _dependencyGroup: "chromium",
      _isHermeticInstallation: true
    });
    this._executables.push(this._createChromiumChannel("chrome", {
      "linux": "/opt/google/chrome/chrome",
      "darwin": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "win32": `\\Google\\Chrome\\Application\\chrome.exe`
    }, () => this._installChromiumChannel("chrome", {
      "linux": "reinstall_chrome_stable_linux.sh",
      "darwin": "reinstall_chrome_stable_mac.sh",
      "win32": "reinstall_chrome_stable_win.ps1"
    })));
    this._executables.push(this._createChromiumChannel("chrome-beta", {
      "linux": "/opt/google/chrome-beta/chrome",
      "darwin": "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
      "win32": `\\Google\\Chrome Beta\\Application\\chrome.exe`
    }, () => this._installChromiumChannel("chrome-beta", {
      "linux": "reinstall_chrome_beta_linux.sh",
      "darwin": "reinstall_chrome_beta_mac.sh",
      "win32": "reinstall_chrome_beta_win.ps1"
    })));
    this._executables.push(this._createChromiumChannel("chrome-dev", {
      "linux": "/opt/google/chrome-unstable/chrome",
      "darwin": "/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev",
      "win32": `\\Google\\Chrome Dev\\Application\\chrome.exe`
    }));
    this._executables.push(this._createChromiumChannel("chrome-canary", {
      "linux": "/opt/google/chrome-canary/chrome",
      "darwin": "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "win32": `\\Google\\Chrome SxS\\Application\\chrome.exe`
    }));
    this._executables.push(this._createChromiumChannel("msedge", {
      "linux": "/opt/microsoft/msedge/msedge",
      "darwin": "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "win32": `\\Microsoft\\Edge\\Application\\msedge.exe`
    }, () => this._installMSEdgeChannel("msedge", {
      "linux": "reinstall_msedge_stable_linux.sh",
      "darwin": "reinstall_msedge_stable_mac.sh",
      "win32": "reinstall_msedge_stable_win.ps1"
    })));
    this._executables.push(this._createChromiumChannel("msedge-beta", {
      "linux": "/opt/microsoft/msedge-beta/msedge",
      "darwin": "/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta",
      "win32": `\\Microsoft\\Edge Beta\\Application\\msedge.exe`
    }, () => this._installMSEdgeChannel("msedge-beta", {
      "darwin": "reinstall_msedge_beta_mac.sh",
      "linux": "reinstall_msedge_beta_linux.sh",
      "win32": "reinstall_msedge_beta_win.ps1"
    })));
    this._executables.push(this._createChromiumChannel("msedge-dev", {
      "linux": "/opt/microsoft/msedge-dev/msedge",
      "darwin": "/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev",
      "win32": `\\Microsoft\\Edge Dev\\Application\\msedge.exe`
    }, () => this._installMSEdgeChannel("msedge-dev", {
      "darwin": "reinstall_msedge_dev_mac.sh",
      "linux": "reinstall_msedge_dev_linux.sh",
      "win32": "reinstall_msedge_dev_win.ps1"
    })));
    this._executables.push(this._createChromiumChannel("msedge-canary", {
      "linux": "",
      "darwin": "/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary",
      "win32": `\\Microsoft\\Edge SxS\\Application\\msedge.exe`
    }));
    this._executables.push(this._createBidiFirefoxChannel("moz-firefox", {
      "linux": "/snap/bin/firefox",
      "darwin": "/Applications/Firefox.app/Contents/MacOS/firefox",
      "win32": "\\Mozilla Firefox\\firefox.exe"
    }));
    this._executables.push(this._createBidiFirefoxChannel("moz-firefox-beta", {
      "linux": "/opt/firefox-beta/firefox",
      "darwin": "/Applications/Firefox.app/Contents/MacOS/firefox",
      "win32": "\\Mozilla Firefox\\firefox.exe"
    }));
    this._executables.push(this._createBidiFirefoxChannel("moz-firefox-nightly", {
      "linux": "/opt/firefox-nightly/firefox",
      "darwin": "/Applications/Firefox Nightly.app/Contents/MacOS/firefox",
      "win32": "\\Mozilla Firefox\\firefox.exe"
    }));
    this._executables.push(this._createBidiChromiumChannel("bidi-chrome-stable", {
      "linux": "/opt/google/chrome/chrome",
      "darwin": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "win32": `\\Google\\Chrome\\Application\\chrome.exe`
    }));
    this._executables.push(this._createBidiChromiumChannel("bidi-chrome-canary", {
      "linux": "/opt/google/chrome-canary/chrome",
      "darwin": "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "win32": `\\Google\\Chrome SxS\\Application\\chrome.exe`
    }));
    const firefox = descriptors.find((d) => d.name === "firefox");
    const firefoxExecutable = findExecutablePath(firefox.dir, "firefox");
    this._executables.push({
      name: "firefox",
      browserName: "firefox",
      directory: firefox.dir,
      executablePath: () => firefoxExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("firefox", firefoxExecutable, firefox.installByDefault, sdkLanguage),
      installType: firefox.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: (sdkLanguage) => this._validateHostRequirements(sdkLanguage, firefox.dir, ["firefox"], [], ["firefox"]),
      downloadURLs: this._downloadURLs(firefox),
      title: firefox.title,
      revision: firefox.revision,
      browserVersion: firefox.browserVersion,
      _install: (force) => this._downloadExecutable(firefox, force, firefoxExecutable),
      _dependencyGroup: "firefox",
      _isHermeticInstallation: true
    });
    const firefoxBeta = descriptors.find((d) => d.name === "firefox-beta");
    const firefoxBetaExecutable = findExecutablePath(firefoxBeta.dir, "firefox");
    this._executables.push({
      name: "firefox-beta",
      browserName: "firefox",
      directory: firefoxBeta.dir,
      executablePath: () => firefoxBetaExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("firefox-beta", firefoxBetaExecutable, firefoxBeta.installByDefault, sdkLanguage),
      installType: firefoxBeta.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: (sdkLanguage) => this._validateHostRequirements(sdkLanguage, firefoxBeta.dir, ["firefox"], [], ["firefox"]),
      downloadURLs: this._downloadURLs(firefoxBeta),
      title: firefoxBeta.title,
      revision: firefoxBeta.revision,
      browserVersion: firefoxBeta.browserVersion,
      _install: (force) => this._downloadExecutable(firefoxBeta, force, firefoxBetaExecutable),
      _dependencyGroup: "firefox",
      _isHermeticInstallation: true
    });
    const webkit = descriptors.find((d) => d.name === "webkit");
    const webkitExecutable = findExecutablePath(webkit.dir, "webkit");
    const webkitLinuxLddDirectories = [
      import_path.default.join("minibrowser-gtk"),
      import_path.default.join("minibrowser-gtk", "bin"),
      import_path.default.join("minibrowser-gtk", "lib"),
      import_path.default.join("minibrowser-gtk", "sys", "lib"),
      import_path.default.join("minibrowser-wpe"),
      import_path.default.join("minibrowser-wpe", "bin"),
      import_path.default.join("minibrowser-wpe", "lib"),
      import_path.default.join("minibrowser-wpe", "sys", "lib")
    ];
    this._executables.push({
      name: "webkit",
      browserName: "webkit",
      directory: webkit.dir,
      executablePath: () => webkitExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("webkit", webkitExecutable, webkit.installByDefault, sdkLanguage),
      installType: webkit.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: (sdkLanguage) => this._validateHostRequirements(sdkLanguage, webkit.dir, webkitLinuxLddDirectories, ["libGLESv2.so.2", "libx264.so"], [""]),
      downloadURLs: this._downloadURLs(webkit),
      title: webkit.title,
      revision: webkit.revision,
      browserVersion: webkit.browserVersion,
      _install: (force) => this._downloadExecutable(webkit, force, webkitExecutable),
      _dependencyGroup: "webkit",
      _isHermeticInstallation: true
    });
    this._executables.push({
      name: "webkit-wsl",
      browserName: "webkit",
      directory: webkit.dir,
      executablePath: () => webkitExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("webkit", webkitExecutable, webkit.installByDefault, sdkLanguage),
      installType: "download-on-demand",
      title: "Webkit in WSL",
      _validateHostRequirements: (sdkLanguage) => Promise.resolve(),
      _isHermeticInstallation: true,
      _install: async () => {
        if (process.platform !== "win32")
          throw new Error(`WebKit via WSL is only supported on Windows`);
        const script = import_path.default.join(BIN_PATH, "install_webkit_wsl.ps1");
        const { code } = await (0, import_spawnAsync.spawnAsync)("powershell.exe", [
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          script
        ], {
          stdio: "inherit"
        });
        if (code !== 0)
          throw new Error(`Failed to install WebKit via WSL`);
      }
    });
    const ffmpeg = descriptors.find((d) => d.name === "ffmpeg");
    const ffmpegExecutable = findExecutablePath(ffmpeg.dir, "ffmpeg");
    this._executables.push({
      name: "ffmpeg",
      browserName: void 0,
      directory: ffmpeg.dir,
      executablePath: () => ffmpegExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("ffmpeg", ffmpegExecutable, ffmpeg.installByDefault, sdkLanguage),
      installType: ffmpeg.installByDefault ? "download-by-default" : "download-on-demand",
      _validateHostRequirements: () => Promise.resolve(),
      downloadURLs: this._downloadURLs(ffmpeg),
      title: ffmpeg.title,
      revision: ffmpeg.revision,
      _install: (force) => this._downloadExecutable(ffmpeg, force, ffmpegExecutable),
      _dependencyGroup: "tools",
      _isHermeticInstallation: true
    });
    const winldd = descriptors.find((d) => d.name === "winldd");
    const winlddExecutable = findExecutablePath(winldd.dir, "winldd");
    this._executables.push({
      name: "winldd",
      browserName: void 0,
      directory: winldd.dir,
      executablePath: () => winlddExecutable,
      executablePathOrDie: (sdkLanguage) => executablePathOrDie("winldd", winlddExecutable, winldd.installByDefault, sdkLanguage),
      installType: process.platform === "win32" ? "download-by-default" : "none",
      _validateHostRequirements: () => Promise.resolve(),
      downloadURLs: this._downloadURLs(winldd),
      title: winldd.title,
      revision: winldd.revision,
      _install: (force) => this._downloadExecutable(winldd, force, winlddExecutable),
      _dependencyGroup: "tools",
      _isHermeticInstallation: true
    });
    const android = descriptors.find((d) => d.name === "android");
    this._executables.push({
      name: "android",
      browserName: void 0,
      directory: android.dir,
      executablePath: () => void 0,
      executablePathOrDie: () => "",
      installType: "download-on-demand",
      _validateHostRequirements: () => Promise.resolve(),
      downloadURLs: this._downloadURLs(android),
      title: android.title,
      revision: android.revision,
      _install: (force) => this._downloadExecutable(android, force),
      _dependencyGroup: "tools",
      _isHermeticInstallation: true
    });
  }
  _createChromiumChannel(name, lookAt, install) {
    const executablePath = (sdkLanguage, shouldThrow) => {
      const suffix = lookAt[process.platform];
      if (!suffix) {
        if (shouldThrow)
          throw new Error(`Chromium distribution '${name}' is not supported on ${process.platform}`);
        return void 0;
      }
      const prefixes = process.platform === "win32" ? [
        process.env.LOCALAPPDATA,
        process.env.PROGRAMFILES,
        process.env["PROGRAMFILES(X86)"],
        // In some cases there is no PROGRAMFILES/(86) env var set but HOMEDRIVE is set.
        process.env.HOMEDRIVE + "\\Program Files",
        process.env.HOMEDRIVE + "\\Program Files (x86)"
      ].filter(Boolean) : [""];
      for (const prefix of prefixes) {
        const executablePath2 = import_path.default.join(prefix, suffix);
        if ((0, import_fileUtils.canAccessFile)(executablePath2))
          return executablePath2;
      }
      if (!shouldThrow)
        return void 0;
      const location = prefixes.length ? ` at ${import_path.default.join(prefixes[0], suffix)}` : ``;
      const installation = install ? `
Run "${buildPlaywrightCLICommand(sdkLanguage, "install " + name)}"` : "";
      throw new Error(`Chromium distribution '${name}' is not found${location}${installation}`);
    };
    return {
      name,
      browserName: "chromium",
      directory: void 0,
      executablePath: (sdkLanguage) => executablePath(sdkLanguage, false),
      executablePathOrDie: (sdkLanguage) => executablePath(sdkLanguage, true),
      installType: install ? "install-script" : "none",
      _validateHostRequirements: () => Promise.resolve(),
      _isHermeticInstallation: false,
      _install: install
    };
  }
  _createBidiFirefoxChannel(name, lookAt, install) {
    const executablePath = (sdkLanguage, shouldThrow) => {
      const suffix = lookAt[process.platform];
      if (!suffix) {
        if (shouldThrow)
          throw new Error(`Firefox distribution '${name}' is not supported on ${process.platform}`);
        return void 0;
      }
      const prefixes = process.platform === "win32" ? [
        process.env.LOCALAPPDATA,
        process.env.PROGRAMFILES,
        process.env["PROGRAMFILES(X86)"],
        // In some cases there is no PROGRAMFILES/(86) env var set but HOMEDRIVE is set.
        process.env.HOMEDRIVE + "\\Program Files",
        process.env.HOMEDRIVE + "\\Program Files (x86)"
      ].filter(Boolean) : [""];
      for (const prefix of prefixes) {
        const executablePath2 = import_path.default.join(prefix, suffix);
        if ((0, import_fileUtils.canAccessFile)(executablePath2))
          return executablePath2;
      }
      if (shouldThrow)
        throw new Error(`Cannot find Firefox installation for channel '${name}' at the standard system paths. ${`Tried paths:
  ${prefixes.map((p) => import_path.default.join(p, suffix)).join("\n  ")}`}`);
      return void 0;
    };
    return {
      name,
      browserName: "firefox",
      directory: void 0,
      executablePath: (sdkLanguage) => executablePath(sdkLanguage, false),
      executablePathOrDie: (sdkLanguage) => executablePath(sdkLanguage, true),
      installType: "none",
      _validateHostRequirements: () => Promise.resolve(),
      _isHermeticInstallation: true,
      _install: install
    };
  }
  _createBidiChromiumChannel(name, lookAt) {
    const executablePath = (sdkLanguage, shouldThrow) => {
      const suffix = lookAt[process.platform];
      if (!suffix) {
        if (shouldThrow)
          throw new Error(`Chromium distribution '${name}' is not supported on ${process.platform}`);
        return void 0;
      }
      const prefixes = process.platform === "win32" ? [
        process.env.LOCALAPPDATA,
        process.env.PROGRAMFILES,
        process.env["PROGRAMFILES(X86)"],
        // In some cases there is no PROGRAMFILES/(86) env var set but HOMEDRIVE is set.
        process.env.HOMEDRIVE + "\\Program Files",
        process.env.HOMEDRIVE + "\\Program Files (x86)"
      ].filter(Boolean) : [""];
      for (const prefix of prefixes) {
        const executablePath2 = import_path.default.join(prefix, suffix);
        if ((0, import_fileUtils.canAccessFile)(executablePath2))
          return executablePath2;
      }
      if (!shouldThrow)
        return void 0;
      const location = prefixes.length ? ` at ${import_path.default.join(prefixes[0], suffix)}` : ``;
      throw new Error(`Chromium distribution '${name}' is not found${location}`);
    };
    return {
      name,
      browserName: "chromium",
      directory: void 0,
      executablePath: (sdkLanguage) => executablePath(sdkLanguage, false),
      executablePathOrDie: (sdkLanguage) => executablePath(sdkLanguage, true),
      installType: "none",
      _validateHostRequirements: () => Promise.resolve(),
      _isHermeticInstallation: false
    };
  }
  executables() {
    return this._executables;
  }
  findExecutable(name) {
    return this._executables.find((b) => b.name === name);
  }
  defaultExecutables() {
    return this._executables.filter((e) => e.installType === "download-by-default");
  }
  _dedupe(executables) {
    return Array.from(new Set(executables));
  }
  async _validateHostRequirements(sdkLanguage, browserDirectory, linuxLddDirectories, dlOpenLibraries, windowsExeAndDllDirectories) {
    if (import_os.default.platform() === "linux")
      return await (0, import_dependencies2.validateDependenciesLinux)(sdkLanguage, linuxLddDirectories.map((d) => import_path.default.join(browserDirectory, d)), dlOpenLibraries);
    if (import_os.default.platform() === "win32" && import_os.default.arch() === "x64")
      return await (0, import_dependencies2.validateDependenciesWindows)(sdkLanguage, windowsExeAndDllDirectories.map((d) => import_path.default.join(browserDirectory, d)));
  }
  async installDeps(executablesToInstallDeps, dryRun) {
    const executables = this._dedupe(executablesToInstallDeps);
    const targets = /* @__PURE__ */ new Set();
    for (const executable of executables) {
      if (executable._dependencyGroup)
        targets.add(executable._dependencyGroup);
    }
    targets.add("tools");
    if (import_os.default.platform() === "win32")
      return await (0, import_dependencies2.installDependenciesWindows)(targets, dryRun);
    if (import_os.default.platform() === "linux")
      return await (0, import_dependencies2.installDependenciesLinux)(targets, dryRun);
  }
  async install(executablesToInstall, options) {
    const executables = this._dedupe(executablesToInstall);
    await import_fs.default.promises.mkdir(registryDirectory, { recursive: true });
    const lockfilePath = import_path.default.join(registryDirectory, "__dirlock");
    const linksDir = import_path.default.join(registryDirectory, ".links");
    let releaseLock;
    try {
      releaseLock = await import_utilsBundle.lockfile.lock(registryDirectory, {
        retries: {
          // Retry 20 times during 10 minutes with
          // exponential back-off.
          // See documentation at: https://www.npmjs.com/package/retry#retrytimeoutsoptions
          retries: 20,
          factor: 1.27579
        },
        onCompromised: (err) => {
          throw new Error(`${err.message} Path: ${lockfilePath}`);
        },
        lockfilePath
      });
      await import_fs.default.promises.mkdir(linksDir, { recursive: true });
      await import_fs.default.promises.writeFile(import_path.default.join(linksDir, (0, import_utils.calculateSha1)(PACKAGE_PATH)), PACKAGE_PATH);
      if (!(0, import_utils.getAsBooleanFromENV)("PLAYWRIGHT_SKIP_BROWSER_GC"))
        await this._validateInstallationCache(linksDir);
      for (const executable of executables) {
        if (!executable._install)
          throw new Error(`ERROR: Playwright does not support installing ${executable.name}`);
        const { embedderName } = (0, import_userAgent.getEmbedderName)();
        if (!(0, import_utils.getAsBooleanFromENV)("CI") && !executable._isHermeticInstallation && !options?.force && executable.executablePath(embedderName)) {
          const command = buildPlaywrightCLICommand(embedderName, "install --force " + executable.name);
          process.stderr.write("\n" + (0, import_ascii.wrapInASCIIBox)([
            `ATTENTION: "${executable.name}" is already installed on the system!`,
            ``,
            `"${executable.name}" installation is not hermetic; installing newer version`,
            `requires *removal* of a current installation first.`,
            ``,
            `To *uninstall* current version and re-install latest "${executable.name}":`,
            ``,
            `- Close all running instances of "${executable.name}", if any`,
            `- Use "--force" to install browser:`,
            ``,
            `    ${command}`,
            ``,
            `<3 Playwright Team`
          ].join("\n"), 1) + "\n\n");
          return;
        }
        await executable._install(!!options?.force);
      }
    } catch (e) {
      if (e.code === "ELOCKED") {
        const rmCommand = process.platform === "win32" ? "rm -R" : "rm -rf";
        throw new Error("\n" + (0, import_ascii.wrapInASCIIBox)([
          `An active lockfile is found at:`,
          ``,
          `  ${lockfilePath}`,
          ``,
          `Either:`,
          `- wait a few minutes if other Playwright is installing browsers in parallel`,
          `- remove lock manually with:`,
          ``,
          `    ${rmCommand} ${lockfilePath}`,
          ``,
          `<3 Playwright Team`
        ].join("\n"), 1));
      } else {
        throw e;
      }
    } finally {
      if (releaseLock)
        await releaseLock();
    }
  }
  async uninstall(all) {
    const linksDir = import_path.default.join(registryDirectory, ".links");
    if (all) {
      const links = await import_fs.default.promises.readdir(linksDir).catch(() => []);
      for (const link of links)
        await import_fs.default.promises.unlink(import_path.default.join(linksDir, link));
    } else {
      await import_fs.default.promises.unlink(import_path.default.join(linksDir, (0, import_utils.calculateSha1)(PACKAGE_PATH))).catch(() => {
      });
    }
    await this._validateInstallationCache(linksDir);
    return {
      numberOfBrowsersLeft: (await import_fs.default.promises.readdir(registryDirectory).catch(() => [])).filter((browserDirectory) => isBrowserDirectory(browserDirectory)).length
    };
  }
  async validateHostRequirementsForExecutablesIfNeeded(executables, sdkLanguage) {
    if ((0, import_utils.getAsBooleanFromENV)("PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS")) {
      process.stderr.write("Skipping host requirements validation logic because `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS` env variable is set.\n");
      return;
    }
    for (const executable of executables)
      await this._validateHostRequirementsForExecutableIfNeeded(executable, sdkLanguage);
  }
  async _validateHostRequirementsForExecutableIfNeeded(executable, sdkLanguage) {
    const kMaximumReValidationPeriod = 30 * 24 * 60 * 60 * 1e3;
    if (!executable.directory)
      return;
    const markerFile = import_path.default.join(executable.directory, "DEPENDENCIES_VALIDATED");
    if (await import_fs.default.promises.stat(markerFile).then((stat) => Date.now() - stat.mtime.getTime() < kMaximumReValidationPeriod).catch(() => false))
      return;
    import_debugLogger.debugLogger.log("install", `validating host requirements for "${executable.name}"`);
    try {
      await executable._validateHostRequirements(sdkLanguage);
      import_debugLogger.debugLogger.log("install", `validation passed for ${executable.name}`);
    } catch (error) {
      import_debugLogger.debugLogger.log("install", `validation failed for ${executable.name}`);
      throw error;
    }
    await import_fs.default.promises.writeFile(markerFile, "").catch(() => {
    });
  }
  _downloadURLs(descriptor) {
    const paths = DOWNLOAD_PATHS[descriptor.name];
    const downloadPathTemplate = paths[import_hostPlatform.hostPlatform] || paths["<unknown>"];
    if (!downloadPathTemplate)
      return [];
    let downloadPath;
    let mirrors;
    if (typeof downloadPathTemplate === "function") {
      const result = downloadPathTemplate(descriptor);
      downloadPath = result.path;
      mirrors = result.mirrors;
    } else {
      downloadPath = util.format(downloadPathTemplate, descriptor.revision);
      mirrors = PLAYWRIGHT_CDN_MIRRORS;
    }
    let downloadHostEnv;
    if (descriptor.name.startsWith("chromium"))
      downloadHostEnv = "PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST";
    else if (descriptor.name.startsWith("firefox"))
      downloadHostEnv = "PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST";
    else if (descriptor.name.startsWith("webkit"))
      downloadHostEnv = "PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST";
    const customHostOverride = downloadHostEnv && (0, import_utils.getFromENV)(downloadHostEnv) || (0, import_utils.getFromENV)("PLAYWRIGHT_DOWNLOAD_HOST");
    if (customHostOverride)
      mirrors = [customHostOverride];
    return mirrors.map((mirror) => `${mirror}/${downloadPath}`);
  }
  async _downloadExecutable(descriptor, force, executablePath) {
    const downloadURLs = this._downloadURLs(descriptor);
    if (!downloadURLs.length)
      throw new Error(`ERROR: Playwright does not support ${descriptor.name} on ${import_hostPlatform.hostPlatform}`);
    if (!import_hostPlatform.isOfficiallySupportedPlatform)
      (0, import_browserFetcher.logPolitely)(`BEWARE: your OS is not officially supported by Playwright; downloading fallback build for ${import_hostPlatform.hostPlatform}.`);
    if (descriptor.hasRevisionOverride) {
      const message = `You are using a frozen ${descriptor.name} browser which does not receive updates anymore on ${import_hostPlatform.hostPlatform}. Please update to the latest version of your operating system to test up-to-date browsers.`;
      if (process.env.GITHUB_ACTIONS)
        console.log(`::warning title=Playwright::${message}`);
      else
        (0, import_browserFetcher.logPolitely)(message);
    }
    const title = this.calculateDownloadTitle(descriptor);
    const downloadFileName = `playwright-download-${descriptor.name}-${import_hostPlatform.hostPlatform}-${descriptor.revision}.zip`;
    const downloadSocketTimeoutEnv = (0, import_utils.getFromENV)("PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT");
    const downloadSocketTimeout = +(downloadSocketTimeoutEnv || "0") || import_network.NET_DEFAULT_TIMEOUT;
    await (0, import_browserFetcher.downloadBrowserWithProgressBar)(title, descriptor.dir, executablePath, downloadURLs, downloadFileName, downloadSocketTimeout, force).catch((e) => {
      throw new Error(`Failed to download ${title}, caused by
${e.stack}`);
    });
  }
  calculateDownloadTitle(descriptor) {
    const title = descriptor.title ?? descriptor.name.split("-").map((word) => {
      return word === "ffmpeg" ? "FFmpeg" : word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");
    const version = descriptor.browserVersion ? " " + descriptor.browserVersion : "";
    return `${title}${version} (playwright ${descriptor.name} v${descriptor.revision})`;
  }
  async _installMSEdgeChannel(channel, scripts) {
    const scriptArgs = [];
    if (process.platform !== "linux") {
      const products = lowercaseAllKeys(JSON.parse(await (0, import_network.fetchData)(void 0, { url: "https://edgeupdates.microsoft.com/api/products" })));
      const productName = {
        "msedge": "Stable",
        "msedge-beta": "Beta",
        "msedge-dev": "Dev"
      }[channel];
      const product = products.find((product2) => product2.product === productName);
      const searchConfig = {
        darwin: { platform: "MacOS", arch: "universal", artifact: "pkg" },
        win32: { platform: "Windows", arch: "x64", artifact: "msi" }
      }[process.platform];
      const release = searchConfig ? product.releases.find((release2) => release2.platform === searchConfig.platform && release2.architecture === searchConfig.arch && release2.artifacts.length > 0) : null;
      const artifact = release ? release.artifacts.find((artifact2) => artifact2.artifactname === searchConfig.artifact) : null;
      if (artifact)
        scriptArgs.push(
          artifact.location
          /* url */
        );
      else
        throw new Error(`Cannot install ${channel} on ${process.platform}`);
    }
    await this._installChromiumChannel(channel, scripts, scriptArgs);
  }
  async _installChromiumChannel(channel, scripts, scriptArgs = []) {
    const scriptName = scripts[process.platform];
    if (!scriptName)
      throw new Error(`Cannot install ${channel} on ${process.platform}`);
    const cwd = BIN_PATH;
    const isPowerShell = scriptName.endsWith(".ps1");
    if (isPowerShell) {
      const args = [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        import_path.default.join(BIN_PATH, scriptName),
        ...scriptArgs
      ];
      const { code } = await (0, import_spawnAsync.spawnAsync)("powershell.exe", args, { cwd, stdio: "inherit" });
      if (code !== 0)
        throw new Error(`Failed to install ${channel}`);
    } else {
      const { command, args, elevatedPermissions } = await (0, import_dependencies.transformCommandsForRoot)([`bash "${import_path.default.join(BIN_PATH, scriptName)}" ${scriptArgs.join("")}`]);
      if (elevatedPermissions)
        console.log("Switching to root user to install dependencies...");
      const { code } = await (0, import_spawnAsync.spawnAsync)(command, args, { cwd, stdio: "inherit" });
      if (code !== 0)
        throw new Error(`Failed to install ${channel}`);
    }
  }
  async listInstalledBrowsers() {
    const linksDir = import_path.default.join(registryDirectory, ".links");
    const { browsers } = await this._traverseBrowserInstallations(linksDir);
    return browsers.filter((browser) => import_fs.default.existsSync(browser.browserPath));
  }
  async _validateInstallationCache(linksDir) {
    const { browsers, brokenLinks } = await this._traverseBrowserInstallations(linksDir);
    await this._deleteStaleBrowsers(browsers);
    await this._deleteBrokenInstallations(brokenLinks);
  }
  async _traverseBrowserInstallations(linksDir) {
    const browserList = [];
    const brokenLinks = [];
    for (const fileName of await import_fs.default.promises.readdir(linksDir)) {
      const linkPath = import_path.default.join(linksDir, fileName);
      let linkTarget = "";
      try {
        linkTarget = (await import_fs.default.promises.readFile(linkPath)).toString();
        const browsersJSON = require(import_path.default.join(linkTarget, "browsers.json"));
        const descriptors = readDescriptors(browsersJSON);
        for (const browserName of allDownloadableDirectoriesThatEverExisted) {
          const descriptor = descriptors.find((d) => d.name === browserName);
          if (!descriptor)
            continue;
          const browserPath = descriptor.dir;
          const browserVersion = parseInt(descriptor.revision, 10);
          browserList.push({
            browserName,
            browserVersion,
            browserPath,
            referenceDir: linkTarget
          });
        }
      } catch (e) {
        brokenLinks.push(linkPath);
      }
    }
    return { browsers: browserList, brokenLinks };
  }
  async _deleteStaleBrowsers(browserList) {
    const usedBrowserPaths = /* @__PURE__ */ new Set();
    for (const browser of browserList) {
      const { browserName, browserVersion, browserPath } = browser;
      const shouldHaveMarkerFile = browserName === "chromium" && (browserVersion >= 786218 || browserVersion < 3e5) || browserName === "firefox" && browserVersion >= 1128 || browserName === "webkit" && browserVersion >= 1307 || // All new applications have a marker file right away.
      browserName !== "firefox" && browserName !== "chromium" && browserName !== "webkit";
      if (!shouldHaveMarkerFile || await (0, import_fileUtils.existsAsync)(browserDirectoryToMarkerFilePath(browserPath)))
        usedBrowserPaths.add(browserPath);
    }
    let downloadedBrowsers = (await import_fs.default.promises.readdir(registryDirectory)).map((file) => import_path.default.join(registryDirectory, file));
    downloadedBrowsers = downloadedBrowsers.filter((file) => isBrowserDirectory(file));
    const directories = new Set(downloadedBrowsers);
    for (const browserDirectory of usedBrowserPaths)
      directories.delete(browserDirectory);
    for (const directory of directories)
      (0, import_browserFetcher.logPolitely)("Removing unused browser at " + directory);
    await (0, import_fileUtils.removeFolders)([...directories]);
  }
  async _deleteBrokenInstallations(brokenLinks) {
    for (const linkPath of brokenLinks)
      await import_fs.default.promises.unlink(linkPath).catch((e) => {
      });
  }
  _defaultBrowsersToInstall(options) {
    let executables = this.defaultExecutables();
    if (options.shell === "no")
      executables = executables.filter((e) => e.name !== "chromium-headless-shell" && e.name !== "chromium-tip-of-tree-headless-shell");
    if (options.shell === "only")
      executables = executables.filter((e) => e.name !== "chromium" && e.name !== "chromium-tip-of-tree");
    return executables;
  }
  suggestedBrowsersToInstall() {
    const names = this.executables().filter((e) => e.installType !== "none").map((e) => e.name);
    names.push(...chromiumAliases);
    return names.sort().join(", ");
  }
  isChromiumAlias(name) {
    return chromiumAliases.includes(name);
  }
  resolveBrowsers(aliases, options) {
    if (aliases.length === 0)
      return this._defaultBrowsersToInstall(options);
    const faultyArguments = [];
    const executables = [];
    const handleArgument = (arg) => {
      const executable = this.findExecutable(arg);
      if (!executable || executable.installType === "none")
        faultyArguments.push(arg);
      else
        executables.push(executable);
      if (executable?.browserName)
        executables.push(this.findExecutable("ffmpeg"));
    };
    for (const alias of aliases) {
      if (alias === "chromium" || chromiumAliases.includes(alias)) {
        if (options.shell !== "only")
          handleArgument("chromium");
        if (options.shell !== "no")
          handleArgument("chromium-headless-shell");
      } else if (alias === "chromium-tip-of-tree") {
        if (options.shell !== "only")
          handleArgument("chromium-tip-of-tree");
        if (options.shell !== "no")
          handleArgument("chromium-tip-of-tree-headless-shell");
      } else {
        handleArgument(alias);
      }
    }
    if (process.platform === "win32")
      executables.push(this.findExecutable("winldd"));
    if (faultyArguments.length)
      throw new Error(`Invalid installation targets: ${faultyArguments.map((name) => `'${name}'`).join(", ")}. Expecting one of: ${this.suggestedBrowsersToInstall()}`);
    return executables;
  }
}
function browserDirectoryToMarkerFilePath(browserDirectory) {
  return import_path.default.join(browserDirectory, "INSTALLATION_COMPLETE");
}
function buildPlaywrightCLICommand(sdkLanguage, parameters) {
  switch (sdkLanguage) {
    case "python":
      return `playwright ${parameters}`;
    case "java":
      return `mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI -D exec.args="${parameters}"`;
    case "csharp":
      return `pwsh bin/Debug/netX/playwright.ps1 ${parameters}`;
    default: {
      const packageManagerCommand = (0, import_utils.getPackageManagerExecCommand)();
      return `${packageManagerCommand} playwright ${parameters}`;
    }
  }
}
async function installBrowsersForNpmInstall(browsers) {
  if ((0, import_utils.getAsBooleanFromENV)("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD")) {
    (0, import_browserFetcher.logPolitely)("Skipping browsers download because `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` env variable is set");
    return false;
  }
  const executables = [];
  if (process.platform === "win32")
    executables.push(registry.findExecutable("winldd"));
  for (const browserName of browsers) {
    const executable = registry.findExecutable(browserName);
    if (!executable || executable.installType === "none")
      throw new Error(`Cannot install ${browserName}`);
    executables.push(executable);
  }
  await registry.install(executables);
}
function findChromiumChannelBestEffort(sdkLanguage) {
  let channel = null;
  for (const name of ["chromium", "chrome", "msedge"]) {
    try {
      registry.findExecutable(name).executablePathOrDie(sdkLanguage);
      channel = name === "chromium" ? void 0 : name;
      break;
    } catch (e) {
    }
  }
  if (channel === null) {
    const installCommand = buildPlaywrightCLICommand(sdkLanguage, `install chromium`);
    const prettyMessage = [
      `No chromium-based browser found on the system.`,
      `Please run the following command to download one:`,
      ``,
      `    ${installCommand}`,
      ``,
      `<3 Playwright Team`
    ].join("\n");
    throw new Error("\n" + (0, import_ascii.wrapInASCIIBox)(prettyMessage, 1));
  }
  return channel;
}
function lowercaseAllKeys(json) {
  if (typeof json !== "object" || !json)
    return json;
  if (Array.isArray(json))
    return json.map(lowercaseAllKeys);
  const result = {};
  for (const [key, value] of Object.entries(json))
    result[key.toLowerCase()] = lowercaseAllKeys(value);
  return result;
}
const registry = new Registry(require("../../../browsers.json"));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Registry,
  browserDirectoryToMarkerFilePath,
  buildPlaywrightCLICommand,
  findChromiumChannelBestEffort,
  installBrowsersForNpmInstall,
  registry,
  registryDirectory,
  writeDockerVersion
});
