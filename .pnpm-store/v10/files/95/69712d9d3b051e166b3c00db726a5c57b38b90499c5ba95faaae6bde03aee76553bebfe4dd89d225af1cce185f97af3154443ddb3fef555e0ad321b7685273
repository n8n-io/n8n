(function(exports, __vueuse_shared, vue) {

//#region rolldown:runtime
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys$1 = __getOwnPropNames(from), i = 0, n = keys$1.length, key; i < n; i++) {
			key = keys$1[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

//#endregion
__vueuse_shared = __toESM(__vueuse_shared);
vue = __toESM(vue);

//#region computedAsync/index.ts
	function computedAsync(evaluationCallback, initialState, optionsOrRef) {
		var _globalThis$reportErr;
		let options;
		if ((0, vue.isRef)(optionsOrRef)) options = { evaluating: optionsOrRef };
		else options = optionsOrRef || {};
		const { lazy = false, flush = "sync", evaluating = void 0, shallow = true, onError = (_globalThis$reportErr = globalThis.reportError) !== null && _globalThis$reportErr !== void 0 ? _globalThis$reportErr : __vueuse_shared.noop } = options;
		const started = (0, vue.shallowRef)(!lazy);
		const current = shallow ? (0, vue.shallowRef)(initialState) : (0, vue.ref)(initialState);
		let counter = 0;
		(0, vue.watchEffect)(async (onInvalidate) => {
			if (!started.value) return;
			counter++;
			const counterAtBeginning = counter;
			let hasFinished = false;
			if (evaluating) Promise.resolve().then(() => {
				evaluating.value = true;
			});
			try {
				const result = await evaluationCallback((cancelCallback) => {
					onInvalidate(() => {
						if (evaluating) evaluating.value = false;
						if (!hasFinished) cancelCallback();
					});
				});
				if (counterAtBeginning === counter) current.value = result;
			} catch (e) {
				onError(e);
			} finally {
				if (evaluating && counterAtBeginning === counter) evaluating.value = false;
				hasFinished = true;
			}
		}, { flush });
		if (lazy) return (0, vue.computed)(() => {
			started.value = true;
			return current.value;
		});
		else return current;
	}
	/** @deprecated use `computedAsync` instead */
	const asyncComputed = computedAsync;

//#endregion
//#region computedInject/index.ts
	function computedInject(key, options, defaultSource, treatDefaultAsFactory) {
		let source = (0, vue.inject)(key);
		if (defaultSource) source = (0, vue.inject)(key, defaultSource);
		if (treatDefaultAsFactory) source = (0, vue.inject)(key, defaultSource, treatDefaultAsFactory);
		if (typeof options === "function") return (0, vue.computed)((oldValue) => options(source, oldValue));
		else return (0, vue.computed)({
			get: (oldValue) => options.get(source, oldValue),
			set: options.set
		});
	}

//#endregion
//#region createReusableTemplate/index.ts
/**
	* This function creates `define` and `reuse` components in pair,
	* It also allow to pass a generic to bind with type.
	*
	* @see https://vueuse.org/createReusableTemplate
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function createReusableTemplate(options = {}) {
		const { inheritAttrs = true } = options;
		const render = (0, vue.shallowRef)();
		const define = (0, vue.defineComponent)({ setup(_, { slots }) {
			return () => {
				render.value = slots.default;
			};
		} });
		const reuse = (0, vue.defineComponent)({
			inheritAttrs,
			props: options.props,
			setup(props, { attrs, slots }) {
				return () => {
					var _render$value;
					if (!render.value && true) throw new Error("[VueUse] Failed to find the definition of reusable template");
					const vnode = (_render$value = render.value) === null || _render$value === void 0 ? void 0 : _render$value.call(render, {
						...options.props == null ? keysToCamelKebabCase(attrs) : props,
						$slots: slots
					});
					return inheritAttrs && (vnode === null || vnode === void 0 ? void 0 : vnode.length) === 1 ? vnode[0] : vnode;
				};
			}
		});
		return (0, __vueuse_shared.makeDestructurable)({
			define,
			reuse
		}, [define, reuse]);
	}
	function keysToCamelKebabCase(obj) {
		const newObj = {};
		for (const key in obj) newObj[(0, __vueuse_shared.camelize)(key)] = obj[key];
		return newObj;
	}

//#endregion
//#region createTemplatePromise/index.ts
/**
	* Creates a template promise component.
	*
	* @see https://vueuse.org/createTemplatePromise
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function createTemplatePromise(options = {}) {
		let index = 0;
		const instances = (0, vue.ref)([]);
		function create(...args) {
			const props = (0, vue.shallowReactive)({
				key: index++,
				args,
				promise: void 0,
				resolve: () => {},
				reject: () => {},
				isResolving: false,
				options
			});
			instances.value.push(props);
			props.promise = new Promise((_resolve, _reject) => {
				props.resolve = (v) => {
					props.isResolving = true;
					return _resolve(v);
				};
				props.reject = _reject;
			}).finally(() => {
				props.promise = void 0;
				const index$1 = instances.value.indexOf(props);
				if (index$1 !== -1) instances.value.splice(index$1, 1);
			});
			return props.promise;
		}
		function start(...args) {
			if (options.singleton && instances.value.length > 0) return instances.value[0].promise;
			return create(...args);
		}
		const component = (0, vue.defineComponent)((_, { slots }) => {
			const renderList = () => instances.value.map((props) => {
				var _slots$default;
				return (0, vue.h)(vue.Fragment, { key: props.key }, (_slots$default = slots.default) === null || _slots$default === void 0 ? void 0 : _slots$default.call(slots, props));
			});
			if (options.transition) return () => (0, vue.h)(vue.TransitionGroup, options.transition, renderList);
			return renderList;
		});
		component.start = start;
		return component;
	}

//#endregion
//#region createUnrefFn/index.ts
/**
	* Make a plain function accepting ref and raw values as arguments.
	* Returns the same value the unconverted function returns, with proper typing.
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function createUnrefFn(fn) {
		return function(...args) {
			return fn.apply(this, args.map((i) => (0, vue.toValue)(i)));
		};
	}

//#endregion
//#region _configurable.ts
	const defaultWindow = __vueuse_shared.isClient ? window : void 0;
	const defaultDocument = __vueuse_shared.isClient ? window.document : void 0;
	const defaultNavigator = __vueuse_shared.isClient ? window.navigator : void 0;
	const defaultLocation = __vueuse_shared.isClient ? window.location : void 0;

//#endregion
//#region unrefElement/index.ts
/**
	* Get the dom element of a ref of element or Vue component instance
	*
	* @param elRef
	*/
	function unrefElement(elRef) {
		var _$el;
		const plain = (0, vue.toValue)(elRef);
		return (_$el = plain === null || plain === void 0 ? void 0 : plain.$el) !== null && _$el !== void 0 ? _$el : plain;
	}

//#endregion
//#region useEventListener/index.ts
	function useEventListener(...args) {
		const register = (el, event, listener, options) => {
			el.addEventListener(event, listener, options);
			return () => el.removeEventListener(event, listener, options);
		};
		const firstParamTargets = (0, vue.computed)(() => {
			const test = (0, __vueuse_shared.toArray)((0, vue.toValue)(args[0])).filter((e) => e != null);
			return test.every((e) => typeof e !== "string") ? test : void 0;
		});
		return (0, __vueuse_shared.watchImmediate)(() => {
			var _firstParamTargets$va, _firstParamTargets$va2;
			return [
				(_firstParamTargets$va = (_firstParamTargets$va2 = firstParamTargets.value) === null || _firstParamTargets$va2 === void 0 ? void 0 : _firstParamTargets$va2.map((e) => unrefElement(e))) !== null && _firstParamTargets$va !== void 0 ? _firstParamTargets$va : [defaultWindow].filter((e) => e != null),
				(0, __vueuse_shared.toArray)((0, vue.toValue)(firstParamTargets.value ? args[1] : args[0])),
				(0, __vueuse_shared.toArray)((0, vue.unref)(firstParamTargets.value ? args[2] : args[1])),
				(0, vue.toValue)(firstParamTargets.value ? args[3] : args[2])
			];
		}, ([raw_targets, raw_events, raw_listeners, raw_options], _, onCleanup) => {
			if (!(raw_targets === null || raw_targets === void 0 ? void 0 : raw_targets.length) || !(raw_events === null || raw_events === void 0 ? void 0 : raw_events.length) || !(raw_listeners === null || raw_listeners === void 0 ? void 0 : raw_listeners.length)) return;
			const optionsClone = (0, __vueuse_shared.isObject)(raw_options) ? { ...raw_options } : raw_options;
			const cleanups = raw_targets.flatMap((el) => raw_events.flatMap((event) => raw_listeners.map((listener) => register(el, event, listener, optionsClone))));
			onCleanup(() => {
				cleanups.forEach((fn) => fn());
			});
		}, { flush: "post" });
	}

//#endregion
//#region onClickOutside/index.ts
	let _iOSWorkaround = false;
	function onClickOutside(target, handler, options = {}) {
		const { window: window$1 = defaultWindow, ignore = [], capture = true, detectIframe = false, controls = false } = options;
		if (!window$1) return controls ? {
			stop: __vueuse_shared.noop,
			cancel: __vueuse_shared.noop,
			trigger: __vueuse_shared.noop
		} : __vueuse_shared.noop;
		if (__vueuse_shared.isIOS && !_iOSWorkaround) {
			_iOSWorkaround = true;
			const listenerOptions = { passive: true };
			Array.from(window$1.document.body.children).forEach((el) => el.addEventListener("click", __vueuse_shared.noop, listenerOptions));
			window$1.document.documentElement.addEventListener("click", __vueuse_shared.noop, listenerOptions);
		}
		let shouldListen = true;
		const shouldIgnore = (event) => {
			return (0, vue.toValue)(ignore).some((target$1) => {
				if (typeof target$1 === "string") return Array.from(window$1.document.querySelectorAll(target$1)).some((el) => el === event.target || event.composedPath().includes(el));
				else {
					const el = unrefElement(target$1);
					return el && (event.target === el || event.composedPath().includes(el));
				}
			});
		};
		/**
		* Determines if the given target has multiple root elements.
		* Referenced from: https://github.com/vuejs/test-utils/blob/ccb460be55f9f6be05ab708500a41ec8adf6f4bc/src/vue-wrapper.ts#L21
		*/
		function hasMultipleRoots(target$1) {
			const vm = (0, vue.toValue)(target$1);
			return vm && vm.$.subTree.shapeFlag === 16;
		}
		function checkMultipleRoots(target$1, event) {
			const vm = (0, vue.toValue)(target$1);
			const children = vm.$.subTree && vm.$.subTree.children;
			if (children == null || !Array.isArray(children)) return false;
			return children.some((child) => child.el === event.target || event.composedPath().includes(child.el));
		}
		const listener = (event) => {
			const el = unrefElement(target);
			if (event.target == null) return;
			if (!(el instanceof Element) && hasMultipleRoots(target) && checkMultipleRoots(target, event)) return;
			if (!el || el === event.target || event.composedPath().includes(el)) return;
			if ("detail" in event && event.detail === 0) shouldListen = !shouldIgnore(event);
			if (!shouldListen) {
				shouldListen = true;
				return;
			}
			handler(event);
		};
		let isProcessingClick = false;
		const cleanup = [
			useEventListener(window$1, "click", (event) => {
				if (!isProcessingClick) {
					isProcessingClick = true;
					setTimeout(() => {
						isProcessingClick = false;
					}, 0);
					listener(event);
				}
			}, {
				passive: true,
				capture
			}),
			useEventListener(window$1, "pointerdown", (e) => {
				const el = unrefElement(target);
				shouldListen = !shouldIgnore(e) && !!(el && !e.composedPath().includes(el));
			}, { passive: true }),
			detectIframe && useEventListener(window$1, "blur", (event) => {
				setTimeout(() => {
					var _window$document$acti;
					const el = unrefElement(target);
					if (((_window$document$acti = window$1.document.activeElement) === null || _window$document$acti === void 0 ? void 0 : _window$document$acti.tagName) === "IFRAME" && !(el === null || el === void 0 ? void 0 : el.contains(window$1.document.activeElement))) handler(event);
				}, 0);
			}, { passive: true })
		].filter(Boolean);
		const stop = () => cleanup.forEach((fn) => fn());
		if (controls) return {
			stop,
			cancel: () => {
				shouldListen = false;
			},
			trigger: (event) => {
				shouldListen = true;
				listener(event);
				shouldListen = false;
			}
		};
		return stop;
	}

//#endregion
//#region useMounted/index.ts
/**
	* Mounted state in ref.
	*
	* @see https://vueuse.org/useMounted
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useMounted() {
		const isMounted = (0, vue.shallowRef)(false);
		const instance = (0, vue.getCurrentInstance)();
		if (instance) (0, vue.onMounted)(() => {
			isMounted.value = true;
		}, instance);
		return isMounted;
	}

//#endregion
//#region useSupported/index.ts
	/* @__NO_SIDE_EFFECTS__ */
	function useSupported(callback) {
		const isMounted = useMounted();
		return (0, vue.computed)(() => {
			isMounted.value;
			return Boolean(callback());
		});
	}

//#endregion
//#region useMutationObserver/index.ts
/**
	* Watch for changes being made to the DOM tree.
	*
	* @see https://vueuse.org/useMutationObserver
	* @see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver MutationObserver MDN
	* @param target
	* @param callback
	* @param options
	*/
	function useMutationObserver(target, callback, options = {}) {
		const { window: window$1 = defaultWindow,...mutationOptions } = options;
		let observer;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "MutationObserver" in window$1);
		const cleanup = () => {
			if (observer) {
				observer.disconnect();
				observer = void 0;
			}
		};
		const stopWatch = (0, vue.watch)((0, vue.computed)(() => {
			const items = (0, __vueuse_shared.toArray)((0, vue.toValue)(target)).map(unrefElement).filter(__vueuse_shared.notNullish);
			return new Set(items);
		}), (newTargets) => {
			cleanup();
			if (isSupported.value && newTargets.size) {
				observer = new MutationObserver(callback);
				newTargets.forEach((el) => observer.observe(el, mutationOptions));
			}
		}, {
			immediate: true,
			flush: "post"
		});
		const takeRecords = () => {
			return observer === null || observer === void 0 ? void 0 : observer.takeRecords();
		};
		const stop = () => {
			stopWatch();
			cleanup();
		};
		(0, __vueuse_shared.tryOnScopeDispose)(stop);
		return {
			isSupported,
			stop,
			takeRecords
		};
	}

//#endregion
//#region onElementRemoval/index.ts
/**
	* Fires when the element or any element containing it is removed.
	*
	* @param target
	* @param callback
	* @param options
	*/
	function onElementRemoval(target, callback, options = {}) {
		const { window: window$1 = defaultWindow, document: document$1 = window$1 === null || window$1 === void 0 ? void 0 : window$1.document, flush = "sync" } = options;
		if (!window$1 || !document$1) return __vueuse_shared.noop;
		let stopFn;
		const cleanupAndUpdate = (fn) => {
			stopFn === null || stopFn === void 0 || stopFn();
			stopFn = fn;
		};
		const stopWatch = (0, vue.watchEffect)(() => {
			const el = unrefElement(target);
			if (el) {
				const { stop } = useMutationObserver(document$1, (mutationsList) => {
					if (mutationsList.map((mutation) => [...mutation.removedNodes]).flat().some((node) => node === el || node.contains(el))) callback(mutationsList);
				}, {
					window: window$1,
					childList: true,
					subtree: true
				});
				cleanupAndUpdate(stop);
			}
		}, { flush });
		const stopHandle = () => {
			stopWatch();
			cleanupAndUpdate();
		};
		(0, __vueuse_shared.tryOnScopeDispose)(stopHandle);
		return stopHandle;
	}

//#endregion
//#region onKeyStroke/index.ts
	function createKeyPredicate(keyFilter) {
		if (typeof keyFilter === "function") return keyFilter;
		else if (typeof keyFilter === "string") return (event) => event.key === keyFilter;
		else if (Array.isArray(keyFilter)) return (event) => keyFilter.includes(event.key);
		return () => true;
	}
	function onKeyStroke(...args) {
		let key;
		let handler;
		let options = {};
		if (args.length === 3) {
			key = args[0];
			handler = args[1];
			options = args[2];
		} else if (args.length === 2) if (typeof args[1] === "object") {
			key = true;
			handler = args[0];
			options = args[1];
		} else {
			key = args[0];
			handler = args[1];
		}
		else {
			key = true;
			handler = args[0];
		}
		const { target = defaultWindow, eventName = "keydown", passive = false, dedupe = false } = options;
		const predicate = createKeyPredicate(key);
		const listener = (e) => {
			if (e.repeat && (0, vue.toValue)(dedupe)) return;
			if (predicate(e)) handler(e);
		};
		return useEventListener(target, eventName, listener, passive);
	}
	/**
	* Listen to the keydown event of the given key.
	*
	* @see https://vueuse.org/onKeyStroke
	* @param key
	* @param handler
	* @param options
	*/
	function onKeyDown(key, handler, options = {}) {
		return onKeyStroke(key, handler, {
			...options,
			eventName: "keydown"
		});
	}
	/**
	* Listen to the keypress event of the given key.
	*
	* @see https://vueuse.org/onKeyStroke
	* @param key
	* @param handler
	* @param options
	*/
	function onKeyPressed(key, handler, options = {}) {
		return onKeyStroke(key, handler, {
			...options,
			eventName: "keypress"
		});
	}
	/**
	* Listen to the keyup event of the given key.
	*
	* @see https://vueuse.org/onKeyStroke
	* @param key
	* @param handler
	* @param options
	*/
	function onKeyUp(key, handler, options = {}) {
		return onKeyStroke(key, handler, {
			...options,
			eventName: "keyup"
		});
	}

//#endregion
//#region onLongPress/index.ts
	const DEFAULT_DELAY = 500;
	const DEFAULT_THRESHOLD = 10;
	function onLongPress(target, handler, options) {
		var _options$modifiers10, _options$modifiers11;
		const elementRef = (0, vue.computed)(() => unrefElement(target));
		let timeout;
		let posStart;
		let startTimestamp;
		let hasLongPressed = false;
		function clear() {
			if (timeout) {
				clearTimeout(timeout);
				timeout = void 0;
			}
			posStart = void 0;
			startTimestamp = void 0;
			hasLongPressed = false;
		}
		function getDelay(ev) {
			const delay = options === null || options === void 0 ? void 0 : options.delay;
			if (typeof delay === "function") return delay(ev);
			return delay !== null && delay !== void 0 ? delay : DEFAULT_DELAY;
		}
		function onRelease(ev) {
			var _options$modifiers, _options$modifiers2, _options$modifiers3;
			const [_startTimestamp, _posStart, _hasLongPressed] = [
				startTimestamp,
				posStart,
				hasLongPressed
			];
			clear();
			if (!(options === null || options === void 0 ? void 0 : options.onMouseUp) || !_posStart || !_startTimestamp) return;
			if ((options === null || options === void 0 || (_options$modifiers = options.modifiers) === null || _options$modifiers === void 0 ? void 0 : _options$modifiers.self) && ev.target !== elementRef.value) return;
			if (options === null || options === void 0 || (_options$modifiers2 = options.modifiers) === null || _options$modifiers2 === void 0 ? void 0 : _options$modifiers2.prevent) ev.preventDefault();
			if (options === null || options === void 0 || (_options$modifiers3 = options.modifiers) === null || _options$modifiers3 === void 0 ? void 0 : _options$modifiers3.stop) ev.stopPropagation();
			const dx = ev.x - _posStart.x;
			const dy = ev.y - _posStart.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			options.onMouseUp(ev.timeStamp - _startTimestamp, distance, _hasLongPressed);
		}
		function onDown(ev) {
			var _options$modifiers4, _options$modifiers5, _options$modifiers6;
			if ((options === null || options === void 0 || (_options$modifiers4 = options.modifiers) === null || _options$modifiers4 === void 0 ? void 0 : _options$modifiers4.self) && ev.target !== elementRef.value) return;
			clear();
			if (options === null || options === void 0 || (_options$modifiers5 = options.modifiers) === null || _options$modifiers5 === void 0 ? void 0 : _options$modifiers5.prevent) ev.preventDefault();
			if (options === null || options === void 0 || (_options$modifiers6 = options.modifiers) === null || _options$modifiers6 === void 0 ? void 0 : _options$modifiers6.stop) ev.stopPropagation();
			posStart = {
				x: ev.x,
				y: ev.y
			};
			startTimestamp = ev.timeStamp;
			timeout = setTimeout(() => {
				hasLongPressed = true;
				handler(ev);
			}, getDelay(ev));
		}
		function onMove(ev) {
			var _options$modifiers7, _options$modifiers8, _options$modifiers9, _options$distanceThre;
			if ((options === null || options === void 0 || (_options$modifiers7 = options.modifiers) === null || _options$modifiers7 === void 0 ? void 0 : _options$modifiers7.self) && ev.target !== elementRef.value) return;
			if (!posStart || (options === null || options === void 0 ? void 0 : options.distanceThreshold) === false) return;
			if (options === null || options === void 0 || (_options$modifiers8 = options.modifiers) === null || _options$modifiers8 === void 0 ? void 0 : _options$modifiers8.prevent) ev.preventDefault();
			if (options === null || options === void 0 || (_options$modifiers9 = options.modifiers) === null || _options$modifiers9 === void 0 ? void 0 : _options$modifiers9.stop) ev.stopPropagation();
			const dx = ev.x - posStart.x;
			const dy = ev.y - posStart.y;
			if (Math.sqrt(dx * dx + dy * dy) >= ((_options$distanceThre = options === null || options === void 0 ? void 0 : options.distanceThreshold) !== null && _options$distanceThre !== void 0 ? _options$distanceThre : DEFAULT_THRESHOLD)) clear();
		}
		const listenerOptions = {
			capture: options === null || options === void 0 || (_options$modifiers10 = options.modifiers) === null || _options$modifiers10 === void 0 ? void 0 : _options$modifiers10.capture,
			once: options === null || options === void 0 || (_options$modifiers11 = options.modifiers) === null || _options$modifiers11 === void 0 ? void 0 : _options$modifiers11.once
		};
		const cleanup = [
			useEventListener(elementRef, "pointerdown", onDown, listenerOptions),
			useEventListener(elementRef, "pointermove", onMove, listenerOptions),
			useEventListener(elementRef, ["pointerup", "pointerleave"], onRelease, listenerOptions)
		];
		const stop = () => cleanup.forEach((fn) => fn());
		return stop;
	}

//#endregion
//#region onStartTyping/index.ts
	function isFocusedElementEditable() {
		const { activeElement, body } = document;
		if (!activeElement) return false;
		if (activeElement === body) return false;
		switch (activeElement.tagName) {
			case "INPUT":
			case "TEXTAREA": return true;
		}
		return activeElement.hasAttribute("contenteditable");
	}
	function isTypedCharValid({ keyCode, metaKey, ctrlKey, altKey }) {
		if (metaKey || ctrlKey || altKey) return false;
		if (keyCode >= 48 && keyCode <= 57 || keyCode >= 96 && keyCode <= 105) return true;
		if (keyCode >= 65 && keyCode <= 90) return true;
		return false;
	}
	/**
	* Fires when users start typing on non-editable elements.
	*
	* @see https://vueuse.org/onStartTyping
	* @param callback
	* @param options
	*/
	function onStartTyping(callback, options = {}) {
		const { document: document$1 = defaultDocument } = options;
		const keydown = (event) => {
			if (!isFocusedElementEditable() && isTypedCharValid(event)) callback(event);
		};
		if (document$1) useEventListener(document$1, "keydown", keydown, { passive: true });
	}

//#endregion
//#region templateRef/index.ts
/**
	* @deprecated Use Vue's built-in `useTemplateRef` instead.
	*
	* Shorthand for binding ref to template element.
	*
	* @see https://vueuse.org/templateRef
	* @param key
	* @param initialValue
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function templateRef(key, initialValue = null) {
		const instance = (0, vue.getCurrentInstance)();
		let _trigger = () => {};
		const element = (0, vue.customRef)((track, trigger) => {
			_trigger = trigger;
			return {
				get() {
					var _instance$proxy$$refs, _instance$proxy;
					track();
					return (_instance$proxy$$refs = instance === null || instance === void 0 || (_instance$proxy = instance.proxy) === null || _instance$proxy === void 0 ? void 0 : _instance$proxy.$refs[key]) !== null && _instance$proxy$$refs !== void 0 ? _instance$proxy$$refs : initialValue;
				},
				set() {}
			};
		});
		(0, __vueuse_shared.tryOnMounted)(_trigger);
		(0, vue.onUpdated)(_trigger);
		return element;
	}

//#endregion
//#region useActiveElement/index.ts
/**
	* Reactive `document.activeElement`
	*
	* @see https://vueuse.org/useActiveElement
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useActiveElement(options = {}) {
		var _options$document;
		const { window: window$1 = defaultWindow, deep = true, triggerOnRemoval = false } = options;
		const document$1 = (_options$document = options.document) !== null && _options$document !== void 0 ? _options$document : window$1 === null || window$1 === void 0 ? void 0 : window$1.document;
		const getDeepActiveElement = () => {
			let element = document$1 === null || document$1 === void 0 ? void 0 : document$1.activeElement;
			if (deep) {
				var _element$shadowRoot;
				while (element === null || element === void 0 ? void 0 : element.shadowRoot) element = element === null || element === void 0 || (_element$shadowRoot = element.shadowRoot) === null || _element$shadowRoot === void 0 ? void 0 : _element$shadowRoot.activeElement;
			}
			return element;
		};
		const activeElement = (0, vue.shallowRef)();
		const trigger = () => {
			activeElement.value = getDeepActiveElement();
		};
		if (window$1) {
			const listenerOptions = {
				capture: true,
				passive: true
			};
			useEventListener(window$1, "blur", (event) => {
				if (event.relatedTarget !== null) return;
				trigger();
			}, listenerOptions);
			useEventListener(window$1, "focus", trigger, listenerOptions);
		}
		if (triggerOnRemoval) onElementRemoval(activeElement, trigger, { document: document$1 });
		trigger();
		return activeElement;
	}

//#endregion
//#region useRafFn/index.ts
/**
	* Call function on every `requestAnimationFrame`. With controls of pausing and resuming.
	*
	* @see https://vueuse.org/useRafFn
	* @param fn
	* @param options
	*/
	function useRafFn(fn, options = {}) {
		const { immediate = true, fpsLimit = null, window: window$1 = defaultWindow, once = false } = options;
		const isActive = (0, vue.shallowRef)(false);
		const intervalLimit = (0, vue.computed)(() => {
			const limit = (0, vue.toValue)(fpsLimit);
			return limit ? 1e3 / limit : null;
		});
		let previousFrameTimestamp = 0;
		let rafId = null;
		function loop(timestamp$3) {
			if (!isActive.value || !window$1) return;
			if (!previousFrameTimestamp) previousFrameTimestamp = timestamp$3;
			const delta = timestamp$3 - previousFrameTimestamp;
			if (intervalLimit.value && delta < intervalLimit.value) {
				rafId = window$1.requestAnimationFrame(loop);
				return;
			}
			previousFrameTimestamp = timestamp$3;
			fn({
				delta,
				timestamp: timestamp$3
			});
			if (once) {
				isActive.value = false;
				rafId = null;
				return;
			}
			rafId = window$1.requestAnimationFrame(loop);
		}
		function resume() {
			if (!isActive.value && window$1) {
				isActive.value = true;
				previousFrameTimestamp = 0;
				rafId = window$1.requestAnimationFrame(loop);
			}
		}
		function pause() {
			isActive.value = false;
			if (rafId != null && window$1) {
				window$1.cancelAnimationFrame(rafId);
				rafId = null;
			}
		}
		if (immediate) resume();
		(0, __vueuse_shared.tryOnScopeDispose)(pause);
		return {
			isActive: (0, vue.readonly)(isActive),
			pause,
			resume
		};
	}

//#endregion
//#region useAnimate/index.ts
/**
	* Reactive Web Animations API
	*
	* @see https://vueuse.org/useAnimate
	* @param target
	* @param keyframes
	* @param options
	*/
	function useAnimate(target, keyframes, options) {
		let config;
		let animateOptions;
		if ((0, __vueuse_shared.isObject)(options)) {
			config = options;
			animateOptions = (0, __vueuse_shared.objectOmit)(options, [
				"window",
				"immediate",
				"commitStyles",
				"persist",
				"onReady",
				"onError"
			]);
		} else {
			config = { duration: options };
			animateOptions = options;
		}
		const { window: window$1 = defaultWindow, immediate = true, commitStyles, persist, playbackRate: _playbackRate = 1, onReady, onError = (e) => {
			console.error(e);
		} } = config;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && HTMLElement && "animate" in HTMLElement.prototype);
		const animate = (0, vue.shallowRef)(void 0);
		const store = (0, vue.shallowReactive)({
			startTime: null,
			currentTime: null,
			timeline: null,
			playbackRate: _playbackRate,
			pending: false,
			playState: immediate ? "idle" : "paused",
			replaceState: "active"
		});
		const pending = (0, vue.computed)(() => store.pending);
		const playState = (0, vue.computed)(() => store.playState);
		const replaceState = (0, vue.computed)(() => store.replaceState);
		const startTime = (0, vue.computed)({
			get() {
				return store.startTime;
			},
			set(value) {
				store.startTime = value;
				if (animate.value) animate.value.startTime = value;
			}
		});
		const currentTime = (0, vue.computed)({
			get() {
				return store.currentTime;
			},
			set(value) {
				store.currentTime = value;
				if (animate.value) {
					animate.value.currentTime = value;
					syncResume();
				}
			}
		});
		const timeline = (0, vue.computed)({
			get() {
				return store.timeline;
			},
			set(value) {
				store.timeline = value;
				if (animate.value) animate.value.timeline = value;
			}
		});
		const playbackRate = (0, vue.computed)({
			get() {
				return store.playbackRate;
			},
			set(value) {
				store.playbackRate = value;
				if (animate.value) animate.value.playbackRate = value;
			}
		});
		const play = () => {
			if (animate.value) try {
				animate.value.play();
				syncResume();
			} catch (e) {
				syncPause();
				onError(e);
			}
			else update();
		};
		const pause = () => {
			try {
				var _animate$value;
				(_animate$value = animate.value) === null || _animate$value === void 0 || _animate$value.pause();
				syncPause();
			} catch (e) {
				onError(e);
			}
		};
		const reverse = () => {
			if (!animate.value) update();
			try {
				var _animate$value2;
				(_animate$value2 = animate.value) === null || _animate$value2 === void 0 || _animate$value2.reverse();
				syncResume();
			} catch (e) {
				syncPause();
				onError(e);
			}
		};
		const finish = () => {
			try {
				var _animate$value3;
				(_animate$value3 = animate.value) === null || _animate$value3 === void 0 || _animate$value3.finish();
				syncPause();
			} catch (e) {
				onError(e);
			}
		};
		const cancel = () => {
			try {
				var _animate$value4;
				(_animate$value4 = animate.value) === null || _animate$value4 === void 0 || _animate$value4.cancel();
				syncPause();
			} catch (e) {
				onError(e);
			}
		};
		(0, vue.watch)(() => unrefElement(target), (el) => {
			if (el) update(true);
			else animate.value = void 0;
		});
		(0, vue.watch)(() => keyframes, (value) => {
			if (animate.value) {
				update();
				const targetEl = unrefElement(target);
				if (targetEl) animate.value.effect = new KeyframeEffect(targetEl, (0, vue.toValue)(value), animateOptions);
			}
		}, { deep: true });
		(0, __vueuse_shared.tryOnMounted)(() => update(true), false);
		(0, __vueuse_shared.tryOnScopeDispose)(cancel);
		function update(init) {
			const el = unrefElement(target);
			if (!isSupported.value || !el) return;
			if (!animate.value) animate.value = el.animate((0, vue.toValue)(keyframes), animateOptions);
			if (persist) animate.value.persist();
			if (_playbackRate !== 1) animate.value.playbackRate = _playbackRate;
			if (init && !immediate) animate.value.pause();
			else syncResume();
			onReady === null || onReady === void 0 || onReady(animate.value);
		}
		const listenerOptions = { passive: true };
		useEventListener(animate, [
			"cancel",
			"finish",
			"remove"
		], syncPause, listenerOptions);
		useEventListener(animate, "finish", () => {
			var _animate$value5;
			if (commitStyles) (_animate$value5 = animate.value) === null || _animate$value5 === void 0 || _animate$value5.commitStyles();
		}, listenerOptions);
		const { resume: resumeRef, pause: pauseRef } = useRafFn(() => {
			if (!animate.value) return;
			store.pending = animate.value.pending;
			store.playState = animate.value.playState;
			store.replaceState = animate.value.replaceState;
			store.startTime = animate.value.startTime;
			store.currentTime = animate.value.currentTime;
			store.timeline = animate.value.timeline;
			store.playbackRate = animate.value.playbackRate;
		}, { immediate: false });
		function syncResume() {
			if (isSupported.value) resumeRef();
		}
		function syncPause() {
			if (isSupported.value && window$1) window$1.requestAnimationFrame(pauseRef);
		}
		return {
			isSupported,
			animate,
			play,
			pause,
			reverse,
			finish,
			cancel,
			pending,
			playState,
			replaceState,
			startTime,
			currentTime,
			timeline,
			playbackRate
		};
	}

//#endregion
//#region useAsyncQueue/index.ts
/**
	* Asynchronous queue task controller.
	*
	* @see https://vueuse.org/useAsyncQueue
	* @param tasks
	* @param options
	*/
	function useAsyncQueue(tasks, options) {
		const { interrupt = true, onError = __vueuse_shared.noop, onFinished = __vueuse_shared.noop, signal } = options || {};
		const promiseState = {
			aborted: "aborted",
			fulfilled: "fulfilled",
			pending: "pending",
			rejected: "rejected"
		};
		const result = (0, vue.reactive)(Array.from(Array.from({ length: tasks.length }), () => ({
			state: promiseState.pending,
			data: null
		})));
		const activeIndex = (0, vue.shallowRef)(-1);
		if (!tasks || tasks.length === 0) {
			onFinished();
			return {
				activeIndex,
				result
			};
		}
		function updateResult(state, res) {
			activeIndex.value++;
			result[activeIndex.value].data = res;
			result[activeIndex.value].state = state;
		}
		tasks.reduce((prev, curr) => {
			return prev.then((prevRes) => {
				var _result$activeIndex$v;
				if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
					updateResult(promiseState.aborted, /* @__PURE__ */ new Error("aborted"));
					return;
				}
				if (((_result$activeIndex$v = result[activeIndex.value]) === null || _result$activeIndex$v === void 0 ? void 0 : _result$activeIndex$v.state) === promiseState.rejected && interrupt) {
					onFinished();
					return;
				}
				const done = curr(prevRes).then((currentRes) => {
					updateResult(promiseState.fulfilled, currentRes);
					if (activeIndex.value === tasks.length - 1) onFinished();
					return currentRes;
				});
				if (!signal) return done;
				return Promise.race([done, whenAborted(signal)]);
			}).catch((e) => {
				if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
					updateResult(promiseState.aborted, e);
					return e;
				}
				updateResult(promiseState.rejected, e);
				onError();
				if (activeIndex.value === tasks.length - 1) onFinished();
				return e;
			});
		}, Promise.resolve());
		return {
			activeIndex,
			result
		};
	}
	function whenAborted(signal) {
		return new Promise((resolve, reject) => {
			const error = /* @__PURE__ */ new Error("aborted");
			if (signal.aborted) reject(error);
			else signal.addEventListener("abort", () => reject(error), { once: true });
		});
	}

//#endregion
//#region useAsyncState/index.ts
/**
	* Reactive async state. Will not block your setup function and will trigger changes once
	* the promise is ready.
	*
	* @see https://vueuse.org/useAsyncState
	* @param promise         The promise / async function to be resolved
	* @param initialState    The initial state, used until the first evaluation finishes
	* @param options
	*/
	function useAsyncState(promise, initialState, options) {
		var _globalThis$reportErr;
		const { immediate = true, delay = 0, onError = (_globalThis$reportErr = globalThis.reportError) !== null && _globalThis$reportErr !== void 0 ? _globalThis$reportErr : __vueuse_shared.noop, onSuccess = __vueuse_shared.noop, resetOnExecute = true, shallow = true, throwError } = options !== null && options !== void 0 ? options : {};
		const state = shallow ? (0, vue.shallowRef)(initialState) : (0, vue.ref)(initialState);
		const isReady = (0, vue.shallowRef)(false);
		const isLoading = (0, vue.shallowRef)(false);
		const error = (0, vue.shallowRef)(void 0);
		let executionsCount = 0;
		async function execute(delay$1 = 0, ...args) {
			const executionId = executionsCount += 1;
			if (resetOnExecute) state.value = (0, vue.toValue)(initialState);
			error.value = void 0;
			isReady.value = false;
			isLoading.value = true;
			if (delay$1 > 0) await (0, __vueuse_shared.promiseTimeout)(delay$1);
			const _promise = typeof promise === "function" ? promise(...args) : promise;
			try {
				const data = await _promise;
				if (executionId === executionsCount) {
					state.value = data;
					isReady.value = true;
				}
				onSuccess(data);
				return data;
			} catch (e) {
				if (executionId === executionsCount) error.value = e;
				onError(e);
				if (throwError) throw e;
			} finally {
				if (executionId === executionsCount) isLoading.value = false;
			}
		}
		if (immediate) execute(delay);
		const shell = {
			state,
			isReady,
			isLoading,
			error,
			execute,
			executeImmediate: (...args) => execute(0, ...args)
		};
		function waitUntilIsLoaded() {
			return new Promise((resolve, reject) => {
				(0, __vueuse_shared.until)(isLoading).toBe(false).then(() => resolve(shell)).catch(reject);
			});
		}
		return {
			...shell,
			then(onFulfilled, onRejected) {
				return waitUntilIsLoaded().then(onFulfilled, onRejected);
			}
		};
	}

//#endregion
//#region useBase64/serialization.ts
	const defaults = {
		array: (v) => JSON.stringify(v),
		object: (v) => JSON.stringify(v),
		set: (v) => JSON.stringify(Array.from(v)),
		map: (v) => JSON.stringify(Object.fromEntries(v)),
		null: () => ""
	};
	function getDefaultSerialization(target) {
		if (!target) return defaults.null;
		if (target instanceof Map) return defaults.map;
		else if (target instanceof Set) return defaults.set;
		else if (Array.isArray(target)) return defaults.array;
		else return defaults.object;
	}

