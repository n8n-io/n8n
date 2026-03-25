var luxon = (function (exports) {
  'use strict';

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
  function _extends() {
    _extends = Object.assign ? Object.assign.bind() : function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    };
    return _extends.apply(this, arguments);
  }
  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    _setPrototypeOf(subClass, superClass);
  }
  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }
  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };
    return _setPrototypeOf(o, p);
  }
  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct.bind();
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }
    return _construct.apply(null, arguments);
  }
  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }
  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;
    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class)) return Class;
      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }
      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);
        _cache.set(Class, Wrapper);
      }
      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }
      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };
    return _wrapNativeSuper(Class);
  }
  function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;
    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }
    return target;
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
  function _createForOfIteratorHelperLoose(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
    if (it) return (it = it.call(o)).next.bind(it);
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;
      return function () {
        if (i >= o.length) return {
          done: true
        };
        return {
          done: false,
          value: o[i++]
        };
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
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

  // these aren't really private, but nor are they really useful to document
  /**
   * @private
   */
  var LuxonError = /*#__PURE__*/function (_Error) {
    _inheritsLoose(LuxonError, _Error);
    function LuxonError() {
      return _Error.apply(this, arguments) || this;
    }
    return LuxonError;
  }( /*#__PURE__*/_wrapNativeSuper(Error));
  /**
   * @private
   */
  var InvalidDateTimeError = /*#__PURE__*/function (_LuxonError) {
    _inheritsLoose(InvalidDateTimeError, _LuxonError);
    function InvalidDateTimeError(reason) {
      return _LuxonError.call(this, "Invalid DateTime: " + reason.toMessage()) || this;
    }
    return InvalidDateTimeError;
  }(LuxonError);

  /**
   * @private
   */
  var InvalidIntervalError = /*#__PURE__*/function (_LuxonError2) {
    _inheritsLoose(InvalidIntervalError, _LuxonError2);
    function InvalidIntervalError(reason) {
      return _LuxonError2.call(this, "Invalid Interval: " + reason.toMessage()) || this;
    }
    return InvalidIntervalError;
  }(LuxonError);

  /**
   * @private
   */
  var InvalidDurationError = /*#__PURE__*/function (_LuxonError3) {
    _inheritsLoose(InvalidDurationError, _LuxonError3);
    function InvalidDurationError(reason) {
      return _LuxonError3.call(this, "Invalid Duration: " + reason.toMessage()) || this;
    }
    return InvalidDurationError;
  }(LuxonError);

  /**
   * @private
   */
  var ConflictingSpecificationError = /*#__PURE__*/function (_LuxonError4) {
    _inheritsLoose(ConflictingSpecificationError, _LuxonError4);
    function ConflictingSpecificationError() {
      return _LuxonError4.apply(this, arguments) || this;
    }
    return ConflictingSpecificationError;
  }(LuxonError);

  /**
   * @private
   */
  var InvalidUnitError = /*#__PURE__*/function (_LuxonError5) {
    _inheritsLoose(InvalidUnitError, _LuxonError5);
    function InvalidUnitError(unit) {
      return _LuxonError5.call(this, "Invalid unit " + unit) || this;
    }
    return InvalidUnitError;
  }(LuxonError);

  /**
   * @private
   */
  var InvalidArgumentError = /*#__PURE__*/function (_LuxonError6) {
    _inheritsLoose(InvalidArgumentError, _LuxonError6);
    function InvalidArgumentError() {
      return _LuxonError6.apply(this, arguments) || this;
    }
    return InvalidArgumentError;
  }(LuxonError);

  /**
   * @private
   */
  var ZoneIsAbstractError = /*#__PURE__*/function (_LuxonError7) {
    _inheritsLoose(ZoneIsAbstractError, _LuxonError7);
    function ZoneIsAbstractError() {
      return _LuxonError7.call(this, "Zone is an abstract class") || this;
    }
    return ZoneIsAbstractError;
  }(LuxonError);

  /**
   * @private
   */

  var n = "numeric",
    s = "short",
    l = "long";
  var DATE_SHORT = {
    year: n,
    month: n,
    day: n
  };
  var DATE_MED = {
    year: n,
    month: s,
    day: n
  };
  var DATE_MED_WITH_WEEKDAY = {
    year: n,
    month: s,
    day: n,
    weekday: s
  };
  var DATE_FULL = {
    year: n,
    month: l,
    day: n
  };
  var DATE_HUGE = {
    year: n,
    month: l,
    day: n,
    weekday: l
  };
  var TIME_SIMPLE = {
    hour: n,
    minute: n
  };
  var TIME_WITH_SECONDS = {
    hour: n,
    minute: n,
    second: n
  };
  var TIME_WITH_SHORT_OFFSET = {
    hour: n,
    minute: n,
    second: n,
    timeZoneName: s
  };
  var TIME_WITH_LONG_OFFSET = {
    hour: n,
    minute: n,
    second: n,
    timeZoneName: l
  };
  var TIME_24_SIMPLE = {
    hour: n,
    minute: n,
    hourCycle: "h23"
  };
  var TIME_24_WITH_SECONDS = {
    hour: n,
    minute: n,
    second: n,
    hourCycle: "h23"
  };
  var TIME_24_WITH_SHORT_OFFSET = {
    hour: n,
    minute: n,
    second: n,
    hourCycle: "h23",
    timeZoneName: s
  };
  var TIME_24_WITH_LONG_OFFSET = {
    hour: n,
    minute: n,
    second: n,
    hourCycle: "h23",
    timeZoneName: l
  };
  var DATETIME_SHORT = {
    year: n,
    month: n,
    day: n,
    hour: n,
    minute: n
  };
  var DATETIME_SHORT_WITH_SECONDS = {
    year: n,
    month: n,
    day: n,
    hour: n,
    minute: n,
    second: n
  };
  var DATETIME_MED = {
    year: n,
    month: s,
    day: n,
    hour: n,
    minute: n
  };
  var DATETIME_MED_WITH_SECONDS = {
    year: n,
    month: s,
    day: n,
    hour: n,
    minute: n,
    second: n
  };
  var DATETIME_MED_WITH_WEEKDAY = {
    year: n,
    month: s,
    day: n,
    weekday: s,
    hour: n,
    minute: n
  };
  var DATETIME_FULL = {
    year: n,
    month: l,
    day: n,
    hour: n,
    minute: n,
    timeZoneName: s
  };
  var DATETIME_FULL_WITH_SECONDS = {
    year: n,
    month: l,
    day: n,
    hour: n,
    minute: n,
    second: n,
    timeZoneName: s
  };
  var DATETIME_HUGE = {
    year: n,
    month: l,
    day: n,
    weekday: l,
    hour: n,
    minute: n,
    timeZoneName: l
  };
  var DATETIME_HUGE_WITH_SECONDS = {
    year: n,
    month: l,
    day: n,
    weekday: l,
    hour: n,
    minute: n,
    second: n,
    timeZoneName: l
  };

  /**
   * @interface
   */
  var Zone = /*#__PURE__*/function () {
    function Zone() {}
    var _proto = Zone.prototype;
    /**
     * Returns the offset's common name (such as EST) at the specified timestamp
     * @abstract
     * @param {number} ts - Epoch milliseconds for which to get the name
     * @param {Object} opts - Options to affect the format
     * @param {string} opts.format - What style of offset to return. Accepts 'long' or 'short'.
     * @param {string} opts.locale - What locale to return the offset name in.
     * @return {string}
     */
    _proto.offsetName = function offsetName(ts, opts) {
      throw new ZoneIsAbstractError();
    }

    /**
     * Returns the offset's value as a string
     * @abstract
     * @param {number} ts - Epoch milliseconds for which to get the offset
     * @param {string} format - What style of offset to return.
     *                          Accepts 'narrow', 'short', or 'techie'. Returning '+6', '+06:00', or '+0600' respectively
     * @return {string}
     */;
    _proto.formatOffset = function formatOffset(ts, format) {
      throw new ZoneIsAbstractError();
    }

    /**
     * Return the offset in minutes for this zone at the specified timestamp.
     * @abstract
     * @param {number} ts - Epoch milliseconds for which to compute the offset
     * @return {number}
     */;
    _proto.offset = function offset(ts) {
      throw new ZoneIsAbstractError();
    }

    /**
     * Return whether this Zone is equal to another zone
     * @abstract
     * @param {Zone} otherZone - the zone to compare
     * @return {boolean}
     */;
    _proto.equals = function equals(otherZone) {
      throw new ZoneIsAbstractError();
    }

    /**
     * Return whether this Zone is valid.
     * @abstract
     * @type {boolean}
     */;
    _createClass(Zone, [{
      key: "type",
      get:
      /**
       * The type of zone
       * @abstract
       * @type {string}
       */
      function get() {
        throw new ZoneIsAbstractError();
      }

      /**
       * The name of this zone.
       * @abstract
       * @type {string}
       */
    }, {
      key: "name",
      get: function get() {
        throw new ZoneIsAbstractError();
      }

      /**
       * The IANA name of this zone.
       * Defaults to `name` if not overwritten by a subclass.
       * @abstract
       * @type {string}
       */
    }, {
      key: "ianaName",
      get: function get() {
        return this.name;
      }

      /**
       * Returns whether the offset is known to be fixed for the whole year.
       * @abstract
       * @type {boolean}
       */
    }, {
      key: "isUniversal",
      get: function get() {
        throw new ZoneIsAbstractError();
      }
    }, {
      key: "isValid",
      get: function get() {
        throw new ZoneIsAbstractError();
      }
    }]);
    return Zone;
  }();

  var singleton$1 = null;

  /**
   * Represents the local zone for this JavaScript environment.
   * @implements {Zone}
   */
  var SystemZone = /*#__PURE__*/function (_Zone) {
    _inheritsLoose(SystemZone, _Zone);
    function SystemZone() {
      return _Zone.apply(this, arguments) || this;
    }
    var _proto = SystemZone.prototype;
    /** @override **/
    _proto.offsetName = function offsetName(ts, _ref) {
      var format = _ref.format,
        locale = _ref.locale;
      return parseZoneInfo(ts, format, locale);
    }

    /** @override **/;
    _proto.formatOffset = function formatOffset$1(ts, format) {
      return formatOffset(this.offset(ts), format);
    }

    /** @override **/;
    _proto.offset = function offset(ts) {
      return -new Date(ts).getTimezoneOffset();
    }

    /** @override **/;
    _proto.equals = function equals(otherZone) {
      return otherZone.type === "system";
    }

    /** @override **/;
    _createClass(SystemZone, [{
      key: "type",
      get: /** @override **/
      function get() {
        return "system";
      }

      /** @override **/
    }, {
      key: "name",
      get: function get() {
        return new Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      /** @override **/
    }, {
      key: "isUniversal",
      get: function get() {
        return false;
      }
    }, {
      key: "isValid",
      get: function get() {
        return true;
      }
    }], [{
      key: "instance",
      get:
      /**
       * Get a singleton instance of the local zone
       * @return {SystemZone}
       */
      function get() {
        if (singleton$1 === null) {
          singleton$1 = new SystemZone();
        }
        return singleton$1;
      }
    }]);
    return SystemZone;
  }(Zone);

  var dtfCache = new Map();
  function makeDTF(zoneName) {
    var dtf = dtfCache.get(zoneName);
    if (dtf === undefined) {
      dtf = new Intl.DateTimeFormat("en-US", {
        hour12: false,
        timeZone: zoneName,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        era: "short"
      });
      dtfCache.set(zoneName, dtf);
    }
    return dtf;
  }
  var typeToPos = {
    year: 0,
    month: 1,
    day: 2,
    era: 3,
    hour: 4,
    minute: 5,
    second: 6
  };
  function hackyOffset(dtf, date) {
    var formatted = dtf.format(date).replace(/\u200E/g, ""),
      parsed = /(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(formatted),
      fMonth = parsed[1],
      fDay = parsed[2],
      fYear = parsed[3],
      fadOrBc = parsed[4],
      fHour = parsed[5],
      fMinute = parsed[6],
      fSecond = parsed[7];
    return [fYear, fMonth, fDay, fadOrBc, fHour, fMinute, fSecond];
  }
  function partsOffset(dtf, date) {
    var formatted = dtf.formatToParts(date);
    var filled = [];
    for (var i = 0; i < formatted.length; i++) {
      var _formatted$i = formatted[i],
        type = _formatted$i.type,
        value = _formatted$i.value;
      var pos = typeToPos[type];
      if (type === "era") {
        filled[pos] = value;
      } else if (!isUndefined(pos)) {
        filled[pos] = parseInt(value, 10);
      }
    }
    return filled;
  }
  var ianaZoneCache = new Map();
  /**
   * A zone identified by an IANA identifier, like America/New_York
   * @implements {Zone}
   */
  var IANAZone = /*#__PURE__*/function (_Zone) {
    _inheritsLoose(IANAZone, _Zone);
    /**
     * @param {string} name - Zone name
     * @return {IANAZone}
     */
    IANAZone.create = function create(name) {
      var zone = ianaZoneCache.get(name);
      if (zone === undefined) {
        ianaZoneCache.set(name, zone = new IANAZone(name));
      }
      return zone;
    }

    /**
     * Reset local caches. Should only be necessary in testing scenarios.
     * @return {void}
     */;
    IANAZone.resetCache = function resetCache() {
      ianaZoneCache.clear();
      dtfCache.clear();
    }

    /**
     * Returns whether the provided string is a valid specifier. This only checks the string's format, not that the specifier identifies a known zone; see isValidZone for that.
     * @param {string} s - The string to check validity on
     * @example IANAZone.isValidSpecifier("America/New_York") //=> true
     * @example IANAZone.isValidSpecifier("Sport~~blorp") //=> false
     * @deprecated For backward compatibility, this forwards to isValidZone, better use `isValidZone()` directly instead.
     * @return {boolean}
     */;
    IANAZone.isValidSpecifier = function isValidSpecifier(s) {
      return this.isValidZone(s);
    }

    /**
     * Returns whether the provided string identifies a real zone
     * @param {string} zone - The string to check
     * @example IANAZone.isValidZone("America/New_York") //=> true
     * @example IANAZone.isValidZone("Fantasia/Castle") //=> false
     * @example IANAZone.isValidZone("Sport~~blorp") //=> false
     * @return {boolean}
     */;
    IANAZone.isValidZone = function isValidZone(zone) {
      if (!zone) {
        return false;
      }
      try {
        new Intl.DateTimeFormat("en-US", {
          timeZone: zone
        }).format();
        return true;
      } catch (e) {
        return false;
      }
    };
    function IANAZone(name) {
      var _this;
      _this = _Zone.call(this) || this;
      /** @private **/
      _this.zoneName = name;
      /** @private **/
      _this.valid = IANAZone.isValidZone(name);
      return _this;
    }

    /**
     * The type of zone. `iana` for all instances of `IANAZone`.
     * @override
     * @type {string}
     */
    var _proto = IANAZone.prototype;
    /**
     * Returns the offset's common name (such as EST) at the specified timestamp
     * @override
     * @param {number} ts - Epoch milliseconds for which to get the name
     * @param {Object} opts - Options to affect the format
     * @param {string} opts.format - What style of offset to return. Accepts 'long' or 'short'.
     * @param {string} opts.locale - What locale to return the offset name in.
     * @return {string}
     */
    _proto.offsetName = function offsetName(ts, _ref) {
      var format = _ref.format,
        locale = _ref.locale;
      return parseZoneInfo(ts, format, locale, this.name);
    }

    /**
     * Returns the offset's value as a string
     * @override
     * @param {number} ts - Epoch milliseconds for which to get the offset
     * @param {string} format - What style of offset to return.
     *                          Accepts 'narrow', 'short', or 'techie'. Returning '+6', '+06:00', or '+0600' respectively
     * @return {string}
     */;
    _proto.formatOffset = function formatOffset$1(ts, format) {
      return formatOffset(this.offset(ts), format);
    }

    /**
     * Return the offset in minutes for this zone at the specified timestamp.
     * @override
     * @param {number} ts - Epoch milliseconds for which to compute the offset
     * @return {number}
     */;
    _proto.offset = function offset(ts) {
      if (!this.valid) return NaN;
      var date = new Date(ts);
      if (isNaN(date)) return NaN;
      var dtf = makeDTF(this.name);
      var _ref2 = dtf.formatToParts ? partsOffset(dtf, date) : hackyOffset(dtf, date),
        year = _ref2[0],
        month = _ref2[1],
        day = _ref2[2],
        adOrBc = _ref2[3],
        hour = _ref2[4],
        minute = _ref2[5],
        second = _ref2[6];
      if (adOrBc === "BC") {
        year = -Math.abs(year) + 1;
      }

      // because we're using hour12 and https://bugs.chromium.org/p/chromium/issues/detail?id=1025564&can=2&q=%2224%3A00%22%20datetimeformat
      var adjustedHour = hour === 24 ? 0 : hour;
      var asUTC = objToLocalTS({
        year: year,
        month: month,
        day: day,
        hour: adjustedHour,
        minute: minute,
        second: second,
        millisecond: 0
      });
      var asTS = +date;
      var over = asTS % 1000;
      asTS -= over >= 0 ? over : 1000 + over;
      return (asUTC - asTS) / (60 * 1000);
    }

    /**
     * Return whether this Zone is equal to another zone
     * @override
     * @param {Zone} otherZone - the zone to compare
     * @return {boolean}
     */;
    _proto.equals = function equals(otherZone) {
      return otherZone.type === "iana" && otherZone.name === this.name;
    }

    /**
     * Return whether this Zone is valid.
     * @override
     * @type {boolean}
     */;
    _createClass(IANAZone, [{
      key: "type",
      get: function get() {
        return "iana";
      }

      /**
       * The name of this zone (i.e. the IANA zone name).
       * @override
       * @type {string}
       */
    }, {
      key: "name",
      get: function get() {
        return this.zoneName;
      }

      /**
       * Returns whether the offset is known to be fixed for the whole year:
       * Always returns false for all IANA zones.
       * @override
       * @type {boolean}
       */
    }, {
      key: "isUniversal",
      get: function get() {
        return false;
      }
    }, {
      key: "isValid",
      get: function get() {
        return this.valid;
      }
    }]);
    return IANAZone;
  }(Zone);

  var _excluded = ["base"],
    _excluded2 = ["padTo", "floor"];

  // todo - remap caching

  var intlLFCache = {};
  function getCachedLF(locString, opts) {
    if (opts === void 0) {
      opts = {};
    }
    var key = JSON.stringify([locString, opts]);
    var dtf = intlLFCache[key];
    if (!dtf) {
      dtf = new Intl.ListFormat(locString, opts);
      intlLFCache[key] = dtf;
    }
    return dtf;
  }
  var intlDTCache = new Map();
  function getCachedDTF(locString, opts) {
    if (opts === void 0) {
      opts = {};
    }
    var key = JSON.stringify([locString, opts]);
    var dtf = intlDTCache.get(key);
    if (dtf === undefined) {
      dtf = new Intl.DateTimeFormat(locString, opts);
      intlDTCache.set(key, dtf);
    }
    return dtf;
  }
  var intlNumCache = new Map();
  function getCachedINF(locString, opts) {
    if (opts === void 0) {
      opts = {};
    }
    var key = JSON.stringify([locString, opts]);
    var inf = intlNumCache.get(key);
    if (inf === undefined) {
      inf = new Intl.NumberFormat(locString, opts);
      intlNumCache.set(key, inf);
    }
    return inf;
  }
  var intlRelCache = new Map();
  function getCachedRTF(locString, opts) {
    if (opts === void 0) {
      opts = {};
    }
    var _opts = opts;
      _opts.base;
      var cacheKeyOpts = _objectWithoutPropertiesLoose(_opts, _excluded); // exclude `base` from the options
    var key = JSON.stringify([locString, cacheKeyOpts]);
    var inf = intlRelCache.get(key);
    if (inf === undefined) {
      inf = new Intl.RelativeTimeFormat(locString, opts);
      intlRelCache.set(key, inf);
    }
    return inf;
  }
  var sysLocaleCache = null;
  function systemLocale() {
    if (sysLocaleCache) {
      return sysLocaleCache;
    } else {
      sysLocaleCache = new Intl.DateTimeFormat().resolvedOptions().locale;
      return sysLocaleCache;
    }
  }
  var intlResolvedOptionsCache = new Map();
  function getCachedIntResolvedOptions(locString) {
    var opts = intlResolvedOptionsCache.get(locString);
    if (opts === undefined) {
      opts = new Intl.DateTimeFormat(locString).resolvedOptions();
      intlResolvedOptionsCache.set(locString, opts);
    }
    return opts;
  }
  var weekInfoCache = new Map();
  function getCachedWeekInfo(locString) {
    var data = weekInfoCache.get(locString);
    if (!data) {
      var locale = new Intl.Locale(locString);
      // browsers currently implement this as a property, but spec says it should be a getter function
      data = "getWeekInfo" in locale ? locale.getWeekInfo() : locale.weekInfo;
      // minimalDays was removed from WeekInfo: https://github.com/tc39/proposal-intl-locale-info/issues/86
      if (!("minimalDays" in data)) {
        data = _extends({}, fallbackWeekSettings, data);
      }
      weekInfoCache.set(locString, data);
    }
    return data;
  }
  function parseLocaleString(localeStr) {
    // I really want to avoid writing a BCP 47 parser
    // see, e.g. https://github.com/wooorm/bcp-47
    // Instead, we'll do this:

    // a) if the string has no -u extensions, just leave it alone
    // b) if it does, use Intl to resolve everything
    // c) if Intl fails, try again without the -u

    // private subtags and unicode subtags have ordering requirements,
    // and we're not properly parsing this, so just strip out the
    // private ones if they exist.
    var xIndex = localeStr.indexOf("-x-");
    if (xIndex !== -1) {
      localeStr = localeStr.substring(0, xIndex);
    }
    var uIndex = localeStr.indexOf("-u-");
    if (uIndex === -1) {
      return [localeStr];
    } else {
      var options;
      var selectedStr;
      try {
        options = getCachedDTF(localeStr).resolvedOptions();
        selectedStr = localeStr;
      } catch (e) {
        var smaller = localeStr.substring(0, uIndex);
        options = getCachedDTF(smaller).resolvedOptions();
        selectedStr = smaller;
      }
      var _options = options,
        numberingSystem = _options.numberingSystem,
        calendar = _options.calendar;
      return [selectedStr, numberingSystem, calendar];
    }
  }
  function intlConfigString(localeStr, numberingSystem, outputCalendar) {
    if (outputCalendar || numberingSystem) {
      if (!localeStr.includes("-u-")) {
        localeStr += "-u";
      }
      if (outputCalendar) {
        localeStr += "-ca-" + outputCalendar;
      }
      if (numberingSystem) {
        localeStr += "-nu-" + numberingSystem;
      }
      return localeStr;
    } else {
      return localeStr;
    }
  }
  function mapMonths(f) {
    var ms = [];
    for (var i = 1; i <= 12; i++) {
      var dt = DateTime.utc(2009, i, 1);
      ms.push(f(dt));
    }
    return ms;
  }
  function mapWeekdays(f) {
    var ms = [];
    for (var i = 1; i <= 7; i++) {
      var dt = DateTime.utc(2016, 11, 13 + i);
      ms.push(f(dt));
    }
    return ms;
  }
  function listStuff(loc, length, englishFn, intlFn) {
    var mode = loc.listingMode();
    if (mode === "error") {
      return null;
    } else if (mode === "en") {
      return englishFn(length);
    } else {
      return intlFn(length);
    }
  }
  function supportsFastNumbers(loc) {
    if (loc.numberingSystem && loc.numberingSystem !== "latn") {
      return false;
    } else {
      return loc.numberingSystem === "latn" || !loc.locale || loc.locale.startsWith("en") || getCachedIntResolvedOptions(loc.locale).numberingSystem === "latn";
    }
  }

  /**
   * @private
   */
  var PolyNumberFormatter = /*#__PURE__*/function () {
    function PolyNumberFormatter(intl, forceSimple, opts) {
      this.padTo = opts.padTo || 0;
      this.floor = opts.floor || false;
      opts.padTo;
        opts.floor;
        var otherOpts = _objectWithoutPropertiesLoose(opts, _excluded2);
      if (!forceSimple || Object.keys(otherOpts).length > 0) {
        var intlOpts = _extends({
          useGrouping: false
        }, opts);
        if (opts.padTo > 0) intlOpts.minimumIntegerDigits = opts.padTo;
        this.inf = getCachedINF(intl, intlOpts);
      }
    }
    var _proto = PolyNumberFormatter.prototype;
    _proto.format = function format(i) {
      if (this.inf) {
        var fixed = this.floor ? Math.floor(i) : i;
        return this.inf.format(fixed);
      } else {
        // to match the browser's numberformatter defaults
        var _fixed = this.floor ? Math.floor(i) : roundTo(i, 3);
        return padStart(_fixed, this.padTo);
      }
    };
    return PolyNumberFormatter;
  }();
  /**
   * @private
   */
  var PolyDateFormatter = /*#__PURE__*/function () {
    function PolyDateFormatter(dt, intl, opts) {
      this.opts = opts;
      this.originalZone = undefined;
      var z = undefined;
      if (this.opts.timeZone) {
        // Don't apply any workarounds if a timeZone is explicitly provided in opts
        this.dt = dt;
      } else if (dt.zone.type === "fixed") {
        // UTC-8 or Etc/UTC-8 are not part of tzdata, only Etc/GMT+8 and the like.
        // That is why fixed-offset TZ is set to that unless it is:
        // 1. Representing offset 0 when UTC is used to maintain previous behavior and does not become GMT.
        // 2. Unsupported by the browser:
        //    - some do not support Etc/
        //    - < Etc/GMT-14, > Etc/GMT+12, and 30-minute or 45-minute offsets are not part of tzdata
        var gmtOffset = -1 * (dt.offset / 60);
        var offsetZ = gmtOffset >= 0 ? "Etc/GMT+" + gmtOffset : "Etc/GMT" + gmtOffset;
        if (dt.offset !== 0 && IANAZone.create(offsetZ).valid) {
          z = offsetZ;
          this.dt = dt;
        } else {
          // Not all fixed-offset zones like Etc/+4:30 are present in tzdata so
          // we manually apply the offset and substitute the zone as needed.
          z = "UTC";
          this.dt = dt.offset === 0 ? dt : dt.setZone("UTC").plus({
            minutes: dt.offset
          });
          this.originalZone = dt.zone;
        }
      } else if (dt.zone.type === "system") {
        this.dt = dt;
      } else if (dt.zone.type === "iana") {
        this.dt = dt;
        z = dt.zone.name;
      } else {
        // Custom zones can have any offset / offsetName so we just manually
        // apply the offset and substitute the zone as needed.
        z = "UTC";
        this.dt = dt.setZone("UTC").plus({
          minutes: dt.offset
        });
        this.originalZone = dt.zone;
      }
      var intlOpts = _extends({}, this.opts);
      intlOpts.timeZone = intlOpts.timeZone || z;
      this.dtf = getCachedDTF(intl, intlOpts);
    }
    var _proto2 = PolyDateFormatter.prototype;
    _proto2.format = function format() {
      if (this.originalZone) {
        // If we have to substitute in the actual zone name, we have to use
        // formatToParts so that the timezone can be replaced.
        return this.formatToParts().map(function (_ref) {
          var value = _ref.value;
          return value;
        }).join("");
      }
      return this.dtf.format(this.dt.toJSDate());
    };
    _proto2.formatToParts = function formatToParts() {
      var _this = this;
      var parts = this.dtf.formatToParts(this.dt.toJSDate());
      if (this.originalZone) {
        return parts.map(function (part) {
          if (part.type === "timeZoneName") {
            var offsetName = _this.originalZone.offsetName(_this.dt.ts, {
              locale: _this.dt.locale,
              format: _this.opts.timeZoneName
            });
            return _extends({}, part, {
              value: offsetName
            });
          } else {
            return part;
          }
        });
      }
      return parts;
    };
    _proto2.resolvedOptions = function resolvedOptions() {
      return this.dtf.resolvedOptions();
    };
    return PolyDateFormatter;
  }();
  /**
   * @private
   */
  var PolyRelFormatter = /*#__PURE__*/function () {
    function PolyRelFormatter(intl, isEnglish, opts) {
      this.opts = _extends({
        style: "long"
      }, opts);
      if (!isEnglish && hasRelative()) {
        this.rtf = getCachedRTF(intl, opts);
      }
    }
    var _proto3 = PolyRelFormatter.prototype;
    _proto3.format = function format(count, unit) {
      if (this.rtf) {
        return this.rtf.format(count, unit);
      } else {
        return formatRelativeTime(unit, count, this.opts.numeric, this.opts.style !== "long");
      }
    };
    _proto3.formatToParts = function formatToParts(count, unit) {
      if (this.rtf) {
        return this.rtf.formatToParts(count, unit);
      } else {
        return [];
      }
    };
    return PolyRelFormatter;
  }();
  var fallbackWeekSettings = {
    firstDay: 1,
    minimalDays: 4,
    weekend: [6, 7]
  };

  /**
   * @private
   */
  var Locale = /*#__PURE__*/function () {
    Locale.fromOpts = function fromOpts(opts) {
      return Locale.create(opts.locale, opts.numberingSystem, opts.outputCalendar, opts.weekSettings, opts.defaultToEN);
    };
    Locale.create = function create(locale, numberingSystem, outputCalendar, weekSettings, defaultToEN) {
      if (defaultToEN === void 0) {
        defaultToEN = false;
      }
      var specifiedLocale = locale || Settings.defaultLocale;
      // the system locale is useful for human-readable strings but annoying for parsing/formatting known formats
      var localeR = specifiedLocale || (defaultToEN ? "en-US" : systemLocale());
      var numberingSystemR = numberingSystem || Settings.defaultNumberingSystem;
      var outputCalendarR = outputCalendar || Settings.defaultOutputCalendar;
      var weekSettingsR = validateWeekSettings(weekSettings) || Settings.defaultWeekSettings;
      return new Locale(localeR, numberingSystemR, outputCalendarR, weekSettingsR, specifiedLocale);
    };
    Locale.resetCache = function resetCache() {
      sysLocaleCache = null;
      intlDTCache.clear();
      intlNumCache.clear();
      intlRelCache.clear();
      intlResolvedOptionsCache.clear();
      weekInfoCache.clear();
    };
    Locale.fromObject = function fromObject(_temp) {
      var _ref2 = _temp === void 0 ? {} : _temp,
        locale = _ref2.locale,
        numberingSystem = _ref2.numberingSystem,
        outputCalendar = _ref2.outputCalendar,
        weekSettings = _ref2.weekSettings;
      return Locale.create(locale, numberingSystem, outputCalendar, weekSettings);
    };
    function Locale(locale, numbering, outputCalendar, weekSettings, specifiedLocale) {
      var _parseLocaleString = parseLocaleString(locale),
        parsedLocale = _parseLocaleString[0],
        parsedNumberingSystem = _parseLocaleString[1],
        parsedOutputCalendar = _parseLocaleString[2];
      this.locale = parsedLocale;
      this.numberingSystem = numbering || parsedNumberingSystem || null;
      this.outputCalendar = outputCalendar || parsedOutputCalendar || null;
      this.weekSettings = weekSettings;
      this.intl = intlConfigString(this.locale, this.numberingSystem, this.outputCalendar);
      this.weekdaysCache = {
        format: {},
        standalone: {}
      };
      this.monthsCache = {
        format: {},
        standalone: {}
      };
      this.meridiemCache = null;
      this.eraCache = {};
      this.specifiedLocale = specifiedLocale;
      this.fastNumbersCached = null;
    }
    var _proto4 = Locale.prototype;
    _proto4.listingMode = function listingMode() {
      var isActuallyEn = this.isEnglish();
      var hasNoWeirdness = (this.numberingSystem === null || this.numberingSystem === "latn") && (this.outputCalendar === null || this.outputCalendar === "gregory");
      return isActuallyEn && hasNoWeirdness ? "en" : "intl";
    };
    _proto4.clone = function clone(alts) {
      if (!alts || Object.getOwnPropertyNames(alts).length === 0) {
        return this;
      } else {
        return Locale.create(alts.locale || this.specifiedLocale, alts.numberingSystem || this.numberingSystem, alts.outputCalendar || this.outputCalendar, validateWeekSettings(alts.weekSettings) || this.weekSettings, alts.defaultToEN || false);
      }
    };
    _proto4.redefaultToEN = function redefaultToEN(alts) {
      if (alts === void 0) {
        alts = {};
      }
      return this.clone(_extends({}, alts, {
        defaultToEN: true
      }));
    };
    _proto4.redefaultToSystem = function redefaultToSystem(alts) {
      if (alts === void 0) {
        alts = {};
      }
      return this.clone(_extends({}, alts, {
        defaultToEN: false
      }));
    };
    _proto4.months = function months$1(length, format) {
      var _this2 = this;
      if (format === void 0) {
        format = false;
      }
      return listStuff(this, length, months, function () {
        // Workaround for "ja" locale: formatToParts does not label all parts of the month
        // as "month" and for this locale there is no difference between "format" and "non-format".
        // As such, just use format() instead of formatToParts() and take the whole string
        var monthSpecialCase = _this2.intl === "ja" || _this2.intl.startsWith("ja-");
        format &= !monthSpecialCase;
        var intl = format ? {
            month: length,
            day: "numeric"
          } : {
            month: length
          },
          formatStr = format ? "format" : "standalone";
        if (!_this2.monthsCache[formatStr][length]) {
          var mapper = !monthSpecialCase ? function (dt) {
            return _this2.extract(dt, intl, "month");
          } : function (dt) {
            return _this2.dtFormatter(dt, intl).format();
          };
          _this2.monthsCache[formatStr][length] = mapMonths(mapper);
        }
        return _this2.monthsCache[formatStr][length];
      });
    };
    _proto4.weekdays = function weekdays$1(length, format) {
      var _this3 = this;
      if (format === void 0) {
        format = false;
      }
      return listStuff(this, length, weekdays, function () {
        var intl = format ? {
            weekday: length,
            year: "numeric",
            month: "long",
            day: "numeric"
          } : {
            weekday: length
          },
          formatStr = format ? "format" : "standalone";
        if (!_this3.weekdaysCache[formatStr][length]) {
          _this3.weekdaysCache[formatStr][length] = mapWeekdays(function (dt) {
            return _this3.extract(dt, intl, "weekday");
          });
        }
        return _this3.weekdaysCache[formatStr][length];
      });
    };
    _proto4.meridiems = function meridiems$1() {
      var _this4 = this;
      return listStuff(this, undefined, function () {
        return meridiems;
      }, function () {
        // In theory there could be aribitrary day periods. We're gonna assume there are exactly two
        // for AM and PM. This is probably wrong, but it's makes parsing way easier.
        if (!_this4.meridiemCache) {
          var intl = {
            hour: "numeric",
            hourCycle: "h12"
          };
          _this4.meridiemCache = [DateTime.utc(2016, 11, 13, 9), DateTime.utc(2016, 11, 13, 19)].map(function (dt) {
            return _this4.extract(dt, intl, "dayperiod");
          });
        }
        return _this4.meridiemCache;
      });
    };
    _proto4.eras = function eras$1(length) {
      var _this5 = this;
      return listStuff(this, length, eras, function () {
        var intl = {
          era: length
        };

        // This is problematic. Different calendars are going to define eras totally differently. What I need is the minimum set of dates
        // to definitely enumerate them.
        if (!_this5.eraCache[length]) {
          _this5.eraCache[length] = [DateTime.utc(-40, 1, 1), DateTime.utc(2017, 1, 1)].map(function (dt) {
            return _this5.extract(dt, intl, "era");
          });
        }
        return _this5.eraCache[length];
      });
    };
    _proto4.extract = function extract(dt, intlOpts, field) {
      var df = this.dtFormatter(dt, intlOpts),
        results = df.formatToParts(),
        matching = results.find(function (m) {
          return m.type.toLowerCase() === field;
        });
      return matching ? matching.value : null;
    };
    _proto4.numberFormatter = function numberFormatter(opts) {
      if (opts === void 0) {
        opts = {};
      }
      // this forcesimple option is never used (the only caller short-circuits on it, but it seems safer to leave)
      // (in contrast, the rest of the condition is used heavily)
      return new PolyNumberFormatter(this.intl, opts.forceSimple || this.fastNumbers, opts);
    };
    _proto4.dtFormatter = function dtFormatter(dt, intlOpts) {
      if (intlOpts === void 0) {
        intlOpts = {};
      }
      return new PolyDateFormatter(dt, this.intl, intlOpts);
    };
    _proto4.relFormatter = function relFormatter(opts) {
      if (opts === void 0) {
        opts = {};
      }
      return new PolyRelFormatter(this.intl, this.isEnglish(), opts);
    };
    _proto4.listFormatter = function listFormatter(opts) {
      if (opts === void 0) {
        opts = {};
      }
      return getCachedLF(this.intl, opts);
    };
    _proto4.isEnglish = function isEnglish() {
      return this.locale === "en" || this.locale.toLowerCase() === "en-us" || getCachedIntResolvedOptions(this.intl).locale.startsWith("en-us");
    };
    _proto4.getWeekSettings = function getWeekSettings() {
      if (this.weekSettings) {
        return this.weekSettings;
      } else if (!hasLocaleWeekInfo()) {
        return fallbackWeekSettings;
      } else {
        return getCachedWeekInfo(this.locale);
      }
    };
    _proto4.getStartOfWeek = function getStartOfWeek() {
      return this.getWeekSettings().firstDay;
    };
    _proto4.getMinDaysInFirstWeek = function getMinDaysInFirstWeek() {
      return this.getWeekSettings().minimalDays;
    };
    _proto4.getWeekendDays = function getWeekendDays() {
      return this.getWeekSettings().weekend;
    };
    _proto4.equals = function equals(other) {
      return this.locale === other.locale && this.numberingSystem === other.numberingSystem && this.outputCalendar === other.outputCalendar;
    };
    _proto4.toString = function toString() {
      return "Locale(" + this.locale + ", " + this.numberingSystem + ", " + this.outputCalendar + ")";
    };
    _createClass(Locale, [{
      key: "fastNumbers",
      get: function get() {
        if (this.fastNumbersCached == null) {
          this.fastNumbersCached = supportsFastNumbers(this);
        }
        return this.fastNumbersCached;
      }
    }]);
    return Locale;
  }();

  var singleton = null;

  /**
   * A zone with a fixed offset (meaning no DST)
   * @implements {Zone}
   */
  var FixedOffsetZone = /*#__PURE__*/function (_Zone) {
    _inheritsLoose(FixedOffsetZone, _Zone);
    /**
     * Get an instance with a specified offset
     * @param {number} offset - The offset in minutes
     * @return {FixedOffsetZone}
     */
    FixedOffsetZone.instance = function instance(offset) {
      return offset === 0 ? FixedOffsetZone.utcInstance : new FixedOffsetZone(offset);
    }

    /**
     * Get an instance of FixedOffsetZone from a UTC offset string, like "UTC+6"
     * @param {string} s - The offset string to parse
     * @example FixedOffsetZone.parseSpecifier("UTC+6")
     * @example FixedOffsetZone.parseSpecifier("UTC+06")
     * @example FixedOffsetZone.parseSpecifier("UTC-6:00")
     * @return {FixedOffsetZone}
     */;
    FixedOffsetZone.parseSpecifier = function parseSpecifier(s) {
      if (s) {
        var r = s.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);
        if (r) {
          return new FixedOffsetZone(signedOffset(r[1], r[2]));
        }
      }
      return null;
    };
    function FixedOffsetZone(offset) {
      var _this;
      _this = _Zone.call(this) || this;
      /** @private **/
      _this.fixed = offset;
      return _this;
    }

    /**
     * The type of zone. `fixed` for all instances of `FixedOffsetZone`.
     * @override
     * @type {string}
     */
    var _proto = FixedOffsetZone.prototype;
    /**
     * Returns the offset's common name at the specified timestamp.
     *
     * For fixed offset zones this equals to the zone name.
     * @override
     */
    _proto.offsetName = function offsetName() {
      return this.name;
    }

    /**
     * Returns the offset's value as a string
     * @override
     * @param {number} ts - Epoch milliseconds for which to get the offset
     * @param {string} format - What style of offset to return.
     *                          Accepts 'narrow', 'short', or 'techie'. Returning '+6', '+06:00', or '+0600' respectively
     * @return {string}
     */;
    _proto.formatOffset = function formatOffset$1(ts, format) {
      return formatOffset(this.fixed, format);
    }

    /**
     * Returns whether the offset is known to be fixed for the whole year:
     * Always returns true for all fixed offset zones.
     * @override
     * @type {boolean}
     */;
    /**
     * Return the offset in minutes for this zone at the specified timestamp.
     *
     * For fixed offset zones, this is constant and does not depend on a timestamp.
     * @override
     * @return {number}
     */
    _proto.offset = function offset() {
      return this.fixed;
    }

    /**
     * Return whether this Zone is equal to another zone (i.e. also fixed and same offset)
     * @override
     * @param {Zone} otherZone - the zone to compare
     * @return {boolean}
     */;
    _proto.equals = function equals(otherZone) {
      return otherZone.type === "fixed" && otherZone.fixed === this.fixed;
    }

    /**
     * Return whether this Zone is valid:
     * All fixed offset zones are valid.
     * @override
     * @type {boolean}
     */;
    _createClass(FixedOffsetZone, [{
      key: "type",
      get: function get() {
        return "fixed";
      }

      /**
       * The name of this zone.
       * All fixed zones' names always start with "UTC" (plus optional offset)
       * @override
       * @type {string}
       */
    }, {
      key: "name",
      get: function get() {
        return this.fixed === 0 ? "UTC" : "UTC" + formatOffset(this.fixed, "narrow");
      }

      /**
       * The IANA name of this zone, i.e. `Etc/UTC` or `Etc/GMT+/-nn`
       *
       * @override
       * @type {string}
       */
    }, {
      key: "ianaName",
      get: function get() {
        if (this.fixed === 0) {
          return "Etc/UTC";
        } else {
          return "Etc/GMT" + formatOffset(-this.fixed, "narrow");
        }
      }
    }, {
      key: "isUniversal",
      get: function get() {
        return true;
      }
    }, {
      key: "isValid",
      get: function get() {
        return true;
      }
    }], [{
      key: "utcInstance",
      get:
      /**
       * Get a singleton instance of UTC
       * @return {FixedOffsetZone}
       */
      function get() {
        if (singleton === null) {
          singleton = new FixedOffsetZone(0);
        }
        return singleton;
      }
    }]);
    return FixedOffsetZone;
  }(Zone);

  /**
   * A zone that failed to parse. You should never need to instantiate this.
   * @implements {Zone}
   */
  var InvalidZone = /*#__PURE__*/function (_Zone) {
    _inheritsLoose(InvalidZone, _Zone);
    function InvalidZone(zoneName) {
      var _this;
      _this = _Zone.call(this) || this;
      /**  @private */
      _this.zoneName = zoneName;
      return _this;
    }

    /** @override **/
    var _proto = InvalidZone.prototype;
    /** @override **/
    _proto.offsetName = function offsetName() {
      return null;
    }

    /** @override **/;
    _proto.formatOffset = function formatOffset() {
      return "";
    }

    /** @override **/;
    _proto.offset = function offset() {
      return NaN;
    }

    /** @override **/;
    _proto.equals = function equals() {
      return false;
    }

    /** @override **/;
    _createClass(InvalidZone, [{
      key: "type",
      get: function get() {
        return "invalid";
      }

      /** @override **/
    }, {
      key: "name",
      get: function get() {
        return this.zoneName;
      }

      /** @override **/
    }, {
      key: "isUniversal",
      get: function get() {
        return false;
      }
    }, {
      key: "isValid",
      get: function get() {
        return false;
      }
    }]);
    return InvalidZone;
  }(Zone);

  /**
   * @private
   */
  function normalizeZone(input, defaultZone) {
    if (isUndefined(input) || input === null) {
      return defaultZone;
    } else if (input instanceof Zone) {
      return input;
    } else if (isString(input)) {
      var lowered = input.toLowerCase();
      if (lowered === "default") return defaultZone;else if (lowered === "local" || lowered === "system") return SystemZone.instance;else if (lowered === "utc" || lowered === "gmt") return FixedOffsetZone.utcInstance;else return FixedOffsetZone.parseSpecifier(lowered) || IANAZone.create(input);
    } else if (isNumber(input)) {
      return FixedOffsetZone.instance(input);
    } else if (typeof input === "object" && "offset" in input && typeof input.offset === "function") {
      // This is dumb, but the instanceof check above doesn't seem to really work
      // so we're duck checking it
      return input;
    } else {
      return new InvalidZone(input);
    }
  }

  var numberingSystems = {
    arab: "[\u0660-\u0669]",
    arabext: "[\u06F0-\u06F9]",
    bali: "[\u1B50-\u1B59]",
    beng: "[\u09E6-\u09EF]",
    deva: "[\u0966-\u096F]",
    fullwide: "[\uFF10-\uFF19]",
    gujr: "[\u0AE6-\u0AEF]",
    hanidec: "[〇|一|二|三|四|五|六|七|八|九]",
    khmr: "[\u17E0-\u17E9]",
    knda: "[\u0CE6-\u0CEF]",
    laoo: "[\u0ED0-\u0ED9]",
    limb: "[\u1946-\u194F]",
    mlym: "[\u0D66-\u0D6F]",
    mong: "[\u1810-\u1819]",
    mymr: "[\u1040-\u1049]",
    orya: "[\u0B66-\u0B6F]",
    tamldec: "[\u0BE6-\u0BEF]",
    telu: "[\u0C66-\u0C6F]",
    thai: "[\u0E50-\u0E59]",
    tibt: "[\u0F20-\u0F29]",
    latn: "\\d"
  };
  var numberingSystemsUTF16 = {
    arab: [1632, 1641],
    arabext: [1776, 1785],
    bali: [6992, 7001],
    beng: [2534, 2543],
    deva: [2406, 2415],
    fullwide: [65296, 65303],
    gujr: [2790, 2799],
    khmr: [6112, 6121],
    knda: [3302, 3311],
    laoo: [3792, 3801],
    limb: [6470, 6479],
    mlym: [3430, 3439],
    mong: [6160, 6169],
    mymr: [4160, 4169],
    orya: [2918, 2927],
    tamldec: [3046, 3055],
    telu: [3174, 3183],
    thai: [3664, 3673],
    tibt: [3872, 3881]
  };
  var hanidecChars = numberingSystems.hanidec.replace(/[\[|\]]/g, "").split("");
  function parseDigits(str) {
    var value = parseInt(str, 10);
    if (isNaN(value)) {
      value = "";
      for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        if (str[i].search(numberingSystems.hanidec) !== -1) {
          value += hanidecChars.indexOf(str[i]);
        } else {
          for (var key in numberingSystemsUTF16) {
            var _numberingSystemsUTF = numberingSystemsUTF16[key],
              min = _numberingSystemsUTF[0],
              max = _numberingSystemsUTF[1];
            if (code >= min && code <= max) {
              value += code - min;
            }
          }
        }
      }
      return parseInt(value, 10);
    } else {
      return value;
    }
  }

  // cache of {numberingSystem: {append: regex}}
  var digitRegexCache = new Map();
  function resetDigitRegexCache() {
    digitRegexCache.clear();
  }
  function digitRegex(_ref, append) {
    var numberingSystem = _ref.numberingSystem;
    if (append === void 0) {
      append = "";
    }
    var ns = numberingSystem || "latn";
    var appendCache = digitRegexCache.get(ns);
    if (appendCache === undefined) {
      appendCache = new Map();
      digitRegexCache.set(ns, appendCache);
    }
    var regex = appendCache.get(append);
    if (regex === undefined) {
      regex = new RegExp("" + numberingSystems[ns] + append);
      appendCache.set(append, regex);
    }
    return regex;
  }

  var now = function now() {
      return Date.now();
    },
    defaultZone = "system",
    defaultLocale = null,
    defaultNumberingSystem = null,
    defaultOutputCalendar = null,
    twoDigitCutoffYear = 60,
    throwOnInvalid,
    defaultWeekSettings = null;

  /**
   * Settings contains static getters and setters that control Luxon's overall behavior. Luxon is a simple library with few options, but the ones it does have live here.
   */
  var Settings = /*#__PURE__*/function () {
    function Settings() {}
    /**
     * Reset Luxon's global caches. Should only be necessary in testing scenarios.
     * @return {void}
     */
    Settings.resetCaches = function resetCaches() {
      Locale.resetCache();
      IANAZone.resetCache();
      DateTime.resetCache();
      resetDigitRegexCache();
    };
    _createClass(Settings, null, [{
      key: "now",
      get:
      /**
       * Get the callback for returning the current timestamp.
       * @type {function}
       */
      function get() {
        return now;
      }

      /**
       * Set the callback for returning the current timestamp.
       * The function should return a number, which will be interpreted as an Epoch millisecond count
       * @type {function}
       * @example Settings.now = () => Date.now() + 3000 // pretend it is 3 seconds in the future
       * @example Settings.now = () => 0 // always pretend it's Jan 1, 1970 at midnight in UTC time
       */,
      set: function set(n) {
        now = n;
      }

      /**
       * Set the default time zone to create DateTimes in. Does not affect existing instances.
       * Use the value "system" to reset this value to the system's time zone.
       * @type {string}
       */
    }, {
      key: "defaultZone",
      get:
      /**
       * Get the default time zone object currently used to create DateTimes. Does not affect existing instances.
       * The default value is the system's time zone (the one set on the machine that runs this code).
       * @type {Zone}
       */
      function get() {
        return normalizeZone(defaultZone, SystemZone.instance);
      }

      /**
       * Get the default locale to create DateTimes with. Does not affect existing instances.
       * @type {string}
       */,
      set: function set(zone) {
        defaultZone = zone;
      }
    }, {
      key: "defaultLocale",
      get: function get() {
        return defaultLocale;
      }

      /**
       * Set the default locale to create DateTimes with. Does not affect existing instances.
       * @type {string}
       */,
      set: function set(locale) {
        defaultLocale = locale;
      }

      /**
       * Get the default numbering system to create DateTimes with. Does not affect existing instances.
       * @type {string}
       */
    }, {
      key: "defaultNumberingSystem",
      get: function get() {
        return defaultNumberingSystem;
      }

      /**
       * Set the default numbering system to create DateTimes with. Does not affect existing instances.
       * @type {string}
       */,
      set: function set(numberingSystem) {
        defaultNumberingSystem = numberingSystem;
      }

      /**
       * Get the default output calendar to create DateTimes with. Does not affect existing instances.
       * @type {string}
       */
    }, {
      key: "defaultOutputCalendar",
      get: function get() {
        return defaultOutputCalendar;
      }

      /**
       * Set the default output calendar to create DateTimes with. Does not affect existing instances.
       * @type {string}
       */,
      set: function set(outputCalendar) {
        defaultOutputCalendar = outputCalendar;
      }

      /**
       * @typedef {Object} WeekSettings
       * @property {number} firstDay
       * @property {number} minimalDays
       * @property {number[]} weekend
       */

      /**
       * @return {WeekSettings|null}
       */
    }, {
      key: "defaultWeekSettings",
      get: function get() {
        return defaultWeekSettings;
      }

      /**
       * Allows overriding the default locale week settings, i.e. the start of the week, the weekend and
       * how many days are required in the first week of a year.
       * Does not affect existing instances.
       *
       * @param {WeekSettings|null} weekSettings
       */,
      set: function set(weekSettings) {
        defaultWeekSettings = validateWeekSettings(weekSettings);
      }

      /**
       * Get the cutoff year for whether a 2-digit year string is interpreted in the current or previous century. Numbers higher than the cutoff will be considered to mean 19xx and numbers lower or equal to the cutoff will be considered 20xx.
       * @type {number}
       */
    }, {
      key: "twoDigitCutoffYear",
      get: function get() {
        return twoDigitCutoffYear;
      }

      /**
       * Set the cutoff year for whether a 2-digit year string is interpreted in the current or previous century. Numbers higher than the cutoff will be considered to mean 19xx and numbers lower or equal to the cutoff will be considered 20xx.
       * @type {number}
       * @example Settings.twoDigitCutoffYear = 0 // all 'yy' are interpreted as 20th century
       * @example Settings.twoDigitCutoffYear = 99 // all 'yy' are interpreted as 21st century
       * @example Settings.twoDigitCutoffYear = 50 // '49' -> 2049; '50' -> 1950
       * @example Settings.twoDigitCutoffYear = 1950 // interpreted as 50
       * @example Settings.twoDigitCutoffYear = 2050 // ALSO interpreted as 50
       */,
      set: function set(cutoffYear) {
        twoDigitCutoffYear = cutoffYear % 100;
      }

      /**
       * Get whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
       * @type {boolean}
       */
    }, {
      key: "throwOnInvalid",
      get: function get() {
        return throwOnInvalid;
      }

      /**
       * Set whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
       * @type {boolean}
       */,
      set: function set(t) {
        throwOnInvalid = t;
      }
    }]);
    return Settings;
  }();

  var Invalid = /*#__PURE__*/function () {
    function Invalid(reason, explanation) {
      this.reason = reason;
      this.explanation = explanation;
    }
    var _proto = Invalid.prototype;
    _proto.toMessage = function toMessage() {
      if (this.explanation) {
        return this.reason + ": " + this.explanation;
      } else {
        return this.reason;
      }
    };
    return Invalid;
  }();

  var nonLeapLadder = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334],
    leapLadder = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  function unitOutOfRange(unit, value) {
    return new Invalid("unit out of range", "you specified " + value + " (of type " + typeof value + ") as a " + unit + ", which is invalid");
  }
  function dayOfWeek(year, month, day) {
    var d = new Date(Date.UTC(year, month - 1, day));
    if (year < 100 && year >= 0) {
      d.setUTCFullYear(d.getUTCFullYear() - 1900);
    }
    var js = d.getUTCDay();
    return js === 0 ? 7 : js;
  }
  function computeOrdinal(year, month, day) {
    return day + (isLeapYear(year) ? leapLadder : nonLeapLadder)[month - 1];
  }
  function uncomputeOrdinal(year, ordinal) {
    var table = isLeapYear(year) ? leapLadder : nonLeapLadder,
      month0 = table.findIndex(function (i) {
        return i < ordinal;
      }),
      day = ordinal - table[month0];
    return {
      month: month0 + 1,
      day: day
    };
  }
  function isoWeekdayToLocal(isoWeekday, startOfWeek) {
    return (isoWeekday - startOfWeek + 7) % 7 + 1;
  }

  /**
   * @private
   */

  function gregorianToWeek(gregObj, minDaysInFirstWeek, startOfWeek) {
    if (minDaysInFirstWeek === void 0) {
      minDaysInFirstWeek = 4;
    }
    if (startOfWeek === void 0) {
      startOfWeek = 1;
    }
    var year = gregObj.year,
      month = gregObj.month,
      day = gregObj.day,
      ordinal = computeOrdinal(year, month, day),
      weekday = isoWeekdayToLocal(dayOfWeek(year, month, day), startOfWeek);
    var weekNumber = Math.floor((ordinal - weekday + 14 - minDaysInFirstWeek) / 7),
      weekYear;
    if (weekNumber < 1) {
      weekYear = year - 1;
      weekNumber = weeksInWeekYear(weekYear, minDaysInFirstWeek, startOfWeek);
    } else if (weekNumber > weeksInWeekYear(year, minDaysInFirstWeek, startOfWeek)) {
      weekYear = year + 1;
      weekNumber = 1;
    } else {
      weekYear = year;
    }
    return _extends({
      weekYear: weekYear,
      weekNumber: weekNumber,
      weekday: weekday
    }, timeObject(gregObj));
  }
  function weekToGregorian(weekData, minDaysInFirstWeek, startOfWeek) {
    if (minDaysInFirstWeek === void 0) {
      minDaysInFirstWeek = 4;
    }
    if (startOfWeek === void 0) {
      startOfWeek = 1;
    }
    var weekYear = weekData.weekYear,
      weekNumber = weekData.weekNumber,
      weekday = weekData.weekday,
      weekdayOfJan4 = isoWeekdayToLocal(dayOfWeek(weekYear, 1, minDaysInFirstWeek), startOfWeek),
      yearInDays = daysInYear(weekYear);
    var ordinal = weekNumber * 7 + weekday - weekdayOfJan4 - 7 + minDaysInFirstWeek,
      year;
    if (ordinal < 1) {
      year = weekYear - 1;
      ordinal += daysInYear(year);
    } else if (ordinal > yearInDays) {
      year = weekYear + 1;
      ordinal -= daysInYear(weekYear);
    } else {
      year = weekYear;
    }
    var _uncomputeOrdinal = uncomputeOrdinal(year, ordinal),
      month = _uncomputeOrdinal.month,
      day = _uncomputeOrdinal.day;
    return _extends({
      year: year,
      month: month,
      day: day
    }, timeObject(weekData));
  }
  function gregorianToOrdinal(gregData) {
    var year = gregData.year,
      month = gregData.month,
      day = gregData.day;
    var ordinal = computeOrdinal(year, month, day);
    return _extends({
      year: year,
      ordinal: ordinal
    }, timeObject(gregData));
  }
  function ordinalToGregorian(ordinalData) {
    var year = ordinalData.year,
      ordinal = ordinalData.ordinal;
    var _uncomputeOrdinal2 = uncomputeOrdinal(year, ordinal),
      month = _uncomputeOrdinal2.month,
      day = _uncomputeOrdinal2.day;
    return _extends({
      year: year,
      month: month,
      day: day
    }, timeObject(ordinalData));
  }

  /**
   * Check if local week units like localWeekday are used in obj.
   * If so, validates that they are not mixed with ISO week units and then copies them to the normal week unit properties.
   * Modifies obj in-place!
   * @param obj the object values
   */
  function usesLocalWeekValues(obj, loc) {
    var hasLocaleWeekData = !isUndefined(obj.localWeekday) || !isUndefined(obj.localWeekNumber) || !isUndefined(obj.localWeekYear);
    if (hasLocaleWeekData) {
      var hasIsoWeekData = !isUndefined(obj.weekday) || !isUndefined(obj.weekNumber) || !isUndefined(obj.weekYear);
      if (hasIsoWeekData) {
        throw new ConflictingSpecificationError("Cannot mix locale-based week fields with ISO-based week fields");
      }
      if (!isUndefined(obj.localWeekday)) obj.weekday = obj.localWeekday;
      if (!isUndefined(obj.localWeekNumber)) obj.weekNumber = obj.localWeekNumber;
      if (!isUndefined(obj.localWeekYear)) obj.weekYear = obj.localWeekYear;
      delete obj.localWeekday;
      delete obj.localWeekNumber;
      delete obj.localWeekYear;
      return {
        minDaysInFirstWeek: loc.getMinDaysInFirstWeek(),
        startOfWeek: loc.getStartOfWeek()
      };
    } else {
      return {
        minDaysInFirstWeek: 4,
        startOfWeek: 1
      };
    }
  }
  function hasInvalidWeekData(obj, minDaysInFirstWeek, startOfWeek) {
    if (minDaysInFirstWeek === void 0) {
      minDaysInFirstWeek = 4;
    }
    if (startOfWeek === void 0) {
      startOfWeek = 1;
    }
    var validYear = isInteger(obj.weekYear),
      validWeek = integerBetween(obj.weekNumber, 1, weeksInWeekYear(obj.weekYear, minDaysInFirstWeek, startOfWeek)),
      validWeekday = integerBetween(obj.weekday, 1, 7);
    if (!validYear) {
      return unitOutOfRange("weekYear", obj.weekYear);
    } else if (!validWeek) {
      return unitOutOfRange("week", obj.weekNumber);
    } else if (!validWeekday) {
      return unitOutOfRange("weekday", obj.weekday);
    } else return false;
  }
  function hasInvalidOrdinalData(obj) {
    var validYear = isInteger(obj.year),
      validOrdinal = integerBetween(obj.ordinal, 1, daysInYear(obj.year));
    if (!validYear) {
      return unitOutOfRange("year", obj.year);
    } else if (!validOrdinal) {
      return unitOutOfRange("ordinal", obj.ordinal);
    } else return false;
  }
  function hasInvalidGregorianData(obj) {
    var validYear = isInteger(obj.year),
      validMonth = integerBetween(obj.month, 1, 12),
      validDay = integerBetween(obj.day, 1, daysInMonth(obj.year, obj.month));
    if (!validYear) {
      return unitOutOfRange("year", obj.year);
    } else if (!validMonth) {
      return unitOutOfRange("month", obj.month);
    } else if (!validDay) {
      return unitOutOfRange("day", obj.day);
    } else return false;
  }
  function hasInvalidTimeData(obj) {
    var hour = obj.hour,
      minute = obj.minute,
      second = obj.second,
      millisecond = obj.millisecond;
    var validHour = integerBetween(hour, 0, 23) || hour === 24 && minute === 0 && second === 0 && millisecond === 0,
      validMinute = integerBetween(minute, 0, 59),
      validSecond = integerBetween(second, 0, 59),
      validMillisecond = integerBetween(millisecond, 0, 999);
    if (!validHour) {
      return unitOutOfRange("hour", hour);
    } else if (!validMinute) {
      return unitOutOfRange("minute", minute);
    } else if (!validSecond) {
      return unitOutOfRange("second", second);
    } else if (!validMillisecond) {
      return unitOutOfRange("millisecond", millisecond);
    } else return false;
  }

  /**
   * @private
   */

  // TYPES

  function isUndefined(o) {
    return typeof o === "undefined";
  }
  function isNumber(o) {
    return typeof o === "number";
  }
  function isInteger(o) {
    return typeof o === "number" && o % 1 === 0;
  }
  function isString(o) {
    return typeof o === "string";
  }
  function isDate(o) {
    return Object.prototype.toString.call(o) === "[object Date]";
  }

  // CAPABILITIES

  function hasRelative() {
    try {
      return typeof Intl !== "undefined" && !!Intl.RelativeTimeFormat;
    } catch (e) {
      return false;
    }
  }
  function hasLocaleWeekInfo() {
    try {
      return typeof Intl !== "undefined" && !!Intl.Locale && ("weekInfo" in Intl.Locale.prototype || "getWeekInfo" in Intl.Locale.prototype);
    } catch (e) {
      return false;
    }
  }

  // OBJECTS AND ARRAYS

  function maybeArray(thing) {
    return Array.isArray(thing) ? thing : [thing];
  }
  function bestBy(arr, by, compare) {
    if (arr.length === 0) {
      return undefined;
    }
    return arr.reduce(function (best, next) {
      var pair = [by(next), next];
      if (!best) {
        return pair;
      } else if (compare(best[0], pair[0]) === best[0]) {
        return best;
      } else {
        return pair;
      }
    }, null)[1];
  }
  function pick(obj, keys) {
    return keys.reduce(function (a, k) {
      a[k] = obj[k];
      return a;
    }, {});
  }
  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
  function validateWeekSettings(settings) {
    if (settings == null) {
      return null;
    } else if (typeof settings !== "object") {
      throw new InvalidArgumentError("Week settings must be an object");
    } else {
      if (!integerBetween(settings.firstDay, 1, 7) || !integerBetween(settings.minimalDays, 1, 7) || !Array.isArray(settings.weekend) || settings.weekend.some(function (v) {
        return !integerBetween(v, 1, 7);
      })) {
        throw new InvalidArgumentError("Invalid week settings");
      }
      return {
        firstDay: settings.firstDay,
        minimalDays: settings.minimalDays,
        weekend: Array.from(settings.weekend)
      };
    }
  }

  // NUMBERS AND STRINGS

  function integerBetween(thing, bottom, top) {
    return isInteger(thing) && thing >= bottom && thing <= top;
  }

  // x % n but takes the sign of n instead of x
  function floorMod(x, n) {
    return x - n * Math.floor(x / n);
  }
  function padStart(input, n) {
    if (n === void 0) {
      n = 2;
    }
    var isNeg = input < 0;
    var padded;
    if (isNeg) {
      padded = "-" + ("" + -input).padStart(n, "0");
    } else {
      padded = ("" + input).padStart(n, "0");
    }
    return padded;
  }
  function parseInteger(string) {
    if (isUndefined(string) || string === null || string === "") {
      return undefined;
    } else {
      return parseInt(string, 10);
    }
  }
  function parseFloating(string) {
    if (isUndefined(string) || string === null || string === "") {
      return undefined;
    } else {
      return parseFloat(string);
    }
  }
  function parseMillis(fraction) {
    // Return undefined (instead of 0) in these cases, where fraction is not set
    if (isUndefined(fraction) || fraction === null || fraction === "") {
      return undefined;
    } else {
      var f = parseFloat("0." + fraction) * 1000;
      return Math.floor(f);
    }
  }
  function roundTo(number, digits, rounding) {
    if (rounding === void 0) {
      rounding = "round";
    }
    var factor = Math.pow(10, digits);
    switch (rounding) {
      case "expand":
        return number > 0 ? Math.ceil(number * factor) / factor : Math.floor(number * factor) / factor;
      case "trunc":
        return Math.trunc(number * factor) / factor;
      case "round":
        return Math.round(number * factor) / factor;
      case "floor":
        return Math.floor(number * factor) / factor;
      case "ceil":
        return Math.ceil(number * factor) / factor;
      default:
        throw new RangeError("Value rounding " + rounding + " is out of range");
    }
  }

  // DATE BASICS

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  function daysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
  }
  function daysInMonth(year, month) {
    var modMonth = floorMod(month - 1, 12) + 1,
      modYear = year + (month - modMonth) / 12;
    if (modMonth === 2) {
      return isLeapYear(modYear) ? 29 : 28;
    } else {
      return [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][modMonth - 1];
    }
  }

  // convert a calendar object to a local timestamp (epoch, but with the offset baked in)
  function objToLocalTS(obj) {
    var d = Date.UTC(obj.year, obj.month - 1, obj.day, obj.hour, obj.minute, obj.second, obj.millisecond);

    // for legacy reasons, years between 0 and 99 are interpreted as 19XX; revert that
    if (obj.year < 100 && obj.year >= 0) {
      d = new Date(d);
      // set the month and day again, this is necessary because year 2000 is a leap year, but year 100 is not
      // so if obj.year is in 99, but obj.day makes it roll over into year 100,
      // the calculations done by Date.UTC are using year 2000 - which is incorrect
      d.setUTCFullYear(obj.year, obj.month - 1, obj.day);
    }
    return +d;
  }

  // adapted from moment.js: https://github.com/moment/moment/blob/000ac1800e620f770f4eb31b5ae908f6167b0ab2/src/lib/units/week-calendar-utils.js
  function firstWeekOffset(year, minDaysInFirstWeek, startOfWeek) {
    var fwdlw = isoWeekdayToLocal(dayOfWeek(year, 1, minDaysInFirstWeek), startOfWeek);
    return -fwdlw + minDaysInFirstWeek - 1;
  }
  function weeksInWeekYear(weekYear, minDaysInFirstWeek, startOfWeek) {
    if (minDaysInFirstWeek === void 0) {
      minDaysInFirstWeek = 4;
    }
    if (startOfWeek === void 0) {
      startOfWeek = 1;
    }
    var weekOffset = firstWeekOffset(weekYear, minDaysInFirstWeek, startOfWeek);
    var weekOffsetNext = firstWeekOffset(weekYear + 1, minDaysInFirstWeek, startOfWeek);
    return (daysInYear(weekYear) - weekOffset + weekOffsetNext) / 7;
  }
  function untruncateYear(year) {
    if (year > 99) {
      return year;
    } else return year > Settings.twoDigitCutoffYear ? 1900 + year : 2000 + year;
  }

  // PARSING

  function parseZoneInfo(ts, offsetFormat, locale, timeZone) {
    if (timeZone === void 0) {
      timeZone = null;
    }
    var date = new Date(ts),
      intlOpts = {
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      };
    if (timeZone) {
      intlOpts.timeZone = timeZone;
    }
    var modified = _extends({
      timeZoneName: offsetFormat
    }, intlOpts);
    var parsed = new Intl.DateTimeFormat(locale, modified).formatToParts(date).find(function (m) {
      return m.type.toLowerCase() === "timezonename";
    });
    return parsed ? parsed.value : null;
  }

  // signedOffset('-5', '30') -> -330
  function signedOffset(offHourStr, offMinuteStr) {
    var offHour = parseInt(offHourStr, 10);

    // don't || this because we want to preserve -0
    if (Number.isNaN(offHour)) {
      offHour = 0;
    }
    var offMin = parseInt(offMinuteStr, 10) || 0,
      offMinSigned = offHour < 0 || Object.is(offHour, -0) ? -offMin : offMin;
    return offHour * 60 + offMinSigned;
  }

  // COERCION

  function asNumber(value) {
    var numericValue = Number(value);
    if (typeof value === "boolean" || value === "" || !Number.isFinite(numericValue)) throw new InvalidArgumentError("Invalid unit value " + value);
    return numericValue;
  }
  function normalizeObject(obj, normalizer) {
    var normalized = {};
    for (var u in obj) {
      if (hasOwnProperty(obj, u)) {
        var v = obj[u];
        if (v === undefined || v === null) continue;
        normalized[normalizer(u)] = asNumber(v);
      }
    }
    return normalized;
  }

  /**
   * Returns the offset's value as a string
   * @param {number} ts - Epoch milliseconds for which to get the offset
   * @param {string} format - What style of offset to return.
   *                          Accepts 'narrow', 'short', or 'techie'. Returning '+6', '+06:00', or '+0600' respectively
   * @return {string}
   */
  function formatOffset(offset, format) {
    var hours = Math.trunc(Math.abs(offset / 60)),
      minutes = Math.trunc(Math.abs(offset % 60)),
      sign = offset >= 0 ? "+" : "-";
    switch (format) {
      case "short":
        return "" + sign + padStart(hours, 2) + ":" + padStart(minutes, 2);
      case "narrow":
        return "" + sign + hours + (minutes > 0 ? ":" + minutes : "");
      case "techie":
        return "" + sign + padStart(hours, 2) + padStart(minutes, 2);
      default:
        throw new RangeError("Value format " + format + " is out of range for property format");
    }
  }
  function timeObject(obj) {
    return pick(obj, ["hour", "minute", "second", "millisecond"]);
  }

  /**
   * @private
   */

  var monthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var monthsNarrow = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  function months(length) {
    switch (length) {
      case "narrow":
        return [].concat(monthsNarrow);
      case "short":
        return [].concat(monthsShort);
      case "long":
        return [].concat(monthsLong);
      case "numeric":
        return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
      case "2-digit":
        return ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      default:
        return null;
    }
  }
  var weekdaysLong = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var weekdaysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var weekdaysNarrow = ["M", "T", "W", "T", "F", "S", "S"];
  function weekdays(length) {
    switch (length) {
      case "narrow":
        return [].concat(weekdaysNarrow);
      case "short":
        return [].concat(weekdaysShort);
      case "long":
        return [].concat(weekdaysLong);
      case "numeric":
        return ["1", "2", "3", "4", "5", "6", "7"];
      default:
        return null;
    }
  }
  var meridiems = ["AM", "PM"];
  var erasLong = ["Before Christ", "Anno Domini"];
  var erasShort = ["BC", "AD"];
  var erasNarrow = ["B", "A"];
  function eras(length) {
    switch (length) {
      case "narrow":
        return [].concat(erasNarrow);
      case "short":
        return [].concat(erasShort);
      case "long":
        return [].concat(erasLong);
      default:
        return null;
    }
  }
  function meridiemForDateTime(dt) {
    return meridiems[dt.hour < 12 ? 0 : 1];
  }
  function weekdayForDateTime(dt, length) {
    return weekdays(length)[dt.weekday - 1];
  }
  function monthForDateTime(dt, length) {
    return months(length)[dt.month - 1];
  }
  function eraForDateTime(dt, length) {
    return eras(length)[dt.year < 0 ? 0 : 1];
  }
  function formatRelativeTime(unit, count, numeric, narrow) {
    if (numeric === void 0) {
      numeric = "always";
    }
    if (narrow === void 0) {
      narrow = false;
    }
    var units = {
      years: ["year", "yr."],
      quarters: ["quarter", "qtr."],
      months: ["month", "mo."],
      weeks: ["week", "wk."],
      days: ["day", "day", "days"],
      hours: ["hour", "hr."],
      minutes: ["minute", "min."],
      seconds: ["second", "sec."]
    };
    var lastable = ["hours", "minutes", "seconds"].indexOf(unit) === -1;
    if (numeric === "auto" && lastable) {
      var isDay = unit === "days";
      switch (count) {
        case 1:
          return isDay ? "tomorrow" : "next " + units[unit][0];
        case -1:
          return isDay ? "yesterday" : "last " + units[unit][0];
        case 0:
          return isDay ? "today" : "this " + units[unit][0];
      }
    }

    var isInPast = Object.is(count, -0) || count < 0,
      fmtValue = Math.abs(count),
      singular = fmtValue === 1,
      lilUnits = units[unit],
      fmtUnit = narrow ? singular ? lilUnits[1] : lilUnits[2] || lilUnits[1] : singular ? units[unit][0] : unit;
    return isInPast ? fmtValue + " " + fmtUnit + " ago" : "in " + fmtValue + " " + fmtUnit;
  }

  function stringifyTokens(splits, tokenToString) {
    var s = "";
    for (var _iterator = _createForOfIteratorHelperLoose(splits), _step; !(_step = _iterator()).done;) {
      var token = _step.value;
      if (token.literal) {
        s += token.val;
      } else {
        s += tokenToString(token.val);
      }
    }
    return s;
  }
  var _macroTokenToFormatOpts = {
    D: DATE_SHORT,
    DD: DATE_MED,
    DDD: DATE_FULL,
    DDDD: DATE_HUGE,
    t: TIME_SIMPLE,
    tt: TIME_WITH_SECONDS,
    ttt: TIME_WITH_SHORT_OFFSET,
    tttt: TIME_WITH_LONG_OFFSET,
    T: TIME_24_SIMPLE,
    TT: TIME_24_WITH_SECONDS,
    TTT: TIME_24_WITH_SHORT_OFFSET,
    TTTT: TIME_24_WITH_LONG_OFFSET,
    f: DATETIME_SHORT,
    ff: DATETIME_MED,
    fff: DATETIME_FULL,
    ffff: DATETIME_HUGE,
    F: DATETIME_SHORT_WITH_SECONDS,
    FF: DATETIME_MED_WITH_SECONDS,
    FFF: DATETIME_FULL_WITH_SECONDS,
    FFFF: DATETIME_HUGE_WITH_SECONDS
  };

  /**
   * @private
   */
  var Formatter = /*#__PURE__*/function () {
    Formatter.create = function create(locale, opts) {
      if (opts === void 0) {
        opts = {};
      }
      return new Formatter(locale, opts);
    };
    Formatter.parseFormat = function parseFormat(fmt) {
      // white-space is always considered a literal in user-provided formats
      // the " " token has a special meaning (see unitForToken)

      var current = null,
        currentFull = "",
        bracketed = false;
      var splits = [];
      for (var i = 0; i < fmt.length; i++) {
        var c = fmt.charAt(i);
        if (c === "'") {
          // turn '' into a literal signal quote instead of just skipping the empty literal
          if (currentFull.length > 0 || bracketed) {
            splits.push({
              literal: bracketed || /^\s+$/.test(currentFull),
              val: currentFull === "" ? "'" : currentFull
            });
          }
          current = null;
          currentFull = "";
          bracketed = !bracketed;
        } else if (bracketed) {
          currentFull += c;
        } else if (c === current) {
          currentFull += c;
        } else {
          if (currentFull.length > 0) {
            splits.push({
              literal: /^\s+$/.test(currentFull),
              val: currentFull
            });
          }
          currentFull = c;
          current = c;
        }
      }
      if (currentFull.length > 0) {
        splits.push({
          literal: bracketed || /^\s+$/.test(currentFull),
          val: currentFull
        });
      }
      return splits;
    };
    Formatter.macroTokenToFormatOpts = function macroTokenToFormatOpts(token) {
      return _macroTokenToFormatOpts[token];
    };
    function Formatter(locale, formatOpts) {
      this.opts = formatOpts;
      this.loc = locale;
      this.systemLoc = null;
    }
    var _proto = Formatter.prototype;
    _proto.formatWithSystemDefault = function formatWithSystemDefault(dt, opts) {
      if (this.systemLoc === null) {
        this.systemLoc = this.loc.redefaultToSystem();
      }
      var df = this.systemLoc.dtFormatter(dt, _extends({}, this.opts, opts));
      return df.format();
    };
    _proto.dtFormatter = function dtFormatter(dt, opts) {
      if (opts === void 0) {
        opts = {};
      }
      return this.loc.dtFormatter(dt, _extends({}, this.opts, opts));
    };
    _proto.formatDateTime = function formatDateTime(dt, opts) {
      return this.dtFormatter(dt, opts).format();
    };
    _proto.formatDateTimeParts = function formatDateTimeParts(dt, opts) {
      return this.dtFormatter(dt, opts).formatToParts();
    };
    _proto.formatInterval = function formatInterval(interval, opts) {
      var df = this.dtFormatter(interval.start, opts);
      return df.dtf.formatRange(interval.start.toJSDate(), interval.end.toJSDate());
    };
    _proto.resolvedOptions = function resolvedOptions(dt, opts) {
      return this.dtFormatter(dt, opts).resolvedOptions();
    };
    _proto.num = function num(n, p, signDisplay) {
      if (p === void 0) {
        p = 0;
      }
      if (signDisplay === void 0) {
        signDisplay = undefined;
      }
      // we get some perf out of doing this here, annoyingly
      if (this.opts.forceSimple) {
        return padStart(n, p);
      }
      var opts = _extends({}, this.opts);
      if (p > 0) {
        opts.padTo = p;
      }
      if (signDisplay) {
        opts.signDisplay = signDisplay;
      }
      return this.loc.numberFormatter(opts).format(n);
    };
    _proto.formatDateTimeFromString = function formatDateTimeFromString(dt, fmt) {
      var _this = this;
      var knownEnglish = this.loc.listingMode() === "en",
        useDateTimeFormatter = this.loc.outputCalendar && this.loc.outputCalendar !== "gregory",
        string = function string(opts, extract) {
          return _this.loc.extract(dt, opts, extract);
        },
        formatOffset = function formatOffset(opts) {
          if (dt.isOffsetFixed && dt.offset === 0 && opts.allowZ) {
            return "Z";
          }
          return dt.isValid ? dt.zone.formatOffset(dt.ts, opts.format) : "";
        },
        meridiem = function meridiem() {
          return knownEnglish ? meridiemForDateTime(dt) : string({
            hour: "numeric",
            hourCycle: "h12"
          }, "dayperiod");
        },
        month = function month(length, standalone) {
          return knownEnglish ? monthForDateTime(dt, length) : string(standalone ? {
            month: length
          } : {
            month: length,
            day: "numeric"
          }, "month");
        },
        weekday = function weekday(length, standalone) {
          return knownEnglish ? weekdayForDateTime(dt, length) : string(standalone ? {
            weekday: length
          } : {
            weekday: length,
            month: "long",
            day: "numeric"
          }, "weekday");
        },
        maybeMacro = function maybeMacro(token) {
          var formatOpts = Formatter.macroTokenToFormatOpts(token);
          if (formatOpts) {
            return _this.formatWithSystemDefault(dt, formatOpts);
          } else {
            return token;
          }
        },
        era = function era(length) {
          return knownEnglish ? eraForDateTime(dt, length) : string({
            era: length
          }, "era");
        },
        tokenToString = function tokenToString(token) {
          // Where possible: https://cldr.unicode.org/translation/date-time/date-time-symbols
          switch (token) {
            // ms
            case "S":
              return _this.num(dt.millisecond);
            case "u":
            // falls through
            case "SSS":
              return _this.num(dt.millisecond, 3);
            // seconds
            case "s":
              return _this.num(dt.second);
            case "ss":
              return _this.num(dt.second, 2);
            // fractional seconds
            case "uu":
              return _this.num(Math.floor(dt.millisecond / 10), 2);
            case "uuu":
              return _this.num(Math.floor(dt.millisecond / 100));
            // minutes
            case "m":
              return _this.num(dt.minute);
            case "mm":
              return _this.num(dt.minute, 2);
            // hours
            case "h":
              return _this.num(dt.hour % 12 === 0 ? 12 : dt.hour % 12);
            case "hh":
              return _this.num(dt.hour % 12 === 0 ? 12 : dt.hour % 12, 2);
            case "H":
              return _this.num(dt.hour);
            case "HH":
              return _this.num(dt.hour, 2);
            // offset
            case "Z":
              // like +6
              return formatOffset({
                format: "narrow",
                allowZ: _this.opts.allowZ
              });
            case "ZZ":
              // like +06:00
              return formatOffset({
                format: "short",
                allowZ: _this.opts.allowZ
              });
            case "ZZZ":
              // like +0600
              return formatOffset({
                format: "techie",
                allowZ: _this.opts.allowZ
              });
            case "ZZZZ":
              // like EST
              return dt.zone.offsetName(dt.ts, {
                format: "short",
                locale: _this.loc.locale
              });
            case "ZZZZZ":
              // like Eastern Standard Time
              return dt.zone.offsetName(dt.ts, {
                format: "long",
                locale: _this.loc.locale
              });
            // zone
            case "z":
              // like America/New_York
              return dt.zoneName;
            // meridiems
            case "a":
              return meridiem();
            // dates
            case "d":
              return useDateTimeFormatter ? string({
                day: "numeric"
              }, "day") : _this.num(dt.day);
            case "dd":
              return useDateTimeFormatter ? string({
                day: "2-digit"
              }, "day") : _this.num(dt.day, 2);
            // weekdays - standalone
            case "c":
              // like 1
              return _this.num(dt.weekday);
            case "ccc":
              // like 'Tues'
              return weekday("short", true);
            case "cccc":
              // like 'Tuesday'
              return weekday("long", true);
            case "ccccc":
              // like 'T'
              return weekday("narrow", true);
            // weekdays - format
            case "E":
              // like 1
              return _this.num(dt.weekday);
            case "EEE":
              // like 'Tues'
              return weekday("short", false);
            case "EEEE":
              // like 'Tuesday'
              return weekday("long", false);
            case "EEEEE":
              // like 'T'
              return weekday("narrow", false);
            // months - standalone
            case "L":
              // like 1
              return useDateTimeFormatter ? string({
                month: "numeric",
                day: "numeric"
              }, "month") : _this.num(dt.month);
            case "LL":
              // like 01, doesn't seem to work
              return useDateTimeFormatter ? string({
                month: "2-digit",
                day: "numeric"
              }, "month") : _this.num(dt.month, 2);
            case "LLL":
              // like Jan
              return month("short", true);
            case "LLLL":
              // like January
              return month("long", true);
            case "LLLLL":
              // like J
              return month("narrow", true);
            // months - format
            case "M":
              // like 1
              return useDateTimeFormatter ? string({
                month: "numeric"
              }, "month") : _this.num(dt.month);
            case "MM":
              // like 01
              return useDateTimeFormatter ? string({
                month: "2-digit"
              }, "month") : _this.num(dt.month, 2);
            case "MMM":
              // like Jan
              return month("short", false);
            case "MMMM":
              // like January
              return month("long", false);
            case "MMMMM":
              // like J
              return month("narrow", false);
            // years
            case "y":
              // like 2014
              return useDateTimeFormatter ? string({
                year: "numeric"
              }, "year") : _this.num(dt.year);
            case "yy":
              // like 14
              return useDateTimeFormatter ? string({
                year: "2-digit"
              }, "year") : _this.num(dt.year.toString().slice(-2), 2);
            case "yyyy":
              // like 0012
              return useDateTimeFormatter ? string({
                year: "numeric"
              }, "year") : _this.num(dt.year, 4);
            case "yyyyyy":
              // like 000012
              return useDateTimeFormatter ? string({
                year: "numeric"
              }, "year") : _this.num(dt.year, 6);
            // eras
            case "G":
              // like AD
              return era("short");
            case "GG":
              // like Anno Domini
              return era("long");
            case "GGGGG":
              return era("narrow");
            case "kk":
              return _this.num(dt.weekYear.toString().slice(-2), 2);
            case "kkkk":
              return _this.num(dt.weekYear, 4);
            case "W":
              return _this.num(dt.weekNumber);
            case "WW":
              return _this.num(dt.weekNumber, 2);
            case "n":
              return _this.num(dt.localWeekNumber);
            case "nn":
              return _this.num(dt.localWeekNumber, 2);
            case "ii":
              return _this.num(dt.localWeekYear.toString().slice(-2), 2);
            case "iiii":
              return _this.num(dt.localWeekYear, 4);
            case "o":
              return _this.num(dt.ordinal);
            case "ooo":
              return _this.num(dt.ordinal, 3);
            case "q":
              // like 1
              return _this.num(dt.quarter);
            case "qq":
              // like 01
              return _this.num(dt.quarter, 2);
            case "X":
              return _this.num(Math.floor(dt.ts / 1000));
            case "x":
              return _this.num(dt.ts);
            default:
              return maybeMacro(token);
          }
        };
      return stringifyTokens(Formatter.parseFormat(fmt), tokenToString);
    };
    _proto.formatDurationFromString = function formatDurationFromString(dur, fmt) {
      var _this2 = this;
      var invertLargest = this.opts.signMode === "negativeLargestOnly" ? -1 : 1;
      var tokenToField = function tokenToField(token) {
          switch (token[0]) {
            case "S":
              return "milliseconds";
            case "s":
              return "seconds";
            case "m":
              return "minutes";
            case "h":
              return "hours";
            case "d":
              return "days";
            case "w":
              return "weeks";
            case "M":
              return "months";
            case "y":
              return "years";
            default:
              return null;
          }
        },
        tokenToString = function tokenToString(lildur, info) {
          return function (token) {
            var mapped = tokenToField(token);
            if (mapped) {
              var inversionFactor = info.isNegativeDuration && mapped !== info.largestUnit ? invertLargest : 1;
              var signDisplay;
              if (_this2.opts.signMode === "negativeLargestOnly" && mapped !== info.largestUnit) {
                signDisplay = "never";
              } else if (_this2.opts.signMode === "all") {
                signDisplay = "always";
              } else {
                // "auto" and "negative" are the same, but "auto" has better support
                signDisplay = "auto";
              }
              return _this2.num(lildur.get(mapped) * inversionFactor, token.length, signDisplay);
            } else {
              return token;
            }
          };
        },
        tokens = Formatter.parseFormat(fmt),
        realTokens = tokens.reduce(function (found, _ref) {
          var literal = _ref.literal,
            val = _ref.val;
          return literal ? found : found.concat(val);
        }, []),
        collapsed = dur.shiftTo.apply(dur, realTokens.map(tokenToField).filter(function (t) {
          return t;
        })),
        durationInfo = {
          isNegativeDuration: collapsed < 0,
          // this relies on "collapsed" being based on "shiftTo", which builds up the object
          // in order
          largestUnit: Object.keys(collapsed.values)[0]
        };
      return stringifyTokens(tokens, tokenToString(collapsed, durationInfo));
    };
    return Formatter;
  }();

  /*
   * This file handles parsing for well-specified formats. Here's how it works:
   * Two things go into parsing: a regex to match with and an extractor to take apart the groups in the match.
   * An extractor is just a function that takes a regex match array and returns a { year: ..., month: ... } object
   * parse() does the work of executing the regex and applying the extractor. It takes multiple regex/extractor pairs to try in sequence.
   * Extractors can take a "cursor" representing the offset in the match to look at. This makes it easy to combine extractors.
   * combineExtractors() does the work of combining them, keeping track of the cursor through multiple extractions.
   * Some extractions are super dumb and simpleParse and fromStrings help DRY them.
   */

  var ianaRegex = /[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;
  function combineRegexes() {
    for (var _len = arguments.length, regexes = new Array(_len), _key = 0; _key < _len; _key++) {
      regexes[_key] = arguments[_key];
    }
    var full = regexes.reduce(function (f, r) {
      return f + r.source;
    }, "");
    return RegExp("^" + full + "$");
  }
  function combineExtractors() {
    for (var _len2 = arguments.length, extractors = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      extractors[_key2] = arguments[_key2];
    }
    return function (m) {
      return extractors.reduce(function (_ref, ex) {
        var mergedVals = _ref[0],
          mergedZone = _ref[1],
          cursor = _ref[2];
        var _ex = ex(m, cursor),
          val = _ex[0],
          zone = _ex[1],
          next = _ex[2];
        return [_extends({}, mergedVals, val), zone || mergedZone, next];
      }, [{}, null, 1]).slice(0, 2);
    };
  }
  function parse(s) {
    if (s == null) {
      return [null, null];
    }
    for (var _len3 = arguments.length, patterns = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      patterns[_key3 - 1] = arguments[_key3];
    }
    for (var _i = 0, _patterns = patterns; _i < _patterns.length; _i++) {
      var _patterns$_i = _patterns[_i],
        regex = _patterns$_i[0],
        extractor = _patterns$_i[1];
      var m = regex.exec(s);
      if (m) {
        return extractor(m);
      }
    }
    return [null, null];
  }
  function simpleParse() {
    for (var _len4 = arguments.length, keys = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      keys[_key4] = arguments[_key4];
    }
    return function (match, cursor) {
      var ret = {};
      var i;
      for (i = 0; i < keys.length; i++) {
        ret[keys[i]] = parseInteger(match[cursor + i]);
      }
      return [ret, null, cursor + i];
    };
  }

  // ISO and SQL parsing
  var offsetRegex = /(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/;
  var isoExtendedZone = "(?:" + offsetRegex.source + "?(?:\\[(" + ianaRegex.source + ")\\])?)?";
  var isoTimeBaseRegex = /(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/;
  var isoTimeRegex = RegExp("" + isoTimeBaseRegex.source + isoExtendedZone);
  var isoTimeExtensionRegex = RegExp("(?:[Tt]" + isoTimeRegex.source + ")?");
  var isoYmdRegex = /([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/;
  var isoWeekRegex = /(\d{4})-?W(\d\d)(?:-?(\d))?/;
  var isoOrdinalRegex = /(\d{4})-?(\d{3})/;
  var extractISOWeekData = simpleParse("weekYear", "weekNumber", "weekDay");
  var extractISOOrdinalData = simpleParse("year", "ordinal");
  var sqlYmdRegex = /(\d{4})-(\d\d)-(\d\d)/; // dumbed-down version of the ISO one
  var sqlTimeRegex = RegExp(isoTimeBaseRegex.source + " ?(?:" + offsetRegex.source + "|(" + ianaRegex.source + "))?");
  var sqlTimeExtensionRegex = RegExp("(?: " + sqlTimeRegex.source + ")?");
  function int(match, pos, fallback) {
    var m = match[pos];
    return isUndefined(m) ? fallback : parseInteger(m);
  }
  function extractISOYmd(match, cursor) {
    var item = {
      year: int(match, cursor),
      month: int(match, cursor + 1, 1),
      day: int(match, cursor + 2, 1)
    };
    return [item, null, cursor + 3];
  }
  function extractISOTime(match, cursor) {
    var item = {
      hours: int(match, cursor, 0),
      minutes: int(match, cursor + 1, 0),
      seconds: int(match, cursor + 2, 0),
      milliseconds: parseMillis(match[cursor + 3])
    };
    return [item, null, cursor + 4];
  }
  function extractISOOffset(match, cursor) {
    var local = !match[cursor] && !match[cursor + 1],
      fullOffset = signedOffset(match[cursor + 1], match[cursor + 2]),
      zone = local ? null : FixedOffsetZone.instance(fullOffset);
    return [{}, zone, cursor + 3];
  }
  function extractIANAZone(match, cursor) {
    var zone = match[cursor] ? IANAZone.create(match[cursor]) : null;
    return [{}, zone, cursor + 1];
  }

  // ISO time parsing

  var isoTimeOnly = RegExp("^T?" + isoTimeBaseRegex.source + "$");

  // ISO duration parsing

  var isoDuration = /^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;
  function extractISODuration(match) {
    var s = match[0],
      yearStr = match[1],
      monthStr = match[2],
      weekStr = match[3],
      dayStr = match[4],
      hourStr = match[5],
      minuteStr = match[6],
      secondStr = match[7],
      millisecondsStr = match[8];
    var hasNegativePrefix = s[0] === "-";
    var negativeSeconds = secondStr && secondStr[0] === "-";
    var maybeNegate = function maybeNegate(num, force) {
      if (force === void 0) {
        force = false;
      }
      return num !== undefined && (force || num && hasNegativePrefix) ? -num : num;
    };
    return [{
      years: maybeNegate(parseFloating(yearStr)),
      months: maybeNegate(parseFloating(monthStr)),
      weeks: maybeNegate(parseFloating(weekStr)),
      days: maybeNegate(parseFloating(dayStr)),
      hours: maybeNegate(parseFloating(hourStr)),
      minutes: maybeNegate(parseFloating(minuteStr)),
      seconds: maybeNegate(parseFloating(secondStr), secondStr === "-0"),
      milliseconds: maybeNegate(parseMillis(millisecondsStr), negativeSeconds)
    }];
  }

  // These are a little braindead. EDT *should* tell us that we're in, say, America/New_York
  // and not just that we're in -240 *right now*. But since I don't think these are used that often
  // I'm just going to ignore that
  var obsOffsets = {
    GMT: 0,
    EDT: -4 * 60,
    EST: -5 * 60,
    CDT: -5 * 60,
    CST: -6 * 60,
    MDT: -6 * 60,
    MST: -7 * 60,
    PDT: -7 * 60,
    PST: -8 * 60
  };
  function fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
    var result = {
      year: yearStr.length === 2 ? untruncateYear(parseInteger(yearStr)) : parseInteger(yearStr),
      month: monthsShort.indexOf(monthStr) + 1,
      day: parseInteger(dayStr),
      hour: parseInteger(hourStr),
      minute: parseInteger(minuteStr)
    };
    if (secondStr) result.second = parseInteger(secondStr);
    if (weekdayStr) {
      result.weekday = weekdayStr.length > 3 ? weekdaysLong.indexOf(weekdayStr) + 1 : weekdaysShort.indexOf(weekdayStr) + 1;
    }
    return result;
  }

  // RFC 2822/5322
  var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;
  function extractRFC2822(match) {
    var weekdayStr = match[1],
      dayStr = match[2],
      monthStr = match[3],
      yearStr = match[4],
      hourStr = match[5],
      minuteStr = match[6],
      secondStr = match[7],
      obsOffset = match[8],
      milOffset = match[9],
      offHourStr = match[10],
      offMinuteStr = match[11],
      result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
    var offset;
    if (obsOffset) {
      offset = obsOffsets[obsOffset];
    } else if (milOffset) {
      offset = 0;
    } else {
      offset = signedOffset(offHourStr, offMinuteStr);
    }
    return [result, new FixedOffsetZone(offset)];
  }
  function preprocessRFC2822(s) {
    // Remove comments and folding whitespace and replace multiple-spaces with a single space
    return s.replace(/\([^()]*\)|[\n\t]/g, " ").replace(/(\s\s+)/g, " ").trim();
  }

  // http date

  var rfc1123 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,
    rfc850 = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,
    ascii = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;
  function extractRFC1123Or850(match) {
    var weekdayStr = match[1],
      dayStr = match[2],
      monthStr = match[3],
      yearStr = match[4],
      hourStr = match[5],
      minuteStr = match[6],
      secondStr = match[7],
      result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
    return [result, FixedOffsetZone.utcInstance];
  }
  function extractASCII(match) {
    var weekdayStr = match[1],
      monthStr = match[2],
      dayStr = match[3],
      hourStr = match[4],
      minuteStr = match[5],
      secondStr = match[6],
      yearStr = match[7],
      result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
    return [result, FixedOffsetZone.utcInstance];
  }
  var isoYmdWithTimeExtensionRegex = combineRegexes(isoYmdRegex, isoTimeExtensionRegex);
  var isoWeekWithTimeExtensionRegex = combineRegexes(isoWeekRegex, isoTimeExtensionRegex);
  var isoOrdinalWithTimeExtensionRegex = combineRegexes(isoOrdinalRegex, isoTimeExtensionRegex);
  var isoTimeCombinedRegex = combineRegexes(isoTimeRegex);
  var extractISOYmdTimeAndOffset = combineExtractors(extractISOYmd, extractISOTime, extractISOOffset, extractIANAZone);
  var extractISOWeekTimeAndOffset = combineExtractors(extractISOWeekData, extractISOTime, extractISOOffset, extractIANAZone);
  var extractISOOrdinalDateAndTime = combineExtractors(extractISOOrdinalData, extractISOTime, extractISOOffset, extractIANAZone);
  var extractISOTimeAndOffset = combineExtractors(extractISOTime, extractISOOffset, extractIANAZone);

  /*
   * @private
   */

  function parseISODate(s) {
    return parse(s, [isoYmdWithTimeExtensionRegex, extractISOYmdTimeAndOffset], [isoWeekWithTimeExtensionRegex, extractISOWeekTimeAndOffset], [isoOrdinalWithTimeExtensionRegex, extractISOOrdinalDateAndTime], [isoTimeCombinedRegex, extractISOTimeAndOffset]);
  }
  function parseRFC2822Date(s) {
    return parse(preprocessRFC2822(s), [rfc2822, extractRFC2822]);
  }
  function parseHTTPDate(s) {
    return parse(s, [rfc1123, extractRFC1123Or850], [rfc850, extractRFC1123Or850], [ascii, extractASCII]);
  }
  function parseISODuration(s) {
    return parse(s, [isoDuration, extractISODuration]);
  }
  var extractISOTimeOnly = combineExtractors(extractISOTime);
  function parseISOTimeOnly(s) {
    return parse(s, [isoTimeOnly, extractISOTimeOnly]);
  }
  var sqlYmdWithTimeExtensionRegex = combineRegexes(sqlYmdRegex, sqlTimeExtensionRegex);
  var sqlTimeCombinedRegex = combineRegexes(sqlTimeRegex);
  var extractISOTimeOffsetAndIANAZone = combineExtractors(extractISOTime, extractISOOffset, extractIANAZone);
  function parseSQL(s) {
    return parse(s, [sqlYmdWithTimeExtensionRegex, extractISOYmdTimeAndOffset], [sqlTimeCombinedRegex, extractISOTimeOffsetAndIANAZone]);
  }

  var INVALID$2 = "Invalid Duration";

  // unit conversion constants
  var lowOrderMatrix = {
      weeks: {
        days: 7,
        hours: 7 * 24,
        minutes: 7 * 24 * 60,
        seconds: 7 * 24 * 60 * 60,
        milliseconds: 7 * 24 * 60 * 60 * 1000
      },
      days: {
        hours: 24,
        minutes: 24 * 60,
        seconds: 24 * 60 * 60,
        milliseconds: 24 * 60 * 60 * 1000
      },
      hours: {
        minutes: 60,
        seconds: 60 * 60,
        milliseconds: 60 * 60 * 1000
      },
      minutes: {
        seconds: 60,
        milliseconds: 60 * 1000
      },
      seconds: {
        milliseconds: 1000
      }
    },
    casualMatrix = _extends({
      years: {
        quarters: 4,
        months: 12,
        weeks: 52,
        days: 365,
        hours: 365 * 24,
        minutes: 365 * 24 * 60,
        seconds: 365 * 24 * 60 * 60,
        milliseconds: 365 * 24 * 60 * 60 * 1000
      },
      quarters: {
        months: 3,
        weeks: 13,
        days: 91,
        hours: 91 * 24,
        minutes: 91 * 24 * 60,
        seconds: 91 * 24 * 60 * 60,
        milliseconds: 91 * 24 * 60 * 60 * 1000
      },
      months: {
        weeks: 4,
        days: 30,
        hours: 30 * 24,
        minutes: 30 * 24 * 60,
        seconds: 30 * 24 * 60 * 60,
        milliseconds: 30 * 24 * 60 * 60 * 1000
      }
    }, lowOrderMatrix),
    daysInYearAccurate = 146097.0 / 400,
    daysInMonthAccurate = 146097.0 / 4800,
    accurateMatrix = _extends({
      years: {
        quarters: 4,
        months: 12,
        weeks: daysInYearAccurate / 7,
        days: daysInYearAccurate,
        hours: daysInYearAccurate * 24,
        minutes: daysInYearAccurate * 24 * 60,
        seconds: daysInYearAccurate * 24 * 60 * 60,
        milliseconds: daysInYearAccurate * 24 * 60 * 60 * 1000
      },
      quarters: {
        months: 3,
        weeks: daysInYearAccurate / 28,
        days: daysInYearAccurate / 4,
        hours: daysInYearAccurate * 24 / 4,
        minutes: daysInYearAccurate * 24 * 60 / 4,
        seconds: daysInYearAccurate * 24 * 60 * 60 / 4,
        milliseconds: daysInYearAccurate * 24 * 60 * 60 * 1000 / 4
      },
      months: {
        weeks: daysInMonthAccurate / 7,
        days: daysInMonthAccurate,
        hours: daysInMonthAccurate * 24,
        minutes: daysInMonthAccurate * 24 * 60,
        seconds: daysInMonthAccurate * 24 * 60 * 60,
        milliseconds: daysInMonthAccurate * 24 * 60 * 60 * 1000
      }
    }, lowOrderMatrix);

  // units ordered by size
  var orderedUnits$1 = ["years", "quarters", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds"];
  var reverseUnits = orderedUnits$1.slice(0).reverse();

  // clone really means "create another instance just like this one, but with these changes"
  function clone$1(dur, alts, clear) {
    if (clear === void 0) {
      clear = false;
    }
    // deep merge for vals
    var conf = {
      values: clear ? alts.values : _extends({}, dur.values, alts.values || {}),
      loc: dur.loc.clone(alts.loc),
      conversionAccuracy: alts.conversionAccuracy || dur.conversionAccuracy,
      matrix: alts.matrix || dur.matrix
    };
    return new Duration(conf);
  }
  function durationToMillis(matrix, vals) {
    var _vals$milliseconds;
    var sum = (_vals$milliseconds = vals.milliseconds) != null ? _vals$milliseconds : 0;
    for (var _iterator = _createForOfIteratorHelperLoose(reverseUnits.slice(1)), _step; !(_step = _iterator()).done;) {
      var unit = _step.value;
      if (vals[unit]) {
        sum += vals[unit] * matrix[unit]["milliseconds"];
      }
    }
    return sum;
  }

  // NB: mutates parameters
  function normalizeValues(matrix, vals) {
    // the logic below assumes the overall value of the duration is positive
    // if this is not the case, factor is used to make it so
    var factor = durationToMillis(matrix, vals) < 0 ? -1 : 1;
    orderedUnits$1.reduceRight(function (previous, current) {
      if (!isUndefined(vals[current])) {
        if (previous) {
          var previousVal = vals[previous] * factor;
          var conv = matrix[current][previous];

          // if (previousVal < 0):
          // lower order unit is negative (e.g. { years: 2, days: -2 })
          // normalize this by reducing the higher order unit by the appropriate amount
          // and increasing the lower order unit
          // this can never make the higher order unit negative, because this function only operates
          // on positive durations, so the amount of time represented by the lower order unit cannot
          // be larger than the higher order unit
          // else:
          // lower order unit is positive (e.g. { years: 2, days: 450 } or { years: -2, days: 450 })
          // in this case we attempt to convert as much as possible from the lower order unit into
          // the higher order one
          //
          // Math.floor takes care of both of these cases, rounding away from 0
          // if previousVal < 0 it makes the absolute value larger
          // if previousVal >= it makes the absolute value smaller
          var rollUp = Math.floor(previousVal / conv);
          vals[current] += rollUp * factor;
          vals[previous] -= rollUp * conv * factor;
        }
        return current;
      } else {
        return previous;
      }
    }, null);

    // try to convert any decimals into smaller units if possible
    // for example for { years: 2.5, days: 0, seconds: 0 } we want to get { years: 2, days: 182, hours: 12 }
    orderedUnits$1.reduce(function (previous, current) {
      if (!isUndefined(vals[current])) {
        if (previous) {
          var fraction = vals[previous] % 1;
          vals[previous] -= fraction;
          vals[current] += fraction * matrix[previous][current];
        }
        return current;
      } else {
        return previous;
      }
    }, null);
  }

  // Remove all properties with a value of 0 from an object
  function removeZeroes(vals) {
    var newVals = {};
    for (var _i = 0, _Object$entries = Object.entries(vals); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _Object$entries[_i],
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];
      if (value !== 0) {
        newVals[key] = value;
      }
    }
    return newVals;
  }

  /**
   * A Duration object represents a period of time, like "2 months" or "1 day, 1 hour". Conceptually, it's just a map of units to their quantities, accompanied by some additional configuration and methods for creating, parsing, interrogating, transforming, and formatting them. They can be used on their own or in conjunction with other Luxon types; for example, you can use {@link DateTime#plus} to add a Duration object to a DateTime, producing another DateTime.
   *
   * Here is a brief overview of commonly used methods and getters in Duration:
   *
   * * **Creation** To create a Duration, use {@link Duration.fromMillis}, {@link Duration.fromObject}, or {@link Duration.fromISO}.
   * * **Unit values** See the {@link Duration#years}, {@link Duration#months}, {@link Duration#weeks}, {@link Duration#days}, {@link Duration#hours}, {@link Duration#minutes}, {@link Duration#seconds}, {@link Duration#milliseconds} accessors.
   * * **Configuration** See  {@link Duration#locale} and {@link Duration#numberingSystem} accessors.
   * * **Transformation** To create new Durations out of old ones use {@link Duration#plus}, {@link Duration#minus}, {@link Duration#normalize}, {@link Duration#set}, {@link Duration#reconfigure}, {@link Duration#shiftTo}, and {@link Duration#negate}.
   * * **Output** To convert the Duration into other representations, see {@link Duration#as}, {@link Duration#toISO}, {@link Duration#toFormat}, and {@link Duration#toJSON}
   *
   * There's are more methods documented below. In addition, for more information on subtler topics like internationalization and validity, see the external documentation.
   */
  var Duration = /*#__PURE__*/function (_Symbol$for) {
    /**
     * @private
     */
    function Duration(config) {
      var accurate = config.conversionAccuracy === "longterm" || false;
      var matrix = accurate ? accurateMatrix : casualMatrix;
      if (config.matrix) {
        matrix = config.matrix;
      }

      /**
       * @access private
       */
      this.values = config.values;
      /**
       * @access private
       */
      this.loc = config.loc || Locale.create();
      /**
       * @access private
       */
      this.conversionAccuracy = accurate ? "longterm" : "casual";
      /**
       * @access private
       */
      this.invalid = config.invalid || null;
      /**
       * @access private
       */
      this.matrix = matrix;
      /**
       * @access private
       */
      this.isLuxonDuration = true;
    }

    /**
     * Create Duration from a number of milliseconds.
     * @param {number} count of milliseconds
     * @param {Object} opts - options for parsing
     * @param {string} [opts.locale='en-US'] - the locale to use
     * @param {string} opts.numberingSystem - the numbering system to use
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @return {Duration}
     */
    Duration.fromMillis = function fromMillis(count, opts) {
      return Duration.fromObject({
        milliseconds: count
      }, opts);
    }

    /**
     * Create a Duration from a JavaScript object with keys like 'years' and 'hours'.
     * If this object is empty then a zero milliseconds duration is returned.
     * @param {Object} obj - the object to create the DateTime from
     * @param {number} obj.years
     * @param {number} obj.quarters
     * @param {number} obj.months
     * @param {number} obj.weeks
     * @param {number} obj.days
     * @param {number} obj.hours
     * @param {number} obj.minutes
     * @param {number} obj.seconds
     * @param {number} obj.milliseconds
     * @param {Object} [opts=[]] - options for creating this Duration
     * @param {string} [opts.locale='en-US'] - the locale to use
     * @param {string} opts.numberingSystem - the numbering system to use
     * @param {string} [opts.conversionAccuracy='casual'] - the preset conversion system to use
     * @param {string} [opts.matrix=Object] - the custom conversion system to use
     * @return {Duration}
     */;
    Duration.fromObject = function fromObject(obj, opts) {
      if (opts === void 0) {
        opts = {};
      }
      if (obj == null || typeof obj !== "object") {
        throw new InvalidArgumentError("Duration.fromObject: argument expected to be an object, got " + (obj === null ? "null" : typeof obj));
      }
      return new Duration({
        values: normalizeObject(obj, Duration.normalizeUnit),
        loc: Locale.fromObject(opts),
        conversionAccuracy: opts.conversionAccuracy,
        matrix: opts.matrix
      });
    }

    /**
     * Create a Duration from DurationLike.
     *
     * @param {Object | number | Duration} durationLike
     * One of:
     * - object with keys like 'years' and 'hours'.
     * - number representing milliseconds
     * - Duration instance
     * @return {Duration}
     */;
    Duration.fromDurationLike = function fromDurationLike(durationLike) {
      if (isNumber(durationLike)) {
        return Duration.fromMillis(durationLike);
      } else if (Duration.isDuration(durationLike)) {
        return durationLike;
      } else if (typeof durationLike === "object") {
        return Duration.fromObject(durationLike);
      } else {
        throw new InvalidArgumentError("Unknown duration argument " + durationLike + " of type " + typeof durationLike);
      }
    }

    /**
     * Create a Duration from an ISO 8601 duration string.
     * @param {string} text - text to parse
     * @param {Object} opts - options for parsing
     * @param {string} [opts.locale='en-US'] - the locale to use
     * @param {string} opts.numberingSystem - the numbering system to use
     * @param {string} [opts.conversionAccuracy='casual'] - the preset conversion system to use
     * @param {string} [opts.matrix=Object] - the preset conversion system to use
     * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
     * @example Duration.fromISO('P3Y6M1W4DT12H30M5S').toObject() //=> { years: 3, months: 6, weeks: 1, days: 4, hours: 12, minutes: 30, seconds: 5 }
     * @example Duration.fromISO('PT23H').toObject() //=> { hours: 23 }
     * @example Duration.fromISO('P5Y3M').toObject() //=> { years: 5, months: 3 }
     * @return {Duration}
     */;
    Duration.fromISO = function fromISO(text, opts) {
      var _parseISODuration = parseISODuration(text),
        parsed = _parseISODuration[0];
      if (parsed) {
        return Duration.fromObject(parsed, opts);
      } else {
        return Duration.invalid("unparsable", "the input \"" + text + "\" can't be parsed as ISO 8601");
      }
    }

    /**
     * Create a Duration from an ISO 8601 time string.
     * @param {string} text - text to parse
     * @param {Object} opts - options for parsing
     * @param {string} [opts.locale='en-US'] - the locale to use
     * @param {string} opts.numberingSystem - the numbering system to use
     * @param {string} [opts.conversionAccuracy='casual'] - the preset conversion system to use
     * @param {string} [opts.matrix=Object] - the conversion system to use
     * @see https://en.wikipedia.org/wiki/ISO_8601#Times
     * @example Duration.fromISOTime('11:22:33.444').toObject() //=> { hours: 11, minutes: 22, seconds: 33, milliseconds: 444 }
     * @example Duration.fromISOTime('11:00').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     * @example Duration.fromISOTime('T11:00').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     * @example Duration.fromISOTime('1100').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     * @example Duration.fromISOTime('T1100').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     * @return {Duration}
     */;
    Duration.fromISOTime = function fromISOTime(text, opts) {
      var _parseISOTimeOnly = parseISOTimeOnly(text),
        parsed = _parseISOTimeOnly[0];
      if (parsed) {
        return Duration.fromObject(parsed, opts);
      } else {
        return Duration.invalid("unparsable", "the input \"" + text + "\" can't be parsed as ISO 8601");
      }
    }

    /**
     * Create an invalid Duration.
     * @param {string} reason - simple string of why this datetime is invalid. Should not contain parameters or anything else data-dependent
     * @param {string} [explanation=null] - longer explanation, may include parameters and other useful debugging information
     * @return {Duration}
     */;
    Duration.invalid = function invalid(reason, explanation) {
      if (explanation === void 0) {
        explanation = null;
      }
      if (!reason) {
        throw new InvalidArgumentError("need to specify a reason the Duration is invalid");
      }
      var invalid = reason instanceof Invalid ? reason : new Invalid(reason, explanation);
      if (Settings.throwOnInvalid) {
        throw new InvalidDurationError(invalid);
      } else {
        return new Duration({
          invalid: invalid
        });
      }
    }

    /**
     * @private
     */;
    Duration.normalizeUnit = function normalizeUnit(unit) {
      var normalized = {
        year: "years",
        years: "years",
        quarter: "quarters",
        quarters: "quarters",
        month: "months",
        months: "months",
        week: "weeks",
        weeks: "weeks",
        day: "days",
        days: "days",
        hour: "hours",
        hours: "hours",
        minute: "minutes",
        minutes: "minutes",
        second: "seconds",
        seconds: "seconds",
        millisecond: "milliseconds",
        milliseconds: "milliseconds"
      }[unit ? unit.toLowerCase() : unit];
      if (!normalized) throw new InvalidUnitError(unit);
      return normalized;
    }

    /**
     * Check if an object is a Duration. Works across context boundaries
     * @param {object} o
     * @return {boolean}
     */;
    Duration.isDuration = function isDuration(o) {
      return o && o.isLuxonDuration || false;
    }

    /**
     * Get  the locale of a Duration, such 'en-GB'
     * @type {string}
     */;
    var _proto = Duration.prototype;
    /**
     * Returns a string representation of this Duration formatted according to the specified format string. You may use these tokens:
     * * `S` for milliseconds
     * * `s` for seconds
     * * `m` for minutes
     * * `h` for hours
     * * `d` for days
     * * `w` for weeks
     * * `M` for months
     * * `y` for years
     * Notes:
     * * Add padding by repeating the token, e.g. "yy" pads the years to two digits, "hhhh" pads the hours out to four digits
     * * Tokens can be escaped by wrapping with single quotes.
     * * The duration will be converted to the set of units in the format string using {@link Duration#shiftTo} and the Durations's conversion accuracy setting.
     * @param {string} fmt - the format string
     * @param {Object} opts - options
     * @param {boolean} [opts.floor=true] - floor numerical values
     * @param {'negative'|'all'|'negativeLargestOnly'} [opts.signMode=negative] - How to handle signs
     * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("y d s") //=> "1 6 2"
     * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("yy dd sss") //=> "01 06 002"
     * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("M S") //=> "12 518402000"
     * @example Duration.fromObject({ days: 6, seconds: 2 }).toFormat("d s", { signMode: "all" }) //=> "+6 +2"
     * @example Duration.fromObject({ days: -6, seconds: -2 }).toFormat("d s", { signMode: "all" }) //=> "-6 -2"
     * @example Duration.fromObject({ days: -6, seconds: -2 }).toFormat("d s", { signMode: "negativeLargestOnly" }) //=> "-6 2"
     * @return {string}
     */
    _proto.toFormat = function toFormat(fmt, opts) {
      if (opts === void 0) {
        opts = {};
      }
      // reverse-compat since 1.2; we always round down now, never up, and we do it by default
      var fmtOpts = _extends({}, opts, {
        floor: opts.round !== false && opts.floor !== false
      });
      return this.isValid ? Formatter.create(this.loc, fmtOpts).formatDurationFromString(this, fmt) : INVALID$2;
    }

    /**
     * Returns a string representation of a Duration with all units included.
     * To modify its behavior, use `listStyle` and any Intl.NumberFormat option, though `unitDisplay` is especially relevant.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options
     * @param {Object} opts - Formatting options. Accepts the same keys as the options parameter of the native `Intl.NumberFormat` constructor, as well as `listStyle`.
     * @param {string} [opts.listStyle='narrow'] - How to format the merged list. Corresponds to the `style` property of the options parameter of the native `Intl.ListFormat` constructor.
     * @param {boolean} [opts.showZeros=true] - Show all units previously used by the duration even if they are zero
     * @example
     * ```js
     * var dur = Duration.fromObject({ months: 1, weeks: 0, hours: 5, minutes: 6 })
     * dur.toHuman() //=> '1 month, 0 weeks, 5 hours, 6 minutes'
     * dur.toHuman({ listStyle: "long" }) //=> '1 month, 0 weeks, 5 hours, and 6 minutes'
     * dur.toHuman({ unitDisplay: "short" }) //=> '1 mth, 0 wks, 5 hr, 6 min'
     * dur.toHuman({ showZeros: false }) //=> '1 month, 5 hours, 6 minutes'
     * ```
     */;
    _proto.toHuman = function toHuman(opts) {
      var _this = this;
      if (opts === void 0) {
        opts = {};
      }
      if (!this.isValid) return INVALID$2;
      var showZeros = opts.showZeros !== false;
      var l = orderedUnits$1.map(function (unit) {
        var val = _this.values[unit];
        if (isUndefined(val) || val === 0 && !showZeros) {
          return null;
        }
        return _this.loc.numberFormatter(_extends({
          style: "unit",
          unitDisplay: "long"
        }, opts, {
          unit: unit.slice(0, -1)
        })).format(val);
      }).filter(function (n) {
        return n;
      });
      return this.loc.listFormatter(_extends({
        type: "conjunction",
        style: opts.listStyle || "narrow"
      }, opts)).format(l);
    }

    /**
     * Returns a JavaScript object with this Duration's values.
     * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toObject() //=> { years: 1, days: 6, seconds: 2 }
     * @return {Object}
     */;
    _proto.toObject = function toObject() {
      if (!this.isValid) return {};
      return _extends({}, this.values);
    }

    /**
     * Returns an ISO 8601-compliant string representation of this Duration.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
     * @example Duration.fromObject({ years: 3, seconds: 45 }).toISO() //=> 'P3YT45S'
     * @example Duration.fromObject({ months: 4, seconds: 45 }).toISO() //=> 'P4MT45S'
     * @example Duration.fromObject({ months: 5 }).toISO() //=> 'P5M'
     * @example Duration.fromObject({ minutes: 5 }).toISO() //=> 'PT5M'
     * @example Duration.fromObject({ milliseconds: 6 }).toISO() //=> 'PT0.006S'
     * @return {string}
     */;
    _proto.toISO = function toISO() {
      // we could use the formatter, but this is an easier way to get the minimum string
      if (!this.isValid) return null;
      var s = "P";
      if (this.years !== 0) s += this.years + "Y";
      if (this.months !== 0 || this.quarters !== 0) s += this.months + this.quarters * 3 + "M";
      if (this.weeks !== 0) s += this.weeks + "W";
      if (this.days !== 0) s += this.days + "D";
      if (this.hours !== 0 || this.minutes !== 0 || this.seconds !== 0 || this.milliseconds !== 0) s += "T";
      if (this.hours !== 0) s += this.hours + "H";
      if (this.minutes !== 0) s += this.minutes + "M";
      if (this.seconds !== 0 || this.milliseconds !== 0)
        // this will handle "floating point madness" by removing extra decimal places
        // https://stackoverflow.com/questions/588004/is-floating-point-math-broken
        s += roundTo(this.seconds + this.milliseconds / 1000, 3) + "S";
      if (s === "P") s += "T0S";
      return s;
    }

    /**
     * Returns an ISO 8601-compliant string representation of this Duration, formatted as a time of day.
     * Note that this will return null if the duration is invalid, negative, or equal to or greater than 24 hours.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Times
     * @param {Object} opts - options
     * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
     * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
     * @param {boolean} [opts.includePrefix=false] - include the `T` prefix
     * @param {string} [opts.format='extended'] - choose between the basic and extended format
     * @example Duration.fromObject({ hours: 11 }).toISOTime() //=> '11:00:00.000'
     * @example Duration.fromObject({ hours: 11 }).toISOTime({ suppressMilliseconds: true }) //=> '11:00:00'
     * @example Duration.fromObject({ hours: 11 }).toISOTime({ suppressSeconds: true }) //=> '11:00'
     * @example Duration.fromObject({ hours: 11 }).toISOTime({ includePrefix: true }) //=> 'T11:00:00.000'
     * @example Duration.fromObject({ hours: 11 }).toISOTime({ format: 'basic' }) //=> '110000.000'
     * @return {string}
     */;
    _proto.toISOTime = function toISOTime(opts) {
      if (opts === void 0) {
        opts = {};
      }
      if (!this.isValid) return null;
      var millis = this.toMillis();
      if (millis < 0 || millis >= 86400000) return null;
      opts = _extends({
        suppressMilliseconds: false,
        suppressSeconds: false,
        includePrefix: false,
        format: "extended"
      }, opts, {
        includeOffset: false
      });
      var dateTime = DateTime.fromMillis(millis, {
        zone: "UTC"
      });
      return dateTime.toISOTime(opts);
    }

    /**
     * Returns an ISO 8601 representation of this Duration appropriate for use in JSON.
     * @return {string}
     */;
    _proto.toJSON = function toJSON() {
      return this.toISO();
    }

    /**
     * Returns an ISO 8601 representation of this Duration appropriate for use in debugging.
     * @return {string}
     */;
    _proto.toString = function toString() {
      return this.toISO();
    }

    /**
     * Returns a string representation of this Duration appropriate for the REPL.
     * @return {string}
     */;
    _proto[_Symbol$for] = function () {
      if (this.isValid) {
        return "Duration { values: " + JSON.stringify(this.values) + " }";
      } else {
        return "Duration { Invalid, reason: " + this.invalidReason + " }";
      }
    }

    /**
     * Returns an milliseconds value of this Duration.
     * @return {number}
     */;
    _proto.toMillis = function toMillis() {
      if (!this.isValid) return NaN;
      return durationToMillis(this.matrix, this.values);
    }

    /**
     * Returns an milliseconds value of this Duration. Alias of {@link toMillis}
     * @return {number}
     */;
    _proto.valueOf = function valueOf() {
      return this.toMillis();
    }

    /**
     * Make this Duration longer by the specified amount. Return a newly-constructed Duration.
     * @param {Duration|Object|number} duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     * @return {Duration}
     */;
    _proto.plus = function plus(duration) {
      if (!this.isValid) return this;
      var dur = Duration.fromDurationLike(duration),
        result = {};
      for (var _i2 = 0, _orderedUnits = orderedUnits$1; _i2 < _orderedUnits.length; _i2++) {
        var k = _orderedUnits[_i2];
        if (hasOwnProperty(dur.values, k) || hasOwnProperty(this.values, k)) {
          result[k] = dur.get(k) + this.get(k);
        }
      }
      return clone$1(this, {
        values: result
      }, true);
    }

    /**
     * Make this Duration shorter by the specified amount. Return a newly-constructed Duration.
     * @param {Duration|Object|number} duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     * @return {Duration}
     */;
    _proto.minus = function minus(duration) {
      if (!this.isValid) return this;
      var dur = Duration.fromDurationLike(duration);
      return this.plus(dur.negate());
    }

    /**
     * Scale this Duration by the specified amount. Return a newly-constructed Duration.
     * @param {function} fn - The function to apply to each unit. Arity is 1 or 2: the value of the unit and, optionally, the unit name. Must return a number.
     * @example Duration.fromObject({ hours: 1, minutes: 30 }).mapUnits(x => x * 2) //=> { hours: 2, minutes: 60 }
     * @example Duration.fromObject({ hours: 1, minutes: 30 }).mapUnits((x, u) => u === "hours" ? x * 2 : x) //=> { hours: 2, minutes: 30 }
     * @return {Duration}
     */;
    _proto.mapUnits = function mapUnits(fn) {
      if (!this.isValid) return this;
      var result = {};
      for (var _i3 = 0, _Object$keys = Object.keys(this.values); _i3 < _Object$keys.length; _i3++) {
        var k = _Object$keys[_i3];
        result[k] = asNumber(fn(this.values[k], k));
      }
      return clone$1(this, {
        values: result
      }, true);
    }

    /**
     * Get the value of unit.
     * @param {string} unit - a unit such as 'minute' or 'day'
     * @example Duration.fromObject({years: 2, days: 3}).get('years') //=> 2
     * @example Duration.fromObject({years: 2, days: 3}).get('months') //=> 0
     * @example Duration.fromObject({years: 2, days: 3}).get('days') //=> 3
     * @return {number}
     */;
    _proto.get = function get(unit) {
      return this[Duration.normalizeUnit(unit)];
    }

    /**
     * "Set" the values of specified units. Return a newly-constructed Duration.
     * @param {Object} values - a mapping of units to numbers
     * @example dur.set({ years: 2017 })
     * @example dur.set({ hours: 8, minutes: 30 })
     * @return {Duration}
     */;
    _proto.set = function set(values) {
      if (!this.isValid) return this;
      var mixed = _extends({}, this.values, normalizeObject(values, Duration.normalizeUnit));
      return clone$1(this, {
        values: mixed
      });
    }

    /**
     * "Set" the locale and/or numberingSystem.  Returns a newly-constructed Duration.
     * @example dur.reconfigure({ locale: 'en-GB' })
     * @return {Duration}
     */;
    _proto.reconfigure = function reconfigure(_temp) {
      var _ref = _temp === void 0 ? {} : _temp,
        locale = _ref.locale,
        numberingSystem = _ref.numberingSystem,
        conversionAccuracy = _ref.conversionAccuracy,
        matrix = _ref.matrix;
      var loc = this.loc.clone({
        locale: locale,
        numberingSystem: numberingSystem
      });
      var opts = {
        loc: loc,
        matrix: matrix,
        conversionAccuracy: conversionAccuracy
      };
      return clone$1(this, opts);
    }

    /**
     * Return the length of the duration in the specified unit.
     * @param {string} unit - a unit such as 'minutes' or 'days'
     * @example Duration.fromObject({years: 1}).as('days') //=> 365
     * @example Duration.fromObject({years: 1}).as('months') //=> 12
     * @example Duration.fromObject({hours: 60}).as('days') //=> 2.5
     * @return {number}
     */;
    _proto.as = function as(unit) {
      return this.isValid ? this.shiftTo(unit).get(unit) : NaN;
    }

    /**
     * Reduce this Duration to its canonical representation in its current units.
     * Assuming the overall value of the Duration is positive, this means:
     * - excessive values for lower-order units are converted to higher-order units (if possible, see first and second example)
     * - negative lower-order units are converted to higher order units (there must be such a higher order unit, otherwise
     *   the overall value would be negative, see third example)
     * - fractional values for higher-order units are converted to lower-order units (if possible, see fourth example)
     *
     * If the overall value is negative, the result of this method is equivalent to `this.negate().normalize().negate()`.
     * @example Duration.fromObject({ years: 2, days: 5000 }).normalize().toObject() //=> { years: 15, days: 255 }
     * @example Duration.fromObject({ days: 5000 }).normalize().toObject() //=> { days: 5000 }
     * @example Duration.fromObject({ hours: 12, minutes: -45 }).normalize().toObject() //=> { hours: 11, minutes: 15 }
     * @example Duration.fromObject({ years: 2.5, days: 0, hours: 0 }).normalize().toObject() //=> { years: 2, days: 182, hours: 12 }
     * @return {Duration}
     */;
    _proto.normalize = function normalize() {
      if (!this.isValid) return this;
      var vals = this.toObject();
      normalizeValues(this.matrix, vals);
      return clone$1(this, {
        values: vals
      }, true);
    }

    /**
     * Rescale units to its largest representation
     * @example Duration.fromObject({ milliseconds: 90000 }).rescale().toObject() //=> { minutes: 1, seconds: 30 }
     * @return {Duration}
     */;
    _proto.rescale = function rescale() {
      if (!this.isValid) return this;
      var vals = removeZeroes(this.normalize().shiftToAll().toObject());
      return clone$1(this, {
        values: vals
      }, true);
    }

    /**
     * Convert this Duration into its representation in a different set of units.
     * @example Duration.fromObject({ hours: 1, seconds: 30 }).shiftTo('minutes', 'milliseconds').toObject() //=> { minutes: 60, milliseconds: 30000 }
     * @return {Duration}
     */;
    _proto.shiftTo = function shiftTo() {
      for (var _len = arguments.length, units = new Array(_len), _key = 0; _key < _len; _key++) {
        units[_key] = arguments[_key];
      }
      if (!this.isValid) return this;
      if (units.length === 0) {
        return this;
      }
      units = units.map(function (u) {
        return Duration.normalizeUnit(u);
      });
      var built = {},
        accumulated = {},
        vals = this.toObject();
      var lastUnit;
      for (var _i4 = 0, _orderedUnits2 = orderedUnits$1; _i4 < _orderedUnits2.length; _i4++) {
        var k = _orderedUnits2[_i4];
        if (units.indexOf(k) >= 0) {
          lastUnit = k;
          var own = 0;

          // anything we haven't boiled down yet should get boiled to this unit
          for (var ak in accumulated) {
            own += this.matrix[ak][k] * accumulated[ak];
            accumulated[ak] = 0;
          }

          // plus anything that's already in this unit
          if (isNumber(vals[k])) {
            own += vals[k];
          }

          // only keep the integer part for now in the hopes of putting any decimal part
          // into a smaller unit later
          var i = Math.trunc(own);
          built[k] = i;
          accumulated[k] = (own * 1000 - i * 1000) / 1000;

          // otherwise, keep it in the wings to boil it later
        } else if (isNumber(vals[k])) {
          accumulated[k] = vals[k];
        }
      }

      // anything leftover becomes the decimal for the last unit
      // lastUnit must be defined since units is not empty
      for (var key in accumulated) {
        if (accumulated[key] !== 0) {
          built[lastUnit] += key === lastUnit ? accumulated[key] : accumulated[key] / this.matrix[lastUnit][key];
        }
      }
      normalizeValues(this.matrix, built);
      return clone$1(this, {
        values: built
      }, true);
    }

    /**
     * Shift this Duration to all available units.
     * Same as shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds")
     * @return {Duration}
     */;
    _proto.shiftToAll = function shiftToAll() {
      if (!this.isValid) return this;
      return this.shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds");
    }

    /**
     * Return the negative of this Duration.
     * @example Duration.fromObject({ hours: 1, seconds: 30 }).negate().toObject() //=> { hours: -1, seconds: -30 }
     * @return {Duration}
     */;
    _proto.negate = function negate() {
      if (!this.isValid) return this;
      var negated = {};
      for (var _i5 = 0, _Object$keys2 = Object.keys(this.values); _i5 < _Object$keys2.length; _i5++) {
        var k = _Object$keys2[_i5];
        negated[k] = this.values[k] === 0 ? 0 : -this.values[k];
      }
      return clone$1(this, {
        values: negated
      }, true);
    }

    /**
     * Removes all units with values equal to 0 from this Duration.
     * @example Duration.fromObject({ years: 2, days: 0, hours: 0, minutes: 0 }).removeZeros().toObject() //=> { years: 2 }
     * @return {Duration}
     */;
    _proto.removeZeros = function removeZeros() {
      if (!this.isValid) return this;
      var vals = removeZeroes(this.values);
      return clone$1(this, {
        values: vals
      }, true);
    }

    /**
     * Get the years.
     * @type {number}
     */;
    /**
     * Equality check
     * Two Durations are equal iff they have the same units and the same values for each unit.
     * @param {Duration} other
     * @return {boolean}
     */
    _proto.equals = function equals(other) {
      if (!this.isValid || !other.isValid) {
        return false;
      }
      if (!this.loc.equals(other.loc)) {
        return false;
      }
      function eq(v1, v2) {
        // Consider 0 and undefined as equal
        if (v1 === undefined || v1 === 0) return v2 === undefined || v2 === 0;
        return v1 === v2;
      }
      for (var _i6 = 0, _orderedUnits3 = orderedUnits$1; _i6 < _orderedUnits3.length; _i6++) {
        var u = _orderedUnits3[_i6];
        if (!eq(this.values[u], other.values[u])) {
          return false;
        }
      }
      return true;
    };
    _createClass(Duration, [{
      key: "locale",
      get: function get() {
        return this.isValid ? this.loc.locale : null;
      }

      /**
       * Get the numbering system of a Duration, such 'beng'. The numbering system is used when formatting the Duration
       *
       * @type {string}
       */
    }, {
      key: "numberingSystem",
      get: function get() {
        return this.isValid ? this.loc.numberingSystem : null;
      }
    }, {
      key: "years",
      get: function get() {
        return this.isValid ? this.values.years || 0 : NaN;
      }

      /**
       * Get the quarters.
       * @type {number}
       */
    }, {
      key: "quarters",
      get: function get() {
        return this.isValid ? this.values.quarters || 0 : NaN;
      }

      /**
       * Get the months.
       * @type {number}
       */
    }, {
      key: "months",
      get: function get() {
        return this.isValid ? this.values.months || 0 : NaN;
      }

      /**
       * Get the weeks
       * @type {number}
       */
    }, {
      key: "weeks",
      get: function get() {
        return this.isValid ? this.values.weeks || 0 : NaN;
      }

      /**
       * Get the days.
       * @type {number}
       */
    }, {
      key: "days",
      get: function get() {
        return this.isValid ? this.values.days || 0 : NaN;
      }

      /**
       * Get the hours.
       * @type {number}
       */
    }, {
      key: "hours",
      get: function get() {
        return this.isValid ? this.values.hours || 0 : NaN;
      }

      /**
       * Get the minutes.
       * @type {number}
       */
    }, {
      key: "minutes",
      get: function get() {
        return this.isValid ? this.values.minutes || 0 : NaN;
      }

      /**
       * Get the seconds.
       * @return {number}
       */
    }, {
      key: "seconds",
      get: function get() {
        return this.isValid ? this.values.seconds || 0 : NaN;
      }

      /**
       * Get the milliseconds.
       * @return {number}
       */
    }, {
      key: "milliseconds",
      get: function get() {
        return this.isValid ? this.values.milliseconds || 0 : NaN;
      }

      /**
       * Returns whether the Duration is invalid. Invalid durations are returned by diff operations
       * on invalid DateTimes or Intervals.
       * @return {boolean}
       */
    }, {
      key: "isValid",
      get: function get() {
        return this.invalid === null;
      }

      /**
       * Returns an error code if this Duration became invalid, or null if the Duration is valid
       * @return {string}
       */
    }, {
      key: "invalidReason",
      get: function get() {
        return this.invalid ? this.invalid.reason : null;
      }

      /**
       * Returns an explanation of why this Duration became invalid, or null if the Duration is valid
       * @type {string}
       */
    }, {
      key: "invalidExplanation",
      get: function get() {
        return this.invalid ? this.invalid.explanation : null;
      }
    }]);
    return Duration;
  }(Symbol.for("nodejs.util.inspect.custom"));

  var INVALID$1 = "Invalid Interval";

  // checks if the start is equal to or before the end
  function validateStartEnd(start, end) {
    if (!start || !start.isValid) {
      return Interval.invalid("missing or invalid start");
    } else if (!end || !end.isValid) {
      return Interval.invalid("missing or invalid end");
    } else if (end < start) {
      return Interval.invalid("end before start", "The end of an interval must be after its start, but you had start=" + start.toISO() + " and end=" + end.toISO());
    } else {
      return null;
    }
  }

  /**
   * An Interval object represents a half-open interval of time, where each endpoint is a {@link DateTime}. Conceptually, it's a container for those two endpoints, accompanied by methods for creating, parsing, interrogating, comparing, transforming, and formatting them.
   *
   * Here is a brief overview of the most commonly used methods and getters in Interval:
   *
   * * **Creation** To create an Interval, use {@link Interval.fromDateTimes}, {@link Interval.after}, {@link Interval.before}, or {@link Interval.fromISO}.
   * * **Accessors** Use {@link Interval#start} and {@link Interval#end} to get the start and end.
   * * **Interrogation** To analyze the Interval, use {@link Interval#count}, {@link Interval#length}, {@link Interval#hasSame}, {@link Interval#contains}, {@link Interval#isAfter}, or {@link Interval#isBefore}.
   * * **Transformation** To create other Intervals out of this one, use {@link Interval#set}, {@link Interval#splitAt}, {@link Interval#splitBy}, {@link Interval#divideEqually}, {@link Interval.merge}, {@link Interval.xor}, {@link Interval#union}, {@link Interval#intersection}, or {@link Interval#difference}.
   * * **Comparison** To compare this Interval to another one, use {@link Interval#equals}, {@link Interval#overlaps}, {@link Interval#abutsStart}, {@link Interval#abutsEnd}, {@link Interval#engulfs}
   * * **Output** To convert the Interval into other representations, see {@link Interval#toString}, {@link Interval#toLocaleString}, {@link Interval#toISO}, {@link Interval#toISODate}, {@link Interval#toISOTime}, {@link Interval#toFormat}, and {@link Interval#toDuration}.
   */
  var Interval = /*#__PURE__*/function (_Symbol$for) {
    /**
     * @private
     */
    function Interval(config) {
      /**
       * @access private
       */
      this.s = config.start;
      /**
       * @access private
       */
      this.e = config.end;
      /**
       * @access private
       */
      this.invalid = config.invalid || null;
      /**
       * @access private
       */
      this.isLuxonInterval = true;
    }

    /**
     * Create an invalid Interval.
     * @param {string} reason - simple string of why this Interval is invalid. Should not contain parameters or anything else data-dependent
     * @param {string} [explanation=null] - longer explanation, may include parameters and other useful debugging information
     * @return {Interval}
     */
    Interval.invalid = function invalid(reason, explanation) {
      if (explanation === void 0) {
        explanation = null;
      }
      if (!reason) {
        throw new InvalidArgumentError("need to specify a reason the Interval is invalid");
      }
      var invalid = reason instanceof Invalid ? reason : new Invalid(reason, explanation);
      if (Settings.throwOnInvalid) {
        throw new InvalidIntervalError(invalid);
      } else {
        return new Interval({
          invalid: invalid
        });
      }
    }

    /**
     * Create an Interval from a start DateTime and an end DateTime. Inclusive of the start but not the end.
     * @param {DateTime|Date|Object} start
     * @param {DateTime|Date|Object} end
     * @return {Interval}
     */;
    Interval.fromDateTimes = function fromDateTimes(start, end) {
      var builtStart = friendlyDateTime(start),
        builtEnd = friendlyDateTime(end);
      var validateError = validateStartEnd(builtStart, builtEnd);
      if (validateError == null) {
        return new Interval({
          start: builtStart,
          end: builtEnd
        });
      } else {
        return validateError;
      }
    }

    /**
     * Create an Interval from a start DateTime and a Duration to extend to.
     * @param {DateTime|Date|Object} start
     * @param {Duration|Object|number} duration - the length of the Interval.
     * @return {Interval}
     */;
    Interval.after = function after(start, duration) {
      var dur = Duration.fromDurationLike(duration),
        dt = friendlyDateTime(start);
      return Interval.fromDateTimes(dt, dt.plus(dur));
    }

    /**
     * Create an Interval from an end DateTime and a Duration to extend backwards to.
     * @param {DateTime|Date|Object} end
     * @param {Duration|Object|number} duration - the length of the Interval.
     * @return {Interval}
     */;
    Interval.before = function before(end, duration) {
      var dur = Duration.fromDurationLike(duration),
        dt = friendlyDateTime(end);
      return Interval.fromDateTimes(dt.minus(dur), dt);
    }

    /**
     * Create an Interval from an ISO 8601 string.
     * Accepts `<start>/<end>`, `<start>/<duration>`, and `<duration>/<end>` formats.
     * @param {string} text - the ISO string to parse
     * @param {Object} [opts] - options to pass {@link DateTime#fromISO} and optionally {@link Duration#fromISO}
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     * @return {Interval}
     */;
    Interval.fromISO = function fromISO(text, opts) {
      var _split = (text || "").split("/", 2),
        s = _split[0],
        e = _split[1];
      if (s && e) {
        var start, startIsValid;
        try {
          start = DateTime.fromISO(s, opts);
          startIsValid = start.isValid;
        } catch (e) {
          startIsValid = false;
        }
        var end, endIsValid;
        try {
          end = DateTime.fromISO(e, opts);
          endIsValid = end.isValid;
        } catch (e) {
          endIsValid = false;
        }
        if (startIsValid && endIsValid) {
          return Interval.fromDateTimes(start, end);
        }
        if (startIsValid) {
          var dur = Duration.fromISO(e, opts);
          if (dur.isValid) {
            return Interval.after(start, dur);
          }
        } else if (endIsValid) {
          var _dur = Duration.fromISO(s, opts);
          if (_dur.isValid) {
            return Interval.before(end, _dur);
          }
        }
      }
      return Interval.invalid("unparsable", "the input \"" + text + "\" can't be parsed as ISO 8601");
    }

    /**
     * Check if an object is an Interval. Works across context boundaries
     * @param {object} o
     * @return {boolean}
     */;
    Interval.isInterval = function isInterval(o) {
      return o && o.isLuxonInterval || false;
    }

    /**
     * Returns the start of the Interval
     * @type {DateTime}
     */;
    var _proto = Interval.prototype;
    /**
     * Returns the length of the Interval in the specified unit.
     * @param {string} unit - the unit (such as 'hours' or 'days') to return the length in.
     * @return {number}
     */
    _proto.length = function length(unit) {
      if (unit === void 0) {
        unit = "milliseconds";
      }
      return this.isValid ? this.toDuration.apply(this, [unit]).get(unit) : NaN;
    }

    /**
     * Returns the count of minutes, hours, days, months, or years included in the Interval, even in part.
     * Unlike {@link Interval#length} this counts sections of the calendar, not periods of time, e.g. specifying 'day'
     * asks 'what dates are included in this interval?', not 'how many days long is this interval?'
     * @param {string} [unit='milliseconds'] - the unit of time to count.
     * @param {Object} opts - options
     * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week; this operation will always use the locale of the start DateTime
     * @return {number}
     */;
    _proto.count = function count(unit, opts) {
      if (unit === void 0) {
        unit = "milliseconds";
      }
      if (!this.isValid) return NaN;
      var start = this.start.startOf(unit, opts);
      var end;
      if (opts != null && opts.useLocaleWeeks) {
        end = this.end.reconfigure({
          locale: start.locale
        });
      } else {
        end = this.end;
      }
      end = end.startOf(unit, opts);
      return Math.floor(end.diff(start, unit).get(unit)) + (end.valueOf() !== this.end.valueOf());
    }

    /**
     * Returns whether this Interval's start and end are both in the same unit of time
     * @param {string} unit - the unit of time to check sameness on
     * @return {boolean}
     */;
    _proto.hasSame = function hasSame(unit) {
      return this.isValid ? this.isEmpty() || this.e.minus(1).hasSame(this.s, unit) : false;
    }

    /**
     * Return whether this Interval has the same start and end DateTimes.
     * @return {boolean}
     */;
    _proto.isEmpty = function isEmpty() {
      return this.s.valueOf() === this.e.valueOf();
    }

    /**
     * Return whether this Interval's start is after the specified DateTime.
     * @param {DateTime} dateTime
     * @return {boolean}
     */;
    _proto.isAfter = function isAfter(dateTime) {
      if (!this.isValid) return false;
      return this.s > dateTime;
    }

    /**
     * Return whether this Interval's end is before the specified DateTime.
     * @param {DateTime} dateTime
     * @return {boolean}
     */;
    _proto.isBefore = function isBefore(dateTime) {
      if (!this.isValid) return false;
      return this.e <= dateTime;
    }

    /**
     * Return whether this Interval contains the specified DateTime.
     * @param {DateTime} dateTime
     * @return {boolean}
     */;
    _proto.contains = function contains(dateTime) {
      if (!this.isValid) return false;
      return this.s <= dateTime && this.e > dateTime;
    }

    /**
     * "Sets" the start and/or end dates. Returns a newly-constructed Interval.
     * @param {Object} values - the values to set
     * @param {DateTime} values.start - the starting DateTime
     * @param {DateTime} values.end - the ending DateTime
     * @return {Interval}
     */;
    _proto.set = function set(_temp) {
      var _ref = _temp === void 0 ? {} : _temp,
        start = _ref.start,
        end = _ref.end;
      if (!this.isValid) return this;
      return Interval.fromDateTimes(start || this.s, end || this.e);
    }

    /**
     * Split this Interval at each of the specified DateTimes
     * @param {...DateTime} dateTimes - the unit of time to count.
     * @return {Array}
     */;
    _proto.splitAt = function splitAt() {
      var _this = this;
      if (!this.isValid) return [];
      for (var _len = arguments.length, dateTimes = new Array(_len), _key = 0; _key < _len; _key++) {
        dateTimes[_key] = arguments[_key];
      }
      var sorted = dateTimes.map(friendlyDateTime).filter(function (d) {
          return _this.contains(d);
        }).sort(function (a, b) {
          return a.toMillis() - b.toMillis();
        }),
        results = [];
      var s = this.s,
        i = 0;
      while (s < this.e) {
        var added = sorted[i] || this.e,
          next = +added > +this.e ? this.e : added;
        results.push(Interval.fromDateTimes(s, next));
        s = next;
        i += 1;
      }
      return results;
    }

    /**
     * Split this Interval into smaller Intervals, each of the specified length.
     * Left over time is grouped into a smaller interval
     * @param {Duration|Object|number} duration - The length of each resulting interval.
     * @return {Array}
     */;
    _proto.splitBy = function splitBy(duration) {
      var dur = Duration.fromDurationLike(duration);
      if (!this.isValid || !dur.isValid || dur.as("milliseconds") === 0) {
        return [];
      }
      var s = this.s,
        idx = 1,
        next;
      var results = [];
      while (s < this.e) {
        var added = this.start.plus(dur.mapUnits(function (x) {
          return x * idx;
        }));
        next = +added > +this.e ? this.e : added;
        results.push(Interval.fromDateTimes(s, next));
        s = next;
        idx += 1;
      }
      return results;
    }

    /**
     * Split this Interval into the specified number of smaller intervals.
     * @param {number} numberOfParts - The number of Intervals to divide the Interval into.
     * @return {Array}
     */;
    _proto.divideEqually = function divideEqually(numberOfParts) {
      if (!this.isValid) return [];
      return this.splitBy(this.length() / numberOfParts).slice(0, numberOfParts);
    }

    /**
     * Return whether this Interval overlaps with the specified Interval
     * @param {Interval} other
     * @return {boolean}
     */;
    _proto.overlaps = function overlaps(other) {
      return this.e > other.s && this.s < other.e;
    }

    /**
     * Return whether this Interval's end is adjacent to the specified Interval's start.
     * @param {Interval} other
     * @return {boolean}
     */;
    _proto.abutsStart = function abutsStart(other) {
      if (!this.isValid) return false;
      return +this.e === +other.s;
    }

    /**
     * Return whether this Interval's start is adjacent to the specified Interval's end.
     * @param {Interval} other
     * @return {boolean}
     */;
    _proto.abutsEnd = function abutsEnd(other) {
      if (!this.isValid) return false;
      return +other.e === +this.s;
    }

    /**
     * Returns true if this Interval fully contains the specified Interval, specifically if the intersect (of this Interval and the other Interval) is equal to the other Interval; false otherwise.
     * @param {Interval} other
     * @return {boolean}
     */;
    _proto.engulfs = function engulfs(other) {
      if (!this.isValid) return false;
      return this.s <= other.s && this.e >= other.e;
    }

    /**
     * Return whether this Interval has the same start and end as the specified Interval.
     * @param {Interval} other
     * @return {boolean}
     */;
    _proto.equals = function equals(other) {
      if (!this.isValid || !other.isValid) {
        return false;
      }
      return this.s.equals(other.s) && this.e.equals(other.e);
    }

    /**
     * Return an Interval representing the intersection of this Interval and the specified Interval.
     * Specifically, the resulting Interval has the maximum start time and the minimum end time of the two Intervals.
     * Returns null if the intersection is empty, meaning, the intervals don't intersect.
     * @param {Interval} other
     * @return {Interval}
     */;
    _proto.intersection = function intersection(other) {
      if (!this.isValid) return this;
      var s = this.s > other.s ? this.s : other.s,
        e = this.e < other.e ? this.e : other.e;
      if (s >= e) {
        return null;
      } else {
        return Interval.fromDateTimes(s, e);
      }
    }

    /**
     * Return an Interval representing the union of this Interval and the specified Interval.
     * Specifically, the resulting Interval has the minimum start time and the maximum end time of the two Intervals.
     * @param {Interval} other
     * @return {Interval}
     */;
    _proto.union = function union(other) {
      if (!this.isValid) return this;
      var s = this.s < other.s ? this.s : other.s,
        e = this.e > other.e ? this.e : other.e;
      return Interval.fromDateTimes(s, e);
    }

    /**
     * Merge an array of Intervals into an equivalent minimal set of Intervals.
     * Combines overlapping and adjacent Intervals.
     * The resulting array will contain the Intervals in ascending order, that is, starting with the earliest Interval
     * and ending with the latest.
     *
     * @param {Array} intervals
     * @return {Array}
     */;
    Interval.merge = function merge(intervals) {
      var _intervals$sort$reduc = intervals.sort(function (a, b) {
          return a.s - b.s;
        }).reduce(function (_ref2, item) {
          var sofar = _ref2[0],
            current = _ref2[1];
          if (!current) {
            return [sofar, item];
          } else if (current.overlaps(item) || current.abutsStart(item)) {
            return [sofar, current.union(item)];
          } else {
            return [sofar.concat([current]), item];
          }
        }, [[], null]),
        found = _intervals$sort$reduc[0],
        final = _intervals$sort$reduc[1];
      if (final) {
        found.push(final);
      }
      return found;
    }

    /**
     * Return an array of Intervals representing the spans of time that only appear in one of the specified Intervals.
     * @param {Array} intervals
     * @return {Array}
     */;
    Interval.xor = function xor(intervals) {
      var _Array$prototype;
      var start = null,
        currentCount = 0;
      var results = [],
        ends = intervals.map(function (i) {
          return [{
            time: i.s,
            type: "s"
          }, {
            time: i.e,
            type: "e"
          }];
        }),
        flattened = (_Array$prototype = Array.prototype).concat.apply(_Array$prototype, ends),
        arr = flattened.sort(function (a, b) {
          return a.time - b.time;
        });
      for (var _iterator = _createForOfIteratorHelperLoose(arr), _step; !(_step = _iterator()).done;) {
        var i = _step.value;
        currentCount += i.type === "s" ? 1 : -1;
        if (currentCount === 1) {
          start = i.time;
        } else {
          if (start && +start !== +i.time) {
            results.push(Interval.fromDateTimes(start, i.time));
          }
          start = null;
        }
      }
      return Interval.merge(results);
    }

    /**
     * Return an Interval representing the span of time in this Interval that doesn't overlap with any of the specified Intervals.
     * @param {...Interval} intervals
     * @return {Array}
     */;
    _proto.difference = function difference() {
      var _this2 = this;
      for (var _len2 = arguments.length, intervals = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        intervals[_key2] = arguments[_key2];
      }
      return Interval.xor([this].concat(intervals)).map(function (i) {
        return _this2.intersection(i);
      }).filter(function (i) {
        return i && !i.isEmpty();
      });
    }

    /**
     * Returns a string representation of this Interval appropriate for debugging.
     * @return {string}
     */;
    _proto.toString = function toString() {
      if (!this.isValid) return INVALID$1;
      return "[" + this.s.toISO() + " \u2013 " + this.e.toISO() + ")";
    }

    /**
     * Returns a string representation of this Interval appropriate for the REPL.
     * @return {string}
     */;
    _proto[_Symbol$for] = function () {
      if (this.isValid) {
        return "Interval { start: " + this.s.toISO() + ", end: " + this.e.toISO() + " }";
      } else {
        return "Interval { Invalid, reason: " + this.invalidReason + " }";
      }
    }

    /**
     * Returns a localized string representing this Interval. Accepts the same options as the
     * Intl.DateTimeFormat constructor and any presets defined by Luxon, such as
     * {@link DateTime.DATE_FULL} or {@link DateTime.TIME_SIMPLE}. The exact behavior of this method
     * is browser-specific, but in general it will return an appropriate representation of the
     * Interval in the assigned locale. Defaults to the system's locale if no locale has been
     * specified.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param {Object} [formatOpts=DateTime.DATE_SHORT] - Either a DateTime preset or
     * Intl.DateTimeFormat constructor options.
     * @param {Object} opts - Options to override the configuration of the start DateTime.
     * @example Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(); //=> 11/7/2022 – 11/8/2022
     * @example Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(DateTime.DATE_FULL); //=> November 7 – 8, 2022
     * @example Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(DateTime.DATE_FULL, { locale: 'fr-FR' }); //=> 7–8 novembre 2022
     * @example Interval.fromISO('2022-11-07T17:00Z/2022-11-07T19:00Z').toLocaleString(DateTime.TIME_SIMPLE); //=> 6:00 – 8:00 PM
     * @example Interval.fromISO('2022-11-07T17:00Z/2022-11-07T19:00Z').toLocaleString({ weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); //=> Mon, Nov 07, 6:00 – 8:00 p
     * @return {string}
     */;
    _proto.toLocaleString = function toLocaleString(formatOpts, opts) {
      if (formatOpts === void 0) {
        formatOpts = DATE_SHORT;
      }
      if (opts === void 0) {
        opts = {};
      }
      return this.isValid ? Formatter.create(this.s.loc.clone(opts), formatOpts).formatInterval(this) : INVALID$1;
    }

    /**
     * Returns an ISO 8601-compliant string representation of this Interval.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     * @param {Object} opts - The same options as {@link DateTime#toISO}
     * @return {string}
     */;
    _proto.toISO = function toISO(opts) {
      if (!this.isValid) return INVALID$1;
      return this.s.toISO(opts) + "/" + this.e.toISO(opts);
    }

    /**
     * Returns an ISO 8601-compliant string representation of date of this Interval.
     * The time components are ignored.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     * @return {string}
     */;
    _proto.toISODate = function toISODate() {
      if (!this.isValid) return INVALID$1;
      return this.s.toISODate() + "/" + this.e.toISODate();
    }

    /**
     * Returns an ISO 8601-compliant string representation of time of this Interval.
     * The date components are ignored.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     * @param {Object} opts - The same options as {@link DateTime#toISO}
     * @return {string}
     */;
    _proto.toISOTime = function toISOTime(opts) {
      if (!this.isValid) return INVALID$1;
      return this.s.toISOTime(opts) + "/" + this.e.toISOTime(opts);
    }

    /**
     * Returns a string representation of this Interval formatted according to the specified format
     * string. **You may not want this.** See {@link Interval#toLocaleString} for a more flexible
     * formatting tool.
     * @param {string} dateFormat - The format string. This string formats the start and end time.
     * See {@link DateTime#toFormat} for details.
     * @param {Object} opts - Options.
     * @param {string} [opts.separator =  ' – '] - A separator to place between the start and end
     * representations.
     * @return {string}
     */;
    _proto.toFormat = function toFormat(dateFormat, _temp2) {
      var _ref3 = _temp2 === void 0 ? {} : _temp2,
        _ref3$separator = _ref3.separator,
        separator = _ref3$separator === void 0 ? " – " : _ref3$separator;
      if (!this.isValid) return INVALID$1;
      return "" + this.s.toFormat(dateFormat) + separator + this.e.toFormat(dateFormat);
    }

    /**
     * Return a Duration representing the time spanned by this interval.
     * @param {string|string[]} [unit=['milliseconds']] - the unit or units (such as 'hours' or 'days') to include in the duration.
     * @param {Object} opts - options that affect the creation of the Duration
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @example Interval.fromDateTimes(dt1, dt2).toDuration().toObject() //=> { milliseconds: 88489257 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration('days').toObject() //=> { days: 1.0241812152777778 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes']).toObject() //=> { hours: 24, minutes: 34.82095 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes', 'seconds']).toObject() //=> { hours: 24, minutes: 34, seconds: 49.257 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration('seconds').toObject() //=> { seconds: 88489.257 }
     * @return {Duration}
     */;
    _proto.toDuration = function toDuration(unit, opts) {
      if (!this.isValid) {
        return Duration.invalid(this.invalidReason);
      }
      return this.e.diff(this.s, unit, opts);
    }

    /**
     * Run mapFn on the interval start and end, returning a new Interval from the resulting DateTimes
     * @param {function} mapFn
     * @return {Interval}
     * @example Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.toUTC())
     * @example Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.plus({ hours: 2 }))
     */;
    _proto.mapEndpoints = function mapEndpoints(mapFn) {
      return Interval.fromDateTimes(mapFn(this.s), mapFn(this.e));
    };
    _createClass(Interval, [{
      key: "start",
      get: function get() {
        return this.isValid ? this.s : null;
      }

      /**
       * Returns the end of the Interval. This is the first instant which is not part of the interval
       * (Interval is half-open).
       * @type {DateTime}
       */
    }, {
      key: "end",
      get: function get() {
        return this.isValid ? this.e : null;
      }

      /**
       * Returns the last DateTime included in the interval (since end is not part of the interval)
       * @type {DateTime}
       */
    }, {
      key: "lastDateTime",
      get: function get() {
        return this.isValid ? this.e ? this.e.minus(1) : null : null;
      }

      /**
       * Returns whether this Interval's end is at least its start, meaning that the Interval isn't 'backwards'.
       * @type {boolean}
       */
    }, {
      key: "isValid",
      get: function get() {
        return this.invalidReason === null;
      }

      /**
       * Returns an error code if this Interval is invalid, or null if the Interval is valid
       * @type {string}
       */
    }, {
      key: "invalidReason",
      get: function get() {
        return this.invalid ? this.invalid.reason : null;
      }

      /**
       * Returns an explanation of why this Interval became invalid, or null if the Interval is valid
       * @type {string}
       */
    }, {
      key: "invalidExplanation",
      get: function get() {
        return this.invalid ? this.invalid.explanation : null;
      }
    }]);
    return Interval;
  }(Symbol.for("nodejs.util.inspect.custom"));

  /**
   * The Info class contains static methods for retrieving general time and date related data. For example, it has methods for finding out if a time zone has a DST, for listing the months in any supported locale, and for discovering which of Luxon features are available in the current environment.
   */
  var Info = /*#__PURE__*/function () {
    function Info() {}
    /**
     * Return whether the specified zone contains a DST.
     * @param {string|Zone} [zone='local'] - Zone to check. Defaults to the environment's local zone.
     * @return {boolean}
     */
    Info.hasDST = function hasDST(zone) {
      if (zone === void 0) {
        zone = Settings.defaultZone;
      }
      var proto = DateTime.now().setZone(zone).set({
        month: 12
      });
      return !zone.isUniversal && proto.offset !== proto.set({
        month: 6
      }).offset;
    }

    /**
     * Return whether the specified zone is a valid IANA specifier.
     * @param {string} zone - Zone to check
     * @return {boolean}
     */;
    Info.isValidIANAZone = function isValidIANAZone(zone) {
      return IANAZone.isValidZone(zone);
    }

    /**
     * Converts the input into a {@link Zone} instance.
     *
     * * If `input` is already a Zone instance, it is returned unchanged.
     * * If `input` is a string containing a valid time zone name, a Zone instance
     *   with that name is returned.
     * * If `input` is a string that doesn't refer to a known time zone, a Zone
     *   instance with {@link Zone#isValid} == false is returned.
     * * If `input is a number, a Zone instance with the specified fixed offset
     *   in minutes is returned.
     * * If `input` is `null` or `undefined`, the default zone is returned.
     * @param {string|Zone|number} [input] - the value to be converted
     * @return {Zone}
     */;
    Info.normalizeZone = function normalizeZone$1(input) {
      return normalizeZone(input, Settings.defaultZone);
    }

    /**
     * Get the weekday on which the week starts according to the given locale.
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.locObj=null] - an existing locale object to use
     * @returns {number} the start of the week, 1 for Monday through 7 for Sunday
     */;
    Info.getStartOfWeek = function getStartOfWeek(_temp) {
      var _ref = _temp === void 0 ? {} : _temp,
        _ref$locale = _ref.locale,
        locale = _ref$locale === void 0 ? null : _ref$locale,
        _ref$locObj = _ref.locObj,
        locObj = _ref$locObj === void 0 ? null : _ref$locObj;
      return (locObj || Locale.create(locale)).getStartOfWeek();
    }

    /**
     * Get the minimum number of days necessary in a week before it is considered part of the next year according
     * to the given locale.
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.locObj=null] - an existing locale object to use
     * @returns {number}
     */;
    Info.getMinimumDaysInFirstWeek = function getMinimumDaysInFirstWeek(_temp2) {
      var _ref2 = _temp2 === void 0 ? {} : _temp2,
        _ref2$locale = _ref2.locale,
        locale = _ref2$locale === void 0 ? null : _ref2$locale,
        _ref2$locObj = _ref2.locObj,
        locObj = _ref2$locObj === void 0 ? null : _ref2$locObj;
      return (locObj || Locale.create(locale)).getMinDaysInFirstWeek();
    }

    /**
     * Get the weekdays, which are considered the weekend according to the given locale
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.locObj=null] - an existing locale object to use
     * @returns {number[]} an array of weekdays, 1 for Monday through 7 for Sunday
     */;
    Info.getWeekendWeekdays = function getWeekendWeekdays(_temp3) {
      var _ref3 = _temp3 === void 0 ? {} : _temp3,
        _ref3$locale = _ref3.locale,
        locale = _ref3$locale === void 0 ? null : _ref3$locale,
        _ref3$locObj = _ref3.locObj,
        locObj = _ref3$locObj === void 0 ? null : _ref3$locObj;
      // copy the array, because we cache it internally
      return (locObj || Locale.create(locale)).getWeekendDays().slice();
    }

    /**
     * Return an array of standalone month names.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param {string} [length='long'] - the length of the month representation, such as "numeric", "2-digit", "narrow", "short", "long"
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @param {string} [opts.locObj=null] - an existing locale object to use
     * @param {string} [opts.outputCalendar='gregory'] - the calendar
     * @example Info.months()[0] //=> 'January'
     * @example Info.months('short')[0] //=> 'Jan'
     * @example Info.months('numeric')[0] //=> '1'
     * @example Info.months('short', { locale: 'fr-CA' } )[0] //=> 'janv.'
     * @example Info.months('numeric', { locale: 'ar' })[0] //=> '١'
     * @example Info.months('long', { outputCalendar: 'islamic' })[0] //=> 'Rabiʻ I'
     * @return {Array}
     */;
    Info.months = function months(length, _temp4) {
      if (length === void 0) {
        length = "long";
      }
      var _ref4 = _temp4 === void 0 ? {} : _temp4,
        _ref4$locale = _ref4.locale,
        locale = _ref4$locale === void 0 ? null : _ref4$locale,
        _ref4$numberingSystem = _ref4.numberingSystem,
        numberingSystem = _ref4$numberingSystem === void 0 ? null : _ref4$numberingSystem,
        _ref4$locObj = _ref4.locObj,
        locObj = _ref4$locObj === void 0 ? null : _ref4$locObj,
        _ref4$outputCalendar = _ref4.outputCalendar,
        outputCalendar = _ref4$outputCalendar === void 0 ? "gregory" : _ref4$outputCalendar;
      return (locObj || Locale.create(locale, numberingSystem, outputCalendar)).months(length);
    }

    /**
     * Return an array of format month names.
     * Format months differ from standalone months in that they're meant to appear next to the day of the month. In some languages, that
     * changes the string.
     * See {@link Info#months}
     * @param {string} [length='long'] - the length of the month representation, such as "numeric", "2-digit", "narrow", "short", "long"
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @param {string} [opts.locObj=null] - an existing locale object to use
     * @param {string} [opts.outputCalendar='gregory'] - the calendar
     * @return {Array}
     */;
    Info.monthsFormat = function monthsFormat(length, _temp5) {
      if (length === void 0) {
        length = "long";
      }
      var _ref5 = _temp5 === void 0 ? {} : _temp5,
        _ref5$locale = _ref5.locale,
        locale = _ref5$locale === void 0 ? null : _ref5$locale,
        _ref5$numberingSystem = _ref5.numberingSystem,
        numberingSystem = _ref5$numberingSystem === void 0 ? null : _ref5$numberingSystem,
        _ref5$locObj = _ref5.locObj,
        locObj = _ref5$locObj === void 0 ? null : _ref5$locObj,
        _ref5$outputCalendar = _ref5.outputCalendar,
        outputCalendar = _ref5$outputCalendar === void 0 ? "gregory" : _ref5$outputCalendar;
      return (locObj || Locale.create(locale, numberingSystem, outputCalendar)).months(length, true);
    }

    /**
     * Return an array of standalone week names.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param {string} [length='long'] - the length of the weekday representation, such as "narrow", "short", "long".
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @param {string} [opts.locObj=null] - an existing locale object to use
     * @example Info.weekdays()[0] //=> 'Monday'
     * @example Info.weekdays('short')[0] //=> 'Mon'
     * @example Info.weekdays('short', { locale: 'fr-CA' })[0] //=> 'lun.'
     * @example Info.weekdays('short', { locale: 'ar' })[0] //=> 'الاثنين'
     * @return {Array}
     */;
    Info.weekdays = function weekdays(length, _temp6) {
      if (length === void 0) {
        length = "long";
      }
      var _ref6 = _temp6 === void 0 ? {} : _temp6,
        _ref6$locale = _ref6.locale,
        locale = _ref6$locale === void 0 ? null : _ref6$locale,
        _ref6$numberingSystem = _ref6.numberingSystem,
        numberingSystem = _ref6$numberingSystem === void 0 ? null : _ref6$numberingSystem,
        _ref6$locObj = _ref6.locObj,
        locObj = _ref6$locObj === void 0 ? null : _ref6$locObj;
      return (locObj || Locale.create(locale, numberingSystem, null)).weekdays(length);
    }

    /**
     * Return an array of format week names.
     * Format weekdays differ from standalone weekdays in that they're meant to appear next to more date information. In some languages, that
     * changes the string.
     * See {@link Info#weekdays}
     * @param {string} [length='long'] - the length of the month representation, such as "narrow", "short", "long".
     * @param {Object} opts - options
     * @param {string} [opts.locale=null] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @param {string} [opts.locObj=null] - an existing locale object to use
     * @return {Array}
     */;
    Info.weekdaysFormat = function weekdaysFormat(length, _temp7) {
      if (length === void 0) {
        length = "long";
      }
      var _ref7 = _temp7 === void 0 ? {} : _temp7,
        _ref7$locale = _ref7.locale,
        locale = _ref7$locale === void 0 ? null : _ref7$locale,
        _ref7$numberingSystem = _ref7.numberingSystem,
        numberingSystem = _ref7$numberingSystem === void 0 ? null : _ref7$numberingSystem,
        _ref7$locObj = _ref7.locObj,
        locObj = _ref7$locObj === void 0 ? null : _ref7$locObj;
      return (locObj || Locale.create(locale, numberingSystem, null)).weekdays(length, true);
    }

    /**
     * Return an array of meridiems.
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @example Info.meridiems() //=> [ 'AM', 'PM' ]
     * @example Info.meridiems({ locale: 'my' }) //=> [ 'နံနက်', 'ညနေ' ]
     * @return {Array}
     */;
    Info.meridiems = function meridiems(_temp8) {
      var _ref8 = _temp8 === void 0 ? {} : _temp8,
        _ref8$locale = _ref8.locale,
        locale = _ref8$locale === void 0 ? null : _ref8$locale;
      return Locale.create(locale).meridiems();
    }

    /**
     * Return an array of eras, such as ['BC', 'AD']. The locale can be specified, but the calendar system is always Gregorian.
     * @param {string} [length='short'] - the length of the era representation, such as "short" or "long".
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @example Info.eras() //=> [ 'BC', 'AD' ]
     * @example Info.eras('long') //=> [ 'Before Christ', 'Anno Domini' ]
     * @example Info.eras('long', { locale: 'fr' }) //=> [ 'avant Jésus-Christ', 'après Jésus-Christ' ]
     * @return {Array}
     */;
    Info.eras = function eras(length, _temp9) {
      if (length === void 0) {
        length = "short";
      }
      var _ref9 = _temp9 === void 0 ? {} : _temp9,
        _ref9$locale = _ref9.locale,
        locale = _ref9$locale === void 0 ? null : _ref9$locale;
      return Locale.create(locale, null, "gregory").eras(length);
    }

    /**
     * Return the set of available features in this environment.
     * Some features of Luxon are not available in all environments. For example, on older browsers, relative time formatting support is not available. Use this function to figure out if that's the case.
     * Keys:
     * * `relative`: whether this environment supports relative time formatting
     * * `localeWeek`: whether this environment supports different weekdays for the start of the week based on the locale
     * @example Info.features() //=> { relative: false, localeWeek: true }
     * @return {Object}
     */;
    Info.features = function features() {
      return {
        relative: hasRelative(),
        localeWeek: hasLocaleWeekInfo()
      };
    };
    return Info;
  }();

  function dayDiff(earlier, later) {
    var utcDayStart = function utcDayStart(dt) {
        return dt.toUTC(0, {
          keepLocalTime: true
        }).startOf("day").valueOf();
      },
      ms = utcDayStart(later) - utcDayStart(earlier);
    return Math.floor(Duration.fromMillis(ms).as("days"));
  }
  function highOrderDiffs(cursor, later, units) {
    var differs = [["years", function (a, b) {
      return b.year - a.year;
    }], ["quarters", function (a, b) {
      return b.quarter - a.quarter + (b.year - a.year) * 4;
    }], ["months", function (a, b) {
      return b.month - a.month + (b.year - a.year) * 12;
    }], ["weeks", function (a, b) {
      var days = dayDiff(a, b);
      return (days - days % 7) / 7;
    }], ["days", dayDiff]];
    var results = {};
    var earlier = cursor;
    var lowestOrder, highWater;

    /* This loop tries to diff using larger units first.
       If we overshoot, we backtrack and try the next smaller unit.
       "cursor" starts out at the earlier timestamp and moves closer and closer to "later"
       as we use smaller and smaller units.
       highWater keeps track of where we would be if we added one more of the smallest unit,
       this is used later to potentially convert any difference smaller than the smallest higher order unit
       into a fraction of that smallest higher order unit
    */
    for (var _i = 0, _differs = differs; _i < _differs.length; _i++) {
      var _differs$_i = _differs[_i],
        unit = _differs$_i[0],
        differ = _differs$_i[1];
      if (units.indexOf(unit) >= 0) {
        lowestOrder = unit;
        results[unit] = differ(cursor, later);
        highWater = earlier.plus(results);
        if (highWater > later) {
          // we overshot the end point, backtrack cursor by 1
          results[unit]--;
          cursor = earlier.plus(results);

          // if we are still overshooting now, we need to backtrack again
          // this happens in certain situations when diffing times in different zones,
          // because this calculation ignores time zones
          if (cursor > later) {
            // keep the "overshot by 1" around as highWater
            highWater = cursor;
            // backtrack cursor by 1
            results[unit]--;
            cursor = earlier.plus(results);
          }
        } else {
          cursor = highWater;
        }
      }
    }
    return [cursor, results, highWater, lowestOrder];
  }
  function _diff (earlier, later, units, opts) {
    var _highOrderDiffs = highOrderDiffs(earlier, later, units),
      cursor = _highOrderDiffs[0],
      results = _highOrderDiffs[1],
      highWater = _highOrderDiffs[2],
      lowestOrder = _highOrderDiffs[3];
    var remainingMillis = later - cursor;
    var lowerOrderUnits = units.filter(function (u) {
      return ["hours", "minutes", "seconds", "milliseconds"].indexOf(u) >= 0;
    });
    if (lowerOrderUnits.length === 0) {
      if (highWater < later) {
        var _cursor$plus;
        highWater = cursor.plus((_cursor$plus = {}, _cursor$plus[lowestOrder] = 1, _cursor$plus));
      }
      if (highWater !== cursor) {
        results[lowestOrder] = (results[lowestOrder] || 0) + remainingMillis / (highWater - cursor);
      }
    }
    var duration = Duration.fromObject(results, opts);
    if (lowerOrderUnits.length > 0) {
      var _Duration$fromMillis;
      return (_Duration$fromMillis = Duration.fromMillis(remainingMillis, opts)).shiftTo.apply(_Duration$fromMillis, lowerOrderUnits).plus(duration);
    } else {
      return duration;
    }
  }

  var MISSING_FTP = "missing Intl.DateTimeFormat.formatToParts support";
  function intUnit(regex, post) {
    if (post === void 0) {
      post = function post(i) {
        return i;
      };
    }
    return {
      regex: regex,
      deser: function deser(_ref) {
        var s = _ref[0];
        return post(parseDigits(s));
      }
    };
  }
  var NBSP = String.fromCharCode(160);
  var spaceOrNBSP = "[ " + NBSP + "]";
  var spaceOrNBSPRegExp = new RegExp(spaceOrNBSP, "g");
  function fixListRegex(s) {
    // make dots optional and also make them literal
    // make space and non breakable space characters interchangeable
    return s.replace(/\./g, "\\.?").replace(spaceOrNBSPRegExp, spaceOrNBSP);
  }
  function stripInsensitivities(s) {
    return s.replace(/\./g, "") // ignore dots that were made optional
    .replace(spaceOrNBSPRegExp, " ") // interchange space and nbsp
    .toLowerCase();
  }
  function oneOf(strings, startIndex) {
    if (strings === null) {
      return null;
    } else {
      return {
        regex: RegExp(strings.map(fixListRegex).join("|")),
        deser: function deser(_ref2) {
          var s = _ref2[0];
          return strings.findIndex(function (i) {
            return stripInsensitivities(s) === stripInsensitivities(i);
          }) + startIndex;
        }
      };
    }
  }
  function offset(regex, groups) {
    return {
      regex: regex,
      deser: function deser(_ref3) {
        var h = _ref3[1],
          m = _ref3[2];
        return signedOffset(h, m);
      },
      groups: groups
    };
  }
  function simple(regex) {
    return {
      regex: regex,
      deser: function deser(_ref4) {
        var s = _ref4[0];
        return s;
      }
    };
  }
  function escapeToken(value) {
    return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  /**
   * @param token
   * @param {Locale} loc
   */
  function unitForToken(token, loc) {
    var one = digitRegex(loc),
      two = digitRegex(loc, "{2}"),
      three = digitRegex(loc, "{3}"),
      four = digitRegex(loc, "{4}"),
      six = digitRegex(loc, "{6}"),
      oneOrTwo = digitRegex(loc, "{1,2}"),
      oneToThree = digitRegex(loc, "{1,3}"),
      oneToSix = digitRegex(loc, "{1,6}"),
      oneToNine = digitRegex(loc, "{1,9}"),
      twoToFour = digitRegex(loc, "{2,4}"),
      fourToSix = digitRegex(loc, "{4,6}"),
      literal = function literal(t) {
        return {
          regex: RegExp(escapeToken(t.val)),
          deser: function deser(_ref5) {
            var s = _ref5[0];
            return s;
          },
          literal: true
        };
      },
      unitate = function unitate(t) {
        if (token.literal) {
          return literal(t);
        }
        switch (t.val) {
          // era
          case "G":
            return oneOf(loc.eras("short"), 0);
          case "GG":
            return oneOf(loc.eras("long"), 0);
          // years
          case "y":
            return intUnit(oneToSix);
          case "yy":
            return intUnit(twoToFour, untruncateYear);
          case "yyyy":
            return intUnit(four);
          case "yyyyy":
            return intUnit(fourToSix);
          case "yyyyyy":
            return intUnit(six);
          // months
          case "M":
            return intUnit(oneOrTwo);
          case "MM":
            return intUnit(two);
          case "MMM":
            return oneOf(loc.months("short", true), 1);
          case "MMMM":
            return oneOf(loc.months("long", true), 1);
          case "L":
            return intUnit(oneOrTwo);
          case "LL":
            return intUnit(two);
          case "LLL":
            return oneOf(loc.months("short", false), 1);
          case "LLLL":
            return oneOf(loc.months("long", false), 1);
          // dates
          case "d":
            return intUnit(oneOrTwo);
          case "dd":
            return intUnit(two);
          // ordinals
          case "o":
            return intUnit(oneToThree);
          case "ooo":
            return intUnit(three);
          // time
          case "HH":
            return intUnit(two);
          case "H":
            return intUnit(oneOrTwo);
          case "hh":
            return intUnit(two);
          case "h":
            return intUnit(oneOrTwo);
          case "mm":
            return intUnit(two);
          case "m":
            return intUnit(oneOrTwo);
          case "q":
            return intUnit(oneOrTwo);
          case "qq":
            return intUnit(two);
          case "s":
            return intUnit(oneOrTwo);
          case "ss":
            return intUnit(two);
          case "S":
            return intUnit(oneToThree);
          case "SSS":
            return intUnit(three);
          case "u":
            return simple(oneToNine);
          case "uu":
            return simple(oneOrTwo);
          case "uuu":
            return intUnit(one);
          // meridiem
          case "a":
            return oneOf(loc.meridiems(), 0);
          // weekYear (k)
          case "kkkk":
            return intUnit(four);
          case "kk":
            return intUnit(twoToFour, untruncateYear);
          // weekNumber (W)
          case "W":
            return intUnit(oneOrTwo);
          case "WW":
            return intUnit(two);
          // weekdays
          case "E":
          case "c":
            return intUnit(one);
          case "EEE":
            return oneOf(loc.weekdays("short", false), 1);
          case "EEEE":
            return oneOf(loc.weekdays("long", false), 1);
          case "ccc":
            return oneOf(loc.weekdays("short", true), 1);
          case "cccc":
            return oneOf(loc.weekdays("long", true), 1);
          // offset/zone
          case "Z":
          case "ZZ":
            return offset(new RegExp("([+-]" + oneOrTwo.source + ")(?::(" + two.source + "))?"), 2);
          case "ZZZ":
            return offset(new RegExp("([+-]" + oneOrTwo.source + ")(" + two.source + ")?"), 2);
          // we don't support ZZZZ (PST) or ZZZZZ (Pacific Standard Time) in parsing
          // because we don't have any way to figure out what they are
          case "z":
            return simple(/[a-z_+-/]{1,256}?/i);
          // this special-case "token" represents a place where a macro-token expanded into a white-space literal
          // in this case we accept any non-newline white-space
          case " ":
            return simple(/[^\S\n\r]/);
          default:
            return literal(t);
        }
      };
    var unit = unitate(token) || {
      invalidReason: MISSING_FTP
    };
    unit.token = token;
    return unit;
  }
  var partTypeStyleToTokenVal = {
    year: {
      "2-digit": "yy",
      numeric: "yyyyy"
    },
    month: {
      numeric: "M",
      "2-digit": "MM",
      short: "MMM",
      long: "MMMM"
    },
    day: {
      numeric: "d",
      "2-digit": "dd"
    },
    weekday: {
      short: "EEE",
      long: "EEEE"
    },
    dayperiod: "a",
    dayPeriod: "a",
    hour12: {
      numeric: "h",
      "2-digit": "hh"
    },
    hour24: {
      numeric: "H",
      "2-digit": "HH"
    },
    minute: {
      numeric: "m",
      "2-digit": "mm"
    },
    second: {
      numeric: "s",
      "2-digit": "ss"
    },
    timeZoneName: {
      long: "ZZZZZ",
      short: "ZZZ"
    }
  };
  function tokenForPart(part, formatOpts, resolvedOpts) {
    var type = part.type,
      value = part.value;
    if (type === "literal") {
      var isSpace = /^\s+$/.test(value);
      return {
        literal: !isSpace,
        val: isSpace ? " " : value
      };
    }
    var style = formatOpts[type];

    // The user might have explicitly specified hour12 or hourCycle
    // if so, respect their decision
    // if not, refer back to the resolvedOpts, which are based on the locale
    var actualType = type;
    if (type === "hour") {
      if (formatOpts.hour12 != null) {
        actualType = formatOpts.hour12 ? "hour12" : "hour24";
      } else if (formatOpts.hourCycle != null) {
        if (formatOpts.hourCycle === "h11" || formatOpts.hourCycle === "h12") {
          actualType = "hour12";
        } else {
          actualType = "hour24";
        }
      } else {
        // tokens only differentiate between 24 hours or not,
        // so we do not need to check hourCycle here, which is less supported anyways
        actualType = resolvedOpts.hour12 ? "hour12" : "hour24";
      }
    }
    var val = partTypeStyleToTokenVal[actualType];
    if (typeof val === "object") {
      val = val[style];
    }
    if (val) {
      return {
        literal: false,
        val: val
      };
    }
    return undefined;
  }
  function buildRegex(units) {
    var re = units.map(function (u) {
      return u.regex;
    }).reduce(function (f, r) {
      return f + "(" + r.source + ")";
    }, "");
    return ["^" + re + "$", units];
  }
  function match(input, regex, handlers) {
    var matches = input.match(regex);
    if (matches) {
      var all = {};
      var matchIndex = 1;
      for (var i in handlers) {
        if (hasOwnProperty(handlers, i)) {
          var h = handlers[i],
            groups = h.groups ? h.groups + 1 : 1;
          if (!h.literal && h.token) {
            all[h.token.val[0]] = h.deser(matches.slice(matchIndex, matchIndex + groups));
          }
          matchIndex += groups;
        }
      }
      return [matches, all];
    } else {
      return [matches, {}];
    }
  }
  function dateTimeFromMatches(matches) {
    var toField = function toField(token) {
      switch (token) {
        case "S":
          return "millisecond";
        case "s":
          return "second";
        case "m":
          return "minute";
        case "h":
        case "H":
          return "hour";
        case "d":
          return "day";
        case "o":
          return "ordinal";
        case "L":
        case "M":
          return "month";
        case "y":
          return "year";
        case "E":
        case "c":
          return "weekday";
        case "W":
          return "weekNumber";
        case "k":
          return "weekYear";
        case "q":
          return "quarter";
        default:
          return null;
      }
    };
    var zone = null;
    var specificOffset;
    if (!isUndefined(matches.z)) {
      zone = IANAZone.create(matches.z);
    }
    if (!isUndefined(matches.Z)) {
      if (!zone) {
        zone = new FixedOffsetZone(matches.Z);
      }
      specificOffset = matches.Z;
    }
    if (!isUndefined(matches.q)) {
      matches.M = (matches.q - 1) * 3 + 1;
    }
    if (!isUndefined(matches.h)) {
      if (matches.h < 12 && matches.a === 1) {
        matches.h += 12;
      } else if (matches.h === 12 && matches.a === 0) {
        matches.h = 0;
      }
    }
    if (matches.G === 0 && matches.y) {
      matches.y = -matches.y;
    }
    if (!isUndefined(matches.u)) {
      matches.S = parseMillis(matches.u);
    }
    var vals = Object.keys(matches).reduce(function (r, k) {
      var f = toField(k);
      if (f) {
        r[f] = matches[k];
      }
      return r;
    }, {});
    return [vals, zone, specificOffset];
  }
  var dummyDateTimeCache = null;
  function getDummyDateTime() {
    if (!dummyDateTimeCache) {
      dummyDateTimeCache = DateTime.fromMillis(1555555555555);
    }
    return dummyDateTimeCache;
  }
  function maybeExpandMacroToken(token, locale) {
    if (token.literal) {
      return token;
    }
    var formatOpts = Formatter.macroTokenToFormatOpts(token.val);
    var tokens = formatOptsToTokens(formatOpts, locale);
    if (tokens == null || tokens.includes(undefined)) {
      return token;
    }
    return tokens;
  }
  function expandMacroTokens(tokens, locale) {
    var _Array$prototype;
    return (_Array$prototype = Array.prototype).concat.apply(_Array$prototype, tokens.map(function (t) {
      return maybeExpandMacroToken(t, locale);
    }));
  }

  /**
   * @private
   */

  var TokenParser = /*#__PURE__*/function () {
    function TokenParser(locale, format) {
      this.locale = locale;
      this.format = format;
      this.tokens = expandMacroTokens(Formatter.parseFormat(format), locale);
      this.units = this.tokens.map(function (t) {
        return unitForToken(t, locale);
      });
      this.disqualifyingUnit = this.units.find(function (t) {
        return t.invalidReason;
      });
      if (!this.disqualifyingUnit) {
        var _buildRegex = buildRegex(this.units),
          regexString = _buildRegex[0],
          handlers = _buildRegex[1];
        this.regex = RegExp(regexString, "i");
        this.handlers = handlers;
      }
    }
    var _proto = TokenParser.prototype;
    _proto.explainFromTokens = function explainFromTokens(input) {
      if (!this.isValid) {
        return {
          input: input,
          tokens: this.tokens,
          invalidReason: this.invalidReason
        };
      } else {
        var _match = match(input, this.regex, this.handlers),
          rawMatches = _match[0],
          matches = _match[1],
          _ref6 = matches ? dateTimeFromMatches(matches) : [null, null, undefined],
          result = _ref6[0],
          zone = _ref6[1],
          specificOffset = _ref6[2];
        if (hasOwnProperty(matches, "a") && hasOwnProperty(matches, "H")) {
          throw new ConflictingSpecificationError("Can't include meridiem when specifying 24-hour format");
        }
        return {
          input: input,
          tokens: this.tokens,
          regex: this.regex,
          rawMatches: rawMatches,
          matches: matches,
          result: result,
          zone: zone,
          specificOffset: specificOffset
        };
      }
    };
    _createClass(TokenParser, [{
      key: "isValid",
      get: function get() {
        return !this.disqualifyingUnit;
      }
    }, {
      key: "invalidReason",
      get: function get() {
        return this.disqualifyingUnit ? this.disqualifyingUnit.invalidReason : null;
      }
    }]);
    return TokenParser;
  }();
  function explainFromTokens(locale, input, format) {
    var parser = new TokenParser(locale, format);
    return parser.explainFromTokens(input);
  }
  function parseFromTokens(locale, input, format) {
    var _explainFromTokens = explainFromTokens(locale, input, format),
      result = _explainFromTokens.result,
      zone = _explainFromTokens.zone,
      specificOffset = _explainFromTokens.specificOffset,
      invalidReason = _explainFromTokens.invalidReason;
    return [result, zone, specificOffset, invalidReason];
  }
  function formatOptsToTokens(formatOpts, locale) {
    if (!formatOpts) {
      return null;
    }
    var formatter = Formatter.create(locale, formatOpts);
    var df = formatter.dtFormatter(getDummyDateTime());
    var parts = df.formatToParts();
    var resolvedOpts = df.resolvedOptions();
    return parts.map(function (p) {
      return tokenForPart(p, formatOpts, resolvedOpts);
    });
  }

  var INVALID = "Invalid DateTime";
  var MAX_DATE = 8.64e15;
  function unsupportedZone(zone) {
    return new Invalid("unsupported zone", "the zone \"" + zone.name + "\" is not supported");
  }

  // we cache week data on the DT object and this intermediates the cache
  /**
   * @param {DateTime} dt
   */
  function possiblyCachedWeekData(dt) {
    if (dt.weekData === null) {
      dt.weekData = gregorianToWeek(dt.c);
    }
    return dt.weekData;
  }

  /**
   * @param {DateTime} dt
   */
  function possiblyCachedLocalWeekData(dt) {
    if (dt.localWeekData === null) {
      dt.localWeekData = gregorianToWeek(dt.c, dt.loc.getMinDaysInFirstWeek(), dt.loc.getStartOfWeek());
    }
    return dt.localWeekData;
  }

  // clone really means, "make a new object with these modifications". all "setters" really use this
  // to create a new object while only changing some of the properties
  function clone(inst, alts) {
    var current = {
      ts: inst.ts,
      zone: inst.zone,
      c: inst.c,
      o: inst.o,
      loc: inst.loc,
      invalid: inst.invalid
    };
    return new DateTime(_extends({}, current, alts, {
      old: current
    }));
  }

  // find the right offset a given local time. The o input is our guess, which determines which
  // offset we'll pick in ambiguous cases (e.g. there are two 3 AMs b/c Fallback DST)
  function fixOffset(localTS, o, tz) {
    // Our UTC time is just a guess because our offset is just a guess
    var utcGuess = localTS - o * 60 * 1000;

    // Test whether the zone matches the offset for this ts
    var o2 = tz.offset(utcGuess);

    // If so, offset didn't change and we're done
    if (o === o2) {
      return [utcGuess, o];
    }

    // If not, change the ts by the difference in the offset
    utcGuess -= (o2 - o) * 60 * 1000;

    // If that gives us the local time we want, we're done
    var o3 = tz.offset(utcGuess);
    if (o2 === o3) {
      return [utcGuess, o2];
    }

    // If it's different, we're in a hole time. The offset has changed, but the we don't adjust the time
    return [localTS - Math.min(o2, o3) * 60 * 1000, Math.max(o2, o3)];
  }

  // convert an epoch timestamp into a calendar object with the given offset
  function tsToObj(ts, offset) {
    ts += offset * 60 * 1000;
    var d = new Date(ts);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      millisecond: d.getUTCMilliseconds()
    };
  }

  // convert a calendar object to a epoch timestamp
  function objToTS(obj, offset, zone) {
    return fixOffset(objToLocalTS(obj), offset, zone);
  }

  // create a new DT instance by adding a duration, adjusting for DSTs
  function adjustTime(inst, dur) {
    var oPre = inst.o,
      year = inst.c.year + Math.trunc(dur.years),
      month = inst.c.month + Math.trunc(dur.months) + Math.trunc(dur.quarters) * 3,
      c = _extends({}, inst.c, {
        year: year,
        month: month,
        day: Math.min(inst.c.day, daysInMonth(year, month)) + Math.trunc(dur.days) + Math.trunc(dur.weeks) * 7
      }),
      millisToAdd = Duration.fromObject({
        years: dur.years - Math.trunc(dur.years),
        quarters: dur.quarters - Math.trunc(dur.quarters),
        months: dur.months - Math.trunc(dur.months),
        weeks: dur.weeks - Math.trunc(dur.weeks),
        days: dur.days - Math.trunc(dur.days),
        hours: dur.hours,
        minutes: dur.minutes,
        seconds: dur.seconds,
        milliseconds: dur.milliseconds
      }).as("milliseconds"),
      localTS = objToLocalTS(c);
    var _fixOffset = fixOffset(localTS, oPre, inst.zone),
      ts = _fixOffset[0],
      o = _fixOffset[1];
    if (millisToAdd !== 0) {
      ts += millisToAdd;
      // that could have changed the offset by going over a DST, but we want to keep the ts the same
      o = inst.zone.offset(ts);
    }
    return {
      ts: ts,
      o: o
    };
  }

  // helper useful in turning the results of parsing into real dates
  // by handling the zone options
  function parseDataToDateTime(parsed, parsedZone, opts, format, text, specificOffset) {
    var setZone = opts.setZone,
      zone = opts.zone;
    if (parsed && Object.keys(parsed).length !== 0 || parsedZone) {
      var interpretationZone = parsedZone || zone,
        inst = DateTime.fromObject(parsed, _extends({}, opts, {
          zone: interpretationZone,
          specificOffset: specificOffset
        }));
      return setZone ? inst : inst.setZone(zone);
    } else {
      return DateTime.invalid(new Invalid("unparsable", "the input \"" + text + "\" can't be parsed as " + format));
    }
  }

  // if you want to output a technical format (e.g. RFC 2822), this helper
  // helps handle the details
  function toTechFormat(dt, format, allowZ) {
    if (allowZ === void 0) {
      allowZ = true;
    }
    return dt.isValid ? Formatter.create(Locale.create("en-US"), {
      allowZ: allowZ,
      forceSimple: true
    }).formatDateTimeFromString(dt, format) : null;
  }
  function _toISODate(o, extended, precision) {
    var longFormat = o.c.year > 9999 || o.c.year < 0;
    var c = "";
    if (longFormat && o.c.year >= 0) c += "+";
    c += padStart(o.c.year, longFormat ? 6 : 4);
    if (precision === "year") return c;
    if (extended) {
      c += "-";
      c += padStart(o.c.month);
      if (precision === "month") return c;
      c += "-";
    } else {
      c += padStart(o.c.month);
      if (precision === "month") return c;
    }
    c += padStart(o.c.day);
    return c;
  }
  function _toISOTime(o, extended, suppressSeconds, suppressMilliseconds, includeOffset, extendedZone, precision) {
    var showSeconds = !suppressSeconds || o.c.millisecond !== 0 || o.c.second !== 0,
      c = "";
    switch (precision) {
      case "day":
      case "month":
      case "year":
        break;
      default:
        c += padStart(o.c.hour);
        if (precision === "hour") break;
        if (extended) {
          c += ":";
          c += padStart(o.c.minute);
          if (precision === "minute") break;
          if (showSeconds) {
            c += ":";
            c += padStart(o.c.second);
          }
        } else {
          c += padStart(o.c.minute);
          if (precision === "minute") break;
          if (showSeconds) {
            c += padStart(o.c.second);
          }
        }
        if (precision === "second") break;
        if (showSeconds && (!suppressMilliseconds || o.c.millisecond !== 0)) {
          c += ".";
          c += padStart(o.c.millisecond, 3);
        }
    }
    if (includeOffset) {
      if (o.isOffsetFixed && o.offset === 0 && !extendedZone) {
        c += "Z";
      } else if (o.o < 0) {
        c += "-";
        c += padStart(Math.trunc(-o.o / 60));
        c += ":";
        c += padStart(Math.trunc(-o.o % 60));
      } else {
        c += "+";
        c += padStart(Math.trunc(o.o / 60));
        c += ":";
        c += padStart(Math.trunc(o.o % 60));
      }
    }
    if (extendedZone) {
      c += "[" + o.zone.ianaName + "]";
    }
    return c;
  }

  // defaults for unspecified units in the supported calendars
  var defaultUnitValues = {
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    },
    defaultWeekUnitValues = {
      weekNumber: 1,
      weekday: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    },
    defaultOrdinalUnitValues = {
      ordinal: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    };

  // Units in the supported calendars, sorted by bigness
  var orderedUnits = ["year", "month", "day", "hour", "minute", "second", "millisecond"],
    orderedWeekUnits = ["weekYear", "weekNumber", "weekday", "hour", "minute", "second", "millisecond"],
    orderedOrdinalUnits = ["year", "ordinal", "hour", "minute", "second", "millisecond"];

  // standardize case and plurality in units
  function normalizeUnit(unit) {
    var normalized = {
      year: "year",
      years: "year",
      month: "month",
      months: "month",
      day: "day",
      days: "day",
      hour: "hour",
      hours: "hour",
      minute: "minute",
      minutes: "minute",
      quarter: "quarter",
      quarters: "quarter",
      second: "second",
      seconds: "second",
      millisecond: "millisecond",
      milliseconds: "millisecond",
      weekday: "weekday",
      weekdays: "weekday",
      weeknumber: "weekNumber",
      weeksnumber: "weekNumber",
      weeknumbers: "weekNumber",
      weekyear: "weekYear",
      weekyears: "weekYear",
      ordinal: "ordinal"
    }[unit.toLowerCase()];
    if (!normalized) throw new InvalidUnitError(unit);
    return normalized;
  }
  function normalizeUnitWithLocalWeeks(unit) {
    switch (unit.toLowerCase()) {
      case "localweekday":
      case "localweekdays":
        return "localWeekday";
      case "localweeknumber":
      case "localweeknumbers":
        return "localWeekNumber";
      case "localweekyear":
      case "localweekyears":
        return "localWeekYear";
      default:
        return normalizeUnit(unit);
    }
  }

  // cache offsets for zones based on the current timestamp when this function is
  // first called. When we are handling a datetime from components like (year,
  // month, day, hour) in a time zone, we need a guess about what the timezone
  // offset is so that we can convert into a UTC timestamp. One way is to find the
  // offset of now in the zone. The actual date may have a different offset (for
  // example, if we handle a date in June while we're in December in a zone that
  // observes DST), but we can check and adjust that.
  //
  // When handling many dates, calculating the offset for now every time is
  // expensive. It's just a guess, so we can cache the offset to use even if we
  // are right on a time change boundary (we'll just correct in the other
  // direction). Using a timestamp from first read is a slight optimization for
  // handling dates close to the current date, since those dates will usually be
  // in the same offset (we could set the timestamp statically, instead). We use a
  // single timestamp for all zones to make things a bit more predictable.
  //
  // This is safe for quickDT (used by local() and utc()) because we don't fill in
  // higher-order units from tsNow (as we do in fromObject, this requires that
  // offset is calculated from tsNow).
  /**
   * @param {Zone} zone
   * @return {number}
   */
  function guessOffsetForZone(zone) {
    if (zoneOffsetTs === undefined) {
      zoneOffsetTs = Settings.now();
    }

    // Do not cache anything but IANA zones, because it is not safe to do so.
    // Guessing an offset which is not present in the zone can cause wrong results from fixOffset
    if (zone.type !== "iana") {
      return zone.offset(zoneOffsetTs);
    }
    var zoneName = zone.name;
    var offsetGuess = zoneOffsetGuessCache.get(zoneName);
    if (offsetGuess === undefined) {
      offsetGuess = zone.offset(zoneOffsetTs);
      zoneOffsetGuessCache.set(zoneName, offsetGuess);
    }
    return offsetGuess;
  }

  // this is a dumbed down version of fromObject() that runs about 60% faster
  // but doesn't do any validation, makes a bunch of assumptions about what units
  // are present, and so on.
  function quickDT(obj, opts) {
    var zone = normalizeZone(opts.zone, Settings.defaultZone);
    if (!zone.isValid) {
      return DateTime.invalid(unsupportedZone(zone));
    }
    var loc = Locale.fromObject(opts);
    var ts, o;

    // assume we have the higher-order units
    if (!isUndefined(obj.year)) {
      for (var _i = 0, _orderedUnits = orderedUnits; _i < _orderedUnits.length; _i++) {
        var u = _orderedUnits[_i];
        if (isUndefined(obj[u])) {
          obj[u] = defaultUnitValues[u];
        }
      }
      var invalid = hasInvalidGregorianData(obj) || hasInvalidTimeData(obj);
      if (invalid) {
        return DateTime.invalid(invalid);
      }
      var offsetProvis = guessOffsetForZone(zone);
      var _objToTS = objToTS(obj, offsetProvis, zone);
      ts = _objToTS[0];
      o = _objToTS[1];
    } else {
      ts = Settings.now();
    }
    return new DateTime({
      ts: ts,
      zone: zone,
      loc: loc,
      o: o
    });
  }
  function diffRelative(start, end, opts) {
    var round = isUndefined(opts.round) ? true : opts.round,
      rounding = isUndefined(opts.rounding) ? "trunc" : opts.rounding,
      format = function format(c, unit) {
        c = roundTo(c, round || opts.calendary ? 0 : 2, opts.calendary ? "round" : rounding);
        var formatter = end.loc.clone(opts).relFormatter(opts);
        return formatter.format(c, unit);
      },
      differ = function differ(unit) {
        if (opts.calendary) {
          if (!end.hasSame(start, unit)) {
            return end.startOf(unit).diff(start.startOf(unit), unit).get(unit);
          } else return 0;
        } else {
          return end.diff(start, unit).get(unit);
        }
      };
    if (opts.unit) {
      return format(differ(opts.unit), opts.unit);
    }
    for (var _iterator = _createForOfIteratorHelperLoose(opts.units), _step; !(_step = _iterator()).done;) {
      var unit = _step.value;
      var count = differ(unit);
      if (Math.abs(count) >= 1) {
        return format(count, unit);
      }
    }
    return format(start > end ? -0 : 0, opts.units[opts.units.length - 1]);
  }
  function lastOpts(argList) {
    var opts = {},
      args;
    if (argList.length > 0 && typeof argList[argList.length - 1] === "object") {
      opts = argList[argList.length - 1];
      args = Array.from(argList).slice(0, argList.length - 1);
    } else {
      args = Array.from(argList);
    }
    return [opts, args];
  }

  /**
   * Timestamp to use for cached zone offset guesses (exposed for test)
   */
  var zoneOffsetTs;
  /**
   * Cache for zone offset guesses (exposed for test).
   *
   * This optimizes quickDT via guessOffsetForZone to avoid repeated calls of
   * zone.offset().
   */
  var zoneOffsetGuessCache = new Map();

  /**
   * A DateTime is an immutable data structure representing a specific date and time and accompanying methods. It contains class and instance methods for creating, parsing, interrogating, transforming, and formatting them.
   *
   * A DateTime comprises of:
   * * A timestamp. Each DateTime instance refers to a specific millisecond of the Unix epoch.
   * * A time zone. Each instance is considered in the context of a specific zone (by default the local system's zone).
   * * Configuration properties that effect how output strings are formatted, such as `locale`, `numberingSystem`, and `outputCalendar`.
   *
   * Here is a brief overview of the most commonly used functionality it provides:
   *
   * * **Creation**: To create a DateTime from its components, use one of its factory class methods: {@link DateTime.local}, {@link DateTime.utc}, and (most flexibly) {@link DateTime.fromObject}. To create one from a standard string format, use {@link DateTime.fromISO}, {@link DateTime.fromHTTP}, and {@link DateTime.fromRFC2822}. To create one from a custom string format, use {@link DateTime.fromFormat}. To create one from a native JS date, use {@link DateTime.fromJSDate}.
   * * **Gregorian calendar and time**: To examine the Gregorian properties of a DateTime individually (i.e as opposed to collectively through {@link DateTime#toObject}), use the {@link DateTime#year}, {@link DateTime#month},
   * {@link DateTime#day}, {@link DateTime#hour}, {@link DateTime#minute}, {@link DateTime#second}, {@link DateTime#millisecond} accessors.
   * * **Week calendar**: For ISO week calendar attributes, see the {@link DateTime#weekYear}, {@link DateTime#weekNumber}, and {@link DateTime#weekday} accessors.
   * * **Configuration** See the {@link DateTime#locale} and {@link DateTime#numberingSystem} accessors.
   * * **Transformation**: To transform the DateTime into other DateTimes, use {@link DateTime#set}, {@link DateTime#reconfigure}, {@link DateTime#setZone}, {@link DateTime#setLocale}, {@link DateTime.plus}, {@link DateTime#minus}, {@link DateTime#endOf}, {@link DateTime#startOf}, {@link DateTime#toUTC}, and {@link DateTime#toLocal}.
   * * **Output**: To convert the DateTime to other representations, use the {@link DateTime#toRelative}, {@link DateTime#toRelativeCalendar}, {@link DateTime#toJSON}, {@link DateTime#toISO}, {@link DateTime#toHTTP}, {@link DateTime#toObject}, {@link DateTime#toRFC2822}, {@link DateTime#toString}, {@link DateTime#toLocaleString}, {@link DateTime#toFormat}, {@link DateTime#toMillis} and {@link DateTime#toJSDate}.
   *
   * There's plenty others documented below. In addition, for more information on subtler topics like internationalization, time zones, alternative calendars, validity, and so on, see the external documentation.
   */
  var DateTime = /*#__PURE__*/function (_Symbol$for) {
    /**
     * @access private
     */
    function DateTime(config) {
      var zone = config.zone || Settings.defaultZone;
      var invalid = config.invalid || (Number.isNaN(config.ts) ? new Invalid("invalid input") : null) || (!zone.isValid ? unsupportedZone(zone) : null);
      /**
       * @access private
       */
      this.ts = isUndefined(config.ts) ? Settings.now() : config.ts;
      var c = null,
        o = null;
      if (!invalid) {
        var unchanged = config.old && config.old.ts === this.ts && config.old.zone.equals(zone);
        if (unchanged) {
          var _ref = [config.old.c, config.old.o];
          c = _ref[0];
          o = _ref[1];
        } else {
          // If an offset has been passed and we have not been called from
          // clone(), we can trust it and avoid the offset calculation.
          var ot = isNumber(config.o) && !config.old ? config.o : zone.offset(this.ts);
          c = tsToObj(this.ts, ot);
          invalid = Number.isNaN(c.year) ? new Invalid("invalid input") : null;
          c = invalid ? null : c;
          o = invalid ? null : ot;
        }
      }

      /**
       * @access private
       */
      this._zone = zone;
      /**
       * @access private
       */
      this.loc = config.loc || Locale.create();
      /**
       * @access private
       */
      this.invalid = invalid;
      /**
       * @access private
       */
      this.weekData = null;
      /**
       * @access private
       */
      this.localWeekData = null;
      /**
       * @access private
       */
      this.c = c;
      /**
       * @access private
       */
      this.o = o;
      /**
       * @access private
       */
      this.isLuxonDateTime = true;
    }

    // CONSTRUCT

    /**
     * Create a DateTime for the current instant, in the system's time zone.
     *
     * Use Settings to override these default values if needed.
     * @example DateTime.now().toISO() //~> now in the ISO format
     * @return {DateTime}
     */
    DateTime.now = function now() {
      return new DateTime({});
    }

    /**
     * Create a local DateTime
     * @param {number} [year] - The calendar year. If omitted (as in, call `local()` with no arguments), the current time will be used
     * @param {number} [month=1] - The month, 1-indexed
     * @param {number} [day=1] - The day of the month, 1-indexed
     * @param {number} [hour=0] - The hour of the day, in 24-hour time
     * @param {number} [minute=0] - The minute of the hour, meaning a number between 0 and 59
     * @param {number} [second=0] - The second of the minute, meaning a number between 0 and 59
     * @param {number} [millisecond=0] - The millisecond of the second, meaning a number between 0 and 999
     * @example DateTime.local()                                  //~> now
     * @example DateTime.local({ zone: "America/New_York" })      //~> now, in US east coast time
     * @example DateTime.local(2017)                              //~> 2017-01-01T00:00:00
     * @example DateTime.local(2017, 3)                           //~> 2017-03-01T00:00:00
     * @example DateTime.local(2017, 3, 12, { locale: "fr" })     //~> 2017-03-12T00:00:00, with a French locale
     * @example DateTime.local(2017, 3, 12, 5)                    //~> 2017-03-12T05:00:00
     * @example DateTime.local(2017, 3, 12, 5, { zone: "utc" })   //~> 2017-03-12T05:00:00, in UTC
     * @example DateTime.local(2017, 3, 12, 5, 45)                //~> 2017-03-12T05:45:00
     * @example DateTime.local(2017, 3, 12, 5, 45, 10)            //~> 2017-03-12T05:45:10
     * @example DateTime.local(2017, 3, 12, 5, 45, 10, 765)       //~> 2017-03-12T05:45:10.765
     * @return {DateTime}
     */;
    DateTime.local = function local() {
      var _lastOpts = lastOpts(arguments),
        opts = _lastOpts[0],
        args = _lastOpts[1],
        year = args[0],
        month = args[1],
        day = args[2],
        hour = args[3],
        minute = args[4],
        second = args[5],
        millisecond = args[6];
      return quickDT({
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        second: second,
        millisecond: millisecond
      }, opts);
    }

    /**
     * Create a DateTime in UTC
     * @param {number} [year] - The calendar year. If omitted (as in, call `utc()` with no arguments), the current time will be used
     * @param {number} [month=1] - The month, 1-indexed
     * @param {number} [day=1] - The day of the month
     * @param {number} [hour=0] - The hour of the day, in 24-hour time
     * @param {number} [minute=0] - The minute of the hour, meaning a number between 0 and 59
     * @param {number} [second=0] - The second of the minute, meaning a number between 0 and 59
     * @param {number} [millisecond=0] - The millisecond of the second, meaning a number between 0 and 999
     * @param {Object} options - configuration options for the DateTime
     * @param {string} [options.locale] - a locale to set on the resulting DateTime instance
     * @param {string} [options.outputCalendar] - the output calendar to set on the resulting DateTime instance
     * @param {string} [options.numberingSystem] - the numbering system to set on the resulting DateTime instance
     * @param {string} [options.weekSettings] - the week settings to set on the resulting DateTime instance
     * @example DateTime.utc()                                              //~> now
     * @example DateTime.utc(2017)                                          //~> 2017-01-01T00:00:00Z
     * @example DateTime.utc(2017, 3)                                       //~> 2017-03-01T00:00:00Z
     * @example DateTime.utc(2017, 3, 12)                                   //~> 2017-03-12T00:00:00Z
     * @example DateTime.utc(2017, 3, 12, 5)                                //~> 2017-03-12T05:00:00Z
     * @example DateTime.utc(2017, 3, 12, 5, 45)                            //~> 2017-03-12T05:45:00Z
     * @example DateTime.utc(2017, 3, 12, 5, 45, { locale: "fr" })          //~> 2017-03-12T05:45:00Z with a French locale
     * @example DateTime.utc(2017, 3, 12, 5, 45, 10)                        //~> 2017-03-12T05:45:10Z
     * @example DateTime.utc(2017, 3, 12, 5, 45, 10, 765, { locale: "fr" }) //~> 2017-03-12T05:45:10.765Z with a French locale
     * @return {DateTime}
     */;
    DateTime.utc = function utc() {
      var _lastOpts2 = lastOpts(arguments),
        opts = _lastOpts2[0],
        args = _lastOpts2[1],
        year = args[0],
        month = args[1],
        day = args[2],
        hour = args[3],
        minute = args[4],
        second = args[5],
        millisecond = args[6];
      opts.zone = FixedOffsetZone.utcInstance;
      return quickDT({
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        second: second,
        millisecond: millisecond
      }, opts);
    }

    /**
     * Create a DateTime from a JavaScript Date object. Uses the default zone.
     * @param {Date} date - a JavaScript Date object
     * @param {Object} options - configuration options for the DateTime
     * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
     * @return {DateTime}
     */;
    DateTime.fromJSDate = function fromJSDate(date, options) {
      if (options === void 0) {
        options = {};
      }
      var ts = isDate(date) ? date.valueOf() : NaN;
      if (Number.isNaN(ts)) {
        return DateTime.invalid("invalid input");
      }
      var zoneToUse = normalizeZone(options.zone, Settings.defaultZone);
      if (!zoneToUse.isValid) {
        return DateTime.invalid(unsupportedZone(zoneToUse));
      }
      return new DateTime({
        ts: ts,
        zone: zoneToUse,
        loc: Locale.fromObject(options)
      });
    }

    /**
     * Create a DateTime from a number of milliseconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone.
     * @param {number} milliseconds - a number of milliseconds since 1970 UTC
     * @param {Object} options - configuration options for the DateTime
     * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
     * @param {string} [options.locale] - a locale to set on the resulting DateTime instance
     * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} options.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @param {string} options.weekSettings - the week settings to set on the resulting DateTime instance
     * @return {DateTime}
     */;
    DateTime.fromMillis = function fromMillis(milliseconds, options) {
      if (options === void 0) {
        options = {};
      }
      if (!isNumber(milliseconds)) {
        throw new InvalidArgumentError("fromMillis requires a numerical input, but received a " + typeof milliseconds + " with value " + milliseconds);
      } else if (milliseconds < -MAX_DATE || milliseconds > MAX_DATE) {
        // this isn't perfect because we can still end up out of range because of additional shifting, but it's a start
        return DateTime.invalid("Timestamp out of range");
      } else {
        return new DateTime({
          ts: milliseconds,
          zone: normalizeZone(options.zone, Settings.defaultZone),
          loc: Locale.fromObject(options)
        });
      }
    }

    /**
     * Create a DateTime from a number of seconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone.
     * @param {number} seconds - a number of seconds since 1970 UTC
     * @param {Object} options - configuration options for the DateTime
     * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
     * @param {string} [options.locale] - a locale to set on the resulting DateTime instance
     * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} options.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @param {string} options.weekSettings - the week settings to set on the resulting DateTime instance
     * @return {DateTime}
     */;
    DateTime.fromSeconds = function fromSeconds(seconds, options) {
      if (options === void 0) {
        options = {};
      }
      if (!isNumber(seconds)) {
        throw new InvalidArgumentError("fromSeconds requires a numerical input");
      } else {
        return new DateTime({
          ts: seconds * 1000,
          zone: normalizeZone(options.zone, Settings.defaultZone),
          loc: Locale.fromObject(options)
        });
      }
    }

    /**
     * Create a DateTime from a JavaScript object with keys like 'year' and 'hour' with reasonable defaults.
     * @param {Object} obj - the object to create the DateTime from
     * @param {number} obj.year - a year, such as 1987
     * @param {number} obj.month - a month, 1-12
     * @param {number} obj.day - a day of the month, 1-31, depending on the month
     * @param {number} obj.ordinal - day of the year, 1-365 or 366
     * @param {number} obj.weekYear - an ISO week year
     * @param {number} obj.weekNumber - an ISO week number, between 1 and 52 or 53, depending on the year
     * @param {number} obj.weekday - an ISO weekday, 1-7, where 1 is Monday and 7 is Sunday
     * @param {number} obj.localWeekYear - a week year, according to the locale
     * @param {number} obj.localWeekNumber - a week number, between 1 and 52 or 53, depending on the year, according to the locale
     * @param {number} obj.localWeekday - a weekday, 1-7, where 1 is the first and 7 is the last day of the week, according to the locale
     * @param {number} obj.hour - hour of the day, 0-23
     * @param {number} obj.minute - minute of the hour, 0-59
     * @param {number} obj.second - second of the minute, 0-59
     * @param {number} obj.millisecond - millisecond of the second, 0-999
     * @param {Object} opts - options for creating this DateTime
     * @param {string|Zone} [opts.zone='local'] - interpret the numbers in the context of a particular zone. Can take any value taken as the first argument to setZone()
     * @param {string} [opts.locale='system\'s locale'] - a locale to set on the resulting DateTime instance
     * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
     * @example DateTime.fromObject({ year: 1982, month: 5, day: 25}).toISODate() //=> '1982-05-25'
     * @example DateTime.fromObject({ year: 1982 }).toISODate() //=> '1982-01-01'
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }) //~> today at 10:26:06
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'utc' }),
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'local' })
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'America/New_York' })
     * @example DateTime.fromObject({ weekYear: 2016, weekNumber: 2, weekday: 3 }).toISODate() //=> '2016-01-13'
     * @example DateTime.fromObject({ localWeekYear: 2022, localWeekNumber: 1, localWeekday: 1 }, { locale: "en-US" }).toISODate() //=> '2021-12-26'
     * @return {DateTime}
     */;
    DateTime.fromObject = function fromObject(obj, opts) {
      if (opts === void 0) {
        opts = {};
      }
      obj = obj || {};
      var zoneToUse = normalizeZone(opts.zone, Settings.defaultZone);
      if (!zoneToUse.isValid) {
        return DateTime.invalid(unsupportedZone(zoneToUse));
      }
      var loc = Locale.fromObject(opts);
      var normalized = normalizeObject(obj, normalizeUnitWithLocalWeeks);
      var _usesLocalWeekValues = usesLocalWeekValues(normalized, loc),
        minDaysInFirstWeek = _usesLocalWeekValues.minDaysInFirstWeek,
        startOfWeek = _usesLocalWeekValues.startOfWeek;
      var tsNow = Settings.now(),
        offsetProvis = !isUndefined(opts.specificOffset) ? opts.specificOffset : zoneToUse.offset(tsNow),
        containsOrdinal = !isUndefined(normalized.ordinal),
        containsGregorYear = !isUndefined(normalized.year),
        containsGregorMD = !isUndefined(normalized.month) || !isUndefined(normalized.day),
        containsGregor = containsGregorYear || containsGregorMD,
        definiteWeekDef = normalized.weekYear || normalized.weekNumber;

      // cases:
      // just a weekday -> this week's instance of that weekday, no worries
      // (gregorian data or ordinal) + (weekYear or weekNumber) -> error
      // (gregorian month or day) + ordinal -> error
      // otherwise just use weeks or ordinals or gregorian, depending on what's specified

      if ((containsGregor || containsOrdinal) && definiteWeekDef) {
        throw new ConflictingSpecificationError("Can't mix weekYear/weekNumber units with year/month/day or ordinals");
      }
      if (containsGregorMD && containsOrdinal) {
        throw new ConflictingSpecificationError("Can't mix ordinal dates with month/day");
      }
      var useWeekData = definiteWeekDef || normalized.weekday && !containsGregor;

      // configure ourselves to deal with gregorian dates or week stuff
      var units,
        defaultValues,
        objNow = tsToObj(tsNow, offsetProvis);
      if (useWeekData) {
        units = orderedWeekUnits;
        defaultValues = defaultWeekUnitValues;
        objNow = gregorianToWeek(objNow, minDaysInFirstWeek, startOfWeek);
      } else if (containsOrdinal) {
        units = orderedOrdinalUnits;
        defaultValues = defaultOrdinalUnitValues;
        objNow = gregorianToOrdinal(objNow);
      } else {
        units = orderedUnits;
        defaultValues = defaultUnitValues;
      }

      // set default values for missing stuff
      var foundFirst = false;
      for (var _iterator2 = _createForOfIteratorHelperLoose(units), _step2; !(_step2 = _iterator2()).done;) {
        var u = _step2.value;
        var v = normalized[u];
        if (!isUndefined(v)) {
          foundFirst = true;
        } else if (foundFirst) {
          normalized[u] = defaultValues[u];
        } else {
          normalized[u] = objNow[u];
        }
      }

      // make sure the values we have are in range
      var higherOrderInvalid = useWeekData ? hasInvalidWeekData(normalized, minDaysInFirstWeek, startOfWeek) : containsOrdinal ? hasInvalidOrdinalData(normalized) : hasInvalidGregorianData(normalized),
        invalid = higherOrderInvalid || hasInvalidTimeData(normalized);
      if (invalid) {
        return DateTime.invalid(invalid);
      }

      // compute the actual time
      var gregorian = useWeekData ? weekToGregorian(normalized, minDaysInFirstWeek, startOfWeek) : containsOrdinal ? ordinalToGregorian(normalized) : normalized,
        _objToTS2 = objToTS(gregorian, offsetProvis, zoneToUse),
        tsFinal = _objToTS2[0],
        offsetFinal = _objToTS2[1],
        inst = new DateTime({
          ts: tsFinal,
          zone: zoneToUse,
          o: offsetFinal,
          loc: loc
        });

      // gregorian data + weekday serves only to validate
      if (normalized.weekday && containsGregor && obj.weekday !== inst.weekday) {
        return DateTime.invalid("mismatched weekday", "you can't specify both a weekday of " + normalized.weekday + " and a date of " + inst.toISO());
      }
      if (!inst.isValid) {
        return DateTime.invalid(inst.invalid);
      }
      return inst;
    }

    /**
     * Create a DateTime from an ISO 8601 string
     * @param {string} text - the ISO string
     * @param {Object} opts - options to affect the creation
     * @param {string|Zone} [opts.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the time to this zone
     * @param {boolean} [opts.setZone=false] - override the zone with a fixed-offset zone specified in the string itself, if it specifies one
     * @param {string} [opts.locale='system's locale'] - a locale to set on the resulting DateTime instance
     * @param {string} [opts.outputCalendar] - the output calendar to set on the resulting DateTime instance
     * @param {string} [opts.numberingSystem] - the numbering system to set on the resulting DateTime instance
     * @param {string} [opts.weekSettings] - the week settings to set on the resulting DateTime instance
     * @example DateTime.fromISO('2016-05-25T09:08:34.123')
     * @example DateTime.fromISO('2016-05-25T09:08:34.123+06:00')
     * @example DateTime.fromISO('2016-05-25T09:08:34.123+06:00', {setZone: true})
     * @example DateTime.fromISO('2016-05-25T09:08:34.123', {zone: 'utc'})
     * @example DateTime.fromISO('2016-W05-4')
     * @return {DateTime}
     */;
    DateTime.fromISO = function fromISO(text, opts) {
      if (opts === void 0) {
        opts = {};
      }
      var _parseISODate = parseISODate(text),
        vals = _parseISODate[0],
        parsedZone = _parseISODate[1];
      return parseDataToDateTime(vals, parsedZone, opts, "ISO 8601", text);
    }

    /**
     * Create a DateTime from an RFC 2822 string
     * @param {string} text - the RFC 2822 string
     * @param {Object} opts - options to affect the creation
     * @param {string|Zone} [opts.zone='local'] - convert the time to this zone. Since the offset is always specified in the string itself, this has no effect on the interpretation of string, merely the zone the resulting DateTime is expressed in.
     * @param {boolean} [opts.setZone=false] - override the zone with a fixed-offset zone specified in the string itself, if it specifies one
     * @param {string} [opts.locale='system's locale'] - a locale to set on the resulting DateTime instance
     * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
     * @example DateTime.fromRFC2822('25 Nov 2016 13:23:12 GMT')
     * @example DateTime.fromRFC2822('Fri, 25 Nov 2016 13:23:12 +0600')
     * @example DateTime.fromRFC2822('25 Nov 2016 13:23 Z')
     * @return {DateTime}
     */;
    DateTime.fromRFC2822 = function fromRFC2822(text, opts) {
      if (opts === void 0) {
        opts = {};
      }
      var _parseRFC2822Date = parseRFC2822Date(text),
        vals = _parseRFC2822Date[0],
        parsedZone = _parseRFC2822Date[1];
      return parseDataToDateTime(vals, parsedZone, opts, "RFC 2822", text);
    }

    /**
     * Create a DateTime from an HTTP header date
     * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
     * @param {string} text - the HTTP header date
     * @param {Object} opts - options to affect the creation
     * @param {string|Zone} [opts.zone='local'] - convert the time to this zone. Since HTTP dates are always in UTC, this has no effect on the interpretation of string, merely the zone the resulting DateTime is expressed in.
     * @param {boolean} [opts.setZone=false] - override the zone with the fixed-offset zone specified in the string. For HTTP dates, this is always UTC, so this option is equivalent to setting the `zone` option to 'utc', but this option is included for consistency with similar methods.
     * @param {string} [opts.locale='system's locale'] - a locale to set on the resulting DateTime instance
     * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
     * @example DateTime.fromHTTP('Sun, 06 Nov 1994 08:49:37 GMT')
     * @example DateTime.fromHTTP('Sunday, 06-Nov-94 08:49:37 GMT')
     * @example DateTime.fromHTTP('Sun Nov  6 08:49:37 1994')
     * @return {DateTime}
     */;
    DateTime.fromHTTP = function fromHTTP(text, opts) {
      if (opts === void 0) {
        opts = {};
      }
      var _parseHTTPDate = parseHTTPDate(text),
        vals = _parseHTTPDate[0],
        parsedZone = _parseHTTPDate[1];
      return parseDataToDateTime(vals, parsedZone, opts, "HTTP", opts);
    }

    /**
     * Create a DateTime from an input string and format string.
     * Defaults to en-US if no locale has been specified, regardless of the system's locale. For a table of tokens and their interpretations, see [here](https://moment.github.io/luxon/#/parsing?id=table-of-tokens).
     * @param {string} text - the string to parse
     * @param {string} fmt - the format the string is expected to be in (see the link below for the formats)
     * @param {Object} opts - options to affect the creation
     * @param {string|Zone} [opts.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone
     * @param {boolean} [opts.setZone=false] - override the zone with a zone specified in the string itself, if it specifies one
     * @param {string} [opts.locale='en-US'] - a locale string to use when parsing. Will also set the DateTime to this locale
     * @param {string} opts.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
     * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
     * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @return {DateTime}
     */;
    DateTime.fromFormat = function fromFormat(text, fmt, opts) {
      if (opts === void 0) {
        opts = {};
      }
      if (isUndefined(text) || isUndefined(fmt)) {
        throw new InvalidArgumentError("fromFormat requires an input string and a format");
      }
      var _opts = opts,
        _opts$locale = _opts.locale,
        locale = _opts$locale === void 0 ? null : _opts$locale,
        _opts$numberingSystem = _opts.numberingSystem,
        numberingSystem = _opts$numberingSystem === void 0 ? null : _opts$numberingSystem,
        localeToUse = Locale.fromOpts({
          locale: locale,
          numberingSystem: numberingSystem,
          defaultToEN: true
        }),
        _parseFromTokens = parseFromTokens(localeToUse, text, fmt),
        vals = _parseFromTokens[0],
        parsedZone = _parseFromTokens[1],
        specificOffset = _parseFromTokens[2],
        invalid = _parseFromTokens[3];
      if (invalid) {
        return DateTime.invalid(invalid);
      } else {
        return parseDataToDateTime(vals, parsedZone, opts, "format " + fmt, text, specificOffset);
      }
    }

    /**
     * @deprecated use fromFormat instead
     */;
    DateTime.fromString = function fromString(text, fmt, opts) {
      if (opts === void 0) {
        opts = {};
      }
      return DateTime.fromFormat(text, fmt, opts);
    }

    /**
     * Create a DateTime from a SQL date, time, or datetime
     * Defaults to en-US if no locale has been specified, regardless of the system's locale
     * @param {string} text - the string to parse
     * @param {Object} opts - options to affect the creation
     * @param {string|Zone} [opts.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone
     * @param {boolean} [opts.setZone=false] - override the zone with a zone specified in the string itself, if it specifies one
     * @param {string} [opts.locale='en-US'] - a locale string to use when parsing. Will also set the DateTime to this locale
     * @param {string} opts.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
     * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
     * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @example DateTime.fromSQL('2017-05-15')
     * @example DateTime.fromSQL('2017-05-15 09:12:34')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342+06:00')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles', { setZone: true })
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342', { zone: 'America/Los_Angeles' })
     * @example DateTime.fromSQL('09:12:34.342')
     * @return {DateTime}
     */;
    DateTime.fromSQL = function fromSQL(text, opts) {
      if (opts === void 0) {
        opts = {};
      }
      var _parseSQL = parseSQL(text),
        vals = _parseSQL[0],
        parsedZone = _parseSQL[1];
      return parseDataToDateTime(vals, parsedZone, opts, "SQL", text);
    }

    /**
     * Create an invalid DateTime.
     * @param {string} reason - simple string of why this DateTime is invalid. Should not contain parameters or anything else data-dependent.
     * @param {string} [explanation=null] - longer explanation, may include parameters and other useful debugging information
     * @return {DateTime}
     */;
    DateTime.invalid = function invalid(reason, explanation) {
      if (explanation === void 0) {
        explanation = null;
      }
      if (!reason) {
        throw new InvalidArgumentError("need to specify a reason the DateTime is invalid");
      }
      var invalid = reason instanceof Invalid ? reason : new Invalid(reason, explanation);
      if (Settings.throwOnInvalid) {
        throw new InvalidDateTimeError(invalid);
      } else {
        return new DateTime({
          invalid: invalid
        });
      }
    }

    /**
     * Check if an object is an instance of DateTime. Works across context boundaries
     * @param {object} o
     * @return {boolean}
     */;
    DateTime.isDateTime = function isDateTime(o) {
      return o && o.isLuxonDateTime || false;
    }

    /**
     * Produce the format string for a set of options
     * @param formatOpts
     * @param localeOpts
     * @returns {string}
     */;
    DateTime.parseFormatForOpts = function parseFormatForOpts(formatOpts, localeOpts) {
      if (localeOpts === void 0) {
        localeOpts = {};
      }
      var tokenList = formatOptsToTokens(formatOpts, Locale.fromObject(localeOpts));
      return !tokenList ? null : tokenList.map(function (t) {
        return t ? t.val : null;
      }).join("");
    }

    /**
     * Produce the the fully expanded format token for the locale
     * Does NOT quote characters, so quoted tokens will not round trip correctly
     * @param fmt
     * @param localeOpts
     * @returns {string}
     */;
    DateTime.expandFormat = function expandFormat(fmt, localeOpts) {
      if (localeOpts === void 0) {
        localeOpts = {};
      }
      var expanded = expandMacroTokens(Formatter.parseFormat(fmt), Locale.fromObject(localeOpts));
      return expanded.map(function (t) {
        return t.val;
      }).join("");
    };
    DateTime.resetCache = function resetCache() {
      zoneOffsetTs = undefined;
      zoneOffsetGuessCache.clear();
    }

    // INFO

    /**
     * Get the value of unit.
     * @param {string} unit - a unit such as 'minute' or 'day'
     * @example DateTime.local(2017, 7, 4).get('month'); //=> 7
     * @example DateTime.local(2017, 7, 4).get('day'); //=> 4
     * @return {number}
     */;
    var _proto = DateTime.prototype;
    _proto.get = function get(unit) {
      return this[unit];
    }

    /**
     * Returns whether the DateTime is valid. Invalid DateTimes occur when:
     * * The DateTime was created from invalid calendar information, such as the 13th month or February 30
     * * The DateTime was created by an operation on another invalid date
     * @type {boolean}
     */;
    /**
     * Get those DateTimes which have the same local time as this DateTime, but a different offset from UTC
     * in this DateTime's zone. During DST changes local time can be ambiguous, for example
     * `2023-10-29T02:30:00` in `Europe/Berlin` can have offset `+01:00` or `+02:00`.
     * This method will return both possible DateTimes if this DateTime's local time is ambiguous.
     * @returns {DateTime[]}
     */
    _proto.getPossibleOffsets = function getPossibleOffsets() {
      if (!this.isValid || this.isOffsetFixed) {
        return [this];
      }
      var dayMs = 86400000;
      var minuteMs = 60000;
      var localTS = objToLocalTS(this.c);
      var oEarlier = this.zone.offset(localTS - dayMs);
      var oLater = this.zone.offset(localTS + dayMs);
      var o1 = this.zone.offset(localTS - oEarlier * minuteMs);
      var o2 = this.zone.offset(localTS - oLater * minuteMs);
      if (o1 === o2) {
        return [this];
      }
      var ts1 = localTS - o1 * minuteMs;
      var ts2 = localTS - o2 * minuteMs;
      var c1 = tsToObj(ts1, o1);
      var c2 = tsToObj(ts2, o2);
      if (c1.hour === c2.hour && c1.minute === c2.minute && c1.second === c2.second && c1.millisecond === c2.millisecond) {
        return [clone(this, {
          ts: ts1
        }), clone(this, {
          ts: ts2
        })];
      }
      return [this];
    }

    /**
     * Returns true if this DateTime is in a leap year, false otherwise
     * @example DateTime.local(2016).isInLeapYear //=> true
     * @example DateTime.local(2013).isInLeapYear //=> false
     * @type {boolean}
     */;
    /**
     * Returns the resolved Intl options for this DateTime.
     * This is useful in understanding the behavior of formatting methods
     * @param {Object} opts - the same options as toLocaleString
     * @return {Object}
     */
    _proto.resolvedLocaleOptions = function resolvedLocaleOptions(opts) {
      if (opts === void 0) {
        opts = {};
      }
      var _Formatter$create$res = Formatter.create(this.loc.clone(opts), opts).resolvedOptions(this),
        locale = _Formatter$create$res.locale,
        numberingSystem = _Formatter$create$res.numberingSystem,
        calendar = _Formatter$create$res.calendar;
      return {
        locale: locale,
        numberingSystem: numberingSystem,
        outputCalendar: calendar
      };
    }

    // TRANSFORM

    /**
     * "Set" the DateTime's zone to UTC. Returns a newly-constructed DateTime.
     *
     * Equivalent to {@link DateTime#setZone}('utc')
     * @param {number} [offset=0] - optionally, an offset from UTC in minutes
     * @param {Object} [opts={}] - options to pass to `setZone()`
     * @return {DateTime}
     */;
    _proto.toUTC = function toUTC(offset, opts) {
      if (offset === void 0) {
        offset = 0;
      }
      if (opts === void 0) {
        opts = {};
      }
      return this.setZone(FixedOffsetZone.instance(offset), opts);
    }

    /**
     * "Set" the DateTime's zone to the host's local zone. Returns a newly-constructed DateTime.
     *
     * Equivalent to `setZone('local')`
     * @return {DateTime}
     */;
    _proto.toLocal = function toLocal() {
      return this.setZone(Settings.defaultZone);
    }

    /**
     * "Set" the DateTime's zone to specified zone. Returns a newly-constructed DateTime.
     *
     * By default, the setter keeps the underlying time the same (as in, the same timestamp), but the new instance will report different local times and consider DSTs when making computations, as with {@link DateTime#plus}. You may wish to use {@link DateTime#toLocal} and {@link DateTime#toUTC} which provide simple convenience wrappers for commonly used zones.
     * @param {string|Zone} [zone='local'] - a zone identifier. As a string, that can be any IANA zone supported by the host environment, or a fixed-offset name of the form 'UTC+3', or the strings 'local' or 'utc'. You may also supply an instance of a {@link DateTime#Zone} class.
     * @param {Object} opts - options
     * @param {boolean} [opts.keepLocalTime=false] - If true, adjust the underlying time so that the local time stays the same, but in the target zone. You should rarely need this.
     * @return {DateTime}
     */;
    _proto.setZone = function setZone(zone, _temp) {
      var _ref2 = _temp === void 0 ? {} : _temp,
        _ref2$keepLocalTime = _ref2.keepLocalTime,
        keepLocalTime = _ref2$keepLocalTime === void 0 ? false : _ref2$keepLocalTime,
        _ref2$keepCalendarTim = _ref2.keepCalendarTime,
        keepCalendarTime = _ref2$keepCalendarTim === void 0 ? false : _ref2$keepCalendarTim;
      zone = normalizeZone(zone, Settings.defaultZone);
      if (zone.equals(this.zone)) {
        return this;
      } else if (!zone.isValid) {
        return DateTime.invalid(unsupportedZone(zone));
      } else {
        var newTS = this.ts;
        if (keepLocalTime || keepCalendarTime) {
          var offsetGuess = zone.offset(this.ts);
          var asObj = this.toObject();
          var _objToTS3 = objToTS(asObj, offsetGuess, zone);
          newTS = _objToTS3[0];
        }
        return clone(this, {
          ts: newTS,
          zone: zone
        });
      }
    }

    /**
     * "Set" the locale, numberingSystem, or outputCalendar. Returns a newly-constructed DateTime.
     * @param {Object} properties - the properties to set
     * @example DateTime.local(2017, 5, 25).reconfigure({ locale: 'en-GB' })
     * @return {DateTime}
     */;
    _proto.reconfigure = function reconfigure(_temp2) {
      var _ref3 = _temp2 === void 0 ? {} : _temp2,
        locale = _ref3.locale,
        numberingSystem = _ref3.numberingSystem,
        outputCalendar = _ref3.outputCalendar;
      var loc = this.loc.clone({
        locale: locale,
        numberingSystem: numberingSystem,
        outputCalendar: outputCalendar
      });
      return clone(this, {
        loc: loc
      });
    }

    /**
     * "Set" the locale. Returns a newly-constructed DateTime.
     * Just a convenient alias for reconfigure({ locale })
     * @example DateTime.local(2017, 5, 25).setLocale('en-GB')
     * @return {DateTime}
     */;
    _proto.setLocale = function setLocale(locale) {
      return this.reconfigure({
        locale: locale
      });
    }

    /**
     * "Set" the values of specified units. Returns a newly-constructed DateTime.
     * You can only set units with this method; for "setting" metadata, see {@link DateTime#reconfigure} and {@link DateTime#setZone}.
     *
     * This method also supports setting locale-based week units, i.e. `localWeekday`, `localWeekNumber` and `localWeekYear`.
     * They cannot be mixed with ISO-week units like `weekday`.
     * @param {Object} values - a mapping of units to numbers
     * @example dt.set({ year: 2017 })
     * @example dt.set({ hour: 8, minute: 30 })
     * @example dt.set({ weekday: 5 })
     * @example dt.set({ year: 2005, ordinal: 234 })
     * @return {DateTime}
     */;
    _proto.set = function set(values) {
      if (!this.isValid) return this;
      var normalized = normalizeObject(values, normalizeUnitWithLocalWeeks);
      var _usesLocalWeekValues2 = usesLocalWeekValues(normalized, this.loc),
        minDaysInFirstWeek = _usesLocalWeekValues2.minDaysInFirstWeek,
        startOfWeek = _usesLocalWeekValues2.startOfWeek;
      var settingWeekStuff = !isUndefined(normalized.weekYear) || !isUndefined(normalized.weekNumber) || !isUndefined(normalized.weekday),
        containsOrdinal = !isUndefined(normalized.ordinal),
        containsGregorYear = !isUndefined(normalized.year),
        containsGregorMD = !isUndefined(normalized.month) || !isUndefined(normalized.day),
        containsGregor = containsGregorYear || containsGregorMD,
        definiteWeekDef = normalized.weekYear || normalized.weekNumber;
      if ((containsGregor || containsOrdinal) && definiteWeekDef) {
        throw new ConflictingSpecificationError("Can't mix weekYear/weekNumber units with year/month/day or ordinals");
      }
      if (containsGregorMD && containsOrdinal) {
        throw new ConflictingSpecificationError("Can't mix ordinal dates with month/day");
      }
      var mixed;
      if (settingWeekStuff) {
        mixed = weekToGregorian(_extends({}, gregorianToWeek(this.c, minDaysInFirstWeek, startOfWeek), normalized), minDaysInFirstWeek, startOfWeek);
      } else if (!isUndefined(normalized.ordinal)) {
        mixed = ordinalToGregorian(_extends({}, gregorianToOrdinal(this.c), normalized));
      } else {
        mixed = _extends({}, this.toObject(), normalized);

        // if we didn't set the day but we ended up on an overflow date,
        // use the last day of the right month
        if (isUndefined(normalized.day)) {
          mixed.day = Math.min(daysInMonth(mixed.year, mixed.month), mixed.day);
        }
      }
      var _objToTS4 = objToTS(mixed, this.o, this.zone),
        ts = _objToTS4[0],
        o = _objToTS4[1];
      return clone(this, {
        ts: ts,
        o: o
      });
    }

    /**
     * Add a period of time to this DateTime and return the resulting DateTime
     *
     * Adding hours, minutes, seconds, or milliseconds increases the timestamp by the right number of milliseconds. Adding days, months, or years shifts the calendar, accounting for DSTs and leap years along the way. Thus, `dt.plus({ hours: 24 })` may result in a different time than `dt.plus({ days: 1 })` if there's a DST shift in between.
     * @param {Duration|Object|number} duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     * @example DateTime.now().plus(123) //~> in 123 milliseconds
     * @example DateTime.now().plus({ minutes: 15 }) //~> in 15 minutes
     * @example DateTime.now().plus({ days: 1 }) //~> this time tomorrow
     * @example DateTime.now().plus({ days: -1 }) //~> this time yesterday
     * @example DateTime.now().plus({ hours: 3, minutes: 13 }) //~> in 3 hr, 13 min
     * @example DateTime.now().plus(Duration.fromObject({ hours: 3, minutes: 13 })) //~> in 3 hr, 13 min
     * @return {DateTime}
     */;
    _proto.plus = function plus(duration) {
      if (!this.isValid) return this;
      var dur = Duration.fromDurationLike(duration);
      return clone(this, adjustTime(this, dur));
    }

    /**
     * Subtract a period of time to this DateTime and return the resulting DateTime
     * See {@link DateTime#plus}
     * @param {Duration|Object|number} duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     @return {DateTime}
     */;
    _proto.minus = function minus(duration) {
      if (!this.isValid) return this;
      var dur = Duration.fromDurationLike(duration).negate();
      return clone(this, adjustTime(this, dur));
    }

    /**
     * "Set" this DateTime to the beginning of a unit of time.
     * @param {string} unit - The unit to go to the beginning of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     * @param {Object} opts - options
     * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week
     * @example DateTime.local(2014, 3, 3).startOf('month').toISODate(); //=> '2014-03-01'
     * @example DateTime.local(2014, 3, 3).startOf('year').toISODate(); //=> '2014-01-01'
     * @example DateTime.local(2014, 3, 3).startOf('week').toISODate(); //=> '2014-03-03', weeks always start on Mondays
     * @example DateTime.local(2014, 3, 3, 5, 30).startOf('day').toISOTime(); //=> '00:00.000-05:00'
     * @example DateTime.local(2014, 3, 3, 5, 30).startOf('hour').toISOTime(); //=> '05:00:00.000-05:00'
     * @return {DateTime}
     */;
    _proto.startOf = function startOf(unit, _temp3) {
      var _ref4 = _temp3 === void 0 ? {} : _temp3,
        _ref4$useLocaleWeeks = _ref4.useLocaleWeeks,
        useLocaleWeeks = _ref4$useLocaleWeeks === void 0 ? false : _ref4$useLocaleWeeks;
      if (!this.isValid) return this;
      var o = {},
        normalizedUnit = Duration.normalizeUnit(unit);
      switch (normalizedUnit) {
        case "years":
          o.month = 1;
        // falls through
        case "quarters":
        case "months":
          o.day = 1;
        // falls through
        case "weeks":
        case "days":
          o.hour = 0;
        // falls through
        case "hours":
          o.minute = 0;
        // falls through
        case "minutes":
          o.second = 0;
        // falls through
        case "seconds":
          o.millisecond = 0;
          break;
        // no default, invalid units throw in normalizeUnit()
      }

      if (normalizedUnit === "weeks") {
        if (useLocaleWeeks) {
          var startOfWeek = this.loc.getStartOfWeek();
          var weekday = this.weekday;
          if (weekday < startOfWeek) {
            o.weekNumber = this.weekNumber - 1;
          }
          o.weekday = startOfWeek;
        } else {
          o.weekday = 1;
        }
      }
      if (normalizedUnit === "quarters") {
        var q = Math.ceil(this.month / 3);
        o.month = (q - 1) * 3 + 1;
      }
      return this.set(o);
    }

    /**
     * "Set" this DateTime to the end (meaning the last millisecond) of a unit of time
     * @param {string} unit - The unit to go to the end of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     * @param {Object} opts - options
     * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week
     * @example DateTime.local(2014, 3, 3).endOf('month').toISO(); //=> '2014-03-31T23:59:59.999-05:00'
     * @example DateTime.local(2014, 3, 3).endOf('year').toISO(); //=> '2014-12-31T23:59:59.999-05:00'
     * @example DateTime.local(2014, 3, 3).endOf('week').toISO(); // => '2014-03-09T23:59:59.999-05:00', weeks start on Mondays
     * @example DateTime.local(2014, 3, 3, 5, 30).endOf('day').toISO(); //=> '2014-03-03T23:59:59.999-05:00'
     * @example DateTime.local(2014, 3, 3, 5, 30).endOf('hour').toISO(); //=> '2014-03-03T05:59:59.999-05:00'
     * @return {DateTime}
     */;
    _proto.endOf = function endOf(unit, opts) {
      var _this$plus;
      return this.isValid ? this.plus((_this$plus = {}, _this$plus[unit] = 1, _this$plus)).startOf(unit, opts).minus(1) : this;
    }

    // OUTPUT

    /**
     * Returns a string representation of this DateTime formatted according to the specified format string.
     * **You may not want this.** See {@link DateTime#toLocaleString} for a more flexible formatting tool. For a table of tokens and their interpretations, see [here](https://moment.github.io/luxon/#/formatting?id=table-of-tokens).
     * Defaults to en-US if no locale has been specified, regardless of the system's locale.
     * @param {string} fmt - the format string
     * @param {Object} opts - opts to override the configuration options on this DateTime
     * @example DateTime.now().toFormat('yyyy LLL dd') //=> '2017 Apr 22'
     * @example DateTime.now().setLocale('fr').toFormat('yyyy LLL dd') //=> '2017 avr. 22'
     * @example DateTime.now().toFormat('yyyy LLL dd', { locale: "fr" }) //=> '2017 avr. 22'
     * @example DateTime.now().toFormat("HH 'hours and' mm 'minutes'") //=> '20 hours and 55 minutes'
     * @return {string}
     */;
    _proto.toFormat = function toFormat(fmt, opts) {
      if (opts === void 0) {
        opts = {};
      }
      return this.isValid ? Formatter.create(this.loc.redefaultToEN(opts)).formatDateTimeFromString(this, fmt) : INVALID;
    }

    /**
     * Returns a localized string representing this date. Accepts the same options as the Intl.DateTimeFormat constructor and any presets defined by Luxon, such as `DateTime.DATE_FULL` or `DateTime.TIME_SIMPLE`.
     * The exact behavior of this method is browser-specific, but in general it will return an appropriate representation
     * of the DateTime in the assigned locale.
     * Defaults to the system's locale if no locale has been specified
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param formatOpts {Object} - Intl.DateTimeFormat constructor options and configuration options
     * @param {Object} opts - opts to override the configuration options on this DateTime
     * @example DateTime.now().toLocaleString(); //=> 4/20/2017
     * @example DateTime.now().setLocale('en-gb').toLocaleString(); //=> '20/04/2017'
     * @example DateTime.now().toLocaleString(DateTime.DATE_FULL); //=> 'April 20, 2017'
     * @example DateTime.now().toLocaleString(DateTime.DATE_FULL, { locale: 'fr' }); //=> '28 août 2022'
     * @example DateTime.now().toLocaleString(DateTime.TIME_SIMPLE); //=> '11:32 AM'
     * @example DateTime.now().toLocaleString(DateTime.DATETIME_SHORT); //=> '4/20/2017, 11:32 AM'
     * @example DateTime.now().toLocaleString({ weekday: 'long', month: 'long', day: '2-digit' }); //=> 'Thursday, April 20'
     * @example DateTime.now().toLocaleString({ weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); //=> 'Thu, Apr 20, 11:27 AM'
     * @example DateTime.now().toLocaleString({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); //=> '11:32'
     * @return {string}
     */;
    _proto.toLocaleString = function toLocaleString(formatOpts, opts) {
      if (formatOpts === void 0) {
        formatOpts = DATE_SHORT;
      }
      if (opts === void 0) {
        opts = {};
      }
      return this.isValid ? Formatter.create(this.loc.clone(opts), formatOpts).formatDateTime(this) : INVALID;
    }

    /**
     * Returns an array of format "parts", meaning individual tokens along with metadata. This is allows callers to post-process individual sections of the formatted output.
     * Defaults to the system's locale if no locale has been specified
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts
     * @param opts {Object} - Intl.DateTimeFormat constructor options, same as `toLocaleString`.
     * @example DateTime.now().toLocaleParts(); //=> [
     *                                   //=>   { type: 'day', value: '25' },
     *                                   //=>   { type: 'literal', value: '/' },
     *                                   //=>   { type: 'month', value: '05' },
     *                                   //=>   { type: 'literal', value: '/' },
     *                                   //=>   { type: 'year', value: '1982' }
     *                                   //=> ]
     */;
    _proto.toLocaleParts = function toLocaleParts(opts) {
      if (opts === void 0) {
        opts = {};
      }
      return this.isValid ? Formatter.create(this.loc.clone(opts), opts).formatDateTimeParts(this) : [];
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime
     * @param {Object} opts - options
     * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
     * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @param {boolean} [opts.extendedZone=false] - add the time zone format extension
     * @param {string} [opts.format='extended'] - choose between the basic and extended format
     * @param {string} [opts.precision='milliseconds'] - truncate output to desired presicion: 'years', 'months', 'days', 'hours', 'minutes', 'seconds' or 'milliseconds'. When precision and suppressSeconds or suppressMilliseconds are used together, precision sets the maximum unit shown in the output, however seconds or milliseconds will still be suppressed if they are 0.
     * @example DateTime.utc(1983, 5, 25).toISO() //=> '1982-05-25T00:00:00.000Z'
     * @example DateTime.now().toISO() //=> '2017-04-22T20:47:05.335-04:00'
     * @example DateTime.now().toISO({ includeOffset: false }) //=> '2017-04-22T20:47:05.335'
     * @example DateTime.now().toISO({ format: 'basic' }) //=> '20170422T204705.335-0400'
     * @example DateTime.now().toISO({ precision: 'day' }) //=> '2017-04-22Z'
     * @example DateTime.now().toISO({ precision: 'minute' }) //=> '2017-04-22T20:47Z'
     * @return {string|null}
     */;
    _proto.toISO = function toISO(_temp4) {
      var _ref5 = _temp4 === void 0 ? {} : _temp4,
        _ref5$format = _ref5.format,
        format = _ref5$format === void 0 ? "extended" : _ref5$format,
        _ref5$suppressSeconds = _ref5.suppressSeconds,
        suppressSeconds = _ref5$suppressSeconds === void 0 ? false : _ref5$suppressSeconds,
        _ref5$suppressMillise = _ref5.suppressMilliseconds,
        suppressMilliseconds = _ref5$suppressMillise === void 0 ? false : _ref5$suppressMillise,
        _ref5$includeOffset = _ref5.includeOffset,
        includeOffset = _ref5$includeOffset === void 0 ? true : _ref5$includeOffset,
        _ref5$extendedZone = _ref5.extendedZone,
        extendedZone = _ref5$extendedZone === void 0 ? false : _ref5$extendedZone,
        _ref5$precision = _ref5.precision,
        precision = _ref5$precision === void 0 ? "milliseconds" : _ref5$precision;
      if (!this.isValid) {
        return null;
      }
      precision = normalizeUnit(precision);
      var ext = format === "extended";
      var c = _toISODate(this, ext, precision);
      if (orderedUnits.indexOf(precision) >= 3) c += "T";
      c += _toISOTime(this, ext, suppressSeconds, suppressMilliseconds, includeOffset, extendedZone, precision);
      return c;
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's date component
     * @param {Object} opts - options
     * @param {string} [opts.format='extended'] - choose between the basic and extended format
     * @param {string} [opts.precision='day'] - truncate output to desired precision: 'years', 'months', or 'days'.
     * @example DateTime.utc(1982, 5, 25).toISODate() //=> '1982-05-25'
     * @example DateTime.utc(1982, 5, 25).toISODate({ format: 'basic' }) //=> '19820525'
     * @example DateTime.utc(1982, 5, 25).toISODate({ precision: 'month' }) //=> '1982-05'
     * @return {string|null}
     */;
    _proto.toISODate = function toISODate(_temp5) {
      var _ref6 = _temp5 === void 0 ? {} : _temp5,
        _ref6$format = _ref6.format,
        format = _ref6$format === void 0 ? "extended" : _ref6$format,
        _ref6$precision = _ref6.precision,
        precision = _ref6$precision === void 0 ? "day" : _ref6$precision;
      if (!this.isValid) {
        return null;
      }
      return _toISODate(this, format === "extended", normalizeUnit(precision));
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's week date
     * @example DateTime.utc(1982, 5, 25).toISOWeekDate() //=> '1982-W21-2'
     * @return {string}
     */;
    _proto.toISOWeekDate = function toISOWeekDate() {
      return toTechFormat(this, "kkkk-'W'WW-c");
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's time component
     * @param {Object} opts - options
     * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
     * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @param {boolean} [opts.extendedZone=true] - add the time zone format extension
     * @param {boolean} [opts.includePrefix=false] - include the `T` prefix
     * @param {string} [opts.format='extended'] - choose between the basic and extended format
     * @param {string} [opts.precision='milliseconds'] - truncate output to desired presicion: 'hours', 'minutes', 'seconds' or 'milliseconds'. When precision and suppressSeconds or suppressMilliseconds are used together, precision sets the maximum unit shown in the output, however seconds or milliseconds will still be suppressed if they are 0.
     * @example DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime() //=> '07:34:19.361Z'
     * @example DateTime.utc().set({ hour: 7, minute: 34, seconds: 0, milliseconds: 0 }).toISOTime({ suppressSeconds: true }) //=> '07:34Z'
     * @example DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ format: 'basic' }) //=> '073419.361Z'
     * @example DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ includePrefix: true }) //=> 'T07:34:19.361Z'
     * @example DateTime.utc().set({ hour: 7, minute: 34, second: 56 }).toISOTime({ precision: 'minute' }) //=> '07:34Z'
     * @return {string}
     */;
    _proto.toISOTime = function toISOTime(_temp6) {
      var _ref7 = _temp6 === void 0 ? {} : _temp6,
        _ref7$suppressMillise = _ref7.suppressMilliseconds,
        suppressMilliseconds = _ref7$suppressMillise === void 0 ? false : _ref7$suppressMillise,
        _ref7$suppressSeconds = _ref7.suppressSeconds,
        suppressSeconds = _ref7$suppressSeconds === void 0 ? false : _ref7$suppressSeconds,
        _ref7$includeOffset = _ref7.includeOffset,
        includeOffset = _ref7$includeOffset === void 0 ? true : _ref7$includeOffset,
        _ref7$includePrefix = _ref7.includePrefix,
        includePrefix = _ref7$includePrefix === void 0 ? false : _ref7$includePrefix,
        _ref7$extendedZone = _ref7.extendedZone,
        extendedZone = _ref7$extendedZone === void 0 ? false : _ref7$extendedZone,
        _ref7$format = _ref7.format,
        format = _ref7$format === void 0 ? "extended" : _ref7$format,
        _ref7$precision = _ref7.precision,
        precision = _ref7$precision === void 0 ? "milliseconds" : _ref7$precision;
      if (!this.isValid) {
        return null;
      }
      precision = normalizeUnit(precision);
      var c = includePrefix && orderedUnits.indexOf(precision) >= 3 ? "T" : "";
      return c + _toISOTime(this, format === "extended", suppressSeconds, suppressMilliseconds, includeOffset, extendedZone, precision);
    }

    /**
     * Returns an RFC 2822-compatible string representation of this DateTime
     * @example DateTime.utc(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 +0000'
     * @example DateTime.local(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 -0400'
     * @return {string}
     */;
    _proto.toRFC2822 = function toRFC2822() {
      return toTechFormat(this, "EEE, dd LLL yyyy HH:mm:ss ZZZ", false);
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in HTTP headers. The output is always expressed in GMT.
     * Specifically, the string conforms to RFC 1123.
     * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
     * @example DateTime.utc(2014, 7, 13).toHTTP() //=> 'Sun, 13 Jul 2014 00:00:00 GMT'
     * @example DateTime.utc(2014, 7, 13, 19).toHTTP() //=> 'Sun, 13 Jul 2014 19:00:00 GMT'
     * @return {string}
     */;
    _proto.toHTTP = function toHTTP() {
      return toTechFormat(this.toUTC(), "EEE, dd LLL yyyy HH:mm:ss 'GMT'");
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Date
     * @example DateTime.utc(2014, 7, 13).toSQLDate() //=> '2014-07-13'
     * @return {string|null}
     */;
    _proto.toSQLDate = function toSQLDate() {
      if (!this.isValid) {
        return null;
      }
      return _toISODate(this, true);
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Time
     * @param {Object} opts - options
     * @param {boolean} [opts.includeZone=false] - include the zone, such as 'America/New_York'. Overrides includeOffset.
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @param {boolean} [opts.includeOffsetSpace=true] - include the space between the time and the offset, such as '05:15:16.345 -04:00'
     * @example DateTime.utc().toSQL() //=> '05:15:16.345'
     * @example DateTime.now().toSQL() //=> '05:15:16.345 -04:00'
     * @example DateTime.now().toSQL({ includeOffset: false }) //=> '05:15:16.345'
     * @example DateTime.now().toSQL({ includeZone: false }) //=> '05:15:16.345 America/New_York'
     * @return {string}
     */;
    _proto.toSQLTime = function toSQLTime(_temp7) {
      var _ref8 = _temp7 === void 0 ? {} : _temp7,
        _ref8$includeOffset = _ref8.includeOffset,
        includeOffset = _ref8$includeOffset === void 0 ? true : _ref8$includeOffset,
        _ref8$includeZone = _ref8.includeZone,
        includeZone = _ref8$includeZone === void 0 ? false : _ref8$includeZone,
        _ref8$includeOffsetSp = _ref8.includeOffsetSpace,
        includeOffsetSpace = _ref8$includeOffsetSp === void 0 ? true : _ref8$includeOffsetSp;
      var fmt = "HH:mm:ss.SSS";
      if (includeZone || includeOffset) {
        if (includeOffsetSpace) {
          fmt += " ";
        }
        if (includeZone) {
          fmt += "z";
        } else if (includeOffset) {
          fmt += "ZZ";
        }
      }
      return toTechFormat(this, fmt, true);
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL DateTime
     * @param {Object} opts - options
     * @param {boolean} [opts.includeZone=false] - include the zone, such as 'America/New_York'. Overrides includeOffset.
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @param {boolean} [opts.includeOffsetSpace=true] - include the space between the time and the offset, such as '05:15:16.345 -04:00'
     * @example DateTime.utc(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 Z'
     * @example DateTime.local(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 -04:00'
     * @example DateTime.local(2014, 7, 13).toSQL({ includeOffset: false }) //=> '2014-07-13 00:00:00.000'
     * @example DateTime.local(2014, 7, 13).toSQL({ includeZone: true }) //=> '2014-07-13 00:00:00.000 America/New_York'
     * @return {string}
     */;
    _proto.toSQL = function toSQL(opts) {
      if (opts === void 0) {
        opts = {};
      }
      if (!this.isValid) {
        return null;
      }
      return this.toSQLDate() + " " + this.toSQLTime(opts);
    }

    /**
     * Returns a string representation of this DateTime appropriate for debugging
     * @return {string}
     */;
    _proto.toString = function toString() {
      return this.isValid ? this.toISO() : INVALID;
    }

    /**
     * Returns a string representation of this DateTime appropriate for the REPL.
     * @return {string}
     */;
    _proto[_Symbol$for] = function () {
      if (this.isValid) {
        return "DateTime { ts: " + this.toISO() + ", zone: " + this.zone.name + ", locale: " + this.locale + " }";
      } else {
        return "DateTime { Invalid, reason: " + this.invalidReason + " }";
      }
    }

    /**
     * Returns the epoch milliseconds of this DateTime. Alias of {@link DateTime#toMillis}
     * @return {number}
     */;
    _proto.valueOf = function valueOf() {
      return this.toMillis();
    }

    /**
     * Returns the epoch milliseconds of this DateTime.
     * @return {number}
     */;
    _proto.toMillis = function toMillis() {
      return this.isValid ? this.ts : NaN;
    }

    /**
     * Returns the epoch seconds (including milliseconds in the fractional part) of this DateTime.
     * @return {number}
     */;
    _proto.toSeconds = function toSeconds() {
      return this.isValid ? this.ts / 1000 : NaN;
    }

    /**
     * Returns the epoch seconds (as a whole number) of this DateTime.
     * @return {number}
     */;
    _proto.toUnixInteger = function toUnixInteger() {
      return this.isValid ? Math.floor(this.ts / 1000) : NaN;
    }

    /**
     * Returns an ISO 8601 representation of this DateTime appropriate for use in JSON.
     * @return {string}
     */;
    _proto.toJSON = function toJSON() {
      return this.toISO();
    }

    /**
     * Returns a BSON serializable equivalent to this DateTime.
     * @return {Date}
     */;
    _proto.toBSON = function toBSON() {
      return this.toJSDate();
    }

    /**
     * Returns a JavaScript object with this DateTime's year, month, day, and so on.
     * @param opts - options for generating the object
     * @param {boolean} [opts.includeConfig=false] - include configuration attributes in the output
     * @example DateTime.now().toObject() //=> { year: 2017, month: 4, day: 22, hour: 20, minute: 49, second: 42, millisecond: 268 }
     * @return {Object}
     */;
    _proto.toObject = function toObject(opts) {
      if (opts === void 0) {
        opts = {};
      }
      if (!this.isValid) return {};
      var base = _extends({}, this.c);
      if (opts.includeConfig) {
        base.outputCalendar = this.outputCalendar;
        base.numberingSystem = this.loc.numberingSystem;
        base.locale = this.loc.locale;
      }
      return base;
    }

    /**
     * Returns a JavaScript Date equivalent to this DateTime.
     * @return {Date}
     */;
    _proto.toJSDate = function toJSDate() {
      return new Date(this.isValid ? this.ts : NaN);
    }

    // COMPARE

    /**
     * Return the difference between two DateTimes as a Duration.
     * @param {DateTime} otherDateTime - the DateTime to compare this one to
     * @param {string|string[]} [unit=['milliseconds']] - the unit or array of units (such as 'hours' or 'days') to include in the duration.
     * @param {Object} opts - options that affect the creation of the Duration
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @example
     * var i1 = DateTime.fromISO('1982-05-25T09:45'),
     *     i2 = DateTime.fromISO('1983-10-14T10:30');
     * i2.diff(i1).toObject() //=> { milliseconds: 43807500000 }
     * i2.diff(i1, 'hours').toObject() //=> { hours: 12168.75 }
     * i2.diff(i1, ['months', 'days']).toObject() //=> { months: 16, days: 19.03125 }
     * i2.diff(i1, ['months', 'days', 'hours']).toObject() //=> { months: 16, days: 19, hours: 0.75 }
     * @return {Duration}
     */;
    _proto.diff = function diff(otherDateTime, unit, opts) {
      if (unit === void 0) {
        unit = "milliseconds";
      }
      if (opts === void 0) {
        opts = {};
      }
      if (!this.isValid || !otherDateTime.isValid) {
        return Duration.invalid("created by diffing an invalid DateTime");
      }
      var durOpts = _extends({
        locale: this.locale,
        numberingSystem: this.numberingSystem
      }, opts);
      var units = maybeArray(unit).map(Duration.normalizeUnit),
        otherIsLater = otherDateTime.valueOf() > this.valueOf(),
        earlier = otherIsLater ? this : otherDateTime,
        later = otherIsLater ? otherDateTime : this,
        diffed = _diff(earlier, later, units, durOpts);
      return otherIsLater ? diffed.negate() : diffed;
    }

    /**
     * Return the difference between this DateTime and right now.
     * See {@link DateTime#diff}
     * @param {string|string[]} [unit=['milliseconds']] - the unit or units units (such as 'hours' or 'days') to include in the duration
     * @param {Object} opts - options that affect the creation of the Duration
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @return {Duration}
     */;
    _proto.diffNow = function diffNow(unit, opts) {
      if (unit === void 0) {
        unit = "milliseconds";
      }
      if (opts === void 0) {
        opts = {};
      }
      return this.diff(DateTime.now(), unit, opts);
    }

    /**
     * Return an Interval spanning between this DateTime and another DateTime
     * @param {DateTime} otherDateTime - the other end point of the Interval
     * @return {Interval|DateTime}
     */;
    _proto.until = function until(otherDateTime) {
      return this.isValid ? Interval.fromDateTimes(this, otherDateTime) : this;
    }

    /**
     * Return whether this DateTime is in the same unit of time as another DateTime.
     * Higher-order units must also be identical for this function to return `true`.
     * Note that time zones are **ignored** in this comparison, which compares the **local** calendar time. Use {@link DateTime#setZone} to convert one of the dates if needed.
     * @param {DateTime} otherDateTime - the other DateTime
     * @param {string} unit - the unit of time to check sameness on
     * @param {Object} opts - options
     * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week; only the locale of this DateTime is used
     * @example DateTime.now().hasSame(otherDT, 'day'); //~> true if otherDT is in the same current calendar day
     * @return {boolean}
     */;
    _proto.hasSame = function hasSame(otherDateTime, unit, opts) {
      if (!this.isValid) return false;
      var inputMs = otherDateTime.valueOf();
      var adjustedToZone = this.setZone(otherDateTime.zone, {
        keepLocalTime: true
      });
      return adjustedToZone.startOf(unit, opts) <= inputMs && inputMs <= adjustedToZone.endOf(unit, opts);
    }

    /**
     * Equality check
     * Two DateTimes are equal if and only if they represent the same millisecond, have the same zone and location, and are both valid.
     * To compare just the millisecond values, use `+dt1 === +dt2`.
     * @param {DateTime} other - the other DateTime
     * @return {boolean}
     */;
    _proto.equals = function equals(other) {
      return this.isValid && other.isValid && this.valueOf() === other.valueOf() && this.zone.equals(other.zone) && this.loc.equals(other.loc);
    }

    /**
     * Returns a string representation of a this time relative to now, such as "in two days". Can only internationalize if your
     * platform supports Intl.RelativeTimeFormat. Rounds towards zero by default.
     * @param {Object} options - options that affect the output
     * @param {DateTime} [options.base=DateTime.now()] - the DateTime to use as the basis to which this time is compared. Defaults to now.
     * @param {string} [options.style="long"] - the style of units, must be "long", "short", or "narrow"
     * @param {string|string[]} options.unit - use a specific unit or array of units; if omitted, or an array, the method will pick the best unit. Use an array or one of "years", "quarters", "months", "weeks", "days", "hours", "minutes", or "seconds"
     * @param {boolean} [options.round=true] - whether to round the numbers in the output.
     * @param {string} [options.rounding="trunc"] - rounding method to use when rounding the numbers in the output. Can be "trunc" (toward zero), "expand" (away from zero), "round", "floor", or "ceil".
     * @param {number} [options.padding=0] - padding in milliseconds. This allows you to round up the result if it fits inside the threshold. Don't use in combination with {round: false} because the decimal output will include the padding.
     * @param {string} options.locale - override the locale of this DateTime
     * @param {string} options.numberingSystem - override the numberingSystem of this DateTime. The Intl system may choose not to honor this
     * @example DateTime.now().plus({ days: 1 }).toRelative() //=> "in 1 day"
     * @example DateTime.now().setLocale("es").toRelative({ days: 1 }) //=> "dentro de 1 día"
     * @example DateTime.now().plus({ days: 1 }).toRelative({ locale: "fr" }) //=> "dans 23 heures"
     * @example DateTime.now().minus({ days: 2 }).toRelative() //=> "2 days ago"
     * @example DateTime.now().minus({ days: 2 }).toRelative({ unit: "hours" }) //=> "48 hours ago"
     * @example DateTime.now().minus({ hours: 36 }).toRelative({ round: false }) //=> "1.5 days ago"
     */;
    _proto.toRelative = function toRelative(options) {
      if (options === void 0) {
        options = {};
      }
      if (!this.isValid) return null;
      var base = options.base || DateTime.fromObject({}, {
          zone: this.zone
        }),
        padding = options.padding ? this < base ? -options.padding : options.padding : 0;
      var units = ["years", "months", "days", "hours", "minutes", "seconds"];
      var unit = options.unit;
      if (Array.isArray(options.unit)) {
        units = options.unit;
        unit = undefined;
      }
      return diffRelative(base, this.plus(padding), _extends({}, options, {
        numeric: "always",
        units: units,
        unit: unit
      }));
    }

    /**
     * Returns a string representation of this date relative to today, such as "yesterday" or "next month".
     * Only internationalizes on platforms that supports Intl.RelativeTimeFormat.
     * @param {Object} options - options that affect the output
     * @param {DateTime} [options.base=DateTime.now()] - the DateTime to use as the basis to which this time is compared. Defaults to now.
     * @param {string} options.locale - override the locale of this DateTime
     * @param {string} options.unit - use a specific unit; if omitted, the method will pick the unit. Use one of "years", "quarters", "months", "weeks", or "days"
     * @param {string} options.numberingSystem - override the numberingSystem of this DateTime. The Intl system may choose not to honor this
     * @example DateTime.now().plus({ days: 1 }).toRelativeCalendar() //=> "tomorrow"
     * @example DateTime.now().setLocale("es").plus({ days: 1 }).toRelative() //=> ""mañana"
     * @example DateTime.now().plus({ days: 1 }).toRelativeCalendar({ locale: "fr" }) //=> "demain"
     * @example DateTime.now().minus({ days: 2 }).toRelativeCalendar() //=> "2 days ago"
     */;
    _proto.toRelativeCalendar = function toRelativeCalendar(options) {
      if (options === void 0) {
        options = {};
      }
      if (!this.isValid) return null;
      return diffRelative(options.base || DateTime.fromObject({}, {
        zone: this.zone
      }), this, _extends({}, options, {
        numeric: "auto",
        units: ["years", "months", "days"],
        calendary: true
      }));
    }

    /**
     * Return the min of several date times
     * @param {...DateTime} dateTimes - the DateTimes from which to choose the minimum
     * @return {DateTime} the min DateTime, or undefined if called with no argument
     */;
    DateTime.min = function min() {
      for (var _len = arguments.length, dateTimes = new Array(_len), _key = 0; _key < _len; _key++) {
        dateTimes[_key] = arguments[_key];
      }
      if (!dateTimes.every(DateTime.isDateTime)) {
        throw new InvalidArgumentError("min requires all arguments be DateTimes");
      }
      return bestBy(dateTimes, function (i) {
        return i.valueOf();
      }, Math.min);
    }

    /**
     * Return the max of several date times
     * @param {...DateTime} dateTimes - the DateTimes from which to choose the maximum
     * @return {DateTime} the max DateTime, or undefined if called with no argument
     */;
    DateTime.max = function max() {
      for (var _len2 = arguments.length, dateTimes = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        dateTimes[_key2] = arguments[_key2];
      }
      if (!dateTimes.every(DateTime.isDateTime)) {
        throw new InvalidArgumentError("max requires all arguments be DateTimes");
      }
      return bestBy(dateTimes, function (i) {
        return i.valueOf();
      }, Math.max);
    }

    // MISC

    /**
     * Explain how a string would be parsed by fromFormat()
     * @param {string} text - the string to parse
     * @param {string} fmt - the format the string is expected to be in (see description)
     * @param {Object} options - options taken by fromFormat()
     * @return {Object}
     */;
    DateTime.fromFormatExplain = function fromFormatExplain(text, fmt, options) {
      if (options === void 0) {
        options = {};
      }
      var _options = options,
        _options$locale = _options.locale,
        locale = _options$locale === void 0 ? null : _options$locale,
        _options$numberingSys = _options.numberingSystem,
        numberingSystem = _options$numberingSys === void 0 ? null : _options$numberingSys,
        localeToUse = Locale.fromOpts({
          locale: locale,
          numberingSystem: numberingSystem,
          defaultToEN: true
        });
      return explainFromTokens(localeToUse, text, fmt);
    }

    /**
     * @deprecated use fromFormatExplain instead
     */;
    DateTime.fromStringExplain = function fromStringExplain(text, fmt, options) {
      if (options === void 0) {
        options = {};
      }
      return DateTime.fromFormatExplain(text, fmt, options);
    }

    /**
     * Build a parser for `fmt` using the given locale. This parser can be passed
     * to {@link DateTime.fromFormatParser} to a parse a date in this format. This
     * can be used to optimize cases where many dates need to be parsed in a
     * specific format.
     *
     * @param {String} fmt - the format the string is expected to be in (see
     * description)
     * @param {Object} options - options used to set locale and numberingSystem
     * for parser
     * @returns {TokenParser} - opaque object to be used
     */;
    DateTime.buildFormatParser = function buildFormatParser(fmt, options) {
      if (options === void 0) {
        options = {};
      }
      var _options2 = options,
        _options2$locale = _options2.locale,
        locale = _options2$locale === void 0 ? null : _options2$locale,
        _options2$numberingSy = _options2.numberingSystem,
        numberingSystem = _options2$numberingSy === void 0 ? null : _options2$numberingSy,
        localeToUse = Locale.fromOpts({
          locale: locale,
          numberingSystem: numberingSystem,
          defaultToEN: true
        });
      return new TokenParser(localeToUse, fmt);
    }

    /**
     * Create a DateTime from an input string and format parser.
     *
     * The format parser must have been created with the same locale as this call.
     *
     * @param {String} text - the string to parse
     * @param {TokenParser} formatParser - parser from {@link DateTime.buildFormatParser}
     * @param {Object} opts - options taken by fromFormat()
     * @returns {DateTime}
     */;
    DateTime.fromFormatParser = function fromFormatParser(text, formatParser, opts) {
      if (opts === void 0) {
        opts = {};
      }
      if (isUndefined(text) || isUndefined(formatParser)) {
        throw new InvalidArgumentError("fromFormatParser requires an input string and a format parser");
      }
      var _opts2 = opts,
        _opts2$locale = _opts2.locale,
        locale = _opts2$locale === void 0 ? null : _opts2$locale,
        _opts2$numberingSyste = _opts2.numberingSystem,
        numberingSystem = _opts2$numberingSyste === void 0 ? null : _opts2$numberingSyste,
        localeToUse = Locale.fromOpts({
          locale: locale,
          numberingSystem: numberingSystem,
          defaultToEN: true
        });
      if (!localeToUse.equals(formatParser.locale)) {
        throw new InvalidArgumentError("fromFormatParser called with a locale of " + localeToUse + ", " + ("but the format parser was created for " + formatParser.locale));
      }
      var _formatParser$explain = formatParser.explainFromTokens(text),
        result = _formatParser$explain.result,
        zone = _formatParser$explain.zone,
        specificOffset = _formatParser$explain.specificOffset,
        invalidReason = _formatParser$explain.invalidReason;
      if (invalidReason) {
        return DateTime.invalid(invalidReason);
      } else {
        return parseDataToDateTime(result, zone, opts, "format " + formatParser.format, text, specificOffset);
      }
    }

    // FORMAT PRESETS

    /**
     * {@link DateTime#toLocaleString} format like 10/14/1983
     * @type {Object}
     */;
    _createClass(DateTime, [{
      key: "isValid",
      get: function get() {
        return this.invalid === null;
      }

      /**
       * Returns an error code if this DateTime is invalid, or null if the DateTime is valid
       * @type {string}
       */
    }, {
      key: "invalidReason",
      get: function get() {
        return this.invalid ? this.invalid.reason : null;
      }

      /**
       * Returns an explanation of why this DateTime became invalid, or null if the DateTime is valid
       * @type {string}
       */
    }, {
      key: "invalidExplanation",
      get: function get() {
        return this.invalid ? this.invalid.explanation : null;
      }

      /**
       * Get the locale of a DateTime, such 'en-GB'. The locale is used when formatting the DateTime
       *
       * @type {string}
       */
    }, {
      key: "locale",
      get: function get() {
        return this.isValid ? this.loc.locale : null;
      }

      /**
       * Get the numbering system of a DateTime, such 'beng'. The numbering system is used when formatting the DateTime
       *
       * @type {string}
       */
    }, {
      key: "numberingSystem",
      get: function get() {
        return this.isValid ? this.loc.numberingSystem : null;
      }

      /**
       * Get the output calendar of a DateTime, such 'islamic'. The output calendar is used when formatting the DateTime
       *
       * @type {string}
       */
    }, {
      key: "outputCalendar",
      get: function get() {
        return this.isValid ? this.loc.outputCalendar : null;
      }

      /**
       * Get the time zone associated with this DateTime.
       * @type {Zone}
       */
    }, {
      key: "zone",
      get: function get() {
        return this._zone;
      }

      /**
       * Get the name of the time zone.
       * @type {string}
       */
    }, {
      key: "zoneName",
      get: function get() {
        return this.isValid ? this.zone.name : null;
      }

      /**
       * Get the year
       * @example DateTime.local(2017, 5, 25).year //=> 2017
       * @type {number}
       */
    }, {
      key: "year",
      get: function get() {
        return this.isValid ? this.c.year : NaN;
      }

      /**
       * Get the quarter
       * @example DateTime.local(2017, 5, 25).quarter //=> 2
       * @type {number}
       */
    }, {
      key: "quarter",
      get: function get() {
        return this.isValid ? Math.ceil(this.c.month / 3) : NaN;
      }

      /**
       * Get the month (1-12).
       * @example DateTime.local(2017, 5, 25).month //=> 5
       * @type {number}
       */
    }, {
      key: "month",
      get: function get() {
        return this.isValid ? this.c.month : NaN;
      }

      /**
       * Get the day of the month (1-30ish).
       * @example DateTime.local(2017, 5, 25).day //=> 25
       * @type {number}
       */
    }, {
      key: "day",
      get: function get() {
        return this.isValid ? this.c.day : NaN;
      }

      /**
       * Get the hour of the day (0-23).
       * @example DateTime.local(2017, 5, 25, 9).hour //=> 9
       * @type {number}
       */
    }, {
      key: "hour",
      get: function get() {
        return this.isValid ? this.c.hour : NaN;
      }

      /**
       * Get the minute of the hour (0-59).
       * @example DateTime.local(2017, 5, 25, 9, 30).minute //=> 30
       * @type {number}
       */
    }, {
      key: "minute",
      get: function get() {
        return this.isValid ? this.c.minute : NaN;
      }

      /**
       * Get the second of the minute (0-59).
       * @example DateTime.local(2017, 5, 25, 9, 30, 52).second //=> 52
       * @type {number}
       */
    }, {
      key: "second",
      get: function get() {
        return this.isValid ? this.c.second : NaN;
      }

      /**
       * Get the millisecond of the second (0-999).
       * @example DateTime.local(2017, 5, 25, 9, 30, 52, 654).millisecond //=> 654
       * @type {number}
       */
    }, {
      key: "millisecond",
      get: function get() {
        return this.isValid ? this.c.millisecond : NaN;
      }

      /**
       * Get the week year
       * @see https://en.wikipedia.org/wiki/ISO_week_date
       * @example DateTime.local(2014, 12, 31).weekYear //=> 2015
       * @type {number}
       */
    }, {
      key: "weekYear",
      get: function get() {
        return this.isValid ? possiblyCachedWeekData(this).weekYear : NaN;
      }

      /**
       * Get the week number of the week year (1-52ish).
       * @see https://en.wikipedia.org/wiki/ISO_week_date
       * @example DateTime.local(2017, 5, 25).weekNumber //=> 21
       * @type {number}
       */
    }, {
      key: "weekNumber",
      get: function get() {
        return this.isValid ? possiblyCachedWeekData(this).weekNumber : NaN;
      }

      /**
       * Get the day of the week.
       * 1 is Monday and 7 is Sunday
       * @see https://en.wikipedia.org/wiki/ISO_week_date
       * @example DateTime.local(2014, 11, 31).weekday //=> 4
       * @type {number}
       */
    }, {
      key: "weekday",
      get: function get() {
        return this.isValid ? possiblyCachedWeekData(this).weekday : NaN;
      }

      /**
       * Returns true if this date is on a weekend according to the locale, false otherwise
       * @returns {boolean}
       */
    }, {
      key: "isWeekend",
      get: function get() {
        return this.isValid && this.loc.getWeekendDays().includes(this.weekday);
      }

      /**
       * Get the day of the week according to the locale.
       * 1 is the first day of the week and 7 is the last day of the week.
       * If the locale assigns Sunday as the first day of the week, then a date which is a Sunday will return 1,
       * @returns {number}
       */
    }, {
      key: "localWeekday",
      get: function get() {
        return this.isValid ? possiblyCachedLocalWeekData(this).weekday : NaN;
      }

      /**
       * Get the week number of the week year according to the locale. Different locales assign week numbers differently,
       * because the week can start on different days of the week (see localWeekday) and because a different number of days
       * is required for a week to count as the first week of a year.
       * @returns {number}
       */
    }, {
      key: "localWeekNumber",
      get: function get() {
        return this.isValid ? possiblyCachedLocalWeekData(this).weekNumber : NaN;
      }

      /**
       * Get the week year according to the locale. Different locales assign week numbers (and therefor week years)
       * differently, see localWeekNumber.
       * @returns {number}
       */
    }, {
      key: "localWeekYear",
      get: function get() {
        return this.isValid ? possiblyCachedLocalWeekData(this).weekYear : NaN;
      }

      /**
       * Get the ordinal (meaning the day of the year)
       * @example DateTime.local(2017, 5, 25).ordinal //=> 145
       * @type {number|DateTime}
       */
    }, {
      key: "ordinal",
      get: function get() {
        return this.isValid ? gregorianToOrdinal(this.c).ordinal : NaN;
      }

      /**
       * Get the human readable short month name, such as 'Oct'.
       * Defaults to the system's locale if no locale has been specified
       * @example DateTime.local(2017, 10, 30).monthShort //=> Oct
       * @type {string}
       */
    }, {
      key: "monthShort",
      get: function get() {
        return this.isValid ? Info.months("short", {
          locObj: this.loc
        })[this.month - 1] : null;
      }

      /**
       * Get the human readable long month name, such as 'October'.
       * Defaults to the system's locale if no locale has been specified
       * @example DateTime.local(2017, 10, 30).monthLong //=> October
       * @type {string}
       */
    }, {
      key: "monthLong",
      get: function get() {
        return this.isValid ? Info.months("long", {
          locObj: this.loc
        })[this.month - 1] : null;
      }

      /**
       * Get the human readable short weekday, such as 'Mon'.
       * Defaults to the system's locale if no locale has been specified
       * @example DateTime.local(2017, 10, 30).weekdayShort //=> Mon
       * @type {string}
       */
    }, {
      key: "weekdayShort",
      get: function get() {
        return this.isValid ? Info.weekdays("short", {
          locObj: this.loc
        })[this.weekday - 1] : null;
      }

      /**
       * Get the human readable long weekday, such as 'Monday'.
       * Defaults to the system's locale if no locale has been specified
       * @example DateTime.local(2017, 10, 30).weekdayLong //=> Monday
       * @type {string}
       */
    }, {
      key: "weekdayLong",
      get: function get() {
        return this.isValid ? Info.weekdays("long", {
          locObj: this.loc
        })[this.weekday - 1] : null;
      }

      /**
       * Get the UTC offset of this DateTime in minutes
       * @example DateTime.now().offset //=> -240
       * @example DateTime.utc().offset //=> 0
       * @type {number}
       */
    }, {
      key: "offset",
      get: function get() {
        return this.isValid ? +this.o : NaN;
      }

      /**
       * Get the short human name for the zone's current offset, for example "EST" or "EDT".
       * Defaults to the system's locale if no locale has been specified
       * @type {string}
       */
    }, {
      key: "offsetNameShort",
      get: function get() {
        if (this.isValid) {
          return this.zone.offsetName(this.ts, {
            format: "short",
            locale: this.locale
          });
        } else {
          return null;
        }
      }

      /**
       * Get the long human name for the zone's current offset, for example "Eastern Standard Time" or "Eastern Daylight Time".
       * Defaults to the system's locale if no locale has been specified
       * @type {string}
       */
    }, {
      key: "offsetNameLong",
      get: function get() {
        if (this.isValid) {
          return this.zone.offsetName(this.ts, {
            format: "long",
            locale: this.locale
          });
        } else {
          return null;
        }
      }

      /**
       * Get whether this zone's offset ever changes, as in a DST.
       * @type {boolean}
       */
    }, {
      key: "isOffsetFixed",
      get: function get() {
        return this.isValid ? this.zone.isUniversal : null;
      }

      /**
       * Get whether the DateTime is in a DST.
       * @type {boolean}
       */
    }, {
      key: "isInDST",
      get: function get() {
        if (this.isOffsetFixed) {
          return false;
        } else {
          return this.offset > this.set({
            month: 1,
            day: 1
          }).offset || this.offset > this.set({
            month: 5
          }).offset;
        }
      }
    }, {
      key: "isInLeapYear",
      get: function get() {
        return isLeapYear(this.year);
      }

      /**
       * Returns the number of days in this DateTime's month
       * @example DateTime.local(2016, 2).daysInMonth //=> 29
       * @example DateTime.local(2016, 3).daysInMonth //=> 31
       * @type {number}
       */
    }, {
      key: "daysInMonth",
      get: function get() {
        return daysInMonth(this.year, this.month);
      }

      /**
       * Returns the number of days in this DateTime's year
       * @example DateTime.local(2016).daysInYear //=> 366
       * @example DateTime.local(2013).daysInYear //=> 365
       * @type {number}
       */
    }, {
      key: "daysInYear",
      get: function get() {
        return this.isValid ? daysInYear(this.year) : NaN;
      }

      /**
       * Returns the number of weeks in this DateTime's year
       * @see https://en.wikipedia.org/wiki/ISO_week_date
       * @example DateTime.local(2004).weeksInWeekYear //=> 53
       * @example DateTime.local(2013).weeksInWeekYear //=> 52
       * @type {number}
       */
    }, {
      key: "weeksInWeekYear",
      get: function get() {
        return this.isValid ? weeksInWeekYear(this.weekYear) : NaN;
      }

      /**
       * Returns the number of weeks in this DateTime's local week year
       * @example DateTime.local(2020, 6, {locale: 'en-US'}).weeksInLocalWeekYear //=> 52
       * @example DateTime.local(2020, 6, {locale: 'de-DE'}).weeksInLocalWeekYear //=> 53
       * @type {number}
       */
    }, {
      key: "weeksInLocalWeekYear",
      get: function get() {
        return this.isValid ? weeksInWeekYear(this.localWeekYear, this.loc.getMinDaysInFirstWeek(), this.loc.getStartOfWeek()) : NaN;
      }
    }], [{
      key: "DATE_SHORT",
      get: function get() {
        return DATE_SHORT;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Oct 14, 1983'
       * @type {Object}
       */
    }, {
      key: "DATE_MED",
      get: function get() {
        return DATE_MED;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Fri, Oct 14, 1983'
       * @type {Object}
       */
    }, {
      key: "DATE_MED_WITH_WEEKDAY",
      get: function get() {
        return DATE_MED_WITH_WEEKDAY;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'October 14, 1983'
       * @type {Object}
       */
    }, {
      key: "DATE_FULL",
      get: function get() {
        return DATE_FULL;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Tuesday, October 14, 1983'
       * @type {Object}
       */
    }, {
      key: "DATE_HUGE",
      get: function get() {
        return DATE_HUGE;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30 AM'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "TIME_SIMPLE",
      get: function get() {
        return TIME_SIMPLE;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30:23 AM'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "TIME_WITH_SECONDS",
      get: function get() {
        return TIME_WITH_SECONDS;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30:23 AM EDT'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "TIME_WITH_SHORT_OFFSET",
      get: function get() {
        return TIME_WITH_SHORT_OFFSET;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30:23 AM Eastern Daylight Time'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "TIME_WITH_LONG_OFFSET",
      get: function get() {
        return TIME_WITH_LONG_OFFSET;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30', always 24-hour.
       * @type {Object}
       */
    }, {
      key: "TIME_24_SIMPLE",
      get: function get() {
        return TIME_24_SIMPLE;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30:23', always 24-hour.
       * @type {Object}
       */
    }, {
      key: "TIME_24_WITH_SECONDS",
      get: function get() {
        return TIME_24_WITH_SECONDS;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30:23 EDT', always 24-hour.
       * @type {Object}
       */
    }, {
      key: "TIME_24_WITH_SHORT_OFFSET",
      get: function get() {
        return TIME_24_WITH_SHORT_OFFSET;
      }

      /**
       * {@link DateTime#toLocaleString} format like '09:30:23 Eastern Daylight Time', always 24-hour.
       * @type {Object}
       */
    }, {
      key: "TIME_24_WITH_LONG_OFFSET",
      get: function get() {
        return TIME_24_WITH_LONG_OFFSET;
      }

      /**
       * {@link DateTime#toLocaleString} format like '10/14/1983, 9:30 AM'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_SHORT",
      get: function get() {
        return DATETIME_SHORT;
      }

      /**
       * {@link DateTime#toLocaleString} format like '10/14/1983, 9:30:33 AM'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_SHORT_WITH_SECONDS",
      get: function get() {
        return DATETIME_SHORT_WITH_SECONDS;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Oct 14, 1983, 9:30 AM'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_MED",
      get: function get() {
        return DATETIME_MED;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Oct 14, 1983, 9:30:33 AM'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_MED_WITH_SECONDS",
      get: function get() {
        return DATETIME_MED_WITH_SECONDS;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Fri, 14 Oct 1983, 9:30 AM'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_MED_WITH_WEEKDAY",
      get: function get() {
        return DATETIME_MED_WITH_WEEKDAY;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'October 14, 1983, 9:30 AM EDT'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_FULL",
      get: function get() {
        return DATETIME_FULL;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'October 14, 1983, 9:30:33 AM EDT'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_FULL_WITH_SECONDS",
      get: function get() {
        return DATETIME_FULL_WITH_SECONDS;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Friday, October 14, 1983, 9:30 AM Eastern Daylight Time'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_HUGE",
      get: function get() {
        return DATETIME_HUGE;
      }

      /**
       * {@link DateTime#toLocaleString} format like 'Friday, October 14, 1983, 9:30:33 AM Eastern Daylight Time'. Only 12-hour if the locale is.
       * @type {Object}
       */
    }, {
      key: "DATETIME_HUGE_WITH_SECONDS",
      get: function get() {
        return DATETIME_HUGE_WITH_SECONDS;
      }
    }]);
    return DateTime;
  }(Symbol.for("nodejs.util.inspect.custom"));
  function friendlyDateTime(dateTimeish) {
    if (DateTime.isDateTime(dateTimeish)) {
      return dateTimeish;
    } else if (dateTimeish && dateTimeish.valueOf && isNumber(dateTimeish.valueOf())) {
      return DateTime.fromJSDate(dateTimeish);
    } else if (dateTimeish && typeof dateTimeish === "object") {
      return DateTime.fromObject(dateTimeish);
    } else {
      throw new InvalidArgumentError("Unknown datetime argument: " + dateTimeish + ", of type " + typeof dateTimeish);
    }
  }

  var VERSION = "3.7.2";

  exports.DateTime = DateTime;
  exports.Duration = Duration;
  exports.FixedOffsetZone = FixedOffsetZone;
  exports.IANAZone = IANAZone;
  exports.Info = Info;
  exports.Interval = Interval;
  exports.InvalidZone = InvalidZone;
  exports.Settings = Settings;
  exports.SystemZone = SystemZone;
  exports.VERSION = VERSION;
  exports.Zone = Zone;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
//# sourceMappingURL=luxon.js.map
