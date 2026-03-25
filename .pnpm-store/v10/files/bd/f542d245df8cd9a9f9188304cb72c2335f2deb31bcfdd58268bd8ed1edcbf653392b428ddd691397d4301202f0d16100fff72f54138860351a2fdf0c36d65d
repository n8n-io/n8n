import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url)).toString()
);
const ROLLUP_HOOKS = [
  "options",
  "buildStart",
  "buildEnd",
  "renderStart",
  "renderError",
  "renderChunk",
  "writeBundle",
  "generateBundle",
  "banner",
  "footer",
  "augmentChunkHash",
  "outputOptions",
  "renderDynamicImport",
  "resolveFileUrl",
  "resolveImportMeta",
  "intro",
  "outro",
  "closeBundle",
  "closeWatcher",
  "load",
  "moduleParsed",
  "watchChange",
  "resolveDynamicImport",
  "resolveId",
  "shouldTransformCachedModule",
  "transform",
  "onLog"
];
const VERSION = version;
const DEFAULT_MAIN_FIELDS = [
  "browser",
  "module",
  "jsnext:main",
  // moment still uses this...
  "jsnext"
];
const DEFAULT_CLIENT_MAIN_FIELDS = Object.freeze(DEFAULT_MAIN_FIELDS);
const DEFAULT_SERVER_MAIN_FIELDS = Object.freeze(
  DEFAULT_MAIN_FIELDS.filter((f) => f !== "browser")
);
const DEV_PROD_CONDITION = `development|production`;
const DEFAULT_CONDITIONS = ["module", "browser", "node", DEV_PROD_CONDITION];
const DEFAULT_CLIENT_CONDITIONS = Object.freeze(
  DEFAULT_CONDITIONS.filter((c) => c !== "node")
);
const DEFAULT_SERVER_CONDITIONS = Object.freeze(
  DEFAULT_CONDITIONS.filter((c) => c !== "browser")
);
const ESBUILD_MODULES_TARGET = [
  "es2020",
  "edge88",
  "firefox78",
  "chrome87",
  "safari14"
];
const DEFAULT_CONFIG_FILES = [
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
  "vite.config.cjs",
  "vite.config.mts",
  "vite.config.cts"
];
const JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/;
const CSS_LANGS_RE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/;
const OPTIMIZABLE_ENTRY_RE = /\.[cm]?[jt]s$/;
const SPECIAL_QUERY_RE = /[?&](?:worker|sharedworker|raw|url)\b/;
const FS_PREFIX = `/@fs/`;
const CLIENT_PUBLIC_PATH = `/@vite/client`;
const ENV_PUBLIC_PATH = `/@vite/env`;
const VITE_PACKAGE_DIR = resolve(
  // import.meta.url is `dist/node/constants.js` after bundle
  fileURLToPath(import.meta.url),
  "../../.."
);
const CLIENT_ENTRY = resolve(VITE_PACKAGE_DIR, "dist/client/client.mjs");
const ENV_ENTRY = resolve(VITE_PACKAGE_DIR, "dist/client/env.mjs");
const CLIENT_DIR = path.dirname(CLIENT_ENTRY);
const KNOWN_ASSET_TYPES = [
  // images
  "apng",
  "bmp",
  "png",
  "jpe?g",
  "jfif",
  "pjpeg",
  "pjp",
  "gif",
  "svg",
  "ico",
  "webp",
  "avif",
  "cur",
  "jxl",
  // media
  "mp4",
  "webm",
  "ogg",
  "mp3",
  "wav",
  "flac",
  "aac",
  "opus",
  "mov",
  "m4a",
  "vtt",
  // fonts
  "woff2?",
  "eot",
  "ttf",
  "otf",
  // other
  "webmanifest",
  "pdf",
  "txt"
];
const DEFAULT_ASSETS_RE = new RegExp(
  `\\.(` + KNOWN_ASSET_TYPES.join("|") + `)(\\?.*)?$`,
  "i"
);
const DEP_VERSION_RE = /[?&](v=[\w.-]+)\b/;
const loopbackHosts = /* @__PURE__ */ new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0000:0000:0000:0000:0000:0000:0000:0001"
]);
const wildcardHosts = /* @__PURE__ */ new Set([
  "0.0.0.0",
  "::",
  "0000:0000:0000:0000:0000:0000:0000:0000"
]);
const DEFAULT_DEV_PORT = 5173;
const DEFAULT_PREVIEW_PORT = 4173;
const DEFAULT_ASSETS_INLINE_LIMIT = 4096;
const defaultAllowedOrigins = /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const METADATA_FILENAME = "_metadata.json";
const ERR_OPTIMIZE_DEPS_PROCESSING_ERROR = "ERR_OPTIMIZE_DEPS_PROCESSING_ERROR";
const ERR_FILE_NOT_FOUND_IN_OPTIMIZED_DEP_DIR = "ERR_FILE_NOT_FOUND_IN_OPTIMIZED_DEP_DIR";

export { CLIENT_DIR, CLIENT_ENTRY, CLIENT_PUBLIC_PATH, CSS_LANGS_RE, DEFAULT_ASSETS_INLINE_LIMIT, DEFAULT_ASSETS_RE, DEFAULT_CLIENT_CONDITIONS, DEFAULT_CLIENT_MAIN_FIELDS, DEFAULT_CONFIG_FILES, DEFAULT_DEV_PORT, DEFAULT_PREVIEW_PORT, DEFAULT_SERVER_CONDITIONS, DEFAULT_SERVER_MAIN_FIELDS, DEP_VERSION_RE, DEV_PROD_CONDITION, ENV_ENTRY, ENV_PUBLIC_PATH, ERR_FILE_NOT_FOUND_IN_OPTIMIZED_DEP_DIR, ERR_OPTIMIZE_DEPS_PROCESSING_ERROR, ESBUILD_MODULES_TARGET, FS_PREFIX, JS_TYPES_RE, KNOWN_ASSET_TYPES, METADATA_FILENAME, OPTIMIZABLE_ENTRY_RE, ROLLUP_HOOKS, SPECIAL_QUERY_RE, VERSION, VITE_PACKAGE_DIR, defaultAllowedOrigins, loopbackHosts, wildcardHosts };