//#endregion
//#region useBase64/index.ts
	function useBase64(target, options) {
		const base64 = (0, vue.shallowRef)("");
		const promise = (0, vue.shallowRef)();
		function execute() {
			if (!__vueuse_shared.isClient) return;
			promise.value = new Promise((resolve, reject) => {
				try {
					const _target = (0, vue.toValue)(target);
					if (_target == null) resolve("");
					else if (typeof _target === "string") resolve(blobToBase64(new Blob([_target], { type: "text/plain" })));
					else if (_target instanceof Blob) resolve(blobToBase64(_target));
					else if (_target instanceof ArrayBuffer) resolve(window.btoa(String.fromCharCode(...new Uint8Array(_target))));
					else if (_target instanceof HTMLCanvasElement) resolve(_target.toDataURL(options === null || options === void 0 ? void 0 : options.type, options === null || options === void 0 ? void 0 : options.quality));
					else if (_target instanceof HTMLImageElement) {
						const img = _target.cloneNode(false);
						img.crossOrigin = "Anonymous";
						imgLoaded(img).then(() => {
							const canvas = document.createElement("canvas");
							const ctx = canvas.getContext("2d");
							canvas.width = img.width;
							canvas.height = img.height;
							ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
							resolve(canvas.toDataURL(options === null || options === void 0 ? void 0 : options.type, options === null || options === void 0 ? void 0 : options.quality));
						}).catch(reject);
					} else if (typeof _target === "object") {
						const serialized = ((options === null || options === void 0 ? void 0 : options.serializer) || getDefaultSerialization(_target))(_target);
						return resolve(blobToBase64(new Blob([serialized], { type: "application/json" })));
					} else reject(/* @__PURE__ */ new Error("target is unsupported types"));
				} catch (error) {
					reject(error);
				}
			});
			promise.value.then((res) => {
				base64.value = (options === null || options === void 0 ? void 0 : options.dataUrl) === false ? res.replace(/^data:.*?;base64,/, "") : res;
			});
			return promise.value;
		}
		if ((0, vue.isRef)(target) || typeof target === "function") (0, vue.watch)(target, execute, { immediate: true });
		else execute();
		return {
			base64,
			promise,
			execute
		};
	}
	function imgLoaded(img) {
		return new Promise((resolve, reject) => {
			if (!img.complete) {
				img.onload = () => {
					resolve();
				};
				img.onerror = reject;
			} else resolve();
		});
	}
	function blobToBase64(blob) {
		return new Promise((resolve, reject) => {
			const fr = new FileReader();
			fr.onload = (e) => {
				resolve(e.target.result);
			};
			fr.onerror = reject;
			fr.readAsDataURL(blob);
		});
	}

//#endregion
//#region useBattery/index.ts
/**
	* Reactive Battery Status API.
	*
	* @see https://vueuse.org/useBattery
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useBattery(options = {}) {
		const { navigator: navigator$1 = defaultNavigator } = options;
		const events$1 = [
			"chargingchange",
			"chargingtimechange",
			"dischargingtimechange",
			"levelchange"
		];
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "getBattery" in navigator$1 && typeof navigator$1.getBattery === "function");
		const charging = (0, vue.shallowRef)(false);
		const chargingTime = (0, vue.shallowRef)(0);
		const dischargingTime = (0, vue.shallowRef)(0);
		const level = (0, vue.shallowRef)(1);
		let battery;
		function updateBatteryInfo() {
			charging.value = this.charging;
			chargingTime.value = this.chargingTime || 0;
			dischargingTime.value = this.dischargingTime || 0;
			level.value = this.level;
		}
		if (isSupported.value) navigator$1.getBattery().then((_battery) => {
			battery = _battery;
			updateBatteryInfo.call(battery);
			useEventListener(battery, events$1, updateBatteryInfo, { passive: true });
		});
		return {
			isSupported,
			charging,
			chargingTime,
			dischargingTime,
			level
		};
	}

//#endregion
//#region useBluetooth/index.ts
	/* @__NO_SIDE_EFFECTS__ */
	function useBluetooth(options) {
		let { acceptAllDevices = false } = options || {};
		const { filters = void 0, optionalServices = void 0, navigator: navigator$1 = defaultNavigator } = options || {};
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "bluetooth" in navigator$1);
		const device = (0, vue.shallowRef)();
		const error = (0, vue.shallowRef)(null);
		(0, vue.watch)(device, () => {
			connectToBluetoothGATTServer();
		});
		async function requestDevice() {
			if (!isSupported.value) return;
			error.value = null;
			if (filters && filters.length > 0) acceptAllDevices = false;
			try {
				device.value = await (navigator$1 === null || navigator$1 === void 0 ? void 0 : navigator$1.bluetooth.requestDevice({
					acceptAllDevices,
					filters,
					optionalServices
				}));
			} catch (err) {
				error.value = err;
			}
		}
		const server = (0, vue.shallowRef)();
		const isConnected = (0, vue.shallowRef)(false);
		function reset() {
			isConnected.value = false;
			device.value = void 0;
			server.value = void 0;
		}
		async function connectToBluetoothGATTServer() {
			error.value = null;
			if (device.value && device.value.gatt) {
				useEventListener(device, "gattserverdisconnected", reset, { passive: true });
				try {
					server.value = await device.value.gatt.connect();
					isConnected.value = server.value.connected;
				} catch (err) {
					error.value = err;
				}
			}
		}
		(0, __vueuse_shared.tryOnMounted)(() => {
			var _device$value$gatt;
			if (device.value) (_device$value$gatt = device.value.gatt) === null || _device$value$gatt === void 0 || _device$value$gatt.connect();
		});
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			var _device$value$gatt2;
			if (device.value) (_device$value$gatt2 = device.value.gatt) === null || _device$value$gatt2 === void 0 || _device$value$gatt2.disconnect();
		});
		return {
			isSupported,
			isConnected: (0, vue.readonly)(isConnected),
			device,
			requestDevice,
			server,
			error
		};
	}

//#endregion
//#region useSSRWidth/index.ts
	const ssrWidthSymbol = Symbol("vueuse-ssr-width");
	/* @__NO_SIDE_EFFECTS__ */
	function useSSRWidth() {
		const ssrWidth = (0, vue.hasInjectionContext)() ? (0, __vueuse_shared.injectLocal)(ssrWidthSymbol, null) : null;
		return typeof ssrWidth === "number" ? ssrWidth : void 0;
	}
	function provideSSRWidth(width, app) {
		if (app !== void 0) app.provide(ssrWidthSymbol, width);
		else (0, __vueuse_shared.provideLocal)(ssrWidthSymbol, width);
	}

//#endregion
//#region useMediaQuery/index.ts
/**
	* Reactive Media Query.
	*
	* @see https://vueuse.org/useMediaQuery
	* @param query
	* @param options
	*/
	function useMediaQuery(query, options = {}) {
		const { window: window$1 = defaultWindow, ssrWidth = /* @__PURE__ */ useSSRWidth() } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "matchMedia" in window$1 && typeof window$1.matchMedia === "function");
		const ssrSupport = (0, vue.shallowRef)(typeof ssrWidth === "number");
		const mediaQuery = (0, vue.shallowRef)();
		const matches = (0, vue.shallowRef)(false);
		const handler = (event) => {
			matches.value = event.matches;
		};
		(0, vue.watchEffect)(() => {
			if (ssrSupport.value) {
				ssrSupport.value = !isSupported.value;
				matches.value = (0, vue.toValue)(query).split(",").some((queryString) => {
					const not = queryString.includes("not all");
					const minWidth = queryString.match(/\(\s*min-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/);
					const maxWidth = queryString.match(/\(\s*max-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/);
					let res = Boolean(minWidth || maxWidth);
					if (minWidth && res) res = ssrWidth >= (0, __vueuse_shared.pxValue)(minWidth[1]);
					if (maxWidth && res) res = ssrWidth <= (0, __vueuse_shared.pxValue)(maxWidth[1]);
					return not ? !res : res;
				});
				return;
			}
			if (!isSupported.value) return;
			mediaQuery.value = window$1.matchMedia((0, vue.toValue)(query));
			matches.value = mediaQuery.value.matches;
		});
		useEventListener(mediaQuery, "change", handler, { passive: true });
		return (0, vue.computed)(() => matches.value);
	}

//#endregion
//#region useBreakpoints/breakpoints.ts
/**
	* Breakpoints from Tailwind V2
	*
	* @see https://tailwindcss.com/docs/breakpoints
	*/
	const breakpointsTailwind = {
		"sm": 640,
		"md": 768,
		"lg": 1024,
		"xl": 1280,
		"2xl": 1536
	};
	/**
	* Breakpoints from Bootstrap V5
	*
	* @see https://getbootstrap.com/docs/5.0/layout/breakpoints
	*/
	const breakpointsBootstrapV5 = {
		xs: 0,
		sm: 576,
		md: 768,
		lg: 992,
		xl: 1200,
		xxl: 1400
	};
	/**
	* Breakpoints from Vuetify V2
	*
	* @see https://v2.vuetifyjs.com/en/features/breakpoints/
	*/
	const breakpointsVuetifyV2 = {
		xs: 0,
		sm: 600,
		md: 960,
		lg: 1264,
		xl: 1904
	};
	/**
	* Breakpoints from Vuetify V3
	*
	* @see https://vuetifyjs.com/en/styles/float/#overview
	*/
	const breakpointsVuetifyV3 = {
		xs: 0,
		sm: 600,
		md: 960,
		lg: 1280,
		xl: 1920,
		xxl: 2560
	};
	/**
	* Alias to `breakpointsVuetifyV2`
	*
	* @deprecated explictly use `breakpointsVuetifyV2` or `breakpointsVuetifyV3` instead
	*/
	const breakpointsVuetify = breakpointsVuetifyV2;
	/**
	* Breakpoints from Ant Design
	*
	* @see https://ant.design/components/layout/#breakpoint-width
	*/
	const breakpointsAntDesign = {
		xs: 480,
		sm: 576,
		md: 768,
		lg: 992,
		xl: 1200,
		xxl: 1600
	};
	/**
	* Breakpoints from Quasar V2
	*
	* @see https://quasar.dev/style/breakpoints
	*/
	const breakpointsQuasar = {
		xs: 0,
		sm: 600,
		md: 1024,
		lg: 1440,
		xl: 1920
	};
	/**
	* Sematic Breakpoints
	*/
	const breakpointsSematic = {
		mobileS: 320,
		mobileM: 375,
		mobileL: 425,
		tablet: 768,
		laptop: 1024,
		laptopL: 1440,
		desktop4K: 2560
	};
	/**
	* Breakpoints from Master CSS
	*
	* @see https://docs.master.co/css/breakpoints
	*/
	const breakpointsMasterCss = {
		"3xs": 360,
		"2xs": 480,
		"xs": 600,
		"sm": 768,
		"md": 1024,
		"lg": 1280,
		"xl": 1440,
		"2xl": 1600,
		"3xl": 1920,
		"4xl": 2560
	};
	/**
	* Breakpoints from PrimeFlex
	*
	* @see https://primeflex.org/installation
	*/
	const breakpointsPrimeFlex = {
		sm: 576,
		md: 768,
		lg: 992,
		xl: 1200
	};
	/**
	* Breakpoints from ElementUI/ElementPlus
	*
	* @see https://element.eleme.io/#/en-US/component/layout
	* @see https://element-plus.org/en-US/component/layout.html
	*/
	const breakpointsElement = {
		xs: 0,
		sm: 768,
		md: 992,
		lg: 1200,
		xl: 1920
	};

//#endregion
//#region useBreakpoints/index.ts
/**
	* Reactively viewport breakpoints
	*
	* @see https://vueuse.org/useBreakpoints
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useBreakpoints(breakpoints, options = {}) {
		function getValue$1(k, delta) {
			let v = (0, vue.toValue)(breakpoints[(0, vue.toValue)(k)]);
			if (delta != null) v = (0, __vueuse_shared.increaseWithUnit)(v, delta);
			if (typeof v === "number") v = `${v}px`;
			return v;
		}
		const { window: window$1 = defaultWindow, strategy = "min-width", ssrWidth = /* @__PURE__ */ useSSRWidth() } = options;
		const ssrSupport = typeof ssrWidth === "number";
		const mounted = ssrSupport ? (0, vue.shallowRef)(false) : { value: true };
		if (ssrSupport) (0, __vueuse_shared.tryOnMounted)(() => mounted.value = !!window$1);
		function match(query, size) {
			if (!mounted.value && ssrSupport) return query === "min" ? ssrWidth >= (0, __vueuse_shared.pxValue)(size) : ssrWidth <= (0, __vueuse_shared.pxValue)(size);
			if (!window$1) return false;
			return window$1.matchMedia(`(${query}-width: ${size})`).matches;
		}
		const greaterOrEqual = (k) => {
			return useMediaQuery(() => `(min-width: ${getValue$1(k)})`, options);
		};
		const smallerOrEqual = (k) => {
			return useMediaQuery(() => `(max-width: ${getValue$1(k)})`, options);
		};
		const shortcutMethods = Object.keys(breakpoints).reduce((shortcuts, k) => {
			Object.defineProperty(shortcuts, k, {
				get: () => strategy === "min-width" ? greaterOrEqual(k) : smallerOrEqual(k),
				enumerable: true,
				configurable: true
			});
			return shortcuts;
		}, {});
		function current() {
			const points = Object.keys(breakpoints).map((k) => [
				k,
				shortcutMethods[k],
				(0, __vueuse_shared.pxValue)(getValue$1(k))
			]).sort((a, b) => a[2] - b[2]);
			return (0, vue.computed)(() => points.filter(([, v]) => v.value).map(([k]) => k));
		}
		return Object.assign(shortcutMethods, {
			greaterOrEqual,
			smallerOrEqual,
			greater(k) {
				return useMediaQuery(() => `(min-width: ${getValue$1(k, .1)})`, options);
			},
			smaller(k) {
				return useMediaQuery(() => `(max-width: ${getValue$1(k, -.1)})`, options);
			},
			between(a, b) {
				return useMediaQuery(() => `(min-width: ${getValue$1(a)}) and (max-width: ${getValue$1(b, -.1)})`, options);
			},
			isGreater(k) {
				return match("min", getValue$1(k, .1));
			},
			isGreaterOrEqual(k) {
				return match("min", getValue$1(k));
			},
			isSmaller(k) {
				return match("max", getValue$1(k, -.1));
			},
			isSmallerOrEqual(k) {
				return match("max", getValue$1(k));
			},
			isInBetween(a, b) {
				return match("min", getValue$1(a)) && match("max", getValue$1(b, -.1));
			},
			current,
			active() {
				const bps = current();
				return (0, vue.computed)(() => bps.value.length === 0 ? "" : bps.value.at(strategy === "min-width" ? -1 : 0));
			}
		});
	}

//#endregion
//#region useBroadcastChannel/index.ts
/**
	* Reactive BroadcastChannel
	*
	* @see https://vueuse.org/useBroadcastChannel
	* @see https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
	* @param options
	*
	*/
	function useBroadcastChannel(options) {
		const { name, window: window$1 = defaultWindow } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "BroadcastChannel" in window$1);
		const isClosed = (0, vue.shallowRef)(false);
		const channel = (0, vue.ref)();
		const data = (0, vue.ref)();
		const error = (0, vue.shallowRef)(null);
		const post = (data$1) => {
			if (channel.value) channel.value.postMessage(data$1);
		};
		const close = () => {
			if (channel.value) channel.value.close();
			isClosed.value = true;
		};
		if (isSupported.value) (0, __vueuse_shared.tryOnMounted)(() => {
			error.value = null;
			channel.value = new BroadcastChannel(name);
			const listenerOptions = { passive: true };
			useEventListener(channel, "message", (e) => {
				data.value = e.data;
			}, listenerOptions);
			useEventListener(channel, "messageerror", (e) => {
				error.value = e;
			}, listenerOptions);
			useEventListener(channel, "close", () => {
				isClosed.value = true;
			}, listenerOptions);
		});
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			close();
		});
		return {
			isSupported,
			channel,
			data,
			post,
			close,
			error,
			isClosed
		};
	}

//#endregion
//#region useBrowserLocation/index.ts
	const WRITABLE_PROPERTIES = [
		"hash",
		"host",
		"hostname",
		"href",
		"pathname",
		"port",
		"protocol",
		"search"
	];
	/**
	* Reactive browser location.
	*
	* @see https://vueuse.org/useBrowserLocation
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useBrowserLocation(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const refs = Object.fromEntries(WRITABLE_PROPERTIES.map((key) => [key, (0, vue.ref)()]));
		for (const [key, ref] of (0, __vueuse_shared.objectEntries)(refs)) (0, vue.watch)(ref, (value) => {
			if (!(window$1 === null || window$1 === void 0 ? void 0 : window$1.location) || window$1.location[key] === value) return;
			window$1.location[key] = value;
		});
		const buildState = (trigger) => {
			var _window$location;
			const { state: state$1, length } = (window$1 === null || window$1 === void 0 ? void 0 : window$1.history) || {};
			const { origin } = (window$1 === null || window$1 === void 0 ? void 0 : window$1.location) || {};
			for (const key of WRITABLE_PROPERTIES) refs[key].value = window$1 === null || window$1 === void 0 || (_window$location = window$1.location) === null || _window$location === void 0 ? void 0 : _window$location[key];
			return (0, vue.reactive)({
				trigger,
				state: state$1,
				length,
				origin,
				...refs
			});
		};
		const state = (0, vue.ref)(buildState("load"));
		if (window$1) {
			const listenerOptions = { passive: true };
			useEventListener(window$1, "popstate", () => state.value = buildState("popstate"), listenerOptions);
			useEventListener(window$1, "hashchange", () => state.value = buildState("hashchange"), listenerOptions);
		}
		return state;
	}

//#endregion
//#region useCached/index.ts
	function useCached(refValue, comparator = (a, b) => a === b, options) {
		const { deepRefs = true,...watchOptions } = options || {};
		const cachedValue = (0, __vueuse_shared.createRef)(refValue.value, deepRefs);
		(0, vue.watch)(() => refValue.value, (value) => {
			if (!comparator(value, cachedValue.value)) cachedValue.value = value;
		}, watchOptions);
		return cachedValue;
	}

//#endregion
//#region usePermission/index.ts
/**
	* Reactive Permissions API.
	*
	* @see https://vueuse.org/usePermission
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePermission(permissionDesc, options = {}) {
		const { controls = false, navigator: navigator$1 = defaultNavigator } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "permissions" in navigator$1);
		const permissionStatus = (0, vue.shallowRef)();
		const desc = typeof permissionDesc === "string" ? { name: permissionDesc } : permissionDesc;
		const state = (0, vue.shallowRef)();
		const update = () => {
			var _permissionStatus$val, _permissionStatus$val2;
			state.value = (_permissionStatus$val = (_permissionStatus$val2 = permissionStatus.value) === null || _permissionStatus$val2 === void 0 ? void 0 : _permissionStatus$val2.state) !== null && _permissionStatus$val !== void 0 ? _permissionStatus$val : "prompt";
		};
		useEventListener(permissionStatus, "change", update, { passive: true });
		const query = (0, __vueuse_shared.createSingletonPromise)(async () => {
			if (!isSupported.value) return;
			if (!permissionStatus.value) try {
				permissionStatus.value = await navigator$1.permissions.query(desc);
			} catch (_unused) {
				permissionStatus.value = void 0;
			} finally {
				update();
			}
			if (controls) return (0, vue.toRaw)(permissionStatus.value);
		});
		query();
		if (controls) return {
			state,
			isSupported,
			query
		};
		else return state;
	}

//#endregion
//#region useClipboard/index.ts
	function useClipboard(options = {}) {
		const { navigator: navigator$1 = defaultNavigator, read = false, source, copiedDuring = 1500, legacy = false } = options;
		const isClipboardApiSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "clipboard" in navigator$1);
		const permissionRead = usePermission("clipboard-read");
		const permissionWrite = usePermission("clipboard-write");
		const isSupported = (0, vue.computed)(() => isClipboardApiSupported.value || legacy);
		const text = (0, vue.shallowRef)("");
		const copied = (0, vue.shallowRef)(false);
		const timeout = (0, __vueuse_shared.useTimeoutFn)(() => copied.value = false, copiedDuring, { immediate: false });
		async function updateText() {
			let useLegacy = !(isClipboardApiSupported.value && isAllowed(permissionRead.value));
			if (!useLegacy) try {
				text.value = await navigator$1.clipboard.readText();
			} catch (_unused) {
				useLegacy = true;
			}
			if (useLegacy) text.value = legacyRead();
		}
		if (isSupported.value && read) useEventListener(["copy", "cut"], updateText, { passive: true });
		async function copy(value = (0, vue.toValue)(source)) {
			if (isSupported.value && value != null) {
				let useLegacy = !(isClipboardApiSupported.value && isAllowed(permissionWrite.value));
				if (!useLegacy) try {
					await navigator$1.clipboard.writeText(value);
				} catch (_unused2) {
					useLegacy = true;
				}
				if (useLegacy) legacyCopy(value);
				text.value = value;
				copied.value = true;
				timeout.start();
			}
		}
		function legacyCopy(value) {
			const ta = document.createElement("textarea");
			ta.value = value;
			ta.style.position = "absolute";
			ta.style.opacity = "0";
			ta.setAttribute("readonly", "");
			document.body.appendChild(ta);
			ta.select();
			document.execCommand("copy");
			ta.remove();
		}
		function legacyRead() {
			var _document$getSelectio, _document, _document$getSelectio2;
			return (_document$getSelectio = (_document = document) === null || _document === void 0 || (_document$getSelectio2 = _document.getSelection) === null || _document$getSelectio2 === void 0 || (_document$getSelectio2 = _document$getSelectio2.call(_document)) === null || _document$getSelectio2 === void 0 ? void 0 : _document$getSelectio2.toString()) !== null && _document$getSelectio !== void 0 ? _document$getSelectio : "";
		}
		function isAllowed(status) {
			return status === "granted" || status === "prompt";
		}
		return {
			isSupported,
			text: (0, vue.readonly)(text),
			copied: (0, vue.readonly)(copied),
			copy
		};
	}

//#endregion
//#region useClipboardItems/index.ts
	function useClipboardItems(options = {}) {
		const { navigator: navigator$1 = defaultNavigator, read = false, source, copiedDuring = 1500 } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "clipboard" in navigator$1);
		const content = (0, vue.ref)([]);
		const copied = (0, vue.shallowRef)(false);
		const timeout = (0, __vueuse_shared.useTimeoutFn)(() => copied.value = false, copiedDuring, { immediate: false });
		function updateContent() {
			if (isSupported.value) navigator$1.clipboard.read().then((items) => {
				content.value = items;
			});
		}
		if (isSupported.value && read) useEventListener(["copy", "cut"], updateContent, { passive: true });
		async function copy(value = (0, vue.toValue)(source)) {
			if (isSupported.value && value != null) {
				await navigator$1.clipboard.write(value);
				content.value = value;
				copied.value = true;
				timeout.start();
			}
		}
		return {
			isSupported,
			content: (0, vue.shallowReadonly)(content),
			copied: (0, vue.readonly)(copied),
			copy,
			read: updateContent
		};
	}

//#endregion
//#region useCloned/index.ts
	function cloneFnJSON(source) {
		return JSON.parse(JSON.stringify(source));
	}
	function useCloned(source, options = {}) {
		const cloned = (0, vue.ref)({});
		const isModified = (0, vue.shallowRef)(false);
		let _lastSync = false;
		const { manual, clone = cloneFnJSON, deep = true, immediate = true } = options;
		(0, vue.watch)(cloned, () => {
			if (_lastSync) {
				_lastSync = false;
				return;
			}
			isModified.value = true;
		}, {
			deep: true,
			flush: "sync"
		});
		function sync() {
			_lastSync = true;
			isModified.value = false;
			cloned.value = clone((0, vue.toValue)(source));
		}
		if (!manual && ((0, vue.isRef)(source) || typeof source === "function")) (0, vue.watch)(source, sync, {
			...options,
			deep,
			immediate
		});
		else sync();
		return {
			cloned,
			isModified,
			sync
		};
	}

//#endregion
//#region ssr-handlers.ts
	const _global = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
	const globalKey = "__vueuse_ssr_handlers__";
	const handlers = /* @__PURE__ */ getHandlers();
	function getHandlers() {
		if (!(globalKey in _global)) _global[globalKey] = _global[globalKey] || {};
		return _global[globalKey];
	}
	function getSSRHandler(key, fallback) {
		return handlers[key] || fallback;
	}
	function setSSRHandler(key, fn) {
		handlers[key] = fn;
	}

//#endregion
//#region usePreferredDark/index.ts
/**
	* Reactive dark theme preference.
	*
	* @see https://vueuse.org/usePreferredDark
	* @param [options]
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePreferredDark(options) {
		return useMediaQuery("(prefers-color-scheme: dark)", options);
	}

//#endregion
//#region useStorage/guess.ts
	function guessSerializerType(rawInit) {
		return rawInit == null ? "any" : rawInit instanceof Set ? "set" : rawInit instanceof Map ? "map" : rawInit instanceof Date ? "date" : typeof rawInit === "boolean" ? "boolean" : typeof rawInit === "string" ? "string" : typeof rawInit === "object" ? "object" : !Number.isNaN(rawInit) ? "number" : "any";
	}

//#endregion
//#region useStorage/index.ts
	const StorageSerializers = {
		boolean: {
			read: (v) => v === "true",
			write: (v) => String(v)
		},
		object: {
			read: (v) => JSON.parse(v),
			write: (v) => JSON.stringify(v)
		},
		number: {
			read: (v) => Number.parseFloat(v),
			write: (v) => String(v)
		},
		any: {
			read: (v) => v,
			write: (v) => String(v)
		},
		string: {
			read: (v) => v,
			write: (v) => String(v)
		},
		map: {
			read: (v) => new Map(JSON.parse(v)),
			write: (v) => JSON.stringify(Array.from(v.entries()))
		},
		set: {
			read: (v) => new Set(JSON.parse(v)),
			write: (v) => JSON.stringify(Array.from(v))
		},
		date: {
			read: (v) => new Date(v),
			write: (v) => v.toISOString()
		}
	};
	const customStorageEventName = "vueuse-storage";
	/**
	* Reactive LocalStorage/SessionStorage.
	*
	* @see https://vueuse.org/useStorage
	*/
	function useStorage(key, defaults$1, storage, options = {}) {
		var _options$serializer;
		const { flush = "pre", deep = true, listenToStorageChanges = true, writeDefaults = true, mergeDefaults = false, shallow, window: window$1 = defaultWindow, eventFilter, onError = (e) => {
			console.error(e);
		}, initOnMounted } = options;
		const data = (shallow ? vue.shallowRef : vue.ref)(typeof defaults$1 === "function" ? defaults$1() : defaults$1);
		const keyComputed = (0, vue.computed)(() => (0, vue.toValue)(key));
		if (!storage) try {
			storage = getSSRHandler("getDefaultStorage", () => defaultWindow === null || defaultWindow === void 0 ? void 0 : defaultWindow.localStorage)();
		} catch (e) {
			onError(e);
		}
		if (!storage) return data;
		const rawInit = (0, vue.toValue)(defaults$1);
		const type = guessSerializerType(rawInit);
		const serializer = (_options$serializer = options.serializer) !== null && _options$serializer !== void 0 ? _options$serializer : StorageSerializers[type];
		const { pause: pauseWatch, resume: resumeWatch } = (0, __vueuse_shared.watchPausable)(data, (newValue) => write(newValue), {
			flush,
			deep,
			eventFilter
		});
		(0, vue.watch)(keyComputed, () => update(), { flush });
		let firstMounted = false;
		const onStorageEvent = (ev) => {
			if (initOnMounted && !firstMounted) return;
			update(ev);
		};
		const onStorageCustomEvent = (ev) => {
			if (initOnMounted && !firstMounted) return;
			updateFromCustomEvent(ev);
		};
		/**
		* The custom event is needed for same-document syncing when using custom
		* storage backends, but it doesn't work across different documents.
		*
		* TODO: Consider implementing a BroadcastChannel-based solution that fixes this.
		*/
		if (window$1 && listenToStorageChanges) if (storage instanceof Storage) useEventListener(window$1, "storage", onStorageEvent, { passive: true });
		else useEventListener(window$1, customStorageEventName, onStorageCustomEvent);
		if (initOnMounted) (0, __vueuse_shared.tryOnMounted)(() => {
			firstMounted = true;
			update();
		});
		else update();
		function dispatchWriteEvent(oldValue, newValue) {
			if (window$1) {
				const payload = {
					key: keyComputed.value,
					oldValue,
					newValue,
					storageArea: storage
				};
				window$1.dispatchEvent(storage instanceof Storage ? new StorageEvent("storage", payload) : new CustomEvent(customStorageEventName, { detail: payload }));
			}
		}
		function write(v) {
			try {
				const oldValue = storage.getItem(keyComputed.value);
				if (v == null) {
					dispatchWriteEvent(oldValue, null);
					storage.removeItem(keyComputed.value);
				} else {
					const serialized = serializer.write(v);
					if (oldValue !== serialized) {
						storage.setItem(keyComputed.value, serialized);
						dispatchWriteEvent(oldValue, serialized);
					}
				}
			} catch (e) {
				onError(e);
			}
		}
		function read(event) {
			const rawValue = event ? event.newValue : storage.getItem(keyComputed.value);
			if (rawValue == null) {
				if (writeDefaults && rawInit != null) storage.setItem(keyComputed.value, serializer.write(rawInit));
				return rawInit;
			} else if (!event && mergeDefaults) {
				const value = serializer.read(rawValue);
				if (typeof mergeDefaults === "function") return mergeDefaults(value, rawInit);
				else if (type === "object" && !Array.isArray(value)) return {
					...rawInit,
					...value
				};
				return value;
			} else if (typeof rawValue !== "string") return rawValue;
			else return serializer.read(rawValue);
		}
		function update(event) {
			if (event && event.storageArea !== storage) return;
			if (event && event.key == null) {
				data.value = rawInit;
				return;
			}
			if (event && event.key !== keyComputed.value) return;
			pauseWatch();
			try {
				const serializedData = serializer.write(data.value);
				if (event === void 0 || (event === null || event === void 0 ? void 0 : event.newValue) !== serializedData) data.value = read(event);
			} catch (e) {
				onError(e);
			} finally {
				if (event) (0, vue.nextTick)(resumeWatch);
				else resumeWatch();
			}
		}
		function updateFromCustomEvent(event) {
			update(event.detail);
		}
		return data;
	}

//#endregion
//#region useColorMode/index.ts
	const CSS_DISABLE_TRANS = "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";
	/**
	* Reactive color mode with auto data persistence.
	*
	* @see https://vueuse.org/useColorMode
	* @param options
	*/
	function useColorMode(options = {}) {
		const { selector = "html", attribute = "class", initialValue = "auto", window: window$1 = defaultWindow, storage, storageKey = "vueuse-color-scheme", listenToStorageChanges = true, storageRef, emitAuto, disableTransition = true } = options;
		const modes = {
			auto: "",
			light: "light",
			dark: "dark",
			...options.modes || {}
		};
		const preferredDark = usePreferredDark({ window: window$1 });
		const system = (0, vue.computed)(() => preferredDark.value ? "dark" : "light");
		const store = storageRef || (storageKey == null ? (0, __vueuse_shared.toRef)(initialValue) : useStorage(storageKey, initialValue, storage, {
			window: window$1,
			listenToStorageChanges
		}));
		const state = (0, vue.computed)(() => store.value === "auto" ? system.value : store.value);
		const updateHTMLAttrs = getSSRHandler("updateHTMLAttrs", (selector$1, attribute$1, value) => {
			const el = typeof selector$1 === "string" ? window$1 === null || window$1 === void 0 ? void 0 : window$1.document.querySelector(selector$1) : unrefElement(selector$1);
			if (!el) return;
			const classesToAdd = /* @__PURE__ */ new Set();
			const classesToRemove = /* @__PURE__ */ new Set();
			let attributeToChange = null;
			if (attribute$1 === "class") {
				const current = value.split(/\s/g);
				Object.values(modes).flatMap((i) => (i || "").split(/\s/g)).filter(Boolean).forEach((v) => {
					if (current.includes(v)) classesToAdd.add(v);
					else classesToRemove.add(v);
				});
			} else attributeToChange = {
				key: attribute$1,
				value
			};
			if (classesToAdd.size === 0 && classesToRemove.size === 0 && attributeToChange === null) return;
			let style;
			if (disableTransition) {
				style = window$1.document.createElement("style");
				style.appendChild(document.createTextNode(CSS_DISABLE_TRANS));
				window$1.document.head.appendChild(style);
			}
			for (const c of classesToAdd) el.classList.add(c);
			for (const c of classesToRemove) el.classList.remove(c);
			if (attributeToChange) el.setAttribute(attributeToChange.key, attributeToChange.value);
			if (disableTransition) {
				window$1.getComputedStyle(style).opacity;
				document.head.removeChild(style);
			}
		});
		function defaultOnChanged(mode) {
			var _modes$mode;
			updateHTMLAttrs(selector, attribute, (_modes$mode = modes[mode]) !== null && _modes$mode !== void 0 ? _modes$mode : mode);
		}
		function onChanged(mode) {
			if (options.onChanged) options.onChanged(mode, defaultOnChanged);
			else defaultOnChanged(mode);
		}
		(0, vue.watch)(state, onChanged, {
			flush: "post",
			immediate: true
		});
		(0, __vueuse_shared.tryOnMounted)(() => onChanged(state.value));
		const auto = (0, vue.computed)({
			get() {
				return emitAuto ? store.value : state.value;
			},
			set(v) {
				store.value = v;
			}
		});
		return Object.assign(auto, {
			store,
			system,
			state
		});
	}

//#endregion
//#region useConfirmDialog/index.ts
/**
	* Hooks for creating confirm dialogs. Useful for modal windows, popups and logins.
	*
	* @see https://vueuse.org/useConfirmDialog/
	* @param revealed `boolean` `ref` that handles a modal window
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useConfirmDialog(revealed = (0, vue.shallowRef)(false)) {
		const confirmHook = (0, __vueuse_shared.createEventHook)();
		const cancelHook = (0, __vueuse_shared.createEventHook)();
		const revealHook = (0, __vueuse_shared.createEventHook)();
		let _resolve = __vueuse_shared.noop;
		const reveal = (data) => {
			revealHook.trigger(data);
			revealed.value = true;
			return new Promise((resolve) => {
				_resolve = resolve;
			});
		};
		const confirm = (data) => {
			revealed.value = false;
			confirmHook.trigger(data);
			_resolve({
				data,
				isCanceled: false
			});
		};
		const cancel = (data) => {
			revealed.value = false;
			cancelHook.trigger(data);
			_resolve({
				data,
				isCanceled: true
			});
		};
		return {
			isRevealed: (0, vue.computed)(() => revealed.value),
			reveal,
			confirm,
			cancel,
			onReveal: revealHook.on,
			onConfirm: confirmHook.on,
			onCancel: cancelHook.on
		};
	}

//#endregion
//#region useCountdown/index.ts
	function getDefaultScheduler$8(options) {
		if ("interval" in options || "immediate" in options) {
			const { interval = 1e3, immediate = false } = options;
			return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, interval, { immediate });
		}
		return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, 1e3, { immediate: false });
	}
	/**
	* Reactive countdown timer in seconds.
	*
	* @param initialCountdown
	* @param options
	*
	* @see https://vueuse.org/useCountdown
	*/
	function useCountdown(initialCountdown, options = {}) {
		const remaining = (0, vue.shallowRef)((0, vue.toValue)(initialCountdown));
		const { scheduler = getDefaultScheduler$8(options), onTick, onComplete } = options;
		const controls = scheduler(() => {
			const value = remaining.value - 1;
			remaining.value = value < 0 ? 0 : value;
			onTick === null || onTick === void 0 || onTick();
			if (remaining.value <= 0) {
				controls.pause();
				onComplete === null || onComplete === void 0 || onComplete();
			}
		});
		const reset = (countdown) => {
			var _toValue;
			remaining.value = (_toValue = (0, vue.toValue)(countdown)) !== null && _toValue !== void 0 ? _toValue : (0, vue.toValue)(initialCountdown);
		};
		const stop = () => {
			controls.pause();
			reset();
		};
		const resume = () => {
			if (!controls.isActive.value) {
				if (remaining.value > 0) controls.resume();
			}
		};
		const start = (countdown) => {
			reset(countdown);
			controls.resume();
		};
		return {
			remaining,
			reset,
			stop,
			start,
			pause: controls.pause,
			resume,
			isActive: controls.isActive
		};
	}

//#endregion
//#region useCssSupports/index.ts
	function useCssSupports(...args) {
		let options = {};
		if (typeof (0, vue.toValue)(args.at(-1)) === "object") options = args.pop();
		const [prop, value] = args;
		const { window: window$1 = defaultWindow, ssrValue = false } = options;
		const isMounted = useMounted();
		return { isSupported: (0, vue.computed)(() => {
			isMounted.value;
			if (!__vueuse_shared.isClient) return ssrValue;
			return args.length === 2 ? window$1 === null || window$1 === void 0 ? void 0 : window$1.CSS.supports((0, vue.toValue)(prop), (0, vue.toValue)(value)) : window$1 === null || window$1 === void 0 ? void 0 : window$1.CSS.supports((0, vue.toValue)(prop));
		}) };
	}

//#endregion
//#region useCssVar/index.ts
/**
	* Manipulate CSS variables.
	*
	* @see https://vueuse.org/useCssVar
	* @param prop
	* @param target
	* @param options
	*/
	function useCssVar(prop, target, options = {}) {
		const { window: window$1 = defaultWindow, initialValue, observe = false } = options;
		const variable = (0, vue.shallowRef)(initialValue);
		const elRef = (0, vue.computed)(() => {
			var _window$document;
			return unrefElement(target) || (window$1 === null || window$1 === void 0 || (_window$document = window$1.document) === null || _window$document === void 0 ? void 0 : _window$document.documentElement);
		});
		function updateCssVar() {
			const key = (0, vue.toValue)(prop);
			const el = (0, vue.toValue)(elRef);
			if (el && window$1 && key) {
				var _window$getComputedSt;
				variable.value = ((_window$getComputedSt = window$1.getComputedStyle(el).getPropertyValue(key)) === null || _window$getComputedSt === void 0 ? void 0 : _window$getComputedSt.trim()) || variable.value || initialValue;
			}
		}
		if (observe) useMutationObserver(elRef, updateCssVar, {
			attributeFilter: ["style", "class"],
			window: window$1
		});
		(0, vue.watch)([elRef, () => (0, vue.toValue)(prop)], (_, old) => {
			if (old[0] && old[1]) old[0].style.removeProperty(old[1]);
			updateCssVar();
		}, { immediate: true });
		(0, vue.watch)([variable, elRef], ([val, el]) => {
			const raw_prop = (0, vue.toValue)(prop);
			if ((el === null || el === void 0 ? void 0 : el.style) && raw_prop) if (val == null) el.style.removeProperty(raw_prop);
			else el.style.setProperty(raw_prop, val);
		}, { immediate: true });
		return variable;
	}

