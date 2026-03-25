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
var cookie_exports = {};
__export(cookie_exports, {
  deleteCookie: () => deleteCookie,
  generateCookie: () => generateCookie,
  generateSignedCookie: () => generateSignedCookie,
  getCookie: () => getCookie,
  getSignedCookie: () => getSignedCookie,
  setCookie: () => setCookie,
  setSignedCookie: () => setSignedCookie
});
module.exports = __toCommonJS(cookie_exports);
var import_cookie = require("../../utils/cookie");
const getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = (0, import_cookie.parse)(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = (0, import_cookie.parse)(cookie);
  return obj;
};
const getSignedCookie = async (c, secret, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = await (0, import_cookie.parseSigned)(cookie, secret, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = await (0, import_cookie.parseSigned)(cookie, secret);
  return obj;
};
const generateCookie = (name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = (0, import_cookie.serialize)("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = (0, import_cookie.serialize)("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = (0, import_cookie.serialize)(name, value, { path: "/", ...opt });
  }
  return cookie;
};
const setCookie = (c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
};
const generateSignedCookie = async (name, value, secret, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = await (0, import_cookie.serializeSigned)("__Secure-" + name, value, secret, {
      path: "/",
      ...opt,
      secure: true
    });
  } else if (opt?.prefix === "host") {
    cookie = await (0, import_cookie.serializeSigned)("__Host-" + name, value, secret, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = await (0, import_cookie.serializeSigned)(name, value, secret, { path: "/", ...opt });
  }
  return cookie;
};
const setSignedCookie = async (c, name, value, secret, opt) => {
  const cookie = await generateSignedCookie(name, value, secret, opt);
  c.header("set-cookie", cookie, { append: true });
};
const deleteCookie = (c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deleteCookie,
  generateCookie,
  generateSignedCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie
});
