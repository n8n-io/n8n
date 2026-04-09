import { ManualMockedModule, RedirectedModule, AutomockedModule, AutospiedModule, MockerRegistry } from '@vitest/mocker';
import { dynamicImportPlugin, ServerMockResolver, interceptorPlugin } from '@vitest/mocker/node';
import c from 'tinyrainbow';
import { isValidApiRequest, isFileServingAllowed, distDir, rolldownVersion, resolveApiServerConfig, resolveFsAllow, isFileLoadingAllowed, createDebugger, createViteLogger, createViteServer } from 'vitest/node';
import { fileURLToPath } from 'node:url';
import fs, { readFileSync, createReadStream, promises, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { slash as slash$1, toArray, deepMerge } from '@vitest/utils/helpers';
import MagicString from 'magic-string';
import sirv from 'sirv';
import crypto from 'node:crypto';
import { readFile as readFile$1, mkdir, writeFile as writeFile$1 } from 'node:fs/promises';
import { parseErrorStacktrace, parseStacktrace } from '@vitest/utils/source-map';
import { extractSourcemapFromFile } from '@vitest/utils/source-map/node';
import { resolve as resolve$1, basename as basename$1, dirname as dirname$1 } from 'node:path';
import { platform } from 'node:os';
import { PNG } from 'pngjs';
import { diff } from '@blazediff/core';
import { WebSocketServer } from 'ws';

var version = "4.1.2";

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

const resolver = (input, lazy, parsed, $) => output => {
  for (let ke = keys(output), {length} = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[+value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({ o: output, k, r: tmp });
      }
      else
        output[k] = $.call(output, k, tmp);
    }
    else if (output[k] !== ignore)
      output[k] = $.call(output, k, value);
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
  const $ = reviver || noop;

  let value = input[0];

  if (typeof value === object && value) {
    const lazy = [];
    const revive = resolver(input, lazy, new Set, $);
    value = revive(value);

    let i = 0;
    while (i < lazy.length) {
      // it could be a lazy.shift() but that's costly
      const {o, k, r} = lazy[i++];
      o[k] = $.call(o, k, revive(r));
    }
  }

  return $.call({'': value}, '', value);
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
		__VITEST_OTEL_CARRIER__: url.searchParams.get("otelCarrier") ?? "null",
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
		__VITEST_OTEL_CARRIER__: JSON.stringify(null),
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
				// strip _vitest_original query added by importActual so that
				// the plugin pipeline sees the original import id (e.g. virtual modules's load hook).
				server.middlewares.use((req, _res, next) => {
					if (req.url?.includes("_vitest_original") && parentServer.project.config.browser.provider?.name === "playwright") {
						req.url = req.url.replace(/[?&]_vitest_original(?=[&#]|$)/, "").replace(/[?&]ext\b[^&#]*/, "").replace(/\?$/, "");
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
				// Serve coverage HTML at ./coverage if configured
				const coverageHtmlDir = parentServer.vitest.config.coverage?.htmlDir;
				if (coverageHtmlDir) {
					server.middlewares.use("/__vitest_test__/coverage", sirv(coverageHtmlDir, {
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
				const otelConfig = project.config.experimental.openTelemetry;
				if (otelConfig?.enabled && otelConfig.browserSdkPath) {
					entries.push(otelConfig.browserSdkPath);
					include.push("@opentelemetry/api");
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
					// loupe bundle has a nasty require('util') call that leaves a warning in the console
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
				// Only set esbuild options when not using rolldown-vite (Vite 8+),
				// which uses oxc for transformation instead of esbuild
				if (!rolldownVersion && viteConfig.esbuild !== false) {
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
	if (!isFileLoadingAllowed(project.vite.config, path) && !isFileLoadingAllowed(project.vitest.vite.config, path)) {
		throw new Error(`Access denied to "${path}". See Vite config documentation for "server.fs": https://vitejs.dev/config/server-options.html#server-fs-strict.`);
	}
}
function assertWrite(path, project) {
	if (!project.config.browser.api.allowWrite || !project.vitest.config.api.allowWrite) {
		throw new Error(`Cannot modify file "${path}". File writing is disabled because server is exposed to the internet, see https://vitest.dev/config/browser/api.`);
	}
}
const readFile = async ({ project }, path, options = {}) => {
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(slash(filepath), project);
	// never return a Buffer
	if (typeof options === "object" && !options.encoding) {
		options.encoding = "utf-8";
	}
	return promises.readFile(filepath, options);
};
const writeFile = async ({ project }, path, data, options) => {
	assertWrite(path, project);
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(slash(filepath), project);
	const dir = dirname$1(filepath);
	if (!fs.existsSync(dir)) {
		await promises.mkdir(dir, { recursive: true });
	}
	await promises.writeFile(filepath, data, options);
};
const removeFile = async ({ project }, path) => {
	assertWrite(path, project);
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(slash(filepath), project);
	await promises.rm(filepath);
};
const _fileInfo = async ({ project }, path, encoding) => {
	const filepath = resolve$1(project.config.root, path);
	assertFileAccess(slash(filepath), project);
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
	const mismatchedPixels = diff(reference.data, actual.data, diffBuffer, reference.metadata.width, reference.metadata.height, optionsWithDefaults);
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
	strict: true,
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

/**
* Browser command that compares a screenshot against a stored reference.
*
* The comparison workflow is organized as follows:
*
* 1. Load existing reference (if any)
* 2. Capture a stable screenshot (retrying until the page stops changing)
* 3. Determine the outcome based on capture results and update settings
* 4. Write any necessary files (new references, diffs)
* 5. Return result for the test runner
*/
const screenshotMatcher = async (context, name, testName, options) => {
	if (!context.testPath) {
		throw new Error("Cannot compare screenshots without a test path");
	}
	const { element } = options;
	const { codec, comparator, paths, resolvedOptions: { comparatorOptions, screenshotOptions, timeout } } = resolveOptions({
		context,
		name,
		testName,
		options
	});
	const referenceFile = await readFile$1(paths.reference).catch(() => null);
	const reference = referenceFile && await codec.decode(referenceFile, {});
	const screenshotResult = await waitForStableScreenshot({
		codec,
		comparator,
		comparatorOptions,
		context,
		element,
		name: `${Date.now()}-${basename(paths.reference)}`,
		reference,
		screenshotOptions
	}, timeout);
	const outcome = await determineOutcome({
		reference,
		screenshot: screenshotResult && screenshotResult.actual,
		retries: screenshotResult?.retries ?? 0,
		updateSnapshot: context.project.serializedConfig.snapshotOptions.updateSnapshot,
		paths,
		comparator,
		comparatorOptions
	});
	await performSideEffects(outcome, codec);
	return buildOutput(outcome, timeout);
};
/**
* Core comparison logic that produces a {@linkcode MatchOutcome}.
*
* All branching logic lives here. This is the single source of truth for "what happened".
*
* The outcome carries all data needed by {@linkcode performSideEffects} and {@linkcode buildOutput}.
*/
async function determineOutcome({ comparator, comparatorOptions, paths, reference, retries, screenshot, updateSnapshot }) {
	if (screenshot === null) {
		return {
			type: "unstable-screenshot",
			reference: reference && {
				image: reference,
				path: paths.reference
			}
		};
	}
	// no reference to compare against - create one based on update settings
	if (reference === null) {
		if (updateSnapshot === "all") {
			return {
				type: "update-reference",
				reference: {
					image: screenshot,
					path: paths.reference
				}
			};
		}
		const location = updateSnapshot === "none" ? "diffs" : "reference";
		return {
			type: "missing-reference",
			location,
			reference: {
				image: screenshot,
				path: location === "reference" ? paths.reference : paths.diffs.reference
			}
		};
	}
	// first capture matched reference (used as baseline) - no further comparison needed
	if (retries === 0) {
		return { type: "matched-immediately" };
	}
	const comparisonResult = await comparator(reference, screenshot, {
		createDiff: true,
		...comparatorOptions
	});
	if (comparisonResult.pass) {
		return { type: "matched-after-comparison" };
	}
	if (updateSnapshot === "all") {
		return {
			type: "update-reference",
			reference: {
				image: screenshot,
				path: paths.reference
			}
		};
	}
	return {
		type: "mismatch",
		reference: {
			image: reference,
			path: paths.reference
		},
		actual: {
			image: screenshot,
			path: paths.diffs.actual
		},
		diff: comparisonResult.diff && {
			image: {
				data: comparisonResult.diff,
				metadata: reference.metadata
			},
			path: paths.diffs.diff
		},
		message: comparisonResult.message
	};
}
/**
* Writes files to disk based on the outcome.
*
* Only `missing-reference`, `update-reference`, and `mismatch` write files. Successful matches produce no side effects.
*/
async function performSideEffects(outcome, codec) {
	switch (outcome.type) {
		case "missing-reference":
		case "update-reference": {
			await writeScreenshot(outcome.reference.path, await codec.encode(outcome.reference.image, {}));
			break;
		}
		case "mismatch": {
			await writeScreenshot(outcome.actual.path, await codec.encode(outcome.actual.image, {}));
			if (outcome.diff) {
				await writeScreenshot(outcome.diff.path, await codec.encode(outcome.diff.image, {}));
			}
			break;
		}
	}
}
/**
* Transforms a {@linkcode MatchOutcome} into the output format expected by the test runner.
*
* Maps each outcome to a pass/fail result with metadata and error messages.
*/
function buildOutput(outcome, timeout) {
	switch (outcome.type) {
		case "unstable-screenshot": return {
			pass: false,
			outcome: outcome.type,
			reference: outcome.reference && {
				path: outcome.reference.path,
				width: outcome.reference.image.metadata.width,
				height: outcome.reference.image.metadata.height
			},
			actual: null,
			diff: null,
			message: `Could not capture a stable screenshot within ${timeout}ms.`
		};
		case "missing-reference": {
			return {
				pass: false,
				outcome: outcome.type,
				reference: {
					path: outcome.reference.path,
					width: outcome.reference.image.metadata.width,
					height: outcome.reference.image.metadata.height
				},
				actual: null,
				diff: null,
				message: outcome.location === "reference" ? "No existing reference screenshot found; a new one was created. Review it before running tests again." : "No existing reference screenshot found."
			};
		}
		case "update-reference":
		case "matched-immediately":
		case "matched-after-comparison": return {
			pass: true,
			outcome: outcome.type
		};
		case "mismatch": return {
			pass: false,
			outcome: outcome.type,
			reference: {
				path: outcome.reference.path,
				width: outcome.reference.image.metadata.width,
				height: outcome.reference.image.metadata.height
			},
			actual: {
				path: outcome.actual.path,
				width: outcome.actual.image.metadata.width,
				height: outcome.actual.image.metadata.height
			},
			diff: outcome.diff && {
				path: outcome.diff.path,
				width: outcome.diff.image.metadata.width,
				height: outcome.diff.image.metadata.height
			},
			message: `Screenshot does not match the stored reference.${outcome.message ? `\n${outcome.message}` : ""}`
		};
		default: {
			return {
				pass: false,
				outcome: null,
				actual: null,
				reference: null,
				diff: null,
				message: `Outcome (${outcome.type}) not handled. This is a bug in Vitest. Please, open an issue with reproduction.`
			};
		}
	}
}
/**
* Captures a stable screenshot with timeout handling.
*
* Wraps {@linkcode getStableScreenshot} with an abort controller that triggers when the timeout expires. Returns `null` if the page never stabilizes.
*/
async function waitForStableScreenshot(options, timeout) {
	const abortController = new AbortController();
	const stableScreenshot = getStableScreenshot(options, abortController.signal);
	const result = await (timeout === 0 ? stableScreenshot : Promise.race([stableScreenshot, asyncTimeout(timeout).finally(() => abortController.abort())]));
	return result;
}
/**
* Takes screenshots repeatedly until the page reaches a visually stable state.
*
* This function compares consecutive screenshots and continues taking new ones until two consecutive screenshots match according to the provided comparator.
*
* The process works as follows:
*
* 1. Uses as baseline an optional reference screenshot or takes a new screenshot
* 2. Takes a screenshot and compares with baseline
* 3. If they match, the page is considered stable and the function returns
* 4. If they don't match, it continues with the newer screenshot as the baseline
* 5. Repeats until stability is achieved or the operation is aborted
*
* @returns `Promise` resolving to an object containing the retry count and final screenshot
*/
async function getStableScreenshot({ codec, context, comparator, comparatorOptions, element, name, reference, screenshotOptions }, signal) {
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
		const isStable = (await comparator(image1, image2, {
			...comparatorOptions,
			createDiff: false
		})).pass;
		decodedBaseline = image2;
		if (isStable) {
			break;
		}
		retries += 1;
	}
	return {
		retries,
		actual: await decodedBaseline
	};
}
/** Writes encoded images to disk, creating parent directories as needed. */
async function writeScreenshot(path, image) {
	try {
		await mkdir(dirname(path), { recursive: true });
		await writeFile$1(path, image);
	} catch (cause) {
		throw new Error("Couldn't write file to fs", { cause });
	}
}

const _markTrace = async (context, payload) => {
	if (context.provider.name === "playwright") {
		await context.triggerCommand("__vitest_markTrace", payload);
	}
};
const _groupTraceStart = async (context, payload) => {
	if (context.provider.name === "playwright") {
		await context.triggerCommand("__vitest_groupTraceStart", payload);
	}
};
const _groupTraceEnd = async (context) => {
	if (context.provider.name === "playwright") {
		await context.triggerCommand("__vitest_groupTraceEnd");
	}
};

var builtinCommands = {
	readFile,
	removeFile,
	writeFile,
	__vitest_markTrace: _markTrace,
	__vitest_groupTraceStart: _groupTraceStart,
	__vitest_groupTraceEnd: _groupTraceEnd,
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
	vite;
	config;
	state = new BrowserServerState();
	constructor(parent, project, base) {
		this.parent = parent;
		this.project = project;
		this.base = base;
		this.vitest = project.vitest;
		this.config = project.config;
		this.vite = parent.vite;
		// instances can override testerHtmlPath
		const testerHtmlPath = project.config.browser.testerHtmlPath ? resolve(project.config.root, project.config.browser.testerHtmlPath) : resolve(distRoot, "client/tester/tester.html");
		// TODO: when config resolution is rewritten, project and parentProject should be created before the vite server is started
		if (!existsSync(testerHtmlPath)) {
			throw new Error(`Tester HTML file "${testerHtmlPath}" doesn't exist.`);
		}
		this.testerFilepath = testerHtmlPath;
		this.testerHtml = readFile$1(this.testerFilepath, "utf8").then((html) => this.testerHtml = html);
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
		await this.vite.close();
	}
}
function wrapConfig(config) {
	config = { ...config };
	// workaround RegExp serialization
	config.testNamePattern &&= config.testNamePattern.toString();
	// workaround RegExp serialization
	if (typeof config.retry === "object") {
		config.retry.condition &&= config.retry.condition.toString();
	}
	return config;
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
				// handle non-inline source map such as pre-bundled deps in node_modules/.vite
				if (result && !result.map) {
					const filePath = id.split("?")[0];
					const extracted = extractSourcemapFromFile(result.code, filePath);
					this.sourceMapCache.set(id, extracted?.map);
					return extracted?.map;
				}
				this.sourceMapCache.set(id, result?.map);
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
		const clone = new ProjectBrowser(this, project, "/");
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
		if (!isFileLoadingAllowed(vite.config, path)) {
			throw new Error(`Access denied to "${path}". See Vite config documentation for "server.fs": https://vitejs.dev/config/server-options.html#server-fs-strict.`);
		}
	}
	function canWrite(project) {
		return project.config.browser.api.allowWrite && project.vitest.config.browser.api.allowWrite && project.config.api.allowWrite && project.vitest.config.api.allowWrite;
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
				if (!canWrite(project)) {
					if (artifact.type === "internal:annotation" && artifact.annotation.attachment) {
						artifact.annotation.attachment = undefined;
						vitest.logger.error(`[vitest] Cannot record annotation attachment because file writing is disabled. See https://vitest.dev/config/browser/api.`);
					}
					// remove attachments if cannot write
					if (artifact.attachments?.length) {
						const attachments = artifact.attachments.map((n) => n.path).filter((r) => !!r).join("\", \"");
						artifact.attachments = [];
						vitest.logger.error(`[vitest] Cannot record attachments ("${attachments}") because file writing is disabled, removing attachments from artifact "${artifact.type}". See https://vitest.dev/config/browser/api.`);
					}
				}
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
				if (!canWrite(project)) {
					vitest.logger.error(`[vitest] Cannot save snapshot file "${id}". File writing is disabled because server is exposed to the internet, see https://vitest.dev/config/browser/api.`);
					return;
				}
				await promises.mkdir(dirname(id), { recursive: true });
				await promises.writeFile(id, content, "utf-8");
			},
			async removeSnapshotFile(id) {
				checkFileAccess(id);
				if (!canWrite(project)) {
					vitest.logger.error(`[vitest] Cannot remove snapshot file "${id}". File writing is disabled because server is exposed to the internet, see https://vitest.dev/config/browser/api.`);
					return;
				}
				if (!existsSync(id)) {
					throw new Error(`Snapshot file "${id}" does not exist.`);
				}
				await promises.unlink(id);
			},
			getBrowserFileSourceMap(id) {
				const mod = globalServer.vite.moduleGraph.getModuleById(id);
				const result = mod?.transformResult;
				// handle non-inline source map such as pre-bundled deps in node_modules/.vite
				if (result && !result.map) {
					const filePath = id.split("?")[0];
					const extracted = extractSourcemapFromFile(result.code, filePath);
					return extracted?.map;
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

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/stringUtils.ts
function escapeWithQuotes(text, char = "'") {
  const stringified = JSON.stringify(text);
  const escapedText = stringified.substring(1, stringified.length - 1).replace(/\\"/g, '"');
  if (char === "'") {
    return char + escapedText.replace(/'/g, "\\'") + char;
  }
  if (char === '"') {
    return char + escapedText.replace(/"/g, '\\"') + char;
  }
  if (char === "`") {
    return char + escapedText.replace(/`/g, "`") + char;
  }
  throw new Error("Invalid escape char");
}
function cssEscape(s) {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    result += cssEscapeOne(s, i);
  }
  return result;
}
function quoteCSSAttributeValue(text) {
  return `"${cssEscape(text).replace(/\\ /g, " ")}"`;
}
function cssEscapeOne(s, i) {
  const c = s.charCodeAt(i);
  if (c === 0) {
    return "\uFFFD";
  }
  if (c >= 1 && c <= 31 || c >= 48 && c <= 57 && (i === 0 || i === 1 && s.charCodeAt(0) === 45)) {
    return `\\${c.toString(16)} `;
  }
  if (i === 0 && c === 45 && s.length === 1) {
    return `\\${s.charAt(i)}`;
  }
  if (c >= 128 || c === 45 || c === 95 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122) {
    return s.charAt(i);
  }
  return `\\${s.charAt(i)}`;
}
function normalizeWhiteSpace(text) {
  const result = text.replace(/[\u200b\u00ad]/g, "").trim().replace(/\s+/g, " ");
  return result;
}
function normalizeEscapedRegexQuotes(source) {
  return source.replace(/(^|[^\\])(\\\\)*\\(['"`])/g, "$1$2$3");
}
function escapeRegexForSelector(re) {
  if (re.unicode || re.unicodeSets) {
    return String(re);
  }
  return String(re).replace(/(^|[^\\])(\\\\)*(["'`])/g, "$1$2\\$3").replace(/>>/g, "\\>\\>");
}
function escapeForTextSelector(text, exact) {
  if (typeof text !== "string") {
    return escapeRegexForSelector(text);
  }
  return `${JSON.stringify(text)}${exact ? "s" : "i"}`;
}
function escapeForAttributeSelector(value, exact) {
  if (typeof value !== "string") {
    return escapeRegexForSelector(value);
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"${exact ? "s" : "i"}`;
}
function trimString(input, cap, suffix = "") {
  if (input.length <= cap) {
    return input;
  }
  const chars = [...input];
  if (chars.length > cap) {
    return chars.slice(0, cap - suffix.length).join("") + suffix;
  }
  return chars.join("");
}
function trimStringWithEllipsis(input, cap) {
  return trimString(input, cap, "\u2026");
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/cssTokenizer.ts
var between = function(num, first, last) {
  return num >= first && num <= last;
};
function digit(code) {
  return between(code, 48, 57);
}
function hexdigit(code) {
  return digit(code) || between(code, 65, 70) || between(code, 97, 102);
}
function uppercaseletter(code) {
  return between(code, 65, 90);
}
function lowercaseletter(code) {
  return between(code, 97, 122);
}
function letter(code) {
  return uppercaseletter(code) || lowercaseletter(code);
}
function nonascii(code) {
  return code >= 128;
}
function namestartchar(code) {
  return letter(code) || nonascii(code) || code === 95;
}
function namechar(code) {
  return namestartchar(code) || digit(code) || code === 45;
}
function nonprintable(code) {
  return between(code, 0, 8) || code === 11 || between(code, 14, 31) || code === 127;
}
function newline(code) {
  return code === 10;
}
function whitespace(code) {
  return newline(code) || code === 9 || code === 32;
}
var maximumallowedcodepoint = 1114111;
var InvalidCharacterError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidCharacterError";
  }
};
function preprocess(str) {
  const codepoints = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code === 13 && str.charCodeAt(i + 1) === 10) {
      code = 10;
      i++;
    }
    if (code === 13 || code === 12) {
      code = 10;
    }
    if (code === 0) {
      code = 65533;
    }
    if (between(code, 55296, 56319) && between(str.charCodeAt(i + 1), 56320, 57343)) {
      const lead = code - 55296;
      const trail = str.charCodeAt(i + 1) - 56320;
      code = 2 ** 16 + lead * 2 ** 10 + trail;
      i++;
    }
    codepoints.push(code);
  }
  return codepoints;
}
function stringFromCode(code) {
  if (code <= 65535) {
    return String.fromCharCode(code);
  }
  code -= 2 ** 16;
  const lead = Math.floor(code / 2 ** 10) + 55296;
  const trail = code % 2 ** 10 + 56320;
  return String.fromCharCode(lead) + String.fromCharCode(trail);
}
function tokenize(str1) {
  const str = preprocess(str1);
  let i = -1;
  const tokens = [];
  let code;
  const codepoint = function(i2) {
    if (i2 >= str.length) {
      return -1;
    }
    return str[i2];
  };
  const next = function(num) {
    if (num === void 0) {
      num = 1;
    }
    if (num > 3) {
      throw "Spec Error: no more than three codepoints of lookahead.";
    }
    return codepoint(i + num);
  };
  const consume = function(num) {
    if (num === void 0) {
      num = 1;
    }
    i += num;
    code = codepoint(i);
    return true;
  };
  const reconsume = function() {
    i -= 1;
    return true;
  };
  const eof = function(codepoint2) {
    if (codepoint2 === void 0) {
      codepoint2 = code;
    }
    return codepoint2 === -1;
  };
  const consumeAToken = function() {
    consumeComments();
    consume();
    if (whitespace(code)) {
      while (whitespace(next())) {
        consume();
      }
      return new WhitespaceToken();
    } else if (code === 34) {
      return consumeAStringToken();
    } else if (code === 35) {
      if (namechar(next()) || areAValidEscape(next(1), next(2))) {
        const token = new HashToken("");
        if (wouldStartAnIdentifier(next(1), next(2), next(3))) {
          token.type = "id";
        }
        token.value = consumeAName();
        return token;
      } else {
        return new DelimToken(code);
      }
    } else if (code === 36) {
      if (next() === 61) {
        consume();
        return new SuffixMatchToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 39) {
      return consumeAStringToken();
    } else if (code === 40) {
      return new OpenParenToken();
    } else if (code === 41) {
      return new CloseParenToken();
    } else if (code === 42) {
      if (next() === 61) {
        consume();
        return new SubstringMatchToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 43) {
      if (startsWithANumber()) {
        reconsume();
        return consumeANumericToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 44) {
      return new CommaToken();
    } else if (code === 45) {
      if (startsWithANumber()) {
        reconsume();
        return consumeANumericToken();
      } else if (next(1) === 45 && next(2) === 62) {
        consume(2);
        return new CDCToken();
      } else if (startsWithAnIdentifier()) {
        reconsume();
        return consumeAnIdentlikeToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 46) {
      if (startsWithANumber()) {
        reconsume();
        return consumeANumericToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 58) {
      return new ColonToken();
    } else if (code === 59) {
      return new SemicolonToken();
    } else if (code === 60) {
      if (next(1) === 33 && next(2) === 45 && next(3) === 45) {
        consume(3);
        return new CDOToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 64) {
      if (wouldStartAnIdentifier(next(1), next(2), next(3))) {
        return new AtKeywordToken(consumeAName());
      } else {
        return new DelimToken(code);
      }
    } else if (code === 91) {
      return new OpenSquareToken();
    } else if (code === 92) {
      if (startsWithAValidEscape()) {
        reconsume();
        return consumeAnIdentlikeToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 93) {
      return new CloseSquareToken();
    } else if (code === 94) {
      if (next() === 61) {
        consume();
        return new PrefixMatchToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 123) {
      return new OpenCurlyToken();
    } else if (code === 124) {
      if (next() === 61) {
        consume();
        return new DashMatchToken();
      } else if (next() === 124) {
        consume();
        return new ColumnToken();
      } else {
        return new DelimToken(code);
      }
    } else if (code === 125) {
      return new CloseCurlyToken();
    } else if (code === 126) {
      if (next() === 61) {
        consume();
        return new IncludeMatchToken();
      } else {
        return new DelimToken(code);
      }
    } else if (digit(code)) {
      reconsume();
      return consumeANumericToken();
    } else if (namestartchar(code)) {
      reconsume();
      return consumeAnIdentlikeToken();
    } else if (eof()) {
      return new EOFToken();
    } else {
      return new DelimToken(code);
    }
  };
  const consumeComments = function() {
    while (next(1) === 47 && next(2) === 42) {
      consume(2);
      while (true) {
        consume();
        if (code === 42 && next() === 47) {
          consume();
          break;
        } else if (eof()) {
          return;
        }
      }
    }
  };
  const consumeANumericToken = function() {
    const num = consumeANumber();
    if (wouldStartAnIdentifier(next(1), next(2), next(3))) {
      const token = new DimensionToken();
      token.value = num.value;
      token.repr = num.repr;
      token.type = num.type;
      token.unit = consumeAName();
      return token;
    } else if (next() === 37) {
      consume();
      const token = new PercentageToken();
      token.value = num.value;
      token.repr = num.repr;
      return token;
    } else {
      const token = new NumberToken();
      token.value = num.value;
      token.repr = num.repr;
      token.type = num.type;
      return token;
    }
  };
  const consumeAnIdentlikeToken = function() {
    const str2 = consumeAName();
    if (str2.toLowerCase() === "url" && next() === 40) {
      consume();
      while (whitespace(next(1)) && whitespace(next(2))) {
        consume();
      }
      if (next() === 34 || next() === 39) {
        return new FunctionToken(str2);
      } else if (whitespace(next()) && (next(2) === 34 || next(2) === 39)) {
        return new FunctionToken(str2);
      } else {
        return consumeAURLToken();
      }
    } else if (next() === 40) {
      consume();
      return new FunctionToken(str2);
    } else {
      return new IdentToken(str2);
    }
  };
  const consumeAStringToken = function(endingCodePoint) {
    if (endingCodePoint === void 0) {
      endingCodePoint = code;
    }
    let string = "";
    while (consume()) {
      if (code === endingCodePoint || eof()) {
        return new StringToken(string);
      } else if (newline(code)) {
        reconsume();
        return new BadStringToken();
      } else if (code === 92) {
        if (eof(next())) ; else if (newline(next())) {
          consume();
        } else {
          string += stringFromCode(consumeEscape());
        }
      } else {
        string += stringFromCode(code);
      }
    }
    throw new Error("Internal error");
  };
  const consumeAURLToken = function() {
    const token = new URLToken("");
    while (whitespace(next())) {
      consume();
    }
    if (eof(next())) {
      return token;
    }
    while (consume()) {
      if (code === 41 || eof()) {
        return token;
      } else if (whitespace(code)) {
        while (whitespace(next())) {
          consume();
        }
        if (next() === 41 || eof(next())) {
          consume();
          return token;
        } else {
          consumeTheRemnantsOfABadURL();
          return new BadURLToken();
        }
      } else if (code === 34 || code === 39 || code === 40 || nonprintable(code)) {
        consumeTheRemnantsOfABadURL();
        return new BadURLToken();
      } else if (code === 92) {
        if (startsWithAValidEscape()) {
          token.value += stringFromCode(consumeEscape());
        } else {
          consumeTheRemnantsOfABadURL();
          return new BadURLToken();
        }
      } else {
        token.value += stringFromCode(code);
      }
    }
    throw new Error("Internal error");
  };
  const consumeEscape = function() {
    consume();
    if (hexdigit(code)) {
      const digits = [code];
      for (let total = 0; total < 5; total++) {
        if (hexdigit(next())) {
          consume();
          digits.push(code);
        } else {
          break;
        }
      }
      if (whitespace(next())) {
        consume();
      }
      let value = Number.parseInt(
        digits.map((x) => {
          return String.fromCharCode(x);
        }).join(""),
        16
      );
      if (value > maximumallowedcodepoint) {
        value = 65533;
      }
      return value;
    } else if (eof()) {
      return 65533;
    } else {
      return code;
    }
  };
  const areAValidEscape = function(c1, c2) {
    if (c1 !== 92) {
      return false;
    }
    if (newline(c2)) {
      return false;
    }
    return true;
  };
  const startsWithAValidEscape = function() {
    return areAValidEscape(code, next());
  };
  const wouldStartAnIdentifier = function(c1, c2, c3) {
    if (c1 === 45) {
      return namestartchar(c2) || c2 === 45 || areAValidEscape(c2, c3);
    } else if (namestartchar(c1)) {
      return true;
    } else if (c1 === 92) {
      return areAValidEscape(c1, c2);
    } else {
      return false;
    }
  };
  const startsWithAnIdentifier = function() {
    return wouldStartAnIdentifier(code, next(1), next(2));
  };
  const wouldStartANumber = function(c1, c2, c3) {
    if (c1 === 43 || c1 === 45) {
      if (digit(c2)) {
        return true;
      }
      if (c2 === 46 && digit(c3)) {
        return true;
      }
      return false;
    } else if (c1 === 46) {
      if (digit(c2)) {
        return true;
      }
      return false;
    } else if (digit(c1)) {
      return true;
    } else {
      return false;
    }
  };
  const startsWithANumber = function() {
    return wouldStartANumber(code, next(1), next(2));
  };
  const consumeAName = function() {
    let result = "";
    while (consume()) {
      if (namechar(code)) {
        result += stringFromCode(code);
      } else if (startsWithAValidEscape()) {
        result += stringFromCode(consumeEscape());
      } else {
        reconsume();
        return result;
      }
    }
    throw new Error("Internal parse error");
  };
  const consumeANumber = function() {
    let repr = "";
    let type = "integer";
    if (next() === 43 || next() === 45) {
      consume();
      repr += stringFromCode(code);
    }
    while (digit(next())) {
      consume();
      repr += stringFromCode(code);
    }
    if (next(1) === 46 && digit(next(2))) {
      consume();
      repr += stringFromCode(code);
      consume();
      repr += stringFromCode(code);
      type = "number";
      while (digit(next())) {
        consume();
        repr += stringFromCode(code);
      }
    }
    const c1 = next(1);
    const c2 = next(2);
    const c3 = next(3);
    if ((c1 === 69 || c1 === 101) && digit(c2)) {
      consume();
      repr += stringFromCode(code);
      consume();
      repr += stringFromCode(code);
      type = "number";
      while (digit(next())) {
        consume();
        repr += stringFromCode(code);
      }
    } else if ((c1 === 69 || c1 === 101) && (c2 === 43 || c2 === 45) && digit(c3)) {
      consume();
      repr += stringFromCode(code);
      consume();
      repr += stringFromCode(code);
      consume();
      repr += stringFromCode(code);
      type = "number";
      while (digit(next())) {
        consume();
        repr += stringFromCode(code);
      }
    }
    const value = convertAStringToANumber(repr);
    return { type, value, repr };
  };
  const convertAStringToANumber = function(string) {
    return +string;
  };
  const consumeTheRemnantsOfABadURL = function() {
    while (consume()) {
      if (code === 41 || eof()) {
        return;
      } else if (startsWithAValidEscape()) {
        consumeEscape();
      } else ;
    }
  };
  let iterationCount = 0;
  while (!eof(next())) {
    tokens.push(consumeAToken());
    iterationCount++;
    if (iterationCount > str.length * 2) {
      throw new Error("I'm infinite-looping!");
    }
  }
  return tokens;
}
var CSSParserToken = class {
  constructor() {
    __publicField(this, "tokenType", "");
    __publicField(this, "value");
  }
  toJSON() {
    return { token: this.tokenType };
  }
  toString() {
    return this.tokenType;
  }
  toSource() {
    return `${this}`;
  }
};
var BadStringToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "BADSTRING");
  }
};
var BadURLToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "BADURL");
  }
};
var WhitespaceToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "WHITESPACE");
  }
  toString() {
    return "WS";
  }
  toSource() {
    return " ";
  }
};
var CDOToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "CDO");
  }
  toSource() {
    return "<!--";
  }
};
var CDCToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "CDC");
  }
  toSource() {
    return "-->";
  }
};
var ColonToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", ":");
  }
};
var SemicolonToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", ";");
  }
};
var CommaToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", ",");
  }
};
var GroupingToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "value", "");
    __publicField(this, "mirror", "");
  }
};
var OpenCurlyToken = class extends GroupingToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "{");
    this.value = "{";
    this.mirror = "}";
  }
};
var CloseCurlyToken = class extends GroupingToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "}");
    this.value = "}";
    this.mirror = "{";
  }
};
var OpenSquareToken = class extends GroupingToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "[");
    this.value = "[";
    this.mirror = "]";
  }
};
var CloseSquareToken = class extends GroupingToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "]");
    this.value = "]";
    this.mirror = "[";
  }
};
var OpenParenToken = class extends GroupingToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "(");
    this.value = "(";
    this.mirror = ")";
  }
};
var CloseParenToken = class extends GroupingToken {
  constructor() {
    super();
    __publicField(this, "tokenType", ")");
    this.value = ")";
    this.mirror = "(";
  }
};
var IncludeMatchToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "~=");
  }
};
var DashMatchToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "|=");
  }
};
var PrefixMatchToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "^=");
  }
};
var SuffixMatchToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "$=");
  }
};
var SubstringMatchToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "*=");
  }
};
var ColumnToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "||");
  }
};
var EOFToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "tokenType", "EOF");
  }
  toSource() {
    return "";
  }
};
var DelimToken = class extends CSSParserToken {
  constructor(code) {
    super();
    __publicField(this, "tokenType", "DELIM");
    __publicField(this, "value", "");
    this.value = stringFromCode(code);
  }
  toString() {
    return `DELIM(${this.value})`;
  }
  toJSON() {
    const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
    json.value = this.value;
    return json;
  }
  toSource() {
    if (this.value === "\\") {
      return "\\\n";
    } else {
      return this.value;
    }
  }
};
var StringValuedToken = class extends CSSParserToken {
  constructor() {
    super(...arguments);
    __publicField(this, "value", "");
  }
  ASCIIMatch(str) {
    return this.value.toLowerCase() === str.toLowerCase();
  }
  toJSON() {
    const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
    json.value = this.value;
    return json;
  }
};
var IdentToken = class extends StringValuedToken {
  constructor(val) {
    super();
    __publicField(this, "tokenType", "IDENT");
    this.value = val;
  }
  toString() {
    return `IDENT(${this.value})`;
  }
  toSource() {
    return escapeIdent(this.value);
  }
};
var FunctionToken = class extends StringValuedToken {
  constructor(val) {
    super();
    __publicField(this, "tokenType", "FUNCTION");
    __publicField(this, "mirror");
    this.value = val;
    this.mirror = ")";
  }
  toString() {
    return `FUNCTION(${this.value})`;
  }
  toSource() {
    return `${escapeIdent(this.value)}(`;
  }
};
var AtKeywordToken = class extends StringValuedToken {
  constructor(val) {
    super();
    __publicField(this, "tokenType", "AT-KEYWORD");
    this.value = val;
  }
  toString() {
    return `AT(${this.value})`;
  }
  toSource() {
    return `@${escapeIdent(this.value)}`;
  }
};
var HashToken = class extends StringValuedToken {
  constructor(val) {
    super();
    __publicField(this, "tokenType", "HASH");
    __publicField(this, "type");
    this.value = val;
    this.type = "unrestricted";
  }
  toString() {
    return `HASH(${this.value})`;
  }
  toJSON() {
    const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
    json.value = this.value;
    json.type = this.type;
    return json;
  }
  toSource() {
    if (this.type === "id") {
      return `#${escapeIdent(this.value)}`;
    } else {
      return `#${escapeHash(this.value)}`;
    }
  }
};
var StringToken = class extends StringValuedToken {
  constructor(val) {
    super();
    __publicField(this, "tokenType", "STRING");
    this.value = val;
  }
  toString() {
    return `"${escapeString(this.value)}"`;
  }
};
var URLToken = class extends StringValuedToken {
  constructor(val) {
    super();
    __publicField(this, "tokenType", "URL");
    this.value = val;
  }
  toString() {
    return `URL(${this.value})`;
  }
  toSource() {
    return `url("${escapeString(this.value)}")`;
  }
};
var NumberToken = class extends CSSParserToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "NUMBER");
    __publicField(this, "type");
    __publicField(this, "repr");
    this.type = "integer";
    this.repr = "";
  }
  toString() {
    if (this.type === "integer") {
      return `INT(${this.value})`;
    }
    return `NUMBER(${this.value})`;
  }
  toJSON() {
    const json = super.toJSON();
    json.value = this.value;
    json.type = this.type;
    json.repr = this.repr;
    return json;
  }
  toSource() {
    return this.repr;
  }
};
var PercentageToken = class extends CSSParserToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "PERCENTAGE");
    __publicField(this, "repr");
    this.repr = "";
  }
  toString() {
    return `PERCENTAGE(${this.value})`;
  }
  toJSON() {
    const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
    json.value = this.value;
    json.repr = this.repr;
    return json;
  }
  toSource() {
    return `${this.repr}%`;
  }
};
var DimensionToken = class extends CSSParserToken {
  constructor() {
    super();
    __publicField(this, "tokenType", "DIMENSION");
    __publicField(this, "type");
    __publicField(this, "repr");
    __publicField(this, "unit");
    this.type = "integer";
    this.repr = "";
    this.unit = "";
  }
  toString() {
    return `DIM(${this.value},${this.unit})`;
  }
  toJSON() {
    const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
    json.value = this.value;
    json.type = this.type;
    json.repr = this.repr;
    json.unit = this.unit;
    return json;
  }
  toSource() {
    const source = this.repr;
    let unit = escapeIdent(this.unit);
    if (unit[0].toLowerCase() === "e" && (unit[1] === "-" || between(unit.charCodeAt(1), 48, 57))) {
      unit = `\\65 ${unit.slice(1, unit.length)}`;
    }
    return source + unit;
  }
};
function escapeIdent(string) {
  string = `${string}`;
  let result = "";
  const firstcode = string.charCodeAt(0);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code === 0) {
      throw new InvalidCharacterError(
        "Invalid character: the input contains U+0000."
      );
    }
    if (between(code, 1, 31) || code === 127 || i === 0 && between(code, 48, 57) || i === 1 && between(code, 48, 57) && firstcode === 45) {
      result += `\\${code.toString(16)} `;
    } else if (code >= 128 || code === 45 || code === 95 || between(code, 48, 57) || between(code, 65, 90) || between(code, 97, 122)) {
      result += string[i];
    } else {
      result += `\\${string[i]}`;
    }
  }
  return result;
}
function escapeHash(string) {
  string = `${string}`;
  let result = "";
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code === 0) {
      throw new InvalidCharacterError(
        "Invalid character: the input contains U+0000."
      );
    }
    if (code >= 128 || code === 45 || code === 95 || between(code, 48, 57) || between(code, 65, 90) || between(code, 97, 122)) {
      result += string[i];
    } else {
      result += `\\${code.toString(16)} `;
    }
  }
  return result;
}
function escapeString(string) {
  string = `${string}`;
  let result = "";
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code === 0) {
      throw new InvalidCharacterError(
        "Invalid character: the input contains U+0000."
      );
    }
    if (between(code, 1, 31) || code === 127) {
      result += `\\${code.toString(16)} `;
    } else if (code === 34 || code === 92) {
      result += `\\${string[i]}`;
    } else {
      result += string[i];
    }
  }
  return result;
}

