function _iterableToArrayLimit(arr, i) {
  var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"];
  if (null != _i) {
    var _s,
      _e,
      _x,
      _r,
      _arr = [],
      _n = !0,
      _d = !1;
    try {
      if (_x = (_i = _i.call(arr)).next, 0 === i) {
        if (Object(_i) !== _i) return;
        _n = !1;
      } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0);
    } catch (err) {
      _d = !0, _e = err;
    } finally {
      try {
        if (!_n && null != _i.return && (_r = _i.return(), Object(_r) !== _r)) return;
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}
function _classPrivateFieldGet(receiver, privateMap) {
  var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get");
  return _classApplyDescriptorGet(receiver, descriptor);
}
function _classPrivateFieldSet(receiver, privateMap, value) {
  var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set");
  _classApplyDescriptorSet(receiver, descriptor, value);
  return value;
}
function _classExtractFieldDescriptor(receiver, privateMap, action) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to " + action + " private field on non-instance");
  }
  return privateMap.get(receiver);
}
function _classApplyDescriptorGet(receiver, descriptor) {
  if (descriptor.get) {
    return descriptor.get.call(receiver);
  }
  return descriptor.value;
}
function _classApplyDescriptorSet(receiver, descriptor, value) {
  if (descriptor.set) {
    descriptor.set.call(receiver, value);
  } else {
    if (!descriptor.writable) {
      throw new TypeError("attempted to set read only private field");
    }
    descriptor.value = value;
  }
}
function _classPrivateMethodGet(receiver, privateSet, fn) {
  if (!privateSet.has(receiver)) {
    throw new TypeError("attempted to get private field on non-instance");
  }
  return fn;
}
function _checkPrivateRedeclaration(obj, privateCollection) {
  if (privateCollection.has(obj)) {
    throw new TypeError("Cannot initialize the same private elements twice on an object");
  }
}
function _classPrivateFieldInitSpec(obj, privateMap, value) {
  _checkPrivateRedeclaration(obj, privateMap);
  privateMap.set(obj, value);
}
function _classPrivateMethodInitSpec(obj, privateSet) {
  _checkPrivateRedeclaration(obj, privateSet);
  privateSet.add(obj);
}