//#endregion
//#region useCurrentElement/index.ts
	function useCurrentElement(rootComponent) {
		const vm = (0, vue.getCurrentInstance)();
		const currentElement = (0, __vueuse_shared.computedWithControl)(() => null, () => rootComponent ? unrefElement(rootComponent) : vm.proxy.$el);
		(0, vue.onUpdated)(currentElement.trigger);
		(0, vue.onMounted)(currentElement.trigger);
		return currentElement;
	}

//#endregion
//#region useCycleList/index.ts
/**
	* Cycle through a list of items
	*
	* @see https://vueuse.org/useCycleList
	*/
	function useCycleList(list, options) {
		const state = (0, vue.shallowRef)(getInitialValue());
		const listRef = (0, __vueuse_shared.toRef)(list);
		const index = (0, vue.computed)({
			get() {
				var _options$fallbackInde;
				const targetList = listRef.value;
				let index$1 = (options === null || options === void 0 ? void 0 : options.getIndexOf) ? options.getIndexOf(state.value, targetList) : targetList.indexOf(state.value);
				if (index$1 < 0) index$1 = (_options$fallbackInde = options === null || options === void 0 ? void 0 : options.fallbackIndex) !== null && _options$fallbackInde !== void 0 ? _options$fallbackInde : 0;
				return index$1;
			},
			set(v) {
				set(v);
			}
		});
		function set(i) {
			const targetList = listRef.value;
			const length = targetList.length;
			const value = targetList[(i % length + length) % length];
			state.value = value;
			return value;
		}
		function shift(delta = 1) {
			return set(index.value + delta);
		}
		function next(n = 1) {
			return shift(n);
		}
		function prev(n = 1) {
			return shift(-n);
		}
		function getInitialValue() {
			var _toValue, _options$initialValue;
			return (_toValue = (0, vue.toValue)((_options$initialValue = options === null || options === void 0 ? void 0 : options.initialValue) !== null && _options$initialValue !== void 0 ? _options$initialValue : (0, vue.toValue)(list)[0])) !== null && _toValue !== void 0 ? _toValue : void 0;
		}
		(0, vue.watch)(listRef, () => set(index.value));
		return {
			state,
			index,
			next,
			prev,
			go: set
		};
	}

//#endregion
//#region useDark/index.ts
/**
	* Reactive dark mode with auto data persistence.
	*
	* @see https://vueuse.org/useDark
	* @param options
	*/
	function useDark(options = {}) {
		const { valueDark = "dark", valueLight = "" } = options;
		const mode = useColorMode({
			...options,
			onChanged: (mode$1, defaultHandler) => {
				var _options$onChanged;
				if (options.onChanged) (_options$onChanged = options.onChanged) === null || _options$onChanged === void 0 || _options$onChanged.call(options, mode$1 === "dark", defaultHandler, mode$1);
				else defaultHandler(mode$1);
			},
			modes: {
				dark: valueDark,
				light: valueLight
			}
		});
		const system = (0, vue.computed)(() => mode.system.value);
		return (0, vue.computed)({
			get() {
				return mode.value === "dark";
			},
			set(v) {
				const modeVal = v ? "dark" : "light";
				if (system.value === modeVal) mode.value = "auto";
				else mode.value = modeVal;
			}
		});
	}

//#endregion
//#region useManualRefHistory/index.ts
	function fnBypass(v) {
		return v;
	}
	function fnSetSource(source, value) {
		return source.value = value;
	}
	function defaultDump(clone) {
		return clone ? typeof clone === "function" ? clone : cloneFnJSON : fnBypass;
	}
	function defaultParse(clone) {
		return clone ? typeof clone === "function" ? clone : cloneFnJSON : fnBypass;
	}
	/**
	* Track the change history of a ref, also provides undo and redo functionality.
	*
	* @see https://vueuse.org/useManualRefHistory
	* @param source
	* @param options
	*/
	function useManualRefHistory(source, options = {}) {
		const { clone = false, dump = defaultDump(clone), parse = defaultParse(clone), setSource = fnSetSource } = options;
		function _createHistoryRecord() {
			return (0, vue.markRaw)({
				snapshot: dump(source.value),
				timestamp: (0, __vueuse_shared.timestamp)()
			});
		}
		const last = (0, vue.ref)(_createHistoryRecord());
		const undoStack = (0, vue.ref)([]);
		const redoStack = (0, vue.ref)([]);
		const _setSource = (record) => {
			setSource(source, parse(record.snapshot));
			last.value = record;
		};
		const commit = () => {
			undoStack.value.unshift(last.value);
			last.value = _createHistoryRecord();
			if (options.capacity && undoStack.value.length > options.capacity) undoStack.value.splice(options.capacity, Number.POSITIVE_INFINITY);
			if (redoStack.value.length) redoStack.value.splice(0, redoStack.value.length);
		};
		const clear = () => {
			undoStack.value.splice(0, undoStack.value.length);
			redoStack.value.splice(0, redoStack.value.length);
		};
		const undo = () => {
			const state = undoStack.value.shift();
			if (state) {
				redoStack.value.unshift(last.value);
				_setSource(state);
			}
		};
		const redo = () => {
			const state = redoStack.value.shift();
			if (state) {
				undoStack.value.unshift(last.value);
				_setSource(state);
			}
		};
		const reset = () => {
			_setSource(last.value);
		};
		return {
			source,
			undoStack,
			redoStack,
			last,
			history: (0, vue.computed)(() => [last.value, ...undoStack.value]),
			canUndo: (0, vue.computed)(() => undoStack.value.length > 0),
			canRedo: (0, vue.computed)(() => redoStack.value.length > 0),
			clear,
			commit,
			reset,
			undo,
			redo
		};
	}

//#endregion
//#region useRefHistory/index.ts
/**
	* Track the change history of a ref, also provides undo and redo functionality.
	*
	* @see https://vueuse.org/useRefHistory
	* @param source
	* @param options
	*/
	function useRefHistory(source, options = {}) {
		const { deep = false, flush = "pre", eventFilter, shouldCommit = () => true } = options;
		const { eventFilter: composedFilter, pause, resume: resumeTracking, isActive: isTracking } = (0, __vueuse_shared.pausableFilter)(eventFilter);
		let lastRawValue = source.value;
		const { ignoreUpdates, ignorePrevAsyncUpdates, stop } = (0, __vueuse_shared.watchIgnorable)(source, commit, {
			deep,
			flush,
			eventFilter: composedFilter
		});
		function setSource(source$1, value) {
			ignorePrevAsyncUpdates();
			ignoreUpdates(() => {
				source$1.value = value;
				lastRawValue = value;
			});
		}
		const manualHistory = useManualRefHistory(source, {
			...options,
			clone: options.clone || deep,
			setSource
		});
		const { clear, commit: manualCommit } = manualHistory;
		function commit() {
			ignorePrevAsyncUpdates();
			if (!shouldCommit(lastRawValue, source.value)) return;
			lastRawValue = source.value;
			manualCommit();
		}
		function resume(commitNow) {
			resumeTracking();
			if (commitNow) commit();
		}
		function batch(fn) {
			let canceled = false;
			const cancel = () => canceled = true;
			ignoreUpdates(() => {
				fn(cancel);
			});
			if (!canceled) commit();
		}
		function dispose() {
			stop();
			clear();
		}
		return {
			...manualHistory,
			isTracking,
			pause,
			resume,
			commit,
			batch,
			dispose
		};
	}

//#endregion
//#region useDebouncedRefHistory/index.ts
/**
	* Shorthand for [useRefHistory](https://vueuse.org/useRefHistory) with debounce filter.
	*
	* @see https://vueuse.org/useDebouncedRefHistory
	* @param source
	* @param options
	*/
	function useDebouncedRefHistory(source, options = {}) {
		const filter = options.debounce ? (0, __vueuse_shared.debounceFilter)(options.debounce) : void 0;
		return { ...useRefHistory(source, {
			...options,
			eventFilter: filter
		}) };
	}

//#endregion
//#region useDeviceMotion/index.ts
/**
	* Reactive DeviceMotionEvent.
	*
	* @see https://vueuse.org/useDeviceMotion
	* @param options
	*/
	function useDeviceMotion(options = {}) {
		const { window: window$1 = defaultWindow, requestPermissions = false, eventFilter = __vueuse_shared.bypassFilter } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => typeof DeviceMotionEvent !== "undefined");
		const requirePermissions = /* @__PURE__ */ useSupported(() => isSupported.value && "requestPermission" in DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function");
		const permissionGranted = (0, vue.shallowRef)(false);
		const acceleration = (0, vue.ref)({
			x: null,
			y: null,
			z: null
		});
		const rotationRate = (0, vue.ref)({
			alpha: null,
			beta: null,
			gamma: null
		});
		const interval = (0, vue.shallowRef)(0);
		const accelerationIncludingGravity = (0, vue.ref)({
			x: null,
			y: null,
			z: null
		});
		function init() {
			if (window$1) useEventListener(window$1, "devicemotion", (0, __vueuse_shared.createFilterWrapper)(eventFilter, (event) => {
				var _event$acceleration, _event$acceleration2, _event$acceleration3, _event$accelerationIn, _event$accelerationIn2, _event$accelerationIn3, _event$rotationRate, _event$rotationRate2, _event$rotationRate3;
				acceleration.value = {
					x: ((_event$acceleration = event.acceleration) === null || _event$acceleration === void 0 ? void 0 : _event$acceleration.x) || null,
					y: ((_event$acceleration2 = event.acceleration) === null || _event$acceleration2 === void 0 ? void 0 : _event$acceleration2.y) || null,
					z: ((_event$acceleration3 = event.acceleration) === null || _event$acceleration3 === void 0 ? void 0 : _event$acceleration3.z) || null
				};
				accelerationIncludingGravity.value = {
					x: ((_event$accelerationIn = event.accelerationIncludingGravity) === null || _event$accelerationIn === void 0 ? void 0 : _event$accelerationIn.x) || null,
					y: ((_event$accelerationIn2 = event.accelerationIncludingGravity) === null || _event$accelerationIn2 === void 0 ? void 0 : _event$accelerationIn2.y) || null,
					z: ((_event$accelerationIn3 = event.accelerationIncludingGravity) === null || _event$accelerationIn3 === void 0 ? void 0 : _event$accelerationIn3.z) || null
				};
				rotationRate.value = {
					alpha: ((_event$rotationRate = event.rotationRate) === null || _event$rotationRate === void 0 ? void 0 : _event$rotationRate.alpha) || null,
					beta: ((_event$rotationRate2 = event.rotationRate) === null || _event$rotationRate2 === void 0 ? void 0 : _event$rotationRate2.beta) || null,
					gamma: ((_event$rotationRate3 = event.rotationRate) === null || _event$rotationRate3 === void 0 ? void 0 : _event$rotationRate3.gamma) || null
				};
				interval.value = event.interval;
			}), { passive: true });
		}
		const ensurePermissions = async () => {
			if (!requirePermissions.value) permissionGranted.value = true;
			if (permissionGranted.value) return;
			if (requirePermissions.value) {
				const requestPermission = DeviceMotionEvent.requestPermission;
				try {
					if (await requestPermission() === "granted") {
						permissionGranted.value = true;
						init();
					}
				} catch (error) {
					console.error(error);
				}
			}
		};
		if (isSupported.value) if (requestPermissions && requirePermissions.value) ensurePermissions().then(() => init());
		else init();
		return {
			acceleration,
			accelerationIncludingGravity,
			rotationRate,
			interval,
			isSupported,
			requirePermissions,
			ensurePermissions,
			permissionGranted
		};
	}

//#endregion
//#region useDeviceOrientation/index.ts
/**
	* Reactive DeviceOrientationEvent.
	*
	* @see https://vueuse.org/useDeviceOrientation
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useDeviceOrientation(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "DeviceOrientationEvent" in window$1);
		const isAbsolute = (0, vue.shallowRef)(false);
		const alpha = (0, vue.shallowRef)(null);
		const beta = (0, vue.shallowRef)(null);
		const gamma = (0, vue.shallowRef)(null);
		if (window$1 && isSupported.value) useEventListener(window$1, "deviceorientation", (event) => {
			isAbsolute.value = event.absolute;
			alpha.value = event.alpha;
			beta.value = event.beta;
			gamma.value = event.gamma;
		}, { passive: true });
		return {
			isSupported,
			isAbsolute,
			alpha,
			beta,
			gamma
		};
	}

//#endregion
//#region useDevicePixelRatio/index.ts
/**
	* Reactively track `window.devicePixelRatio`.
	*
	* @see https://vueuse.org/useDevicePixelRatio
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useDevicePixelRatio(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const pixelRatio = (0, vue.shallowRef)(1);
		const query = useMediaQuery(() => `(resolution: ${pixelRatio.value}dppx)`, options);
		let stop = __vueuse_shared.noop;
		if (window$1) stop = (0, __vueuse_shared.watchImmediate)(query, () => pixelRatio.value = window$1.devicePixelRatio);
		return {
			pixelRatio: (0, vue.readonly)(pixelRatio),
			stop
		};
	}

//#endregion
//#region useDevicesList/index.ts
/**
	* Reactive `enumerateDevices` listing available input/output devices
	*
	* @see https://vueuse.org/useDevicesList
	* @param options
	*/
	function useDevicesList(options = {}) {
		const { navigator: navigator$1 = defaultNavigator, requestPermissions = false, constraints = {
			audio: true,
			video: true
		}, onUpdated: onUpdated$2 } = options;
		const devices = (0, vue.ref)([]);
		const videoInputs = (0, vue.computed)(() => devices.value.filter((i) => i.kind === "videoinput"));
		const audioInputs = (0, vue.computed)(() => devices.value.filter((i) => i.kind === "audioinput"));
		const audioOutputs = (0, vue.computed)(() => devices.value.filter((i) => i.kind === "audiooutput"));
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && navigator$1.mediaDevices && navigator$1.mediaDevices.enumerateDevices);
		const permissionGranted = (0, vue.shallowRef)(false);
		let stream;
		async function update() {
			if (!isSupported.value) return;
			devices.value = await navigator$1.mediaDevices.enumerateDevices();
			onUpdated$2 === null || onUpdated$2 === void 0 || onUpdated$2(devices.value);
			if (stream) {
				stream.getTracks().forEach((t) => t.stop());
				stream = null;
			}
		}
		async function ensurePermissions() {
			const deviceName = constraints.video ? "camera" : "microphone";
			if (!isSupported.value) return false;
			if (permissionGranted.value) return true;
			const { state, query } = usePermission(deviceName, { controls: true });
			await query();
			if (state.value !== "granted") {
				let granted = true;
				try {
					const allDevices = await navigator$1.mediaDevices.enumerateDevices();
					const hasCamera = allDevices.some((device) => device.kind === "videoinput");
					const hasMicrophone = allDevices.some((device) => device.kind === "audioinput" || device.kind === "audiooutput");
					constraints.video = hasCamera ? constraints.video : false;
					constraints.audio = hasMicrophone ? constraints.audio : false;
					stream = await navigator$1.mediaDevices.getUserMedia(constraints);
				} catch (_unused) {
					stream = null;
					granted = false;
				}
				update();
				permissionGranted.value = granted;
			} else permissionGranted.value = true;
			return permissionGranted.value;
		}
		if (isSupported.value) {
			if (requestPermissions) ensurePermissions();
			useEventListener(navigator$1.mediaDevices, "devicechange", update, { passive: true });
			update();
		}
		return {
			devices,
			ensurePermissions,
			permissionGranted,
			videoInputs,
			audioInputs,
			audioOutputs,
			isSupported
		};
	}

//#endregion
//#region useDisplayMedia/index.ts
/**
	* Reactive `mediaDevices.getDisplayMedia` streaming
	*
	* @see https://vueuse.org/useDisplayMedia
	* @param options
	*/
	function useDisplayMedia(options = {}) {
		var _options$enabled;
		const enabled = (0, vue.shallowRef)((_options$enabled = options.enabled) !== null && _options$enabled !== void 0 ? _options$enabled : false);
		const video = options.video;
		const audio = options.audio;
		const { navigator: navigator$1 = defaultNavigator } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => {
			var _navigator$mediaDevic;
			return navigator$1 === null || navigator$1 === void 0 || (_navigator$mediaDevic = navigator$1.mediaDevices) === null || _navigator$mediaDevic === void 0 ? void 0 : _navigator$mediaDevic.getDisplayMedia;
		});
		const constraint = {
			audio,
			video
		};
		const stream = (0, vue.shallowRef)();
		async function _start() {
			var _stream$value;
			if (!isSupported.value || stream.value) return;
			stream.value = await navigator$1.mediaDevices.getDisplayMedia(constraint);
			(_stream$value = stream.value) === null || _stream$value === void 0 || _stream$value.getTracks().forEach((t) => useEventListener(t, "ended", stop, { passive: true }));
			return stream.value;
		}
		async function _stop() {
			var _stream$value2;
			(_stream$value2 = stream.value) === null || _stream$value2 === void 0 || _stream$value2.getTracks().forEach((t) => t.stop());
			stream.value = void 0;
		}
		function stop() {
			_stop();
			enabled.value = false;
		}
		async function start() {
			await _start();
			if (stream.value) enabled.value = true;
			return stream.value;
		}
		(0, vue.watch)(enabled, (v) => {
			if (v) _start();
			else _stop();
		}, { immediate: true });
		return {
			isSupported,
			stream,
			start,
			stop,
			enabled
		};
	}

//#endregion
//#region useDocumentVisibility/index.ts
/**
	* Reactively track `document.visibilityState`.
	*
	* @see https://vueuse.org/useDocumentVisibility
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useDocumentVisibility(options = {}) {
		const { document: document$1 = defaultDocument } = options;
		if (!document$1) return (0, vue.shallowRef)("visible");
		const visibility = (0, vue.shallowRef)(document$1.visibilityState);
		useEventListener(document$1, "visibilitychange", () => {
			visibility.value = document$1.visibilityState;
		}, { passive: true });
		return visibility;
	}

//#endregion
//#region useDraggable/index.ts
	const defaultScrollConfig = {
		speed: 2,
		margin: 30,
		direction: "both"
	};
	function clampContainerScroll(container) {
		if (container.scrollLeft > container.scrollWidth - container.clientWidth) container.scrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
		if (container.scrollTop > container.scrollHeight - container.clientHeight) container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
	}
	/**
	* Make elements draggable.
	*
	* @see https://vueuse.org/useDraggable
	* @param target
	* @param options
	*/
	function useDraggable(target, options = {}) {
		var _toValue, _toValue2, _toValue3, _scrollConfig$directi;
		const { pointerTypes, preventDefault: preventDefault$1, stopPropagation, exact, onMove, onEnd, onStart, initialValue, axis = "both", draggingElement = defaultWindow, containerElement, handle: draggingHandle = target, buttons = [0], restrictInView, autoScroll = false } = options;
		const position = (0, vue.ref)((_toValue = (0, vue.toValue)(initialValue)) !== null && _toValue !== void 0 ? _toValue : {
			x: 0,
			y: 0
		});
		const pressedDelta = (0, vue.ref)();
		const filterEvent = (e) => {
			if (pointerTypes) return pointerTypes.includes(e.pointerType);
			return true;
		};
		const handleEvent = (e) => {
			if ((0, vue.toValue)(preventDefault$1)) e.preventDefault();
			if ((0, vue.toValue)(stopPropagation)) e.stopPropagation();
		};
		const scrollConfig = (0, vue.toValue)(autoScroll);
		const scrollSettings = typeof scrollConfig === "object" ? {
			speed: (_toValue2 = (0, vue.toValue)(scrollConfig.speed)) !== null && _toValue2 !== void 0 ? _toValue2 : defaultScrollConfig.speed,
			margin: (_toValue3 = (0, vue.toValue)(scrollConfig.margin)) !== null && _toValue3 !== void 0 ? _toValue3 : defaultScrollConfig.margin,
			direction: (_scrollConfig$directi = scrollConfig.direction) !== null && _scrollConfig$directi !== void 0 ? _scrollConfig$directi : defaultScrollConfig.direction
		} : defaultScrollConfig;
		const getScrollAxisValues = (value) => typeof value === "number" ? [value, value] : [value.x, value.y];
		const handleAutoScroll = (container, targetRect, position$1) => {
			const { clientWidth, clientHeight, scrollLeft, scrollTop, scrollWidth, scrollHeight } = container;
			const [marginX, marginY] = getScrollAxisValues(scrollSettings.margin);
			const [speedX, speedY] = getScrollAxisValues(scrollSettings.speed);
			let deltaX = 0;
			let deltaY = 0;
			if (scrollSettings.direction === "x" || scrollSettings.direction === "both") {
				if (position$1.x < marginX && scrollLeft > 0) deltaX = -speedX;
				else if (position$1.x + targetRect.width > clientWidth - marginX && scrollLeft < scrollWidth - clientWidth) deltaX = speedX;
			}
			if (scrollSettings.direction === "y" || scrollSettings.direction === "both") {
				if (position$1.y < marginY && scrollTop > 0) deltaY = -speedY;
				else if (position$1.y + targetRect.height > clientHeight - marginY && scrollTop < scrollHeight - clientHeight) deltaY = speedY;
			}
			if (deltaX || deltaY) container.scrollBy({
				left: deltaX,
				top: deltaY,
				behavior: "auto"
			});
		};
		let autoScrollInterval = null;
		const startAutoScroll = () => {
			const container = (0, vue.toValue)(containerElement);
			if (container && !autoScrollInterval) autoScrollInterval = setInterval(() => {
				const targetRect = (0, vue.toValue)(target).getBoundingClientRect();
				const { x, y } = position.value;
				const relativePosition = {
					x: x - container.scrollLeft,
					y: y - container.scrollTop
				};
				if (relativePosition.x >= 0 && relativePosition.y >= 0) {
					handleAutoScroll(container, targetRect, relativePosition);
					relativePosition.x += container.scrollLeft;
					relativePosition.y += container.scrollTop;
					position.value = relativePosition;
				}
			}, 1e3 / 60);
		};
		const stopAutoScroll = () => {
			if (autoScrollInterval) {
				clearInterval(autoScrollInterval);
				autoScrollInterval = null;
			}
		};
		const isPointerNearEdge = (pointer, container, margin, targetRect) => {
			const [marginX, marginY] = typeof margin === "number" ? [margin, margin] : [margin.x, margin.y];
			const { clientWidth, clientHeight } = container;
			return pointer.x < marginX || pointer.x + targetRect.width > clientWidth - marginX || pointer.y < marginY || pointer.y + targetRect.height > clientHeight - marginY;
		};
		const checkAutoScroll = () => {
			if ((0, vue.toValue)(options.disabled) || !pressedDelta.value) return;
			const container = (0, vue.toValue)(containerElement);
			if (!container) return;
			const targetRect = (0, vue.toValue)(target).getBoundingClientRect();
			const { x, y } = position.value;
			if (isPointerNearEdge({
				x: x - container.scrollLeft,
				y: y - container.scrollTop
			}, container, scrollSettings.margin, targetRect)) startAutoScroll();
			else stopAutoScroll();
		};
		if ((0, vue.toValue)(autoScroll)) (0, vue.watch)(position, checkAutoScroll);
		const start = (e) => {
			var _container$getBoundin;
			if (!(0, vue.toValue)(buttons).includes(e.button)) return;
			if ((0, vue.toValue)(options.disabled) || !filterEvent(e)) return;
			if ((0, vue.toValue)(exact) && e.target !== (0, vue.toValue)(target)) return;
			const container = (0, vue.toValue)(containerElement);
			const containerRect = container === null || container === void 0 || (_container$getBoundin = container.getBoundingClientRect) === null || _container$getBoundin === void 0 ? void 0 : _container$getBoundin.call(container);
			const targetRect = (0, vue.toValue)(target).getBoundingClientRect();
			const pos = {
				x: e.clientX - (container ? targetRect.left - containerRect.left + (autoScroll ? 0 : container.scrollLeft) : targetRect.left),
				y: e.clientY - (container ? targetRect.top - containerRect.top + (autoScroll ? 0 : container.scrollTop) : targetRect.top)
			};
			if ((onStart === null || onStart === void 0 ? void 0 : onStart(pos, e)) === false) return;
			pressedDelta.value = pos;
			handleEvent(e);
		};
		const move = (e) => {
			if ((0, vue.toValue)(options.disabled) || !filterEvent(e)) return;
			if (!pressedDelta.value) return;
			const container = (0, vue.toValue)(containerElement);
			if (container instanceof HTMLElement) clampContainerScroll(container);
			const targetRect = (0, vue.toValue)(target).getBoundingClientRect();
			let { x, y } = position.value;
			if (axis === "x" || axis === "both") {
				x = e.clientX - pressedDelta.value.x;
				if (container) x = Math.min(Math.max(0, x), container.scrollWidth - targetRect.width);
			}
			if (axis === "y" || axis === "both") {
				y = e.clientY - pressedDelta.value.y;
				if (container) y = Math.min(Math.max(0, y), container.scrollHeight - targetRect.height);
			}
			if ((0, vue.toValue)(autoScroll) && container) {
				if (autoScrollInterval === null) handleAutoScroll(container, targetRect, {
					x,
					y
				});
				x += container.scrollLeft;
				y += container.scrollTop;
			}
			if (container && (restrictInView || autoScroll)) {
				if (axis !== "y") {
					const relativeX = x - container.scrollLeft;
					if (relativeX < 0) x = container.scrollLeft;
					else if (relativeX > container.clientWidth - targetRect.width) x = container.clientWidth - targetRect.width + container.scrollLeft;
				}
				if (axis !== "x") {
					const relativeY = y - container.scrollTop;
					if (relativeY < 0) y = container.scrollTop;
					else if (relativeY > container.clientHeight - targetRect.height) y = container.clientHeight - targetRect.height + container.scrollTop;
				}
			}
			position.value = {
				x,
				y
			};
			onMove === null || onMove === void 0 || onMove(position.value, e);
			handleEvent(e);
		};
		const end = (e) => {
			if ((0, vue.toValue)(options.disabled) || !filterEvent(e)) return;
			if (!pressedDelta.value) return;
			pressedDelta.value = void 0;
			if (autoScroll) stopAutoScroll();
			onEnd === null || onEnd === void 0 || onEnd(position.value, e);
			handleEvent(e);
		};
		if (__vueuse_shared.isClient) {
			const config = () => {
				var _options$capture;
				return {
					capture: (_options$capture = options.capture) !== null && _options$capture !== void 0 ? _options$capture : true,
					passive: !(0, vue.toValue)(preventDefault$1)
				};
			};
			useEventListener(draggingHandle, "pointerdown", start, config);
			useEventListener(draggingElement, "pointermove", move, config);
			useEventListener(draggingElement, "pointerup", end, config);
		}
		return {
			...(0, __vueuse_shared.toRefs)(position),
			position,
			isDragging: (0, vue.computed)(() => !!pressedDelta.value),
			style: (0, vue.computed)(() => `
      left: ${position.value.x}px;
      top: ${position.value.y}px;
      ${autoScroll ? "text-wrap: nowrap;" : ""}
    `)
		};
	}

//#endregion
//#region useDropZone/index.ts
	function useDropZone(target, options = {}) {
		const isOverDropZone = (0, vue.shallowRef)(false);
		const files = (0, vue.shallowRef)(null);
		let counter = 0;
		let isValid = true;
		if (__vueuse_shared.isClient) {
			var _options$multiple, _options$preventDefau;
			const _options = typeof options === "function" ? { onDrop: options } : options;
			const multiple = (_options$multiple = _options.multiple) !== null && _options$multiple !== void 0 ? _options$multiple : true;
			const preventDefaultForUnhandled = (_options$preventDefau = _options.preventDefaultForUnhandled) !== null && _options$preventDefau !== void 0 ? _options$preventDefau : false;
			const getFiles = (event) => {
				var _event$dataTransfer$f, _event$dataTransfer;
				const list = Array.from((_event$dataTransfer$f = (_event$dataTransfer = event.dataTransfer) === null || _event$dataTransfer === void 0 ? void 0 : _event$dataTransfer.files) !== null && _event$dataTransfer$f !== void 0 ? _event$dataTransfer$f : []);
				return list.length === 0 ? null : multiple ? list : [list[0]];
			};
			const checkDataTypes = (types) => {
				const dataTypes = (0, vue.unref)(_options.dataTypes);
				if (typeof dataTypes === "function") return dataTypes(types);
				if (!(dataTypes === null || dataTypes === void 0 ? void 0 : dataTypes.length)) return true;
				if (types.length === 0) return false;
				return types.every((type) => dataTypes.some((allowedType) => type.includes(allowedType)));
			};
			const checkValidity = (items) => {
				if (_options.checkValidity) return _options.checkValidity(items);
				const dataTypesValid = checkDataTypes(Array.from(items !== null && items !== void 0 ? items : []).map((item) => item.type));
				const multipleFilesValid = multiple || items.length <= 1;
				return dataTypesValid && multipleFilesValid;
			};
			const isSafari = () => /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent) && !("chrome" in window);
			const handleDragEvent = (event, eventType) => {
				var _event$dataTransfer2, _ref;
				const dataTransferItemList = (_event$dataTransfer2 = event.dataTransfer) === null || _event$dataTransfer2 === void 0 ? void 0 : _event$dataTransfer2.items;
				isValid = (_ref = dataTransferItemList && checkValidity(dataTransferItemList)) !== null && _ref !== void 0 ? _ref : false;
				if (preventDefaultForUnhandled) event.preventDefault();
				if (!isSafari() && !isValid) {
					if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
					return;
				}
				event.preventDefault();
				if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
				const currentFiles = getFiles(event);
				switch (eventType) {
					case "enter":
						var _options$onEnter;
						counter += 1;
						isOverDropZone.value = true;
						(_options$onEnter = _options.onEnter) === null || _options$onEnter === void 0 || _options$onEnter.call(_options, null, event);
						break;
					case "over":
						var _options$onOver;
						(_options$onOver = _options.onOver) === null || _options$onOver === void 0 || _options$onOver.call(_options, null, event);
						break;
					case "leave":
						var _options$onLeave;
						counter -= 1;
						if (counter === 0) isOverDropZone.value = false;
						(_options$onLeave = _options.onLeave) === null || _options$onLeave === void 0 || _options$onLeave.call(_options, null, event);
						break;
					case "drop":
						counter = 0;
						isOverDropZone.value = false;
						if (isValid) {
							var _options$onDrop;
							files.value = currentFiles;
							(_options$onDrop = _options.onDrop) === null || _options$onDrop === void 0 || _options$onDrop.call(_options, currentFiles, event);
						}
						break;
				}
			};
			useEventListener(target, "dragenter", (event) => handleDragEvent(event, "enter"));
			useEventListener(target, "dragover", (event) => handleDragEvent(event, "over"));
			useEventListener(target, "dragleave", (event) => handleDragEvent(event, "leave"));
			useEventListener(target, "drop", (event) => handleDragEvent(event, "drop"));
		}
		return {
			files,
			isOverDropZone
		};
	}

//#endregion
//#region useResizeObserver/index.ts
/**
	* Reports changes to the dimensions of an Element's content or the border-box
	*
	* @see https://vueuse.org/useResizeObserver
	* @param target
	* @param callback
	* @param options
	*/
	function useResizeObserver(target, callback, options = {}) {
		const { window: window$1 = defaultWindow,...observerOptions } = options;
		let observer;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "ResizeObserver" in window$1);
		const cleanup = () => {
			if (observer) {
				observer.disconnect();
				observer = void 0;
			}
		};
		const stopWatch = (0, vue.watch)((0, vue.computed)(() => {
			const _targets = (0, vue.toValue)(target);
			return Array.isArray(_targets) ? _targets.map((el) => unrefElement(el)) : [unrefElement(_targets)];
		}), (els) => {
			cleanup();
			if (isSupported.value && window$1) {
				observer = new ResizeObserver(callback);
				for (const _el of els) if (_el) observer.observe(_el, observerOptions);
			}
		}, {
			immediate: true,
			flush: "post"
		});
		const stop = () => {
			cleanup();
			stopWatch();
		};
		(0, __vueuse_shared.tryOnScopeDispose)(stop);
		return {
			isSupported,
			stop
		};
	}

//#endregion
//#region useElementBounding/index.ts
/**
	* Reactive bounding box of an HTML element.
	*
	* @see https://vueuse.org/useElementBounding
	* @param target
	*/
	function useElementBounding(target, options = {}) {
		const { reset = true, windowResize = true, windowScroll = true, immediate = true, updateTiming = "sync" } = options;
		const height = (0, vue.shallowRef)(0);
		const bottom = (0, vue.shallowRef)(0);
		const left = (0, vue.shallowRef)(0);
		const right = (0, vue.shallowRef)(0);
		const top = (0, vue.shallowRef)(0);
		const width = (0, vue.shallowRef)(0);
		const x = (0, vue.shallowRef)(0);
		const y = (0, vue.shallowRef)(0);
		function recalculate() {
			const el = unrefElement(target);
			if (!el) {
				if (reset) {
					height.value = 0;
					bottom.value = 0;
					left.value = 0;
					right.value = 0;
					top.value = 0;
					width.value = 0;
					x.value = 0;
					y.value = 0;
				}
				return;
			}
			const rect = el.getBoundingClientRect();
			height.value = rect.height;
			bottom.value = rect.bottom;
			left.value = rect.left;
			right.value = rect.right;
			top.value = rect.top;
			width.value = rect.width;
			x.value = rect.x;
			y.value = rect.y;
		}
		function update() {
			if (updateTiming === "sync") recalculate();
			else if (updateTiming === "next-frame") requestAnimationFrame(() => recalculate());
		}
		useResizeObserver(target, update);
		(0, vue.watch)(() => unrefElement(target), (ele) => !ele && update());
		useMutationObserver(target, update, { attributeFilter: ["style", "class"] });
		if (windowScroll) useEventListener("scroll", update, {
			capture: true,
			passive: true
		});
		if (windowResize) useEventListener("resize", update, { passive: true });
		(0, __vueuse_shared.tryOnMounted)(() => {
			if (immediate) update();
		});
		return {
			height,
			bottom,
			left,
			right,
			top,
			width,
			x,
			y,
			update
		};
	}

//#endregion
//#region useElementByPoint/index.ts
	function getDefaultScheduler$7(options) {
		if ("interval" in options || "immediate" in options) {
			const { interval = "requestAnimationFrame", immediate = true } = options;
			return interval === "requestAnimationFrame" ? (cb) => useRafFn(cb, { immediate }) : (cb) => (0, __vueuse_shared.useIntervalFn)(cb, interval, { immediate });
		}
		return useRafFn;
	}
	/**
	* Reactive element by point.
	*
	* @see https://vueuse.org/useElementByPoint
	* @param options - UseElementByPointOptions
	*/
	function useElementByPoint(options) {
		const { x, y, document: document$1 = defaultDocument, multiple, scheduler = getDefaultScheduler$7(options) } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => {
			if ((0, vue.toValue)(multiple)) return document$1 && "elementsFromPoint" in document$1;
			return document$1 && "elementFromPoint" in document$1;
		});
		const element = (0, vue.shallowRef)(null);
		return {
			isSupported,
			element,
			...scheduler(() => {
				var _document$elementsFro, _document$elementFrom;
				element.value = (0, vue.toValue)(multiple) ? (_document$elementsFro = document$1 === null || document$1 === void 0 ? void 0 : document$1.elementsFromPoint((0, vue.toValue)(x), (0, vue.toValue)(y))) !== null && _document$elementsFro !== void 0 ? _document$elementsFro : [] : (_document$elementFrom = document$1 === null || document$1 === void 0 ? void 0 : document$1.elementFromPoint((0, vue.toValue)(x), (0, vue.toValue)(y))) !== null && _document$elementFrom !== void 0 ? _document$elementFrom : null;
			})
		};
	}

//#endregion
//#region useElementHover/index.ts
	function useElementHover(el, options = {}) {
		const { delayEnter = 0, delayLeave = 0, triggerOnRemoval = false, window: window$1 = defaultWindow } = options;
		const isHovered = (0, vue.shallowRef)(false);
		let timer;
		const toggle = (entering) => {
			const delay = entering ? delayEnter : delayLeave;
			if (timer) {
				clearTimeout(timer);
				timer = void 0;
			}
			if (delay) timer = setTimeout(() => isHovered.value = entering, delay);
			else isHovered.value = entering;
		};
		if (!window$1) return isHovered;
		useEventListener(el, "mouseenter", () => toggle(true), { passive: true });
		useEventListener(el, "mouseleave", () => toggle(false), { passive: true });
		if (triggerOnRemoval) onElementRemoval((0, vue.computed)(() => unrefElement(el)), () => toggle(false));
		return isHovered;
	}

//#endregion
//#region useElementSize/index.ts
/**
	* Reactive size of an HTML element.
	*
	* @see https://vueuse.org/useElementSize
	*/
	function useElementSize(target, initialSize = {
		width: 0,
		height: 0
	}, options = {}) {
		const { window: window$1 = defaultWindow, box = "content-box" } = options;
		const isSVG = (0, vue.computed)(() => {
			var _unrefElement;
			return (_unrefElement = unrefElement(target)) === null || _unrefElement === void 0 || (_unrefElement = _unrefElement.namespaceURI) === null || _unrefElement === void 0 ? void 0 : _unrefElement.includes("svg");
		});
		const width = (0, vue.shallowRef)(initialSize.width);
		const height = (0, vue.shallowRef)(initialSize.height);
		const { stop: stop1 } = useResizeObserver(target, ([entry]) => {
			const boxSize = box === "border-box" ? entry.borderBoxSize : box === "content-box" ? entry.contentBoxSize : entry.devicePixelContentBoxSize;
			if (window$1 && isSVG.value) {
				const $elem = unrefElement(target);
				if ($elem) {
					const rect = $elem.getBoundingClientRect();
					width.value = rect.width;
					height.value = rect.height;
				}
			} else if (boxSize) {
				const formatBoxSize = (0, __vueuse_shared.toArray)(boxSize);
				width.value = formatBoxSize.reduce((acc, { inlineSize }) => acc + inlineSize, 0);
				height.value = formatBoxSize.reduce((acc, { blockSize }) => acc + blockSize, 0);
			} else {
				width.value = entry.contentRect.width;
				height.value = entry.contentRect.height;
			}
		}, options);
		(0, __vueuse_shared.tryOnMounted)(() => {
			const ele = unrefElement(target);
			if (ele) {
				width.value = "offsetWidth" in ele ? ele.offsetWidth : initialSize.width;
				height.value = "offsetHeight" in ele ? ele.offsetHeight : initialSize.height;
			}
		});
		const stop2 = (0, vue.watch)(() => unrefElement(target), (ele) => {
			width.value = ele ? initialSize.width : 0;
			height.value = ele ? initialSize.height : 0;
		});
		function stop() {
			stop1();
			stop2();
		}
		return {
			width,
			height,
			stop
		};
	}