// src/cssParser.ts
var InvalidSelectorError = class extends Error {
};
function parseCSS(selector, customNames) {
  let tokens;
  try {
    tokens = tokenize(selector);
    if (!(tokens[tokens.length - 1] instanceof EOFToken)) {
      tokens.push(new EOFToken());
    }
  } catch (e) {
    const newMessage = `${e.message} while parsing selector "${selector}"`;
    const index = (e.stack || "").indexOf(e.message);
    if (index !== -1) {
      e.stack = e.stack.substring(0, index) + newMessage + e.stack.substring(index + e.message.length);
    }
    e.message = newMessage;
    throw e;
  }
  const unsupportedToken = tokens.find((token) => {
    return token instanceof AtKeywordToken || token instanceof BadStringToken || token instanceof BadURLToken || token instanceof ColumnToken || token instanceof CDOToken || token instanceof CDCToken || token instanceof SemicolonToken || // TODO: Consider using these for something, e.g. to escape complex strings.
    // For example :xpath{ (//div/bar[@attr="foo"])[2]/baz }
    // Or this way :xpath( {complex-xpath-goes-here("hello")} )
    token instanceof OpenCurlyToken || token instanceof CloseCurlyToken || // TODO: Consider treating these as strings?
    token instanceof URLToken || token instanceof PercentageToken;
  });
  if (unsupportedToken) {
    throw new InvalidSelectorError(
      `Unsupported token "${unsupportedToken.toSource()}" while parsing selector "${selector}"`
    );
  }
  let pos = 0;
  const names = /* @__PURE__ */ new Set();
  function unexpected() {
    return new InvalidSelectorError(
      `Unexpected token "${tokens[pos].toSource()}" while parsing selector "${selector}"`
    );
  }
  function skipWhitespace() {
    while (tokens[pos] instanceof WhitespaceToken) {
      pos++;
    }
  }
  function isIdent(p = pos) {
    return tokens[p] instanceof IdentToken;
  }
  function isString(p = pos) {
    return tokens[p] instanceof StringToken;
  }
  function isNumber(p = pos) {
    return tokens[p] instanceof NumberToken;
  }
  function isComma(p = pos) {
    return tokens[p] instanceof CommaToken;
  }
  function isOpenParen(p = pos) {
    return tokens[p] instanceof OpenParenToken;
  }
  function isCloseParen(p = pos) {
    return tokens[p] instanceof CloseParenToken;
  }
  function isFunction(p = pos) {
    return tokens[p] instanceof FunctionToken;
  }
  function isStar(p = pos) {
    return tokens[p] instanceof DelimToken && tokens[p].value === "*";
  }
  function isEOF(p = pos) {
    return tokens[p] instanceof EOFToken;
  }
  function isClauseCombinator(p = pos) {
    return tokens[p] instanceof DelimToken && [">", "+", "~"].includes(tokens[p].value);
  }
  function isSelectorClauseEnd(p = pos) {
    return isComma(p) || isCloseParen(p) || isEOF(p) || isClauseCombinator(p) || tokens[p] instanceof WhitespaceToken;
  }
  function consumeFunctionArguments() {
    const result2 = [consumeArgument()];
    while (true) {
      skipWhitespace();
      if (!isComma()) {
        break;
      }
      pos++;
      result2.push(consumeArgument());
    }
    return result2;
  }
  function consumeArgument() {
    skipWhitespace();
    if (isNumber()) {
      return tokens[pos++].value;
    }
    if (isString()) {
      return tokens[pos++].value;
    }
    return consumeComplexSelector();
  }
  function consumeComplexSelector() {
    const result2 = { simples: [] };
    skipWhitespace();
    if (isClauseCombinator()) {
      result2.simples.push({
        selector: { functions: [{ name: "scope", args: [] }] },
        combinator: ""
      });
    } else {
      result2.simples.push({ selector: consumeSimpleSelector(), combinator: "" });
    }
    while (true) {
      skipWhitespace();
      if (isClauseCombinator()) {
        result2.simples[result2.simples.length - 1].combinator = tokens[pos++].value;
        skipWhitespace();
      } else if (isSelectorClauseEnd()) {
        break;
      }
      result2.simples.push({ combinator: "", selector: consumeSimpleSelector() });
    }
    return result2;
  }
  function consumeSimpleSelector() {
    let rawCSSString = "";
    const functions = [];
    while (!isSelectorClauseEnd()) {
      if (isIdent() || isStar()) {
        rawCSSString += tokens[pos++].toSource();
      } else if (tokens[pos] instanceof HashToken) {
        rawCSSString += tokens[pos++].toSource();
      } else if (tokens[pos] instanceof DelimToken && tokens[pos].value === ".") {
        pos++;
        if (isIdent()) {
          rawCSSString += `.${tokens[pos++].toSource()}`;
        } else {
          throw unexpected();
        }
      } else if (tokens[pos] instanceof ColonToken) {
        pos++;
        if (isIdent()) {
          if (!customNames.has(tokens[pos].value.toLowerCase())) {
            rawCSSString += `:${tokens[pos++].toSource()}`;
          } else {
            const name = tokens[pos++].value.toLowerCase();
            functions.push({ name, args: [] });
            names.add(name);
          }
        } else if (isFunction()) {
          const name = tokens[pos++].value.toLowerCase();
          if (!customNames.has(name)) {
            rawCSSString += `:${name}(${consumeBuiltinFunctionArguments()})`;
          } else {
            functions.push({ name, args: consumeFunctionArguments() });
            names.add(name);
          }
          skipWhitespace();
          if (!isCloseParen()) {
            throw unexpected();
          }
          pos++;
        } else {
          throw unexpected();
        }
      } else if (tokens[pos] instanceof OpenSquareToken) {
        rawCSSString += "[";
        pos++;
        while (!(tokens[pos] instanceof CloseSquareToken) && !isEOF()) {
          rawCSSString += tokens[pos++].toSource();
        }
        if (!(tokens[pos] instanceof CloseSquareToken)) {
          throw unexpected();
        }
        rawCSSString += "]";
        pos++;
      } else {
        throw unexpected();
      }
    }
    if (!rawCSSString && !functions.length) {
      throw unexpected();
    }
    return { css: rawCSSString || void 0, functions };
  }
  function consumeBuiltinFunctionArguments() {
    let s = "";
    let balance = 1;
    while (!isEOF()) {
      if (isOpenParen() || isFunction()) {
        balance++;
      }
      if (isCloseParen()) {
        balance--;
      }
      if (!balance) {
        break;
      }
      s += tokens[pos++].toSource();
    }
    return s;
  }
  const result = consumeFunctionArguments();
  if (!isEOF()) {
    throw unexpected();
  }
  if (result.some((arg) => typeof arg !== "object" || !("simples" in arg))) {
    throw new InvalidSelectorError(`Error while parsing selector "${selector}"`);
  }
  return { selector: result, names: Array.from(names) };
}