var list = [
	" daum[ /]",
	" deusu/",
	" yadirectfetcher",
	"(?:^| )site",
	"(?:^|[^g])news",
	"@[a-z]",
	"\\(at\\)[a-z]",
	"\\(github\\.com/",
	"\\[at\\][a-z]",
	"^12345",
	"^<",
	"^[\\w \\.\\-\\(\\)]+(/v?\\d+(\\.\\d+)?(\\.\\d{1,10})?)?$",
	"^[^ ]{50,}$",
	"^active",
	"^ad muncher",
	"^amaya",
	"^anglesharp/",
	"^anonymous",
	"^avsdevicesdk/",
	"^axios/",
	"^bidtellect/",
	"^biglotron",
	"^btwebclient/",
	"^castro",
	"^clamav[ /]",
	"^client/",
	"^cobweb/",
	"^coccoc",
	"^custom",
	"^ddg[_-]android",
	"^discourse",
	"^dispatch/\\d",
	"^downcast/",
	"^duckduckgo",
	"^facebook",
	"^fdm[ /]\\d",
	"^getright/",
	"^gozilla/",
	"^hatena",
	"^hobbit",
	"^hotzonu",
	"^hwcdn/",
	"^jeode/",
	"^jetty/",
	"^jigsaw",
	"^linkdex",
	"^lwp[-: ]",
	"^metauri",
	"^microsoft bits",
	"^movabletype",
	"^mozilla/\\d\\.\\d \\(compatible;?\\)$",
	"^mozilla/\\d\\.\\d \\w*$",
	"^navermailapp",
	"^netsurf",
	"^offline explorer",
	"^php",
	"^postman",
	"^postrank",
	"^python",
	"^read",
	"^reed",
	"^restsharp/",
	"^snapchat",
	"^space bison",
	"^svn",
	"^swcd ",
	"^taringa",
	"^test certificate info",
	"^thumbor/",
	"^tumblr/",
	"^user-agent:mozilla",
	"^valid",
	"^venus/fedoraplanet",
	"^w3c",
	"^webbandit/",
	"^webcopier",
	"^wget",
	"^whatsapp",
	"^xenu link sleuth",
	"^yahoo",
	"^yandex",
	"^zdm/\\d",
	"^zoom marketplace/",
	"^{{.*}}$",
	"adbeat\\.com",
	"appinsights",
	"archive",
	"ask jeeves/teoma",
	"bit\\.ly/",
	"bluecoat drtr",
	"bot",
	"browsex",
	"burpcollaborator",
	"capture",
	"catch",
	"check",
	"chrome-lighthouse",
	"chromeframe",
	"cloud",
	"crawl",
	"cryptoapi",
	"dareboost",
	"datanyze",
	"dataprovider",
	"dejaclick",
	"dmbrowser",
	"download",
	"evc-batch/",
	"feed",
	"firephp",
	"freesafeip",
	"ghost",
	"gomezagent",
	"google",
	"headlesschrome/",
	"http",
	"httrack",
	"hubspot marketing grader",
	"hydra",
	"ibisbrowser",
	"images",
	"iplabel",
	"ips-agent",
	"java",
	"library",
	"mail\\.ru/",
	"manager",
	"monitor",
	"morningscore/",
	"neustar wpm",
	"nutch",
	"offbyone",
	"optimize",
	"pageburst",
	"pagespeed",
	"perl",
	"phantom",
	"pingdom",
	"powermarks",
	"preview",
	"proxy",
	"ptst[ /]\\d",
	"reader",
	"rexx;",
	"rigor",
	"rss",
	"scan",
	"scrape",
	"search",
	"serp ?reputation ?management",
	"server",
	"sogou",
	"sparkler/",
	"speedcurve",
	"spider",
	"splash",
	"statuscake",
	"stumbleupon\\.com",
	"supercleaner",
	"synapse",
	"synthetic",
	"taginspector/",
	"torrent",
	"tracemyfile",
	"transcoder",
	"trendsmapresolver",
	"twingly recon",
	"url",
	"virtuoso",
	"wappalyzer",
	"webglance",
	"webkit2png",
	"websitemetadataretriever",
	"whatcms/",
	"wordpress",
	"zgrab"
];

/**
 * Mutate given list of patter strings
 * @param {string[]} list
 * @returns {string[]}
 */
function amend(list) {
  try {
    // Risk: Uses lookbehind assertion, avoid breakage in parsing by using RegExp constructor
    new RegExp('(?<! cu)bot').test('dangerbot'); // eslint-disable-line prefer-regex-literals
  } catch (error) {
    // Skip regex fixes
    return list;
  }
  [
  // Addresses: Cubot device
  ['bot', '(?<! cu)bot'],
  // Addresses: Android webview
  ['google', '(?<! (?:channel/|google/))google(?!(app|/google| pixel))'],
  // Addresses: libhttp browser
  ['http', '(?<!(?:lib))http'],
  // Addresses: java based browsers
  ['java', 'java(?!;)'],
  // Addresses: Yandex Search App
  ['search', '(?<! ya(?:yandex)?)search']].forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
      search = _ref2[0],
      replace = _ref2[1];
    var index = list.lastIndexOf(search);
    if (~index) {
      list.splice(index, 1, replace);
    }
  });
  return list;
}

amend(list);
var flags = 'i';

/**
 * Test user agents for matching patterns
 */