//#endregion
//#region useIntersectionObserver/index.ts
/**
	* Detects that a target element's visibility.
	*
	* @see https://vueuse.org/useIntersectionObserver
	* @param target
	* @param callback
	* @param options
	*/
	function useIntersectionObserver(target, callback, options = {}) {
		const { root, rootMargin, threshold = 0, window: window$1 = defaultWindow, immediate = true } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "IntersectionObserver" in window$1);
		const targets = (0, vue.computed)(() => {
			return (0, __vueuse_shared.toArray)((0, vue.toValue)(target)).map(unrefElement).filter(__vueuse_shared.notNullish);
		});
		let cleanup = __vueuse_shared.noop;
		const isActive = (0, vue.shallowRef)(immediate);
		const stopWatch = isSupported.value ? (0, vue.watch)(() => [
			targets.value,
			unrefElement(root),
			(0, vue.toValue)(rootMargin),
			isActive.value
		], ([targets$1, root$1, rootMargin$1]) => {
			cleanup();
			if (!isActive.value) return;
			if (!targets$1.length) return;
			const observer = new IntersectionObserver(callback, {
				root: unrefElement(root$1),
				rootMargin: rootMargin$1,
				threshold
			});
			targets$1.forEach((el) => el && observer.observe(el));
			cleanup = () => {
				observer.disconnect();
				cleanup = __vueuse_shared.noop;
			};
		}, {
			immediate,
			flush: "post"
		}) : __vueuse_shared.noop;
		const stop = () => {
			cleanup();
			stopWatch();
			isActive.value = false;
		};
		(0, __vueuse_shared.tryOnScopeDispose)(stop);
		return {
			isSupported,
			isActive,
			pause() {
				cleanup();
				isActive.value = false;
			},
			resume() {
				isActive.value = true;
			},
			stop
		};
	}

//#endregion
//#region useElementVisibility/index.ts
/**
	* Tracks the visibility of an element within the viewport.
	*
	* @see https://vueuse.org/useElementVisibility
	*/
	function useElementVisibility(element, options = {}) {
		const { window: window$1 = defaultWindow, scrollTarget, threshold = 0, rootMargin, once = false, initialValue = false } = options;
		const elementIsVisible = (0, vue.shallowRef)(initialValue);
		const { stop } = useIntersectionObserver(element, (intersectionObserverEntries) => {
			let isIntersecting = elementIsVisible.value;
			let latestTime = 0;
			for (const entry of intersectionObserverEntries) if (entry.time >= latestTime) {
				latestTime = entry.time;
				isIntersecting = entry.isIntersecting;
			}
			elementIsVisible.value = isIntersecting;
			if (once) (0, __vueuse_shared.watchOnce)(elementIsVisible, () => {
				stop();
			});
		}, {
			root: scrollTarget,
			window: window$1,
			threshold,
			rootMargin
		});
		return elementIsVisible;
	}

//#endregion
//#region useEventBus/internal.ts
	const events = /* @__PURE__ */ new Map();

//#endregion
//#region useEventBus/index.ts
	/* @__NO_SIDE_EFFECTS__ */
	function useEventBus(key) {
		const scope = (0, vue.getCurrentScope)();
		function on(listener) {
			var _scope$cleanups;
			const listeners = events.get(key) || /* @__PURE__ */ new Set();
			listeners.add(listener);
			events.set(key, listeners);
			const _off = () => off(listener);
			scope === null || scope === void 0 || (_scope$cleanups = scope.cleanups) === null || _scope$cleanups === void 0 || _scope$cleanups.push(_off);
			return _off;
		}
		function once(listener) {
			function _listener(...args) {
				off(_listener);
				listener(...args);
			}
			return on(_listener);
		}
		function off(listener) {
			const listeners = events.get(key);
			if (!listeners) return;
			listeners.delete(listener);
			if (!listeners.size) reset();
		}
		function reset() {
			events.delete(key);
		}
		function emit(event, payload) {
			var _events$get;
			(_events$get = events.get(key)) === null || _events$get === void 0 || _events$get.forEach((v) => v(event, payload));
		}
		return {
			on,
			once,
			off,
			emit,
			reset
		};
	}

//#endregion
//#region useEventSource/index.ts
	function resolveNestedOptions$1(options) {
		if (options === true) return {};
		return options;
	}
	/**
	* Reactive wrapper for EventSource.
	*
	* @see https://vueuse.org/useEventSource
	* @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource EventSource
	* @param url
	* @param events
	* @param options
	*/
	function useEventSource(url, events$1 = [], options = {}) {
		const event = (0, vue.shallowRef)(null);
		const data = (0, vue.shallowRef)(null);
		const status = (0, vue.shallowRef)("CONNECTING");
		const eventSource = (0, vue.ref)(null);
		const error = (0, vue.shallowRef)(null);
		const urlRef = (0, __vueuse_shared.toRef)(url);
		const lastEventId = (0, vue.shallowRef)(null);
		let explicitlyClosed = false;
		let retried = 0;
		const { withCredentials = false, immediate = true, autoConnect = true, autoReconnect, serializer = { read: (v) => v } } = options;
		const close = () => {
			if (__vueuse_shared.isClient && eventSource.value) {
				eventSource.value.close();
				eventSource.value = null;
				status.value = "CLOSED";
				explicitlyClosed = true;
			}
		};
		const _init = () => {
			if (explicitlyClosed || typeof urlRef.value === "undefined") return;
			const es = new EventSource(urlRef.value, { withCredentials });
			status.value = "CONNECTING";
			eventSource.value = es;
			es.onopen = () => {
				status.value = "OPEN";
				error.value = null;
			};
			es.onerror = (e) => {
				status.value = "CLOSED";
				error.value = e;
				if (es.readyState === 2 && !explicitlyClosed && autoReconnect) {
					es.close();
					const { retries = -1, delay = 1e3, onFailed } = resolveNestedOptions$1(autoReconnect);
					retried += 1;
					if (typeof retries === "number" && (retries < 0 || retried < retries)) setTimeout(_init, delay);
					else if (typeof retries === "function" && retries()) setTimeout(_init, delay);
					else onFailed === null || onFailed === void 0 || onFailed();
				}
			};
			es.onmessage = (e) => {
				var _serializer$read;
				event.value = null;
				data.value = (_serializer$read = serializer.read(e.data)) !== null && _serializer$read !== void 0 ? _serializer$read : null;
				lastEventId.value = e.lastEventId;
			};
			for (const event_name of events$1) useEventListener(es, event_name, (e) => {
				var _serializer$read2, _e$lastEventId;
				event.value = event_name;
				data.value = (_serializer$read2 = serializer.read(e.data)) !== null && _serializer$read2 !== void 0 ? _serializer$read2 : null;
				lastEventId.value = (_e$lastEventId = e.lastEventId) !== null && _e$lastEventId !== void 0 ? _e$lastEventId : null;
			}, { passive: true });
		};
		const open = () => {
			if (!__vueuse_shared.isClient) return;
			close();
			explicitlyClosed = false;
			retried = 0;
			_init();
		};
		if (immediate) open();
		if (autoConnect) (0, vue.watch)(urlRef, open);
		(0, __vueuse_shared.tryOnScopeDispose)(close);
		return {
			eventSource,
			event,
			data,
			status,
			error,
			open,
			close,
			lastEventId
		};
	}

//#endregion
//#region useEyeDropper/index.ts
/**
	* Reactive [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API)
	*
	* @see https://vueuse.org/useEyeDropper
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useEyeDropper(options = {}) {
		const { initialValue = "" } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => typeof window !== "undefined" && "EyeDropper" in window);
		const sRGBHex = (0, vue.shallowRef)(initialValue);
		async function open(openOptions) {
			if (!isSupported.value) return;
			const result = await new window.EyeDropper().open(openOptions);
			sRGBHex.value = result.sRGBHex;
			return result;
		}
		return {
			isSupported,
			sRGBHex,
			open
		};
	}

//#endregion
//#region useFavicon/index.ts
	function useFavicon(newIcon = null, options = {}) {
		const { baseUrl = "", rel = "icon", document: document$1 = defaultDocument } = options;
		const favicon = (0, __vueuse_shared.toRef)(newIcon);
		const applyIcon = (icon) => {
			const elements = document$1 === null || document$1 === void 0 ? void 0 : document$1.head.querySelectorAll(`link[rel*="${rel}"]`);
			if (!elements || elements.length === 0) {
				const link = document$1 === null || document$1 === void 0 ? void 0 : document$1.createElement("link");
				if (link) {
					link.rel = rel;
					link.href = `${baseUrl}${icon}`;
					link.type = `image/${icon.split(".").pop()}`;
					document$1 === null || document$1 === void 0 || document$1.head.append(link);
				}
				return;
			}
			elements === null || elements === void 0 || elements.forEach((el) => el.href = `${baseUrl}${icon}`);
		};
		(0, vue.watch)(favicon, (i, o) => {
			if (typeof i === "string" && i !== o) applyIcon(i);
		}, { immediate: true });
		return favicon;
	}

//#endregion
//#region useFetch/index.ts
	const payloadMapping = {
		json: "application/json",
		text: "text/plain"
	};
	/**
	* !!!IMPORTANT!!!
	*
	* If you update the UseFetchOptions interface, be sure to update this object
	* to include the new options
	*/
	function isFetchOptions(obj) {
		return obj && (0, __vueuse_shared.containsProp)(obj, "immediate", "refetch", "initialData", "timeout", "beforeFetch", "afterFetch", "onFetchError", "fetch", "updateDataOnError");
	}
	const reAbsolute = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;
	function isAbsoluteURL(url) {
		return reAbsolute.test(url);
	}
	function headersToObject(headers) {
		if (typeof Headers !== "undefined" && headers instanceof Headers) return Object.fromEntries(headers.entries());
		return headers;
	}
	function combineCallbacks(combination, ...callbacks) {
		if (combination === "overwrite") return async (ctx) => {
			let callback;
			for (let i = callbacks.length - 1; i >= 0; i--) if (callbacks[i] != null) {
				callback = callbacks[i];
				break;
			}
			if (callback) return {
				...ctx,
				...await callback(ctx)
			};
			return ctx;
		};
		else return async (ctx) => {
			for (const callback of callbacks) if (callback) ctx = {
				...ctx,
				...await callback(ctx)
			};
			return ctx;
		};
	}
	function createFetch(config = {}) {
		const _combination = config.combination || "chain";
		const _options = config.options || {};
		const _fetchOptions = config.fetchOptions || {};
		function useFactoryFetch(url, ...args) {
			const computedUrl = (0, vue.computed)(() => {
				const baseUrl = (0, vue.toValue)(config.baseUrl);
				const targetUrl = (0, vue.toValue)(url);
				return baseUrl && !isAbsoluteURL(targetUrl) ? joinPaths(baseUrl, targetUrl) : targetUrl;
			});
			let options = _options;
			let fetchOptions = _fetchOptions;
			if (args.length > 0) if (isFetchOptions(args[0])) options = {
				...options,
				...args[0],
				beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[0].beforeFetch),
				afterFetch: combineCallbacks(_combination, _options.afterFetch, args[0].afterFetch),
				onFetchError: combineCallbacks(_combination, _options.onFetchError, args[0].onFetchError)
			};
			else fetchOptions = {
				...fetchOptions,
				...args[0],
				headers: {
					...headersToObject(fetchOptions.headers) || {},
					...headersToObject(args[0].headers) || {}
				}
			};
			if (args.length > 1 && isFetchOptions(args[1])) options = {
				...options,
				...args[1],
				beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[1].beforeFetch),
				afterFetch: combineCallbacks(_combination, _options.afterFetch, args[1].afterFetch),
				onFetchError: combineCallbacks(_combination, _options.onFetchError, args[1].onFetchError)
			};
			return useFetch(computedUrl, fetchOptions, options);
		}
		return useFactoryFetch;
	}
	function useFetch(url, ...args) {
		var _defaultWindow$fetch, _globalThis;
		const supportsAbort = typeof AbortController === "function";
		let fetchOptions = {};
		let options = {
			immediate: true,
			refetch: false,
			timeout: 0,
			updateDataOnError: false
		};
		const config = {
			method: "GET",
			type: "text",
			payload: void 0
		};
		if (args.length > 0) if (isFetchOptions(args[0])) options = {
			...options,
			...args[0]
		};
		else fetchOptions = args[0];
		if (args.length > 1) {
			if (isFetchOptions(args[1])) options = {
				...options,
				...args[1]
			};
		}
		const { fetch = (_defaultWindow$fetch = defaultWindow === null || defaultWindow === void 0 ? void 0 : defaultWindow.fetch) !== null && _defaultWindow$fetch !== void 0 ? _defaultWindow$fetch : (_globalThis = globalThis) === null || _globalThis === void 0 ? void 0 : _globalThis.fetch, initialData, timeout } = options;
		const responseEvent = (0, __vueuse_shared.createEventHook)();
		const errorEvent = (0, __vueuse_shared.createEventHook)();
		const finallyEvent = (0, __vueuse_shared.createEventHook)();
		const isFinished = (0, vue.shallowRef)(false);
		const isFetching = (0, vue.shallowRef)(false);
		const aborted = (0, vue.shallowRef)(false);
		const statusCode = (0, vue.shallowRef)(null);
		const response = (0, vue.shallowRef)(null);
		const error = (0, vue.shallowRef)(null);
		const data = (0, vue.shallowRef)(initialData || null);
		const canAbort = (0, vue.computed)(() => supportsAbort && isFetching.value);
		let controller;
		let timer;
		const abort = (reason) => {
			if (supportsAbort) {
				controller === null || controller === void 0 || controller.abort(reason);
				controller = new AbortController();
				controller.signal.onabort = () => aborted.value = true;
				fetchOptions = {
					...fetchOptions,
					signal: controller.signal
				};
			}
		};
		const loading = (isLoading) => {
			isFetching.value = isLoading;
			isFinished.value = !isLoading;
		};
		if (timeout) timer = (0, __vueuse_shared.useTimeoutFn)(abort, timeout, { immediate: false });
		let executeCounter = 0;
		const execute = async (throwOnFailed = false) => {
			var _context$options;
			abort();
			loading(true);
			error.value = null;
			statusCode.value = null;
			aborted.value = false;
			executeCounter += 1;
			const currentExecuteCounter = executeCounter;
			const defaultFetchOptions = {
				method: config.method,
				headers: {}
			};
			const payload = (0, vue.toValue)(config.payload);
			if (payload) {
				var _payloadMapping$confi;
				const headers = headersToObject(defaultFetchOptions.headers);
				const proto = Object.getPrototypeOf(payload);
				if (!config.payloadType && payload && (proto === Object.prototype || Array.isArray(proto)) && !(payload instanceof FormData)) config.payloadType = "json";
				if (config.payloadType) headers["Content-Type"] = (_payloadMapping$confi = payloadMapping[config.payloadType]) !== null && _payloadMapping$confi !== void 0 ? _payloadMapping$confi : config.payloadType;
				defaultFetchOptions.body = config.payloadType === "json" ? JSON.stringify(payload) : payload;
			}
			let isCanceled = false;
			const context = {
				url: (0, vue.toValue)(url),
				options: {
					...defaultFetchOptions,
					...fetchOptions
				},
				cancel: () => {
					isCanceled = true;
				}
			};
			if (options.beforeFetch) Object.assign(context, await options.beforeFetch(context));
			if (isCanceled || !fetch) {
				loading(false);
				return Promise.resolve(null);
			}
			let responseData = null;
			if (timer) timer.start();
			return fetch(context.url, {
				...defaultFetchOptions,
				...context.options,
				headers: {
					...headersToObject(defaultFetchOptions.headers),
					...headersToObject((_context$options = context.options) === null || _context$options === void 0 ? void 0 : _context$options.headers)
				}
			}).then(async (fetchResponse) => {
				response.value = fetchResponse;
				statusCode.value = fetchResponse.status;
				responseData = await fetchResponse.clone()[config.type]();
				if (!fetchResponse.ok) {
					data.value = initialData || null;
					throw new Error(fetchResponse.statusText);
				}
				if (options.afterFetch) ({data: responseData} = await options.afterFetch({
					data: responseData,
					response: fetchResponse,
					context,
					execute
				}));
				data.value = responseData;
				responseEvent.trigger(fetchResponse);
				return fetchResponse;
			}).catch(async (fetchError) => {
				let errorData = fetchError.message || fetchError.name;
				if (options.onFetchError) ({error: errorData, data: responseData} = await options.onFetchError({
					data: responseData,
					error: fetchError,
					response: response.value,
					context,
					execute
				}));
				error.value = errorData;
				if (options.updateDataOnError) data.value = responseData;
				errorEvent.trigger(fetchError);
				if (throwOnFailed) throw fetchError;
				return null;
			}).finally(() => {
				if (currentExecuteCounter === executeCounter) loading(false);
				if (timer) timer.stop();
				finallyEvent.trigger(null);
			});
		};
		const refetch = (0, __vueuse_shared.toRef)(options.refetch);
		(0, vue.watch)([refetch, (0, __vueuse_shared.toRef)(url)], ([refetch$1]) => refetch$1 && execute(), { deep: true });
		const shell = {
			isFinished: (0, vue.readonly)(isFinished),
			isFetching: (0, vue.readonly)(isFetching),
			statusCode,
			response,
			error,
			data,
			canAbort,
			aborted,
			abort,
			execute,
			onFetchResponse: responseEvent.on,
			onFetchError: errorEvent.on,
			onFetchFinally: finallyEvent.on,
			get: setMethod("GET"),
			put: setMethod("PUT"),
			post: setMethod("POST"),
			delete: setMethod("DELETE"),
			patch: setMethod("PATCH"),
			head: setMethod("HEAD"),
			options: setMethod("OPTIONS"),
			json: setType("json"),
			text: setType("text"),
			blob: setType("blob"),
			arrayBuffer: setType("arrayBuffer"),
			formData: setType("formData")
		};
		function setMethod(method) {
			return (payload, payloadType) => {
				if (!isFetching.value) {
					config.method = method;
					config.payload = payload;
					config.payloadType = payloadType;
					if ((0, vue.isRef)(config.payload)) (0, vue.watch)([refetch, (0, __vueuse_shared.toRef)(config.payload)], ([refetch$1]) => refetch$1 && execute(), { deep: true });
					return {
						...shell,
						then(onFulfilled, onRejected) {
							return waitUntilFinished().then(onFulfilled, onRejected);
						}
					};
				}
			};
		}
		function waitUntilFinished() {
			return new Promise((resolve, reject) => {
				(0, __vueuse_shared.until)(isFinished).toBe(true).then(() => resolve(shell)).catch(reject);
			});
		}
		function setType(type) {
			return () => {
				if (!isFetching.value) {
					config.type = type;
					return {
						...shell,
						then(onFulfilled, onRejected) {
							return waitUntilFinished().then(onFulfilled, onRejected);
						}
					};
				}
			};
		}
		if (options.immediate) Promise.resolve().then(() => execute());
		return {
			...shell,
			then(onFulfilled, onRejected) {
				return waitUntilFinished().then(onFulfilled, onRejected);
			}
		};
	}
	function joinPaths(start, end) {
		if (!start.endsWith("/") && !end.startsWith("/")) return `${start}/${end}`;
		if (start.endsWith("/") && end.startsWith("/")) return `${start.slice(0, -1)}${end}`;
		return `${start}${end}`;
	}

//#endregion
//#region useFileDialog/index.ts
	const DEFAULT_OPTIONS = {
		multiple: true,
		accept: "*",
		reset: false,
		directory: false
	};
	function prepareInitialFiles(files) {
		if (!files) return null;
		if (files instanceof FileList) return files;
		const dt = new DataTransfer();
		for (const file of files) dt.items.add(file);
		return dt.files;
	}
	/**
	* Open file dialog with ease.
	*
	* @see https://vueuse.org/useFileDialog
	* @param options
	*/
	function useFileDialog(options = {}) {
		const { document: document$1 = defaultDocument } = options;
		const files = (0, vue.ref)(prepareInitialFiles(options.initialFiles));
		const { on: onChange, trigger: changeTrigger } = (0, __vueuse_shared.createEventHook)();
		const { on: onCancel, trigger: cancelTrigger } = (0, __vueuse_shared.createEventHook)();
		const inputRef = (0, vue.computed)(() => {
			var _unrefElement;
			const input = (_unrefElement = unrefElement(options.input)) !== null && _unrefElement !== void 0 ? _unrefElement : document$1 ? document$1.createElement("input") : void 0;
			if (input) {
				input.type = "file";
				input.onchange = (event) => {
					files.value = event.target.files;
					changeTrigger(files.value);
				};
				input.oncancel = () => {
					cancelTrigger();
				};
			}
			return input;
		});
		const reset = () => {
			files.value = null;
			if (inputRef.value && inputRef.value.value) {
				inputRef.value.value = "";
				changeTrigger(null);
			}
		};
		const applyOptions = (options$1) => {
			const el = inputRef.value;
			if (!el) return;
			el.multiple = (0, vue.toValue)(options$1.multiple);
			el.accept = (0, vue.toValue)(options$1.accept);
			el.webkitdirectory = (0, vue.toValue)(options$1.directory);
			if ((0, __vueuse_shared.hasOwn)(options$1, "capture")) el.capture = (0, vue.toValue)(options$1.capture);
		};
		const open = (localOptions) => {
			const el = inputRef.value;
			if (!el) return;
			const mergedOptions = {
				...DEFAULT_OPTIONS,
				...options,
				...localOptions
			};
			applyOptions(mergedOptions);
			if ((0, vue.toValue)(mergedOptions.reset)) reset();
			el.click();
		};
		(0, vue.watchEffect)(() => {
			applyOptions(options);
		});
		return {
			files: (0, vue.readonly)(files),
			open,
			reset,
			onCancel,
			onChange
		};
	}

//#endregion
//#region useFileSystemAccess/index.ts
	function useFileSystemAccess(options = {}) {
		const { window: _window = defaultWindow, dataType = "Text" } = options;
		const window$1 = _window;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "showSaveFilePicker" in window$1 && "showOpenFilePicker" in window$1);
		const fileHandle = (0, vue.shallowRef)();
		const data = (0, vue.shallowRef)();
		const file = (0, vue.shallowRef)();
		const fileName = (0, vue.computed)(() => {
			var _file$value$name, _file$value;
			return (_file$value$name = (_file$value = file.value) === null || _file$value === void 0 ? void 0 : _file$value.name) !== null && _file$value$name !== void 0 ? _file$value$name : "";
		});
		const fileMIME = (0, vue.computed)(() => {
			var _file$value$type, _file$value2;
			return (_file$value$type = (_file$value2 = file.value) === null || _file$value2 === void 0 ? void 0 : _file$value2.type) !== null && _file$value$type !== void 0 ? _file$value$type : "";
		});
		const fileSize = (0, vue.computed)(() => {
			var _file$value$size, _file$value3;
			return (_file$value$size = (_file$value3 = file.value) === null || _file$value3 === void 0 ? void 0 : _file$value3.size) !== null && _file$value$size !== void 0 ? _file$value$size : 0;
		});
		const fileLastModified = (0, vue.computed)(() => {
			var _file$value$lastModif, _file$value4;
			return (_file$value$lastModif = (_file$value4 = file.value) === null || _file$value4 === void 0 ? void 0 : _file$value4.lastModified) !== null && _file$value$lastModif !== void 0 ? _file$value$lastModif : 0;
		});
		async function open(_options = {}) {
			if (!isSupported.value) return;
			const [handle] = await window$1.showOpenFilePicker({
				...(0, vue.toValue)(options),
				..._options
			});
			fileHandle.value = handle;
			await updateData();
		}
		async function create(_options = {}) {
			if (!isSupported.value) return;
			fileHandle.value = await window$1.showSaveFilePicker({
				...options,
				..._options
			});
			data.value = void 0;
			await updateData();
		}
		async function save(_options = {}) {
			if (!isSupported.value) return;
			if (!fileHandle.value) return saveAs(_options);
			if (data.value) {
				const writableStream = await fileHandle.value.createWritable();
				await writableStream.write(data.value);
				await writableStream.close();
			}
			await updateFile();
		}
		async function saveAs(_options = {}) {
			if (!isSupported.value) return;
			fileHandle.value = await window$1.showSaveFilePicker({
				...options,
				..._options
			});
			if (data.value) {
				const writableStream = await fileHandle.value.createWritable();
				await writableStream.write(data.value);
				await writableStream.close();
			}
			await updateFile();
		}
		async function updateFile() {
			var _fileHandle$value;
			file.value = await ((_fileHandle$value = fileHandle.value) === null || _fileHandle$value === void 0 ? void 0 : _fileHandle$value.getFile());
		}
		async function updateData() {
			var _file$value5, _file$value6;
			await updateFile();
			const type = (0, vue.toValue)(dataType);
			if (type === "Text") data.value = await ((_file$value5 = file.value) === null || _file$value5 === void 0 ? void 0 : _file$value5.text());
			else if (type === "ArrayBuffer") data.value = await ((_file$value6 = file.value) === null || _file$value6 === void 0 ? void 0 : _file$value6.arrayBuffer());
			else if (type === "Blob") data.value = file.value;
		}
		(0, vue.watch)(() => (0, vue.toValue)(dataType), updateData);
		return {
			isSupported,
			data,
			file,
			fileName,
			fileMIME,
			fileSize,
			fileLastModified,
			open,
			create,
			save,
			saveAs,
			updateData
		};
	}

//#endregion
//#region useFocus/index.ts
/**
	* Track or set the focus state of a DOM element.
	*
	* @see https://vueuse.org/useFocus
	* @param target The target element for the focus and blur events.
	* @param options
	*/
	function useFocus(target, options = {}) {
		const { initialValue = false, focusVisible = false, preventScroll = false } = options;
		const innerFocused = (0, vue.shallowRef)(false);
		const targetElement = (0, vue.computed)(() => unrefElement(target));
		const listenerOptions = { passive: true };
		useEventListener(targetElement, "focus", (event) => {
			var _matches, _ref;
			if (!focusVisible || ((_matches = (_ref = event.target).matches) === null || _matches === void 0 ? void 0 : _matches.call(_ref, ":focus-visible"))) innerFocused.value = true;
		}, listenerOptions);
		useEventListener(targetElement, "blur", () => innerFocused.value = false, listenerOptions);
		const focused = (0, vue.computed)({
			get: () => innerFocused.value,
			set(value) {
				var _targetElement$value, _targetElement$value2;
				if (!value && innerFocused.value) (_targetElement$value = targetElement.value) === null || _targetElement$value === void 0 || _targetElement$value.blur();
				else if (value && !innerFocused.value) (_targetElement$value2 = targetElement.value) === null || _targetElement$value2 === void 0 || _targetElement$value2.focus({ preventScroll });
			}
		});
		(0, vue.watch)(targetElement, () => {
			focused.value = initialValue;
		}, {
			immediate: true,
			flush: "post"
		});
		return { focused };
	}

//#endregion
//#region useFocusWithin/index.ts
	const EVENT_FOCUS_IN = "focusin";
	const EVENT_FOCUS_OUT = "focusout";
	const PSEUDO_CLASS_FOCUS_WITHIN = ":focus-within";
	/**
	* Track if focus is contained within the target element
	*
	* @see https://vueuse.org/useFocusWithin
	* @param target The target element to track
	* @param options Focus within options
	*/
	function useFocusWithin(target, options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const targetElement = (0, vue.computed)(() => unrefElement(target));
		const _focused = (0, vue.shallowRef)(false);
		const focused = (0, vue.computed)(() => _focused.value);
		const activeElement = useActiveElement(options);
		if (!window$1 || !activeElement.value) return { focused };
		const listenerOptions = { passive: true };
		useEventListener(targetElement, EVENT_FOCUS_IN, () => _focused.value = true, listenerOptions);
		useEventListener(targetElement, EVENT_FOCUS_OUT, () => {
			var _targetElement$value$, _targetElement$value, _targetElement$value$2;
			return _focused.value = (_targetElement$value$ = (_targetElement$value = targetElement.value) === null || _targetElement$value === void 0 || (_targetElement$value$2 = _targetElement$value.matches) === null || _targetElement$value$2 === void 0 ? void 0 : _targetElement$value$2.call(_targetElement$value, PSEUDO_CLASS_FOCUS_WITHIN)) !== null && _targetElement$value$ !== void 0 ? _targetElement$value$ : false;
		}, listenerOptions);
		return { focused };
	}

//#endregion
//#region useFps/index.ts
	/* @__NO_SIDE_EFFECTS__ */
	function useFps(options) {
		var _options$every;
		const fps = (0, vue.shallowRef)(0);
		if (typeof performance === "undefined") return fps;
		const every = (_options$every = options === null || options === void 0 ? void 0 : options.every) !== null && _options$every !== void 0 ? _options$every : 10;
		let last = performance.now();
		let ticks = 0;
		useRafFn(() => {
			ticks += 1;
			if (ticks >= every) {
				const now = performance.now();
				const diff = now - last;
				fps.value = Math.round(1e3 / (diff / ticks));
				last = now;
				ticks = 0;
			}
		});
		return fps;
	}

//#endregion
//#region useFullscreen/index.ts
	const eventHandlers = [
		"fullscreenchange",
		"webkitfullscreenchange",
		"webkitendfullscreen",
		"mozfullscreenchange",
		"MSFullscreenChange"
	];
	/**
	* Reactive Fullscreen API.
	*
	* @see https://vueuse.org/useFullscreen
	* @param target
	* @param options
	*/
	function useFullscreen(target, options = {}) {
		const { document: document$1 = defaultDocument, autoExit = false } = options;
		const targetRef = (0, vue.computed)(() => {
			var _unrefElement;
			return (_unrefElement = unrefElement(target)) !== null && _unrefElement !== void 0 ? _unrefElement : document$1 === null || document$1 === void 0 ? void 0 : document$1.documentElement;
		});
		const isFullscreen = (0, vue.shallowRef)(false);
		const requestMethod = (0, vue.computed)(() => {
			return [
				"requestFullscreen",
				"webkitRequestFullscreen",
				"webkitEnterFullscreen",
				"webkitEnterFullScreen",
				"webkitRequestFullScreen",
				"mozRequestFullScreen",
				"msRequestFullscreen"
			].find((m) => document$1 && m in document$1 || targetRef.value && m in targetRef.value);
		});
		const exitMethod = (0, vue.computed)(() => {
			return [
				"exitFullscreen",
				"webkitExitFullscreen",
				"webkitExitFullScreen",
				"webkitCancelFullScreen",
				"mozCancelFullScreen",
				"msExitFullscreen"
			].find((m) => document$1 && m in document$1 || targetRef.value && m in targetRef.value);
		});
		const fullscreenEnabled = (0, vue.computed)(() => {
			return [
				"fullScreen",
				"webkitIsFullScreen",
				"webkitDisplayingFullscreen",
				"mozFullScreen",
				"msFullscreenElement"
			].find((m) => document$1 && m in document$1 || targetRef.value && m in targetRef.value);
		});
		const fullscreenElementMethod = [
			"fullscreenElement",
			"webkitFullscreenElement",
			"mozFullScreenElement",
			"msFullscreenElement"
		].find((m) => document$1 && m in document$1);
		const isSupported = /* @__PURE__ */ useSupported(() => targetRef.value && document$1 && requestMethod.value !== void 0 && exitMethod.value !== void 0 && fullscreenEnabled.value !== void 0);
		const isCurrentElementFullScreen = () => {
			if (fullscreenElementMethod) return (document$1 === null || document$1 === void 0 ? void 0 : document$1[fullscreenElementMethod]) === targetRef.value;
			return false;
		};
		const isElementFullScreen = () => {
			if (fullscreenEnabled.value) if (document$1 && document$1[fullscreenEnabled.value] != null) return document$1[fullscreenEnabled.value];
			else {
				const target$1 = targetRef.value;
				if ((target$1 === null || target$1 === void 0 ? void 0 : target$1[fullscreenEnabled.value]) != null) return Boolean(target$1[fullscreenEnabled.value]);
			}
			return false;
		};
		async function exit() {
			if (!isSupported.value || !isFullscreen.value) return;
			if (exitMethod.value) if ((document$1 === null || document$1 === void 0 ? void 0 : document$1[exitMethod.value]) != null) await document$1[exitMethod.value]();
			else {
				const target$1 = targetRef.value;
				if ((target$1 === null || target$1 === void 0 ? void 0 : target$1[exitMethod.value]) != null) await target$1[exitMethod.value]();
			}
			isFullscreen.value = false;
		}
		async function enter() {
			if (!isSupported.value || isFullscreen.value) return;
			if (isElementFullScreen()) await exit();
			const target$1 = targetRef.value;
			if (requestMethod.value && (target$1 === null || target$1 === void 0 ? void 0 : target$1[requestMethod.value]) != null) {
				await target$1[requestMethod.value]();
				isFullscreen.value = true;
			}
		}
		async function toggle() {
			await (isFullscreen.value ? exit() : enter());
		}
		const handlerCallback = () => {
			const isElementFullScreenValue = isElementFullScreen();
			if (!isElementFullScreenValue || isElementFullScreenValue && isCurrentElementFullScreen()) isFullscreen.value = isElementFullScreenValue;
		};
		const listenerOptions = {
			capture: false,
			passive: true
		};
		useEventListener(document$1, eventHandlers, handlerCallback, listenerOptions);
		useEventListener(() => unrefElement(targetRef), eventHandlers, handlerCallback, listenerOptions);
		(0, __vueuse_shared.tryOnMounted)(handlerCallback, false);
		if (autoExit) (0, __vueuse_shared.tryOnScopeDispose)(exit);
		return {
			isSupported,
			isFullscreen,
			enter,
			exit,
			toggle
		};
	}

//#endregion
//#region useGamepad/index.ts
/**
	* Maps a standard standard gamepad to an Xbox 360 Controller.
	*/
	function mapGamepadToXbox360Controller(gamepad) {
		return (0, vue.computed)(() => {
			if (gamepad.value) return {
				buttons: {
					a: gamepad.value.buttons[0],
					b: gamepad.value.buttons[1],
					x: gamepad.value.buttons[2],
					y: gamepad.value.buttons[3]
				},
				bumper: {
					left: gamepad.value.buttons[4],
					right: gamepad.value.buttons[5]
				},
				triggers: {
					left: gamepad.value.buttons[6],
					right: gamepad.value.buttons[7]
				},
				stick: {
					left: {
						horizontal: gamepad.value.axes[0],
						vertical: gamepad.value.axes[1],
						button: gamepad.value.buttons[10]
					},
					right: {
						horizontal: gamepad.value.axes[2],
						vertical: gamepad.value.axes[3],
						button: gamepad.value.buttons[11]
					}
				},
				dpad: {
					up: gamepad.value.buttons[12],
					down: gamepad.value.buttons[13],
					left: gamepad.value.buttons[14],
					right: gamepad.value.buttons[15]
				},
				back: gamepad.value.buttons[8],
				start: gamepad.value.buttons[9]
			};
			return null;
		});
	}
	/* @__NO_SIDE_EFFECTS__ */
	function useGamepad(options = {}) {
		const { navigator: navigator$1 = defaultNavigator } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "getGamepads" in navigator$1);
		const gamepads = (0, vue.ref)([]);
		const onConnectedHook = (0, __vueuse_shared.createEventHook)();
		const onDisconnectedHook = (0, __vueuse_shared.createEventHook)();
		const stateFromGamepad = (gamepad) => {
			const hapticActuators = [];
			const vibrationActuator = "vibrationActuator" in gamepad ? gamepad.vibrationActuator : null;
			if (vibrationActuator) hapticActuators.push(vibrationActuator);
			if (gamepad.hapticActuators) hapticActuators.push(...gamepad.hapticActuators);
			return {
				id: gamepad.id,
				index: gamepad.index,
				connected: gamepad.connected,
				mapping: gamepad.mapping,
				timestamp: gamepad.timestamp,
				vibrationActuator: gamepad.vibrationActuator,
				hapticActuators,
				axes: gamepad.axes.map((axes) => axes),
				buttons: gamepad.buttons.map((button) => ({
					pressed: button.pressed,
					touched: button.touched,
					value: button.value
				}))
			};
		};
		const updateGamepadState = () => {
			const _gamepads = (navigator$1 === null || navigator$1 === void 0 ? void 0 : navigator$1.getGamepads()) || [];
			for (const gamepad of _gamepads) if (gamepad && gamepads.value[gamepad.index]) gamepads.value[gamepad.index] = stateFromGamepad(gamepad);
		};
		const { isActive, pause, resume } = useRafFn(updateGamepadState);
		const onGamepadConnected = (gamepad) => {
			if (!gamepads.value.some(({ index }) => index === gamepad.index)) {
				gamepads.value.push(stateFromGamepad(gamepad));
				onConnectedHook.trigger(gamepad.index);
			}
			resume();
		};
		const onGamepadDisconnected = (gamepad) => {
			gamepads.value = gamepads.value.filter((x) => x.index !== gamepad.index);
			onDisconnectedHook.trigger(gamepad.index);
		};
		const listenerOptions = { passive: true };
		useEventListener("gamepadconnected", (e) => onGamepadConnected(e.gamepad), listenerOptions);
		useEventListener("gamepaddisconnected", (e) => onGamepadDisconnected(e.gamepad), listenerOptions);
		(0, __vueuse_shared.tryOnMounted)(() => {
			const _gamepads = (navigator$1 === null || navigator$1 === void 0 ? void 0 : navigator$1.getGamepads()) || [];
			for (const gamepad of _gamepads) if (gamepad && gamepads.value[gamepad.index]) onGamepadConnected(gamepad);
		});
		pause();
		return {
			isSupported,
			onConnected: onConnectedHook.on,
			onDisconnected: onDisconnectedHook.on,
			gamepads,
			pause,
			resume,
			isActive
		};
	}