// src/selectorParser.ts
var kNestedSelectorNames = /* @__PURE__ */ new Set([
  "internal:has",
  "internal:has-not",
  "internal:and",
  "internal:or",
  "internal:chain",
  "left-of",
  "right-of",
  "above",
  "below",
  "near"
]);
var kNestedSelectorNamesWithDistance = /* @__PURE__ */ new Set([
  "left-of",
  "right-of",
  "above",
  "below",
  "near"
]);
var customCSSNames = /* @__PURE__ */ new Set([
  "not",
  "is",
  "where",
  "has",
  "scope",
  "light",
  "visible",
  "text",
  "text-matches",
  "text-is",
  "has-text",
  "above",
  "below",
  "right-of",
  "left-of",
  "near",
  "nth-match"
]);
function parseSelector(selector) {
  const parsedStrings = parseSelectorString(selector);
  const parts = [];
  for (const part of parsedStrings.parts) {
    if (part.name === "css" || part.name === "css:light") {
      if (part.name === "css:light") {
        part.body = `:light(${part.body})`;
      }
      const parsedCSS = parseCSS(part.body, customCSSNames);
      parts.push({
        name: "css",
        body: parsedCSS.selector,
        source: part.body
      });
      continue;
    }
    if (kNestedSelectorNames.has(part.name)) {
      let innerSelector;
      let distance;
      try {
        const unescaped = JSON.parse(`[${part.body}]`);
        if (!Array.isArray(unescaped) || unescaped.length < 1 || unescaped.length > 2 || typeof unescaped[0] !== "string") {
          throw new InvalidSelectorError(
            `Malformed selector: ${part.name}=${part.body}`
          );
        }
        innerSelector = unescaped[0];
        if (unescaped.length === 2) {
          if (typeof unescaped[1] !== "number" || !kNestedSelectorNamesWithDistance.has(part.name)) {
            throw new InvalidSelectorError(
              `Malformed selector: ${part.name}=${part.body}`
            );
          }
          distance = unescaped[1];
        }
      } catch (e) {
        throw new InvalidSelectorError(
          `Malformed selector: ${part.name}=${part.body}`
        );
      }
      const nested = {
        name: part.name,
        source: part.body,
        body: { parsed: parseSelector(innerSelector), distance }
      };
      const lastFrame = [...nested.body.parsed.parts].reverse().find(
        (part2) => part2.name === "internal:control" && part2.body === "enter-frame"
      );
      const lastFrameIndex = lastFrame ? nested.body.parsed.parts.indexOf(lastFrame) : -1;
      if (lastFrameIndex !== -1 && selectorPartsEqual(
        nested.body.parsed.parts.slice(0, lastFrameIndex + 1),
        parts.slice(0, lastFrameIndex + 1)
      )) {
        nested.body.parsed.parts.splice(0, lastFrameIndex + 1);
      }
      parts.push(nested);
      continue;
    }
    parts.push({ ...part, source: part.body });
  }
  if (kNestedSelectorNames.has(parts[0].name)) {
    throw new InvalidSelectorError(`"${parts[0].name}" selector cannot be first`);
  }
  return {
    capture: parsedStrings.capture,
    parts
  };
}
function selectorPartsEqual(list1, list2) {
  return stringifySelector({ parts: list1 }) === stringifySelector({ parts: list2 });
}
function stringifySelector(selector, forceEngineName) {
  if (typeof selector === "string") {
    return selector;
  }
  return selector.parts.map((p, i) => {
    let includeEngine = true;
    if (!forceEngineName && i !== selector.capture) {
      if (p.name === "css") {
        includeEngine = false;
      } else if (p.name === "xpath" && p.source.startsWith("//") || p.source.startsWith("..")) {
        includeEngine = false;
      }
    }
    const prefix = includeEngine ? `${p.name}=` : "";
    return `${i === selector.capture ? "*" : ""}${prefix}${p.source}`;
  }).join(" >> ");
}
function visitAllSelectorParts(selector, visitor) {
  const visit = (selector2, nested) => {
    for (const part of selector2.parts) {
      visitor(part, nested);
      if (kNestedSelectorNames.has(part.name)) {
        visit(part.body.parsed, true);
      }
    }
  };
  visit(selector, false);
}
function parseSelectorString(selector) {
  let index = 0;
  let quote;
  let start = 0;
  const result = { parts: [] };
  const append = () => {
    const part = selector.substring(start, index).trim();
    const eqIndex = part.indexOf("=");
    let name;
    let body;
    if (eqIndex !== -1 && part.substring(0, eqIndex).trim().match(/^[\w\-+:*]+$/)) {
      name = part.substring(0, eqIndex).trim();
      body = part.substring(eqIndex + 1);
    } else if (part.length > 1 && part[0] === '"' && part[part.length - 1] === '"') {
      name = "text";
      body = part;
    } else if (part.length > 1 && part[0] === "'" && part[part.length - 1] === "'") {
      name = "text";
      body = part;
    } else if (/^\(*\/\//.test(part) || part.startsWith("..")) {
      name = "xpath";
      body = part;
    } else {
      name = "css";
      body = part;
    }
    let capture = false;
    if (name[0] === "*") {
      capture = true;
      name = name.substring(1);
    }
    result.parts.push({ name, body });
    if (capture) {
      if (result.capture !== void 0) {
        throw new InvalidSelectorError(
          `Only one of the selectors can capture using * modifier`
        );
      }
      result.capture = result.parts.length - 1;
    }
  };
  if (!selector.includes(">>")) {
    index = selector.length;
    append();
    return result;
  }
  const shouldIgnoreTextSelectorQuote = () => {
    const prefix = selector.substring(start, index);
    const match = prefix.match(/^\s*text\s*=(.*)$/);
    return !!match && !!match[1];
  };
  while (index < selector.length) {
    const c = selector[index];
    if (c === "\\" && index + 1 < selector.length) {
      index += 2;
    } else if (c === quote) {
      quote = void 0;
      index++;
    } else if (!quote && (c === '"' || c === "'" || c === "`") && !shouldIgnoreTextSelectorQuote()) {
      quote = c;
      index++;
    } else if (!quote && c === ">" && selector[index + 1] === ">") {
      append();
      index += 2;
      start = index;
    } else {
      index++;
    }
  }
  append();
  return result;
}
function parseAttributeSelector(selector, allowUnquotedStrings) {
  let wp = 0;
  let EOL = selector.length === 0;
  const next = () => selector[wp] || "";
  const eat1 = () => {
    const result2 = next();
    ++wp;
    EOL = wp >= selector.length;
    return result2;
  };
  const syntaxError = (stage) => {
    if (EOL) {
      throw new InvalidSelectorError(
        `Unexpected end of selector while parsing selector \`${selector}\``
      );
    }
    throw new InvalidSelectorError(
      `Error while parsing selector \`${selector}\` - unexpected symbol "${next()}" at position ${wp}${stage ? ` during ${stage}` : ""}`
    );
  };
  function skipSpaces() {
    while (!EOL && /\s/.test(next())) {
      eat1();
    }
  }
  function isCSSNameChar(char) {
    return char >= "\x80" || // non-ascii
    char >= "0" && char <= "9" || // digit
    char >= "A" && char <= "Z" || // uppercase letter
    char >= "a" && char <= "z" || // lowercase letter
    char >= "0" && char <= "9" || // digit
    char === "_" || // "_"
    char === "-";
  }
  function readIdentifier() {
    let result2 = "";
    skipSpaces();
    while (!EOL && isCSSNameChar(next())) {
      result2 += eat1();
    }
    return result2;
  }
  function readQuotedString(quote) {
    let result2 = eat1();
    if (result2 !== quote) {
      syntaxError("parsing quoted string");
    }
    while (!EOL && next() !== quote) {
      if (next() === "\\") {
        eat1();
      }
      result2 += eat1();
    }
    if (next() !== quote) {
      syntaxError("parsing quoted string");
    }
    result2 += eat1();
    return result2;
  }
  function readRegularExpression() {
    if (eat1() !== "/") {
      syntaxError("parsing regular expression");
    }
    let source = "";
    let inClass = false;
    while (!EOL) {
      if (next() === "\\") {
        source += eat1();
        if (EOL) {
          syntaxError("parsing regular expression");
        }
      } else if (inClass && next() === "]") {
        inClass = false;
      } else if (!inClass && next() === "[") {
        inClass = true;
      } else if (!inClass && next() === "/") {
        break;
      }
      source += eat1();
    }
    if (eat1() !== "/") {
      syntaxError("parsing regular expression");
    }
    let flags = "";
    while (!EOL && next().match(/[dgimsuy]/)) {
      flags += eat1();
    }
    try {
      return new RegExp(source, flags);
    } catch (e) {
      throw new InvalidSelectorError(
        `Error while parsing selector \`${selector}\`: ${e.message}`
      );
    }
  }
  function readAttributeToken() {
    let token = "";
    skipSpaces();
    if (next() === `'` || next() === `"`) {
      token = readQuotedString(next()).slice(1, -1);
    } else {
      token = readIdentifier();
    }
    if (!token) {
      syntaxError("parsing property path");
    }
    return token;
  }
  function readOperator() {
    skipSpaces();
    let op = "";
    if (!EOL) {
      op += eat1();
    }
    if (!EOL && op !== "=") {
      op += eat1();
    }
    if (!["=", "*=", "^=", "$=", "|=", "~="].includes(op)) {
      syntaxError("parsing operator");
    }
    return op;
  }
  function readAttribute() {
    eat1();
    const jsonPath = [];
    jsonPath.push(readAttributeToken());
    skipSpaces();
    while (next() === ".") {
      eat1();
      jsonPath.push(readAttributeToken());
      skipSpaces();
    }
    if (next() === "]") {
      eat1();
      return {
        name: jsonPath.join("."),
        jsonPath,
        op: "<truthy>",
        value: null,
        caseSensitive: false
      };
    }
    const operator = readOperator();
    let value;
    let caseSensitive = true;
    skipSpaces();
    if (next() === "/") {
      if (operator !== "=") {
        throw new InvalidSelectorError(
          `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with regular expression`
        );
      }
      value = readRegularExpression();
    } else if (next() === `'` || next() === `"`) {
      value = readQuotedString(next()).slice(1, -1);
      skipSpaces();
      if (next() === "i" || next() === "I") {
        caseSensitive = false;
        eat1();
      } else if (next() === "s" || next() === "S") {
        caseSensitive = true;
        eat1();
      }
    } else {
      value = "";
      while (!EOL && (isCSSNameChar(next()) || next() === "+" || next() === ".")) {
        value += eat1();
      }
      if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      } else ;
    }
    skipSpaces();
    if (next() !== "]") {
      syntaxError("parsing attribute value");
    }
    eat1();
    if (operator !== "=" && typeof value !== "string") {
      throw new InvalidSelectorError(
        `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with non-string matching value - ${value}`
      );
    }
    return {
      name: jsonPath.join("."),
      jsonPath,
      op: operator,
      value,
      caseSensitive
    };
  }
  const result = {
    name: "",
    attributes: []
  };
  result.name = readIdentifier();
  skipSpaces();
  while (next() === "[") {
    result.attributes.push(readAttribute());
    skipSpaces();
  }
  if (!EOL) {
    syntaxError(void 0);
  }
  if (!result.name && !result.attributes.length) {
    throw new InvalidSelectorError(
      `Error while parsing selector \`${selector}\` - selector cannot be empty`
    );
  }
  return result;
}

