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
var language_exports = {};
__export(language_exports, {
  DEFAULT_OPTIONS: () => DEFAULT_OPTIONS,
  detectFromCookie: () => detectFromCookie,
  detectFromHeader: () => detectFromHeader,
  detectFromPath: () => detectFromPath,
  detectFromQuery: () => detectFromQuery,
  detectors: () => detectors,
  languageDetector: () => languageDetector,
  normalizeLanguage: () => normalizeLanguage,
  parseAcceptLanguage: () => parseAcceptLanguage,
  validateOptions: () => validateOptions
});
module.exports = __toCommonJS(language_exports);
var import_cookie = require("../../helper/cookie");
var import_accept = require("../../utils/accept");
const DEFAULT_OPTIONS = {
  order: ["querystring", "cookie", "header"],
  lookupQueryString: "lang",
  lookupCookie: "language",
  lookupFromHeaderKey: "accept-language",
  lookupFromPathIndex: 0,
  caches: ["cookie"],
  ignoreCase: true,
  fallbackLanguage: "en",
  supportedLanguages: ["en"],
  cookieOptions: {
    sameSite: "Strict",
    secure: true,
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: true
  },
  debug: false
};
function parseAcceptLanguage(header) {
  return (0, import_accept.parseAccept)(header).map(({ type, q }) => ({ lang: type, q }));
}
const normalizeLanguage = (lang, options) => {
  if (!lang) {
    return void 0;
  }
  try {
    let normalizedLang = lang.trim();
    if (options.convertDetectedLanguage) {
      normalizedLang = options.convertDetectedLanguage(normalizedLang);
    }
    const compLang = options.ignoreCase ? normalizedLang.toLowerCase() : normalizedLang;
    const compSupported = options.supportedLanguages.map(
      (l) => options.ignoreCase ? l.toLowerCase() : l
    );
    const exactIndex = compSupported.indexOf(compLang);
    if (exactIndex !== -1) {
      return options.supportedLanguages[exactIndex];
    }
    const parts = compLang.split("-");
    for (let i = parts.length - 1; i > 0; i--) {
      const candidate = parts.slice(0, i).join("-");
      const prefixIndex = compSupported.indexOf(candidate);
      if (prefixIndex !== -1) {
        return options.supportedLanguages[prefixIndex];
      }
    }
    return void 0;
  } catch {
    return void 0;
  }
};
const detectFromQuery = (c, options) => {
  try {
    const query = c.req.query(options.lookupQueryString);
    return normalizeLanguage(query, options);
  } catch {
    return void 0;
  }
};
const detectFromCookie = (c, options) => {
  try {
    const cookie = (0, import_cookie.getCookie)(c, options.lookupCookie);
    return normalizeLanguage(cookie, options);
  } catch {
    return void 0;
  }
};
function detectFromHeader(c, options) {
  try {
    const acceptLanguage = c.req.header(options.lookupFromHeaderKey);
    if (!acceptLanguage) {
      return void 0;
    }
    const languages = parseAcceptLanguage(acceptLanguage);
    for (const { lang } of languages) {
      const normalizedLang = normalizeLanguage(lang, options);
      if (normalizedLang) {
        return normalizedLang;
      }
    }
    return void 0;
  } catch {
    return void 0;
  }
}
function detectFromPath(c, options) {
  try {
    const url = new URL(c.req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const langSegment = pathSegments[options.lookupFromPathIndex];
    return normalizeLanguage(langSegment, options);
  } catch {
    return void 0;
  }
}
const detectors = {
  querystring: detectFromQuery,
  cookie: detectFromCookie,
  header: detectFromHeader,
  path: detectFromPath
};
function validateOptions(options) {
  if (!options.supportedLanguages.includes(options.fallbackLanguage)) {
    throw new Error("Fallback language must be included in supported languages");
  }
  if (options.lookupFromPathIndex < 0) {
    throw new Error("Path index must be non-negative");
  }
  if (!options.order.every((detector) => Object.keys(detectors).includes(detector))) {
    throw new Error("Invalid detector type in order array");
  }
}
function cacheLanguage(c, language, options) {
  if (!Array.isArray(options.caches) || !options.caches.includes("cookie")) {
    return;
  }
  try {
    (0, import_cookie.setCookie)(c, options.lookupCookie, language, options.cookieOptions);
  } catch (error) {
    if (options.debug) {
      console.error("Failed to cache language:", error);
    }
  }
}
const detectLanguage = (c, options) => {
  let detectedLang;
  for (const detectorName of options.order) {
    const detector = detectors[detectorName];
    if (!detector) {
      continue;
    }
    try {
      detectedLang = detector(c, options);
      if (detectedLang) {
        if (options.debug) {
          console.log(`Language detected from ${detectorName}: ${detectedLang}`);
        }
        break;
      }
    } catch (error) {
      if (options.debug) {
        console.error(`Error in ${detectorName} detector:`, error);
      }
      continue;
    }
  }
  const finalLang = detectedLang || options.fallbackLanguage;
  if (detectedLang && options.caches) {
    cacheLanguage(c, finalLang, options);
  }
  return finalLang;
};
const languageDetector = (userOptions) => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
    cookieOptions: {
      ...DEFAULT_OPTIONS.cookieOptions,
      ...userOptions.cookieOptions
    }
  };
  validateOptions(options);
  return async function languageDetector2(ctx, next) {
    try {
      const lang = detectLanguage(ctx, options);
      ctx.set("language", lang);
    } catch (error) {
      if (options.debug) {
        console.error("Language detection failed:", error);
      }
      ctx.set("language", options.fallbackLanguage);
    }
    await next();
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_OPTIONS,
  detectFromCookie,
  detectFromHeader,
  detectFromPath,
  detectFromQuery,
  detectors,
  languageDetector,
  normalizeLanguage,
  parseAcceptLanguage,
  validateOptions
});
