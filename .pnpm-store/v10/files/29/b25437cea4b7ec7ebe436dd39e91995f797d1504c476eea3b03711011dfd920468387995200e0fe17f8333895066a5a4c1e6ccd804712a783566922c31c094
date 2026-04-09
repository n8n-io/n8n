var _a, _b;
import { forwardRef, memo } from "react";
import { isUsingStaticRendering } from "./staticRendering";
import { useObserver } from "./useObserver";
var warnObserverOptionsDeprecated = true;
var warnLegacyContextTypes = true;
var hasSymbol = typeof Symbol === "function" && Symbol.for;
var isFunctionNameConfigurable = (_b = (_a = Object.getOwnPropertyDescriptor(function () { }, "name")) === null || _a === void 0 ? void 0 : _a.configurable) !== null && _b !== void 0 ? _b : false;
// Using react-is had some issues (and operates on elements, not on types), see #608 / #609
var ReactForwardRefSymbol = hasSymbol
    ? Symbol.for("react.forward_ref")
    : typeof forwardRef === "function" && forwardRef(function (props) { return null; })["$$typeof"];
var ReactMemoSymbol = hasSymbol
    ? Symbol.for("react.memo")
    : typeof memo === "function" && memo(function (props) { return null; })["$$typeof"];
// n.b. base case is not used for actual typings or exported in the typing files
export function observer(baseComponent, 
// TODO remove in next major
options) {
    var _a;
    if (process.env.NODE_ENV !== "production" && warnObserverOptionsDeprecated && options) {
        warnObserverOptionsDeprecated = false;
        console.warn("[mobx-react-lite] `observer(fn, { forwardRef: true })` is deprecated, use `observer(React.forwardRef(fn))`");
    }
    if (ReactMemoSymbol && baseComponent["$$typeof"] === ReactMemoSymbol) {
        throw new Error("[mobx-react-lite] You are trying to use `observer` on a function component wrapped in either another `observer` or `React.memo`. The observer already applies 'React.memo' for you.");
    }
    // The working of observer is explained step by step in this talk: https://www.youtube.com/watch?v=cPF4iBedoF0&feature=youtu.be&t=1307
    if (isUsingStaticRendering()) {
        return baseComponent;
    }
    var useForwardRef = (_a = options === null || options === void 0 ? void 0 : options.forwardRef) !== null && _a !== void 0 ? _a : false;
    var render = baseComponent;
    var baseComponentName = baseComponent.displayName || baseComponent.name;
    // If already wrapped with forwardRef, unwrap,
    // so we can patch render and apply memo
    if (ReactForwardRefSymbol && baseComponent["$$typeof"] === ReactForwardRefSymbol) {
        useForwardRef = true;
        render = baseComponent["render"];
        if (typeof render !== "function") {
            throw new Error("[mobx-react-lite] `render` property of ForwardRef was not a function");
        }
    }
    var observerComponent = function (props, ref) {
        return useObserver(function () { return render(props, ref); }, baseComponentName);
    };
    observerComponent.displayName = baseComponent.displayName;
    if (isFunctionNameConfigurable) {
        Object.defineProperty(observerComponent, "name", {
            value: baseComponent.name,
            writable: true,
            configurable: true
        });
    }
    // Support legacy context: `contextTypes` must be applied before `memo`
    if (baseComponent.contextTypes) {
        ;
        observerComponent.contextTypes = baseComponent.contextTypes;
        if (process.env.NODE_ENV !== "production" && warnLegacyContextTypes) {
            warnLegacyContextTypes = false;
            console.warn("[mobx-react-lite] Support for Legacy Context in function components will be removed in the next major release.");
        }
    }
    if (useForwardRef) {
        // `forwardRef` must be applied prior `memo`
        // `forwardRef(observer(cmp))` throws:
        // "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))"
        observerComponent = forwardRef(observerComponent);
    }
    // memo; we are not interested in deep updates
    // in props; we assume that if deep objects are changed,
    // this is in observables, which would have been tracked anyway
    observerComponent = memo(observerComponent);
    copyStaticProperties(baseComponent, observerComponent);
    if ("production" !== process.env.NODE_ENV) {
        Object.defineProperty(observerComponent, "contextTypes", {
            set: function () {
                var _a, _b;
                throw new Error("[mobx-react-lite] `".concat(this.displayName || ((_a = this.type) === null || _a === void 0 ? void 0 : _a.displayName) || ((_b = this.type) === null || _b === void 0 ? void 0 : _b.name) || "Component", ".contextTypes` must be set before applying `observer`."));
            }
        });
    }
    return observerComponent;
}
// based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
var hoistBlackList = {
    $$typeof: true,
    render: true,
    compare: true,
    type: true,
    // Don't redefine `displayName`,
    // it's defined as getter-setter pair on `memo` (see #3192).
    displayName: true
};
function copyStaticProperties(base, target) {
    Object.keys(base).forEach(function (key) {
        if (!hoistBlackList[key]) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(base, key));
        }
    });
}
//# sourceMappingURL=observer.js.map