// src/roleUtils.ts
function hasExplicitAccessibleName(e) {
  return e.hasAttribute("aria-label") || e.hasAttribute("aria-labelledby");
}
var kAncestorPreventingLandmark = "article:not([role]), aside:not([role]), main:not([role]), nav:not([role]), section:not([role]), [role=article], [role=complementary], [role=main], [role=navigation], [role=region]";
var kGlobalAriaAttributes = /* @__PURE__ */ new Map([
  ["aria-atomic", void 0],
  ["aria-busy", void 0],
  ["aria-controls", void 0],
  ["aria-current", void 0],
  ["aria-describedby", void 0],
  ["aria-details", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-disabled', undefined],
  ["aria-dropeffect", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-errormessage', undefined],
  ["aria-flowto", void 0],
  ["aria-grabbed", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-haspopup', undefined],
  ["aria-hidden", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-invalid', undefined],
  ["aria-keyshortcuts", void 0],
  [
    "aria-label",
    /* @__PURE__ */ new Set([
      "caption",
      "code",
      "deletion",
      "emphasis",
      "generic",
      "insertion",
      "paragraph",
      "presentation",
      "strong",
      "subscript",
      "superscript"
    ])
  ],
  [
    "aria-labelledby",
    /* @__PURE__ */ new Set([
      "caption",
      "code",
      "deletion",
      "emphasis",
      "generic",
      "insertion",
      "paragraph",
      "presentation",
      "strong",
      "subscript",
      "superscript"
    ])
  ],
  ["aria-live", void 0],
  ["aria-owns", void 0],
  ["aria-relevant", void 0],
  ["aria-roledescription", /* @__PURE__ */ new Set(["generic"])]
]);
function hasGlobalAriaAttribute(element, forRole) {
  return [...kGlobalAriaAttributes].some(([attr, prohibited]) => {
    return !(prohibited == null ? void 0 : prohibited.has(forRole || "")) && element.hasAttribute(attr);
  });
}
function hasTabIndex(element) {
  return !Number.isNaN(Number(String(element.getAttribute("tabindex"))));
}
function isFocusable(element) {
  return !isNativelyDisabled(element) && (isNativelyFocusable(element) || hasTabIndex(element));
}
function isNativelyFocusable(element) {
  const tagName = elementSafeTagName(element);
  if (["BUTTON", "DETAILS", "SELECT", "TEXTAREA"].includes(tagName)) {
    return true;
  }
  if (tagName === "A" || tagName === "AREA") {
    return element.hasAttribute("href");
  }
  if (tagName === "INPUT") {
    return !element.hidden;
  }
  return false;
}
var kImplicitRoleByTagName = {
  A: (e) => {
    return e.hasAttribute("href") ? "link" : null;
  },
  AREA: (e) => {
    return e.hasAttribute("href") ? "link" : null;
  },
  ARTICLE: () => "article",
  ASIDE: () => "complementary",
  BLOCKQUOTE: () => "blockquote",
  BUTTON: () => "button",
  CAPTION: () => "caption",
  CODE: () => "code",
  DATALIST: () => "listbox",
  DD: () => "definition",
  DEL: () => "deletion",
  DETAILS: () => "group",
  DFN: () => "term",
  DIALOG: () => "dialog",
  DT: () => "term",
  EM: () => "emphasis",
  FIELDSET: () => "group",
  FIGURE: () => "figure",
  FOOTER: (e) => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "contentinfo",
  FORM: (e) => hasExplicitAccessibleName(e) ? "form" : null,
  H1: () => "heading",
  H2: () => "heading",
  H3: () => "heading",
  H4: () => "heading",
  H5: () => "heading",
  H6: () => "heading",
  HEADER: (e) => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "banner",
  HR: () => "separator",
  HTML: () => "document",
  IMG: (e) => e.getAttribute("alt") === "" && !e.getAttribute("title") && !hasGlobalAriaAttribute(e) && !hasTabIndex(e) ? "presentation" : "img",
  INPUT: (e) => {
    const type = e.type.toLowerCase();
    if (type === "search") {
      return e.hasAttribute("list") ? "combobox" : "searchbox";
    }
    if (["email", "tel", "text", "url", ""].includes(type)) {
      const list = getIdRefs(e, e.getAttribute("list"))[0];
      return list && elementSafeTagName(list) === "DATALIST" ? "combobox" : "textbox";
    }
    if (type === "hidden") {
      return "";
    }
    if (type === "file") {
      return "button";
    }
    return {
      button: "button",
      checkbox: "checkbox",
      image: "button",
      number: "spinbutton",
      radio: "radio",
      range: "slider",
      reset: "button",
      submit: "button"
    }[type] || "textbox";
  },
  INS: () => "insertion",
  LI: () => "listitem",
  MAIN: () => "main",
  MARK: () => "mark",
  MATH: () => "math",
  MENU: () => "list",
  METER: () => "meter",
  NAV: () => "navigation",
  OL: () => "list",
  OPTGROUP: () => "group",
  OPTION: () => "option",
  OUTPUT: () => "status",
  P: () => "paragraph",
  PROGRESS: () => "progressbar",
  SECTION: (e) => hasExplicitAccessibleName(e) ? "region" : null,
  SELECT: (e) => e.hasAttribute("multiple") || e.size > 1 ? "listbox" : "combobox",
  STRONG: () => "strong",
  SUB: () => "subscript",
  SUP: () => "superscript",
  // For <svg> we default to Chrome behavior:
  // - Chrome reports 'img'.
  // - Firefox reports 'diagram' that is not in official ARIA spec yet.
  // - Safari reports 'no role', but still computes accessible name.
  SVG: () => "img",
  TABLE: () => "table",
  TBODY: () => "rowgroup",
  TD: (e) => {
    const table = closestCrossShadow(e, "table");
    const role = table ? getExplicitAriaRole(table) : "";
    return role === "grid" || role === "treegrid" ? "gridcell" : "cell";
  },
  TEXTAREA: () => "textbox",
  TFOOT: () => "rowgroup",
  TH: (e) => {
    if (e.getAttribute("scope") === "col") {
      return "columnheader";
    }
    if (e.getAttribute("scope") === "row") {
      return "rowheader";
    }
    const table = closestCrossShadow(e, "table");
    const role = table ? getExplicitAriaRole(table) : "";
    return role === "grid" || role === "treegrid" ? "gridcell" : "cell";
  },
  THEAD: () => "rowgroup",
  TIME: () => "time",
  TR: () => "row",
  UL: () => "list"
};
var kPresentationInheritanceParents = {
  DD: ["DL", "DIV"],
  DIV: ["DL"],
  DT: ["DL", "DIV"],
  LI: ["OL", "UL"],
  TBODY: ["TABLE"],
  TD: ["TR"],
  TFOOT: ["TABLE"],
  TH: ["TR"],
  THEAD: ["TABLE"],
  TR: ["THEAD", "TBODY", "TFOOT", "TABLE"]
};
function getImplicitAriaRole(element) {
  var _a;
  const implicitRole = ((_a = kImplicitRoleByTagName[elementSafeTagName(element)]) == null ? void 0 : _a.call(kImplicitRoleByTagName, element)) || "";
  if (!implicitRole) {
    return null;
  }
  let ancestor = element;
  while (ancestor) {
    const parent = parentElementOrShadowHost(ancestor);
    const parents = kPresentationInheritanceParents[elementSafeTagName(ancestor)];
    if (!parents || !parent || !parents.includes(elementSafeTagName(parent))) {
      break;
    }
    const parentExplicitRole = getExplicitAriaRole(parent);
    if ((parentExplicitRole === "none" || parentExplicitRole === "presentation") && !hasPresentationConflictResolution(parent, parentExplicitRole)) {
      return parentExplicitRole;
    }
    ancestor = parent;
  }
  return implicitRole;
}
var allRoles = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "blockquote",
  "button",
  "caption",
  "cell",
  "checkbox",
  "code",
  "columnheader",
  "combobox",
  "command",
  "complementary",
  "composite",
  "contentinfo",
  "definition",
  "deletion",
  "dialog",
  "directory",
  "document",
  "emphasis",
  "feed",
  "figure",
  "form",
  "generic",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "input",
  "insertion",
  "landmark",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "meter",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "paragraph",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "range",
  "region",
  "roletype",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "section",
  "sectionhead",
  "select",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "strong",
  "structure",
  "subscript",
  "superscript",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "time",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem",
  "widget",
  "window"
];
var abstractRoles = [
  "command",
  "composite",
  "input",
  "landmark",
  "range",
  "roletype",
  "section",
  "sectionhead",
  "select",
  "structure",
  "widget",
  "window"
];
var validRoles = allRoles.filter((role) => !abstractRoles.includes(role));
function getExplicitAriaRole(element) {
  const roles = (element.getAttribute("role") || "").split(" ").map((role) => role.trim());
  return roles.find((role) => validRoles.includes(role)) || null;
}
function hasPresentationConflictResolution(element, role) {
  return hasGlobalAriaAttribute(element, role) || isFocusable(element);
}
function getAriaRole(element) {
  const explicitRole = getExplicitAriaRole(element);
  if (!explicitRole) {
    return getImplicitAriaRole(element);
  }
  if (explicitRole === "none" || explicitRole === "presentation") {
    const implicitRole = getImplicitAriaRole(element);
    if (hasPresentationConflictResolution(element, implicitRole)) {
      return implicitRole;
    }
  }
  return explicitRole;
}
function getAriaBoolean(attr) {
  return attr === null ? void 0 : attr.toLowerCase() === "true";
}
function isElementIgnoredForAria(element) {
  return ["STYLE", "SCRIPT", "NOSCRIPT", "TEMPLATE"].includes(
    elementSafeTagName(element)
  );
}
function isElementHiddenForAria(element) {
  if (isElementIgnoredForAria(element)) {
    return true;
  }
  const style = getElementComputedStyle(element);
  const isSlot = element.nodeName === "SLOT";
  if ((style == null ? void 0 : style.display) === "contents" && !isSlot) {
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && !isElementHiddenForAria(child)) {
        return false;
      }
      if (child.nodeType === 3 && isVisibleTextNode(child)) {
        return false;
      }
    }
    return true;
  }
  const isOptionInsideSelect = element.nodeName === "OPTION" && !!element.closest("select");
  if (!isOptionInsideSelect && !isSlot && !isElementStyleVisibilityVisible(element, style)) {
    return true;
  }
  return belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element);
}
function belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element) {
  let hidden = cacheIsHidden == null ? void 0 : cacheIsHidden.get(element);
  if (hidden === void 0) {
    hidden = false;
    if (element.parentElement && element.parentElement.shadowRoot && !element.assignedSlot) {
      hidden = true;
    }
    if (!hidden) {
      const style = getElementComputedStyle(element);
      hidden = !style || style.display === "none" || getAriaBoolean(element.getAttribute("aria-hidden")) === true;
    }
    if (!hidden) {
      const parent = parentElementOrShadowHost(element);
      if (parent) {
        hidden = belongsToDisplayNoneOrAriaHiddenOrNonSlotted(parent);
      }
    }
    cacheIsHidden == null ? void 0 : cacheIsHidden.set(element, hidden);
  }
  return hidden;
}
function getIdRefs(element, ref) {
  if (!ref) {
    return [];
  }
  const root = enclosingShadowRootOrDocument(element);
  if (!root) {
    return [];
  }
  try {
    const ids = ref.split(" ").filter((id) => !!id);
    const set = /* @__PURE__ */ new Set();
    for (const id of ids) {
      const firstElement = root.querySelector(`#${CSS.escape(id)}`);
      if (firstElement) {
        set.add(firstElement);
      }
    }
    return [...set];
  } catch (e) {
    return [];
  }
}
function trimFlatString(s) {
  return s.trim();
}
function asFlatString(s) {
  return s.split("\xA0").map(
    (chunk) => chunk.replace(/\r\n/g, "\n").replace(/[\u200b\u00ad]/g, "").replace(/\s\s*/g, " ")
  ).join("\xA0").trim();
}
function queryInAriaOwned(element, selector) {
  const result = [...element.querySelectorAll(selector)];
  for (const owned of getIdRefs(element, element.getAttribute("aria-owns"))) {
    if (owned.matches(selector)) {
      result.push(owned);
    }
    result.push(...owned.querySelectorAll(selector));
  }
  return result;
}
function getPseudoContent(element, pseudo) {
  const cache = pseudo === "::before" ? cachePseudoContentBefore : cachePseudoContentAfter;
  if (cache == null ? void 0 : cache.has(element)) {
    return (cache == null ? void 0 : cache.get(element)) || "";
  }
  const pseudoStyle = getElementComputedStyle(element, pseudo);
  const content = getPseudoContentImpl(pseudoStyle);
  if (cache) {
    cache.set(element, content);
  }
  return content;
}
function getPseudoContentImpl(pseudoStyle) {
  if (!pseudoStyle) {
    return "";
  }
  const content = pseudoStyle.content;
  if (content[0] === "'" && content[content.length - 1] === "'" || content[0] === '"' && content[content.length - 1] === '"') {
    const unquoted = content.substring(1, content.length - 1);
    const display = pseudoStyle.display || "inline";
    if (display !== "inline") {
      return ` ${unquoted} `;
    }
    return unquoted;
  }
  return "";
}
function getAriaLabelledByElements(element) {
  const ref = element.getAttribute("aria-labelledby");
  if (ref === null) {
    return null;
  }
  return getIdRefs(element, ref);
}
function allowsNameFromContent(role, targetDescendant) {
  const alwaysAllowsNameFromContent = [
    "button",
    "cell",
    "checkbox",
    "columnheader",
    "gridcell",
    "heading",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "row",
    "rowheader",
    "switch",
    "tab",
    "tooltip",
    "treeitem"
  ].includes(role);
  const descendantAllowsNameFromContent = targetDescendant && [
    "",
    "caption",
    "code",
    "contentinfo",
    "definition",
    "deletion",
    "emphasis",
    "insertion",
    "list",
    "listitem",
    "mark",
    "none",
    "paragraph",
    "presentation",
    "region",
    "row",
    "rowgroup",
    "section",
    "strong",
    "subscript",
    "superscript",
    "table",
    "term",
    "time"
  ].includes(role);
  return alwaysAllowsNameFromContent || descendantAllowsNameFromContent;
}
function getElementAccessibleName(element, includeHidden) {
  const cache = includeHidden ? cacheAccessibleNameHidden : cacheAccessibleName;
  let accessibleName = cache == null ? void 0 : cache.get(element);
  if (accessibleName === void 0) {
    accessibleName = "";
    const elementProhibitsNaming = [
      "caption",
      "code",
      "definition",
      "deletion",
      "emphasis",
      "generic",
      "insertion",
      "mark",
      "paragraph",
      "presentation",
      "strong",
      "subscript",
      "suggestion",
      "superscript",
      "term",
      "time"
    ].includes(getAriaRole(element) || "");
    if (!elementProhibitsNaming) {
      accessibleName = asFlatString(
        getTextAlternativeInternal(element, {
          includeHidden,
          visitedElements: /* @__PURE__ */ new Set(),
          embeddedInDescribedBy: void 0,
          embeddedInLabelledBy: void 0,
          embeddedInLabel: void 0,
          embeddedInNativeTextAlternative: void 0,
          embeddedInTargetElement: "self"
        })
      );
    }
    cache == null ? void 0 : cache.set(element, accessibleName);
  }
  return accessibleName;
}
function getTextAlternativeInternal(element, options) {
  var _a, _b, _c, _d;
  if (options.visitedElements.has(element)) return "";
  const childOptions = {
    ...options,
    embeddedInTargetElement: options.embeddedInTargetElement === "self" ? "descendant" : options.embeddedInTargetElement
  };
  if (!options.includeHidden) {
    const isEmbeddedInHiddenReferenceTraversal = !!((_a = options.embeddedInLabelledBy) == null ? void 0 : _a.hidden) || !!((_b = options.embeddedInDescribedBy) == null ? void 0 : _b.hidden) || !!((_c = options.embeddedInNativeTextAlternative) == null ? void 0 : _c.hidden) || !!((_d = options.embeddedInLabel) == null ? void 0 : _d.hidden);
    if (isElementIgnoredForAria(element) || !isEmbeddedInHiddenReferenceTraversal && isElementHiddenForAria(element)) {
      options.visitedElements.add(element);
      return "";
    }
  }
  const labelledBy = getAriaLabelledByElements(element);
  if (!options.embeddedInLabelledBy) {
    const accessibleName = (labelledBy || []).map(
      (ref) => getTextAlternativeInternal(ref, {
        ...options,
        embeddedInLabelledBy: {
          element: ref,
          hidden: isElementHiddenForAria(ref)
        },
        embeddedInDescribedBy: void 0,
        embeddedInTargetElement: void 0,
        embeddedInLabel: void 0,
        embeddedInNativeTextAlternative: void 0
      })
    ).join(" ");
    if (accessibleName) return accessibleName;
  }
  const role = getAriaRole(element) || "";
  const tagName = elementSafeTagName(element);
  if (!!options.embeddedInLabel || !!options.embeddedInLabelledBy || options.embeddedInTargetElement === "descendant") {
    const isOwnLabel = [
      ...element.labels || []
    ].includes(element);
    const isOwnLabelledBy = (labelledBy || []).includes(element);
    if (!isOwnLabel && !isOwnLabelledBy) {
      if (role === "textbox") {
        options.visitedElements.add(element);
        if (tagName === "INPUT" || tagName === "TEXTAREA")
          return element.value;
        return element.textContent || "";
      }
      if (["combobox", "listbox"].includes(role)) {
        options.visitedElements.add(element);
        let selectedOptions;
        if (tagName === "SELECT") {
          selectedOptions = [...element.selectedOptions];
          if (!selectedOptions.length && element.options.length)
            selectedOptions.push(element.options[0]);
        } else {
          const listbox = role === "combobox" ? queryInAriaOwned(element, "*").find(
            (e) => getAriaRole(e) === "listbox"
          ) : element;
          selectedOptions = listbox ? queryInAriaOwned(listbox, '[aria-selected="true"]').filter(
            (e) => getAriaRole(e) === "option"
          ) : [];
        }
        if (!selectedOptions.length && tagName === "INPUT") {
          return element.value;
        }
        return selectedOptions.map((option) => getTextAlternativeInternal(option, childOptions)).join(" ");
      }
      if (["progressbar", "scrollbar", "slider", "spinbutton", "meter"].includes(role)) {
        options.visitedElements.add(element);
        if (element.hasAttribute("aria-valuetext"))
          return element.getAttribute("aria-valuetext") || "";
        if (element.hasAttribute("aria-valuenow"))
          return element.getAttribute("aria-valuenow") || "";
        return element.getAttribute("value") || "";
      }
      if (["menu"].includes(role)) {
        options.visitedElements.add(element);
        return "";
      }
    }
  }
  const ariaLabel = element.getAttribute("aria-label") || "";
  if (trimFlatString(ariaLabel)) {
    options.visitedElements.add(element);
    return ariaLabel;
  }
  if (!["presentation", "none"].includes(role)) {
    if (tagName === "INPUT" && ["button", "submit", "reset"].includes(element.type)) {
      options.visitedElements.add(element);
      const value = element.value || "";
      if (trimFlatString(value)) return value;
      if (element.type === "submit") return "Submit";
      if (element.type === "reset") return "Reset";
      const title = element.getAttribute("title") || "";
      return title;
    }
    if (tagName === "INPUT" && element.type === "image") {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length && !options.embeddedInLabelledBy)
        return getAccessibleNameFromAssociatedLabels(labels, options);
      const alt = element.getAttribute("alt") || "";
      if (trimFlatString(alt)) return alt;
      const title = element.getAttribute("title") || "";
      if (trimFlatString(title)) return title;
      return "Submit";
    }
    if (!labelledBy && tagName === "BUTTON") {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length)
        return getAccessibleNameFromAssociatedLabels(labels, options);
    }
    if (!labelledBy && tagName === "OUTPUT") {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length)
        return getAccessibleNameFromAssociatedLabels(labels, options);
      return element.getAttribute("title") || "";
    }
    if (!labelledBy && (tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "INPUT")) {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length)
        return getAccessibleNameFromAssociatedLabels(labels, options);
      const usePlaceholder = tagName === "INPUT" && ["text", "password", "search", "tel", "email", "url"].includes(
        element.type
      ) || tagName === "TEXTAREA";
      const placeholder = element.getAttribute("placeholder") || "";
      const title = element.getAttribute("title") || "";
      if (!usePlaceholder || title) return title;
      return placeholder;
    }
    if (!labelledBy && tagName === "FIELDSET") {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "LEGEND") {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInNativeTextAlternative: {
              element: child,
              hidden: isElementHiddenForAria(child)
            }
          });
        }
      }
      const title = element.getAttribute("title") || "";
      return title;
    }
    if (!labelledBy && tagName === "FIGURE") {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "FIGCAPTION") {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInNativeTextAlternative: {
              element: child,
              hidden: isElementHiddenForAria(child)
            }
          });
        }
      }
      const title = element.getAttribute("title") || "";
      return title;
    }
    if (tagName === "IMG") {
      options.visitedElements.add(element);
      const alt = element.getAttribute("alt") || "";
      if (trimFlatString(alt)) return alt;
      const title = element.getAttribute("title") || "";
      return title;
    }
    if (tagName === "TABLE") {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "CAPTION") {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInNativeTextAlternative: {
              element: child,
              hidden: isElementHiddenForAria(child)
            }
          });
        }
      }
      const summary = element.getAttribute("summary") || "";
      if (summary) return summary;
    }
    if (tagName === "AREA") {
      options.visitedElements.add(element);
      const alt = element.getAttribute("alt") || "";
      if (trimFlatString(alt)) return alt;
      const title = element.getAttribute("title") || "";
      return title;
    }
    if (tagName === "SVG" || element.ownerSVGElement) {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "TITLE" && child.ownerSVGElement) {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInLabelledBy: {
              element: child,
              hidden: isElementHiddenForAria(child)
            }
          });
        }
      }
    }
    if (element.ownerSVGElement && tagName === "A") {
      const title = element.getAttribute("xlink:title") || "";
      if (trimFlatString(title)) {
        options.visitedElements.add(element);
        return title;
      }
    }
  }
  const shouldNameFromContentForSummary = tagName === "SUMMARY" && !["presentation", "none"].includes(role);
  if (allowsNameFromContent(role, options.embeddedInTargetElement === "descendant") || shouldNameFromContentForSummary || !!options.embeddedInLabelledBy || !!options.embeddedInDescribedBy || !!options.embeddedInLabel || !!options.embeddedInNativeTextAlternative) {
    options.visitedElements.add(element);
    const accessibleName = innerAccumulatedElementText(element, childOptions);
    const maybeTrimmedAccessibleName = options.embeddedInTargetElement === "self" ? trimFlatString(accessibleName) : accessibleName;
    if (maybeTrimmedAccessibleName) return accessibleName;
  }
  if (!["presentation", "none"].includes(role) || tagName === "IFRAME") {
    options.visitedElements.add(element);
    const title = element.getAttribute("title") || "";
    if (trimFlatString(title)) return title;
  }
  options.visitedElements.add(element);
  return "";
}
function innerAccumulatedElementText(element, options) {
  const tokens = [];
  const visit = (node, skipSlotted) => {
    var _a;
    if (skipSlotted && node.assignedSlot) return;
    if (node.nodeType === 1) {
      const display = ((_a = getElementComputedStyle(node)) == null ? void 0 : _a.display) || "inline";
      let token = getTextAlternativeInternal(node, options);
      if (display !== "inline" || node.nodeName === "BR") token = " " + token + " ";
      tokens.push(token);
    } else if (node.nodeType === 3) {
      tokens.push(node.textContent || "");
    }
  };
  tokens.push(getPseudoContent(element, "::before"));
  const assignedNodes = element.nodeName === "SLOT" ? element.assignedNodes() : [];
  if (assignedNodes.length) {
    for (const child of assignedNodes) visit(child, false);
  } else {
    for (let child = element.firstChild; child; child = child.nextSibling)
      visit(child, true);
    if (element.shadowRoot) {
      for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling)
        visit(child, true);
    }
    for (const owned of getIdRefs(element, element.getAttribute("aria-owns")))
      visit(owned, true);
  }
  tokens.push(getPseudoContent(element, "::after"));
  return tokens.join("");
}
var kAriaSelectedRoles = [
  "gridcell",
  "option",
  "row",
  "tab",
  "rowheader",
  "columnheader",
  "treeitem"
];
function getAriaSelected(element) {
  if (elementSafeTagName(element) === "OPTION") {
    return element.selected;
  }
  if (kAriaSelectedRoles.includes(getAriaRole(element) || "")) {
    return getAriaBoolean(element.getAttribute("aria-selected")) === true;
  }
  return false;
}
var kAriaCheckedRoles = [
  "checkbox",
  "menuitemcheckbox",
  "option",
  "radio",
  "switch",
  "menuitemradio",
  "treeitem"
];
function getAriaChecked(element) {
  const result = getChecked(element);
  return result === "error" ? false : result;
}
function getChecked(element, allowMixed) {
  const tagName = elementSafeTagName(element);
  if (tagName === "INPUT" && element.indeterminate) {
    return "mixed";
  }
  if (tagName === "INPUT" && ["checkbox", "radio"].includes(element.type)) {
    return element.checked;
  }
  if (kAriaCheckedRoles.includes(getAriaRole(element) || "")) {
    const checked = element.getAttribute("aria-checked");
    if (checked === "true") {
      return true;
    }
    if (checked === "mixed") {
      return "mixed";
    }
    return false;
  }
  return "error";
}
var kAriaPressedRoles = ["button"];
function getAriaPressed(element) {
  if (kAriaPressedRoles.includes(getAriaRole(element) || "")) {
    const pressed = element.getAttribute("aria-pressed");
    if (pressed === "true") {
      return true;
    }
    if (pressed === "mixed") {
      return "mixed";
    }
  }
  return false;
}
var kAriaExpandedRoles = [
  "application",
  "button",
  "checkbox",
  "combobox",
  "gridcell",
  "link",
  "listbox",
  "menuitem",
  "row",
  "rowheader",
  "tab",
  "treeitem",
  "columnheader",
  "menuitemcheckbox",
  "menuitemradio",
  "rowheader",
  "switch"
];
function getAriaExpanded(element) {
  if (elementSafeTagName(element) === "DETAILS") {
    return element.open;
  }
  if (kAriaExpandedRoles.includes(getAriaRole(element) || "")) {
    const expanded = element.getAttribute("aria-expanded");
    if (expanded === null) {
      return "none";
    }
    if (expanded === "true") {
      return true;
    }
    return false;
  }
  return "none";
}
var kAriaLevelRoles = ["heading", "listitem", "row", "treeitem"];
function getAriaLevel(element) {
  const native = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6 }[elementSafeTagName(element)];
  if (native) {
    return native;
  }
  if (kAriaLevelRoles.includes(getAriaRole(element) || "")) {
    const attr = element.getAttribute("aria-level");
    const value = attr === null ? Number.NaN : Number(attr);
    if (Number.isInteger(value) && value >= 1) {
      return value;
    }
  }
  return 0;
}
var kAriaDisabledRoles = [
  "application",
  "button",
  "composite",
  "gridcell",
  "group",
  "input",
  "link",
  "menuitem",
  "scrollbar",
  "separator",
  "tab",
  "checkbox",
  "columnheader",
  "combobox",
  "grid",
  "listbox",
  "menu",
  "menubar",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "radiogroup",
  "row",
  "rowheader",
  "searchbox",
  "select",
  "slider",
  "spinbutton",
  "switch",
  "tablist",
  "textbox",
  "toolbar",
  "tree",
  "treegrid",
  "treeitem"
];
function getAriaDisabled(element) {
  return isNativelyDisabled(element) || hasExplicitAriaDisabled(element);
}
function isNativelyDisabled(element) {
  const isNativeFormControl = [
    "BUTTON",
    "INPUT",
    "SELECT",
    "TEXTAREA",
    "OPTION",
    "OPTGROUP"
  ].includes(element.tagName);
  return isNativeFormControl && (element.hasAttribute("disabled") || belongsToDisabledFieldSet(element));
}
function belongsToDisabledFieldSet(element) {
  const fieldSetElement = element == null ? void 0 : element.closest("FIELDSET[DISABLED]");
  if (!fieldSetElement)
    return false;
  const legendElement = fieldSetElement.querySelector(":scope > LEGEND");
  return !legendElement || !legendElement.contains(element);
}
function hasExplicitAriaDisabled(element) {
  if (!element) {
    return false;
  }
  if (kAriaDisabledRoles.includes(getAriaRole(element) || "")) {
    const attribute = (element.getAttribute("aria-disabled") || "").toLowerCase();
    if (attribute === "true") {
      return true;
    }
    if (attribute === "false") {
      return false;
    }
  }
  return hasExplicitAriaDisabled(parentElementOrShadowHost(element));
}
function getAccessibleNameFromAssociatedLabels(labels, options) {
  return [...labels].map(
    (label) => getTextAlternativeInternal(label, {
      ...options,
      embeddedInLabel: { element: label, hidden: isElementHiddenForAria(label) },
      embeddedInNativeTextAlternative: void 0,
      embeddedInLabelledBy: void 0,
      embeddedInDescribedBy: void 0,
      embeddedInTargetElement: void 0
    })
  ).filter((accessibleName) => !!accessibleName).join(" ");
}
var cacheAccessibleName;
var cacheAccessibleNameHidden;
var cacheIsHidden;
var cachePseudoContentBefore;
var cachePseudoContentAfter;
var cachesCounter = 0;
function beginAriaCaches() {
  ++cachesCounter;
  cacheAccessibleName != null ? cacheAccessibleName : cacheAccessibleName = /* @__PURE__ */ new Map();
  cacheAccessibleNameHidden != null ? cacheAccessibleNameHidden : cacheAccessibleNameHidden = /* @__PURE__ */ new Map();
  cacheIsHidden != null ? cacheIsHidden : cacheIsHidden = /* @__PURE__ */ new Map();
  cachePseudoContentBefore != null ? cachePseudoContentBefore : cachePseudoContentBefore = /* @__PURE__ */ new Map();
  cachePseudoContentAfter != null ? cachePseudoContentAfter : cachePseudoContentAfter = /* @__PURE__ */ new Map();
}
function endAriaCaches() {
  if (!--cachesCounter) {
    cacheAccessibleName = void 0;
    cacheAccessibleNameHidden = void 0;
    cacheIsHidden = void 0;
    cachePseudoContentBefore = void 0;
    cachePseudoContentAfter = void 0;
  }
}

