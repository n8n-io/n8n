import { ManualMockedModule, RedirectedModule, AutomockedModule, AutospiedModule, MockerRegistry } from '@vitest/mocker';
import { dynamicImportPlugin, ServerMockResolver, interceptorPlugin } from '@vitest/mocker/node';
import c from 'tinyrainbow';
import { isValidApiRequest, isFileServingAllowed, distDir, resolveApiServerConfig, resolveFsAllow, rolldownVersion, createDebugger, createViteLogger, createViteServer } from 'vitest/node';
import { fileURLToPath } from 'node:url';
import fs, { readFileSync, lstatSync, createReadStream, promises, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { slash as slash$1, toArray, deepMerge } from '@vitest/utils/helpers';
import MagicString from 'magic-string';
import sirv from 'sirv';
import { coverageConfigDefaults } from 'vitest/config';
import crypto from 'node:crypto';
import { readFile as readFile$1, mkdir, writeFile as writeFile$1 } from 'node:fs/promises';
import { parseErrorStacktrace, parseStacktrace } from '@vitest/utils/source-map';
import { resolve as resolve$1, basename as basename$1, dirname as dirname$1 } from 'node:path';
import { platform } from 'node:os';
import { PNG } from 'pngjs';
import pm from 'pixelmatch';
import { WebSocketServer } from 'ws';

var version = "4.0.16";

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}

const _UNC_REGEX = /^[/\\]{2}/;
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;
const _EXTNAME_RE = /.(\.[^./]+|\.)$/;
const normalize = function(path) {
  if (path.length === 0) {
    return ".";
  }
  path = normalizeWindowsPath(path);
  const isUNCPath = path.match(_UNC_REGEX);
  const isPathAbsolute = isAbsolute(path);
  const trailingSeparator = path[path.length - 1] === "/";
  path = normalizeString(path, !isPathAbsolute);
  if (path.length === 0) {
    if (isPathAbsolute) {
      return "/";
    }
    return trailingSeparator ? "./" : ".";
  }
  if (trailingSeparator) {
    path += "/";
  }
  if (_DRIVE_LETTER_RE.test(path)) {
    path += "/";
  }
  if (isUNCPath) {
    if (!isPathAbsolute) {
      return `//./${path}`;
    }
    return `//${path}`;
  }
  return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path;
};
const join = function(...segments) {
  let path = "";
  for (const seg of segments) {
    if (!seg) {
      continue;
    }
    if (path.length > 0) {
      const pathTrailing = path[path.length - 1] === "/";
      const segLeading = seg[0] === "/";
      const both = pathTrailing && segLeading;
      if (both) {
        path += seg.slice(1);
      } else {
        path += pathTrailing || segLeading ? seg : `/${seg}`;
      }
    } else {
      path += seg;
    }
  }
  return normalize(path);
};
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const extname = function(p) {
  if (p === "..") return "";
  const match = _EXTNAME_RE.exec(normalizeWindowsPath(p));
  return match && match[1] || "";
};
const relative = function(from, to) {
  const _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/");
  const _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0]) {
    return _to.join("/");
  }
  const _fromCopy = [..._from];
  for (const segment of _fromCopy) {
    if (_to[0] !== segment) {
      break;
    }
    _from.shift();
    _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};
const basename = function(p, extension) {
  const segments = normalizeWindowsPath(p).split("/");
  let lastSegment = "";
  for (let i = segments.length - 1; i >= 0; i--) {
    const val = segments[i];
    if (val) {
      lastSegment = val;
      break;
    }
  }
  return extension && lastSegment.endsWith(extension) ? lastSegment.slice(0, -extension.length) : lastSegment;
};

const pkgRoot = resolve(fileURLToPath(import.meta.url), "../..");
const distRoot = resolve(pkgRoot, "dist");

/// <reference types="../types/index.d.ts" />

// (c) 2020-present Andrea Giammarchi

const {parse: $parse, stringify: $stringify} = JSON;
const {keys} = Object;

const Primitive = String;   // it could be Number
const primitive = 'string'; // it could be 'number'

const ignore = {};
const object = 'object';

const noop = (_, value) => value;

const primitives = value => (
  value instanceof Primitive ? Primitive(value) : value
);

const Primitives = (_, value) => (
  typeof value === primitive ? new Primitive(value) : value
);

const revive = (input, parsed, output, $) => {
  const lazy = [];
  for (let ke = keys(output), {length} = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({k, a: [input, parsed, tmp, $]});
      }
      else
        output[k] = $.call(output, k, tmp);
    }
    else if (output[k] !== ignore)
      output[k] = $.call(output, k, value);
  }
  for (let {length} = lazy, i = 0; i < length; i++) {
    const {k, a} = lazy[i];
    output[k] = $.call(output, k, revive.apply(null, a));
  }
  return output;
};

const set = (known, input, value) => {
  const index = Primitive(input.push(value) - 1);
  known.set(value, index);
  return index;
};

/**
 * Converts a specialized flatted string into a JS value.
 * @param {string} text
 * @param {(this: any, key: string, value: any) => any} [reviver]
 * @returns {any}
 */
const parse = (text, reviver) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = reviver || noop;
  const tmp = typeof value === object && value ?
              revive(input, new Set, value, $) :
              value;
  return $.call({'': tmp}, '', tmp);
};

/**
 * Converts a JS value into a specialized flatted string.
 * @param {any} value
 * @param {((this: any, key: string, value: any) => any) | (string | number)[] | null | undefined} [replacer]
 * @param {string | number | undefined} [space]
 * @returns {string}
 */
const stringify = (value, replacer, space) => {
  const $ = replacer && typeof replacer === object ?
            (k, v) => (k === '' || -1 < replacer.indexOf(k) ? v : void 0) :
            (replacer || noop);
  const known = new Map;
  const input = [];
  const output = [];
  let i = +set(known, input, $.call({'': value}, '', value));
  let firstRun = !i;
  while (i < input.length) {
    firstRun = true;
    output[i] = $stringify(input[i++], replace, space);
  }
  return '[' + output.join(',') + ']';
  function replace(key, value) {
    if (firstRun) {
      firstRun = !firstRun;
      return value;
    }
    const after = $.call(this, key, value);
    switch (typeof after) {
      case object:
        if (after === null) return after;
      case primitive:
        return known.get(after) || set(known, input, after);
    }
    return after;
  }
};

var DOM_KEY_LOCATION = /*#__PURE__*/ function(DOM_KEY_LOCATION) {
    DOM_KEY_LOCATION[DOM_KEY_LOCATION["STANDARD"] = 0] = "STANDARD";
    DOM_KEY_LOCATION[DOM_KEY_LOCATION["LEFT"] = 1] = "LEFT";
    DOM_KEY_LOCATION[DOM_KEY_LOCATION["RIGHT"] = 2] = "RIGHT";
    DOM_KEY_LOCATION[DOM_KEY_LOCATION["NUMPAD"] = 3] = "NUMPAD";
    return DOM_KEY_LOCATION;
}({});

/**
 * Mapping for a default US-104-QWERTY keyboard
 */ const defaultKeyMap = [
    // alphanumeric block - writing system
    ...'0123456789'.split('').map((c)=>({
            code: `Digit${c}`,
            key: c
        })),
    ...')!@#$%^&*('.split('').map((c, i)=>({
            code: `Digit${i}`,
            key: c,
            shiftKey: true
        })),
    ...'abcdefghijklmnopqrstuvwxyz'.split('').map((c)=>({
            code: `Key${c.toUpperCase()}`,
            key: c
        })),
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c)=>({
            code: `Key${c}`,
            key: c,
            shiftKey: true
        })),
    {
        code: 'BracketLeft',
        key: '['
    },
    {
        code: 'BracketLeft',
        key: '{',
        shiftKey: true
    },
    {
        code: 'BracketRight',
        key: ']'
    },
    {
        code: 'BracketRight',
        key: '}',
        shiftKey: true
    },
    // alphanumeric block - functional
    {
        code: 'Space',
        key: ' '
    },
    {
        code: 'AltLeft',
        key: 'Alt',
        location: DOM_KEY_LOCATION.LEFT
    },
    {
        code: 'AltRight',
        key: 'Alt',
        location: DOM_KEY_LOCATION.RIGHT
    },
    {
        code: 'ShiftLeft',
        key: 'Shift',
        location: DOM_KEY_LOCATION.LEFT
    },
    {
        code: 'ShiftRight',
        key: 'Shift',
        location: DOM_KEY_LOCATION.RIGHT
    },
    {
        code: 'ControlLeft',
        key: 'Control',
        location: DOM_KEY_LOCATION.LEFT
    },
    {
        code: 'ControlRight',
        key: 'Control',
        location: DOM_KEY_LOCATION.RIGHT
    },
    {
        code: 'MetaLeft',
        key: 'Meta',
        location: DOM_KEY_LOCATION.LEFT
    },
    {
        code: 'MetaRight',
        key: 'Meta',
        location: DOM_KEY_LOCATION.RIGHT
    },
    {
        code: 'OSLeft',
        key: 'OS',
        location: DOM_KEY_LOCATION.LEFT
    },
    {
        code: 'OSRight',
        key: 'OS',
        location: DOM_KEY_LOCATION.RIGHT
    },
    {
        code: 'ContextMenu',
        key: 'ContextMenu'
    },
    {
        code: 'Tab',
        key: 'Tab'
    },
    {
        code: 'CapsLock',
        key: 'CapsLock'
    },
    {
        code: 'Backspace',
        key: 'Backspace'
    },
    {
        code: 'Enter',
        key: 'Enter'
    },
    // function
    {
        code: 'Escape',
        key: 'Escape'
    },
    // arrows
    {
        code: 'ArrowUp',
        key: 'ArrowUp'
    },
    {
        code: 'ArrowDown',
        key: 'ArrowDown'
    },
    {
        code: 'ArrowLeft',
        key: 'ArrowLeft'
    },
    {
        code: 'ArrowRight',
        key: 'ArrowRight'
    },
    // control pad
    {
        code: 'Home',
        key: 'Home'
    },
    {
        code: 'End',
        key: 'End'
    },
    {
        code: 'Delete',
        key: 'Delete'
    },
    {
        code: 'PageUp',
        key: 'PageUp'
    },
    {
        code: 'PageDown',
        key: 'PageDown'
    },
    // Special keys that are not part of a default US-layout but included for specific behavior
    {
        code: 'Fn',
        key: 'Fn'
    },
    {
        code: 'Symbol',
        key: 'Symbol'
    },
    {
        code: 'AltRight',
        key: 'AltGraph'
    }
];

