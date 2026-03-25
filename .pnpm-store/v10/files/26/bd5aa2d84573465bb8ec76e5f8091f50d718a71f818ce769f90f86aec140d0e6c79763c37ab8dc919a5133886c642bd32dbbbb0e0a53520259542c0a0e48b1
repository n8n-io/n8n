import { parseKeyDef, resolveScreenshotPath, defineBrowserProvider } from '@vitest/browser';
export { defineBrowserCommand } from '@vitest/browser';
import { createManualModuleSource } from '@vitest/mocker/node';
import c from 'tinyrainbow';
import { createDebugger, isCSSRequest } from 'vitest/node';
import { mkdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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

const clear = async (context, selector) => {
	const { iframe } = context;
	const element = iframe.locator(selector);
	await element.clear();
};

const click = async (context, selector, options = {}) => {
	const tester = context.iframe;
	await tester.locator(selector).click(options);
};
const dblClick = async (context, selector, options = {}) => {
	const tester = context.iframe;
	await tester.locator(selector).dblclick(options);
};
const tripleClick = async (context, selector, options = {}) => {
	const tester = context.iframe;
	await tester.locator(selector).click({
		...options,
		clickCount: 3
	});
};

const dragAndDrop = async (context, source, target, options_) => {
	const frame = await context.frame();
	await frame.dragAndDrop(source, target, options_);
};

const fill = async (context, selector, text, options = {}) => {
	const { iframe } = context;
	const element = iframe.locator(selector);
	await element.fill(text, options);
};

const hover = async (context, selector, options = {}) => {
	await context.iframe.locator(selector).hover(options);
};

const keyboard = async (context, text, state) => {
	const frame = await context.frame();
	await frame.evaluate(focusIframe);
	const pressed = new Set(state.unreleased);
	await keyboardImplementation(pressed, context.provider, context.sessionId, text, async () => {
		const frame = await context.frame();
		await frame.evaluate(selectAll);
	}, true);
	return { unreleased: Array.from(pressed) };
};
const keyboardCleanup = async (context, state) => {
	const { provider, sessionId } = context;
	if (!state.unreleased) {
		return;
	}
	const page = provider.getPage(sessionId);
	for (const key of state.unreleased) {
		await page.keyboard.up(key);
	}
};
// fallback to insertText for non US key
// https://github.com/microsoft/playwright/blob/50775698ae13642742f2a1e8983d1d686d7f192d/packages/playwright-core/src/server/input.ts#L95
const VALID_KEYS = new Set([
	"Escape",
	"F1",
	"F2",
	"F3",
	"F4",
	"F5",
	"F6",
	"F7",
	"F8",
	"F9",
	"F10",
	"F11",
	"F12",
	"Backquote",
	"`",
	"~",
	"Digit1",
	"1",
	"!",
	"Digit2",
	"2",
	"@",
	"Digit3",
	"3",
	"#",
	"Digit4",
	"4",
	"$",
	"Digit5",
	"5",
	"%",
	"Digit6",
	"6",
	"^",
	"Digit7",
	"7",
	"&",
	"Digit8",
	"8",
	"*",
	"Digit9",
	"9",
	"(",
	"Digit0",
	"0",
	")",
	"Minus",
	"-",
	"_",
	"Equal",
	"=",
	"+",
	"Backslash",
	"\\",
	"|",
	"Backspace",
	"Tab",
	"KeyQ",
	"q",
	"Q",
	"KeyW",
	"w",
	"W",
	"KeyE",
	"e",
	"E",
	"KeyR",
	"r",
	"R",
	"KeyT",
	"t",
	"T",
	"KeyY",
	"y",
	"Y",
	"KeyU",
	"u",
	"U",
	"KeyI",
	"i",
	"I",
	"KeyO",
	"o",
	"O",
	"KeyP",
	"p",
	"P",
	"BracketLeft",
	"[",
	"{",
	"BracketRight",
	"]",
	"}",
	"CapsLock",
	"KeyA",
	"a",
	"A",
	"KeyS",
	"s",
	"S",
	"KeyD",
	"d",
	"D",
	"KeyF",
	"f",
	"F",
	"KeyG",
	"g",
	"G",
	"KeyH",
	"h",
	"H",
	"KeyJ",
	"j",
	"J",
	"KeyK",
	"k",
	"K",
	"KeyL",
	"l",
	"L",
	"Semicolon",
	";",
	":",
	"Quote",
	"'",
	"\"",
	"Enter",
	"\n",
	"\r",
	"ShiftLeft",
	"Shift",
	"KeyZ",
	"z",
	"Z",
	"KeyX",
	"x",
	"X",
	"KeyC",
	"c",
	"C",
	"KeyV",
	"v",
	"V",
	"KeyB",
	"b",
	"B",
	"KeyN",
	"n",
	"N",
	"KeyM",
	"m",
	"M",
	"Comma",
	",",
	"<",
	"Period",
	".",
	">",
	"Slash",
	"/",
	"?",
	"ShiftRight",
	"ControlLeft",
	"Control",
	"MetaLeft",
	"Meta",
	"AltLeft",
	"Alt",
	"Space",
	" ",
	"AltRight",
	"AltGraph",
	"MetaRight",
	"ContextMenu",
	"ControlRight",
	"PrintScreen",
	"ScrollLock",
	"Pause",
	"PageUp",
	"PageDown",
	"Insert",
	"Delete",
	"Home",
	"End",
	"ArrowLeft",
	"ArrowUp",
	"ArrowRight",
	"ArrowDown",
	"NumLock",
	"NumpadDivide",
	"NumpadMultiply",
	"NumpadSubtract",
	"Numpad7",
	"Numpad8",
	"Numpad9",
	"Numpad4",
	"Numpad5",
	"Numpad6",
	"NumpadAdd",
	"Numpad1",
	"Numpad2",
	"Numpad3",
	"Numpad0",
	"NumpadDecimal",
	"NumpadEnter",
	"ControlOrMeta"
]);
async function keyboardImplementation(pressed, provider, sessionId, text, selectAll, skipRelease) {
	const page = provider.getPage(sessionId);
	const actions = parseKeyDef(text);
	for (const { releasePrevious, releaseSelf, repeat, keyDef } of actions) {
		const key = keyDef.key;
		// TODO: instead of calling down/up for each key, join non special
		// together, and call `type` once for all non special keys,
		// and then `press` for special keys
		if (pressed.has(key)) {
			if (VALID_KEYS.has(key)) {
				await page.keyboard.up(key);
			}
			pressed.delete(key);
		}
		if (!releasePrevious) {
			if (key === "selectall") {
				await selectAll();
				continue;
			}
			for (let i = 1; i <= repeat; i++) {
				if (VALID_KEYS.has(key)) {
					await page.keyboard.down(key);
				} else {
					await page.keyboard.insertText(key);
				}
			}
			if (releaseSelf) {
				if (VALID_KEYS.has(key)) {
					await page.keyboard.up(key);
				}
			} else {
				pressed.add(key);
			}
		}
	}
	if (!skipRelease && pressed.size) {
		for (const key of pressed) {
			if (VALID_KEYS.has(key)) {
				await page.keyboard.up(key);
			}
		}
	}
	return { pressed };
}
function focusIframe() {
	if (!document.activeElement || document.activeElement.ownerDocument !== document || document.activeElement === document.body) {
		window.focus();
	}
}
function selectAll() {
	const element = document.activeElement;
	if (element && typeof element.select === "function") {
		element.select();
	}
}

/**
* Takes a screenshot using the provided browser context and returns a buffer and the expected screenshot path.
*
* **Note**: the returned `path` indicates where the screenshot *might* be found.
* It is not guaranteed to exist, especially if `options.save` is `false`.
*
* @throws {Error} If the function is not called within a test or if the browser provider does not support screenshots.
*/
async function takeScreenshot(context, name, options) {
	if (!context.testPath) {
		throw new Error(`Cannot take a screenshot without a test path`);
	}
	const path = resolveScreenshotPath(context.testPath, name, context.project.config, options.path);
	// playwright does not need a screenshot path if we don't intend to save it
	let savePath;
	if (options.save) {
		savePath = normalize(path);
		await mkdir(dirname(savePath), { recursive: true });
	}
	const mask = options.mask?.map((selector) => context.iframe.locator(selector));
	if (options.element) {
		const { element: selector, ...config } = options;
		const element = context.iframe.locator(selector);
		const buffer = await element.screenshot({
			...config,
			mask,
			path: savePath
		});
		return {
			buffer,
			path
		};
	}
	const buffer = await context.iframe.locator("body").screenshot({
		...options,
		mask,
		path: savePath
	});
	return {
		buffer,
		path
	};
}

const selectOptions = async (context, selector, userValues, options = {}) => {
	const value = userValues;
	const { iframe } = context;
	const selectElement = iframe.locator(selector);
	const values = await Promise.all(value.map(async (v) => {
		if (typeof v === "string") {
			return v;
		}
		const elementHandler = await iframe.locator(v.element).elementHandle();
		if (!elementHandler) {
			throw new Error(`Element not found: ${v.element}`);
		}
		return elementHandler;
	}));
	await selectElement.selectOption(values, options);
};

const tab = async (context, options = {}) => {
	const page = context.page;
	await page.keyboard.press(options.shift === true ? "Shift+Tab" : "Tab");
};

const startTracing = async ({ context, project, provider, sessionId }) => {
	if (isPlaywrightProvider(provider)) {
		if (provider.tracingContexts.has(sessionId)) {
			return;
		}
		provider.tracingContexts.add(sessionId);
		const options = project.config.browser.trace;
		await context.tracing.start({
			screenshots: options.screenshots ?? true,
			snapshots: options.snapshots ?? true,
			sources: false
		}).catch(() => {
			provider.tracingContexts.delete(sessionId);
		});
		return;
	}
	throw new TypeError(`The ${provider.name} provider does not support tracing.`);
};
const startChunkTrace = async (command, { name, title }) => {
	const { provider, sessionId, testPath, context } = command;
	if (!testPath) {
		throw new Error(`stopChunkTrace cannot be called outside of the test file.`);
	}
	if (isPlaywrightProvider(provider)) {
		if (!provider.tracingContexts.has(sessionId)) {
			await startTracing(command);
		}
		const path = resolveTracesPath(command, name);
		provider.pendingTraces.set(path, sessionId);
		await context.tracing.startChunk({
			name,
			title
		});
		return;
	}
	throw new TypeError(`The ${provider.name} provider does not support tracing.`);
};
const stopChunkTrace = async (context, { name }) => {
	if (isPlaywrightProvider(context.provider)) {
		const path = resolveTracesPath(context, name);
		context.provider.pendingTraces.delete(path);
		await context.context.tracing.stopChunk({ path });
		return { tracePath: path };
	}
	throw new TypeError(`The ${context.provider.name} provider does not support tracing.`);
};
function resolveTracesPath({ testPath, project }, name) {
	if (!testPath) {
		throw new Error(`This command can only be called inside a test file.`);
	}
	const options = project.config.browser.trace;
	const sanitizedName = `${project.name.replace(/[^a-z0-9]/gi, "-")}-${name}.trace.zip`;
	if (options.tracesDir) {
		return resolve(options.tracesDir, sanitizedName);
	}
	const dir = dirname(testPath);
	const base = basename(testPath);
	return resolve(dir, "__traces__", base, `${project.name.replace(/[^a-z0-9]/gi, "-")}-${name}.trace.zip`);
}
const deleteTracing = async (context, { traces }) => {
	if (!context.testPath) {
		throw new Error(`stopChunkTrace cannot be called outside of the test file.`);
	}
	if (isPlaywrightProvider(context.provider)) {
		return Promise.all(traces.map((trace) => unlink(trace).catch((err) => {
			if (err.code === "ENOENT") {
				// Ignore the error if the file doesn't exist
				return;
			}
			// Re-throw other errors
			throw err;
		})));
	}
	throw new Error(`provider ${context.provider.name} is not supported`);
};
const annotateTraces = async ({ project }, { testId, traces }) => {
	const vitest = project.vitest;
	await Promise.all(traces.map((trace) => {
		const entity = vitest.state.getReportedEntityById(testId);
		const location = entity?.location ? {
			file: entity.module.moduleId,
			line: entity.location.line,
			column: entity.location.column
		} : undefined;
		return vitest._testRun.recordArtifact(testId, {
			type: "internal:annotation",
			annotation: {
				message: relative(project.config.root, trace),
				type: "traces",
				attachment: {
					path: trace,
					contentType: "application/octet-stream"
				},
				location
			},
			location
		});
	}));
};
function isPlaywrightProvider(provider) {
	return provider.name === "playwright";
}

const type = async (context, selector, text, options = {}) => {
	const { skipClick = false, skipAutoClose = false } = options;
	const unreleased = new Set(Reflect.get(options, "unreleased") ?? []);
	const { iframe } = context;
	const element = iframe.locator(selector);
	if (!skipClick) {
		await element.focus();
	}
	await keyboardImplementation(unreleased, context.provider, context.sessionId, text, () => element.selectText(), skipAutoClose);
	return { unreleased: Array.from(unreleased) };
};

const upload = async (context, selector, files, options) => {
	const testPath = context.testPath;
	if (!testPath) {
		throw new Error(`Cannot upload files outside of a test`);
	}
	const root = context.project.config.root;
	const { iframe } = context;
	const playwrightFiles = files.map((file) => {
		if (typeof file === "string") {
			return resolve(root, file);
		}
		return {
			name: file.name,
			mimeType: file.mimeType,
			buffer: Buffer.from(file.base64, "base64")
		};
	});
	await iframe.locator(selector).setInputFiles(playwrightFiles, options);
};

var commands = {
	__vitest_upload: upload,
	__vitest_click: click,
	__vitest_dblClick: dblClick,
	__vitest_tripleClick: tripleClick,
	__vitest_takeScreenshot: takeScreenshot,
	__vitest_type: type,
	__vitest_clear: clear,
	__vitest_fill: fill,
	__vitest_tab: tab,
	__vitest_keyboard: keyboard,
	__vitest_selectOptions: selectOptions,
	__vitest_dragAndDrop: dragAndDrop,
	__vitest_hover: hover,
	__vitest_cleanup: keyboardCleanup,
	__vitest_deleteTracing: deleteTracing,
	__vitest_startChunkTrace: startChunkTrace,
	__vitest_startTracing: startTracing,
	__vitest_stopChunkTrace: stopChunkTrace,
	__vitest_annotateTraces: annotateTraces
};

const pkgRoot = resolve(fileURLToPath(import.meta.url), "../..");
const distRoot = resolve(pkgRoot, "dist");

const debug = createDebugger("vitest:browser:playwright");
const playwrightBrowsers = [
	"firefox",
	"webkit",
	"chromium"
];
// Enable intercepting of requests made by service workers - experimental API is only available in Chromium based browsers
// Requests from service workers are only available on context.route() https://playwright.dev/docs/service-workers-experimental
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= "1";
function playwright(options = {}) {
	return defineBrowserProvider({
		name: "playwright",
		supportedBrowser: playwrightBrowsers,
		options,
		providerFactory(project) {
			return new PlaywrightBrowserProvider(project, options);
		}
	});
}
class PlaywrightBrowserProvider {
	name = "playwright";
	supportsParallelism = true;
	browser = null;
	contexts = new Map();
	pages = new Map();
	mocker;
	browserName;
	browserPromise = null;
	closing = false;
	tracingContexts = new Set();
	pendingTraces = new Map();
	initScripts = [resolve(distRoot, "locators.js")];
	constructor(project, options) {
		this.project = project;
		this.options = options;
		this.browserName = project.config.browser.name;
		this.mocker = this.createMocker();
		for (const [name, command] of Object.entries(commands)) {
			project.browser.registerCommand(name, command);
		}
		// make sure the traces are finished if the test hangs
		process.on("SIGTERM", () => {
			if (!this.browser) {
				return;
			}
			const promises = [];
			for (const [trace, contextId] of this.pendingTraces.entries()) {
				promises.push((() => {
					const context = this.contexts.get(contextId);
					return context?.tracing.stopChunk({ path: trace });
				})());
			}
			return Promise.allSettled(promises);
		});
	}
	async openBrowser() {
		await this._throwIfClosing();
		if (this.browserPromise) {
			debug?.("[%s] the browser is resolving, reusing the promise", this.browserName);
			return this.browserPromise;
		}
		if (this.browser) {
			debug?.("[%s] the browser is resolved, reusing it", this.browserName);
			return this.browser;
		}
		this.browserPromise = (async () => {
			const options = this.project.config.browser;
			const playwright = await import('playwright');
			if (this.options.connectOptions) {
				if (this.options.launchOptions) {
					this.project.vitest.logger.warn(c.yellow(`Found both ${c.bold(c.italic(c.yellow("connect")))} and ${c.bold(c.italic(c.yellow("launch")))} options in browser instance configuration.
          Ignoring ${c.bold(c.italic(c.yellow("launch")))} options and using ${c.bold(c.italic(c.yellow("connect")))} mode.
          You probably want to remove one of the two options and keep only the one you want to use.`));
				}
				const browser = await playwright[this.browserName].connect(this.options.connectOptions.wsEndpoint, this.options.connectOptions);
				this.browser = browser;
				this.browserPromise = null;
				return this.browser;
			}
			const launchOptions = {
				...this.options.launchOptions,
				headless: options.headless
			};
			if (typeof options.trace === "object" && options.trace.tracesDir) {
				launchOptions.tracesDir = options.trace?.tracesDir;
			}
			const inspector = this.project.vitest.config.inspector;
			if (inspector.enabled) {
				// NodeJS equivalent defaults: https://nodejs.org/en/learn/getting-started/debugging#enable-inspector
				const port = inspector.port || 9229;
				const host = inspector.host || "127.0.0.1";
				launchOptions.args ||= [];
				launchOptions.args.push(`--remote-debugging-port=${port}`);
				launchOptions.args.push(`--remote-debugging-address=${host}`);
				this.project.vitest.logger.log(`Debugger listening on ws://${host}:${port}`);
			}
			// start Vitest UI maximized only on supported browsers
			if (this.project.config.browser.ui && this.browserName === "chromium") {
				if (!launchOptions.args) {
					launchOptions.args = [];
				}
				if (!launchOptions.args.includes("--start-maximized") && !launchOptions.args.includes("--start-fullscreen")) {
					launchOptions.args.push("--start-maximized");
				}
			}
			debug?.("[%s] initializing the browser with launch options: %O", this.browserName, launchOptions);
			this.browser = await playwright[this.browserName].launch(launchOptions);
			this.browserPromise = null;
			return this.browser;
		})();
		return this.browserPromise;
	}
	createMocker() {
		const idPreficates = new Map();
		const sessionIds = new Map();
		function createPredicate(sessionId, url) {
			const moduleUrl = new URL(url, "http://localhost");
			const predicate = (url) => {
				if (url.searchParams.has("_vitest_original")) {
					return false;
				}
				// different modules, ignore request
				if (url.pathname !== moduleUrl.pathname) {
					return false;
				}
				url.searchParams.delete("t");
				url.searchParams.delete("v");
				url.searchParams.delete("import");
				// different search params, ignore request
				if (url.searchParams.size !== moduleUrl.searchParams.size) {
					return false;
				}
				// check that all search params are the same
				for (const [param, value] of url.searchParams.entries()) {
					if (moduleUrl.searchParams.get(param) !== value) {
						return false;
					}
				}
				return true;
			};
			const ids = sessionIds.get(sessionId) || [];
			ids.push(moduleUrl.href);
			sessionIds.set(sessionId, ids);
			idPreficates.set(predicateKey(sessionId, moduleUrl.href), predicate);
			return predicate;
		}
		function predicateKey(sessionId, url) {
			return `${sessionId}:${url}`;
		}
		return {
			register: async (sessionId, module) => {
				const page = this.getPage(sessionId);
				await page.context().route(createPredicate(sessionId, module.url), async (route) => {
					if (module.type === "manual") {
						const exports$1 = Object.keys(await module.resolve());
						const body = createManualModuleSource(module.url, exports$1);
						return route.fulfill({
							body,
							headers: getHeaders(this.project.browser.vite.config)
						});
					}
					// webkit doesn't support redirect responses
					// https://github.com/microsoft/playwright/issues/18318
					const isWebkit = this.browserName === "webkit";
					if (isWebkit) {
						let url;
						if (module.type === "redirect") {
							const redirect = new URL(module.redirect);
							url = redirect.href.slice(redirect.origin.length);
						} else {
							const request = new URL(route.request().url());
							request.searchParams.set("mock", module.type);
							url = request.href.slice(request.origin.length);
						}
						const result = await this.project.browser.vite.transformRequest(url).catch(() => null);
						if (!result) {
							return route.continue();
						}
						let content = result.code;
						if (result.map && "version" in result.map && result.map.mappings) {
							const type = isDirectCSSRequest(url) ? "css" : "js";
							content = getCodeWithSourcemap(type, content.toString(), result.map);
						}
						return route.fulfill({
							body: content,
							headers: getHeaders(this.project.browser.vite.config)
						});
					}
					if (module.type === "redirect") {
						return route.fulfill({
							status: 302,
							headers: { Location: module.redirect }
						});
					} else if (module.type === "automock" || module.type === "autospy") {
						const url = new URL(route.request().url());
						url.searchParams.set("mock", module.type);
						return route.fulfill({
							status: 302,
							headers: { Location: url.href }
						});
					} else ;
				});
			},
			delete: async (sessionId, id) => {
				const page = this.getPage(sessionId);
				const key = predicateKey(sessionId, id);
				const predicate = idPreficates.get(key);
				if (predicate) {
					await page.context().unroute(predicate).finally(() => idPreficates.delete(key));
				}
			},
			clear: async (sessionId) => {
				const page = this.getPage(sessionId);
				const ids = sessionIds.get(sessionId) || [];
				const promises = ids.map((id) => {
					const key = predicateKey(sessionId, id);
					const predicate = idPreficates.get(key);
					if (predicate) {
						return page.context().unroute(predicate).finally(() => idPreficates.delete(key));
					}
					return null;
				});
				await Promise.all(promises).finally(() => sessionIds.delete(sessionId));
			}
		};
	}
	async createContext(sessionId) {
		await this._throwIfClosing();
		if (this.contexts.has(sessionId)) {
			debug?.("[%s][%s] the context already exists, reusing it", sessionId, this.browserName);
			return this.contexts.get(sessionId);
		}
		const browser = await this.openBrowser();
		await this._throwIfClosing(browser);
		const actionTimeout = this.options.actionTimeout;
		const contextOptions = this.options.contextOptions ?? {};
		const options = {
			...contextOptions,
			ignoreHTTPSErrors: true
		};
		if (this.project.config.browser.ui) {
			options.viewport = null;
		}
		// TODO: investigate the consequences for Vitest 5
		// else {
		// if UI is disabled, keep the iframe scale to 1
		// options.viewport ??= this.project.config.browser.viewport
		// }
		const context = await browser.newContext(options);
		await this._throwIfClosing(context);
		if (actionTimeout != null) {
			context.setDefaultTimeout(actionTimeout);
		}
		debug?.("[%s][%s] the context is ready", sessionId, this.browserName);
		this.contexts.set(sessionId, context);
		return context;
	}
	getPage(sessionId) {
		const page = this.pages.get(sessionId);
		if (!page) {
			throw new Error(`Page "${sessionId}" not found in ${this.browserName} browser.`);
		}
		return page;
	}
	getCommandsContext(sessionId) {
		const page = this.getPage(sessionId);
		return {
			page,
			context: this.contexts.get(sessionId),
			frame() {
				return new Promise((resolve, reject) => {
					const frame = page.frame("vitest-iframe");
					if (frame) {
						return resolve(frame);
					}
					const timeout = setTimeout(() => {
						const err = new Error(`Cannot find "vitest-iframe" on the page. This is a bug in Vitest, please report it.`);
						reject(err);
					}, 1e3).unref();
					page.on("frameattached", (frame) => {
						clearTimeout(timeout);
						resolve(frame);
					});
				});
			},
			get iframe() {
				return page.frameLocator("[data-vitest=\"true\"]");
			}
		};
	}
	async openBrowserPage(sessionId) {
		await this._throwIfClosing();
		if (this.pages.has(sessionId)) {
			debug?.("[%s][%s] the page already exists, closing the old one", sessionId, this.browserName);
			const page = this.pages.get(sessionId);
			await page.close();
			this.pages.delete(sessionId);
		}
		const context = await this.createContext(sessionId);
		const page = await context.newPage();
		debug?.("[%s][%s] the page is ready", sessionId, this.browserName);
		await this._throwIfClosing(page);
		this.pages.set(sessionId, page);
		if (process.env.VITEST_PW_DEBUG) {
			page.on("requestfailed", (request) => {
				console.error("[PW Error]", request.resourceType(), "request failed for", request.url(), "url:", request.failure()?.errorText);
			});
		}
		return page;
	}
	async openPage(sessionId, url) {
		debug?.("[%s][%s] creating the browser page for %s", sessionId, this.browserName, url);
		const browserPage = await this.openBrowserPage(sessionId);
		debug?.("[%s][%s] browser page is created, opening %s", sessionId, this.browserName, url);
		await browserPage.goto(url, { timeout: 0 });
		await this._throwIfClosing(browserPage);
	}
	async _throwIfClosing(disposable) {
		if (this.closing) {
			debug?.("[%s] provider was closed, cannot perform the action on %s", this.browserName, String(disposable));
			await disposable?.close();
			this.pages.clear();
			this.contexts.clear();
			this.browser = null;
			this.browserPromise = null;
			throw new Error(`[vitest] The provider was closed.`);
		}
	}
	async getCDPSession(sessionid) {
		const page = this.getPage(sessionid);
		const cdp = await page.context().newCDPSession(page);
		return {
			async send(method, params) {
				const result = await cdp.send(method, params);
				return result;
			},
			on(event, listener) {
				cdp.on(event, listener);
			},
			off(event, listener) {
				cdp.off(event, listener);
			},
			once(event, listener) {
				cdp.once(event, listener);
			}
		};
	}
	async close() {
		debug?.("[%s] closing provider", this.browserName);
		this.closing = true;
		if (this.browserPromise) {
			await this.browserPromise;
			this.browserPromise = null;
		}
		const browser = this.browser;
		this.browser = null;
		await Promise.all([...this.pages.values()].map((p) => p.close()));
		this.pages.clear();
		await Promise.all([...this.contexts.values()].map((c) => c.close()));
		this.contexts.clear();
		await browser?.close();
		debug?.("[%s] provider is closed", this.browserName);
	}
}
function getHeaders(config) {
	const headers = { "Content-Type": "application/javascript" };
	for (const name in config.server.headers) {
		headers[name] = String(config.server.headers[name]);
	}
	return headers;
}
function getCodeWithSourcemap(type, code, map) {
	if (type === "js") {
		code += `\n//# sourceMappingURL=${genSourceMapUrl(map)}`;
	} else if (type === "css") {
		code += `\n/*# sourceMappingURL=${genSourceMapUrl(map)} */`;
	}
	return code;
}
function genSourceMapUrl(map) {
	if (typeof map !== "string") {
		map = JSON.stringify(map);
	}
	return `data:application/json;base64,${Buffer.from(map).toString("base64")}`;
}
const directRequestRE = /[?&]direct\b/;
function isDirectCSSRequest(request) {
	return isCSSRequest(request) && directRequestRE.test(request);
}

export { PlaywrightBrowserProvider, playwright };
