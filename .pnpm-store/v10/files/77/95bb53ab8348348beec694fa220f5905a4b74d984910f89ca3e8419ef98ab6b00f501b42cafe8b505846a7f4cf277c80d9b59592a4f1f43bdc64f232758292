import { __INTERNAL, stringify } from 'vitest/internal/browser';

function ensureAwaited(promise) {
	const test = getWorkerState().current;
	if (!test || test.type !== "test") {
		return promise();
	}
	let awaited = false;
	const sourceError = new Error("STACK_TRACE_ERROR");
	test.onFinished ??= [];
	test.onFinished.push(() => {
		if (!awaited) {
			const error = new Error(`The call was not awaited. This method is asynchronous and must be awaited; otherwise, the call will not start to avoid unhandled rejections.`);
			error.stack = sourceError.stack?.replace(sourceError.message, error.message);
			throw error;
		}
	});
	// don't even start the promise if it's not awaited to not cause any unhanded promise rejections
	let promiseResult;
	return {
		then(onFulfilled, onRejected) {
			awaited = true;
			return (promiseResult ||= promise(sourceError)).then(onFulfilled, onRejected);
		},
		catch(onRejected) {
			return (promiseResult ||= promise(sourceError)).catch(onRejected);
		},
		finally(onFinally) {
			return (promiseResult ||= promise(sourceError)).finally(onFinally);
		},
		[Symbol.toStringTag]: "Promise"
	};
}
/* @__NO_SIDE_EFFECTS__ */
function getBrowserState() {
	// @ts-expect-error not typed global
	return window.__vitest_browser_runner__;
}
/* @__NO_SIDE_EFFECTS__ */
function getWorkerState() {
	// @ts-expect-error not typed global
	const state = window.__vitest_worker__;
	if (!state) {
		throw new Error("Worker state is not found. This is an issue with Vitest. Please, open an issue.");
	}
	return state;
}

const provider$1 = getBrowserState().provider;
/* @__NO_SIDE_EFFECTS__ */
function convertElementToCssSelector(element) {
	if (!element || !(element instanceof Element)) {
		throw new Error(`Expected DOM element to be an instance of Element, received ${typeof element}`);
	}
	return getUniqueCssSelector(element);
}
function escapeIdForCSSSelector(id) {
	return id.split("").map((char) => {
		const code = char.charCodeAt(0);
		if (char === " " || char === "#" || char === "." || char === ":" || char === "[" || char === "]" || char === ">" || char === "+" || char === "~" || char === "\\") {
			// Escape common special characters with backslashes
			return `\\${char}`;
		} else if (code >= 65536) {
			// Unicode escape for characters outside the BMP
			return `\\${code.toString(16).toUpperCase().padStart(6, "0")} `;
		} else if (code < 32 || code === 127) {
			// Non-printable ASCII characters (0x00-0x1F and 0x7F) are escaped
			return `\\${code.toString(16).toUpperCase().padStart(2, "0")} `;
		} else if (code >= 128) {
			// Non-ASCII characters (0x80 and above) are escaped
			return `\\${code.toString(16).toUpperCase().padStart(2, "0")} `;
		} else {
			// Allowable characters are used directly
			return char;
		}
	}).join("");
}
function getUniqueCssSelector(el) {
	const path = [];
	let parent;
	let hasShadowRoot = false;
	// eslint-disable-next-line no-cond-assign
	while (parent = getParent(el)) {
		if (parent.shadowRoot) {
			hasShadowRoot = true;
		}
		const tag = el.tagName;
		if (el.id) {
			path.push(`#${escapeIdForCSSSelector(el.id)}`);
		} else if (!el.nextElementSibling && !el.previousElementSibling) {
			path.push(tag.toLowerCase());
		} else {
			let index = 0;
			let sameTagSiblings = 0;
			let elementIndex = 0;
			for (const sibling of parent.children) {
				index++;
				if (sibling.tagName === tag) {
					sameTagSiblings++;
				}
				if (sibling === el) {
					elementIndex = index;
				}
			}
			if (sameTagSiblings > 1) {
				path.push(`${tag.toLowerCase()}:nth-child(${elementIndex})`);
			} else {
				path.push(tag.toLowerCase());
			}
		}
		el = parent;
	}
	return `${getBrowserState().provider === "webdriverio" && hasShadowRoot ? ">>>" : ""}${path.reverse().join(" > ")}`;
}
function getParent(el) {
	const parent = el.parentNode;
	if (parent instanceof ShadowRoot) {
		return parent.host;
	}
	return parent;
}
const now = Date.now;
function processTimeoutOptions(options_) {
	if (options_ && options_.timeout != null || provider$1 !== "playwright") {
		return options_;
	}
	// if there is a default action timeout, use it
	if (getWorkerState().config.browser.providerOptions.actionTimeout != null) {
		return options_;
	}
	const runner = getBrowserState().runner;
	const startTime = runner._currentTaskStartTime;
	// ignore timeout if this is called outside of a test
	if (!startTime) {
		return options_;
	}
	const timeout = runner._currentTaskTimeout;
	if (timeout === 0 || timeout == null || timeout === Number.POSITIVE_INFINITY) {
		return options_;
	}
	options_ = options_ || {};
	const currentTime = now();
	const endTime = startTime + timeout;
	const remainingTime = endTime - currentTime;
	if (remainingTime <= 0) {
		return options_;
	}
	// give us some time to process the timeout
	options_.timeout = remainingTime - 100;
	return options_;
}
function convertToSelector(elementOrLocator) {
	if (!elementOrLocator) {
		throw new Error("Expected element or locator to be defined.");
	}
	if (elementOrLocator instanceof Element) {
		return convertElementToCssSelector(elementOrLocator);
	}
	if (isLocator(elementOrLocator)) {
		return elementOrLocator.selector;
	}
	throw new Error("Expected element or locator to be an instance of Element or Locator.");
}
const kLocator = Symbol.for("$$vitest:locator");
function isLocator(element) {
	return !!element && typeof element === "object" && kLocator in element;
}

