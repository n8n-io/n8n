// src/components/components/ActionBar/ActionBar.tsx
import React from "react";
import { styled } from "storybook/theming";
var Container = styled.div(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  right: 0,
  maxWidth: "100%",
  display: "flex",
  background: theme.background.content,
  zIndex: 1
})), ActionButton = styled.button(
  ({ theme }) => ({
    margin: 0,
    border: "0 none",
    padding: "4px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    color: theme.color.defaultText,
    background: theme.background.content,
    fontSize: 12,
    lineHeight: "16px",
    fontFamily: theme.typography.fonts.base,
    fontWeight: theme.typography.weight.bold,
    borderTop: `1px solid ${theme.appBorderColor}`,
    borderLeft: `1px solid ${theme.appBorderColor}`,
    marginLeft: -1,
    borderRadius: "4px 0 0 0",
    "&:not(:last-child)": { borderRight: `1px solid ${theme.appBorderColor}` },
    "& + *": {
      borderLeft: `1px solid ${theme.appBorderColor}`,
      borderRadius: 0
    },
    "&:focus": {
      boxShadow: `${theme.color.secondary} 0 -3px 0 0 inset`,
      outline: "0 none",
      "@media (forced-colors: active)": {
        outline: "1px solid highlight"
      }
    }
  }),
  ({ disabled }) => disabled && {
    cursor: "not-allowed",
    opacity: 0.5
  }
);
ActionButton.displayName = "ActionButton";
var ActionBar = ({ actionItems, ...props }) => React.createElement(Container, { ...props }, actionItems.map(({ title, className, onClick, disabled }, index) => React.createElement(ActionButton, { key: index, className, onClick, disabled: !!disabled }, title)));

// src/components/components/ScrollArea/ScrollArea.tsx
import React11, { forwardRef as forwardRef4 } from "react";

