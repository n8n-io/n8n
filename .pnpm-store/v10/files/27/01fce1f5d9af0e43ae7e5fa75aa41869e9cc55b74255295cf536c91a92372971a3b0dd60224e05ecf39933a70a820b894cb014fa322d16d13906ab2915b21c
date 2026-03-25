var Pretender = (function () {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	/**
	 * Check if we're required to add a port number.
	 *
	 * @see https://url.spec.whatwg.org/#default-port
	 * @param {Number|String} port Port number we need to check
	 * @param {String} protocol Protocol we need to check against.
	 * @returns {Boolean} Is it a default port for the given protocol
	 * @api private
	 */
	var requiresPort = function required(port, protocol) {
	  protocol = protocol.split(':')[0];
	  port = +port;

	  if (!port) return false;

	  switch (protocol) {
	    case 'http':
	    case 'ws':
	    return port !== 80;

	    case 'https':
	    case 'wss':
	    return port !== 443;

	    case 'ftp':
	    return port !== 21;

	    case 'gopher':
	    return port !== 70;

	    case 'file':
	    return false;
	  }

	  return port !== 0;
	};

	var has = Object.prototype.hasOwnProperty
	  , undef;

	/**
	 * Decode a URI encoded string.
	 *
	 * @param {String} input The URI encoded string.
	 * @returns {String|Null} The decoded string.
	 * @api private
	 */
	function decode(input) {
	  try {
	    return decodeURIComponent(input.replace(/\+/g, ' '));
	  } catch (e) {
	    return null;
	  }
	}

	/**
	 * Simple query string parser.
	 *
	 * @param {String} query The query string that needs to be parsed.
	 * @returns {Object}
	 * @api public
	 */
	function querystring(query) {
	  var parser = /([^=?&]+)=?([^&]*)/g
	    , result = {}
	    , part;

	  while (part = parser.exec(query)) {
	    var key = decode(part[1])
	      , value = decode(part[2]);

	    //
	    // Prevent overriding of existing properties. This ensures that build-in
	    // methods like `toString` or __proto__ are not overriden by malicious
	    // querystrings.
	    //
	    // In the case if failed decoding, we want to omit the key/value pairs
	    // from the result.
	    //
	    if (key === null || value === null || key in result) continue;
	    result[key] = value;
	  }

	  return result;
	}

	/**
	 * Transform a query string to an object.
	 *
	 * @param {Object} obj Object that should be transformed.
	 * @param {String} prefix Optional prefix.
	 * @returns {String}
	 * @api public
	 */
	function querystringify(obj, prefix) {
	  prefix = prefix || '';

	  var pairs = []
	    , value
	    , key;

	  //
	  // Optionally prefix with a '?' if needed
	  //
	  if ('string' !== typeof prefix) prefix = '?';

	  for (key in obj) {
	    if (has.call(obj, key)) {
	      value = obj[key];

	      //
	      // Edge cases where we actually want to encode the value to an empty
	      // string instead of the stringified value.
	      //
	      if (!value && (value === null || value === undef || isNaN(value))) {
	        value = '';
	      }

	      key = encodeURIComponent(key);
	      value = encodeURIComponent(value);

	      //
	      // If we failed to encode the strings, we should bail out as we don't
	      // want to add invalid strings to the query.
	      //
	      if (key === null || value === null) continue;
	      pairs.push(key +'='+ value);
	    }
	  }

	  return pairs.length ? prefix + pairs.join('&') : '';
	}

	//
	// Expose the module.
	//
	var stringify = querystringify;
	var parse = querystring;

	var querystringify_1 = {
		stringify: stringify,
		parse: parse
	};

	var slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//
	  , protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\\/]+)?([\S\s]*)/i
	  , windowsDriveLetter = /^[a-zA-Z]:/
	  , whitespace = '[\\x09\\x0A\\x0B\\x0C\\x0D\\x20\\xA0\\u1680\\u180E\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200A\\u202F\\u205F\\u3000\\u2028\\u2029\\uFEFF]'
	  , left = new RegExp('^'+ whitespace +'+');

	/**
	 * Trim a given string.
	 *
	 * @param {String} str String to trim.
	 * @public
	 */
	function trimLeft(str) {
	  return (str ? str : '').toString().replace(left, '');
	}

	/**
	 * These are the parse rules for the URL parser, it informs the parser
	 * about:
	 *
	 * 0. The char it Needs to parse, if it's a string it should be done using
	 *    indexOf, RegExp using exec and NaN means set as current value.
	 * 1. The property we should set when parsing this value.
	 * 2. Indication if it's backwards or forward parsing, when set as number it's
	 *    the value of extra chars that should be split off.
	 * 3. Inherit from location if non existing in the parser.
	 * 4. `toLowerCase` the resulting value.
	 */
	var rules = [
	  ['#', 'hash'],                        // Extract from the back.
	  ['?', 'query'],                       // Extract from the back.
	  function sanitize(address, url) {     // Sanitize what is left of the address
	    return isSpecial(url.protocol) ? address.replace(/\\/g, '/') : address;
	  },
	  ['/', 'pathname'],                    // Extract from the back.
	  ['@', 'auth', 1],                     // Extract from the front.
	  [NaN, 'host', undefined, 1, 1],       // Set left over value.
	  [/:(\d+)$/, 'port', undefined, 1],    // RegExp the back.
	  [NaN, 'hostname', undefined, 1, 1]    // Set left over.
	];

	/**
	 * These properties should not be copied or inherited from. This is only needed
	 * for all non blob URL's as a blob URL does not include a hash, only the
	 * origin.
	 *
	 * @type {Object}
	 * @private
	 */
	var ignore = { hash: 1, query: 1 };

	/**
	 * The location object differs when your code is loaded through a normal page,
	 * Worker or through a worker using a blob. And with the blobble begins the
	 * trouble as the location object will contain the URL of the blob, not the
	 * location of the page where our code is loaded in. The actual origin is
	 * encoded in the `pathname` so we can thankfully generate a good "default"
	 * location from it so we can generate proper relative URL's again.
	 *
	 * @param {Object|String} loc Optional default location object.
	 * @returns {Object} lolcation object.
	 * @public
	 */
	function lolcation(loc) {
	  var globalVar;

	  if (typeof window !== 'undefined') globalVar = window;
	  else if (typeof commonjsGlobal !== 'undefined') globalVar = commonjsGlobal;
	  else if (typeof self !== 'undefined') globalVar = self;
	  else globalVar = {};

	  var location = globalVar.location || {};
	  loc = loc || location;

	  var finaldestination = {}
	    , type = typeof loc
	    , key;

	  if ('blob:' === loc.protocol) {
	    finaldestination = new Url(unescape(loc.pathname), {});
	  } else if ('string' === type) {
	    finaldestination = new Url(loc, {});
	    for (key in ignore) delete finaldestination[key];
	  } else if ('object' === type) {
	    for (key in loc) {
	      if (key in ignore) continue;
	      finaldestination[key] = loc[key];
	    }

	    if (finaldestination.slashes === undefined) {
	      finaldestination.slashes = slashes.test(loc.href);
	    }
	  }

	  return finaldestination;
	}

	/**
	 * Check whether a protocol scheme is special.
	 *
	 * @param {String} The protocol scheme of the URL
	 * @return {Boolean} `true` if the protocol scheme is special, else `false`
	 * @private
	 */
	function isSpecial(scheme) {
	  return (
	    scheme === 'file:' ||
	    scheme === 'ftp:' ||
	    scheme === 'http:' ||
	    scheme === 'https:' ||
	    scheme === 'ws:' ||
	    scheme === 'wss:'
	  );
	}

	/**
	 * @typedef ProtocolExtract
	 * @type Object
	 * @property {String} protocol Protocol matched in the URL, in lowercase.
	 * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
	 * @property {String} rest Rest of the URL that is not part of the protocol.
	 */

	/**
	 * Extract protocol information from a URL with/without double slash ("//").
	 *
	 * @param {String} address URL we want to extract from.
	 * @param {Object} location
	 * @return {ProtocolExtract} Extracted information.
	 * @private
	 */
	function extractProtocol(address, location) {
	  address = trimLeft(address);
	  location = location || {};

	  var match = protocolre.exec(address);
	  var protocol = match[1] ? match[1].toLowerCase() : '';
	  var forwardSlashes = !!match[2];
	  var otherSlashes = !!match[3];
	  var slashesCount = 0;
	  var rest;

	  if (forwardSlashes) {
	    if (otherSlashes) {
	      rest = match[2] + match[3] + match[4];
	      slashesCount = match[2].length + match[3].length;
	    } else {
	      rest = match[2] + match[4];
	      slashesCount = match[2].length;
	    }
	  } else {
	    if (otherSlashes) {
	      rest = match[3] + match[4];
	      slashesCount = match[3].length;
	    } else {
	      rest = match[4];
	    }
	  }

	  if (protocol === 'file:') {
	    if (slashesCount >= 2) {
	      rest = rest.slice(2);
	    }
	  } else if (isSpecial(protocol)) {
	    rest = match[4];
	  } else if (protocol) {
	    if (forwardSlashes) {
	      rest = rest.slice(2);
	    }
	  } else if (slashesCount >= 2 && isSpecial(location.protocol)) {
	    rest = match[4];
	  }

	  return {
	    protocol: protocol,
	    slashes: forwardSlashes || isSpecial(protocol),
	    slashesCount: slashesCount,
	    rest: rest
	  };
	}

	/**
	 * Resolve a relative URL pathname against a base URL pathname.
	 *
	 * @param {String} relative Pathname of the relative URL.
	 * @param {String} base Pathname of the base URL.
	 * @return {String} Resolved pathname.
	 * @private
	 */
	function resolve(relative, base) {
	  if (relative === '') return base;

	  var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/'))
	    , i = path.length
	    , last = path[i - 1]
	    , unshift = false
	    , up = 0;

	  while (i--) {
	    if (path[i] === '.') {
	      path.splice(i, 1);
	    } else if (path[i] === '..') {
	      path.splice(i, 1);
	      up++;
	    } else if (up) {
	      if (i === 0) unshift = true;
	      path.splice(i, 1);
	      up--;
	    }
	  }

	  if (unshift) path.unshift('');
	  if (last === '.' || last === '..') path.push('');

	  return path.join('/');
	}

	/**
	 * The actual URL instance. Instead of returning an object we've opted-in to
	 * create an actual constructor as it's much more memory efficient and
	 * faster and it pleases my OCD.
	 *
	 * It is worth noting that we should not use `URL` as class name to prevent
	 * clashes with the global URL instance that got introduced in browsers.
	 *
	 * @constructor
	 * @param {String} address URL we want to parse.
	 * @param {Object|String} [location] Location defaults for relative paths.
	 * @param {Boolean|Function} [parser] Parser for the query string.
	 * @private
	 */
	function Url(address, location, parser) {
	  address = trimLeft(address);

	  if (!(this instanceof Url)) {
	    return new Url(address, location, parser);
	  }

	  var relative, extracted, parse, instruction, index, key
	    , instructions = rules.slice()
	    , type = typeof location
	    , url = this
	    , i = 0;

	  //
	  // The following if statements allows this module two have compatibility with
	  // 2 different API:
	  //
	  // 1. Node.js's `url.parse` api which accepts a URL, boolean as arguments
	  //    where the boolean indicates that the query string should also be parsed.
	  //
	  // 2. The `URL` interface of the browser which accepts a URL, object as
	  //    arguments. The supplied object will be used as default values / fall-back
	  //    for relative paths.
	  //
	  if ('object' !== type && 'string' !== type) {
	    parser = location;
	    location = null;
	  }

	  if (parser && 'function' !== typeof parser) parser = querystringify_1.parse;

	  location = lolcation(location);

	  //
	  // Extract protocol information before running the instructions.
	  //
	  extracted = extractProtocol(address || '', location);
	  relative = !extracted.protocol && !extracted.slashes;
	  url.slashes = extracted.slashes || relative && location.slashes;
	  url.protocol = extracted.protocol || location.protocol || '';
	  address = extracted.rest;

	  //
	  // When the authority component is absent the URL starts with a path
	  // component.
	  //
	  if (
	    extracted.protocol === 'file:' && (
	      extracted.slashesCount !== 2 || windowsDriveLetter.test(address)) ||
	    (!extracted.slashes &&
	      (extracted.protocol ||
	        extracted.slashesCount < 2 ||
	        !isSpecial(url.protocol)))
	  ) {
	    instructions[3] = [/(.*)/, 'pathname'];
	  }

	  for (; i < instructions.length; i++) {
	    instruction = instructions[i];

	    if (typeof instruction === 'function') {
	      address = instruction(address, url);
	      continue;
	    }

	    parse = instruction[0];
	    key = instruction[1];

	    if (parse !== parse) {
	      url[key] = address;
	    } else if ('string' === typeof parse) {
	      if (~(index = address.indexOf(parse))) {
	        if ('number' === typeof instruction[2]) {
	          url[key] = address.slice(0, index);
	          address = address.slice(index + instruction[2]);
	        } else {
	          url[key] = address.slice(index);
	          address = address.slice(0, index);
	        }
	      }
	    } else if ((index = parse.exec(address))) {
	      url[key] = index[1];
	      address = address.slice(0, index.index);
	    }

	    url[key] = url[key] || (
	      relative && instruction[3] ? location[key] || '' : ''
	    );

	    //
	    // Hostname, host and protocol should be lowercased so they can be used to
	    // create a proper `origin`.
	    //
	    if (instruction[4]) url[key] = url[key].toLowerCase();
	  }

	  //
	  // Also parse the supplied query string in to an object. If we're supplied
	  // with a custom parser as function use that instead of the default build-in
	  // parser.
	  //
	  if (parser) url.query = parser(url.query);

	  //
	  // If the URL is relative, resolve the pathname against the base URL.
	  //
	  if (
	      relative
	    && location.slashes
	    && url.pathname.charAt(0) !== '/'
	    && (url.pathname !== '' || location.pathname !== '')
	  ) {
	    url.pathname = resolve(url.pathname, location.pathname);
	  }

	  //
	  // Default to a / for pathname if none exists. This normalizes the URL
	  // to always have a /
	  //
	  if (url.pathname.charAt(0) !== '/' && isSpecial(url.protocol)) {
	    url.pathname = '/' + url.pathname;
	  }

	  //
	  // We should not add port numbers if they are already the default port number
	  // for a given protocol. As the host also contains the port number we're going
	  // override it with the hostname which contains no port number.
	  //
	  if (!requiresPort(url.port, url.protocol)) {
	    url.host = url.hostname;
	    url.port = '';
	  }

	  //
	  // Parse down the `auth` for the username and password.
	  //
	  url.username = url.password = '';
	  if (url.auth) {
	    instruction = url.auth.split(':');
	    url.username = instruction[0] || '';
	    url.password = instruction[1] || '';
	  }

	  url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
	    ? url.protocol +'//'+ url.host
	    : 'null';

	  //
	  // The href is just the compiled result.
	  //
	  url.href = url.toString();
	}

	/**
	 * This is convenience method for changing properties in the URL instance to
	 * insure that they all propagate correctly.
	 *
	 * @param {String} part          Property we need to adjust.
	 * @param {Mixed} value          The newly assigned value.
	 * @param {Boolean|Function} fn  When setting the query, it will be the function
	 *                               used to parse the query.
	 *                               When setting the protocol, double slash will be
	 *                               removed from the final url if it is true.
	 * @returns {URL} URL instance for chaining.
	 * @public
	 */
	function set(part, value, fn) {
	  var url = this;

	  switch (part) {
	    case 'query':
	      if ('string' === typeof value && value.length) {
	        value = (fn || querystringify_1.parse)(value);
	      }

	      url[part] = value;
	      break;

	    case 'port':
	      url[part] = value;

	      if (!requiresPort(value, url.protocol)) {
	        url.host = url.hostname;
	        url[part] = '';
	      } else if (value) {
	        url.host = url.hostname +':'+ value;
	      }

	      break;

	    case 'hostname':
	      url[part] = value;

	      if (url.port) value += ':'+ url.port;
	      url.host = value;
	      break;

	    case 'host':
	      url[part] = value;

	      if (/:\d+$/.test(value)) {
	        value = value.split(':');
	        url.port = value.pop();
	        url.hostname = value.join(':');
	      } else {
	        url.hostname = value;
	        url.port = '';
	      }

	      break;

	    case 'protocol':
	      url.protocol = value.toLowerCase();
	      url.slashes = !fn;
	      break;

	    case 'pathname':
	    case 'hash':
	      if (value) {
	        var char = part === 'pathname' ? '/' : '#';
	        url[part] = value.charAt(0) !== char ? char + value : value;
	      } else {
	        url[part] = value;
	      }
	      break;

	    default:
	      url[part] = value;
	  }

	  for (var i = 0; i < rules.length; i++) {
	    var ins = rules[i];

	    if (ins[4]) url[ins[1]] = url[ins[1]].toLowerCase();
	  }

	  url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
	    ? url.protocol +'//'+ url.host
	    : 'null';

	  url.href = url.toString();

	  return url;
	}

	/**
	 * Transform the properties back in to a valid and full URL string.
	 *
	 * @param {Function} stringify Optional query stringify function.
	 * @returns {String} Compiled version of the URL.
	 * @public
	 */
	function toString(stringify) {
	  if (!stringify || 'function' !== typeof stringify) stringify = querystringify_1.stringify;

	  var query
	    , url = this
	    , protocol = url.protocol;

	  if (protocol && protocol.charAt(protocol.length - 1) !== ':') protocol += ':';

	  var result = protocol + (url.slashes || isSpecial(url.protocol) ? '//' : '');

	  if (url.username) {
	    result += url.username;
	    if (url.password) result += ':'+ url.password;
	    result += '@';
	  }

	  result += url.host + url.pathname;

	  query = 'object' === typeof url.query ? stringify(url.query) : url.query;
	  if (query) result += '?' !== query.charAt(0) ? '?'+ query : query;

	  if (url.hash) result += url.hash;

	  return result;
	}

	Url.prototype = { set: set, toString: toString };

	//
	// Expose the URL parser and some additional properties that might be useful for
	// others or testing.
	//
	Url.extractProtocol = extractProtocol;
	Url.location = lolcation;
	Url.trimLeft = trimLeft;
	Url.qs = querystringify_1;

	var urlParse = Url;

	/**
	 * parseURL - decompose a URL into its parts
	 * @param  {String} url a URL
	 * @return {Object} parts of the URL, including the following
	 *
	 * 'https://www.yahoo.com:1234/mypage?test=yes#abc'
	 *
	 * {
	 *   host: 'www.yahoo.com:1234',
	 *   protocol: 'https:',
	 *   search: '?test=yes',
	 *   hash: '#abc',
	 *   href: 'https://www.yahoo.com:1234/mypage?test=yes#abc',
	 *   pathname: '/mypage',
	 *   fullpath: '/mypage?test=yes'
	 * }
	 */
	function parseURL(url) {
	    var parsedUrl = new urlParse(url);
	    if (!parsedUrl.host) {
	        // eslint-disable-next-line no-self-assign
	        parsedUrl.href = parsedUrl.href; // IE: load the host and protocol
	    }
	    var pathname = parsedUrl.pathname;
	    if (pathname.charAt(0) !== '/') {
	        pathname = '/' + pathname; // IE: prepend leading slash
	    }
	    var host = parsedUrl.host;
	    if (parsedUrl.port === '80' || parsedUrl.port === '443') {
	        host = parsedUrl.hostname; // IE: remove default port
	    }
	    return {
	        host: host,
	        protocol: parsedUrl.protocol,
	        search: parsedUrl.query,
	        hash: parsedUrl.hash,
	        href: parsedUrl.href,
	        pathname: pathname,
	        fullpath: pathname + (parsedUrl.query || '') + (parsedUrl.hash || '')
	    };
	}

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
	function parse$1(segments, route, types) {
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
	        var ref = parse$1(allSegments, route.path, types);
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

	/**
	 * Registry
	 *
	 * A registry is a map of HTTP verbs to route recognizers.
	 */
	var Registry = /** @class */ (function () {
	    function Registry( /* host */) {
	        // Herein we keep track of RouteRecognizer instances
	        // keyed by HTTP method. Feel free to add more as needed.
	        this.verbs = {
	            GET: new RouteRecognizer(),
	            PUT: new RouteRecognizer(),
	            POST: new RouteRecognizer(),
	            DELETE: new RouteRecognizer(),
	            PATCH: new RouteRecognizer(),
	            HEAD: new RouteRecognizer(),
	            OPTIONS: new RouteRecognizer()
	        };
	    }
	    return Registry;
	}());

	/**
	 * Hosts
	 *
	 * a map of hosts to Registries, ultimately allowing
	 * a per-host-and-port, per HTTP verb lookup of RouteRecognizers
	 */
	var Hosts = /** @class */ (function () {
	    function Hosts() {
	        this.registries = {};
	    }
	    /**
	     * Hosts#forURL - retrieve a map of HTTP verbs to RouteRecognizers
	     *                for a given URL
	     *
	     * @param  {String} url a URL
	     * @return {Registry}   a map of HTTP verbs to RouteRecognizers
	     *                      corresponding to the provided URL's
	     *                      hostname and port
	     */
	    Hosts.prototype.forURL = function (url) {
	        var host = parseURL(url).host;
	        var registry = this.registries[host];
	        if (registry === undefined) {
	            registry = (this.registries[host] = new Registry( /*host*/));
	        }
	        return registry.verbs;
	    };
	    return Hosts;
	}());

	var global$1 =
	  (typeof globalThis !== 'undefined' && globalThis) ||
	  (typeof self !== 'undefined' && self) ||
	  (typeof global$1 !== 'undefined' && global$1);

	var support = {
	  searchParams: 'URLSearchParams' in global$1,
	  iterable: 'Symbol' in global$1 && 'iterator' in Symbol,
	  blob:
	    'FileReader' in global$1 &&
	    'Blob' in global$1 &&
	    (function() {
	      try {
	        new Blob();
	        return true
	      } catch (e) {
	        return false
	      }
	    })(),
	  formData: 'FormData' in global$1,
	  arrayBuffer: 'ArrayBuffer' in global$1
	};

	function isDataView(obj) {
	  return obj && DataView.prototype.isPrototypeOf(obj)
	}

	if (support.arrayBuffer) {
	  var viewClasses = [
	    '[object Int8Array]',
	    '[object Uint8Array]',
	    '[object Uint8ClampedArray]',
	    '[object Int16Array]',
	    '[object Uint16Array]',
	    '[object Int32Array]',
	    '[object Uint32Array]',
	    '[object Float32Array]',
	    '[object Float64Array]'
	  ];

	  var isArrayBufferView =
	    ArrayBuffer.isView ||
	    function(obj) {
	      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
	    };
	}

	function normalizeName(name) {
	  if (typeof name !== 'string') {
	    name = String(name);
	  }
	  if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
	    throw new TypeError('Invalid character in header field name: "' + name + '"')
	  }
	  return name.toLowerCase()
	}

	function normalizeValue(value) {
	  if (typeof value !== 'string') {
	    value = String(value);
	  }
	  return value
	}

	// Build a destructive iterator for the value list
	function iteratorFor(items) {
	  var iterator = {
	    next: function() {
	      var value = items.shift();
	      return {done: value === undefined, value: value}
	    }
	  };

	  if (support.iterable) {
	    iterator[Symbol.iterator] = function() {
	      return iterator
	    };
	  }

	  return iterator
	}

	function Headers(headers) {
	  this.map = {};

	  if (headers instanceof Headers) {
	    headers.forEach(function(value, name) {
	      this.append(name, value);
	    }, this);
	  } else if (Array.isArray(headers)) {
	    headers.forEach(function(header) {
	      this.append(header[0], header[1]);
	    }, this);
	  } else if (headers) {
	    Object.getOwnPropertyNames(headers).forEach(function(name) {
	      this.append(name, headers[name]);
	    }, this);
	  }
	}

	Headers.prototype.append = function(name, value) {
	  name = normalizeName(name);
	  value = normalizeValue(value);
	  var oldValue = this.map[name];
	  this.map[name] = oldValue ? oldValue + ', ' + value : value;
	};

	Headers.prototype['delete'] = function(name) {
	  delete this.map[normalizeName(name)];
	};

	Headers.prototype.get = function(name) {
	  name = normalizeName(name);
	  return this.has(name) ? this.map[name] : null
	};

	Headers.prototype.has = function(name) {
	  return this.map.hasOwnProperty(normalizeName(name))
	};

	Headers.prototype.set = function(name, value) {
	  this.map[normalizeName(name)] = normalizeValue(value);
	};

	Headers.prototype.forEach = function(callback, thisArg) {
	  for (var name in this.map) {
	    if (this.map.hasOwnProperty(name)) {
	      callback.call(thisArg, this.map[name], name, this);
	    }
	  }
	};

	Headers.prototype.keys = function() {
	  var items = [];
	  this.forEach(function(value, name) {
	    items.push(name);
	  });
	  return iteratorFor(items)
	};

	Headers.prototype.values = function() {
	  var items = [];
	  this.forEach(function(value) {
	    items.push(value);
	  });
	  return iteratorFor(items)
	};

	Headers.prototype.entries = function() {
	  var items = [];
	  this.forEach(function(value, name) {
	    items.push([name, value]);
	  });
	  return iteratorFor(items)
	};

	if (support.iterable) {
	  Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
	}

	function consumed(body) {
	  if (body.bodyUsed) {
	    return Promise.reject(new TypeError('Already read'))
	  }
	  body.bodyUsed = true;
	}

	function fileReaderReady(reader) {
	  return new Promise(function(resolve, reject) {
	    reader.onload = function() {
	      resolve(reader.result);
	    };
	    reader.onerror = function() {
	      reject(reader.error);
	    };
	  })
	}

	function readBlobAsArrayBuffer(blob) {
	  var reader = new FileReader();
	  var promise = fileReaderReady(reader);
	  reader.readAsArrayBuffer(blob);
	  return promise
	}

	function readBlobAsText(blob) {
	  var reader = new FileReader();
	  var promise = fileReaderReady(reader);
	  reader.readAsText(blob);
	  return promise
	}

	function readArrayBufferAsText(buf) {
	  var view = new Uint8Array(buf);
	  var chars = new Array(view.length);

	  for (var i = 0; i < view.length; i++) {
	    chars[i] = String.fromCharCode(view[i]);
	  }
	  return chars.join('')
	}

	function bufferClone(buf) {
	  if (buf.slice) {
	    return buf.slice(0)
	  } else {
	    var view = new Uint8Array(buf.byteLength);
	    view.set(new Uint8Array(buf));
	    return view.buffer
	  }
	}

	function Body() {
	  this.bodyUsed = false;

	  this._initBody = function(body) {
	    /*
	      fetch-mock wraps the Response object in an ES6 Proxy to
	      provide useful test harness features such as flush. However, on
	      ES5 browsers without fetch or Proxy support pollyfills must be used;
	      the proxy-pollyfill is unable to proxy an attribute unless it exists
	      on the object before the Proxy is created. This change ensures
	      Response.bodyUsed exists on the instance, while maintaining the
	      semantic of setting Request.bodyUsed in the constructor before
	      _initBody is called.
	    */
	    this.bodyUsed = this.bodyUsed;
	    this._bodyInit = body;
	    if (!body) {
	      this._bodyText = '';
	    } else if (typeof body === 'string') {
	      this._bodyText = body;
	    } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
	      this._bodyBlob = body;
	    } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
	      this._bodyFormData = body;
	    } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	      this._bodyText = body.toString();
	    } else if (support.arrayBuffer && support.blob && isDataView(body)) {
	      this._bodyArrayBuffer = bufferClone(body.buffer);
	      // IE 10-11 can't handle a DataView body.
	      this._bodyInit = new Blob([this._bodyArrayBuffer]);
	    } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
	      this._bodyArrayBuffer = bufferClone(body);
	    } else {
	      this._bodyText = body = Object.prototype.toString.call(body);
	    }

	    if (!this.headers.get('content-type')) {
	      if (typeof body === 'string') {
	        this.headers.set('content-type', 'text/plain;charset=UTF-8');
	      } else if (this._bodyBlob && this._bodyBlob.type) {
	        this.headers.set('content-type', this._bodyBlob.type);
	      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	        this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
	      }
	    }
	  };

	  if (support.blob) {
	    this.blob = function() {
	      var rejected = consumed(this);
	      if (rejected) {
	        return rejected
	      }

	      if (this._bodyBlob) {
	        return Promise.resolve(this._bodyBlob)
	      } else if (this._bodyArrayBuffer) {
	        return Promise.resolve(new Blob([this._bodyArrayBuffer]))
	      } else if (this._bodyFormData) {
	        throw new Error('could not read FormData body as blob')
	      } else {
	        return Promise.resolve(new Blob([this._bodyText]))
	      }
	    };

	    this.arrayBuffer = function() {
	      if (this._bodyArrayBuffer) {
	        var isConsumed = consumed(this);
	        if (isConsumed) {
	          return isConsumed
	        }
	        if (ArrayBuffer.isView(this._bodyArrayBuffer)) {
	          return Promise.resolve(
	            this._bodyArrayBuffer.buffer.slice(
	              this._bodyArrayBuffer.byteOffset,
	              this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength
	            )
	          )
	        } else {
	          return Promise.resolve(this._bodyArrayBuffer)
	        }
	      } else {
	        return this.blob().then(readBlobAsArrayBuffer)
	      }
	    };
	  }

	  this.text = function() {
	    var rejected = consumed(this);
	    if (rejected) {
	      return rejected
	    }

	    if (this._bodyBlob) {
	      return readBlobAsText(this._bodyBlob)
	    } else if (this._bodyArrayBuffer) {
	      return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
	    } else if (this._bodyFormData) {
	      throw new Error('could not read FormData body as text')
	    } else {
	      return Promise.resolve(this._bodyText)
	    }
	  };

	  if (support.formData) {
	    this.formData = function() {
	      return this.text().then(decode$1)
	    };
	  }

	  this.json = function() {
	    return this.text().then(JSON.parse)
	  };

	  return this
	}

	// HTTP methods whose capitalization should be normalized
	var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

	function normalizeMethod(method) {
	  var upcased = method.toUpperCase();
	  return methods.indexOf(upcased) > -1 ? upcased : method
	}

	function Request(input, options) {
	  if (!(this instanceof Request)) {
	    throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
	  }

	  options = options || {};
	  var body = options.body;

	  if (input instanceof Request) {
	    if (input.bodyUsed) {
	      throw new TypeError('Already read')
	    }
	    this.url = input.url;
	    this.credentials = input.credentials;
	    if (!options.headers) {
	      this.headers = new Headers(input.headers);
	    }
	    this.method = input.method;
	    this.mode = input.mode;
	    this.signal = input.signal;
	    if (!body && input._bodyInit != null) {
	      body = input._bodyInit;
	      input.bodyUsed = true;
	    }
	  } else {
	    this.url = String(input);
	  }

	  this.credentials = options.credentials || this.credentials || 'same-origin';
	  if (options.headers || !this.headers) {
	    this.headers = new Headers(options.headers);
	  }
	  this.method = normalizeMethod(options.method || this.method || 'GET');
	  this.mode = options.mode || this.mode || null;
	  this.signal = options.signal || this.signal;
	  this.referrer = null;

	  if ((this.method === 'GET' || this.method === 'HEAD') && body) {
	    throw new TypeError('Body not allowed for GET or HEAD requests')
	  }
	  this._initBody(body);

	  if (this.method === 'GET' || this.method === 'HEAD') {
	    if (options.cache === 'no-store' || options.cache === 'no-cache') {
	      // Search for a '_' parameter in the query string
	      var reParamSearch = /([?&])_=[^&]*/;
	      if (reParamSearch.test(this.url)) {
	        // If it already exists then set the value with the current time
	        this.url = this.url.replace(reParamSearch, '$1_=' + new Date().getTime());
	      } else {
	        // Otherwise add a new '_' parameter to the end with the current time
	        var reQueryString = /\?/;
	        this.url += (reQueryString.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
	      }
	    }
	  }
	}

	Request.prototype.clone = function() {
	  return new Request(this, {body: this._bodyInit})
	};

	function decode$1(body) {
	  var form = new FormData();
	  body
	    .trim()
	    .split('&')
	    .forEach(function(bytes) {
	      if (bytes) {
	        var split = bytes.split('=');
	        var name = split.shift().replace(/\+/g, ' ');
	        var value = split.join('=').replace(/\+/g, ' ');
	        form.append(decodeURIComponent(name), decodeURIComponent(value));
	      }
	    });
	  return form
	}

	function parseHeaders(rawHeaders) {
	  var headers = new Headers();
	  // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
	  // https://tools.ietf.org/html/rfc7230#section-3.2
	  var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
	  // Avoiding split via regex to work around a common IE11 bug with the core-js 3.6.0 regex polyfill
	  // https://github.com/github/fetch/issues/748
	  // https://github.com/zloirock/core-js/issues/751
	  preProcessedHeaders
	    .split('\r')
	    .map(function(header) {
	      return header.indexOf('\n') === 0 ? header.substr(1, header.length) : header
	    })
	    .forEach(function(line) {
	      var parts = line.split(':');
	      var key = parts.shift().trim();
	      if (key) {
	        var value = parts.join(':').trim();
	        headers.append(key, value);
	      }
	    });
	  return headers
	}

	Body.call(Request.prototype);

	function Response(bodyInit, options) {
	  if (!(this instanceof Response)) {
	    throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
	  }
	  if (!options) {
	    options = {};
	  }

	  this.type = 'default';
	  this.status = options.status === undefined ? 200 : options.status;
	  this.ok = this.status >= 200 && this.status < 300;
	  this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
	  this.headers = new Headers(options.headers);
	  this.url = options.url || '';
	  this._initBody(bodyInit);
	}

	Body.call(Response.prototype);

	Response.prototype.clone = function() {
	  return new Response(this._bodyInit, {
	    status: this.status,
	    statusText: this.statusText,
	    headers: new Headers(this.headers),
	    url: this.url
	  })
	};

	Response.error = function() {
	  var response = new Response(null, {status: 0, statusText: ''});
	  response.type = 'error';
	  return response
	};

	var redirectStatuses = [301, 302, 303, 307, 308];

	Response.redirect = function(url, status) {
	  if (redirectStatuses.indexOf(status) === -1) {
	    throw new RangeError('Invalid status code')
	  }

	  return new Response(null, {status: status, headers: {location: url}})
	};

	var DOMException = global$1.DOMException;
	try {
	  new DOMException();
	} catch (err) {
	  DOMException = function(message, name) {
	    this.message = message;
	    this.name = name;
	    var error = Error(message);
	    this.stack = error.stack;
	  };
	  DOMException.prototype = Object.create(Error.prototype);
	  DOMException.prototype.constructor = DOMException;
	}

	function fetch(input, init) {
	  return new Promise(function(resolve, reject) {
	    var request = new Request(input, init);

	    if (request.signal && request.signal.aborted) {
	      return reject(new DOMException('Aborted', 'AbortError'))
	    }

	    var xhr = new XMLHttpRequest();

	    function abortXhr() {
	      xhr.abort();
	    }

	    xhr.onload = function() {
	      var options = {
	        status: xhr.status,
	        statusText: xhr.statusText,
	        headers: parseHeaders(xhr.getAllResponseHeaders() || '')
	      };
	      options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
	      var body = 'response' in xhr ? xhr.response : xhr.responseText;
	      setTimeout(function() {
	        resolve(new Response(body, options));
	      }, 0);
	    };

	    xhr.onerror = function() {
	      setTimeout(function() {
	        reject(new TypeError('Network request failed'));
	      }, 0);
	    };

	    xhr.ontimeout = function() {
	      setTimeout(function() {
	        reject(new TypeError('Network request failed'));
	      }, 0);
	    };

	    xhr.onabort = function() {
	      setTimeout(function() {
	        reject(new DOMException('Aborted', 'AbortError'));
	      }, 0);
	    };

	    function fixUrl(url) {
	      try {
	        return url === '' && global$1.location.href ? global$1.location.href : url
	      } catch (e) {
	        return url
	      }
	    }

	    xhr.open(request.method, fixUrl(request.url), true);

	    if (request.credentials === 'include') {
	      xhr.withCredentials = true;
	    } else if (request.credentials === 'omit') {
	      xhr.withCredentials = false;
	    }

	    if ('responseType' in xhr) {
	      if (support.blob) {
	        xhr.responseType = 'blob';
	      } else if (
	        support.arrayBuffer &&
	        request.headers.get('Content-Type') &&
	        request.headers.get('Content-Type').indexOf('application/octet-stream') !== -1
	      ) {
	        xhr.responseType = 'arraybuffer';
	      }
	    }

	    if (init && typeof init.headers === 'object' && !(init.headers instanceof Headers)) {
	      Object.getOwnPropertyNames(init.headers).forEach(function(name) {
	        xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
	      });
	    } else {
	      request.headers.forEach(function(value, name) {
	        xhr.setRequestHeader(name, value);
	      });
	    }

	    if (request.signal) {
	      request.signal.addEventListener('abort', abortXhr);

	      xhr.onreadystatechange = function() {
	        // DONE (success or failure)
	        if (xhr.readyState === 4) {
	          request.signal.removeEventListener('abort', abortXhr);
	        }
	      };
	    }

	    xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
	  })
	}

	fetch.polyfill = true;

	if (!global$1.fetch) {
	  global$1.fetch = fetch;
	  global$1.Headers = Headers;
	  global$1.Request = Request;
	  global$1.Response = Response;
	}

	var FakeFetch = /*#__PURE__*/Object.freeze({
		__proto__: null,
		Headers: Headers,
		Request: Request,
		Response: Response,
		get DOMException () { return DOMException; },
		fetch: fetch
	});

	/**
	 * Minimal Event interface implementation
	 *
	 * Original implementation by Sven Fuchs: https://gist.github.com/995028
	 * Modifications and tests by Christian Johansen.
	 *
	 * @author Sven Fuchs (svenfuchs@artweb-design.de)
	 * @author Christian Johansen (christian@cjohansen.no)
	 * @license BSD
	 *
	 * Copyright (c) 2011 Sven Fuchs, Christian Johansen
	 */

	var _Event = function Event(type, bubbles, cancelable, target) {
	  this.type = type;
	  this.bubbles = bubbles;
	  this.cancelable = cancelable;
	  this.target = target;
	};

	_Event.prototype = {
	  stopPropagation: function () {},
	  preventDefault: function () {
	    this.defaultPrevented = true;
	  }
	};

	/*
	  Used to set the statusText property of an xhr object
	*/
	var httpStatusCodes = {
	  100: "Continue",
	  101: "Switching Protocols",
	  200: "OK",
	  201: "Created",
	  202: "Accepted",
	  203: "Non-Authoritative Information",
	  204: "No Content",
	  205: "Reset Content",
	  206: "Partial Content",
	  300: "Multiple Choice",
	  301: "Moved Permanently",
	  302: "Found",
	  303: "See Other",
	  304: "Not Modified",
	  305: "Use Proxy",
	  307: "Temporary Redirect",
	  400: "Bad Request",
	  401: "Unauthorized",
	  402: "Payment Required",
	  403: "Forbidden",
	  404: "Not Found",
	  405: "Method Not Allowed",
	  406: "Not Acceptable",
	  407: "Proxy Authentication Required",
	  408: "Request Timeout",
	  409: "Conflict",
	  410: "Gone",
	  411: "Length Required",
	  412: "Precondition Failed",
	  413: "Request Entity Too Large",
	  414: "Request-URI Too Long",
	  415: "Unsupported Media Type",
	  416: "Requested Range Not Satisfiable",
	  417: "Expectation Failed",
	  422: "Unprocessable Entity",
	  500: "Internal Server Error",
	  501: "Not Implemented",
	  502: "Bad Gateway",
	  503: "Service Unavailable",
	  504: "Gateway Timeout",
	  505: "HTTP Version Not Supported"
	};


	/*
	  Cross-browser XML parsing. Used to turn
	  XML responses into Document objects
	  Borrowed from JSpec
	*/
	function parseXML(text) {
	  var xmlDoc;

	  if (typeof DOMParser != "undefined") {
	    var parser = new DOMParser();
	    xmlDoc = parser.parseFromString(text, "text/xml");
	  } else {
	    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
	    xmlDoc.async = "false";
	    xmlDoc.loadXML(text);
	  }

	  return xmlDoc;
	}

	/*
	  Without mocking, the native XMLHttpRequest object will throw
	  an error when attempting to set these headers. We match this behavior.
	*/
	var unsafeHeaders = {
	  "Accept-Charset": true,
	  "Accept-Encoding": true,
	  "Connection": true,
	  "Content-Length": true,
	  "Cookie": true,
	  "Cookie2": true,
	  "Content-Transfer-Encoding": true,
	  "Date": true,
	  "Expect": true,
	  "Host": true,
	  "Keep-Alive": true,
	  "Referer": true,
	  "TE": true,
	  "Trailer": true,
	  "Transfer-Encoding": true,
	  "Upgrade": true,
	  "User-Agent": true,
	  "Via": true
	};

	/*
	  Adds an "event" onto the fake xhr object
	  that just calls the same-named method. This is
	  in case a library adds callbacks for these events.
	*/
	function _addEventListener(eventName, xhr){
	  xhr.addEventListener(eventName, function (event) {
	    var listener = xhr["on" + eventName];

	    if (listener && typeof listener == "function") {
	      listener.call(event.target, event);
	    }
	  });
	}

	function EventedObject() {
	  this._eventListeners = {};
	  var events = ["loadstart", "progress", "load", "abort", "loadend"];
	  for (var i = events.length - 1; i >= 0; i--) {
	    _addEventListener(events[i], this);
	  }
	}
	EventedObject.prototype = {
	  /*
	    Duplicates the behavior of native XMLHttpRequest's addEventListener function
	  */
	  addEventListener: function addEventListener(event, listener) {
	    this._eventListeners[event] = this._eventListeners[event] || [];
	    this._eventListeners[event].push(listener);
	  },

	  /*
	    Duplicates the behavior of native XMLHttpRequest's removeEventListener function
	  */
	  removeEventListener: function removeEventListener(event, listener) {
	    var listeners = this._eventListeners[event] || [];

	    for (var i = 0, l = listeners.length; i < l; ++i) {
	      if (listeners[i] == listener) {
	        return listeners.splice(i, 1);
	      }
	    }
	  },

	  /*
	    Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
	  */
	  dispatchEvent: function dispatchEvent(event) {
	    var type = event.type;
	    var listeners = this._eventListeners[type] || [];

	    for (var i = 0; i < listeners.length; i++) {
	      if (typeof listeners[i] == "function") {
	        listeners[i].call(this, event);
	      } else {
	        listeners[i].handleEvent(event);
	      }
	    }

	    return !!event.defaultPrevented;
	  },

	  /*
	    Triggers an `onprogress` event with the given parameters.
	  */
	  _progress: function _progress(lengthComputable, loaded, total) {
	    var event = new _Event('progress');
	    event.target = this;
	    event.lengthComputable = lengthComputable;
	    event.loaded = loaded;
	    event.total = total;
	    this.dispatchEvent(event);
	  }
	};

	/*
	  Constructor for a fake window.XMLHttpRequest
	*/
	function FakeXMLHttpRequest() {
	  EventedObject.call(this);
	  this.readyState = FakeXMLHttpRequest.UNSENT;
	  this.requestHeaders = {};
	  this.requestBody = null;
	  this.status = 0;
	  this.statusText = "";
	  this.upload = new EventedObject();
	  this.onabort= null;
	  this.onerror= null;
	  this.onload= null;
	  this.onloadend= null;
	  this.onloadstart= null;
	  this.onprogress= null;
	  this.onreadystatechange= null;
	  this.ontimeout= null;
	}

	FakeXMLHttpRequest.prototype = new EventedObject();

	// These status codes are available on the native XMLHttpRequest
	// object, so we match that here in case a library is relying on them.
	FakeXMLHttpRequest.UNSENT = 0;
	FakeXMLHttpRequest.OPENED = 1;
	FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
	FakeXMLHttpRequest.LOADING = 3;
	FakeXMLHttpRequest.DONE = 4;

	var FakeXMLHttpRequestProto = {
	  UNSENT: 0,
	  OPENED: 1,
	  HEADERS_RECEIVED: 2,
	  LOADING: 3,
	  DONE: 4,
	  async: true,
	  withCredentials: false,

	  /*
	    Duplicates the behavior of native XMLHttpRequest's open function
	  */
	  open: function open(method, url, async, username, password) {
	    this.method = method;
	    this.url = url;
	    this.async = typeof async == "boolean" ? async : true;
	    this.username = username;
	    this.password = password;
	    this.responseText = null;
	    this.response = this.responseText;
	    this.responseXML = null;
	    this.responseURL = url;
	    this.requestHeaders = {};
	    this.sendFlag = false;
	    this._readyStateChange(FakeXMLHttpRequest.OPENED);
	  },

	  /*
	    Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
	  */
	  setRequestHeader: function setRequestHeader(header, value) {
	    verifyState(this);

	    if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
	      throw new Error("Refused to set unsafe header \"" + header + "\"");
	    }

	    if (this.requestHeaders[header]) {
	      this.requestHeaders[header] += "," + value;
	    } else {
	      this.requestHeaders[header] = value;
	    }
	  },

	  /*
	    Duplicates the behavior of native XMLHttpRequest's send function
	  */
	  send: function send(data) {
	    verifyState(this);

	    if (!/^(get|head)$/i.test(this.method)) {
	      var hasContentTypeHeader = false;

	      Object.keys(this.requestHeaders).forEach(function (key) {
	        if (key.toLowerCase() === 'content-type') {
	          hasContentTypeHeader = true;
	        }
	      });

	      if (!hasContentTypeHeader && !(data || '').toString().match('FormData')) {
	        this.requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
	      }

	      this.requestBody = data;
	    }

	    this.errorFlag = false;
	    this.sendFlag = this.async;
	    this._readyStateChange(FakeXMLHttpRequest.OPENED);

	    if (typeof this.onSend == "function") {
	      this.onSend(this);
	    }

	    this.dispatchEvent(new _Event("loadstart", false, false, this));
	  },

	  /*
	    Duplicates the behavior of native XMLHttpRequest's abort function
	  */
	  abort: function abort() {
	    this.aborted = true;
	    this.responseText = null;
	    this.response = this.responseText;
	    this.errorFlag = true;
	    this.requestHeaders = {};

	    this.dispatchEvent(new _Event("abort", false, false, this));

	    if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
	      this._readyStateChange(FakeXMLHttpRequest.UNSENT);
	      this.sendFlag = false;
	    }

	    if (typeof this.onerror === "function") {
	      this.onerror();
	    }
	  },

	  /*
	    Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
	  */
	  getResponseHeader: function getResponseHeader(header) {
	    if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
	      return null;
	    }

	    if (/^Set-Cookie2?$/i.test(header)) {
	      return null;
	    }

	    header = header.toLowerCase();

	    for (var h in this.responseHeaders) {
	      if (h.toLowerCase() == header) {
	        return this.responseHeaders[h];
	      }
	    }

	    return null;
	  },

	  /*
	    Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
	  */
	  getAllResponseHeaders: function getAllResponseHeaders() {
	    if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
	      return "";
	    }

	    var headers = "";

	    for (var header in this.responseHeaders) {
	      if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
	        headers += header + ": " + this.responseHeaders[header] + "\r\n";
	      }
	    }

	    return headers;
	  },

	  /*
	   Duplicates the behavior of native XMLHttpRequest's overrideMimeType function
	   */
	  overrideMimeType: function overrideMimeType(mimeType) {
	    if (typeof mimeType === "string") {
	      this.forceMimeType = mimeType.toLowerCase();
	    }
	  },


	  /*
	    Places a FakeXMLHttpRequest object into the passed
	    state.
	  */
	  _readyStateChange: function _readyStateChange(state) {
	    this.readyState = state;

	    if (typeof this.onreadystatechange == "function") {
	      this.onreadystatechange(new _Event("readystatechange"));
	    }

	    this.dispatchEvent(new _Event("readystatechange"));

	    if (this.readyState == FakeXMLHttpRequest.DONE) {
	      this.dispatchEvent(new _Event("load", false, false, this));
	    }
	    if (this.readyState == FakeXMLHttpRequest.UNSENT || this.readyState == FakeXMLHttpRequest.DONE) {
	      this.dispatchEvent(new _Event("loadend", false, false, this));
	    }
	  },


	  /*
	    Sets the FakeXMLHttpRequest object's response headers and
	    places the object into readyState 2
	  */
	  _setResponseHeaders: function _setResponseHeaders(headers) {
	    this.responseHeaders = {};

	    for (var header in headers) {
	      if (headers.hasOwnProperty(header)) {
	          this.responseHeaders[header] = headers[header];
	      }
	    }

	    if (this.forceMimeType) {
	      this.responseHeaders['Content-Type'] = this.forceMimeType;
	    }

	    if (this.async) {
	      this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
	    } else {
	      this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
	    }
	  },

	  /*
	    Sets the FakeXMLHttpRequest object's response body and
	    if body text is XML, sets responseXML to parsed document
	    object
	  */
	  _setResponseBody: function _setResponseBody(body) {
	    verifyRequestSent(this);
	    verifyHeadersReceived(this);
	    verifyResponseBodyType(body);

	    var chunkSize = this.chunkSize || 10;
	    var index = 0;
	    this.responseText = "";
	    this.response = this.responseText;

	    do {
	      if (this.async) {
	        this._readyStateChange(FakeXMLHttpRequest.LOADING);
	      }

	      this.responseText += body.substring(index, index + chunkSize);
	      this.response = this.responseText;
	      index += chunkSize;
	    } while (index < body.length);

	    var type = this.getResponseHeader("Content-Type");

	    if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
	      try {
	        this.responseXML = parseXML(this.responseText);
	      } catch (e) {
	        // Unable to parse XML - no biggie
	      }
	    }

	    if (this.async) {
	      this._readyStateChange(FakeXMLHttpRequest.DONE);
	    } else {
	      this.readyState = FakeXMLHttpRequest.DONE;
	    }
	  },

	  /*
	    Forces a response on to the FakeXMLHttpRequest object.

	    This is the public API for faking responses. This function
	    takes a number status, headers object, and string body:

	    ```
	    xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")

	    ```
	  */
	  respond: function respond(status, headers, body) {
	    this._setResponseHeaders(headers || {});
	    this.status = typeof status == "number" ? status : 200;
	    this.statusText = httpStatusCodes[this.status];
	    this._setResponseBody(body || "");
	  }
	};

	for (var property in FakeXMLHttpRequestProto) {
	  FakeXMLHttpRequest.prototype[property] = FakeXMLHttpRequestProto[property];
	}

	function verifyState(xhr) {
	  if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
	    throw new Error("INVALID_STATE_ERR");
	  }

	  if (xhr.sendFlag) {
	    throw new Error("INVALID_STATE_ERR");
	  }
	}


	function verifyRequestSent(xhr) {
	    if (xhr.readyState == FakeXMLHttpRequest.DONE) {
	        throw new Error("Request done");
	    }
	}

	function verifyHeadersReceived(xhr) {
	    if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
	        throw new Error("No headers received");
	    }
	}

	function verifyResponseBodyType(body) {
	    if (typeof body != "string") {
	        var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
	                             body + ", which is not a string.");
	        error.name = "InvalidBodyException";
	        throw error;
	    }
	}

	function createPassthrough(fakeXHR, nativeXMLHttpRequest) {
	    // event types to handle on the xhr
	    var evts = ['error', 'timeout', 'abort', 'readystatechange'];
	    // event types to handle on the xhr.upload
	    var uploadEvents = [];
	    // properties to copy from the native xhr to fake xhr
	    var lifecycleProps = [
	        'readyState',
	        'responseText',
	        'response',
	        'responseXML',
	        'responseURL',
	        'status',
	        'statusText',
	    ];
	    var xhr = (fakeXHR._passthroughRequest = new nativeXMLHttpRequest());
	    xhr.open(fakeXHR.method, fakeXHR.url, fakeXHR.async, fakeXHR.username, fakeXHR.password);
	    if (fakeXHR.responseType === 'arraybuffer') {
	        lifecycleProps = ['readyState', 'response', 'status', 'statusText'];
	        xhr.responseType = fakeXHR.responseType;
	    }
	    // use onload if the browser supports it
	    if ('onload' in xhr) {
	        evts.push('load');
	    }
	    // add progress event for async calls
	    // avoid using progress events for sync calls, they will hang https://bugs.webkit.org/show_bug.cgi?id=40996.
	    if (fakeXHR.async && fakeXHR.responseType !== 'arraybuffer') {
	        evts.push('progress');
	        uploadEvents.push('progress');
	    }
	    // update `propertyNames` properties from `fromXHR` to `toXHR`
	    function copyLifecycleProperties(propertyNames, fromXHR, toXHR) {
	        for (var i = 0; i < propertyNames.length; i++) {
	            var prop = propertyNames[i];
	            if (prop in fromXHR) {
	                toXHR[prop] = fromXHR[prop];
	            }
	        }
	    }
	    // fire fake event on `eventable`
	    function dispatchEvent(eventable, eventType, event) {
	        eventable.dispatchEvent(event);
	        if (eventable['on' + eventType]) {
	            eventable['on' + eventType](event);
	        }
	    }
	    // set the on- handler on the native xhr for the given eventType
	    function createHandler(eventType) {
	        xhr['on' + eventType] = function (event) {
	            copyLifecycleProperties(lifecycleProps, xhr, fakeXHR);
	            dispatchEvent(fakeXHR, eventType, event);
	        };
	    }
	    // set the on- handler on the native xhr's `upload` property for
	    // the given eventType
	    function createUploadHandler(eventType) {
	        if (xhr.upload && fakeXHR.upload && fakeXHR.upload['on' + eventType]) {
	            xhr.upload['on' + eventType] = function (event) {
	                dispatchEvent(fakeXHR.upload, eventType, event);
	            };
	        }
	    }
	    var i;
	    for (i = 0; i < evts.length; i++) {
	        createHandler(evts[i]);
	    }
	    for (i = 0; i < uploadEvents.length; i++) {
	        createUploadHandler(uploadEvents[i]);
	    }
	    if (fakeXHR.async) {
	        xhr.timeout = fakeXHR.timeout;
	        xhr.withCredentials = fakeXHR.withCredentials;
	    }
	    // XMLHttpRequest.timeout default initializes to 0, and is not allowed to be used for
	    // synchronous XMLHttpRequests requests in a document environment. However, when a XHR
	    // polyfill does not sets the timeout value, it will throw in React Native environment.
	    // TODO:
	    // synchronous XHR is deprecated, make async the default as XMLHttpRequest.open(),
	    // and throw error if sync XHR has timeout not 0
	    if (!xhr.timeout && xhr.timeout !== 0) {
	        xhr.timeout = 0; // default XMLHttpRequest timeout
	    }
	    for (var h in fakeXHR.requestHeaders) {
	        xhr.setRequestHeader(h, fakeXHR.requestHeaders[h]);
	    }
	    return xhr;
	}

	function interceptor(ctx) {
	    function FakeRequest() {
	        // super()
	        FakeXMLHttpRequest.call(this);
	    }
	    FakeRequest.prototype = Object.create(FakeXMLHttpRequest.prototype);
	    FakeRequest.prototype.constructor = FakeRequest;
	    // extend
	    FakeRequest.prototype.send = function send() {
	        this.sendArguments = arguments;
	        if (!ctx.pretender.running) {
	            throw new Error('You shut down a Pretender instance while there was a pending request. ' +
	                'That request just tried to complete. Check to see if you accidentally shut down ' +
	                'a pretender earlier than you intended to');
	        }
	        FakeXMLHttpRequest.prototype.send.apply(this, arguments);
	        if (ctx.pretender.checkPassthrough(this)) {
	            this.passthrough();
	        }
	        else {
	            ctx.pretender.handleRequest(this);
	        }
	    };
	    FakeRequest.prototype.passthrough = function passthrough() {
	        if (!this.sendArguments) {
	            throw new Error('You attempted to passthrough a FakeRequest that was never sent. ' +
	                'Call `.send()` on the original request first');
	        }
	        var xhr = createPassthrough(this, ctx.pretender._nativeXMLHttpRequest);
	        xhr.send.apply(xhr, this.sendArguments);
	        return xhr;
	    };
	    FakeRequest.prototype._passthroughCheck = function (method, args) {
	        if (this._passthroughRequest) {
	            return this._passthroughRequest[method].apply(this._passthroughRequest, args);
	        }
	        return FakeXMLHttpRequest.prototype[method].apply(this, args);
	    };
	    FakeRequest.prototype.abort = function abort() {
	        return this._passthroughCheck('abort', arguments);
	    };
	    FakeRequest.prototype.getResponseHeader = function getResponseHeader() {
	        return this._passthroughCheck('getResponseHeader', arguments);
	    };
	    FakeRequest.prototype.getAllResponseHeaders = function getAllResponseHeaders() {
	        return this._passthroughCheck('getAllResponseHeaders', arguments);
	    };
	    if (ctx.pretender._nativeXMLHttpRequest.prototype._passthroughCheck) {
	        // eslint-disable-next-line no-console
	        console.warn('You created a second Pretender instance while there was already one running. ' +
	            'Running two Pretender servers at once will lead to unexpected results and will ' +
	            'be removed entirely in a future major version.' +
	            'Please call .shutdown() on your instances when you no longer need them to respond.');
	    }
	    return FakeRequest;
	}

	var NoopArray = /** @class */ (function () {
	    function NoopArray() {
	        this.length = 0;
	    }
	    NoopArray.prototype.push = function () {
	        var _items = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            _items[_i] = arguments[_i];
	        }
	        return 0;
	    };
	    return NoopArray;
	}());
	function scheduleProgressEvent(request, startTime, totalTime) {
	    var totalSize = 0;
	    var body = request.requestBody;
	    if (body) {
	        if (body instanceof FormData) {
	            body.forEach(function (value) {
	                if (value instanceof File) {
	                    totalSize += value.size;
	                }
	                else {
	                    totalSize += value.length;
	                }
	            });
	        }
	        else {
	            // Support Blob, BufferSource, USVString, ArrayBufferView
	            totalSize = body.byteLength || body.size || body.length || 0;
	        }
	    }
	    setTimeout(function () {
	        if (!request.aborted && !request.status) {
	            var elapsedTime = new Date().getTime() - startTime.getTime();
	            var progressTransmitted = totalTime <= 0 ? 0 : (elapsedTime / totalTime) * totalSize;
	            // ProgressEvent expects loaded, total
	            // https://xhr.spec.whatwg.org/#interface-progressevent
	            request.upload._progress(true, progressTransmitted, totalSize);
	            request._progress(true, progressTransmitted, totalSize);
	            scheduleProgressEvent(request, startTime, totalTime);
	        }
	        else if (request.status) {
	            // we're done, send a final progress event with loaded === total
	            request.upload._progress(true, totalSize, totalSize);
	            request._progress(true, totalSize, totalSize);
	        }
	    }, 50);
	}
	function isArray$1(array) {
	    return Object.prototype.toString.call(array) === '[object Array]';
	}
	var PASSTHROUGH = {};
	function verbify(verb) {
	    return function (path, handler, async) {
	        return this.register(verb, path, handler, async);
	    };
	}
	var Pretender = /** @class */ (function () {
	    function Pretender() {
	        var _this = this;
	        this.hosts = new Hosts();
	        this.handlers = [];
	        this.get = verbify('GET');
	        this.post = verbify('POST');
	        this.put = verbify('PUT');
	        this.delete = verbify('DELETE');
	        this.patch = verbify('PATCH');
	        this.head = verbify('HEAD');
	        this.options = verbify('OPTIONS');
	        this.passthrough = PASSTHROUGH;
	        var lastArg = arguments[arguments.length - 1];
	        var options = typeof lastArg === 'object' ? lastArg : null;
	        var shouldNotTrack = options && options.trackRequests === false;
	        this.handledRequests = shouldNotTrack ? new NoopArray() : [];
	        this.passthroughRequests = shouldNotTrack ? new NoopArray() : [];
	        this.unhandledRequests = shouldNotTrack ? new NoopArray() : [];
	        this.requestReferences = [];
	        this.forcePassthrough = options && options.forcePassthrough === true;
	        this.disableUnhandled = options && options.disableUnhandled === true;
	        // reference the native XMLHttpRequest object so
	        // it can be restored later
	        this._nativeXMLHttpRequest = self.XMLHttpRequest;
	        this.running = false;
	        var ctx = { pretender: this };
	        this.ctx = ctx;
	        // capture xhr requests, channeling them into
	        // the route map.
	        self.XMLHttpRequest = interceptor(ctx);
	        // polyfill fetch when xhr is ready
	        this._fetchProps = FakeFetch
	            ? ['fetch', 'Headers', 'Request', 'Response']
	            : [];
	        this._fetchProps.forEach(function (name) {
	            _this['_native' + name] = self[name];
	            self[name] = FakeFetch[name];
	        }, this);
	        // 'start' the server
	        this.running = true;
	        // trigger the route map DSL.
	        var argLength = options ? arguments.length - 1 : arguments.length;
	        for (var i = 0; i < argLength; i++) {
	            this.map(arguments[i]);
	        }
	    }
	    Pretender.prototype.map = function (maps) {
	        maps.call(this);
	    };
	    Pretender.prototype.register = function (verb, url, handler, async) {
	        if (!handler) {
	            throw new Error('The function you tried passing to Pretender to handle ' +
	                verb +
	                ' ' +
	                url +
	                ' is undefined or missing.');
	        }
	        var handlerInstance = handler;
	        handlerInstance.numberOfCalls = 0;
	        handlerInstance.async = async;
	        this.handlers.push(handlerInstance);
	        var registry = this.hosts.forURL(url)[verb];
	        registry.add([
	            {
	                path: parseURL(url).fullpath,
	                handler: handlerInstance,
	            },
	        ]);
	        return handlerInstance;
	    };
	    Pretender.prototype.checkPassthrough = function (request) {
	        var verb = request.method.toUpperCase();
	        var path = parseURL(request.url).fullpath;
	        var recognized = this.hosts.forURL(request.url)[verb].recognize(path);
	        var match = recognized && recognized[0];
	        if ((match && match.handler === PASSTHROUGH) || this.forcePassthrough) {
	            this.passthroughRequests.push(request);
	            this.passthroughRequest(verb, path, request);
	            return true;
	        }
	        return false;
	    };
	    Pretender.prototype.handleRequest = function (request) {
	        var verb = request.method.toUpperCase();
	        var path = request.url;
	        var handler = this._handlerFor(verb, path, request);
	        if (handler) {
	            handler.handler.numberOfCalls++;
	            var async_1 = handler.handler.async;
	            this.handledRequests.push(request);
	            var pretender_1 = this;
	            var _handleRequest_1 = function (statusHeadersAndBody) {
	                if (!isArray$1(statusHeadersAndBody)) {
	                    var note = 'Remember to `return [status, headers, body];` in your route handler.';
	                    throw new Error('Nothing returned by handler for ' + path + '. ' + note);
	                }
	                var status = statusHeadersAndBody[0];
	                var headers = pretender_1.prepareHeaders(statusHeadersAndBody[1]);
	                var body = pretender_1.prepareBody(statusHeadersAndBody[2], headers);
	                pretender_1.handleResponse(request, async_1, function () {
	                    request.respond(status, headers, body);
	                    pretender_1.handledRequest(verb, path, request);
	                });
	            };
	            try {
	                var result = handler.handler(request);
	                if (result && typeof result.then === 'function') {
	                    // `result` is a promise, resolve it
	                    result.then(function (resolvedResult) {
	                        _handleRequest_1(resolvedResult);
	                    });
	                }
	                else {
	                    _handleRequest_1(result);
	                }
	            }
	            catch (error) {
	                this.erroredRequest(verb, path, request, error);
	                this.resolve(request);
	            }
	        }
	        else {
	            if (!this.disableUnhandled) {
	                this.unhandledRequests.push(request);
	                this.unhandledRequest(verb, path, request);
	            }
	        }
	    };
	    Pretender.prototype.handleResponse = function (request, strategy, callback) {
	        var delay = typeof strategy === 'function' ? strategy() : strategy;
	        delay = typeof delay === 'boolean' || typeof delay === 'number' ? delay : 0;
	        if (delay === false) {
	            callback();
	        }
	        else {
	            var pretender_2 = this;
	            pretender_2.requestReferences.push({
	                request: request,
	                callback: callback,
	            });
	            if (delay !== true) {
	                scheduleProgressEvent(request, new Date(), delay);
	                setTimeout(function () {
	                    pretender_2.resolve(request);
	                }, delay);
	            }
	        }
	    };
	    Pretender.prototype.resolve = function (request) {
	        for (var i = 0, len = this.requestReferences.length; i < len; i++) {
	            var res = this.requestReferences[i];
	            if (res.request === request) {
	                res.callback();
	                this.requestReferences.splice(i, 1);
	                break;
	            }
	        }
	    };
	    Pretender.prototype.requiresManualResolution = function (verb, path) {
	        var handler = this._handlerFor(verb.toUpperCase(), path, {});
	        if (!handler) {
	            return false;
	        }
	        var async = handler.handler.async;
	        return typeof async === 'function' ? async() === true : async === true;
	    };
	    Pretender.prototype.prepareBody = function (body, _headers) {
	        return body;
	    };
	    Pretender.prototype.prepareHeaders = function (headers) {
	        return headers;
	    };
	    Pretender.prototype.handledRequest = function (_verb, _path, _request) {
	        /* no-op */
	    };
	    Pretender.prototype.passthroughRequest = function (_verb, _path, _request) {
	        /* no-op */
	    };
	    Pretender.prototype.unhandledRequest = function (verb, path, _request) {
	        throw new Error('Pretender intercepted ' +
	            verb +
	            ' ' +
	            path +
	            ' but no handler was defined for this type of request');
	    };
	    Pretender.prototype.erroredRequest = function (verb, path, _request, error) {
	        error.message =
	            'Pretender intercepted ' +
	                verb +
	                ' ' +
	                path +
	                ' but encountered an error: ' +
	                error.message;
	        throw error;
	    };
	    Pretender.prototype.shutdown = function () {
	        var _this = this;
	        self.XMLHttpRequest = this._nativeXMLHttpRequest;
	        this._fetchProps.forEach(function (name) {
	            self[name] = _this['_native' + name];
	        }, this);
	        this.ctx.pretender = undefined;
	        // 'stop' the server
	        this.running = false;
	    };
	    Pretender.prototype._handlerFor = function (verb, url, request) {
	        var registry = this.hosts.forURL(url)[verb];
	        var matches = registry.recognize(parseURL(url).fullpath);
	        var match = matches ? matches[0] : null;
	        if (match) {
	            request.params = match.params;
	            request.queryParams = matches.queryParams;
	        }
	        return match;
	    };
	    Pretender.parseURL = parseURL;
	    Pretender.Hosts = Hosts;
	    Pretender.Registry = Registry;
	    return Pretender;
	}());

	Pretender.parseURL = parseURL;
	Pretender.Hosts = Hosts;
	Pretender.Registry = Registry;

	return Pretender;

}());
