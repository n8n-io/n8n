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
var cookieStore_exports = {};
__export(cookieStore_exports, {
  Cookie: () => Cookie,
  CookieStore: () => CookieStore,
  domainMatches: () => domainMatches,
  parseRawCookie: () => parseRawCookie
});
module.exports = __toCommonJS(cookieStore_exports);
var import_network = require("./network");
class Cookie {
  constructor(data) {
    this._raw = data;
  }
  name() {
    return this._raw.name;
  }
  // https://datatracker.ietf.org/doc/html/rfc6265#section-5.4
  matches(url) {
    if (this._raw.secure && (url.protocol !== "https:" && !(0, import_network.isLocalHostname)(url.hostname)))
      return false;
    if (!domainMatches(url.hostname, this._raw.domain))
      return false;
    if (!pathMatches(url.pathname, this._raw.path))
      return false;
    return true;
  }
  equals(other) {
    return this._raw.name === other._raw.name && this._raw.domain === other._raw.domain && this._raw.path === other._raw.path;
  }
  networkCookie() {
    return this._raw;
  }
  updateExpiresFrom(other) {
    this._raw.expires = other._raw.expires;
  }
  expired() {
    if (this._raw.expires === -1)
      return false;
    return this._raw.expires * 1e3 < Date.now();
  }
}
class CookieStore {
  constructor() {
    this._nameToCookies = /* @__PURE__ */ new Map();
  }
  addCookies(cookies) {
    for (const cookie of cookies)
      this._addCookie(new Cookie(cookie));
  }
  cookies(url) {
    const result = [];
    for (const cookie of this._cookiesIterator()) {
      if (cookie.matches(url))
        result.push(cookie.networkCookie());
    }
    return result;
  }
  allCookies() {
    const result = [];
    for (const cookie of this._cookiesIterator())
      result.push(cookie.networkCookie());
    return result;
  }
  _addCookie(cookie) {
    let set = this._nameToCookies.get(cookie.name());
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this._nameToCookies.set(cookie.name(), set);
    }
    for (const other of set) {
      if (other.equals(cookie))
        set.delete(other);
    }
    set.add(cookie);
    CookieStore.pruneExpired(set);
  }
  *_cookiesIterator() {
    for (const [name, cookies] of this._nameToCookies) {
      CookieStore.pruneExpired(cookies);
      for (const cookie of cookies)
        yield cookie;
      if (cookies.size === 0)
        this._nameToCookies.delete(name);
    }
  }
  static pruneExpired(cookies) {
    for (const cookie of cookies) {
      if (cookie.expired())
        cookies.delete(cookie);
    }
  }
}
function parseRawCookie(header) {
  const pairs = header.split(";").filter((s) => s.trim().length > 0).map((p) => {
    let key = "";
    let value2 = "";
    const separatorPos = p.indexOf("=");
    if (separatorPos === -1) {
      key = p.trim();
    } else {
      key = p.slice(0, separatorPos).trim();
      value2 = p.slice(separatorPos + 1).trim();
    }
    return [key, value2];
  });
  if (!pairs.length)
    return null;
  const [name, value] = pairs[0];
  const cookie = {
    name,
    value
  };
  for (let i = 1; i < pairs.length; i++) {
    const [name2, value2] = pairs[i];
    switch (name2.toLowerCase()) {
      case "expires":
        const expiresMs = +new Date(value2);
        if (isFinite(expiresMs)) {
          if (expiresMs <= 0)
            cookie.expires = 0;
          else
            cookie.expires = Math.min(expiresMs / 1e3, import_network.kMaxCookieExpiresDateInSeconds);
        }
        break;
      case "max-age":
        const maxAgeSec = parseInt(value2, 10);
        if (isFinite(maxAgeSec)) {
          if (maxAgeSec <= 0)
            cookie.expires = 0;
          else
            cookie.expires = Math.min(Date.now() / 1e3 + maxAgeSec, import_network.kMaxCookieExpiresDateInSeconds);
        }
        break;
      case "domain":
        cookie.domain = value2.toLocaleLowerCase() || "";
        if (cookie.domain && !cookie.domain.startsWith(".") && cookie.domain.includes("."))
          cookie.domain = "." + cookie.domain;
        break;
      case "path":
        cookie.path = value2 || "";
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "samesite":
        switch (value2.toLowerCase()) {
          case "none":
            cookie.sameSite = "None";
            break;
          case "lax":
            cookie.sameSite = "Lax";
            break;
          case "strict":
            cookie.sameSite = "Strict";
            break;
        }
        break;
    }
  }
  return cookie;
}
function domainMatches(value, domain) {
  if (value === domain)
    return true;
  if (!domain.startsWith("."))
    return false;
  value = "." + value;
  return value.endsWith(domain);
}
function pathMatches(value, path) {
  if (value === path)
    return true;
  if (!value.endsWith("/"))
    value = value + "/";
  if (!path.endsWith("/"))
    path = path + "/";
  return value.startsWith(path);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Cookie,
  CookieStore,
  domainMatches,
  parseRawCookie
});