// ../node_modules/@radix-ui/react-scroll-area/dist/index.mjs
import * as React23 from "react";

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-primitive/dist/index.mjs
import * as React4 from "react";
import * as ReactDOM from "react-dom";

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-slot/dist/index.mjs
import * as React3 from "react";

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
import * as React2 from "react";
function setRef(ref, value) {
  typeof ref == "function" ? ref(value) : ref != null && (ref.current = value);
}
function composeRefs(...refs) {
  return (node) => refs.forEach((ref) => setRef(ref, node));
}
function useComposedRefs(...refs) {
  return React2.useCallback(composeRefs(...refs), refs);
}

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-slot/dist/index.mjs
import { Fragment, jsx } from "react/jsx-runtime";
var Slot = React3.forwardRef((props, forwardedRef) => {
  let { children, ...slotProps } = props, childrenArray = React3.Children.toArray(children), slottable = childrenArray.find(isSlottable);
  if (slottable) {
    let newElement = slottable.props.children, newChildren = childrenArray.map((child) => child === slottable ? React3.Children.count(newElement) > 1 ? React3.Children.only(null) : React3.isValidElement(newElement) ? newElement.props.children : null : child);
    return jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: React3.isValidElement(newElement) ? React3.cloneElement(newElement, void 0, newChildren) : null });
  }
  return jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
});
Slot.displayName = "Slot";
var SlotClone = React3.forwardRef((props, forwardedRef) => {
  let { children, ...slotProps } = props;
  if (React3.isValidElement(children)) {
    let childrenRef = getElementRef(children);
    return React3.cloneElement(children, {
      ...mergeProps(slotProps, children.props),
      // @ts-ignore
      ref: forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef
    });
  }
  return React3.Children.count(children) > 1 ? React3.Children.only(null) : null;
});
SlotClone.displayName = "SlotClone";
var Slottable = ({ children }) => jsx(Fragment, { children });
function isSlottable(child) {
  return React3.isValidElement(child) && child.type === Slottable;
}
function mergeProps(slotProps, childProps) {
  let overrideProps = { ...childProps };
  for (let propName in childProps) {
    let slotPropValue = slotProps[propName], childPropValue = childProps[propName];
    /^on[A-Z]/.test(propName) ? slotPropValue && childPropValue ? overrideProps[propName] = (...args) => {
      childPropValue(...args), slotPropValue(...args);
    } : slotPropValue && (overrideProps[propName] = slotPropValue) : propName === "style" ? overrideProps[propName] = { ...slotPropValue, ...childPropValue } : propName === "className" && (overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" "));
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get, mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  return mayWarn ? element.ref : (getter = Object.getOwnPropertyDescriptor(element, "ref")?.get, mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning, mayWarn ? element.props.ref : element.props.ref || element.ref);
}

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-primitive/dist/index.mjs
import { jsx as jsx2 } from "react/jsx-runtime";
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "span",
  "svg",
  "ul"
], Primitive = NODES.reduce((primitive, node) => {
  let Node = React4.forwardRef((props, forwardedRef) => {
    let { asChild, ...primitiveProps } = props, Comp = asChild ? Slot : node;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), jsx2(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  return Node.displayName = `Primitive.${node}`, { ...primitive, [node]: Node };
}, {});

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-presence/dist/index.mjs
import * as React22 from "react";
import * as ReactDOM2 from "react-dom";

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
import * as React5 from "react";
var useLayoutEffect2 = globalThis?.document ? React5.useLayoutEffect : () => {
};

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-presence/dist/index.mjs
import * as React6 from "react";
function useStateMachine(initialState, machine) {
  return React6.useReducer((state, event) => machine[state][event] ?? state, initialState);
}
var Presence = (props) => {
  let { present, children } = props, presence = usePresence(present), child = typeof children == "function" ? children({ present: presence.isPresent }) : React22.Children.only(children), ref = useComposedRefs(presence.ref, getElementRef2(child));
  return typeof children == "function" || presence.isPresent ? React22.cloneElement(child, { ref }) : null;
};
Presence.displayName = "Presence";
function usePresence(present) {
  let [node, setNode] = React22.useState(), stylesRef = React22.useRef({}), prevPresentRef = React22.useRef(present), prevAnimationNameRef = React22.useRef("none"), initialState = present ? "mounted" : "unmounted", [state, send] = useStateMachine(initialState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return React22.useEffect(() => {
    let currentAnimationName = getAnimationName(stylesRef.current);
    prevAnimationNameRef.current = state === "mounted" ? currentAnimationName : "none";
  }, [state]), useLayoutEffect2(() => {
    let styles = stylesRef.current, wasPresent = prevPresentRef.current;
    if (wasPresent !== present) {
      let prevAnimationName = prevAnimationNameRef.current, currentAnimationName = getAnimationName(styles);
      present ? send("MOUNT") : currentAnimationName === "none" || styles?.display === "none" ? send("UNMOUNT") : send(wasPresent && prevAnimationName !== currentAnimationName ? "ANIMATION_OUT" : "UNMOUNT"), prevPresentRef.current = present;
    }
  }, [present, send]), useLayoutEffect2(() => {
    if (node) {
      let handleAnimationEnd = (event) => {
        let isCurrentAnimation = getAnimationName(stylesRef.current).includes(event.animationName);
        event.target === node && isCurrentAnimation && ReactDOM2.flushSync(() => send("ANIMATION_END"));
      }, handleAnimationStart = (event) => {
        event.target === node && (prevAnimationNameRef.current = getAnimationName(stylesRef.current));
      };
      return node.addEventListener("animationstart", handleAnimationStart), node.addEventListener("animationcancel", handleAnimationEnd), node.addEventListener("animationend", handleAnimationEnd), () => {
        node.removeEventListener("animationstart", handleAnimationStart), node.removeEventListener("animationcancel", handleAnimationEnd), node.removeEventListener("animationend", handleAnimationEnd);
      };
    } else
      send("ANIMATION_END");
  }, [node, send]), {
    isPresent: ["mounted", "unmountSuspended"].includes(state),
    ref: React22.useCallback((node2) => {
      node2 && (stylesRef.current = getComputedStyle(node2)), setNode(node2);
    }, [])
  };
}
function getAnimationName(styles) {
  return styles?.animationName || "none";
}
function getElementRef2(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get, mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  return mayWarn ? element.ref : (getter = Object.getOwnPropertyDescriptor(element, "ref")?.get, mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning, mayWarn ? element.props.ref : element.props.ref || element.ref);
}

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-context/dist/index.mjs
import * as React7 from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext3(rootComponentName, defaultContext) {
    let BaseContext = React7.createContext(defaultContext), index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    function Provider(props) {
      let { scope, children, ...context } = props, Context = scope?.[scopeName][index] || BaseContext, value = React7.useMemo(() => context, Object.values(context));
      return jsx3(Context.Provider, { value, children });
    }
    function useContext22(consumerName, scope) {
      let Context = scope?.[scopeName][index] || BaseContext, context = React7.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return Provider.displayName = rootComponentName + "Provider", [Provider, useContext22];
  }
  let createScope = () => {
    let scopeContexts = defaultContexts.map((defaultContext) => React7.createContext(defaultContext));
    return function(scope) {
      let contexts = scope?.[scopeName] || scopeContexts;
      return React7.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    };
  };
  return createScope.scopeName = scopeName, [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
  let baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  let createScope = () => {
    let scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return function(overrideScopes) {
      let nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        let currentScope = useScope(overrideScopes)[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return React7.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  return createScope.scopeName = baseScope.scopeName, createScope;
}

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
import * as React8 from "react";
function useCallbackRef(callback) {
  let callbackRef = React8.useRef(callback);
  return React8.useEffect(() => {
    callbackRef.current = callback;
  }), React8.useMemo(() => (...args) => callbackRef.current?.(...args), []);
}

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-direction/dist/index.mjs
import * as React9 from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
var DirectionContext = React9.createContext(void 0);
function useDirection(localDir) {
  let globalDir = React9.useContext(DirectionContext);
  return localDir || globalDir || "ltr";
}

// ../node_modules/@radix-ui/number/dist/index.mjs
function clamp(value, [min, max]) {
  return Math.min(max, Math.max(min, value));
}

// ../node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/primitive/dist/index.mjs
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = !0 } = {}) {
  return function(event) {
    if (originalEventHandler?.(event), checkForDefaultPrevented === !1 || !event.defaultPrevented)
      return ourEventHandler?.(event);
  };
}

// ../node_modules/@radix-ui/react-scroll-area/dist/index.mjs
import * as React10 from "react";
import { Fragment as Fragment2, jsx as jsx5, jsxs } from "react/jsx-runtime";
function useStateMachine2(initialState, machine) {
  return React10.useReducer((state, event) => machine[state][event] ?? state, initialState);
}
var SCROLL_AREA_NAME = "ScrollArea", [createScrollAreaContext, createScrollAreaScope] = createContextScope(SCROLL_AREA_NAME), [ScrollAreaProvider, useScrollAreaContext] = createScrollAreaContext(SCROLL_AREA_NAME), ScrollArea = React23.forwardRef(
  (props, forwardedRef) => {
    let {
      __scopeScrollArea,
      type = "hover",
      dir,
      scrollHideDelay = 600,
      ...scrollAreaProps
    } = props, [scrollArea, setScrollArea] = React23.useState(null), [viewport, setViewport] = React23.useState(null), [content, setContent] = React23.useState(null), [scrollbarX, setScrollbarX] = React23.useState(null), [scrollbarY, setScrollbarY] = React23.useState(null), [cornerWidth, setCornerWidth] = React23.useState(0), [cornerHeight, setCornerHeight] = React23.useState(0), [scrollbarXEnabled, setScrollbarXEnabled] = React23.useState(!1), [scrollbarYEnabled, setScrollbarYEnabled] = React23.useState(!1), composedRefs = useComposedRefs(forwardedRef, (node) => setScrollArea(node)), direction = useDirection(dir);
    return jsx5(
      ScrollAreaProvider,
      {
        scope: __scopeScrollArea,
        type,
        dir: direction,
        scrollHideDelay,
        scrollArea,
        viewport,
        onViewportChange: setViewport,
        content,
        onContentChange: setContent,
        scrollbarX,
        onScrollbarXChange: setScrollbarX,
        scrollbarXEnabled,
        onScrollbarXEnabledChange: setScrollbarXEnabled,
        scrollbarY,
        onScrollbarYChange: setScrollbarY,
        scrollbarYEnabled,
        onScrollbarYEnabledChange: setScrollbarYEnabled,
        onCornerWidthChange: setCornerWidth,
        onCornerHeightChange: setCornerHeight,
        children: jsx5(
          Primitive.div,
          {
            dir: direction,
            ...scrollAreaProps,
            ref: composedRefs,
            style: {
              position: "relative",
              // Pass corner sizes as CSS vars to reduce re-renders of context consumers
              "--radix-scroll-area-corner-width": cornerWidth + "px",
              "--radix-scroll-area-corner-height": cornerHeight + "px",
              ...props.style
            }
          }
        )
      }
    );
  }
);
ScrollArea.displayName = SCROLL_AREA_NAME;
var VIEWPORT_NAME = "ScrollAreaViewport", ScrollAreaViewport = React23.forwardRef(
  (props, forwardedRef) => {
    let { __scopeScrollArea, children, asChild, nonce, ...viewportProps } = props, context = useScrollAreaContext(VIEWPORT_NAME, __scopeScrollArea), ref = React23.useRef(null), composedRefs = useComposedRefs(forwardedRef, ref, context.onViewportChange);
    return jsxs(Fragment2, { children: [
      jsx5(
        "style",
        {
          dangerouslySetInnerHTML: {
            __html: `
[data-radix-scroll-area-viewport] {
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}
[data-radix-scroll-area-viewport]::-webkit-scrollbar {
  display: none;
}
:where([data-radix-scroll-area-viewport]) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
:where([data-radix-scroll-area-content]) {
  flex-grow: 1;
}
`
          },
          nonce
        }
      ),
      jsx5(
        Primitive.div,
        {
          "data-radix-scroll-area-viewport": "",
          ...viewportProps,
          asChild,
          ref: composedRefs,
          style: {
            /**
             * We don't support `visible` because the intention is to have at least one scrollbar
             * if this component is used and `visible` will behave like `auto` in that case
             * https://developer.mozilla.org/en-US/docs/Web/CSS/overflow#description
             *
             * We don't handle `auto` because the intention is for the native implementation
             * to be hidden if using this component. We just want to ensure the node is scrollable
             * so could have used either `scroll` or `auto` here. We picked `scroll` to prevent
             * the browser from having to work out whether to render native scrollbars or not,
             * we tell it to with the intention of hiding them in CSS.
             */
            overflowX: context.scrollbarXEnabled ? "scroll" : "hidden",
            overflowY: context.scrollbarYEnabled ? "scroll" : "hidden",
            ...props.style
          },
          children: getSubtree({ asChild, children }, (children2) => jsx5(
            "div",
            {
              "data-radix-scroll-area-content": "",
              ref: context.onContentChange,
              style: { minWidth: context.scrollbarXEnabled ? "fit-content" : void 0 },
              children: children2
            }
          ))
        }
      )
    ] });
  }
);
ScrollAreaViewport.displayName = VIEWPORT_NAME;
var SCROLLBAR_NAME = "ScrollAreaScrollbar", ScrollAreaScrollbar = React23.forwardRef(
  (props, forwardedRef) => {
    let { forceMount, ...scrollbarProps } = props, context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea), { onScrollbarXEnabledChange, onScrollbarYEnabledChange } = context, isHorizontal = props.orientation === "horizontal";
    return React23.useEffect(() => (isHorizontal ? onScrollbarXEnabledChange(!0) : onScrollbarYEnabledChange(!0), () => {
      isHorizontal ? onScrollbarXEnabledChange(!1) : onScrollbarYEnabledChange(!1);
    }), [isHorizontal, onScrollbarXEnabledChange, onScrollbarYEnabledChange]), context.type === "hover" ? jsx5(ScrollAreaScrollbarHover, { ...scrollbarProps, ref: forwardedRef, forceMount }) : context.type === "scroll" ? jsx5(ScrollAreaScrollbarScroll, { ...scrollbarProps, ref: forwardedRef, forceMount }) : context.type === "auto" ? jsx5(ScrollAreaScrollbarAuto, { ...scrollbarProps, ref: forwardedRef, forceMount }) : context.type === "always" ? jsx5(ScrollAreaScrollbarVisible, { ...scrollbarProps, ref: forwardedRef }) : null;
  }
);
ScrollAreaScrollbar.displayName = SCROLLBAR_NAME;
var ScrollAreaScrollbarHover = React23.forwardRef((props, forwardedRef) => {
  let { forceMount, ...scrollbarProps } = props, context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea), [visible, setVisible] = React23.useState(!1);
  return React23.useEffect(() => {
    let scrollArea = context.scrollArea, hideTimer = 0;
    if (scrollArea) {
      let handlePointerEnter = () => {
        window.clearTimeout(hideTimer), setVisible(!0);
      }, handlePointerLeave = () => {
        hideTimer = window.setTimeout(() => setVisible(!1), context.scrollHideDelay);
      };
      return scrollArea.addEventListener("pointerenter", handlePointerEnter), scrollArea.addEventListener("pointerleave", handlePointerLeave), () => {
        window.clearTimeout(hideTimer), scrollArea.removeEventListener("pointerenter", handlePointerEnter), scrollArea.removeEventListener("pointerleave", handlePointerLeave);
      };
    }
  }, [context.scrollArea, context.scrollHideDelay]), jsx5(Presence, { present: forceMount || visible, children: jsx5(
    ScrollAreaScrollbarAuto,
    {
      "data-state": visible ? "visible" : "hidden",
      ...scrollbarProps,
      ref: forwardedRef
    }
  ) });
}), ScrollAreaScrollbarScroll = React23.forwardRef((props, forwardedRef) => {
  let { forceMount, ...scrollbarProps } = props, context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea), isHorizontal = props.orientation === "horizontal", debounceScrollEnd = useDebounceCallback(() => send("SCROLL_END"), 100), [state, send] = useStateMachine2("hidden", {
    hidden: {
      SCROLL: "scrolling"
    },
    scrolling: {
      SCROLL_END: "idle",
      POINTER_ENTER: "interacting"
    },
    interacting: {
      SCROLL: "interacting",
      POINTER_LEAVE: "idle"
    },
    idle: {
      HIDE: "hidden",
      SCROLL: "scrolling",
      POINTER_ENTER: "interacting"
    }
  });
  return React23.useEffect(() => {
    if (state === "idle") {
      let hideTimer = window.setTimeout(() => send("HIDE"), context.scrollHideDelay);
      return () => window.clearTimeout(hideTimer);
    }
  }, [state, context.scrollHideDelay, send]), React23.useEffect(() => {
    let viewport = context.viewport, scrollDirection = isHorizontal ? "scrollLeft" : "scrollTop";
    if (viewport) {
      let prevScrollPos = viewport[scrollDirection], handleScroll = () => {
        let scrollPos = viewport[scrollDirection];
        prevScrollPos !== scrollPos && (send("SCROLL"), debounceScrollEnd()), prevScrollPos = scrollPos;
      };
      return viewport.addEventListener("scroll", handleScroll), () => viewport.removeEventListener("scroll", handleScroll);
    }
  }, [context.viewport, isHorizontal, send, debounceScrollEnd]), jsx5(Presence, { present: forceMount || state !== "hidden", children: jsx5(
    ScrollAreaScrollbarVisible,
    {
      "data-state": state === "hidden" ? "hidden" : "visible",
      ...scrollbarProps,
      ref: forwardedRef,
      onPointerEnter: composeEventHandlers(props.onPointerEnter, () => send("POINTER_ENTER")),
      onPointerLeave: composeEventHandlers(props.onPointerLeave, () => send("POINTER_LEAVE"))
    }
  ) });
}), ScrollAreaScrollbarAuto = React23.forwardRef((props, forwardedRef) => {
  let context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea), { forceMount, ...scrollbarProps } = props, [visible, setVisible] = React23.useState(!1), isHorizontal = props.orientation === "horizontal", handleResize = useDebounceCallback(() => {
    if (context.viewport) {
      let isOverflowX = context.viewport.offsetWidth < context.viewport.scrollWidth, isOverflowY = context.viewport.offsetHeight < context.viewport.scrollHeight;
      setVisible(isHorizontal ? isOverflowX : isOverflowY);
    }
  }, 10);
  return useResizeObserver(context.viewport, handleResize), useResizeObserver(context.content, handleResize), jsx5(Presence, { present: forceMount || visible, children: jsx5(
    ScrollAreaScrollbarVisible,
    {
      "data-state": visible ? "visible" : "hidden",
      ...scrollbarProps,
      ref: forwardedRef
    }
  ) });
}), ScrollAreaScrollbarVisible = React23.forwardRef((props, forwardedRef) => {
  let { orientation = "vertical", ...scrollbarProps } = props, context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea), thumbRef = React23.useRef(null), pointerOffsetRef = React23.useRef(0), [sizes, setSizes] = React23.useState({
    content: 0,
    viewport: 0,
    scrollbar: { size: 0, paddingStart: 0, paddingEnd: 0 }
  }), thumbRatio = getThumbRatio(sizes.viewport, sizes.content), commonProps = {
    ...scrollbarProps,
    sizes,
    onSizesChange: setSizes,
    hasThumb: thumbRatio > 0 && thumbRatio < 1,
    onThumbChange: (thumb) => thumbRef.current = thumb,
    onThumbPointerUp: () => pointerOffsetRef.current = 0,
    onThumbPointerDown: (pointerPos) => pointerOffsetRef.current = pointerPos
  };
  function getScrollPosition(pointerPos, dir) {
    return getScrollPositionFromPointer(pointerPos, pointerOffsetRef.current, sizes, dir);
  }
  return orientation === "horizontal" ? jsx5(
    ScrollAreaScrollbarX,
    {
      ...commonProps,
      ref: forwardedRef,
      onThumbPositionChange: () => {
        if (context.viewport && thumbRef.current) {
          let scrollPos = context.viewport.scrollLeft, offset = getThumbOffsetFromScroll(scrollPos, sizes, context.dir);
          thumbRef.current.style.transform = `translate3d(${offset}px, 0, 0)`;
        }
      },
      onWheelScroll: (scrollPos) => {
        context.viewport && (context.viewport.scrollLeft = scrollPos);
      },
      onDragScroll: (pointerPos) => {
        context.viewport && (context.viewport.scrollLeft = getScrollPosition(pointerPos, context.dir));
      }
    }
  ) : orientation === "vertical" ? jsx5(
    ScrollAreaScrollbarY,
    {
      ...commonProps,
      ref: forwardedRef,
      onThumbPositionChange: () => {
        if (context.viewport && thumbRef.current) {
          let scrollPos = context.viewport.scrollTop, offset = getThumbOffsetFromScroll(scrollPos, sizes);
          thumbRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
        }
      },
      onWheelScroll: (scrollPos) => {
        context.viewport && (context.viewport.scrollTop = scrollPos);
      },
      onDragScroll: (pointerPos) => {
        context.viewport && (context.viewport.scrollTop = getScrollPosition(pointerPos));
      }
    }
  ) : null;
}), ScrollAreaScrollbarX = React23.forwardRef((props, forwardedRef) => {
  let { sizes, onSizesChange, ...scrollbarProps } = props, context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea), [computedStyle, setComputedStyle] = React23.useState(), ref = React23.useRef(null), composeRefs2 = useComposedRefs(forwardedRef, ref, context.onScrollbarXChange);
  return React23.useEffect(() => {
    ref.current && setComputedStyle(getComputedStyle(ref.current));
  }, [ref]), jsx5(
    ScrollAreaScrollbarImpl,
    {
      "data-orientation": "horizontal",
      ...scrollbarProps,
      ref: composeRefs2,
      sizes,
      style: {
        bottom: 0,
        left: context.dir === "rtl" ? "var(--radix-scroll-area-corner-width)" : 0,
        right: context.dir === "ltr" ? "var(--radix-scroll-area-corner-width)" : 0,
        "--radix-scroll-area-thumb-width": getThumbSize(sizes) + "px",
        ...props.style
      },
      onThumbPointerDown: (pointerPos) => props.onThumbPointerDown(pointerPos.x),
      onDragScroll: (pointerPos) => props.onDragScroll(pointerPos.x),
      onWheelScroll: (event, maxScrollPos) => {
        if (context.viewport) {
          let scrollPos = context.viewport.scrollLeft + event.deltaX;
          props.onWheelScroll(scrollPos), isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos) && event.preventDefault();
        }
      },
      onResize: () => {
        ref.current && context.viewport && computedStyle && onSizesChange({
          content: context.viewport.scrollWidth,
          viewport: context.viewport.offsetWidth,
          scrollbar: {
            size: ref.current.clientWidth,
            paddingStart: toInt(computedStyle.paddingLeft),
            paddingEnd: toInt(computedStyle.paddingRight)
          }
        });
      }
    }
  );
}), ScrollAreaScrollbarY = React23.forwardRef((props, forwardedRef) => {
  let { sizes, onSizesChange, ...scrollbarProps } = props, context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea), [computedStyle, setComputedStyle] = React23.useState(), ref = React23.useRef(null), composeRefs2 = useComposedRefs(forwardedRef, ref, context.onScrollbarYChange);
  return React23.useEffect(() => {
    ref.current && setComputedStyle(getComputedStyle(ref.current));
  }, [ref]), jsx5(
    ScrollAreaScrollbarImpl,
    {
      "data-orientation": "vertical",
      ...scrollbarProps,
      ref: composeRefs2,
      sizes,
      style: {
        top: 0,
        right: context.dir === "ltr" ? 0 : void 0,
        left: context.dir === "rtl" ? 0 : void 0,
        bottom: "var(--radix-scroll-area-corner-height)",
        "--radix-scroll-area-thumb-height": getThumbSize(sizes) + "px",
        ...props.style
      },
      onThumbPointerDown: (pointerPos) => props.onThumbPointerDown(pointerPos.y),
      onDragScroll: (pointerPos) => props.onDragScroll(pointerPos.y),
      onWheelScroll: (event, maxScrollPos) => {
        if (context.viewport) {
          let scrollPos = context.viewport.scrollTop + event.deltaY;
          props.onWheelScroll(scrollPos), isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos) && event.preventDefault();
        }
      },
      onResize: () => {
        ref.current && context.viewport && computedStyle && onSizesChange({
          content: context.viewport.scrollHeight,
          viewport: context.viewport.offsetHeight,
          scrollbar: {
            size: ref.current.clientHeight,
            paddingStart: toInt(computedStyle.paddingTop),
            paddingEnd: toInt(computedStyle.paddingBottom)
          }
        });
      }
    }
  );
}), [ScrollbarProvider, useScrollbarContext] = createScrollAreaContext(SCROLLBAR_NAME), ScrollAreaScrollbarImpl = React23.forwardRef((props, forwardedRef) => {
  let {
    __scopeScrollArea,
    sizes,
    hasThumb,
    onThumbChange,
    onThumbPointerUp,
    onThumbPointerDown,
    onThumbPositionChange,
    onDragScroll,
    onWheelScroll,
    onResize,
    ...scrollbarProps
  } = props, context = useScrollAreaContext(SCROLLBAR_NAME, __scopeScrollArea), [scrollbar, setScrollbar] = React23.useState(null), composeRefs2 = useComposedRefs(forwardedRef, (node) => setScrollbar(node)), rectRef = React23.useRef(null), prevWebkitUserSelectRef = React23.useRef(""), viewport = context.viewport, maxScrollPos = sizes.content - sizes.viewport, handleWheelScroll = useCallbackRef(onWheelScroll), handleThumbPositionChange = useCallbackRef(onThumbPositionChange), handleResize = useDebounceCallback(onResize, 10);
  function handleDragScroll(event) {
    if (rectRef.current) {
      let x = event.clientX - rectRef.current.left, y = event.clientY - rectRef.current.top;
      onDragScroll({ x, y });
    }
  }
  return React23.useEffect(() => {
    let handleWheel = (event) => {
      let element = event.target;
      scrollbar?.contains(element) && handleWheelScroll(event, maxScrollPos);
    };
    return document.addEventListener("wheel", handleWheel, { passive: !1 }), () => document.removeEventListener("wheel", handleWheel, { passive: !1 });
  }, [viewport, scrollbar, maxScrollPos, handleWheelScroll]), React23.useEffect(handleThumbPositionChange, [sizes, handleThumbPositionChange]), useResizeObserver(scrollbar, handleResize), useResizeObserver(context.content, handleResize), jsx5(
    ScrollbarProvider,
    {
      scope: __scopeScrollArea,
      scrollbar,
      hasThumb,
      onThumbChange: useCallbackRef(onThumbChange),
      onThumbPointerUp: useCallbackRef(onThumbPointerUp),
      onThumbPositionChange: handleThumbPositionChange,
      onThumbPointerDown: useCallbackRef(onThumbPointerDown),
      children: jsx5(
        Primitive.div,
        {
          ...scrollbarProps,
          ref: composeRefs2,
          style: { position: "absolute", ...scrollbarProps.style },
          onPointerDown: composeEventHandlers(props.onPointerDown, (event) => {
            event.button === 0 && (event.target.setPointerCapture(event.pointerId), rectRef.current = scrollbar.getBoundingClientRect(), prevWebkitUserSelectRef.current = document.body.style.webkitUserSelect, document.body.style.webkitUserSelect = "none", context.viewport && (context.viewport.style.scrollBehavior = "auto"), handleDragScroll(event));
          }),
          onPointerMove: composeEventHandlers(props.onPointerMove, handleDragScroll),
          onPointerUp: composeEventHandlers(props.onPointerUp, (event) => {
            let element = event.target;
            element.hasPointerCapture(event.pointerId) && element.releasePointerCapture(event.pointerId), document.body.style.webkitUserSelect = prevWebkitUserSelectRef.current, context.viewport && (context.viewport.style.scrollBehavior = ""), rectRef.current = null;
          })
        }
      )
    }
  );
}), THUMB_NAME = "ScrollAreaThumb", ScrollAreaThumb = React23.forwardRef(
  (props, forwardedRef) => {
    let { forceMount, ...thumbProps } = props, scrollbarContext = useScrollbarContext(THUMB_NAME, props.__scopeScrollArea);
    return jsx5(Presence, { present: forceMount || scrollbarContext.hasThumb, children: jsx5(ScrollAreaThumbImpl, { ref: forwardedRef, ...thumbProps }) });
  }
), ScrollAreaThumbImpl = React23.forwardRef(
  (props, forwardedRef) => {
    let { __scopeScrollArea, style, ...thumbProps } = props, scrollAreaContext = useScrollAreaContext(THUMB_NAME, __scopeScrollArea), scrollbarContext = useScrollbarContext(THUMB_NAME, __scopeScrollArea), { onThumbPositionChange } = scrollbarContext, composedRef = useComposedRefs(
      forwardedRef,
      (node) => scrollbarContext.onThumbChange(node)
    ), removeUnlinkedScrollListenerRef = React23.useRef(), debounceScrollEnd = useDebounceCallback(() => {
      removeUnlinkedScrollListenerRef.current && (removeUnlinkedScrollListenerRef.current(), removeUnlinkedScrollListenerRef.current = void 0);
    }, 100);
    return React23.useEffect(() => {
      let viewport = scrollAreaContext.viewport;
      if (viewport) {
        let handleScroll = () => {
          if (debounceScrollEnd(), !removeUnlinkedScrollListenerRef.current) {
            let listener = addUnlinkedScrollListener(viewport, onThumbPositionChange);
            removeUnlinkedScrollListenerRef.current = listener, onThumbPositionChange();
          }
        };
        return onThumbPositionChange(), viewport.addEventListener("scroll", handleScroll), () => viewport.removeEventListener("scroll", handleScroll);
      }
    }, [scrollAreaContext.viewport, debounceScrollEnd, onThumbPositionChange]), jsx5(
      Primitive.div,
      {
        "data-state": scrollbarContext.hasThumb ? "visible" : "hidden",
        ...thumbProps,
        ref: composedRef,
        style: {
          width: "var(--radix-scroll-area-thumb-width)",
          height: "var(--radix-scroll-area-thumb-height)",
          ...style
        },
        onPointerDownCapture: composeEventHandlers(props.onPointerDownCapture, (event) => {
          let thumbRect = event.target.getBoundingClientRect(), x = event.clientX - thumbRect.left, y = event.clientY - thumbRect.top;
          scrollbarContext.onThumbPointerDown({ x, y });
        }),
        onPointerUp: composeEventHandlers(props.onPointerUp, scrollbarContext.onThumbPointerUp)
      }
    );
  }
);
ScrollAreaThumb.displayName = THUMB_NAME;
var CORNER_NAME = "ScrollAreaCorner", ScrollAreaCorner = React23.forwardRef(
  (props, forwardedRef) => {
    let context = useScrollAreaContext(CORNER_NAME, props.__scopeScrollArea), hasBothScrollbarsVisible = !!(context.scrollbarX && context.scrollbarY);
    return context.type !== "scroll" && hasBothScrollbarsVisible ? jsx5(ScrollAreaCornerImpl, { ...props, ref: forwardedRef }) : null;
  }
);
ScrollAreaCorner.displayName = CORNER_NAME;
var ScrollAreaCornerImpl = React23.forwardRef((props, forwardedRef) => {
  let { __scopeScrollArea, ...cornerProps } = props, context = useScrollAreaContext(CORNER_NAME, __scopeScrollArea), [width, setWidth] = React23.useState(0), [height, setHeight] = React23.useState(0), hasSize = !!(width && height);
  return useResizeObserver(context.scrollbarX, () => {
    let height2 = context.scrollbarX?.offsetHeight || 0;
    context.onCornerHeightChange(height2), setHeight(height2);
  }), useResizeObserver(context.scrollbarY, () => {
    let width2 = context.scrollbarY?.offsetWidth || 0;
    context.onCornerWidthChange(width2), setWidth(width2);
  }), hasSize ? jsx5(
    Primitive.div,
    {
      ...cornerProps,
      ref: forwardedRef,
      style: {
        width,
        height,
        position: "absolute",
        right: context.dir === "ltr" ? 0 : void 0,
        left: context.dir === "rtl" ? 0 : void 0,
        bottom: 0,
        ...props.style
      }
    }
  ) : null;
});
function toInt(value) {
  return value ? parseInt(value, 10) : 0;
}
function getThumbRatio(viewportSize, contentSize) {
  let ratio = viewportSize / contentSize;
  return isNaN(ratio) ? 0 : ratio;
}
function getThumbSize(sizes) {
  let ratio = getThumbRatio(sizes.viewport, sizes.content), scrollbarPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd, thumbSize = (sizes.scrollbar.size - scrollbarPadding) * ratio;
  return Math.max(thumbSize, 18);
}
function getScrollPositionFromPointer(pointerPos, pointerOffset, sizes, dir = "ltr") {
  let thumbSizePx = getThumbSize(sizes), thumbCenter = thumbSizePx / 2, offset = pointerOffset || thumbCenter, thumbOffsetFromEnd = thumbSizePx - offset, minPointerPos = sizes.scrollbar.paddingStart + offset, maxPointerPos = sizes.scrollbar.size - sizes.scrollbar.paddingEnd - thumbOffsetFromEnd, maxScrollPos = sizes.content - sizes.viewport, scrollRange = dir === "ltr" ? [0, maxScrollPos] : [maxScrollPos * -1, 0];
  return linearScale([minPointerPos, maxPointerPos], scrollRange)(pointerPos);
}
function getThumbOffsetFromScroll(scrollPos, sizes, dir = "ltr") {
  let thumbSizePx = getThumbSize(sizes), scrollbarPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd, scrollbar = sizes.scrollbar.size - scrollbarPadding, maxScrollPos = sizes.content - sizes.viewport, maxThumbPos = scrollbar - thumbSizePx, scrollClampRange = dir === "ltr" ? [0, maxScrollPos] : [maxScrollPos * -1, 0], scrollWithoutMomentum = clamp(scrollPos, scrollClampRange);
  return linearScale([0, maxScrollPos], [0, maxThumbPos])(scrollWithoutMomentum);
}
function linearScale(input, output) {
  return (value) => {
    if (input[0] === input[1] || output[0] === output[1]) return output[0];
    let ratio = (output[1] - output[0]) / (input[1] - input[0]);
    return output[0] + ratio * (value - input[0]);
  };
}
function isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos) {
  return scrollPos > 0 && scrollPos < maxScrollPos;
}
var addUnlinkedScrollListener = (node, handler = () => {
}) => {
  let prevPosition = { left: node.scrollLeft, top: node.scrollTop }, rAF = 0;
  return (function loop() {
    let position = { left: node.scrollLeft, top: node.scrollTop }, isHorizontalScroll = prevPosition.left !== position.left, isVerticalScroll = prevPosition.top !== position.top;
    (isHorizontalScroll || isVerticalScroll) && handler(), prevPosition = position, rAF = window.requestAnimationFrame(loop);
  })(), () => window.cancelAnimationFrame(rAF);
};
function useDebounceCallback(callback, delay) {
  let handleCallback = useCallbackRef(callback), debounceTimerRef = React23.useRef(0);
  return React23.useEffect(() => () => window.clearTimeout(debounceTimerRef.current), []), React23.useCallback(() => {
    window.clearTimeout(debounceTimerRef.current), debounceTimerRef.current = window.setTimeout(handleCallback, delay);
  }, [handleCallback, delay]);
}
function useResizeObserver(element, onResize) {
  let handleResize = useCallbackRef(onResize);
  useLayoutEffect2(() => {
    let rAF = 0;
    if (element) {
      let resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(rAF), rAF = window.requestAnimationFrame(handleResize);
      });
      return resizeObserver.observe(element), () => {
        window.cancelAnimationFrame(rAF), resizeObserver.unobserve(element);
      };
    }
  }, [element, handleResize]);
}
function getSubtree(options, content) {
  let { asChild, children } = options;
  if (!asChild) return typeof content == "function" ? content(children) : content;
  let firstChild = React23.Children.only(children);
  return React23.cloneElement(firstChild, {
    children: typeof content == "function" ? content(firstChild.props.children) : content
  });
}
var Root = ScrollArea, Viewport = ScrollAreaViewport, Scrollbar = ScrollAreaScrollbar, Thumb = ScrollAreaThumb, Corner = ScrollAreaCorner;

