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
var ip_restriction_exports = {};
__export(ip_restriction_exports, {
  ipRestriction: () => ipRestriction
});
module.exports = __toCommonJS(ip_restriction_exports);
var import_http_exception = require("../../http-exception");
var import_ipaddr = require("../../utils/ipaddr");
const IS_CIDR_NOTATION_REGEX = /\/[0-9]{0,3}$/;
const buildMatcher = (rules) => {
  const functionRules = [];
  const staticRules = /* @__PURE__ */ new Set();
  const cidrRules = [];
  for (let rule of rules) {
    if (rule === "*") {
      return () => true;
    } else if (typeof rule === "function") {
      functionRules.push(rule);
    } else {
      if (IS_CIDR_NOTATION_REGEX.test(rule)) {
        const separatedRule = rule.split("/");
        const addrStr = separatedRule[0];
        const type2 = (0, import_ipaddr.distinctRemoteAddr)(addrStr);
        if (type2 === void 0) {
          throw new TypeError(`Invalid rule: ${rule}`);
        }
        const isIPv4 = type2 === "IPv4";
        const prefix = parseInt(separatedRule[1]);
        if (isIPv4 ? prefix === 32 : prefix === 128) {
          rule = addrStr;
        } else {
          const addr = (isIPv4 ? import_ipaddr.convertIPv4ToBinary : import_ipaddr.convertIPv6ToBinary)(addrStr);
          const mask = (1n << BigInt(prefix)) - 1n << BigInt((isIPv4 ? 32 : 128) - prefix);
          cidrRules.push([isIPv4, addr & mask, mask]);
          continue;
        }
      }
      const type = (0, import_ipaddr.distinctRemoteAddr)(rule);
      if (type === void 0) {
        throw new TypeError(`Invalid rule: ${rule}`);
      }
      staticRules.add(
        type === "IPv4" ? rule : (0, import_ipaddr.convertIPv6BinaryToString)((0, import_ipaddr.convertIPv6ToBinary)(rule))
        // normalize IPv6 address (e.g. 0000:0000:0000:0000:0000:0000:0000:0001 => ::1)
      );
    }
  }
  return (remote) => {
    if (staticRules.has(remote.addr)) {
      return true;
    }
    for (const [isIPv4, addr, mask] of cidrRules) {
      if (isIPv4 !== remote.isIPv4) {
        continue;
      }
      const remoteAddr = remote.binaryAddr ||= (isIPv4 ? import_ipaddr.convertIPv4ToBinary : import_ipaddr.convertIPv6ToBinary)(remote.addr);
      if ((remoteAddr & mask) === addr) {
        return true;
      }
    }
    for (const rule of functionRules) {
      if (rule({ addr: remote.addr, type: remote.type })) {
        return true;
      }
    }
    return false;
  };
};
const ipRestriction = (getIP, { denyList = [], allowList = [] }, onError) => {
  const allowLength = allowList.length;
  const denyMatcher = buildMatcher(denyList);
  const allowMatcher = buildMatcher(allowList);
  const blockError = (c) => new import_http_exception.HTTPException(403, {
    res: c.text("Forbidden", {
      status: 403
    })
  });
  return async function ipRestriction2(c, next) {
    const connInfo = getIP(c);
    const addr = typeof connInfo === "string" ? connInfo : connInfo.remote.address;
    if (!addr) {
      throw blockError(c);
    }
    const type = typeof connInfo !== "string" && connInfo.remote.addressType || (0, import_ipaddr.distinctRemoteAddr)(addr);
    const remoteData = { addr, type, isIPv4: type === "IPv4" };
    if (denyMatcher(remoteData)) {
      if (onError) {
        return onError({ addr, type }, c);
      }
      throw blockError(c);
    }
    if (allowMatcher(remoteData)) {
      return await next();
    }
    if (allowLength === 0) {
      return await next();
    } else {
      if (onError) {
        return await onError({ addr, type }, c);
      }
      throw blockError(c);
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ipRestriction
});