//#endregion
//#region useGeolocation/index.ts
/**
	* Reactive Geolocation API.
	*
	* @see https://vueuse.org/useGeolocation
	* @param options
	*/
	function useGeolocation(options = {}) {
		const { enableHighAccuracy = true, maximumAge = 3e4, timeout = 27e3, navigator: navigator$1 = defaultNavigator, immediate = true } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "geolocation" in navigator$1);
		const locatedAt = (0, vue.shallowRef)(null);
		const error = (0, vue.shallowRef)(null);
		const coords = (0, vue.ref)({
			accuracy: 0,
			latitude: Number.POSITIVE_INFINITY,
			longitude: Number.POSITIVE_INFINITY,
			altitude: null,
			altitudeAccuracy: null,
			heading: null,
			speed: null
		});
		function updatePosition(position) {
			locatedAt.value = position.timestamp;
			coords.value = position.coords;
			error.value = null;
		}
		let watcher;
		function resume() {
			if (isSupported.value) watcher = navigator$1.geolocation.watchPosition(updatePosition, (err) => error.value = err, {
				enableHighAccuracy,
				maximumAge,
				timeout
			});
		}
		if (immediate) resume();
		function pause() {
			if (watcher && navigator$1) navigator$1.geolocation.clearWatch(watcher);
		}
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			pause();
		});
		return {
			isSupported,
			coords,
			locatedAt,
			error,
			resume,
			pause
		};
	}

//#endregion
//#region useIdle/index.ts
	const defaultEvents$1 = [
		"mousemove",
		"mousedown",
		"resize",
		"keydown",
		"touchstart",
		"wheel"
	];
	const oneMinute = 6e4;
	/**
	* Tracks whether the user is being inactive.
	*
	* @see https://vueuse.org/useIdle
	* @param timeout default to 1 minute
	* @param options IdleOptions
	*/
	function useIdle(timeout = oneMinute, options = {}) {
		const { initialState = false, listenForVisibilityChange = true, events: events$1 = defaultEvents$1, window: window$1 = defaultWindow, eventFilter = (0, __vueuse_shared.throttleFilter)(50) } = options;
		const idle = (0, vue.shallowRef)(initialState);
		const lastActive = (0, vue.shallowRef)((0, __vueuse_shared.timestamp)());
		const isPending = (0, vue.shallowRef)(false);
		let timer;
		const reset = () => {
			idle.value = false;
			clearTimeout(timer);
			timer = setTimeout(() => idle.value = true, timeout);
		};
		const onEvent = (0, __vueuse_shared.createFilterWrapper)(eventFilter, () => {
			lastActive.value = (0, __vueuse_shared.timestamp)();
			reset();
		});
		if (window$1) {
			const document$1 = window$1.document;
			const listenerOptions = { passive: true };
			for (const event of events$1) useEventListener(window$1, event, () => {
				if (!isPending.value) return;
				onEvent();
			}, listenerOptions);
			if (listenForVisibilityChange) useEventListener(document$1, "visibilitychange", () => {
				if (document$1.hidden || !isPending.value) return;
				onEvent();
			}, listenerOptions);
			start();
		}
		function start() {
			if (isPending.value) return;
			isPending.value = true;
			if (!initialState) reset();
		}
		function stop() {
			idle.value = initialState;
			clearTimeout(timer);
			isPending.value = false;
		}
		return {
			idle,
			lastActive,
			reset,
			stop,
			start,
			isPending: (0, vue.shallowReadonly)(isPending)
		};
	}

//#endregion
//#region useImage/index.ts
	async function loadImage(options) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const { src, srcset, sizes, class: clazz, loading, crossorigin, referrerPolicy, width, height, decoding, fetchPriority, ismap, usemap } = options;
			img.src = src;
			if (srcset != null) img.srcset = srcset;
			if (sizes != null) img.sizes = sizes;
			if (clazz != null) img.className = clazz;
			if (loading != null) img.loading = loading;
			if (crossorigin != null) img.crossOrigin = crossorigin;
			if (referrerPolicy != null) img.referrerPolicy = referrerPolicy;
			if (width != null) img.width = width;
			if (height != null) img.height = height;
			if (decoding != null) img.decoding = decoding;
			if (fetchPriority != null) img.fetchPriority = fetchPriority;
			if (ismap != null) img.isMap = ismap;
			if (usemap != null) img.useMap = usemap;
			img.onload = () => resolve(img);
			img.onerror = reject;
		});
	}
	/**
	* Reactive load an image in the browser, you can wait the result to display it or show a fallback.
	*
	* @see https://vueuse.org/useImage
	* @param options Image attributes, as used in the <img> tag
	* @param asyncStateOptions
	*/
	function useImage(options, asyncStateOptions = {}) {
		const state = useAsyncState(() => loadImage((0, vue.toValue)(options)), void 0, {
			resetOnExecute: true,
			...asyncStateOptions
		});
		(0, vue.watch)(() => (0, vue.toValue)(options), () => state.execute(asyncStateOptions.delay), { deep: true });
		return state;
	}

//#endregion
//#region _resolve-element.ts
/**
	* Resolves an element from a given element, window, or document.
	*
	* @internal
	*/
	function resolveElement(el) {
		if (typeof Window !== "undefined" && el instanceof Window) return el.document.documentElement;
		if (typeof Document !== "undefined" && el instanceof Document) return el.documentElement;
		return el;
	}

//#endregion
//#region useScroll/index.ts
/**
	* We have to check if the scroll amount is close enough to some threshold in order to
	* more accurately calculate arrivedState. This is because scrollTop/scrollLeft are non-rounded
	* numbers, while scrollHeight/scrollWidth and clientHeight/clientWidth are rounded.
	* https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#determine_if_an_element_has_been_totally_scrolled
	*/
	const ARRIVED_STATE_THRESHOLD_PIXELS = 1;
	/**
	* Reactive scroll.
	*
	* @see https://vueuse.org/useScroll
	* @param element
	* @param options
	*/
	function useScroll(element, options = {}) {
		const { throttle = 0, idle = 200, onStop = __vueuse_shared.noop, onScroll = __vueuse_shared.noop, offset = {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0
		}, observe: _observe = { mutation: false }, eventListenerOptions = {
			capture: false,
			passive: true
		}, behavior = "auto", window: window$1 = defaultWindow, onError = (e) => {
			console.error(e);
		} } = options;
		const observe = typeof _observe === "boolean" ? { mutation: _observe } : _observe;
		const internalX = (0, vue.shallowRef)(0);
		const internalY = (0, vue.shallowRef)(0);
		const x = (0, vue.computed)({
			get() {
				return internalX.value;
			},
			set(x$1) {
				scrollTo(x$1, void 0);
			}
		});
		const y = (0, vue.computed)({
			get() {
				return internalY.value;
			},
			set(y$1) {
				scrollTo(void 0, y$1);
			}
		});
		function scrollTo(_x, _y) {
			var _ref, _toValue, _toValue2, _document;
			if (!window$1) return;
			const _element = (0, vue.toValue)(element);
			if (!_element) return;
			(_ref = _element instanceof Document ? window$1.document.body : _element) === null || _ref === void 0 || _ref.scrollTo({
				top: (_toValue = (0, vue.toValue)(_y)) !== null && _toValue !== void 0 ? _toValue : y.value,
				left: (_toValue2 = (0, vue.toValue)(_x)) !== null && _toValue2 !== void 0 ? _toValue2 : x.value,
				behavior: (0, vue.toValue)(behavior)
			});
			const scrollContainer = (_element === null || _element === void 0 || (_document = _element.document) === null || _document === void 0 ? void 0 : _document.documentElement) || (_element === null || _element === void 0 ? void 0 : _element.documentElement) || _element;
			if (x != null) internalX.value = scrollContainer.scrollLeft;
			if (y != null) internalY.value = scrollContainer.scrollTop;
		}
		const isScrolling = (0, vue.shallowRef)(false);
		const arrivedState = (0, vue.reactive)({
			left: true,
			right: false,
			top: true,
			bottom: false
		});
		const directions = (0, vue.reactive)({
			left: false,
			right: false,
			top: false,
			bottom: false
		});
		const onScrollEnd = (e) => {
			if (!isScrolling.value) return;
			isScrolling.value = false;
			directions.left = false;
			directions.right = false;
			directions.top = false;
			directions.bottom = false;
			onStop(e);
		};
		const onScrollEndDebounced = (0, __vueuse_shared.useDebounceFn)(onScrollEnd, throttle + idle);
		const setArrivedState = (target) => {
			var _document2;
			if (!window$1) return;
			const el = (target === null || target === void 0 || (_document2 = target.document) === null || _document2 === void 0 ? void 0 : _document2.documentElement) || (target === null || target === void 0 ? void 0 : target.documentElement) || unrefElement(target);
			const { display, flexDirection, direction } = window$1.getComputedStyle(el);
			const directionMultipler = direction === "rtl" ? -1 : 1;
			const scrollLeft = el.scrollLeft;
			directions.left = scrollLeft < internalX.value;
			directions.right = scrollLeft > internalX.value;
			const left = Math.abs(scrollLeft * directionMultipler) <= (offset.left || 0);
			const right = Math.abs(scrollLeft * directionMultipler) + el.clientWidth >= el.scrollWidth - (offset.right || 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
			if (display === "flex" && flexDirection === "row-reverse") {
				arrivedState.left = right;
				arrivedState.right = left;
			} else {
				arrivedState.left = left;
				arrivedState.right = right;
			}
			internalX.value = scrollLeft;
			let scrollTop = el.scrollTop;
			if (target === window$1.document && !scrollTop) scrollTop = window$1.document.body.scrollTop;
			directions.top = scrollTop < internalY.value;
			directions.bottom = scrollTop > internalY.value;
			const top = Math.abs(scrollTop) <= (offset.top || 0);
			const bottom = Math.abs(scrollTop) + el.clientHeight >= el.scrollHeight - (offset.bottom || 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
			/**
			* reverse columns and rows behave exactly the other way around,
			* bottom is treated as top and top is treated as the negative version of bottom
			*/
			if (display === "flex" && flexDirection === "column-reverse") {
				arrivedState.top = bottom;
				arrivedState.bottom = top;
			} else {
				arrivedState.top = top;
				arrivedState.bottom = bottom;
			}
			internalY.value = scrollTop;
		};
		const onScrollHandler = (e) => {
			var _documentElement;
			if (!window$1) return;
			setArrivedState((_documentElement = e.target.documentElement) !== null && _documentElement !== void 0 ? _documentElement : e.target);
			isScrolling.value = true;
			onScrollEndDebounced(e);
			onScroll(e);
		};
		useEventListener(element, "scroll", throttle ? (0, __vueuse_shared.useThrottleFn)(onScrollHandler, throttle, true, false) : onScrollHandler, eventListenerOptions);
		(0, __vueuse_shared.tryOnMounted)(() => {
			try {
				const _element = (0, vue.toValue)(element);
				if (!_element) return;
				setArrivedState(_element);
			} catch (e) {
				onError(e);
			}
		});
		if ((observe === null || observe === void 0 ? void 0 : observe.mutation) && element != null && element !== window$1 && element !== document) useMutationObserver(element, () => {
			const _element = (0, vue.toValue)(element);
			if (!_element) return;
			setArrivedState(_element);
		}, {
			attributes: true,
			childList: true,
			subtree: true
		});
		useEventListener(element, "scrollend", onScrollEnd, eventListenerOptions);
		return {
			x,
			y,
			isScrolling,
			arrivedState,
			directions,
			measure() {
				const _element = (0, vue.toValue)(element);
				if (window$1 && _element) setArrivedState(_element);
			}
		};
	}

//#endregion
//#region useInfiniteScroll/index.ts
/**
	* Reactive infinite scroll.
	*
	* @see https://vueuse.org/useInfiniteScroll
	*/
	function useInfiniteScroll(element, onLoadMore, options = {}) {
		var _options$distance;
		const { direction = "bottom", interval = 100, canLoadMore = () => true } = options;
		const state = (0, vue.reactive)(useScroll(element, {
			...options,
			offset: {
				[direction]: (_options$distance = options.distance) !== null && _options$distance !== void 0 ? _options$distance : 0,
				...options.offset
			}
		}));
		const promise = (0, vue.ref)();
		const isLoading = (0, vue.computed)(() => !!promise.value);
		const observedElement = (0, vue.computed)(() => {
			return resolveElement((0, vue.toValue)(element));
		});
		const isElementVisible = useElementVisibility(observedElement);
		const canLoad = (0, vue.computed)(() => {
			if (!observedElement.value) return false;
			return canLoadMore(observedElement.value);
		});
		function checkAndLoad() {
			state.measure();
			if (!observedElement.value || !isElementVisible.value || !canLoad.value || promise.value) return;
			const { scrollHeight, clientHeight, scrollWidth, clientWidth } = observedElement.value;
			const isNarrower = direction === "bottom" || direction === "top" ? scrollHeight <= clientHeight : scrollWidth <= clientWidth;
			if (state.arrivedState[direction] || isNarrower) promise.value = Promise.all([onLoadMore(state), new Promise((resolve) => setTimeout(resolve, interval))]).finally(() => {
				promise.value = null;
				(0, vue.nextTick)(() => checkAndLoad());
			});
		}
		(0, __vueuse_shared.tryOnUnmounted)((0, vue.watch)(() => [
			state.arrivedState[direction],
			isElementVisible.value,
			canLoad.value
		], checkAndLoad, {
			immediate: true,
			flush: "post"
		}));
		return {
			isLoading,
			reset() {
				(0, vue.nextTick)(() => checkAndLoad());
			}
		};
	}

//#endregion
//#region useKeyModifier/index.ts
	const defaultEvents = [
		"mousedown",
		"mouseup",
		"keydown",
		"keyup"
	];
	/* @__NO_SIDE_EFFECTS__ */
	function useKeyModifier(modifier, options = {}) {
		const { events: events$1 = defaultEvents, document: document$1 = defaultDocument, initial = null } = options;
		const state = (0, vue.shallowRef)(initial);
		if (document$1) events$1.forEach((listenerEvent) => {
			useEventListener(document$1, listenerEvent, (evt) => {
				if (typeof evt.getModifierState === "function") state.value = evt.getModifierState(modifier);
			}, { passive: true });
		});
		return state;
	}

//#endregion
//#region useLocalStorage/index.ts
/**
	* Reactive LocalStorage.
	*
	* @see https://vueuse.org/useLocalStorage
	* @param key
	* @param initialValue
	* @param options
	*/
	function useLocalStorage(key, initialValue, options = {}) {
		const { window: window$1 = defaultWindow } = options;
		return useStorage(key, initialValue, window$1 === null || window$1 === void 0 ? void 0 : window$1.localStorage, options);
	}

//#endregion
//#region useMagicKeys/aliasMap.ts
	const DefaultMagicKeysAliasMap = {
		ctrl: "control",
		command: "meta",
		cmd: "meta",
		option: "alt",
		up: "arrowup",
		down: "arrowdown",
		left: "arrowleft",
		right: "arrowright"
	};

//#endregion
//#region useMagicKeys/index.ts
/**
	* Reactive keys pressed state, with magical keys combination support.
	*
	* @see https://vueuse.org/useMagicKeys
	*/
	function useMagicKeys(options = {}) {
		const { reactive: useReactive = false, target = defaultWindow, aliasMap = DefaultMagicKeysAliasMap, passive = true, onEventFired = __vueuse_shared.noop } = options;
		const current = (0, vue.reactive)(/* @__PURE__ */ new Set());
		const obj = {
			toJSON() {
				return {};
			},
			current
		};
		const refs = useReactive ? (0, vue.reactive)(obj) : obj;
		const metaDeps = /* @__PURE__ */ new Set();
		const depsMap = new Map([
			["Meta", metaDeps],
			["Shift", /* @__PURE__ */ new Set()],
			["Alt", /* @__PURE__ */ new Set()]
		]);
		const usedKeys = /* @__PURE__ */ new Set();
		function setRefs(key, value) {
			if (key in refs) if (useReactive) refs[key] = value;
			else refs[key].value = value;
		}
		function reset() {
			current.clear();
			for (const key of usedKeys) setRefs(key, false);
		}
		function updateDeps(value, e, keys$1) {
			if (!value || typeof e.getModifierState !== "function") return;
			for (const [modifier, depsSet] of depsMap) if (e.getModifierState(modifier)) {
				keys$1.forEach((key) => depsSet.add(key));
				break;
			}
		}
		function clearDeps(value, key) {
			if (value) return;
			const depsMapKey = `${key[0].toUpperCase()}${key.slice(1)}`;
			const deps = depsMap.get(depsMapKey);
			if (!["shift", "alt"].includes(key) || !deps) return;
			const depsArray = Array.from(deps);
			const depsIndex = depsArray.indexOf(key);
			depsArray.forEach((key$1, index) => {
				if (index >= depsIndex) {
					current.delete(key$1);
					setRefs(key$1, false);
				}
			});
			deps.clear();
		}
		function updateRefs(e, value) {
			var _e$key, _e$code;
			const key = (_e$key = e.key) === null || _e$key === void 0 ? void 0 : _e$key.toLowerCase();
			const values = [(_e$code = e.code) === null || _e$code === void 0 ? void 0 : _e$code.toLowerCase(), key].filter(Boolean);
			if (!key) return;
			if (key) if (value) current.add(key);
			else current.delete(key);
			for (const key$1 of values) {
				usedKeys.add(key$1);
				setRefs(key$1, value);
			}
			updateDeps(value, e, [...current, ...values]);
			clearDeps(value, key);
			if (key === "meta" && !value) {
				metaDeps.forEach((key$1) => {
					current.delete(key$1);
					setRefs(key$1, false);
				});
				metaDeps.clear();
			}
		}
		useEventListener(target, "keydown", (e) => {
			updateRefs(e, true);
			return onEventFired(e);
		}, { passive });
		useEventListener(target, "keyup", (e) => {
			updateRefs(e, false);
			return onEventFired(e);
		}, { passive });
		useEventListener("blur", reset, { passive });
		useEventListener("focus", reset, { passive });
		const proxy = new Proxy(refs, { get(target$1, prop, rec) {
			if (typeof prop !== "string") return Reflect.get(target$1, prop, rec);
			prop = prop.toLowerCase();
			if (prop in aliasMap) prop = aliasMap[prop];
			if (!(prop in refs)) if (/[+_-]/.test(prop)) {
				const keys$1 = prop.split(/[+_-]/g).map((i) => i.trim());
				refs[prop] = (0, vue.computed)(() => keys$1.map((key) => (0, vue.toValue)(proxy[key])).every(Boolean));
			} else refs[prop] = (0, vue.shallowRef)(false);
			const r = Reflect.get(target$1, prop, rec);
			return useReactive ? (0, vue.toValue)(r) : r;
		} });
		return proxy;
	}

//#endregion
//#region useMediaControls/index.ts
/**
	* Automatically check if the ref exists and if it does run the cb fn
	*/
	function usingElRef(source, cb) {
		if ((0, vue.toValue)(source)) cb((0, vue.toValue)(source));
	}
	/**
	* Converts a TimeRange object to an array
	*/
	function timeRangeToArray(timeRanges) {
		let ranges = [];
		for (let i = 0; i < timeRanges.length; ++i) ranges = [...ranges, [timeRanges.start(i), timeRanges.end(i)]];
		return ranges;
	}
	/**
	* Converts a TextTrackList object to an array of `UseMediaTextTrack`
	*/
	function tracksToArray(tracks) {
		return Array.from(tracks).map(({ label, kind, language, mode, activeCues, cues, inBandMetadataTrackDispatchType }, id) => ({
			id,
			label,
			kind,
			language,
			mode,
			activeCues,
			cues,
			inBandMetadataTrackDispatchType
		}));
	}
	const defaultOptions = {
		src: "",
		tracks: []
	};
	function useMediaControls(target, options = {}) {
		target = (0, __vueuse_shared.toRef)(target);
		options = {
			...defaultOptions,
			...options
		};
		const { document: document$1 = defaultDocument } = options;
		const listenerOptions = { passive: true };
		const currentTime = (0, vue.shallowRef)(0);
		const duration = (0, vue.shallowRef)(0);
		const seeking = (0, vue.shallowRef)(false);
		const volume = (0, vue.shallowRef)(1);
		const waiting = (0, vue.shallowRef)(false);
		const ended = (0, vue.shallowRef)(false);
		const playing = (0, vue.shallowRef)(false);
		const rate = (0, vue.shallowRef)(1);
		const stalled = (0, vue.shallowRef)(false);
		const buffered = (0, vue.ref)([]);
		const tracks = (0, vue.ref)([]);
		const selectedTrack = (0, vue.shallowRef)(-1);
		const isPictureInPicture = (0, vue.shallowRef)(false);
		const muted = (0, vue.shallowRef)(false);
		const supportsPictureInPicture = Boolean(document$1 && "pictureInPictureEnabled" in document$1);
		const sourceErrorEvent = (0, __vueuse_shared.createEventHook)();
		const playbackErrorEvent = (0, __vueuse_shared.createEventHook)();
		/**
		* Disables the specified track. If no track is specified then
		* all tracks will be disabled
		*
		* @param track The id of the track to disable
		*/
		const disableTrack = (track) => {
			usingElRef(target, (el) => {
				if (track) {
					const id = typeof track === "number" ? track : track.id;
					el.textTracks[id].mode = "disabled";
				} else for (let i = 0; i < el.textTracks.length; ++i) el.textTracks[i].mode = "disabled";
				selectedTrack.value = -1;
			});
		};
		/**
		* Enables the specified track and disables the
		* other tracks unless otherwise specified
		*
		* @param track The track of the id of the track to enable
		* @param disableTracks Disable all other tracks
		*/
		const enableTrack = (track, disableTracks = true) => {
			usingElRef(target, (el) => {
				const id = typeof track === "number" ? track : track.id;
				if (disableTracks) disableTrack();
				el.textTracks[id].mode = "showing";
				selectedTrack.value = id;
			});
		};
		/**
		* Toggle picture in picture mode for the player.
		*/
		const togglePictureInPicture = () => {
			return new Promise((resolve, reject) => {
				usingElRef(target, async (el) => {
					if (supportsPictureInPicture) if (!isPictureInPicture.value) el.requestPictureInPicture().then(resolve).catch(reject);
					else document$1.exitPictureInPicture().then(resolve).catch(reject);
				});
			});
		};
		/**
		* This will automatically inject sources to the media element. The sources will be
		* appended as children to the media element as `<source>` elements.
		*/
		(0, vue.watchEffect)(() => {
			if (!document$1) return;
			const el = (0, vue.toValue)(target);
			if (!el) return;
			const src = (0, vue.toValue)(options.src);
			let sources = [];
			if (!src) return;
			if (typeof src === "string") sources = [{ src }];
			else if (Array.isArray(src)) sources = src;
			else if ((0, __vueuse_shared.isObject)(src)) sources = [src];
			el.querySelectorAll("source").forEach((e) => {
				e.remove();
			});
			sources.forEach(({ src: src$1, type, media }) => {
				const source = document$1.createElement("source");
				source.setAttribute("src", src$1);
				source.setAttribute("type", type || "");
				source.setAttribute("media", media || "");
				useEventListener(source, "error", sourceErrorEvent.trigger, listenerOptions);
				el.appendChild(source);
			});
			el.load();
		});
		/**
		* Apply composable state to the element, also when element is changed
		*/
		(0, vue.watch)([target, volume], () => {
			const el = (0, vue.toValue)(target);
			if (!el) return;
			el.volume = volume.value;
		});
		(0, vue.watch)([target, muted], () => {
			const el = (0, vue.toValue)(target);
			if (!el) return;
			el.muted = muted.value;
		});
		(0, vue.watch)([target, rate], () => {
			const el = (0, vue.toValue)(target);
			if (!el) return;
			el.playbackRate = rate.value;
		});
		/**
		* Load Tracks
		*/
		(0, vue.watchEffect)(() => {
			if (!document$1) return;
			const textTracks = (0, vue.toValue)(options.tracks);
			const el = (0, vue.toValue)(target);
			if (!textTracks || !textTracks.length || !el) return;
			/**
			* The MediaAPI provides an API for adding text tracks, but they don't currently
			* have an API for removing text tracks, so instead we will just create and remove
			* the tracks manually using the HTML api.
			*/
			el.querySelectorAll("track").forEach((e) => e.remove());
			textTracks.forEach(({ default: isDefault, kind, label, src, srcLang }, i) => {
				const track = document$1.createElement("track");
				track.default = isDefault || false;
				track.kind = kind;
				track.label = label;
				track.src = src;
				track.srclang = srcLang;
				if (track.default) selectedTrack.value = i;
				el.appendChild(track);
			});
		});
		/**
		* This will allow us to update the current time from the timeupdate event
		* without setting the medias current position, but if the user changes the
		* current time via the ref, then the media will seek.
		*
		* If we did not use an ignorable watch, then the current time update from
		* the timeupdate event would cause the media to stutter.
		*/
		const { ignoreUpdates: ignoreCurrentTimeUpdates } = (0, __vueuse_shared.watchIgnorable)(currentTime, (time) => {
			const el = (0, vue.toValue)(target);
			if (!el) return;
			el.currentTime = time;
		});
		/**
		* Using an ignorable watch so we can control the play state using a ref and not
		* a function
		*/
		const { ignoreUpdates: ignorePlayingUpdates } = (0, __vueuse_shared.watchIgnorable)(playing, (isPlaying) => {
			const el = (0, vue.toValue)(target);
			if (!el) return;
			if (isPlaying) el.play().catch((e) => {
				playbackErrorEvent.trigger(e);
				throw e;
			});
			else el.pause();
		});
		useEventListener(target, "timeupdate", () => ignoreCurrentTimeUpdates(() => currentTime.value = (0, vue.toValue)(target).currentTime), listenerOptions);
		useEventListener(target, "durationchange", () => duration.value = (0, vue.toValue)(target).duration, listenerOptions);
		useEventListener(target, "progress", () => buffered.value = timeRangeToArray((0, vue.toValue)(target).buffered), listenerOptions);
		useEventListener(target, "seeking", () => seeking.value = true, listenerOptions);
		useEventListener(target, "seeked", () => seeking.value = false, listenerOptions);
		useEventListener(target, ["waiting", "loadstart"], () => {
			waiting.value = true;
			ignorePlayingUpdates(() => playing.value = false);
		}, listenerOptions);
		useEventListener(target, "loadeddata", () => waiting.value = false, listenerOptions);
		useEventListener(target, "playing", () => {
			waiting.value = false;
			ended.value = false;
			ignorePlayingUpdates(() => playing.value = true);
		}, listenerOptions);
		useEventListener(target, "ratechange", () => rate.value = (0, vue.toValue)(target).playbackRate, listenerOptions);
		useEventListener(target, "stalled", () => stalled.value = true, listenerOptions);
		useEventListener(target, "ended", () => ended.value = true, listenerOptions);
		useEventListener(target, "pause", () => ignorePlayingUpdates(() => playing.value = false), listenerOptions);
		useEventListener(target, "play", () => ignorePlayingUpdates(() => playing.value = true), listenerOptions);
		useEventListener(target, "enterpictureinpicture", () => isPictureInPicture.value = true, listenerOptions);
		useEventListener(target, "leavepictureinpicture", () => isPictureInPicture.value = false, listenerOptions);
		useEventListener(target, "volumechange", () => {
			const el = (0, vue.toValue)(target);
			if (!el) return;
			volume.value = el.volume;
			muted.value = el.muted;
		}, listenerOptions);
		/**
		* The following listeners need to listen to a nested
		* object on the target, so we will have to use a nested
		* watch and manually remove the listeners
		*/
		const listeners = [];
		const stop = (0, vue.watch)([target], () => {
			const el = (0, vue.toValue)(target);
			if (!el) return;
			stop();
			listeners[0] = useEventListener(el.textTracks, "addtrack", () => tracks.value = tracksToArray(el.textTracks), listenerOptions);
			listeners[1] = useEventListener(el.textTracks, "removetrack", () => tracks.value = tracksToArray(el.textTracks), listenerOptions);
			listeners[2] = useEventListener(el.textTracks, "change", () => tracks.value = tracksToArray(el.textTracks), listenerOptions);
		});
		(0, __vueuse_shared.tryOnScopeDispose)(() => listeners.forEach((listener) => listener()));
		return {
			currentTime,
			duration,
			waiting,
			seeking,
			ended,
			stalled,
			buffered,
			playing,
			rate,
			volume,
			muted,
			tracks,
			selectedTrack,
			enableTrack,
			disableTrack,
			supportsPictureInPicture,
			togglePictureInPicture,
			isPictureInPicture,
			onSourceError: sourceErrorEvent.on,
			onPlaybackError: playbackErrorEvent.on
		};
	}

//#endregion
//#region useMemoize/index.ts
/**
	* Reactive function result cache based on arguments
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useMemoize(resolver, options) {
		const initCache = () => {
			if (options === null || options === void 0 ? void 0 : options.cache) return (0, vue.shallowReactive)(options.cache);
			return (0, vue.shallowReactive)(/* @__PURE__ */ new Map());
		};
		const cache = initCache();
		/**
		* Generate key from args
		*/
		const generateKey = (...args) => (options === null || options === void 0 ? void 0 : options.getKey) ? options.getKey(...args) : JSON.stringify(args);
		/**
		* Load data and save in cache
		*/
		const _loadData = (key, ...args) => {
			cache.set(key, resolver(...args));
			return cache.get(key);
		};
		const loadData = (...args) => _loadData(generateKey(...args), ...args);
		/**
		* Delete key from cache
		*/
		const deleteData = (...args) => {
			cache.delete(generateKey(...args));
		};
		/**
		* Clear cached data
		*/
		const clearData = () => {
			cache.clear();
		};
		const memoized = (...args) => {
			const key = generateKey(...args);
			if (cache.has(key)) return cache.get(key);
			return _loadData(key, ...args);
		};
		memoized.load = loadData;
		memoized.delete = deleteData;
		memoized.clear = clearData;
		memoized.generateKey = generateKey;
		memoized.cache = cache;
		return memoized;
	}

//#endregion
//#region useMemory/index.ts
	function getDefaultScheduler$6(options) {
		if ("interval" in options || "immediate" in options || "immediateCallback" in options) {
			const { interval = 1e3, immediate, immediateCallback } = options;
			return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, interval, {
				immediate,
				immediateCallback
			});
		}
		return __vueuse_shared.useIntervalFn;
	}
	/**
	* Reactive Memory Info.
	*
	* @see https://vueuse.org/useMemory
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useMemory(options = {}) {
		const memory = (0, vue.ref)();
		const isSupported = /* @__PURE__ */ useSupported(() => typeof performance !== "undefined" && "memory" in performance);
		if (isSupported.value) {
			const { scheduler = getDefaultScheduler$6 } = options;
			scheduler(() => {
				memory.value = performance.memory;
			});
		}
		return {
			isSupported,
			memory
		};
	}

//#endregion
//#region useMouse/index.ts
	const UseMouseBuiltinExtractors = {
		page: (event) => [event.pageX, event.pageY],
		client: (event) => [event.clientX, event.clientY],
		screen: (event) => [event.screenX, event.screenY],
		movement: (event) => event instanceof MouseEvent ? [event.movementX, event.movementY] : null
	};
	/**
	* Reactive mouse position.
	*
	* @see https://vueuse.org/useMouse
	* @param options
	*/
	function useMouse(options = {}) {
		const { type = "page", touch = true, resetOnTouchEnds = false, initialValue = {
			x: 0,
			y: 0
		}, window: window$1 = defaultWindow, target = window$1, scroll = true, eventFilter } = options;
		let _prevMouseEvent = null;
		let _prevScrollX = 0;
		let _prevScrollY = 0;
		const x = (0, vue.shallowRef)(initialValue.x);
		const y = (0, vue.shallowRef)(initialValue.y);
		const sourceType = (0, vue.shallowRef)(null);
		const extractor = typeof type === "function" ? type : UseMouseBuiltinExtractors[type];
		const mouseHandler = (event) => {
			const result = extractor(event);
			_prevMouseEvent = event;
			if (result) {
				[x.value, y.value] = result;
				sourceType.value = "mouse";
			}
			if (window$1) {
				_prevScrollX = window$1.scrollX;
				_prevScrollY = window$1.scrollY;
			}
		};
		const touchHandler = (event) => {
			if (event.touches.length > 0) {
				const result = extractor(event.touches[0]);
				if (result) {
					[x.value, y.value] = result;
					sourceType.value = "touch";
				}
			}
		};
		const scrollHandler = () => {
			if (!_prevMouseEvent || !window$1) return;
			const pos = extractor(_prevMouseEvent);
			if (_prevMouseEvent instanceof MouseEvent && pos) {
				x.value = pos[0] + window$1.scrollX - _prevScrollX;
				y.value = pos[1] + window$1.scrollY - _prevScrollY;
			}
		};
		const reset = () => {
			x.value = initialValue.x;
			y.value = initialValue.y;
		};
		const mouseHandlerWrapper = eventFilter ? (event) => eventFilter(() => mouseHandler(event), {}) : (event) => mouseHandler(event);
		const touchHandlerWrapper = eventFilter ? (event) => eventFilter(() => touchHandler(event), {}) : (event) => touchHandler(event);
		const scrollHandlerWrapper = eventFilter ? () => eventFilter(() => scrollHandler(), {}) : () => scrollHandler();
		if (target) {
			const listenerOptions = { passive: true };
			useEventListener(target, ["mousemove", "dragover"], mouseHandlerWrapper, listenerOptions);
			if (touch && type !== "movement") {
				useEventListener(target, ["touchstart", "touchmove"], touchHandlerWrapper, listenerOptions);
				if (resetOnTouchEnds) useEventListener(target, "touchend", reset, listenerOptions);
			}
			if (scroll && type === "page") useEventListener(window$1, "scroll", scrollHandlerWrapper, listenerOptions);
		}
		return {
			x,
			y,
			sourceType
		};
	}

//#endregion
//#region useMouseInElement/index.ts
/**
	* Reactive mouse position related to an element.
	*
	* @see https://vueuse.org/useMouseInElement
	* @param target
	* @param options
	*/
	function useMouseInElement(target, options = {}) {
		const { windowResize = true, windowScroll = true, handleOutside = true, window: window$1 = defaultWindow } = options;
		const type = options.type || "page";
		const { x, y, sourceType } = useMouse(options);
		const targetRef = (0, vue.shallowRef)(target !== null && target !== void 0 ? target : window$1 === null || window$1 === void 0 ? void 0 : window$1.document.body);
		const elementX = (0, vue.shallowRef)(0);
		const elementY = (0, vue.shallowRef)(0);
		const elementPositionX = (0, vue.shallowRef)(0);
		const elementPositionY = (0, vue.shallowRef)(0);
		const elementHeight = (0, vue.shallowRef)(0);
		const elementWidth = (0, vue.shallowRef)(0);
		const isOutside = (0, vue.shallowRef)(true);
		function update() {
			if (!window$1) return;
			const el = unrefElement(targetRef);
			if (!el || !(el instanceof Element)) return;
			for (const rect of el.getClientRects()) {
				const { left, top, width, height } = rect;
				elementPositionX.value = left + (type === "page" ? window$1.pageXOffset : 0);
				elementPositionY.value = top + (type === "page" ? window$1.pageYOffset : 0);
				elementHeight.value = height;
				elementWidth.value = width;
				const elX = x.value - elementPositionX.value;
				const elY = y.value - elementPositionY.value;
				isOutside.value = width === 0 || height === 0 || elX < 0 || elY < 0 || elX > width || elY > height;
				if (handleOutside || !isOutside.value) {
					elementX.value = elX;
					elementY.value = elY;
				}
				if (!isOutside.value) break;
			}
		}
		const stopFnList = [];
		function stop() {
			stopFnList.forEach((fn) => fn());
			stopFnList.length = 0;
		}
		(0, __vueuse_shared.tryOnMounted)(() => {
			update();
		});
		if (window$1) {
			const { stop: stopResizeObserver } = useResizeObserver(targetRef, update);
			const { stop: stopMutationObserver } = useMutationObserver(targetRef, update, { attributeFilter: ["style", "class"] });
			const stopWatch = (0, vue.watch)([
				targetRef,
				x,
				y
			], update);
			stopFnList.push(stopResizeObserver, stopMutationObserver, stopWatch);
			useEventListener(document, "mouseleave", () => isOutside.value = true, { passive: true });
			if (windowScroll) stopFnList.push(useEventListener("scroll", update, {
				capture: true,
				passive: true
			}));
			if (windowResize) stopFnList.push(useEventListener("resize", update, { passive: true }));
		}
		return {
			x,
			y,
			sourceType,
			elementX,
			elementY,
			elementPositionX,
			elementPositionY,
			elementHeight,
			elementWidth,
			isOutside,
			stop
		};
	}

//#endregion
//#region useMousePressed/index.ts
/**
	* Reactive mouse pressing state.
	*
	* @see https://vueuse.org/useMousePressed
	* @param options
	*/
	function useMousePressed(options = {}) {
		const { touch = true, drag = true, capture = false, initialValue = false, window: window$1 = defaultWindow } = options;
		const pressed = (0, vue.shallowRef)(initialValue);
		const sourceType = (0, vue.shallowRef)(null);
		if (!window$1) return {
			pressed,
			sourceType
		};
		const onPressed = (srcType) => (event) => {
			var _options$onPressed;
			pressed.value = true;
			sourceType.value = srcType;
			(_options$onPressed = options.onPressed) === null || _options$onPressed === void 0 || _options$onPressed.call(options, event);
		};
		const onReleased = (event) => {
			var _options$onReleased;
			pressed.value = false;
			sourceType.value = null;
			(_options$onReleased = options.onReleased) === null || _options$onReleased === void 0 || _options$onReleased.call(options, event);
		};
		const target = (0, vue.computed)(() => unrefElement(options.target) || window$1);
		const listenerOptions = {
			passive: true,
			capture
		};
		useEventListener(target, "mousedown", onPressed("mouse"), listenerOptions);
		useEventListener(window$1, "mouseleave", onReleased, listenerOptions);
		useEventListener(window$1, "mouseup", onReleased, listenerOptions);
		if (drag) {
			useEventListener(target, "dragstart", onPressed("mouse"), listenerOptions);
			useEventListener(window$1, "drop", onReleased, listenerOptions);
			useEventListener(window$1, "dragend", onReleased, listenerOptions);
		}
		if (touch) {
			useEventListener(target, "touchstart", onPressed("touch"), listenerOptions);
			useEventListener(window$1, "touchend", onReleased, listenerOptions);
			useEventListener(window$1, "touchcancel", onReleased, listenerOptions);
		}
		return {
			pressed,
			sourceType
		};
	}