// src/components/components/ScrollArea/ScrollArea.tsx
import { styled as styled2 } from "storybook/theming";
var ScrollAreaRoot = styled2(Root)(
  ({ scrollbarsize, offset }) => ({
    width: "100%",
    height: "100%",
    overflow: "hidden",
    "--scrollbar-size": `${scrollbarsize + offset}px`,
    "--radix-scroll-area-thumb-width": `${scrollbarsize}px`
  })
), ScrollAreaViewport2 = styled2(Viewport)({
  width: "100%",
  height: "100%"
}), ScrollAreaScrollbar2 = styled2(Scrollbar)(({ offset, horizontal, vertical }) => ({
  display: "flex",
  userSelect: "none",
  // ensures no selection
  touchAction: "none",
  // disable browser handling of all panning and zooming gestures on touch devices
  background: "transparent",
  transition: "all 0.2s ease-out",
  borderRadius: "var(--scrollbar-size)",
  zIndex: 1,
  '&[data-orientation="vertical"]': {
    width: "var(--scrollbar-size)",
    paddingRight: offset,
    marginTop: offset,
    marginBottom: horizontal === "true" && vertical === "true" ? 0 : offset
  },
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
    height: "var(--scrollbar-size)",
    paddingBottom: offset,
    marginLeft: offset,
    marginRight: horizontal === "true" && vertical === "true" ? 0 : offset
  }
})), ScrollAreaThumb2 = styled2(Thumb)(({ theme }) => ({
  flex: 1,
  background: theme.textMutedColor,
  opacity: 0.5,
  borderRadius: "var(--scrollbar-size)",
  position: "relative",
  transition: "opacity 0.2s ease-out",
  zIndex: 1,
  "&:hover": { opacity: 0.8 },
  /* increase target size for touch devices https://www.w3.org/WAI/WCAG21/Understanding/target-size.html */
  "::before": {
    content: '""',
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    width: "100%",
    height: "100%"
  }
})), ScrollArea2 = forwardRef4(
  ({
    children,
    horizontal = !1,
    vertical = !1,
    offset = 2,
    scrollbarSize = 6,
    scrollPadding = 0,
    className
  }, ref) => React11.createElement(ScrollAreaRoot, { scrollbarsize: scrollbarSize, offset, className }, React11.createElement(ScrollAreaViewport2, { ref, style: { scrollPadding } }, children), horizontal && React11.createElement(
    ScrollAreaScrollbar2,
    {
      orientation: "horizontal",
      offset,
      horizontal: horizontal.toString(),
      vertical: vertical.toString()
    },
    React11.createElement(ScrollAreaThumb2, null)
  ), vertical && React11.createElement(
    ScrollAreaScrollbar2,
    {
      orientation: "vertical",
      offset,
      horizontal: horizontal.toString(),
      vertical: vertical.toString()
    },
    React11.createElement(ScrollAreaThumb2, null)
  ), horizontal && vertical && React11.createElement(Corner, null))
);
ScrollArea2.displayName = "ScrollArea";

// src/components/components/syntaxhighlighter/clipboard.ts
import { global } from "@storybook/global";
var { document: document2, window: globalWindow } = global;
async function copyUsingClipboardAPI(text) {
  try {
    await globalWindow.top?.navigator.clipboard.writeText(text);
  } catch {
    await globalWindow.navigator.clipboard.writeText(text);
  }
}
async function copyUsingWorkAround(text) {
  let tmp = document2.createElement("TEXTAREA"), focus = document2.activeElement;
  tmp.value = text, document2.body.appendChild(tmp), tmp.select(), document2.execCommand("copy"), document2.body.removeChild(tmp), focus.focus();
}
function createCopyToClipboardFunction() {
  return globalWindow.navigator?.clipboard ? copyUsingClipboardAPI : copyUsingWorkAround;
}

export {
  ActionBar,
  ScrollArea2 as ScrollArea,
  createCopyToClipboardFunction
};
