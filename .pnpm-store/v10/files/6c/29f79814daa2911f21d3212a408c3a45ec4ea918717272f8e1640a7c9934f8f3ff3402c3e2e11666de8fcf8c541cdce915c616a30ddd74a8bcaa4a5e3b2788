import {
  require_main
} from "../_browser-chunks/chunk-3OXGAGBE.js";
import {
  isEqual
} from "../_browser-chunks/chunk-3IAH5M2U.js";
import "../_browser-chunks/chunk-QKODTO7K.js";
import {
  isPlainObject
} from "../_browser-chunks/chunk-GFLS4VP3.js";
import {
  require_memoizerific
} from "../_browser-chunks/chunk-WJYERY3R.js";
import {
  dedent
} from "../_browser-chunks/chunk-JP7NCOJX.js";
import {
  __toESM
} from "../_browser-chunks/chunk-A242L54C.js";

// src/router/utils.ts
import { once } from "storybook/internal/client-logger";
var import_memoizerific = __toESM(require_memoizerific(), 1), import_picoquery = __toESM(require_main(), 1);
var splitPathRegex = /\/([^/]+)\/(?:(.*)_)?([^/]+)?/, parsePath = (0, import_memoizerific.default)(1e3)((path) => {
  let result = {
    viewMode: void 0,
    storyId: void 0,
    refId: void 0
  };
  if (path) {
    let [, viewMode, refId, storyId] = path.toLowerCase().match(splitPathRegex) || [];
    viewMode && Object.assign(result, {
      viewMode,
      storyId,
      refId
    });
  }
  return result;
}), DEEPLY_EQUAL = Symbol("Deeply equal"), deepDiff = (value, update) => {
  if (typeof value != typeof update)
    return update;
  if (isEqual(value, update))
    return DEEPLY_EQUAL;
  if (Array.isArray(value) && Array.isArray(update)) {
    let res = update.reduce((acc, upd, index) => {
      let diff = deepDiff(value[index], upd);
      return diff !== DEEPLY_EQUAL && (acc[index] = diff), acc;
    }, new Array(update.length));
    return update.length >= value.length ? res : res.concat(new Array(value.length - update.length).fill(void 0));
  }
  return isPlainObject(value) && isPlainObject(update) ? Object.keys({ ...value, ...update }).reduce((acc, key) => {
    let diff = deepDiff(value?.[key], update?.[key]);
    return diff === DEEPLY_EQUAL ? acc : Object.assign(acc, { [key]: diff });
  }, {}) : update;
}, VALIDATION_REGEXP = /^[a-zA-Z0-9 _-]*$/, NUMBER_REGEXP = /^-?[0-9]+(\.[0-9]+)?$/, HEX_REGEXP = /^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i, COLOR_REGEXP = /^(rgba?|hsla?)\(([0-9]{1,3}),\s?([0-9]{1,3})%?,\s?([0-9]{1,3})%?,?\s?([0-9](\.[0-9]{1,2})?)?\)$/i, validateArgs = (key = "", value) => key === null || key === "" || !VALIDATION_REGEXP.test(key) ? !1 : value == null || value instanceof Date || typeof value == "number" || typeof value == "boolean" ? !0 : typeof value == "string" ? VALIDATION_REGEXP.test(value) || NUMBER_REGEXP.test(value) || HEX_REGEXP.test(value) || COLOR_REGEXP.test(value) : Array.isArray(value) ? value.every((v) => validateArgs(key, v)) : isPlainObject(value) ? Object.entries(value).every(([k, v]) => validateArgs(k, v)) : !1, encodeSpecialValues = (value) => value === void 0 ? "!undefined" : value === null ? "!null" : typeof value == "string" ? HEX_REGEXP.test(value) ? `!hex(${value.slice(1)})` : COLOR_REGEXP.test(value) ? `!${value.replace(/[\s%]/g, "")}` : value : typeof value == "boolean" ? `!${value}` : value instanceof Date ? `!date(${value.toISOString()})` : Array.isArray(value) ? value.map(encodeSpecialValues) : isPlainObject(value) ? Object.entries(value).reduce(
  (acc, [key, val]) => Object.assign(acc, { [key]: encodeSpecialValues(val) }),
  {}
) : value, decodeKnownQueryChar = (chr) => {
  switch (chr) {
    case "%20":
      return "+";
    case "%5B":
      return "[";
    case "%5D":
      return "]";
    case "%2C":
      return ",";
    case "%3A":
      return ":";
  }
  return chr;
}, knownQueryChar = /%[0-9A-F]{2}/g, buildArgsParam = (initialArgs, args) => {
  let update = deepDiff(initialArgs, args);
  if (!update || update === DEEPLY_EQUAL)
    return "";
  let object = Object.entries(update).reduce((acc, [key, value]) => validateArgs(key, value) ? Object.assign(acc, { [key]: value }) : (once.warn(dedent`
      Omitted potentially unsafe URL args.

      More info: https://storybook.js.org/docs/writing-stories/args?ref=error#setting-args-through-the-url
    `), acc), {});
  return (0, import_picoquery.stringify)(encodeSpecialValues(object), {
    delimiter: ";",
    // we don't actually create multiple query params
    nesting: !0,
    nestingSyntax: "js"
    // encode objects using dot notation: obj.key=val
  }).replace(knownQueryChar, decodeKnownQueryChar).split(";").map((part) => part.replace("=", ":")).join(";");
}, queryFromString = (0, import_memoizerific.default)(1e3)((s) => s !== void 0 ? (0, import_picoquery.parse)(s) : {}), queryFromLocation = (location) => queryFromString(location.search ? location.search.slice(1) : ""), stringifyQuery = (query) => {
  let queryStr = (0, import_picoquery.stringify)(query);
  return queryStr ? "?" + queryStr : "";
}, getMatch = (0, import_memoizerific.default)(1e3)((current, target, startsWith = !0) => {
  if (startsWith) {
    if (typeof target != "string")
      throw new Error("startsWith only works with string targets");
    return current && current.startsWith(target) ? { path: current } : null;
  }
  let currentIsTarget = typeof target == "string" && current === target, matchTarget = current && target && current.match(target);
  return currentIsTarget || matchTarget ? { path: current } : null;
});

