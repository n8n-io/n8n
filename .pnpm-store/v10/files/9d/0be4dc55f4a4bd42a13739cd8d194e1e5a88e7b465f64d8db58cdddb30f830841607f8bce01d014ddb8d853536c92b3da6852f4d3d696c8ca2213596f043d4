var createObject = Object.create;
function createMap() {
    var map = createObject(null);
    map["__"] = undefined;
    delete map["__"];
    return map;
}

var Target = function Target(path, matcher, delegate) {
    this.path = path;
    this.matcher = matcher;
    this.delegate = delegate;
};
Target.prototype.to = function to (target, callback) {
    var delegate = this.delegate;
    if (delegate && delegate.willAddRoute) {
        target = delegate.willAddRoute(this.matcher.target, target);
    }
    this.matcher.add(this.path, target);
    if (callback) {
        if (callback.length === 0) {
            throw new Error("You must have an argument in the function passed to `to`");
        }
        this.matcher.addChild(this.path, target, callback, this.delegate);
    }
};
var Matcher = function Matcher(target) {
    this.routes = createMap();
    this.children = createMap();
    this.target = target;
};
Matcher.prototype.add = function add (path, target) {
    this.routes[path] = target;
};
Matcher.prototype.addChild = function addChild (path, target, callback, delegate) {
    var matcher = new Matcher(target);
    this.children[path] = matcher;
    var match = generateMatch(path, matcher, delegate);
    if (delegate && delegate.contextEntered) {
        delegate.contextEntered(target, match);
    }
    callback(match);
};
function generateMatch(startingPath, matcher, delegate) {
    function match(path, callback) {
        var fullPath = startingPath + path;
        if (callback) {
            callback(generateMatch(fullPath, matcher, delegate));
        }
        else {
            return new Target(fullPath, matcher, delegate);
        }
    }
    
    return match;
}
function addRoute(routeArray, path, handler) {
    var len = 0;
    for (var i = 0; i < routeArray.length; i++) {
        len += routeArray[i].path.length;
    }
    path = path.substr(len);
    var route = { path: path, handler: handler };
    routeArray.push(route);
}
function eachRoute(baseRoute, matcher, callback, binding) {
    var routes = matcher.routes;
    var paths = Object.keys(routes);
    for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        var routeArray = baseRoute.slice();
        addRoute(routeArray, path, routes[path]);
        var nested = matcher.children[path];
        if (nested) {
            eachRoute(routeArray, nested, callback, binding);
        }
        else {
            callback.call(binding, routeArray);
        }
    }
}
var map = function (callback, addRouteCallback) {
    var matcher = new Matcher();
    callback(generateMatch("", matcher, this.delegate));
    eachRoute([], matcher, function (routes) {
        if (addRouteCallback) {
            addRouteCallback(this, routes);
        }
        else {
            this.add(routes);
        }
    }, this);
};

// Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
// values that are not reserved (i.e., unicode characters, emoji, etc). The reserved
// chars are "/" and "%".
// Safe to call multiple times on the same path.
// Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
function normalizePath(path) {
    return path.split("/")
        .map(normalizeSegment)
        .join("/");
}
// We want to ensure the characters "%" and "/" remain in percent-encoded
// form when normalizing paths, so replace them with their encoded form after
// decoding the rest of the path
var SEGMENT_RESERVED_CHARS = /%|\//g;
function normalizeSegment(segment) {
    if (segment.length < 3 || segment.indexOf("%") === -1)
        { return segment; }
    return decodeURIComponent(segment).replace(SEGMENT_RESERVED_CHARS, encodeURIComponent);
}
// We do not want to encode these characters when generating dynamic path segments
// See https://tools.ietf.org/html/rfc3986#section-3.3
// sub-delims: "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
// others allowed by RFC 3986: ":", "@"
//
// First encode the entire path segment, then decode any of the encoded special chars.
//
// The chars "!", "'", "(", ")", "*" do not get changed by `encodeURIComponent`,
// so the possible encoded chars are:
// ['%24', '%26', '%2B', '%2C', '%3B', '%3D', '%3A', '%40'].
var PATH_SEGMENT_ENCODINGS = /%(?:2(?:4|6|B|C)|3(?:B|D|A)|40)/g;
function encodePathSegment(str) {
    return encodeURIComponent(str).replace(PATH_SEGMENT_ENCODINGS, decodeURIComponent);
}

