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
var proxyPolicy_exports = {};
__export(proxyPolicy_exports, {
  getDefaultProxySettings: () => getDefaultProxySettings,
  globalNoProxyList: () => globalNoProxyList,
  loadNoProxy: () => loadNoProxy,
  proxyPolicy: () => proxyPolicy,
  proxyPolicyName: () => proxyPolicyName
});
module.exports = __toCommonJS(proxyPolicy_exports);
var import_https_proxy_agent = require("https-proxy-agent");
var import_http_proxy_agent = require("http-proxy-agent");
var import_log = require("../log.js");
const HTTPS_PROXY = "HTTPS_PROXY";
const HTTP_PROXY = "HTTP_PROXY";
const ALL_PROXY = "ALL_PROXY";
const NO_PROXY = "NO_PROXY";
const proxyPolicyName = "proxyPolicy";
const globalNoProxyList = [];
let noProxyListLoaded = false;
const globalBypassedMap = /* @__PURE__ */ new Map();
function getEnvironmentValue(name) {
  if (process.env[name]) {
    return process.env[name];
  } else if (process.env[name.toLowerCase()]) {
    return process.env[name.toLowerCase()];
  }
  return void 0;
}
function loadEnvironmentProxyValue() {
  if (!process) {
    return void 0;
  }
  const httpsProxy = getEnvironmentValue(HTTPS_PROXY);
  const allProxy = getEnvironmentValue(ALL_PROXY);
  const httpProxy = getEnvironmentValue(HTTP_PROXY);
  return httpsProxy || allProxy || httpProxy;
}
function isBypassed(uri, noProxyList, bypassedMap) {
  if (noProxyList.length === 0) {
    return false;
  }
  const host = new URL(uri).hostname;
  if (bypassedMap?.has(host)) {
    return bypassedMap.get(host);
  }
  let isBypassedFlag = false;
  for (const pattern of noProxyList) {
    if (pattern[0] === ".") {
      if (host.endsWith(pattern)) {
        isBypassedFlag = true;
      } else {
        if (host.length === pattern.length - 1 && host === pattern.slice(1)) {
          isBypassedFlag = true;
        }
      }
    } else {
      if (host === pattern) {
        isBypassedFlag = true;
      }
    }
  }
  bypassedMap?.set(host, isBypassedFlag);
  return isBypassedFlag;
}
function loadNoProxy() {
  const noProxy = getEnvironmentValue(NO_PROXY);
  noProxyListLoaded = true;
  if (noProxy) {
    return noProxy.split(",").map((item) => item.trim()).filter((item) => item.length);
  }
  return [];
}
function getDefaultProxySettings(proxyUrl) {
  if (!proxyUrl) {
    proxyUrl = loadEnvironmentProxyValue();
    if (!proxyUrl) {
      return void 0;
    }
  }
  const parsedUrl = new URL(proxyUrl);
  const schema = parsedUrl.protocol ? parsedUrl.protocol + "//" : "";
  return {
    host: schema + parsedUrl.hostname,
    port: Number.parseInt(parsedUrl.port || "80"),
    username: parsedUrl.username,
    password: parsedUrl.password
  };
}
function getDefaultProxySettingsInternal() {
  const envProxy = loadEnvironmentProxyValue();
  return envProxy ? new URL(envProxy) : void 0;
}
function getUrlFromProxySettings(settings) {
  let parsedProxyUrl;
  try {
    parsedProxyUrl = new URL(settings.host);
  } catch {
    throw new Error(
      `Expecting a valid host string in proxy settings, but found "${settings.host}".`
    );
  }
  parsedProxyUrl.port = String(settings.port);
  if (settings.username) {
    parsedProxyUrl.username = settings.username;
  }
  if (settings.password) {
    parsedProxyUrl.password = settings.password;
  }
  return parsedProxyUrl;
}
function setProxyAgentOnRequest(request, cachedAgents, proxyUrl) {
  if (request.agent) {
    return;
  }
  const url = new URL(request.url);
  const isInsecure = url.protocol !== "https:";
  if (request.tlsSettings) {
    import_log.logger.warning(
      "TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored."
    );
  }
  const headers = request.headers.toJSON();
  if (isInsecure) {
    if (!cachedAgents.httpProxyAgent) {
      cachedAgents.httpProxyAgent = new import_http_proxy_agent.HttpProxyAgent(proxyUrl, { headers });
    }
    request.agent = cachedAgents.httpProxyAgent;
  } else {
    if (!cachedAgents.httpsProxyAgent) {
      cachedAgents.httpsProxyAgent = new import_https_proxy_agent.HttpsProxyAgent(proxyUrl, { headers });
    }
    request.agent = cachedAgents.httpsProxyAgent;
  }
}
function proxyPolicy(proxySettings, options) {
  if (!noProxyListLoaded) {
    globalNoProxyList.push(...loadNoProxy());
  }
  const defaultProxy = proxySettings ? getUrlFromProxySettings(proxySettings) : getDefaultProxySettingsInternal();
  const cachedAgents = {};
  return {
    name: proxyPolicyName,
    async sendRequest(request, next) {
      if (!request.proxySettings && defaultProxy && !isBypassed(
        request.url,
        options?.customNoProxyList ?? globalNoProxyList,
        options?.customNoProxyList ? void 0 : globalBypassedMap
      )) {
        setProxyAgentOnRequest(request, cachedAgents, defaultProxy);
      } else if (request.proxySettings) {
        setProxyAgentOnRequest(
          request,
          cachedAgents,
          getUrlFromProxySettings(request.proxySettings)
        );
      }
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getDefaultProxySettings,
  globalNoProxyList,
  loadNoProxy,
  proxyPolicy,
  proxyPolicyName
});