// src/router/router.tsx
import React3, { useCallback as useCallback3 } from "react";
import { global } from "@storybook/global";

// ../node_modules/react-router-dom/dist/index.js
import * as React2 from "react";

// ../node_modules/react-router/dist/index.js
import * as React from "react";

// ../node_modules/@remix-run/router/dist/router.js
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends.apply(this, arguments);
}
var Action;
(function(Action2) {
  Action2.Pop = "POP", Action2.Push = "PUSH", Action2.Replace = "REPLACE";
})(Action || (Action = {}));
var PopStateEventType = "popstate";
function createBrowserHistory(options) {
  options === void 0 && (options = {});
  function createBrowserLocation(window2, globalHistory) {
    let {
      pathname,
      search,
      hash
    } = window2.location;
    return createLocation(
      "",
      {
        pathname,
        search,
        hash
      },
      // state defaults to `null` because `window.history.state` does
      globalHistory.state && globalHistory.state.usr || null,
      globalHistory.state && globalHistory.state.key || "default"
    );
  }
  function createBrowserHref(window2, to) {
    return typeof to == "string" ? to : createPath(to);
  }
  return getUrlBasedHistory(createBrowserLocation, createBrowserHref, null, options);
}
function invariant(value, message) {
  if (value === !1 || value === null || typeof value > "u")
    throw new Error(message);
}
function warning(cond, message) {
  if (!cond) {
    typeof console < "u" && console.warn(message);
    try {
      throw new Error(message);
    } catch {
    }
  }
}
function createKey() {
  return Math.random().toString(36).substr(2, 8);
}
function getHistoryState(location, index) {
  return {
    usr: location.state,
    key: location.key,
    idx: index
  };
}
function createLocation(current, to, state, key) {
  return state === void 0 && (state = null), _extends({
    pathname: typeof current == "string" ? current : current.pathname,
    search: "",
    hash: ""
  }, typeof to == "string" ? parsePath2(to) : to, {
    state,
    // TODO: This could be cleaned up.  push/replace should probably just take
    // full Locations now and avoid the need to run through this flow at all
    // But that's a pretty big refactor to the current test suite so going to
    // keep as is for the time being and just let any incoming keys take precedence
    key: to && to.key || key || createKey()
  });
}
function createPath(_ref) {
  let {
    pathname = "/",
    search = "",
    hash = ""
  } = _ref;
  return search && search !== "?" && (pathname += search.charAt(0) === "?" ? search : "?" + search), hash && hash !== "#" && (pathname += hash.charAt(0) === "#" ? hash : "#" + hash), pathname;
}
function parsePath2(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    hashIndex >= 0 && (parsedPath.hash = path.substr(hashIndex), path = path.substr(0, hashIndex));
    let searchIndex = path.indexOf("?");
    searchIndex >= 0 && (parsedPath.search = path.substr(searchIndex), path = path.substr(0, searchIndex)), path && (parsedPath.pathname = path);
  }
  return parsedPath;
}
function getUrlBasedHistory(getLocation, createHref, validateLocation, options) {
  options === void 0 && (options = {});
  let {
    window: window2 = document.defaultView,
    v5Compat = !1
  } = options, globalHistory = window2.history, action = Action.Pop, listener = null, index = getIndex();
  index == null && (index = 0, globalHistory.replaceState(_extends({}, globalHistory.state, {
    idx: index
  }), ""));
  function getIndex() {
    return (globalHistory.state || {
      idx: null
    }).idx;
  }
  function handlePop() {
    action = Action.Pop;
    let nextIndex = getIndex(), delta = nextIndex == null ? null : nextIndex - index;
    index = nextIndex, listener && listener({
      action,
      location: history.location,
      delta
    });
  }
  function push(to, state) {
    action = Action.Push;
    let location = createLocation(history.location, to, state);
    validateLocation && validateLocation(location, to), index = getIndex() + 1;
    let historyState = getHistoryState(location, index), url = history.createHref(location);
    try {
      globalHistory.pushState(historyState, "", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "DataCloneError")
        throw error;
      window2.location.assign(url);
    }
    v5Compat && listener && listener({
      action,
      location: history.location,
      delta: 1
    });
  }
  function replace(to, state) {
    action = Action.Replace;
    let location = createLocation(history.location, to, state);
    validateLocation && validateLocation(location, to), index = getIndex();
    let historyState = getHistoryState(location, index), url = history.createHref(location);
    globalHistory.replaceState(historyState, "", url), v5Compat && listener && listener({
      action,
      location: history.location,
      delta: 0
    });
  }
  function createURL(to) {
    let base = window2.location.origin !== "null" ? window2.location.origin : window2.location.href, href = typeof to == "string" ? to : createPath(to);
    return invariant(base, "No window.location.(origin|href) available to create URL for href: " + href), new URL(href, base);
  }
  let history = {
    get action() {
      return action;
    },
    get location() {
      return getLocation(window2, globalHistory);
    },
    listen(fn) {
      if (listener)
        throw new Error("A history only accepts one active listener");
      return window2.addEventListener(PopStateEventType, handlePop), listener = fn, () => {
        window2.removeEventListener(PopStateEventType, handlePop), listener = null;
      };
    },
    createHref(to) {
      return createHref(window2, to);
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to);
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      };
    },
    push,
    replace,
    go(n) {
      return globalHistory.go(n);
    }
  };
  return history;
}
var ResultType;
(function(ResultType2) {
  ResultType2.data = "data", ResultType2.deferred = "deferred", ResultType2.redirect = "redirect", ResultType2.error = "error";
})(ResultType || (ResultType = {}));
function stripBasename(pathname, basename) {
  if (basename === "/") return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase()))
    return null;
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length, nextChar = pathname.charAt(startIndex);
  return nextChar && nextChar !== "/" ? null : pathname.slice(startIndex) || "/";
}
function resolvePath(to, fromPathname) {
  fromPathname === void 0 && (fromPathname = "/");
  let {
    pathname: toPathname,
    search = "",
    hash = ""
  } = typeof to == "string" ? parsePath2(to) : to;
  return {
    pathname: toPathname ? toPathname.startsWith("/") ? toPathname : resolvePathname(toPathname, fromPathname) : fromPathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash)
  };
}
function resolvePathname(relativePath, fromPathname) {
  let segments = fromPathname.replace(/\/+$/, "").split("/");
  return relativePath.split("/").forEach((segment) => {
    segment === ".." ? segments.length > 1 && segments.pop() : segment !== "." && segments.push(segment);
  }), segments.length > 1 ? segments.join("/") : "/";
}
function getInvalidPathError(char, field, dest, path) {
  return "Cannot include a '" + char + "' character in a manually specified " + ("`to." + field + "` field [" + JSON.stringify(path) + "].  Please separate it out to the ") + ("`to." + dest + "` field. Alternatively you may provide the full path as ") + 'a string in <Link to="..."> and the router will parse it for you.';
}
function getPathContributingMatches(matches) {
  return matches.filter((match, index) => index === 0 || match.route.path && match.route.path.length > 0);
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative) {
  isPathRelative === void 0 && (isPathRelative = !1);
  let to;
  typeof toArg == "string" ? to = parsePath2(toArg) : (to = _extends({}, toArg), invariant(!to.pathname || !to.pathname.includes("?"), getInvalidPathError("?", "pathname", "search", to)), invariant(!to.pathname || !to.pathname.includes("#"), getInvalidPathError("#", "pathname", "hash", to)), invariant(!to.search || !to.search.includes("#"), getInvalidPathError("#", "search", "hash", to)));
  let isEmptyPath = toArg === "" || to.pathname === "", toPathname = isEmptyPath ? "/" : to.pathname, from;
  if (isPathRelative || toPathname == null)
    from = locationPathname;
  else {
    let routePathnameIndex = routePathnames.length - 1;
    if (toPathname.startsWith("..")) {
      let toSegments = toPathname.split("/");
      for (; toSegments[0] === ".."; )
        toSegments.shift(), routePathnameIndex -= 1;
      to.pathname = toSegments.join("/");
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : "/";
  }
  let path = resolvePath(to, from), hasExplicitTrailingSlash = toPathname && toPathname !== "/" && toPathname.endsWith("/"), hasCurrentTrailingSlash = (isEmptyPath || toPathname === ".") && locationPathname.endsWith("/");
  return !path.pathname.endsWith("/") && (hasExplicitTrailingSlash || hasCurrentTrailingSlash) && (path.pathname += "/"), path;
}
var joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/");
var normalizeSearch = (search) => !search || search === "?" ? "" : search.startsWith("?") ? search : "?" + search, normalizeHash = (hash) => !hash || hash === "#" ? "" : hash.startsWith("#") ? hash : "#" + hash;
function isRouteErrorResponse(error) {
  return error != null && typeof error.status == "number" && typeof error.statusText == "string" && typeof error.internal == "boolean" && "data" in error;
}
var validMutationMethodsArr = ["post", "put", "patch", "delete"], validMutationMethods = new Set(validMutationMethodsArr), validRequestMethodsArr = ["get", ...validMutationMethodsArr], validRequestMethods = new Set(validRequestMethodsArr);
var UNSAFE_DEFERRED_SYMBOL = Symbol("deferred");

// ../node_modules/react-router/dist/index.js
function _extends2() {
  return _extends2 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends2.apply(this, arguments);
}
var DataRouterContext = React.createContext(null);
process.env.NODE_ENV !== "production" && (DataRouterContext.displayName = "DataRouter");
var DataRouterStateContext = React.createContext(null);
process.env.NODE_ENV !== "production" && (DataRouterStateContext.displayName = "DataRouterState");
var AwaitContext = React.createContext(null);
process.env.NODE_ENV !== "production" && (AwaitContext.displayName = "Await");
var NavigationContext = React.createContext(null);
process.env.NODE_ENV !== "production" && (NavigationContext.displayName = "Navigation");
var LocationContext = React.createContext(null);
process.env.NODE_ENV !== "production" && (LocationContext.displayName = "Location");
var RouteContext = React.createContext({
  outlet: null,
  matches: [],
  isDataRoute: !1
});
process.env.NODE_ENV !== "production" && (RouteContext.displayName = "Route");
var RouteErrorContext = React.createContext(null);
process.env.NODE_ENV !== "production" && (RouteErrorContext.displayName = "RouteError");
function useHref(to, _temp) {
  let {
    relative
  } = _temp === void 0 ? {} : _temp;
  useInRouterContext() || (process.env.NODE_ENV !== "production" ? invariant(
    !1,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useHref() may be used only in the context of a <Router> component."
  ) : invariant(!1));
  let {
    basename,
    navigator
  } = React.useContext(NavigationContext), {
    hash,
    pathname,
    search
  } = useResolvedPath(to, {
    relative
  }), joinedPathname = pathname;
  return basename !== "/" && (joinedPathname = pathname === "/" ? basename : joinPaths([basename, pathname])), navigator.createHref({
    pathname: joinedPathname,
    search,
    hash
  });
}
function useInRouterContext() {
  return React.useContext(LocationContext) != null;
}
function useLocation() {
  return useInRouterContext() || (process.env.NODE_ENV !== "production" ? invariant(
    !1,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useLocation() may be used only in the context of a <Router> component."
  ) : invariant(!1)), React.useContext(LocationContext).location;
}
var navigateEffectWarning = "You should call navigate() in a React.useEffect(), not when your component is first rendered.";
function useIsomorphicLayoutEffect(cb) {
  React.useContext(NavigationContext).static || React.useLayoutEffect(cb);
}
function useNavigate() {
  let {
    isDataRoute
  } = React.useContext(RouteContext);
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}
function useNavigateUnstable() {
  useInRouterContext() || (process.env.NODE_ENV !== "production" ? invariant(
    !1,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useNavigate() may be used only in the context of a <Router> component."
  ) : invariant(!1));
  let dataRouterContext = React.useContext(DataRouterContext), {
    basename,
    navigator
  } = React.useContext(NavigationContext), {
    matches
  } = React.useContext(RouteContext), {
    pathname: locationPathname
  } = useLocation(), routePathnamesJson = JSON.stringify(getPathContributingMatches(matches).map((match) => match.pathnameBase)), activeRef = React.useRef(!1);
  return useIsomorphicLayoutEffect(() => {
    activeRef.current = !0;
  }), React.useCallback(function(to, options) {
    if (options === void 0 && (options = {}), process.env.NODE_ENV !== "production" && warning(activeRef.current, navigateEffectWarning), !activeRef.current) return;
    if (typeof to == "number") {
      navigator.go(to);
      return;
    }
    let path = resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, options.relative === "path");
    dataRouterContext == null && basename !== "/" && (path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname])), (options.replace ? navigator.replace : navigator.push)(path, options.state, options);
  }, [basename, navigator, routePathnamesJson, locationPathname, dataRouterContext]);
}
var OutletContext = React.createContext(null);
function useResolvedPath(to, _temp2) {
  let {
    relative
  } = _temp2 === void 0 ? {} : _temp2, {
    matches
  } = React.useContext(RouteContext), {
    pathname: locationPathname
  } = useLocation(), routePathnamesJson = JSON.stringify(getPathContributingMatches(matches).map((match) => match.pathnameBase));
  return React.useMemo(() => resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, relative === "path"), [to, routePathnamesJson, locationPathname, relative]);
}
function DefaultErrorComponent() {
  let error = useRouteError(), message = isRouteErrorResponse(error) ? error.status + " " + error.statusText : error instanceof Error ? error.message : JSON.stringify(error), stack = error instanceof Error ? error.stack : null, lightgrey = "rgba(200,200,200, 0.5)", preStyles = {
    padding: "0.5rem",
    backgroundColor: lightgrey
  }, codeStyles = {
    padding: "2px 4px",
    backgroundColor: lightgrey
  }, devInfo = null;
  return process.env.NODE_ENV !== "production" && (console.error("Error handled by React Router default ErrorBoundary:", error), devInfo = React.createElement(React.Fragment, null, React.createElement("p", null, "\u{1F4BF} Hey developer \u{1F44B}"), React.createElement("p", null, "You can provide a way better UX than this when your app throws errors by providing your own ", React.createElement("code", {
    style: codeStyles
  }, "ErrorBoundary"), " or", " ", React.createElement("code", {
    style: codeStyles
  }, "errorElement"), " prop on your route."))), React.createElement(React.Fragment, null, React.createElement("h2", null, "Unexpected Application Error!"), React.createElement("h3", {
    style: {
      fontStyle: "italic"
    }
  }, message), stack ? React.createElement("pre", {
    style: preStyles
  }, stack) : null, devInfo);
}
var defaultErrorElement = React.createElement(DefaultErrorComponent, null);
var DataRouterHook = (function(DataRouterHook3) {
  return DataRouterHook3.UseBlocker = "useBlocker", DataRouterHook3.UseRevalidator = "useRevalidator", DataRouterHook3.UseNavigateStable = "useNavigate", DataRouterHook3;
})(DataRouterHook || {}), DataRouterStateHook = (function(DataRouterStateHook3) {
  return DataRouterStateHook3.UseBlocker = "useBlocker", DataRouterStateHook3.UseLoaderData = "useLoaderData", DataRouterStateHook3.UseActionData = "useActionData", DataRouterStateHook3.UseRouteError = "useRouteError", DataRouterStateHook3.UseNavigation = "useNavigation", DataRouterStateHook3.UseRouteLoaderData = "useRouteLoaderData", DataRouterStateHook3.UseMatches = "useMatches", DataRouterStateHook3.UseRevalidator = "useRevalidator", DataRouterStateHook3.UseNavigateStable = "useNavigate", DataRouterStateHook3.UseRouteId = "useRouteId", DataRouterStateHook3;
})(DataRouterStateHook || {});
function getDataRouterConsoleError(hookName) {
  return hookName + " must be used within a data router.  See https://reactrouter.com/routers/picking-a-router.";
}
function useDataRouterContext(hookName) {
  let ctx = React.useContext(DataRouterContext);
  return ctx || (process.env.NODE_ENV !== "production" ? invariant(!1, getDataRouterConsoleError(hookName)) : invariant(!1)), ctx;
}
function useDataRouterState(hookName) {
  let state = React.useContext(DataRouterStateContext);
  return state || (process.env.NODE_ENV !== "production" ? invariant(!1, getDataRouterConsoleError(hookName)) : invariant(!1)), state;
}
function useRouteContext(hookName) {
  let route = React.useContext(RouteContext);
  return route || (process.env.NODE_ENV !== "production" ? invariant(!1, getDataRouterConsoleError(hookName)) : invariant(!1)), route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext(hookName), thisRoute = route.matches[route.matches.length - 1];
  return thisRoute.route.id || (process.env.NODE_ENV !== "production" ? invariant(!1, hookName + ' can only be used on routes that contain a unique "id"') : invariant(!1)), thisRoute.route.id;
}
function useRouteId() {
  return useCurrentRouteId(DataRouterStateHook.UseRouteId);
}
function useNavigation() {
  return useDataRouterState(DataRouterStateHook.UseNavigation).navigation;
}
function useMatches() {
  let {
    matches,
    loaderData
  } = useDataRouterState(DataRouterStateHook.UseMatches);
  return React.useMemo(() => matches.map((match) => {
    let {
      pathname,
      params
    } = match;
    return {
      id: match.route.id,
      pathname,
      params,
      data: loaderData[match.route.id],
      handle: match.route.handle
    };
  }), [matches, loaderData]);
}
function useRouteError() {
  var _state$errors;
  let error = React.useContext(RouteErrorContext), state = useDataRouterState(DataRouterStateHook.UseRouteError), routeId = useCurrentRouteId(DataRouterStateHook.UseRouteError);
  return error || ((_state$errors = state.errors) == null ? void 0 : _state$errors[routeId]);
}
function useNavigateStable() {
  let {
    router
  } = useDataRouterContext(DataRouterHook.UseNavigateStable), id = useCurrentRouteId(DataRouterStateHook.UseNavigateStable), activeRef = React.useRef(!1);
  return useIsomorphicLayoutEffect(() => {
    activeRef.current = !0;
  }), React.useCallback(function(to, options) {
    options === void 0 && (options = {}), process.env.NODE_ENV !== "production" && warning(activeRef.current, navigateEffectWarning), activeRef.current && (typeof to == "number" ? router.navigate(to) : router.navigate(to, _extends2({
      fromRouteId: id
    }, options)));
  }, [router, id]);
}
var START_TRANSITION = "startTransition", startTransitionImpl = React[START_TRANSITION];
function Router(_ref5) {
  let {
    basename: basenameProp = "/",
    children = null,
    location: locationProp,
    navigationType = Action.Pop,
    navigator,
    static: staticProp = !1
  } = _ref5;
  useInRouterContext() && (process.env.NODE_ENV !== "production" ? invariant(!1, "You cannot render a <Router> inside another <Router>. You should never have more than one in your app.") : invariant(!1));
  let basename = basenameProp.replace(/^\/*/, "/"), navigationContext = React.useMemo(() => ({
    basename,
    navigator,
    static: staticProp
  }), [basename, navigator, staticProp]);
  typeof locationProp == "string" && (locationProp = parsePath2(locationProp));
  let {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default"
  } = locationProp, locationContext = React.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename);
    return trailingPathname == null ? null : {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key
      },
      navigationType
    };
  }, [basename, pathname, search, hash, state, key, navigationType]);
  return process.env.NODE_ENV !== "production" && warning(locationContext != null, '<Router basename="' + basename + '"> is not able to match the URL ' + ('"' + pathname + search + hash + '" because it does not start with the ') + "basename, so the <Router> won't render anything."), locationContext == null ? null : React.createElement(NavigationContext.Provider, {
    value: navigationContext
  }, React.createElement(LocationContext.Provider, {
    children,
    value: locationContext
  }));
}
var AwaitRenderStatus = (function(AwaitRenderStatus2) {
  return AwaitRenderStatus2[AwaitRenderStatus2.pending = 0] = "pending", AwaitRenderStatus2[AwaitRenderStatus2.success = 1] = "success", AwaitRenderStatus2[AwaitRenderStatus2.error = 2] = "error", AwaitRenderStatus2;
})(AwaitRenderStatus || {}), neverSettledPromise = new Promise(() => {
});

// ../node_modules/react-router-dom/dist/index.js
function _extends3() {
  return _extends3 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends3.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {}, sourceKeys = Object.keys(source), key, i;
  for (i = 0; i < sourceKeys.length; i++)
    key = sourceKeys[i], !(excluded.indexOf(key) >= 0) && (target[key] = source[key]);
  return target;
}
var defaultMethod = "get", defaultEncType = "application/x-www-form-urlencoded";
function isHtmlElement(object) {
  return object != null && typeof object.tagName == "string";
}
function isButtonElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "button";
}
function isFormElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "form";
}
function isInputElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "input";
}
function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
function shouldProcessLinkClick(event, target) {
  return event.button === 0 && // Ignore everything but left clicks
  (!target || target === "_self") && // Let browser handle "target=_blank" etc.
  !isModifiedEvent(event);
}
var _formDataSupportsSubmitter = null;
function isFormDataSubmitterSupported() {
  if (_formDataSupportsSubmitter === null)
    try {
      new FormData(
        document.createElement("form"),
        // @ts-expect-error if FormData supports the submitter parameter, this will throw
        0
      ), _formDataSupportsSubmitter = !1;
    } catch {
      _formDataSupportsSubmitter = !0;
    }
  return _formDataSupportsSubmitter;
}
var supportedFormEncTypes = /* @__PURE__ */ new Set(["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"]);
function getFormEncType(encType) {
  return encType != null && !supportedFormEncTypes.has(encType) ? (process.env.NODE_ENV !== "production" && warning(!1, '"' + encType + '" is not a valid `encType` for `<Form>`/`<fetcher.Form>` ' + ('and will default to "' + defaultEncType + '"')), null) : encType;
}
function getFormSubmissionInfo(target, basename) {
  let method, action, encType, formData, body;
  if (isFormElement(target)) {
    let attr = target.getAttribute("action");
    action = attr ? stripBasename(attr, basename) : null, method = target.getAttribute("method") || defaultMethod, encType = getFormEncType(target.getAttribute("enctype")) || defaultEncType, formData = new FormData(target);
  } else if (isButtonElement(target) || isInputElement(target) && (target.type === "submit" || target.type === "image")) {
    let form = target.form;
    if (form == null)
      throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');
    let attr = target.getAttribute("formaction") || form.getAttribute("action");
    if (action = attr ? stripBasename(attr, basename) : null, method = target.getAttribute("formmethod") || form.getAttribute("method") || defaultMethod, encType = getFormEncType(target.getAttribute("formenctype")) || getFormEncType(form.getAttribute("enctype")) || defaultEncType, formData = new FormData(form, target), !isFormDataSubmitterSupported()) {
      let {
        name,
        type,
        value
      } = target;
      if (type === "image") {
        let prefix = name ? name + "." : "";
        formData.append(prefix + "x", "0"), formData.append(prefix + "y", "0");
      } else name && formData.append(name, value);
    }
  } else {
    if (isHtmlElement(target))
      throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');
    method = defaultMethod, action = null, encType = defaultEncType, body = target;
  }
  return formData && encType === "text/plain" && (body = formData, formData = void 0), {
    action,
    method: method.toLowerCase(),
    encType,
    formData,
    body
  };
}
var _excluded = ["onClick", "relative", "reloadDocument", "replace", "state", "target", "to", "preventScrollReset"], _excluded2 = ["aria-current", "caseSensitive", "className", "end", "style", "to", "children"], _excluded3 = ["reloadDocument", "replace", "state", "method", "action", "onSubmit", "submit", "relative", "preventScrollReset"];
var START_TRANSITION2 = "startTransition", startTransitionImpl2 = React2[START_TRANSITION2];
function BrowserRouter(_ref) {
  let {
    basename,
    children,
    future,
    window: window2
  } = _ref, historyRef = React2.useRef();
  historyRef.current == null && (historyRef.current = createBrowserHistory({
    window: window2,
    v5Compat: !0
  }));
  let history = historyRef.current, [state, setStateImpl] = React2.useState({
    action: history.action,
    location: history.location
  }), {
    v7_startTransition
  } = future || {}, setState = React2.useCallback((newState) => {
    v7_startTransition && startTransitionImpl2 ? startTransitionImpl2(() => setStateImpl(newState)) : setStateImpl(newState);
  }, [setStateImpl, v7_startTransition]);
  return React2.useLayoutEffect(() => history.listen(setState), [history, setState]), React2.createElement(Router, {
    basename,
    children,
    location: state.location,
    navigationType: state.action,
    navigator: history
  });
}
function HistoryRouter(_ref3) {
  let {
    basename,
    children,
    future,
    history
  } = _ref3, [state, setStateImpl] = React2.useState({
    action: history.action,
    location: history.location
  }), {
    v7_startTransition
  } = future || {}, setState = React2.useCallback((newState) => {
    v7_startTransition && startTransitionImpl2 ? startTransitionImpl2(() => setStateImpl(newState)) : setStateImpl(newState);
  }, [setStateImpl, v7_startTransition]);
  return React2.useLayoutEffect(() => history.listen(setState), [history, setState]), React2.createElement(Router, {
    basename,
    children,
    location: state.location,
    navigationType: state.action,
    navigator: history
  });
}
process.env.NODE_ENV !== "production" && (HistoryRouter.displayName = "unstable_HistoryRouter");
var isBrowser = typeof window < "u" && typeof window.document < "u" && typeof window.document.createElement < "u", ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i, Link = React2.forwardRef(function(_ref4, ref) {
  let {
    onClick,
    relative,
    reloadDocument,
    replace,
    state,
    target,
    to,
    preventScrollReset
  } = _ref4, rest = _objectWithoutPropertiesLoose(_ref4, _excluded), {
    basename
  } = React2.useContext(NavigationContext), absoluteHref, isExternal = !1;
  if (typeof to == "string" && ABSOLUTE_URL_REGEX.test(to) && (absoluteHref = to, isBrowser))
    try {
      let currentUrl = new URL(window.location.href), targetUrl = to.startsWith("//") ? new URL(currentUrl.protocol + to) : new URL(to), path = stripBasename(targetUrl.pathname, basename);
      targetUrl.origin === currentUrl.origin && path != null ? to = path + targetUrl.search + targetUrl.hash : isExternal = !0;
    } catch {
      process.env.NODE_ENV !== "production" && warning(!1, '<Link to="' + to + '"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.');
    }
  let href = useHref(to, {
    relative
  }), internalOnClick = useLinkClickHandler(to, {
    replace,
    state,
    target,
    preventScrollReset,
    relative
  });
  function handleClick(event) {
    onClick && onClick(event), event.defaultPrevented || internalOnClick(event);
  }
  return (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    React2.createElement("a", _extends3({}, rest, {
      href: absoluteHref || href,
      onClick: isExternal || reloadDocument ? onClick : handleClick,
      ref,
      target
    }))
  );
});
process.env.NODE_ENV !== "production" && (Link.displayName = "Link");
var NavLink = React2.forwardRef(function(_ref5, ref) {
  let {
    "aria-current": ariaCurrentProp = "page",
    caseSensitive = !1,
    className: classNameProp = "",
    end = !1,
    style: styleProp,
    to,
    children
  } = _ref5, rest = _objectWithoutPropertiesLoose(_ref5, _excluded2), path = useResolvedPath(to, {
    relative: rest.relative
  }), location = useLocation(), routerState = React2.useContext(DataRouterStateContext), {
    navigator
  } = React2.useContext(NavigationContext), toPathname = navigator.encodeLocation ? navigator.encodeLocation(path).pathname : path.pathname, locationPathname = location.pathname, nextLocationPathname = routerState && routerState.navigation && routerState.navigation.location ? routerState.navigation.location.pathname : null;
  caseSensitive || (locationPathname = locationPathname.toLowerCase(), nextLocationPathname = nextLocationPathname ? nextLocationPathname.toLowerCase() : null, toPathname = toPathname.toLowerCase());
  let isActive = locationPathname === toPathname || !end && locationPathname.startsWith(toPathname) && locationPathname.charAt(toPathname.length) === "/", isPending = nextLocationPathname != null && (nextLocationPathname === toPathname || !end && nextLocationPathname.startsWith(toPathname) && nextLocationPathname.charAt(toPathname.length) === "/"), ariaCurrent = isActive ? ariaCurrentProp : void 0, className;
  typeof classNameProp == "function" ? className = classNameProp({
    isActive,
    isPending
  }) : className = [classNameProp, isActive ? "active" : null, isPending ? "pending" : null].filter(Boolean).join(" ");
  let style = typeof styleProp == "function" ? styleProp({
    isActive,
    isPending
  }) : styleProp;
  return React2.createElement(Link, _extends3({}, rest, {
    "aria-current": ariaCurrent,
    className,
    ref,
    style,
    to
  }), typeof children == "function" ? children({
    isActive,
    isPending
  }) : children);
});
process.env.NODE_ENV !== "production" && (NavLink.displayName = "NavLink");
var Form = React2.forwardRef((props, ref) => {
  let submit = useSubmit();
  return React2.createElement(FormImpl, _extends3({}, props, {
    submit,
    ref
  }));
});
process.env.NODE_ENV !== "production" && (Form.displayName = "Form");
var FormImpl = React2.forwardRef((_ref6, forwardedRef) => {
  let {
    reloadDocument,
    replace,
    state,
    method = defaultMethod,
    action,
    onSubmit,
    submit,
    relative,
    preventScrollReset
  } = _ref6, props = _objectWithoutPropertiesLoose(_ref6, _excluded3), formMethod = method.toLowerCase() === "get" ? "get" : "post", formAction = useFormAction(action, {
    relative
  });
  return React2.createElement("form", _extends3({
    ref: forwardedRef,
    method: formMethod,
    action: formAction,
    onSubmit: reloadDocument ? onSubmit : (event) => {
      if (onSubmit && onSubmit(event), event.defaultPrevented) return;
      event.preventDefault();
      let submitter = event.nativeEvent.submitter, submitMethod = submitter?.getAttribute("formmethod") || method;
      submit(submitter || event.currentTarget, {
        method: submitMethod,
        replace,
        state,
        relative,
        preventScrollReset
      });
    }
  }, props));
});
process.env.NODE_ENV !== "production" && (FormImpl.displayName = "FormImpl");
function ScrollRestoration(_ref7) {
  let {
    getKey,
    storageKey
  } = _ref7;
  return useScrollRestoration({
    getKey,
    storageKey
  }), null;
}
process.env.NODE_ENV !== "production" && (ScrollRestoration.displayName = "ScrollRestoration");
var DataRouterHook2;
(function(DataRouterHook3) {
  DataRouterHook3.UseScrollRestoration = "useScrollRestoration", DataRouterHook3.UseSubmit = "useSubmit", DataRouterHook3.UseSubmitFetcher = "useSubmitFetcher", DataRouterHook3.UseFetcher = "useFetcher";
})(DataRouterHook2 || (DataRouterHook2 = {}));
var DataRouterStateHook2;
(function(DataRouterStateHook3) {
  DataRouterStateHook3.UseFetchers = "useFetchers", DataRouterStateHook3.UseScrollRestoration = "useScrollRestoration";
})(DataRouterStateHook2 || (DataRouterStateHook2 = {}));
function getDataRouterConsoleError2(hookName) {
  return hookName + " must be used within a data router.  See https://reactrouter.com/routers/picking-a-router.";
}
function useDataRouterContext2(hookName) {
  let ctx = React2.useContext(DataRouterContext);
  return ctx || (process.env.NODE_ENV !== "production" ? invariant(!1, getDataRouterConsoleError2(hookName)) : invariant(!1)), ctx;
}
function useDataRouterState2(hookName) {
  let state = React2.useContext(DataRouterStateContext);
  return state || (process.env.NODE_ENV !== "production" ? invariant(!1, getDataRouterConsoleError2(hookName)) : invariant(!1)), state;
}
function useLinkClickHandler(to, _temp) {
  let {
    target,
    replace: replaceProp,
    state,
    preventScrollReset,
    relative
  } = _temp === void 0 ? {} : _temp, navigate = useNavigate(), location = useLocation(), path = useResolvedPath(to, {
    relative
  });
  return React2.useCallback((event) => {
    if (shouldProcessLinkClick(event, target)) {
      event.preventDefault();
      let replace = replaceProp !== void 0 ? replaceProp : createPath(location) === createPath(path);
      navigate(to, {
        replace,
        state,
        preventScrollReset,
        relative
      });
    }
  }, [location, navigate, path, replaceProp, state, target, to, preventScrollReset, relative]);
}
function validateClientSideSubmission() {
  if (typeof document > "u")
    throw new Error("You are calling submit during the server render. Try calling submit within a `useEffect` or callback instead.");
}
function useSubmit() {
  let {
    router
  } = useDataRouterContext2(DataRouterHook2.UseSubmit), {
    basename
  } = React2.useContext(NavigationContext), currentRouteId = useRouteId();
  return React2.useCallback(function(target, options) {
    options === void 0 && (options = {}), validateClientSideSubmission();
    let {
      action,
      method,
      encType,
      formData,
      body
    } = getFormSubmissionInfo(target, basename);
    router.navigate(options.action || action, {
      preventScrollReset: options.preventScrollReset,
      formData,
      body,
      formMethod: options.method || method,
      formEncType: options.encType || encType,
      replace: options.replace,
      state: options.state,
      fromRouteId: currentRouteId
    });
  }, [router, basename, currentRouteId]);
}
function useFormAction(action, _temp2) {
  let {
    relative
  } = _temp2 === void 0 ? {} : _temp2, {
    basename
  } = React2.useContext(NavigationContext), routeContext = React2.useContext(RouteContext);
  routeContext || (process.env.NODE_ENV !== "production" ? invariant(!1, "useFormAction must be used inside a RouteContext") : invariant(!1));
  let [match] = routeContext.matches.slice(-1), path = _extends3({}, useResolvedPath(action || ".", {
    relative
  })), location = useLocation();
  if (action == null && (path.search = location.search, match.route.index)) {
    let params = new URLSearchParams(path.search);
    params.delete("index"), path.search = params.toString() ? "?" + params.toString() : "";
  }
  return (!action || action === ".") && match.route.index && (path.search = path.search ? path.search.replace(/^\?/, "?index&") : "?index"), basename !== "/" && (path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname])), createPath(path);
}
var SCROLL_RESTORATION_STORAGE_KEY = "react-router-scroll-positions", savedScrollPositions = {};
function useScrollRestoration(_temp3) {
  let {
    getKey,
    storageKey
  } = _temp3 === void 0 ? {} : _temp3, {
    router
  } = useDataRouterContext2(DataRouterHook2.UseScrollRestoration), {
    restoreScrollPosition,
    preventScrollReset
  } = useDataRouterState2(DataRouterStateHook2.UseScrollRestoration), {
    basename
  } = React2.useContext(NavigationContext), location = useLocation(), matches = useMatches(), navigation = useNavigation();
  React2.useEffect(() => (window.history.scrollRestoration = "manual", () => {
    window.history.scrollRestoration = "auto";
  }), []), usePageHide(React2.useCallback(() => {
    if (navigation.state === "idle") {
      let key = (getKey ? getKey(location, matches) : null) || location.key;
      savedScrollPositions[key] = window.scrollY;
    }
    sessionStorage.setItem(storageKey || SCROLL_RESTORATION_STORAGE_KEY, JSON.stringify(savedScrollPositions)), window.history.scrollRestoration = "auto";
  }, [storageKey, getKey, navigation.state, location, matches])), typeof document < "u" && (React2.useLayoutEffect(() => {
    try {
      let sessionPositions = sessionStorage.getItem(storageKey || SCROLL_RESTORATION_STORAGE_KEY);
      sessionPositions && (savedScrollPositions = JSON.parse(sessionPositions));
    } catch {
    }
  }, [storageKey]), React2.useLayoutEffect(() => {
    let getKeyWithoutBasename = getKey && basename !== "/" ? (location2, matches2) => getKey(
      // Strip the basename to match useLocation()
      _extends3({}, location2, {
        pathname: stripBasename(location2.pathname, basename) || location2.pathname
      }),
      matches2
    ) : getKey, disableScrollRestoration = router?.enableScrollRestoration(savedScrollPositions, () => window.scrollY, getKeyWithoutBasename);
    return () => disableScrollRestoration && disableScrollRestoration();
  }, [router, basename, getKey]), React2.useLayoutEffect(() => {
    if (restoreScrollPosition !== !1) {
      if (typeof restoreScrollPosition == "number") {
        window.scrollTo(0, restoreScrollPosition);
        return;
      }
      if (location.hash) {
        let el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (el) {
          el.scrollIntoView();
          return;
        }
      }
      preventScrollReset !== !0 && window.scrollTo(0, 0);
    }
  }, [location, restoreScrollPosition, preventScrollReset]));
}
function usePageHide(callback, options) {
  let {
    capture
  } = options || {};
  React2.useEffect(() => {
    let opts = capture != null ? {
      capture
    } : void 0;
    return window.addEventListener("pagehide", callback, opts), () => {
      window.removeEventListener("pagehide", callback, opts);
    };
  }, [callback, capture]);
}