//#endregion
//#region useNavigatorLanguage/index.ts
/**
	*
	* Reactive useNavigatorLanguage
	*
	* Detects the currently selected user language and returns a reactive language
	* @see https://vueuse.org/useNavigatorLanguage
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useNavigatorLanguage(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const navigator$1 = window$1 === null || window$1 === void 0 ? void 0 : window$1.navigator;
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "language" in navigator$1);
		const language = (0, vue.shallowRef)(navigator$1 === null || navigator$1 === void 0 ? void 0 : navigator$1.language);
		useEventListener(window$1, "languagechange", () => {
			if (navigator$1) language.value = navigator$1.language;
		}, { passive: true });
		return {
			isSupported,
			language
		};
	}

//#endregion
//#region useNetwork/index.ts
/**
	* Reactive Network status.
	*
	* @see https://vueuse.org/useNetwork
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useNetwork(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const navigator$1 = window$1 === null || window$1 === void 0 ? void 0 : window$1.navigator;
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "connection" in navigator$1);
		const isOnline = (0, vue.shallowRef)(true);
		const saveData = (0, vue.shallowRef)(false);
		const offlineAt = (0, vue.shallowRef)(void 0);
		const onlineAt = (0, vue.shallowRef)(void 0);
		const downlink = (0, vue.shallowRef)(void 0);
		const downlinkMax = (0, vue.shallowRef)(void 0);
		const rtt = (0, vue.shallowRef)(void 0);
		const effectiveType = (0, vue.shallowRef)(void 0);
		const type = (0, vue.shallowRef)("unknown");
		const connection = isSupported.value && navigator$1.connection;
		function updateNetworkInformation() {
			if (!navigator$1) return;
			isOnline.value = navigator$1.onLine;
			offlineAt.value = isOnline.value ? void 0 : Date.now();
			onlineAt.value = isOnline.value ? Date.now() : void 0;
			if (connection) {
				downlink.value = connection.downlink;
				downlinkMax.value = connection.downlinkMax;
				effectiveType.value = connection.effectiveType;
				rtt.value = connection.rtt;
				saveData.value = connection.saveData;
				type.value = connection.type;
			}
		}
		const listenerOptions = { passive: true };
		if (window$1) {
			useEventListener(window$1, "offline", () => {
				isOnline.value = false;
				offlineAt.value = Date.now();
			}, listenerOptions);
			useEventListener(window$1, "online", () => {
				isOnline.value = true;
				onlineAt.value = Date.now();
			}, listenerOptions);
		}
		if (connection) useEventListener(connection, "change", updateNetworkInformation, listenerOptions);
		updateNetworkInformation();
		return {
			isSupported,
			isOnline: (0, vue.readonly)(isOnline),
			saveData: (0, vue.readonly)(saveData),
			offlineAt: (0, vue.readonly)(offlineAt),
			onlineAt: (0, vue.readonly)(onlineAt),
			downlink: (0, vue.readonly)(downlink),
			downlinkMax: (0, vue.readonly)(downlinkMax),
			effectiveType: (0, vue.readonly)(effectiveType),
			rtt: (0, vue.readonly)(rtt),
			type: (0, vue.readonly)(type)
		};
	}

//#endregion
//#region useNow/index.ts
	function getDefaultScheduler$5(options) {
		if ("interval" in options || "immediate" in options) {
			const { interval = "requestAnimationFrame", immediate = true } = options;
			return interval === "requestAnimationFrame" ? (fn) => useRafFn(fn, { immediate }) : (fn) => (0, __vueuse_shared.useIntervalFn)(fn, interval, options);
		}
		return useRafFn;
	}
	/**
	* Reactive current Date instance.
	*
	* @see https://vueuse.org/useNow
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useNow(options = {}) {
		const { controls: exposeControls = false, scheduler = getDefaultScheduler$5(options) } = options;
		const now = (0, vue.ref)(/* @__PURE__ */ new Date());
		const update = () => now.value = /* @__PURE__ */ new Date();
		const controls = scheduler(update);
		if (exposeControls) return {
			now,
			...controls
		};
		else return now;
	}

//#endregion
//#region useObjectUrl/index.ts
/**
	* Reactive URL representing an object.
	*
	* @see https://vueuse.org/useObjectUrl
	* @param object
	*/
	function useObjectUrl(object) {
		const url = (0, vue.shallowRef)();
		const release = () => {
			if (url.value) URL.revokeObjectURL(url.value);
			url.value = void 0;
		};
		(0, vue.watch)(() => (0, vue.toValue)(object), (newObject) => {
			release();
			if (newObject) url.value = URL.createObjectURL(newObject);
		}, { immediate: true });
		(0, __vueuse_shared.tryOnScopeDispose)(release);
		return (0, vue.readonly)(url);
	}

//#endregion
//#region ../math/useClamp/index.ts
/**
	* Reactively clamp a value between two other values.
	*
	* @see https://vueuse.org/useClamp
	* @param value number
	* @param min
	* @param max
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useClamp(value, min, max) {
		if (typeof value === "function" || (0, vue.isReadonly)(value)) return (0, vue.computed)(() => (0, __vueuse_shared.clamp)((0, vue.toValue)(value), (0, vue.toValue)(min), (0, vue.toValue)(max)));
		const _value = (0, vue.ref)(value);
		return (0, vue.computed)({
			get() {
				return _value.value = (0, __vueuse_shared.clamp)(_value.value, (0, vue.toValue)(min), (0, vue.toValue)(max));
			},
			set(value$1) {
				_value.value = (0, __vueuse_shared.clamp)(value$1, (0, vue.toValue)(min), (0, vue.toValue)(max));
			}
		});
	}

//#endregion
//#region useOffsetPagination/index.ts
	function useOffsetPagination(options) {
		const { total = Number.POSITIVE_INFINITY, pageSize = 10, page = 1, onPageChange = __vueuse_shared.noop, onPageSizeChange = __vueuse_shared.noop, onPageCountChange = __vueuse_shared.noop } = options;
		const currentPageSize = useClamp(pageSize, 1, Number.POSITIVE_INFINITY);
		const pageCount = (0, vue.computed)(() => Math.max(1, Math.ceil((0, vue.toValue)(total) / (0, vue.toValue)(currentPageSize))));
		const currentPage = useClamp(page, 1, pageCount);
		const isFirstPage = (0, vue.computed)(() => currentPage.value === 1);
		const isLastPage = (0, vue.computed)(() => currentPage.value === pageCount.value);
		if ((0, vue.isRef)(page)) (0, __vueuse_shared.syncRef)(page, currentPage, { direction: (0, vue.isReadonly)(page) ? "ltr" : "both" });
		if ((0, vue.isRef)(pageSize)) (0, __vueuse_shared.syncRef)(pageSize, currentPageSize, { direction: (0, vue.isReadonly)(pageSize) ? "ltr" : "both" });
		function prev() {
			currentPage.value--;
		}
		function next() {
			currentPage.value++;
		}
		const returnValue = {
			currentPage,
			currentPageSize,
			pageCount,
			isFirstPage,
			isLastPage,
			prev,
			next
		};
		(0, vue.watch)(currentPage, () => {
			onPageChange((0, vue.reactive)(returnValue));
		});
		(0, vue.watch)(currentPageSize, () => {
			onPageSizeChange((0, vue.reactive)(returnValue));
		});
		(0, vue.watch)(pageCount, () => {
			onPageCountChange((0, vue.reactive)(returnValue));
		});
		return returnValue;
	}

//#endregion
//#region useOnline/index.ts
/**
	* Reactive online state.
	*
	* @see https://vueuse.org/useOnline
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useOnline(options = {}) {
		const { isOnline } = useNetwork(options);
		return isOnline;
	}

//#endregion
//#region usePageLeave/index.ts
/**
	* Reactive state to show whether mouse leaves the page.
	*
	* @see https://vueuse.org/usePageLeave
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePageLeave(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const isLeft = (0, vue.shallowRef)(false);
		const handler = (event) => {
			if (!window$1) return;
			event = event || window$1.event;
			isLeft.value = !(event.relatedTarget || event.toElement);
		};
		if (window$1) {
			const listenerOptions = { passive: true };
			useEventListener(window$1, "mouseout", handler, listenerOptions);
			useEventListener(window$1.document, "mouseleave", handler, listenerOptions);
			useEventListener(window$1.document, "mouseenter", handler, listenerOptions);
		}
		return isLeft;
	}

//#endregion
//#region useScreenOrientation/index.ts
/**
	* Reactive screen orientation
	*
	* @see https://vueuse.org/useScreenOrientation
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useScreenOrientation(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "screen" in window$1 && "orientation" in window$1.screen);
		const screenOrientation = isSupported.value ? window$1.screen.orientation : {};
		const orientation = (0, vue.ref)(screenOrientation.type);
		const angle = (0, vue.shallowRef)(screenOrientation.angle || 0);
		if (isSupported.value) useEventListener(window$1, "orientationchange", () => {
			orientation.value = screenOrientation.type;
			angle.value = screenOrientation.angle;
		}, { passive: true });
		const lockOrientation = (type) => {
			if (isSupported.value && typeof screenOrientation.lock === "function") return screenOrientation.lock(type);
			return Promise.reject(/* @__PURE__ */ new Error("Not supported"));
		};
		const unlockOrientation = () => {
			if (isSupported.value && typeof screenOrientation.unlock === "function") screenOrientation.unlock();
		};
		return {
			isSupported,
			orientation,
			angle,
			lockOrientation,
			unlockOrientation
		};
	}

//#endregion
//#region useParallax/index.ts
/**
	* Create parallax effect easily. It uses `useDeviceOrientation` and fallback to `useMouse`
	* if orientation is not supported.
	*
	* @param target
	* @param options
	*/
	function useParallax(target, options = {}) {
		const { deviceOrientationTiltAdjust = (i) => i, deviceOrientationRollAdjust = (i) => i, mouseTiltAdjust = (i) => i, mouseRollAdjust = (i) => i, window: window$1 = defaultWindow } = options;
		const orientation = (0, vue.reactive)(useDeviceOrientation({ window: window$1 }));
		const screenOrientation = (0, vue.reactive)(useScreenOrientation({ window: window$1 }));
		const { elementX: x, elementY: y, elementWidth: width, elementHeight: height } = useMouseInElement(target, {
			handleOutside: false,
			window: window$1
		});
		const source = (0, vue.computed)(() => {
			if (orientation.isSupported && (orientation.alpha != null && orientation.alpha !== 0 || orientation.gamma != null && orientation.gamma !== 0)) return "deviceOrientation";
			return "mouse";
		});
		return {
			roll: (0, vue.computed)(() => {
				if (source.value === "deviceOrientation") {
					let value;
					switch (screenOrientation.orientation) {
						case "landscape-primary":
							value = orientation.gamma / 90;
							break;
						case "landscape-secondary":
							value = -orientation.gamma / 90;
							break;
						case "portrait-primary":
							value = -orientation.beta / 90;
							break;
						case "portrait-secondary":
							value = orientation.beta / 90;
							break;
						default: value = -orientation.beta / 90;
					}
					return deviceOrientationRollAdjust(value);
				} else return mouseRollAdjust(-(y.value - height.value / 2) / height.value);
			}),
			tilt: (0, vue.computed)(() => {
				if (source.value === "deviceOrientation") {
					let value;
					switch (screenOrientation.orientation) {
						case "landscape-primary":
							value = orientation.beta / 90;
							break;
						case "landscape-secondary":
							value = -orientation.beta / 90;
							break;
						case "portrait-primary":
							value = orientation.gamma / 90;
							break;
						case "portrait-secondary":
							value = -orientation.gamma / 90;
							break;
						default: value = orientation.gamma / 90;
					}
					return deviceOrientationTiltAdjust(value);
				} else return mouseTiltAdjust((x.value - width.value / 2) / width.value);
			}),
			source
		};
	}

//#endregion
//#region useParentElement/index.ts
	function useParentElement(element = useCurrentElement()) {
		const parentElement = (0, vue.shallowRef)();
		const update = () => {
			const el = unrefElement(element);
			if (el) parentElement.value = el.parentElement;
		};
		(0, __vueuse_shared.tryOnMounted)(update);
		(0, vue.watch)(() => (0, vue.toValue)(element), update);
		return parentElement;
	}

//#endregion
//#region usePerformanceObserver/index.ts
/**
	* Observe performance metrics.
	*
	* @see https://vueuse.org/usePerformanceObserver
	* @param options
	*/
	function usePerformanceObserver(options, callback) {
		const { window: window$1 = defaultWindow, immediate = true,...performanceOptions } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => window$1 && "PerformanceObserver" in window$1);
		let observer;
		const stop = () => {
			observer === null || observer === void 0 || observer.disconnect();
		};
		const start = () => {
			if (isSupported.value) {
				stop();
				observer = new PerformanceObserver(callback);
				observer.observe(performanceOptions);
			}
		};
		(0, __vueuse_shared.tryOnScopeDispose)(stop);
		if (immediate) start();
		return {
			isSupported,
			start,
			stop
		};
	}

//#endregion
//#region usePointer/index.ts
	const defaultState = {
		x: 0,
		y: 0,
		pointerId: 0,
		pressure: 0,
		tiltX: 0,
		tiltY: 0,
		width: 0,
		height: 0,
		twist: 0,
		pointerType: null
	};
	const keys = /* @__PURE__ */ Object.keys(defaultState);
	/**
	* Reactive pointer state.
	*
	* @see https://vueuse.org/usePointer
	* @param options
	*/
	function usePointer(options = {}) {
		const { target = defaultWindow } = options;
		const isInside = (0, vue.shallowRef)(false);
		const state = (0, vue.shallowRef)(options.initialValue || {});
		Object.assign(state.value, defaultState, state.value);
		const handler = (event) => {
			isInside.value = true;
			if (options.pointerTypes && !options.pointerTypes.includes(event.pointerType)) return;
			state.value = (0, __vueuse_shared.objectPick)(event, keys, false);
		};
		if (target) {
			const listenerOptions = { passive: true };
			useEventListener(target, [
				"pointerdown",
				"pointermove",
				"pointerup"
			], handler, listenerOptions);
			useEventListener(target, "pointerleave", () => isInside.value = false, listenerOptions);
		}
		return {
			...(0, __vueuse_shared.toRefs)(state),
			isInside
		};
	}

//#endregion
//#region usePointerLock/index.ts
/**
	* Reactive pointer lock.
	*
	* @see https://vueuse.org/usePointerLock
	* @param target
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePointerLock(target, options = {}) {
		const { document: document$1 = defaultDocument } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => document$1 && "pointerLockElement" in document$1);
		const element = (0, vue.shallowRef)();
		const triggerElement = (0, vue.shallowRef)();
		let targetElement;
		if (isSupported.value) {
			const listenerOptions = { passive: true };
			useEventListener(document$1, "pointerlockchange", () => {
				var _pointerLockElement;
				const currentElement = (_pointerLockElement = document$1.pointerLockElement) !== null && _pointerLockElement !== void 0 ? _pointerLockElement : element.value;
				if (targetElement && currentElement === targetElement) {
					element.value = document$1.pointerLockElement;
					if (!element.value) targetElement = triggerElement.value = null;
				}
			}, listenerOptions);
			useEventListener(document$1, "pointerlockerror", () => {
				var _pointerLockElement2;
				const currentElement = (_pointerLockElement2 = document$1.pointerLockElement) !== null && _pointerLockElement2 !== void 0 ? _pointerLockElement2 : element.value;
				if (targetElement && currentElement === targetElement) {
					const action = document$1.pointerLockElement ? "release" : "acquire";
					throw new Error(`Failed to ${action} pointer lock.`);
				}
			}, listenerOptions);
		}
		async function lock(e) {
			var _unrefElement;
			if (!isSupported.value) throw new Error("Pointer Lock API is not supported by your browser.");
			triggerElement.value = e instanceof Event ? e.currentTarget : null;
			targetElement = e instanceof Event ? (_unrefElement = unrefElement(target)) !== null && _unrefElement !== void 0 ? _unrefElement : triggerElement.value : unrefElement(e);
			if (!targetElement) throw new Error("Target element undefined.");
			targetElement.requestPointerLock();
			return await (0, __vueuse_shared.until)(element).toBe(targetElement);
		}
		async function unlock() {
			if (!element.value) return false;
			document$1.exitPointerLock();
			await (0, __vueuse_shared.until)(element).toBeNull();
			return true;
		}
		return {
			isSupported,
			element,
			triggerElement,
			lock,
			unlock
		};
	}

//#endregion
//#region usePointerSwipe/index.ts
/**
	* Reactive swipe detection based on PointerEvents.
	*
	* @see https://vueuse.org/usePointerSwipe
	* @param target
	* @param options
	*/
	function usePointerSwipe(target, options = {}) {
		const targetRef = (0, __vueuse_shared.toRef)(target);
		const { threshold = 50, onSwipe, onSwipeEnd, onSwipeStart, disableTextSelect = false } = options;
		const posStart = (0, vue.reactive)({
			x: 0,
			y: 0
		});
		const updatePosStart = (x, y) => {
			posStart.x = x;
			posStart.y = y;
		};
		const posEnd = (0, vue.reactive)({
			x: 0,
			y: 0
		});
		const updatePosEnd = (x, y) => {
			posEnd.x = x;
			posEnd.y = y;
		};
		const distanceX = (0, vue.computed)(() => posStart.x - posEnd.x);
		const distanceY = (0, vue.computed)(() => posStart.y - posEnd.y);
		const { max, abs } = Math;
		const isThresholdExceeded = (0, vue.computed)(() => max(abs(distanceX.value), abs(distanceY.value)) >= threshold);
		const isSwiping = (0, vue.shallowRef)(false);
		const isPointerDown = (0, vue.shallowRef)(false);
		const direction = (0, vue.computed)(() => {
			if (!isThresholdExceeded.value) return "none";
			if (abs(distanceX.value) > abs(distanceY.value)) return distanceX.value > 0 ? "left" : "right";
			else return distanceY.value > 0 ? "up" : "down";
		});
		const eventIsAllowed = (e) => {
			var _ref, _options$pointerTypes, _options$pointerTypes2;
			const isReleasingButton = e.buttons === 0;
			const isPrimaryButton = e.buttons === 1;
			return (_ref = (_options$pointerTypes = (_options$pointerTypes2 = options.pointerTypes) === null || _options$pointerTypes2 === void 0 ? void 0 : _options$pointerTypes2.includes(e.pointerType)) !== null && _options$pointerTypes !== void 0 ? _options$pointerTypes : isReleasingButton || isPrimaryButton) !== null && _ref !== void 0 ? _ref : true;
		};
		const listenerOptions = { passive: true };
		const stops = [
			useEventListener(target, "pointerdown", (e) => {
				if (!eventIsAllowed(e)) return;
				isPointerDown.value = true;
				const eventTarget = e.target;
				eventTarget === null || eventTarget === void 0 || eventTarget.setPointerCapture(e.pointerId);
				const { clientX: x, clientY: y } = e;
				updatePosStart(x, y);
				updatePosEnd(x, y);
				onSwipeStart === null || onSwipeStart === void 0 || onSwipeStart(e);
			}, listenerOptions),
			useEventListener(target, "pointermove", (e) => {
				if (!eventIsAllowed(e)) return;
				if (!isPointerDown.value) return;
				const { clientX: x, clientY: y } = e;
				updatePosEnd(x, y);
				if (!isSwiping.value && isThresholdExceeded.value) isSwiping.value = true;
				if (isSwiping.value) onSwipe === null || onSwipe === void 0 || onSwipe(e);
			}, listenerOptions),
			useEventListener(target, "pointerup", (e) => {
				if (!eventIsAllowed(e)) return;
				if (isSwiping.value) onSwipeEnd === null || onSwipeEnd === void 0 || onSwipeEnd(e, direction.value);
				isPointerDown.value = false;
				isSwiping.value = false;
			}, listenerOptions)
		];
		(0, __vueuse_shared.tryOnMounted)(() => {
			var _targetRef$value;
			(_targetRef$value = targetRef.value) === null || _targetRef$value === void 0 || (_targetRef$value = _targetRef$value.style) === null || _targetRef$value === void 0 || _targetRef$value.setProperty("touch-action", "pan-y");
			if (disableTextSelect) {
				var _targetRef$value2, _targetRef$value3, _targetRef$value4;
				(_targetRef$value2 = targetRef.value) === null || _targetRef$value2 === void 0 || (_targetRef$value2 = _targetRef$value2.style) === null || _targetRef$value2 === void 0 || _targetRef$value2.setProperty("-webkit-user-select", "none");
				(_targetRef$value3 = targetRef.value) === null || _targetRef$value3 === void 0 || (_targetRef$value3 = _targetRef$value3.style) === null || _targetRef$value3 === void 0 || _targetRef$value3.setProperty("-ms-user-select", "none");
				(_targetRef$value4 = targetRef.value) === null || _targetRef$value4 === void 0 || (_targetRef$value4 = _targetRef$value4.style) === null || _targetRef$value4 === void 0 || _targetRef$value4.setProperty("user-select", "none");
			}
		});
		const stop = () => stops.forEach((s) => s());
		return {
			isSwiping: (0, vue.readonly)(isSwiping),
			direction: (0, vue.readonly)(direction),
			posStart: (0, vue.readonly)(posStart),
			posEnd: (0, vue.readonly)(posEnd),
			distanceX,
			distanceY,
			stop
		};
	}

//#endregion
//#region usePreferredColorScheme/index.ts
/**
	* Reactive prefers-color-scheme media query.
	*
	* @see https://vueuse.org/usePreferredColorScheme
	* @param [options]
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePreferredColorScheme(options) {
		const isLight = useMediaQuery("(prefers-color-scheme: light)", options);
		const isDark = useMediaQuery("(prefers-color-scheme: dark)", options);
		return (0, vue.computed)(() => {
			if (isDark.value) return "dark";
			if (isLight.value) return "light";
			return "no-preference";
		});
	}

//#endregion
//#region usePreferredContrast/index.ts
/**
	* Reactive prefers-contrast media query.
	*
	* @see https://vueuse.org/usePreferredContrast
	* @param [options]
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePreferredContrast(options) {
		const isMore = useMediaQuery("(prefers-contrast: more)", options);
		const isLess = useMediaQuery("(prefers-contrast: less)", options);
		const isCustom = useMediaQuery("(prefers-contrast: custom)", options);
		return (0, vue.computed)(() => {
			if (isMore.value) return "more";
			if (isLess.value) return "less";
			if (isCustom.value) return "custom";
			return "no-preference";
		});
	}

//#endregion
//#region usePreferredLanguages/index.ts
/**
	* Reactive Navigator Languages.
	*
	* @see https://vueuse.org/usePreferredLanguages
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePreferredLanguages(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		if (!window$1) return (0, vue.shallowRef)(["en"]);
		const navigator$1 = window$1.navigator;
		const value = (0, vue.shallowRef)(navigator$1.languages);
		useEventListener(window$1, "languagechange", () => {
			value.value = navigator$1.languages;
		}, { passive: true });
		return value;
	}

//#endregion
//#region usePreferredReducedMotion/index.ts
/**
	* Reactive prefers-reduced-motion media query.
	*
	* @see https://vueuse.org/usePreferredReducedMotion
	* @param [options]
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePreferredReducedMotion(options) {
		const isReduced = useMediaQuery("(prefers-reduced-motion: reduce)", options);
		return (0, vue.computed)(() => {
			if (isReduced.value) return "reduce";
			return "no-preference";
		});
	}

//#endregion
//#region usePreferredReducedTransparency/index.ts
/**
	* Reactive prefers-reduced-transparency media query.
	*
	* @see https://vueuse.org/usePreferredReducedTransparency
	* @param [options]
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function usePreferredReducedTransparency(options) {
		const isReduced = useMediaQuery("(prefers-reduced-transparency: reduce)", options);
		return (0, vue.computed)(() => {
			if (isReduced.value) return "reduce";
			return "no-preference";
		});
	}

//#endregion
//#region usePrevious/index.ts
	function usePrevious(value, initialValue) {
		const previous = (0, vue.shallowRef)(initialValue);
		(0, vue.watch)((0, __vueuse_shared.toRef)(value), (_, oldValue) => {
			previous.value = oldValue;
		}, { flush: "sync" });
		return (0, vue.readonly)(previous);
	}

//#endregion
//#region useScreenSafeArea/index.ts
	const topVarName = "--vueuse-safe-area-top";
	const rightVarName = "--vueuse-safe-area-right";
	const bottomVarName = "--vueuse-safe-area-bottom";
	const leftVarName = "--vueuse-safe-area-left";
	/**
	* Reactive `env(safe-area-inset-*)`
	*
	* @see https://vueuse.org/useScreenSafeArea
	*/
	function useScreenSafeArea() {
		const top = (0, vue.shallowRef)("");
		const right = (0, vue.shallowRef)("");
		const bottom = (0, vue.shallowRef)("");
		const left = (0, vue.shallowRef)("");
		if (__vueuse_shared.isClient) {
			const topCssVar = useCssVar(topVarName);
			const rightCssVar = useCssVar(rightVarName);
			const bottomCssVar = useCssVar(bottomVarName);
			const leftCssVar = useCssVar(leftVarName);
			topCssVar.value = "env(safe-area-inset-top, 0px)";
			rightCssVar.value = "env(safe-area-inset-right, 0px)";
			bottomCssVar.value = "env(safe-area-inset-bottom, 0px)";
			leftCssVar.value = "env(safe-area-inset-left, 0px)";
			(0, __vueuse_shared.tryOnMounted)(update);
			useEventListener("resize", (0, __vueuse_shared.useDebounceFn)(update), { passive: true });
		}
		function update() {
			top.value = getValue(topVarName);
			right.value = getValue(rightVarName);
			bottom.value = getValue(bottomVarName);
			left.value = getValue(leftVarName);
		}
		return {
			top,
			right,
			bottom,
			left,
			update
		};
	}
	function getValue(position) {
		return getComputedStyle(document.documentElement).getPropertyValue(position);
	}

//#endregion
//#region useScriptTag/index.ts
/**
	* Async script tag loading.
	*
	* @see https://vueuse.org/useScriptTag
	* @param src
	* @param onLoaded
	* @param options
	*/
	function useScriptTag(src, onLoaded = __vueuse_shared.noop, options = {}) {
		const { immediate = true, manual = false, type = "text/javascript", async = true, crossOrigin, referrerPolicy, noModule, defer, document: document$1 = defaultDocument, attrs = {}, nonce = void 0 } = options;
		const scriptTag = (0, vue.shallowRef)(null);
		let _promise = null;
		/**
		* Load the script specified via `src`.
		*
		* @param waitForScriptLoad Whether if the Promise should resolve once the "load" event is emitted by the <script> attribute, or right after appending it to the DOM.
		* @returns Promise<HTMLScriptElement>
		*/
		const loadScript = (waitForScriptLoad) => new Promise((resolve, reject) => {
			const resolveWithElement = (el$1) => {
				scriptTag.value = el$1;
				resolve(el$1);
				return el$1;
			};
			if (!document$1) {
				resolve(false);
				return;
			}
			let shouldAppend = false;
			let el = document$1.querySelector(`script[src="${(0, vue.toValue)(src)}"]`);
			if (!el) {
				el = document$1.createElement("script");
				el.type = type;
				el.async = async;
				el.src = (0, vue.toValue)(src);
				if (defer) el.defer = defer;
				if (crossOrigin) el.crossOrigin = crossOrigin;
				if (noModule) el.noModule = noModule;
				if (referrerPolicy) el.referrerPolicy = referrerPolicy;
				if (nonce) el.nonce = nonce;
				Object.entries(attrs).forEach(([name, value]) => el === null || el === void 0 ? void 0 : el.setAttribute(name, value));
				shouldAppend = true;
			} else if (el.hasAttribute("data-loaded")) resolveWithElement(el);
			const listenerOptions = { passive: true };
			useEventListener(el, "error", (event) => reject(event), listenerOptions);
			useEventListener(el, "abort", (event) => reject(event), listenerOptions);
			useEventListener(el, "load", () => {
				el.setAttribute("data-loaded", "true");
				onLoaded(el);
				resolveWithElement(el);
			}, listenerOptions);
			if (shouldAppend) el = document$1.head.appendChild(el);
			if (!waitForScriptLoad) resolveWithElement(el);
		});
		/**
		* Exposed singleton wrapper for `loadScript`, avoiding calling it twice.
		*
		* @param waitForScriptLoad Whether if the Promise should resolve once the "load" event is emitted by the <script> attribute, or right after appending it to the DOM.
		* @returns Promise<HTMLScriptElement>
		*/
		const load = (waitForScriptLoad = true) => {
			if (!_promise) _promise = loadScript(waitForScriptLoad);
			return _promise;
		};
		/**
		* Unload the script specified by `src`.
		*/
		const unload = () => {
			if (!document$1) return;
			_promise = null;
			if (scriptTag.value) scriptTag.value = null;
			const el = document$1.querySelector(`script[src="${(0, vue.toValue)(src)}"]`);
			if (el) document$1.head.removeChild(el);
		};
		if (immediate && !manual) (0, __vueuse_shared.tryOnMounted)(load);
		if (!manual) (0, __vueuse_shared.tryOnUnmounted)(unload);
		return {
			scriptTag,
			load,
			unload
		};
	}

//#endregion
//#region useScrollLock/index.ts
	function checkOverflowScroll(ele) {
		const style = window.getComputedStyle(ele);
		if (style.overflowX === "scroll" || style.overflowY === "scroll" || style.overflowX === "auto" && ele.clientWidth < ele.scrollWidth || style.overflowY === "auto" && ele.clientHeight < ele.scrollHeight) return true;
		else {
			const parent = ele.parentNode;
			if (!parent || parent.tagName === "BODY") return false;
			return checkOverflowScroll(parent);
		}
	}
	function preventDefault(rawEvent) {
		const e = rawEvent || window.event;
		const _target = e.target;
		if (checkOverflowScroll(_target)) return false;
		if (e.touches.length > 1) return true;
		if (e.preventDefault) e.preventDefault();
		return false;
	}
	const elInitialOverflow = /* @__PURE__ */ new WeakMap();
	/**
	* Lock scrolling of the element.
	*
	* @see https://vueuse.org/useScrollLock
	* @param element
	*/
	function useScrollLock(element, initialState = false) {
		const isLocked = (0, vue.shallowRef)(initialState);
		let stopTouchMoveListener = null;
		let initialOverflow = "";
		(0, vue.watch)((0, __vueuse_shared.toRef)(element), (el) => {
			const target = resolveElement((0, vue.toValue)(el));
			if (target) {
				const ele = target;
				if (!elInitialOverflow.get(ele)) elInitialOverflow.set(ele, ele.style.overflow);
				if (ele.style.overflow !== "hidden") initialOverflow = ele.style.overflow;
				if (ele.style.overflow === "hidden") return isLocked.value = true;
				if (isLocked.value) return ele.style.overflow = "hidden";
			}
		}, { immediate: true });
		const lock = () => {
			const el = resolveElement((0, vue.toValue)(element));
			if (!el || isLocked.value) return;
			if (__vueuse_shared.isIOS) stopTouchMoveListener = useEventListener(el, "touchmove", (e) => {
				preventDefault(e);
			}, { passive: false });
			el.style.overflow = "hidden";
			isLocked.value = true;
		};
		const unlock = () => {
			const el = resolveElement((0, vue.toValue)(element));
			if (!el || !isLocked.value) return;
			if (__vueuse_shared.isIOS) stopTouchMoveListener === null || stopTouchMoveListener === void 0 || stopTouchMoveListener();
			el.style.overflow = initialOverflow;
			elInitialOverflow.delete(el);
			isLocked.value = false;
		};
		(0, __vueuse_shared.tryOnScopeDispose)(unlock);
		return (0, vue.computed)({
			get() {
				return isLocked.value;
			},
			set(v) {
				if (v) lock();
				else unlock();
			}
		});
	}

//#endregion
//#region useSessionStorage/index.ts
/**
	* Reactive SessionStorage.
	*
	* @see https://vueuse.org/useSessionStorage
	* @param key
	* @param initialValue
	* @param options
	*/
	function useSessionStorage(key, initialValue, options = {}) {
		const { window: window$1 = defaultWindow } = options;
		return useStorage(key, initialValue, window$1 === null || window$1 === void 0 ? void 0 : window$1.sessionStorage, options);
	}

//#endregion
//#region useShare/index.ts
/**
	* Reactive Web Share API.
	*
	* @see https://vueuse.org/useShare
	* @param shareOptions
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useShare(shareOptions = {}, options = {}) {
		const { navigator: navigator$1 = defaultNavigator } = options;
		const _navigator = navigator$1;
		const isSupported = /* @__PURE__ */ useSupported(() => _navigator && "canShare" in _navigator);
		const share = async (overrideOptions = {}) => {
			if (isSupported.value) {
				const data = {
					...(0, vue.toValue)(shareOptions),
					...(0, vue.toValue)(overrideOptions)
				};
				let granted = false;
				if (_navigator.canShare) granted = _navigator.canShare(data);
				if (granted) return _navigator.share(data);
			}
		};
		return {
			isSupported,
			share
		};
	}

//#endregion
//#region useSorted/index.ts
	const defaultSortFn = (source, compareFn) => source.sort(compareFn);
	const defaultCompare = (a, b) => a - b;
	function useSorted(...args) {
		const [source] = args;
		let compareFn = defaultCompare;
		let options = {};
		if (args.length === 2) if (typeof args[1] === "object") {
			var _options$compareFn;
			options = args[1];
			compareFn = (_options$compareFn = options.compareFn) !== null && _options$compareFn !== void 0 ? _options$compareFn : defaultCompare;
		} else {
			var _args$;
			compareFn = (_args$ = args[1]) !== null && _args$ !== void 0 ? _args$ : defaultCompare;
		}
		else if (args.length > 2) {
			var _args$2, _args$3;
			compareFn = (_args$2 = args[1]) !== null && _args$2 !== void 0 ? _args$2 : defaultCompare;
			options = (_args$3 = args[2]) !== null && _args$3 !== void 0 ? _args$3 : {};
		}
		const { dirty = false, sortFn = defaultSortFn } = options;
		if (!dirty) return (0, vue.computed)(() => sortFn([...(0, vue.toValue)(source)], compareFn));
		(0, vue.watchEffect)(() => {
			const result = sortFn((0, vue.toValue)(source), compareFn);
			if ((0, vue.isRef)(source)) source.value = result;
			else source.splice(0, source.length, ...result);
		});
		return source;
	}

//#endregion
//#region useSpeechRecognition/index.ts
/**
	* Reactive SpeechRecognition.
	*
	* @see https://vueuse.org/useSpeechRecognition
	* @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition SpeechRecognition
	* @param options
	*/
	function useSpeechRecognition(options = {}) {
		const { interimResults = true, continuous = true, maxAlternatives = 1, window: window$1 = defaultWindow } = options;
		const lang = (0, __vueuse_shared.toRef)(options.lang || "en-US");
		const isListening = (0, vue.shallowRef)(false);
		const isFinal = (0, vue.shallowRef)(false);
		const result = (0, vue.shallowRef)("");
		const error = (0, vue.shallowRef)(void 0);
		let recognition;
		const start = () => {
			isListening.value = true;
		};
		const stop = () => {
			isListening.value = false;
		};
		const toggle = (value = !isListening.value) => {
			if (value) start();
			else stop();
		};
		const SpeechRecognition = window$1 && (window$1.SpeechRecognition || window$1.webkitSpeechRecognition);
		const isSupported = /* @__PURE__ */ useSupported(() => SpeechRecognition);
		if (isSupported.value) {
			recognition = new SpeechRecognition();
			recognition.continuous = continuous;
			recognition.interimResults = interimResults;
			recognition.lang = (0, vue.toValue)(lang);
			recognition.maxAlternatives = maxAlternatives;
			recognition.onstart = () => {
				isListening.value = true;
				isFinal.value = false;
			};
			(0, vue.watch)(lang, (lang$1) => {
				if (recognition && !isListening.value) recognition.lang = lang$1;
			});
			recognition.onresult = (event) => {
				const currentResult = event.results[event.resultIndex];
				const { transcript } = currentResult[0];
				isFinal.value = currentResult.isFinal;
				result.value = transcript;
				error.value = void 0;
			};
			recognition.onerror = (event) => {
				error.value = event;
			};
			recognition.onend = () => {
				isListening.value = false;
				recognition.lang = (0, vue.toValue)(lang);
			};
			(0, vue.watch)(isListening, (newValue, oldValue) => {
				if (newValue === oldValue) return;
				try {
					if (newValue) recognition.start();
					else recognition.stop();
				} catch (err) {
					error.value = err;
				}
			});
		}
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			stop();
		});
		return {
			isSupported,
			isListening,
			isFinal,
			recognition,
			result,
			error,
			toggle,
			start,
			stop
		};
	}

//#endregion
//#region useSpeechSynthesis/index.ts
/**
	* Reactive SpeechSynthesis.
	*
	* @see https://vueuse.org/useSpeechSynthesis
	* @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis SpeechSynthesis
	*/
	function useSpeechSynthesis(text, options = {}) {
		const { pitch = 1, rate = 1, volume = 1, window: window$1 = defaultWindow, onBoundary } = options;
		const synth = window$1 && window$1.speechSynthesis;
		const isSupported = /* @__PURE__ */ useSupported(() => synth);
		const isPlaying = (0, vue.shallowRef)(false);
		const status = (0, vue.shallowRef)("init");
		const spokenText = (0, __vueuse_shared.toRef)(text || "");
		const lang = (0, __vueuse_shared.toRef)(options.lang || "en-US");
		const error = (0, vue.shallowRef)(void 0);
		const toggle = (value = !isPlaying.value) => {
			isPlaying.value = value;
		};
		const bindEventsForUtterance = (utterance$1) => {
			utterance$1.lang = (0, vue.toValue)(lang);
			utterance$1.voice = (0, vue.toValue)(options.voice) || null;
			utterance$1.pitch = (0, vue.toValue)(pitch);
			utterance$1.rate = (0, vue.toValue)(rate);
			utterance$1.volume = (0, vue.toValue)(volume);
			utterance$1.onstart = () => {
				isPlaying.value = true;
				status.value = "play";
			};
			utterance$1.onpause = () => {
				isPlaying.value = false;
				status.value = "pause";
			};
			utterance$1.onresume = () => {
				isPlaying.value = true;
				status.value = "play";
			};
			utterance$1.onend = () => {
				isPlaying.value = false;
				status.value = "end";
			};
			utterance$1.onerror = (event) => {
				error.value = event;
			};
			utterance$1.onboundary = (event) => {
				onBoundary === null || onBoundary === void 0 || onBoundary(event);
			};
		};
		const utterance = (0, vue.computed)(() => {
			isPlaying.value = false;
			status.value = "init";
			const newUtterance = new SpeechSynthesisUtterance(spokenText.value);
			bindEventsForUtterance(newUtterance);
			return newUtterance;
		});
		const speak = () => {
			synth.cancel();
			if (utterance) synth.speak(utterance.value);
		};
		const stop = () => {
			synth.cancel();
			isPlaying.value = false;
		};
		if (isSupported.value) {
			bindEventsForUtterance(utterance.value);
			(0, vue.watch)(lang, (lang$1) => {
				if (utterance.value && !isPlaying.value) utterance.value.lang = lang$1;
			});
			if (options.voice) (0, vue.watch)(options.voice, () => {
				synth.cancel();
			});
			(0, vue.watch)(isPlaying, () => {
				if (isPlaying.value) synth.resume();
				else synth.pause();
			});
		}
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			isPlaying.value = false;
		});
		return {
			isSupported,
			isPlaying,
			status,
			utterance,
			error,
			stop,
			toggle,
			speak
		};
	}

