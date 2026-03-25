"use client";


const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_stream = require('../react/stream.cjs');
require('../react/index.cjs');
const react = require_rolldown_runtime.__toESM(require("react"));
const react_dom = require_rolldown_runtime.__toESM(require("react-dom"));
const react_jsx_runtime = require_rolldown_runtime.__toESM(require("react/jsx-runtime"));

//#region src/react-ui/client.tsx
const UseStreamContext = react.createContext(null);
function useStreamContext() {
	const ctx = react.useContext(UseStreamContext);
	if (!ctx) throw new Error("useStreamContext must be used within a LoadExternalComponent");
	return new Proxy(ctx, { get(target, prop) {
		if (prop === "meta") return target.meta;
		return target.stream[prop];
	} });
}
var ComponentStore = class {
	cache = {};
	boundCache = {};
	callbacks = {};
	respond(shadowRootId, comp, targetElement) {
		this.cache[shadowRootId] = {
			comp,
			target: targetElement
		};
		this.callbacks[shadowRootId]?.forEach((c) => c(comp, targetElement));
	}
	getBoundStore(shadowRootId) {
		this.boundCache[shadowRootId] ??= {
			subscribe: (onStoreChange) => {
				this.callbacks[shadowRootId] ??= [];
				this.callbacks[shadowRootId].push(onStoreChange);
				return () => {
					this.callbacks[shadowRootId] = this.callbacks[shadowRootId].filter((c) => c !== onStoreChange);
				};
			},
			getSnapshot: () => this.cache[shadowRootId]
		};
		return this.boundCache[shadowRootId];
	}
};
const COMPONENT_STORE = new ComponentStore();
const EXT_STORE_SYMBOL = Symbol.for("LGUI_EXT_STORE");
const REQUIRE_SYMBOL = Symbol.for("LGUI_REQUIRE");
const REQUIRE_EXTRA_SYMBOL = Symbol.for("LGUI_REQUIRE_EXTRA");
const isIterable = (value) => value != null && typeof value === "object" && Symbol.iterator in value;
const isPromise = (value) => value != null && typeof value === "object" && "then" in value && typeof value.then === "function";
const isReactNode = (value) => {
	if (react.isValidElement(value)) return true;
	if (value == null) return true;
	if (typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return true;
	if (isIterable(value)) return true;
	if (isPromise(value)) return true;
	return false;
};
function LoadExternalComponent({ stream, namespace, message, meta, fallback, components,...props }) {
	const ref = react.useRef(null);
	const id = react.useId();
	const shadowRootId = `child-shadow-${id}`;
	const store = react.useMemo(() => COMPONENT_STORE.getBoundStore(shadowRootId), [shadowRootId]);
	const state = react.useSyncExternalStore(store.subscribe, store.getSnapshot);
	const clientComponent = components?.[message.name];
	const hasClientComponent = clientComponent != null;
	let fallbackComponent = null;
	if (isReactNode(fallback)) fallbackComponent = fallback;
	else if (typeof fallback === "object" && fallback != null) fallbackComponent = fallback?.[message.name];
	const uiNamespace = namespace ?? stream.assistantId;
	const uiClient = stream.client["~ui"];
	react.useEffect(() => {
		if (hasClientComponent) return;
		uiClient.getComponent(uiNamespace, message.name).then((html) => {
			const dom = ref.current;
			if (!dom) return;
			const root = dom.shadowRoot ?? dom.attachShadow({ mode: "open" });
			const fragment = document.createRange().createContextualFragment(html.replace("{{shadowRootId}}", shadowRootId));
			root.appendChild(fragment);
		});
	}, [
		uiClient,
		uiNamespace,
		message.name,
		shadowRootId,
		hasClientComponent
	]);
	if (hasClientComponent) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UseStreamContext.Provider, {
		value: {
			stream,
			meta
		},
		children: react.createElement(clientComponent, message.props)
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		id: shadowRootId,
		ref,
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UseStreamContext.Provider, {
		value: {
			stream,
			meta
		},
		children: state?.target != null ? react_dom.createPortal(react.createElement(state.comp, message.props), state.target) : fallbackComponent
	})] });
}
function experimental_loadShare(name, module$1) {
	if (typeof window === "undefined") return;
	window[REQUIRE_EXTRA_SYMBOL] ??= {};
	window[REQUIRE_EXTRA_SYMBOL][name] = module$1;
}
function bootstrapUiContext() {
	if (typeof window === "undefined") return;
	window[EXT_STORE_SYMBOL] = COMPONENT_STORE;
	window[REQUIRE_SYMBOL] = (name) => {
		if (name === "react") return react;
		if (name === "react-dom") return react_dom;
		if (name === "react/jsx-runtime") return react_jsx_runtime;
		if (name === "@langchain/langgraph-sdk/react") return { useStream: require_stream.useStream };
		if (name === "@langchain/langgraph-sdk/react-ui") return {
			useStreamContext,
			LoadExternalComponent: () => {
				throw new Error("Nesting LoadExternalComponent is not supported");
			}
		};
		if (window[REQUIRE_EXTRA_SYMBOL] != null && typeof window[REQUIRE_EXTRA_SYMBOL] === "object" && name in window[REQUIRE_EXTRA_SYMBOL]) return window[REQUIRE_EXTRA_SYMBOL][name];
		throw new Error(`Unknown module...: ${name}`);
	};
}

//#endregion
exports.LoadExternalComponent = LoadExternalComponent;
exports.bootstrapUiContext = bootstrapUiContext;
exports.experimental_loadShare = experimental_loadShare;
exports.useStreamContext = useStreamContext;
//# sourceMappingURL=client.cjs.map