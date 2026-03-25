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
var chromiumSwitches_exports = {};
__export(chromiumSwitches_exports, {
  chromiumSwitches: () => chromiumSwitches
});
module.exports = __toCommonJS(chromiumSwitches_exports);
const disabledFeatures = (assistantMode) => [
  // See https://github.com/microsoft/playwright/issues/14047
  "AvoidUnnecessaryBeforeUnloadCheckSync",
  // See https://github.com/microsoft/playwright/issues/38568
  "BoundaryEventDispatchTracksNodeRemoval",
  "DestroyProfileOnBrowserClose",
  // See https://github.com/microsoft/playwright/pull/13854
  "DialMediaRouteProvider",
  "GlobalMediaControls",
  // See https://github.com/microsoft/playwright/pull/27605
  "HttpsUpgrades",
  // Hides the Lens feature in the URL address bar. Its not working in unofficial builds.
  "LensOverlay",
  // See https://github.com/microsoft/playwright/pull/8162
  "MediaRouter",
  // See https://github.com/microsoft/playwright/issues/28023
  "PaintHolding",
  // See https://github.com/microsoft/playwright/issues/32230
  "ThirdPartyStoragePartitioning",
  // See https://github.com/microsoft/playwright/issues/16126
  "Translate",
  // See https://issues.chromium.org/u/1/issues/435410220
  "AutoDeElevate",
  // See https://github.com/microsoft/playwright/issues/37714
  "RenderDocument",
  // Prevents downloading optimization hints on startup.
  "OptimizationHints",
  assistantMode ? "AutomationControlled" : ""
].filter(Boolean);
const chromiumSwitches = (assistantMode, channel, android) => [
  "--disable-field-trial-config",
  // https://source.chromium.org/chromium/chromium/src/+/main:testing/variations/README.md
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-back-forward-cache",
  // Avoids surprises like main request not being intercepted during page.goBack().
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-extensions-with-background-pages",
  "--disable-component-update",
  // Avoids unneeded network activity after startup.
  "--no-default-browser-check",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-features=" + disabledFeatures(assistantMode).join(","),
  process.env.PLAYWRIGHT_LEGACY_SCREENSHOT ? "" : "--enable-features=CDPScreenshotNewSurface",
  "--allow-pre-commit-input",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-popup-blocking",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--force-color-profile=srgb",
  "--metrics-recording-only",
  "--no-first-run",
  "--password-store=basic",
  "--use-mock-keychain",
  // See https://chromium-review.googlesource.com/c/chromium/src/+/2436773
  "--no-service-autorun",
  "--export-tagged-pdf",
  // https://chromium-review.googlesource.com/c/chromium/src/+/4853540
  "--disable-search-engine-choice-screen",
  // https://issues.chromium.org/41491762
  "--unsafely-disable-devtools-self-xss-warnings",
  // Edge can potentially restart on Windows (msRelaunchNoCompatLayer) which looses its file descriptors (stdout/stderr) and CDP (3/4). Disable until fixed upstream.
  "--edge-skip-compat-layer-relaunch",
  assistantMode ? "" : "--enable-automation",
  // This disables Chrome for Testing infobar that is visible in the persistent context.
  // The switch is ignored everywhere else, including Chromium/Chrome/Edge.
  "--disable-infobars",
  // Less annoying popups.
  "--disable-search-engine-choice-screen",
  // Prevents the "three dots" menu crash in IdentityManager::HasPrimaryAccount for ephemeral contexts.
  android ? "" : "--disable-sync"
].filter(Boolean);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  chromiumSwitches
});
