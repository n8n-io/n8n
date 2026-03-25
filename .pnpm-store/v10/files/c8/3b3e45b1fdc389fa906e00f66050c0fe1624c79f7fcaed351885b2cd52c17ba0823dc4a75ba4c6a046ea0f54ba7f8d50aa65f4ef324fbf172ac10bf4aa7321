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
var utilsBundle_exports = {};
__export(utilsBundle_exports, {
  HttpsProxyAgent: () => HttpsProxyAgent,
  PNG: () => PNG,
  ProgramOption: () => ProgramOption,
  SocksProxyAgent: () => SocksProxyAgent,
  colors: () => colors,
  debug: () => debug,
  diff: () => diff,
  dotenv: () => dotenv,
  getProxyForUrl: () => getProxyForUrl,
  jpegjs: () => jpegjs,
  lockfile: () => lockfile,
  mime: () => mime,
  minimatch: () => minimatch,
  ms: () => ms,
  open: () => open,
  program: () => program,
  progress: () => progress,
  ws: () => ws,
  wsReceiver: () => wsReceiver,
  wsSender: () => wsSender,
  wsServer: () => wsServer,
  yaml: () => yaml
});
module.exports = __toCommonJS(utilsBundle_exports);
const colors = require("./utilsBundleImpl").colors;
const debug = require("./utilsBundleImpl").debug;
const diff = require("./utilsBundleImpl").diff;
const dotenv = require("./utilsBundleImpl").dotenv;
const getProxyForUrl = require("./utilsBundleImpl").getProxyForUrl;
const HttpsProxyAgent = require("./utilsBundleImpl").HttpsProxyAgent;
const jpegjs = require("./utilsBundleImpl").jpegjs;
const lockfile = require("./utilsBundleImpl").lockfile;
const mime = require("./utilsBundleImpl").mime;
const minimatch = require("./utilsBundleImpl").minimatch;
const open = require("./utilsBundleImpl").open;
const PNG = require("./utilsBundleImpl").PNG;
const program = require("./utilsBundleImpl").program;
const ProgramOption = require("./utilsBundleImpl").ProgramOption;
const progress = require("./utilsBundleImpl").progress;
const SocksProxyAgent = require("./utilsBundleImpl").SocksProxyAgent;
const ws = require("./utilsBundleImpl").ws;
const wsServer = require("./utilsBundleImpl").wsServer;
const wsReceiver = require("./utilsBundleImpl").wsReceiver;
const wsSender = require("./utilsBundleImpl").wsSender;
const yaml = require("./utilsBundleImpl").yaml;
function ms(ms2) {
  if (!isFinite(ms2))
    return "-";
  if (ms2 === 0)
    return "0ms";
  if (ms2 < 1e3)
    return ms2.toFixed(0) + "ms";
  const seconds = ms2 / 1e3;
  if (seconds < 60)
    return seconds.toFixed(1) + "s";
  const minutes = seconds / 60;
  if (minutes < 60)
    return minutes.toFixed(1) + "m";
  const hours = minutes / 60;
  if (hours < 24)
    return hours.toFixed(1) + "h";
  const days = hours / 24;
  return days.toFixed(1) + "d";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HttpsProxyAgent,
  PNG,
  ProgramOption,
  SocksProxyAgent,
  colors,
  debug,
  diff,
  dotenv,
  getProxyForUrl,
  jpegjs,
  lockfile,
  mime,
  minimatch,
  ms,
  open,
  program,
  progress,
  ws,
  wsReceiver,
  wsSender,
  wsServer,
  yaml
});