// src/selectorUtils.ts
function matchesAttributePart(value, attr) {
  const objValue = typeof value === "string" && !attr.caseSensitive ? value.toUpperCase() : value;
  const attrValue = typeof attr.value === "string" && !attr.caseSensitive ? attr.value.toUpperCase() : attr.value;
  if (attr.op === "<truthy>") {
    return !!objValue;
  }
  if (attr.op === "=") {
    if (attrValue instanceof RegExp) {
      return typeof objValue === "string" && !!objValue.match(attrValue);
    }
    return objValue === attrValue;
  }
  if (typeof objValue !== "string" || typeof attrValue !== "string") {
    return false;
  }
  if (attr.op === "*=") {
    return objValue.includes(attrValue);
  }
  if (attr.op === "^=") {
    return objValue.startsWith(attrValue);
  }
  if (attr.op === "$=") {
    return objValue.endsWith(attrValue);
  }
  if (attr.op === "|=") {
    return objValue === attrValue || objValue.startsWith(`${attrValue}-`);
  }
  if (attr.op === "~=") {
    return objValue.split(" ").includes(attrValue);
  }
  return false;
}
function shouldSkipForTextMatching(element) {
  const document2 = element.ownerDocument;
  return element.nodeName === "SCRIPT" || element.nodeName === "NOSCRIPT" || element.nodeName === "STYLE" || document2.head && document2.head.contains(element);
}
function elementText(cache, root) {
  let value = cache.get(root);
  if (value === void 0) {
    value = { full: "", normalized: "", immediate: [] };
    if (!shouldSkipForTextMatching(root)) {
      let currentImmediate = "";
      if (root instanceof HTMLInputElement && (root.type === "submit" || root.type === "button")) {
        value = {
          full: root.value,
          normalized: normalizeWhiteSpace(root.value),
          immediate: [root.value]
        };
      } else {
        for (let child = root.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === Node.TEXT_NODE) {
            value.full += child.nodeValue || "";
            currentImmediate += child.nodeValue || "";
          } else {
            if (currentImmediate) {
              value.immediate.push(currentImmediate);
            }
            currentImmediate = "";
            if (child.nodeType === Node.ELEMENT_NODE) {
              value.full += elementText(cache, child).full;
            }
          }
        }
        if (currentImmediate) {
          value.immediate.push(currentImmediate);
        }
        if (root.shadowRoot) {
          value.full += elementText(cache, root.shadowRoot).full;
        }
        if (value.full) {
          value.normalized = normalizeWhiteSpace(value.full);
        }
      }
    }
    cache.set(root, value);
  }
  return value;
}
function elementMatchesText(cache, element, matcher) {
  if (shouldSkipForTextMatching(element)) {
    return "none";
  }
  if (!matcher(elementText(cache, element))) {
    return "none";
  }
  for (let child = element.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === Node.ELEMENT_NODE && matcher(elementText(cache, child))) {
      return "selfAndChildren";
    }
  }
  if (element.shadowRoot && matcher(elementText(cache, element.shadowRoot))) {
    return "selfAndChildren";
  }
  return "self";
}
function getElementLabels(textCache, element) {
  const labels = getAriaLabelledByElements(element);
  if (labels) {
    return labels.map((label) => elementText(textCache, label));
  }
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel !== null && !!ariaLabel.trim()) {
    return [
      {
        full: ariaLabel,
        normalized: normalizeWhiteSpace(ariaLabel),
        immediate: [ariaLabel]
      }
    ];
  }
  const isNonHiddenInput = element.nodeName === "INPUT" && element.type !== "hidden";
  if (["BUTTON", "METER", "OUTPUT", "PROGRESS", "SELECT", "TEXTAREA"].includes(
    element.nodeName
  ) || isNonHiddenInput) {
    const labels2 = element.labels;
    if (labels2) {
      return [...labels2].map((label) => elementText(textCache, label));
    }
  }
  return [];
}