var bracketDict = /*#__PURE__*/ function(bracketDict) {
    bracketDict["{"] = "}";
    bracketDict["["] = "]";
    return bracketDict;
}(bracketDict || {});
/**
 * Read the next key definition from user input
 *
 * Describe key per `{descriptor}` or `[descriptor]`.
 * Everything else will be interpreted as a single character as descriptor - e.g. `a`.
 * Brackets `{` and `[` can be escaped by doubling - e.g. `foo[[bar` translates to `foo[bar`.
 * A previously pressed key can be released per `{/descriptor}`.
 * Keeping the key pressed can be written as `{descriptor>}`.
 * When keeping the key pressed you can choose how long the key is pressed `{descriptor>3}`.
 * You can then release the key per `{descriptor>3/}` or keep it pressed and continue with the next key.
 */ function readNextDescriptor(text, context) {
    let pos = 0;
    const startBracket = text[pos] in bracketDict ? text[pos] : '';
    pos += startBracket.length;
    const isEscapedChar = new RegExp(`^\\${startBracket}{2}`).test(text);
    const type = isEscapedChar ? '' : startBracket;
    return {
        type,
        ...type === '' ? readPrintableChar(text, pos) : readTag(text, pos, type)
    };
}
function readPrintableChar(text, pos, context) {
    const descriptor = text[pos];
    assertDescriptor(descriptor, text, pos);
    pos += descriptor.length;
    return {
        consumedLength: pos,
        descriptor,
        releasePrevious: false,
        releaseSelf: true,
        repeat: 1
    };
}
function readTag(text, pos, startBracket, context) {
    var _text_slice_match, _text_slice_match1;
    const releasePreviousModifier = text[pos] === '/' ? '/' : '';
    pos += releasePreviousModifier.length;
    const escapedDescriptor = startBracket === '{' && text[pos] === '\\';
    pos += Number(escapedDescriptor);
    const descriptor = escapedDescriptor ? text[pos] : (_text_slice_match = text.slice(pos).match(startBracket === '{' ? /^\w+|^[^}>/]/ : /^\w+/)) === null || _text_slice_match === undefined ? undefined : _text_slice_match[0];
    assertDescriptor(descriptor, text, pos);
    pos += descriptor.length;
    var _text_slice_match_;
    const repeatModifier = (_text_slice_match_ = (_text_slice_match1 = text.slice(pos).match(/^>\d+/)) === null || _text_slice_match1 === undefined ? undefined : _text_slice_match1[0]) !== null && _text_slice_match_ !== undefined ? _text_slice_match_ : '';
    pos += repeatModifier.length;
    const releaseSelfModifier = text[pos] === '/' || !repeatModifier && text[pos] === '>' ? text[pos] : '';
    pos += releaseSelfModifier.length;
    const expectedEndBracket = bracketDict[startBracket];
    const endBracket = text[pos] === expectedEndBracket ? expectedEndBracket : '';
    if (!endBracket) {
        throw new Error(getErrorMessage([
            !repeatModifier && 'repeat modifier',
            !releaseSelfModifier && 'release modifier',
            `"${expectedEndBracket}"`
        ].filter(Boolean).join(' or '), text[pos], text));
    }
    pos += endBracket.length;
    return {
        consumedLength: pos,
        descriptor,
        releasePrevious: !!releasePreviousModifier,
        repeat: repeatModifier ? Math.max(Number(repeatModifier.substr(1)), 1) : 1,
        releaseSelf: hasReleaseSelf(releaseSelfModifier, repeatModifier)
    };
}
function assertDescriptor(descriptor, text, pos, context) {
    if (!descriptor) {
        throw new Error(getErrorMessage('key descriptor', text[pos], text));
    }
}
function hasReleaseSelf(releaseSelfModifier, repeatModifier) {
    if (releaseSelfModifier) {
        return releaseSelfModifier === '/';
    }
    if (repeatModifier) {
        return false;
    }
}
function getErrorMessage(expected, found, text, context) {
    return `Expected ${expected} but found "${found !== null && found !== undefined ? found : ''}" in "${text}"
    See ${`https://testing-library.com/docs/user-event/keyboard`}
    for more information about how userEvent parses your input.`;
}

/**
 * Parse key definitions per `keyboardMap`
 *
 * Keys can be referenced by `{key}` or `{special}` as well as physical locations per `[code]`.
 * Everything else will be interpreted as a typed character - e.g. `a`.
 * Brackets `{` and `[` can be escaped by doubling - e.g. `foo[[bar` translates to `foo[bar`.
 * Keeping the key pressed can be written as `{key>}`.
 * When keeping the key pressed you can choose how long (how many keydown and keypress) the key is pressed `{key>3}`.
 * You can then release the key per `{key>3/}` or keep it pressed and continue with the next key.
 */ function parseKeyDef$1(keyboardMap, text) {
    const defs = [];
    do {
        const { type, descriptor, consumedLength, releasePrevious, releaseSelf = true, repeat } = readNextDescriptor(text);
        var _keyboardMap_find;
        const keyDef = (_keyboardMap_find = keyboardMap.find((def)=>{
            if (type === '[') {
                var _def_code;
                return ((_def_code = def.code) === null || _def_code === undefined ? undefined : _def_code.toLowerCase()) === descriptor.toLowerCase();
            } else if (type === '{') {
                var _def_key;
                return ((_def_key = def.key) === null || _def_key === undefined ? undefined : _def_key.toLowerCase()) === descriptor.toLowerCase();
            }
            return def.key === descriptor;
        })) !== null && _keyboardMap_find !== undefined ? _keyboardMap_find : {
            key: 'Unknown',
            code: 'Unknown',
            [type === '[' ? 'code' : 'key']: descriptor
        };
        defs.push({
            keyDef,
            releasePrevious,
            releaseSelf,
            repeat
        });
        text = text.slice(consumedLength);
    }while (text)
    return defs;
}

function parseKeyDef(text) {
	return parseKeyDef$1(defaultKeyMap, text);
}
function replacer(code, values) {
	return code.replace(/\{\s*(\w+)\s*\}/g, (_, key) => values[key] ?? _);
}
function resolveScreenshotPath(testPath, name, config, customPath) {
	if (customPath) {
		return resolve(dirname(testPath), customPath);
	}
	const dir = dirname(testPath);
	const base = basename(testPath);
	if (config.browser.screenshotDirectory) {
		return resolve(config.browser.screenshotDirectory, relative(config.root, dir), base, name);
	}
	return resolve(dir, "__screenshots__", base, name);
}
async function getBrowserProvider(options, project) {
	const browser = project.config.browser.name;
	const name = project.name ? `[${project.name}] ` : "";
	if (!browser) {
		throw new Error(`${name}Browser name is required. Please, set \`test.browser.instances[].browser\` option manually.`);
	}
	if (options.provider == null) {
		throw new Error(`Browser Mode requires the "provider" to always be specified.`);
	}
	const supportedBrowsers = options.provider.supportedBrowser || [];
	if (supportedBrowsers.length && !supportedBrowsers.includes(browser)) {
		throw new Error(`${name}Browser "${browser}" is not supported by the browser provider "${options.provider.name}". Supported browsers: ${supportedBrowsers.join(", ")}.`);
	}
	if (typeof options.provider.providerFactory !== "function") {
		throw new TypeError(`The "${name}" browser provider does not provide a "providerFactory" function. Received ${typeof options.provider.providerFactory}.`);
	}
	return options.provider.providerFactory(project);
}
function slash(path) {
	return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

async function resolveOrchestrator(globalServer, url, res) {
	let sessionId = url.searchParams.get("sessionId");
	// it's possible to open the page without a context
	if (!sessionId) {
		const contexts = [...globalServer.children].flatMap((p) => [...p.state.orchestrators.keys()]);
		sessionId = contexts.at(-1) ?? "none";
	}
	// it's ok to not have a session here, especially in the preview provider
	// because the user could refresh the page which would remove the session id from the url
	const session = globalServer.vitest._browserSessions.getSession(sessionId);
	const browserProject = session?.project.browser || [...globalServer.children][0];
	if (!browserProject) {
		return;
	}
	// ignore unknown pages
	if (sessionId && sessionId !== "none" && !globalServer.vitest._browserSessions.sessionIds.has(sessionId)) {
		return;
	}
	const injectorJs = typeof globalServer.injectorJs === "string" ? globalServer.injectorJs : await globalServer.injectorJs;
	const injector = replacer(injectorJs, {
		__VITEST_PROVIDER__: JSON.stringify(browserProject.config.browser.provider?.name || "preview"),
		__VITEST_CONFIG__: JSON.stringify(browserProject.wrapSerializedConfig()),
		__VITEST_VITE_CONFIG__: JSON.stringify({ root: browserProject.vite.config.root }),
		__VITEST_METHOD__: JSON.stringify("orchestrate"),
		__VITEST_TYPE__: "\"orchestrator\"",
		__VITEST_SESSION_ID__: JSON.stringify(sessionId),
		__VITEST_TESTER_ID__: "\"none\"",
		__VITEST_PROVIDED_CONTEXT__: JSON.stringify(stringify(browserProject.project.getProvidedContext())),
		__VITEST_API_TOKEN__: JSON.stringify(globalServer.vitest.config.api.token)
	});
	// disable CSP for the orchestrator as we are the ones controlling it
	res.removeHeader("Content-Security-Policy");
	if (!globalServer.orchestratorScripts) {
		globalServer.orchestratorScripts = (await globalServer.formatScripts(globalServer.config.browser.orchestratorScripts)).map((script) => {
			let html = "<script ";
			for (const attr in script.attrs || {}) {
				html += `${attr}="${script.attrs[attr]}" `;
			}
			html += `>${script.children}<\/script>`;
			return html;
		}).join("\n");
	}
	let baseHtml = typeof globalServer.orchestratorHtml === "string" ? globalServer.orchestratorHtml : await globalServer.orchestratorHtml;
	// if UI is enabled, use UI HTML and inject the orchestrator script
	if (globalServer.config.browser.ui) {
		const manifestContent = globalServer.manifest instanceof Promise ? await globalServer.manifest : globalServer.manifest;
		const jsEntry = manifestContent["orchestrator.html"].file;
		const base = browserProject.parent.vite.config.base || "/";
		baseHtml = baseHtml.replace("href=\"./favicon.ico\"", `href="${base}__vitest__/favicon.ico"`).replace("href=\"./favicon.svg\"", `href="${base}__vitest__/favicon.svg"`).replaceAll("./assets/", `${base}__vitest__/assets/`).replace("<!-- !LOAD_METADATA! -->", [
			"{__VITEST_INJECTOR__}",
			"{__VITEST_ERROR_CATCHER__}",
			"{__VITEST_SCRIPTS__}",
			`<script type="module" crossorigin src="${base}${jsEntry}"><\/script>`
		].join("\n"));
	}
	return replacer(baseHtml, {
		__VITEST_FAVICON__: globalServer.faviconUrl,
		__VITEST_TITLE__: "Vitest Browser Runner",
		__VITEST_SCRIPTS__: globalServer.orchestratorScripts,
		__VITEST_INJECTOR__: `<script type="module">${injector}<\/script>`,
		__VITEST_ERROR_CATCHER__: `<script type="module" src="${globalServer.errorCatcherUrl}"><\/script>`,
		__VITEST_SESSION_ID__: JSON.stringify(sessionId)
	});
}

function disableCache(res) {
	res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
	res.setHeader("Content-Type", "text/html; charset=utf-8");
}
function allowIframes(res) {
	// remove custom iframe related headers to allow the iframe to load
	res.removeHeader("X-Frame-Options");
}

function createOrchestratorMiddleware(parentServer) {
	return async function vitestOrchestratorMiddleware(req, res, next) {
		if (!req.url) {
			return next();
		}
		const url = new URL(req.url, "http://localhost");
		if (url.pathname !== parentServer.prefixOrchestratorUrl) {
			return next();
		}
		const html = await resolveOrchestrator(parentServer, url, res);
		if (html) {
			disableCache(res);
			allowIframes(res);
			res.write(html, "utf-8");
			res.end();
		}
	};
}

async function resolveTester(globalServer, url, res, next) {
	const csp = res.getHeader("Content-Security-Policy");
	if (typeof csp === "string") {
		// add frame-ancestors to allow the iframe to be loaded by Vitest,
		// but keep the rest of the CSP
		res.setHeader("Content-Security-Policy", csp.replace(/frame-ancestors [^;]+/, "frame-ancestors *"));
	}
	const sessionId = url.searchParams.get("sessionId") || "none";
	const session = globalServer.vitest._browserSessions.getSession(sessionId);
	if (!session) {
		res.statusCode = 400;
		res.end("Invalid session ID");
		return;
	}
	const project = globalServer.vitest.getProjectByName(session.project.name || "");
	const browserProject = project.browser || [...globalServer.children][0];
	if (!browserProject) {
		res.statusCode = 400;
		res.end("Invalid session ID");
		return;
	}
	const injectorJs = typeof globalServer.injectorJs === "string" ? globalServer.injectorJs : await globalServer.injectorJs;
	const injector = replacer(injectorJs, {
		__VITEST_PROVIDER__: JSON.stringify(project.browser.provider.name),
		__VITEST_CONFIG__: JSON.stringify(browserProject.wrapSerializedConfig()),
		__VITEST_VITE_CONFIG__: JSON.stringify({ root: browserProject.vite.config.root }),
		__VITEST_TYPE__: "\"tester\"",
		__VITEST_METHOD__: JSON.stringify("none"),
		__VITEST_SESSION_ID__: JSON.stringify(sessionId),
		__VITEST_TESTER_ID__: JSON.stringify(crypto.randomUUID()),
		__VITEST_PROVIDED_CONTEXT__: "{}",
		__VITEST_API_TOKEN__: JSON.stringify(globalServer.vitest.config.api.token)
	});
	const testerHtml = typeof browserProject.testerHtml === "string" ? browserProject.testerHtml : await browserProject.testerHtml;
	try {
		const url = join("/@fs/", browserProject.testerFilepath);
		const indexhtml = await browserProject.vite.transformIndexHtml(url, testerHtml);
		const html = replacer(indexhtml, {
			__VITEST_FAVICON__: globalServer.faviconUrl,
			__VITEST_INJECTOR__: injector
		});
		return html;
	} catch (err) {
		session.fail(err);
		next(err);
	}
}

function createTesterMiddleware(browserServer) {
	return async function vitestTesterMiddleware(req, res, next) {
		if (!req.url) {
			return next();
		}
		const url = new URL(req.url, "http://localhost");
		if (url.pathname !== browserServer.prefixTesterUrl || !url.searchParams.has("sessionId")) {
			return next();
		}
		const html = await resolveTester(browserServer, url, res, next);
		if (html) {
			disableCache(res);
			allowIframes(res);
			res.write(html, "utf-8");
			res.end();
		}
	};
}

const VIRTUAL_ID_CONTEXT = "\0vitest/browser";
const ID_CONTEXT = "vitest/browser";
// for libraries that use an older import but are not type checked
const DEPRECATED_ID_CONTEXT = "@vitest/browser/context";
const DEPRECATED_VIRTUAL_ID_UTILS = "\0@vitest/browser/utils";
const DEPRECATED_ID_UTILS = "@vitest/browser/utils";
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
function BrowserContext(globalServer) {
	return {
		name: "vitest:browser:virtual-module:context",
		enforce: "pre",
		resolveId(id, importer) {
			if (id === ID_CONTEXT) {
				return VIRTUAL_ID_CONTEXT;
			}
			if (id === DEPRECATED_ID_CONTEXT) {
				if (importer && !importer.includes("/node_modules/")) {
					globalServer.vitest.logger.deprecate(`${importer} tries to load a deprecated "${id}" module. ` + `This import will stop working in the next major version. ` + `Please, use "vitest/browser" instead.`);
				}
				return VIRTUAL_ID_CONTEXT;
			}
			if (id === DEPRECATED_ID_UTILS) {
				return DEPRECATED_VIRTUAL_ID_UTILS;
			}
		},
		load(id) {
			if (id === VIRTUAL_ID_CONTEXT) {
				return generateContextFile.call(this, globalServer);
			}
			if (id === DEPRECATED_VIRTUAL_ID_UTILS) {
				return `
import { utils } from 'vitest/browser'
export const getElementLocatorSelectors = utils.getElementLocatorSelectors
export const debug = utils.debug
export const prettyDOM = utils.prettyDOM
export const getElementError = utils.getElementError
        `;
			}
		}
	};
}
async function generateContextFile(globalServer) {
	const commands = Object.keys(globalServer.commands);
	const provider = [...globalServer.children][0].provider;
	const providerName = provider?.name || "preview";
	const commandsCode = commands.filter((command) => !command.startsWith("__vitest")).map((command) => {
		return `    ["${command}"]: (...args) => __vitest_browser_runner__.commands.triggerCommand("${command}", args),`;
	}).join("\n");
	const userEventNonProviderImport = await getUserEventImport(provider, this.resolve.bind(this));
	const distContextPath = slash$1(`/@fs/${resolve(__dirname$1, "context.js")}`);
	return `
import { page, createUserEvent, cdp, locators, utils } from '${distContextPath}'
${userEventNonProviderImport}

export const server = {
  platform: ${JSON.stringify(process.platform)},
  version: ${JSON.stringify(process.version)},
  provider: ${JSON.stringify(providerName)},
  browser: __vitest_browser_runner__.config.browser.name,
  commands: {
    ${commandsCode}
  },
  config: __vitest_browser_runner__.config,
}
export const commands = server.commands
export const userEvent = createUserEvent(_userEventSetup)
export { page, cdp, locators, utils }
`;
}
async function getUserEventImport(provider, resolve) {
	if (!provider || provider.name !== "preview") {
		return "const _userEventSetup = undefined";
	}
	const previewDistRoot = provider.distRoot;
	const resolved = await resolve("@testing-library/user-event", previewDistRoot);
	if (!resolved) {
		throw new Error(`Failed to resolve user-event package from ${previewDistRoot}`);
	}
	return `\
import { userEvent as __vitest_user_event__ } from '${slash$1(`/@fs/${resolved.id}`)}'
const _userEventSetup = __vitest_user_event__
`;
}

const versionRegexp = /(?:\?|&)v=\w{8}/;
var BrowserPlugin = (parentServer, base = "/") => {
	function isPackageExists(pkg, root) {
		return parentServer.vitest.packageInstaller.isPackageExists?.(pkg, { paths: [root] });
	}
	return [
		{
			enforce: "pre",
			name: "vitest:browser",
			async configureServer(server) {
				parentServer.setServer(server);
				// eslint-disable-next-line prefer-arrow-callback
				server.middlewares.use(function vitestHeaders(_req, res, next) {
					const headers = server.config.server.headers;
					if (headers) {
						for (const name in headers) {
							res.setHeader(name, headers[name]);
						}
					}
					next();
				});
				server.middlewares.use(createOrchestratorMiddleware(parentServer));
				server.middlewares.use(createTesterMiddleware(parentServer));
				server.middlewares.use(`${base}favicon.svg`, (_, res) => {
					const content = readFileSync(resolve(distRoot, "client/favicon.svg"));
					res.write(content, "utf-8");
					res.end();
				});
				const coverageFolder = resolveCoverageFolder(parentServer.vitest);
				const coveragePath = coverageFolder ? coverageFolder[1] : undefined;
				if (coveragePath && base === coveragePath) {
					throw new Error(`The ui base path and the coverage path cannot be the same: ${base}, change coverage.reportsDirectory`);
				}
				if (coverageFolder) {
					server.middlewares.use(coveragePath, sirv(coverageFolder[0], {
						single: true,
						dev: true,
						setHeaders: (res) => {
							const csp = res.getHeader("Content-Security-Policy");
							if (typeof csp === "string") {
								// add frame-ancestors to allow the iframe to be loaded by Vitest,
								// but keep the rest of the CSP
								res.setHeader("Content-Security-Policy", csp.replace(/frame-ancestors [^;]+/, "frame-ancestors *"));
							}
							res.setHeader("Cache-Control", "public,max-age=0,must-revalidate");
						}
					}));
				}
				const uiEnabled = parentServer.config.browser.ui;
				if (uiEnabled) {
					// eslint-disable-next-line prefer-arrow-callback
					server.middlewares.use(`${base}__screenshot-error`, function vitestBrowserScreenshotError(req, res) {
						if (!req.url) {
							res.statusCode = 404;
							res.end();
							return;
						}
						const url = new URL(req.url, "http://localhost");
						const id = url.searchParams.get("id");
						if (!id) {
							res.statusCode = 404;
							res.end();
							return;
						}
						const task = parentServer.vitest.state.idMap.get(id);
						const file = task?.meta.failScreenshotPath;
						if (!file) {
							res.statusCode = 404;
							res.end();
							return;
						}
						let stat;
						try {
							stat = lstatSync(file);
						} catch {}
						if (!stat?.isFile()) {
							res.statusCode = 404;
							res.end();
							return;
						}
						const ext = extname(file);
						const buffer = readFileSync(file);
						res.setHeader("Cache-Control", "public,max-age=0,must-revalidate");
						res.setHeader("Content-Length", buffer.length);
						res.setHeader("Content-Type", ext === "jpeg" || ext === "jpg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png");
						res.end(buffer);
					});
				}
				server.middlewares.use((req, res, next) => {
					// 9000 mega head move
					// Vite always caches optimized dependencies, but users might mock
					// them in _some_ tests, while keeping original modules in others
					// there is no way to configure that in Vite, so we patch it here
					// to always ignore the cache-control set by Vite in the next middleware
					if (req.url && versionRegexp.test(req.url) && !req.url.includes("chunk-")) {
						res.setHeader("Cache-Control", "no-cache");
						const setHeader = res.setHeader.bind(res);
						res.setHeader = function(name, value) {
							if (name === "Cache-Control") {
								return res;
							}
							return setHeader(name, value);
						};
					}
					next();
				});
				// handle attachments the same way as in packages/ui/node/index.ts
				server.middlewares.use((req, res, next) => {
					if (!req.url) {
						return next();
					}
					const url = new URL(req.url, "http://localhost");
					if (url.pathname !== "/__vitest_attachment__") {
						return next();
					}
					const path = url.searchParams.get("path");
					const contentType = url.searchParams.get("contentType");
					if (!isValidApiRequest(parentServer.config, req) || !contentType || !path) {
						return next();
					}
					const fsPath = decodeURIComponent(path);
					if (!isFileServingAllowed(parentServer.vite.config, fsPath)) {
						return next();
					}
					try {
						res.setHeader("content-type", contentType);
						return createReadStream(fsPath).pipe(res).on("close", () => res.end());
					} catch (err) {
						return next(err);
					}
				});
			}
		},
		{
			name: "vitest:browser:tests",
			enforce: "pre",
			async config() {
				// this plugin can be used in different projects, but all of them
				// have the same `include` pattern, so it doesn't matter which project we use
				const project = parentServer.project;
				const { testFiles: browserTestFiles } = await project.globTestFiles();
				const setupFiles = toArray(project.config.setupFiles);
				// replace env values - cannot be reassign at runtime
				const define = {};
				for (const env in project.config.env || {}) {
					const stringValue = JSON.stringify(project.config.env[env]);
					define[`import.meta.env.${env}`] = stringValue;
				}
				const entries = [
					...browserTestFiles,
					...setupFiles,
					resolve(distDir, "index.js"),
					resolve(distDir, "browser.js"),
					resolve(distDir, "runners.js"),
					resolve(distDir, "utils.js"),
					...project.config.snapshotSerializers || []
				];
				const exclude = [
					"vitest",
					"vitest/browser",
					"vitest/internal/browser",
					"vitest/runners",
					"vite/module-runner",
					"@vitest/browser/utils",
					"@vitest/browser/context",
					"@vitest/browser/client",
					"@vitest/utils",
					"@vitest/utils/source-map",
					"@vitest/runner",
					"@vitest/spy",
					"@vitest/utils/error",
					"@vitest/snapshot",
					"@vitest/expect",
					"std-env",
					"tinybench",
					"tinyspy",
					"tinyrainbow",
					"pathe",
					"msw",
					"msw/browser"
				];
				if (typeof project.config.diff === "string") {
					entries.push(project.config.diff);
				}
				if (parentServer.vitest.coverageProvider) {
					const coverage = parentServer.vitest._coverageOptions;
					const provider = coverage.provider;
					if (provider === "v8") {
						const path = tryResolve("@vitest/coverage-v8", [parentServer.config.root]);
						if (path) {
							entries.push(path);
							exclude.push("@vitest/coverage-v8/browser");
						}
					} else if (provider === "istanbul") {
						const path = tryResolve("@vitest/coverage-istanbul", [parentServer.config.root]);
						if (path) {
							entries.push(path);
							exclude.push("@vitest/coverage-istanbul");
						}
					} else if (provider === "custom" && coverage.customProviderModule) {
						entries.push(coverage.customProviderModule);
					}
				}
				const include = [
					"vitest > expect-type",
					"vitest > @vitest/snapshot > magic-string",
					"vitest > @vitest/expect > chai"
				];
				const provider = parentServer.config.browser.provider || [...parentServer.children][0]?.provider;
				if (provider?.name === "preview") {
					include.push("@vitest/browser-preview > @testing-library/user-event", "@vitest/browser-preview > @testing-library/dom");
				}
				const fileRoot = browserTestFiles[0] ? dirname(browserTestFiles[0]) : project.config.root;
				const svelte = isPackageExists("vitest-browser-svelte", fileRoot);
				if (svelte) {
					exclude.push("vitest-browser-svelte");
				}
				// since we override the resolution in the esbuild plugin, Vite can no longer optimizer it
				const vue = isPackageExists("vitest-browser-vue", fileRoot);
				if (vue) {
					// we override them in the esbuild plugin so optimizer can no longer intercept it
					include.push("vitest-browser-vue", "vitest-browser-vue > @vue/test-utils", "vitest-browser-vue > @vue/test-utils > @vue/compiler-core");
				}
				const vueTestUtils = isPackageExists("@vue/test-utils", fileRoot);
				if (vueTestUtils) {
					include.push("@vue/test-utils");
				}
				return {
					define,
					resolve: { dedupe: ["vitest"] },
					optimizeDeps: {
						entries,
						exclude,
						include
					}
				};
			},
			async resolveId(id) {
				if (!/\?browserv=\w+$/.test(id)) {
					return;
				}
				let useId = id.slice(0, id.lastIndexOf("?"));
				if (useId.startsWith("/@fs/")) {
					useId = useId.slice(5);
				}
				if (/^\w:/.test(useId)) {
					useId = useId.replace(/\\/g, "/");
				}
				return useId;
			}
		},
		{
			name: "vitest:browser:resolve-virtual",
			async resolveId(rawId) {
				if (rawId === "/mockServiceWorker.js") {
					return this.resolve("msw/mockServiceWorker.js", distRoot, { skipSelf: true });
				}
			}
		},
		{
			name: "vitest:browser:assets",
			configureServer(server) {
				server.middlewares.use("/__vitest__", sirv(resolve(distRoot, "client/__vitest__")));
			},
			resolveId(id) {
				if (id.startsWith("/__vitest_browser__/")) {
					return resolve(distRoot, "client", id.slice(1));
				}
			},
			transform(code, id) {
				if (id.includes(parentServer.vite.config.cacheDir) && id.includes("loupe.js")) {
					// loupe bundle has a nastry require('util') call that leaves a warning in the console
					const utilRequire = "nodeUtil = require_util();";
					return code.replace(utilRequire, " ".repeat(utilRequire.length));
				}
			}
		},
		BrowserContext(parentServer),
		dynamicImportPlugin({
			globalThisAccessor: "\"__vitest_browser_runner__\"",
			filter(id) {
				if (id.includes(distRoot)) {
					return false;
				}
				return true;
			}
		}),
		{
			name: "vitest:browser:config",
			enforce: "post",
			async config(viteConfig) {
				// Enables using ignore hint for coverage providers with @preserve keyword
				if (viteConfig.esbuild !== false) {
					viteConfig.esbuild ||= {};
					viteConfig.esbuild.legalComments = "inline";
				}
				const defaultPort = parentServer.vitest.state._data.browserLastPort++;
				const api = resolveApiServerConfig(viteConfig.test?.browser || {}, defaultPort);
				viteConfig.server = {
					...viteConfig.server,
					port: defaultPort,
					...api,
					middlewareMode: false,
					open: false
				};
				viteConfig.server.fs ??= {};
				viteConfig.server.fs.allow = viteConfig.server.fs.allow || [];
				viteConfig.server.fs.allow.push(...resolveFsAllow(parentServer.vitest.config.root, parentServer.vitest.vite.config.configFile), distRoot);
				return { resolve: { alias: viteConfig.test?.alias } };
			}
		},
		{
			name: "vitest:browser:in-source-tests",
			transform: {
				filter: { code: /import\.meta\.vitest/ },
				handler(code, id) {
					const filename = cleanUrl(id);
					if (!code.includes("import.meta.vitest")) {
						return;
					}
					const s = new MagicString(code, { filename });
					s.prepend(`Object.defineProperty(import.meta, 'vitest', { get() { return typeof __vitest_worker__ !== 'undefined' && __vitest_worker__.filepath === "${filename.replace(/"/g, "\\\"")}" ? __vitest_index__ : undefined } });\n`);
					return {
						code: s.toString(),
						map: s.generateMap({ hires: true })
					};
				}
			}
		},
		{
			name: "vitest:browser:worker",
			transform(code, id, _options) {
				// https://github.com/vitejs/vite/blob/ba56cf43b5480f8519349f7d7fe60718e9af5f1a/packages/vite/src/node/plugins/worker.ts#L46
				if (/(?:\?|&)worker_file&type=\w+(?:&|$)/.test(id)) {
					const s = new MagicString(code);
					s.prepend("globalThis.__vitest_browser_runner__ = { wrapDynamicImport: f => f() };\n");
					return {
						code: s.toString(),
						map: s.generateMap({ hires: "boundary" })
					};
				}
			}
		},
		{
			name: "vitest:browser:transform-tester-html",
			enforce: "pre",
			async transformIndexHtml(html, ctx) {
				const projectBrowser = [...parentServer.children].find((server) => {
					return ctx.filename === server.testerFilepath;
				});
				if (!projectBrowser) {
					return;
				}
				const stateJs = typeof parentServer.stateJs === "string" ? parentServer.stateJs : await parentServer.stateJs;
				const testerTags = [];
				const isDefaultTemplate = resolve(distRoot, "client/tester/tester.html") === projectBrowser.testerFilepath;
				if (!isDefaultTemplate) {
					const manifestContent = parentServer.manifest instanceof Promise ? await parentServer.manifest : parentServer.manifest;
					const testerEntry = manifestContent["tester/tester.html"];
					testerTags.push({
						tag: "script",
						attrs: {
							type: "module",
							crossorigin: "",
							src: `${parentServer.base}${testerEntry.file}`
						},
						injectTo: "head"
					});
					for (const importName of testerEntry.imports || []) {
						const entryManifest = manifestContent[importName];
						if (entryManifest) {
							testerTags.push({
								tag: "link",
								attrs: {
									href: `${parentServer.base}${entryManifest.file}`,
									rel: "modulepreload",
									crossorigin: ""
								},
								injectTo: "head"
							});
						}
					}
				} else {
					// inject the reset style only in the default template,
					// allowing users to customize the style in their own template
					testerTags.push({
						tag: "style",
						children: `
html {
  padding: 0;
  margin: 0;
}
body {
  padding: 0;
  margin: 0;
  min-height: 100vh;
}`,
						injectTo: "head"
					});
				}
				return [
					{
						tag: "script",
						children: "{__VITEST_INJECTOR__}",
						injectTo: "head-prepend"
					},
					{
						tag: "script",
						children: stateJs,
						injectTo: "head-prepend"
					},
					{
						tag: "script",
						attrs: {
							type: "module",
							src: parentServer.errorCatcherUrl
						},
						injectTo: "head"
					},
					{
						tag: "script",
						attrs: {
							type: "module",
							src: parentServer.matchersUrl
						},
						injectTo: "head"
					},
					...parentServer.initScripts.map((script) => ({
						tag: "script",
						attrs: {
							type: "module",
							src: join("/@fs/", script)
						},
						injectTo: "head"
					})),
					...testerTags
				].filter((s) => s != null);
			}
		},
		{
			name: "vitest:browser:support-testing-library",
			enforce: "pre",
			config() {
				const rolldownPlugin = {
					name: "vue-test-utils-rewrite",
					resolveId: {
						filter: { id: /^@vue\/(test-utils|compiler-core)$/ },
						handler(source, importer) {
							const resolved = getRequire().resolve(source, { paths: [importer] });
							return resolved;
						}
					}
				};
				const esbuildPlugin = {
					name: "test-utils-rewrite",
					setup(build) {
						// test-utils: resolve to CJS instead of the browser because the browser version expects a global Vue object
						// compiler-core: only CJS version allows slots as strings
						build.onResolve({ filter: /^@vue\/(test-utils|compiler-core)$/ }, (args) => {
							const resolved = getRequire().resolve(args.path, { paths: [args.importer] });
							return { path: resolved };
						});
					}
				};
				return { optimizeDeps: rolldownVersion ? { rolldownOptions: { plugins: [rolldownPlugin] } } : { esbuildOptions: { plugins: [esbuildPlugin] } } };
			}
		},
		{
			name: "vitest:browser:__vitest_browser_import_meta_env_init__",
			transform: { handler(code) {
				// this transform runs after `vitest:meta-env-replacer` so that
				// `import.meta.env` will be handled by Vite import analysis to match behavior.
				if (code.includes("__vitest_browser_import_meta_env_init__")) {
					return code.replace("__vitest_browser_import_meta_env_init__", "import.meta.env");
				}
			} }
		}
	];
};
function tryResolve(path, paths) {
	try {
		const _require = getRequire();
		return _require.resolve(path, { paths });
	} catch {
		return undefined;
	}
}
let _require;
function getRequire() {
	if (!_require) {
		_require = createRequire(import.meta.url);
	}
	return _require;
}
function resolveCoverageFolder(vitest) {
	const options = vitest.config;
	const coverageOptions = vitest._coverageOptions;
	const htmlReporter = coverageOptions?.enabled ? toArray(options.coverage.reporter).find((reporter) => {
		if (typeof reporter === "string") {
			return reporter === "html";
		}
		return reporter[0] === "html";
	}) : undefined;
	if (!htmlReporter) {
		return undefined;
	}
	// reportsDirectory not resolved yet
	const root = resolve(options.root || process.cwd(), coverageOptions.reportsDirectory || coverageConfigDefaults.reportsDirectory);
	const subdir = Array.isArray(htmlReporter) && htmlReporter.length > 1 && "subdir" in htmlReporter[1] ? htmlReporter[1].subdir : undefined;
	if (!subdir || typeof subdir !== "string") {
		return [root, `/${basename(root)}/`];
	}
	return [resolve(root, subdir), `/${basename(root)}/${subdir}/`];
}
const postfixRE = /[?#].*$/;
function cleanUrl(url) {
	return url.replace(postfixRE, "");
}

class BrowserServerCDPHandler {
	listenerIds = {};
	listeners = {};
	constructor(session, tester) {
		this.session = session;
		this.tester = tester;
	}
	send(method, params) {
		return this.session.send(method, params);
	}
	on(event, id, once = false) {
		if (!this.listenerIds[event]) {
			this.listenerIds[event] = [];
		}
		this.listenerIds[event].push(id);
		if (!this.listeners[event]) {
			this.listeners[event] = (payload) => {
				this.tester.cdpEvent(event, payload);
				if (once) {
					this.off(event, id);
				}
			};
			this.session.on(event, this.listeners[event]);
		}
	}
	off(event, id) {
		if (!this.listenerIds[event]) {
			this.listenerIds[event] = [];
		}
		this.listenerIds[event] = this.listenerIds[event].filter((l) => l !== id);
		if (!this.listenerIds[event].length) {
			this.session.off(event, this.listeners[event]);
			delete this.listeners[event];
		}
	}
	once(event, listener) {
		this.on(event, listener, true);
	}
}

const types = {
    'application/andrew-inset': ['ez'],
    'application/appinstaller': ['appinstaller'],
    'application/applixware': ['aw'],
    'application/appx': ['appx'],
    'application/appxbundle': ['appxbundle'],
    'application/atom+xml': ['atom'],
    'application/atomcat+xml': ['atomcat'],
    'application/atomdeleted+xml': ['atomdeleted'],
    'application/atomsvc+xml': ['atomsvc'],
    'application/atsc-dwd+xml': ['dwd'],
    'application/atsc-held+xml': ['held'],
    'application/atsc-rsat+xml': ['rsat'],
    'application/automationml-aml+xml': ['aml'],
    'application/automationml-amlx+zip': ['amlx'],
    'application/bdoc': ['bdoc'],
    'application/calendar+xml': ['xcs'],
    'application/ccxml+xml': ['ccxml'],
    'application/cdfx+xml': ['cdfx'],
    'application/cdmi-capability': ['cdmia'],
    'application/cdmi-container': ['cdmic'],
    'application/cdmi-domain': ['cdmid'],
    'application/cdmi-object': ['cdmio'],
    'application/cdmi-queue': ['cdmiq'],
    'application/cpl+xml': ['cpl'],
    'application/cu-seeme': ['cu'],
    'application/cwl': ['cwl'],
    'application/dash+xml': ['mpd'],
    'application/dash-patch+xml': ['mpp'],
    'application/davmount+xml': ['davmount'],
    'application/dicom': ['dcm'],
    'application/docbook+xml': ['dbk'],
    'application/dssc+der': ['dssc'],
    'application/dssc+xml': ['xdssc'],
    'application/ecmascript': ['ecma'],
    'application/emma+xml': ['emma'],
    'application/emotionml+xml': ['emotionml'],
    'application/epub+zip': ['epub'],
    'application/exi': ['exi'],
    'application/express': ['exp'],
    'application/fdf': ['fdf'],
    'application/fdt+xml': ['fdt'],
    'application/font-tdpfr': ['pfr'],
    'application/geo+json': ['geojson'],
    'application/gml+xml': ['gml'],
    'application/gpx+xml': ['gpx'],
    'application/gxf': ['gxf'],
    'application/gzip': ['gz'],
    'application/hjson': ['hjson'],
    'application/hyperstudio': ['stk'],
    'application/inkml+xml': ['ink', 'inkml'],
    'application/ipfix': ['ipfix'],
    'application/its+xml': ['its'],
    'application/java-archive': ['jar', 'war', 'ear'],
    'application/java-serialized-object': ['ser'],
    'application/java-vm': ['class'],
    'application/javascript': ['*js'],
    'application/json': ['json', 'map'],
    'application/json5': ['json5'],
    'application/jsonml+json': ['jsonml'],
    'application/ld+json': ['jsonld'],
    'application/lgr+xml': ['lgr'],
    'application/lost+xml': ['lostxml'],
    'application/mac-binhex40': ['hqx'],
    'application/mac-compactpro': ['cpt'],
    'application/mads+xml': ['mads'],
    'application/manifest+json': ['webmanifest'],
    'application/marc': ['mrc'],
    'application/marcxml+xml': ['mrcx'],
    'application/mathematica': ['ma', 'nb', 'mb'],
    'application/mathml+xml': ['mathml'],
    'application/mbox': ['mbox'],
    'application/media-policy-dataset+xml': ['mpf'],
    'application/mediaservercontrol+xml': ['mscml'],
    'application/metalink+xml': ['metalink'],
    'application/metalink4+xml': ['meta4'],
    'application/mets+xml': ['mets'],
    'application/mmt-aei+xml': ['maei'],
    'application/mmt-usd+xml': ['musd'],
    'application/mods+xml': ['mods'],
    'application/mp21': ['m21', 'mp21'],
    'application/mp4': ['*mp4', '*mpg4', 'mp4s', 'm4p'],
    'application/msix': ['msix'],
    'application/msixbundle': ['msixbundle'],
    'application/msword': ['doc', 'dot'],
    'application/mxf': ['mxf'],
    'application/n-quads': ['nq'],
    'application/n-triples': ['nt'],
    'application/node': ['cjs'],
    'application/octet-stream': [
        'bin',
        'dms',
        'lrf',
        'mar',
        'so',
        'dist',
        'distz',
        'pkg',
        'bpk',
        'dump',
        'elc',
        'deploy',
        'exe',
        'dll',
        'deb',
        'dmg',
        'iso',
        'img',
        'msi',
        'msp',
        'msm',
        'buffer',
    ],
    'application/oda': ['oda'],
    'application/oebps-package+xml': ['opf'],
    'application/ogg': ['ogx'],
    'application/omdoc+xml': ['omdoc'],
    'application/onenote': [
        'onetoc',
        'onetoc2',
        'onetmp',
        'onepkg',
        'one',
        'onea',
    ],
    'application/oxps': ['oxps'],
    'application/p2p-overlay+xml': ['relo'],
    'application/patch-ops-error+xml': ['xer'],
    'application/pdf': ['pdf'],
    'application/pgp-encrypted': ['pgp'],
    'application/pgp-keys': ['asc'],
    'application/pgp-signature': ['sig', '*asc'],
    'application/pics-rules': ['prf'],
    'application/pkcs10': ['p10'],
    'application/pkcs7-mime': ['p7m', 'p7c'],
    'application/pkcs7-signature': ['p7s'],
    'application/pkcs8': ['p8'],
    'application/pkix-attr-cert': ['ac'],
    'application/pkix-cert': ['cer'],
    'application/pkix-crl': ['crl'],
    'application/pkix-pkipath': ['pkipath'],
    'application/pkixcmp': ['pki'],
    'application/pls+xml': ['pls'],
    'application/postscript': ['ai', 'eps', 'ps'],
    'application/provenance+xml': ['provx'],
    'application/pskc+xml': ['pskcxml'],
    'application/raml+yaml': ['raml'],
    'application/rdf+xml': ['rdf', 'owl'],
    'application/reginfo+xml': ['rif'],
    'application/relax-ng-compact-syntax': ['rnc'],
    'application/resource-lists+xml': ['rl'],
    'application/resource-lists-diff+xml': ['rld'],
    'application/rls-services+xml': ['rs'],
    'application/route-apd+xml': ['rapd'],
    'application/route-s-tsid+xml': ['sls'],
    'application/route-usd+xml': ['rusd'],
    'application/rpki-ghostbusters': ['gbr'],
    'application/rpki-manifest': ['mft'],
    'application/rpki-roa': ['roa'],
    'application/rsd+xml': ['rsd'],
    'application/rss+xml': ['rss'],
    'application/rtf': ['rtf'],
    'application/sbml+xml': ['sbml'],
    'application/scvp-cv-request': ['scq'],
    'application/scvp-cv-response': ['scs'],
    'application/scvp-vp-request': ['spq'],
    'application/scvp-vp-response': ['spp'],
    'application/sdp': ['sdp'],
    'application/senml+xml': ['senmlx'],
    'application/sensml+xml': ['sensmlx'],
    'application/set-payment-initiation': ['setpay'],
    'application/set-registration-initiation': ['setreg'],
    'application/shf+xml': ['shf'],
    'application/sieve': ['siv', 'sieve'],
    'application/smil+xml': ['smi', 'smil'],
    'application/sparql-query': ['rq'],
    'application/sparql-results+xml': ['srx'],
    'application/sql': ['sql'],
    'application/srgs': ['gram'],
    'application/srgs+xml': ['grxml'],
    'application/sru+xml': ['sru'],
    'application/ssdl+xml': ['ssdl'],
    'application/ssml+xml': ['ssml'],
    'application/swid+xml': ['swidtag'],
    'application/tei+xml': ['tei', 'teicorpus'],
    'application/thraud+xml': ['tfi'],
    'application/timestamped-data': ['tsd'],
    'application/toml': ['toml'],
    'application/trig': ['trig'],
    'application/ttml+xml': ['ttml'],
    'application/ubjson': ['ubj'],
    'application/urc-ressheet+xml': ['rsheet'],
    'application/urc-targetdesc+xml': ['td'],
    'application/voicexml+xml': ['vxml'],
    'application/wasm': ['wasm'],
    'application/watcherinfo+xml': ['wif'],
    'application/widget': ['wgt'],
    'application/winhlp': ['hlp'],
    'application/wsdl+xml': ['wsdl'],
    'application/wspolicy+xml': ['wspolicy'],
    'application/xaml+xml': ['xaml'],
    'application/xcap-att+xml': ['xav'],
    'application/xcap-caps+xml': ['xca'],
    'application/xcap-diff+xml': ['xdf'],
    'application/xcap-el+xml': ['xel'],
    'application/xcap-ns+xml': ['xns'],
    'application/xenc+xml': ['xenc'],
    'application/xfdf': ['xfdf'],
    'application/xhtml+xml': ['xhtml', 'xht'],
    'application/xliff+xml': ['xlf'],
    'application/xml': ['xml', 'xsl', 'xsd', 'rng'],
    'application/xml-dtd': ['dtd'],
    'application/xop+xml': ['xop'],
    'application/xproc+xml': ['xpl'],
    'application/xslt+xml': ['*xsl', 'xslt'],
    'application/xspf+xml': ['xspf'],
    'application/xv+xml': ['mxml', 'xhvml', 'xvml', 'xvm'],
    'application/yang': ['yang'],
    'application/yin+xml': ['yin'],
    'application/zip': ['zip'],
    'application/zip+dotlottie': ['lottie'],
    'audio/3gpp': ['*3gpp'],
    'audio/aac': ['adts', 'aac'],
    'audio/adpcm': ['adp'],
    'audio/amr': ['amr'],
    'audio/basic': ['au', 'snd'],
    'audio/midi': ['mid', 'midi', 'kar', 'rmi'],
    'audio/mobile-xmf': ['mxmf'],
    'audio/mp3': ['*mp3'],
    'audio/mp4': ['m4a', 'mp4a', 'm4b'],
    'audio/mpeg': ['mpga', 'mp2', 'mp2a', 'mp3', 'm2a', 'm3a'],
    'audio/ogg': ['oga', 'ogg', 'spx', 'opus'],
    'audio/s3m': ['s3m'],
    'audio/silk': ['sil'],
    'audio/wav': ['wav'],
    'audio/wave': ['*wav'],
    'audio/webm': ['weba'],
    'audio/xm': ['xm'],
    'font/collection': ['ttc'],
    'font/otf': ['otf'],
    'font/ttf': ['ttf'],
    'font/woff': ['woff'],
    'font/woff2': ['woff2'],
    'image/aces': ['exr'],
    'image/apng': ['apng'],
    'image/avci': ['avci'],
    'image/avcs': ['avcs'],
    'image/avif': ['avif'],
    'image/bmp': ['bmp', 'dib'],
    'image/cgm': ['cgm'],
    'image/dicom-rle': ['drle'],
    'image/dpx': ['dpx'],
    'image/emf': ['emf'],
    'image/fits': ['fits'],
    'image/g3fax': ['g3'],
    'image/gif': ['gif'],
    'image/heic': ['heic'],
    'image/heic-sequence': ['heics'],
    'image/heif': ['heif'],
    'image/heif-sequence': ['heifs'],
    'image/hej2k': ['hej2'],
    'image/ief': ['ief'],
    'image/jaii': ['jaii'],
    'image/jais': ['jais'],
    'image/jls': ['jls'],
    'image/jp2': ['jp2', 'jpg2'],
    'image/jpeg': ['jpg', 'jpeg', 'jpe'],
    'image/jph': ['jph'],
    'image/jphc': ['jhc'],
    'image/jpm': ['jpm', 'jpgm'],
    'image/jpx': ['jpx', 'jpf'],
    'image/jxl': ['jxl'],
    'image/jxr': ['jxr'],
    'image/jxra': ['jxra'],
    'image/jxrs': ['jxrs'],
    'image/jxs': ['jxs'],
    'image/jxsc': ['jxsc'],
    'image/jxsi': ['jxsi'],
    'image/jxss': ['jxss'],
    'image/ktx': ['ktx'],
    'image/ktx2': ['ktx2'],
    'image/pjpeg': ['jfif'],
    'image/png': ['png'],
    'image/sgi': ['sgi'],
    'image/svg+xml': ['svg', 'svgz'],
    'image/t38': ['t38'],
    'image/tiff': ['tif', 'tiff'],
    'image/tiff-fx': ['tfx'],
    'image/webp': ['webp'],
    'image/wmf': ['wmf'],
    'message/disposition-notification': ['disposition-notification'],
    'message/global': ['u8msg'],
    'message/global-delivery-status': ['u8dsn'],
    'message/global-disposition-notification': ['u8mdn'],
    'message/global-headers': ['u8hdr'],
    'message/rfc822': ['eml', 'mime', 'mht', 'mhtml'],
    'model/3mf': ['3mf'],
    'model/gltf+json': ['gltf'],
    'model/gltf-binary': ['glb'],
    'model/iges': ['igs', 'iges'],
    'model/jt': ['jt'],
    'model/mesh': ['msh', 'mesh', 'silo'],
    'model/mtl': ['mtl'],
    'model/obj': ['obj'],
    'model/prc': ['prc'],
    'model/step': ['step', 'stp', 'stpnc', 'p21', '210'],
    'model/step+xml': ['stpx'],
    'model/step+zip': ['stpz'],
    'model/step-xml+zip': ['stpxz'],
    'model/stl': ['stl'],
    'model/u3d': ['u3d'],
    'model/vrml': ['wrl', 'vrml'],
    'model/x3d+binary': ['*x3db', 'x3dbz'],
    'model/x3d+fastinfoset': ['x3db'],
    'model/x3d+vrml': ['*x3dv', 'x3dvz'],
    'model/x3d+xml': ['x3d', 'x3dz'],
    'model/x3d-vrml': ['x3dv'],
    'text/cache-manifest': ['appcache', 'manifest'],
    'text/calendar': ['ics', 'ifb'],
    'text/coffeescript': ['coffee', 'litcoffee'],
    'text/css': ['css'],
    'text/csv': ['csv'],
    'text/html': ['html', 'htm', 'shtml'],
    'text/jade': ['jade'],
    'text/javascript': ['js', 'mjs'],
    'text/jsx': ['jsx'],
    'text/less': ['less'],
    'text/markdown': ['md', 'markdown'],
    'text/mathml': ['mml'],
    'text/mdx': ['mdx'],
    'text/n3': ['n3'],
    'text/plain': ['txt', 'text', 'conf', 'def', 'list', 'log', 'in', 'ini'],
    'text/richtext': ['rtx'],
    'text/rtf': ['*rtf'],
    'text/sgml': ['sgml', 'sgm'],
    'text/shex': ['shex'],
    'text/slim': ['slim', 'slm'],
    'text/spdx': ['spdx'],
    'text/stylus': ['stylus', 'styl'],
    'text/tab-separated-values': ['tsv'],
    'text/troff': ['t', 'tr', 'roff', 'man', 'me', 'ms'],
    'text/turtle': ['ttl'],
    'text/uri-list': ['uri', 'uris', 'urls'],
    'text/vcard': ['vcard'],
    'text/vtt': ['vtt'],
    'text/wgsl': ['wgsl'],
    'text/xml': ['*xml'],
    'text/yaml': ['yaml', 'yml'],
    'video/3gpp': ['3gp', '3gpp'],
    'video/3gpp2': ['3g2'],
    'video/h261': ['h261'],
    'video/h263': ['h263'],
    'video/h264': ['h264'],
    'video/iso.segment': ['m4s'],
    'video/jpeg': ['jpgv'],
    'video/jpm': ['*jpm', '*jpgm'],
    'video/mj2': ['mj2', 'mjp2'],
    'video/mp2t': ['ts', 'm2t', 'm2ts', 'mts'],
    'video/mp4': ['mp4', 'mp4v', 'mpg4'],
    'video/mpeg': ['mpeg', 'mpg', 'mpe', 'm1v', 'm2v'],
    'video/ogg': ['ogv'],
    'video/quicktime': ['qt', 'mov'],
    'video/webm': ['webm'],
};
Object.freeze(types);

var __classPrivateFieldGet = (null && null.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Mime_extensionToType, _Mime_typeToExtension, _Mime_typeToExtensions;
class Mime {
    constructor(...args) {
        _Mime_extensionToType.set(this, new Map());
        _Mime_typeToExtension.set(this, new Map());
        _Mime_typeToExtensions.set(this, new Map());
        for (const arg of args) {
            this.define(arg);
        }
    }
    define(typeMap, force = false) {
        for (let [type, extensions] of Object.entries(typeMap)) {
            type = type.toLowerCase();
            extensions = extensions.map((ext) => ext.toLowerCase());
            if (!__classPrivateFieldGet(this, _Mime_typeToExtensions, "f").has(type)) {
                __classPrivateFieldGet(this, _Mime_typeToExtensions, "f").set(type, new Set());
            }
            const allExtensions = __classPrivateFieldGet(this, _Mime_typeToExtensions, "f").get(type);
            let first = true;
            for (let extension of extensions) {
                const starred = extension.startsWith('*');
                extension = starred ? extension.slice(1) : extension;
                allExtensions?.add(extension);
                if (first) {
                    __classPrivateFieldGet(this, _Mime_typeToExtension, "f").set(type, extension);
                }
                first = false;
                if (starred)
                    continue;
                const currentType = __classPrivateFieldGet(this, _Mime_extensionToType, "f").get(extension);
                if (currentType && currentType != type && !force) {
                    throw new Error(`"${type} -> ${extension}" conflicts with "${currentType} -> ${extension}". Pass \`force=true\` to override this definition.`);
                }
                __classPrivateFieldGet(this, _Mime_extensionToType, "f").set(extension, type);
            }
        }
        return this;
    }
    getType(path) {
        if (typeof path !== 'string')
            return null;
        const last = path.replace(/^.*[/\\]/s, '').toLowerCase();
        const ext = last.replace(/^.*\./s, '').toLowerCase();
        const hasPath = last.length < path.length;
        const hasDot = ext.length < last.length - 1;
        if (!hasDot && hasPath)
            return null;
        return __classPrivateFieldGet(this, _Mime_extensionToType, "f").get(ext) ?? null;
    }
    getExtension(type) {
        if (typeof type !== 'string')
            return null;
        type = type?.split?.(';')[0];
        return ((type && __classPrivateFieldGet(this, _Mime_typeToExtension, "f").get(type.trim().toLowerCase())) ?? null);
    }
    getAllExtensions(type) {
        if (typeof type !== 'string')
            return null;
        return __classPrivateFieldGet(this, _Mime_typeToExtensions, "f").get(type.toLowerCase()) ?? null;
    }
    _freeze() {
        this.define = () => {
            throw new Error('define() not allowed for built-in Mime objects. See https://github.com/broofa/mime/blob/main/README.md#custom-mime-instances');
        };
        Object.freeze(this);
        for (const extensions of __classPrivateFieldGet(this, _Mime_typeToExtensions, "f").values()) {
            Object.freeze(extensions);
        }
        return this;
    }
    _getTestState() {
        return {
            types: __classPrivateFieldGet(this, _Mime_extensionToType, "f"),
            extensions: __classPrivateFieldGet(this, _Mime_typeToExtension, "f"),
        };
    }
}
_Mime_extensionToType = new WeakMap(), _Mime_typeToExtension = new WeakMap(), _Mime_typeToExtensions = new WeakMap();

var mime = new Mime(types)._freeze();

function assertFileAccess(path, project) {
	if (!isFileServingAllowed(path, project.vite) && !isFileServingAllowed(path, project.vitest.vite)) {
		throw new Error(`Access denied to "${path}". See Vite config documentation for "server.fs": https://vitejs.dev/config/server-options.html#server-fs-strict.`);
	}
}
const readFile = async ({ project }, path, options = {}) => {
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(filepath, project);
	// never return a Buffer
	if (typeof options === "object" && !options.encoding) {
		options.encoding = "utf-8";
	}
	return promises.readFile(filepath, options);
};
const writeFile = async ({ project }, path, data, options) => {
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(filepath, project);
	const dir = dirname$1(filepath);
	if (!fs.existsSync(dir)) {
		await promises.mkdir(dir, { recursive: true });
	}
	await promises.writeFile(filepath, data, options);
};
const removeFile = async ({ project }, path) => {
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(filepath, project);
	await promises.rm(filepath);
};
const _fileInfo = async ({ project }, path, encoding) => {
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(filepath, project);
	const content = await promises.readFile(filepath, encoding || "base64");
	return {
		content,
		basename: basename$1(filepath),
		mime: mime.getType(filepath)
	};
};

const screenshot = async (context, name, options = {}) => {
	options.save ??= true;
	if (!options.save) {
		options.base64 = true;
	}
	const { buffer, path } = await context.triggerCommand("__vitest_takeScreenshot", name, options);
	return returnResult(options, path, buffer);
};
function returnResult(options, path, buffer) {
	if (!options.save) {
		return buffer.toString("base64");
	}
	if (options.base64) {
		return {
			path,
			base64: buffer.toString("base64")
		};
	}
	return path;
}

const codec = {
	decode: (buffer, options) => {
		const { data, alpha, bpp, color, colorType, depth, height, interlace, palette, width } = PNG.sync.read(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer), options);
		return {
			metadata: {
				alpha,
				bpp,
				color,
				colorType,
				depth,
				height,
				interlace,
				palette,
				width
			},
			data
		};
	},
	encode: ({ data, metadata: { height, width } }, options) => {
		const png = new PNG({
			height,
			width
		});
		png.data = Buffer.isBuffer(data) ? data : Buffer.from(data);
		return PNG.sync.write(png, options);
	}
};

function getCodec(type) {
	switch (type) {
		case "png": return codec;
		default: throw new Error(`No codec found for type ${type}`);
	}
}

const defaultOptions$1 = {
	allowedMismatchedPixelRatio: undefined,
	allowedMismatchedPixels: undefined,
	threshold: .1,
	includeAA: false,
	alpha: .1,
	aaColor: [
		255,
		255,
		0
	],
	diffColor: [
		255,
		0,
		0
	],
	diffColorAlt: undefined,
	diffMask: false
};
const pixelmatch = (reference, actual, { createDiff, ...options }) => {
	if (reference.metadata.height !== actual.metadata.height || reference.metadata.width !== actual.metadata.width) {
		return {
			pass: false,
			diff: null,
			message: `Expected image dimensions to be ${reference.metadata.width}×${reference.metadata.height}px, but received ${actual.metadata.width}×${actual.metadata.height}px.`
		};
	}
	const optionsWithDefaults = {
		...defaultOptions$1,
		...options
	};
	const diffBuffer = createDiff ? new Uint8Array(reference.data.length) : undefined;
	const mismatchedPixels = pm(reference.data, actual.data, diffBuffer, reference.metadata.width, reference.metadata.height, optionsWithDefaults);
	const imageArea = reference.metadata.width * reference.metadata.height;
	let allowedMismatchedPixels = Math.min(optionsWithDefaults.allowedMismatchedPixels ?? Number.POSITIVE_INFINITY, (optionsWithDefaults.allowedMismatchedPixelRatio ?? Number.POSITIVE_INFINITY) * imageArea);
	if (allowedMismatchedPixels === Number.POSITIVE_INFINITY) {
		allowedMismatchedPixels = 0;
	}
	const pass = mismatchedPixels <= allowedMismatchedPixels;
	return {
		pass,
		diff: diffBuffer ?? null,
		message: pass ? null : `${mismatchedPixels} pixels (ratio ${(Math.ceil(mismatchedPixels / imageArea * 100) / 100).toFixed(2)}) differ.`
	};
};

const comparators = { pixelmatch };
function getComparator(comparator, context) {
	if (comparator in comparators) {
		return comparators[comparator];
	}
	const customComparators = context.project.config.browser.expect?.toMatchScreenshot?.comparators;
	if (customComparators && comparator in customComparators) {
		return customComparators[comparator];
	}
	throw new Error(`Unrecognized comparator ${comparator}`);
}

const defaultOptions = {
	comparatorName: "pixelmatch",
	comparatorOptions: {},
	screenshotOptions: {
		animations: "disabled",
		caret: "hide",
		fullPage: false,
		maskColor: "#ff00ff",
		omitBackground: false,
		scale: "device"
	},
	timeout: 5e3,
	resolveDiffPath: ({ arg, ext, root, attachmentsDir, browserName, platform, testFileDirectory, testFileName }) => resolve(root, attachmentsDir, testFileDirectory, testFileName, `${arg}-${browserName}-${platform}${ext}`),
	resolveScreenshotPath: ({ arg, ext, root, screenshotDirectory, testFileDirectory, testFileName, browserName }) => resolve(root, testFileDirectory, screenshotDirectory, testFileName, `${arg}-${browserName}-${platform}${ext}`)
};
const supportedExtensions = ["png"];
function resolveOptions({ context, name, options, testName }) {
	if (context.testPath === undefined) {
		throw new Error("`resolveOptions` has to be used in a test file");
	}
	const resolvedOptions = deepMerge(Object.create(null), defaultOptions, context.project.config.browser.expect?.toMatchScreenshot ?? {}, options);
	const extensionFromName = extname(name);
	// technically the type is a lie, but we check beneath and reassign otherwise
	let extension = extensionFromName.replace(/^\./, "");
	// when `type` will be supported in `screenshotOptions`:
	// - `'png'` should end up in `defaultOptions.screenshotOptions.type`
	// - this condition should be switched around
	// - the assignment should be `resolvedOptions.screenshotOptions.type = extension`
	// - everything using `extension` should use `resolvedOptions.screenshotOptions.type`
	if (supportedExtensions.includes(extension) === false) {
		extension = "png";
	}
	const { root } = context.project.serializedConfig;
	const resolvePathData = {
		arg: sanitizeArg(
			// remove the extension only if it ends up being used
			extensionFromName.endsWith(extension) ? basename(name, extensionFromName) : name
		),
		ext: `.${extension}`,
		platform: platform(),
		root,
		screenshotDirectory: relative(root, join(root, context.project.config.browser.screenshotDirectory ?? "__screenshots__")),
		attachmentsDir: relative(root, context.project.config.attachmentsDir),
		testFileDirectory: relative(root, dirname(context.testPath)),
		testFileName: basename(context.testPath),
		testName: sanitize(testName, false),
		browserName: context.project.config.browser.name
	};
	return {
		codec: getCodec(extension),
		comparator: getComparator(resolvedOptions.comparatorName, context),
		resolvedOptions,
		paths: {
			reference: resolvedOptions.resolveScreenshotPath(resolvePathData),
			get diffs() {
				const diffs = {
					reference: resolvedOptions.resolveDiffPath({
						...resolvePathData,
						arg: `${resolvePathData.arg}-reference`
					}),
					actual: resolvedOptions.resolveDiffPath({
						...resolvePathData,
						arg: `${resolvePathData.arg}-actual`
					}),
					diff: resolvedOptions.resolveDiffPath({
						...resolvePathData,
						arg: `${resolvePathData.arg}-diff`
					})
				};
				Object.defineProperty(this, "diffs", { value: diffs });
				return diffs;
			}
		}
	};
}
/**
* Sanitizes a string by removing or transforming characters to ensure it is
* safe for use as a filename or path segment. It supports two modes:
*
* 1. Non-path mode (`keepPaths === false`):
*    - Replaces one or more whitespace characters (`\s+`) with a single hyphen (`-`).
*    - Removes any character that is not a word character (`\w`) or a hyphen (`-`).
*    - Collapses multiple consecutive hyphens (`-{2,}`) into a single hyphen.
*
* 2. Path-preserving mode (`keepPaths === true`):
*    - Splits the input string on the path separator.
*    - Sanitizes each path segment individually in non-path mode.
*    - Joins the sanitized segments back together.
*
* @param input - The raw string to sanitize.
* @param keepPaths - If `false`, performs a flat sanitization (drops path segments).
* If `true`, treats `input` as a path: each segment is sanitized independently,
* preserving separators.
*/
function sanitize(input, keepPaths) {
	if (keepPaths === false) {
		return input.replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/-{2,}/g, "-");
	}
	return input.split("/").map((path) => sanitize(path, false)).join("/");
}
/**
* Takes a string, treats it as a potential path or filename, and ensures it cannot
* escape the root directory or contain invalid characters. Internally, it:
*
* 1. Prepends the path separator to the raw input to form a path-like string.
* 2. Uses {@linkcode relative|relative('/', <that-path>)} to compute a relative
* path from the root, which effectively strips any leading separators and prevents
* traversal above the root.
* 3. Passes the resulting relative path into {@linkcode sanitize|sanitize(..., true)},
* preserving any path separators but sanitizing each segment.
*
* @param input - The raw string to clean.
*/
function sanitizeArg(input) {
	return sanitize(relative("/", join("/", input)), true);
}
/**
* Takes a screenshot and decodes it using the provided codec.
*
* The screenshot is taken as a base64 string and then decoded into the format
* expected by the comparator.
*
* @returns `Promise` resolving to the decoded screenshot data
*/
function takeDecodedScreenshot({ codec, context, element, name, screenshotOptions }) {
	return context.triggerCommand("__vitest_takeScreenshot", name, {
		...screenshotOptions,
		save: false,
		element
	}).then(({ buffer }) => codec.decode(buffer, {}));
}
/**
* Creates a promise that resolves to `null` after the specified timeout.
* If the timeout is `0`, the promise resolves immediately.
*
* @param timeout - The delay in milliseconds before the promise resolves
* @returns `Promise` that resolves to `null` after the timeout
*/
function asyncTimeout(timeout) {
	return new Promise((resolve) => {
		if (timeout === 0) {
			resolve(null);
		} else {
			setTimeout(() => resolve(null), timeout);
		}
	});
}

const screenshotMatcher = async (context, name, testName, options) => {
	if (!context.testPath) {
		throw new Error(`Cannot compare screenshots without a test path`);
	}
	const { element } = options;
	const { codec, comparator, paths, resolvedOptions: { comparatorOptions, screenshotOptions, timeout } } = resolveOptions({
		context,
		name,
		testName,
		options
	});
	const referenceFile = await readFile$1(paths.reference).catch(() => null);
	const reference = referenceFile && await codec.decode(await readFile$1(paths.reference), {});
	const abortController = new AbortController();
	const stableScreenshot = getStableScreenshots({
		codec,
		comparator,
		comparatorOptions,
		context,
		element,
		name: `${Date.now()}-${basename(paths.reference)}`,
		reference,
		screenshotOptions,
		signal: abortController.signal
	});
	const value = await (timeout === 0 ? stableScreenshot : Promise.race([stableScreenshot, asyncTimeout(timeout).finally(() => {
		abortController.abort();
	})]));
	// case #01
	//  - impossible to get a stable screenshot to compare against
	//  - fail
	if (value === null || value.actual === null) {
		return {
			pass: false,
			reference: referenceFile && {
				path: paths.reference,
				width: reference.metadata.width,
				height: reference.metadata.height
			},
			actual: null,
			diff: null,
			message: `Could not capture a stable screenshot within ${timeout}ms.`
		};
	}
	const { updateSnapshot } = context.project.serializedConfig.snapshotOptions;
	// if there's no reference or if we want to update snapshots, we have to finish the comparison early
	if (reference === null || updateSnapshot === "all") {
		const shouldCreateReference = updateSnapshot !== "none";
		const referencePath = shouldCreateReference ? paths.reference : paths.diffs.reference;
		await writeScreenshot(referencePath, await codec.encode(value.actual, {}));
		// case #02
		//  - got a stable screenshot, but there is no reference and we don't want to update screenshots
		//  - fail
		if (updateSnapshot !== "all") {
			return {
				pass: false,
				reference: {
					path: referencePath,
					width: value.actual.metadata.width,
					height: value.actual.metadata.height
				},
				actual: null,
				diff: null,
				message: `No existing reference screenshot found${shouldCreateReference ? "; a new one was created. Review it before running tests again." : "."}`
			};
		}
		// case #03
		//  - got a stable screenshot, there is no reference, but we want to update screenshots
		//  - pass
		return { pass: true };
	}
	// case #04
	//  - got a stable screenshot with no retries and there's a reference
	//  - pass
	if (referenceFile && value.retries === 0) {
		return { pass: true };
	}
	const finalResult = await comparator(reference, value.actual, {
		createDiff: true,
		...comparatorOptions
	});
	if (finalResult.pass === false && finalResult.diff !== null) {
		const diff = await codec.encode({
			data: finalResult.diff,
			metadata: {
				height: reference.metadata.height,
				width: reference.metadata.width
			}
		}, {});
		await writeScreenshot(paths.diffs.diff, diff);
	}
	// case #05
	//  - reference matches stable screenshot
	//  - pass
	if (finalResult.pass === true) {
		return { pass: true };
	}
	const actual = await codec.encode(value.actual, {});
	await writeScreenshot(paths.diffs.actual, actual);
	// case #06
	//  - fallback, reference does NOT match stable screenshot
	//  - fail
	return {
		pass: false,
		reference: {
			path: paths.reference,
			width: reference.metadata.width,
			height: reference.metadata.height
		},
		actual: {
			path: paths.diffs.actual,
			width: value.actual.metadata.width,
			height: value.actual.metadata.height
		},
		diff: finalResult.diff && paths.diffs.diff,
		message: `Screenshot does not match the stored reference.${finalResult.message === null ? "" : `\n${finalResult.message}`}`
	};
};
async function writeScreenshot(path, image) {
	try {
		await mkdir(dirname(path), { recursive: true });
		await writeFile$1(path, image);
	} catch {
		throw new Error("Couldn't write file to fs");
	}
}
/**
* Takes screenshots repeatedly until the page reaches a visually stable state.
*
* This function compares consecutive screenshots and continues taking new ones
* until two consecutive screenshots match according to the provided comparator.
*
* The process works as follows:
*
* 1. Uses as baseline an optional reference screenshot or takes a new screenshot
* 2. Takes a screenshot and compares with baseline
* 3. If they match, the page is considered stable and the function returns
* 4. If they don't match, it continues with the newer screenshot as the baseline
* 5. Repeats until stability is achieved or the operation is aborted
*
* @returns `Promise` resolving to an object containing the retry count and
* final screenshot
*/
async function getStableScreenshots({ codec, context, comparator, comparatorOptions, element, name, reference, screenshotOptions, signal }) {
	const screenshotArgument = {
		codec,
		context,
		element,
		name,
		screenshotOptions
	};
	let retries = 0;
	let decodedBaseline = reference;
	while (signal.aborted === false) {
		if (decodedBaseline === null) {
			decodedBaseline = takeDecodedScreenshot(screenshotArgument);
		}
		const [image1, image2] = await Promise.all([decodedBaseline, takeDecodedScreenshot(screenshotArgument)]);
		const comparatorResult = (await comparator(image1, image2, {
			...comparatorOptions,
			createDiff: false
		})).pass;
		decodedBaseline = image2;
		if (comparatorResult) {
			break;
		}
		retries += 1;
	}
	return {
		retries,
		actual: await decodedBaseline
	};
}

var builtinCommands = {
	readFile,
	removeFile,
	writeFile,
	__vitest_fileInfo: _fileInfo,
	__vitest_screenshot: screenshot,
	__vitest_screenshotMatcher: screenshotMatcher
};

class BrowserServerState {
	orchestrators = new Map();
	testers = new Map();
}

class ProjectBrowser {
	testerHtml;
	testerFilepath;
	provider;
	vitest;
	config;
	children = new Set();
	parent;
	state = new BrowserServerState();
	constructor(project, base) {
		this.project = project;
		this.base = base;
		this.vitest = project.vitest;
		this.config = project.config;
		const pkgRoot = resolve(fileURLToPath(import.meta.url), "../..");
		const distRoot = resolve(pkgRoot, "dist");
		const testerHtmlPath = project.config.browser.testerHtmlPath ? resolve(project.config.root, project.config.browser.testerHtmlPath) : resolve(distRoot, "client/tester/tester.html");
		if (!existsSync(testerHtmlPath)) {
			throw new Error(`Tester HTML file "${testerHtmlPath}" doesn't exist.`);
		}
		this.testerFilepath = testerHtmlPath;
		this.testerHtml = readFile$1(testerHtmlPath, "utf8").then((html) => this.testerHtml = html);
	}
	get vite() {
		return this.parent.vite;
	}
	commands = {};
	registerCommand(name, cb) {
		if (!/^[a-z_$][\w$]*$/i.test(name)) {
			throw new Error(`Invalid command name "${name}". Only alphanumeric characters, $ and _ are allowed.`);
		}
		this.commands[name] = cb;
	}
	triggerCommand = ((name, context, ...args) => {
		if (name in this.commands) {
			return this.commands[name](context, ...args);
		}
		if (name in this.parent.commands) {
			return this.parent.commands[name](context, ...args);
		}
		throw new Error(`Provider ${this.provider.name} does not support command "${name}".`);
	});
	wrapSerializedConfig() {
		const config = wrapConfig(this.project.serializedConfig);
		config.env ??= {};
		config.env.VITEST_BROWSER_DEBUG = process.env.VITEST_BROWSER_DEBUG || "";
		return config;
	}
	async initBrowserProvider(project) {
		if (this.provider) {
			return;
		}
		this.provider = await getBrowserProvider(project.config.browser, project);
		if (this.provider.initScripts) {
			this.parent.initScripts = this.provider.initScripts;
			// make sure the script can be imported
			const allow = this.parent.vite.config.server.fs.allow;
			this.provider.initScripts.forEach((script) => {
				if (!allow.includes(script)) {
					allow.push(script);
				}
			});
		}
	}
	parseErrorStacktrace(e, options = {}) {
		return this.parent.parseErrorStacktrace(e, options);
	}
	parseStacktrace(trace, options = {}) {
		return this.parent.parseStacktrace(trace, options);
	}
	async close() {
		await this.parent.vite.close();
	}
}
function wrapConfig(config) {
	return {
		...config,
		testNamePattern: config.testNamePattern ? config.testNamePattern.toString() : undefined
	};
}

class ParentBrowserProject {
	orchestratorScripts;
	faviconUrl;
	prefixOrchestratorUrl;
	prefixTesterUrl;
	manifest;
	vite;
	stackTraceOptions;
	orchestratorHtml;
	injectorJs;
	errorCatcherUrl;
	locatorsUrl;
	matchersUrl;
	stateJs;
	initScripts = [];
	commands = {};
	children = new Set();
	vitest;
	config;
	// cache for non-vite source maps
	sourceMapCache = new Map();
	constructor(project, base) {
		this.project = project;
		this.base = base;
		this.vitest = project.vitest;
		this.config = project.config;
		this.stackTraceOptions = {
			frameFilter: project.config.onStackTrace,
			getSourceMap: (id) => {
				if (this.sourceMapCache.has(id)) {
					return this.sourceMapCache.get(id);
				}
				const result = this.vite.moduleGraph.getModuleById(id)?.transformResult;
				// this can happen for bundled dependencies in node_modules/.vite
				if (result && !result.map) {
					const sourceMapUrl = this.retrieveSourceMapURL(result.code);
					if (!sourceMapUrl) {
						return null;
					}
					const filepathDir = dirname(id);
					const sourceMapPath = resolve(filepathDir, sourceMapUrl);
					const map = JSON.parse(readFileSync(sourceMapPath, "utf-8"));
					this.sourceMapCache.set(id, map);
					return map;
				}
				return result?.map;
			},
			getUrlId: (id) => {
				const moduleGraph = this.vite.environments.client.moduleGraph;
				const mod = moduleGraph.getModuleById(id);
				if (mod) {
					return id;
				}
				const resolvedPath = resolve(this.vite.config.root, id.slice(1));
				const modUrl = moduleGraph.getModuleById(resolvedPath);
				if (modUrl) {
					return resolvedPath;
				}
				// some browsers (looking at you, safari) don't report queries in stack traces
				// the next best thing is to try the first id that this file resolves to
				const files = moduleGraph.getModulesByFile(resolvedPath);
				if (files && files.size) {
					return files.values().next().value.id;
				}
				return id;
			}
		};
		for (const [name, command] of Object.entries(builtinCommands)) {
			this.commands[name] ??= command;
		}
		// validate names because they can't be used as identifiers
		for (const command in project.config.browser.commands) {
			if (!/^[a-z_$][\w$]*$/i.test(command)) {
				throw new Error(`Invalid command name "${command}". Only alphanumeric characters, $ and _ are allowed.`);
			}
			this.commands[command] = project.config.browser.commands[command];
		}
		this.prefixTesterUrl = `${base || "/"}`;
		this.prefixOrchestratorUrl = `${base}__vitest_test__/`;
		this.faviconUrl = `${base}__vitest__/favicon.svg`;
		this.manifest = (async () => {
			return JSON.parse(await readFile$1(`${distRoot}/client/.vite/manifest.json`, "utf8"));
		})().then((manifest) => this.manifest = manifest);
		this.orchestratorHtml = (project.config.browser.ui ? readFile$1(resolve(distRoot, "client/__vitest__/index.html"), "utf8") : readFile$1(resolve(distRoot, "client/orchestrator.html"), "utf8")).then((html) => this.orchestratorHtml = html);
		this.injectorJs = readFile$1(resolve(distRoot, "client/esm-client-injector.js"), "utf8").then((js) => this.injectorJs = js);
		this.errorCatcherUrl = join("/@fs/", resolve(distRoot, "client/error-catcher.js"));
		this.matchersUrl = join("/@fs/", distRoot, "expect-element.js");
		this.stateJs = readFile$1(resolve(distRoot, "state.js"), "utf-8").then((js) => this.stateJs = js);
	}
	setServer(vite) {
		this.vite = vite;
	}
	spawn(project) {
		if (!this.vite) {
			throw new Error(`Cannot spawn child server without a parent dev server.`);
		}
		const clone = new ProjectBrowser(project, "/");
		clone.parent = this;
		this.children.add(clone);
		return clone;
	}
	parseErrorStacktrace(e, options = {}) {
		return parseErrorStacktrace(e, {
			...this.stackTraceOptions,
			...options
		});
	}
	parseStacktrace(trace, options = {}) {
		return parseStacktrace(trace, {
			...this.stackTraceOptions,
			...options
		});
	}
	cdps = new Map();
	cdpSessionsPromises = new Map();
	async ensureCDPHandler(sessionId, rpcId) {
		const cachedHandler = this.cdps.get(rpcId);
		if (cachedHandler) {
			return cachedHandler;
		}
		const browserSession = this.vitest._browserSessions.getSession(sessionId);
		if (!browserSession) {
			throw new Error(`Session "${sessionId}" not found.`);
		}
		const browser = browserSession.project.browser;
		const provider = browser.provider;
		if (!provider) {
			throw new Error(`Browser provider is not defined for the project "${browserSession.project.name}".`);
		}
		if (!provider.getCDPSession) {
			throw new Error(`CDP is not supported by the provider "${provider.name}".`);
		}
		const session = await this.cdpSessionsPromises.get(rpcId) ?? await (async () => {
			const promise = provider.getCDPSession(sessionId).finally(() => {
				this.cdpSessionsPromises.delete(rpcId);
			});
			this.cdpSessionsPromises.set(rpcId, promise);
			return promise;
		})();
		const rpc = browser.state.testers.get(rpcId);
		if (!rpc) {
			throw new Error(`Tester RPC "${rpcId}" was not established.`);
		}
		const handler = new BrowserServerCDPHandler(session, rpc);
		this.cdps.set(rpcId, handler);
		return handler;
	}
	removeCDPHandler(sessionId) {
		this.cdps.delete(sessionId);
	}
	async formatScripts(scripts) {
		if (!scripts?.length) {
			return [];
		}
		const server = this.vite;
		const promises = scripts.map(async ({ content, src, async, id, type = "module" }, index) => {
			const srcLink = (src ? (await server.pluginContainer.resolveId(src))?.id : undefined) || src;
			const transformId = srcLink || join(server.config.root, `virtual__${id || `injected-${index}.js`}`);
			await server.moduleGraph.ensureEntryFromUrl(transformId);
			const contentProcessed = content && type === "module" ? (await server.pluginContainer.transform(content, transformId)).code : content;
			return {
				tag: "script",
				attrs: {
					type,
					...async ? { async: "" } : {},
					...srcLink ? { src: srcLink.startsWith("http") ? srcLink : slash(`/@fs/${srcLink}`) } : {}
				},
				injectTo: "head",
				children: contentProcessed || ""
			};
		});
		return await Promise.all(promises);
	}
	resolveTesterUrl(pathname) {
		const [sessionId, testFile] = pathname.slice(this.prefixTesterUrl.length).split("/");
		const decodedTestFile = decodeURIComponent(testFile);
		return {
			sessionId,
			testFile: decodedTestFile
		};
	}
	retrieveSourceMapURL(source) {
		const re = /\/\/[@#]\s*sourceMappingURL=([^\s'"]+)\s*$|\/\*[@#]\s*sourceMappingURL=[^\s*'"]+\s*\*\/\s*$/gm;
		// Keep executing the search to find the *last* sourceMappingURL to avoid
		// picking up sourceMappingURLs from comments, strings, etc.
		let lastMatch, match;
		// eslint-disable-next-line no-cond-assign
		while (match = re.exec(source)) {
			lastMatch = match;
		}
		if (!lastMatch) {
			return null;
		}
		return lastMatch[1];
	}
}

//#region src/messages.ts
const TYPE_REQUEST = "q";
const TYPE_RESPONSE = "s";

//#endregion
//#region src/utils.ts
function createPromiseWithResolvers() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
const random = Math.random.bind(Math);
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(size = 21) {
	let id = "";
	let i = size;
	while (i--) id += urlAlphabet[random() * 64 | 0];
	return id;
}

//#endregion
//#region src/main.ts
const DEFAULT_TIMEOUT = 6e4;
const defaultSerialize = (i) => i;
const defaultDeserialize = defaultSerialize;
const { clearTimeout, setTimeout: setTimeout$1 } = globalThis;
function createBirpc($functions, options) {
	const { post, on, off = () => {}, eventNames = [], serialize = defaultSerialize, deserialize = defaultDeserialize, resolver, bind = "rpc", timeout = DEFAULT_TIMEOUT, proxify = true } = options;
	let $closed = false;
	const _rpcPromiseMap = /* @__PURE__ */ new Map();
	let _promiseInit;
	let rpc;
	async function _call(method, args, event, optional) {
		if ($closed) throw new Error(`[birpc] rpc is closed, cannot call "${method}"`);
		const req = {
			m: method,
			a: args,
			t: TYPE_REQUEST
		};
		if (optional) req.o = true;
		const send = async (_req) => post(serialize(_req));
		if (event) {
			await send(req);
			return;
		}
		if (_promiseInit) try {
			await _promiseInit;
		} finally {
			_promiseInit = void 0;
		}
		let { promise, resolve, reject } = createPromiseWithResolvers();
		const id = nanoid();
		req.i = id;
		let timeoutId;
		async function handler(newReq = req) {
			if (timeout >= 0) {
				timeoutId = setTimeout$1(() => {
					try {
						if (options.onTimeoutError?.call(rpc, method, args) !== true) throw new Error(`[birpc] timeout on calling "${method}"`);
					} catch (e) {
						reject(e);
					}
					_rpcPromiseMap.delete(id);
				}, timeout);
				if (typeof timeoutId === "object") timeoutId = timeoutId.unref?.();
			}
			_rpcPromiseMap.set(id, {
				resolve,
				reject,
				timeoutId,
				method
			});
			await send(newReq);
			return promise;
		}
		try {
			if (options.onRequest) await options.onRequest.call(rpc, req, handler, resolve);
			else await handler();
		} catch (e) {
			if (options.onGeneralError?.call(rpc, e) !== true) throw e;
			return;
		} finally {
			clearTimeout(timeoutId);
			_rpcPromiseMap.delete(id);
		}
		return promise;
	}
	const builtinMethods = {
		$call: (method, ...args) => _call(method, args, false),
		$callOptional: (method, ...args) => _call(method, args, false, true),
		$callEvent: (method, ...args) => _call(method, args, true),
		$callRaw: (options$1) => _call(options$1.method, options$1.args, options$1.event, options$1.optional),
		$rejectPendingCalls,
		get $closed() {
			return $closed;
		},
		get $meta() {
			return options.meta;
		},
		$close,
		$functions
	};
	if (proxify) rpc = new Proxy({}, { get(_, method) {
		if (Object.prototype.hasOwnProperty.call(builtinMethods, method)) return builtinMethods[method];
		if (method === "then" && !eventNames.includes("then") && !("then" in $functions)) return void 0;
		const sendEvent = (...args) => _call(method, args, true);
		if (eventNames.includes(method)) {
			sendEvent.asEvent = sendEvent;
			return sendEvent;
		}
		const sendCall = (...args) => _call(method, args, false);
		sendCall.asEvent = sendEvent;
		return sendCall;
	} });
	else rpc = builtinMethods;
	function $close(customError) {
		$closed = true;
		_rpcPromiseMap.forEach(({ reject, method }) => {
			const error = /* @__PURE__ */ new Error(`[birpc] rpc is closed, cannot call "${method}"`);
			if (customError) {
				customError.cause ??= error;
				return reject(customError);
			}
			reject(error);
		});
		_rpcPromiseMap.clear();
		off(onMessage);
	}
	function $rejectPendingCalls(handler) {
		const handlerResults = Array.from(_rpcPromiseMap.values()).map(({ method, reject }) => {
			if (!handler) return reject(/* @__PURE__ */ new Error(`[birpc]: rejected pending call "${method}".`));
			return handler({
				method,
				reject
			});
		});
		_rpcPromiseMap.clear();
		return handlerResults;
	}
	async function onMessage(data, ...extra) {
		let msg;
		try {
			msg = deserialize(data);
		} catch (e) {
			if (options.onGeneralError?.call(rpc, e) !== true) throw e;
			return;
		}
		if (msg.t === TYPE_REQUEST) {
			const { m: method, a: args, o: optional } = msg;
			let result, error;
			let fn = await (resolver ? resolver.call(rpc, method, $functions[method]) : $functions[method]);
			if (optional) fn ||= () => void 0;
			if (!fn) error = /* @__PURE__ */ new Error(`[birpc] function "${method}" not found`);
			else try {
				result = await fn.apply(bind === "rpc" ? rpc : $functions, args);
			} catch (e) {
				error = e;
			}
			if (msg.i) {
				if (error && options.onFunctionError) {
					if (options.onFunctionError.call(rpc, error, method, args) === true) return;
				}
				if (!error) try {
					await post(serialize({
						t: TYPE_RESPONSE,
						i: msg.i,
						r: result
					}), ...extra);
					return;
				} catch (e) {
					error = e;
					if (options.onGeneralError?.call(rpc, e, method, args) !== true) throw e;
				}
				try {
					await post(serialize({
						t: TYPE_RESPONSE,
						i: msg.i,
						e: error
					}), ...extra);
				} catch (e) {
					if (options.onGeneralError?.call(rpc, e, method, args) !== true) throw e;
				}
			}
		} else {
			const { i: ack, r: result, e: error } = msg;
			const promise = _rpcPromiseMap.get(ack);
			if (promise) {
				clearTimeout(promise.timeoutId);
				if (error) promise.reject(error);
				else promise.resolve(result);
			}
			_rpcPromiseMap.delete(ack);
		}
	}
	_promiseInit = on(onMessage);
	return rpc;
}

const debug = createDebugger("vitest:browser:api");
const BROWSER_API_PATH = "/__vitest_browser_api__";
function setupBrowserRpc(globalServer, defaultMockerRegistry) {
	const vite = globalServer.vite;
	const vitest = globalServer.vitest;
	const wss = new WebSocketServer({ noServer: true });
	vite.httpServer?.on("upgrade", (request, socket, head) => {
		if (!request.url) {
			return;
		}
		const { pathname, searchParams } = new URL(request.url, "http://localhost");
		if (pathname !== BROWSER_API_PATH) {
			return;
		}
		if (!isValidApiRequest(vitest.config, request)) {
			socket.destroy();
			return;
		}
		const type = searchParams.get("type");
		const rpcId = searchParams.get("rpcId");
		const sessionId = searchParams.get("sessionId");
		const projectName = searchParams.get("projectName");
		if (type !== "tester" && type !== "orchestrator") {
			return error(new Error(`[vitest] Type query in ${request.url} is invalid. Type should be either "tester" or "orchestrator".`));
		}
		if (!sessionId || !rpcId || projectName == null) {
			return error(new Error(`[vitest] Invalid URL ${request.url}. "projectName", "sessionId" and "rpcId" queries are required.`));
		}
		const sessions = vitest._browserSessions;
		if (!sessions.sessionIds.has(sessionId)) {
			const ids = [...sessions.sessionIds].join(", ");
			return error(new Error(`[vitest] Unknown session id "${sessionId}". Expected one of ${ids}.`));
		}
		if (type === "orchestrator") {
			const session = sessions.getSession(sessionId);
			// it's possible the session was already resolved by the preview provider
			session?.connected();
		}
		const project = vitest.getProjectByName(projectName);
		if (!project) {
			return error(new Error(`[vitest] Project "${projectName}" not found.`));
		}
		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit("connection", ws, request);
			const { rpc, offCancel } = setupClient(project, rpcId, ws);
			const state = project.browser.state;
			const clients = type === "tester" ? state.testers : state.orchestrators;
			clients.set(rpcId, rpc);
			debug?.("[%s] Browser API connected to %s", rpcId, type);
			ws.on("close", () => {
				debug?.("[%s] Browser API disconnected from %s", rpcId, type);
				offCancel();
				clients.delete(rpcId);
				globalServer.removeCDPHandler(rpcId);
				if (type === "orchestrator") {
					sessions.destroySession(sessionId);
				}
				// this will reject any hanging methods if there are any
				rpc.$close(new Error(`[vitest] Browser connection was closed while running tests. Was the page closed unexpectedly?`));
			});
		});
	});
	// we don't throw an error inside a stream because this can segfault the process
	function error(err) {
		console.error(err);
		vitest.state.catchError(err, "RPC Error");
	}
	function checkFileAccess(path) {
		if (!isFileServingAllowed(path, vite)) {
			throw new Error(`Access denied to "${path}". See Vite config documentation for "server.fs": https://vitejs.dev/config/server-options.html#server-fs-strict.`);
		}
	}
	function setupClient(project, rpcId, ws) {
		const mockResolver = new ServerMockResolver(globalServer.vite, { moduleDirectories: project.config?.deps?.moduleDirectories });
		const mocker = project.browser?.provider.mocker;
		const rpc = createBirpc({
			async onUnhandledError(error, type) {
				if (error && typeof error === "object") {
					const _error = error;
					_error.stacks = globalServer.parseErrorStacktrace(_error);
				}
				vitest.state.catchError(error, type);
			},
			async onQueued(method, file) {
				if (method === "collect") {
					vitest.state.collectFiles(project, [file]);
				} else {
					await vitest._testRun.enqueued(project, file);
				}
			},
			async onCollected(method, files) {
				if (method === "collect") {
					vitest.state.collectFiles(project, files);
				} else {
					await vitest._testRun.collected(project, files);
				}
			},
			async onTaskArtifactRecord(id, artifact) {
				return vitest._testRun.recordArtifact(id, artifact);
			},
			async onTaskUpdate(method, packs, events) {
				if (method === "collect") {
					vitest.state.updateTasks(packs);
				} else {
					await vitest._testRun.updated(packs, events);
				}
			},
			onAfterSuiteRun(meta) {
				vitest.coverageProvider?.onAfterSuiteRun(meta);
			},
			async sendLog(method, log) {
				if (method === "collect") {
					vitest.state.updateUserLog(log);
				} else {
					await vitest._testRun.log(log);
				}
			},
			resolveSnapshotPath(testPath) {
				return vitest.snapshot.resolvePath(testPath, { config: project.serializedConfig });
			},
			resolveSnapshotRawPath(testPath, rawPath) {
				return vitest.snapshot.resolveRawPath(testPath, rawPath);
			},
			snapshotSaved(snapshot) {
				vitest.snapshot.add(snapshot);
			},
			async readSnapshotFile(snapshotPath) {
				checkFileAccess(snapshotPath);
				if (!existsSync(snapshotPath)) {
					return null;
				}
				return promises.readFile(snapshotPath, "utf-8");
			},
			async saveSnapshotFile(id, content) {
				checkFileAccess(id);
				await promises.mkdir(dirname(id), { recursive: true });
				return promises.writeFile(id, content, "utf-8");
			},
			async removeSnapshotFile(id) {
				checkFileAccess(id);
				if (!existsSync(id)) {
					throw new Error(`Snapshot file "${id}" does not exist.`);
				}
				return promises.unlink(id);
			},
			getBrowserFileSourceMap(id) {
				const mod = globalServer.vite.moduleGraph.getModuleById(id);
				const result = mod?.transformResult;
				// this can happen for bundled dependencies in node_modules/.vite
				if (result && !result.map) {
					const sourceMapUrl = retrieveSourceMapURL(result.code);
					if (!sourceMapUrl) {
						return null;
					}
					const filepathDir = dirname(id);
					const sourceMapPath = resolve(filepathDir, sourceMapUrl);
					try {
						const map = JSON.parse(readFileSync(sourceMapPath, "utf-8"));
						return map;
					} catch {
						return null;
					}
				}
				return result?.map;
			},
			cancelCurrentRun(reason) {
				vitest.cancelCurrentRun(reason);
			},
			async resolveId(id, importer) {
				return mockResolver.resolveId(id, importer);
			},
			debug(...args) {
				vitest.logger.console.debug(...args);
			},
			getCountOfFailedTests() {
				return vitest.state.getCountOfFailedTests();
			},
			async wdioSwitchContext(direction) {
				const provider = project.browser.provider;
				if (!provider) {
					throw new Error("Commands are only available for browser tests.");
				}
				if (provider.name !== "webdriverio") {
					throw new Error("Switch context is only available for WebDriverIO provider.");
				}
				if (direction === "iframe") {
					await provider.switchToTestFrame();
				} else {
					await provider.switchToMainFrame();
				}
			},
			async triggerCommand(sessionId, command, testPath, payload) {
				debug?.("[%s] Triggering command \"%s\"", sessionId, command);
				const provider = project.browser.provider;
				if (!provider) {
					throw new Error("Commands are only available for browser tests.");
				}
				const context = Object.assign({
					testPath,
					project,
					provider,
					contextId: sessionId,
					sessionId,
					triggerCommand: (name, ...args) => {
						return project.browser.triggerCommand(name, context, ...args);
					}
				}, provider.getCommandsContext(sessionId));
				return await project.browser.triggerCommand(command, context, ...payload);
			},
			resolveMock(rawId, importer, options) {
				return mockResolver.resolveMock(rawId, importer, options);
			},
			invalidate(ids) {
				return mockResolver.invalidate(ids);
			},
			async registerMock(sessionId, module) {
				if (!mocker) {
					// make sure modules are not processed yet in case they were imported before
					// and were not mocked
					mockResolver.invalidate([module.id]);
					if (module.type === "manual") {
						const mock = ManualMockedModule.fromJSON(module, async () => {
							try {
								const { keys } = await rpc.resolveManualMock(module.url);
								return Object.fromEntries(keys.map((key) => [key, null]));
							} catch (err) {
								vitest.state.catchError(err, "Manual Mock Resolver Error");
								return {};
							}
						});
						defaultMockerRegistry.add(mock);
					} else {
						if (module.type === "redirect") {
							const redirectUrl = new URL(module.redirect);
							module.redirect = join(vite.config.root, redirectUrl.pathname);
						}
						defaultMockerRegistry.register(module);
					}
					return;
				}
				if (module.type === "manual") {
					const manualModule = ManualMockedModule.fromJSON(module, async () => {
						const { keys } = await rpc.resolveManualMock(module.url);
						return Object.fromEntries(keys.map((key) => [key, null]));
					});
					await mocker.register(sessionId, manualModule);
				} else if (module.type === "redirect") {
					await mocker.register(sessionId, RedirectedModule.fromJSON(module));
				} else if (module.type === "automock") {
					await mocker.register(sessionId, AutomockedModule.fromJSON(module));
				} else if (module.type === "autospy") {
					await mocker.register(sessionId, AutospiedModule.fromJSON(module));
				}
			},
			clearMocks(sessionId) {
				if (!mocker) {
					return defaultMockerRegistry.clear();
				}
				return mocker.clear(sessionId);
			},
			unregisterMock(sessionId, id) {
				if (!mocker) {
					return defaultMockerRegistry.delete(id);
				}
				return mocker.delete(sessionId, id);
			},
			async sendCdpEvent(sessionId, event, payload) {
				const cdp = await globalServer.ensureCDPHandler(sessionId, rpcId);
				return cdp.send(event, payload);
			},
			async trackCdpEvent(sessionId, type, event, listenerId) {
				const cdp = await globalServer.ensureCDPHandler(sessionId, rpcId);
				cdp[type](event, listenerId);
			}
		}, {
			post: (msg) => ws.send(msg),
			on: (fn) => ws.on("message", fn),
			eventNames: ["onCancel", "cdpEvent"],
			serialize: (data) => stringify(data, stringifyReplace),
			deserialize: parse,
			timeout: -1
		});
		const offCancel = vitest.onCancel((reason) => rpc.onCancel(reason));
		return {
			rpc,
			offCancel
		};
	}
}
function retrieveSourceMapURL(source) {
	const re = /\/\/[@#]\s*sourceMappingURL=([^\s'"]+)\s*$|\/\*[@#]\s*sourceMappingURL=[^\s*'"]+\s*\*\/\s*$/gm;
	// keep executing the search to find the *last* sourceMappingURL to avoid
	// picking up sourceMappingURLs from comments, strings, etc.
	let lastMatch, match;
	// eslint-disable-next-line no-cond-assign
	while (match = re.exec(source)) {
		lastMatch = match;
	}
	if (!lastMatch) {
		return null;
	}
	return lastMatch[1];
}
// Serialization support utils.
function cloneByOwnProperties(value) {
	// Clones the value's properties into a new Object. The simpler approach of
	// Object.assign() won't work in the case that properties are not enumerable.
	return Object.getOwnPropertyNames(value).reduce((clone, prop) => ({
		...clone,
		[prop]: value[prop]
	}), {});
}
/**
* Replacer function for serialization methods such as JS.stringify() or
* flatted.stringify().
*/
function stringifyReplace(key, value) {
	if (value instanceof Error) {
		const cloned = cloneByOwnProperties(value);
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
			...cloned
		};
	} else {
		return value;
	}
}

function defineBrowserCommand(fn) {
	return fn;
}
const createBrowserServer = async (options) => {
	const project = options.project;
	const configFile = project.vite.config.configFile;
	if (project.vitest.version !== version) {
		project.vitest.logger.warn(c.yellow(`Loaded ${c.inverse(c.yellow(` vitest@${project.vitest.version} `))} and ${c.inverse(c.yellow(` @vitest/browser@${version} `))}.` + "\nRunning mixed versions is not supported and may lead into bugs" + "\nUpdate your dependencies and make sure the versions match."));
	}
	const server = new ParentBrowserProject(project, "/");
	const configPath = typeof configFile === "string" ? configFile : false;
	const logLevel = process.env.VITEST_BROWSER_DEBUG ?? "info";
	const logger = createViteLogger(project.vitest.logger, logLevel, { allowClearScreen: false });
	const mockerRegistry = new MockerRegistry();
	let cacheDir;
	const vite = await createViteServer({
		...project.options,
		base: "/",
		root: project.config.root,
		logLevel,
		customLogger: {
			...logger,
			info(msg, options) {
				logger.info(msg, options);
				if (msg.includes("optimized dependencies changed. reloading")) {
					logger.warn([c.yellow(`\n${c.bold("[vitest]")} Vite unexpectedly reloaded a test. This may cause tests to fail, lead to flaky behaviour or duplicated test runs.\n`), c.yellow(`For a stable experience, please add mentioned dependencies to your config\'s ${c.bold("`optimizeDeps.include`")} field manually.\n\n`)].join(""));
				}
			}
		},
		mode: project.config.mode,
		configFile: configPath,
		configLoader: project.vite.config.inlineConfig.configLoader,
		server: {
			hmr: false,
			watch: null
		},
		cacheDir: project.vite.config.cacheDir,
		plugins: [
			{
				name: "vitest-internal:browser-cacheDir",
				configResolved(config) {
					cacheDir = config.cacheDir;
				}
			},
			...options.mocksPlugins({ filter(id) {
				if (id.includes(distRoot) || id.includes(cacheDir)) {
					return false;
				}
				return true;
			} }),
			options.metaEnvReplacer(),
			...project.options?.plugins || [],
			BrowserPlugin(server),
			interceptorPlugin({ registry: mockerRegistry }),
			options.coveragePlugin()
		]
	});
	await vite.listen();
	setupBrowserRpc(server, mockerRegistry);
	return server;
};
function defineBrowserProvider(options) {
	return {
		...options,
		options: options.options || {},
		serverFactory: createBrowserServer
	};
}

export { createBrowserServer, defineBrowserCommand, defineBrowserProvider, parseKeyDef, resolveScreenshotPath };