//#endregion
//#region useStepper/index.ts
	/* @__NO_SIDE_EFFECTS__ */
	function useStepper(steps, initialStep) {
		const stepsRef = (0, vue.ref)(steps);
		const stepNames = (0, vue.computed)(() => Array.isArray(stepsRef.value) ? stepsRef.value : Object.keys(stepsRef.value));
		const index = (0, vue.ref)(stepNames.value.indexOf(initialStep !== null && initialStep !== void 0 ? initialStep : stepNames.value[0]));
		const current = (0, vue.computed)(() => at(index.value));
		const isFirst = (0, vue.computed)(() => index.value === 0);
		const isLast = (0, vue.computed)(() => index.value === stepNames.value.length - 1);
		const next = (0, vue.computed)(() => stepNames.value[index.value + 1]);
		const previous = (0, vue.computed)(() => stepNames.value[index.value - 1]);
		function at(index$1) {
			if (Array.isArray(stepsRef.value)) return stepsRef.value[index$1];
			return stepsRef.value[stepNames.value[index$1]];
		}
		function get(step) {
			if (!stepNames.value.includes(step)) return;
			return at(stepNames.value.indexOf(step));
		}
		function goTo(step) {
			if (stepNames.value.includes(step)) index.value = stepNames.value.indexOf(step);
		}
		function goToNext() {
			if (isLast.value) return;
			index.value++;
		}
		function goToPrevious() {
			if (isFirst.value) return;
			index.value--;
		}
		function goBackTo(step) {
			if (isAfter(step)) goTo(step);
		}
		function isNext(step) {
			return stepNames.value.indexOf(step) === index.value + 1;
		}
		function isPrevious(step) {
			return stepNames.value.indexOf(step) === index.value - 1;
		}
		function isCurrent(step) {
			return stepNames.value.indexOf(step) === index.value;
		}
		function isBefore(step) {
			return index.value < stepNames.value.indexOf(step);
		}
		function isAfter(step) {
			return index.value > stepNames.value.indexOf(step);
		}
		return {
			steps: stepsRef,
			stepNames,
			index,
			current,
			next,
			previous,
			isFirst,
			isLast,
			at,
			get,
			goTo,
			goToNext,
			goToPrevious,
			goBackTo,
			isNext,
			isPrevious,
			isCurrent,
			isBefore,
			isAfter
		};
	}

//#endregion
//#region useStorageAsync/index.ts
/**
	* Reactive Storage in with async support.
	*
	* @see https://vueuse.org/useStorageAsync
	* @param key
	* @param initialValue
	* @param storage
	* @param options
	*/
	function useStorageAsync(key, initialValue, storage, options = {}) {
		var _options$serializer;
		const { flush = "pre", deep = true, listenToStorageChanges = true, writeDefaults = true, mergeDefaults = false, shallow, window: window$1 = defaultWindow, eventFilter, onError = (e) => {
			console.error(e);
		}, onReady } = options;
		const rawInit = (0, vue.toValue)(initialValue);
		const type = guessSerializerType(rawInit);
		const data = (shallow ? vue.shallowRef : vue.ref)((0, vue.toValue)(initialValue));
		const serializer = (_options$serializer = options.serializer) !== null && _options$serializer !== void 0 ? _options$serializer : StorageSerializers[type];
		if (!storage) try {
			storage = getSSRHandler("getDefaultStorageAsync", () => defaultWindow === null || defaultWindow === void 0 ? void 0 : defaultWindow.localStorage)();
		} catch (e) {
			onError(e);
		}
		async function read(event) {
			if (!storage || event && event.key !== key) return;
			try {
				const rawValue = event ? event.newValue : await storage.getItem(key);
				if (rawValue == null) {
					data.value = rawInit;
					if (writeDefaults && rawInit !== null) await storage.setItem(key, await serializer.write(rawInit));
				} else if (mergeDefaults) {
					const value = await serializer.read(rawValue);
					if (typeof mergeDefaults === "function") data.value = mergeDefaults(value, rawInit);
					else if (type === "object" && !Array.isArray(value)) data.value = {
						...rawInit,
						...value
					};
					else data.value = value;
				} else data.value = await serializer.read(rawValue);
			} catch (e) {
				onError(e);
			}
		}
		const promise = new Promise((resolve) => {
			read().then(() => {
				onReady === null || onReady === void 0 || onReady(data.value);
				resolve(data);
			});
		});
		if (window$1 && listenToStorageChanges) useEventListener(window$1, "storage", (e) => Promise.resolve().then(() => read(e)), { passive: true });
		if (storage) (0, __vueuse_shared.watchWithFilter)(data, async () => {
			try {
				if (data.value == null) await storage.removeItem(key);
				else await storage.setItem(key, await serializer.write(data.value));
			} catch (e) {
				onError(e);
			}
		}, {
			flush,
			deep,
			eventFilter
		});
		Object.assign(data, {
			then: promise.then.bind(promise),
			catch: promise.catch.bind(promise)
		});
		return data;
	}

//#endregion
//#region useStyleTag/index.ts
	let _id = 0;
	/**
	* Inject <style> element in head.
	*
	* Overload: Omitted id
	*
	* @see https://vueuse.org/useStyleTag
	* @param css
	* @param options
	*/
	function useStyleTag(css, options = {}) {
		const isLoaded = (0, vue.shallowRef)(false);
		const { document: document$1 = defaultDocument, immediate = true, manual = false, id = `vueuse_styletag_${++_id}` } = options;
		const cssRef = (0, vue.shallowRef)(css);
		let stop = () => {};
		const load = () => {
			if (!document$1) return;
			const el = document$1.getElementById(id) || document$1.createElement("style");
			if (!el.isConnected) {
				el.id = id;
				if (options.nonce) el.nonce = options.nonce;
				if (options.media) el.media = options.media;
				document$1.head.appendChild(el);
			}
			if (isLoaded.value) return;
			stop = (0, vue.watch)(cssRef, (value) => {
				el.textContent = value;
			}, { immediate: true });
			isLoaded.value = true;
		};
		const unload = () => {
			if (!document$1 || !isLoaded.value) return;
			stop();
			document$1.head.removeChild(document$1.getElementById(id));
			isLoaded.value = false;
		};
		if (immediate && !manual) (0, __vueuse_shared.tryOnMounted)(load);
		if (!manual) (0, __vueuse_shared.tryOnScopeDispose)(unload);
		return {
			id,
			css: cssRef,
			unload,
			load,
			isLoaded: (0, vue.readonly)(isLoaded)
		};
	}

//#endregion
//#region useSwipe/index.ts
/**
	* Reactive swipe detection.
	*
	* @see https://vueuse.org/useSwipe
	* @param target
	* @param options
	*/
	function useSwipe(target, options = {}) {
		const { threshold = 50, onSwipe, onSwipeEnd, onSwipeStart, passive = true } = options;
		const coordsStart = (0, vue.reactive)({
			x: 0,
			y: 0
		});
		const coordsEnd = (0, vue.reactive)({
			x: 0,
			y: 0
		});
		const diffX = (0, vue.computed)(() => coordsStart.x - coordsEnd.x);
		const diffY = (0, vue.computed)(() => coordsStart.y - coordsEnd.y);
		const { max, abs } = Math;
		const isThresholdExceeded = (0, vue.computed)(() => max(abs(diffX.value), abs(diffY.value)) >= threshold);
		const isSwiping = (0, vue.shallowRef)(false);
		const direction = (0, vue.computed)(() => {
			if (!isThresholdExceeded.value) return "none";
			if (abs(diffX.value) > abs(diffY.value)) return diffX.value > 0 ? "left" : "right";
			else return diffY.value > 0 ? "up" : "down";
		});
		const getTouchEventCoords = (e) => [e.touches[0].clientX, e.touches[0].clientY];
		const updateCoordsStart = (x, y) => {
			coordsStart.x = x;
			coordsStart.y = y;
		};
		const updateCoordsEnd = (x, y) => {
			coordsEnd.x = x;
			coordsEnd.y = y;
		};
		const listenerOptions = {
			passive,
			capture: !passive
		};
		const onTouchEnd = (e) => {
			if (isSwiping.value) onSwipeEnd === null || onSwipeEnd === void 0 || onSwipeEnd(e, direction.value);
			isSwiping.value = false;
		};
		const stops = [
			useEventListener(target, "touchstart", (e) => {
				if (e.touches.length !== 1) return;
				const [x, y] = getTouchEventCoords(e);
				updateCoordsStart(x, y);
				updateCoordsEnd(x, y);
				onSwipeStart === null || onSwipeStart === void 0 || onSwipeStart(e);
			}, listenerOptions),
			useEventListener(target, "touchmove", (e) => {
				if (e.touches.length !== 1) return;
				const [x, y] = getTouchEventCoords(e);
				updateCoordsEnd(x, y);
				if (listenerOptions.capture && !listenerOptions.passive && Math.abs(diffX.value) > Math.abs(diffY.value)) e.preventDefault();
				if (!isSwiping.value && isThresholdExceeded.value) isSwiping.value = true;
				if (isSwiping.value) onSwipe === null || onSwipe === void 0 || onSwipe(e);
			}, listenerOptions),
			useEventListener(target, ["touchend", "touchcancel"], onTouchEnd, listenerOptions)
		];
		const stop = () => stops.forEach((s) => s());
		return {
			isSwiping,
			direction,
			coordsStart,
			coordsEnd,
			lengthX: diffX,
			lengthY: diffY,
			stop
		};
	}

//#endregion
//#region useTemplateRefsList/index.ts
	/* @__NO_SIDE_EFFECTS__ */
	function useTemplateRefsList() {
		const refs = (0, vue.ref)([]);
		refs.value.set = (el) => {
			if (el) refs.value.push(el);
		};
		(0, vue.onBeforeUpdate)(() => {
			refs.value.length = 0;
		});
		return refs;
	}

//#endregion
//#region useTextDirection/index.ts
/**
	* Reactive dir of the element's text.
	*
	* @see https://vueuse.org/useTextDirection
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useTextDirection(options = {}) {
		const { document: document$1 = defaultDocument, selector = "html", observe = false, initialValue = "ltr" } = options;
		function getValue$1() {
			var _ref, _document$querySelect;
			return (_ref = document$1 === null || document$1 === void 0 || (_document$querySelect = document$1.querySelector(selector)) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.getAttribute("dir")) !== null && _ref !== void 0 ? _ref : initialValue;
		}
		const dir = (0, vue.ref)(getValue$1());
		(0, __vueuse_shared.tryOnMounted)(() => dir.value = getValue$1());
		if (observe && document$1) useMutationObserver(document$1.querySelector(selector), () => dir.value = getValue$1(), { attributes: true });
		return (0, vue.computed)({
			get() {
				return dir.value;
			},
			set(v) {
				var _document$querySelect2, _document$querySelect3;
				dir.value = v;
				if (!document$1) return;
				if (dir.value) (_document$querySelect2 = document$1.querySelector(selector)) === null || _document$querySelect2 === void 0 || _document$querySelect2.setAttribute("dir", dir.value);
				else (_document$querySelect3 = document$1.querySelector(selector)) === null || _document$querySelect3 === void 0 || _document$querySelect3.removeAttribute("dir");
			}
		});
	}

//#endregion
//#region useTextSelection/index.ts
	function getRangesFromSelection(selection) {
		var _selection$rangeCount;
		const rangeCount = (_selection$rangeCount = selection.rangeCount) !== null && _selection$rangeCount !== void 0 ? _selection$rangeCount : 0;
		return Array.from({ length: rangeCount }, (_, i) => selection.getRangeAt(i));
	}
	/**
	* Reactively track user text selection based on [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection).
	*
	* @see https://vueuse.org/useTextSelection
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useTextSelection(options = {}) {
		var _window$getSelection;
		const { window: window$1 = defaultWindow } = options;
		const selection = (0, vue.shallowRef)((_window$getSelection = window$1 === null || window$1 === void 0 ? void 0 : window$1.getSelection()) !== null && _window$getSelection !== void 0 ? _window$getSelection : null);
		const text = (0, vue.computed)(() => {
			var _selection$value$toSt, _selection$value;
			return (_selection$value$toSt = (_selection$value = selection.value) === null || _selection$value === void 0 ? void 0 : _selection$value.toString()) !== null && _selection$value$toSt !== void 0 ? _selection$value$toSt : "";
		});
		const ranges = (0, vue.computed)(() => selection.value ? getRangesFromSelection(selection.value) : []);
		const rects = (0, vue.computed)(() => ranges.value.map((range) => range.getBoundingClientRect()));
		function onSelectionChange() {
			selection.value = null;
			if (window$1) selection.value = window$1.getSelection();
		}
		if (window$1) useEventListener(window$1.document, "selectionchange", onSelectionChange, { passive: true });
		return {
			text,
			rects,
			ranges,
			selection
		};
	}

//#endregion
//#region useTextareaAutosize/index.ts
/**
	* Call window.requestAnimationFrame(), if not available, just call the function
	*
	* @param window
	* @param fn
	*/
	function tryRequestAnimationFrame(window$1 = defaultWindow, fn) {
		if (window$1 && typeof window$1.requestAnimationFrame === "function") window$1.requestAnimationFrame(fn);
		else fn();
	}
	function useTextareaAutosize(options = {}) {
		var _options$input, _options$styleProp;
		const { window: window$1 = defaultWindow } = options;
		const textarea = (0, __vueuse_shared.toRef)(options === null || options === void 0 ? void 0 : options.element);
		const input = (0, __vueuse_shared.toRef)((_options$input = options === null || options === void 0 ? void 0 : options.input) !== null && _options$input !== void 0 ? _options$input : "");
		const styleProp = (_options$styleProp = options === null || options === void 0 ? void 0 : options.styleProp) !== null && _options$styleProp !== void 0 ? _options$styleProp : "height";
		const textareaScrollHeight = (0, vue.shallowRef)(1);
		const textareaOldWidth = (0, vue.shallowRef)(0);
		function triggerResize() {
			var _textarea$value;
			if (!textarea.value) return;
			let height = "";
			textarea.value.style[styleProp] = "1px";
			textareaScrollHeight.value = (_textarea$value = textarea.value) === null || _textarea$value === void 0 ? void 0 : _textarea$value.scrollHeight;
			const _styleTarget = (0, vue.toValue)(options === null || options === void 0 ? void 0 : options.styleTarget);
			if (_styleTarget) _styleTarget.style[styleProp] = `${textareaScrollHeight.value}px`;
			else height = `${textareaScrollHeight.value}px`;
			textarea.value.style[styleProp] = height;
		}
		(0, vue.watch)([input, textarea], () => (0, vue.nextTick)(triggerResize), { immediate: true });
		(0, vue.watch)(textareaScrollHeight, () => {
			var _options$onResize;
			return options === null || options === void 0 || (_options$onResize = options.onResize) === null || _options$onResize === void 0 ? void 0 : _options$onResize.call(options);
		});
		useResizeObserver(textarea, ([{ contentRect }]) => {
			if (textareaOldWidth.value === contentRect.width) return;
			tryRequestAnimationFrame(window$1, () => {
				textareaOldWidth.value = contentRect.width;
				triggerResize();
			});
		});
		if (options === null || options === void 0 ? void 0 : options.watch) (0, vue.watch)(options.watch, triggerResize, {
			immediate: true,
			deep: true
		});
		return {
			textarea,
			input,
			triggerResize
		};
	}

//#endregion
//#region useThrottledRefHistory/index.ts
/**
	* Shorthand for [useRefHistory](https://vueuse.org/useRefHistory) with throttled filter.
	*
	* @see https://vueuse.org/useThrottledRefHistory
	* @param source
	* @param options
	*/
	function useThrottledRefHistory(source, options = {}) {
		const { throttle = 200, trailing = true } = options;
		const filter = (0, __vueuse_shared.throttleFilter)(throttle, trailing);
		return { ...useRefHistory(source, {
			...options,
			eventFilter: filter
		}) };
	}

//#endregion
//#region useTimeAgo/index.ts
	const DEFAULT_UNITS = [
		{
			max: 6e4,
			value: 1e3,
			name: "second"
		},
		{
			max: 276e4,
			value: 6e4,
			name: "minute"
		},
		{
			max: 72e6,
			value: 36e5,
			name: "hour"
		},
		{
			max: 5184e5,
			value: 864e5,
			name: "day"
		},
		{
			max: 24192e5,
			value: 6048e5,
			name: "week"
		},
		{
			max: 28512e6,
			value: 2592e6,
			name: "month"
		},
		{
			max: Number.POSITIVE_INFINITY,
			value: 31536e6,
			name: "year"
		}
	];
	const DEFAULT_MESSAGES = {
		justNow: "just now",
		past: (n) => n.match(/\d/) ? `${n} ago` : n,
		future: (n) => n.match(/\d/) ? `in ${n}` : n,
		month: (n, past) => n === 1 ? past ? "last month" : "next month" : `${n} month${n > 1 ? "s" : ""}`,
		year: (n, past) => n === 1 ? past ? "last year" : "next year" : `${n} year${n > 1 ? "s" : ""}`,
		day: (n, past) => n === 1 ? past ? "yesterday" : "tomorrow" : `${n} day${n > 1 ? "s" : ""}`,
		week: (n, past) => n === 1 ? past ? "last week" : "next week" : `${n} week${n > 1 ? "s" : ""}`,
		hour: (n) => `${n} hour${n > 1 ? "s" : ""}`,
		minute: (n) => `${n} minute${n > 1 ? "s" : ""}`,
		second: (n) => `${n} second${n > 1 ? "s" : ""}`,
		invalid: ""
	};
	function DEFAULT_FORMATTER(date) {
		return date.toISOString().slice(0, 10);
	}
	function getDefaultScheduler$4(options) {
		if ("updateInterval" in options) {
			const { updateInterval = 3e4 } = options;
			return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, updateInterval);
		}
		return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, 3e4);
	}
	/**
	* Reactive time ago formatter.
	*
	* @see https://vueuse.org/useTimeAgo
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useTimeAgo(time, options = {}) {
		const { controls: exposeControls = false, scheduler = getDefaultScheduler$4(options) } = options;
		const { now,...controls } = useNow({
			scheduler,
			controls: true
		});
		const timeAgo = (0, vue.computed)(() => formatTimeAgo(new Date((0, vue.toValue)(time)), options, (0, vue.toValue)(now)));
		if (exposeControls) return {
			timeAgo,
			...controls
		};
		else return timeAgo;
	}
	function formatTimeAgo(from, options = {}, now = Date.now()) {
		const { max, messages = DEFAULT_MESSAGES, fullDateFormatter = DEFAULT_FORMATTER, units = DEFAULT_UNITS, showSecond = false, rounding = "round" } = options;
		const roundFn = typeof rounding === "number" ? (n) => +n.toFixed(rounding) : Math[rounding];
		const diff = +now - +from;
		const absDiff = Math.abs(diff);
		function getValue$1(diff$1, unit) {
			return roundFn(Math.abs(diff$1) / unit.value);
		}
		function format(diff$1, unit) {
			const val = getValue$1(diff$1, unit);
			const past = diff$1 > 0;
			const str = applyFormat(unit.name, val, past);
			return applyFormat(past ? "past" : "future", str, past);
		}
		function applyFormat(name, val, isPast) {
			const formatter = messages[name];
			if (typeof formatter === "function") return formatter(val, isPast);
			return formatter.replace("{0}", val.toString());
		}
		if (absDiff < 6e4 && !showSecond) return messages.justNow;
		if (typeof max === "number" && absDiff > max) return fullDateFormatter(new Date(from));
		if (typeof max === "string") {
			var _units$find;
			const unitMax = (_units$find = units.find((i) => i.name === max)) === null || _units$find === void 0 ? void 0 : _units$find.max;
			if (unitMax && absDiff > unitMax) return fullDateFormatter(new Date(from));
		}
		for (const [idx, unit] of units.entries()) {
			if (getValue$1(diff, unit) <= 0 && units[idx - 1]) return format(diff, units[idx - 1]);
			if (absDiff < unit.max) return format(diff, unit);
		}
		return messages.invalid;
	}

//#endregion
//#region useTimeAgoIntl/index.ts
	const UNITS = [
		{
			name: "year",
			ms: 31536e6
		},
		{
			name: "month",
			ms: 2592e6
		},
		{
			name: "week",
			ms: 6048e5
		},
		{
			name: "day",
			ms: 864e5
		},
		{
			name: "hour",
			ms: 36e5
		},
		{
			name: "minute",
			ms: 6e4
		},
		{
			name: "second",
			ms: 1e3
		}
	];
	function getDefaultScheduler$3(options) {
		if ("updateInterval" in options) {
			const { updateInterval = 3e4 } = options;
			return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, updateInterval);
		}
		return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, 3e4);
	}
	function useTimeAgoIntl(time, options = {}) {
		const { controls: exposeControls = false, scheduler = getDefaultScheduler$3(options) } = options;
		const { now,...controls } = useNow({
			scheduler,
			controls: true
		});
		const result = (0, vue.computed)(() => getTimeAgoIntlResult(new Date((0, vue.toValue)(time)), options, (0, vue.toValue)(now)));
		const parts = (0, vue.computed)(() => result.value.parts);
		const timeAgoIntl = (0, vue.computed)(() => formatTimeAgoIntlParts(parts.value, {
			...options,
			locale: result.value.resolvedLocale
		}));
		return exposeControls ? {
			timeAgoIntl,
			parts,
			...controls
		} : timeAgoIntl;
	}
	/**
	* Non-reactive version of useTimeAgoIntl
	*/
	function formatTimeAgoIntl(from, options = {}, now = Date.now()) {
		const { parts, resolvedLocale } = getTimeAgoIntlResult(from, options, now);
		return formatTimeAgoIntlParts(parts, {
			...options,
			locale: resolvedLocale
		});
	}
	/**
	* Get parts from `Intl.RelativeTimeFormat.formatToParts`.
	*/
	function getTimeAgoIntlResult(from, options = {}, now = Date.now()) {
		var _options$units;
		const { locale, relativeTimeFormatOptions = { numeric: "auto" } } = options;
		const rtf = new Intl.RelativeTimeFormat(locale, relativeTimeFormatOptions);
		const { locale: resolvedLocale } = rtf.resolvedOptions();
		const diff = +from - +now;
		const absDiff = Math.abs(diff);
		const units = (_options$units = options.units) !== null && _options$units !== void 0 ? _options$units : UNITS;
		for (const { name, ms } of units) if (absDiff >= ms) return {
			resolvedLocale,
			parts: rtf.formatToParts(Math.round(diff / ms), name)
		};
		return {
			resolvedLocale,
			parts: rtf.formatToParts(0, units[units.length - 1].name)
		};
	}
	/**
	* Format parts into a string
	*/
	function formatTimeAgoIntlParts(parts, options = {}) {
		const { insertSpace = true, joinParts, locale } = options;
		if (typeof joinParts === "function") return joinParts(parts, locale);
		if (!insertSpace) return parts.map((part) => part.value).join("");
		return parts.map((part) => part.value.trim()).join(" ");
	}

//#endregion
//#region useTimeoutPoll/index.ts
	function useTimeoutPoll(fn, interval, options = {}) {
		const { immediate = true, immediateCallback = false } = options;
		const { start } = (0, __vueuse_shared.useTimeoutFn)(loop, interval, { immediate });
		const isActive = (0, vue.shallowRef)(false);
		async function loop() {
			if (!isActive.value) return;
			await fn();
			start();
		}
		function resume() {
			if (!isActive.value) {
				isActive.value = true;
				if (immediateCallback) fn();
				start();
			}
		}
		function pause() {
			isActive.value = false;
		}
		if (immediate && __vueuse_shared.isClient) resume();
		(0, __vueuse_shared.tryOnScopeDispose)(pause);
		return {
			isActive,
			pause,
			resume
		};
	}

//#endregion
//#region useTimestamp/index.ts
	function getDefaultScheduler$2(options) {
		if ("interval" in options || "immediate" in options) {
			const { interval = "requestAnimationFrame", immediate = true } = options;
			return interval === "requestAnimationFrame" ? (cb) => useRafFn(cb, { immediate }) : (cb) => (0, __vueuse_shared.useIntervalFn)(cb, interval, { immediate });
		}
		return useRafFn;
	}
	function useTimestamp(options = {}) {
		const { controls: exposeControls = false, offset = 0, scheduler = getDefaultScheduler$2(options), callback } = options;
		const ts = (0, vue.shallowRef)((0, __vueuse_shared.timestamp)() + offset);
		const update = () => ts.value = (0, __vueuse_shared.timestamp)() + offset;
		const controls = scheduler(callback ? () => {
			update();
			callback(ts.value);
		} : update);
		if (exposeControls) return {
			timestamp: ts,
			...controls
		};
		else return ts;
	}

//#endregion
//#region useTitle/index.ts
	function useTitle(newTitle = null, options = {}) {
		var _document$title, _ref;
		const { document: document$1 = defaultDocument, restoreOnUnmount = (t) => t } = options;
		const originalTitle = (_document$title = document$1 === null || document$1 === void 0 ? void 0 : document$1.title) !== null && _document$title !== void 0 ? _document$title : "";
		const title = (0, __vueuse_shared.toRef)((_ref = newTitle !== null && newTitle !== void 0 ? newTitle : document$1 === null || document$1 === void 0 ? void 0 : document$1.title) !== null && _ref !== void 0 ? _ref : null);
		const isReadonly$2 = !!(newTitle && typeof newTitle === "function");
		function format(t) {
			if (!("titleTemplate" in options)) return t;
			const template = options.titleTemplate || "%s";
			return typeof template === "function" ? template(t) : (0, vue.toValue)(template).replace(/%s/g, t);
		}
		(0, vue.watch)(title, (newValue, oldValue) => {
			if (newValue !== oldValue && document$1) document$1.title = format(newValue !== null && newValue !== void 0 ? newValue : "");
		}, { immediate: true });
		if (options.observe && !options.titleTemplate && document$1 && !isReadonly$2) {
			var _document$head;
			useMutationObserver((_document$head = document$1.head) === null || _document$head === void 0 ? void 0 : _document$head.querySelector("title"), () => {
				if (document$1 && document$1.title !== title.value) title.value = format(document$1.title);
			}, { childList: true });
		}
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			if (restoreOnUnmount) {
				const restoredTitle = restoreOnUnmount(originalTitle, title.value || "");
				if (restoredTitle != null && document$1) document$1.title = restoredTitle;
			}
		});
		return title;
	}

//#endregion
//#region useTransition/index.ts
	const _TransitionPresets = {
		easeInSine: [
			.12,
			0,
			.39,
			0
		],
		easeOutSine: [
			.61,
			1,
			.88,
			1
		],
		easeInOutSine: [
			.37,
			0,
			.63,
			1
		],
		easeInQuad: [
			.11,
			0,
			.5,
			0
		],
		easeOutQuad: [
			.5,
			1,
			.89,
			1
		],
		easeInOutQuad: [
			.45,
			0,
			.55,
			1
		],
		easeInCubic: [
			.32,
			0,
			.67,
			0
		],
		easeOutCubic: [
			.33,
			1,
			.68,
			1
		],
		easeInOutCubic: [
			.65,
			0,
			.35,
			1
		],
		easeInQuart: [
			.5,
			0,
			.75,
			0
		],
		easeOutQuart: [
			.25,
			1,
			.5,
			1
		],
		easeInOutQuart: [
			.76,
			0,
			.24,
			1
		],
		easeInQuint: [
			.64,
			0,
			.78,
			0
		],
		easeOutQuint: [
			.22,
			1,
			.36,
			1
		],
		easeInOutQuint: [
			.83,
			0,
			.17,
			1
		],
		easeInExpo: [
			.7,
			0,
			.84,
			0
		],
		easeOutExpo: [
			.16,
			1,
			.3,
			1
		],
		easeInOutExpo: [
			.87,
			0,
			.13,
			1
		],
		easeInCirc: [
			.55,
			0,
			1,
			.45
		],
		easeOutCirc: [
			0,
			.55,
			.45,
			1
		],
		easeInOutCirc: [
			.85,
			0,
			.15,
			1
		],
		easeInBack: [
			.36,
			0,
			.66,
			-.56
		],
		easeOutBack: [
			.34,
			1.56,
			.64,
			1
		],
		easeInOutBack: [
			.68,
			-.6,
			.32,
			1.6
		]
	};
	/**
	* Common transitions
	*
	* @see https://easings.net
	*/
	const TransitionPresets = /* @__PURE__ */ Object.assign({}, { linear: __vueuse_shared.identity }, _TransitionPresets);
	/**
	* Create an easing function from cubic bezier points.
	*/
	function createEasingFunction([p0, p1, p2, p3]) {
		const a = (a1, a2) => 1 - 3 * a2 + 3 * a1;
		const b = (a1, a2) => 3 * a2 - 6 * a1;
		const c = (a1) => 3 * a1;
		const calcBezier = (t, a1, a2) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
		const getSlope = (t, a1, a2) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
		const getTforX = (x) => {
			let aGuessT = x;
			for (let i = 0; i < 4; ++i) {
				const currentSlope = getSlope(aGuessT, p0, p2);
				if (currentSlope === 0) return aGuessT;
				const currentX = calcBezier(aGuessT, p0, p2) - x;
				aGuessT -= currentX / currentSlope;
			}
			return aGuessT;
		};
		return (x) => p0 === p1 && p2 === p3 ? x : calcBezier(getTforX(x), p1, p3);
	}
	function lerp(a, b, alpha) {
		return a + alpha * (b - a);
	}
	function defaultInterpolation(a, b, t) {
		const aVal = (0, vue.toValue)(a);
		const bVal = (0, vue.toValue)(b);
		if (typeof aVal === "number" && typeof bVal === "number") return lerp(aVal, bVal, t);
		if (Array.isArray(aVal) && Array.isArray(bVal)) return aVal.map((v, i) => lerp(v, (0, vue.toValue)(bVal[i]), t));
		throw new TypeError("Unknown transition type, specify an interpolation function.");
	}
	function normalizeEasing(easing) {
		var _toValue;
		return typeof easing === "function" ? easing : (_toValue = (0, vue.toValue)(easing)) !== null && _toValue !== void 0 ? _toValue : __vueuse_shared.identity;
	}
	/**
	* Transition from one value to another.
	*
	* @param source
	* @param from
	* @param to
	* @param options
	*/
	function transition(source, from, to, options = {}) {
		var _toValue2;
		const { window: window$1 = defaultWindow } = options;
		const fromVal = (0, vue.toValue)(from);
		const toVal = (0, vue.toValue)(to);
		const duration = (_toValue2 = (0, vue.toValue)(options.duration)) !== null && _toValue2 !== void 0 ? _toValue2 : 1e3;
		const startedAt = Date.now();
		const endAt = Date.now() + duration;
		const interpolation = typeof options.interpolation === "function" ? options.interpolation : defaultInterpolation;
		const trans = typeof options.easing !== "undefined" ? normalizeEasing(options.easing) : normalizeEasing(options.transition);
		const ease = typeof trans === "function" ? trans : createEasingFunction(trans);
		return new Promise((resolve) => {
			source.value = fromVal;
			const tick = () => {
				var _options$abort;
				if ((_options$abort = options.abort) === null || _options$abort === void 0 ? void 0 : _options$abort.call(options)) {
					resolve();
					return;
				}
				const now = Date.now();
				source.value = interpolation(fromVal, toVal, ease((now - startedAt) / duration));
				if (now < endAt) window$1 === null || window$1 === void 0 || window$1.requestAnimationFrame(tick);
				else {
					source.value = toVal;
					resolve();
				}
			};
			tick();
		});
	}
	/**
	* Transition from one value to another.
	* @deprecated The `executeTransition` function is deprecated, use `transition` instead.
	*
	* @param source
	* @param from
	* @param to
	* @param options
	*/
	function executeTransition(source, from, to, options = {}) {
		return transition(source, from, to, options);
	}
	/**
	* Follow value with a transition.
	*
	* @see https://vueuse.org/useTransition
	* @param source
	* @param options
	*/
	function useTransition(source, options = {}) {
		let currentId = 0;
		const sourceVal = () => {
			const v = (0, vue.toValue)(source);
			return typeof options.interpolation === "undefined" && Array.isArray(v) ? v.map(vue.toValue) : v;
		};
		const outputRef = (0, vue.shallowRef)(sourceVal());
		(0, vue.watch)(sourceVal, async (to) => {
			var _options$onStarted, _options$onFinished;
			if ((0, vue.toValue)(options.disabled)) return;
			const id = ++currentId;
			if (options.delay) await (0, __vueuse_shared.promiseTimeout)((0, vue.toValue)(options.delay));
			if (id !== currentId) return;
			(_options$onStarted = options.onStarted) === null || _options$onStarted === void 0 || _options$onStarted.call(options);
			await transition(outputRef, outputRef.value, to, {
				...options,
				abort: () => {
					var _options$abort2;
					return id !== currentId || ((_options$abort2 = options.abort) === null || _options$abort2 === void 0 ? void 0 : _options$abort2.call(options));
				}
			});
			(_options$onFinished = options.onFinished) === null || _options$onFinished === void 0 || _options$onFinished.call(options);
		}, { deep: true });
		(0, vue.watch)(() => (0, vue.toValue)(options.disabled), (disabled) => {
			if (disabled) {
				currentId++;
				outputRef.value = sourceVal();
			}
		});
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			currentId++;
		});
		return (0, vue.computed)(() => (0, vue.toValue)(options.disabled) ? sourceVal() : outputRef.value);
	}