// src/router/router.tsx
var { document: document2 } = global, getBase = () => `${document2.location.pathname}?`, useNavigate2 = () => {
  let navigate = useNavigate();
  return useCallback3((to, { plain, ...options } = {}) => {
    if (typeof to == "string" && to.startsWith("#")) {
      to === "#" ? navigate(document2.location.search) : document2.location.hash = to;
      return;
    }
    if (typeof to == "string") {
      let target = plain ? to : `?path=${to}`;
      return navigate(target, options);
    }
    if (typeof to == "number")
      return navigate(to);
  }, []);
}, Link2 = ({ to, children, ...rest }) => React3.createElement(Link, { to: `${getBase()}path=${to}`, ...rest }, children);
Link2.displayName = "QueryLink";
var Location = ({ children }) => {
  let location = useLocation(), { path, singleStory } = queryFromLocation(location), { viewMode, storyId, refId } = parsePath(path);
  return React3.createElement(React3.Fragment, null, children({
    path: path || "/",
    location,
    viewMode,
    storyId,
    refId,
    singleStory: singleStory === "true"
  }));
};
Location.displayName = "QueryLocation";
function Match({
  children,
  path: targetPath,
  startsWith = !1
}) {
  return React3.createElement(Location, null, ({ path: urlPath, ...rest }) => children({
    match: getMatch(urlPath, targetPath, startsWith),
    ...rest
  }));
}
Match.displayName = "QueryMatch";
function Route2(input) {
  let { children, ...rest } = input;
  return rest.startsWith === void 0 && (rest.startsWith = !1), React3.createElement(Match, { ...rest }, ({ match }) => match ? children : null);
}
Route2.displayName = "Route";
var LocationProvider = (...args) => BrowserRouter(...args), BaseLocationProvider = (...args) => Router(...args);
export {
  BaseLocationProvider,
  DEEPLY_EQUAL,
  Link2 as Link,
  Location,
  LocationProvider,
  Match,
  Route2 as Route,
  buildArgsParam,
  deepDiff,
  getMatch,
  parsePath,
  queryFromLocation,
  stringifyQuery,
  useNavigate2 as useNavigate
};
