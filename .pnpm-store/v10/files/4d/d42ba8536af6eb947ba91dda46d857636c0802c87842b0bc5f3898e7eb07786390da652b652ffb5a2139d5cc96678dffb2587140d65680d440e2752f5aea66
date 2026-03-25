// src/middleware/ip-restriction/index.ts
import { HTTPException } from "../../http-exception.js";
import {
  convertIPv4ToBinary,
  convertIPv6BinaryToString,
  convertIPv6ToBinary,
  distinctRemoteAddr
} from "../../utils/ipaddr.js";
var IS_CIDR_NOTATION_REGEX = /\/[0-9]{0,3}$/;
var buildMatcher = (rules) => {
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
        const type2 = distinctRemoteAddr(addrStr);
        if (type2 === void 0) {
          throw new TypeError(`Invalid rule: ${rule}`);
        }
        const isIPv4 = type2 === "IPv4";
        const prefix = parseInt(separatedRule[1]);
        if (isIPv4 ? prefix === 32 : prefix === 128) {
          rule = addrStr;
        } else {
          const addr = (isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary)(addrStr);
          const mask = (1n << BigInt(prefix)) - 1n << BigInt((isIPv4 ? 32 : 128) - prefix);
          cidrRules.push([isIPv4, addr & mask, mask]);
          continue;
        }
      }
      const type = distinctRemoteAddr(rule);
      if (type === void 0) {
        throw new TypeError(`Invalid rule: ${rule}`);
      }
      staticRules.add(
        type === "IPv4" ? rule : convertIPv6BinaryToString(convertIPv6ToBinary(rule))
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
      const remoteAddr = remote.binaryAddr ||= (isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary)(remote.addr);
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
var ipRestriction = (getIP, { denyList = [], allowList = [] }, onError) => {
  const allowLength = allowList.length;
  const denyMatcher = buildMatcher(denyList);
  const allowMatcher = buildMatcher(allowList);
  const blockError = (c) => new HTTPException(403, {
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
    const type = typeof connInfo !== "string" && connInfo.remote.addressType || distinctRemoteAddr(addr);
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
export {
  ipRestriction
};