//#endregion
//#region useUrlSearchParams/index.ts
/**
	* Reactive URLSearchParams
	*
	* @see https://vueuse.org/useUrlSearchParams
	* @param mode
	* @param options
	*/
	function useUrlSearchParams(mode = "history", options = {}) {
		const { initialValue = {}, removeNullishValues = true, removeFalsyValues = false, write: enableWrite = true, writeMode = "replace", window: window$1 = defaultWindow, stringify = (params) => params.toString() } = options;
		if (!window$1) return (0, vue.reactive)(initialValue);
		const state = (0, vue.reactive)({});
		function getRawParams() {
			if (mode === "history") return window$1.location.search || "";
			else if (mode === "hash") {
				const hash = window$1.location.hash || "";
				const index = hash.indexOf("?");
				return index > 0 ? hash.slice(index) : "";
			} else return (window$1.location.hash || "").replace(/^#/, "");
		}
		function constructQuery(params) {
			const stringified = stringify(params);
			if (mode === "history") return `${stringified ? `?${stringified}` : ""}${window$1.location.hash || ""}`;
			if (mode === "hash-params") return `${window$1.location.search || ""}${stringified ? `#${stringified}` : ""}`;
			const hash = window$1.location.hash || "#";
			const index = hash.indexOf("?");
			if (index > 0) return `${window$1.location.search || ""}${hash.slice(0, index)}${stringified ? `?${stringified}` : ""}`;
			return `${window$1.location.search || ""}${hash}${stringified ? `?${stringified}` : ""}`;
		}
		function read() {
			return new URLSearchParams(getRawParams());
		}
		function updateState(params) {
			const unusedKeys = new Set(Object.keys(state));
			for (const key of params.keys()) {
				const paramsForKey = params.getAll(key);
				state[key] = paramsForKey.length > 1 ? paramsForKey : params.get(key) || "";
				unusedKeys.delete(key);
			}
			Array.from(unusedKeys).forEach((key) => delete state[key]);
		}
		const { pause, resume } = (0, __vueuse_shared.watchPausable)(state, () => {
			const params = new URLSearchParams("");
			Object.keys(state).forEach((key) => {
				const mapEntry = state[key];
				if (Array.isArray(mapEntry)) mapEntry.forEach((value) => params.append(key, value));
				else if (removeNullishValues && mapEntry == null) params.delete(key);
				else if (removeFalsyValues && !mapEntry) params.delete(key);
				else params.set(key, mapEntry);
			});
			write(params, false);
		}, { deep: true });
		function write(params, shouldUpdate, shouldWriteHistory = true) {
			pause();
			if (shouldUpdate) updateState(params);
			if (writeMode === "replace") window$1.history.replaceState(window$1.history.state, window$1.document.title, window$1.location.pathname + constructQuery(params));
			else if (shouldWriteHistory) window$1.history.pushState(window$1.history.state, window$1.document.title, window$1.location.pathname + constructQuery(params));
			(0, vue.nextTick)(() => resume());
		}
		function onChanged() {
			if (!enableWrite) return;
			write(read(), true, false);
		}
		const listenerOptions = { passive: true };
		useEventListener(window$1, "popstate", onChanged, listenerOptions);
		if (mode !== "history") useEventListener(window$1, "hashchange", onChanged, listenerOptions);
		const initial = read();
		if (initial.keys().next().value) updateState(initial);
		else Object.assign(state, initialValue);
		return state;
	}

//#endregion
//#region useUserMedia/index.ts
/**
	* Reactive `mediaDevices.getUserMedia` streaming
	*
	* @see https://vueuse.org/useUserMedia
	* @param options
	*/
	function useUserMedia(options = {}) {
		var _options$enabled, _options$autoSwitch;
		const enabled = (0, vue.shallowRef)((_options$enabled = options.enabled) !== null && _options$enabled !== void 0 ? _options$enabled : false);
		const autoSwitch = (0, vue.shallowRef)((_options$autoSwitch = options.autoSwitch) !== null && _options$autoSwitch !== void 0 ? _options$autoSwitch : true);
		const constraints = (0, vue.ref)(options.constraints);
		const { navigator: navigator$1 = defaultNavigator } = options;
		const isSupported = /* @__PURE__ */ useSupported(() => {
			var _navigator$mediaDevic;
			return navigator$1 === null || navigator$1 === void 0 || (_navigator$mediaDevic = navigator$1.mediaDevices) === null || _navigator$mediaDevic === void 0 ? void 0 : _navigator$mediaDevic.getUserMedia;
		});
		const stream = (0, vue.shallowRef)();
		function getDeviceOptions(type) {
			switch (type) {
				case "video":
					if (constraints.value) return constraints.value.video || false;
					break;
				case "audio":
					if (constraints.value) return constraints.value.audio || false;
					break;
			}
		}
		async function _start() {
			if (!isSupported.value || stream.value) return;
			stream.value = await navigator$1.mediaDevices.getUserMedia({
				video: getDeviceOptions("video"),
				audio: getDeviceOptions("audio")
			});
			return stream.value;
		}
		function _stop() {
			var _stream$value;
			(_stream$value = stream.value) === null || _stream$value === void 0 || _stream$value.getTracks().forEach((t) => t.stop());
			stream.value = void 0;
		}
		function stop() {
			_stop();
			enabled.value = false;
		}
		async function start() {
			await _start();
			if (stream.value) enabled.value = true;
			return stream.value;
		}
		async function restart() {
			_stop();
			return await start();
		}
		(0, vue.watch)(enabled, (v) => {
			if (v) _start();
			else _stop();
		}, { immediate: true });
		(0, vue.watch)(constraints, () => {
			if (autoSwitch.value && stream.value) restart();
		}, {
			immediate: true,
			deep: true
		});
		(0, __vueuse_shared.tryOnScopeDispose)(() => {
			stop();
		});
		return {
			isSupported,
			stream,
			start,
			stop,
			restart,
			constraints,
			enabled,
			autoSwitch
		};
	}

//#endregion
//#region useVModel/index.ts
/**
	* Shorthand for v-model binding, props + emit -> ref
	*
	* @see https://vueuse.org/useVModel
	* @param props
	* @param key (default 'modelValue')
	* @param emit
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useVModel(props, key, emit, options = {}) {
		var _vm$$emit, _vm$proxy;
		const { clone = false, passive = false, eventName, deep = false, defaultValue, shouldEmit } = options;
		const vm = (0, vue.getCurrentInstance)();
		const _emit = emit || (vm === null || vm === void 0 ? void 0 : vm.emit) || (vm === null || vm === void 0 || (_vm$$emit = vm.$emit) === null || _vm$$emit === void 0 ? void 0 : _vm$$emit.bind(vm)) || (vm === null || vm === void 0 || (_vm$proxy = vm.proxy) === null || _vm$proxy === void 0 || (_vm$proxy = _vm$proxy.$emit) === null || _vm$proxy === void 0 ? void 0 : _vm$proxy.bind(vm === null || vm === void 0 ? void 0 : vm.proxy));
		let event = eventName;
		if (!key) key = "modelValue";
		event = event || `update:${key.toString()}`;
		const cloneFn = (val) => !clone ? val : typeof clone === "function" ? clone(val) : cloneFnJSON(val);
		const getValue$1 = () => (0, __vueuse_shared.isDef)(props[key]) ? cloneFn(props[key]) : defaultValue;
		const triggerEmit = (value) => {
			if (shouldEmit) {
				if (shouldEmit(value)) _emit(event, value);
			} else _emit(event, value);
		};
		if (passive) {
			const proxy = (0, vue.ref)(getValue$1());
			let isUpdating = false;
			(0, vue.watch)(() => props[key], (v) => {
				if (!isUpdating) {
					isUpdating = true;
					proxy.value = cloneFn(v);
					(0, vue.nextTick)(() => isUpdating = false);
				}
			});
			(0, vue.watch)(proxy, (v) => {
				if (!isUpdating && (v !== props[key] || deep)) triggerEmit(v);
			}, { deep });
			return proxy;
		} else return (0, vue.computed)({
			get() {
				return getValue$1();
			},
			set(value) {
				triggerEmit(value);
			}
		});
	}

//#endregion
//#region useVModels/index.ts
/**
	* Shorthand for props v-model binding. Think like `toRefs(props)` but changes will also emit out.
	*
	* @see https://vueuse.org/useVModels
	* @param props
	* @param emit
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useVModels(props, emit, options = {}) {
		const ret = {};
		for (const key in props) ret[key] = useVModel(props, key, emit, options);
		return ret;
	}

//#endregion
//#region useVibrate/index.ts
	function getDefaultScheduler$1(options = { interval: 0 }) {
		const { interval } = options;
		if (interval === 0) return;
		return (fn) => (0, __vueuse_shared.useIntervalFn)(fn, interval, {
			immediate: false,
			immediateCallback: false
		});
	}
	/**
	* Reactive vibrate
	*
	* @see https://vueuse.org/useVibrate
	* @see https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useVibrate(options) {
		const { pattern = [], scheduler = getDefaultScheduler$1(options), navigator: navigator$1 = defaultNavigator } = options || {};
		const isSupported = /* @__PURE__ */ useSupported(() => typeof navigator$1 !== "undefined" && "vibrate" in navigator$1);
		const patternRef = (0, __vueuse_shared.toRef)(pattern);
		const vibrate = (pattern$1 = patternRef.value) => {
			if (isSupported.value) navigator$1.vibrate(pattern$1);
		};
		const intervalControls = scheduler === null || scheduler === void 0 ? void 0 : scheduler(vibrate);
		const stop = () => {
			if (isSupported.value) navigator$1.vibrate(0);
			intervalControls === null || intervalControls === void 0 || intervalControls.pause();
		};
		return {
			isSupported,
			pattern,
			intervalControls,
			vibrate,
			stop
		};
	}

//#endregion
//#region useVirtualList/index.ts
/**
	* Please consider using [`vue-virtual-scroller`](https://github.com/Akryum/vue-virtual-scroller) if you are looking for more features.
	*/
	function useVirtualList(list, options) {
		const { containerStyle, wrapperProps, scrollTo, calculateRange, currentList, containerRef } = "itemHeight" in options ? useVerticalVirtualList(options, list) : useHorizontalVirtualList(options, list);
		return {
			list: currentList,
			scrollTo,
			containerProps: {
				ref: containerRef,
				onScroll: () => {
					calculateRange();
				},
				style: containerStyle
			},
			wrapperProps
		};
	}
	function useVirtualListResources(list) {
		const containerRef = (0, vue.shallowRef)(null);
		const size = useElementSize(containerRef);
		const currentList = (0, vue.ref)([]);
		const source = (0, vue.shallowRef)(list);
		return {
			state: (0, vue.ref)({
				start: 0,
				end: 10
			}),
			source,
			currentList,
			size,
			containerRef
		};
	}
	function createGetViewCapacity(state, source, itemSize) {
		return (containerSize) => {
			if (typeof itemSize === "number") return Math.ceil(containerSize / itemSize);
			const { start = 0 } = state.value;
			let sum = 0;
			let capacity = 0;
			for (let i = start; i < source.value.length; i++) {
				const size = itemSize(i);
				sum += size;
				capacity = i;
				if (sum > containerSize) break;
			}
			return capacity - start;
		};
	}
	function createGetOffset(source, itemSize) {
		return (scrollDirection) => {
			if (typeof itemSize === "number") return Math.floor(scrollDirection / itemSize) + 1;
			let sum = 0;
			let offset = 0;
			for (let i = 0; i < source.value.length; i++) {
				const size = itemSize(i);
				sum += size;
				if (sum >= scrollDirection) {
					offset = i;
					break;
				}
			}
			return offset + 1;
		};
	}
	function createCalculateRange(type, overscan, getOffset, getViewCapacity, { containerRef, state, currentList, source }) {
		return () => {
			const element = containerRef.value;
			if (element) {
				const offset = getOffset(type === "vertical" ? element.scrollTop : element.scrollLeft);
				const viewCapacity = getViewCapacity(type === "vertical" ? element.clientHeight : element.clientWidth);
				const from = offset - overscan;
				const to = offset + viewCapacity + overscan;
				state.value = {
					start: from < 0 ? 0 : from,
					end: to > source.value.length ? source.value.length : to
				};
				currentList.value = source.value.slice(state.value.start, state.value.end).map((ele, index) => ({
					data: ele,
					index: index + state.value.start
				}));
			}
		};
	}
	function createGetDistance(itemSize, source) {
		return (index) => {
			if (typeof itemSize === "number") return index * itemSize;
			return source.value.slice(0, index).reduce((sum, _, i) => sum + itemSize(i), 0);
		};
	}
	function useWatchForSizes(size, list, containerRef, calculateRange) {
		(0, vue.watch)([
			size.width,
			size.height,
			() => (0, vue.toValue)(list),
			containerRef
		], () => {
			calculateRange();
		});
	}
	function createComputedTotalSize(itemSize, source) {
		return (0, vue.computed)(() => {
			if (typeof itemSize === "number") return source.value.length * itemSize;
			return source.value.reduce((sum, _, index) => sum + itemSize(index), 0);
		});
	}
	const scrollToDictionaryForElementScrollKey = {
		horizontal: "scrollLeft",
		vertical: "scrollTop"
	};
	function createScrollTo(type, calculateRange, getDistance, containerRef) {
		return (index) => {
			if (containerRef.value) {
				containerRef.value[scrollToDictionaryForElementScrollKey[type]] = getDistance(index);
				calculateRange();
			}
		};
	}
	function useHorizontalVirtualList(options, list) {
		const resources = useVirtualListResources(list);
		const { state, source, currentList, size, containerRef } = resources;
		const containerStyle = { overflowX: "auto" };
		const { itemWidth, overscan = 5 } = options;
		const getViewCapacity = createGetViewCapacity(state, source, itemWidth);
		const calculateRange = createCalculateRange("horizontal", overscan, createGetOffset(source, itemWidth), getViewCapacity, resources);
		const getDistanceLeft = createGetDistance(itemWidth, source);
		const offsetLeft = (0, vue.computed)(() => getDistanceLeft(state.value.start));
		const totalWidth = createComputedTotalSize(itemWidth, source);
		useWatchForSizes(size, list, containerRef, calculateRange);
		return {
			scrollTo: createScrollTo("horizontal", calculateRange, getDistanceLeft, containerRef),
			calculateRange,
			wrapperProps: (0, vue.computed)(() => {
				return { style: {
					height: "100%",
					width: `${totalWidth.value - offsetLeft.value}px`,
					marginLeft: `${offsetLeft.value}px`,
					display: "flex"
				} };
			}),
			containerStyle,
			currentList,
			containerRef
		};
	}
	function useVerticalVirtualList(options, list) {
		const resources = useVirtualListResources(list);
		const { state, source, currentList, size, containerRef } = resources;
		const containerStyle = { overflowY: "auto" };
		const { itemHeight, overscan = 5 } = options;
		const getViewCapacity = createGetViewCapacity(state, source, itemHeight);
		const calculateRange = createCalculateRange("vertical", overscan, createGetOffset(source, itemHeight), getViewCapacity, resources);
		const getDistanceTop = createGetDistance(itemHeight, source);
		const offsetTop = (0, vue.computed)(() => getDistanceTop(state.value.start));
		const totalHeight = createComputedTotalSize(itemHeight, source);
		useWatchForSizes(size, list, containerRef, calculateRange);
		return {
			calculateRange,
			scrollTo: createScrollTo("vertical", calculateRange, getDistanceTop, containerRef),
			containerStyle,
			wrapperProps: (0, vue.computed)(() => {
				return { style: {
					width: "100%",
					height: `${totalHeight.value - offsetTop.value}px`,
					marginTop: `${offsetTop.value}px`
				} };
			}),
			currentList,
			containerRef
		};
	}

//#endregion
//#region useWakeLock/index.ts
/**
	* Reactive Screen Wake Lock API.
	*
	* @see https://vueuse.org/useWakeLock
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useWakeLock(options = {}) {
		const { navigator: navigator$1 = defaultNavigator, document: document$1 = defaultDocument } = options;
		const requestedType = (0, vue.shallowRef)(false);
		const sentinel = (0, vue.shallowRef)(null);
		const documentVisibility = useDocumentVisibility({ document: document$1 });
		const isSupported = /* @__PURE__ */ useSupported(() => navigator$1 && "wakeLock" in navigator$1);
		const isActive = (0, vue.computed)(() => !!sentinel.value && documentVisibility.value === "visible");
		if (isSupported.value) {
			useEventListener(sentinel, "release", () => {
				var _sentinel$value$type, _sentinel$value;
				requestedType.value = (_sentinel$value$type = (_sentinel$value = sentinel.value) === null || _sentinel$value === void 0 ? void 0 : _sentinel$value.type) !== null && _sentinel$value$type !== void 0 ? _sentinel$value$type : false;
			}, { passive: true });
			(0, __vueuse_shared.whenever)(() => documentVisibility.value === "visible" && (document$1 === null || document$1 === void 0 ? void 0 : document$1.visibilityState) === "visible" && requestedType.value, (type) => {
				requestedType.value = false;
				forceRequest(type);
			});
		}
		async function forceRequest(type) {
			var _sentinel$value2;
			await ((_sentinel$value2 = sentinel.value) === null || _sentinel$value2 === void 0 ? void 0 : _sentinel$value2.release());
			sentinel.value = isSupported.value ? await navigator$1.wakeLock.request(type) : null;
		}
		async function request(type) {
			if (documentVisibility.value === "visible") await forceRequest(type);
			else requestedType.value = type;
		}
		async function release() {
			requestedType.value = false;
			const s = sentinel.value;
			sentinel.value = null;
			await (s === null || s === void 0 ? void 0 : s.release());
		}
		return {
			sentinel,
			isSupported,
			isActive,
			request,
			forceRequest,
			release
		};
	}

//#endregion
//#region useWebNotification/index.ts
/**
	* Reactive useWebNotification
	*
	* @see https://vueuse.org/useWebNotification
	* @see https://developer.mozilla.org/en-US/docs/Web/API/notification
	*/
	function useWebNotification(options = {}) {
		const { window: window$1 = defaultWindow, requestPermissions: _requestForPermissions = true } = options;
		const defaultWebNotificationOptions = options;
		const isSupported = /* @__PURE__ */ useSupported(() => {
			if (!window$1 || !("Notification" in window$1)) return false;
			if (Notification.permission === "granted") return true;
			try {
				const notification$1 = new Notification("");
				notification$1.onshow = () => {
					notification$1.close();
				};
			} catch (e) {
				if (e.name === "TypeError") return false;
			}
			return true;
		});
		const permissionGranted = (0, vue.shallowRef)(isSupported.value && "permission" in Notification && Notification.permission === "granted");
		const notification = (0, vue.ref)(null);
		const ensurePermissions = async () => {
			if (!isSupported.value) return;
			if (!permissionGranted.value && Notification.permission !== "denied") {
				if (await Notification.requestPermission() === "granted") permissionGranted.value = true;
			}
			return permissionGranted.value;
		};
		const { on: onClick, trigger: clickTrigger } = (0, __vueuse_shared.createEventHook)();
		const { on: onShow, trigger: showTrigger } = (0, __vueuse_shared.createEventHook)();
		const { on: onError, trigger: errorTrigger } = (0, __vueuse_shared.createEventHook)();
		const { on: onClose, trigger: closeTrigger } = (0, __vueuse_shared.createEventHook)();
		const show = async (overrides) => {
			if (!isSupported.value || !permissionGranted.value) return;
			const options$1 = Object.assign({}, defaultWebNotificationOptions, overrides);
			notification.value = new Notification(options$1.title || "", options$1);
			notification.value.onclick = clickTrigger;
			notification.value.onshow = showTrigger;
			notification.value.onerror = errorTrigger;
			notification.value.onclose = closeTrigger;
			return notification.value;
		};
		const close = () => {
			if (notification.value) notification.value.close();
			notification.value = null;
		};
		if (_requestForPermissions) (0, __vueuse_shared.tryOnMounted)(ensurePermissions);
		(0, __vueuse_shared.tryOnScopeDispose)(close);
		if (isSupported.value && window$1) {
			const document$1 = window$1.document;
			useEventListener(document$1, "visibilitychange", (e) => {
				e.preventDefault();
				if (document$1.visibilityState === "visible") close();
			});
		}
		return {
			isSupported,
			notification,
			ensurePermissions,
			permissionGranted,
			show,
			close,
			onClick,
			onShow,
			onError,
			onClose
		};
	}

//#endregion
//#region useWebSocket/index.ts
	const DEFAULT_PING_MESSAGE = "ping";
	function resolveNestedOptions(options) {
		if (options === true) return {};
		return options;
	}
	function getDefaultScheduler(options) {
		if ("interval" in options) {
			const { interval = 1e3 } = options;
			return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, interval, { immediate: false });
		}
		return (cb) => (0, __vueuse_shared.useIntervalFn)(cb, 1e3, { immediate: false });
	}
	/**
	* Reactive WebSocket client.
	*
	* @see https://vueuse.org/useWebSocket
	* @param url
	*/
	function useWebSocket(url, options = {}) {
		const { onConnected, onDisconnected, onError, onMessage, immediate = true, autoConnect = true, autoClose = true, protocols = [] } = options;
		const data = (0, vue.ref)(null);
		const status = (0, vue.shallowRef)("CLOSED");
		const wsRef = (0, vue.ref)();
		const urlRef = (0, __vueuse_shared.toRef)(url);
		let heartbeatPause;
		let heartbeatResume;
		let explicitlyClosed = false;
		let retried = 0;
		let bufferedData = [];
		let retryTimeout;
		let pongTimeoutWait;
		const _sendBuffer = () => {
			if (bufferedData.length && wsRef.value && status.value === "OPEN") {
				for (const buffer of bufferedData) wsRef.value.send(buffer);
				bufferedData = [];
			}
		};
		const resetRetry = () => {
			if (retryTimeout != null) {
				clearTimeout(retryTimeout);
				retryTimeout = void 0;
			}
		};
		const resetHeartbeat = () => {
			clearTimeout(pongTimeoutWait);
			pongTimeoutWait = void 0;
		};
		const close = (code = 1e3, reason) => {
			resetRetry();
			if (!__vueuse_shared.isClient && !__vueuse_shared.isWorker || !wsRef.value) return;
			explicitlyClosed = true;
			resetHeartbeat();
			heartbeatPause === null || heartbeatPause === void 0 || heartbeatPause();
			wsRef.value.close(code, reason);
			wsRef.value = void 0;
		};
		const send = (data$1, useBuffer = true) => {
			if (!wsRef.value || status.value !== "OPEN") {
				if (useBuffer) bufferedData.push(data$1);
				return false;
			}
			_sendBuffer();
			wsRef.value.send(data$1);
			return true;
		};
		const _init = () => {
			if (explicitlyClosed || typeof urlRef.value === "undefined") return;
			const ws = new WebSocket(urlRef.value, protocols);
			wsRef.value = ws;
			status.value = "CONNECTING";
			ws.onopen = () => {
				status.value = "OPEN";
				retried = 0;
				onConnected === null || onConnected === void 0 || onConnected(ws);
				heartbeatResume === null || heartbeatResume === void 0 || heartbeatResume();
				_sendBuffer();
			};
			ws.onclose = (ev) => {
				status.value = "CLOSED";
				resetHeartbeat();
				heartbeatPause === null || heartbeatPause === void 0 || heartbeatPause();
				onDisconnected === null || onDisconnected === void 0 || onDisconnected(ws, ev);
				if (!explicitlyClosed && options.autoReconnect && (wsRef.value == null || ws === wsRef.value)) {
					const { retries = -1, delay = 1e3, onFailed } = resolveNestedOptions(options.autoReconnect);
					if ((typeof retries === "function" ? retries : () => typeof retries === "number" && (retries < 0 || retried < retries))(retried)) {
						retried += 1;
						const delayTime = typeof delay === "function" ? delay(retried) : delay;
						retryTimeout = setTimeout(_init, delayTime);
					} else onFailed === null || onFailed === void 0 || onFailed();
				}
			};
			ws.onerror = (e) => {
				onError === null || onError === void 0 || onError(ws, e);
			};
			ws.onmessage = (e) => {
				if (options.heartbeat) {
					resetHeartbeat();
					const { message = DEFAULT_PING_MESSAGE, responseMessage = message } = resolveNestedOptions(options.heartbeat);
					if (e.data === (0, vue.toValue)(responseMessage)) return;
				}
				data.value = e.data;
				onMessage === null || onMessage === void 0 || onMessage(ws, e);
			};
		};
		if (options.heartbeat) {
			const { message = DEFAULT_PING_MESSAGE, scheduler = getDefaultScheduler(resolveNestedOptions(options.heartbeat)), pongTimeout = 1e3 } = resolveNestedOptions(options.heartbeat);
			const { pause, resume } = scheduler(() => {
				send((0, vue.toValue)(message), false);
				if (pongTimeoutWait != null) return;
				pongTimeoutWait = setTimeout(() => {
					close();
					explicitlyClosed = false;
				}, pongTimeout);
			});
			heartbeatPause = pause;
			heartbeatResume = resume;
		}
		if (autoClose) {
			if (__vueuse_shared.isClient) useEventListener("beforeunload", () => close(), { passive: true });
			(0, __vueuse_shared.tryOnScopeDispose)(close);
		}
		const open = () => {
			if (!__vueuse_shared.isClient && !__vueuse_shared.isWorker) return;
			close();
			explicitlyClosed = false;
			retried = 0;
			_init();
		};
		if (immediate) open();
		if (autoConnect) (0, vue.watch)(urlRef, open);
		return {
			data,
			status,
			close,
			send,
			open,
			ws: wsRef
		};
	}

//#endregion
//#region useWebWorker/index.ts
	function useWebWorker(arg0, workerOptions, options) {
		const { window: window$1 = defaultWindow } = options !== null && options !== void 0 ? options : {};
		const data = (0, vue.ref)(null);
		const worker = (0, vue.shallowRef)();
		const post = (...args) => {
			if (!worker.value) return;
			worker.value.postMessage(...args);
		};
		const terminate = function terminate$1() {
			if (!worker.value) return;
			worker.value.terminate();
		};
		if (window$1) {
			if (typeof arg0 === "string") worker.value = new Worker(arg0, workerOptions);
			else if (typeof arg0 === "function") worker.value = arg0();
			else worker.value = arg0;
			worker.value.onmessage = (e) => {
				data.value = e.data;
			};
			(0, __vueuse_shared.tryOnScopeDispose)(() => {
				if (worker.value) worker.value.terminate();
			});
		}
		return {
			data,
			post,
			terminate,
			worker
		};
	}

//#endregion
//#region useWebWorkerFn/lib/depsParser.ts
/**
	*
	* Concatenates the dependencies into a comma separated string.
	* this string will then be passed as an argument to the "importScripts" function
	*
	* @param deps array of string
	* @param localDeps array of function
	* @returns a string composed by the concatenation of the array
	* elements "deps" and "importScripts".
	*
	* @example
	* depsParser(['demo1', 'demo2']) // return importScripts('demo1', 'demo2')
	*/
	function depsParser(deps, localDeps) {
		if (deps.length === 0 && localDeps.length === 0) return "";
		const depsString = deps.map((dep) => `'${dep}'`).toString();
		const depsFunctionString = localDeps.filter((dep) => typeof dep === "function").map((fn) => {
			const str = fn.toString();
			if (str.trim().startsWith("function")) return str;
			else return `const ${fn.name} = ${str}`;
		}).join(";");
		const importString = `importScripts(${depsString});`;
		return `${depsString.trim() === "" ? "" : importString} ${depsFunctionString}`;
	}
	var depsParser_default = depsParser;

//#endregion
//#region useWebWorkerFn/lib/jobRunner.ts
/**
	* This function accepts as a parameter a function "userFunc"
	* And as a result returns an anonymous function.
	* This anonymous function, accepts as arguments,
	* the parameters to pass to the function "useArgs" and returns a Promise
	* This function can be used as a wrapper, only inside a Worker
	* because it depends by "postMessage".
	*
	* @param userFunc {Function} fn the function to run with web worker
	*
	* @returns returns a function that accepts the parameters
	* to be passed to the "userFunc" function
	*/
	function jobRunner(userFunc) {
		return (e) => {
			const userFuncArgs = e.data[0];
			return Promise.resolve(userFunc.apply(void 0, userFuncArgs)).then((result) => {
				postMessage(["SUCCESS", result]);
			}).catch((error) => {
				postMessage(["ERROR", error]);
			});
		};
	}
	var jobRunner_default = jobRunner;

//#endregion
//#region useWebWorkerFn/lib/createWorkerBlobUrl.ts
/**
	* Converts the "fn" function into the syntax needed to be executed within a web worker
	*
	* @param fn the function to run with web worker
	* @param deps array of strings, imported into the worker through "importScripts"
	* @param localDeps array of function, local dependencies
	*
	* @returns a blob url, containing the code of "fn" as a string
	*
	* @example
	* createWorkerBlobUrl((a,b) => a+b, [])
	* // return "onmessage=return Promise.resolve((a,b) => a + b)
	* .then(postMessage(['SUCCESS', result]))
	* .catch(postMessage(['ERROR', error])"
	*/
	function createWorkerBlobUrl(fn, deps, localDeps) {
		const blobCode = `${depsParser_default(deps, localDeps)}; onmessage=(${jobRunner_default})(${fn})`;
		const blob = new Blob([blobCode], { type: "text/javascript" });
		return URL.createObjectURL(blob);
	}
	var createWorkerBlobUrl_default = createWorkerBlobUrl;

//#endregion
//#region useWebWorkerFn/index.ts
/**
	* Run expensive function without blocking the UI, using a simple syntax that makes use of Promise.
	*
	* @see https://vueuse.org/useWebWorkerFn
	* @param fn
	* @param options
	*/
	function useWebWorkerFn(fn, options = {}) {
		const { dependencies = [], localDependencies = [], timeout, window: window$1 = defaultWindow } = options;
		const worker = (0, vue.ref)();
		const workerStatus = (0, vue.shallowRef)("PENDING");
		const promise = (0, vue.ref)({});
		const timeoutId = (0, vue.shallowRef)();
		const workerTerminate = (status = "PENDING") => {
			if (worker.value && worker.value._url && window$1) {
				worker.value.terminate();
				URL.revokeObjectURL(worker.value._url);
				promise.value = {};
				worker.value = void 0;
				window$1.clearTimeout(timeoutId.value);
				workerStatus.value = status;
			}
		};
		workerTerminate();
		(0, __vueuse_shared.tryOnScopeDispose)(workerTerminate);
		const generateWorker = () => {
			const blobUrl = createWorkerBlobUrl_default(fn, dependencies, localDependencies);
			const newWorker = new Worker(blobUrl);
			newWorker._url = blobUrl;
			newWorker.onmessage = (e) => {
				const { resolve = () => {}, reject = () => {} } = promise.value;
				const [status, result] = e.data;
				switch (status) {
					case "SUCCESS":
						resolve(result);
						workerTerminate(status);
						break;
					default:
						reject(result);
						workerTerminate("ERROR");
						break;
				}
			};
			newWorker.onerror = (e) => {
				const { reject = () => {} } = promise.value;
				e.preventDefault();
				reject(e);
				workerTerminate("ERROR");
			};
			if (timeout) timeoutId.value = setTimeout(() => workerTerminate("TIMEOUT_EXPIRED"), timeout);
			return newWorker;
		};
		const callWorker = (...fnArgs) => new Promise((resolve, reject) => {
			var _worker$value;
			promise.value = {
				resolve,
				reject
			};
			(_worker$value = worker.value) === null || _worker$value === void 0 || _worker$value.postMessage([[...fnArgs]]);
			workerStatus.value = "RUNNING";
		});
		const workerFn = (...fnArgs) => {
			if (workerStatus.value === "RUNNING") {
				console.error("[useWebWorkerFn] You can only run one instance of the worker at a time.");
				return Promise.reject();
			}
			worker.value = generateWorker();
			return callWorker(...fnArgs);
		};
		return {
			workerFn,
			workerStatus,
			workerTerminate
		};
	}

//#endregion
//#region useWindowFocus/index.ts
/**
	* Reactively track window focus with `window.onfocus` and `window.onblur`.
	*
	* @see https://vueuse.org/useWindowFocus
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useWindowFocus(options = {}) {
		const { window: window$1 = defaultWindow } = options;
		if (!window$1) return (0, vue.shallowRef)(false);
		const focused = (0, vue.shallowRef)(window$1.document.hasFocus());
		const listenerOptions = { passive: true };
		useEventListener(window$1, "blur", () => {
			focused.value = false;
		}, listenerOptions);
		useEventListener(window$1, "focus", () => {
			focused.value = true;
		}, listenerOptions);
		return focused;
	}

//#endregion
//#region useWindowScroll/index.ts
/**
	* Reactive window scroll.
	*
	* @see https://vueuse.org/useWindowScroll
	* @param options
	*/
	function useWindowScroll(options = {}) {
		const { window: window$1 = defaultWindow,...rest } = options;
		return useScroll(window$1, rest);
	}

//#endregion
//#region useWindowSize/index.ts
/**
	* Reactive window size.
	*
	* @see https://vueuse.org/useWindowSize
	* @param options
	*
	* @__NO_SIDE_EFFECTS__
	*/
	function useWindowSize(options = {}) {
		const { window: window$1 = defaultWindow, initialWidth = Number.POSITIVE_INFINITY, initialHeight = Number.POSITIVE_INFINITY, listenOrientation = true, includeScrollbar = true, type = "inner" } = options;
		const width = (0, vue.shallowRef)(initialWidth);
		const height = (0, vue.shallowRef)(initialHeight);
		const update = () => {
			if (window$1) if (type === "outer") {
				width.value = window$1.outerWidth;
				height.value = window$1.outerHeight;
			} else if (type === "visual" && window$1.visualViewport) {
				const { width: visualViewportWidth, height: visualViewportHeight, scale } = window$1.visualViewport;
				width.value = Math.round(visualViewportWidth * scale);
				height.value = Math.round(visualViewportHeight * scale);
			} else if (includeScrollbar) {
				width.value = window$1.innerWidth;
				height.value = window$1.innerHeight;
			} else {
				width.value = window$1.document.documentElement.clientWidth;
				height.value = window$1.document.documentElement.clientHeight;
			}
		};
		update();
		(0, __vueuse_shared.tryOnMounted)(update);
		const listenerOptions = { passive: true };
		useEventListener("resize", update, listenerOptions);
		if (window$1 && type === "visual" && window$1.visualViewport) useEventListener(window$1.visualViewport, "resize", update, listenerOptions);
		if (listenOrientation) (0, vue.watch)(useMediaQuery("(orientation: portrait)"), () => update());
		return {
			width,
			height
		};
	}

//#endregion
exports.DefaultMagicKeysAliasMap = DefaultMagicKeysAliasMap;
exports.StorageSerializers = StorageSerializers;
exports.TransitionPresets = TransitionPresets;
exports.asyncComputed = asyncComputed;
exports.breakpointsAntDesign = breakpointsAntDesign;
exports.breakpointsBootstrapV5 = breakpointsBootstrapV5;
exports.breakpointsElement = breakpointsElement;
exports.breakpointsMasterCss = breakpointsMasterCss;
exports.breakpointsPrimeFlex = breakpointsPrimeFlex;
exports.breakpointsQuasar = breakpointsQuasar;
exports.breakpointsSematic = breakpointsSematic;
exports.breakpointsTailwind = breakpointsTailwind;
exports.breakpointsVuetify = breakpointsVuetify;
exports.breakpointsVuetifyV2 = breakpointsVuetifyV2;
exports.breakpointsVuetifyV3 = breakpointsVuetifyV3;
exports.cloneFnJSON = cloneFnJSON;
exports.computedAsync = computedAsync;
exports.computedInject = computedInject;
exports.createFetch = createFetch;
exports.createReusableTemplate = createReusableTemplate;
exports.createTemplatePromise = createTemplatePromise;
exports.createUnrefFn = createUnrefFn;
exports.customStorageEventName = customStorageEventName;
exports.defaultDocument = defaultDocument;
exports.defaultLocation = defaultLocation;
exports.defaultNavigator = defaultNavigator;
exports.defaultWindow = defaultWindow;
exports.executeTransition = executeTransition;
exports.formatTimeAgo = formatTimeAgo;
exports.formatTimeAgoIntl = formatTimeAgoIntl;
exports.formatTimeAgoIntlParts = formatTimeAgoIntlParts;
exports.getSSRHandler = getSSRHandler;
exports.mapGamepadToXbox360Controller = mapGamepadToXbox360Controller;
exports.onClickOutside = onClickOutside;
exports.onElementRemoval = onElementRemoval;
exports.onKeyDown = onKeyDown;
exports.onKeyPressed = onKeyPressed;
exports.onKeyStroke = onKeyStroke;
exports.onKeyUp = onKeyUp;
exports.onLongPress = onLongPress;
exports.onStartTyping = onStartTyping;
exports.provideSSRWidth = provideSSRWidth;
exports.setSSRHandler = setSSRHandler;
exports.templateRef = templateRef;
exports.transition = transition;
exports.unrefElement = unrefElement;
exports.useActiveElement = useActiveElement;
exports.useAnimate = useAnimate;
exports.useAsyncQueue = useAsyncQueue;
exports.useAsyncState = useAsyncState;
exports.useBase64 = useBase64;
exports.useBattery = useBattery;
exports.useBluetooth = useBluetooth;
exports.useBreakpoints = useBreakpoints;
exports.useBroadcastChannel = useBroadcastChannel;
exports.useBrowserLocation = useBrowserLocation;
exports.useCached = useCached;
exports.useClipboard = useClipboard;
exports.useClipboardItems = useClipboardItems;
exports.useCloned = useCloned;
exports.useColorMode = useColorMode;
exports.useConfirmDialog = useConfirmDialog;
exports.useCountdown = useCountdown;
exports.useCssSupports = useCssSupports;
exports.useCssVar = useCssVar;
exports.useCurrentElement = useCurrentElement;
exports.useCycleList = useCycleList;
exports.useDark = useDark;
exports.useDebouncedRefHistory = useDebouncedRefHistory;
exports.useDeviceMotion = useDeviceMotion;
exports.useDeviceOrientation = useDeviceOrientation;
exports.useDevicePixelRatio = useDevicePixelRatio;
exports.useDevicesList = useDevicesList;
exports.useDisplayMedia = useDisplayMedia;
exports.useDocumentVisibility = useDocumentVisibility;
exports.useDraggable = useDraggable;
exports.useDropZone = useDropZone;
exports.useElementBounding = useElementBounding;
exports.useElementByPoint = useElementByPoint;
exports.useElementHover = useElementHover;
exports.useElementSize = useElementSize;
exports.useElementVisibility = useElementVisibility;
exports.useEventBus = useEventBus;
exports.useEventListener = useEventListener;
exports.useEventSource = useEventSource;
exports.useEyeDropper = useEyeDropper;
exports.useFavicon = useFavicon;
exports.useFetch = useFetch;
exports.useFileDialog = useFileDialog;
exports.useFileSystemAccess = useFileSystemAccess;
exports.useFocus = useFocus;
exports.useFocusWithin = useFocusWithin;
exports.useFps = useFps;
exports.useFullscreen = useFullscreen;
exports.useGamepad = useGamepad;
exports.useGeolocation = useGeolocation;
exports.useIdle = useIdle;
exports.useImage = useImage;
exports.useInfiniteScroll = useInfiniteScroll;
exports.useIntersectionObserver = useIntersectionObserver;
exports.useKeyModifier = useKeyModifier;
exports.useLocalStorage = useLocalStorage;
exports.useMagicKeys = useMagicKeys;
exports.useManualRefHistory = useManualRefHistory;
exports.useMediaControls = useMediaControls;
exports.useMediaQuery = useMediaQuery;
exports.useMemoize = useMemoize;
exports.useMemory = useMemory;
exports.useMounted = useMounted;
exports.useMouse = useMouse;
exports.useMouseInElement = useMouseInElement;
exports.useMousePressed = useMousePressed;
exports.useMutationObserver = useMutationObserver;
exports.useNavigatorLanguage = useNavigatorLanguage;
exports.useNetwork = useNetwork;
exports.useNow = useNow;
exports.useObjectUrl = useObjectUrl;
exports.useOffsetPagination = useOffsetPagination;
exports.useOnline = useOnline;
exports.usePageLeave = usePageLeave;
exports.useParallax = useParallax;
exports.useParentElement = useParentElement;
exports.usePerformanceObserver = usePerformanceObserver;
exports.usePermission = usePermission;
exports.usePointer = usePointer;
exports.usePointerLock = usePointerLock;
exports.usePointerSwipe = usePointerSwipe;
exports.usePreferredColorScheme = usePreferredColorScheme;
exports.usePreferredContrast = usePreferredContrast;
exports.usePreferredDark = usePreferredDark;
exports.usePreferredLanguages = usePreferredLanguages;
exports.usePreferredReducedMotion = usePreferredReducedMotion;
exports.usePreferredReducedTransparency = usePreferredReducedTransparency;
exports.usePrevious = usePrevious;
exports.useRafFn = useRafFn;
exports.useRefHistory = useRefHistory;
exports.useResizeObserver = useResizeObserver;
exports.useSSRWidth = useSSRWidth;
exports.useScreenOrientation = useScreenOrientation;
exports.useScreenSafeArea = useScreenSafeArea;
exports.useScriptTag = useScriptTag;
exports.useScroll = useScroll;
exports.useScrollLock = useScrollLock;
exports.useSessionStorage = useSessionStorage;
exports.useShare = useShare;
exports.useSorted = useSorted;
exports.useSpeechRecognition = useSpeechRecognition;
exports.useSpeechSynthesis = useSpeechSynthesis;
exports.useStepper = useStepper;
exports.useStorage = useStorage;
exports.useStorageAsync = useStorageAsync;
exports.useStyleTag = useStyleTag;
exports.useSupported = useSupported;
exports.useSwipe = useSwipe;
exports.useTemplateRefsList = useTemplateRefsList;
exports.useTextDirection = useTextDirection;
exports.useTextSelection = useTextSelection;
exports.useTextareaAutosize = useTextareaAutosize;
exports.useThrottledRefHistory = useThrottledRefHistory;
exports.useTimeAgo = useTimeAgo;
exports.useTimeAgoIntl = useTimeAgoIntl;
exports.useTimeoutPoll = useTimeoutPoll;
exports.useTimestamp = useTimestamp;
exports.useTitle = useTitle;
exports.useTransition = useTransition;
exports.useUrlSearchParams = useUrlSearchParams;
exports.useUserMedia = useUserMedia;
exports.useVModel = useVModel;
exports.useVModels = useVModels;
exports.useVibrate = useVibrate;
exports.useVirtualList = useVirtualList;
exports.useWakeLock = useWakeLock;
exports.useWebNotification = useWebNotification;
exports.useWebSocket = useWebSocket;
exports.useWebWorker = useWebWorker;
exports.useWebWorkerFn = useWebWorkerFn;
exports.useWindowFocus = useWindowFocus;
exports.useWindowScroll = useWindowScroll;
exports.useWindowSize = useWindowSize;
Object.keys(__vueuse_shared).forEach(function (k) {
  if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
    enumerable: true,
    get: function () { return __vueuse_shared[k]; }
  });
});

})(this.VueUse = this.VueUse || {}, VueUse, Vue);