// src/roleSelectorEngine.ts
var kSupportedAttributes = [
  "selected",
  "checked",
  "pressed",
  "expanded",
  "level",
  "disabled",
  "name",
  "include-hidden"
];
kSupportedAttributes.sort();
function validateSupportedRole(attr, roles, role) {
  if (!roles.includes(role)) {
    throw new Error(
      `"${attr}" attribute is only supported for roles: ${roles.slice().sort().map((role2) => `"${role2}"`).join(", ")}`
    );
  }
}
function validateSupportedValues(attr, values) {
  if (attr.op !== "<truthy>" && !values.includes(attr.value)) {
    throw new Error(
      `"${attr.name}" must be one of ${values.map((v) => JSON.stringify(v)).join(", ")}`
    );
  }
}
function validateSupportedOp(attr, ops) {
  if (!ops.includes(attr.op)) {
    throw new Error(`"${attr.name}" does not support "${attr.op}" matcher`);
  }
}
function validateAttributes(attrs, role) {
  const options = { role };
  for (const attr of attrs) {
    switch (attr.name) {
      case "checked": {
        validateSupportedRole(attr.name, kAriaCheckedRoles, role);
        validateSupportedValues(attr, [true, false, "mixed"]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.checked = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "pressed": {
        validateSupportedRole(attr.name, kAriaPressedRoles, role);
        validateSupportedValues(attr, [true, false, "mixed"]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.pressed = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "selected": {
        validateSupportedRole(attr.name, kAriaSelectedRoles, role);
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.selected = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "expanded": {
        validateSupportedRole(attr.name, kAriaExpandedRoles, role);
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.expanded = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "level": {
        validateSupportedRole(attr.name, kAriaLevelRoles, role);
        if (typeof attr.value === "string") {
          attr.value = +attr.value;
        }
        if (attr.op !== "=" || typeof attr.value !== "number" || Number.isNaN(attr.value)) {
          throw new Error(`"level" attribute must be compared to a number`);
        }
        options.level = attr.value;
        break;
      }
      case "disabled": {
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.disabled = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "name": {
        if (attr.op === "<truthy>") {
          throw new Error(`"name" attribute must have a value`);
        }
        if (typeof attr.value !== "string" && !(attr.value instanceof RegExp)) {
          throw new TypeError(
            `"name" attribute must be a string or a regular expression`
          );
        }
        options.name = attr.value;
        options.nameOp = attr.op;
        options.exact = attr.caseSensitive;
        break;
      }
      case "include-hidden": {
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.includeHidden = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      default: {
        throw new Error(
          `Unknown attribute "${attr.name}", must be one of ${kSupportedAttributes.map((a) => `"${a}"`).join(", ")}.`
        );
      }
    }
  }
  return options;
}
function queryRole(scope, options, internal) {
  const result = [];
  const match = (element) => {
    if (getAriaRole(element) !== options.role) {
      return;
    }
    if (options.selected !== void 0 && getAriaSelected(element) !== options.selected) {
      return;
    }
    if (options.checked !== void 0 && getAriaChecked(element) !== options.checked) {
      return;
    }
    if (options.pressed !== void 0 && getAriaPressed(element) !== options.pressed) {
      return;
    }
    if (options.expanded !== void 0 && getAriaExpanded(element) !== options.expanded) {
      return;
    }
    if (options.level !== void 0 && getAriaLevel(element) !== options.level) {
      return;
    }
    if (options.disabled !== void 0 && getAriaDisabled(element) !== options.disabled) {
      return;
    }
    if (!options.includeHidden) {
      const isHidden = isElementHiddenForAria(element);
      if (isHidden) {
        return;
      }
    }
    if (options.name !== void 0) {
      const accessibleName = normalizeWhiteSpace(
        getElementAccessibleName(element, !!options.includeHidden)
      );
      if (typeof options.name === "string") {
        options.name = normalizeWhiteSpace(options.name);
      }
      if (internal && !options.exact && options.nameOp === "=") {
        options.nameOp = "*=";
      }
      if (!matchesAttributePart(accessibleName, {
        op: options.nameOp || "=",
        value: options.name,
        caseSensitive: !!options.exact
      })) {
        return;
      }
    }
    result.push(element);
  };
  const query = (root) => {
    const shadows = [];
    if (root.shadowRoot) {
      shadows.push(root.shadowRoot);
    }
    for (const element of root.querySelectorAll("*")) {
      match(element);
      if (element.shadowRoot) {
        shadows.push(element.shadowRoot);
      }
    }
    shadows.forEach(query);
  };
  query(scope);
  return result;
}
function createRoleEngine(internal) {
  return {
    queryAll: (scope, selector) => {
      const parsed = parseAttributeSelector(selector);
      const role = parsed.name.toLowerCase();
      if (!role) {
        throw new Error(`Role must not be empty`);
      }
      const options = validateAttributes(parsed.attributes, role);
      beginAriaCaches();
      try {
        return queryRole(scope, options, internal);
      } finally {
        endAriaCaches();
      }
    }
  };
}

// src/locatorGenerators.ts
function asLocator(lang, selector, isFrameLocator = false) {
  return asLocators(lang, selector, isFrameLocator)[0];
}
function asLocators(lang, selector, isFrameLocator = false, maxOutputSize = 20, preferredQuote) {
  try {
    return innerAsLocators(
      new generators[lang](preferredQuote),
      parseSelector(selector),
      isFrameLocator,
      maxOutputSize
    );
  } catch (e) {
    return [selector];
  }
}
function innerAsLocators(factory, parsed, isFrameLocator = false, maxOutputSize = 20) {
  const parts = [...parsed.parts];
  for (let index = 0; index < parts.length - 1; index++) {
    if (parts[index].name === "nth" && parts[index + 1].name === "internal:control" && parts[index + 1].body === "enter-frame") {
      const [nth] = parts.splice(index, 1);
      parts.splice(index + 1, 0, nth);
    }
  }
  const tokens = [];
  let nextBase = isFrameLocator ? "frame-locator" : "page";
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const base = nextBase;
    nextBase = "locator";
    if (part.name === "nth") {
      if (part.body === "0") {
        tokens.push([
          factory.generateLocator(base, "first", ""),
          factory.generateLocator(base, "nth", "0")
        ]);
      } else if (part.body === "-1") {
        tokens.push([
          factory.generateLocator(base, "last", ""),
          factory.generateLocator(base, "nth", "-1")
        ]);
      } else {
        tokens.push([factory.generateLocator(base, "nth", part.body)]);
      }
      continue;
    }
    if (part.name === "internal:text") {
      const { exact, text } = detectExact(part.body);
      tokens.push([factory.generateLocator(base, "text", text, { exact })]);
      continue;
    }
    if (part.name === "internal:has-text") {
      const { exact, text } = detectExact(part.body);
      if (!exact) {
        tokens.push([factory.generateLocator(base, "has-text", text, { exact })]);
        continue;
      }
    }
    if (part.name === "internal:has-not-text") {
      const { exact, text } = detectExact(part.body);
      if (!exact) {
        tokens.push([factory.generateLocator(base, "has-not-text", text, { exact })]);
        continue;
      }
    }
    if (part.name === "internal:has") {
      const inners = innerAsLocators(
        factory,
        part.body.parsed,
        false,
        maxOutputSize
      );
      tokens.push(inners.map((inner) => factory.generateLocator(base, "has", inner)));
      continue;
    }
    if (part.name === "internal:has-not") {
      const inners = innerAsLocators(
        factory,
        part.body.parsed,
        false,
        maxOutputSize
      );
      tokens.push(
        inners.map((inner) => factory.generateLocator(base, "hasNot", inner))
      );
      continue;
    }
    if (part.name === "internal:and") {
      const inners = innerAsLocators(
        factory,
        part.body.parsed,
        false,
        maxOutputSize
      );
      tokens.push(inners.map((inner) => factory.generateLocator(base, "and", inner)));
      continue;
    }
    if (part.name === "internal:or") {
      const inners = innerAsLocators(
        factory,
        part.body.parsed,
        false,
        maxOutputSize
      );
      tokens.push(inners.map((inner) => factory.generateLocator(base, "or", inner)));
      continue;
    }
    if (part.name === "internal:chain") {
      const inners = innerAsLocators(
        factory,
        part.body.parsed,
        false,
        maxOutputSize
      );
      tokens.push(
        inners.map((inner) => factory.generateLocator(base, "chain", inner))
      );
      continue;
    }
    if (part.name === "internal:label") {
      const { exact, text } = detectExact(part.body);
      tokens.push([factory.generateLocator(base, "label", text, { exact })]);
      continue;
    }
    if (part.name === "internal:role") {
      const attrSelector = parseAttributeSelector(part.body);
      const options = { attrs: [] };
      for (const attr of attrSelector.attributes) {
        if (attr.name === "name") {
          options.exact = attr.caseSensitive;
          options.name = attr.value;
        } else {
          if (attr.name === "level" && typeof attr.value === "string") {
            attr.value = +attr.value;
          }
          options.attrs.push({
            name: attr.name === "include-hidden" ? "includeHidden" : attr.name,
            value: attr.value
          });
        }
      }
      tokens.push([
        factory.generateLocator(base, "role", attrSelector.name, options)
      ]);
      continue;
    }
    if (part.name === "internal:testid") {
      const attrSelector = parseAttributeSelector(part.body);
      const { value } = attrSelector.attributes[0];
      tokens.push([factory.generateLocator(base, "test-id", value)]);
      continue;
    }
    if (part.name === "internal:attr") {
      const attrSelector = parseAttributeSelector(part.body);
      const { name, value, caseSensitive } = attrSelector.attributes[0];
      const text = value;
      const exact = !!caseSensitive;
      if (name === "placeholder") {
        tokens.push([factory.generateLocator(base, "placeholder", text, { exact })]);
        continue;
      }
      if (name === "alt") {
        tokens.push([factory.generateLocator(base, "alt", text, { exact })]);
        continue;
      }
      if (name === "title") {
        tokens.push([factory.generateLocator(base, "title", text, { exact })]);
        continue;
      }
    }
    let locatorType = "default";
    const nextPart = parts[index + 1];
    if (nextPart && nextPart.name === "internal:control" && nextPart.body === "enter-frame") {
      locatorType = "frame";
      nextBase = "frame-locator";
      index++;
    }
    const selectorPart = stringifySelector({ parts: [part] });
    const locatorPart = factory.generateLocator(base, locatorType, selectorPart);
    if (locatorType === "default" && nextPart && ["internal:has-text", "internal:has-not-text"].includes(nextPart.name)) {
      const { exact, text } = detectExact(nextPart.body);
      if (!exact) {
        const nextLocatorPart = factory.generateLocator(
          "locator",
          nextPart.name === "internal:has-text" ? "has-text" : "has-not-text",
          text,
          { exact }
        );
        const options = {};
        if (nextPart.name === "internal:has-text") {
          options.hasText = text;
        } else {
          options.hasNotText = text;
        }
        const combinedPart = factory.generateLocator(
          base,
          "default",
          selectorPart,
          options
        );
        tokens.push([
          factory.chainLocators([locatorPart, nextLocatorPart]),
          combinedPart
        ]);
        index++;
        continue;
      }
    }
    let locatorPartWithEngine;
    if (["xpath", "css"].includes(part.name)) {
      const selectorPart2 = stringifySelector(
        { parts: [part] },
        /* forceEngineName */
        true
      );
      locatorPartWithEngine = factory.generateLocator(
        base,
        locatorType,
        selectorPart2
      );
    }
    tokens.push([locatorPart, locatorPartWithEngine].filter(Boolean));
  }
  return combineTokens(factory, tokens, maxOutputSize);
}
function combineTokens(factory, tokens, maxOutputSize) {
  const currentTokens = tokens.map(() => "");
  const result = [];
  const visit = (index) => {
    if (index === tokens.length) {
      result.push(factory.chainLocators(currentTokens));
      return currentTokens.length < maxOutputSize;
    }
    for (const taken of tokens[index]) {
      currentTokens[index] = taken;
      if (!visit(index + 1)) {
        return false;
      }
    }
    return true;
  };
  visit(0);
  return result;
}
function detectExact(text) {
  let exact = false;
  const match = text.match(/^\/(.*)\/([igm]*)$/);
  if (match) {
    return { text: new RegExp(match[1], match[2]) };
  }
  if (text.endsWith('"')) {
    text = JSON.parse(text);
    exact = true;
  } else if (text.endsWith('"s')) {
    text = JSON.parse(text.substring(0, text.length - 1));
    exact = true;
  } else if (text.endsWith('"i')) {
    text = JSON.parse(text.substring(0, text.length - 1));
    exact = false;
  }
  return { exact, text };
}
var JavaScriptLocatorFactory = class {
  constructor(preferredQuote) {
    this.preferredQuote = preferredQuote;
  }
  generateLocator(base, kind, body, options = {}) {
    switch (kind) {
      case "default":
        if (options.hasText !== void 0) {
          return `locator(${this.quote(body)}, { hasText: ${this.toHasText(options.hasText)} })`;
        }
        if (options.hasNotText !== void 0) {
          return `locator(${this.quote(body)}, { hasNotText: ${this.toHasText(options.hasNotText)} })`;
        }
        return `locator(${this.quote(body)})`;
      case "frame":
        return `frameLocator(${this.quote(body)})`;
      case "nth":
        return `nth(${body})`;
      case "first":
        return `first()`;
      case "last":
        return `last()`;
      case "role": {
        const attrs = [];
        if (isRegExp(options.name)) {
          attrs.push(`name: ${this.regexToSourceString(options.name)}`);
        } else if (typeof options.name === "string") {
          attrs.push(`name: ${this.quote(options.name)}`);
          if (options.exact) {
            attrs.push(`exact: true`);
          }
        }
        for (const { name, value } of options.attrs) {
          attrs.push(
            `${name}: ${typeof value === "string" ? this.quote(value) : value}`
          );
        }
        const attrString = attrs.length ? `, { ${attrs.join(", ")} }` : "";
        return `getByRole(${this.quote(body)}${attrString})`;
      }
      case "has-text":
        return `filter({ hasText: ${this.toHasText(body)} })`;
      case "has-not-text":
        return `filter({ hasNotText: ${this.toHasText(body)} })`;
      case "has":
        return `filter({ has: ${body} })`;
      case "hasNot":
        return `filter({ hasNot: ${body} })`;
      case "and":
        return `and(${body})`;
      case "or":
        return `or(${body})`;
      case "chain":
        return `locator(${body})`;
      case "test-id": {
        const value = this.toTestIdValue(body);
        if (value.startsWith("'__vitest_") && value.endsWith("__'")) {
          return "page";
        }
        return `getByTestId(${value})`;
      }
      case "text":
        return this.toCallWithExact("getByText", body, !!options.exact);
      case "alt":
        return this.toCallWithExact("getByAltText", body, !!options.exact);
      case "placeholder":
        return this.toCallWithExact("getByPlaceholder", body, !!options.exact);
      case "label":
        return this.toCallWithExact("getByLabel", body, !!options.exact);
      case "title":
        return this.toCallWithExact("getByTitle", body, !!options.exact);
      default:
        throw new Error(`Unknown selector kind ${kind}`);
    }
  }
  chainLocators(locators) {
    return locators.join(".");
  }
  regexToSourceString(re) {
    return normalizeEscapedRegexQuotes(String(re));
  }
  toCallWithExact(method, body, exact) {
    if (isRegExp(body)) {
      return `${method}(${this.regexToSourceString(body)})`;
    }
    return exact ? `${method}(${this.quote(body)}, { exact: true })` : `${method}(${this.quote(body)})`;
  }
  toHasText(body) {
    if (isRegExp(body)) {
      return this.regexToSourceString(body);
    }
    return this.quote(body);
  }
  toTestIdValue(value) {
    if (isRegExp(value)) {
      return this.regexToSourceString(value);
    }
    return this.quote(value);
  }
  quote(text) {
    var _a;
    return escapeWithQuotes(text, (_a = this.preferredQuote) != null ? _a : "'");
  }
};
var generators = {
  javascript: JavaScriptLocatorFactory
};
function isRegExp(obj) {
  return obj instanceof RegExp;
}

// src/selectorGenerator.ts
var cacheAllowText = /* @__PURE__ */ new Map();
var cacheDisallowText = /* @__PURE__ */ new Map();
var kTextScoreRange = 10;
var kExactPenalty = kTextScoreRange / 2;
var kTestIdScore = 1;
var kOtherTestIdScore = 2;
var kIframeByAttributeScore = 10;
var kBeginPenalizedScore = 50;
var kPlaceholderScore = 100;
var kLabelScore = 120;
var kRoleWithNameScore = 140;
var kAltTextScore = 160;
var kTextScore = 180;
var kTitleScore = 200;
var kTextScoreRegex = 250;
var kPlaceholderScoreExact = kPlaceholderScore + kExactPenalty;
var kLabelScoreExact = kLabelScore + kExactPenalty;
var kRoleWithNameScoreExact = kRoleWithNameScore + kExactPenalty;
var kAltTextScoreExact = kAltTextScore + kExactPenalty;
var kTextScoreExact = kTextScore + kExactPenalty;
var kTitleScoreExact = kTitleScore + kExactPenalty;
var kEndPenalizedScore = 300;
var kCSSIdScore = 500;
var kRoleWithoutNameScore = 510;
var kCSSInputTypeNameScore = 520;
var kCSSTagNameScore = 530;
var kNthScore = 1e4;
var kCSSFallbackScore = 1e7;
function generateSelector(injectedScript, targetElement, options) {
  injectedScript._evaluator.begin();
  beginAriaCaches();
  try {
    const targetTokens = generateSelectorFor(injectedScript, targetElement, options) || cssFallback(injectedScript, targetElement, options);
    return joinTokens(targetTokens);
  } finally {
    cacheAllowText.clear();
    cacheDisallowText.clear();
    endAriaCaches();
    injectedScript._evaluator.end();
  }
}
function filterRegexTokens(textCandidates) {
  return textCandidates.filter((c) => c[0].selector[0] !== "/");
}
function generateSelectorFor(injectedScript, targetElement, options) {
  if (targetElement.ownerDocument.documentElement === targetElement) {
    return [{ engine: "css", selector: "html", score: 1 }];
  }
  const calculate = (element, allowText) => {
    const allowNthMatch = element === targetElement;
    let textCandidates = allowText ? buildTextCandidates(injectedScript, element, element === targetElement) : [];
    if (element !== targetElement) {
      textCandidates = filterRegexTokens(textCandidates);
    }
    const noTextCandidates = buildNoTextCandidates(
      injectedScript,
      element,
      options
    ).map((token) => [token]);
    let result = chooseFirstSelector(
      injectedScript,
      targetElement.ownerDocument,
      element,
      [...textCandidates, ...noTextCandidates],
      allowNthMatch
    );
    textCandidates = filterRegexTokens(textCandidates);
    const checkWithText = (textCandidatesToUse) => {
      const allowParentText = allowText && !textCandidatesToUse.length;
      const candidates = [...textCandidatesToUse, ...noTextCandidates].filter(
        (c) => {
          if (!result) {
            return true;
          }
          return combineScores(c) < combineScores(result);
        }
      );
      let bestPossibleInParent = candidates[0];
      if (!bestPossibleInParent) {
        return;
      }
      for (let parent = parentElementOrShadowHost(element); parent; parent = parentElementOrShadowHost(parent)) {
        const parentTokens = calculateCached(parent, allowParentText);
        if (!parentTokens) {
          continue;
        }
        if (result && combineScores([...parentTokens, ...bestPossibleInParent]) >= combineScores(result)) {
          continue;
        }
        bestPossibleInParent = chooseFirstSelector(
          injectedScript,
          parent,
          element,
          candidates,
          allowNthMatch
        );
        if (!bestPossibleInParent) {
          return;
        }
        const combined = [...parentTokens, ...bestPossibleInParent];
        if (!result || combineScores(combined) < combineScores(result)) {
          result = combined;
        }
      }
    };
    checkWithText(textCandidates);
    if (element === targetElement && textCandidates.length) {
      checkWithText([]);
    }
    return result;
  };
  const calculateCached = (element, allowText) => {
    const cache = allowText ? cacheAllowText : cacheDisallowText;
    let value = cache.get(element);
    if (value === void 0) {
      value = calculate(element, allowText);
      cache.set(element, value);
    }
    return value;
  };
  return calculate(targetElement, !options.noText);
}
function buildNoTextCandidates(injectedScript, element, options) {
  const candidates = [];
  {
    for (const attr of ["data-testid", "data-test-id", "data-test"]) {
      if (attr !== options.testIdAttributeName && element.getAttribute(attr)) {
        candidates.push({
          engine: "css",
          selector: `[${attr}=${quoteCSSAttributeValue(element.getAttribute(attr))}]`,
          score: kOtherTestIdScore
        });
      }
    }
    if (!options.noCSSId) {
      const idAttr = element.getAttribute("id");
      if (idAttr && !isGuidLike(idAttr)) {
        candidates.push({
          engine: "css",
          selector: makeSelectorForId(idAttr),
          score: kCSSIdScore
        });
      }
    }
    candidates.push({
      engine: "css",
      selector: cssEscape(element.nodeName.toLowerCase()),
      score: kCSSTagNameScore
    });
  }
  if (element.nodeName === "IFRAME") {
    for (const attribute of ["name", "title"]) {
      if (element.getAttribute(attribute)) {
        candidates.push({
          engine: "css",
          selector: `${cssEscape(element.nodeName.toLowerCase())}[${attribute}=${quoteCSSAttributeValue(element.getAttribute(attribute))}]`,
          score: kIframeByAttributeScore
        });
      }
    }
    if (element.getAttribute(options.testIdAttributeName)) {
      candidates.push({
        engine: "css",
        selector: `[${options.testIdAttributeName}=${quoteCSSAttributeValue(element.getAttribute(options.testIdAttributeName))}]`,
        score: kTestIdScore
      });
    }
    penalizeScoreForLength([candidates]);
    return candidates;
  }
  if (element.getAttribute(options.testIdAttributeName)) {
    candidates.push({
      engine: "internal:testid",
      selector: `[${options.testIdAttributeName}=${escapeForAttributeSelector(element.getAttribute(options.testIdAttributeName), true)}]`,
      score: kTestIdScore
    });
  }
  if (element.nodeName === "INPUT" || element.nodeName === "TEXTAREA") {
    const input = element;
    if (input.placeholder) {
      candidates.push({
        engine: "internal:attr",
        selector: `[placeholder=${escapeForAttributeSelector(input.placeholder, true)}]`,
        score: kPlaceholderScoreExact
      });
      for (const alternative of suitableTextAlternatives(input.placeholder)) {
        candidates.push({
          engine: "internal:attr",
          selector: `[placeholder=${escapeForAttributeSelector(alternative.text, false)}]`,
          score: kPlaceholderScore - alternative.scoreBouns
        });
      }
    }
  }
  const labels = getElementLabels(injectedScript._evaluator._cacheText, element);
  for (const label of labels) {
    const labelText = label.normalized;
    candidates.push({
      engine: "internal:label",
      selector: escapeForTextSelector(labelText, true),
      score: kLabelScoreExact
    });
    for (const alternative of suitableTextAlternatives(labelText)) {
      candidates.push({
        engine: "internal:label",
        selector: escapeForTextSelector(alternative.text, false),
        score: kLabelScore - alternative.scoreBouns
      });
    }
  }
  const ariaRole = getAriaRole(element);
  if (ariaRole && !["none", "presentation"].includes(ariaRole)) {
    candidates.push({
      engine: "internal:role",
      selector: ariaRole,
      score: kRoleWithoutNameScore
    });
  }
  if (element.getAttribute("name") && [
    "BUTTON",
    "FORM",
    "FIELDSET",
    "FRAME",
    "IFRAME",
    "INPUT",
    "KEYGEN",
    "OBJECT",
    "OUTPUT",
    "SELECT",
    "TEXTAREA",
    "MAP",
    "META",
    "PARAM"
  ].includes(element.nodeName)) {
    candidates.push({
      engine: "css",
      selector: `${cssEscape(element.nodeName.toLowerCase())}[name=${quoteCSSAttributeValue(element.getAttribute("name"))}]`,
      score: kCSSInputTypeNameScore
    });
  }
  if (["INPUT", "TEXTAREA"].includes(element.nodeName) && element.getAttribute("type") !== "hidden") {
    if (element.getAttribute("type")) {
      candidates.push({
        engine: "css",
        selector: `${cssEscape(element.nodeName.toLowerCase())}[type=${quoteCSSAttributeValue(element.getAttribute("type"))}]`,
        score: kCSSInputTypeNameScore
      });
    }
  }
  if (["INPUT", "TEXTAREA", "SELECT"].includes(element.nodeName) && element.getAttribute("type") !== "hidden") {
    candidates.push({
      engine: "css",
      selector: cssEscape(element.nodeName.toLowerCase()),
      score: kCSSInputTypeNameScore + 1
    });
  }
  penalizeScoreForLength([candidates]);
  return candidates;
}
function buildTextCandidates(injectedScript, element, isTargetNode) {
  if (element.nodeName === "SELECT") {
    return [];
  }
  const candidates = [];
  const title = element.getAttribute("title");
  if (title) {
    candidates.push([
      {
        engine: "internal:attr",
        selector: `[title=${escapeForAttributeSelector(title, true)}]`,
        score: kTitleScoreExact
      }
    ]);
    for (const alternative of suitableTextAlternatives(title)) {
      candidates.push([
        {
          engine: "internal:attr",
          selector: `[title=${escapeForAttributeSelector(alternative.text, false)}]`,
          score: kTitleScore - alternative.scoreBouns
        }
      ]);
    }
  }
  const alt = element.getAttribute("alt");
  if (alt && ["APPLET", "AREA", "IMG", "INPUT"].includes(element.nodeName)) {
    candidates.push([
      {
        engine: "internal:attr",
        selector: `[alt=${escapeForAttributeSelector(alt, true)}]`,
        score: kAltTextScoreExact
      }
    ]);
    for (const alternative of suitableTextAlternatives(alt)) {
      candidates.push([
        {
          engine: "internal:attr",
          selector: `[alt=${escapeForAttributeSelector(alternative.text, false)}]`,
          score: kAltTextScore - alternative.scoreBouns
        }
      ]);
    }
  }
  const text = elementText(injectedScript._evaluator._cacheText, element).normalized;
  if (text) {
    const alternatives = suitableTextAlternatives(text);
    if (isTargetNode) {
      if (text.length <= 80) {
        candidates.push([
          {
            engine: "internal:text",
            selector: escapeForTextSelector(text, true),
            score: kTextScoreExact
          }
        ]);
      }
      for (const alternative of alternatives) {
        candidates.push([
          {
            engine: "internal:text",
            selector: escapeForTextSelector(alternative.text, false),
            score: kTextScore - alternative.scoreBouns
          }
        ]);
      }
    }
    const cssToken = {
      engine: "css",
      selector: cssEscape(element.nodeName.toLowerCase()),
      score: kCSSTagNameScore
    };
    for (const alternative of alternatives) {
      candidates.push([
        cssToken,
        {
          engine: "internal:has-text",
          selector: escapeForTextSelector(alternative.text, false),
          score: kTextScore - alternative.scoreBouns
        }
      ]);
    }
    if (text.length <= 80) {
      const re = new RegExp(`^${escapeRegExp(text)}$`);
      candidates.push([
        cssToken,
        {
          engine: "internal:has-text",
          selector: escapeForTextSelector(re, false),
          score: kTextScoreRegex
        }
      ]);
    }
  }
  const ariaRole = getAriaRole(element);
  if (ariaRole && !["none", "presentation"].includes(ariaRole)) {
    const ariaName = getElementAccessibleName(element, false);
    if (ariaName) {
      candidates.push([
        {
          engine: "internal:role",
          selector: `${ariaRole}[name=${escapeForAttributeSelector(ariaName, true)}]`,
          score: kRoleWithNameScoreExact
        }
      ]);
      for (const alternative of suitableTextAlternatives(ariaName)) {
        candidates.push([
          {
            engine: "internal:role",
            selector: `${ariaRole}[name=${escapeForAttributeSelector(alternative.text, false)}]`,
            score: kRoleWithNameScore - alternative.scoreBouns
          }
        ]);
      }
    }
  }
  penalizeScoreForLength(candidates);
  return candidates;
}
function makeSelectorForId(id) {
  return /^[a-z][\w\-]+$/i.test(id) ? `#${id}` : `[id="${cssEscape(id)}"]`;
}
function cssFallback(injectedScript, targetElement, options) {
  const root = targetElement.ownerDocument;
  const tokens = [];
  function uniqueCSSSelector(prefix) {
    const path = tokens.slice();
    if (prefix) {
      path.unshift(prefix);
    }
    const selector = path.join(" > ");
    const parsedSelector = injectedScript.parseSelector(selector);
    const node = injectedScript.querySelector(parsedSelector, root, false);
    return node === targetElement ? selector : void 0;
  }
  function makeStrict(selector) {
    const token = { engine: "css", selector, score: kCSSFallbackScore };
    const parsedSelector = injectedScript.parseSelector(selector);
    const elements = injectedScript.querySelectorAll(parsedSelector, root);
    if (elements.length === 1) {
      return [token];
    }
    const nth = {
      engine: "nth",
      selector: String(elements.indexOf(targetElement)),
      score: kNthScore
    };
    return [token, nth];
  }
  for (let element = targetElement; element && element !== root; element = parentElementOrShadowHost(element)) {
    const nodeName = element.nodeName.toLowerCase();
    let bestTokenForLevel = "";
    if (element.id && !options.noCSSId) {
      const token = makeSelectorForId(element.id);
      const selector = uniqueCSSSelector(token);
      if (selector) {
        return makeStrict(selector);
      }
      bestTokenForLevel = token;
    }
    const parent = element.parentNode;
    const classes = [...element.classList];
    for (let i = 0; i < classes.length; ++i) {
      const token = `.${cssEscape(classes.slice(0, i + 1).join("."))}`;
      const selector = uniqueCSSSelector(token);
      if (selector) {
        return makeStrict(selector);
      }
      if (!bestTokenForLevel && parent) {
        const sameClassSiblings = parent.querySelectorAll(token);
        if (sameClassSiblings.length === 1) {
          bestTokenForLevel = token;
        }
      }
    }
    if (parent) {
      const siblings = [...parent.children];
      const sameTagSiblings = siblings.filter(
        (sibling) => sibling.nodeName.toLowerCase() === nodeName
      );
      const token = sameTagSiblings.indexOf(element) === 0 ? cssEscape(nodeName) : `${cssEscape(nodeName)}:nth-child(${1 + siblings.indexOf(element)})`;
      const selector = uniqueCSSSelector(token);
      if (selector) {
        return makeStrict(selector);
      }
      if (!bestTokenForLevel) {
        bestTokenForLevel = token;
      }
    } else if (!bestTokenForLevel) {
      bestTokenForLevel = cssEscape(nodeName);
    }
    tokens.unshift(bestTokenForLevel);
  }
  return makeStrict(uniqueCSSSelector());
}
function penalizeScoreForLength(groups) {
  for (const group of groups) {
    for (const token of group) {
      if (token.score > kBeginPenalizedScore && token.score < kEndPenalizedScore) {
        token.score += Math.min(kTextScoreRange, token.selector.length / 10 | 0);
      }
    }
  }
}
function joinTokens(tokens) {
  const parts = [];
  let lastEngine = "";
  for (const { engine, selector } of tokens) {
    if (parts.length && (lastEngine !== "css" || engine !== "css" || selector.startsWith(":nth-match("))) {
      parts.push(">>");
    }
    lastEngine = engine;
    if (engine === "css") {
      parts.push(selector);
    } else {
      parts.push(`${engine}=${selector}`);
    }
  }
  return parts.join(" ");
}
function combineScores(tokens) {
  let score = 0;
  for (let i = 0; i < tokens.length; i++) {
    score += tokens[i].score * (tokens.length - i);
  }
  return score;
}
function chooseFirstSelector(injectedScript, scope, targetElement, selectors, allowNthMatch) {
  const joined = selectors.map((tokens) => ({
    tokens,
    score: combineScores(tokens)
  }));
  joined.sort((a, b) => a.score - b.score);
  let bestWithIndex = null;
  for (const { tokens } of joined) {
    const parsedSelector = injectedScript.parseSelector(joinTokens(tokens));
    const result = injectedScript.querySelectorAll(parsedSelector, scope);
    if (result[0] === targetElement && result.length === 1) {
      return tokens;
    }
    const index = result.indexOf(targetElement);
    if (!allowNthMatch || bestWithIndex || index === -1 || result.length > 5) {
      continue;
    }
    const nth = {
      engine: "nth",
      selector: String(index),
      score: kNthScore
    };
    bestWithIndex = [...tokens, nth];
  }
  return bestWithIndex;
}
function isGuidLike(id) {
  let lastCharacterType;
  let transitionCount = 0;
  for (let i = 0; i < id.length; ++i) {
    const c = id[i];
    let characterType;
    if (c === "-" || c === "_") {
      continue;
    }
    if (c >= "a" && c <= "z") {
      characterType = "lower";
    } else if (c >= "A" && c <= "Z") {
      characterType = "upper";
    } else if (c >= "0" && c <= "9") {
      characterType = "digit";
    } else {
      characterType = "other";
    }
    if (characterType === "lower" && lastCharacterType === "upper") {
      lastCharacterType = characterType;
      continue;
    }
    if (lastCharacterType && lastCharacterType !== characterType) {
      ++transitionCount;
    }
    lastCharacterType = characterType;
  }
  return transitionCount >= id.length / 4;
}
function trimWordBoundary(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  text = text.substring(0, maxLength);
  const match = text.match(/^(.*)\b(.+)$/);
  if (!match) {
    return "";
  }
  return match[1].trimEnd();
}
function suitableTextAlternatives(text) {
  let result = [];
  {
    const match = text.match(/^([\d.,]+)[^.,\w]/);
    const leadingNumberLength = match ? match[1].length : 0;
    if (leadingNumberLength) {
      const alt = trimWordBoundary(
        text.substring(leadingNumberLength).trimStart(),
        80
      );
      result.push({ text: alt, scoreBouns: alt.length <= 30 ? 2 : 1 });
    }
  }
  {
    const match = text.match(/[^.,\w]([\d.,]+)$/);
    const trailingNumberLength = match ? match[1].length : 0;
    if (trailingNumberLength) {
      const alt = trimWordBoundary(
        text.substring(0, text.length - trailingNumberLength).trimEnd(),
        80
      );
      result.push({ text: alt, scoreBouns: alt.length <= 30 ? 2 : 1 });
    }
  }
  if (text.length <= 30) {
    result.push({ text, scoreBouns: 0 });
  } else {
    result.push({ text: trimWordBoundary(text, 80), scoreBouns: 0 });
    result.push({ text: trimWordBoundary(text, 30), scoreBouns: 1 });
  }
  result = result.filter((r) => r.text);
  if (!result.length) {
    result.push({ text: text.substring(0, 80), scoreBouns: 0 });
  }
  return result;
}

// src/layoutSelectorUtils.ts
function boxRightOf(box1, box2, maxDistance) {
  const distance = box1.left - box2.right;
  if (distance < 0 || maxDistance !== void 0 && distance > maxDistance) {
    return;
  }
  return distance + Math.max(box2.bottom - box1.bottom, 0) + Math.max(box1.top - box2.top, 0);
}
function boxLeftOf(box1, box2, maxDistance) {
  const distance = box2.left - box1.right;
  if (distance < 0 || maxDistance !== void 0 && distance > maxDistance) {
    return;
  }
  return distance + Math.max(box2.bottom - box1.bottom, 0) + Math.max(box1.top - box2.top, 0);
}
function boxAbove(box1, box2, maxDistance) {
  const distance = box2.top - box1.bottom;
  if (distance < 0 || maxDistance !== void 0 && distance > maxDistance) {
    return;
  }
  return distance + Math.max(box1.left - box2.left, 0) + Math.max(box2.right - box1.right, 0);
}
function boxBelow(box1, box2, maxDistance) {
  const distance = box1.top - box2.bottom;
  if (distance < 0 || maxDistance !== void 0 && distance > maxDistance) {
    return;
  }
  return distance + Math.max(box1.left - box2.left, 0) + Math.max(box2.right - box1.right, 0);
}
function boxNear(box1, box2, maxDistance) {
  const kThreshold = maxDistance === void 0 ? 50 : maxDistance;
  let score = 0;
  if (box1.left - box2.right >= 0) {
    score += box1.left - box2.right;
  }
  if (box2.left - box1.right >= 0) {
    score += box2.left - box1.right;
  }
  if (box2.top - box1.bottom >= 0) {
    score += box2.top - box1.bottom;
  }
  if (box1.top - box2.bottom >= 0) {
    score += box1.top - box2.bottom;
  }
  return score > kThreshold ? void 0 : score;
}
var kLayoutSelectorNames = [
  "left-of",
  "right-of",
  "above",
  "below",
  "near"
];
function layoutSelectorScore(name, element, inner, maxDistance) {
  const box = element.getBoundingClientRect();
  const scorer = {
    "left-of": boxLeftOf,
    "right-of": boxRightOf,
    above: boxAbove,
    below: boxBelow,
    near: boxNear
  }[name];
  let bestScore;
  for (const e of inner) {
    if (e === element) {
      continue;
    }
    const score = scorer(box, e.getBoundingClientRect(), maxDistance);
    if (score === void 0) {
      continue;
    }
    if (bestScore === void 0 || score < bestScore) {
      bestScore = score;
    }
  }
  return bestScore;
}

// src/selectorEvaluator.ts
var SelectorEvaluatorImpl = class {
  constructor(extraEngines) {
    __publicField(this, "_engines", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheQueryCSS", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheMatches", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheQuery", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheMatchesSimple", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheMatchesParents", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheCallMatches", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheCallQuery", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheQuerySimple", /* @__PURE__ */ new Map());
    __publicField(this, "_cacheText", /* @__PURE__ */ new Map());
    __publicField(this, "_scoreMap");
    __publicField(this, "_retainCacheCounter", 0);
    for (const [name, engine] of extraEngines) {
      this._engines.set(name, engine);
    }
    this._engines.set("not", notEngine);
    this._engines.set("is", isEngine);
    this._engines.set("where", isEngine);
    this._engines.set("has", hasEngine);
    this._engines.set("scope", scopeEngine);
    this._engines.set("light", lightEngine);
    this._engines.set("visible", visibleEngine);
    this._engines.set("text", textEngine);
    this._engines.set("text-is", textIsEngine);
    this._engines.set("text-matches", textMatchesEngine);
    this._engines.set("has-text", hasTextEngine);
    this._engines.set("right-of", createLayoutEngine("right-of"));
    this._engines.set("left-of", createLayoutEngine("left-of"));
    this._engines.set("above", createLayoutEngine("above"));
    this._engines.set("below", createLayoutEngine("below"));
    this._engines.set("near", createLayoutEngine("near"));
    this._engines.set("nth-match", nthMatchEngine);
    const allNames = [...this._engines.keys()];
    allNames.sort();
    const parserNames = [...customCSSNames];
    parserNames.sort();
    if (allNames.join("|") !== parserNames.join("|")) {
      throw new Error(
        `Please keep customCSSNames in sync with evaluator engines: ${allNames.join("|")} vs ${parserNames.join("|")}`
      );
    }
  }
  begin() {
    ++this._retainCacheCounter;
  }
  end() {
    --this._retainCacheCounter;
    if (!this._retainCacheCounter) {
      this._cacheQueryCSS.clear();
      this._cacheMatches.clear();
      this._cacheQuery.clear();
      this._cacheMatchesSimple.clear();
      this._cacheMatchesParents.clear();
      this._cacheCallMatches.clear();
      this._cacheCallQuery.clear();
      this._cacheQuerySimple.clear();
      this._cacheText.clear();
    }
  }
  _cached(cache, main, rest, cb) {
    if (!cache.has(main)) {
      cache.set(main, []);
    }
    const entries = cache.get(main);
    const entry = entries.find(
      (e) => rest.every((value, index) => e.rest[index] === value)
    );
    if (entry) {
      return entry.result;
    }
    const result = cb();
    entries.push({ rest, result });
    return result;
  }
  _checkSelector(s) {
    const wellFormed = typeof s === "object" && s && (Array.isArray(s) || "simples" in s && s.simples.length);
    if (!wellFormed) {
      throw new Error(`Malformed selector "${s}"`);
    }
    return s;
  }
  matches(element, s, context) {
    const selector = this._checkSelector(s);
    this.begin();
    try {
      return this._cached(
        this._cacheMatches,
        element,
        [selector, context.scope, context.pierceShadow, context.originalScope],
        () => {
          if (Array.isArray(selector)) {
            return this._matchesEngine(isEngine, element, selector, context);
          }
          if (this._hasScopeClause(selector)) {
            context = this._expandContextForScopeMatching(context);
          }
          if (!this._matchesSimple(
            element,
            selector.simples[selector.simples.length - 1].selector,
            context
          )) {
            return false;
          }
          return this._matchesParents(
            element,
            selector,
            selector.simples.length - 2,
            context
          );
        }
      );
    } finally {
      this.end();
    }
  }
  query(context, s) {
    const selector = this._checkSelector(s);
    this.begin();
    try {
      return this._cached(
        this._cacheQuery,
        selector,
        [context.scope, context.pierceShadow, context.originalScope],
        () => {
          if (Array.isArray(selector)) {
            return this._queryEngine(isEngine, context, selector);
          }
          if (this._hasScopeClause(selector)) {
            context = this._expandContextForScopeMatching(context);
          }
          const previousScoreMap = this._scoreMap;
          this._scoreMap = /* @__PURE__ */ new Map();
          let elements = this._querySimple(
            context,
            selector.simples[selector.simples.length - 1].selector
          );
          elements = elements.filter(
            (element) => this._matchesParents(
              element,
              selector,
              selector.simples.length - 2,
              context
            )
          );
          if (this._scoreMap.size) {
            elements.sort((a, b) => {
              const aScore = this._scoreMap.get(a);
              const bScore = this._scoreMap.get(b);
              if (aScore === bScore) {
                return 0;
              }
              if (aScore === void 0) {
                return 1;
              }
              if (bScore === void 0) {
                return -1;
              }
              return aScore - bScore;
            });
          }
          this._scoreMap = previousScoreMap;
          return elements;
        }
      );
    } finally {
      this.end();
    }
  }
  _markScore(element, score) {
    if (this._scoreMap) {
      this._scoreMap.set(element, score);
    }
  }
  _hasScopeClause(selector) {
    return selector.simples.some(
      (simple) => simple.selector.functions.some((f) => f.name === "scope")
    );
  }
  _expandContextForScopeMatching(context) {
    if (context.scope.nodeType !== 1) {
      return context;
    }
    const scope = parentElementOrShadowHost(context.scope);
    if (!scope) {
      return context;
    }
    return {
      ...context,
      scope,
      originalScope: context.originalScope || context.scope
    };
  }
  _matchesSimple(element, simple, context) {
    return this._cached(
      this._cacheMatchesSimple,
      element,
      [simple, context.scope, context.pierceShadow, context.originalScope],
      () => {
        if (element === context.scope) {
          return false;
        }
        if (simple.css && !this._matchesCSS(element, simple.css)) {
          return false;
        }
        for (const func of simple.functions) {
          if (!this._matchesEngine(
            this._getEngine(func.name),
            element,
            func.args,
            context
          )) {
            return false;
          }
        }
        return true;
      }
    );
  }
  _querySimple(context, simple) {
    if (!simple.functions.length) {
      return this._queryCSS(context, simple.css || "*");
    }
    return this._cached(
      this._cacheQuerySimple,
      simple,
      [context.scope, context.pierceShadow, context.originalScope],
      () => {
        let css = simple.css;
        const funcs = simple.functions;
        if (css === "*" && funcs.length) {
          css = void 0;
        }
        let elements;
        let firstIndex = -1;
        if (css !== void 0) {
          elements = this._queryCSS(context, css);
        } else {
          firstIndex = funcs.findIndex(
            (func) => this._getEngine(func.name).query !== void 0
          );
          if (firstIndex === -1) {
            firstIndex = 0;
          }
          elements = this._queryEngine(
            this._getEngine(funcs[firstIndex].name),
            context,
            funcs[firstIndex].args
          );
        }
        for (let i = 0; i < funcs.length; i++) {
          if (i === firstIndex) {
            continue;
          }
          const engine = this._getEngine(funcs[i].name);
          if (engine.matches !== void 0) {
            elements = elements.filter(
              (e) => this._matchesEngine(engine, e, funcs[i].args, context)
            );
          }
        }
        for (let i = 0; i < funcs.length; i++) {
          if (i === firstIndex) {
            continue;
          }
          const engine = this._getEngine(funcs[i].name);
          if (engine.matches === void 0) {
            elements = elements.filter(
              (e) => this._matchesEngine(engine, e, funcs[i].args, context)
            );
          }
        }
        return elements;
      }
    );
  }
  _matchesParents(element, complex, index, context) {
    if (index < 0) {
      return true;
    }
    return this._cached(
      this._cacheMatchesParents,
      element,
      [complex, index, context.scope, context.pierceShadow, context.originalScope],
      () => {
        const { selector: simple, combinator } = complex.simples[index];
        if (combinator === ">") {
          const parent = parentElementOrShadowHostInContext(element, context);
          if (!parent || !this._matchesSimple(parent, simple, context)) {
            return false;
          }
          return this._matchesParents(parent, complex, index - 1, context);
        }
        if (combinator === "+") {
          const previousSibling = previousSiblingInContext(element, context);
          if (!previousSibling || !this._matchesSimple(previousSibling, simple, context)) {
            return false;
          }
          return this._matchesParents(previousSibling, complex, index - 1, context);
        }
        if (combinator === "") {
          let parent = parentElementOrShadowHostInContext(element, context);
          while (parent) {
            if (this._matchesSimple(parent, simple, context)) {
              if (this._matchesParents(parent, complex, index - 1, context)) {
                return true;
              }
              if (complex.simples[index - 1].combinator === "") {
                break;
              }
            }
            parent = parentElementOrShadowHostInContext(parent, context);
          }
          return false;
        }
        if (combinator === "~") {
          let previousSibling = previousSiblingInContext(element, context);
          while (previousSibling) {
            if (this._matchesSimple(previousSibling, simple, context)) {
              if (this._matchesParents(previousSibling, complex, index - 1, context)) {
                return true;
              }
              if (complex.simples[index - 1].combinator === "~") {
                break;
              }
            }
            previousSibling = previousSiblingInContext(previousSibling, context);
          }
          return false;
        }
        if (combinator === ">=") {
          let parent = element;
          while (parent) {
            if (this._matchesSimple(parent, simple, context)) {
              if (this._matchesParents(parent, complex, index - 1, context)) {
                return true;
              }
              if (complex.simples[index - 1].combinator === "") {
                break;
              }
            }
            parent = parentElementOrShadowHostInContext(parent, context);
          }
          return false;
        }
        throw new Error(`Unsupported combinator "${combinator}"`);
      }
    );
  }
  _matchesEngine(engine, element, args, context) {
    if (engine.matches) {
      return this._callMatches(engine, element, args, context);
    }
    if (engine.query) {
      return this._callQuery(engine, args, context).includes(element);
    }
    throw new Error(`Selector engine should implement "matches" or "query"`);
  }
  _queryEngine(engine, context, args) {
    if (engine.query) {
      return this._callQuery(engine, args, context);
    }
    if (engine.matches) {
      return this._queryCSS(context, "*").filter(
        (element) => this._callMatches(engine, element, args, context)
      );
    }
    throw new Error(`Selector engine should implement "matches" or "query"`);
  }
  _callMatches(engine, element, args, context) {
    return this._cached(
      this._cacheCallMatches,
      element,
      [engine, context.scope, context.pierceShadow, context.originalScope, ...args],
      () => {
        return engine.matches(element, args, context, this);
      }
    );
  }
  _callQuery(engine, args, context) {
    return this._cached(
      this._cacheCallQuery,
      engine,
      [context.scope, context.pierceShadow, context.originalScope, ...args],
      () => {
        return engine.query(context, args, this);
      }
    );
  }
  _matchesCSS(element, css) {
    return element.matches(css);
  }
  _queryCSS(context, css) {
    return this._cached(
      this._cacheQueryCSS,
      css,
      [context.scope, context.pierceShadow, context.originalScope],
      () => {
        let result = [];
        function query(root) {
          result = result.concat([...root.querySelectorAll(css)]);
          if (!context.pierceShadow) {
            return;
          }
          if (root.shadowRoot) {
            query(root.shadowRoot);
          }
          for (const element of root.querySelectorAll("*")) {
            if (element.shadowRoot) {
              query(element.shadowRoot);
            }
          }
        }
        query(context.scope);
        return result;
      }
    );
  }
  _getEngine(name) {
    const engine = this._engines.get(name);
    if (!engine) {
      throw new Error(`Unknown selector engine "${name}"`);
    }
    return engine;
  }
};
var isEngine = {
  matches(element, args, context, evaluator) {
    if (args.length === 0) {
      throw new Error(`"is" engine expects non-empty selector list`);
    }
    return args.some((selector) => evaluator.matches(element, selector, context));
  },
  query(context, args, evaluator) {
    if (args.length === 0) {
      throw new Error(`"is" engine expects non-empty selector list`);
    }
    let elements = [];
    for (const arg of args) {
      elements = elements.concat(evaluator.query(context, arg));
    }
    return args.length === 1 ? elements : sortInDOMOrder(elements);
  }
};
var hasEngine = {
  matches(element, args, context, evaluator) {
    if (args.length === 0) {
      throw new Error(`"has" engine expects non-empty selector list`);
    }
    return evaluator.query({ ...context, scope: element }, args).length > 0;
  }
  // TODO: we can implement efficient "query" by matching "args" and returning
  // all parents/descendants, just have to be careful with the ":scope" matching.
};
var scopeEngine = {
  matches(element, args, context, _evaluator) {
    if (args.length !== 0) {
      throw new Error(`"scope" engine expects no arguments`);
    }
    const actualScope = context.originalScope || context.scope;
    if (actualScope.nodeType === 9) {
      return element === actualScope.documentElement;
    }
    return element === actualScope;
  },
  query(context, args, _evaluator) {
    if (args.length !== 0) {
      throw new Error(`"scope" engine expects no arguments`);
    }
    const actualScope = context.originalScope || context.scope;
    if (actualScope.nodeType === 9) {
      const root = actualScope.documentElement;
      return root ? [root] : [];
    }
    if (actualScope.nodeType === 1) {
      return [actualScope];
    }
    return [];
  }
};
var notEngine = {
  matches(element, args, context, evaluator) {
    if (args.length === 0) {
      throw new Error(`"not" engine expects non-empty selector list`);
    }
    return !evaluator.matches(element, args, context);
  }
};
var lightEngine = {
  query(context, args, evaluator) {
    return evaluator.query({ ...context, pierceShadow: false }, args);
  },
  matches(element, args, context, evaluator) {
    return evaluator.matches(element, args, { ...context, pierceShadow: false });
  }
};
var visibleEngine = {
  matches(element, args, _context, _evaluator) {
    if (args.length) {
      throw new Error(`"visible" engine expects no arguments`);
    }
    return isElementVisible(element);
  }
};
var textEngine = {
  matches(element, args, context, evaluator) {
    if (args.length !== 1 || typeof args[0] !== "string") {
      throw new Error(`"text" engine expects a single string`);
    }
    const text = normalizeWhiteSpace(args[0]).toLowerCase();
    const matcher = (elementText2) => elementText2.normalized.toLowerCase().includes(text);
    return elementMatchesText(
      evaluator._cacheText,
      element,
      matcher
    ) === "self";
  }
};
var textIsEngine = {
  matches(element, args, context, evaluator) {
    if (args.length !== 1 || typeof args[0] !== "string") {
      throw new Error(`"text-is" engine expects a single string`);
    }
    const text = normalizeWhiteSpace(args[0]);
    const matcher = (elementText2) => {
      if (!text && !elementText2.immediate.length) {
        return true;
      }
      return elementText2.immediate.some((s) => normalizeWhiteSpace(s) === text);
    };
    return elementMatchesText(
      evaluator._cacheText,
      element,
      matcher
    ) !== "none";
  }
};
var textMatchesEngine = {
  matches(element, args, context, evaluator) {
    if (args.length === 0 || typeof args[0] !== "string" || args.length > 2 || args.length === 2 && typeof args[1] !== "string") {
      throw new Error(
        `"text-matches" engine expects a regexp body and optional regexp flags`
      );
    }
    const re = new RegExp(args[0], args.length === 2 ? args[1] : void 0);
    const matcher = (elementText2) => re.test(elementText2.full);
    return elementMatchesText(
      evaluator._cacheText,
      element,
      matcher
    ) === "self";
  }
};
var hasTextEngine = {
  matches(element, args, context, evaluator) {
    if (args.length !== 1 || typeof args[0] !== "string") {
      throw new Error(`"has-text" engine expects a single string`);
    }
    if (shouldSkipForTextMatching(element)) {
      return false;
    }
    const text = normalizeWhiteSpace(args[0]).toLowerCase();
    const matcher = (elementText2) => elementText2.normalized.toLowerCase().includes(text);
    return matcher(
      elementText(evaluator._cacheText, element)
    );
  }
};
function createLayoutEngine(name) {
  return {
    matches(element, args, context, evaluator) {
      const maxDistance = args.length && typeof args[args.length - 1] === "number" ? args[args.length - 1] : void 0;
      const queryArgs = maxDistance === void 0 ? args : args.slice(0, args.length - 1);
      if (args.length < 1 + (maxDistance === void 0 ? 0 : 1)) {
        throw new Error(
          `"${name}" engine expects a selector list and optional maximum distance in pixels`
        );
      }
      const inner = evaluator.query(context, queryArgs);
      const score = layoutSelectorScore(name, element, inner, maxDistance);
      if (score === void 0) {
        return false;
      }
      evaluator._markScore(element, score);
      return true;
    }
  };
}
var nthMatchEngine = {
  query(context, args, evaluator) {
    let index = args[args.length - 1];
    if (args.length < 2) {
      throw new Error(
        `"nth-match" engine expects non-empty selector list and an index argument`
      );
    }
    if (typeof index !== "number" || index < 1) {
      throw new Error(
        `"nth-match" engine expects a one-based index as the last argument`
      );
    }
    const elements = isEngine.query(
      context,
      args.slice(0, args.length - 1),
      evaluator
    );
    index--;
    return index < elements.length ? [elements[index]] : [];
  }
};
function parentElementOrShadowHostInContext(element, context) {
  if (element === context.scope) {
    return;
  }
  if (!context.pierceShadow) {
    return element.parentElement || void 0;
  }
  return parentElementOrShadowHost(element);
}
function previousSiblingInContext(element, context) {
  if (element === context.scope) {
    return;
  }
  return element.previousElementSibling || void 0;
}
function sortInDOMOrder(elements) {
  const elementToEntry = /* @__PURE__ */ new Map();
  const roots = [];
  const result = [];
  function append(element) {
    let entry = elementToEntry.get(element);
    if (entry) {
      return entry;
    }
    const parent = parentElementOrShadowHost(element);
    if (parent) {
      const parentEntry = append(parent);
      parentEntry.children.push(element);
    } else {
      roots.push(element);
    }
    entry = { children: [], taken: false };
    elementToEntry.set(element, entry);
    return entry;
  }
  for (const e of elements) {
    append(e).taken = true;
  }
  function visit(element) {
    const entry = elementToEntry.get(element);
    if (entry.taken) {
      result.push(element);
    }
    if (entry.children.length > 1) {
      const set = new Set(entry.children);
      entry.children = [];
      let child = element.firstElementChild;
      while (child && entry.children.length < set.size) {
        if (set.has(child)) {
          entry.children.push(child);
        }
        child = child.nextElementSibling;
      }
      child = element.shadowRoot ? element.shadowRoot.firstElementChild : null;
      while (child && entry.children.length < set.size) {
        if (set.has(child)) {
          entry.children.push(child);
        }
        child = child.nextElementSibling;
      }
    }
    entry.children.forEach(visit);
  }
  roots.forEach(visit);
  return result;
}

// src/locatorUtils.ts
function getByAttributeTextSelector(attrName, text, options) {
  return `internal:attr=[${attrName}=${escapeForAttributeSelector(text, (options == null ? void 0 : options.exact) || false)}]`;
}
function getByTestIdSelector(testIdAttributeName, testId) {
  return `internal:testid=[${testIdAttributeName}=${escapeForAttributeSelector(testId, true)}]`;
}
function getByLabelSelector(text, options) {
  return `internal:label=${escapeForTextSelector(text, !!(options == null ? void 0 : options.exact))}`;
}
function getByAltTextSelector(text, options) {
  return getByAttributeTextSelector("alt", text, options);
}
function getByTitleSelector(text, options) {
  return getByAttributeTextSelector("title", text, options);
}
function getByPlaceholderSelector(text, options) {
  return getByAttributeTextSelector("placeholder", text, options);
}
function getByTextSelector(text, options) {
  return `internal:text=${escapeForTextSelector(text, !!(options == null ? void 0 : options.exact))}`;
}
function getByRoleSelector(role, options = {}) {
  const props = [];
  if (options.checked !== void 0) {
    props.push(["checked", String(options.checked)]);
  }
  if (options.disabled !== void 0) {
    props.push(["disabled", String(options.disabled)]);
  }
  if (options.selected !== void 0) {
    props.push(["selected", String(options.selected)]);
  }
  if (options.expanded !== void 0) {
    props.push(["expanded", String(options.expanded)]);
  }
  if (options.includeHidden !== void 0) {
    props.push(["include-hidden", String(options.includeHidden)]);
  }
  if (options.level !== void 0) {
    props.push(["level", String(options.level)]);
  }
  if (options.name !== void 0) {
    props.push(["name", escapeForAttributeSelector(options.name, !!options.exact)]);
  }
  if (options.pressed !== void 0) {
    props.push(["pressed", String(options.pressed)]);
  }
  return `internal:role=${role}${props.map(([n, v]) => `[${n}=${v}]`).join("")}`;
}

// src/ivya.ts
var _Ivya = class _Ivya {
  constructor() {
    /** @internal */
    __publicField(this, "_engines");
    /** @internal */
    __publicField(this, "_evaluator");
    this._evaluator = new SelectorEvaluatorImpl(/* @__PURE__ */ new Map());
    this._engines = /* @__PURE__ */ new Map();
    this._engines.set("xpath", XPathEngine);
    this._engines.set("xpath:light", XPathEngine);
    this._engines.set("role", createRoleEngine(false));
    this._engines.set("text", this._createTextEngine(true, false));
    this._engines.set("text:light", this._createTextEngine(false, false));
    this._engines.set("id", this._createAttributeEngine("id", true));
    this._engines.set("id:light", this._createAttributeEngine("id", false));
    this._engines.set(
      "data-testid",
      this._createAttributeEngine("data-testid", true)
    );
    this._engines.set(
      "data-testid:light",
      this._createAttributeEngine("data-testid", false)
    );
    this._engines.set(
      "data-test-id",
      this._createAttributeEngine("data-test-id", true)
    );
    this._engines.set(
      "data-test-id:light",
      this._createAttributeEngine("data-test-id", false)
    );
    this._engines.set("data-test", this._createAttributeEngine("data-test", true));
    this._engines.set(
      "data-test:light",
      this._createAttributeEngine("data-test", false)
    );
    this._engines.set("css", this._createCSSEngine());
    this._engines.set("nth", { queryAll: () => [] });
    this._engines.set("visible", this._createVisibleEngine());
    this._engines.set("internal:control", this._createControlEngine());
    this._engines.set("internal:has", this._createHasEngine());
    this._engines.set("internal:has-not", this._createHasNotEngine());
    this._engines.set("internal:and", { queryAll: () => [] });
    this._engines.set("internal:or", { queryAll: () => [] });
    this._engines.set("internal:chain", this._createInternalChainEngine());
    this._engines.set("internal:label", this._createInternalLabelEngine());
    this._engines.set("internal:text", this._createTextEngine(true, true));
    this._engines.set("internal:has-text", this._createInternalHasTextEngine());
    this._engines.set(
      "internal:has-not-text",
      this._createInternalHasNotTextEngine()
    );
    this._engines.set("internal:attr", this._createNamedAttributeEngine());
    this._engines.set("internal:testid", this._createNamedAttributeEngine());
    this._engines.set("internal:role", createRoleEngine(true));
  }
  static create(options) {
    Object.assign(_Ivya.options, options);
    return _Ivya.singleton || (_Ivya.singleton = new _Ivya());
  }
  queryLocatorSelector(locator, root = document.documentElement, strict = true) {
    return this.querySelector(this.parseSelector(locator), root, strict);
  }
  queryLocatorSelectorAll(locator, root = document.documentElement) {
    return this.querySelectorAll(this.parseSelector(locator), root);
  }
  querySelector(selector, root, strict = true) {
    const result = this.querySelectorAll(selector, root);
    if (strict && result.length > 1) {
      throw this.strictModeViolationError(selector, result);
    }
    return result[0] || null;
  }
  queryAllByRole(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByRoleSelector(text, options)
    );
    return this.querySelectorAll(selector, container);
  }
  queryAllByLabelText(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByLabelSelector(text, options)
    );
    return this.querySelectorAll(selector, container);
  }
  queryAllByTestId(text, container = document.documentElement) {
    const selector = this.parseSelector(
      getByTestIdSelector(_Ivya.options.testIdAttribute, text)
    );
    return this.querySelectorAll(selector, container);
  }
  queryAllByText(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByTextSelector(text, options)
    );
    return this.querySelectorAll(selector, container);
  }
  queryAllByTitle(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByTitleSelector(text, options)
    );
    return this.querySelectorAll(selector, container);
  }
  queryAllByPlaceholder(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByPlaceholderSelector(text, options)
    );
    return this.querySelectorAll(selector, container);
  }
  queryAllByAltText(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByAltTextSelector(text, options)
    );
    return this.querySelectorAll(selector, container);
  }
  queryByRole(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByRoleSelector(text, options)
    );
    return this.querySelector(selector, container, false);
  }
  queryByLabelText(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByLabelSelector(text, options)
    );
    return this.querySelector(selector, container, false);
  }
  queryByTestId(text, container = document.documentElement) {
    const selector = this.parseSelector(
      getByTestIdSelector(_Ivya.options.testIdAttribute, text)
    );
    return this.querySelector(selector, container, false);
  }
  queryByText(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByTextSelector(text, options)
    );
    return this.querySelector(selector, container, false);
  }
  queryByTitle(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByTitleSelector(text, options)
    );
    return this.querySelector(selector, container, false);
  }
  queryByPlaceholder(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByPlaceholderSelector(text, options)
    );
    return this.querySelector(selector, container, false);
  }
  queryByAltText(text, options, container = document.documentElement) {
    const selector = this.parseSelector(
      getByAltTextSelector(text, options)
    );
    return this.querySelector(selector, container, false);
  }
  strictModeViolationError(selector, matches) {
    const infos = matches.slice(0, 10).map((m) => ({
      preview: this.previewNode(m),
      selector: this.generateSelectorSimple(m)
    }));
    const lines = infos.map(
      (info, i) => `
    ${i + 1}) ${info.preview} aka ${asLocator("javascript", info.selector)}`
    );
    if (infos.length < matches.length) {
      lines.push("\n    ...");
    }
    return this.createStacklessError(
      `strict mode violation: ${asLocator("javascript", stringifySelector(selector))} resolved to ${matches.length} elements:${lines.join("")}
`
    );
  }
  generateSelectorSimple(targetElement, options) {
    return generateSelector(this, targetElement, {
      ...options,
      testIdAttributeName: _Ivya.options.testIdAttribute
    });
  }
  parseSelector(selector) {
    const result = parseSelector(selector);
    visitAllSelectorParts(result, (part) => {
      if (!this._engines.has(part.name)) {
        throw this.createStacklessError(
          `Unknown engine "${part.name}" while parsing selector ${selector}`
        );
      }
    });
    return result;
  }
  previewNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return oneLine(`#text=${node.nodeValue || ""}`);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return oneLine(`<${node.nodeName.toLowerCase()} />`);
    }
    const element = node;
    const attrs = [];
    for (let i = 0; i < element.attributes.length; i++) {
      const { name, value } = element.attributes[i];
      if (name === "style") {
        continue;
      }
      if (!value && booleanAttributes.has(name)) {
        attrs.push(` ${name}`);
      } else {
        attrs.push(` ${name}="${value}"`);
      }
    }
    attrs.sort((a, b) => a.length - b.length);
    const attrText = trimStringWithEllipsis(attrs.join(""), 500);
    if (autoClosingTags.has(element.nodeName)) {
      return oneLine(`<${element.nodeName.toLowerCase()}${attrText}/>`);
    }
    const children = element.childNodes;
    let onlyText = false;
    if (children.length <= 5) {
      onlyText = true;
      for (let i = 0; i < children.length; i++) {
        onlyText = onlyText && children[i].nodeType === Node.TEXT_NODE;
      }
    }
    const text = onlyText ? element.textContent || "" : children.length ? "\u2026" : "";
    return oneLine(
      `<${element.nodeName.toLowerCase()}${attrText}>${trimStringWithEllipsis(text, 50)}</${element.nodeName.toLowerCase()}>`
    );
  }
  querySelectorAll(selector, root) {
    if (selector.capture !== void 0) {
      if (selector.parts.some((part) => part.name === "nth")) {
        throw this.createStacklessError(
          `Can't query n-th element in a request with the capture.`
        );
      }
      const withHas = {
        parts: selector.parts.slice(0, selector.capture + 1)
      };
      if (selector.capture < selector.parts.length - 1) {
        const parsed = {
          parts: selector.parts.slice(selector.capture + 1)
        };
        const has = {
          name: "internal:has",
          body: { parsed },
          source: stringifySelector(parsed)
        };
        withHas.parts.push(has);
      }
      return this.querySelectorAll(withHas, root);
    }
    if (!root.querySelectorAll) {
      throw this.createStacklessError("Node is not queryable.");
    }
    if (selector.capture !== void 0) {
      throw this.createStacklessError(
        "Internal error: there should not be a capture in the selector."
      );
    }
    if (root.nodeType === 11 && selector.parts.length === 1 && selector.parts[0].name === "css" && selector.parts[0].source === ":scope") {
      return [root];
    }
    this._evaluator.begin();
    try {
      let roots = /* @__PURE__ */ new Set([root]);
      for (const part of selector.parts) {
        if (part.name === "nth") {
          roots = this._queryNth(roots, part);
        } else if (part.name === "internal:and") {
          const andElements = this.querySelectorAll(
            part.body.parsed,
            root
          );
          roots = new Set(andElements.filter((e) => roots.has(e)));
        } else if (part.name === "internal:or") {
          const orElements = this.querySelectorAll(
            part.body.parsed,
            root
          );
          roots = new Set(sortInDOMOrder(/* @__PURE__ */ new Set([...roots, ...orElements])));
        } else if (kLayoutSelectorNames.includes(part.name)) {
          roots = this._queryLayoutSelector(roots, part, root);
        } else {
          const next = /* @__PURE__ */ new Set();
          for (const root2 of roots) {
            const all = this._queryEngineAll(part, root2);
            for (const one of all) {
              next.add(one);
            }
          }
          roots = next;
        }
      }
      return [...roots];
    } finally {
      this._evaluator.end();
    }
  }
  _queryEngineAll(part, root) {
    const result = this._engines.get(part.name).queryAll(root, part.body);
    for (const element of result) {
      if (!("nodeName" in element)) {
        throw this.createStacklessError(
          `Expected a Node but got ${Object.prototype.toString.call(element)}`
        );
      }
    }
    return result;
  }
  _queryNth(elements, part) {
    const list = [...elements];
    let nth = +part.body;
    if (nth === -1) {
      nth = list.length - 1;
    }
    return new Set(list.slice(nth, nth + 1));
  }
  _queryLayoutSelector(elements, part, originalRoot) {
    const name = part.name;
    const body = part.body;
    const result = [];
    const inner = this.querySelectorAll(body.parsed, originalRoot);
    for (const element of elements) {
      const score = layoutSelectorScore(name, element, inner, body.distance);
      if (score !== void 0) {
        result.push({ element, score });
      }
    }
    result.sort((a, b) => a.score - b.score);
    return new Set(result.map((r) => r.element));
  }
  createStacklessError(message) {
    if (_Ivya.options.browser === "firefox") {
      const error2 = new Error(`Error: ${message}`);
      error2.stack = "";
      return error2;
    }
    const error = new Error(message);
    delete error.stack;
    return error;
  }
  _createTextEngine(shadow, internal) {
    const queryAll = (root, selector) => {
      const { matcher, kind } = createTextMatcher(selector, internal);
      const result = [];
      let lastDidNotMatchSelf = null;
      const appendElement = (element) => {
        if (kind === "lax" && lastDidNotMatchSelf && lastDidNotMatchSelf.contains(element)) {
          return false;
        }
        const matches = elementMatchesText(
          this._evaluator._cacheText,
          element,
          matcher
        );
        if (matches === "none") {
          lastDidNotMatchSelf = element;
        }
        if (matches === "self" || matches === "selfAndChildren" && kind === "strict" && !internal) {
          result.push(element);
        }
      };
      if (root.nodeType === Node.ELEMENT_NODE) {
        appendElement(root);
      }
      const elements = this._evaluator._queryCSS(
        { scope: root, pierceShadow: shadow },
        "*"
      );
      for (const element of elements) {
        appendElement(element);
      }
      return result;
    };
    return { queryAll };
  }
  _createAttributeEngine(attribute, shadow) {
    const toCSS = (selector) => {
      const css = `[${attribute}=${JSON.stringify(selector)}]`;
      return [{ simples: [{ selector: { css, functions: [] }, combinator: "" }] }];
    };
    return {
      queryAll: (root, selector) => {
        return this._evaluator.query(
          { scope: root, pierceShadow: shadow },
          toCSS(selector)
        );
      }
    };
  }
  _createCSSEngine() {
    return {
      queryAll: (root, body) => {
        return this._evaluator.query(
          { scope: root, pierceShadow: true },
          body
        );
      }
    };
  }
  _createNamedAttributeEngine() {
    const queryAll = (root, selector) => {
      const parsed = parseAttributeSelector(selector);
      if (parsed.name || parsed.attributes.length !== 1) {
        throw new Error(`Malformed attribute selector: ${selector}`);
      }
      const { name, value, caseSensitive } = parsed.attributes[0];
      const lowerCaseValue = caseSensitive ? null : value.toLowerCase();
      let matcher;
      if (value instanceof RegExp) {
        matcher = (s) => !!s.match(value);
      } else if (caseSensitive) {
        matcher = (s) => s === value;
      } else {
        matcher = (s) => s.toLowerCase().includes(lowerCaseValue);
      }
      const elements = this._evaluator._queryCSS(
        { scope: root, pierceShadow: true },
        `[${name}]`
      );
      return elements.filter((e) => matcher(e.getAttribute(name)));
    };
    return { queryAll };
  }
  _createVisibleEngine() {
    const queryAll = (root, body) => {
      if (root.nodeType !== 1) {
        return [];
      }
      return isElementVisible(root) === Boolean(body) ? [root] : [];
    };
    return { queryAll };
  }
  _createControlEngine() {
    const queryAll = (root, body) => {
      var _a;
      if (body === "enter-frame" && root instanceof HTMLIFrameElement) {
        const doc = (_a = root.contentDocument) == null ? void 0 : _a.documentElement;
        return doc ? [doc] : [];
      }
      return [];
    };
    return { queryAll };
  }
  _createHasEngine() {
    const queryAll = (root, body) => {
      if (root.nodeType !== 1) {
        return [];
      }
      const has = !!this.querySelector(body.parsed, root, false);
      return has ? [root] : [];
    };
    return { queryAll };
  }
  _createHasNotEngine() {
    const queryAll = (root, body) => {
      if (root.nodeType !== 1) {
        return [];
      }
      const has = !!this.querySelector(body.parsed, root, false);
      return has ? [] : [root];
    };
    return { queryAll };
  }
  _createInternalChainEngine() {
    const queryAll = (root, body) => {
      return this.querySelectorAll(body.parsed, root);
    };
    return { queryAll };
  }
  _createInternalLabelEngine() {
    return {
      queryAll: (root, selector) => {
        const { matcher } = createTextMatcher(selector, true);
        const allElements = this._evaluator._queryCSS(
          { scope: root, pierceShadow: true },
          "*"
        );
        return allElements.filter((element) => {
          return getElementLabels(this._evaluator._cacheText, element).some(
            (label) => matcher(label)
          );
        });
      }
    };
  }
  _createInternalHasTextEngine() {
    return {
      queryAll: (root, selector) => {
        if (root.nodeType !== 1) {
          return [];
        }
        const element = root;
        const text = elementText(this._evaluator._cacheText, element);
        const { matcher } = createTextMatcher(selector, true);
        return matcher(text) ? [element] : [];
      }
    };
  }
  _createInternalHasNotTextEngine() {
    return {
      queryAll: (root, selector) => {
        if (root.nodeType !== 1) {
          return [];
        }
        const element = root;
        const text = elementText(this._evaluator._cacheText, element);
        const { matcher } = createTextMatcher(selector, true);
        return matcher(text) ? [] : [element];
      }
    };
  }
};
__publicField(_Ivya, "options", {
  testIdAttribute: "data-testid",
  browser: "chromium"
});
__publicField(_Ivya, "singleton", null);
var Ivya = _Ivya;
function oneLine(s) {
  return s.replace(/\n/g, "\u21B5").replace(/\t/g, "\u21C6");
}
var booleanAttributes = /* @__PURE__ */ new Set([
  "checked",
  "selected",
  "disabled",
  "readonly",
  "multiple"
]);
var autoClosingTags = /* @__PURE__ */ new Set([
  "AREA",
  "BASE",
  "BR",
  "COL",
  "COMMAND",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "KEYGEN",
  "LINK",
  "MENUITEM",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR"
]);
function cssUnquote(s) {
  s = s.substring(1, s.length - 1);
  if (!s.includes("\\")) {
    return s;
  }
  const r = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\" && i + 1 < s.length) {
      i++;
    }
    r.push(s[i++]);
  }
  return r.join("");
}
function createTextMatcher(selector, internal) {
  if (selector[0] === "/" && selector.lastIndexOf("/") > 0) {
    const lastSlash = selector.lastIndexOf("/");
    const re = new RegExp(
      selector.substring(1, lastSlash),
      selector.substring(lastSlash + 1)
    );
    return {
      matcher: (elementText2) => re.test(elementText2.full),
      kind: "regex"
    };
  }
  const unquote = internal ? JSON.parse.bind(JSON) : cssUnquote;
  let strict = false;
  if (selector.length > 1 && selector[0] === '"' && selector[selector.length - 1] === '"') {
    selector = unquote(selector);
    strict = true;
  } else if (internal && selector.length > 1 && selector[0] === '"' && selector[selector.length - 2] === '"' && selector[selector.length - 1] === "i") {
    selector = unquote(selector.substring(0, selector.length - 1));
    strict = false;
  } else if (internal && selector.length > 1 && selector[0] === '"' && selector[selector.length - 2] === '"' && selector[selector.length - 1] === "s") {
    selector = unquote(selector.substring(0, selector.length - 1));
    strict = true;
  } else if (selector.length > 1 && selector[0] === "'" && selector[selector.length - 1] === "'") {
    selector = unquote(selector);
    strict = true;
  }
  selector = normalizeWhiteSpace(selector);
  if (strict) {
    if (internal) {
      return {
        kind: "strict",
        matcher: (elementText2) => elementText2.normalized === selector
      };
    }
    const strictTextNodeMatcher = (elementText2) => {
      if (!selector && !elementText2.immediate.length) {
        return true;
      }
      return elementText2.immediate.some((s) => normalizeWhiteSpace(s) === selector);
    };
    return { matcher: strictTextNodeMatcher, kind: "strict" };
  }
  selector = selector.toLowerCase();
  return {
    kind: "lax",
    matcher: (elementText2) => elementText2.normalized.toLowerCase().includes(selector)
  };
}
var XPathEngine = {
  queryAll(root, selector) {
    if (selector.startsWith("/") && root.nodeType !== Node.DOCUMENT_NODE) {
      selector = `.${selector}`;
    }
    const result = [];
    const document2 = root.ownerDocument || root;
    if (!document2) {
      return result;
    }
    const it = document2.evaluate(
      selector,
      root,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE
    );
    for (let node = it.iterateNext(); node; node = it.iterateNext()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        result.push(node);
      }
    }
    return result;
  }
};