// this file should not import anything directly, only types and utils
// @ts-expect-error not typed global
const provider = __vitest_browser_runner__.provider;
const sessionId = getBrowserState().sessionId;
const channel = new BroadcastChannel(`vitest:${sessionId}`);
function triggerCommand(command, args, error) {
	return getBrowserState().commands.triggerCommand(command, args, error);
}
function createUserEvent(__tl_user_event_base__, options) {
	if (__tl_user_event_base__) {
		return createPreviewUserEvent(__tl_user_event_base__, options ?? {});
	}
	const keyboard = { unreleased: [] };
	// https://playwright.dev/docs/api/class-keyboard
	// https://webdriver.io/docs/api/browser/keys/
	const modifier = provider === "playwright" ? "ControlOrMeta" : provider === "webdriverio" ? "Ctrl" : "Control";
	const userEvent = {
		setup() {
			return createUserEvent();
		},
		async cleanup() {
			// avoid cleanup rpc call if there is nothing to cleanup
			if (!keyboard.unreleased.length) {
				return;
			}
			return ensureAwaited(async (error) => {
				await triggerCommand("__vitest_cleanup", [keyboard], error);
				keyboard.unreleased = [];
			});
		},
		click(element, options) {
			return convertToLocator(element).click(options);
		},
		dblClick(element, options) {
			return convertToLocator(element).dblClick(options);
		},
		tripleClick(element, options) {
			return convertToLocator(element).tripleClick(options);
		},
		selectOptions(element, value, options) {
			return convertToLocator(element).selectOptions(value, options);
		},
		clear(element, options) {
			return convertToLocator(element).clear(options);
		},
		hover(element, options) {
			return convertToLocator(element).hover(options);
		},
		unhover(element, options) {
			return convertToLocator(element).unhover(options);
		},
		upload(element, files, options) {
			return convertToLocator(element).upload(files, options);
		},
		fill(element, text, options) {
			return convertToLocator(element).fill(text, options);
		},
		dragAndDrop(source, target, options) {
			const sourceLocator = convertToLocator(source);
			const targetLocator = convertToLocator(target);
			return sourceLocator.dropTo(targetLocator, options);
		},
		async type(element, text, options) {
			return ensureAwaited(async (error) => {
				const selector = convertToSelector(element);
				const { unreleased } = await triggerCommand("__vitest_type", [
					selector,
					text,
					{
						...options,
						unreleased: keyboard.unreleased
					}
				], error);
				keyboard.unreleased = unreleased;
			});
		},
		tab(options = {}) {
			return ensureAwaited((error) => triggerCommand("__vitest_tab", [options], error));
		},
		async keyboard(text) {
			return ensureAwaited(async (error) => {
				const { unreleased } = await triggerCommand("__vitest_keyboard", [text, keyboard], error);
				keyboard.unreleased = unreleased;
			});
		},
		async copy() {
			await userEvent.keyboard(`{${modifier}>}{c}{/${modifier}}`);
		},
		async cut() {
			await userEvent.keyboard(`{${modifier}>}{x}{/${modifier}}`);
		},
		async paste() {
			await userEvent.keyboard(`{${modifier}>}{v}{/${modifier}}`);
		}
	};
	return userEvent;
}
function createPreviewUserEvent(userEventBase, options) {
	let userEvent = userEventBase.setup(options);
	let clipboardData;
	function toElement(element) {
		return element instanceof Element ? element : element.element();
	}
	const vitestUserEvent = {
		setup(options) {
			return createPreviewUserEvent(userEventBase, options);
		},
		async cleanup() {
			userEvent = userEventBase.setup(options ?? {});
		},
		async click(element) {
			await userEvent.click(toElement(element));
		},
		async dblClick(element) {
			await userEvent.dblClick(toElement(element));
		},
		async tripleClick(element) {
			await userEvent.tripleClick(toElement(element));
		},
		async selectOptions(element, value) {
			const options = (Array.isArray(value) ? value : [value]).map((option) => {
				if (typeof option !== "string") {
					return toElement(option);
				}
				return option;
			});
			await userEvent.selectOptions(toElement(element), options);
		},
		async clear(element) {
			await userEvent.clear(toElement(element));
		},
		async hover(element) {
			await userEvent.hover(toElement(element));
		},
		async unhover(element) {
			await userEvent.unhover(toElement(element));
		},
		async upload(element, files) {
			const uploadPromise = (Array.isArray(files) ? files : [files]).map(async (file) => {
				if (typeof file !== "string") {
					return file;
				}
				const { content: base64, basename, mime } = await triggerCommand("__vitest_fileInfo", [file, "base64"]);
				const fileInstance = fetch(`data:${mime};base64,${base64}`).then((r) => r.blob()).then((blob) => new File([blob], basename, { type: mime }));
				return fileInstance;
			});
			const uploadFiles = await Promise.all(uploadPromise);
			return userEvent.upload(toElement(element), uploadFiles);
		},
		async fill(element, text) {
			await userEvent.clear(toElement(element));
			return userEvent.type(toElement(element), text);
		},
		async dragAndDrop() {
			throw new Error(`The "preview" provider doesn't support 'userEvent.dragAndDrop'`);
		},
		async type(element, text, options) {
			await userEvent.type(toElement(element), text, options);
		},
		async tab(options) {
			await userEvent.tab(options);
		},
		async keyboard(text) {
			await userEvent.keyboard(text);
		},
		async copy() {
			clipboardData = await userEvent.copy();
		},
		async cut() {
			clipboardData = await userEvent.cut();
		},
		async paste() {
			await userEvent.paste(clipboardData);
		}
	};
	for (const [name, fn] of Object.entries(vitestUserEvent)) {
		if (name !== "setup") {
			vitestUserEvent[name] = function(...args) {
				return ensureAwaited(() => fn.apply(this, args));
			};
		}
	}
	return vitestUserEvent;
}
function cdp() {
	return getBrowserState().cdp;
}
const screenshotIds = {};
const page = {
	viewport(width, height) {
		const id = getBrowserState().iframeId;
		channel.postMessage({
			event: "viewport",
			width,
			height,
			iframeId: id
		});
		return new Promise((resolve, reject) => {
			channel.addEventListener("message", function handler(e) {
				if (e.data.event === "viewport:done" && e.data.iframeId === id) {
					channel.removeEventListener("message", handler);
					resolve();
				}
				if (e.data.event === "viewport:fail" && e.data.iframeId === id) {
					channel.removeEventListener("message", handler);
					reject(new Error(e.data.error));
				}
			});
		});
	},
	async screenshot(options = {}) {
		const currentTest = getWorkerState().current;
		if (!currentTest) {
			throw new Error("Cannot take a screenshot outside of a test.");
		}
		if (currentTest.concurrent) {
			throw new Error("Cannot take a screenshot in a concurrent test because " + "concurrent tests run at the same time in the same iframe and affect each other's environment. " + "Use a non-concurrent test to take a screenshot.");
		}
		const repeatCount = currentTest.result?.repeatCount ?? 0;
		const taskName = getTaskFullName(currentTest);
		const number = screenshotIds[repeatCount]?.[taskName] ?? 1;
		screenshotIds[repeatCount] ??= {};
		screenshotIds[repeatCount][taskName] = number + 1;
		const name = options.path || `${taskName.replace(/[^a-z0-9]/gi, "-")}-${number}.png`;
		const normalizedOptions = "mask" in options ? {
			...options,
			mask: options.mask.map(convertToSelector)
		} : options;
		return ensureAwaited((error) => triggerCommand("__vitest_screenshot", [name, processTimeoutOptions(
			{
				...normalizedOptions,
				element: options.element ? convertToSelector(options.element) : undefined
			}
			/** TODO */
		)], error));
	},
	getByRole() {
		throw new Error(`Method "getByRole" is not supported by the "${provider}" provider.`);
	},
	getByLabelText() {
		throw new Error(`Method "getByLabelText" is not supported by the "${provider}" provider.`);
	},
	getByTestId() {
		throw new Error(`Method "getByTestId" is not supported by the "${provider}" provider.`);
	},
	getByAltText() {
		throw new Error(`Method "getByAltText" is not supported by the "${provider}" provider.`);
	},
	getByPlaceholder() {
		throw new Error(`Method "getByPlaceholder" is not supported by the "${provider}" provider.`);
	},
	getByText() {
		throw new Error(`Method "getByText" is not supported by the "${provider}" provider.`);
	},
	getByTitle() {
		throw new Error(`Method "getByTitle" is not supported by the "${provider}" provider.`);
	},
	elementLocator() {
		throw new Error(`Method "elementLocator" is not supported by the "${provider}" provider.`);
	},
	frameLocator() {
		throw new Error(`Method "frameLocator" is not supported by the "${provider}" provider.`);
	},
	extend(methods) {
		for (const key in methods) {
			page[key] = methods[key].bind(page);
		}
		return page;
	}
};
function convertToLocator(element) {
	if (element instanceof Element) {
		return page.elementLocator(element);
	}
	return element;
}
function getTaskFullName(task) {
	return task.suite ? `${getTaskFullName(task.suite)} ${task.name}` : task.name;
}
const locators = {
	createElementLocators: getElementLocatorSelectors,
	extend(methods) {
		const Locator = __INTERNAL._createLocator("css=body").constructor;
		for (const method in methods) {
			__INTERNAL._extendedMethods.add(method);
			const cb = methods[method];
			// @ts-expect-error types are hard to make work
			Locator.prototype[method] = function(...args) {
				const selectorOrLocator = cb.call(this, ...args);
				if (typeof selectorOrLocator === "string") {
					return this.locator(selectorOrLocator);
				}
				return selectorOrLocator;
			};
			page[method] = function(...args) {
				const selectorOrLocator = cb.call(this, ...args);
				if (typeof selectorOrLocator === "string") {
					return __INTERNAL._createLocator(selectorOrLocator);
				}
				return selectorOrLocator;
			};
		}
	}
};
function getElementLocatorSelectors(element) {
	const locator = page.elementLocator(element);
	return {
		getByAltText: (altText, options) => locator.getByAltText(altText, options),
		getByLabelText: (labelText, options) => locator.getByLabelText(labelText, options),
		getByPlaceholder: (placeholderText, options) => locator.getByPlaceholder(placeholderText, options),
		getByRole: (role, options) => locator.getByRole(role, options),
		getByTestId: (testId) => locator.getByTestId(testId),
		getByText: (text, options) => locator.getByText(text, options),
		getByTitle: (title, options) => locator.getByTitle(title, options),
		...Array.from(__INTERNAL._extendedMethods).reduce((methods, method) => {
			methods[method] = (...args) => locator[method](...args);
			return methods;
		}, {})
	};
}
let defaultOptions;
function debug(el, maxLength, options) {
	if (Array.isArray(el)) {
		// eslint-disable-next-line no-console
		el.forEach((e) => console.log(prettyDOM(e, maxLength, options)));
	} else {
		// eslint-disable-next-line no-console
		console.log(prettyDOM(el, maxLength, options));
	}
}
function prettyDOM(dom, maxLength = Number(defaultOptions?.maxLength ?? import.meta.env.DEBUG_PRINT_LIMIT ?? 7e3), prettyFormatOptions = {}) {
	if (maxLength === 0) {
		return "";
	}
	if (!dom) {
		dom = document.body;
	}
	if ("element" in dom && "all" in dom) {
		dom = dom.element();
	}
	const type = typeof dom;
	if (type !== "object" || !dom.outerHTML) {
		const typeName = type === "object" ? dom.constructor.name : type;
		throw new TypeError(`Expecting a valid DOM element, but got ${typeName}.`);
	}
	const pretty = stringify(dom, Number.POSITIVE_INFINITY, {
		maxLength,
		highlight: true,
		...defaultOptions,
		...prettyFormatOptions
	});
	return dom.outerHTML.length > maxLength ? `${pretty.slice(0, maxLength)}...` : pretty;
}
function getElementError(selector, container) {
	const error = new Error(`Cannot find element with locator: ${__INTERNAL._asLocator("javascript", selector)}\n\n${prettyDOM(container)}`);
	error.name = "VitestBrowserElementError";
	return error;
}
/**
* @experimental
*/
function configurePrettyDOM(options) {
	defaultOptions = options;
}
const utils = {
	getElementError,
	prettyDOM,
	debug,
	getElementLocatorSelectors,
	configurePrettyDOM
};

export { cdp, createUserEvent, locators, page, utils };