var escapeRegex = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
var isArray = Array.isArray;
var hasOwnProperty = Object.prototype.hasOwnProperty;
function getParam(params, key) {
    if (typeof params !== "object" || params === null) {
        throw new Error("You must pass an object as the second argument to `generate`.");
    }
    if (!hasOwnProperty.call(params, key)) {
        throw new Error("You must provide param `" + key + "` to `generate`.");
    }
    var value = params[key];
    var str = typeof value === "string" ? value : "" + value;
    if (str.length === 0) {
        throw new Error("You must provide a param `" + key + "`.");
    }
    return str;
}
var eachChar = [];
eachChar[0 /* Static */] = function (segment, currentState) {
    var state = currentState;
    var value = segment.value;
    for (var i = 0; i < value.length; i++) {
        var ch = value.charCodeAt(i);
        state = state.put(ch, false, false);
    }
    return state;
};
eachChar[1 /* Dynamic */] = function (_, currentState) {
    return currentState.put(47 /* SLASH */, true, true);
};
eachChar[2 /* Star */] = function (_, currentState) {
    return currentState.put(-1 /* ANY */, false, true);
};
eachChar[4 /* Epsilon */] = function (_, currentState) {
    return currentState;
};
var regex = [];
regex[0 /* Static */] = function (segment) {
    return segment.value.replace(escapeRegex, "\\$1");
};
regex[1 /* Dynamic */] = function () {
    return "([^/]+)";
};
regex[2 /* Star */] = function () {
    return "(.+)";
};
regex[4 /* Epsilon */] = function () {
    return "";
};
var generate = [];
generate[0 /* Static */] = function (segment) {
    return segment.value;
};
generate[1 /* Dynamic */] = function (segment, params) {
    var value = getParam(params, segment.value);
    if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
        return encodePathSegment(value);
    }
    else {
        return value;
    }
};
generate[2 /* Star */] = function (segment, params) {
    return getParam(params, segment.value);
};
generate[4 /* Epsilon */] = function () {
    return "";
};
var EmptyObject = Object.freeze({});
var EmptyArray = Object.freeze([]);
// The `names` will be populated with the paramter name for each dynamic/star
// segment. `shouldDecodes` will be populated with a boolean for each dyanamic/star
// segment, indicating whether it should be decoded during recognition.
function parse(segments, route, types) {
    // normalize route as not starting with a "/". Recognition will
    // also normalize.
    if (route.length > 0 && route.charCodeAt(0) === 47 /* SLASH */) {
        route = route.substr(1);
    }
    var parts = route.split("/");
    var names = undefined;
    var shouldDecodes = undefined;
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var flags = 0;
        var type = 0;
        if (part === "") {
            type = 4 /* Epsilon */;
        }
        else if (part.charCodeAt(0) === 58 /* COLON */) {
            type = 1 /* Dynamic */;
        }
        else if (part.charCodeAt(0) === 42 /* STAR */) {
            type = 2 /* Star */;
        }
        else {
            type = 0 /* Static */;
        }
        flags = 2 << type;
        if (flags & 12 /* Named */) {
            part = part.slice(1);
            names = names || [];
            names.push(part);
            shouldDecodes = shouldDecodes || [];
            shouldDecodes.push((flags & 4 /* Decoded */) !== 0);
        }
        if (flags & 14 /* Counted */) {
            types[type]++;
        }
        segments.push({
            type: type,
            value: normalizeSegment(part)
        });
    }
    return {
        names: names || EmptyArray,
        shouldDecodes: shouldDecodes || EmptyArray,
    };
}
function isEqualCharSpec(spec, char, negate) {
    return spec.char === char && spec.negate === negate;
}
// A State has a character specification and (`charSpec`) and a list of possible
// subsequent states (`nextStates`).
//
// If a State is an accepting state, it will also have several additional
// properties:
//
// * `regex`: A regular expression that is used to extract parameters from paths
//   that reached this accepting state.
// * `handlers`: Information on how to convert the list of captures into calls
//   to registered handlers with the specified parameters
// * `types`: How many static, dynamic or star segments in this route. Used to
//   decide which route to use if multiple registered routes match a path.
//
// Currently, State is implemented naively by looping over `nextStates` and
// comparing a character specification against a character. A more efficient
// implementation would use a hash of keys pointing at one or more next states.
var State = function State(states, id, char, negate, repeat) {
    this.states = states;
    this.id = id;
    this.char = char;
    this.negate = negate;
    this.nextStates = repeat ? id : null;
    this.pattern = "";
    this._regex = undefined;
    this.handlers = undefined;
    this.types = undefined;
};
State.prototype.regex = function regex$1 () {
    if (!this._regex) {
        this._regex = new RegExp(this.pattern);
    }
    return this._regex;
};
State.prototype.get = function get (char, negate) {
        var this$1 = this;

    var nextStates = this.nextStates;
    if (nextStates === null)
        { return; }
    if (isArray(nextStates)) {
        for (var i = 0; i < nextStates.length; i++) {
            var child = this$1.states[nextStates[i]];
            if (isEqualCharSpec(child, char, negate)) {
                return child;
            }
        }
    }
    else {
        var child$1 = this.states[nextStates];
        if (isEqualCharSpec(child$1, char, negate)) {
            return child$1;
        }
    }
};
State.prototype.put = function put (char, negate, repeat) {
    var state;
    // If the character specification already exists in a child of the current
    // state, just return that state.
    if (state = this.get(char, negate)) {
        return state;
    }
    // Make a new state for the character spec
    var states = this.states;
    state = new State(states, states.length, char, negate, repeat);
    states[states.length] = state;
    // Insert the new state as a child of the current state
    if (this.nextStates == null) {
        this.nextStates = state.id;
    }
    else if (isArray(this.nextStates)) {
        this.nextStates.push(state.id);
    }
    else {
        this.nextStates = [this.nextStates, state.id];
    }
    // Return the new state
    return state;
};
// Find a list of child states matching the next character
State.prototype.match = function match (ch) {
        var this$1 = this;

    var nextStates = this.nextStates;
    if (!nextStates)
        { return []; }
    var returned = [];
    if (isArray(nextStates)) {
        for (var i = 0; i < nextStates.length; i++) {
            var child = this$1.states[nextStates[i]];
            if (isMatch(child, ch)) {
                returned.push(child);
            }
        }
    }
    else {
        var child$1 = this.states[nextStates];
        if (isMatch(child$1, ch)) {
            returned.push(child$1);
        }
    }
    return returned;
};
function isMatch(spec, char) {
    return spec.negate ? spec.char !== char && spec.char !== -1 /* ANY */ : spec.char === char || spec.char === -1 /* ANY */;
}
// This is a somewhat naive strategy, but should work in a lot of cases
// A better strategy would properly resolve /posts/:id/new and /posts/edit/:id.
//
// This strategy generally prefers more static and less dynamic matching.
// Specifically, it
//
//  * prefers fewer stars to more, then
//  * prefers using stars for less of the match to more, then
//  * prefers fewer dynamic segments to more, then
//  * prefers more static segments to more
function sortSolutions(states) {
    return states.sort(function (a, b) {
        var ref = a.types || [0, 0, 0];
        var astatics = ref[0];
        var adynamics = ref[1];
        var astars = ref[2];
        var ref$1 = b.types || [0, 0, 0];
        var bstatics = ref$1[0];
        var bdynamics = ref$1[1];
        var bstars = ref$1[2];
        if (astars !== bstars) {
            return astars - bstars;
        }
        if (astars) {
            if (astatics !== bstatics) {
                return bstatics - astatics;
            }
            if (adynamics !== bdynamics) {
                return bdynamics - adynamics;
            }
        }
        if (adynamics !== bdynamics) {
            return adynamics - bdynamics;
        }
        if (astatics !== bstatics) {
            return bstatics - astatics;
        }
        return 0;
    });
}
function recognizeChar(states, ch) {
    var nextStates = [];
    for (var i = 0, l = states.length; i < l; i++) {
        var state = states[i];
        nextStates = nextStates.concat(state.match(ch));
    }
    return nextStates;
}
var RecognizeResults = function RecognizeResults(queryParams) {
    this.length = 0;
    this.queryParams = queryParams || {};
};