// src/domUtils.ts
function parentElementOrShadowHost(element) {
  if (element.parentElement) {
    return element.parentElement;
  }
  if (!element.parentNode) {
    return;
  }
  if (element.parentNode.nodeType === 11 && element.parentNode.host) {
    return element.parentNode.host;
  }
}
function enclosingShadowRootOrDocument(element) {
  let node = element;
  while (node.parentNode) {
    node = node.parentNode;
  }
  if (node.nodeType === 11 || node.nodeType === 9) {
    return node;
  }
}
function enclosingShadowHost(element) {
  while (element.parentElement) {
    element = element.parentElement;
  }
  return parentElementOrShadowHost(element);
}
function closestCrossShadow(element, css) {
  while (element) {
    const closest = element.closest(css);
    if (closest) {
      return closest;
    }
    element = enclosingShadowHost(element);
  }
}
function getElementComputedStyle(element, pseudo) {
  return element.ownerDocument && element.ownerDocument.defaultView ? element.ownerDocument.defaultView.getComputedStyle(element, pseudo) : void 0;
}
function isElementStyleVisibilityVisible(element, style) {
  style = style != null ? style : getElementComputedStyle(element);
  if (!style) {
    return true;
  }
  if (Element.prototype.checkVisibility && Ivya.options.browser !== "webkit") {
    if (!element.checkVisibility()) {
      return false;
    }
  } else {
    const detailsOrSummary = element.closest("details,summary");
    if (detailsOrSummary !== element && (detailsOrSummary == null ? void 0 : detailsOrSummary.nodeName) === "DETAILS" && !detailsOrSummary.open) {
      return false;
    }
  }
  if (style.visibility !== "visible") {
    return false;
  }
  return true;
}
function isElementVisible(element) {
  const style = getElementComputedStyle(element);
  if (!style) {
    return true;
  }
  if (style.display === "contents") {
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && isElementVisible(child)) {
        return true;
      }
      if (child.nodeType === 3 && isVisibleTextNode(child)) {
        return true;
      }
    }
    return false;
  }
  if (!isElementStyleVisibilityVisible(element, style)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
function isVisibleTextNode(node) {
  const range = node.ownerDocument.createRange();
  range.selectNode(node);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
function elementSafeTagName(element) {
  if (element instanceof HTMLFormElement) {
    return "FORM";
  }
  return element.tagName.toUpperCase();
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
		define: project.config.viteDefine,
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

export { asLocator, createBrowserServer, defineBrowserCommand, defineBrowserProvider, parseKeyDef, resolveScreenshotPath };
