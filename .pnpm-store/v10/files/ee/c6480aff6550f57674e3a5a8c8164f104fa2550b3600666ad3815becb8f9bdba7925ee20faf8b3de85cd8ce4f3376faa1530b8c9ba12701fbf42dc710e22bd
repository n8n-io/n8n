"use client";


import { useStream } from "../react/stream.js";
import "../react/index.js";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as JsxRuntime from "react/jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

//#region src/react-ui/client.tsx
const UseStreamContext = React.createContext(null);
function useStreamContext() {
	const ctx = React.useContext(UseStreamContext);
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
	if (React.isValidElement(value)) return true;
	if (value == null) return true;
	if (typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return true;
	if (isIterable(value)) return true;
	if (isPromise(value)) return true;
	return false;
};
function LoadExternalComponent({ stream, namespace, message, meta, fallback, components,...props }) {
	const ref = React.useRef(null);
	const id = React.useId();
	const shadowRootId = `child-shadow-${id}`;
	const store = React.useMemo(() => COMPONENT_STORE.getBoundStore(shadowRootId), [shadowRootId]);
	const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
	const clientComponent = components?.[message.name];
	const hasClientComponent = clientComponent != null;
	let fallbackComponent = null;
	if (isReactNode(fallback)) fallbackComponent = fallback;
	else if (typeof fallback === "object" && fallback != null) fallbackComponent = fallback?.[message.name];
	const uiNamespace = namespace ?? stream.assistantId;
	const uiClient = stream.client["~ui"];
	React.useEffect(() => {
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
	if (hasClientComponent) return /* @__PURE__ */ jsx(UseStreamContext.Provider, {
		value: {
			stream,
			meta
		},
		children: React.createElement(clientComponent, message.props)
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
		id: shadowRootId,
		ref,
		...props
	}), /* @__PURE__ */ jsx(UseStreamContext.Provider, {
		value: {
			stream,
			meta
		},
		children: state?.target != null ? ReactDOM.createPortal(React.createElement(state.comp, message.props), state.target) : fallbackComponent
	})] });
}
function experimental_loadShare(name, module) {
	if (typeof window === "undefined") return;
	window[REQUIRE_EXTRA_SYMBOL] ??= {};
	window[REQUIRE_EXTRA_SYMBOL][name] = module;
}
function bootstrapUiContext() {
	if (typeof window === "undefined") return;
	window[EXT_STORE_SYMBOL] = COMPONENT_STORE;
	window[REQUIRE_SYMBOL] = (name) => {
		if (name === "react") return React;
		if (name === "react-dom") return ReactDOM;
		if (name === "react/jsx-runtime") return JsxRuntime;
		if (name === "@langchain/langgraph-sdk/react") return { useStream };
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
export { LoadExternalComponent, bootstrapUiContext, experimental_loadShare, useStreamContext };
//# sourceMappingURL=client.js.map