RecognizeResults.prototype.splice = Array.prototype.splice;
RecognizeResults.prototype.slice = Array.prototype.slice;
RecognizeResults.prototype.push = Array.prototype.push;
function findHandler(state, originalPath, queryParams) {
    var handlers = state.handlers;
    var regex = state.regex();
    if (!regex || !handlers)
        { throw new Error("state not initialized"); }
    var captures = originalPath.match(regex);
    var currentCapture = 1;
    var result = new RecognizeResults(queryParams);
    result.length = handlers.length;
    for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        var names = handler.names;
        var shouldDecodes = handler.shouldDecodes;
        var params = EmptyObject;
        var isDynamic = false;
        if (names !== EmptyArray && shouldDecodes !== EmptyArray) {
            for (var j = 0; j < names.length; j++) {
                isDynamic = true;
                var name = names[j];
                var capture = captures && captures[currentCapture++];
                if (params === EmptyObject) {
                    params = {};
                }
                if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS && shouldDecodes[j]) {
                    params[name] = capture && decodeURIComponent(capture);
                }
                else {
                    params[name] = capture;
                }
            }
        }
        result[i] = {
            handler: handler.handler,
            params: params,
            isDynamic: isDynamic
        };
    }
    return result;
}
function decodeQueryParamPart(part) {
    // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
    part = part.replace(/\+/gm, "%20");
    var result;
    try {
        result = decodeURIComponent(part);
    }
    catch (error) {
        result = "";
    }
    return result;
}
var RouteRecognizer = function RouteRecognizer() {
    this.names = createMap();
    var states = [];
    var state = new State(states, 0, -1 /* ANY */, true, false);
    states[0] = state;
    this.states = states;
    this.rootState = state;
};
RouteRecognizer.prototype.add = function add (routes, options) {
    var currentState = this.rootState;
    var pattern = "^";
    var types = [0, 0, 0];
    var handlers = new Array(routes.length);
    var allSegments = [];
    var isEmpty = true;
    var j = 0;
    for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        var ref = parse(allSegments, route.path, types);
            var names = ref.names;
            var shouldDecodes = ref.shouldDecodes;
        // preserve j so it points to the start of newly added segments
        for (; j < allSegments.length; j++) {
            var segment = allSegments[j];
            if (segment.type === 4 /* Epsilon */) {
                continue;
            }
            isEmpty = false;
            // Add a "/" for the new segment
            currentState = currentState.put(47 /* SLASH */, false, false);
            pattern += "/";
            // Add a representation of the segment to the NFA and regex
            currentState = eachChar[segment.type](segment, currentState);
            pattern += regex[segment.type](segment);
        }
        handlers[i] = {
            handler: route.handler,
            names: names,
            shouldDecodes: shouldDecodes
        };
    }
    if (isEmpty) {
        currentState = currentState.put(47 /* SLASH */, false, false);
        pattern += "/";
    }
    currentState.handlers = handlers;
    currentState.pattern = pattern + "$";
    currentState.types = types;
    var name;
    if (typeof options === "object" && options !== null && options.as) {
        name = options.as;
    }
    if (name) {
        // if (this.names[name]) {
        //   throw new Error("You may not add a duplicate route named `" + name + "`.");
        // }
        this.names[name] = {
            segments: allSegments,
            handlers: handlers
        };
    }
};
RouteRecognizer.prototype.handlersFor = function handlersFor (name) {
    var route = this.names[name];
    if (!route) {
        throw new Error("There is no route named " + name);
    }
    var result = new Array(route.handlers.length);
    for (var i = 0; i < route.handlers.length; i++) {
        var handler = route.handlers[i];
        result[i] = handler;
    }
    return result;
};
RouteRecognizer.prototype.hasRoute = function hasRoute (name) {
    return !!this.names[name];
};
RouteRecognizer.prototype.generate = function generate$1 (name, params) {
    var route = this.names[name];
    var output = "";
    if (!route) {
        throw new Error("There is no route named " + name);
    }
    var segments = route.segments;
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment.type === 4 /* Epsilon */) {
            continue;
        }
        output += "/";
        output += generate[segment.type](segment, params);
    }
    if (output.charAt(0) !== "/") {
        output = "/" + output;
    }
    if (params && params.queryParams) {
        output += this.generateQueryString(params.queryParams);
    }
    return output;
};
RouteRecognizer.prototype.generateQueryString = function generateQueryString (params) {
    var pairs = [];
    var keys = Object.keys(params);
    keys.sort();
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = params[key];
        if (value == null) {
            continue;
        }
        var pair = encodeURIComponent(key);
        if (isArray(value)) {
            for (var j = 0; j < value.length; j++) {
                var arrayPair = key + "[]" + "=" + encodeURIComponent(value[j]);
                pairs.push(arrayPair);
            }
        }
        else {
            pair += "=" + encodeURIComponent(value);
            pairs.push(pair);
        }
    }
    if (pairs.length === 0) {
        return "";
    }
    return "?" + pairs.join("&");
};
RouteRecognizer.prototype.parseQueryString = function parseQueryString (queryString) {
    var pairs = queryString.split("&");
    var queryParams = {};
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("="), key = decodeQueryParamPart(pair[0]), keyLength = key.length, isArray = false, value = (void 0);
        if (pair.length === 1) {
            value = "true";
        }
        else {
            // Handle arrays
            if (keyLength > 2 && key.slice(keyLength - 2) === "[]") {
                isArray = true;
                key = key.slice(0, keyLength - 2);
                if (!queryParams[key]) {
                    queryParams[key] = [];
                }
            }
            value = pair[1] ? decodeQueryParamPart(pair[1]) : "";
        }
        if (isArray) {
            queryParams[key].push(value);
        }
        else {
            queryParams[key] = value;
        }
    }
    return queryParams;
};
RouteRecognizer.prototype.recognize = function recognize (path) {
    var results;
    var states = [this.rootState];
    var queryParams = {};
    var isSlashDropped = false;
    var hashStart = path.indexOf("#");
    if (hashStart !== -1) {
        path = path.substr(0, hashStart);
    }
    var queryStart = path.indexOf("?");
    if (queryStart !== -1) {
        var queryString = path.substr(queryStart + 1, path.length);
        path = path.substr(0, queryStart);
        queryParams = this.parseQueryString(queryString);
    }
    if (path.charAt(0) !== "/") {
        path = "/" + path;
    }
    var originalPath = path;
    if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
        path = normalizePath(path);
    }
    else {
        path = decodeURI(path);
        originalPath = decodeURI(originalPath);
    }
    var pathLen = path.length;
    if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
        path = path.substr(0, pathLen - 1);
        originalPath = originalPath.substr(0, originalPath.length - 1);
        isSlashDropped = true;
    }
    for (var i = 0; i < path.length; i++) {
        states = recognizeChar(states, path.charCodeAt(i));
        if (!states.length) {
            break;
        }
    }
    var solutions = [];
    for (var i$1 = 0; i$1 < states.length; i$1++) {
        if (states[i$1].handlers) {
            solutions.push(states[i$1]);
        }
    }
    states = sortSolutions(solutions);
    var state = solutions[0];
    if (state && state.handlers) {
        // if a trailing slash was dropped and a star segment is the last segment
        // specified, put the trailing slash back
        if (isSlashDropped && state.pattern && state.pattern.slice(-5) === "(.+)$") {
            originalPath = originalPath + "/";
        }
        results = findHandler(state, originalPath, queryParams);
    }
    return results;
};
RouteRecognizer.VERSION = "0.3.4";
// Set to false to opt-out of encoding and decoding path segments.
// See https://github.com/tildeio/route-recognizer/pull/55
RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS = true;
RouteRecognizer.Normalizer = {
    normalizeSegment: normalizeSegment, normalizePath: normalizePath, encodePathSegment: encodePathSegment
};
RouteRecognizer.prototype.map = map;

export default RouteRecognizer;

//# sourceMappingURL=route-recognizer.es.js.map