var _list = /*#__PURE__*/new WeakMap();
var _pattern = /*#__PURE__*/new WeakMap();
var _update = /*#__PURE__*/new WeakSet();
var _index = /*#__PURE__*/new WeakSet();
var Isbot = /*#__PURE__*/function () {
  function Isbot(patterns) {
    var _this = this;
    _classCallCheck(this, Isbot);
    /**
     * Find the first index of an existing rule or -1 if not found
     * @param  {string} rule
     * @returns {number}
     */
    _classPrivateMethodInitSpec(this, _index);
    /**
     * Recreate the pattern from rules list
     */
    _classPrivateMethodInitSpec(this, _update);
    /**
     * @type {string[]}
     */
    _classPrivateFieldInitSpec(this, _list, {
      writable: true,
      value: void 0
    });
    /**
     * @type {RegExp}
     */
    _classPrivateFieldInitSpec(this, _pattern, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldSet(this, _list, patterns || list.slice());
    _classPrivateMethodGet(this, _update, _update2).call(this);
    var isbot = function isbot(ua) {
      return _this.test(ua);
    };
    return Object.defineProperties(isbot, Object.entries(Object.getOwnPropertyDescriptors(Isbot.prototype)).reduce(function (accumulator, _ref) {
      var _ref2 = _slicedToArray(_ref, 2),
        prop = _ref2[0],
        descriptor = _ref2[1];
      if (typeof descriptor.value === 'function') {
        Object.assign(accumulator, _defineProperty({}, prop, {
          value: _this[prop].bind(_this)
        }));
      }
      if (typeof descriptor.get === 'function') {
        Object.assign(accumulator, _defineProperty({}, prop, {
          get: function get() {
            return _this[prop];
          }
        }));
      }
      return accumulator;
    }, {}));
  }
  _createClass(Isbot, [{
    key: "pattern",
    get:
    /**
     * Get a clone of the pattern
     * @type RegExp
     */
    function get() {
      return new RegExp(_classPrivateFieldGet(this, _pattern));
    }

    /**
     * Match given string against out pattern
     * @param  {string} ua User Agent string
     * @returns {boolean}
     */
  }, {
    key: "test",
    value: function test(ua) {
      return Boolean(ua) && _classPrivateFieldGet(this, _pattern).test(ua);
    }

    /**
     * Get the match for strings' known crawler pattern
     * @param  {string} ua User Agent string
     * @returns {string|null}
     */
  }, {
    key: "find",
    value: function find() {
      var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var match = ua.match(_classPrivateFieldGet(this, _pattern));
      return match && match[0];
    }

    /**
     * Get the patterns that match user agent string if any
     * @param  {string} ua User Agent string
     * @returns {string[]}
     */
  }, {
    key: "matches",
    value: function matches() {
      var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      return _classPrivateFieldGet(this, _list).filter(function (entry) {
        return new RegExp(entry, flags).test(ua);
      });
    }

    /**
     * Clear all patterns that match user agent
     * @param  {string} ua User Agent string
     * @returns {void}
     */
  }, {
    key: "clear",
    value: function clear() {
      var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      this.exclude(this.matches(ua));
    }

    /**
     * Extent patterns for known crawlers
     * @param  {string[]} filters
     * @returns {void}
     */
  }, {
    key: "extend",
    value: function extend() {
      var _this2 = this;
      var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      [].push.apply(_classPrivateFieldGet(this, _list), filters.filter(function (rule) {
        return _classPrivateMethodGet(_this2, _index, _index2).call(_this2, rule) === -1;
      }).map(function (filter) {
        return filter.toLowerCase();
      }));
      _classPrivateMethodGet(this, _update, _update2).call(this);
    }

    /**
     * Exclude patterns from bot pattern rule
     * @param  {string[]} filters
     * @returns {void}
     */
  }, {
    key: "exclude",
    value: function exclude() {
      var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var length = filters.length;
      while (length--) {
        var index = _classPrivateMethodGet(this, _index, _index2).call(this, filters[length]);
        if (index > -1) {
          _classPrivateFieldGet(this, _list).splice(index, 1);
        }
      }
      _classPrivateMethodGet(this, _update, _update2).call(this);
    }

    /**
     * Create a new Isbot instance using given list or self's list
     * @param  {string[]} [list]
     * @returns {Isbot}
     */
  }, {
    key: "spawn",
    value: function spawn(list) {
      return new Isbot(list || _classPrivateFieldGet(this, _list));
    }
  }]);
  return Isbot;
}();
function _update2() {
  _classPrivateFieldSet(this, _pattern, new RegExp(_classPrivateFieldGet(this, _list).join('|'), flags));
}
function _index2(rule) {
  return _classPrivateFieldGet(this, _list).indexOf(rule.toLowerCase());
}

var isbot = new Isbot();

export { isbot as default };
//# sourceMappingURL=index.mjs.map
