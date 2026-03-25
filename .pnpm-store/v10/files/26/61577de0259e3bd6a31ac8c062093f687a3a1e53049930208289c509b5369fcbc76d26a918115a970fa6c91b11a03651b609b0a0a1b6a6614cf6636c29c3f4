//! @version @js-joda/core - 5.6.1
//! @copyright (c) 2015-present, Philipp Thürwächter, Pattrick Hüper & js-joda contributors
//! @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
//! @license BSD-3-Clause (see LICENSE in the root directory of this source tree)

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

function createErrorType(name, init, superErrorClass) {
  if (superErrorClass === void 0) {
    superErrorClass = Error;
  }
  function JsJodaException(message) {
    if (!Error.captureStackTrace) {
      this.stack = new Error().stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
    this.message = message;
    init && init.apply(this, arguments);
    this.toString = function () {
      return this.name + ": " + this.message;
    };
  }
  JsJodaException.prototype = Object.create(superErrorClass.prototype);
  JsJodaException.prototype.name = name;
  JsJodaException.prototype.constructor = JsJodaException;
  return JsJodaException;
}
var DateTimeException = createErrorType('DateTimeException', messageWithCause);
var DateTimeParseException = createErrorType('DateTimeParseException', messageForDateTimeParseException);
var UnsupportedTemporalTypeException = createErrorType('UnsupportedTemporalTypeException', null, DateTimeException);
var ArithmeticException = createErrorType('ArithmeticException');
var IllegalArgumentException = createErrorType('IllegalArgumentException');
var IllegalStateException = createErrorType('IllegalStateException');
var NullPointerException = createErrorType('NullPointerException');
function messageWithCause(message, cause) {
  if (cause === void 0) {
    cause = null;
  }
  var msg = message || this.name;
  if (cause !== null && cause instanceof Error) {
    msg += "\n-------\nCaused by: " + cause.stack + "\n-------\n";
  }
  this.message = msg;
}
function messageForDateTimeParseException(message, text, index, cause) {
  if (text === void 0) {
    text = '';
  }
  if (index === void 0) {
    index = 0;
  }
  if (cause === void 0) {
    cause = null;
  }
  var msg = message || this.name;
  msg += ": " + text + ", at index: " + index;
  if (cause !== null && cause instanceof Error) {
    msg += "\n-------\nCaused by: " + cause.stack + "\n-------\n";
  }
  this.message = msg;
  this.parsedString = function () {
    return text;
  };
  this.errorIndex = function () {
    return index;
  };
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  _setPrototypeOf(subClass, superClass);
}
function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}
function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self;
}

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
function assert(assertion, msg, error) {
  if (!assertion) {
    if (error) {
      throw new error(msg);
    } else {
      throw new Error(msg);
    }
  }
}
function requireNonNull(value, parameterName) {
  if (value == null) {
    throw new NullPointerException(parameterName + " must not be null");
  }
  return value;
}
function requireInstance(value, _class, parameterName) {
  if (!(value instanceof _class)) {
    throw new IllegalArgumentException(parameterName + " must be an instance of " + (_class.name ? _class.name : _class) + (value && value.constructor && value.constructor.name ? ", but is " + value.constructor.name : ''));
  }
  return value;
}
function abstractMethodFail(methodName) {
  throw new TypeError("abstract method \"" + methodName + "\" is not implemented");
}

var assert$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    assert: assert,
    requireNonNull: requireNonNull,
    requireInstance: requireInstance,
    abstractMethodFail: abstractMethodFail
});

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var MAX_SAFE_INTEGER = 9007199254740991;
var MIN_SAFE_INTEGER = -9007199254740991;
var MathUtil = function () {
  function MathUtil() {}
  MathUtil.intDiv = function intDiv(x, y) {
    var r = x / y;
    r = MathUtil.roundDown(r);
    return MathUtil.safeZero(r);
  };
  MathUtil.intMod = function intMod(x, y) {
    var r = x - MathUtil.intDiv(x, y) * y;
    r = MathUtil.roundDown(r);
    return MathUtil.safeZero(r);
  };
  MathUtil.roundDown = function roundDown(r) {
    if (r < 0) {
      return Math.ceil(r);
    } else {
      return Math.floor(r);
    }
  };
  MathUtil.floorDiv = function floorDiv(x, y) {
    var r = Math.floor(x / y);
    return MathUtil.safeZero(r);
  };
  MathUtil.floorMod = function floorMod(x, y) {
    var r = x - MathUtil.floorDiv(x, y) * y;
    return MathUtil.safeZero(r);
  };
  MathUtil.safeAdd = function safeAdd(x, y) {
    MathUtil.verifyInt(x);
    MathUtil.verifyInt(y);
    if (x === 0) {
      return MathUtil.safeZero(y);
    }
    if (y === 0) {
      return MathUtil.safeZero(x);
    }
    var r = MathUtil.safeToInt(x + y);
    if (r === x || r === y) {
      throw new ArithmeticException('Invalid addition beyond MAX_SAFE_INTEGER!');
    }
    return r;
  };
  MathUtil.safeSubtract = function safeSubtract(x, y) {
    MathUtil.verifyInt(x);
    MathUtil.verifyInt(y);
    if (x === 0 && y === 0) {
      return 0;
    } else if (x === 0) {
      return MathUtil.safeZero(-1 * y);
    } else if (y === 0) {
      return MathUtil.safeZero(x);
    }
    return MathUtil.safeToInt(x - y);
  };
  MathUtil.safeMultiply = function safeMultiply(x, y) {
    MathUtil.verifyInt(x);
    MathUtil.verifyInt(y);
    if (x === 1) {
      return MathUtil.safeZero(y);
    }
    if (y === 1) {
      return MathUtil.safeZero(x);
    }
    if (x === 0 || y === 0) {
      return 0;
    }
    var r = MathUtil.safeToInt(x * y);
    if (r / y !== x || x === MIN_SAFE_INTEGER && y === -1 || y === MIN_SAFE_INTEGER && x === -1) {
      throw new ArithmeticException("Multiplication overflows: " + x + " * " + y);
    }
    return r;
  };
  MathUtil.parseInt = function (_parseInt) {
    function parseInt(_x) {
      return _parseInt.apply(this, arguments);
    }
    parseInt.toString = function () {
      return _parseInt.toString();
    };
    return parseInt;
  }(function (value) {
    var r = parseInt(value);
    return MathUtil.safeToInt(r);
  });
  MathUtil.safeToInt = function safeToInt(value) {
    MathUtil.verifyInt(value);
    return MathUtil.safeZero(value);
  };
  MathUtil.verifyInt = function verifyInt(value) {
    if (value == null) {
      throw new ArithmeticException("Invalid value: '" + value + "', using null or undefined as argument");
    }
    if (isNaN(value)) {
      throw new ArithmeticException('Invalid int value, using NaN as argument');
    }
    if (value % 1 !== 0) {
      throw new ArithmeticException("Invalid value: '" + value + "' is a float");
    }
    if (value > MAX_SAFE_INTEGER || value < MIN_SAFE_INTEGER) {
      throw new ArithmeticException("Calculation overflows an int: " + value);
    }
  };
  MathUtil.safeZero = function safeZero(value) {
    return value === 0 ? 0 : +value;
  };
  MathUtil.compareNumbers = function compareNumbers(a, b) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  };
  MathUtil.smi = function smi(int) {
    return int >>> 1 & 0x40000000 | int & 0xBFFFFFFF;
  };
  MathUtil.hash = function hash(number) {
    if (number !== number || number === Infinity) {
      return 0;
    }
    var result = number;
    while (number > 0xFFFFFFFF) {
      number /= 0xFFFFFFFF;
      result ^= number;
    }
    return MathUtil.smi(result);
  };
  MathUtil.hashCode = function hashCode() {
    var result = 17;
    for (var _len = arguments.length, numbers = new Array(_len), _key = 0; _key < _len; _key++) {
      numbers[_key] = arguments[_key];
    }
    for (var _i = 0, _numbers = numbers; _i < _numbers.length; _i++) {
      var n = _numbers[_i];
      result = (result << 5) - result + MathUtil.hash(n);
    }
    return MathUtil.hash(result);
  };
  return MathUtil;
}();
MathUtil.MAX_SAFE_INTEGER = MAX_SAFE_INTEGER;
MathUtil.MIN_SAFE_INTEGER = MIN_SAFE_INTEGER;

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */var Enum = function () {
  function Enum(name) {
    this._name = name;
  }
  var _proto = Enum.prototype;
  _proto.equals = function equals(other) {
    return this === other;
  };
  _proto.toString = function toString() {
    return this._name;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return Enum;
}();

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var TemporalAmount = function () {
  function TemporalAmount() {}
  var _proto = TemporalAmount.prototype;
  _proto.get = function get(unit) {
    abstractMethodFail('get');
  };
  _proto.units = function units() {
    abstractMethodFail('units');
  };
  _proto.addTo = function addTo(temporal) {
    abstractMethodFail('addTo');
  };
  _proto.subtractFrom = function subtractFrom(temporal) {
    abstractMethodFail('subtractFrom');
  };
  return TemporalAmount;
}();
if (typeof Symbol !== 'undefined' && Symbol.toPrimitive) {
  TemporalAmount.prototype[Symbol.toPrimitive] = function (hint) {
    if (hint !== 'number') {
      return this.toString();
    }
    throw new TypeError('A conversion from TemporalAmount to a number is not allowed. ' + 'To compare use the methods .equals(), .compareTo(), .isBefore() ' + 'or one that is more suitable to your use case.');
  };
}

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var TemporalUnit = function () {
  function TemporalUnit() {}
  var _proto = TemporalUnit.prototype;
  _proto.duration = function duration() {
    abstractMethodFail('duration');
  };
  _proto.isDurationEstimated = function isDurationEstimated() {
    abstractMethodFail('isDurationEstimated');
  };
  _proto.isDateBased = function isDateBased() {
    abstractMethodFail('isDateBased');
  };
  _proto.isTimeBased = function isTimeBased() {
    abstractMethodFail('isTimeBased');
  };
  _proto.isSupportedBy = function isSupportedBy(temporal) {
    abstractMethodFail('isSupportedBy');
  };
  _proto.addTo = function addTo(dateTime, periodToAdd) {
    abstractMethodFail('addTo');
  };
  _proto.between = function between(temporal1, temporal2) {
    abstractMethodFail('between');
  };
  return TemporalUnit;
}();

var Duration = function (_TemporalAmount) {
  _inheritsLoose(Duration, _TemporalAmount);
  function Duration(seconds, nanos) {
    var _this;
    _this = _TemporalAmount.call(this) || this;
    _this._seconds = MathUtil.safeToInt(seconds);
    _this._nanos = MathUtil.safeToInt(nanos);
    return _this;
  }
  Duration.ofDays = function ofDays(days) {
    return Duration._create(MathUtil.safeMultiply(days, LocalTime.SECONDS_PER_DAY), 0);
  };
  Duration.ofHours = function ofHours(hours) {
    return Duration._create(MathUtil.safeMultiply(hours, LocalTime.SECONDS_PER_HOUR), 0);
  };
  Duration.ofMinutes = function ofMinutes(minutes) {
    return Duration._create(MathUtil.safeMultiply(minutes, LocalTime.SECONDS_PER_MINUTE), 0);
  };
  Duration.ofSeconds = function ofSeconds(seconds, nanoAdjustment) {
    if (nanoAdjustment === void 0) {
      nanoAdjustment = 0;
    }
    var secs = MathUtil.safeAdd(seconds, MathUtil.floorDiv(nanoAdjustment, LocalTime.NANOS_PER_SECOND));
    var nos = MathUtil.floorMod(nanoAdjustment, LocalTime.NANOS_PER_SECOND);
    return Duration._create(secs, nos);
  };
  Duration.ofMillis = function ofMillis(millis) {
    var secs = MathUtil.intDiv(millis, 1000);
    var mos = MathUtil.intMod(millis, 1000);
    if (mos < 0) {
      mos += 1000;
      secs--;
    }
    return Duration._create(secs, mos * 1000000);
  };
  Duration.ofNanos = function ofNanos(nanos) {
    var secs = MathUtil.intDiv(nanos, LocalTime.NANOS_PER_SECOND);
    var nos = MathUtil.intMod(nanos, LocalTime.NANOS_PER_SECOND);
    if (nos < 0) {
      nos += LocalTime.NANOS_PER_SECOND;
      secs--;
    }
    return this._create(secs, nos);
  };
  Duration.of = function of(amount, unit) {
    return Duration.ZERO.plus(amount, unit);
  };
  Duration.from = function from(amount) {
    requireNonNull(amount, 'amount');
    requireInstance(amount, TemporalAmount);
    var duration = Duration.ZERO;
    amount.units().forEach(function (unit) {
      duration = duration.plus(amount.get(unit), unit);
    });
    return duration;
  };
  Duration.between = function between(startInclusive, endExclusive) {
    requireNonNull(startInclusive, 'startInclusive');
    requireNonNull(endExclusive, 'endExclusive');
    var secs = startInclusive.until(endExclusive, ChronoUnit.SECONDS);
    var nanos = 0;
    if (startInclusive.isSupported(ChronoField.NANO_OF_SECOND) && endExclusive.isSupported(ChronoField.NANO_OF_SECOND)) {
      try {
        var startNos = startInclusive.getLong(ChronoField.NANO_OF_SECOND);
        nanos = endExclusive.getLong(ChronoField.NANO_OF_SECOND) - startNos;
        if (secs > 0 && nanos < 0) {
          nanos += LocalTime.NANOS_PER_SECOND;
        } else if (secs < 0 && nanos > 0) {
          nanos -= LocalTime.NANOS_PER_SECOND;
        } else if (secs === 0 && nanos !== 0) {
          var adjustedEnd = endExclusive.with(ChronoField.NANO_OF_SECOND, startNos);
          secs = startInclusive.until(adjustedEnd, ChronoUnit.SECONDS);
        }
      } catch (e) {}
    }
    return this.ofSeconds(secs, nanos);
  };
  Duration.parse = function parse(text) {
    requireNonNull(text, 'text');
    var PATTERN = new RegExp('([-+]?)P(?:([-+]?[0-9]+)D)?(T(?:([-+]?[0-9]+)H)?(?:([-+]?[0-9]+)M)?(?:([-+]?[0-9]+)(?:[.,]([0-9]{0,9}))?S)?)?', 'i');
    var matches = PATTERN.exec(text);
    if (matches !== null) {
      if ('T' === matches[3] === false) {
        var negate = '-' === matches[1];
        var dayMatch = matches[2];
        var hourMatch = matches[4];
        var minuteMatch = matches[5];
        var secondMatch = matches[6];
        var fractionMatch = matches[7];
        if (dayMatch != null || hourMatch != null || minuteMatch != null || secondMatch != null) {
          var daysAsSecs = Duration._parseNumber(text, dayMatch, LocalTime.SECONDS_PER_DAY, 'days');
          var hoursAsSecs = Duration._parseNumber(text, hourMatch, LocalTime.SECONDS_PER_HOUR, 'hours');
          var minsAsSecs = Duration._parseNumber(text, minuteMatch, LocalTime.SECONDS_PER_MINUTE, 'minutes');
          var seconds = Duration._parseNumber(text, secondMatch, 1, 'seconds');
          var negativeSecs = secondMatch != null && secondMatch.charAt(0) === '-';
          var nanos = Duration._parseFraction(text, fractionMatch, negativeSecs ? -1 : 1);
          try {
            return Duration._create(negate, daysAsSecs, hoursAsSecs, minsAsSecs, seconds, nanos);
          } catch (ex) {
            throw new DateTimeParseException('Text cannot be parsed to a Duration: overflow', text, 0, ex);
          }
        }
      }
    }
    throw new DateTimeParseException('Text cannot be parsed to a Duration', text, 0);
  };
  Duration._parseNumber = function _parseNumber(text, parsed, multiplier, errorText) {
    if (parsed == null) {
      return 0;
    }
    try {
      if (parsed[0] === '+') {
        parsed = parsed.substring(1);
      }
      return MathUtil.safeMultiply(parseFloat(parsed), multiplier);
    } catch (ex) {
      throw new DateTimeParseException("Text cannot be parsed to a Duration: " + errorText, text, 0, ex);
    }
  };
  Duration._parseFraction = function _parseFraction(text, parsed, negate) {
    if (parsed == null || parsed.length === 0) {
      return 0;
    }
    parsed = (parsed + "000000000").substring(0, 9);
    return parseFloat(parsed) * negate;
  };
  Duration._create = function _create() {
    if (arguments.length <= 2) {
      return Duration._createSecondsNanos(arguments[0], arguments[1]);
    } else {
      return Duration._createNegateDaysHoursMinutesSecondsNanos(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
    }
  };
  Duration._createNegateDaysHoursMinutesSecondsNanos = function _createNegateDaysHoursMinutesSecondsNanos(negate, daysAsSecs, hoursAsSecs, minsAsSecs, secs, nanos) {
    var seconds = MathUtil.safeAdd(daysAsSecs, MathUtil.safeAdd(hoursAsSecs, MathUtil.safeAdd(minsAsSecs, secs)));
    if (negate) {
      return Duration.ofSeconds(seconds, nanos).negated();
    }
    return Duration.ofSeconds(seconds, nanos);
  };
  Duration._createSecondsNanos = function _createSecondsNanos(seconds, nanoAdjustment) {
    if (seconds === void 0) {
      seconds = 0;
    }
    if (nanoAdjustment === void 0) {
      nanoAdjustment = 0;
    }
    if (seconds === 0 && nanoAdjustment === 0) {
      return Duration.ZERO;
    }
    return new Duration(seconds, nanoAdjustment);
  };
  var _proto = Duration.prototype;
  _proto.get = function get(unit) {
    if (unit === ChronoUnit.SECONDS) {
      return this._seconds;
    } else if (unit === ChronoUnit.NANOS) {
      return this._nanos;
    } else {
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
  };
  _proto.units = function units() {
    return [ChronoUnit.SECONDS, ChronoUnit.NANOS];
  };
  _proto.isZero = function isZero() {
    return this._seconds === 0 && this._nanos === 0;
  };
  _proto.isNegative = function isNegative() {
    return this._seconds < 0;
  };
  _proto.seconds = function seconds() {
    return this._seconds;
  };
  _proto.nano = function nano() {
    return this._nanos;
  };
  _proto.withSeconds = function withSeconds(seconds) {
    return Duration._create(seconds, this._nanos);
  };
  _proto.withNanos = function withNanos(nanoOfSecond) {
    ChronoField.NANO_OF_SECOND.checkValidIntValue(nanoOfSecond);
    return Duration._create(this._seconds, nanoOfSecond);
  };
  _proto.plusDuration = function plusDuration(duration) {
    requireNonNull(duration, 'duration');
    return this.plus(duration.seconds(), duration.nano());
  };
  _proto.plus = function plus(durationOrNumber, unitOrNumber) {
    if (arguments.length === 1) {
      return this.plusDuration(durationOrNumber);
    } else if (arguments.length === 2 && unitOrNumber instanceof TemporalUnit) {
      return this.plusAmountUnit(durationOrNumber, unitOrNumber);
    } else {
      return this.plusSecondsNanos(durationOrNumber, unitOrNumber);
    }
  };
  _proto.plusAmountUnit = function plusAmountUnit(amountToAdd, unit) {
    requireNonNull(amountToAdd, 'amountToAdd');
    requireNonNull(unit, 'unit');
    if (unit === ChronoUnit.DAYS) {
      return this.plusSecondsNanos(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_DAY), 0);
    }
    if (unit.isDurationEstimated()) {
      throw new UnsupportedTemporalTypeException('Unit must not have an estimated duration');
    }
    if (amountToAdd === 0) {
      return this;
    }
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.NANOS:
          return this.plusNanos(amountToAdd);
        case ChronoUnit.MICROS:
          return this.plusSecondsNanos(MathUtil.intDiv(amountToAdd, 1000000 * 1000) * 1000, MathUtil.intMod(amountToAdd, 1000000 * 1000) * 1000);
        case ChronoUnit.MILLIS:
          return this.plusMillis(amountToAdd);
        case ChronoUnit.SECONDS:
          return this.plusSeconds(amountToAdd);
      }
      return this.plusSecondsNanos(MathUtil.safeMultiply(unit.duration().seconds(), amountToAdd), 0);
    }
    var duration = unit.duration().multipliedBy(amountToAdd);
    return this.plusSecondsNanos(duration.seconds(), duration.nano());
  };
  _proto.plusDays = function plusDays(daysToAdd) {
    return this.plusSecondsNanos(MathUtil.safeMultiply(daysToAdd, LocalTime.SECONDS_PER_DAY), 0);
  };
  _proto.plusHours = function plusHours(hoursToAdd) {
    return this.plusSecondsNanos(MathUtil.safeMultiply(hoursToAdd, LocalTime.SECONDS_PER_HOUR), 0);
  };
  _proto.plusMinutes = function plusMinutes(minutesToAdd) {
    return this.plusSecondsNanos(MathUtil.safeMultiply(minutesToAdd, LocalTime.SECONDS_PER_MINUTE), 0);
  };
  _proto.plusSeconds = function plusSeconds(secondsToAdd) {
    return this.plusSecondsNanos(secondsToAdd, 0);
  };
  _proto.plusMillis = function plusMillis(millisToAdd) {
    return this.plusSecondsNanos(MathUtil.intDiv(millisToAdd, 1000), MathUtil.intMod(millisToAdd, 1000) * 1000000);
  };
  _proto.plusNanos = function plusNanos(nanosToAdd) {
    return this.plusSecondsNanos(0, nanosToAdd);
  };
  _proto.plusSecondsNanos = function plusSecondsNanos(secondsToAdd, nanosToAdd) {
    requireNonNull(secondsToAdd, 'secondsToAdd');
    requireNonNull(nanosToAdd, 'nanosToAdd');
    if (secondsToAdd === 0 && nanosToAdd === 0) {
      return this;
    }
    var epochSec = MathUtil.safeAdd(this._seconds, secondsToAdd);
    epochSec = MathUtil.safeAdd(epochSec, MathUtil.intDiv(nanosToAdd, LocalTime.NANOS_PER_SECOND));
    nanosToAdd = MathUtil.intMod(nanosToAdd, LocalTime.NANOS_PER_SECOND);
    var nanoAdjustment = MathUtil.safeAdd(this._nanos, nanosToAdd);
    return Duration.ofSeconds(epochSec, nanoAdjustment);
  };
  _proto.minus = function minus(durationOrNumber, unit) {
    if (arguments.length === 1) {
      return this.minusDuration(durationOrNumber);
    } else {
      return this.minusAmountUnit(durationOrNumber, unit);
    }
  };
  _proto.minusDuration = function minusDuration(duration) {
    requireNonNull(duration, 'duration');
    var secsToSubtract = duration.seconds();
    var nanosToSubtract = duration.nano();
    if (secsToSubtract === MIN_SAFE_INTEGER) {
      return this.plus(MAX_SAFE_INTEGER, -nanosToSubtract);
    }
    return this.plus(-secsToSubtract, -nanosToSubtract);
  };
  _proto.minusAmountUnit = function minusAmountUnit(amountToSubtract, unit) {
    requireNonNull(amountToSubtract, 'amountToSubtract');
    requireNonNull(unit, 'unit');
    return amountToSubtract === MIN_SAFE_INTEGER ? this.plusAmountUnit(MAX_SAFE_INTEGER, unit) : this.plusAmountUnit(-amountToSubtract, unit);
  };
  _proto.minusDays = function minusDays(daysToSubtract) {
    return daysToSubtract === MIN_SAFE_INTEGER ? this.plusDays(MAX_SAFE_INTEGER) : this.plusDays(-daysToSubtract);
  };
  _proto.minusHours = function minusHours(hoursToSubtract) {
    return hoursToSubtract === MIN_SAFE_INTEGER ? this.plusHours(MAX_SAFE_INTEGER) : this.plusHours(-hoursToSubtract);
  };
  _proto.minusMinutes = function minusMinutes(minutesToSubtract) {
    return minutesToSubtract === MIN_SAFE_INTEGER ? this.plusMinutes(MAX_SAFE_INTEGER) : this.plusMinutes(-minutesToSubtract);
  };
  _proto.minusSeconds = function minusSeconds(secondsToSubtract) {
    return secondsToSubtract === MIN_SAFE_INTEGER ? this.plusSeconds(MAX_SAFE_INTEGER) : this.plusSeconds(-secondsToSubtract);
  };
  _proto.minusMillis = function minusMillis(millisToSubtract) {
    return millisToSubtract === MIN_SAFE_INTEGER ? this.plusMillis(MAX_SAFE_INTEGER) : this.plusMillis(-millisToSubtract);
  };
  _proto.minusNanos = function minusNanos(nanosToSubtract) {
    return nanosToSubtract === MIN_SAFE_INTEGER ? this.plusNanos(MAX_SAFE_INTEGER) : this.plusNanos(-nanosToSubtract);
  };
  _proto.multipliedBy = function multipliedBy(multiplicand) {
    if (multiplicand === 0) {
      return Duration.ZERO;
    }
    if (multiplicand === 1) {
      return this;
    }
    var secs = MathUtil.safeMultiply(this._seconds, multiplicand);
    var nos = MathUtil.safeMultiply(this._nanos, multiplicand);
    secs = secs + MathUtil.intDiv(nos, LocalTime.NANOS_PER_SECOND);
    nos = MathUtil.intMod(nos, LocalTime.NANOS_PER_SECOND);
    return Duration.ofSeconds(secs, nos);
  };
  _proto.dividedBy = function dividedBy(divisor) {
    if (divisor === 0) {
      throw new ArithmeticException('Cannot divide by zero');
    }
    if (divisor === 1) {
      return this;
    }
    var secs = MathUtil.intDiv(this._seconds, divisor);
    var secsMod = MathUtil.roundDown((this._seconds / divisor - secs) * LocalTime.NANOS_PER_SECOND);
    var nos = MathUtil.intDiv(this._nanos, divisor);
    nos = secsMod + nos;
    return Duration.ofSeconds(secs, nos);
  };
  _proto.negated = function negated() {
    return this.multipliedBy(-1);
  };
  _proto.abs = function abs() {
    return this.isNegative() ? this.negated() : this;
  };
  _proto.addTo = function addTo(temporal) {
    requireNonNull(temporal, 'temporal');
    if (this._seconds !== 0) {
      temporal = temporal.plus(this._seconds, ChronoUnit.SECONDS);
    }
    if (this._nanos !== 0) {
      temporal = temporal.plus(this._nanos, ChronoUnit.NANOS);
    }
    return temporal;
  };
  _proto.subtractFrom = function subtractFrom(temporal) {
    requireNonNull(temporal, 'temporal');
    if (this._seconds !== 0) {
      temporal = temporal.minus(this._seconds, ChronoUnit.SECONDS);
    }
    if (this._nanos !== 0) {
      temporal = temporal.minus(this._nanos, ChronoUnit.NANOS);
    }
    return temporal;
  };
  _proto.toDays = function toDays() {
    return MathUtil.intDiv(this._seconds, LocalTime.SECONDS_PER_DAY);
  };
  _proto.toHours = function toHours() {
    return MathUtil.intDiv(this._seconds, LocalTime.SECONDS_PER_HOUR);
  };
  _proto.toMinutes = function toMinutes() {
    return MathUtil.intDiv(this._seconds, LocalTime.SECONDS_PER_MINUTE);
  };
  _proto.toMillis = function toMillis() {
    var millis = Math.round(MathUtil.safeMultiply(this._seconds, 1000));
    millis = MathUtil.safeAdd(millis, MathUtil.intDiv(this._nanos, 1000000));
    return millis;
  };
  _proto.toNanos = function toNanos() {
    var totalNanos = MathUtil.safeMultiply(this._seconds, LocalTime.NANOS_PER_SECOND);
    totalNanos = MathUtil.safeAdd(totalNanos, this._nanos);
    return totalNanos;
  };
  _proto.compareTo = function compareTo(otherDuration) {
    requireNonNull(otherDuration, 'otherDuration');
    requireInstance(otherDuration, Duration, 'otherDuration');
    var cmp = MathUtil.compareNumbers(this._seconds, otherDuration.seconds());
    if (cmp !== 0) {
      return cmp;
    }
    return this._nanos - otherDuration.nano();
  };
  _proto.equals = function equals(otherDuration) {
    if (this === otherDuration) {
      return true;
    }
    if (otherDuration instanceof Duration) {
      return this.seconds() === otherDuration.seconds() && this.nano() === otherDuration.nano();
    }
    return false;
  };
  _proto.toString = function toString() {
    if (this === Duration.ZERO) {
      return 'PT0S';
    }
    var hours = MathUtil.intDiv(this._seconds, LocalTime.SECONDS_PER_HOUR);
    var minutes = MathUtil.intDiv(MathUtil.intMod(this._seconds, LocalTime.SECONDS_PER_HOUR), LocalTime.SECONDS_PER_MINUTE);
    var secs = MathUtil.intMod(this._seconds, LocalTime.SECONDS_PER_MINUTE);
    var rval = 'PT';
    if (hours !== 0) {
      rval += hours + "H";
    }
    if (minutes !== 0) {
      rval += minutes + "M";
    }
    if (secs === 0 && this._nanos === 0 && rval.length > 2) {
      return rval;
    }
    if (secs < 0 && this._nanos > 0) {
      if (secs === -1) {
        rval += '-0';
      } else {
        rval += secs + 1;
      }
    } else {
      rval += secs;
    }
    if (this._nanos > 0) {
      rval += '.';
      var nanoString;
      if (secs < 0) {
        nanoString = "" + (2 * LocalTime.NANOS_PER_SECOND - this._nanos);
      } else {
        nanoString = "" + (LocalTime.NANOS_PER_SECOND + this._nanos);
      }
      nanoString = nanoString.slice(1, nanoString.length);
      rval += nanoString;
      while (rval.charAt(rval.length - 1) === '0') {
        rval = rval.slice(0, rval.length - 1);
      }
    }
    rval += 'S';
    return rval;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return Duration;
}(TemporalAmount);
function _init$n() {
  Duration.ZERO = new Duration(0, 0);
}

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE.md in the root directory of this source tree)
 */var YearConstants = function YearConstants() {};
function _init$m() {
  YearConstants.MIN_VALUE = -999999;
  YearConstants.MAX_VALUE = 999999;
}

var ChronoUnit = function (_TemporalUnit) {
  _inheritsLoose(ChronoUnit, _TemporalUnit);
  function ChronoUnit(name, estimatedDuration) {
    var _this;
    _this = _TemporalUnit.call(this) || this;
    _this._name = name;
    _this._duration = estimatedDuration;
    return _this;
  }
  var _proto = ChronoUnit.prototype;
  _proto.duration = function duration() {
    return this._duration;
  };
  _proto.isDurationEstimated = function isDurationEstimated() {
    return this.isDateBased() || this === ChronoUnit.FOREVER;
  };
  _proto.isDateBased = function isDateBased() {
    return this.compareTo(ChronoUnit.DAYS) >= 0 && this !== ChronoUnit.FOREVER;
  };
  _proto.isTimeBased = function isTimeBased() {
    return this.compareTo(ChronoUnit.DAYS) < 0;
  };
  _proto.isSupportedBy = function isSupportedBy(temporal) {
    if (this === ChronoUnit.FOREVER) {
      return false;
    }
    try {
      temporal.plus(1, this);
      return true;
    } catch (e) {
      try {
        temporal.plus(-1, this);
        return true;
      } catch (e2) {
        return false;
      }
    }
  };
  _proto.addTo = function addTo(temporal, amount) {
    return temporal.plus(amount, this);
  };
  _proto.between = function between(temporal1, temporal2) {
    return temporal1.until(temporal2, this);
  };
  _proto.toString = function toString() {
    return this._name;
  };
  _proto.compareTo = function compareTo(other) {
    return this.duration().compareTo(other.duration());
  };
  return ChronoUnit;
}(TemporalUnit);
function _init$l() {
  ChronoUnit.NANOS = new ChronoUnit('Nanos', Duration.ofNanos(1));
  ChronoUnit.MICROS = new ChronoUnit('Micros', Duration.ofNanos(1000));
  ChronoUnit.MILLIS = new ChronoUnit('Millis', Duration.ofNanos(1000000));
  ChronoUnit.SECONDS = new ChronoUnit('Seconds', Duration.ofSeconds(1));
  ChronoUnit.MINUTES = new ChronoUnit('Minutes', Duration.ofSeconds(60));
  ChronoUnit.HOURS = new ChronoUnit('Hours', Duration.ofSeconds(3600));
  ChronoUnit.HALF_DAYS = new ChronoUnit('HalfDays', Duration.ofSeconds(43200));
  ChronoUnit.DAYS = new ChronoUnit('Days', Duration.ofSeconds(86400));
  ChronoUnit.WEEKS = new ChronoUnit('Weeks', Duration.ofSeconds(7 * 86400));
  ChronoUnit.MONTHS = new ChronoUnit('Months', Duration.ofSeconds(31556952 / 12));
  ChronoUnit.YEARS = new ChronoUnit('Years', Duration.ofSeconds(31556952));
  ChronoUnit.DECADES = new ChronoUnit('Decades', Duration.ofSeconds(31556952 * 10));
  ChronoUnit.CENTURIES = new ChronoUnit('Centuries', Duration.ofSeconds(31556952 * 100));
  ChronoUnit.MILLENNIA = new ChronoUnit('Millennia', Duration.ofSeconds(31556952 * 1000));
  ChronoUnit.ERAS = new ChronoUnit('Eras', Duration.ofSeconds(31556952 * (YearConstants.MAX_VALUE + 1)));
  ChronoUnit.FOREVER = new ChronoUnit('Forever', Duration.ofSeconds(MathUtil.MAX_SAFE_INTEGER, 999999999));
}

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var TemporalField = function () {
  function TemporalField() {}
  var _proto = TemporalField.prototype;
  _proto.isDateBased = function isDateBased() {
    abstractMethodFail('isDateBased');
  };
  _proto.isTimeBased = function isTimeBased() {
    abstractMethodFail('isTimeBased');
  };
  _proto.baseUnit = function baseUnit() {
    abstractMethodFail('baseUnit');
  };
  _proto.rangeUnit = function rangeUnit() {
    abstractMethodFail('rangeUnit');
  };
  _proto.range = function range() {
    abstractMethodFail('range');
  };
  _proto.rangeRefinedBy = function rangeRefinedBy(temporal) {
    abstractMethodFail('rangeRefinedBy');
  };
  _proto.getFrom = function getFrom(temporal) {
    abstractMethodFail('getFrom');
  };
  _proto.adjustInto = function adjustInto(temporal, newValue) {
    abstractMethodFail('adjustInto');
  };
  _proto.isSupportedBy = function isSupportedBy(temporal) {
    abstractMethodFail('isSupportedBy');
  };
  _proto.displayName = function displayName() {
    abstractMethodFail('displayName');
  };
  _proto.equals = function equals(other) {
    abstractMethodFail('equals');
  };
  _proto.name = function name() {
    abstractMethodFail('name');
  };
  return TemporalField;
}();

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var ValueRange = function () {
  function ValueRange(minSmallest, minLargest, maxSmallest, maxLargest) {
    assert(!(minSmallest > minLargest), "Smallest minimum value '" + minSmallest + "' must be less than largest minimum value '" + minLargest + "'", IllegalArgumentException);
    assert(!(maxSmallest > maxLargest), "Smallest maximum value '" + maxSmallest + "' must be less than largest maximum value '" + maxLargest + "'", IllegalArgumentException);
    assert(!(minLargest > maxLargest), "Minimum value '" + minLargest + "' must be less than maximum value '" + maxLargest + "'", IllegalArgumentException);
    this._minSmallest = minSmallest;
    this._minLargest = minLargest;
    this._maxLargest = maxLargest;
    this._maxSmallest = maxSmallest;
  }
  var _proto = ValueRange.prototype;
  _proto.isFixed = function isFixed() {
    return this._minSmallest === this._minLargest && this._maxSmallest === this._maxLargest;
  };
  _proto.minimum = function minimum() {
    return this._minSmallest;
  };
  _proto.largestMinimum = function largestMinimum() {
    return this._minLargest;
  };
  _proto.maximum = function maximum() {
    return this._maxLargest;
  };
  _proto.smallestMaximum = function smallestMaximum() {
    return this._maxSmallest;
  };
  _proto.isValidValue = function isValidValue(value) {
    return this.minimum() <= value && value <= this.maximum();
  };
  _proto.checkValidValue = function checkValidValue(value, field) {
    var msg;
    if (!this.isValidValue(value)) {
      if (field != null) {
        msg = "Invalid value for " + field + " (valid values " + this.toString() + "): " + value;
      } else {
        msg = "Invalid value (valid values " + this.toString() + "): " + value;
      }
      return assert(false, msg, DateTimeException);
    }
    return value;
  };
  _proto.checkValidIntValue = function checkValidIntValue(value, field) {
    if (this.isValidIntValue(value) === false) {
      throw new DateTimeException("Invalid int value for " + field + ": " + value);
    }
    return value;
  };
  _proto.isValidIntValue = function isValidIntValue(value) {
    return this.isIntValue() && this.isValidValue(value);
  };
  _proto.isIntValue = function isIntValue() {
    return this.minimum() >= MathUtil.MIN_SAFE_INTEGER && this.maximum() <= MathUtil.MAX_SAFE_INTEGER;
  };
  _proto.equals = function equals(other) {
    if (other === this) {
      return true;
    }
    if (other instanceof ValueRange) {
      return this._minSmallest === other._minSmallest && this._minLargest === other._minLargest && this._maxSmallest === other._maxSmallest && this._maxLargest === other._maxLargest;
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return MathUtil.hashCode(this._minSmallest, this._minLargest, this._maxSmallest, this._maxLargest);
  };
  _proto.toString = function toString() {
    var str = this.minimum() + (this.minimum() !== this.largestMinimum() ? "/" + this.largestMinimum() : '');
    str += ' - ';
    str += this.smallestMaximum() + (this.smallestMaximum() !== this.maximum() ? "/" + this.maximum() : '');
    return str;
  };
  ValueRange.of = function of() {
    if (arguments.length === 2) {
      return new ValueRange(arguments[0], arguments[0], arguments[1], arguments[1]);
    } else if (arguments.length === 3) {
      return new ValueRange(arguments[0], arguments[0], arguments[1], arguments[2]);
    } else if (arguments.length === 4) {
      return new ValueRange(arguments[0], arguments[1], arguments[2], arguments[3]);
    } else {
      return assert(false, "Invalid number of arguments " + arguments.length, IllegalArgumentException);
    }
  };
  return ValueRange;
}();

var ChronoField = function (_TemporalField) {
  _inheritsLoose(ChronoField, _TemporalField);
  ChronoField.byName = function byName(fieldName) {
    for (var prop in ChronoField) {
      if (ChronoField[prop]) {
        if (ChronoField[prop] instanceof ChronoField && ChronoField[prop].name() === fieldName) {
          return ChronoField[prop];
        }
      }
    }
  };
  function ChronoField(name, baseUnit, rangeUnit, range) {
    var _this;
    _this = _TemporalField.call(this) || this;
    _this._name = name;
    _this._baseUnit = baseUnit;
    _this._rangeUnit = rangeUnit;
    _this._range = range;
    return _this;
  }
  var _proto = ChronoField.prototype;
  _proto.name = function name() {
    return this._name;
  };
  _proto.baseUnit = function baseUnit() {
    return this._baseUnit;
  };
  _proto.rangeUnit = function rangeUnit() {
    return this._rangeUnit;
  };
  _proto.range = function range() {
    return this._range;
  };
  _proto.displayName = function displayName() {
    return this.toString();
  };
  _proto.checkValidValue = function checkValidValue(value) {
    return this.range().checkValidValue(value, this);
  };
  _proto.checkValidIntValue = function checkValidIntValue(value) {
    return this.range().checkValidIntValue(value, this);
  };
  _proto.isDateBased = function isDateBased() {
    var dateBased = this === ChronoField.DAY_OF_WEEK || this === ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH || this === ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR || this === ChronoField.DAY_OF_MONTH || this === ChronoField.DAY_OF_YEAR || this === ChronoField.EPOCH_DAY || this === ChronoField.ALIGNED_WEEK_OF_MONTH || this === ChronoField.ALIGNED_WEEK_OF_YEAR || this === ChronoField.MONTH_OF_YEAR || this === ChronoField.PROLEPTIC_MONTH || this === ChronoField.YEAR_OF_ERA || this === ChronoField.YEAR || this === ChronoField.ERA;
    return dateBased;
  };
  _proto.isTimeBased = function isTimeBased() {
    var timeBased = this === ChronoField.NANO_OF_SECOND || this === ChronoField.NANO_OF_DAY || this === ChronoField.MICRO_OF_SECOND || this === ChronoField.MICRO_OF_DAY || this === ChronoField.MILLI_OF_SECOND || this === ChronoField.MILLI_OF_DAY || this === ChronoField.SECOND_OF_MINUTE || this === ChronoField.SECOND_OF_DAY || this === ChronoField.MINUTE_OF_HOUR || this === ChronoField.MINUTE_OF_DAY || this === ChronoField.HOUR_OF_AMPM || this === ChronoField.CLOCK_HOUR_OF_AMPM || this === ChronoField.HOUR_OF_DAY || this === ChronoField.CLOCK_HOUR_OF_DAY || this === ChronoField.AMPM_OF_DAY;
    return timeBased;
  };
  _proto.rangeRefinedBy = function rangeRefinedBy(temporal) {
    return temporal.range(this);
  };
  _proto.getFrom = function getFrom(temporal) {
    return temporal.getLong(this);
  };
  _proto.toString = function toString() {
    return this.name();
  };
  _proto.equals = function equals(other) {
    return this === other;
  };
  _proto.adjustInto = function adjustInto(temporal, newValue) {
    return temporal.with(this, newValue);
  };
  _proto.isSupportedBy = function isSupportedBy(temporal) {
    return temporal.isSupported(this);
  };
  return ChronoField;
}(TemporalField);
function _init$k() {
  ChronoField.NANO_OF_SECOND = new ChronoField('NanoOfSecond', ChronoUnit.NANOS, ChronoUnit.SECONDS, ValueRange.of(0, 999999999));
  ChronoField.NANO_OF_DAY = new ChronoField('NanoOfDay', ChronoUnit.NANOS, ChronoUnit.DAYS, ValueRange.of(0, 86400 * 1000000000 - 1));
  ChronoField.MICRO_OF_SECOND = new ChronoField('MicroOfSecond', ChronoUnit.MICROS, ChronoUnit.SECONDS, ValueRange.of(0, 999999));
  ChronoField.MICRO_OF_DAY = new ChronoField('MicroOfDay', ChronoUnit.MICROS, ChronoUnit.DAYS, ValueRange.of(0, 86400 * 1000000 - 1));
  ChronoField.MILLI_OF_SECOND = new ChronoField('MilliOfSecond', ChronoUnit.MILLIS, ChronoUnit.SECONDS, ValueRange.of(0, 999));
  ChronoField.MILLI_OF_DAY = new ChronoField('MilliOfDay', ChronoUnit.MILLIS, ChronoUnit.DAYS, ValueRange.of(0, 86400 * 1000 - 1));
  ChronoField.SECOND_OF_MINUTE = new ChronoField('SecondOfMinute', ChronoUnit.SECONDS, ChronoUnit.MINUTES, ValueRange.of(0, 59));
  ChronoField.SECOND_OF_DAY = new ChronoField('SecondOfDay', ChronoUnit.SECONDS, ChronoUnit.DAYS, ValueRange.of(0, 86400 - 1));
  ChronoField.MINUTE_OF_HOUR = new ChronoField('MinuteOfHour', ChronoUnit.MINUTES, ChronoUnit.HOURS, ValueRange.of(0, 59));
  ChronoField.MINUTE_OF_DAY = new ChronoField('MinuteOfDay', ChronoUnit.MINUTES, ChronoUnit.DAYS, ValueRange.of(0, 24 * 60 - 1));
  ChronoField.HOUR_OF_AMPM = new ChronoField('HourOfAmPm', ChronoUnit.HOURS, ChronoUnit.HALF_DAYS, ValueRange.of(0, 11));
  ChronoField.CLOCK_HOUR_OF_AMPM = new ChronoField('ClockHourOfAmPm', ChronoUnit.HOURS, ChronoUnit.HALF_DAYS, ValueRange.of(1, 12));
  ChronoField.HOUR_OF_DAY = new ChronoField('HourOfDay', ChronoUnit.HOURS, ChronoUnit.DAYS, ValueRange.of(0, 23));
  ChronoField.CLOCK_HOUR_OF_DAY = new ChronoField('ClockHourOfDay', ChronoUnit.HOURS, ChronoUnit.DAYS, ValueRange.of(1, 24));
  ChronoField.AMPM_OF_DAY = new ChronoField('AmPmOfDay', ChronoUnit.HALF_DAYS, ChronoUnit.DAYS, ValueRange.of(0, 1));
  ChronoField.DAY_OF_WEEK = new ChronoField('DayOfWeek', ChronoUnit.DAYS, ChronoUnit.WEEKS, ValueRange.of(1, 7));
  ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH = new ChronoField('AlignedDayOfWeekInMonth', ChronoUnit.DAYS, ChronoUnit.WEEKS, ValueRange.of(1, 7));
  ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR = new ChronoField('AlignedDayOfWeekInYear', ChronoUnit.DAYS, ChronoUnit.WEEKS, ValueRange.of(1, 7));
  ChronoField.DAY_OF_MONTH = new ChronoField('DayOfMonth', ChronoUnit.DAYS, ChronoUnit.MONTHS, ValueRange.of(1, 28, 31), 'day');
  ChronoField.DAY_OF_YEAR = new ChronoField('DayOfYear', ChronoUnit.DAYS, ChronoUnit.YEARS, ValueRange.of(1, 365, 366));
  ChronoField.EPOCH_DAY = new ChronoField('EpochDay', ChronoUnit.DAYS, ChronoUnit.FOREVER, ValueRange.of(-365961662, 364522971));
  ChronoField.ALIGNED_WEEK_OF_MONTH = new ChronoField('AlignedWeekOfMonth', ChronoUnit.WEEKS, ChronoUnit.MONTHS, ValueRange.of(1, 4, 5));
  ChronoField.ALIGNED_WEEK_OF_YEAR = new ChronoField('AlignedWeekOfYear', ChronoUnit.WEEKS, ChronoUnit.YEARS, ValueRange.of(1, 53));
  ChronoField.MONTH_OF_YEAR = new ChronoField('MonthOfYear', ChronoUnit.MONTHS, ChronoUnit.YEARS, ValueRange.of(1, 12), 'month');
  ChronoField.PROLEPTIC_MONTH = new ChronoField('ProlepticMonth', ChronoUnit.MONTHS, ChronoUnit.FOREVER, ValueRange.of(YearConstants.MIN_VALUE * 12, YearConstants.MAX_VALUE * 12 + 11));
  ChronoField.YEAR_OF_ERA = new ChronoField('YearOfEra', ChronoUnit.YEARS, ChronoUnit.FOREVER, ValueRange.of(1, YearConstants.MAX_VALUE, YearConstants.MAX_VALUE + 1));
  ChronoField.YEAR = new ChronoField('Year', ChronoUnit.YEARS, ChronoUnit.FOREVER, ValueRange.of(YearConstants.MIN_VALUE, YearConstants.MAX_VALUE), 'year');
  ChronoField.ERA = new ChronoField('Era', ChronoUnit.ERAS, ChronoUnit.FOREVER, ValueRange.of(0, 1));
  ChronoField.INSTANT_SECONDS = new ChronoField('InstantSeconds', ChronoUnit.SECONDS, ChronoUnit.FOREVER, ValueRange.of(MIN_SAFE_INTEGER, MAX_SAFE_INTEGER));
  ChronoField.OFFSET_SECONDS = new ChronoField('OffsetSeconds', ChronoUnit.SECONDS, ChronoUnit.FOREVER, ValueRange.of(-18 * 3600, 18 * 3600));
}

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */var TemporalQueries = function () {
  function TemporalQueries() {}
  TemporalQueries.zoneId = function zoneId() {
    return TemporalQueries.ZONE_ID;
  };
  TemporalQueries.chronology = function chronology() {
    return TemporalQueries.CHRONO;
  };
  TemporalQueries.precision = function precision() {
    return TemporalQueries.PRECISION;
  };
  TemporalQueries.zone = function zone() {
    return TemporalQueries.ZONE;
  };
  TemporalQueries.offset = function offset() {
    return TemporalQueries.OFFSET;
  };
  TemporalQueries.localDate = function localDate() {
    return TemporalQueries.LOCAL_DATE;
  };
  TemporalQueries.localTime = function localTime() {
    return TemporalQueries.LOCAL_TIME;
  };
  return TemporalQueries;
}();

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var TemporalAccessor = function () {
  function TemporalAccessor() {}
  var _proto = TemporalAccessor.prototype;
  _proto.query = function query(_query) {
    if (_query === TemporalQueries.zoneId() || _query === TemporalQueries.chronology() || _query === TemporalQueries.precision()) {
      return null;
    }
    return _query.queryFrom(this);
  };
  _proto.get = function get(field) {
    return this.range(field).checkValidIntValue(this.getLong(field), field);
  };
  _proto.getLong = function getLong(field) {
    abstractMethodFail('getLong');
  };
  _proto.range = function range(field) {
    if (field instanceof ChronoField) {
      if (this.isSupported(field)) {
        return field.range();
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.rangeRefinedBy(this);
  };
  _proto.isSupported = function isSupported(field) {
    abstractMethodFail('isSupported');
  };
  return TemporalAccessor;
}();

var TemporalQuery = function (_Enum) {
  _inheritsLoose(TemporalQuery, _Enum);
  function TemporalQuery() {
    return _Enum.apply(this, arguments) || this;
  }
  var _proto = TemporalQuery.prototype;
  _proto.queryFrom = function queryFrom(temporal) {
    abstractMethodFail('queryFrom');
  };
  return TemporalQuery;
}(Enum);
function createTemporalQuery(name, queryFromFunction) {
  var ExtendedTemporalQuery = function (_TemporalQuery) {
    _inheritsLoose(ExtendedTemporalQuery, _TemporalQuery);
    function ExtendedTemporalQuery() {
      return _TemporalQuery.apply(this, arguments) || this;
    }
    return ExtendedTemporalQuery;
  }(TemporalQuery);
  ExtendedTemporalQuery.prototype.queryFrom = queryFromFunction;
  return new ExtendedTemporalQuery(name);
}

var DayOfWeek = function (_TemporalAccessor) {
  _inheritsLoose(DayOfWeek, _TemporalAccessor);
  function DayOfWeek(ordinal, name) {
    var _this;
    _this = _TemporalAccessor.call(this) || this;
    _this._ordinal = ordinal;
    _this._name = name;
    return _this;
  }
  var _proto = DayOfWeek.prototype;
  _proto.ordinal = function ordinal() {
    return this._ordinal;
  };
  _proto.name = function name() {
    return this._name;
  };
  DayOfWeek.values = function values() {
    return ENUMS.slice();
  };
  DayOfWeek.valueOf = function valueOf(name) {
    var ordinal = 0;
    for (ordinal; ordinal < ENUMS.length; ordinal++) {
      if (ENUMS[ordinal].name() === name) {
        break;
      }
    }
    return DayOfWeek.of(ordinal + 1);
  };
  DayOfWeek.of = function of(dayOfWeek) {
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      throw new DateTimeException("Invalid value for DayOfWeek: " + dayOfWeek);
    }
    return ENUMS[dayOfWeek - 1];
  };
  DayOfWeek.from = function from(temporal) {
    assert(temporal != null, 'temporal', NullPointerException);
    if (temporal instanceof DayOfWeek) {
      return temporal;
    }
    try {
      return DayOfWeek.of(temporal.get(ChronoField.DAY_OF_WEEK));
    } catch (ex) {
      if (ex instanceof DateTimeException) {
        throw new DateTimeException("Unable to obtain DayOfWeek from TemporalAccessor: " + temporal + ", type " + (temporal.constructor != null ? temporal.constructor.name : ''), ex);
      } else {
        throw ex;
      }
    }
  };
  _proto.value = function value() {
    return this._ordinal + 1;
  };
  _proto.displayName = function displayName(style, locale) {
    throw new IllegalArgumentException('Pattern using (localized) text not implemented yet!');
  };
  _proto.isSupported = function isSupported(field) {
    if (field instanceof ChronoField) {
      return field === ChronoField.DAY_OF_WEEK;
    }
    return field != null && field.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    if (field === ChronoField.DAY_OF_WEEK) {
      return field.range();
    } else if (field instanceof ChronoField) {
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.rangeRefinedBy(this);
  };
  _proto.get = function get(field) {
    if (field === ChronoField.DAY_OF_WEEK) {
      return this.value();
    }
    return this.range(field).checkValidIntValue(this.getLong(field), field);
  };
  _proto.getLong = function getLong(field) {
    if (field === ChronoField.DAY_OF_WEEK) {
      return this.value();
    } else if (field instanceof ChronoField) {
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.getFrom(this);
  };
  _proto.plus = function plus(days) {
    var amount = MathUtil.floorMod(days, 7);
    return ENUMS[MathUtil.floorMod(this._ordinal + (amount + 7), 7)];
  };
  _proto.minus = function minus(days) {
    return this.plus(-1 * MathUtil.floorMod(days, 7));
  };
  _proto.query = function query(_query) {
    if (_query === TemporalQueries.precision()) {
      return ChronoUnit.DAYS;
    } else if (_query === TemporalQueries.localDate() || _query === TemporalQueries.localTime() || _query === TemporalQueries.chronology() || _query === TemporalQueries.zone() || _query === TemporalQueries.zoneId() || _query === TemporalQueries.offset()) {
      return null;
    }
    assert(_query != null, 'query', NullPointerException);
    return _query.queryFrom(this);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    requireNonNull(temporal, 'temporal');
    return temporal.with(ChronoField.DAY_OF_WEEK, this.value());
  };
  _proto.equals = function equals(other) {
    return this === other;
  };
  _proto.toString = function toString() {
    return this._name;
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, DayOfWeek, 'other');
    return this._ordinal - other._ordinal;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return DayOfWeek;
}(TemporalAccessor);
var ENUMS;
function _init$j() {
  DayOfWeek.MONDAY = new DayOfWeek(0, 'MONDAY');
  DayOfWeek.TUESDAY = new DayOfWeek(1, 'TUESDAY');
  DayOfWeek.WEDNESDAY = new DayOfWeek(2, 'WEDNESDAY');
  DayOfWeek.THURSDAY = new DayOfWeek(3, 'THURSDAY');
  DayOfWeek.FRIDAY = new DayOfWeek(4, 'FRIDAY');
  DayOfWeek.SATURDAY = new DayOfWeek(5, 'SATURDAY');
  DayOfWeek.SUNDAY = new DayOfWeek(6, 'SUNDAY');
  DayOfWeek.FROM = createTemporalQuery('DayOfWeek.FROM', function (temporal) {
    return DayOfWeek.from(temporal);
  });
  ENUMS = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY];
}

var Month = function (_TemporalAccessor) {
  _inheritsLoose(Month, _TemporalAccessor);
  function Month(value, name) {
    var _this;
    _this = _TemporalAccessor.call(this) || this;
    _this._value = MathUtil.safeToInt(value);
    _this._name = name;
    return _this;
  }
  var _proto = Month.prototype;
  _proto.value = function value() {
    return this._value;
  };
  _proto.ordinal = function ordinal() {
    return this._value - 1;
  };
  _proto.name = function name() {
    return this._name;
  };
  _proto.displayName = function displayName(style, locale) {
    throw new IllegalArgumentException('Pattern using (localized) text not implemented yet!');
  };
  _proto.isSupported = function isSupported(field) {
    if (null === field) {
      return false;
    }
    if (field instanceof ChronoField) {
      return field === ChronoField.MONTH_OF_YEAR;
    }
    return field != null && field.isSupportedBy(this);
  };
  _proto.get = function get(field) {
    if (field === ChronoField.MONTH_OF_YEAR) {
      return this.value();
    }
    return this.range(field).checkValidIntValue(this.getLong(field), field);
  };
  _proto.getLong = function getLong(field) {
    if (field === ChronoField.MONTH_OF_YEAR) {
      return this.value();
    } else if (field instanceof ChronoField) {
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.getFrom(this);
  };
  _proto.plus = function plus(months) {
    var amount = MathUtil.intMod(months, 12) + 12;
    var newMonthVal = MathUtil.intMod(this.value() + amount, 12);
    newMonthVal = newMonthVal === 0 ? 12 : newMonthVal;
    return Month.of(newMonthVal);
  };
  _proto.minus = function minus(months) {
    return this.plus(-1 * MathUtil.intMod(months, 12));
  };
  _proto.length = function length(leapYear) {
    switch (this) {
      case Month.FEBRUARY:
        return leapYear ? 29 : 28;
      case Month.APRIL:
      case Month.JUNE:
      case Month.SEPTEMBER:
      case Month.NOVEMBER:
        return 30;
      default:
        return 31;
    }
  };
  _proto.minLength = function minLength() {
    switch (this) {
      case Month.FEBRUARY:
        return 28;
      case Month.APRIL:
      case Month.JUNE:
      case Month.SEPTEMBER:
      case Month.NOVEMBER:
        return 30;
      default:
        return 31;
    }
  };
  _proto.maxLength = function maxLength() {
    switch (this) {
      case Month.FEBRUARY:
        return 29;
      case Month.APRIL:
      case Month.JUNE:
      case Month.SEPTEMBER:
      case Month.NOVEMBER:
        return 30;
      default:
        return 31;
    }
  };
  _proto.firstDayOfYear = function firstDayOfYear(leapYear) {
    var leap = leapYear ? 1 : 0;
    switch (this) {
      case Month.JANUARY:
        return 1;
      case Month.FEBRUARY:
        return 32;
      case Month.MARCH:
        return 60 + leap;
      case Month.APRIL:
        return 91 + leap;
      case Month.MAY:
        return 121 + leap;
      case Month.JUNE:
        return 152 + leap;
      case Month.JULY:
        return 182 + leap;
      case Month.AUGUST:
        return 213 + leap;
      case Month.SEPTEMBER:
        return 244 + leap;
      case Month.OCTOBER:
        return 274 + leap;
      case Month.NOVEMBER:
        return 305 + leap;
      case Month.DECEMBER:
      default:
        return 335 + leap;
    }
  };
  _proto.firstMonthOfQuarter = function firstMonthOfQuarter() {
    switch (this) {
      case Month.JANUARY:
      case Month.FEBRUARY:
      case Month.MARCH:
        return Month.JANUARY;
      case Month.APRIL:
      case Month.MAY:
      case Month.JUNE:
        return Month.APRIL;
      case Month.JULY:
      case Month.AUGUST:
      case Month.SEPTEMBER:
        return Month.JULY;
      case Month.OCTOBER:
      case Month.NOVEMBER:
      case Month.DECEMBER:
      default:
        return Month.OCTOBER;
    }
  };
  _proto.query = function query(_query) {
    assert(_query != null, 'query() parameter must not be null', DateTimeException);
    if (_query === TemporalQueries.chronology()) {
      return IsoChronology.INSTANCE;
    } else if (_query === TemporalQueries.precision()) {
      return ChronoUnit.MONTHS;
    }
    return _TemporalAccessor.prototype.query.call(this, _query);
  };
  _proto.toString = function toString() {
    switch (this) {
      case Month.JANUARY:
        return 'JANUARY';
      case Month.FEBRUARY:
        return 'FEBRUARY';
      case Month.MARCH:
        return 'MARCH';
      case Month.APRIL:
        return 'APRIL';
      case Month.MAY:
        return 'MAY';
      case Month.JUNE:
        return 'JUNE';
      case Month.JULY:
        return 'JULY';
      case Month.AUGUST:
        return 'AUGUST';
      case Month.SEPTEMBER:
        return 'SEPTEMBER';
      case Month.OCTOBER:
        return 'OCTOBER';
      case Month.NOVEMBER:
        return 'NOVEMBER';
      case Month.DECEMBER:
        return 'DECEMBER';
      default:
        return "unknown Month, value: " + this.value();
    }
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.adjustInto = function adjustInto(temporal) {
    return temporal.with(ChronoField.MONTH_OF_YEAR, this.value());
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, Month, 'other');
    return this._value - other._value;
  };
  _proto.equals = function equals(other) {
    return this === other;
  };
  Month.valueOf = function valueOf(name) {
    var ordinal = 0;
    for (ordinal; ordinal < MONTHS.length; ordinal++) {
      if (MONTHS[ordinal].name() === name) {
        break;
      }
    }
    return Month.of(ordinal + 1);
  };
  Month.values = function values() {
    return MONTHS.slice();
  };
  Month.of = function of(month) {
    if (month < 1 || month > 12) {
      assert(false, "Invalid value for MonthOfYear: " + month, DateTimeException);
    }
    return MONTHS[month - 1];
  };
  Month.from = function from(temporal) {
    if (temporal instanceof Month) {
      return temporal;
    }
    try {
      return Month.of(temporal.get(ChronoField.MONTH_OF_YEAR));
    } catch (ex) {
      throw new DateTimeException("Unable to obtain Month from TemporalAccessor: " + temporal + " of type " + (temporal && temporal.constructor != null ? temporal.constructor.name : ''), ex);
    }
  };
  return Month;
}(TemporalAccessor);
var MONTHS;
function _init$i() {
  Month.JANUARY = new Month(1, 'JANUARY');
  Month.FEBRUARY = new Month(2, 'FEBRUARY');
  Month.MARCH = new Month(3, 'MARCH');
  Month.APRIL = new Month(4, 'APRIL');
  Month.MAY = new Month(5, 'MAY');
  Month.JUNE = new Month(6, 'JUNE');
  Month.JULY = new Month(7, 'JULY');
  Month.AUGUST = new Month(8, 'AUGUST');
  Month.SEPTEMBER = new Month(9, 'SEPTEMBER');
  Month.OCTOBER = new Month(10, 'OCTOBER');
  Month.NOVEMBER = new Month(11, 'NOVEMBER');
  Month.DECEMBER = new Month(12, 'DECEMBER');
  MONTHS = [Month.JANUARY, Month.FEBRUARY, Month.MARCH, Month.APRIL, Month.MAY, Month.JUNE, Month.JULY, Month.AUGUST, Month.SEPTEMBER, Month.OCTOBER, Month.NOVEMBER, Month.DECEMBER];
}

var PATTERN = /([-+]?)P(?:([-+]?[0-9]+)Y)?(?:([-+]?[0-9]+)M)?(?:([-+]?[0-9]+)W)?(?:([-+]?[0-9]+)D)?/;
var Period = function (_TemporalAmount) {
  _inheritsLoose(Period, _TemporalAmount);
  function Period(years, months, days) {
    var _this;
    _this = _TemporalAmount.call(this) || this;
    var _years = MathUtil.safeToInt(years);
    var _months = MathUtil.safeToInt(months);
    var _days = MathUtil.safeToInt(days);
    if (_years === 0 && _months === 0 && _days === 0) {
      if (!Period.ZERO) {
        _this._years = _years;
        _this._months = _months;
        _this._days = _days;
        Period.ZERO = _assertThisInitialized(_this);
      }
      return Period.ZERO || _assertThisInitialized(_this);
    }
    _this._years = _years;
    _this._months = _months;
    _this._days = _days;
    return _this;
  }
  Period.ofYears = function ofYears(years) {
    return Period.create(years, 0, 0);
  };
  Period.ofMonths = function ofMonths(months) {
    return Period.create(0, months, 0);
  };
  Period.ofWeeks = function ofWeeks(weeks) {
    return Period.create(0, 0, MathUtil.safeMultiply(weeks, 7));
  };
  Period.ofDays = function ofDays(days) {
    return Period.create(0, 0, days);
  };
  Period.of = function of(years, months, days) {
    return Period.create(years, months, days);
  };
  Period.from = function from(amount) {
    if (amount instanceof Period) {
      return amount;
    }
    requireNonNull(amount, 'amount');
    var years = 0;
    var months = 0;
    var days = 0;
    var units = amount.units();
    for (var i = 0; i < units.length; i++) {
      var unit = units[i];
      var unitAmount = amount.get(unit);
      if (unit === ChronoUnit.YEARS) {
        years = MathUtil.safeToInt(unitAmount);
      } else if (unit === ChronoUnit.MONTHS) {
        months = MathUtil.safeToInt(unitAmount);
      } else if (unit === ChronoUnit.DAYS) {
        days = MathUtil.safeToInt(unitAmount);
      } else {
        throw new DateTimeException("Unit must be Years, Months or Days, but was " + unit);
      }
    }
    return Period.create(years, months, days);
  };
  Period.between = function between(startDate, endDate) {
    requireNonNull(startDate, 'startDate');
    requireNonNull(endDate, 'endDate');
    requireInstance(startDate, LocalDate, 'startDate');
    requireInstance(endDate, LocalDate, 'endDate');
    return startDate.until(endDate);
  };
  Period.parse = function parse(text) {
    requireNonNull(text, 'text');
    try {
      return Period._parse(text);
    } catch (ex) {
      if (ex instanceof ArithmeticException) {
        throw new DateTimeParseException('Text cannot be parsed to a Period', text, 0, ex);
      } else {
        throw ex;
      }
    }
  };
  Period._parse = function _parse(text) {
    var matches = PATTERN.exec(text);
    if (matches != null) {
      var negate = '-' === matches[1] ? -1 : 1;
      var yearMatch = matches[2];
      var monthMatch = matches[3];
      var weekMatch = matches[4];
      var dayMatch = matches[5];
      if (yearMatch != null || monthMatch != null || weekMatch != null || dayMatch != null) {
        var years = Period._parseNumber(text, yearMatch, negate);
        var months = Period._parseNumber(text, monthMatch, negate);
        var weeks = Period._parseNumber(text, weekMatch, negate);
        var days = Period._parseNumber(text, dayMatch, negate);
        days = MathUtil.safeAdd(days, MathUtil.safeMultiply(weeks, 7));
        return Period.create(years, months, days);
      }
    }
    throw new DateTimeParseException('Text cannot be parsed to a Period', text, 0);
  };
  Period._parseNumber = function _parseNumber(text, str, negate) {
    if (str == null) {
      return 0;
    }
    var val = MathUtil.parseInt(str);
    return MathUtil.safeMultiply(val, negate);
  };
  Period.create = function create(years, months, days) {
    return new Period(years, months, days);
  };
  var _proto = Period.prototype;
  _proto.units = function units() {
    return [ChronoUnit.YEARS, ChronoUnit.MONTHS, ChronoUnit.DAYS];
  };
  _proto.chronology = function chronology() {
    return IsoChronology.INSTANCE;
  };
  _proto.get = function get(unit) {
    if (unit === ChronoUnit.YEARS) {
      return this._years;
    }
    if (unit === ChronoUnit.MONTHS) {
      return this._months;
    }
    if (unit === ChronoUnit.DAYS) {
      return this._days;
    }
    throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
  };
  _proto.isZero = function isZero() {
    return this === Period.ZERO;
  };
  _proto.isNegative = function isNegative() {
    return this._years < 0 || this._months < 0 || this._days < 0;
  };
  _proto.years = function years() {
    return this._years;
  };
  _proto.months = function months() {
    return this._months;
  };
  _proto.days = function days() {
    return this._days;
  };
  _proto.withYears = function withYears(years) {
    if (years === this._years) {
      return this;
    }
    return Period.create(years, this._months, this._days);
  };
  _proto.withMonths = function withMonths(months) {
    if (months === this._months) {
      return this;
    }
    return Period.create(this._years, months, this._days);
  };
  _proto.withDays = function withDays(days) {
    if (days === this._days) {
      return this;
    }
    return Period.create(this._years, this._months, days);
  };
  _proto.plus = function plus(amountToAdd) {
    var amount = Period.from(amountToAdd);
    return Period.create(MathUtil.safeAdd(this._years, amount._years), MathUtil.safeAdd(this._months, amount._months), MathUtil.safeAdd(this._days, amount._days));
  };
  _proto.plusYears = function plusYears(yearsToAdd) {
    if (yearsToAdd === 0) {
      return this;
    }
    return Period.create(MathUtil.safeToInt(MathUtil.safeAdd(this._years, yearsToAdd)), this._months, this._days);
  };
  _proto.plusMonths = function plusMonths(monthsToAdd) {
    if (monthsToAdd === 0) {
      return this;
    }
    return Period.create(this._years, MathUtil.safeToInt(MathUtil.safeAdd(this._months, monthsToAdd)), this._days);
  };
  _proto.plusDays = function plusDays(daysToAdd) {
    if (daysToAdd === 0) {
      return this;
    }
    return Period.create(this._years, this._months, MathUtil.safeToInt(MathUtil.safeAdd(this._days, daysToAdd)));
  };
  _proto.minus = function minus(amountToSubtract) {
    var amount = Period.from(amountToSubtract);
    return Period.create(MathUtil.safeSubtract(this._years, amount._years), MathUtil.safeSubtract(this._months, amount._months), MathUtil.safeSubtract(this._days, amount._days));
  };
  _proto.minusYears = function minusYears(yearsToSubtract) {
    return this.plusYears(-1 * yearsToSubtract);
  };
  _proto.minusMonths = function minusMonths(monthsToSubtract) {
    return this.plusMonths(-1 * monthsToSubtract);
  };
  _proto.minusDays = function minusDays(daysToSubtract) {
    return this.plusDays(-1 * daysToSubtract);
  };
  _proto.multipliedBy = function multipliedBy(scalar) {
    if (this === Period.ZERO || scalar === 1) {
      return this;
    }
    return Period.create(MathUtil.safeMultiply(this._years, scalar), MathUtil.safeMultiply(this._months, scalar), MathUtil.safeMultiply(this._days, scalar));
  };
  _proto.negated = function negated() {
    return this.multipliedBy(-1);
  };
  _proto.normalized = function normalized() {
    var totalMonths = this.toTotalMonths();
    var splitYears = MathUtil.intDiv(totalMonths, 12);
    var splitMonths = MathUtil.intMod(totalMonths, 12);
    if (splitYears === this._years && splitMonths === this._months) {
      return this;
    }
    return Period.create(MathUtil.safeToInt(splitYears), splitMonths, this._days);
  };
  _proto.toTotalMonths = function toTotalMonths() {
    return this._years * 12 + this._months;
  };
  _proto.addTo = function addTo(temporal) {
    requireNonNull(temporal, 'temporal');
    if (this._years !== 0) {
      if (this._months !== 0) {
        temporal = temporal.plus(this.toTotalMonths(), ChronoUnit.MONTHS);
      } else {
        temporal = temporal.plus(this._years, ChronoUnit.YEARS);
      }
    } else if (this._months !== 0) {
      temporal = temporal.plus(this._months, ChronoUnit.MONTHS);
    }
    if (this._days !== 0) {
      temporal = temporal.plus(this._days, ChronoUnit.DAYS);
    }
    return temporal;
  };
  _proto.subtractFrom = function subtractFrom(temporal) {
    requireNonNull(temporal, 'temporal');
    if (this._years !== 0) {
      if (this._months !== 0) {
        temporal = temporal.minus(this.toTotalMonths(), ChronoUnit.MONTHS);
      } else {
        temporal = temporal.minus(this._years, ChronoUnit.YEARS);
      }
    } else if (this._months !== 0) {
      temporal = temporal.minus(this._months, ChronoUnit.MONTHS);
    }
    if (this._days !== 0) {
      temporal = temporal.minus(this._days, ChronoUnit.DAYS);
    }
    return temporal;
  };
  _proto.equals = function equals(obj) {
    if (this === obj) {
      return true;
    }
    if (obj instanceof Period) {
      var other = obj;
      return this._years === other._years && this._months === other._months && this._days === other._days;
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return MathUtil.hashCode(this._years, this._months, this._days);
  };
  _proto.toString = function toString() {
    if (this === Period.ZERO) {
      return 'P0D';
    } else {
      var buf = 'P';
      if (this._years !== 0) {
        buf += this._years + "Y";
      }
      if (this._months !== 0) {
        buf += this._months + "M";
      }
      if (this._days !== 0) {
        buf += this._days + "D";
      }
      return buf;
    }
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return Period;
}(TemporalAmount);
function _init$h() {
  Period.ofDays(0);
}

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */var ParsePosition = function () {
  function ParsePosition(index) {
    this._index = index;
    this._errorIndex = -1;
  }
  var _proto = ParsePosition.prototype;
  _proto.getIndex = function getIndex() {
    return this._index;
  };
  _proto.setIndex = function setIndex(index) {
    this._index = index;
  };
  _proto.getErrorIndex = function getErrorIndex() {
    return this._errorIndex;
  };
  _proto.setErrorIndex = function setErrorIndex(errorIndex) {
    this._errorIndex = errorIndex;
  };
  return ParsePosition;
}();

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */var EnumMap = function () {
  function EnumMap() {
    this._map = {};
  }
  var _proto = EnumMap.prototype;
  _proto.putAll = function putAll(otherMap) {
    for (var key in otherMap._map) {
      this._map[key] = otherMap._map[key];
    }
    return this;
  };
  _proto.containsKey = function containsKey(key) {
    return this._map.hasOwnProperty(key.name()) && this.get(key) !== undefined;
  };
  _proto.get = function get(key) {
    return this._map[key.name()];
  };
  _proto.put = function put(key, val) {
    return this.set(key, val);
  };
  _proto.set = function set(key, val) {
    this._map[key.name()] = val;
    return this;
  };
  _proto.retainAll = function retainAll(keyList) {
    var map = {};
    for (var i = 0; i < keyList.length; i++) {
      var key = keyList[i].name();
      map[key] = this._map[key];
    }
    this._map = map;
    return this;
  };
  _proto.remove = function remove(key) {
    var keyName = key.name();
    var val = this._map[keyName];
    this._map[keyName] = undefined;
    return val;
  };
  _proto.keySet = function keySet() {
    return this._map;
  };
  _proto.clear = function clear() {
    this._map = {};
  };
  return EnumMap;
}();

var ResolverStyle = function (_Enum) {
  _inheritsLoose(ResolverStyle, _Enum);
  function ResolverStyle() {
    return _Enum.apply(this, arguments) || this;
  }
  return ResolverStyle;
}(Enum);
ResolverStyle.STRICT = new ResolverStyle('STRICT');
ResolverStyle.SMART = new ResolverStyle('SMART');
ResolverStyle.LENIENT = new ResolverStyle('LENIENT');

var Temporal = function (_TemporalAccessor) {
  _inheritsLoose(Temporal, _TemporalAccessor);
  function Temporal() {
    return _TemporalAccessor.apply(this, arguments) || this;
  }
  var _proto = Temporal.prototype;
  _proto.isSupported = function isSupported(fieldOrUnit) {
    abstractMethodFail('isSupported');
  };
  _proto.minus = function minus(amount, unit) {
    if (arguments.length < 2) {
      return this._minusAmount(amount);
    } else {
      return this._minusUnit(amount, unit);
    }
  };
  _proto._minusAmount = function _minusAmount(amount) {
    requireNonNull(amount, 'amount');
    requireInstance(amount, TemporalAmount, 'amount');
    return amount.subtractFrom(this);
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    requireNonNull(amountToSubtract, 'amountToSubtract');
    requireNonNull(unit, 'unit');
    requireInstance(unit, TemporalUnit, 'unit');
    return this._plusUnit(-amountToSubtract, unit);
  };
  _proto.plus = function plus(amount, unit) {
    if (arguments.length < 2) {
      return this._plusAmount(amount);
    } else {
      return this._plusUnit(amount, unit);
    }
  };
  _proto._plusAmount = function _plusAmount(amount) {
    requireNonNull(amount, 'amount');
    requireInstance(amount, TemporalAmount, 'amount');
    return amount.addTo(this);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    abstractMethodFail('_plusUnit');
  };
  _proto.until = function until(endTemporal, unit) {
    abstractMethodFail('until');
  };
  _proto.with = function _with(adjusterOrField, newValue) {
    if (arguments.length < 2) {
      return this._withAdjuster(adjusterOrField);
    } else {
      return this._withField(adjusterOrField, newValue);
    }
  };
  _proto._withAdjuster = function _withAdjuster(adjuster) {
    requireNonNull(adjuster, 'adjuster');
    assert(typeof adjuster.adjustInto === 'function', 'adjuster must be a TemporalAdjuster', IllegalArgumentException);
    return adjuster.adjustInto(this);
  };
  _proto._withField = function _withField(field, newValue) {
    abstractMethodFail('_withField');
  };
  return Temporal;
}(TemporalAccessor);
if (typeof Symbol !== 'undefined' && Symbol.toPrimitive) {
  Temporal.prototype[Symbol.toPrimitive] = function (hint) {
    if (hint !== 'number') {
      return this.toString();
    }
    throw new TypeError('A conversion from Temporal to a number is not allowed. ' + 'To compare use the methods .equals(), .compareTo(), .isBefore() ' + 'or one that is more suitable to your use case.');
  };
}

var ChronoLocalDate = function (_Temporal) {
  _inheritsLoose(ChronoLocalDate, _Temporal);
  function ChronoLocalDate() {
    return _Temporal.apply(this, arguments) || this;
  }
  var _proto = ChronoLocalDate.prototype;
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (fieldOrUnit instanceof ChronoField) {
      return fieldOrUnit.isDateBased();
    } else if (fieldOrUnit instanceof ChronoUnit) {
      return fieldOrUnit.isDateBased();
    }
    return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
  };
  _proto.query = function query(_query) {
    if (_query === TemporalQueries.chronology()) {
      return this.chronology();
    } else if (_query === TemporalQueries.precision()) {
      return ChronoUnit.DAYS;
    } else if (_query === TemporalQueries.localDate()) {
      return LocalDate.ofEpochDay(this.toEpochDay());
    } else if (_query === TemporalQueries.localTime() || _query === TemporalQueries.zone() || _query === TemporalQueries.zoneId() || _query === TemporalQueries.offset()) {
      return null;
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    return temporal.with(ChronoField.EPOCH_DAY, this.toEpochDay());
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    requireInstance(formatter, DateTimeFormatter, 'formatter');
    return formatter.format(this);
  };
  return ChronoLocalDate;
}(Temporal);

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var StringUtil = function () {
  function StringUtil() {}
  StringUtil.startsWith = function startsWith(text, pattern) {
    return text.indexOf(pattern) === 0;
  };
  StringUtil.hashCode = function hashCode(text) {
    var len = text.length;
    if (len === 0) {
      return 0;
    }
    var hash = 0;
    for (var i = 0; i < len; i++) {
      var chr = text.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return MathUtil.smi(hash);
  };
  return StringUtil;
}();

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var ZoneId = function () {
  function ZoneId() {}
  ZoneId.systemDefault = function systemDefault() {
    throw new DateTimeException('not supported operation');
  };
  ZoneId.getAvailableZoneIds = function getAvailableZoneIds() {
    throw new DateTimeException('not supported operation');
  };
  ZoneId.of = function of(zoneId) {
    throw new DateTimeException("not supported operation" + zoneId);
  };
  ZoneId.ofOffset = function ofOffset(prefix, offset) {
    throw new DateTimeException("not supported operation" + prefix + offset);
  };
  ZoneId.from = function from(temporal) {
    throw new DateTimeException("not supported operation" + temporal);
  };
  var _proto = ZoneId.prototype;
  _proto.id = function id() {
    abstractMethodFail('ZoneId.id');
  };
  _proto.rules = function rules() {
    abstractMethodFail('ZoneId.rules');
  };
  _proto.normalized = function normalized() {
    var rules = this.rules();
    if (rules.isFixedOffset()) {
      return rules.offset(Instant.EPOCH);
    }
    return this;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof ZoneId) {
      return this.id() === other.id();
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return StringUtil.hashCode(this.id());
  };
  _proto.toString = function toString() {
    return this.id();
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return ZoneId;
}();

var ZoneRules = function () {
  function ZoneRules() {}
  ZoneRules.of = function of(offset) {
    requireNonNull(offset, 'offset');
    return new Fixed(offset);
  };
  var _proto = ZoneRules.prototype;
  _proto.isFixedOffset = function isFixedOffset() {
    abstractMethodFail('ZoneRules.isFixedOffset');
  };
  _proto.offset = function offset(instantOrLocalDateTime) {
    if (instantOrLocalDateTime instanceof Instant) {
      return this.offsetOfInstant(instantOrLocalDateTime);
    } else {
      return this.offsetOfLocalDateTime(instantOrLocalDateTime);
    }
  };
  _proto.offsetOfInstant = function offsetOfInstant(instant) {
    abstractMethodFail('ZoneRules.offsetInstant');
  };
  _proto.offsetOfEpochMilli = function offsetOfEpochMilli(epochMilli) {
    abstractMethodFail('ZoneRules.offsetOfEpochMilli');
  };
  _proto.offsetOfLocalDateTime = function offsetOfLocalDateTime(localDateTime) {
    abstractMethodFail('ZoneRules.offsetLocalDateTime');
  };
  _proto.validOffsets = function validOffsets(localDateTime) {
    abstractMethodFail('ZoneRules.validOffsets');
  };
  _proto.transition = function transition(localDateTime) {
    abstractMethodFail('ZoneRules.transition');
  };
  _proto.standardOffset = function standardOffset(instant) {
    abstractMethodFail('ZoneRules.standardOffset');
  };
  _proto.daylightSavings = function daylightSavings(instant) {
    abstractMethodFail('ZoneRules.daylightSavings');
  };
  _proto.isDaylightSavings = function isDaylightSavings(instant) {
    abstractMethodFail('ZoneRules.isDaylightSavings');
  };
  _proto.isValidOffset = function isValidOffset(localDateTime, offset) {
    abstractMethodFail('ZoneRules.isValidOffset');
  };
  _proto.nextTransition = function nextTransition(instant) {
    abstractMethodFail('ZoneRules.nextTransition');
  };
  _proto.previousTransition = function previousTransition(instant) {
    abstractMethodFail('ZoneRules.previousTransition');
  };
  _proto.transitions = function transitions() {
    abstractMethodFail('ZoneRules.transitions');
  };
  _proto.transitionRules = function transitionRules() {
    abstractMethodFail('ZoneRules.transitionRules');
  };
  _proto.toString = function toString() {
    abstractMethodFail('ZoneRules.toString');
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return ZoneRules;
}();
var Fixed = function (_ZoneRules) {
  _inheritsLoose(Fixed, _ZoneRules);
  function Fixed(offset) {
    var _this;
    _this = _ZoneRules.call(this) || this;
    _this._offset = offset;
    return _this;
  }
  var _proto2 = Fixed.prototype;
  _proto2.isFixedOffset = function isFixedOffset() {
    return true;
  };
  _proto2.offsetOfInstant = function offsetOfInstant() {
    return this._offset;
  };
  _proto2.offsetOfEpochMilli = function offsetOfEpochMilli() {
    return this._offset;
  };
  _proto2.offsetOfLocalDateTime = function offsetOfLocalDateTime() {
    return this._offset;
  };
  _proto2.validOffsets = function validOffsets() {
    return [this._offset];
  };
  _proto2.transition = function transition() {
    return null;
  };
  _proto2.standardOffset = function standardOffset() {
    return this._offset;
  };
  _proto2.daylightSavings = function daylightSavings() {
    return Duration.ZERO;
  };
  _proto2.isDaylightSavings = function isDaylightSavings() {
    return false;
  };
  _proto2.isValidOffset = function isValidOffset(localDateTime, offset) {
    return this._offset.equals(offset);
  };
  _proto2.nextTransition = function nextTransition() {
    return null;
  };
  _proto2.previousTransition = function previousTransition() {
    return null;
  };
  _proto2.transitions = function transitions() {
    return [];
  };
  _proto2.transitionRules = function transitionRules() {
    return [];
  };
  _proto2.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof Fixed) {
      return this._offset.equals(other._offset);
    }
    return false;
  };
  _proto2.toString = function toString() {
    return "FixedRules:" + this._offset.toString();
  };
  return Fixed;
}(ZoneRules);

var SECONDS_CACHE = {};
var ID_CACHE = {};
var ZoneOffset = function (_ZoneId) {
  _inheritsLoose(ZoneOffset, _ZoneId);
  function ZoneOffset(totalSeconds) {
    var _this;
    _this = _ZoneId.call(this) || this;
    ZoneOffset._validateTotalSeconds(totalSeconds);
    _this._totalSeconds = MathUtil.safeToInt(totalSeconds);
    _this._rules = ZoneRules.of(_assertThisInitialized(_this));
    _this._id = ZoneOffset._buildId(totalSeconds);
    return _this;
  }
  var _proto = ZoneOffset.prototype;
  _proto.totalSeconds = function totalSeconds() {
    return this._totalSeconds;
  };
  _proto.id = function id() {
    return this._id;
  };
  ZoneOffset._buildId = function _buildId(totalSeconds) {
    if (totalSeconds === 0) {
      return 'Z';
    } else {
      var absTotalSeconds = Math.abs(totalSeconds);
      var absHours = MathUtil.intDiv(absTotalSeconds, LocalTime.SECONDS_PER_HOUR);
      var absMinutes = MathUtil.intMod(MathUtil.intDiv(absTotalSeconds, LocalTime.SECONDS_PER_MINUTE), LocalTime.MINUTES_PER_HOUR);
      var buf = "" + (totalSeconds < 0 ? '-' : '+') + (absHours < 10 ? '0' : '') + absHours + (absMinutes < 10 ? ':0' : ':') + absMinutes;
      var absSeconds = MathUtil.intMod(absTotalSeconds, LocalTime.SECONDS_PER_MINUTE);
      if (absSeconds !== 0) {
        buf += (absSeconds < 10 ? ':0' : ':') + absSeconds;
      }
      return buf;
    }
  };
  ZoneOffset._validateTotalSeconds = function _validateTotalSeconds(totalSeconds) {
    if (Math.abs(totalSeconds) > ZoneOffset.MAX_SECONDS) {
      throw new DateTimeException('Zone offset not in valid range: -18:00 to +18:00');
    }
  };
  ZoneOffset._validate = function _validate(hours, minutes, seconds) {
    if (hours < -18 || hours > 18) {
      throw new DateTimeException("Zone offset hours not in valid range: value " + hours + " is not in the range -18 to 18");
    }
    if (hours > 0) {
      if (minutes < 0 || seconds < 0) {
        throw new DateTimeException('Zone offset minutes and seconds must be positive because hours is positive');
      }
    } else if (hours < 0) {
      if (minutes > 0 || seconds > 0) {
        throw new DateTimeException('Zone offset minutes and seconds must be negative because hours is negative');
      }
    } else if (minutes > 0 && seconds < 0 || minutes < 0 && seconds > 0) {
      throw new DateTimeException('Zone offset minutes and seconds must have the same sign');
    }
    if (Math.abs(minutes) > 59) {
      throw new DateTimeException("Zone offset minutes not in valid range: abs(value) " + Math.abs(minutes) + " is not in the range 0 to 59");
    }
    if (Math.abs(seconds) > 59) {
      throw new DateTimeException("Zone offset seconds not in valid range: abs(value) " + Math.abs(seconds) + " is not in the range 0 to 59");
    }
    if (Math.abs(hours) === 18 && (Math.abs(minutes) > 0 || Math.abs(seconds) > 0)) {
      throw new DateTimeException('Zone offset not in valid range: -18:00 to +18:00');
    }
  };
  ZoneOffset.of = function of(offsetId) {
    requireNonNull(offsetId, 'offsetId');
    var offset = ID_CACHE[offsetId];
    if (offset != null) {
      return offset;
    }
    var hours, minutes, seconds;
    switch (offsetId.length) {
      case 2:
        offsetId = offsetId[0] + "0" + offsetId[1];
      case 3:
        hours = ZoneOffset._parseNumber(offsetId, 1, false);
        minutes = 0;
        seconds = 0;
        break;
      case 5:
        hours = ZoneOffset._parseNumber(offsetId, 1, false);
        minutes = ZoneOffset._parseNumber(offsetId, 3, false);
        seconds = 0;
        break;
      case 6:
        hours = ZoneOffset._parseNumber(offsetId, 1, false);
        minutes = ZoneOffset._parseNumber(offsetId, 4, true);
        seconds = 0;
        break;
      case 7:
        hours = ZoneOffset._parseNumber(offsetId, 1, false);
        minutes = ZoneOffset._parseNumber(offsetId, 3, false);
        seconds = ZoneOffset._parseNumber(offsetId, 5, false);
        break;
      case 9:
        hours = ZoneOffset._parseNumber(offsetId, 1, false);
        minutes = ZoneOffset._parseNumber(offsetId, 4, true);
        seconds = ZoneOffset._parseNumber(offsetId, 7, true);
        break;
      default:
        throw new DateTimeException("Invalid ID for ZoneOffset, invalid format: " + offsetId);
    }
    var first = offsetId[0];
    if (first !== '+' && first !== '-') {
      throw new DateTimeException("Invalid ID for ZoneOffset, plus/minus not found when expected: " + offsetId);
    }
    if (first === '-') {
      return ZoneOffset.ofHoursMinutesSeconds(-hours, -minutes, -seconds);
    } else {
      return ZoneOffset.ofHoursMinutesSeconds(hours, minutes, seconds);
    }
  };
  ZoneOffset._parseNumber = function _parseNumber(offsetId, pos, precededByColon) {
    if (precededByColon && offsetId[pos - 1] !== ':') {
      throw new DateTimeException("Invalid ID for ZoneOffset, colon not found when expected: " + offsetId);
    }
    var ch1 = offsetId[pos];
    var ch2 = offsetId[pos + 1];
    if (ch1 < '0' || ch1 > '9' || ch2 < '0' || ch2 > '9') {
      throw new DateTimeException("Invalid ID for ZoneOffset, non numeric characters found: " + offsetId);
    }
    return (ch1.charCodeAt(0) - 48) * 10 + (ch2.charCodeAt(0) - 48);
  };
  ZoneOffset.ofHours = function ofHours(hours) {
    return ZoneOffset.ofHoursMinutesSeconds(hours, 0, 0);
  };
  ZoneOffset.ofHoursMinutes = function ofHoursMinutes(hours, minutes) {
    return ZoneOffset.ofHoursMinutesSeconds(hours, minutes, 0);
  };
  ZoneOffset.ofHoursMinutesSeconds = function ofHoursMinutesSeconds(hours, minutes, seconds) {
    ZoneOffset._validate(hours, minutes, seconds);
    var totalSeconds = hours * LocalTime.SECONDS_PER_HOUR + minutes * LocalTime.SECONDS_PER_MINUTE + seconds;
    return ZoneOffset.ofTotalSeconds(totalSeconds);
  };
  ZoneOffset.ofTotalMinutes = function ofTotalMinutes(totalMinutes) {
    var totalSeconds = totalMinutes * LocalTime.SECONDS_PER_MINUTE;
    return ZoneOffset.ofTotalSeconds(totalSeconds);
  };
  ZoneOffset.ofTotalSeconds = function ofTotalSeconds(totalSeconds) {
    if (totalSeconds % (15 * LocalTime.SECONDS_PER_MINUTE) === 0) {
      var totalSecs = totalSeconds;
      var result = SECONDS_CACHE[totalSecs];
      if (result == null) {
        result = new ZoneOffset(totalSeconds);
        SECONDS_CACHE[totalSecs] = result;
        ID_CACHE[result.id()] = result;
      }
      return result;
    } else {
      return new ZoneOffset(totalSeconds);
    }
  };
  _proto.rules = function rules() {
    return this._rules;
  };
  _proto.get = function get(field) {
    return this.getLong(field);
  };
  _proto.getLong = function getLong(field) {
    if (field === ChronoField.OFFSET_SECONDS) {
      return this._totalSeconds;
    } else if (field instanceof ChronoField) {
      throw new DateTimeException("Unsupported field: " + field);
    }
    return field.getFrom(this);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    if (_query === TemporalQueries.offset() || _query === TemporalQueries.zone()) {
      return this;
    } else if (_query === TemporalQueries.localDate() || _query === TemporalQueries.localTime() || _query === TemporalQueries.precision() || _query === TemporalQueries.chronology() || _query === TemporalQueries.zoneId()) {
      return null;
    }
    return _query.queryFrom(this);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    return temporal.with(ChronoField.OFFSET_SECONDS, this._totalSeconds);
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    return other._totalSeconds - this._totalSeconds;
  };
  _proto.equals = function equals(obj) {
    if (this === obj) {
      return true;
    }
    if (obj instanceof ZoneOffset) {
      return this._totalSeconds === obj._totalSeconds;
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return this._totalSeconds;
  };
  _proto.toString = function toString() {
    return this._id;
  };
  return ZoneOffset;
}(ZoneId);
function _init$g() {
  ZoneOffset.MAX_SECONDS = 18 * LocalTime.SECONDS_PER_HOUR;
  ZoneOffset.UTC = ZoneOffset.ofTotalSeconds(0);
  ZoneOffset.MIN = ZoneOffset.ofTotalSeconds(-ZoneOffset.MAX_SECONDS);
  ZoneOffset.MAX = ZoneOffset.ofTotalSeconds(ZoneOffset.MAX_SECONDS);
}

var DateTimeBuilder = function (_TemporalAccessor) {
  _inheritsLoose(DateTimeBuilder, _TemporalAccessor);
  DateTimeBuilder.create = function create(field, value) {
    var dtb = new DateTimeBuilder();
    dtb._addFieldValue(field, value);
    return dtb;
  };
  function DateTimeBuilder() {
    var _this;
    _this = _TemporalAccessor.call(this) || this;
    _this.fieldValues = new EnumMap();
    _this.chrono = null;
    _this.zone = null;
    _this.date = null;
    _this.time = null;
    _this.leapSecond = false;
    _this.excessDays = null;
    return _this;
  }
  var _proto = DateTimeBuilder.prototype;
  _proto.getFieldValue0 = function getFieldValue0(field) {
    return this.fieldValues.get(field);
  };
  _proto._addFieldValue = function _addFieldValue(field, value) {
    requireNonNull(field, 'field');
    var old = this.getFieldValue0(field);
    if (old != null && old !== value) {
      throw new DateTimeException("Conflict found: " + field + " " + old + " differs from " + field + " " + value + ": " + this);
    }
    return this._putFieldValue0(field, value);
  };
  _proto._putFieldValue0 = function _putFieldValue0(field, value) {
    this.fieldValues.put(field, value);
    return this;
  };
  _proto.resolve = function resolve(resolverStyle, resolverFields) {
    if (resolverFields != null) {
      this.fieldValues.retainAll(resolverFields);
    }
    this._mergeDate(resolverStyle);
    this._mergeTime(resolverStyle);
    this._resolveTimeInferZeroes(resolverStyle);
    if (this.excessDays != null && this.excessDays.isZero() === false && this.date != null && this.time != null) {
      this.date = this.date.plus(this.excessDays);
      this.excessDays = Period.ZERO;
    }
    this._resolveInstant();
    return this;
  };
  _proto._mergeDate = function _mergeDate(resolverStyle) {
    this._checkDate(IsoChronology.INSTANCE.resolveDate(this.fieldValues, resolverStyle));
  };
  _proto._checkDate = function _checkDate(date) {
    if (date != null) {
      this._addObject(date);
      for (var fieldName in this.fieldValues.keySet()) {
        var field = ChronoField.byName(fieldName);
        if (field) {
          if (this.fieldValues.get(field) !== undefined) {
            if (field.isDateBased()) {
              var val1 = void 0;
              try {
                val1 = date.getLong(field);
              } catch (ex) {
                if (ex instanceof DateTimeException) {
                  continue;
                } else {
                  throw ex;
                }
              }
              var val2 = this.fieldValues.get(field);
              if (val1 !== val2) {
                throw new DateTimeException("Conflict found: Field " + field + " " + val1 + " differs from " + field + " " + val2 + " derived from " + date);
              }
            }
          }
        }
      }
    }
  };
  _proto._mergeTime = function _mergeTime(resolverStyle) {
    if (this.fieldValues.containsKey(ChronoField.CLOCK_HOUR_OF_DAY)) {
      var ch = this.fieldValues.remove(ChronoField.CLOCK_HOUR_OF_DAY);
      if (resolverStyle !== ResolverStyle.LENIENT) {
        if (resolverStyle === ResolverStyle.SMART && ch === 0) ; else {
          ChronoField.CLOCK_HOUR_OF_DAY.checkValidValue(ch);
        }
      }
      this._addFieldValue(ChronoField.HOUR_OF_DAY, ch === 24 ? 0 : ch);
    }
    if (this.fieldValues.containsKey(ChronoField.CLOCK_HOUR_OF_AMPM)) {
      var _ch = this.fieldValues.remove(ChronoField.CLOCK_HOUR_OF_AMPM);
      if (resolverStyle !== ResolverStyle.LENIENT) {
        if (resolverStyle === ResolverStyle.SMART && _ch === 0) ; else {
          ChronoField.CLOCK_HOUR_OF_AMPM.checkValidValue(_ch);
        }
      }
      this._addFieldValue(ChronoField.HOUR_OF_AMPM, _ch === 12 ? 0 : _ch);
    }
    if (resolverStyle !== ResolverStyle.LENIENT) {
      if (this.fieldValues.containsKey(ChronoField.AMPM_OF_DAY)) {
        ChronoField.AMPM_OF_DAY.checkValidValue(this.fieldValues.get(ChronoField.AMPM_OF_DAY));
      }
      if (this.fieldValues.containsKey(ChronoField.HOUR_OF_AMPM)) {
        ChronoField.HOUR_OF_AMPM.checkValidValue(this.fieldValues.get(ChronoField.HOUR_OF_AMPM));
      }
    }
    if (this.fieldValues.containsKey(ChronoField.AMPM_OF_DAY) && this.fieldValues.containsKey(ChronoField.HOUR_OF_AMPM)) {
      var ap = this.fieldValues.remove(ChronoField.AMPM_OF_DAY);
      var hap = this.fieldValues.remove(ChronoField.HOUR_OF_AMPM);
      this._addFieldValue(ChronoField.HOUR_OF_DAY, ap * 12 + hap);
    }
    if (this.fieldValues.containsKey(ChronoField.NANO_OF_DAY)) {
      var nod = this.fieldValues.remove(ChronoField.NANO_OF_DAY);
      if (resolverStyle !== ResolverStyle.LENIENT) {
        ChronoField.NANO_OF_DAY.checkValidValue(nod);
      }
      this._addFieldValue(ChronoField.SECOND_OF_DAY, MathUtil.intDiv(nod, 1000000000));
      this._addFieldValue(ChronoField.NANO_OF_SECOND, MathUtil.intMod(nod, 1000000000));
    }
    if (this.fieldValues.containsKey(ChronoField.MICRO_OF_DAY)) {
      var cod = this.fieldValues.remove(ChronoField.MICRO_OF_DAY);
      if (resolverStyle !== ResolverStyle.LENIENT) {
        ChronoField.MICRO_OF_DAY.checkValidValue(cod);
      }
      this._addFieldValue(ChronoField.SECOND_OF_DAY, MathUtil.intDiv(cod, 1000000));
      this._addFieldValue(ChronoField.MICRO_OF_SECOND, MathUtil.intMod(cod, 1000000));
    }
    if (this.fieldValues.containsKey(ChronoField.MILLI_OF_DAY)) {
      var lod = this.fieldValues.remove(ChronoField.MILLI_OF_DAY);
      if (resolverStyle !== ResolverStyle.LENIENT) {
        ChronoField.MILLI_OF_DAY.checkValidValue(lod);
      }
      this._addFieldValue(ChronoField.SECOND_OF_DAY, MathUtil.intDiv(lod, 1000));
      this._addFieldValue(ChronoField.MILLI_OF_SECOND, MathUtil.intMod(lod, 1000));
    }
    if (this.fieldValues.containsKey(ChronoField.SECOND_OF_DAY)) {
      var sod = this.fieldValues.remove(ChronoField.SECOND_OF_DAY);
      if (resolverStyle !== ResolverStyle.LENIENT) {
        ChronoField.SECOND_OF_DAY.checkValidValue(sod);
      }
      this._addFieldValue(ChronoField.HOUR_OF_DAY, MathUtil.intDiv(sod, 3600));
      this._addFieldValue(ChronoField.MINUTE_OF_HOUR, MathUtil.intMod(MathUtil.intDiv(sod, 60), 60));
      this._addFieldValue(ChronoField.SECOND_OF_MINUTE, MathUtil.intMod(sod, 60));
    }
    if (this.fieldValues.containsKey(ChronoField.MINUTE_OF_DAY)) {
      var mod = this.fieldValues.remove(ChronoField.MINUTE_OF_DAY);
      if (resolverStyle !== ResolverStyle.LENIENT) {
        ChronoField.MINUTE_OF_DAY.checkValidValue(mod);
      }
      this._addFieldValue(ChronoField.HOUR_OF_DAY, MathUtil.intDiv(mod, 60));
      this._addFieldValue(ChronoField.MINUTE_OF_HOUR, MathUtil.intMod(mod, 60));
    }
    if (resolverStyle !== ResolverStyle.LENIENT) {
      if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND)) {
        ChronoField.MILLI_OF_SECOND.checkValidValue(this.fieldValues.get(ChronoField.MILLI_OF_SECOND));
      }
      if (this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND)) {
        ChronoField.MICRO_OF_SECOND.checkValidValue(this.fieldValues.get(ChronoField.MICRO_OF_SECOND));
      }
    }
    if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND) && this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND)) {
      var los = this.fieldValues.remove(ChronoField.MILLI_OF_SECOND);
      var cos = this.fieldValues.get(ChronoField.MICRO_OF_SECOND);
      this._putFieldValue0(ChronoField.MICRO_OF_SECOND, los * 1000 + MathUtil.intMod(cos, 1000));
    }
    if (this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND) && this.fieldValues.containsKey(ChronoField.NANO_OF_SECOND)) {
      var nos = this.fieldValues.get(ChronoField.NANO_OF_SECOND);
      this._putFieldValue0(ChronoField.MICRO_OF_SECOND, MathUtil.intDiv(nos, 1000));
      this.fieldValues.remove(ChronoField.MICRO_OF_SECOND);
    }
    if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND) && this.fieldValues.containsKey(ChronoField.NANO_OF_SECOND)) {
      var _nos = this.fieldValues.get(ChronoField.NANO_OF_SECOND);
      this._putFieldValue0(ChronoField.MILLI_OF_SECOND, MathUtil.intDiv(_nos, 1000000));
      this.fieldValues.remove(ChronoField.MILLI_OF_SECOND);
    }
    if (this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND)) {
      var _cos = this.fieldValues.remove(ChronoField.MICRO_OF_SECOND);
      this._putFieldValue0(ChronoField.NANO_OF_SECOND, _cos * 1000);
    } else if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND)) {
      var _los = this.fieldValues.remove(ChronoField.MILLI_OF_SECOND);
      this._putFieldValue0(ChronoField.NANO_OF_SECOND, _los * 1000000);
    }
  };
  _proto._resolveTimeInferZeroes = function _resolveTimeInferZeroes(resolverStyle) {
    var hod = this.fieldValues.get(ChronoField.HOUR_OF_DAY);
    var moh = this.fieldValues.get(ChronoField.MINUTE_OF_HOUR);
    var som = this.fieldValues.get(ChronoField.SECOND_OF_MINUTE);
    var nos = this.fieldValues.get(ChronoField.NANO_OF_SECOND);
    if (hod == null) {
      return;
    }
    if (moh == null && (som != null || nos != null)) {
      return;
    }
    if (moh != null && som == null && nos != null) {
      return;
    }
    if (resolverStyle !== ResolverStyle.LENIENT) {
      if (hod != null) {
        if (resolverStyle === ResolverStyle.SMART && hod === 24 && (moh == null || moh === 0) && (som == null || som === 0) && (nos == null || nos === 0)) {
          hod = 0;
          this.excessDays = Period.ofDays(1);
        }
        var hodVal = ChronoField.HOUR_OF_DAY.checkValidIntValue(hod);
        if (moh != null) {
          var mohVal = ChronoField.MINUTE_OF_HOUR.checkValidIntValue(moh);
          if (som != null) {
            var somVal = ChronoField.SECOND_OF_MINUTE.checkValidIntValue(som);
            if (nos != null) {
              var nosVal = ChronoField.NANO_OF_SECOND.checkValidIntValue(nos);
              this._addObject(LocalTime.of(hodVal, mohVal, somVal, nosVal));
            } else {
              this._addObject(LocalTime.of(hodVal, mohVal, somVal));
            }
          } else {
            if (nos == null) {
              this._addObject(LocalTime.of(hodVal, mohVal));
            }
          }
        } else {
          if (som == null && nos == null) {
            this._addObject(LocalTime.of(hodVal, 0));
          }
        }
      }
    } else {
      if (hod != null) {
        var _hodVal = hod;
        if (moh != null) {
          if (som != null) {
            if (nos == null) {
              nos = 0;
            }
            var totalNanos = MathUtil.safeMultiply(_hodVal, 3600000000000);
            totalNanos = MathUtil.safeAdd(totalNanos, MathUtil.safeMultiply(moh, 60000000000));
            totalNanos = MathUtil.safeAdd(totalNanos, MathUtil.safeMultiply(som, 1000000000));
            totalNanos = MathUtil.safeAdd(totalNanos, nos);
            var excessDays = MathUtil.floorDiv(totalNanos, 86400000000000);
            var nod = MathUtil.floorMod(totalNanos, 86400000000000);
            this._addObject(LocalTime.ofNanoOfDay(nod));
            this.excessDays = Period.ofDays(excessDays);
          } else {
            var totalSecs = MathUtil.safeMultiply(_hodVal, 3600);
            totalSecs = MathUtil.safeAdd(totalSecs, MathUtil.safeMultiply(moh, 60));
            var _excessDays = MathUtil.floorDiv(totalSecs, 86400);
            var sod = MathUtil.floorMod(totalSecs, 86400);
            this._addObject(LocalTime.ofSecondOfDay(sod));
            this.excessDays = Period.ofDays(_excessDays);
          }
        } else {
          var _excessDays2 = MathUtil.safeToInt(MathUtil.floorDiv(_hodVal, 24));
          _hodVal = MathUtil.floorMod(_hodVal, 24);
          this._addObject(LocalTime.of(_hodVal, 0));
          this.excessDays = Period.ofDays(_excessDays2);
        }
      }
    }
    this.fieldValues.remove(ChronoField.HOUR_OF_DAY);
    this.fieldValues.remove(ChronoField.MINUTE_OF_HOUR);
    this.fieldValues.remove(ChronoField.SECOND_OF_MINUTE);
    this.fieldValues.remove(ChronoField.NANO_OF_SECOND);
  };
  _proto._addObject = function _addObject(dateOrTime) {
    if (dateOrTime instanceof ChronoLocalDate) {
      this.date = dateOrTime;
    } else if (dateOrTime instanceof LocalTime) {
      this.time = dateOrTime;
    }
  };
  _proto._resolveInstant = function _resolveInstant() {
    if (this.date != null && this.time != null) {
      var offsetSecs = this.fieldValues.get(ChronoField.OFFSET_SECONDS);
      if (offsetSecs != null) {
        var offset = ZoneOffset.ofTotalSeconds(offsetSecs);
        var instant = this.date.atTime(this.time).atZone(offset).getLong(ChronoField.INSTANT_SECONDS);
        this.fieldValues.put(ChronoField.INSTANT_SECONDS, instant);
      } else if (this.zone != null) {
        var _instant = this.date.atTime(this.time).atZone(this.zone).getLong(ChronoField.INSTANT_SECONDS);
        this.fieldValues.put(ChronoField.INSTANT_SECONDS, _instant);
      }
    }
  };
  _proto.build = function build(type) {
    return type.queryFrom(this);
  };
  _proto.isSupported = function isSupported(field) {
    if (field == null) {
      return false;
    }
    return this.fieldValues.containsKey(field) && this.fieldValues.get(field) !== undefined || this.date != null && this.date.isSupported(field) || this.time != null && this.time.isSupported(field);
  };
  _proto.getLong = function getLong(field) {
    requireNonNull(field, 'field');
    var value = this.getFieldValue0(field);
    if (value == null) {
      if (this.date != null && this.date.isSupported(field)) {
        return this.date.getLong(field);
      }
      if (this.time != null && this.time.isSupported(field)) {
        return this.time.getLong(field);
      }
      throw new DateTimeException("Field not found: " + field);
    }
    return value;
  };
  _proto.query = function query(_query) {
    if (_query === TemporalQueries.zoneId()) {
      return this.zone;
    } else if (_query === TemporalQueries.chronology()) {
      return this.chrono;
    } else if (_query === TemporalQueries.localDate()) {
      return this.date != null ? LocalDate.from(this.date) : null;
    } else if (_query === TemporalQueries.localTime()) {
      return this.time;
    } else if (_query === TemporalQueries.zone() || _query === TemporalQueries.offset()) {
      return _query.queryFrom(this);
    } else if (_query === TemporalQueries.precision()) {
      return null;
    }
    return _query.queryFrom(this);
  };
  return DateTimeBuilder;
}(TemporalAccessor);

var DateTimeParseContext = function () {
  function DateTimeParseContext() {
    if (arguments.length === 1) {
      if (arguments[0] instanceof DateTimeParseContext) {
        this._constructorSelf.apply(this, arguments);
        return;
      } else {
        this._constructorFormatter.apply(this, arguments);
      }
    } else {
      this._constructorParam.apply(this, arguments);
    }
    this._caseSensitive = true;
    this._strict = true;
    this._parsed = [new Parsed(this)];
  }
  var _proto = DateTimeParseContext.prototype;
  _proto._constructorParam = function _constructorParam(locale, symbols, chronology) {
    this._locale = locale;
    this._symbols = symbols;
    this._overrideChronology = chronology;
  };
  _proto._constructorFormatter = function _constructorFormatter(formatter) {
    this._locale = formatter.locale();
    this._symbols = formatter.decimalStyle();
    this._overrideChronology = formatter.chronology();
  };
  _proto._constructorSelf = function _constructorSelf(other) {
    this._locale = other._locale;
    this._symbols = other._symbols;
    this._overrideChronology = other._overrideChronology;
    this._overrideZone = other._overrideZone;
    this._caseSensitive = other._caseSensitive;
    this._strict = other._strict;
    this._parsed = [new Parsed(this)];
  };
  _proto.copy = function copy() {
    return new DateTimeParseContext(this);
  };
  _proto.symbols = function symbols() {
    return this._symbols;
  };
  _proto.isStrict = function isStrict() {
    return this._strict;
  };
  _proto.setStrict = function setStrict(strict) {
    this._strict = strict;
  };
  _proto.locale = function locale() {
    return this._locale;
  };
  _proto.setLocale = function setLocale(locale) {
    this._locale = locale;
  };
  _proto.startOptional = function startOptional() {
    this._parsed.push(this.currentParsed().copy());
  };
  _proto.endOptional = function endOptional(successful) {
    if (successful) {
      this._parsed.splice(this._parsed.length - 2, 1);
    } else {
      this._parsed.splice(this._parsed.length - 1, 1);
    }
  };
  _proto.isCaseSensitive = function isCaseSensitive() {
    return this._caseSensitive;
  };
  _proto.setCaseSensitive = function setCaseSensitive(caseSensitive) {
    this._caseSensitive = caseSensitive;
  };
  _proto.subSequenceEquals = function subSequenceEquals(cs1, offset1, cs2, offset2, length) {
    if (offset1 + length > cs1.length || offset2 + length > cs2.length) {
      return false;
    }
    if (!this.isCaseSensitive()) {
      cs1 = cs1.toLowerCase();
      cs2 = cs2.toLowerCase();
    }
    for (var i = 0; i < length; i++) {
      var ch1 = cs1[offset1 + i];
      var ch2 = cs2[offset2 + i];
      if (ch1 !== ch2) {
        return false;
      }
    }
    return true;
  };
  _proto.charEquals = function charEquals(ch1, ch2) {
    if (this.isCaseSensitive()) {
      return ch1 === ch2;
    }
    return this.charEqualsIgnoreCase(ch1, ch2);
  };
  _proto.charEqualsIgnoreCase = function charEqualsIgnoreCase(c1, c2) {
    return c1 === c2 || c1.toLowerCase() === c2.toLowerCase();
  };
  _proto.setParsedField = function setParsedField(field, value, errorPos, successPos) {
    var currentParsedFieldValues = this.currentParsed().fieldValues;
    var old = currentParsedFieldValues.get(field);
    currentParsedFieldValues.set(field, value);
    return old != null && old !== value ? ~errorPos : successPos;
  };
  _proto.setParsedZone = function setParsedZone(zone) {
    requireNonNull(zone, 'zone');
    this.currentParsed().zone = zone;
  };
  _proto.getParsed = function getParsed(field) {
    return this.currentParsed().fieldValues.get(field);
  };
  _proto.toParsed = function toParsed() {
    return this.currentParsed();
  };
  _proto.currentParsed = function currentParsed() {
    return this._parsed[this._parsed.length - 1];
  };
  _proto.setParsedLeapSecond = function setParsedLeapSecond() {
    this.currentParsed().leapSecond = true;
  };
  _proto.getEffectiveChronology = function getEffectiveChronology() {
    var chrono = this.currentParsed().chrono;
    if (chrono == null) {
      chrono = this._overrideChronology;
      if (chrono == null) {
        chrono = IsoChronology.INSTANCE;
      }
    }
    return chrono;
  };
  return DateTimeParseContext;
}();
var Parsed = function (_Temporal) {
  _inheritsLoose(Parsed, _Temporal);
  function Parsed(dateTimeParseContext) {
    var _this;
    _this = _Temporal.call(this) || this;
    _this.chrono = null;
    _this.zone = null;
    _this.fieldValues = new EnumMap();
    _this.leapSecond = false;
    _this.dateTimeParseContext = dateTimeParseContext;
    return _this;
  }
  var _proto2 = Parsed.prototype;
  _proto2.copy = function copy() {
    var cloned = new Parsed();
    cloned.chrono = this.chrono;
    cloned.zone = this.zone;
    cloned.fieldValues.putAll(this.fieldValues);
    cloned.leapSecond = this.leapSecond;
    cloned.dateTimeParseContext = this.dateTimeParseContext;
    return cloned;
  };
  _proto2.toString = function toString() {
    return this.fieldValues + ", " + this.chrono + ", " + this.zone;
  };
  _proto2.isSupported = function isSupported(field) {
    return this.fieldValues.containsKey(field);
  };
  _proto2.get = function get(field) {
    var val = this.fieldValues.get(field);
    assert(val != null);
    return val;
  };
  _proto2.query = function query(_query) {
    if (_query === TemporalQueries.chronology()) {
      return this.chrono;
    }
    if (_query === TemporalQueries.zoneId() || _query === TemporalQueries.zone()) {
      return this.zone;
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto2.toBuilder = function toBuilder() {
    var builder = new DateTimeBuilder();
    builder.fieldValues.putAll(this.fieldValues);
    builder.chrono = this.dateTimeParseContext.getEffectiveChronology();
    if (this.zone != null) {
      builder.zone = this.zone;
    } else {
      builder.zone = this.overrideZone;
    }
    builder.leapSecond = this.leapSecond;
    builder.excessDays = this.excessDays;
    return builder;
  };
  return Parsed;
}(Temporal);

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var DateTimePrintContext = function () {
  function DateTimePrintContext(temporal, localeOrFormatter, symbols) {
    if (arguments.length === 2 && arguments[1] instanceof DateTimeFormatter) {
      this._temporal = DateTimePrintContext.adjust(temporal, localeOrFormatter);
      this._locale = localeOrFormatter.locale();
      this._symbols = localeOrFormatter.decimalStyle();
    } else {
      this._temporal = temporal;
      this._locale = localeOrFormatter;
      this._symbols = symbols;
    }
    this._optional = 0;
  }
  DateTimePrintContext.adjust = function adjust(temporal, formatter) {
    return temporal;
  };
  var _proto = DateTimePrintContext.prototype;
  _proto.symbols = function symbols() {
    return this._symbols;
  };
  _proto.startOptional = function startOptional() {
    this._optional++;
  };
  _proto.endOptional = function endOptional() {
    this._optional--;
  };
  _proto.getValueQuery = function getValueQuery(query) {
    var result = this._temporal.query(query);
    if (result == null && this._optional === 0) {
      throw new DateTimeException("Unable to extract value: " + this._temporal);
    }
    return result;
  };
  _proto.getValue = function getValue(field) {
    try {
      return this._temporal.getLong(field);
    } catch (ex) {
      if (ex instanceof DateTimeException && this._optional > 0) {
        return null;
      }
      throw ex;
    }
  };
  _proto.temporal = function temporal() {
    return this._temporal;
  };
  _proto.locale = function locale() {
    return this._locale;
  };
  _proto.setDateTime = function setDateTime(temporal) {
    this._temporal = temporal;
  };
  _proto.setLocale = function setLocale(locale) {
    this._locale = locale;
  };
  return DateTimePrintContext;
}();

var IsoFields = {};
var QUARTER_DAYS = [0, 90, 181, 273, 0, 91, 182, 274];
var Field = function (_TemporalField) {
  _inheritsLoose(Field, _TemporalField);
  function Field() {
    return _TemporalField.apply(this, arguments) || this;
  }
  var _proto = Field.prototype;
  _proto.isDateBased = function isDateBased() {
    return true;
  };
  _proto.isTimeBased = function isTimeBased() {
    return false;
  };
  _proto._isIso = function _isIso() {
    return true;
  };
  Field._getWeekRangeByLocalDate = function _getWeekRangeByLocalDate(date) {
    var wby = Field._getWeekBasedYear(date);
    return ValueRange.of(1, Field._getWeekRangeByYear(wby));
  };
  Field._getWeekRangeByYear = function _getWeekRangeByYear(wby) {
    var date = LocalDate.of(wby, 1, 1);
    if (date.dayOfWeek() === DayOfWeek.THURSDAY || date.dayOfWeek() === DayOfWeek.WEDNESDAY && date.isLeapYear()) {
      return 53;
    }
    return 52;
  };
  Field._getWeek = function _getWeek(date) {
    var dow0 = date.dayOfWeek().ordinal();
    var doy0 = date.dayOfYear() - 1;
    var doyThu0 = doy0 + (3 - dow0);
    var alignedWeek = MathUtil.intDiv(doyThu0, 7);
    var firstThuDoy0 = doyThu0 - alignedWeek * 7;
    var firstMonDoy0 = firstThuDoy0 - 3;
    if (firstMonDoy0 < -3) {
      firstMonDoy0 += 7;
    }
    if (doy0 < firstMonDoy0) {
      return Field._getWeekRangeByLocalDate(date.withDayOfYear(180).minusYears(1)).maximum();
    }
    var week = MathUtil.intDiv(doy0 - firstMonDoy0, 7) + 1;
    if (week === 53) {
      if ((firstMonDoy0 === -3 || firstMonDoy0 === -2 && date.isLeapYear()) === false) {
        week = 1;
      }
    }
    return week;
  };
  Field._getWeekBasedYear = function _getWeekBasedYear(date) {
    var year = date.year();
    var doy = date.dayOfYear();
    if (doy <= 3) {
      var dow = date.dayOfWeek().ordinal();
      if (doy - dow < -2) {
        year--;
      }
    } else if (doy >= 363) {
      var _dow = date.dayOfWeek().ordinal();
      doy = doy - 363 - (date.isLeapYear() ? 1 : 0);
      if (doy - _dow >= 0) {
        year++;
      }
    }
    return year;
  };
  _proto.displayName = function displayName() {
    return this.toString();
  };
  _proto.resolve = function resolve() {
    return null;
  };
  _proto.name = function name() {
    return this.toString();
  };
  return Field;
}(TemporalField);
var DAY_OF_QUARTER_FIELD = function (_Field) {
  _inheritsLoose(DAY_OF_QUARTER_FIELD, _Field);
  function DAY_OF_QUARTER_FIELD() {
    return _Field.apply(this, arguments) || this;
  }
  var _proto2 = DAY_OF_QUARTER_FIELD.prototype;
  _proto2.toString = function toString() {
    return 'DayOfQuarter';
  };
  _proto2.baseUnit = function baseUnit() {
    return ChronoUnit.DAYS;
  };
  _proto2.rangeUnit = function rangeUnit() {
    return QUARTER_YEARS;
  };
  _proto2.range = function range() {
    return ValueRange.of(1, 90, 92);
  };
  _proto2.isSupportedBy = function isSupportedBy(temporal) {
    return temporal.isSupported(ChronoField.DAY_OF_YEAR) && temporal.isSupported(ChronoField.MONTH_OF_YEAR) && temporal.isSupported(ChronoField.YEAR) && this._isIso(temporal);
  };
  _proto2.rangeRefinedBy = function rangeRefinedBy(temporal) {
    if (temporal.isSupported(this) === false) {
      throw new UnsupportedTemporalTypeException('Unsupported field: DayOfQuarter');
    }
    var qoy = temporal.getLong(QUARTER_OF_YEAR);
    if (qoy === 1) {
      var year = temporal.getLong(ChronoField.YEAR);
      return IsoChronology.isLeapYear(year) ? ValueRange.of(1, 91) : ValueRange.of(1, 90);
    } else if (qoy === 2) {
      return ValueRange.of(1, 91);
    } else if (qoy === 3 || qoy === 4) {
      return ValueRange.of(1, 92);
    }
    return this.range();
  };
  _proto2.getFrom = function getFrom(temporal) {
    if (temporal.isSupported(this) === false) {
      throw new UnsupportedTemporalTypeException('Unsupported field: DayOfQuarter');
    }
    var doy = temporal.get(ChronoField.DAY_OF_YEAR);
    var moy = temporal.get(ChronoField.MONTH_OF_YEAR);
    var year = temporal.getLong(ChronoField.YEAR);
    return doy - QUARTER_DAYS[MathUtil.intDiv(moy - 1, 3) + (IsoChronology.isLeapYear(year) ? 4 : 0)];
  };
  _proto2.adjustInto = function adjustInto(temporal, newValue) {
    var curValue = this.getFrom(temporal);
    this.range().checkValidValue(newValue, this);
    return temporal.with(ChronoField.DAY_OF_YEAR, temporal.getLong(ChronoField.DAY_OF_YEAR) + (newValue - curValue));
  };
  _proto2.resolve = function resolve(fieldValues, partialTemporal, resolverStyle) {
    var yearLong = fieldValues.get(ChronoField.YEAR);
    var qoyLong = fieldValues.get(QUARTER_OF_YEAR);
    if (yearLong == null || qoyLong == null) {
      return null;
    }
    var y = ChronoField.YEAR.checkValidIntValue(yearLong);
    var doq = fieldValues.get(DAY_OF_QUARTER);
    var date;
    if (resolverStyle === ResolverStyle.LENIENT) {
      var qoy = qoyLong;
      date = LocalDate.of(y, 1, 1);
      date = date.plusMonths(MathUtil.safeMultiply(MathUtil.safeSubtract(qoy, 1), 3));
      date = date.plusDays(MathUtil.safeSubtract(doq, 1));
    } else {
      var _qoy = QUARTER_OF_YEAR.range().checkValidIntValue(qoyLong, QUARTER_OF_YEAR);
      if (resolverStyle === ResolverStyle.STRICT) {
        var max = 92;
        if (_qoy === 1) {
          max = IsoChronology.isLeapYear(y) ? 91 : 90;
        } else if (_qoy === 2) {
          max = 91;
        }
        ValueRange.of(1, max).checkValidValue(doq, this);
      } else {
        this.range().checkValidValue(doq, this);
      }
      date = LocalDate.of(y, (_qoy - 1) * 3 + 1, 1).plusDays(doq - 1);
    }
    fieldValues.remove(this);
    fieldValues.remove(ChronoField.YEAR);
    fieldValues.remove(QUARTER_OF_YEAR);
    return date;
  };
  return DAY_OF_QUARTER_FIELD;
}(Field);
var QUARTER_OF_YEAR_FIELD = function (_Field2) {
  _inheritsLoose(QUARTER_OF_YEAR_FIELD, _Field2);
  function QUARTER_OF_YEAR_FIELD() {
    return _Field2.apply(this, arguments) || this;
  }
  var _proto3 = QUARTER_OF_YEAR_FIELD.prototype;
  _proto3.toString = function toString() {
    return 'QuarterOfYear';
  };
  _proto3.baseUnit = function baseUnit() {
    return QUARTER_YEARS;
  };
  _proto3.rangeUnit = function rangeUnit() {
    return ChronoUnit.YEARS;
  };
  _proto3.range = function range() {
    return ValueRange.of(1, 4);
  };
  _proto3.isSupportedBy = function isSupportedBy(temporal) {
    return temporal.isSupported(ChronoField.MONTH_OF_YEAR) && this._isIso(temporal);
  };
  _proto3.rangeRefinedBy = function rangeRefinedBy(temporal) {
    return this.range();
  };
  _proto3.getFrom = function getFrom(temporal) {
    if (temporal.isSupported(this) === false) {
      throw new UnsupportedTemporalTypeException('Unsupported field: QuarterOfYear');
    }
    var moy = temporal.getLong(ChronoField.MONTH_OF_YEAR);
    return MathUtil.intDiv(moy + 2, 3);
  };
  _proto3.adjustInto = function adjustInto(temporal, newValue) {
    var curValue = this.getFrom(temporal);
    this.range().checkValidValue(newValue, this);
    return temporal.with(ChronoField.MONTH_OF_YEAR, temporal.getLong(ChronoField.MONTH_OF_YEAR) + (newValue - curValue) * 3);
  };
  return QUARTER_OF_YEAR_FIELD;
}(Field);
var WEEK_OF_WEEK_BASED_YEAR_FIELD = function (_Field3) {
  _inheritsLoose(WEEK_OF_WEEK_BASED_YEAR_FIELD, _Field3);
  function WEEK_OF_WEEK_BASED_YEAR_FIELD() {
    return _Field3.apply(this, arguments) || this;
  }
  var _proto4 = WEEK_OF_WEEK_BASED_YEAR_FIELD.prototype;
  _proto4.toString = function toString() {
    return 'WeekOfWeekBasedYear';
  };
  _proto4.baseUnit = function baseUnit() {
    return ChronoUnit.WEEKS;
  };
  _proto4.rangeUnit = function rangeUnit() {
    return WEEK_BASED_YEARS;
  };
  _proto4.range = function range() {
    return ValueRange.of(1, 52, 53);
  };
  _proto4.isSupportedBy = function isSupportedBy(temporal) {
    return temporal.isSupported(ChronoField.EPOCH_DAY) && this._isIso(temporal);
  };
  _proto4.rangeRefinedBy = function rangeRefinedBy(temporal) {
    if (temporal.isSupported(this) === false) {
      throw new UnsupportedTemporalTypeException('Unsupported field: WeekOfWeekBasedYear');
    }
    return Field._getWeekRangeByLocalDate(LocalDate.from(temporal));
  };
  _proto4.getFrom = function getFrom(temporal) {
    if (temporal.isSupported(this) === false) {
      throw new UnsupportedTemporalTypeException('Unsupported field: WeekOfWeekBasedYear');
    }
    return Field._getWeek(LocalDate.from(temporal));
  };
  _proto4.adjustInto = function adjustInto(temporal, newValue) {
    this.range().checkValidValue(newValue, this);
    return temporal.plus(MathUtil.safeSubtract(newValue, this.getFrom(temporal)), ChronoUnit.WEEKS);
  };
  _proto4.resolve = function resolve(fieldValues, partialTemporal, resolverStyle) {
    var wbyLong = fieldValues.get(WEEK_BASED_YEAR);
    var dowLong = fieldValues.get(ChronoField.DAY_OF_WEEK);
    if (wbyLong == null || dowLong == null) {
      return null;
    }
    var wby = WEEK_BASED_YEAR.range().checkValidIntValue(wbyLong, WEEK_BASED_YEAR);
    var wowby = fieldValues.get(WEEK_OF_WEEK_BASED_YEAR);
    var date;
    if (resolverStyle === ResolverStyle.LENIENT) {
      var dow = dowLong;
      var weeks = 0;
      if (dow > 7) {
        weeks = MathUtil.intDiv(dow - 1, 7);
        dow = MathUtil.intMod(dow - 1, 7) + 1;
      } else if (dow < 1) {
        weeks = MathUtil.intDiv(dow, 7) - 1;
        dow = MathUtil.intMod(dow, 7) + 7;
      }
      date = LocalDate.of(wby, 1, 4).plusWeeks(wowby - 1).plusWeeks(weeks).with(ChronoField.DAY_OF_WEEK, dow);
    } else {
      var _dow2 = ChronoField.DAY_OF_WEEK.checkValidIntValue(dowLong);
      if (resolverStyle === ResolverStyle.STRICT) {
        var temp = LocalDate.of(wby, 1, 4);
        var range = Field._getWeekRangeByLocalDate(temp);
        range.checkValidValue(wowby, this);
      } else {
        this.range().checkValidValue(wowby, this);
      }
      date = LocalDate.of(wby, 1, 4).plusWeeks(wowby - 1).with(ChronoField.DAY_OF_WEEK, _dow2);
    }
    fieldValues.remove(this);
    fieldValues.remove(WEEK_BASED_YEAR);
    fieldValues.remove(ChronoField.DAY_OF_WEEK);
    return date;
  };
  _proto4.displayName = function displayName() {
    return 'Week';
  };
  return WEEK_OF_WEEK_BASED_YEAR_FIELD;
}(Field);
var WEEK_BASED_YEAR_FIELD = function (_Field4) {
  _inheritsLoose(WEEK_BASED_YEAR_FIELD, _Field4);
  function WEEK_BASED_YEAR_FIELD() {
    return _Field4.apply(this, arguments) || this;
  }
  var _proto5 = WEEK_BASED_YEAR_FIELD.prototype;
  _proto5.toString = function toString() {
    return 'WeekBasedYear';
  };
  _proto5.baseUnit = function baseUnit() {
    return WEEK_BASED_YEARS;
  };
  _proto5.rangeUnit = function rangeUnit() {
    return ChronoUnit.FOREVER;
  };
  _proto5.range = function range() {
    return ChronoField.YEAR.range();
  };
  _proto5.isSupportedBy = function isSupportedBy(temporal) {
    return temporal.isSupported(ChronoField.EPOCH_DAY) && this._isIso(temporal);
  };
  _proto5.rangeRefinedBy = function rangeRefinedBy(temporal) {
    return ChronoField.YEAR.range();
  };
  _proto5.getFrom = function getFrom(temporal) {
    if (temporal.isSupported(this) === false) {
      throw new UnsupportedTemporalTypeException('Unsupported field: WeekBasedYear');
    }
    return Field._getWeekBasedYear(LocalDate.from(temporal));
  };
  _proto5.adjustInto = function adjustInto(temporal, newValue) {
    if (this.isSupportedBy(temporal) === false) {
      throw new UnsupportedTemporalTypeException('Unsupported field: WeekBasedYear');
    }
    var newWby = this.range().checkValidIntValue(newValue, WEEK_BASED_YEAR);
    var date = LocalDate.from(temporal);
    var dow = date.get(ChronoField.DAY_OF_WEEK);
    var week = Field._getWeek(date);
    if (week === 53 && Field._getWeekRangeByYear(newWby) === 52) {
      week = 52;
    }
    var resolved = LocalDate.of(newWby, 1, 4);
    var days = dow - resolved.get(ChronoField.DAY_OF_WEEK) + (week - 1) * 7;
    resolved = resolved.plusDays(days);
    return temporal.with(resolved);
  };
  return WEEK_BASED_YEAR_FIELD;
}(Field);
var Unit = function (_TemporalUnit) {
  _inheritsLoose(Unit, _TemporalUnit);
  function Unit(name, estimatedDuration) {
    var _this;
    _this = _TemporalUnit.call(this) || this;
    _this._name = name;
    _this._duration = estimatedDuration;
    return _this;
  }
  var _proto6 = Unit.prototype;
  _proto6.duration = function duration() {
    return this._duration;
  };
  _proto6.isDurationEstimated = function isDurationEstimated() {
    return true;
  };
  _proto6.isDateBased = function isDateBased() {
    return true;
  };
  _proto6.isTimeBased = function isTimeBased() {
    return false;
  };
  _proto6.isSupportedBy = function isSupportedBy(temporal) {
    return temporal.isSupported(ChronoField.EPOCH_DAY);
  };
  _proto6.addTo = function addTo(temporal, periodToAdd) {
    switch (this) {
      case WEEK_BASED_YEARS:
        {
          var added = MathUtil.safeAdd(temporal.get(WEEK_BASED_YEAR), periodToAdd);
          return temporal.with(WEEK_BASED_YEAR, added);
        }
      case QUARTER_YEARS:
        return temporal.plus(MathUtil.intDiv(periodToAdd, 256), ChronoUnit.YEARS).plus(MathUtil.intMod(periodToAdd, 256) * 3, ChronoUnit.MONTHS);
      default:
        throw new IllegalStateException('Unreachable');
    }
  };
  _proto6.between = function between(temporal1, temporal2) {
    switch (this) {
      case WEEK_BASED_YEARS:
        return MathUtil.safeSubtract(temporal2.getLong(WEEK_BASED_YEAR), temporal1.getLong(WEEK_BASED_YEAR));
      case QUARTER_YEARS:
        return MathUtil.intDiv(temporal1.until(temporal2, ChronoUnit.MONTHS), 3);
      default:
        throw new IllegalStateException('Unreachable');
    }
  };
  _proto6.toString = function toString() {
    return this._name;
  };
  return Unit;
}(TemporalUnit);
var DAY_OF_QUARTER = null;
var QUARTER_OF_YEAR = null;
var WEEK_OF_WEEK_BASED_YEAR = null;
var WEEK_BASED_YEAR = null;
var WEEK_BASED_YEARS = null;
var QUARTER_YEARS = null;
function _init$f() {
  DAY_OF_QUARTER = new DAY_OF_QUARTER_FIELD();
  QUARTER_OF_YEAR = new QUARTER_OF_YEAR_FIELD();
  WEEK_OF_WEEK_BASED_YEAR = new WEEK_OF_WEEK_BASED_YEAR_FIELD();
  WEEK_BASED_YEAR = new WEEK_BASED_YEAR_FIELD();
  WEEK_BASED_YEARS = new Unit('WeekBasedYears', Duration.ofSeconds(31556952));
  QUARTER_YEARS = new Unit('QuarterYears', Duration.ofSeconds(31556952 / 4));
  IsoFields.DAY_OF_QUARTER = DAY_OF_QUARTER;
  IsoFields.QUARTER_OF_YEAR = QUARTER_OF_YEAR;
  IsoFields.WEEK_OF_WEEK_BASED_YEAR = WEEK_OF_WEEK_BASED_YEAR;
  IsoFields.WEEK_BASED_YEAR = WEEK_BASED_YEAR;
  IsoFields.WEEK_BASED_YEARS = WEEK_BASED_YEARS;
  IsoFields.QUARTER_YEARS = QUARTER_YEARS;
  LocalDate.prototype.isoWeekOfWeekyear = function () {
    return this.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
  };
  LocalDate.prototype.isoWeekyear = function () {
    return this.get(IsoFields.WEEK_BASED_YEAR);
  };
}

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

var DecimalStyle = function () {
  function DecimalStyle(zeroChar, positiveSignChar, negativeSignChar, decimalPointChar) {
    this._zeroDigit = zeroChar;
    this._zeroDigitCharCode = zeroChar.charCodeAt(0);
    this._positiveSign = positiveSignChar;
    this._negativeSign = negativeSignChar;
    this._decimalSeparator = decimalPointChar;
  }
  var _proto = DecimalStyle.prototype;
  _proto.positiveSign = function positiveSign() {
    return this._positiveSign;
  };
  _proto.withPositiveSign = function withPositiveSign(positiveSign) {
    if (positiveSign === this._positiveSign) {
      return this;
    }
    return new DecimalStyle(this._zeroDigit, positiveSign, this._negativeSign, this._decimalSeparator);
  };
  _proto.negativeSign = function negativeSign() {
    return this._negativeSign;
  };
  _proto.withNegativeSign = function withNegativeSign(negativeSign) {
    if (negativeSign === this._negativeSign) {
      return this;
    }
    return new DecimalStyle(this._zeroDigit, this._positiveSign, negativeSign, this._decimalSeparator);
  };
  _proto.zeroDigit = function zeroDigit() {
    return this._zeroDigit;
  };
  _proto.withZeroDigit = function withZeroDigit(zeroDigit) {
    if (zeroDigit === this._zeroDigit) {
      return this;
    }
    return new DecimalStyle(zeroDigit, this._positiveSign, this._negativeSign, this._decimalSeparator);
  };
  _proto.decimalSeparator = function decimalSeparator() {
    return this._decimalSeparator;
  };
  _proto.withDecimalSeparator = function withDecimalSeparator(decimalSeparator) {
    if (decimalSeparator === this._decimalSeparator) {
      return this;
    }
    return new DecimalStyle(this._zeroDigit, this._positiveSign, this._negativeSign, decimalSeparator);
  };
  _proto.convertToDigit = function convertToDigit(char) {
    var val = char.charCodeAt(0) - this._zeroDigitCharCode;
    return val >= 0 && val <= 9 ? val : -1;
  };
  _proto.convertNumberToI18N = function convertNumberToI18N(numericText) {
    if (this._zeroDigit === '0') {
      return numericText;
    }
    var diff = this._zeroDigitCharCode - '0'.charCodeAt(0);
    var convertedText = '';
    for (var i = 0; i < numericText.length; i++) {
      convertedText += String.fromCharCode(numericText.charCodeAt(i) + diff);
    }
    return convertedText;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof DecimalStyle) {
      return this._zeroDigit === other._zeroDigit && this._positiveSign === other._positiveSign && this._negativeSign === other._negativeSign && this._decimalSeparator === other._decimalSeparator;
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return this._zeroDigit + this._positiveSign + this._negativeSign + this._decimalSeparator;
  };
  _proto.toString = function toString() {
    return "DecimalStyle[" + this._zeroDigit + this._positiveSign + this._negativeSign + this._decimalSeparator + "]";
  };
  DecimalStyle.of = function of() {
    throw new Error('not yet supported');
  };
  DecimalStyle.availableLocales = function availableLocales() {
    throw new Error('not yet supported');
  };
  return DecimalStyle;
}();
DecimalStyle.STANDARD = new DecimalStyle('0', '+', '-', '.');

var SignStyle = function (_Enum) {
  _inheritsLoose(SignStyle, _Enum);
  function SignStyle() {
    return _Enum.apply(this, arguments) || this;
  }
  var _proto = SignStyle.prototype;
  _proto.parse = function parse(positive, strict, fixedWidth) {
    switch (this) {
      case SignStyle.NORMAL:
        return !positive || !strict;
      case SignStyle.ALWAYS:
      case SignStyle.EXCEEDS_PAD:
        return true;
      default:
        return !strict && !fixedWidth;
    }
  };
  return SignStyle;
}(Enum);
SignStyle.NORMAL = new SignStyle('NORMAL');
SignStyle.NEVER = new SignStyle('NEVER');
SignStyle.ALWAYS = new SignStyle('ALWAYS');
SignStyle.EXCEEDS_PAD = new SignStyle('EXCEEDS_PAD');
SignStyle.NOT_NEGATIVE = new SignStyle('NOT_NEGATIVE');

var TextStyle = function (_Enum) {
  _inheritsLoose(TextStyle, _Enum);
  function TextStyle() {
    return _Enum.apply(this, arguments) || this;
  }
  var _proto = TextStyle.prototype;
  _proto.isStandalone = function isStandalone() {
    switch (this) {
      case TextStyle.FULL_STANDALONE:
      case TextStyle.SHORT_STANDALONE:
      case TextStyle.NARROW_STANDALONE:
        return true;
      default:
        return false;
    }
  };
  _proto.asStandalone = function asStandalone() {
    switch (this) {
      case TextStyle.FULL:
        return TextStyle.FULL_STANDALONE;
      case TextStyle.SHORT:
        return TextStyle.SHORT_STANDALONE;
      case TextStyle.NARROW:
        return TextStyle.NARROW_STANDALONE;
      default:
        return this;
    }
  };
  _proto.asNormal = function asNormal() {
    switch (this) {
      case TextStyle.FULL_STANDALONE:
        return TextStyle.FULL;
      case TextStyle.SHORT_STANDALONE:
        return TextStyle.SHORT;
      case TextStyle.NARROW_STANDALONE:
        return TextStyle.NARROW;
      default:
        return this;
    }
  };
  return TextStyle;
}(Enum);
TextStyle.FULL = new TextStyle('FULL');
TextStyle.FULL_STANDALONE = new TextStyle('FULL_STANDALONE');
TextStyle.SHORT = new TextStyle('SHORT');
TextStyle.SHORT_STANDALONE = new TextStyle('SHORT_STANDALONE');
TextStyle.NARROW = new TextStyle('NARROW');
TextStyle.NARROW_STANDALONE = new TextStyle('NARROW_STANDALONE');

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var CharLiteralPrinterParser = function () {
  function CharLiteralPrinterParser(literal) {
    if (literal.length > 1) {
      throw new IllegalArgumentException("invalid literal, too long: \"" + literal + "\"");
    }
    this._literal = literal;
  }
  var _proto = CharLiteralPrinterParser.prototype;
  _proto.print = function print(context, buf) {
    buf.append(this._literal);
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    var length = text.length;
    if (position === length) {
      return ~position;
    }
    var ch = text.charAt(position);
    if (context.charEquals(this._literal, ch) === false) {
      return ~position;
    }
    return position + this._literal.length;
  };
  _proto.toString = function toString() {
    if (this._literal === '\'') {
      return "''";
    }
    return "'" + this._literal + "'";
  };
  return CharLiteralPrinterParser;
}();

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */var CompositePrinterParser = function () {
  function CompositePrinterParser(printerParsers, optional) {
    this._printerParsers = printerParsers;
    this._optional = optional;
  }
  var _proto = CompositePrinterParser.prototype;
  _proto.withOptional = function withOptional(optional) {
    if (optional === this._optional) {
      return this;
    }
    return new CompositePrinterParser(this._printerParsers, optional);
  };
  _proto.print = function print(context, buf) {
    var length = buf.length();
    if (this._optional) {
      context.startOptional();
    }
    try {
      for (var i = 0; i < this._printerParsers.length; i++) {
        var pp = this._printerParsers[i];
        if (pp.print(context, buf) === false) {
          buf.setLength(length);
          return true;
        }
      }
    } finally {
      if (this._optional) {
        context.endOptional();
      }
    }
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    if (this._optional) {
      context.startOptional();
      var pos = position;
      for (var i = 0; i < this._printerParsers.length; i++) {
        var pp = this._printerParsers[i];
        pos = pp.parse(context, text, pos);
        if (pos < 0) {
          context.endOptional(false);
          return position;
        }
      }
      context.endOptional(true);
      return pos;
    } else {
      for (var _i = 0; _i < this._printerParsers.length; _i++) {
        var _pp = this._printerParsers[_i];
        position = _pp.parse(context, text, position);
        if (position < 0) {
          break;
        }
      }
      return position;
    }
  };
  _proto.toString = function toString() {
    var buf = '';
    if (this._printerParsers != null) {
      buf += this._optional ? '[' : '(';
      for (var i = 0; i < this._printerParsers.length; i++) {
        var pp = this._printerParsers[i];
        buf += pp.toString();
      }
      buf += this._optional ? ']' : ')';
    }
    return buf;
  };
  return CompositePrinterParser;
}();

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var FractionPrinterParser = function () {
  function FractionPrinterParser(field, minWidth, maxWidth, decimalPoint) {
    requireNonNull(field, 'field');
    if (field.range().isFixed() === false) {
      throw new IllegalArgumentException("Field must have a fixed set of values: " + field);
    }
    if (minWidth < 0 || minWidth > 9) {
      throw new IllegalArgumentException("Minimum width must be from 0 to 9 inclusive but was " + minWidth);
    }
    if (maxWidth < 1 || maxWidth > 9) {
      throw new IllegalArgumentException("Maximum width must be from 1 to 9 inclusive but was " + maxWidth);
    }
    if (maxWidth < minWidth) {
      throw new IllegalArgumentException("Maximum width must exceed or equal the minimum width but " + maxWidth + " < " + minWidth);
    }
    this.field = field;
    this.minWidth = minWidth;
    this.maxWidth = maxWidth;
    this.decimalPoint = decimalPoint;
  }
  var _proto = FractionPrinterParser.prototype;
  _proto.print = function print(context, buf) {
    var value = context.getValue(this.field);
    if (value === null) {
      return false;
    }
    var symbols = context.symbols();
    if (value === 0) {
      if (this.minWidth > 0) {
        if (this.decimalPoint) {
          buf.append(symbols.decimalSeparator());
        }
        for (var i = 0; i < this.minWidth; i++) {
          buf.append(symbols.zeroDigit());
        }
      }
    } else {
      var fraction = this.convertToFraction(value, symbols.zeroDigit());
      var outputScale = Math.min(Math.max(fraction.length, this.minWidth), this.maxWidth);
      fraction = fraction.substr(0, outputScale);
      if (fraction * 1 > 0) {
        while (fraction.length > this.minWidth && fraction[fraction.length - 1] === '0') {
          fraction = fraction.substr(0, fraction.length - 1);
        }
      }
      var str = fraction;
      str = symbols.convertNumberToI18N(str);
      if (this.decimalPoint) {
        buf.append(symbols.decimalSeparator());
      }
      buf.append(str);
    }
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    var effectiveMin = context.isStrict() ? this.minWidth : 0;
    var effectiveMax = context.isStrict() ? this.maxWidth : 9;
    var length = text.length;
    if (position === length) {
      return effectiveMin > 0 ? ~position : position;
    }
    if (this.decimalPoint) {
      if (text[position] !== context.symbols().decimalSeparator()) {
        return effectiveMin > 0 ? ~position : position;
      }
      position++;
    }
    var minEndPos = position + effectiveMin;
    if (minEndPos > length) {
      return ~position;
    }
    var maxEndPos = Math.min(position + effectiveMax, length);
    var total = 0;
    var pos = position;
    while (pos < maxEndPos) {
      var ch = text.charAt(pos++);
      var digit = context.symbols().convertToDigit(ch);
      if (digit < 0) {
        if (pos < minEndPos) {
          return ~position;
        }
        pos--;
        break;
      }
      total = total * 10 + digit;
    }
    var moveLeft = pos - position;
    var scale = Math.pow(10, moveLeft);
    var value = this.convertFromFraction(total, scale);
    return context.setParsedField(this.field, value, position, pos);
  };
  _proto.convertToFraction = function convertToFraction(value, zeroDigit) {
    var range = this.field.range();
    range.checkValidValue(value, this.field);
    var _min = range.minimum();
    var _range = range.maximum() - _min + 1;
    var _value = value - _min;
    var _scaled = MathUtil.intDiv(_value * 1000000000, _range);
    var fraction = "" + _scaled;
    while (fraction.length < 9) {
      fraction = zeroDigit + fraction;
    }
    return fraction;
  };
  _proto.convertFromFraction = function convertFromFraction(total, scale) {
    var range = this.field.range();
    var _min = range.minimum();
    var _range = range.maximum() - _min + 1;
    var _value = MathUtil.intDiv(total * _range, scale);
    return _value;
  };
  _proto.toString = function toString() {
    var decimal = this.decimalPoint ? ',DecimalPoint' : '';
    return "Fraction(" + this.field + "," + this.minWidth + "," + this.maxWidth + decimal + ")";
  };
  return FractionPrinterParser;
}();

var MAX_WIDTH$1 = 15;
var EXCEED_POINTS = [0, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];
var NumberPrinterParser = function () {
  function NumberPrinterParser(field, minWidth, maxWidth, signStyle, subsequentWidth) {
    if (subsequentWidth === void 0) {
      subsequentWidth = 0;
    }
    this._field = field;
    this._minWidth = minWidth;
    this._maxWidth = maxWidth;
    this._signStyle = signStyle;
    this._subsequentWidth = subsequentWidth;
  }
  var _proto = NumberPrinterParser.prototype;
  _proto.field = function field() {
    return this._field;
  };
  _proto.minWidth = function minWidth() {
    return this._minWidth;
  };
  _proto.maxWidth = function maxWidth() {
    return this._maxWidth;
  };
  _proto.signStyle = function signStyle() {
    return this._signStyle;
  };
  _proto.withFixedWidth = function withFixedWidth() {
    if (this._subsequentWidth === -1) {
      return this;
    }
    return new NumberPrinterParser(this._field, this._minWidth, this._maxWidth, this._signStyle, -1);
  };
  _proto.withSubsequentWidth = function withSubsequentWidth(subsequentWidth) {
    return new NumberPrinterParser(this._field, this._minWidth, this._maxWidth, this._signStyle, this._subsequentWidth + subsequentWidth);
  };
  _proto._isFixedWidth = function _isFixedWidth() {
    return this._subsequentWidth === -1 || this._subsequentWidth > 0 && this._minWidth === this._maxWidth && this._signStyle === SignStyle.NOT_NEGATIVE;
  };
  _proto.print = function print(context, buf) {
    var contextValue = context.getValue(this._field);
    if (contextValue == null) {
      return false;
    }
    var value = this._getValue(context, contextValue);
    var symbols = context.symbols();
    var str = "" + Math.abs(value);
    if (str.length > this._maxWidth) {
      throw new DateTimeException("Field " + this._field + " cannot be printed as the value " + value + " exceeds the maximum print width of " + this._maxWidth);
    }
    str = symbols.convertNumberToI18N(str);
    if (value >= 0) {
      switch (this._signStyle) {
        case SignStyle.EXCEEDS_PAD:
          if (this._minWidth < MAX_WIDTH$1 && value >= EXCEED_POINTS[this._minWidth]) {
            buf.append(symbols.positiveSign());
          }
          break;
        case SignStyle.ALWAYS:
          buf.append(symbols.positiveSign());
          break;
      }
    } else {
      switch (this._signStyle) {
        case SignStyle.NORMAL:
        case SignStyle.EXCEEDS_PAD:
        case SignStyle.ALWAYS:
          buf.append(symbols.negativeSign());
          break;
        case SignStyle.NOT_NEGATIVE:
          throw new DateTimeException("Field " + this._field + " cannot be printed as the value " + value + " cannot be negative according to the SignStyle");
      }
    }
    for (var i = 0; i < this._minWidth - str.length; i++) {
      buf.append(symbols.zeroDigit());
    }
    buf.append(str);
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    var length = text.length;
    if (position === length) {
      return ~position;
    }
    assert(position >= 0 && position < length);
    var sign = text.charAt(position);
    var negative = false;
    var positive = false;
    if (sign === context.symbols().positiveSign()) {
      if (this._signStyle.parse(true, context.isStrict(), this._minWidth === this._maxWidth) === false) {
        return ~position;
      }
      positive = true;
      position++;
    } else if (sign === context.symbols().negativeSign()) {
      if (this._signStyle.parse(false, context.isStrict(), this._minWidth === this._maxWidth) === false) {
        return ~position;
      }
      negative = true;
      position++;
    } else {
      if (this._signStyle === SignStyle.ALWAYS && context.isStrict()) {
        return ~position;
      }
    }
    var effMinWidth = context.isStrict() || this._isFixedWidth() ? this._minWidth : 1;
    var minEndPos = position + effMinWidth;
    if (minEndPos > length) {
      return ~position;
    }
    var effMaxWidth = (context.isStrict() || this._isFixedWidth() ? this._maxWidth : 9) + Math.max(this._subsequentWidth, 0);
    var total = 0;
    var pos = position;
    for (var pass = 0; pass < 2; pass++) {
      var maxEndPos = Math.min(pos + effMaxWidth, length);
      while (pos < maxEndPos) {
        var ch = text.charAt(pos++);
        var digit = context.symbols().convertToDigit(ch);
        if (digit < 0) {
          pos--;
          if (pos < minEndPos) {
            return ~position;
          }
          break;
        }
        if (pos - position > MAX_WIDTH$1) {
          throw new ArithmeticException('number text exceeds length');
        } else {
          total = total * 10 + digit;
        }
      }
      if (this._subsequentWidth > 0 && pass === 0) {
        var parseLen = pos - position;
        effMaxWidth = Math.max(effMinWidth, parseLen - this._subsequentWidth);
        pos = position;
        total = 0;
      } else {
        break;
      }
    }
    if (negative) {
      if (total === 0 && context.isStrict()) {
        return ~(position - 1);
      }
      if (total !== 0) {
        total = -total;
      }
    } else if (this._signStyle === SignStyle.EXCEEDS_PAD && context.isStrict()) {
      var _parseLen = pos - position;
      if (positive) {
        if (_parseLen <= this._minWidth) {
          return ~(position - 1);
        }
      } else {
        if (_parseLen > this._minWidth) {
          return ~position;
        }
      }
    }
    return this._setValue(context, total, position, pos);
  };
  _proto._getValue = function _getValue(context, value) {
    return value;
  };
  _proto._setValue = function _setValue(context, value, errorPos, successPos) {
    return context.setParsedField(this._field, value, errorPos, successPos);
  };
  _proto.toString = function toString() {
    if (this._minWidth === 1 && this._maxWidth === MAX_WIDTH$1 && this._signStyle === SignStyle.NORMAL) {
      return "Value(" + this._field + ")";
    }
    if (this._minWidth === this._maxWidth && this._signStyle === SignStyle.NOT_NEGATIVE) {
      return "Value(" + this._field + "," + this._minWidth + ")";
    }
    return "Value(" + this._field + "," + this._minWidth + "," + this._maxWidth + "," + this._signStyle + ")";
  };
  return NumberPrinterParser;
}();
var ReducedPrinterParser = function (_NumberPrinterParser) {
  _inheritsLoose(ReducedPrinterParser, _NumberPrinterParser);
  function ReducedPrinterParser(field, width, maxWidth, baseValue, baseDate) {
    var _this;
    _this = _NumberPrinterParser.call(this, field, width, maxWidth, SignStyle.NOT_NEGATIVE) || this;
    if (width < 1 || width > 10) {
      throw new IllegalArgumentException("The width must be from 1 to 10 inclusive but was " + width);
    }
    if (maxWidth < 1 || maxWidth > 10) {
      throw new IllegalArgumentException("The maxWidth must be from 1 to 10 inclusive but was " + maxWidth);
    }
    if (maxWidth < width) {
      throw new IllegalArgumentException('The maxWidth must be greater than the width');
    }
    if (baseDate === null) {
      if (field.range().isValidValue(baseValue) === false) {
        throw new IllegalArgumentException('The base value must be within the range of the field');
      }
      if (baseValue + EXCEED_POINTS[width] > MathUtil.MAX_SAFE_INTEGER) {
        throw new DateTimeException('Unable to add printer-parser as the range exceeds the capacity of an int');
      }
    }
    _this._baseValue = baseValue;
    _this._baseDate = baseDate;
    return _this;
  }
  var _proto2 = ReducedPrinterParser.prototype;
  _proto2._getValue = function _getValue(context, value) {
    var absValue = Math.abs(value);
    var baseValue = this._baseValue;
    if (this._baseDate !== null) {
      context.temporal();
      var chrono = IsoChronology.INSTANCE;
      baseValue = chrono.date(this._baseDate).get(this._field);
    }
    if (value >= baseValue && value < baseValue + EXCEED_POINTS[this._minWidth]) {
      return absValue % EXCEED_POINTS[this._minWidth];
    }
    return absValue % EXCEED_POINTS[this._maxWidth];
  };
  _proto2._setValue = function _setValue(context, value, errorPos, successPos) {
    var baseValue = this._baseValue;
    if (this._baseDate != null) {
      var chrono = context.getEffectiveChronology();
      baseValue = chrono.date(this._baseDate).get(this._field);
    }
    var parseLen = successPos - errorPos;
    if (parseLen === this._minWidth && value >= 0) {
      var range = EXCEED_POINTS[this._minWidth];
      var lastPart = baseValue % range;
      var basePart = baseValue - lastPart;
      if (baseValue > 0) {
        value = basePart + value;
      } else {
        value = basePart - value;
      }
      if (value < baseValue) {
        value += range;
      }
    }
    return context.setParsedField(this._field, value, errorPos, successPos);
  };
  _proto2.withFixedWidth = function withFixedWidth() {
    if (this._subsequentWidth === -1) {
      return this;
    }
    return new ReducedPrinterParser(this._field, this._minWidth, this._maxWidth, this._baseValue, this._baseDate);
  };
  _proto2.withSubsequentWidth = function withSubsequentWidth(subsequentWidth) {
    return new ReducedPrinterParser(this._field, this._minWidth, this._maxWidth, this._baseValue, this._baseDate, this._subsequentWidth + subsequentWidth);
  };
  _proto2.isFixedWidth = function isFixedWidth(context) {
    if (context.isStrict() === false) {
      return false;
    }
    return _NumberPrinterParser.prototype.isFixedWidth.call(this, context);
  };
  _proto2.toString = function toString() {
    return "ReducedValue(" + this._field + "," + this._minWidth + "," + this._maxWidth + "," + (this._baseDate != null ? this._baseDate : this._baseValue) + ")";
  };
  return ReducedPrinterParser;
}(NumberPrinterParser);

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var PATTERNS = ['+HH', '+HHmm', '+HH:mm', '+HHMM', '+HH:MM', '+HHMMss', '+HH:MM:ss', '+HHMMSS', '+HH:MM:SS'];
var OffsetIdPrinterParser = function () {
  function OffsetIdPrinterParser(noOffsetText, pattern) {
    requireNonNull(noOffsetText, 'noOffsetText');
    requireNonNull(pattern, 'pattern');
    this.noOffsetText = noOffsetText;
    this.type = this._checkPattern(pattern);
  }
  var _proto = OffsetIdPrinterParser.prototype;
  _proto._checkPattern = function _checkPattern(pattern) {
    for (var i = 0; i < PATTERNS.length; i++) {
      if (PATTERNS[i] === pattern) {
        return i;
      }
    }
    throw new IllegalArgumentException("Invalid zone offset pattern: " + pattern);
  };
  _proto.print = function print(context, buf) {
    var offsetSecs = context.getValue(ChronoField.OFFSET_SECONDS);
    if (offsetSecs == null) {
      return false;
    }
    var totalSecs = MathUtil.safeToInt(offsetSecs);
    if (totalSecs === 0) {
      buf.append(this.noOffsetText);
    } else {
      var absHours = Math.abs(MathUtil.intMod(MathUtil.intDiv(totalSecs, 3600), 100));
      var absMinutes = Math.abs(MathUtil.intMod(MathUtil.intDiv(totalSecs, 60), 60));
      var absSeconds = Math.abs(MathUtil.intMod(totalSecs, 60));
      var bufPos = buf.length();
      var output = absHours;
      buf.append(totalSecs < 0 ? '-' : '+').appendChar(MathUtil.intDiv(absHours, 10) + "0").appendChar(MathUtil.intMod(absHours, 10) + "0");
      if (this.type >= 3 || this.type >= 1 && absMinutes > 0) {
        buf.append(this.type % 2 === 0 ? ':' : '').appendChar(MathUtil.intDiv(absMinutes, 10) + "0").appendChar(absMinutes % 10 + "0");
        output += absMinutes;
        if (this.type >= 7 || this.type >= 5 && absSeconds > 0) {
          buf.append(this.type % 2 === 0 ? ':' : '').appendChar(MathUtil.intDiv(absSeconds, 10) + "0").appendChar(absSeconds % 10 + "0");
          output += absSeconds;
        }
      }
      if (output === 0) {
        buf.setLength(bufPos);
        buf.append(this.noOffsetText);
      }
    }
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    var length = text.length;
    var noOffsetLen = this.noOffsetText.length;
    if (noOffsetLen === 0) {
      if (position === length) {
        return context.setParsedField(ChronoField.OFFSET_SECONDS, 0, position, position);
      }
    } else {
      if (position === length) {
        return ~position;
      }
      if (context.subSequenceEquals(text, position, this.noOffsetText, 0, noOffsetLen)) {
        return context.setParsedField(ChronoField.OFFSET_SECONDS, 0, position, position + noOffsetLen);
      }
    }
    var sign = text[position];
    if (sign === '+' || sign === '-') {
      var negative = sign === '-' ? -1 : 1;
      var array = [0, 0, 0, 0];
      array[0] = position + 1;
      if ((this._parseNumber(array, 1, text, true) || this._parseNumber(array, 2, text, this.type >= 3) || this._parseNumber(array, 3, text, false)) === false) {
        var offsetSecs = MathUtil.safeZero(negative * (array[1] * 3600 + array[2] * 60 + array[3]));
        return context.setParsedField(ChronoField.OFFSET_SECONDS, offsetSecs, position, array[0]);
      }
    }
    if (noOffsetLen === 0) {
      return context.setParsedField(ChronoField.OFFSET_SECONDS, 0, position, position + noOffsetLen);
    }
    return ~position;
  };
  _proto._parseNumber = function _parseNumber(array, arrayIndex, parseText, required) {
    if ((this.type + 3) / 2 < arrayIndex) {
      return false;
    }
    var pos = array[0];
    if (this.type % 2 === 0 && arrayIndex > 1) {
      if (pos + 1 > parseText.length || parseText[pos] !== ':') {
        return required;
      }
      pos++;
    }
    if (pos + 2 > parseText.length) {
      return required;
    }
    var ch1 = parseText[pos++];
    var ch2 = parseText[pos++];
    if (ch1 < '0' || ch1 > '9' || ch2 < '0' || ch2 > '9') {
      return required;
    }
    var value = (ch1.charCodeAt(0) - 48) * 10 + (ch2.charCodeAt(0) - 48);
    if (value < 0 || value > 59) {
      return required;
    }
    array[arrayIndex] = value;
    array[0] = pos;
    return false;
  };
  _proto.toString = function toString() {
    var converted = this.noOffsetText.replace('\'', '\'\'');
    return "Offset(" + PATTERNS[this.type] + ",'" + converted + "')";
  };
  return OffsetIdPrinterParser;
}();
OffsetIdPrinterParser.INSTANCE_ID = new OffsetIdPrinterParser('Z', '+HH:MM:ss');
OffsetIdPrinterParser.PATTERNS = PATTERNS;

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var PadPrinterParserDecorator = function () {
  function PadPrinterParserDecorator(printerParser, padWidth, padChar) {
    this._printerParser = printerParser;
    this._padWidth = padWidth;
    this._padChar = padChar;
  }
  var _proto = PadPrinterParserDecorator.prototype;
  _proto.print = function print(context, buf) {
    var preLen = buf.length();
    if (this._printerParser.print(context, buf) === false) {
      return false;
    }
    var len = buf.length() - preLen;
    if (len > this._padWidth) {
      throw new DateTimeException("Cannot print as output of " + len + " characters exceeds pad width of " + this._padWidth);
    }
    for (var i = 0; i < this._padWidth - len; i++) {
      buf.insert(preLen, this._padChar);
    }
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    var strict = context.isStrict();
    var caseSensitive = context.isCaseSensitive();
    assert(!(position > text.length));
    assert(position >= 0);
    if (position === text.length) {
      return ~position;
    }
    var endPos = position + this._padWidth;
    if (endPos > text.length) {
      if (strict) {
        return ~position;
      }
      endPos = text.length;
    }
    var pos = position;
    while (pos < endPos && (caseSensitive ? text[pos] === this._padChar : context.charEquals(text[pos], this._padChar))) {
      pos++;
    }
    text = text.substring(0, endPos);
    var resultPos = this._printerParser.parse(context, text, pos);
    if (resultPos !== endPos && strict) {
      return ~(position + pos);
    }
    return resultPos;
  };
  _proto.toString = function toString() {
    return "Pad(" + this._printerParser + "," + this._padWidth + (this._padChar === ' ' ? ')' : ",'" + this._padChar + "')");
  };
  return PadPrinterParserDecorator;
}();

var SettingsParser = function (_Enum) {
  _inheritsLoose(SettingsParser, _Enum);
  function SettingsParser() {
    return _Enum.apply(this, arguments) || this;
  }
  var _proto = SettingsParser.prototype;
  _proto.print = function print() {
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    switch (this) {
      case SettingsParser.SENSITIVE:
        context.setCaseSensitive(true);
        break;
      case SettingsParser.INSENSITIVE:
        context.setCaseSensitive(false);
        break;
      case SettingsParser.STRICT:
        context.setStrict(true);
        break;
      case SettingsParser.LENIENT:
        context.setStrict(false);
        break;
    }
    return position;
  };
  _proto.toString = function toString() {
    switch (this) {
      case SettingsParser.SENSITIVE:
        return 'ParseCaseSensitive(true)';
      case SettingsParser.INSENSITIVE:
        return 'ParseCaseSensitive(false)';
      case SettingsParser.STRICT:
        return 'ParseStrict(true)';
      case SettingsParser.LENIENT:
        return 'ParseStrict(false)';
    }
  };
  return SettingsParser;
}(Enum);
SettingsParser.SENSITIVE = new SettingsParser('SENSITIVE');
SettingsParser.INSENSITIVE = new SettingsParser('INSENSITIVE');
SettingsParser.STRICT = new SettingsParser('STRICT');
SettingsParser.LENIENT = new SettingsParser('LENIENT');

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var StringLiteralPrinterParser = function () {
  function StringLiteralPrinterParser(literal) {
    this._literal = literal;
  }
  var _proto = StringLiteralPrinterParser.prototype;
  _proto.print = function print(context, buf) {
    buf.append(this._literal);
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    var length = text.length;
    assert(!(position > length || position < 0));
    if (context.subSequenceEquals(text, position, this._literal, 0, this._literal.length) === false) {
      return ~position;
    }
    return position + this._literal.length;
  };
  _proto.toString = function toString() {
    var converted = this._literal.replace("'", "''");
    return "'" + converted + "'";
  };
  return StringLiteralPrinterParser;
}();

/*
 * @copyright (c) 2016, Philipp Thürwächter, Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var ZoneRulesProvider = function () {
  function ZoneRulesProvider() {}
  ZoneRulesProvider.getRules = function getRules(zoneId) {
    throw new DateTimeException("unsupported ZoneId:" + zoneId);
  };
  ZoneRulesProvider.getAvailableZoneIds = function getAvailableZoneIds() {
    return [];
  };
  return ZoneRulesProvider;
}();

var ZoneRegion = function (_ZoneId) {
  _inheritsLoose(ZoneRegion, _ZoneId);
  ZoneRegion.ofId = function ofId(zoneId) {
    var rules = ZoneRulesProvider.getRules(zoneId);
    return new ZoneRegion(zoneId, rules);
  };
  function ZoneRegion(id, rules) {
    var _this;
    _this = _ZoneId.call(this) || this;
    _this._id = id;
    _this._rules = rules;
    return _this;
  }
  var _proto = ZoneRegion.prototype;
  _proto.id = function id() {
    return this._id;
  };
  _proto.rules = function rules() {
    return this._rules;
  };
  return ZoneRegion;
}(ZoneId);

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var ZoneIdPrinterParser = function () {
  function ZoneIdPrinterParser(query, description) {
    this.query = query;
    this.description = description;
  }
  var _proto = ZoneIdPrinterParser.prototype;
  _proto.print = function print(context, buf) {
    var zone = context.getValueQuery(this.query);
    if (zone == null) {
      return false;
    }
    buf.append(zone.id());
    return true;
  };
  _proto.parse = function parse(context, text, position) {
    var length = text.length;
    if (position > length) {
      return ~position;
    }
    if (position === length) {
      return ~position;
    }
    var nextChar = text.charAt(position);
    if (nextChar === '+' || nextChar === '-') {
      var newContext = context.copy();
      var endPos = OffsetIdPrinterParser.INSTANCE_ID.parse(newContext, text, position);
      if (endPos < 0) {
        return endPos;
      }
      var offset = newContext.getParsed(ChronoField.OFFSET_SECONDS);
      var zone = ZoneOffset.ofTotalSeconds(offset);
      context.setParsedZone(zone);
      return endPos;
    } else if (length >= position + 2) {
      var nextNextChar = text.charAt(position + 1);
      if (context.charEquals(nextChar, 'U') && context.charEquals(nextNextChar, 'T')) {
        if (length >= position + 3 && context.charEquals(text.charAt(position + 2), 'C')) {
          return this._parsePrefixedOffset(context, text, position, position + 3);
        }
        return this._parsePrefixedOffset(context, text, position, position + 2);
      } else if (context.charEquals(nextChar, 'G') && length >= position + 3 && context.charEquals(nextNextChar, 'M') && context.charEquals(text.charAt(position + 2), 'T')) {
        return this._parsePrefixedOffset(context, text, position, position + 3);
      }
    }
    if (text.substr(position, 6) === 'SYSTEM') {
      context.setParsedZone(ZoneId.systemDefault());
      return position + 6;
    }
    if (context.charEquals(nextChar, 'Z')) {
      context.setParsedZone(ZoneOffset.UTC);
      return position + 1;
    }
    var availableZoneIds = ZoneRulesProvider.getAvailableZoneIds();
    if (zoneIdTree.size !== availableZoneIds.length) {
      zoneIdTree = ZoneIdTree.createTreeMap(availableZoneIds);
    }
    var maxParseLength = length - position;
    var treeMap = zoneIdTree.treeMap;
    var parsedZoneId = null;
    var parseLength = 0;
    while (treeMap != null) {
      var parsedSubZoneId = text.substr(position, Math.min(treeMap.length, maxParseLength));
      treeMap = treeMap.get(parsedSubZoneId);
      if (treeMap != null && treeMap.isLeaf) {
        parsedZoneId = parsedSubZoneId;
        parseLength = treeMap.length;
      }
    }
    if (parsedZoneId != null) {
      context.setParsedZone(ZoneRegion.ofId(parsedZoneId));
      return position + parseLength;
    }
    return ~position;
  };
  _proto._parsePrefixedOffset = function _parsePrefixedOffset(context, text, prefixPos, position) {
    var prefix = text.substring(prefixPos, position).toUpperCase();
    var newContext = context.copy();
    if (position < text.length && context.charEquals(text.charAt(position), 'Z')) {
      context.setParsedZone(ZoneId.ofOffset(prefix, ZoneOffset.UTC));
      return position;
    }
    var endPos = OffsetIdPrinterParser.INSTANCE_ID.parse(newContext, text, position);
    if (endPos < 0) {
      context.setParsedZone(ZoneId.ofOffset(prefix, ZoneOffset.UTC));
      return position;
    }
    var offsetSecs = newContext.getParsed(ChronoField.OFFSET_SECONDS);
    var offset = ZoneOffset.ofTotalSeconds(offsetSecs);
    context.setParsedZone(ZoneId.ofOffset(prefix, offset));
    return endPos;
  };
  _proto.toString = function toString() {
    return this.description;
  };
  return ZoneIdPrinterParser;
}();
var ZoneIdTree = function () {
  ZoneIdTree.createTreeMap = function createTreeMap(availableZoneIds) {
    var sortedZoneIds = availableZoneIds.sort(function (a, b) {
      return a.length - b.length;
    });
    var treeMap = new ZoneIdTreeMap(sortedZoneIds[0].length, false);
    for (var i = 0; i < sortedZoneIds.length; i++) {
      treeMap.add(sortedZoneIds[i]);
    }
    return new ZoneIdTree(sortedZoneIds.length, treeMap);
  };
  function ZoneIdTree(size, treeMap) {
    this.size = size;
    this.treeMap = treeMap;
  }
  return ZoneIdTree;
}();
var ZoneIdTreeMap = function () {
  function ZoneIdTreeMap(length, isLeaf) {
    if (length === void 0) {
      length = 0;
    }
    if (isLeaf === void 0) {
      isLeaf = false;
    }
    this.length = length;
    this.isLeaf = isLeaf;
    this._treeMap = {};
  }
  var _proto2 = ZoneIdTreeMap.prototype;
  _proto2.add = function add(zoneId) {
    var idLength = zoneId.length;
    if (idLength === this.length) {
      this._treeMap[zoneId] = new ZoneIdTreeMap(idLength, true);
    } else if (idLength > this.length) {
      var subZoneId = zoneId.substr(0, this.length);
      var subTreeMap = this._treeMap[subZoneId];
      if (subTreeMap == null) {
        subTreeMap = new ZoneIdTreeMap(idLength, false);
        this._treeMap[subZoneId] = subTreeMap;
      }
      subTreeMap.add(zoneId);
    }
  };
  _proto2.get = function get(zoneId) {
    return this._treeMap[zoneId];
  };
  return ZoneIdTreeMap;
}();
var zoneIdTree = new ZoneIdTree([]);

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var MAX_WIDTH = 15;
var DateTimeFormatterBuilder = function () {
  function DateTimeFormatterBuilder() {
    this._active = this;
    this._parent = null;
    this._printerParsers = [];
    this._optional = false;
    this._padNextWidth = 0;
    this._padNextChar = null;
    this._valueParserIndex = -1;
  }
  DateTimeFormatterBuilder._of = function _of(parent, optional) {
    requireNonNull(parent, 'parent');
    requireNonNull(optional, 'optional');
    var dtFormatterBuilder = new DateTimeFormatterBuilder();
    dtFormatterBuilder._parent = parent;
    dtFormatterBuilder._optional = optional;
    return dtFormatterBuilder;
  };
  var _proto = DateTimeFormatterBuilder.prototype;
  _proto.parseCaseSensitive = function parseCaseSensitive() {
    this._appendInternalPrinterParser(SettingsParser.SENSITIVE);
    return this;
  };
  _proto.parseCaseInsensitive = function parseCaseInsensitive() {
    this._appendInternalPrinterParser(SettingsParser.INSENSITIVE);
    return this;
  };
  _proto.parseStrict = function parseStrict() {
    this._appendInternalPrinterParser(SettingsParser.STRICT);
    return this;
  };
  _proto.parseLenient = function parseLenient() {
    this._appendInternalPrinterParser(SettingsParser.LENIENT);
    return this;
  };
  _proto.parseDefaulting = function parseDefaulting(field, value) {
    requireNonNull(field);
    this._appendInternal(new DefaultingParser(field, value));
    return this;
  };
  _proto.appendValue = function appendValue() {
    if (arguments.length === 1) {
      return this._appendValue1.apply(this, arguments);
    } else if (arguments.length === 2) {
      return this._appendValue2.apply(this, arguments);
    } else {
      return this._appendValue4.apply(this, arguments);
    }
  };
  _proto._appendValue1 = function _appendValue1(field) {
    requireNonNull(field);
    this._appendValuePrinterParser(new NumberPrinterParser(field, 1, MAX_WIDTH, SignStyle.NORMAL));
    return this;
  };
  _proto._appendValue2 = function _appendValue2(field, width) {
    requireNonNull(field);
    if (width < 1 || width > MAX_WIDTH) {
      throw new IllegalArgumentException("The width must be from 1 to " + MAX_WIDTH + " inclusive but was " + width);
    }
    var pp = new NumberPrinterParser(field, width, width, SignStyle.NOT_NEGATIVE);
    this._appendValuePrinterParser(pp);
    return this;
  };
  _proto._appendValue4 = function _appendValue4(field, minWidth, maxWidth, signStyle) {
    requireNonNull(field);
    requireNonNull(signStyle);
    if (minWidth === maxWidth && signStyle === SignStyle.NOT_NEGATIVE) {
      return this._appendValue2(field, maxWidth);
    }
    if (minWidth < 1 || minWidth > MAX_WIDTH) {
      throw new IllegalArgumentException("The minimum width must be from 1 to " + MAX_WIDTH + " inclusive but was " + minWidth);
    }
    if (maxWidth < 1 || maxWidth > MAX_WIDTH) {
      throw new IllegalArgumentException("The minimum width must be from 1 to " + MAX_WIDTH + " inclusive but was " + maxWidth);
    }
    if (maxWidth < minWidth) {
      throw new IllegalArgumentException("The maximum width must exceed or equal the minimum width but " + maxWidth + " < " + minWidth);
    }
    var pp = new NumberPrinterParser(field, minWidth, maxWidth, signStyle);
    this._appendValuePrinterParser(pp);
    return this;
  };
  _proto.appendValueReduced = function appendValueReduced() {
    if (arguments.length === 4 && arguments[3] instanceof ChronoLocalDate) {
      return this._appendValueReducedFieldWidthMaxWidthBaseDate.apply(this, arguments);
    } else {
      return this._appendValueReducedFieldWidthMaxWidthBaseValue.apply(this, arguments);
    }
  };
  _proto._appendValueReducedFieldWidthMaxWidthBaseValue = function _appendValueReducedFieldWidthMaxWidthBaseValue(field, width, maxWidth, baseValue) {
    requireNonNull(field, 'field');
    var pp = new ReducedPrinterParser(field, width, maxWidth, baseValue, null);
    this._appendValuePrinterParser(pp);
    return this;
  };
  _proto._appendValueReducedFieldWidthMaxWidthBaseDate = function _appendValueReducedFieldWidthMaxWidthBaseDate(field, width, maxWidth, baseDate) {
    requireNonNull(field, 'field');
    requireNonNull(baseDate, 'baseDate');
    requireInstance(baseDate, ChronoLocalDate, 'baseDate');
    var pp = new ReducedPrinterParser(field, width, maxWidth, 0, baseDate);
    this._appendValuePrinterParser(pp);
    return this;
  };
  _proto._appendValuePrinterParser = function _appendValuePrinterParser(pp) {
    assert(pp != null);
    if (this._active._valueParserIndex >= 0 && this._active._printerParsers[this._active._valueParserIndex] instanceof NumberPrinterParser) {
      var activeValueParser = this._active._valueParserIndex;
      var basePP = this._active._printerParsers[activeValueParser];
      if (pp.minWidth() === pp.maxWidth() && pp.signStyle() === SignStyle.NOT_NEGATIVE) {
        basePP = basePP.withSubsequentWidth(pp.maxWidth());
        this._appendInternal(pp.withFixedWidth());
        this._active._valueParserIndex = activeValueParser;
      } else {
        basePP = basePP.withFixedWidth();
        this._active._valueParserIndex = this._appendInternal(pp);
      }
      this._active._printerParsers[activeValueParser] = basePP;
    } else {
      this._active._valueParserIndex = this._appendInternal(pp);
    }
    return this;
  };
  _proto.appendFraction = function appendFraction(field, minWidth, maxWidth, decimalPoint) {
    this._appendInternal(new FractionPrinterParser(field, minWidth, maxWidth, decimalPoint));
    return this;
  };
  _proto.appendInstant = function appendInstant(fractionalDigits) {
    if (fractionalDigits === void 0) {
      fractionalDigits = -2;
    }
    if (fractionalDigits < -2 || fractionalDigits > 9) {
      throw new IllegalArgumentException("Invalid fractional digits: " + fractionalDigits);
    }
    this._appendInternal(new InstantPrinterParser(fractionalDigits));
    return this;
  };
  _proto.appendOffsetId = function appendOffsetId() {
    this._appendInternal(OffsetIdPrinterParser.INSTANCE_ID);
    return this;
  };
  _proto.appendOffset = function appendOffset(pattern, noOffsetText) {
    this._appendInternalPrinterParser(new OffsetIdPrinterParser(noOffsetText, pattern));
    return this;
  };
  _proto.appendZoneId = function appendZoneId() {
    this._appendInternal(new ZoneIdPrinterParser(TemporalQueries.zoneId(), 'ZoneId()'));
    return this;
  };
  _proto.appendPattern = function appendPattern(pattern) {
    requireNonNull(pattern, 'pattern');
    this._parsePattern(pattern);
    return this;
  };
  _proto.appendZoneText = function appendZoneText() {
    throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
  };
  _proto.appendText = function appendText() {
    throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
  };
  _proto.appendLocalizedOffset = function appendLocalizedOffset() {
    throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
  };
  _proto.appendWeekField = function appendWeekField() {
    throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
  };
  _proto._parsePattern = function _parsePattern(pattern) {
    var FIELD_MAP = {
      'G': ChronoField.ERA,
      'y': ChronoField.YEAR_OF_ERA,
      'u': ChronoField.YEAR,
      'Q': IsoFields.QUARTER_OF_YEAR,
      'q': IsoFields.QUARTER_OF_YEAR,
      'M': ChronoField.MONTH_OF_YEAR,
      'L': ChronoField.MONTH_OF_YEAR,
      'D': ChronoField.DAY_OF_YEAR,
      'd': ChronoField.DAY_OF_MONTH,
      'F': ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH,
      'E': ChronoField.DAY_OF_WEEK,
      'c': ChronoField.DAY_OF_WEEK,
      'e': ChronoField.DAY_OF_WEEK,
      'a': ChronoField.AMPM_OF_DAY,
      'H': ChronoField.HOUR_OF_DAY,
      'k': ChronoField.CLOCK_HOUR_OF_DAY,
      'K': ChronoField.HOUR_OF_AMPM,
      'h': ChronoField.CLOCK_HOUR_OF_AMPM,
      'm': ChronoField.MINUTE_OF_HOUR,
      's': ChronoField.SECOND_OF_MINUTE,
      'S': ChronoField.NANO_OF_SECOND,
      'A': ChronoField.MILLI_OF_DAY,
      'n': ChronoField.NANO_OF_SECOND,
      'N': ChronoField.NANO_OF_DAY
    };
    for (var pos = 0; pos < pattern.length; pos++) {
      var cur = pattern.charAt(pos);
      if (cur >= 'A' && cur <= 'Z' || cur >= 'a' && cur <= 'z') {
        var start = pos++;
        for (; pos < pattern.length && pattern.charAt(pos) === cur; pos++);
        var count = pos - start;
        if (cur === 'p') {
          var pad = 0;
          if (pos < pattern.length) {
            cur = pattern.charAt(pos);
            if (cur >= 'A' && cur <= 'Z' || cur >= 'a' && cur <= 'z') {
              pad = count;
              start = pos++;
              for (; pos < pattern.length && pattern.charAt(pos) === cur; pos++);
              count = pos - start;
            }
          }
          if (pad === 0) {
            throw new IllegalArgumentException("Pad letter 'p' must be followed by valid pad pattern: " + pattern);
          }
          this.padNext(pad);
        }
        var field = FIELD_MAP[cur];
        if (field != null) {
          this._parseField(cur, count, field);
        } else if (cur === 'z') {
          if (count > 4) {
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
          } else if (count === 4) {
            this.appendZoneText(TextStyle.FULL);
          } else {
            this.appendZoneText(TextStyle.SHORT);
          }
        } else if (cur === 'V') {
          if (count !== 2) {
            throw new IllegalArgumentException("Pattern letter count must be 2: " + cur);
          }
          this.appendZoneId();
        } else if (cur === 'Z') {
          if (count < 4) {
            this.appendOffset('+HHMM', '+0000');
          } else if (count === 4) {
            this.appendLocalizedOffset(TextStyle.FULL);
          } else if (count === 5) {
            this.appendOffset('+HH:MM:ss', 'Z');
          } else {
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
          }
        } else if (cur === 'O') {
          if (count === 1) {
            this.appendLocalizedOffset(TextStyle.SHORT);
          } else if (count === 4) {
            this.appendLocalizedOffset(TextStyle.FULL);
          } else {
            throw new IllegalArgumentException("Pattern letter count must be 1 or 4: " + cur);
          }
        } else if (cur === 'X') {
          if (count > 5) {
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
          }
          this.appendOffset(OffsetIdPrinterParser.PATTERNS[count + (count === 1 ? 0 : 1)], 'Z');
        } else if (cur === 'x') {
          if (count > 5) {
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
          }
          var zero = count === 1 ? '+00' : count % 2 === 0 ? '+0000' : '+00:00';
          this.appendOffset(OffsetIdPrinterParser.PATTERNS[count + (count === 1 ? 0 : 1)], zero);
        } else if (cur === 'W') {
          if (count > 1) {
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
          }
          this.appendWeekField('W', count);
        } else if (cur === 'w') {
          if (count > 2) {
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
          }
          this.appendWeekField('w', count);
        } else if (cur === 'Y') {
          this.appendWeekField('Y', count);
        } else {
          throw new IllegalArgumentException("Unknown pattern letter: " + cur);
        }
        pos--;
      } else if (cur === '\'') {
        var _start = pos++;
        for (; pos < pattern.length; pos++) {
          if (pattern.charAt(pos) === '\'') {
            if (pos + 1 < pattern.length && pattern.charAt(pos + 1) === '\'') {
              pos++;
            } else {
              break;
            }
          }
        }
        if (pos >= pattern.length) {
          throw new IllegalArgumentException("Pattern ends with an incomplete string literal: " + pattern);
        }
        var str = pattern.substring(_start + 1, pos);
        if (str.length === 0) {
          this.appendLiteral('\'');
        } else {
          this.appendLiteral(str.replace('\'\'', '\''));
        }
      } else if (cur === '[') {
        this.optionalStart();
      } else if (cur === ']') {
        if (this._active._parent === null) {
          throw new IllegalArgumentException('Pattern invalid as it contains ] without previous [');
        }
        this.optionalEnd();
      } else if (cur === '{' || cur === '}' || cur === '#') {
        throw new IllegalArgumentException("Pattern includes reserved character: '" + cur + "'");
      } else {
        this.appendLiteral(cur);
      }
    }
  };
  _proto._parseField = function _parseField(cur, count, field) {
    switch (cur) {
      case 'u':
      case 'y':
        if (count === 2) {
          this.appendValueReduced(field, 2, 2, ReducedPrinterParser.BASE_DATE);
        } else if (count < 4) {
          this.appendValue(field, count, MAX_WIDTH, SignStyle.NORMAL);
        } else {
          this.appendValue(field, count, MAX_WIDTH, SignStyle.EXCEEDS_PAD);
        }
        break;
      case 'M':
      case 'Q':
        switch (count) {
          case 1:
            this.appendValue(field);
            break;
          case 2:
            this.appendValue(field, 2);
            break;
          case 3:
            this.appendText(field, TextStyle.SHORT);
            break;
          case 4:
            this.appendText(field, TextStyle.FULL);
            break;
          case 5:
            this.appendText(field, TextStyle.NARROW);
            break;
          default:
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'L':
      case 'q':
        switch (count) {
          case 1:
            this.appendValue(field);
            break;
          case 2:
            this.appendValue(field, 2);
            break;
          case 3:
            this.appendText(field, TextStyle.SHORT_STANDALONE);
            break;
          case 4:
            this.appendText(field, TextStyle.FULL_STANDALONE);
            break;
          case 5:
            this.appendText(field, TextStyle.NARROW_STANDALONE);
            break;
          default:
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'e':
        switch (count) {
          case 1:
          case 2:
            this.appendWeekField('e', count);
            break;
          case 3:
            this.appendText(field, TextStyle.SHORT);
            break;
          case 4:
            this.appendText(field, TextStyle.FULL);
            break;
          case 5:
            this.appendText(field, TextStyle.NARROW);
            break;
          default:
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'c':
        switch (count) {
          case 1:
            this.appendWeekField('c', count);
            break;
          case 2:
            throw new IllegalArgumentException("Invalid number of pattern letters: " + cur);
          case 3:
            this.appendText(field, TextStyle.SHORT_STANDALONE);
            break;
          case 4:
            this.appendText(field, TextStyle.FULL_STANDALONE);
            break;
          case 5:
            this.appendText(field, TextStyle.NARROW_STANDALONE);
            break;
          default:
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'a':
        if (count === 1) {
          this.appendText(field, TextStyle.SHORT);
        } else {
          throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'E':
      case 'G':
        switch (count) {
          case 1:
          case 2:
          case 3:
            this.appendText(field, TextStyle.SHORT);
            break;
          case 4:
            this.appendText(field, TextStyle.FULL);
            break;
          case 5:
            this.appendText(field, TextStyle.NARROW);
            break;
          default:
            throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'S':
        this.appendFraction(ChronoField.NANO_OF_SECOND, count, count, false);
        break;
      case 'F':
        if (count === 1) {
          this.appendValue(field);
        } else {
          throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'd':
      case 'h':
      case 'H':
      case 'k':
      case 'K':
      case 'm':
      case 's':
        if (count === 1) {
          this.appendValue(field);
        } else if (count === 2) {
          this.appendValue(field, count);
        } else {
          throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      case 'D':
        if (count === 1) {
          this.appendValue(field);
        } else if (count <= 3) {
          this.appendValue(field, count);
        } else {
          throw new IllegalArgumentException("Too many pattern letters: " + cur);
        }
        break;
      default:
        if (count === 1) {
          this.appendValue(field);
        } else {
          this.appendValue(field, count);
        }
        break;
    }
  };
  _proto.padNext = function padNext() {
    if (arguments.length === 1) {
      return this._padNext1.apply(this, arguments);
    } else {
      return this._padNext2.apply(this, arguments);
    }
  };
  _proto._padNext1 = function _padNext1(padWidth) {
    return this._padNext2(padWidth, ' ');
  };
  _proto._padNext2 = function _padNext2(padWidth, padChar) {
    if (padWidth < 1) {
      throw new IllegalArgumentException("The pad width must be at least one but was " + padWidth);
    }
    this._active._padNextWidth = padWidth;
    this._active._padNextChar = padChar;
    this._active._valueParserIndex = -1;
    return this;
  };
  _proto.optionalStart = function optionalStart() {
    this._active._valueParserIndex = -1;
    this._active = DateTimeFormatterBuilder._of(this._active, true);
    return this;
  };
  _proto.optionalEnd = function optionalEnd() {
    if (this._active._parent == null) {
      throw new IllegalStateException('Cannot call optionalEnd() as there was no previous call to optionalStart()');
    }
    if (this._active._printerParsers.length > 0) {
      var cpp = new CompositePrinterParser(this._active._printerParsers, this._active._optional);
      this._active = this._active._parent;
      this._appendInternal(cpp);
    } else {
      this._active = this._active._parent;
    }
    return this;
  };
  _proto._appendInternal = function _appendInternal(pp) {
    assert(pp != null);
    if (this._active._padNextWidth > 0) {
      if (pp != null) {
        pp = new PadPrinterParserDecorator(pp, this._active._padNextWidth, this._active._padNextChar);
      }
      this._active._padNextWidth = 0;
      this._active._padNextChar = 0;
    }
    this._active._printerParsers.push(pp);
    this._active._valueParserIndex = -1;
    return this._active._printerParsers.length - 1;
  };
  _proto.appendLiteral = function appendLiteral(literal) {
    assert(literal != null);
    if (literal.length > 0) {
      if (literal.length === 1) {
        this._appendInternalPrinterParser(new CharLiteralPrinterParser(literal.charAt(0)));
      } else {
        this._appendInternalPrinterParser(new StringLiteralPrinterParser(literal));
      }
    }
    return this;
  };
  _proto._appendInternalPrinterParser = function _appendInternalPrinterParser(pp) {
    assert(pp != null);
    if (this._active._padNextWidth > 0) {
      if (pp != null) {
        pp = new PadPrinterParserDecorator(pp, this._active._padNextWidth, this._active._padNextChar);
      }
      this._active._padNextWidth = 0;
      this._active._padNextChar = 0;
    }
    this._active._printerParsers.push(pp);
    this._active._valueParserIndex = -1;
    return this._active._printerParsers.length - 1;
  };
  _proto.append = function append(formatter) {
    requireNonNull(formatter, 'formatter');
    this._appendInternal(formatter._toPrinterParser(false));
    return this;
  };
  _proto.toFormatter = function toFormatter(resolverStyle) {
    if (resolverStyle === void 0) {
      resolverStyle = ResolverStyle.SMART;
    }
    while (this._active._parent != null) {
      this.optionalEnd();
    }
    var pp = new CompositePrinterParser(this._printerParsers, false);
    return new DateTimeFormatter(pp, null, DecimalStyle.STANDARD, resolverStyle, null, null, null);
  };
  return DateTimeFormatterBuilder;
}();
var SECONDS_PER_10000_YEARS = 146097 * 25 * 86400;
var SECONDS_0000_TO_1970 = (146097 * 5 - (30 * 365 + 7)) * 86400;
var InstantPrinterParser = function () {
  function InstantPrinterParser(fractionalDigits) {
    this.fractionalDigits = fractionalDigits;
  }
  var _proto2 = InstantPrinterParser.prototype;
  _proto2.print = function print(context, buf) {
    var inSecs = context.getValue(ChronoField.INSTANT_SECONDS);
    var inNanos = 0;
    if (context.temporal().isSupported(ChronoField.NANO_OF_SECOND)) {
      inNanos = context.temporal().getLong(ChronoField.NANO_OF_SECOND);
    }
    if (inSecs == null) {
      return false;
    }
    var inSec = inSecs;
    var inNano = ChronoField.NANO_OF_SECOND.checkValidIntValue(inNanos);
    if (inSec >= -SECONDS_0000_TO_1970) {
      var zeroSecs = inSec - SECONDS_PER_10000_YEARS + SECONDS_0000_TO_1970;
      var hi = MathUtil.floorDiv(zeroSecs, SECONDS_PER_10000_YEARS) + 1;
      var lo = MathUtil.floorMod(zeroSecs, SECONDS_PER_10000_YEARS);
      var ldt = LocalDateTime.ofEpochSecond(lo - SECONDS_0000_TO_1970, 0, ZoneOffset.UTC);
      if (hi > 0) {
        buf.append('+').append(hi);
      }
      buf.append(ldt.toString());
      if (ldt.second() === 0) {
        buf.append(':00');
      }
    } else {
      var _zeroSecs = inSec + SECONDS_0000_TO_1970;
      var _hi = MathUtil.intDiv(_zeroSecs, SECONDS_PER_10000_YEARS);
      var _lo = MathUtil.intMod(_zeroSecs, SECONDS_PER_10000_YEARS);
      var _ldt = LocalDateTime.ofEpochSecond(_lo - SECONDS_0000_TO_1970, 0, ZoneOffset.UTC);
      var pos = buf.length();
      buf.append(_ldt.toString());
      if (_ldt.second() === 0) {
        buf.append(':00');
      }
      if (_hi < 0) {
        if (_ldt.year() === -10000) {
          buf.replace(pos, pos + 2, "" + (_hi - 1));
        } else if (_lo === 0) {
          buf.insert(pos, _hi);
        } else {
          buf.insert(pos + 1, Math.abs(_hi));
        }
      }
    }
    if (this.fractionalDigits === -2) {
      if (inNano !== 0) {
        buf.append('.');
        if (MathUtil.intMod(inNano, 1000000) === 0) {
          buf.append(("" + (MathUtil.intDiv(inNano, 1000000) + 1000)).substring(1));
        } else if (MathUtil.intMod(inNano, 1000) === 0) {
          buf.append(("" + (MathUtil.intDiv(inNano, 1000) + 1000000)).substring(1));
        } else {
          buf.append(("" + (inNano + 1000000000)).substring(1));
        }
      }
    } else if (this.fractionalDigits > 0 || this.fractionalDigits === -1 && inNano > 0) {
      buf.append('.');
      var div = 100000000;
      for (var i = 0; this.fractionalDigits === -1 && inNano > 0 || i < this.fractionalDigits; i++) {
        var digit = MathUtil.intDiv(inNano, div);
        buf.append(digit);
        inNano = inNano - digit * div;
        div = MathUtil.intDiv(div, 10);
      }
    }
    buf.append('Z');
    return true;
  };
  _proto2.parse = function parse(context, text, position) {
    var newContext = context.copy();
    var minDigits = this.fractionalDigits < 0 ? 0 : this.fractionalDigits;
    var maxDigits = this.fractionalDigits < 0 ? 9 : this.fractionalDigits;
    var parser = new DateTimeFormatterBuilder().append(DateTimeFormatter.ISO_LOCAL_DATE).appendLiteral('T').appendValue(ChronoField.HOUR_OF_DAY, 2).appendLiteral(':').appendValue(ChronoField.MINUTE_OF_HOUR, 2).appendLiteral(':').appendValue(ChronoField.SECOND_OF_MINUTE, 2).appendFraction(ChronoField.NANO_OF_SECOND, minDigits, maxDigits, true).appendLiteral('Z').toFormatter()._toPrinterParser(false);
    var pos = parser.parse(newContext, text, position);
    if (pos < 0) {
      return pos;
    }
    var yearParsed = newContext.getParsed(ChronoField.YEAR);
    var month = newContext.getParsed(ChronoField.MONTH_OF_YEAR);
    var day = newContext.getParsed(ChronoField.DAY_OF_MONTH);
    var hour = newContext.getParsed(ChronoField.HOUR_OF_DAY);
    var min = newContext.getParsed(ChronoField.MINUTE_OF_HOUR);
    var secVal = newContext.getParsed(ChronoField.SECOND_OF_MINUTE);
    var nanoVal = newContext.getParsed(ChronoField.NANO_OF_SECOND);
    var sec = secVal != null ? secVal : 0;
    var nano = nanoVal != null ? nanoVal : 0;
    var year = MathUtil.intMod(yearParsed, 10000);
    var days = 0;
    if (hour === 24 && min === 0 && sec === 0 && nano === 0) {
      hour = 0;
      days = 1;
    } else if (hour === 23 && min === 59 && sec === 60) {
      context.setParsedLeapSecond();
      sec = 59;
    }
    var instantSecs;
    try {
      var ldt = LocalDateTime.of(year, month, day, hour, min, sec, 0).plusDays(days);
      instantSecs = ldt.toEpochSecond(ZoneOffset.UTC);
      instantSecs += MathUtil.safeMultiply(MathUtil.intDiv(yearParsed, 10000), SECONDS_PER_10000_YEARS);
    } catch (ex) {
      return ~position;
    }
    var successPos = pos;
    successPos = context.setParsedField(ChronoField.INSTANT_SECONDS, instantSecs, position, successPos);
    return context.setParsedField(ChronoField.NANO_OF_SECOND, nano, position, successPos);
  };
  _proto2.toString = function toString() {
    return 'Instant()';
  };
  return InstantPrinterParser;
}();
var DefaultingParser = function () {
  function DefaultingParser(field, value) {
    this._field = field;
    this._value = value;
  }
  var _proto3 = DefaultingParser.prototype;
  _proto3.print = function print() {
    return true;
  };
  _proto3.parse = function parse(context, text, position) {
    if (context.getParsed(this._field) == null) {
      context.setParsedField(this._field, this._value, position, position);
    }
    return position;
  };
  return DefaultingParser;
}();
function _init$e() {
  ReducedPrinterParser.BASE_DATE = LocalDate.of(2000, 1, 1);
  DateTimeFormatterBuilder.CompositePrinterParser = CompositePrinterParser;
  DateTimeFormatterBuilder.PadPrinterParserDecorator = PadPrinterParserDecorator;
  DateTimeFormatterBuilder.SettingsParser = SettingsParser;
  DateTimeFormatterBuilder.CharLiteralPrinterParser = StringLiteralPrinterParser;
  DateTimeFormatterBuilder.StringLiteralPrinterParser = StringLiteralPrinterParser;
  DateTimeFormatterBuilder.CharLiteralPrinterParser = CharLiteralPrinterParser;
  DateTimeFormatterBuilder.NumberPrinterParser = NumberPrinterParser;
  DateTimeFormatterBuilder.ReducedPrinterParser = ReducedPrinterParser;
  DateTimeFormatterBuilder.FractionPrinterParser = FractionPrinterParser;
  DateTimeFormatterBuilder.OffsetIdPrinterParser = OffsetIdPrinterParser;
  DateTimeFormatterBuilder.ZoneIdPrinterParser = ZoneIdPrinterParser;
}

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */var StringBuilder = function () {
  function StringBuilder() {
    this._str = '';
  }
  var _proto = StringBuilder.prototype;
  _proto.append = function append(str) {
    this._str += str;
    return this;
  };
  _proto.appendChar = function appendChar(str) {
    this._str += str[0];
    return this;
  };
  _proto.insert = function insert(offset, str) {
    this._str = this._str.slice(0, offset) + str + this._str.slice(offset);
    return this;
  };
  _proto.replace = function replace(start, end, str) {
    this._str = this._str.slice(0, start) + str + this._str.slice(end);
    return this;
  };
  _proto.length = function length() {
    return this._str.length;
  };
  _proto.setLength = function setLength(length) {
    this._str = this._str.slice(0, length);
    return this;
  };
  _proto.toString = function toString() {
    return this._str;
  };
  return StringBuilder;
}();

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var DateTimeFormatter = function () {
  DateTimeFormatter.parsedExcessDays = function parsedExcessDays() {
    return DateTimeFormatter.PARSED_EXCESS_DAYS;
  };
  DateTimeFormatter.parsedLeapSecond = function parsedLeapSecond() {
    return DateTimeFormatter.PARSED_LEAP_SECOND;
  };
  DateTimeFormatter.ofPattern = function ofPattern(pattern) {
    return new DateTimeFormatterBuilder().appendPattern(pattern).toFormatter();
  };
  function DateTimeFormatter(printerParser, locale, decimalStyle, resolverStyle, resolverFields, chrono, zone) {
    if (chrono === void 0) {
      chrono = IsoChronology.INSTANCE;
    }
    assert(printerParser != null);
    assert(decimalStyle != null);
    assert(resolverStyle != null);
    this._printerParser = printerParser;
    this._locale = locale;
    this._decimalStyle = decimalStyle;
    this._resolverStyle = resolverStyle;
    this._resolverFields = resolverFields;
    this._chrono = chrono;
    this._zone = zone;
  }
  var _proto = DateTimeFormatter.prototype;
  _proto.locale = function locale() {
    return this._locale;
  };
  _proto.decimalStyle = function decimalStyle() {
    return this._decimalStyle;
  };
  _proto.chronology = function chronology() {
    return this._chrono;
  };
  _proto.withChronology = function withChronology(chrono) {
    if (this._chrono != null && this._chrono.equals(chrono)) {
      return this;
    }
    return new DateTimeFormatter(this._printerParser, this._locale, this._decimalStyle, this._resolverStyle, this._resolverFields, chrono, this._zone);
  };
  _proto.withLocale = function withLocale() {
    return this;
  };
  _proto.withResolverStyle = function withResolverStyle(resolverStyle) {
    requireNonNull(resolverStyle, 'resolverStyle');
    if (resolverStyle.equals(this._resolverStyle)) {
      return this;
    }
    return new DateTimeFormatter(this._printerParser, this._locale, this._decimalStyle, resolverStyle, this._resolverFields, this._chrono, this._zone);
  };
  _proto.format = function format(temporal) {
    var buf = new StringBuilder(32);
    this._formatTo(temporal, buf);
    return buf.toString();
  };
  _proto._formatTo = function _formatTo(temporal, appendable) {
    requireNonNull(temporal, 'temporal');
    requireNonNull(appendable, 'appendable');
    var context = new DateTimePrintContext(temporal, this);
    this._printerParser.print(context, appendable);
  };
  _proto.parse = function parse(text, type) {
    if (arguments.length === 1) {
      return this.parse1(text);
    } else {
      return this.parse2(text, type);
    }
  };
  _proto.parse1 = function parse1(text) {
    requireNonNull(text, 'text');
    try {
      return this._parseToBuilder(text, null).resolve(this._resolverStyle, this._resolverFields);
    } catch (ex) {
      if (ex instanceof DateTimeParseException) {
        throw ex;
      } else {
        throw this._createError(text, ex);
      }
    }
  };
  _proto.parse2 = function parse2(text, type) {
    requireNonNull(text, 'text');
    requireNonNull(type, 'type');
    try {
      var builder = this._parseToBuilder(text, null).resolve(this._resolverStyle, this._resolverFields);
      return builder.build(type);
    } catch (ex) {
      if (ex instanceof DateTimeParseException) {
        throw ex;
      } else {
        throw this._createError(text, ex);
      }
    }
  };
  _proto._createError = function _createError(text, ex) {
    var abbr = '';
    if (text.length > 64) {
      abbr = text.substring(0, 64) + "...";
    } else {
      abbr = text;
    }
    return new DateTimeParseException("Text '" + abbr + "' could not be parsed: " + ex.message, text, 0, ex);
  };
  _proto._parseToBuilder = function _parseToBuilder(text, position) {
    var pos = position != null ? position : new ParsePosition(0);
    var result = this._parseUnresolved0(text, pos);
    if (result == null || pos.getErrorIndex() >= 0 || position == null && pos.getIndex() < text.length) {
      var abbr = '';
      if (text.length > 64) {
        abbr = text.substr(0, 64).toString() + "...";
      } else {
        abbr = text;
      }
      if (pos.getErrorIndex() >= 0) {
        throw new DateTimeParseException("Text '" + abbr + "' could not be parsed at index " + pos.getErrorIndex(), text, pos.getErrorIndex());
      } else {
        throw new DateTimeParseException("Text '" + abbr + "' could not be parsed, unparsed text found at index " + pos.getIndex(), text, pos.getIndex());
      }
    }
    return result.toBuilder();
  };
  _proto.parseUnresolved = function parseUnresolved(text, position) {
    return this._parseUnresolved0(text, position);
  };
  _proto._parseUnresolved0 = function _parseUnresolved0(text, position) {
    assert(text != null, 'text', NullPointerException);
    assert(position != null, 'position', NullPointerException);
    var context = new DateTimeParseContext(this);
    var pos = position.getIndex();
    pos = this._printerParser.parse(context, text, pos);
    if (pos < 0) {
      position.setErrorIndex(~pos);
      return null;
    }
    position.setIndex(pos);
    return context.toParsed();
  };
  _proto._toPrinterParser = function _toPrinterParser(optional) {
    return this._printerParser.withOptional(optional);
  };
  _proto.toString = function toString() {
    var pattern = this._printerParser.toString();
    return pattern.indexOf('[') === 0 ? pattern : pattern.substring(1, pattern.length - 1);
  };
  return DateTimeFormatter;
}();
function _init$d() {
  DateTimeFormatter.ISO_LOCAL_DATE = new DateTimeFormatterBuilder().appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD).appendLiteral('-').appendValue(ChronoField.MONTH_OF_YEAR, 2).appendLiteral('-').appendValue(ChronoField.DAY_OF_MONTH, 2).toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.ISO_LOCAL_TIME = new DateTimeFormatterBuilder().appendValue(ChronoField.HOUR_OF_DAY, 2).appendLiteral(':').appendValue(ChronoField.MINUTE_OF_HOUR, 2).optionalStart().appendLiteral(':').appendValue(ChronoField.SECOND_OF_MINUTE, 2).optionalStart().appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true).toFormatter(ResolverStyle.STRICT);
  DateTimeFormatter.ISO_LOCAL_DATE_TIME = new DateTimeFormatterBuilder().parseCaseInsensitive().append(DateTimeFormatter.ISO_LOCAL_DATE).appendLiteral('T').append(DateTimeFormatter.ISO_LOCAL_TIME).toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.ISO_INSTANT = new DateTimeFormatterBuilder().parseCaseInsensitive().appendInstant().toFormatter(ResolverStyle.STRICT);
  DateTimeFormatter.ISO_OFFSET_DATE_TIME = new DateTimeFormatterBuilder().parseCaseInsensitive().append(DateTimeFormatter.ISO_LOCAL_DATE_TIME).appendOffsetId().toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.ISO_ZONED_DATE_TIME = new DateTimeFormatterBuilder().append(DateTimeFormatter.ISO_OFFSET_DATE_TIME).optionalStart().appendLiteral('[').parseCaseSensitive().appendZoneId().appendLiteral(']').toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.BASIC_ISO_DATE = new DateTimeFormatterBuilder().appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD).appendValue(ChronoField.MONTH_OF_YEAR, 2).appendValue(ChronoField.DAY_OF_MONTH, 2).toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.ISO_OFFSET_DATE = new DateTimeFormatterBuilder().parseCaseInsensitive().append(DateTimeFormatter.ISO_LOCAL_DATE).appendOffsetId().toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.ISO_OFFSET_TIME = new DateTimeFormatterBuilder().parseCaseInsensitive().append(DateTimeFormatter.ISO_LOCAL_TIME).appendOffsetId().toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.ISO_ORDINAL_DATE = new DateTimeFormatterBuilder().appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD).appendLiteral('-').appendValue(ChronoField.DAY_OF_YEAR).toFormatter(ResolverStyle.STRICT);
  DateTimeFormatter.ISO_WEEK_DATE = new DateTimeFormatterBuilder().appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD).appendLiteral('-W').appendValue(ChronoField.ALIGNED_WEEK_OF_YEAR).appendLiteral('-').appendValue(ChronoField.DAY_OF_WEEK).toFormatter(ResolverStyle.STRICT);
  DateTimeFormatter.ISO_DATE = new DateTimeFormatterBuilder().parseCaseInsensitive().append(DateTimeFormatter.ISO_LOCAL_DATE).optionalStart().appendOffsetId().optionalEnd().toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.ISO_TIME = new DateTimeFormatterBuilder().parseCaseInsensitive().append(DateTimeFormatter.ISO_LOCAL_TIME).optionalStart().appendOffsetId().optionalEnd().toFormatter(ResolverStyle.STRICT);
  DateTimeFormatter.ISO_DATE_TIME = new DateTimeFormatterBuilder().append(DateTimeFormatter.ISO_LOCAL_DATE_TIME).optionalStart().appendOffsetId().optionalEnd().toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);
  DateTimeFormatter.PARSED_EXCESS_DAYS = createTemporalQuery('PARSED_EXCESS_DAYS', function (temporal) {
    if (temporal instanceof DateTimeBuilder) {
      return temporal.excessDays;
    } else {
      return Period.ZERO;
    }
  });
  DateTimeFormatter.PARSED_LEAP_SECOND = createTemporalQuery('PARSED_LEAP_SECOND', function (temporal) {
    if (temporal instanceof DateTimeBuilder) {
      return temporal.leapSecond;
    } else {
      return false;
    }
  });
}

var MonthDay = function (_TemporalAccessor) {
  _inheritsLoose(MonthDay, _TemporalAccessor);
  MonthDay.now = function now(zoneIdOrClock) {
    if (arguments.length === 0) {
      return MonthDay.now0();
    } else if (arguments.length === 1 && zoneIdOrClock instanceof ZoneId) {
      return MonthDay.nowZoneId(zoneIdOrClock);
    } else {
      return MonthDay.nowClock(zoneIdOrClock);
    }
  };
  MonthDay.now0 = function now0() {
    return this.nowClock(Clock.systemDefaultZone());
  };
  MonthDay.nowZoneId = function nowZoneId(zone) {
    requireNonNull(zone, 'zone');
    return this.nowClock(Clock.system(zone));
  };
  MonthDay.nowClock = function nowClock(clock) {
    requireNonNull(clock, 'clock');
    var now = LocalDate.now(clock);
    return MonthDay.of(now.month(), now.dayOfMonth());
  };
  MonthDay.of = function of(monthOrNumber, number) {
    if (arguments.length === 2 && monthOrNumber instanceof Month) {
      return MonthDay.ofMonthNumber(monthOrNumber, number);
    } else {
      return MonthDay.ofNumberNumber(monthOrNumber, number);
    }
  };
  MonthDay.ofMonthNumber = function ofMonthNumber(month, dayOfMonth) {
    requireNonNull(month, 'month');
    ChronoField.DAY_OF_MONTH.checkValidValue(dayOfMonth);
    if (dayOfMonth > month.maxLength()) {
      throw new DateTimeException("Illegal value for DayOfMonth field, value " + dayOfMonth + " is not valid for month " + month.toString());
    }
    return new MonthDay(month.value(), dayOfMonth);
  };
  MonthDay.ofNumberNumber = function ofNumberNumber(month, dayOfMonth) {
    requireNonNull(month, 'month');
    requireNonNull(dayOfMonth, 'dayOfMonth');
    return MonthDay.of(Month.of(month), dayOfMonth);
  };
  MonthDay.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    requireInstance(temporal, TemporalAccessor, 'temporal');
    if (temporal instanceof MonthDay) {
      return temporal;
    }
    try {
      return MonthDay.of(temporal.get(ChronoField.MONTH_OF_YEAR), temporal.get(ChronoField.DAY_OF_MONTH));
    } catch (ex) {
      throw new DateTimeException("Unable to obtain MonthDay from TemporalAccessor: " + temporal + ", type " + (temporal && temporal.constructor != null ? temporal.constructor.name : ''));
    }
  };
  MonthDay.parse = function parse(text, formatter) {
    if (arguments.length === 1) {
      return MonthDay.parseString(text);
    } else {
      return MonthDay.parseStringFormatter(text, formatter);
    }
  };
  MonthDay.parseString = function parseString(text) {
    return MonthDay.parseStringFormatter(text, PARSER$2);
  };
  MonthDay.parseStringFormatter = function parseStringFormatter(text, formatter) {
    requireNonNull(text, 'text');
    requireNonNull(formatter, 'formatter');
    requireInstance(formatter, DateTimeFormatter, 'formatter');
    return formatter.parse(text, MonthDay.FROM);
  };
  function MonthDay(month, dayOfMonth) {
    var _this;
    _this = _TemporalAccessor.call(this) || this;
    _this._month = MathUtil.safeToInt(month);
    _this._day = MathUtil.safeToInt(dayOfMonth);
    return _this;
  }
  var _proto = MonthDay.prototype;
  _proto.monthValue = function monthValue() {
    return this._month;
  };
  _proto.month = function month() {
    return Month.of(this._month);
  };
  _proto.dayOfMonth = function dayOfMonth() {
    return this._day;
  };
  _proto.isSupported = function isSupported(field) {
    if (field instanceof ChronoField) {
      return field === ChronoField.MONTH_OF_YEAR || field === ChronoField.DAY_OF_MONTH;
    }
    return field != null && field.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    if (field === ChronoField.MONTH_OF_YEAR) {
      return field.range();
    } else if (field === ChronoField.DAY_OF_MONTH) {
      return ValueRange.of(1, this.month().minLength(), this.month().maxLength());
    }
    return _TemporalAccessor.prototype.range.call(this, field);
  };
  _proto.get = function get(field) {
    return this.range(field).checkValidIntValue(this.getLong(field), field);
  };
  _proto.getLong = function getLong(field) {
    requireNonNull(field, 'field');
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.DAY_OF_MONTH:
          return this._day;
        case ChronoField.MONTH_OF_YEAR:
          return this._month;
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.getFrom(this);
  };
  _proto.isValidYear = function isValidYear(year) {
    return (this._day === 29 && this._month === 2 && Year.isLeap(year) === false) === false;
  };
  _proto.withMonth = function withMonth(month) {
    return this.with(Month.of(month));
  };
  _proto.with = function _with(month) {
    requireNonNull(month, 'month');
    if (month.value() === this._month) {
      return this;
    }
    var day = Math.min(this._day, month.maxLength());
    return new MonthDay(month.value(), day);
  };
  _proto.withDayOfMonth = function withDayOfMonth(dayOfMonth) {
    if (dayOfMonth === this._day) {
      return this;
    }
    return MonthDay.of(this._month, dayOfMonth);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    requireInstance(_query, TemporalQuery, 'query');
    if (_query === TemporalQueries.chronology()) {
      return IsoChronology.INSTANCE;
    }
    return _TemporalAccessor.prototype.query.call(this, _query);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    requireNonNull(temporal, 'temporal');
    temporal = temporal.with(ChronoField.MONTH_OF_YEAR, this._month);
    return temporal.with(ChronoField.DAY_OF_MONTH, Math.min(temporal.range(ChronoField.DAY_OF_MONTH).maximum(), this._day));
  };
  _proto.atYear = function atYear(year) {
    return LocalDate.of(year, this._month, this.isValidYear(year) ? this._day : 28);
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, MonthDay, 'other');
    var cmp = this._month - other.monthValue();
    if (cmp === 0) {
      cmp = this._day - other.dayOfMonth();
    }
    return cmp;
  };
  _proto.isAfter = function isAfter(other) {
    requireNonNull(other, 'other');
    requireInstance(other, MonthDay, 'other');
    return this.compareTo(other) > 0;
  };
  _proto.isBefore = function isBefore(other) {
    requireNonNull(other, 'other');
    requireInstance(other, MonthDay, 'other');
    return this.compareTo(other) < 0;
  };
  _proto.equals = function equals(obj) {
    if (this === obj) {
      return true;
    }
    if (obj instanceof MonthDay) {
      var other = obj;
      return this.monthValue() === other.monthValue() && this.dayOfMonth() === other.dayOfMonth();
    }
    return false;
  };
  _proto.toString = function toString() {
    return "--" + (this._month < 10 ? '0' : '') + this._month + (this._day < 10 ? '-0' : '-') + this._day;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    requireInstance(formatter, DateTimeFormatter, 'formatter');
    return formatter.format(this);
  };
  return MonthDay;
}(TemporalAccessor);
var PARSER$2;
function _init$c() {
  PARSER$2 = new DateTimeFormatterBuilder().appendLiteral('--').appendValue(ChronoField.MONTH_OF_YEAR, 2).appendLiteral('-').appendValue(ChronoField.DAY_OF_MONTH, 2).toFormatter();
  MonthDay.FROM = createTemporalQuery('MonthDay.FROM', function (temporal) {
    return MonthDay.from(temporal);
  });
}

var YearMonth = function (_Temporal) {
  _inheritsLoose(YearMonth, _Temporal);
  YearMonth.now = function now(zoneIdOrClock) {
    if (arguments.length === 0) {
      return YearMonth.now0();
    } else if (arguments.length === 1 && zoneIdOrClock instanceof ZoneId) {
      return YearMonth.nowZoneId(zoneIdOrClock);
    } else {
      return YearMonth.nowClock(zoneIdOrClock);
    }
  };
  YearMonth.now0 = function now0() {
    return YearMonth.nowClock(Clock.systemDefaultZone());
  };
  YearMonth.nowZoneId = function nowZoneId(zone) {
    return YearMonth.nowClock(Clock.system(zone));
  };
  YearMonth.nowClock = function nowClock(clock) {
    var now = LocalDate.now(clock);
    return YearMonth.of(now.year(), now.month());
  };
  YearMonth.of = function of(year, monthOrNumber) {
    if (arguments.length === 2 && monthOrNumber instanceof Month) {
      return YearMonth.ofNumberMonth(year, monthOrNumber);
    } else {
      return YearMonth.ofNumberNumber(year, monthOrNumber);
    }
  };
  YearMonth.ofNumberMonth = function ofNumberMonth(year, month) {
    requireNonNull(month, 'month');
    requireInstance(month, Month, 'month');
    return YearMonth.ofNumberNumber(year, month.value());
  };
  YearMonth.ofNumberNumber = function ofNumberNumber(year, month) {
    requireNonNull(year, 'year');
    requireNonNull(month, 'month');
    ChronoField.YEAR.checkValidValue(year);
    ChronoField.MONTH_OF_YEAR.checkValidValue(month);
    return new YearMonth(year, month);
  };
  YearMonth.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    if (temporal instanceof YearMonth) {
      return temporal;
    }
    try {
      return YearMonth.of(temporal.get(ChronoField.YEAR), temporal.get(ChronoField.MONTH_OF_YEAR));
    } catch (ex) {
      throw new DateTimeException("Unable to obtain YearMonth from TemporalAccessor: " + temporal + ", type " + (temporal && temporal.constructor != null ? temporal.constructor.name : ''));
    }
  };
  YearMonth.parse = function parse(text, formatter) {
    if (arguments.length === 1) {
      return YearMonth.parseString(text);
    } else {
      return YearMonth.parseStringFormatter(text, formatter);
    }
  };
  YearMonth.parseString = function parseString(text) {
    return YearMonth.parseStringFormatter(text, PARSER$1);
  };
  YearMonth.parseStringFormatter = function parseStringFormatter(text, formatter) {
    requireNonNull(formatter, 'formatter');
    return formatter.parse(text, YearMonth.FROM);
  };
  function YearMonth(year, month) {
    var _this;
    _this = _Temporal.call(this) || this;
    _this._year = MathUtil.safeToInt(year);
    _this._month = MathUtil.safeToInt(month);
    return _this;
  }
  var _proto = YearMonth.prototype;
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (arguments.length === 1 && fieldOrUnit instanceof TemporalField) {
      return this.isSupportedField(fieldOrUnit);
    } else {
      return this.isSupportedUnit(fieldOrUnit);
    }
  };
  _proto.isSupportedField = function isSupportedField(field) {
    if (field instanceof ChronoField) {
      return field === ChronoField.YEAR || field === ChronoField.MONTH_OF_YEAR || field === ChronoField.PROLEPTIC_MONTH || field === ChronoField.YEAR_OF_ERA || field === ChronoField.ERA;
    }
    return field != null && field.isSupportedBy(this);
  };
  _proto.isSupportedUnit = function isSupportedUnit(unit) {
    if (unit instanceof ChronoUnit) {
      return unit === ChronoUnit.MONTHS || unit === ChronoUnit.YEARS || unit === ChronoUnit.DECADES || unit === ChronoUnit.CENTURIES || unit === ChronoUnit.MILLENNIA || unit === ChronoUnit.ERAS;
    }
    return unit != null && unit.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    if (field === ChronoField.YEAR_OF_ERA) {
      return this.year() <= 0 ? ValueRange.of(1, Year.MAX_VALUE + 1) : ValueRange.of(1, Year.MAX_VALUE);
    }
    return _Temporal.prototype.range.call(this, field);
  };
  _proto.get = function get(field) {
    requireNonNull(field, 'field');
    requireInstance(field, TemporalField, 'field');
    return this.range(field).checkValidIntValue(this.getLong(field), field);
  };
  _proto.getLong = function getLong(field) {
    requireNonNull(field, 'field');
    requireInstance(field, TemporalField, 'field');
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.MONTH_OF_YEAR:
          return this._month;
        case ChronoField.PROLEPTIC_MONTH:
          return this._getProlepticMonth();
        case ChronoField.YEAR_OF_ERA:
          return this._year < 1 ? 1 - this._year : this._year;
        case ChronoField.YEAR:
          return this._year;
        case ChronoField.ERA:
          return this._year < 1 ? 0 : 1;
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.getFrom(this);
  };
  _proto._getProlepticMonth = function _getProlepticMonth() {
    return MathUtil.safeAdd(MathUtil.safeMultiply(this._year, 12), this._month - 1);
  };
  _proto.year = function year() {
    return this._year;
  };
  _proto.monthValue = function monthValue() {
    return this._month;
  };
  _proto.month = function month() {
    return Month.of(this._month);
  };
  _proto.isLeapYear = function isLeapYear() {
    return IsoChronology.isLeapYear(this._year);
  };
  _proto.isValidDay = function isValidDay(dayOfMonth) {
    return dayOfMonth >= 1 && dayOfMonth <= this.lengthOfMonth();
  };
  _proto.lengthOfMonth = function lengthOfMonth() {
    return this.month().length(this.isLeapYear());
  };
  _proto.lengthOfYear = function lengthOfYear() {
    return this.isLeapYear() ? 366 : 365;
  };
  _proto.with = function _with(adjusterOrField, value) {
    if (arguments.length === 1) {
      return this._withAdjuster(adjusterOrField);
    } else {
      return this._withField(adjusterOrField, value);
    }
  };
  _proto._withField = function _withField(field, newValue) {
    requireNonNull(field, 'field');
    requireInstance(field, TemporalField, 'field');
    if (field instanceof ChronoField) {
      var f = field;
      f.checkValidValue(newValue);
      switch (f) {
        case ChronoField.MONTH_OF_YEAR:
          return this.withMonth(newValue);
        case ChronoField.PROLEPTIC_MONTH:
          return this.plusMonths(newValue - this.getLong(ChronoField.PROLEPTIC_MONTH));
        case ChronoField.YEAR_OF_ERA:
          return this.withYear(this._year < 1 ? 1 - newValue : newValue);
        case ChronoField.YEAR:
          return this.withYear(newValue);
        case ChronoField.ERA:
          return this.getLong(ChronoField.ERA) === newValue ? this : this.withYear(1 - this._year);
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.adjustInto(this, newValue);
  };
  _proto.withYear = function withYear(year) {
    ChronoField.YEAR.checkValidValue(year);
    return new YearMonth(year, this._month);
  };
  _proto.withMonth = function withMonth(month) {
    ChronoField.MONTH_OF_YEAR.checkValidValue(month);
    return new YearMonth(this._year, month);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    requireNonNull(unit, 'unit');
    requireInstance(unit, TemporalUnit, 'unit');
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.MONTHS:
          return this.plusMonths(amountToAdd);
        case ChronoUnit.YEARS:
          return this.plusYears(amountToAdd);
        case ChronoUnit.DECADES:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 10));
        case ChronoUnit.CENTURIES:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 100));
        case ChronoUnit.MILLENNIA:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 1000));
        case ChronoUnit.ERAS:
          return this.with(ChronoField.ERA, MathUtil.safeAdd(this.getLong(ChronoField.ERA), amountToAdd));
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusYears = function plusYears(yearsToAdd) {
    if (yearsToAdd === 0) {
      return this;
    }
    var newYear = ChronoField.YEAR.checkValidIntValue(this._year + yearsToAdd);
    return this.withYear(newYear);
  };
  _proto.plusMonths = function plusMonths(monthsToAdd) {
    if (monthsToAdd === 0) {
      return this;
    }
    var monthCount = this._year * 12 + (this._month - 1);
    var calcMonths = monthCount + monthsToAdd;
    var newYear = ChronoField.YEAR.checkValidIntValue(MathUtil.floorDiv(calcMonths, 12));
    var newMonth = MathUtil.floorMod(calcMonths, 12) + 1;
    return new YearMonth(newYear, newMonth);
  };
  _proto.minusYears = function minusYears(yearsToSubtract) {
    return yearsToSubtract === MathUtil.MIN_SAFE_INTEGER ? this.plusYears(MathUtil.MIN_SAFE_INTEGER).plusYears(1) : this.plusYears(-yearsToSubtract);
  };
  _proto.minusMonths = function minusMonths(monthsToSubtract) {
    return monthsToSubtract === MathUtil.MIN_SAFE_INTEGER ? this.plusMonths(Math.MAX_SAFE_INTEGER).plusMonths(1) : this.plusMonths(-monthsToSubtract);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    requireInstance(_query, TemporalQuery, 'query');
    if (_query === TemporalQueries.chronology()) {
      return IsoChronology.INSTANCE;
    } else if (_query === TemporalQueries.precision()) {
      return ChronoUnit.MONTHS;
    } else if (_query === TemporalQueries.localDate() || _query === TemporalQueries.localTime() || _query === TemporalQueries.zone() || _query === TemporalQueries.zoneId() || _query === TemporalQueries.offset()) {
      return null;
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    requireNonNull(temporal, 'temporal');
    requireInstance(temporal, Temporal, 'temporal');
    return temporal.with(ChronoField.PROLEPTIC_MONTH, this._getProlepticMonth());
  };
  _proto.until = function until(endExclusive, unit) {
    requireNonNull(endExclusive, 'endExclusive');
    requireNonNull(unit, 'unit');
    requireInstance(endExclusive, Temporal, 'endExclusive');
    requireInstance(unit, TemporalUnit, 'unit');
    var end = YearMonth.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      var monthsUntil = end._getProlepticMonth() - this._getProlepticMonth();
      switch (unit) {
        case ChronoUnit.MONTHS:
          return monthsUntil;
        case ChronoUnit.YEARS:
          return MathUtil.intDiv(monthsUntil, 12);
        case ChronoUnit.DECADES:
          return MathUtil.intDiv(monthsUntil, 120);
        case ChronoUnit.CENTURIES:
          return MathUtil.intDiv(monthsUntil, 1200);
        case ChronoUnit.MILLENNIA:
          return MathUtil.intDiv(monthsUntil, 12000);
        case ChronoUnit.ERAS:
          return end.getLong(ChronoField.ERA) - this.getLong(ChronoField.ERA);
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.between(this, end);
  };
  _proto.atDay = function atDay(dayOfMonth) {
    requireNonNull(dayOfMonth, 'dayOfMonth');
    return LocalDate.of(this._year, this._month, dayOfMonth);
  };
  _proto.atEndOfMonth = function atEndOfMonth() {
    return LocalDate.of(this._year, this._month, this.lengthOfMonth());
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, YearMonth, 'other');
    var cmp = this._year - other.year();
    if (cmp === 0) {
      cmp = this._month - other.monthValue();
    }
    return cmp;
  };
  _proto.isAfter = function isAfter(other) {
    return this.compareTo(other) > 0;
  };
  _proto.isBefore = function isBefore(other) {
    return this.compareTo(other) < 0;
  };
  _proto.equals = function equals(obj) {
    if (this === obj) {
      return true;
    }
    if (obj instanceof YearMonth) {
      var other = obj;
      return this.year() === other.year() && this.monthValue() === other.monthValue();
    }
    return false;
  };
  _proto.toString = function toString() {
    return PARSER$1.format(this);
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    return formatter.format(this);
  };
  return YearMonth;
}(Temporal);
var PARSER$1;
function _init$b() {
  PARSER$1 = new DateTimeFormatterBuilder().appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD).appendLiteral('-').appendValue(ChronoField.MONTH_OF_YEAR, 2).toFormatter();
  YearMonth.FROM = createTemporalQuery('YearMonth.FROM', function (temporal) {
    return YearMonth.from(temporal);
  });
}

var Year = function (_Temporal) {
  _inheritsLoose(Year, _Temporal);
  function Year(value) {
    var _this;
    _this = _Temporal.call(this) || this;
    _this._year = MathUtil.safeToInt(value);
    return _this;
  }
  var _proto = Year.prototype;
  _proto.value = function value() {
    return this._year;
  };
  Year.now = function now(zoneIdOrClock) {
    if (zoneIdOrClock === void 0) {
      zoneIdOrClock = undefined;
    }
    if (zoneIdOrClock === undefined) {
      return Year.now0();
    } else if (zoneIdOrClock instanceof ZoneId) {
      return Year.nowZoneId(zoneIdOrClock);
    } else {
      return Year.nowClock(zoneIdOrClock);
    }
  };
  Year.now0 = function now0() {
    return Year.nowClock(Clock.systemDefaultZone());
  };
  Year.nowZoneId = function nowZoneId(zone) {
    requireNonNull(zone, 'zone');
    requireInstance(zone, ZoneId, 'zone');
    return Year.nowClock(Clock.system(zone));
  };
  Year.nowClock = function nowClock(clock) {
    requireNonNull(clock, 'clock');
    requireInstance(clock, Clock, 'clock');
    var now = LocalDate.now(clock);
    return Year.of(now.year());
  };
  Year.of = function of(isoYear) {
    requireNonNull(isoYear, 'isoYear');
    ChronoField.YEAR.checkValidValue(isoYear);
    return new Year(isoYear);
  };
  Year.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    requireInstance(temporal, TemporalAccessor, 'temporal');
    if (temporal instanceof Year) {
      return temporal;
    }
    try {
      return Year.of(temporal.get(ChronoField.YEAR));
    } catch (ex) {
      throw new DateTimeException("Unable to obtain Year from TemporalAccessor: " + temporal + ", type " + (temporal && temporal.constructor != null ? temporal.constructor.name : ''));
    }
  };
  Year.parse = function parse(text, formatter) {
    if (arguments.length <= 1) {
      return Year.parseText(text);
    } else {
      return Year.parseTextFormatter(text, formatter);
    }
  };
  Year.parseText = function parseText(text) {
    requireNonNull(text, 'text');
    return Year.parse(text, PARSER);
  };
  Year.parseTextFormatter = function parseTextFormatter(text, formatter) {
    if (formatter === void 0) {
      formatter = PARSER;
    }
    requireNonNull(text, 'text');
    requireNonNull(formatter, 'formatter');
    requireInstance(formatter, DateTimeFormatter, 'formatter');
    return formatter.parse(text, Year.FROM);
  };
  Year.isLeap = function isLeap(year) {
    return MathUtil.intMod(year, 4) === 0 && (MathUtil.intMod(year, 100) !== 0 || MathUtil.intMod(year, 400) === 0);
  };
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (arguments.length === 1 && fieldOrUnit instanceof TemporalField) {
      return this.isSupportedField(fieldOrUnit);
    } else {
      return this.isSupportedUnit(fieldOrUnit);
    }
  };
  _proto.isSupportedField = function isSupportedField(field) {
    if (field instanceof ChronoField) {
      return field === ChronoField.YEAR || field === ChronoField.YEAR_OF_ERA || field === ChronoField.ERA;
    }
    return field != null && field.isSupportedBy(this);
  };
  _proto.isSupportedUnit = function isSupportedUnit(unit) {
    if (unit instanceof ChronoUnit) {
      return unit === ChronoUnit.YEARS || unit === ChronoUnit.DECADES || unit === ChronoUnit.CENTURIES || unit === ChronoUnit.MILLENNIA || unit === ChronoUnit.ERAS;
    }
    return unit != null && unit.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    if (this.isSupported(field)) {
      return field.range();
    } else if (field instanceof ChronoField) {
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return _Temporal.prototype.range.call(this, field);
  };
  _proto.get = function get(field) {
    return this.range(field).checkValidIntValue(this.getLong(field), field);
  };
  _proto.getLong = function getLong(field) {
    requireNonNull(field, 'field');
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.YEAR_OF_ERA:
          return this._year < 1 ? 1 - this._year : this._year;
        case ChronoField.YEAR:
          return this._year;
        case ChronoField.ERA:
          return this._year < 1 ? 0 : 1;
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.getFrom(this);
  };
  _proto.isLeap = function isLeap() {
    return Year.isLeap(this._year);
  };
  _proto._withField = function _withField(field, newValue) {
    requireNonNull(field, 'field');
    requireInstance(field, TemporalField, 'field');
    if (field instanceof ChronoField) {
      field.checkValidValue(newValue);
      switch (field) {
        case ChronoField.YEAR_OF_ERA:
          return Year.of(this._year < 1 ? 1 - newValue : newValue);
        case ChronoField.YEAR:
          return Year.of(newValue);
        case ChronoField.ERA:
          return this.getLong(ChronoField.ERA) === newValue ? this : Year.of(1 - this._year);
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.adjustInto(this, newValue);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    requireNonNull(amountToAdd, 'amountToAdd');
    requireNonNull(unit, 'unit');
    requireInstance(unit, TemporalUnit, 'unit');
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.YEARS:
          return this.plusYears(amountToAdd);
        case ChronoUnit.DECADES:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 10));
        case ChronoUnit.CENTURIES:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 100));
        case ChronoUnit.MILLENNIA:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 1000));
        case ChronoUnit.ERAS:
          return this.with(ChronoField.ERA, MathUtil.safeAdd(this.getLong(ChronoField.ERA), amountToAdd));
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusYears = function plusYears(yearsToAdd) {
    if (yearsToAdd === 0) {
      return this;
    }
    return Year.of(ChronoField.YEAR.checkValidIntValue(MathUtil.safeAdd(this._year, yearsToAdd)));
  };
  _proto.minusYears = function minusYears(yearsToSubtract) {
    return yearsToSubtract === MathUtil.MIN_SAFE_INTEGER ? this.plusYears(MathUtil.MAX_SAFE_INTEGER).plusYears(1) : this.plusYears(-yearsToSubtract);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    requireNonNull(temporal, 'temporal');
    return temporal.with(ChronoField.YEAR, this._year);
  };
  _proto.isValidMonthDay = function isValidMonthDay(monthDay) {
    return monthDay != null && monthDay.isValidYear(this._year);
  };
  _proto.length = function length() {
    return this.isLeap() ? 366 : 365;
  };
  _proto.atDay = function atDay(dayOfYear) {
    return LocalDate.ofYearDay(this._year, dayOfYear);
  };
  _proto.atMonth = function atMonth(monthOrNumber) {
    if (arguments.length === 1 && monthOrNumber instanceof Month) {
      return this.atMonthMonth(monthOrNumber);
    } else {
      return this.atMonthNumber(monthOrNumber);
    }
  };
  _proto.atMonthMonth = function atMonthMonth(month) {
    requireNonNull(month, 'month');
    requireInstance(month, Month, 'month');
    return YearMonth.of(this._year, month);
  };
  _proto.atMonthNumber = function atMonthNumber(month) {
    requireNonNull(month, 'month');
    return YearMonth.of(this._year, month);
  };
  _proto.atMonthDay = function atMonthDay(monthDay) {
    requireNonNull(monthDay, 'monthDay');
    requireInstance(monthDay, MonthDay, 'monthDay');
    return monthDay.atYear(this._year);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query()');
    requireInstance(_query, TemporalQuery, 'query()');
    if (_query === TemporalQueries.chronology()) {
      return IsoChronology.INSTANCE;
    } else if (_query === TemporalQueries.precision()) {
      return ChronoUnit.YEARS;
    } else if (_query === TemporalQueries.localDate() || _query === TemporalQueries.localTime() || _query === TemporalQueries.zone() || _query === TemporalQueries.zoneId() || _query === TemporalQueries.offset()) {
      return null;
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, Year, 'other');
    return this._year - other._year;
  };
  _proto.isAfter = function isAfter(other) {
    requireNonNull(other, 'other');
    requireInstance(other, Year, 'other');
    return this._year > other._year;
  };
  _proto.isBefore = function isBefore(other) {
    requireNonNull(other, 'other');
    requireInstance(other, Year, 'other');
    return this._year < other._year;
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    requireInstance(formatter, DateTimeFormatter, 'formatter');
    return formatter.format(this);
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof Year) {
      return this.value() === other.value();
    }
    return false;
  };
  _proto.toString = function toString() {
    return "" + this._year;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.until = function until(endExclusive, unit) {
    var end = Year.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      var yearsUntil = end.value() - this.value();
      switch (unit) {
        case ChronoUnit.YEARS:
          return yearsUntil;
        case ChronoUnit.DECADES:
          return MathUtil.intDiv(yearsUntil, 10);
        case ChronoUnit.CENTURIES:
          return MathUtil.intDiv(yearsUntil, 100);
        case ChronoUnit.MILLENNIA:
          return MathUtil.intDiv(yearsUntil, 1000);
        case ChronoUnit.ERAS:
          return end.getLong(ChronoField.ERA) - this.getLong(ChronoField.ERA);
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.between(this, end);
  };
  return Year;
}(Temporal);
var PARSER;
function _init$a() {
  Year.MIN_VALUE = YearConstants.MIN_VALUE;
  Year.MAX_VALUE = YearConstants.MAX_VALUE;
  PARSER = new DateTimeFormatterBuilder().appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD).toFormatter();
  Year.FROM = createTemporalQuery('Year.FROM', function (temporal) {
    return Year.from(temporal);
  });
}

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var TemporalAdjuster = function () {
  function TemporalAdjuster() {}
  var _proto = TemporalAdjuster.prototype;
  _proto.adjustInto = function adjustInto(temporal) {
    abstractMethodFail('adjustInto');
  };
  return TemporalAdjuster;
}();

var TemporalAdjusters = function () {
  function TemporalAdjusters() {}
  TemporalAdjusters.firstDayOfMonth = function firstDayOfMonth() {
    return Impl.FIRST_DAY_OF_MONTH;
  };
  TemporalAdjusters.lastDayOfMonth = function lastDayOfMonth() {
    return Impl.LAST_DAY_OF_MONTH;
  };
  TemporalAdjusters.firstDayOfNextMonth = function firstDayOfNextMonth() {
    return Impl.FIRST_DAY_OF_NEXT_MONTH;
  };
  TemporalAdjusters.firstDayOfYear = function firstDayOfYear() {
    return Impl.FIRST_DAY_OF_YEAR;
  };
  TemporalAdjusters.lastDayOfYear = function lastDayOfYear() {
    return Impl.LAST_DAY_OF_YEAR;
  };
  TemporalAdjusters.firstDayOfNextYear = function firstDayOfNextYear() {
    return Impl.FIRST_DAY_OF_NEXT_YEAR;
  };
  TemporalAdjusters.firstInMonth = function firstInMonth(dayOfWeek) {
    requireNonNull(dayOfWeek, 'dayOfWeek');
    return new DayOfWeekInMonth(1, dayOfWeek);
  };
  TemporalAdjusters.lastInMonth = function lastInMonth(dayOfWeek) {
    requireNonNull(dayOfWeek, 'dayOfWeek');
    return new DayOfWeekInMonth(-1, dayOfWeek);
  };
  TemporalAdjusters.dayOfWeekInMonth = function dayOfWeekInMonth(ordinal, dayOfWeek) {
    requireNonNull(dayOfWeek, 'dayOfWeek');
    return new DayOfWeekInMonth(ordinal, dayOfWeek);
  };
  TemporalAdjusters.next = function next(dayOfWeek) {
    return new RelativeDayOfWeek(2, dayOfWeek);
  };
  TemporalAdjusters.nextOrSame = function nextOrSame(dayOfWeek) {
    return new RelativeDayOfWeek(0, dayOfWeek);
  };
  TemporalAdjusters.previous = function previous(dayOfWeek) {
    return new RelativeDayOfWeek(3, dayOfWeek);
  };
  TemporalAdjusters.previousOrSame = function previousOrSame(dayOfWeek) {
    return new RelativeDayOfWeek(1, dayOfWeek);
  };
  return TemporalAdjusters;
}();
var Impl = function (_TemporalAdjuster) {
  _inheritsLoose(Impl, _TemporalAdjuster);
  function Impl(ordinal) {
    var _this;
    _this = _TemporalAdjuster.call(this) || this;
    _this._ordinal = ordinal;
    return _this;
  }
  var _proto = Impl.prototype;
  _proto.adjustInto = function adjustInto(temporal) {
    switch (this._ordinal) {
      case 0:
        return temporal.with(ChronoField.DAY_OF_MONTH, 1);
      case 1:
        return temporal.with(ChronoField.DAY_OF_MONTH, temporal.range(ChronoField.DAY_OF_MONTH).maximum());
      case 2:
        return temporal.with(ChronoField.DAY_OF_MONTH, 1).plus(1, ChronoUnit.MONTHS);
      case 3:
        return temporal.with(ChronoField.DAY_OF_YEAR, 1);
      case 4:
        return temporal.with(ChronoField.DAY_OF_YEAR, temporal.range(ChronoField.DAY_OF_YEAR).maximum());
      case 5:
        return temporal.with(ChronoField.DAY_OF_YEAR, 1).plus(1, ChronoUnit.YEARS);
    }
    throw new IllegalStateException('Unreachable');
  };
  return Impl;
}(TemporalAdjuster);
Impl.FIRST_DAY_OF_MONTH = new Impl(0);
Impl.LAST_DAY_OF_MONTH = new Impl(1);
Impl.FIRST_DAY_OF_NEXT_MONTH = new Impl(2);
Impl.FIRST_DAY_OF_YEAR = new Impl(3);
Impl.LAST_DAY_OF_YEAR = new Impl(4);
Impl.FIRST_DAY_OF_NEXT_YEAR = new Impl(5);
var DayOfWeekInMonth = function (_TemporalAdjuster2) {
  _inheritsLoose(DayOfWeekInMonth, _TemporalAdjuster2);
  function DayOfWeekInMonth(ordinal, dow) {
    var _this2;
    _this2 = _TemporalAdjuster2.call(this) || this;
    _this2._ordinal = ordinal;
    _this2._dowValue = dow.value();
    return _this2;
  }
  var _proto2 = DayOfWeekInMonth.prototype;
  _proto2.adjustInto = function adjustInto(temporal) {
    if (this._ordinal >= 0) {
      var temp = temporal.with(ChronoField.DAY_OF_MONTH, 1);
      var curDow = temp.get(ChronoField.DAY_OF_WEEK);
      var dowDiff = MathUtil.intMod(this._dowValue - curDow + 7, 7);
      dowDiff += (this._ordinal - 1) * 7;
      return temp.plus(dowDiff, ChronoUnit.DAYS);
    } else {
      var _temp = temporal.with(ChronoField.DAY_OF_MONTH, temporal.range(ChronoField.DAY_OF_MONTH).maximum());
      var _curDow = _temp.get(ChronoField.DAY_OF_WEEK);
      var daysDiff = this._dowValue - _curDow;
      daysDiff = daysDiff === 0 ? 0 : daysDiff > 0 ? daysDiff - 7 : daysDiff;
      daysDiff -= (-this._ordinal - 1) * 7;
      return _temp.plus(daysDiff, ChronoUnit.DAYS);
    }
  };
  return DayOfWeekInMonth;
}(TemporalAdjuster);
var RelativeDayOfWeek = function (_TemporalAdjuster3) {
  _inheritsLoose(RelativeDayOfWeek, _TemporalAdjuster3);
  function RelativeDayOfWeek(relative, dayOfWeek) {
    var _this3;
    _this3 = _TemporalAdjuster3.call(this) || this;
    requireNonNull(dayOfWeek, 'dayOfWeek');
    _this3._relative = relative;
    _this3._dowValue = dayOfWeek.value();
    return _this3;
  }
  var _proto3 = RelativeDayOfWeek.prototype;
  _proto3.adjustInto = function adjustInto(temporal) {
    var calDow = temporal.get(ChronoField.DAY_OF_WEEK);
    if (this._relative < 2 && calDow === this._dowValue) {
      return temporal;
    }
    if ((this._relative & 1) === 0) {
      var daysDiff = calDow - this._dowValue;
      return temporal.plus(daysDiff >= 0 ? 7 - daysDiff : -daysDiff, ChronoUnit.DAYS);
    } else {
      var _daysDiff = this._dowValue - calDow;
      return temporal.minus(_daysDiff >= 0 ? 7 - _daysDiff : -_daysDiff, ChronoUnit.DAYS);
    }
  };
  return RelativeDayOfWeek;
}(TemporalAdjuster);

var IsoChronology = function (_Enum) {
  _inheritsLoose(IsoChronology, _Enum);
  function IsoChronology() {
    return _Enum.apply(this, arguments) || this;
  }
  IsoChronology.isLeapYear = function isLeapYear(prolepticYear) {
    return (prolepticYear & 3) === 0 && (prolepticYear % 100 !== 0 || prolepticYear % 400 === 0);
  };
  var _proto = IsoChronology.prototype;
  _proto._updateResolveMap = function _updateResolveMap(fieldValues, field, value) {
    requireNonNull(fieldValues, 'fieldValues');
    requireNonNull(field, 'field');
    var current = fieldValues.get(field);
    if (current != null && current !== value) {
      throw new DateTimeException("Invalid state, field: " + field + " " + current + " conflicts with " + field + " " + value);
    }
    fieldValues.put(field, value);
  };
  _proto.resolveDate = function resolveDate(fieldValues, resolverStyle) {
    if (fieldValues.containsKey(ChronoField.EPOCH_DAY)) {
      return LocalDate.ofEpochDay(fieldValues.remove(ChronoField.EPOCH_DAY));
    }
    var prolepticMonth = fieldValues.remove(ChronoField.PROLEPTIC_MONTH);
    if (prolepticMonth != null) {
      if (resolverStyle !== ResolverStyle.LENIENT) {
        ChronoField.PROLEPTIC_MONTH.checkValidValue(prolepticMonth);
      }
      this._updateResolveMap(fieldValues, ChronoField.MONTH_OF_YEAR, MathUtil.floorMod(prolepticMonth, 12) + 1);
      this._updateResolveMap(fieldValues, ChronoField.YEAR, MathUtil.floorDiv(prolepticMonth, 12));
    }
    var yoeLong = fieldValues.remove(ChronoField.YEAR_OF_ERA);
    if (yoeLong != null) {
      if (resolverStyle !== ResolverStyle.LENIENT) {
        ChronoField.YEAR_OF_ERA.checkValidValue(yoeLong);
      }
      var era = fieldValues.remove(ChronoField.ERA);
      if (era == null) {
        var year = fieldValues.get(ChronoField.YEAR);
        if (resolverStyle === ResolverStyle.STRICT) {
          if (year != null) {
            this._updateResolveMap(fieldValues, ChronoField.YEAR, year > 0 ? yoeLong : MathUtil.safeSubtract(1, yoeLong));
          } else {
            fieldValues.put(ChronoField.YEAR_OF_ERA, yoeLong);
          }
        } else {
          this._updateResolveMap(fieldValues, ChronoField.YEAR, year == null || year > 0 ? yoeLong : MathUtil.safeSubtract(1, yoeLong));
        }
      } else if (era === 1) {
        this._updateResolveMap(fieldValues, ChronoField.YEAR, yoeLong);
      } else if (era === 0) {
        this._updateResolveMap(fieldValues, ChronoField.YEAR, MathUtil.safeSubtract(1, yoeLong));
      } else {
        throw new DateTimeException("Invalid value for era: " + era);
      }
    } else if (fieldValues.containsKey(ChronoField.ERA)) {
      ChronoField.ERA.checkValidValue(fieldValues.get(ChronoField.ERA));
    }
    if (fieldValues.containsKey(ChronoField.YEAR)) {
      if (fieldValues.containsKey(ChronoField.MONTH_OF_YEAR)) {
        if (fieldValues.containsKey(ChronoField.DAY_OF_MONTH)) {
          var y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
          var moy = fieldValues.remove(ChronoField.MONTH_OF_YEAR);
          var dom = fieldValues.remove(ChronoField.DAY_OF_MONTH);
          if (resolverStyle === ResolverStyle.LENIENT) {
            var months = moy - 1;
            var days = dom - 1;
            return LocalDate.of(y, 1, 1).plusMonths(months).plusDays(days);
          } else if (resolverStyle === ResolverStyle.SMART) {
            ChronoField.DAY_OF_MONTH.checkValidValue(dom);
            if (moy === 4 || moy === 6 || moy === 9 || moy === 11) {
              dom = Math.min(dom, 30);
            } else if (moy === 2) {
              dom = Math.min(dom, Month.FEBRUARY.length(Year.isLeap(y)));
            }
            return LocalDate.of(y, moy, dom);
          } else {
            return LocalDate.of(y, moy, dom);
          }
        }
      }
      if (fieldValues.containsKey(ChronoField.DAY_OF_YEAR)) {
        var _y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
        if (resolverStyle === ResolverStyle.LENIENT) {
          var _days = MathUtil.safeSubtract(fieldValues.remove(ChronoField.DAY_OF_YEAR), 1);
          return LocalDate.ofYearDay(_y, 1).plusDays(_days);
        }
        var doy = ChronoField.DAY_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.DAY_OF_YEAR));
        return LocalDate.ofYearDay(_y, doy);
      }
      if (fieldValues.containsKey(ChronoField.ALIGNED_WEEK_OF_YEAR)) {
        if (fieldValues.containsKey(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR)) {
          var _y2 = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
          if (resolverStyle === ResolverStyle.LENIENT) {
            var weeks = MathUtil.safeSubtract(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR), 1);
            var _days2 = MathUtil.safeSubtract(fieldValues.remove(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR), 1);
            return LocalDate.of(_y2, 1, 1).plusWeeks(weeks).plusDays(_days2);
          }
          var aw = ChronoField.ALIGNED_WEEK_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR));
          var ad = ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR));
          var date = LocalDate.of(_y2, 1, 1).plusDays((aw - 1) * 7 + (ad - 1));
          if (resolverStyle === ResolverStyle.STRICT && date.get(ChronoField.YEAR) !== _y2) {
            throw new DateTimeException('Strict mode rejected date parsed to a different year');
          }
          return date;
        }
        if (fieldValues.containsKey(ChronoField.DAY_OF_WEEK)) {
          var _y3 = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
          if (resolverStyle === ResolverStyle.LENIENT) {
            var _weeks = MathUtil.safeSubtract(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR), 1);
            var _days3 = MathUtil.safeSubtract(fieldValues.remove(ChronoField.DAY_OF_WEEK), 1);
            return LocalDate.of(_y3, 1, 1).plusWeeks(_weeks).plusDays(_days3);
          }
          var _aw = ChronoField.ALIGNED_WEEK_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR));
          var dow = ChronoField.DAY_OF_WEEK.checkValidIntValue(fieldValues.remove(ChronoField.DAY_OF_WEEK));
          var _date = LocalDate.of(_y3, 1, 1).plusWeeks(_aw - 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.of(dow)));
          if (resolverStyle === ResolverStyle.STRICT && _date.get(ChronoField.YEAR) !== _y3) {
            throw new DateTimeException('Strict mode rejected date parsed to a different month');
          }
          return _date;
        }
      }
    }
    return null;
  };
  _proto.date = function date(temporal) {
    return LocalDate.from(temporal);
  };
  return IsoChronology;
}(Enum);
function _init$9() {
  IsoChronology.INSTANCE = new IsoChronology('IsoChronology');
}

var OffsetTime = function (_Temporal) {
  _inheritsLoose(OffsetTime, _Temporal);
  OffsetTime.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    if (temporal instanceof OffsetTime) {
      return temporal;
    } else if (temporal instanceof OffsetDateTime) {
      return temporal.toOffsetTime();
    }
    try {
      var time = LocalTime.from(temporal);
      var offset = ZoneOffset.from(temporal);
      return new OffsetTime(time, offset);
    } catch (ex) {
      throw new DateTimeException("Unable to obtain OffsetTime TemporalAccessor: " + temporal + ", type " + (temporal.constructor != null ? temporal.constructor.name : ''));
    }
  };
  OffsetTime.now = function now(clockOrZone) {
    if (arguments.length === 0) {
      return OffsetTime._now(Clock.systemDefaultZone());
    } else if (clockOrZone instanceof Clock) {
      return OffsetTime._now(clockOrZone);
    } else {
      return OffsetTime._now(Clock.system(clockOrZone));
    }
  };
  OffsetTime._now = function _now(clock) {
    requireNonNull(clock, 'clock');
    var now = clock.instant();
    return OffsetTime.ofInstant(now, clock.zone().rules().offset(now));
  };
  OffsetTime.of = function of() {
    if (arguments.length <= 2) {
      return OffsetTime.ofTimeAndOffset.apply(this, arguments);
    } else {
      return OffsetTime.ofNumbers.apply(this, arguments);
    }
  };
  OffsetTime.ofNumbers = function ofNumbers(hour, minute, second, nanoOfSecond, offset) {
    var time = LocalTime.of(hour, minute, second, nanoOfSecond);
    return new OffsetTime(time, offset);
  };
  OffsetTime.ofTimeAndOffset = function ofTimeAndOffset(time, offset) {
    return new OffsetTime(time, offset);
  };
  OffsetTime.ofInstant = function ofInstant(instant, zone) {
    requireNonNull(instant, 'instant');
    requireInstance(instant, Instant, 'instant');
    requireNonNull(zone, 'zone');
    requireInstance(zone, ZoneId, 'zone');
    var rules = zone.rules();
    var offset = rules.offset(instant);
    var secsOfDay = instant.epochSecond() % LocalTime.SECONDS_PER_DAY;
    secsOfDay = (secsOfDay + offset.totalSeconds()) % LocalTime.SECONDS_PER_DAY;
    if (secsOfDay < 0) {
      secsOfDay += LocalTime.SECONDS_PER_DAY;
    }
    var time = LocalTime.ofSecondOfDay(secsOfDay, instant.nano());
    return new OffsetTime(time, offset);
  };
  OffsetTime.parse = function parse(text, formatter) {
    if (formatter === void 0) {
      formatter = DateTimeFormatter.ISO_OFFSET_TIME;
    }
    requireNonNull(formatter, 'formatter');
    return formatter.parse(text, OffsetTime.FROM);
  };
  function OffsetTime(time, offset) {
    var _this;
    _this = _Temporal.call(this) || this;
    requireNonNull(time, 'time');
    requireInstance(time, LocalTime, 'time');
    requireNonNull(offset, 'offset');
    requireInstance(offset, ZoneOffset, 'offset');
    _this._time = time;
    _this._offset = offset;
    return _this;
  }
  var _proto = OffsetTime.prototype;
  _proto.adjustInto = function adjustInto(temporal) {
    return temporal.with(ChronoField.NANO_OF_DAY, this._time.toNanoOfDay()).with(ChronoField.OFFSET_SECONDS, this.offset().totalSeconds());
  };
  _proto.atDate = function atDate(date) {
    return OffsetDateTime.of(date, this._time, this._offset);
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    return formatter.format(this, OffsetTime.FROM);
  };
  _proto.get = function get(field) {
    return _Temporal.prototype.get.call(this, field);
  };
  _proto.getLong = function getLong(field) {
    if (field instanceof ChronoField) {
      if (field === ChronoField.OFFSET_SECONDS) {
        return this._offset.totalSeconds();
      }
      return this._time.getLong(field);
    }
    return field.getFrom(this);
  };
  _proto.hour = function hour() {
    return this._time.hour();
  };
  _proto.minute = function minute() {
    return this._time.minute();
  };
  _proto.second = function second() {
    return this._time.second();
  };
  _proto.nano = function nano() {
    return this._time.nano();
  };
  _proto.offset = function offset() {
    return this._offset;
  };
  _proto.isAfter = function isAfter(other) {
    requireNonNull(other, 'other');
    return this._toEpochNano() > other._toEpochNano();
  };
  _proto.isBefore = function isBefore(other) {
    requireNonNull(other, 'other');
    return this._toEpochNano() < other._toEpochNano();
  };
  _proto.isEqual = function isEqual(other) {
    requireNonNull(other, 'other');
    return this._toEpochNano() === other._toEpochNano();
  };
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (fieldOrUnit instanceof ChronoField) {
      return fieldOrUnit.isTimeBased() || fieldOrUnit === ChronoField.OFFSET_SECONDS;
    } else if (fieldOrUnit instanceof ChronoUnit) {
      return fieldOrUnit.isTimeBased();
    }
    return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
  };
  _proto.minusHours = function minusHours(hours) {
    return this._withLocalTimeOffset(this._time.minusHours(hours), this._offset);
  };
  _proto.minusMinutes = function minusMinutes(minutes) {
    return this._withLocalTimeOffset(this._time.minusMinutes(minutes), this._offset);
  };
  _proto.minusSeconds = function minusSeconds(seconds) {
    return this._withLocalTimeOffset(this._time.minusSeconds(seconds), this._offset);
  };
  _proto.minusNanos = function minusNanos(nanos) {
    return this._withLocalTimeOffset(this._time.minusNanos(nanos), this._offset);
  };
  _proto._minusAmount = function _minusAmount(amount) {
    requireNonNull(amount);
    return amount.subtractFrom(this);
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    return this.plus(-1 * amountToSubtract, unit);
  };
  _proto._plusAmount = function _plusAmount(amount) {
    requireNonNull(amount);
    return amount.addTo(this);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    if (unit instanceof ChronoUnit) {
      return this._withLocalTimeOffset(this._time.plus(amountToAdd, unit), this._offset);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusHours = function plusHours(hours) {
    return this._withLocalTimeOffset(this._time.plusHours(hours), this._offset);
  };
  _proto.plusMinutes = function plusMinutes(minutes) {
    return this._withLocalTimeOffset(this._time.plusMinutes(minutes), this._offset);
  };
  _proto.plusSeconds = function plusSeconds(seconds) {
    return this._withLocalTimeOffset(this._time.plusSeconds(seconds), this._offset);
  };
  _proto.plusNanos = function plusNanos(nanos) {
    return this._withLocalTimeOffset(this._time.plusNanos(nanos), this._offset);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    if (_query === TemporalQueries.precision()) {
      return ChronoUnit.NANOS;
    } else if (_query === TemporalQueries.offset() || _query === TemporalQueries.zone()) {
      return this.offset();
    } else if (_query === TemporalQueries.localTime()) {
      return this._time;
    } else if (_query === TemporalQueries.chronology() || _query === TemporalQueries.localDate() || _query === TemporalQueries.zoneId()) {
      return null;
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto.range = function range(field) {
    if (field instanceof ChronoField) {
      if (field === ChronoField.OFFSET_SECONDS) {
        return field.range();
      }
      return this._time.range(field);
    }
    return field.rangeRefinedBy(this);
  };
  _proto.toLocalTime = function toLocalTime() {
    return this._time;
  };
  _proto.truncatedTo = function truncatedTo(unit) {
    return this._withLocalTimeOffset(this._time.truncatedTo(unit), this._offset);
  };
  _proto.until = function until(endExclusive, unit) {
    requireNonNull(endExclusive, 'endExclusive');
    requireNonNull(unit, 'unit');
    var end = OffsetTime.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      var nanosUntil = end._toEpochNano() - this._toEpochNano();
      switch (unit) {
        case ChronoUnit.NANOS:
          return nanosUntil;
        case ChronoUnit.MICROS:
          return MathUtil.intDiv(nanosUntil, 1000);
        case ChronoUnit.MILLIS:
          return MathUtil.intDiv(nanosUntil, 1000000);
        case ChronoUnit.SECONDS:
          return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_SECOND);
        case ChronoUnit.MINUTES:
          return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_MINUTE);
        case ChronoUnit.HOURS:
          return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_HOUR);
        case ChronoUnit.HALF_DAYS:
          return MathUtil.intDiv(nanosUntil, 12 * LocalTime.NANOS_PER_HOUR);
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.between(this, end);
  };
  _proto.withHour = function withHour(hour) {
    return this._withLocalTimeOffset(this._time.withHour(hour), this._offset);
  };
  _proto.withMinute = function withMinute(minute) {
    return this._withLocalTimeOffset(this._time.withMinute(minute), this._offset);
  };
  _proto.withSecond = function withSecond(second) {
    return this._withLocalTimeOffset(this._time.withSecond(second), this._offset);
  };
  _proto.withNano = function withNano(nano) {
    return this._withLocalTimeOffset(this._time.withNano(nano), this._offset);
  };
  _proto.withOffsetSameInstant = function withOffsetSameInstant(offset) {
    requireNonNull(offset, 'offset');
    if (offset.equals(this._offset)) {
      return this;
    }
    var difference = offset.totalSeconds() - this._offset.totalSeconds();
    var adjusted = this._time.plusSeconds(difference);
    return new OffsetTime(adjusted, offset);
  };
  _proto.withOffsetSameLocal = function withOffsetSameLocal(offset) {
    return offset != null && offset.equals(this._offset) ? this : new OffsetTime(this._time, offset);
  };
  _proto._toEpochNano = function _toEpochNano() {
    var nod = this._time.toNanoOfDay();
    var offsetNanos = this._offset.totalSeconds() * LocalTime.NANOS_PER_SECOND;
    return nod - offsetNanos;
  };
  _proto._withAdjuster = function _withAdjuster(adjuster) {
    requireNonNull(adjuster, 'adjuster');
    if (adjuster instanceof LocalTime) {
      return this._withLocalTimeOffset(adjuster, this._offset);
    } else if (adjuster instanceof ZoneOffset) {
      return this._withLocalTimeOffset(this._time, adjuster);
    } else if (adjuster instanceof OffsetTime) {
      return adjuster;
    }
    return adjuster.adjustInto(this);
  };
  _proto._withField = function _withField(field, newValue) {
    requireNonNull(field, 'field');
    if (field instanceof ChronoField) {
      if (field === ChronoField.OFFSET_SECONDS) {
        return this._withLocalTimeOffset(this._time, ZoneOffset.ofTotalSeconds(field.checkValidIntValue(newValue)));
      }
      return this._withLocalTimeOffset(this._time.with(field, newValue), this._offset);
    }
    return field.adjustInto(this, newValue);
  };
  _proto._withLocalTimeOffset = function _withLocalTimeOffset(time, offset) {
    if (this._time === time && this._offset.equals(offset)) {
      return this;
    }
    return new OffsetTime(time, offset);
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, OffsetTime, 'other');
    if (this._offset.equals(other._offset)) {
      return this._time.compareTo(other._time);
    }
    var compare = MathUtil.compareNumbers(this._toEpochNano(), other._toEpochNano());
    if (compare === 0) {
      return this._time.compareTo(other._time);
    }
    return compare;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof OffsetTime) {
      return this._time.equals(other._time) && this._offset.equals(other._offset);
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return this._time.hashCode() ^ this._offset.hashCode();
  };
  _proto.toString = function toString() {
    return this._time.toString() + this._offset.toString();
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return OffsetTime;
}(Temporal);
function _init$8() {
  OffsetTime.MIN = OffsetTime.ofNumbers(0, 0, 0, 0, ZoneOffset.MAX);
  OffsetTime.MAX = OffsetTime.ofNumbers(23, 59, 59, 999999999, ZoneOffset.MIN);
  OffsetTime.FROM = createTemporalQuery('OffsetTime.FROM', function (temporal) {
    return OffsetTime.from(temporal);
  });
}

var ChronoZonedDateTime = function (_Temporal) {
  _inheritsLoose(ChronoZonedDateTime, _Temporal);
  function ChronoZonedDateTime() {
    return _Temporal.apply(this, arguments) || this;
  }
  var _proto = ChronoZonedDateTime.prototype;
  _proto.query = function query(_query) {
    if (_query === TemporalQueries.zoneId() || _query === TemporalQueries.zone()) {
      return this.zone();
    } else if (_query === TemporalQueries.chronology()) {
      return this.toLocalDate().chronology();
    } else if (_query === TemporalQueries.precision()) {
      return ChronoUnit.NANOS;
    } else if (_query === TemporalQueries.offset()) {
      return this.offset();
    } else if (_query === TemporalQueries.localDate()) {
      return LocalDate.ofEpochDay(this.toLocalDate().toEpochDay());
    } else if (_query === TemporalQueries.localTime()) {
      return this.toLocalTime();
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    return formatter.format(this);
  };
  _proto.toInstant = function toInstant() {
    return Instant.ofEpochSecond(this.toEpochSecond(), this.toLocalTime().nano());
  };
  _proto.toEpochSecond = function toEpochSecond() {
    var epochDay = this.toLocalDate().toEpochDay();
    var secs = epochDay * 86400 + this.toLocalTime().toSecondOfDay();
    secs -= this.offset().totalSeconds();
    return secs;
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    var cmp = MathUtil.compareNumbers(this.toEpochSecond(), other.toEpochSecond());
    if (cmp === 0) {
      cmp = this.toLocalTime().nano() - other.toLocalTime().nano();
      if (cmp === 0) {
        cmp = this.toLocalDateTime().compareTo(other.toLocalDateTime());
        if (cmp === 0) {
          cmp = strcmp(this.zone().id(), other.zone().id());
        }
      }
    }
    return cmp;
  };
  _proto.isAfter = function isAfter(other) {
    requireNonNull(other, 'other');
    var thisEpochSec = this.toEpochSecond();
    var otherEpochSec = other.toEpochSecond();
    return thisEpochSec > otherEpochSec || thisEpochSec === otherEpochSec && this.toLocalTime().nano() > other.toLocalTime().nano();
  };
  _proto.isBefore = function isBefore(other) {
    requireNonNull(other, 'other');
    var thisEpochSec = this.toEpochSecond();
    var otherEpochSec = other.toEpochSecond();
    return thisEpochSec < otherEpochSec || thisEpochSec === otherEpochSec && this.toLocalTime().nano() < other.toLocalTime().nano();
  };
  _proto.isEqual = function isEqual(other) {
    requireNonNull(other, 'other');
    return this.toEpochSecond() === other.toEpochSecond() && this.toLocalTime().nano() === other.toLocalTime().nano();
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof ChronoZonedDateTime) {
      return this.compareTo(other) === 0;
    }
    return false;
  };
  return ChronoZonedDateTime;
}(Temporal);
function strcmp(a, b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

var ZonedDateTime = function (_ChronoZonedDateTime) {
  _inheritsLoose(ZonedDateTime, _ChronoZonedDateTime);
  ZonedDateTime.now = function now(clockOrZone) {
    var clock;
    if (clockOrZone instanceof ZoneId) {
      clock = Clock.system(clockOrZone);
    } else {
      clock = clockOrZone == null ? Clock.systemDefaultZone() : clockOrZone;
    }
    return ZonedDateTime.ofInstant(clock.instant(), clock.zone());
  };
  ZonedDateTime.of = function of() {
    if (arguments.length <= 2) {
      return ZonedDateTime.of2.apply(this, arguments);
    } else if (arguments.length === 3 && arguments[0] instanceof LocalDate) {
      return ZonedDateTime.of3.apply(this, arguments);
    } else {
      return ZonedDateTime.of8.apply(this, arguments);
    }
  };
  ZonedDateTime.of3 = function of3(date, time, zone) {
    return ZonedDateTime.of2(LocalDateTime.of(date, time), zone);
  };
  ZonedDateTime.of2 = function of2(localDateTime, zone) {
    return ZonedDateTime.ofLocal(localDateTime, zone, null);
  };
  ZonedDateTime.of8 = function of8(year, month, dayOfMonth, hour, minute, second, nanoOfSecond, zone) {
    var dt = LocalDateTime.of(year, month, dayOfMonth, hour, minute, second, nanoOfSecond);
    return ZonedDateTime.ofLocal(dt, zone, null);
  };
  ZonedDateTime.ofLocal = function ofLocal(localDateTime, zone, preferredOffset) {
    requireNonNull(localDateTime, 'localDateTime');
    requireNonNull(zone, 'zone');
    if (zone instanceof ZoneOffset) {
      return new ZonedDateTime(localDateTime, zone, zone);
    }
    var offset = null;
    var rules = zone.rules();
    var validOffsets = rules.validOffsets(localDateTime);
    if (validOffsets.length === 1) {
      offset = validOffsets[0];
    } else if (validOffsets.length === 0) {
      var trans = rules.transition(localDateTime);
      localDateTime = localDateTime.plusSeconds(trans.duration().seconds());
      offset = trans.offsetAfter();
    } else {
      if (preferredOffset != null && validOffsets.some(function (validOffset) {
        return validOffset.equals(preferredOffset);
      })) {
        offset = preferredOffset;
      } else {
        offset = requireNonNull(validOffsets[0], 'offset');
      }
    }
    return new ZonedDateTime(localDateTime, offset, zone);
  };
  ZonedDateTime.ofInstant = function ofInstant() {
    if (arguments.length === 2) {
      return ZonedDateTime.ofInstant2.apply(this, arguments);
    } else {
      return ZonedDateTime.ofInstant3.apply(this, arguments);
    }
  };
  ZonedDateTime.ofInstant2 = function ofInstant2(instant, zone) {
    requireNonNull(instant, 'instant');
    requireNonNull(zone, 'zone');
    return ZonedDateTime._create(instant.epochSecond(), instant.nano(), zone);
  };
  ZonedDateTime.ofInstant3 = function ofInstant3(localDateTime, offset, zone) {
    requireNonNull(localDateTime, 'localDateTime');
    requireNonNull(offset, 'offset');
    requireNonNull(zone, 'zone');
    return ZonedDateTime._create(localDateTime.toEpochSecond(offset), localDateTime.nano(), zone);
  };
  ZonedDateTime._create = function _create(epochSecond, nanoOfSecond, zone) {
    var rules = zone.rules();
    var instant = Instant.ofEpochSecond(epochSecond, nanoOfSecond);
    var offset = rules.offset(instant);
    var ldt = LocalDateTime.ofEpochSecond(epochSecond, nanoOfSecond, offset);
    return new ZonedDateTime(ldt, offset, zone);
  };
  ZonedDateTime.ofStrict = function ofStrict(localDateTime, offset, zone) {
    requireNonNull(localDateTime, 'localDateTime');
    requireNonNull(offset, 'offset');
    requireNonNull(zone, 'zone');
    var rules = zone.rules();
    if (rules.isValidOffset(localDateTime, offset) === false) {
      var trans = rules.transition(localDateTime);
      if (trans != null && trans.isGap()) {
        throw new DateTimeException("LocalDateTime " + localDateTime + " does not exist in zone " + zone + " due to a gap in the local time-line, typically caused by daylight savings");
      }
      throw new DateTimeException("ZoneOffset \"" + offset + "\" is not valid for LocalDateTime \"" + localDateTime + "\" in zone \"" + zone + "\"");
    }
    return new ZonedDateTime(localDateTime, offset, zone);
  };
  ZonedDateTime.ofLenient = function ofLenient(localDateTime, offset, zone) {
    requireNonNull(localDateTime, 'localDateTime');
    requireNonNull(offset, 'offset');
    requireNonNull(zone, 'zone');
    if (zone instanceof ZoneOffset && offset.equals(zone) === false) {
      throw new IllegalArgumentException('ZoneId must match ZoneOffset');
    }
    return new ZonedDateTime(localDateTime, offset, zone);
  };
  ZonedDateTime.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    if (temporal instanceof ZonedDateTime) {
      return temporal;
    }
    var zone = ZoneId.from(temporal);
    if (temporal.isSupported(ChronoField.INSTANT_SECONDS)) {
      var zdt = ZonedDateTime._from(temporal, zone);
      if (zdt != null) return zdt;
    }
    var ldt = LocalDateTime.from(temporal);
    return ZonedDateTime.of2(ldt, zone);
  };
  ZonedDateTime._from = function _from(temporal, zone) {
    try {
      return ZonedDateTime.__from(temporal, zone);
    } catch (ex) {
      if (!(ex instanceof DateTimeException)) throw ex;
    }
  };
  ZonedDateTime.__from = function __from(temporal, zone) {
    var epochSecond = temporal.getLong(ChronoField.INSTANT_SECONDS);
    var nanoOfSecond = temporal.get(ChronoField.NANO_OF_SECOND);
    return ZonedDateTime._create(epochSecond, nanoOfSecond, zone);
  };
  ZonedDateTime.parse = function parse(text, formatter) {
    if (formatter === void 0) {
      formatter = DateTimeFormatter.ISO_ZONED_DATE_TIME;
    }
    requireNonNull(formatter, 'formatter');
    return formatter.parse(text, ZonedDateTime.FROM);
  };
  function ZonedDateTime(dateTime, offset, zone) {
    var _this;
    requireNonNull(dateTime, 'dateTime');
    requireNonNull(offset, 'offset');
    requireNonNull(zone, 'zone');
    _this = _ChronoZonedDateTime.call(this) || this;
    _this._dateTime = dateTime;
    _this._offset = offset;
    _this._zone = zone;
    return _this;
  }
  var _proto = ZonedDateTime.prototype;
  _proto._resolveLocal = function _resolveLocal(newDateTime) {
    requireNonNull(newDateTime, 'newDateTime');
    return ZonedDateTime.ofLocal(newDateTime, this._zone, this._offset);
  };
  _proto._resolveInstant = function _resolveInstant(newDateTime) {
    return ZonedDateTime.ofInstant3(newDateTime, this._offset, this._zone);
  };
  _proto._resolveOffset = function _resolveOffset(offset) {
    if (offset.equals(this._offset) === false && this._zone.rules().isValidOffset(this._dateTime, offset)) {
      return new ZonedDateTime(this._dateTime, offset, this._zone);
    }
    return this;
  };
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (fieldOrUnit instanceof ChronoField) {
      return true;
    } else if (fieldOrUnit instanceof ChronoUnit) {
      return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
    }
    return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    if (field instanceof ChronoField) {
      if (field === ChronoField.INSTANT_SECONDS || field === ChronoField.OFFSET_SECONDS) {
        return field.range();
      }
      return this._dateTime.range(field);
    }
    return field.rangeRefinedBy(this);
  };
  _proto.get = function get(field) {
    return this.getLong(field);
  };
  _proto.getLong = function getLong(field) {
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.INSTANT_SECONDS:
          return this.toEpochSecond();
        case ChronoField.OFFSET_SECONDS:
          return this._offset.totalSeconds();
      }
      return this._dateTime.getLong(field);
    }
    requireNonNull(field, 'field');
    return field.getFrom(this);
  };
  _proto.offset = function offset() {
    return this._offset;
  };
  _proto.withEarlierOffsetAtOverlap = function withEarlierOffsetAtOverlap() {
    var trans = this._zone.rules().transition(this._dateTime);
    if (trans != null && trans.isOverlap()) {
      var earlierOffset = trans.offsetBefore();
      if (earlierOffset.equals(this._offset) === false) {
        return new ZonedDateTime(this._dateTime, earlierOffset, this._zone);
      }
    }
    return this;
  };
  _proto.withLaterOffsetAtOverlap = function withLaterOffsetAtOverlap() {
    var trans = this._zone.rules().transition(this.toLocalDateTime());
    if (trans != null) {
      var laterOffset = trans.offsetAfter();
      if (laterOffset.equals(this._offset) === false) {
        return new ZonedDateTime(this._dateTime, laterOffset, this._zone);
      }
    }
    return this;
  };
  _proto.zone = function zone() {
    return this._zone;
  };
  _proto.withZoneSameLocal = function withZoneSameLocal(zone) {
    requireNonNull(zone, 'zone');
    return this._zone.equals(zone) ? this : ZonedDateTime.ofLocal(this._dateTime, zone, this._offset);
  };
  _proto.withZoneSameInstant = function withZoneSameInstant(zone) {
    requireNonNull(zone, 'zone');
    return this._zone.equals(zone) ? this : ZonedDateTime._create(this._dateTime.toEpochSecond(this._offset), this._dateTime.nano(), zone);
  };
  _proto.withFixedOffsetZone = function withFixedOffsetZone() {
    return this._zone.equals(this._offset) ? this : new ZonedDateTime(this._dateTime, this._offset, this._offset);
  };
  _proto.year = function year() {
    return this._dateTime.year();
  };
  _proto.monthValue = function monthValue() {
    return this._dateTime.monthValue();
  };
  _proto.month = function month() {
    return this._dateTime.month();
  };
  _proto.dayOfMonth = function dayOfMonth() {
    return this._dateTime.dayOfMonth();
  };
  _proto.dayOfYear = function dayOfYear() {
    return this._dateTime.dayOfYear();
  };
  _proto.dayOfWeek = function dayOfWeek() {
    return this._dateTime.dayOfWeek();
  };
  _proto.hour = function hour() {
    return this._dateTime.hour();
  };
  _proto.minute = function minute() {
    return this._dateTime.minute();
  };
  _proto.second = function second() {
    return this._dateTime.second();
  };
  _proto.nano = function nano() {
    return this._dateTime.nano();
  };
  _proto._withAdjuster = function _withAdjuster(adjuster) {
    if (adjuster instanceof LocalDate) {
      return this._resolveLocal(LocalDateTime.of(adjuster, this._dateTime.toLocalTime()));
    } else if (adjuster instanceof LocalTime) {
      return this._resolveLocal(LocalDateTime.of(this._dateTime.toLocalDate(), adjuster));
    } else if (adjuster instanceof LocalDateTime) {
      return this._resolveLocal(adjuster);
    } else if (adjuster instanceof Instant) {
      var instant = adjuster;
      return ZonedDateTime._create(instant.epochSecond(), instant.nano(), this._zone);
    } else if (adjuster instanceof ZoneOffset) {
      return this._resolveOffset(adjuster);
    }
    return _ChronoZonedDateTime.prototype._withAdjuster.call(this, adjuster);
  };
  _proto._withField = function _withField(field, newValue) {
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.INSTANT_SECONDS:
          return ZonedDateTime._create(newValue, this.nano(), this._zone);
        case ChronoField.OFFSET_SECONDS:
          {
            var offset = ZoneOffset.ofTotalSeconds(field.checkValidIntValue(newValue));
            return this._resolveOffset(offset);
          }
      }
      return this._resolveLocal(this._dateTime.with(field, newValue));
    }
    return field.adjustInto(this, newValue);
  };
  _proto.withYear = function withYear(year) {
    return this._resolveLocal(this._dateTime.withYear(year));
  };
  _proto.withMonth = function withMonth(month) {
    return this._resolveLocal(this._dateTime.withMonth(month));
  };
  _proto.withDayOfMonth = function withDayOfMonth(dayOfMonth) {
    return this._resolveLocal(this._dateTime.withDayOfMonth(dayOfMonth));
  };
  _proto.withDayOfYear = function withDayOfYear(dayOfYear) {
    return this._resolveLocal(this._dateTime.withDayOfYear(dayOfYear));
  };
  _proto.withHour = function withHour(hour) {
    return this._resolveLocal(this._dateTime.withHour(hour));
  };
  _proto.withMinute = function withMinute(minute) {
    return this._resolveLocal(this._dateTime.withMinute(minute));
  };
  _proto.withSecond = function withSecond(second) {
    return this._resolveLocal(this._dateTime.withSecond(second));
  };
  _proto.withNano = function withNano(nanoOfSecond) {
    return this._resolveLocal(this._dateTime.withNano(nanoOfSecond));
  };
  _proto.truncatedTo = function truncatedTo(unit) {
    return this._resolveLocal(this._dateTime.truncatedTo(unit));
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    if (unit instanceof ChronoUnit) {
      if (unit.isDateBased()) {
        return this._resolveLocal(this._dateTime.plus(amountToAdd, unit));
      } else {
        return this._resolveInstant(this._dateTime.plus(amountToAdd, unit));
      }
    }
    requireNonNull(unit, 'unit');
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusYears = function plusYears(years) {
    return this._resolveLocal(this._dateTime.plusYears(years));
  };
  _proto.plusMonths = function plusMonths(months) {
    return this._resolveLocal(this._dateTime.plusMonths(months));
  };
  _proto.plusWeeks = function plusWeeks(weeks) {
    return this._resolveLocal(this._dateTime.plusWeeks(weeks));
  };
  _proto.plusDays = function plusDays(days) {
    return this._resolveLocal(this._dateTime.plusDays(days));
  };
  _proto.plusHours = function plusHours(hours) {
    return this._resolveInstant(this._dateTime.plusHours(hours));
  };
  _proto.plusMinutes = function plusMinutes(minutes) {
    return this._resolveInstant(this._dateTime.plusMinutes(minutes));
  };
  _proto.plusSeconds = function plusSeconds(seconds) {
    return this._resolveInstant(this._dateTime.plusSeconds(seconds));
  };
  _proto.plusNanos = function plusNanos(nanos) {
    return this._resolveInstant(this._dateTime.plusNanos(nanos));
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    return this._plusUnit(-1 * amountToSubtract, unit);
  };
  _proto.minusYears = function minusYears(years) {
    return this.plusYears(-1 * years);
  };
  _proto.minusMonths = function minusMonths(months) {
    return this.plusMonths(-1 * months);
  };
  _proto.minusWeeks = function minusWeeks(weeks) {
    return this.plusWeeks(-1 * weeks);
  };
  _proto.minusDays = function minusDays(days) {
    return this.plusDays(-1 * days);
  };
  _proto.minusHours = function minusHours(hours) {
    return this.plusHours(-1 * hours);
  };
  _proto.minusMinutes = function minusMinutes(minutes) {
    return this.plusMinutes(-1 * minutes);
  };
  _proto.minusSeconds = function minusSeconds(seconds) {
    return this.plusSeconds(-1 * seconds);
  };
  _proto.minusNanos = function minusNanos(nanos) {
    return this.plusNanos(-1 * nanos);
  };
  _proto.query = function query(_query) {
    if (_query === TemporalQueries.localDate()) {
      return this.toLocalDate();
    }
    requireNonNull(_query, 'query');
    return _ChronoZonedDateTime.prototype.query.call(this, _query);
  };
  _proto.until = function until(endExclusive, unit) {
    var end = ZonedDateTime.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      end = end.withZoneSameInstant(this._zone);
      if (unit.isDateBased()) {
        return this._dateTime.until(end._dateTime, unit);
      } else {
        var difference = this._offset.totalSeconds() - end._offset.totalSeconds();
        var adjustedEnd = end._dateTime.plusSeconds(difference);
        return this._dateTime.until(adjustedEnd, unit);
      }
    }
    return unit.between(this, end);
  };
  _proto.toLocalDateTime = function toLocalDateTime() {
    return this._dateTime;
  };
  _proto.toLocalDate = function toLocalDate() {
    return this._dateTime.toLocalDate();
  };
  _proto.toLocalTime = function toLocalTime() {
    return this._dateTime.toLocalTime();
  };
  _proto.toOffsetDateTime = function toOffsetDateTime() {
    return OffsetDateTime.of(this._dateTime, this._offset);
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof ZonedDateTime) {
      return this._dateTime.equals(other._dateTime) && this._offset.equals(other._offset) && this._zone.equals(other._zone);
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return MathUtil.hashCode(this._dateTime.hashCode(), this._offset.hashCode(), this._zone.hashCode());
  };
  _proto.toString = function toString() {
    var str = this._dateTime.toString() + this._offset.toString();
    if (this._offset !== this._zone) {
      str += "[" + this._zone.toString() + "]";
    }
    return str;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.format = function format(formatter) {
    return _ChronoZonedDateTime.prototype.format.call(this, formatter);
  };
  return ZonedDateTime;
}(ChronoZonedDateTime);
function _init$7() {
  ZonedDateTime.FROM = createTemporalQuery('ZonedDateTime.FROM', function (temporal) {
    return ZonedDateTime.from(temporal);
  });
}

var OffsetDateTime = function (_Temporal) {
  _inheritsLoose(OffsetDateTime, _Temporal);
  OffsetDateTime.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    if (temporal instanceof OffsetDateTime) {
      return temporal;
    }
    try {
      var offset = ZoneOffset.from(temporal);
      try {
        var ldt = LocalDateTime.from(temporal);
        return OffsetDateTime.of(ldt, offset);
      } catch (_) {
        var instant = Instant.from(temporal);
        return OffsetDateTime.ofInstant(instant, offset);
      }
    } catch (ex) {
      throw new DateTimeException("Unable to obtain OffsetDateTime TemporalAccessor: " + temporal + ", type " + (temporal.constructor != null ? temporal.constructor.name : ''));
    }
  };
  OffsetDateTime.now = function now(clockOrZone) {
    if (arguments.length === 0) {
      return OffsetDateTime.now(Clock.systemDefaultZone());
    } else {
      requireNonNull(clockOrZone, 'clockOrZone');
      if (clockOrZone instanceof ZoneId) {
        return OffsetDateTime.now(Clock.system(clockOrZone));
      } else if (clockOrZone instanceof Clock) {
        var now = clockOrZone.instant();
        return OffsetDateTime.ofInstant(now, clockOrZone.zone().rules().offset(now));
      } else {
        throw new IllegalArgumentException('clockOrZone must be an instance of ZoneId or Clock');
      }
    }
  };
  OffsetDateTime.of = function of() {
    if (arguments.length <= 2) {
      return OffsetDateTime.ofDateTime.apply(this, arguments);
    } else if (arguments.length === 3) {
      return OffsetDateTime.ofDateAndTime.apply(this, arguments);
    } else {
      return OffsetDateTime.ofNumbers.apply(this, arguments);
    }
  };
  OffsetDateTime.ofDateTime = function ofDateTime(dateTime, offset) {
    return new OffsetDateTime(dateTime, offset);
  };
  OffsetDateTime.ofDateAndTime = function ofDateAndTime(date, time, offset) {
    var dt = LocalDateTime.of(date, time);
    return new OffsetDateTime(dt, offset);
  };
  OffsetDateTime.ofNumbers = function ofNumbers(year, month, dayOfMonth, hour, minute, second, nanoOfSecond, offset) {
    if (hour === void 0) {
      hour = 0;
    }
    if (minute === void 0) {
      minute = 0;
    }
    if (second === void 0) {
      second = 0;
    }
    if (nanoOfSecond === void 0) {
      nanoOfSecond = 0;
    }
    var dt = LocalDateTime.of(year, month, dayOfMonth, hour, minute, second, nanoOfSecond);
    return new OffsetDateTime(dt, offset);
  };
  OffsetDateTime.ofInstant = function ofInstant(instant, zone) {
    requireNonNull(instant, 'instant');
    requireNonNull(zone, 'zone');
    var rules = zone.rules();
    var offset = rules.offset(instant);
    var ldt = LocalDateTime.ofEpochSecond(instant.epochSecond(), instant.nano(), offset);
    return new OffsetDateTime(ldt, offset);
  };
  OffsetDateTime.parse = function parse(text, formatter) {
    if (formatter === void 0) {
      formatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    }
    requireNonNull(formatter, 'formatter');
    return formatter.parse(text, OffsetDateTime.FROM);
  };
  function OffsetDateTime(dateTime, offset) {
    var _this;
    _this = _Temporal.call(this) || this;
    requireNonNull(dateTime, 'dateTime');
    requireInstance(dateTime, LocalDateTime, 'dateTime');
    requireNonNull(offset, 'offset');
    requireInstance(offset, ZoneOffset, 'offset');
    _this._dateTime = dateTime;
    _this._offset = offset;
    return _this;
  }
  var _proto = OffsetDateTime.prototype;
  _proto.adjustInto = function adjustInto(temporal) {
    return temporal.with(ChronoField.EPOCH_DAY, this.toLocalDate().toEpochDay()).with(ChronoField.NANO_OF_DAY, this.toLocalTime().toNanoOfDay()).with(ChronoField.OFFSET_SECONDS, this.offset().totalSeconds());
  };
  _proto.until = function until(endExclusive, unit) {
    var end = OffsetDateTime.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      end = end.withOffsetSameInstant(this._offset);
      return this._dateTime.until(end._dateTime, unit);
    }
    return unit.between(this, end);
  };
  _proto.atZoneSameInstant = function atZoneSameInstant(zone) {
    return ZonedDateTime.ofInstant(this._dateTime, this._offset, zone);
  };
  _proto.atZoneSimilarLocal = function atZoneSimilarLocal(zone) {
    return ZonedDateTime.ofLocal(this._dateTime, zone, this._offset);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    if (_query === TemporalQueries.chronology()) {
      return IsoChronology.INSTANCE;
    } else if (_query === TemporalQueries.precision()) {
      return ChronoUnit.NANOS;
    } else if (_query === TemporalQueries.offset() || _query === TemporalQueries.zone()) {
      return this.offset();
    } else if (_query === TemporalQueries.localDate()) {
      return this.toLocalDate();
    } else if (_query === TemporalQueries.localTime()) {
      return this.toLocalTime();
    } else if (_query === TemporalQueries.zoneId()) {
      return null;
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto.get = function get(field) {
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.INSTANT_SECONDS:
          throw new DateTimeException("Field too large for an int: " + field);
        case ChronoField.OFFSET_SECONDS:
          return this.offset().totalSeconds();
      }
      return this._dateTime.get(field);
    }
    return _Temporal.prototype.get.call(this, field);
  };
  _proto.getLong = function getLong(field) {
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.INSTANT_SECONDS:
          return this.toEpochSecond();
        case ChronoField.OFFSET_SECONDS:
          return this.offset().totalSeconds();
      }
      return this._dateTime.getLong(field);
    }
    return field.getFrom(this);
  };
  _proto.offset = function offset() {
    return this._offset;
  };
  _proto.year = function year() {
    return this._dateTime.year();
  };
  _proto.monthValue = function monthValue() {
    return this._dateTime.monthValue();
  };
  _proto.month = function month() {
    return this._dateTime.month();
  };
  _proto.dayOfMonth = function dayOfMonth() {
    return this._dateTime.dayOfMonth();
  };
  _proto.dayOfYear = function dayOfYear() {
    return this._dateTime.dayOfYear();
  };
  _proto.dayOfWeek = function dayOfWeek() {
    return this._dateTime.dayOfWeek();
  };
  _proto.hour = function hour() {
    return this._dateTime.hour();
  };
  _proto.minute = function minute() {
    return this._dateTime.minute();
  };
  _proto.second = function second() {
    return this._dateTime.second();
  };
  _proto.nano = function nano() {
    return this._dateTime.nano();
  };
  _proto.toLocalDateTime = function toLocalDateTime() {
    return this._dateTime;
  };
  _proto.toLocalDate = function toLocalDate() {
    return this._dateTime.toLocalDate();
  };
  _proto.toLocalTime = function toLocalTime() {
    return this._dateTime.toLocalTime();
  };
  _proto.toOffsetTime = function toOffsetTime() {
    return OffsetTime.of(this._dateTime.toLocalTime(), this._offset);
  };
  _proto.toZonedDateTime = function toZonedDateTime() {
    return ZonedDateTime.of(this._dateTime, this._offset);
  };
  _proto.toInstant = function toInstant() {
    return this._dateTime.toInstant(this._offset);
  };
  _proto.toEpochSecond = function toEpochSecond() {
    return this._dateTime.toEpochSecond(this._offset);
  };
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (fieldOrUnit instanceof ChronoField) {
      return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
    }
    if (fieldOrUnit instanceof ChronoUnit) {
      return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
    }
    return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    if (field instanceof ChronoField) {
      if (field === ChronoField.INSTANT_SECONDS || field === ChronoField.OFFSET_SECONDS) {
        return field.range();
      }
      return this._dateTime.range(field);
    }
    return field.rangeRefinedBy(this);
  };
  _proto._withAdjuster = function _withAdjuster(adjuster) {
    requireNonNull(adjuster);
    if (adjuster instanceof LocalDate || adjuster instanceof LocalTime || adjuster instanceof LocalDateTime) {
      return this._withDateTimeOffset(this._dateTime.with(adjuster), this._offset);
    } else if (adjuster instanceof Instant) {
      return OffsetDateTime.ofInstant(adjuster, this._offset);
    } else if (adjuster instanceof ZoneOffset) {
      return this._withDateTimeOffset(this._dateTime, adjuster);
    } else if (adjuster instanceof OffsetDateTime) {
      return adjuster;
    }
    return adjuster.adjustInto(this);
  };
  _proto._withField = function _withField(field, newValue) {
    requireNonNull(field);
    if (field instanceof ChronoField) {
      var f = field;
      switch (f) {
        case ChronoField.INSTANT_SECONDS:
          return OffsetDateTime.ofInstant(Instant.ofEpochSecond(newValue, this.nano()), this._offset);
        case ChronoField.OFFSET_SECONDS:
          {
            return this._withDateTimeOffset(this._dateTime, ZoneOffset.ofTotalSeconds(f.checkValidIntValue(newValue)));
          }
      }
      return this._withDateTimeOffset(this._dateTime.with(field, newValue), this._offset);
    }
    return field.adjustInto(this, newValue);
  };
  _proto._withDateTimeOffset = function _withDateTimeOffset(dateTime, offset) {
    if (this._dateTime === dateTime && this._offset.equals(offset)) {
      return this;
    }
    return new OffsetDateTime(dateTime, offset);
  };
  _proto.withYear = function withYear(year) {
    return this._withDateTimeOffset(this._dateTime.withYear(year), this._offset);
  };
  _proto.withMonth = function withMonth(month) {
    return this._withDateTimeOffset(this._dateTime.withMonth(month), this._offset);
  };
  _proto.withDayOfMonth = function withDayOfMonth(dayOfMonth) {
    return this._withDateTimeOffset(this._dateTime.withDayOfMonth(dayOfMonth), this._offset);
  };
  _proto.withDayOfYear = function withDayOfYear(dayOfYear) {
    return this._withDateTimeOffset(this._dateTime.withDayOfYear(dayOfYear), this._offset);
  };
  _proto.withHour = function withHour(hour) {
    return this._withDateTimeOffset(this._dateTime.withHour(hour), this._offset);
  };
  _proto.withMinute = function withMinute(minute) {
    return this._withDateTimeOffset(this._dateTime.withMinute(minute), this._offset);
  };
  _proto.withSecond = function withSecond(second) {
    return this._withDateTimeOffset(this._dateTime.withSecond(second), this._offset);
  };
  _proto.withNano = function withNano(nanoOfSecond) {
    return this._withDateTimeOffset(this._dateTime.withNano(nanoOfSecond), this._offset);
  };
  _proto.withOffsetSameLocal = function withOffsetSameLocal(offset) {
    requireNonNull(offset, 'offset');
    return this._withDateTimeOffset(this._dateTime, offset);
  };
  _proto.withOffsetSameInstant = function withOffsetSameInstant(offset) {
    requireNonNull(offset, 'offset');
    if (offset.equals(this._offset)) {
      return this;
    }
    var difference = offset.totalSeconds() - this._offset.totalSeconds();
    var adjusted = this._dateTime.plusSeconds(difference);
    return new OffsetDateTime(adjusted, offset);
  };
  _proto.truncatedTo = function truncatedTo(unit) {
    return this._withDateTimeOffset(this._dateTime.truncatedTo(unit), this._offset);
  };
  _proto._plusAmount = function _plusAmount(amount) {
    requireNonNull(amount, 'amount');
    return amount.addTo(this);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    if (unit instanceof ChronoUnit) {
      return this._withDateTimeOffset(this._dateTime.plus(amountToAdd, unit), this._offset);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusYears = function plusYears(years) {
    return this._withDateTimeOffset(this._dateTime.plusYears(years), this._offset);
  };
  _proto.plusMonths = function plusMonths(months) {
    return this._withDateTimeOffset(this._dateTime.plusMonths(months), this._offset);
  };
  _proto.plusWeeks = function plusWeeks(weeks) {
    return this._withDateTimeOffset(this._dateTime.plusWeeks(weeks), this._offset);
  };
  _proto.plusDays = function plusDays(days) {
    return this._withDateTimeOffset(this._dateTime.plusDays(days), this._offset);
  };
  _proto.plusHours = function plusHours(hours) {
    return this._withDateTimeOffset(this._dateTime.plusHours(hours), this._offset);
  };
  _proto.plusMinutes = function plusMinutes(minutes) {
    return this._withDateTimeOffset(this._dateTime.plusMinutes(minutes), this._offset);
  };
  _proto.plusSeconds = function plusSeconds(seconds) {
    return this._withDateTimeOffset(this._dateTime.plusSeconds(seconds), this._offset);
  };
  _proto.plusNanos = function plusNanos(nanos) {
    return this._withDateTimeOffset(this._dateTime.plusNanos(nanos), this._offset);
  };
  _proto._minusAmount = function _minusAmount(amount) {
    requireNonNull(amount);
    return amount.subtractFrom(this);
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    return this.plus(-1 * amountToSubtract, unit);
  };
  _proto.minusYears = function minusYears(years) {
    return this._withDateTimeOffset(this._dateTime.minusYears(years), this._offset);
  };
  _proto.minusMonths = function minusMonths(months) {
    return this._withDateTimeOffset(this._dateTime.minusMonths(months), this._offset);
  };
  _proto.minusWeeks = function minusWeeks(weeks) {
    return this._withDateTimeOffset(this._dateTime.minusWeeks(weeks), this._offset);
  };
  _proto.minusDays = function minusDays(days) {
    return this._withDateTimeOffset(this._dateTime.minusDays(days), this._offset);
  };
  _proto.minusHours = function minusHours(hours) {
    return this._withDateTimeOffset(this._dateTime.minusHours(hours), this._offset);
  };
  _proto.minusMinutes = function minusMinutes(minutes) {
    return this._withDateTimeOffset(this._dateTime.minusMinutes(minutes), this._offset);
  };
  _proto.minusSeconds = function minusSeconds(seconds) {
    return this._withDateTimeOffset(this._dateTime.minusSeconds(seconds), this._offset);
  };
  _proto.minusNanos = function minusNanos(nanos) {
    return this._withDateTimeOffset(this._dateTime.minusNanos(nanos), this._offset);
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, OffsetDateTime, 'other');
    if (this.offset().equals(other.offset())) {
      return this.toLocalDateTime().compareTo(other.toLocalDateTime());
    }
    var cmp = MathUtil.compareNumbers(this.toEpochSecond(), other.toEpochSecond());
    if (cmp === 0) {
      cmp = this.toLocalTime().nano() - other.toLocalTime().nano();
      if (cmp === 0) {
        cmp = this.toLocalDateTime().compareTo(other.toLocalDateTime());
      }
    }
    return cmp;
  };
  _proto.isAfter = function isAfter(other) {
    requireNonNull(other, 'other');
    var thisEpochSec = this.toEpochSecond();
    var otherEpochSec = other.toEpochSecond();
    return thisEpochSec > otherEpochSec || thisEpochSec === otherEpochSec && this.toLocalTime().nano() > other.toLocalTime().nano();
  };
  _proto.isBefore = function isBefore(other) {
    requireNonNull(other, 'other');
    var thisEpochSec = this.toEpochSecond();
    var otherEpochSec = other.toEpochSecond();
    return thisEpochSec < otherEpochSec || thisEpochSec === otherEpochSec && this.toLocalTime().nano() < other.toLocalTime().nano();
  };
  _proto.isEqual = function isEqual(other) {
    requireNonNull(other, 'other');
    return this.toEpochSecond() === other.toEpochSecond() && this.toLocalTime().nano() === other.toLocalTime().nano();
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof OffsetDateTime) {
      return this._dateTime.equals(other._dateTime) && this._offset.equals(other._offset);
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return this._dateTime.hashCode() ^ this._offset.hashCode();
  };
  _proto.toString = function toString() {
    return this._dateTime.toString() + this._offset.toString();
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    return formatter.format(this);
  };
  return OffsetDateTime;
}(Temporal);
function _init$6() {
  OffsetDateTime.MIN = LocalDateTime.MIN.atOffset(ZoneOffset.MAX);
  OffsetDateTime.MAX = LocalDateTime.MAX.atOffset(ZoneOffset.MIN);
  OffsetDateTime.FROM = createTemporalQuery('OffsetDateTime.FROM', function (temporal) {
    return OffsetDateTime.from(temporal);
  });
}

var DAYS_PER_CYCLE = 146097;
var DAYS_0000_TO_1970 = DAYS_PER_CYCLE * 5 - (30 * 365 + 7);
var LocalDate = function (_ChronoLocalDate) {
  _inheritsLoose(LocalDate, _ChronoLocalDate);
  LocalDate.now = function now(clockOrZone) {
    var clock;
    if (clockOrZone == null) {
      clock = Clock.systemDefaultZone();
    } else if (clockOrZone instanceof ZoneId) {
      clock = Clock.system(clockOrZone);
    } else {
      clock = clockOrZone;
    }
    return LocalDate.ofInstant(clock.instant(), clock.zone());
  };
  LocalDate.ofInstant = function ofInstant(instant, zone) {
    if (zone === void 0) {
      zone = ZoneId.systemDefault();
    }
    requireNonNull(instant, 'instant');
    var offset = zone.rules().offset(instant);
    var epochSec = instant.epochSecond() + offset.totalSeconds();
    var epochDay = MathUtil.floorDiv(epochSec, LocalTime.SECONDS_PER_DAY);
    return LocalDate.ofEpochDay(epochDay);
  };
  LocalDate.of = function of(year, month, dayOfMonth) {
    return new LocalDate(year, month, dayOfMonth);
  };
  LocalDate.ofYearDay = function ofYearDay(year, dayOfYear) {
    ChronoField.YEAR.checkValidValue(year);
    var leap = IsoChronology.isLeapYear(year);
    if (dayOfYear === 366 && leap === false) {
      assert(false, "Invalid date 'DayOfYear 366' as '" + year + "' is not a leap year", DateTimeException);
    }
    var moy = Month.of(Math.floor((dayOfYear - 1) / 31 + 1));
    var monthEnd = moy.firstDayOfYear(leap) + moy.length(leap) - 1;
    if (dayOfYear > monthEnd) {
      moy = moy.plus(1);
    }
    var dom = dayOfYear - moy.firstDayOfYear(leap) + 1;
    return new LocalDate(year, moy.value(), dom);
  };
  LocalDate.ofEpochDay = function ofEpochDay(epochDay) {
    if (epochDay === void 0) {
      epochDay = 0;
    }
    var adjust, adjustCycles, doyEst, yearEst, zeroDay;
    zeroDay = epochDay + DAYS_0000_TO_1970;
    zeroDay -= 60;
    adjust = 0;
    if (zeroDay < 0) {
      adjustCycles = MathUtil.intDiv(zeroDay + 1, DAYS_PER_CYCLE) - 1;
      adjust = adjustCycles * 400;
      zeroDay += -adjustCycles * DAYS_PER_CYCLE;
    }
    yearEst = MathUtil.intDiv(400 * zeroDay + 591, DAYS_PER_CYCLE);
    doyEst = zeroDay - (365 * yearEst + MathUtil.intDiv(yearEst, 4) - MathUtil.intDiv(yearEst, 100) + MathUtil.intDiv(yearEst, 400));
    if (doyEst < 0) {
      yearEst--;
      doyEst = zeroDay - (365 * yearEst + MathUtil.intDiv(yearEst, 4) - MathUtil.intDiv(yearEst, 100) + MathUtil.intDiv(yearEst, 400));
    }
    yearEst += adjust;
    var marchDoy0 = doyEst;
    var marchMonth0 = MathUtil.intDiv(marchDoy0 * 5 + 2, 153);
    var month = (marchMonth0 + 2) % 12 + 1;
    var dom = marchDoy0 - MathUtil.intDiv(marchMonth0 * 306 + 5, 10) + 1;
    yearEst += MathUtil.intDiv(marchMonth0, 10);
    var year = yearEst;
    return new LocalDate(year, month, dom);
  };
  LocalDate.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    var date = temporal.query(TemporalQueries.localDate());
    if (date == null) {
      throw new DateTimeException("Unable to obtain LocalDate from TemporalAccessor: " + temporal + ", type " + (temporal.constructor != null ? temporal.constructor.name : ''));
    }
    return date;
  };
  LocalDate.parse = function parse(text, formatter) {
    if (formatter === void 0) {
      formatter = DateTimeFormatter.ISO_LOCAL_DATE;
    }
    assert(formatter != null, 'formatter', NullPointerException);
    return formatter.parse(text, LocalDate.FROM);
  };
  LocalDate._resolvePreviousValid = function _resolvePreviousValid(year, month, day) {
    switch (month) {
      case 2:
        day = Math.min(day, IsoChronology.isLeapYear(year) ? 29 : 28);
        break;
      case 4:
      case 6:
      case 9:
      case 11:
        day = Math.min(day, 30);
        break;
    }
    return LocalDate.of(year, month, day);
  };
  function LocalDate(year, month, dayOfMonth) {
    var _this;
    _this = _ChronoLocalDate.call(this) || this;
    requireNonNull(year, 'year');
    requireNonNull(month, 'month');
    requireNonNull(dayOfMonth, 'dayOfMonth');
    if (month instanceof Month) {
      month = month.value();
    }
    _this._year = MathUtil.safeToInt(year);
    _this._month = MathUtil.safeToInt(month);
    _this._day = MathUtil.safeToInt(dayOfMonth);
    LocalDate._validate(_this._year, _this._month, _this._day);
    return _this;
  }
  LocalDate._validate = function _validate(year, month, dayOfMonth) {
    var dom;
    ChronoField.YEAR.checkValidValue(year);
    ChronoField.MONTH_OF_YEAR.checkValidValue(month);
    ChronoField.DAY_OF_MONTH.checkValidValue(dayOfMonth);
    if (dayOfMonth > 28) {
      dom = 31;
      switch (month) {
        case 2:
          dom = IsoChronology.isLeapYear(year) ? 29 : 28;
          break;
        case 4:
        case 6:
        case 9:
        case 11:
          dom = 30;
      }
      if (dayOfMonth > dom) {
        if (dayOfMonth === 29) {
          assert(false, "Invalid date 'February 29' as '" + year + "' is not a leap year", DateTimeException);
        } else {
          assert(false, "Invalid date '" + year + "' '" + month + "' '" + dayOfMonth + "'", DateTimeException);
        }
      }
    }
  };
  var _proto = LocalDate.prototype;
  _proto.isSupported = function isSupported(field) {
    return _ChronoLocalDate.prototype.isSupported.call(this, field);
  };
  _proto.range = function range(field) {
    if (field instanceof ChronoField) {
      if (field.isDateBased()) {
        switch (field) {
          case ChronoField.DAY_OF_MONTH:
            return ValueRange.of(1, this.lengthOfMonth());
          case ChronoField.DAY_OF_YEAR:
            return ValueRange.of(1, this.lengthOfYear());
          case ChronoField.ALIGNED_WEEK_OF_MONTH:
            return ValueRange.of(1, this.month() === Month.FEBRUARY && this.isLeapYear() === false ? 4 : 5);
          case ChronoField.YEAR_OF_ERA:
            return this._year <= 0 ? ValueRange.of(1, Year.MAX_VALUE + 1) : ValueRange.of(1, Year.MAX_VALUE);
        }
        return field.range();
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.rangeRefinedBy(this);
  };
  _proto.get = function get(field) {
    return this.getLong(field);
  };
  _proto.getLong = function getLong(field) {
    assert(field != null, '', NullPointerException);
    if (field instanceof ChronoField) {
      return this._get0(field);
    }
    return field.getFrom(this);
  };
  _proto._get0 = function _get0(field) {
    switch (field) {
      case ChronoField.DAY_OF_WEEK:
        return this.dayOfWeek().value();
      case ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH:
        return MathUtil.intMod(this._day - 1, 7) + 1;
      case ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR:
        return MathUtil.intMod(this.dayOfYear() - 1, 7) + 1;
      case ChronoField.DAY_OF_MONTH:
        return this._day;
      case ChronoField.DAY_OF_YEAR:
        return this.dayOfYear();
      case ChronoField.EPOCH_DAY:
        return this.toEpochDay();
      case ChronoField.ALIGNED_WEEK_OF_MONTH:
        return MathUtil.intDiv(this._day - 1, 7) + 1;
      case ChronoField.ALIGNED_WEEK_OF_YEAR:
        return MathUtil.intDiv(this.dayOfYear() - 1, 7) + 1;
      case ChronoField.MONTH_OF_YEAR:
        return this._month;
      case ChronoField.PROLEPTIC_MONTH:
        return this._prolepticMonth();
      case ChronoField.YEAR_OF_ERA:
        return this._year >= 1 ? this._year : 1 - this._year;
      case ChronoField.YEAR:
        return this._year;
      case ChronoField.ERA:
        return this._year >= 1 ? 1 : 0;
    }
    throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
  };
  _proto._prolepticMonth = function _prolepticMonth() {
    return this._year * 12 + (this._month - 1);
  };
  _proto.chronology = function chronology() {
    return IsoChronology.INSTANCE;
  };
  _proto.year = function year() {
    return this._year;
  };
  _proto.monthValue = function monthValue() {
    return this._month;
  };
  _proto.month = function month() {
    return Month.of(this._month);
  };
  _proto.dayOfMonth = function dayOfMonth() {
    return this._day;
  };
  _proto.dayOfYear = function dayOfYear() {
    return this.month().firstDayOfYear(this.isLeapYear()) + this._day - 1;
  };
  _proto.dayOfWeek = function dayOfWeek() {
    var dow0 = MathUtil.floorMod(this.toEpochDay() + 3, 7);
    return DayOfWeek.of(dow0 + 1);
  };
  _proto.isLeapYear = function isLeapYear() {
    return IsoChronology.isLeapYear(this._year);
  };
  _proto.lengthOfMonth = function lengthOfMonth() {
    switch (this._month) {
      case 2:
        return this.isLeapYear() ? 29 : 28;
      case 4:
      case 6:
      case 9:
      case 11:
        return 30;
      default:
        return 31;
    }
  };
  _proto.lengthOfYear = function lengthOfYear() {
    return this.isLeapYear() ? 366 : 365;
  };
  _proto._withAdjuster = function _withAdjuster(adjuster) {
    requireNonNull(adjuster, 'adjuster');
    if (adjuster instanceof LocalDate) {
      return adjuster;
    }
    return _ChronoLocalDate.prototype._withAdjuster.call(this, adjuster);
  };
  _proto._withField = function _withField(field, newValue) {
    assert(field != null, 'field', NullPointerException);
    if (field instanceof ChronoField) {
      var f = field;
      f.checkValidValue(newValue);
      switch (f) {
        case ChronoField.DAY_OF_WEEK:
          return this.plusDays(newValue - this.dayOfWeek().value());
        case ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH:
          return this.plusDays(newValue - this.getLong(ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH));
        case ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR:
          return this.plusDays(newValue - this.getLong(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR));
        case ChronoField.DAY_OF_MONTH:
          return this.withDayOfMonth(newValue);
        case ChronoField.DAY_OF_YEAR:
          return this.withDayOfYear(newValue);
        case ChronoField.EPOCH_DAY:
          return LocalDate.ofEpochDay(newValue);
        case ChronoField.ALIGNED_WEEK_OF_MONTH:
          return this.plusWeeks(newValue - this.getLong(ChronoField.ALIGNED_WEEK_OF_MONTH));
        case ChronoField.ALIGNED_WEEK_OF_YEAR:
          return this.plusWeeks(newValue - this.getLong(ChronoField.ALIGNED_WEEK_OF_YEAR));
        case ChronoField.MONTH_OF_YEAR:
          return this.withMonth(newValue);
        case ChronoField.PROLEPTIC_MONTH:
          return this.plusMonths(newValue - this.getLong(ChronoField.PROLEPTIC_MONTH));
        case ChronoField.YEAR_OF_ERA:
          return this.withYear(this._year >= 1 ? newValue : 1 - newValue);
        case ChronoField.YEAR:
          return this.withYear(newValue);
        case ChronoField.ERA:
          return this.getLong(ChronoField.ERA) === newValue ? this : this.withYear(1 - this._year);
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.adjustInto(this, newValue);
  };
  _proto.withYear = function withYear(year) {
    if (this._year === year) {
      return this;
    }
    ChronoField.YEAR.checkValidValue(year);
    return LocalDate._resolvePreviousValid(year, this._month, this._day);
  };
  _proto.withMonth = function withMonth(month) {
    var m = month instanceof Month ? month.value() : month;
    if (this._month === m) {
      return this;
    }
    ChronoField.MONTH_OF_YEAR.checkValidValue(m);
    return LocalDate._resolvePreviousValid(this._year, m, this._day);
  };
  _proto.withDayOfMonth = function withDayOfMonth(dayOfMonth) {
    if (this._day === dayOfMonth) {
      return this;
    }
    return LocalDate.of(this._year, this._month, dayOfMonth);
  };
  _proto.withDayOfYear = function withDayOfYear(dayOfYear) {
    if (this.dayOfYear() === dayOfYear) {
      return this;
    }
    return LocalDate.ofYearDay(this._year, dayOfYear);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    requireNonNull(amountToAdd, 'amountToAdd');
    requireNonNull(unit, 'unit');
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.DAYS:
          return this.plusDays(amountToAdd);
        case ChronoUnit.WEEKS:
          return this.plusWeeks(amountToAdd);
        case ChronoUnit.MONTHS:
          return this.plusMonths(amountToAdd);
        case ChronoUnit.YEARS:
          return this.plusYears(amountToAdd);
        case ChronoUnit.DECADES:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 10));
        case ChronoUnit.CENTURIES:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 100));
        case ChronoUnit.MILLENNIA:
          return this.plusYears(MathUtil.safeMultiply(amountToAdd, 1000));
        case ChronoUnit.ERAS:
          return this.with(ChronoField.ERA, MathUtil.safeAdd(this.getLong(ChronoField.ERA), amountToAdd));
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusYears = function plusYears(yearsToAdd) {
    if (yearsToAdd === 0) {
      return this;
    }
    var newYear = ChronoField.YEAR.checkValidIntValue(this._year + yearsToAdd);
    return LocalDate._resolvePreviousValid(newYear, this._month, this._day);
  };
  _proto.plusMonths = function plusMonths(monthsToAdd) {
    if (monthsToAdd === 0) {
      return this;
    }
    var monthCount = this._year * 12 + (this._month - 1);
    var calcMonths = monthCount + monthsToAdd;
    var newYear = ChronoField.YEAR.checkValidIntValue(MathUtil.floorDiv(calcMonths, 12));
    var newMonth = MathUtil.floorMod(calcMonths, 12) + 1;
    return LocalDate._resolvePreviousValid(newYear, newMonth, this._day);
  };
  _proto.plusWeeks = function plusWeeks(weeksToAdd) {
    return this.plusDays(MathUtil.safeMultiply(weeksToAdd, 7));
  };
  _proto.plusDays = function plusDays(daysToAdd) {
    if (daysToAdd === 0) {
      return this;
    }
    var mjDay = MathUtil.safeAdd(this.toEpochDay(), daysToAdd);
    return LocalDate.ofEpochDay(mjDay);
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    requireNonNull(amountToSubtract, 'amountToSubtract');
    requireNonNull(unit, 'unit');
    return this._plusUnit(-1 * amountToSubtract, unit);
  };
  _proto.minusYears = function minusYears(yearsToSubtract) {
    return this.plusYears(yearsToSubtract * -1);
  };
  _proto.minusMonths = function minusMonths(monthsToSubtract) {
    return this.plusMonths(monthsToSubtract * -1);
  };
  _proto.minusWeeks = function minusWeeks(weeksToSubtract) {
    return this.plusWeeks(weeksToSubtract * -1);
  };
  _proto.minusDays = function minusDays(daysToSubtract) {
    return this.plusDays(daysToSubtract * -1);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    if (_query === TemporalQueries.localDate()) {
      return this;
    }
    return _ChronoLocalDate.prototype.query.call(this, _query);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    return _ChronoLocalDate.prototype.adjustInto.call(this, temporal);
  };
  _proto.until = function until(p1, p2) {
    if (arguments.length < 2) {
      return this.until1(p1);
    } else {
      return this.until2(p1, p2);
    }
  };
  _proto.until2 = function until2(endExclusive, unit) {
    var end = LocalDate.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.DAYS:
          return this.daysUntil(end);
        case ChronoUnit.WEEKS:
          return MathUtil.intDiv(this.daysUntil(end), 7);
        case ChronoUnit.MONTHS:
          return this._monthsUntil(end);
        case ChronoUnit.YEARS:
          return MathUtil.intDiv(this._monthsUntil(end), 12);
        case ChronoUnit.DECADES:
          return MathUtil.intDiv(this._monthsUntil(end), 120);
        case ChronoUnit.CENTURIES:
          return MathUtil.intDiv(this._monthsUntil(end), 1200);
        case ChronoUnit.MILLENNIA:
          return MathUtil.intDiv(this._monthsUntil(end), 12000);
        case ChronoUnit.ERAS:
          return end.getLong(ChronoField.ERA) - this.getLong(ChronoField.ERA);
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.between(this, end);
  };
  _proto.daysUntil = function daysUntil(end) {
    return end.toEpochDay() - this.toEpochDay();
  };
  _proto._monthsUntil = function _monthsUntil(end) {
    var packed1 = this._prolepticMonth() * 32 + this.dayOfMonth();
    var packed2 = end._prolepticMonth() * 32 + end.dayOfMonth();
    return MathUtil.intDiv(packed2 - packed1, 32);
  };
  _proto.until1 = function until1(endDate) {
    var end = LocalDate.from(endDate);
    var totalMonths = end._prolepticMonth() - this._prolepticMonth();
    var days = end._day - this._day;
    if (totalMonths > 0 && days < 0) {
      totalMonths--;
      var calcDate = this.plusMonths(totalMonths);
      days = end.toEpochDay() - calcDate.toEpochDay();
    } else if (totalMonths < 0 && days > 0) {
      totalMonths++;
      days -= end.lengthOfMonth();
    }
    var years = MathUtil.intDiv(totalMonths, 12);
    var months = MathUtil.intMod(totalMonths, 12);
    return Period.of(years, months, days);
  };
  _proto.atTime = function atTime() {
    if (arguments.length === 1) {
      return this.atTime1.apply(this, arguments);
    } else {
      return this.atTime4.apply(this, arguments);
    }
  };
  _proto.atTime1 = function atTime1(time) {
    requireNonNull(time, 'time');
    if (time instanceof LocalTime) {
      return LocalDateTime.of(this, time);
    } else if (time instanceof OffsetTime) {
      return this._atTimeOffsetTime(time);
    } else {
      throw new IllegalArgumentException("time must be an instance of LocalTime or OffsetTime" + (time && time.constructor && time.constructor.name ? ", but is " + time.constructor.name : ''));
    }
  };
  _proto.atTime4 = function atTime4(hour, minute, second, nanoOfSecond) {
    if (second === void 0) {
      second = 0;
    }
    if (nanoOfSecond === void 0) {
      nanoOfSecond = 0;
    }
    return this.atTime1(LocalTime.of(hour, minute, second, nanoOfSecond));
  };
  _proto._atTimeOffsetTime = function _atTimeOffsetTime(time) {
    return OffsetDateTime.of(LocalDateTime.of(this, time.toLocalTime()), time.offset());
  };
  _proto.atStartOfDay = function atStartOfDay(zone) {
    if (zone != null) {
      return this._atStartOfDayWithZone(zone);
    } else {
      return LocalDateTime.of(this, LocalTime.MIDNIGHT);
    }
  };
  _proto._atStartOfDayWithZone = function _atStartOfDayWithZone(zone) {
    requireNonNull(zone, 'zone');
    var ldt = this.atTime(LocalTime.MIDNIGHT);
    if (zone instanceof ZoneOffset === false) {
      var trans = zone.rules().transition(ldt);
      if (trans != null && trans.isGap()) {
        ldt = trans.dateTimeAfter();
      }
    }
    return ZonedDateTime.of(ldt, zone);
  };
  _proto.toEpochDay = function toEpochDay() {
    var y = this._year;
    var m = this._month;
    var total = 0;
    total += 365 * y;
    if (y >= 0) {
      total += MathUtil.intDiv(y + 3, 4) - MathUtil.intDiv(y + 99, 100) + MathUtil.intDiv(y + 399, 400);
    } else {
      total -= MathUtil.intDiv(y, -4) - MathUtil.intDiv(y, -100) + MathUtil.intDiv(y, -400);
    }
    total += MathUtil.intDiv(367 * m - 362, 12);
    total += this.dayOfMonth() - 1;
    if (m > 2) {
      total--;
      if (!IsoChronology.isLeapYear(y)) {
        total--;
      }
    }
    return total - DAYS_0000_TO_1970;
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, LocalDate, 'other');
    return this._compareTo0(other);
  };
  _proto._compareTo0 = function _compareTo0(otherDate) {
    var cmp = this._year - otherDate._year;
    if (cmp === 0) {
      cmp = this._month - otherDate._month;
      if (cmp === 0) {
        cmp = this._day - otherDate._day;
      }
    }
    return cmp;
  };
  _proto.isAfter = function isAfter(other) {
    return this.compareTo(other) > 0;
  };
  _proto.isBefore = function isBefore(other) {
    return this.compareTo(other) < 0;
  };
  _proto.isEqual = function isEqual(other) {
    return this.compareTo(other) === 0;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof LocalDate) {
      return this._compareTo0(other) === 0;
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    var yearValue = this._year;
    var monthValue = this._month;
    var dayValue = this._day;
    return MathUtil.hash(yearValue & 0xFFFFF800 ^ (yearValue << 11) + (monthValue << 6) + dayValue);
  };
  _proto.toString = function toString() {
    var dayString, monthString, yearString;
    var yearValue = this._year;
    var monthValue = this._month;
    var dayValue = this._day;
    var absYear = Math.abs(yearValue);
    if (absYear < 1000) {
      if (yearValue < 0) {
        yearString = "-" + ("" + (yearValue - 10000)).slice(-4);
      } else {
        yearString = ("" + (yearValue + 10000)).slice(-4);
      }
    } else {
      if (yearValue > 9999) {
        yearString = "+" + yearValue;
      } else {
        yearString = "" + yearValue;
      }
    }
    if (monthValue < 10) {
      monthString = "-0" + monthValue;
    } else {
      monthString = "-" + monthValue;
    }
    if (dayValue < 10) {
      dayString = "-0" + dayValue;
    } else {
      dayString = "-" + dayValue;
    }
    return yearString + monthString + dayString;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    requireInstance(formatter, DateTimeFormatter, 'formatter');
    return _ChronoLocalDate.prototype.format.call(this, formatter);
  };
  return LocalDate;
}(ChronoLocalDate);
function _init$5() {
  LocalDate.MIN = LocalDate.of(YearConstants.MIN_VALUE, 1, 1);
  LocalDate.MAX = LocalDate.of(YearConstants.MAX_VALUE, 12, 31);
  LocalDate.EPOCH_0 = LocalDate.ofEpochDay(0);
  LocalDate.FROM = createTemporalQuery('LocalDate.FROM', function (temporal) {
    return LocalDate.from(temporal);
  });
}

var ChronoLocalDateTime = function (_Temporal) {
  _inheritsLoose(ChronoLocalDateTime, _Temporal);
  function ChronoLocalDateTime() {
    return _Temporal.apply(this, arguments) || this;
  }
  var _proto = ChronoLocalDateTime.prototype;
  _proto.chronology = function chronology() {
    return this.toLocalDate().chronology();
  };
  _proto.query = function query(_query) {
    if (_query === TemporalQueries.chronology()) {
      return this.chronology();
    } else if (_query === TemporalQueries.precision()) {
      return ChronoUnit.NANOS;
    } else if (_query === TemporalQueries.localDate()) {
      return LocalDate.ofEpochDay(this.toLocalDate().toEpochDay());
    } else if (_query === TemporalQueries.localTime()) {
      return this.toLocalTime();
    } else if (_query === TemporalQueries.zone() || _query === TemporalQueries.zoneId() || _query === TemporalQueries.offset()) {
      return null;
    }
    return _Temporal.prototype.query.call(this, _query);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    return temporal.with(ChronoField.EPOCH_DAY, this.toLocalDate().toEpochDay()).with(ChronoField.NANO_OF_DAY, this.toLocalTime().toNanoOfDay());
  };
  _proto.toInstant = function toInstant(offset) {
    requireInstance(offset, ZoneOffset, 'zoneId');
    return Instant.ofEpochSecond(this.toEpochSecond(offset), this.toLocalTime().nano());
  };
  _proto.toEpochSecond = function toEpochSecond(offset) {
    requireNonNull(offset, 'offset');
    var epochDay = this.toLocalDate().toEpochDay();
    var secs = epochDay * 86400 + this.toLocalTime().toSecondOfDay();
    secs -= offset.totalSeconds();
    return MathUtil.safeToInt(secs);
  };
  return ChronoLocalDateTime;
}(Temporal);

var LocalDateTime = function (_ChronoLocalDateTime) {
  _inheritsLoose(LocalDateTime, _ChronoLocalDateTime);
  LocalDateTime.now = function now(clockOrZone) {
    if (clockOrZone == null) {
      return LocalDateTime._now(Clock.systemDefaultZone());
    } else if (clockOrZone instanceof Clock) {
      return LocalDateTime._now(clockOrZone);
    } else {
      return LocalDateTime._now(Clock.system(clockOrZone));
    }
  };
  LocalDateTime._now = function _now(clock) {
    requireNonNull(clock, 'clock');
    return LocalDateTime.ofInstant(clock.instant(), clock.zone());
  };
  LocalDateTime._ofEpochMillis = function _ofEpochMillis(epochMilli, offset) {
    var localSecond = MathUtil.floorDiv(epochMilli, 1000) + offset.totalSeconds();
    var localEpochDay = MathUtil.floorDiv(localSecond, LocalTime.SECONDS_PER_DAY);
    var secsOfDay = MathUtil.floorMod(localSecond, LocalTime.SECONDS_PER_DAY);
    var nanoOfSecond = MathUtil.floorMod(epochMilli, 1000) * 1000000;
    var date = LocalDate.ofEpochDay(localEpochDay);
    var time = LocalTime.ofSecondOfDay(secsOfDay, nanoOfSecond);
    return new LocalDateTime(date, time);
  };
  LocalDateTime.of = function of() {
    if (arguments.length <= 2) {
      return LocalDateTime.ofDateAndTime.apply(this, arguments);
    } else {
      return LocalDateTime.ofNumbers.apply(this, arguments);
    }
  };
  LocalDateTime.ofNumbers = function ofNumbers(year, month, dayOfMonth, hour, minute, second, nanoOfSecond) {
    if (hour === void 0) {
      hour = 0;
    }
    if (minute === void 0) {
      minute = 0;
    }
    if (second === void 0) {
      second = 0;
    }
    if (nanoOfSecond === void 0) {
      nanoOfSecond = 0;
    }
    var date = LocalDate.of(year, month, dayOfMonth);
    var time = LocalTime.of(hour, minute, second, nanoOfSecond);
    return new LocalDateTime(date, time);
  };
  LocalDateTime.ofDateAndTime = function ofDateAndTime(date, time) {
    requireNonNull(date, 'date');
    requireNonNull(time, 'time');
    return new LocalDateTime(date, time);
  };
  LocalDateTime.ofInstant = function ofInstant(instant, zone) {
    if (zone === void 0) {
      zone = ZoneId.systemDefault();
    }
    requireNonNull(instant, 'instant');
    requireInstance(instant, Instant, 'instant');
    requireNonNull(zone, 'zone');
    var offset = zone.rules().offset(instant);
    return LocalDateTime.ofEpochSecond(instant.epochSecond(), instant.nano(), offset);
  };
  LocalDateTime.ofEpochSecond = function ofEpochSecond(epochSecond, nanoOfSecond, offset) {
    if (epochSecond === void 0) {
      epochSecond = 0;
    }
    if (nanoOfSecond === void 0) {
      nanoOfSecond = 0;
    }
    if (arguments.length === 2 && nanoOfSecond instanceof ZoneOffset) {
      offset = nanoOfSecond;
      nanoOfSecond = 0;
    }
    requireNonNull(offset, 'offset');
    var localSecond = epochSecond + offset.totalSeconds();
    var localEpochDay = MathUtil.floorDiv(localSecond, LocalTime.SECONDS_PER_DAY);
    var secsOfDay = MathUtil.floorMod(localSecond, LocalTime.SECONDS_PER_DAY);
    var date = LocalDate.ofEpochDay(localEpochDay);
    var time = LocalTime.ofSecondOfDay(secsOfDay, nanoOfSecond);
    return new LocalDateTime(date, time);
  };
  LocalDateTime.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    if (temporal instanceof LocalDateTime) {
      return temporal;
    } else if (temporal instanceof ZonedDateTime) {
      return temporal.toLocalDateTime();
    }
    try {
      var date = LocalDate.from(temporal);
      var time = LocalTime.from(temporal);
      return new LocalDateTime(date, time);
    } catch (ex) {
      throw new DateTimeException("Unable to obtain LocalDateTime TemporalAccessor: " + temporal + ", type " + (temporal.constructor != null ? temporal.constructor.name : ''));
    }
  };
  LocalDateTime.parse = function parse(text, formatter) {
    if (formatter === void 0) {
      formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    }
    requireNonNull(formatter, 'formatter');
    return formatter.parse(text, LocalDateTime.FROM);
  };
  function LocalDateTime(date, time) {
    var _this;
    _this = _ChronoLocalDateTime.call(this) || this;
    requireInstance(date, LocalDate, 'date');
    requireInstance(time, LocalTime, 'time');
    _this._date = date;
    _this._time = time;
    return _this;
  }
  var _proto = LocalDateTime.prototype;
  _proto._withDateTime = function _withDateTime(newDate, newTime) {
    if (this._date.equals(newDate) && this._time.equals(newTime)) {
      return this;
    }
    return new LocalDateTime(newDate, newTime);
  };
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (fieldOrUnit instanceof ChronoField) {
      return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
    } else if (fieldOrUnit instanceof ChronoUnit) {
      return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
    }
    return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    if (field instanceof ChronoField) {
      return field.isTimeBased() ? this._time.range(field) : this._date.range(field);
    }
    return field.rangeRefinedBy(this);
  };
  _proto.get = function get(field) {
    if (field instanceof ChronoField) {
      return field.isTimeBased() ? this._time.get(field) : this._date.get(field);
    }
    return _ChronoLocalDateTime.prototype.get.call(this, field);
  };
  _proto.getLong = function getLong(field) {
    requireNonNull(field, 'field');
    if (field instanceof ChronoField) {
      return field.isTimeBased() ? this._time.getLong(field) : this._date.getLong(field);
    }
    return field.getFrom(this);
  };
  _proto.year = function year() {
    return this._date.year();
  };
  _proto.monthValue = function monthValue() {
    return this._date.monthValue();
  };
  _proto.month = function month() {
    return this._date.month();
  };
  _proto.dayOfMonth = function dayOfMonth() {
    return this._date.dayOfMonth();
  };
  _proto.dayOfYear = function dayOfYear() {
    return this._date.dayOfYear();
  };
  _proto.dayOfWeek = function dayOfWeek() {
    return this._date.dayOfWeek();
  };
  _proto.hour = function hour() {
    return this._time.hour();
  };
  _proto.minute = function minute() {
    return this._time.minute();
  };
  _proto.second = function second() {
    return this._time.second();
  };
  _proto.nano = function nano() {
    return this._time.nano();
  };
  _proto._withAdjuster = function _withAdjuster(adjuster) {
    requireNonNull(adjuster, 'adjuster');
    if (adjuster instanceof LocalDate) {
      return this._withDateTime(adjuster, this._time);
    } else if (adjuster instanceof LocalTime) {
      return this._withDateTime(this._date, adjuster);
    } else if (adjuster instanceof LocalDateTime) {
      return adjuster;
    }
    return _ChronoLocalDateTime.prototype._withAdjuster.call(this, adjuster);
  };
  _proto._withField = function _withField(field, newValue) {
    requireNonNull(field, 'field');
    if (field instanceof ChronoField) {
      if (field.isTimeBased()) {
        return this._withDateTime(this._date, this._time.with(field, newValue));
      } else {
        return this._withDateTime(this._date.with(field, newValue), this._time);
      }
    }
    return field.adjustInto(this, newValue);
  };
  _proto.withYear = function withYear(year) {
    return this._withDateTime(this._date.withYear(year), this._time);
  };
  _proto.withMonth = function withMonth(month) {
    return this._withDateTime(this._date.withMonth(month), this._time);
  };
  _proto.withDayOfMonth = function withDayOfMonth(dayOfMonth) {
    return this._withDateTime(this._date.withDayOfMonth(dayOfMonth), this._time);
  };
  _proto.withDayOfYear = function withDayOfYear(dayOfYear) {
    return this._withDateTime(this._date.withDayOfYear(dayOfYear), this._time);
  };
  _proto.withHour = function withHour(hour) {
    var newTime = this._time.withHour(hour);
    return this._withDateTime(this._date, newTime);
  };
  _proto.withMinute = function withMinute(minute) {
    var newTime = this._time.withMinute(minute);
    return this._withDateTime(this._date, newTime);
  };
  _proto.withSecond = function withSecond(second) {
    var newTime = this._time.withSecond(second);
    return this._withDateTime(this._date, newTime);
  };
  _proto.withNano = function withNano(nanoOfSecond) {
    var newTime = this._time.withNano(nanoOfSecond);
    return this._withDateTime(this._date, newTime);
  };
  _proto.truncatedTo = function truncatedTo(unit) {
    return this._withDateTime(this._date, this._time.truncatedTo(unit));
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    requireNonNull(unit, 'unit');
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.NANOS:
          return this.plusNanos(amountToAdd);
        case ChronoUnit.MICROS:
          return this.plusDays(MathUtil.intDiv(amountToAdd, LocalTime.MICROS_PER_DAY)).plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MICROS_PER_DAY) * 1000);
        case ChronoUnit.MILLIS:
          return this.plusDays(MathUtil.intDiv(amountToAdd, LocalTime.MILLIS_PER_DAY)).plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MILLIS_PER_DAY) * 1000000);
        case ChronoUnit.SECONDS:
          return this.plusSeconds(amountToAdd);
        case ChronoUnit.MINUTES:
          return this.plusMinutes(amountToAdd);
        case ChronoUnit.HOURS:
          return this.plusHours(amountToAdd);
        case ChronoUnit.HALF_DAYS:
          return this.plusDays(MathUtil.intDiv(amountToAdd, 256)).plusHours(MathUtil.intMod(amountToAdd, 256) * 12);
      }
      return this._withDateTime(this._date.plus(amountToAdd, unit), this._time);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusYears = function plusYears(years) {
    var newDate = this._date.plusYears(years);
    return this._withDateTime(newDate, this._time);
  };
  _proto.plusMonths = function plusMonths(months) {
    var newDate = this._date.plusMonths(months);
    return this._withDateTime(newDate, this._time);
  };
  _proto.plusWeeks = function plusWeeks(weeks) {
    var newDate = this._date.plusWeeks(weeks);
    return this._withDateTime(newDate, this._time);
  };
  _proto.plusDays = function plusDays(days) {
    var newDate = this._date.plusDays(days);
    return this._withDateTime(newDate, this._time);
  };
  _proto.plusHours = function plusHours(hours) {
    return this._plusWithOverflow(this._date, hours, 0, 0, 0, 1);
  };
  _proto.plusMinutes = function plusMinutes(minutes) {
    return this._plusWithOverflow(this._date, 0, minutes, 0, 0, 1);
  };
  _proto.plusSeconds = function plusSeconds(seconds) {
    return this._plusWithOverflow(this._date, 0, 0, seconds, 0, 1);
  };
  _proto.plusNanos = function plusNanos(nanos) {
    return this._plusWithOverflow(this._date, 0, 0, 0, nanos, 1);
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    requireNonNull(unit, 'unit');
    return this._plusUnit(-1 * amountToSubtract, unit);
  };
  _proto.minusYears = function minusYears(years) {
    return this.plusYears(-1 * years);
  };
  _proto.minusMonths = function minusMonths(months) {
    return this.plusMonths(-1 * months);
  };
  _proto.minusWeeks = function minusWeeks(weeks) {
    return this.plusWeeks(-1 * weeks);
  };
  _proto.minusDays = function minusDays(days) {
    return this.plusDays(-1 * days);
  };
  _proto.minusHours = function minusHours(hours) {
    return this._plusWithOverflow(this._date, hours, 0, 0, 0, -1);
  };
  _proto.minusMinutes = function minusMinutes(minutes) {
    return this._plusWithOverflow(this._date, 0, minutes, 0, 0, -1);
  };
  _proto.minusSeconds = function minusSeconds(seconds) {
    return this._plusWithOverflow(this._date, 0, 0, seconds, 0, -1);
  };
  _proto.minusNanos = function minusNanos(nanos) {
    return this._plusWithOverflow(this._date, 0, 0, 0, nanos, -1);
  };
  _proto._plusWithOverflow = function _plusWithOverflow(newDate, hours, minutes, seconds, nanos, sign) {
    if (hours === 0 && minutes === 0 && seconds === 0 && nanos === 0) {
      return this._withDateTime(newDate, this._time);
    }
    var totDays = MathUtil.intDiv(nanos, LocalTime.NANOS_PER_DAY) + MathUtil.intDiv(seconds, LocalTime.SECONDS_PER_DAY) + MathUtil.intDiv(minutes, LocalTime.MINUTES_PER_DAY) + MathUtil.intDiv(hours, LocalTime.HOURS_PER_DAY);
    totDays *= sign;
    var totNanos = MathUtil.intMod(nanos, LocalTime.NANOS_PER_DAY) + MathUtil.intMod(seconds, LocalTime.SECONDS_PER_DAY) * LocalTime.NANOS_PER_SECOND + MathUtil.intMod(minutes, LocalTime.MINUTES_PER_DAY) * LocalTime.NANOS_PER_MINUTE + MathUtil.intMod(hours, LocalTime.HOURS_PER_DAY) * LocalTime.NANOS_PER_HOUR;
    var curNoD = this._time.toNanoOfDay();
    totNanos = totNanos * sign + curNoD;
    totDays += MathUtil.floorDiv(totNanos, LocalTime.NANOS_PER_DAY);
    var newNoD = MathUtil.floorMod(totNanos, LocalTime.NANOS_PER_DAY);
    var newTime = newNoD === curNoD ? this._time : LocalTime.ofNanoOfDay(newNoD);
    return this._withDateTime(newDate.plusDays(totDays), newTime);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    if (_query === TemporalQueries.localDate()) {
      return this.toLocalDate();
    }
    return _ChronoLocalDateTime.prototype.query.call(this, _query);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    return _ChronoLocalDateTime.prototype.adjustInto.call(this, temporal);
  };
  _proto.until = function until(endExclusive, unit) {
    requireNonNull(endExclusive, 'endExclusive');
    requireNonNull(unit, 'unit');
    var end = LocalDateTime.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      if (unit.isTimeBased()) {
        var daysUntil = this._date.daysUntil(end._date);
        var timeUntil = end._time.toNanoOfDay() - this._time.toNanoOfDay();
        if (daysUntil > 0 && timeUntil < 0) {
          daysUntil--;
          timeUntil += LocalTime.NANOS_PER_DAY;
        } else if (daysUntil < 0 && timeUntil > 0) {
          daysUntil++;
          timeUntil -= LocalTime.NANOS_PER_DAY;
        }
        var amount = daysUntil;
        switch (unit) {
          case ChronoUnit.NANOS:
            amount = MathUtil.safeMultiply(amount, LocalTime.NANOS_PER_DAY);
            return MathUtil.safeAdd(amount, timeUntil);
          case ChronoUnit.MICROS:
            amount = MathUtil.safeMultiply(amount, LocalTime.MICROS_PER_DAY);
            return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, 1000));
          case ChronoUnit.MILLIS:
            amount = MathUtil.safeMultiply(amount, LocalTime.MILLIS_PER_DAY);
            return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, 1000000));
          case ChronoUnit.SECONDS:
            amount = MathUtil.safeMultiply(amount, LocalTime.SECONDS_PER_DAY);
            return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, LocalTime.NANOS_PER_SECOND));
          case ChronoUnit.MINUTES:
            amount = MathUtil.safeMultiply(amount, LocalTime.MINUTES_PER_DAY);
            return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, LocalTime.NANOS_PER_MINUTE));
          case ChronoUnit.HOURS:
            amount = MathUtil.safeMultiply(amount, LocalTime.HOURS_PER_DAY);
            return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, LocalTime.NANOS_PER_HOUR));
          case ChronoUnit.HALF_DAYS:
            amount = MathUtil.safeMultiply(amount, 2);
            return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, LocalTime.NANOS_PER_HOUR * 12));
        }
        throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
      }
      var endDate = end._date;
      var endTime = end._time;
      if (endDate.isAfter(this._date) && endTime.isBefore(this._time)) {
        endDate = endDate.minusDays(1);
      } else if (endDate.isBefore(this._date) && endTime.isAfter(this._time)) {
        endDate = endDate.plusDays(1);
      }
      return this._date.until(endDate, unit);
    }
    return unit.between(this, end);
  };
  _proto.atOffset = function atOffset(offset) {
    return OffsetDateTime.of(this, offset);
  };
  _proto.atZone = function atZone(zone) {
    return ZonedDateTime.of(this, zone);
  };
  _proto.toLocalDate = function toLocalDate() {
    return this._date;
  };
  _proto.toLocalTime = function toLocalTime() {
    return this._time;
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, LocalDateTime, 'other');
    return this._compareTo0(other);
  };
  _proto._compareTo0 = function _compareTo0(other) {
    var cmp = this._date.compareTo(other.toLocalDate());
    if (cmp === 0) {
      cmp = this._time.compareTo(other.toLocalTime());
    }
    return cmp;
  };
  _proto.isAfter = function isAfter(other) {
    return this.compareTo(other) > 0;
  };
  _proto.isBefore = function isBefore(other) {
    return this.compareTo(other) < 0;
  };
  _proto.isEqual = function isEqual(other) {
    return this.compareTo(other) === 0;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof LocalDateTime) {
      return this._date.equals(other._date) && this._time.equals(other._time);
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return this._date.hashCode() ^ this._time.hashCode();
  };
  _proto.toString = function toString() {
    return this._date.toString() + "T" + this._time.toString();
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    return formatter.format(this);
  };
  return LocalDateTime;
}(ChronoLocalDateTime);
function _init$4() {
  LocalDateTime.MIN = LocalDateTime.of(LocalDate.MIN, LocalTime.MIN);
  LocalDateTime.MAX = LocalDateTime.of(LocalDate.MAX, LocalTime.MAX);
  LocalDateTime.FROM = createTemporalQuery('LocalDateTime.FROM', function (temporal) {
    return LocalDateTime.from(temporal);
  });
}

var LocalTime = function (_Temporal) {
  _inheritsLoose(LocalTime, _Temporal);
  LocalTime.now = function now(clockOrZone) {
    if (clockOrZone == null) {
      return LocalTime._now(Clock.systemDefaultZone());
    } else if (clockOrZone instanceof Clock) {
      return LocalTime._now(clockOrZone);
    } else {
      return LocalTime._now(Clock.system(clockOrZone));
    }
  };
  LocalTime._now = function _now(clock) {
    if (clock === void 0) {
      clock = Clock.systemDefaultZone();
    }
    requireNonNull(clock, 'clock');
    return LocalTime.ofInstant(clock.instant(), clock.zone());
  };
  LocalTime.ofInstant = function ofInstant(instant, zone) {
    if (zone === void 0) {
      zone = ZoneId.systemDefault();
    }
    var offset = zone.rules().offset(instant);
    var secsOfDay = MathUtil.intMod(instant.epochSecond(), LocalTime.SECONDS_PER_DAY);
    secsOfDay = MathUtil.intMod(secsOfDay + offset.totalSeconds(), LocalTime.SECONDS_PER_DAY);
    if (secsOfDay < 0) {
      secsOfDay += LocalTime.SECONDS_PER_DAY;
    }
    return LocalTime.ofSecondOfDay(secsOfDay, instant.nano());
  };
  LocalTime.of = function of(hour, minute, second, nanoOfSecond) {
    return new LocalTime(hour, minute, second, nanoOfSecond);
  };
  LocalTime.ofSecondOfDay = function ofSecondOfDay(secondOfDay, nanoOfSecond) {
    if (secondOfDay === void 0) {
      secondOfDay = 0;
    }
    if (nanoOfSecond === void 0) {
      nanoOfSecond = 0;
    }
    ChronoField.SECOND_OF_DAY.checkValidValue(secondOfDay);
    ChronoField.NANO_OF_SECOND.checkValidValue(nanoOfSecond);
    var hours = MathUtil.intDiv(secondOfDay, LocalTime.SECONDS_PER_HOUR);
    secondOfDay -= hours * LocalTime.SECONDS_PER_HOUR;
    var minutes = MathUtil.intDiv(secondOfDay, LocalTime.SECONDS_PER_MINUTE);
    secondOfDay -= minutes * LocalTime.SECONDS_PER_MINUTE;
    return new LocalTime(hours, minutes, secondOfDay, nanoOfSecond);
  };
  LocalTime.ofNanoOfDay = function ofNanoOfDay(nanoOfDay) {
    if (nanoOfDay === void 0) {
      nanoOfDay = 0;
    }
    ChronoField.NANO_OF_DAY.checkValidValue(nanoOfDay);
    var hours = MathUtil.intDiv(nanoOfDay, LocalTime.NANOS_PER_HOUR);
    nanoOfDay -= hours * LocalTime.NANOS_PER_HOUR;
    var minutes = MathUtil.intDiv(nanoOfDay, LocalTime.NANOS_PER_MINUTE);
    nanoOfDay -= minutes * LocalTime.NANOS_PER_MINUTE;
    var seconds = MathUtil.intDiv(nanoOfDay, LocalTime.NANOS_PER_SECOND);
    nanoOfDay -= seconds * LocalTime.NANOS_PER_SECOND;
    return new LocalTime(hours, minutes, seconds, nanoOfDay);
  };
  LocalTime.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    var time = temporal.query(TemporalQueries.localTime());
    if (time == null) {
      throw new DateTimeException("Unable to obtain LocalTime TemporalAccessor: " + temporal + ", type " + (temporal.constructor != null ? temporal.constructor.name : ''));
    }
    return time;
  };
  LocalTime.parse = function parse(text, formatter) {
    if (formatter === void 0) {
      formatter = DateTimeFormatter.ISO_LOCAL_TIME;
    }
    requireNonNull(formatter, 'formatter');
    return formatter.parse(text, LocalTime.FROM);
  };
  function LocalTime(hour, minute, second, nanoOfSecond) {
    var _this;
    if (hour === void 0) {
      hour = 0;
    }
    if (minute === void 0) {
      minute = 0;
    }
    if (second === void 0) {
      second = 0;
    }
    if (nanoOfSecond === void 0) {
      nanoOfSecond = 0;
    }
    _this = _Temporal.call(this) || this;
    var _hour = MathUtil.safeToInt(hour);
    var _minute = MathUtil.safeToInt(minute);
    var _second = MathUtil.safeToInt(second);
    var _nanoOfSecond = MathUtil.safeToInt(nanoOfSecond);
    LocalTime._validate(_hour, _minute, _second, _nanoOfSecond);
    if (_minute === 0 && _second === 0 && _nanoOfSecond === 0) {
      if (!LocalTime.HOURS[_hour]) {
        _this._hour = _hour;
        _this._minute = _minute;
        _this._second = _second;
        _this._nano = _nanoOfSecond;
        LocalTime.HOURS[_hour] = _assertThisInitialized(_this);
      }
      return LocalTime.HOURS[_hour] || _assertThisInitialized(_this);
    }
    _this._hour = _hour;
    _this._minute = _minute;
    _this._second = _second;
    _this._nano = _nanoOfSecond;
    return _this;
  }
  LocalTime._validate = function _validate(hour, minute, second, nanoOfSecond) {
    ChronoField.HOUR_OF_DAY.checkValidValue(hour);
    ChronoField.MINUTE_OF_HOUR.checkValidValue(minute);
    ChronoField.SECOND_OF_MINUTE.checkValidValue(second);
    ChronoField.NANO_OF_SECOND.checkValidValue(nanoOfSecond);
  };
  var _proto = LocalTime.prototype;
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (fieldOrUnit instanceof ChronoField) {
      return fieldOrUnit.isTimeBased();
    } else if (fieldOrUnit instanceof ChronoUnit) {
      return fieldOrUnit.isTimeBased();
    }
    return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    requireNonNull(field);
    return _Temporal.prototype.range.call(this, field);
  };
  _proto.get = function get(field) {
    return this.getLong(field);
  };
  _proto.getLong = function getLong(field) {
    requireNonNull(field, 'field');
    if (field instanceof ChronoField) {
      return this._get0(field);
    }
    return field.getFrom(this);
  };
  _proto._get0 = function _get0(field) {
    switch (field) {
      case ChronoField.NANO_OF_SECOND:
        return this._nano;
      case ChronoField.NANO_OF_DAY:
        return this.toNanoOfDay();
      case ChronoField.MICRO_OF_SECOND:
        return MathUtil.intDiv(this._nano, 1000);
      case ChronoField.MICRO_OF_DAY:
        return MathUtil.intDiv(this.toNanoOfDay(), 1000);
      case ChronoField.MILLI_OF_SECOND:
        return MathUtil.intDiv(this._nano, 1000000);
      case ChronoField.MILLI_OF_DAY:
        return MathUtil.intDiv(this.toNanoOfDay(), 1000000);
      case ChronoField.SECOND_OF_MINUTE:
        return this._second;
      case ChronoField.SECOND_OF_DAY:
        return this.toSecondOfDay();
      case ChronoField.MINUTE_OF_HOUR:
        return this._minute;
      case ChronoField.MINUTE_OF_DAY:
        return this._hour * 60 + this._minute;
      case ChronoField.HOUR_OF_AMPM:
        return MathUtil.intMod(this._hour, 12);
      case ChronoField.CLOCK_HOUR_OF_AMPM:
        {
          var ham = MathUtil.intMod(this._hour, 12);
          return ham % 12 === 0 ? 12 : ham;
        }
      case ChronoField.HOUR_OF_DAY:
        return this._hour;
      case ChronoField.CLOCK_HOUR_OF_DAY:
        return this._hour === 0 ? 24 : this._hour;
      case ChronoField.AMPM_OF_DAY:
        return MathUtil.intDiv(this._hour, 12);
    }
    throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
  };
  _proto.hour = function hour() {
    return this._hour;
  };
  _proto.minute = function minute() {
    return this._minute;
  };
  _proto.second = function second() {
    return this._second;
  };
  _proto.nano = function nano() {
    return this._nano;
  };
  _proto._withAdjuster = function _withAdjuster(adjuster) {
    requireNonNull(adjuster, 'adjuster');
    if (adjuster instanceof LocalTime) {
      return adjuster;
    }
    return _Temporal.prototype._withAdjuster.call(this, adjuster);
  };
  _proto._withField = function _withField(field, newValue) {
    requireNonNull(field, 'field');
    requireInstance(field, TemporalField, 'field');
    if (field instanceof ChronoField) {
      field.checkValidValue(newValue);
      switch (field) {
        case ChronoField.NANO_OF_SECOND:
          return this.withNano(newValue);
        case ChronoField.NANO_OF_DAY:
          return LocalTime.ofNanoOfDay(newValue);
        case ChronoField.MICRO_OF_SECOND:
          return this.withNano(newValue * 1000);
        case ChronoField.MICRO_OF_DAY:
          return LocalTime.ofNanoOfDay(newValue * 1000);
        case ChronoField.MILLI_OF_SECOND:
          return this.withNano(newValue * 1000000);
        case ChronoField.MILLI_OF_DAY:
          return LocalTime.ofNanoOfDay(newValue * 1000000);
        case ChronoField.SECOND_OF_MINUTE:
          return this.withSecond(newValue);
        case ChronoField.SECOND_OF_DAY:
          return this.plusSeconds(newValue - this.toSecondOfDay());
        case ChronoField.MINUTE_OF_HOUR:
          return this.withMinute(newValue);
        case ChronoField.MINUTE_OF_DAY:
          return this.plusMinutes(newValue - (this._hour * 60 + this._minute));
        case ChronoField.HOUR_OF_AMPM:
          return this.plusHours(newValue - MathUtil.intMod(this._hour, 12));
        case ChronoField.CLOCK_HOUR_OF_AMPM:
          return this.plusHours((newValue === 12 ? 0 : newValue) - MathUtil.intMod(this._hour, 12));
        case ChronoField.HOUR_OF_DAY:
          return this.withHour(newValue);
        case ChronoField.CLOCK_HOUR_OF_DAY:
          return this.withHour(newValue === 24 ? 0 : newValue);
        case ChronoField.AMPM_OF_DAY:
          return this.plusHours((newValue - MathUtil.intDiv(this._hour, 12)) * 12);
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.adjustInto(this, newValue);
  };
  _proto.withHour = function withHour(hour) {
    if (hour === void 0) {
      hour = 0;
    }
    if (this._hour === hour) {
      return this;
    }
    return new LocalTime(hour, this._minute, this._second, this._nano);
  };
  _proto.withMinute = function withMinute(minute) {
    if (minute === void 0) {
      minute = 0;
    }
    if (this._minute === minute) {
      return this;
    }
    return new LocalTime(this._hour, minute, this._second, this._nano);
  };
  _proto.withSecond = function withSecond(second) {
    if (second === void 0) {
      second = 0;
    }
    if (this._second === second) {
      return this;
    }
    return new LocalTime(this._hour, this._minute, second, this._nano);
  };
  _proto.withNano = function withNano(nanoOfSecond) {
    if (nanoOfSecond === void 0) {
      nanoOfSecond = 0;
    }
    if (this._nano === nanoOfSecond) {
      return this;
    }
    return new LocalTime(this._hour, this._minute, this._second, nanoOfSecond);
  };
  _proto.truncatedTo = function truncatedTo(unit) {
    requireNonNull(unit, 'unit');
    if (unit === ChronoUnit.NANOS) {
      return this;
    }
    var unitDur = unit.duration();
    if (unitDur.seconds() > LocalTime.SECONDS_PER_DAY) {
      throw new DateTimeException('Unit is too large to be used for truncation');
    }
    var dur = unitDur.toNanos();
    if (MathUtil.intMod(LocalTime.NANOS_PER_DAY, dur) !== 0) {
      throw new DateTimeException('Unit must divide into a standard day without remainder');
    }
    var nod = this.toNanoOfDay();
    return LocalTime.ofNanoOfDay(MathUtil.intDiv(nod, dur) * dur);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    requireNonNull(unit, 'unit');
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.NANOS:
          return this.plusNanos(amountToAdd);
        case ChronoUnit.MICROS:
          return this.plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MICROS_PER_DAY) * 1000);
        case ChronoUnit.MILLIS:
          return this.plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MILLIS_PER_DAY) * 1000000);
        case ChronoUnit.SECONDS:
          return this.plusSeconds(amountToAdd);
        case ChronoUnit.MINUTES:
          return this.plusMinutes(amountToAdd);
        case ChronoUnit.HOURS:
          return this.plusHours(amountToAdd);
        case ChronoUnit.HALF_DAYS:
          return this.plusHours(MathUtil.intMod(amountToAdd, 2) * 12);
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusHours = function plusHours(hoursToAdd) {
    if (hoursToAdd === 0) {
      return this;
    }
    var newHour = MathUtil.intMod(MathUtil.intMod(hoursToAdd, LocalTime.HOURS_PER_DAY) + this._hour + LocalTime.HOURS_PER_DAY, LocalTime.HOURS_PER_DAY);
    return new LocalTime(newHour, this._minute, this._second, this._nano);
  };
  _proto.plusMinutes = function plusMinutes(minutesToAdd) {
    if (minutesToAdd === 0) {
      return this;
    }
    var mofd = this._hour * LocalTime.MINUTES_PER_HOUR + this._minute;
    var newMofd = MathUtil.intMod(MathUtil.intMod(minutesToAdd, LocalTime.MINUTES_PER_DAY) + mofd + LocalTime.MINUTES_PER_DAY, LocalTime.MINUTES_PER_DAY);
    if (mofd === newMofd) {
      return this;
    }
    var newHour = MathUtil.intDiv(newMofd, LocalTime.MINUTES_PER_HOUR);
    var newMinute = MathUtil.intMod(newMofd, LocalTime.MINUTES_PER_HOUR);
    return new LocalTime(newHour, newMinute, this._second, this._nano);
  };
  _proto.plusSeconds = function plusSeconds(secondsToAdd) {
    if (secondsToAdd === 0) {
      return this;
    }
    var sofd = this._hour * LocalTime.SECONDS_PER_HOUR + this._minute * LocalTime.SECONDS_PER_MINUTE + this._second;
    var newSofd = MathUtil.intMod(MathUtil.intMod(secondsToAdd, LocalTime.SECONDS_PER_DAY) + sofd + LocalTime.SECONDS_PER_DAY, LocalTime.SECONDS_PER_DAY);
    if (sofd === newSofd) {
      return this;
    }
    var newHour = MathUtil.intDiv(newSofd, LocalTime.SECONDS_PER_HOUR);
    var newMinute = MathUtil.intMod(MathUtil.intDiv(newSofd, LocalTime.SECONDS_PER_MINUTE), LocalTime.MINUTES_PER_HOUR);
    var newSecond = MathUtil.intMod(newSofd, LocalTime.SECONDS_PER_MINUTE);
    return new LocalTime(newHour, newMinute, newSecond, this._nano);
  };
  _proto.plusNanos = function plusNanos(nanosToAdd) {
    if (nanosToAdd === 0) {
      return this;
    }
    var nofd = this.toNanoOfDay();
    var newNofd = MathUtil.intMod(MathUtil.intMod(nanosToAdd, LocalTime.NANOS_PER_DAY) + nofd + LocalTime.NANOS_PER_DAY, LocalTime.NANOS_PER_DAY);
    if (nofd === newNofd) {
      return this;
    }
    var newHour = MathUtil.intDiv(newNofd, LocalTime.NANOS_PER_HOUR);
    var newMinute = MathUtil.intMod(MathUtil.intDiv(newNofd, LocalTime.NANOS_PER_MINUTE), LocalTime.MINUTES_PER_HOUR);
    var newSecond = MathUtil.intMod(MathUtil.intDiv(newNofd, LocalTime.NANOS_PER_SECOND), LocalTime.SECONDS_PER_MINUTE);
    var newNano = MathUtil.intMod(newNofd, LocalTime.NANOS_PER_SECOND);
    return new LocalTime(newHour, newMinute, newSecond, newNano);
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    requireNonNull(unit, 'unit');
    return this._plusUnit(-1 * amountToSubtract, unit);
  };
  _proto.minusHours = function minusHours(hoursToSubtract) {
    return this.plusHours(-1 * MathUtil.intMod(hoursToSubtract, LocalTime.HOURS_PER_DAY));
  };
  _proto.minusMinutes = function minusMinutes(minutesToSubtract) {
    return this.plusMinutes(-1 * MathUtil.intMod(minutesToSubtract, LocalTime.MINUTES_PER_DAY));
  };
  _proto.minusSeconds = function minusSeconds(secondsToSubtract) {
    return this.plusSeconds(-1 * MathUtil.intMod(secondsToSubtract, LocalTime.SECONDS_PER_DAY));
  };
  _proto.minusNanos = function minusNanos(nanosToSubtract) {
    return this.plusNanos(-1 * MathUtil.intMod(nanosToSubtract, LocalTime.NANOS_PER_DAY));
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    if (_query === TemporalQueries.precision()) {
      return ChronoUnit.NANOS;
    } else if (_query === TemporalQueries.localTime()) {
      return this;
    }
    if (_query === TemporalQueries.chronology() || _query === TemporalQueries.zoneId() || _query === TemporalQueries.zone() || _query === TemporalQueries.offset() || _query === TemporalQueries.localDate()) {
      return null;
    }
    return _query.queryFrom(this);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    return temporal.with(LocalTime.NANO_OF_DAY, this.toNanoOfDay());
  };
  _proto.until = function until(endExclusive, unit) {
    requireNonNull(endExclusive, 'endExclusive');
    requireNonNull(unit, 'unit');
    var end = LocalTime.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      var nanosUntil = end.toNanoOfDay() - this.toNanoOfDay();
      switch (unit) {
        case ChronoUnit.NANOS:
          return nanosUntil;
        case ChronoUnit.MICROS:
          return MathUtil.intDiv(nanosUntil, 1000);
        case ChronoUnit.MILLIS:
          return MathUtil.intDiv(nanosUntil, 1000000);
        case ChronoUnit.SECONDS:
          return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_SECOND);
        case ChronoUnit.MINUTES:
          return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_MINUTE);
        case ChronoUnit.HOURS:
          return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_HOUR);
        case ChronoUnit.HALF_DAYS:
          return MathUtil.intDiv(nanosUntil, 12 * LocalTime.NANOS_PER_HOUR);
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.between(this, end);
  };
  _proto.atDate = function atDate(date) {
    return LocalDateTime.of(date, this);
  };
  _proto.atOffset = function atOffset(offset) {
    return OffsetTime.of(this, offset);
  };
  _proto.toSecondOfDay = function toSecondOfDay() {
    var total = this._hour * LocalTime.SECONDS_PER_HOUR;
    total += this._minute * LocalTime.SECONDS_PER_MINUTE;
    total += this._second;
    return total;
  };
  _proto.toNanoOfDay = function toNanoOfDay() {
    var total = this._hour * LocalTime.NANOS_PER_HOUR;
    total += this._minute * LocalTime.NANOS_PER_MINUTE;
    total += this._second * LocalTime.NANOS_PER_SECOND;
    total += this._nano;
    return total;
  };
  _proto.compareTo = function compareTo(other) {
    requireNonNull(other, 'other');
    requireInstance(other, LocalTime, 'other');
    var cmp = MathUtil.compareNumbers(this._hour, other._hour);
    if (cmp === 0) {
      cmp = MathUtil.compareNumbers(this._minute, other._minute);
      if (cmp === 0) {
        cmp = MathUtil.compareNumbers(this._second, other._second);
        if (cmp === 0) {
          cmp = MathUtil.compareNumbers(this._nano, other._nano);
        }
      }
    }
    return cmp;
  };
  _proto.isAfter = function isAfter(other) {
    return this.compareTo(other) > 0;
  };
  _proto.isBefore = function isBefore(other) {
    return this.compareTo(other) < 0;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof LocalTime) {
      return this._hour === other._hour && this._minute === other._minute && this._second === other._second && this._nano === other._nano;
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    var nod = this.toNanoOfDay();
    return MathUtil.hash(nod);
  };
  _proto.toString = function toString() {
    var buf = '';
    var hourValue = this._hour;
    var minuteValue = this._minute;
    var secondValue = this._second;
    var nanoValue = this._nano;
    buf += hourValue < 10 ? '0' : '';
    buf += hourValue;
    buf += minuteValue < 10 ? ':0' : ':';
    buf += minuteValue;
    if (secondValue > 0 || nanoValue > 0) {
      buf += secondValue < 10 ? ':0' : ':';
      buf += secondValue;
      if (nanoValue > 0) {
        buf += '.';
        if (MathUtil.intMod(nanoValue, 1000000) === 0) {
          buf += ("" + (MathUtil.intDiv(nanoValue, 1000000) + 1000)).substring(1);
        } else if (MathUtil.intMod(nanoValue, 1000) === 0) {
          buf += ("" + (MathUtil.intDiv(nanoValue, 1000) + 1000000)).substring(1);
        } else {
          buf += ("" + (nanoValue + 1000000000)).substring(1);
        }
      }
    }
    return buf;
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  _proto.format = function format(formatter) {
    requireNonNull(formatter, 'formatter');
    return formatter.format(this);
  };
  return LocalTime;
}(Temporal);
function _init$3() {
  LocalTime.HOURS = [];
  for (var hour = 0; hour < 24; hour++) {
    LocalTime.of(hour, 0, 0, 0);
  }
  LocalTime.MIN = LocalTime.HOURS[0];
  LocalTime.MAX = new LocalTime(23, 59, 59, 999999999);
  LocalTime.MIDNIGHT = LocalTime.HOURS[0];
  LocalTime.NOON = LocalTime.HOURS[12];
  LocalTime.FROM = createTemporalQuery('LocalTime.FROM', function (temporal) {
    return LocalTime.from(temporal);
  });
}
LocalTime.HOURS_PER_DAY = 24;
LocalTime.MINUTES_PER_HOUR = 60;
LocalTime.MINUTES_PER_DAY = LocalTime.MINUTES_PER_HOUR * LocalTime.HOURS_PER_DAY;
LocalTime.SECONDS_PER_MINUTE = 60;
LocalTime.SECONDS_PER_HOUR = LocalTime.SECONDS_PER_MINUTE * LocalTime.MINUTES_PER_HOUR;
LocalTime.SECONDS_PER_DAY = LocalTime.SECONDS_PER_HOUR * LocalTime.HOURS_PER_DAY;
LocalTime.MILLIS_PER_DAY = LocalTime.SECONDS_PER_DAY * 1000;
LocalTime.MICROS_PER_DAY = LocalTime.SECONDS_PER_DAY * 1000000;
LocalTime.NANOS_PER_SECOND = 1000000000;
LocalTime.NANOS_PER_MINUTE = LocalTime.NANOS_PER_SECOND * LocalTime.SECONDS_PER_MINUTE;
LocalTime.NANOS_PER_HOUR = LocalTime.NANOS_PER_MINUTE * LocalTime.MINUTES_PER_HOUR;
LocalTime.NANOS_PER_DAY = LocalTime.NANOS_PER_HOUR * LocalTime.HOURS_PER_DAY;

var NANOS_PER_MILLI = 1000000;
var Instant = function (_Temporal) {
  _inheritsLoose(Instant, _Temporal);
  Instant.now = function now(clock) {
    if (clock === void 0) {
      clock = Clock.systemUTC();
    }
    return clock.instant();
  };
  Instant.ofEpochSecond = function ofEpochSecond(epochSecond, nanoAdjustment) {
    if (nanoAdjustment === void 0) {
      nanoAdjustment = 0;
    }
    var secs = epochSecond + MathUtil.floorDiv(nanoAdjustment, LocalTime.NANOS_PER_SECOND);
    var nos = MathUtil.floorMod(nanoAdjustment, LocalTime.NANOS_PER_SECOND);
    return Instant._create(secs, nos);
  };
  Instant.ofEpochMilli = function ofEpochMilli(epochMilli) {
    var secs = MathUtil.floorDiv(epochMilli, 1000);
    var mos = MathUtil.floorMod(epochMilli, 1000);
    return Instant._create(secs, mos * 1000000);
  };
  Instant.ofEpochMicro = function ofEpochMicro(epochMicro) {
    var secs = MathUtil.floorDiv(epochMicro, 1000000);
    var mos = MathUtil.floorMod(epochMicro, 1000000);
    return Instant._create(secs, mos * 1000);
  };
  Instant.from = function from(temporal) {
    try {
      var instantSecs = temporal.getLong(ChronoField.INSTANT_SECONDS);
      var nanoOfSecond = temporal.get(ChronoField.NANO_OF_SECOND);
      return Instant.ofEpochSecond(instantSecs, nanoOfSecond);
    } catch (ex) {
      throw new DateTimeException("Unable to obtain Instant from TemporalAccessor: " + temporal + ", type " + typeof temporal, ex);
    }
  };
  Instant.parse = function parse(text) {
    return DateTimeFormatter.ISO_INSTANT.parse(text, Instant.FROM);
  };
  Instant._create = function _create(seconds, nanoOfSecond) {
    if (seconds === 0 && nanoOfSecond === 0) {
      return Instant.EPOCH;
    }
    return new Instant(seconds, nanoOfSecond);
  };
  Instant._validate = function _validate(seconds, nanoOfSecond) {
    if (seconds < Instant.MIN_SECONDS || seconds > Instant.MAX_SECONDS) {
      throw new DateTimeException('Instant exceeds minimum or maximum instant');
    }
    if (nanoOfSecond < 0 || nanoOfSecond > LocalTime.NANOS_PER_SECOND) {
      throw new DateTimeException('Instant exceeds minimum or maximum instant');
    }
  };
  function Instant(seconds, nanoOfSecond) {
    var _this;
    _this = _Temporal.call(this) || this;
    Instant._validate(seconds, nanoOfSecond);
    _this._seconds = MathUtil.safeToInt(seconds);
    _this._nanos = MathUtil.safeToInt(nanoOfSecond);
    return _this;
  }
  var _proto = Instant.prototype;
  _proto.isSupported = function isSupported(fieldOrUnit) {
    if (fieldOrUnit instanceof ChronoField) {
      return fieldOrUnit === ChronoField.INSTANT_SECONDS || fieldOrUnit === ChronoField.NANO_OF_SECOND || fieldOrUnit === ChronoField.MICRO_OF_SECOND || fieldOrUnit === ChronoField.MILLI_OF_SECOND;
    }
    if (fieldOrUnit instanceof ChronoUnit) {
      return fieldOrUnit.isTimeBased() || fieldOrUnit === ChronoUnit.DAYS;
    }
    return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
  };
  _proto.range = function range(field) {
    return _Temporal.prototype.range.call(this, field);
  };
  _proto.get = function get(field) {
    return this.getLong(field);
  };
  _proto.getLong = function getLong(field) {
    if (field instanceof ChronoField) {
      switch (field) {
        case ChronoField.NANO_OF_SECOND:
          return this._nanos;
        case ChronoField.MICRO_OF_SECOND:
          return MathUtil.intDiv(this._nanos, 1000);
        case ChronoField.MILLI_OF_SECOND:
          return MathUtil.intDiv(this._nanos, NANOS_PER_MILLI);
        case ChronoField.INSTANT_SECONDS:
          return this._seconds;
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.getFrom(this);
  };
  _proto.epochSecond = function epochSecond() {
    return this._seconds;
  };
  _proto.nano = function nano() {
    return this._nanos;
  };
  _proto._withField = function _withField(field, newValue) {
    requireNonNull(field, 'field');
    if (field instanceof ChronoField) {
      field.checkValidValue(newValue);
      switch (field) {
        case ChronoField.MILLI_OF_SECOND:
          {
            var nval = newValue * NANOS_PER_MILLI;
            return nval !== this._nanos ? Instant._create(this._seconds, nval) : this;
          }
        case ChronoField.MICRO_OF_SECOND:
          {
            var _nval = newValue * 1000;
            return _nval !== this._nanos ? Instant._create(this._seconds, _nval) : this;
          }
        case ChronoField.NANO_OF_SECOND:
          return newValue !== this._nanos ? Instant._create(this._seconds, newValue) : this;
        case ChronoField.INSTANT_SECONDS:
          return newValue !== this._seconds ? Instant._create(newValue, this._nanos) : this;
      }
      throw new UnsupportedTemporalTypeException("Unsupported field: " + field);
    }
    return field.adjustInto(this, newValue);
  };
  _proto.truncatedTo = function truncatedTo(unit) {
    requireNonNull(unit, 'unit');
    if (unit === ChronoUnit.NANOS) {
      return this;
    }
    var unitDur = unit.duration();
    if (unitDur.seconds() > LocalTime.SECONDS_PER_DAY) {
      throw new DateTimeException('Unit is too large to be used for truncation');
    }
    var dur = unitDur.toNanos();
    if (MathUtil.intMod(LocalTime.NANOS_PER_DAY, dur) !== 0) {
      throw new DateTimeException('Unit must divide into a standard day without remainder');
    }
    var nod = MathUtil.intMod(this._seconds, LocalTime.SECONDS_PER_DAY) * LocalTime.NANOS_PER_SECOND + this._nanos;
    var result = MathUtil.intDiv(nod, dur) * dur;
    return this.plusNanos(result - nod);
  };
  _proto._plusUnit = function _plusUnit(amountToAdd, unit) {
    requireNonNull(amountToAdd, 'amountToAdd');
    requireNonNull(unit, 'unit');
    requireInstance(unit, TemporalUnit);
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.NANOS:
          return this.plusNanos(amountToAdd);
        case ChronoUnit.MICROS:
          return this.plusMicros(amountToAdd);
        case ChronoUnit.MILLIS:
          return this.plusMillis(amountToAdd);
        case ChronoUnit.SECONDS:
          return this.plusSeconds(amountToAdd);
        case ChronoUnit.MINUTES:
          return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_MINUTE));
        case ChronoUnit.HOURS:
          return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_HOUR));
        case ChronoUnit.HALF_DAYS:
          return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_DAY / 2));
        case ChronoUnit.DAYS:
          return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_DAY));
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.addTo(this, amountToAdd);
  };
  _proto.plusSeconds = function plusSeconds(secondsToAdd) {
    return this._plus(secondsToAdd, 0);
  };
  _proto.plusMillis = function plusMillis(millisToAdd) {
    return this._plus(MathUtil.intDiv(millisToAdd, 1000), MathUtil.intMod(millisToAdd, 1000) * NANOS_PER_MILLI);
  };
  _proto.plusNanos = function plusNanos(nanosToAdd) {
    return this._plus(0, nanosToAdd);
  };
  _proto.plusMicros = function plusMicros(microsToAdd) {
    return this._plus(MathUtil.intDiv(microsToAdd, 1000000), MathUtil.intMod(microsToAdd, 1000000) * 1000);
  };
  _proto._plus = function _plus(secondsToAdd, nanosToAdd) {
    if (secondsToAdd === 0 && nanosToAdd === 0) {
      return this;
    }
    var epochSec = this._seconds + secondsToAdd;
    epochSec = epochSec + MathUtil.intDiv(nanosToAdd, LocalTime.NANOS_PER_SECOND);
    var nanoAdjustment = this._nanos + nanosToAdd % LocalTime.NANOS_PER_SECOND;
    return Instant.ofEpochSecond(epochSec, nanoAdjustment);
  };
  _proto._minusUnit = function _minusUnit(amountToSubtract, unit) {
    return this._plusUnit(-1 * amountToSubtract, unit);
  };
  _proto.minusSeconds = function minusSeconds(secondsToSubtract) {
    return this.plusSeconds(secondsToSubtract * -1);
  };
  _proto.minusMillis = function minusMillis(millisToSubtract) {
    return this.plusMillis(-1 * millisToSubtract);
  };
  _proto.minusNanos = function minusNanos(nanosToSubtract) {
    return this.plusNanos(-1 * nanosToSubtract);
  };
  _proto.minusMicros = function minusMicros(microsToSubtract) {
    return this.plusMicros(-1 * microsToSubtract);
  };
  _proto.query = function query(_query) {
    requireNonNull(_query, 'query');
    if (_query === TemporalQueries.precision()) {
      return ChronoUnit.NANOS;
    }
    if (_query === TemporalQueries.localDate() || _query === TemporalQueries.localTime() || _query === TemporalQueries.chronology() || _query === TemporalQueries.zoneId() || _query === TemporalQueries.zone() || _query === TemporalQueries.offset()) {
      return null;
    }
    return _query.queryFrom(this);
  };
  _proto.adjustInto = function adjustInto(temporal) {
    requireNonNull(temporal, 'temporal');
    return temporal.with(ChronoField.INSTANT_SECONDS, this._seconds).with(ChronoField.NANO_OF_SECOND, this._nanos);
  };
  _proto.until = function until(endExclusive, unit) {
    requireNonNull(endExclusive, 'endExclusive');
    requireNonNull(unit, 'unit');
    var end = Instant.from(endExclusive);
    if (unit instanceof ChronoUnit) {
      switch (unit) {
        case ChronoUnit.NANOS:
          return this._nanosUntil(end);
        case ChronoUnit.MICROS:
          return this._microsUntil(end);
        case ChronoUnit.MILLIS:
          return MathUtil.safeSubtract(end.toEpochMilli(), this.toEpochMilli());
        case ChronoUnit.SECONDS:
          return this._secondsUntil(end);
        case ChronoUnit.MINUTES:
          return MathUtil.intDiv(this._secondsUntil(end), LocalTime.SECONDS_PER_MINUTE);
        case ChronoUnit.HOURS:
          return MathUtil.intDiv(this._secondsUntil(end), LocalTime.SECONDS_PER_HOUR);
        case ChronoUnit.HALF_DAYS:
          return MathUtil.intDiv(this._secondsUntil(end), 12 * LocalTime.SECONDS_PER_HOUR);
        case ChronoUnit.DAYS:
          return MathUtil.intDiv(this._secondsUntil(end), LocalTime.SECONDS_PER_DAY);
      }
      throw new UnsupportedTemporalTypeException("Unsupported unit: " + unit);
    }
    return unit.between(this, end);
  };
  _proto._microsUntil = function _microsUntil(end) {
    var secsDiff = MathUtil.safeSubtract(end.epochSecond(), this.epochSecond());
    var totalMicros = MathUtil.safeMultiply(secsDiff, 1000000);
    return MathUtil.safeAdd(totalMicros, MathUtil.intDiv(end.nano() - this.nano(), 1000));
  };
  _proto._nanosUntil = function _nanosUntil(end) {
    var secsDiff = MathUtil.safeSubtract(end.epochSecond(), this.epochSecond());
    var totalNanos = MathUtil.safeMultiply(secsDiff, LocalTime.NANOS_PER_SECOND);
    return MathUtil.safeAdd(totalNanos, end.nano() - this.nano());
  };
  _proto._secondsUntil = function _secondsUntil(end) {
    var secsDiff = MathUtil.safeSubtract(end.epochSecond(), this.epochSecond());
    var nanosDiff = end.nano() - this.nano();
    if (secsDiff > 0 && nanosDiff < 0) {
      secsDiff--;
    } else if (secsDiff < 0 && nanosDiff > 0) {
      secsDiff++;
    }
    return secsDiff;
  };
  _proto.atOffset = function atOffset(offset) {
    return OffsetDateTime.ofInstant(this, offset);
  };
  _proto.atZone = function atZone(zone) {
    return ZonedDateTime.ofInstant(this, zone);
  };
  _proto.toEpochMilli = function toEpochMilli() {
    var millis = MathUtil.safeMultiply(this._seconds, 1000);
    return millis + MathUtil.intDiv(this._nanos, NANOS_PER_MILLI);
  };
  _proto.compareTo = function compareTo(otherInstant) {
    requireNonNull(otherInstant, 'otherInstant');
    requireInstance(otherInstant, Instant, 'otherInstant');
    var cmp = MathUtil.compareNumbers(this._seconds, otherInstant._seconds);
    if (cmp !== 0) {
      return cmp;
    }
    return this._nanos - otherInstant._nanos;
  };
  _proto.isAfter = function isAfter(otherInstant) {
    return this.compareTo(otherInstant) > 0;
  };
  _proto.isBefore = function isBefore(otherInstant) {
    return this.compareTo(otherInstant) < 0;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    if (other instanceof Instant) {
      return this.epochSecond() === other.epochSecond() && this.nano() === other.nano();
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return MathUtil.hashCode(this._seconds, this._nanos);
  };
  _proto.toString = function toString() {
    return DateTimeFormatter.ISO_INSTANT.format(this);
  };
  _proto.toJSON = function toJSON() {
    return this.toString();
  };
  return Instant;
}(Temporal);
function _init$2() {
  Instant.MIN_SECONDS = -31619119219200;
  Instant.MAX_SECONDS = 31494816403199;
  Instant.EPOCH = new Instant(0, 0);
  Instant.MIN = Instant.ofEpochSecond(Instant.MIN_SECONDS, 0);
  Instant.MAX = Instant.ofEpochSecond(Instant.MAX_SECONDS, 999999999);
  Instant.FROM = createTemporalQuery('Instant.FROM', function (temporal) {
    return Instant.from(temporal);
  });
}

var Clock = function () {
  function Clock() {}
  Clock.systemUTC = function systemUTC() {
    return new SystemClock(ZoneOffset.UTC);
  };
  Clock.systemDefaultZone = function systemDefaultZone() {
    return new SystemClock(ZoneId.systemDefault());
  };
  Clock.system = function system(zone) {
    return new SystemClock(zone);
  };
  Clock.fixed = function fixed(fixedInstant, zoneId) {
    return new FixedClock(fixedInstant, zoneId);
  };
  Clock.offset = function offset(baseClock, duration) {
    return new OffsetClock(baseClock, duration);
  };
  var _proto = Clock.prototype;
  _proto.millis = function millis() {
    abstractMethodFail('Clock.millis');
  };
  _proto.instant = function instant() {
    abstractMethodFail('Clock.instant');
  };
  _proto.zone = function zone() {
    abstractMethodFail('Clock.zone');
  };
  _proto.withZone = function withZone() {
    abstractMethodFail('Clock.withZone');
  };
  return Clock;
}();
var SystemClock = function (_Clock) {
  _inheritsLoose(SystemClock, _Clock);
  function SystemClock(zone) {
    var _this;
    requireNonNull(zone, 'zone');
    _this = _Clock.call(this) || this;
    _this._zone = zone;
    return _this;
  }
  var _proto2 = SystemClock.prototype;
  _proto2.zone = function zone() {
    return this._zone;
  };
  _proto2.millis = function millis() {
    return new Date().getTime();
  };
  _proto2.instant = function instant() {
    return Instant.ofEpochMilli(this.millis());
  };
  _proto2.equals = function equals(obj) {
    if (obj instanceof SystemClock) {
      return this._zone.equals(obj._zone);
    }
    return false;
  };
  _proto2.withZone = function withZone(zone) {
    if (zone.equals(this._zone)) {
      return this;
    }
    return new SystemClock(zone);
  };
  _proto2.toString = function toString() {
    return "SystemClock[" + this._zone.toString() + "]";
  };
  return SystemClock;
}(Clock);
var FixedClock = function (_Clock2) {
  _inheritsLoose(FixedClock, _Clock2);
  function FixedClock(fixedInstant, zoneId) {
    var _this2;
    _this2 = _Clock2.call(this) || this;
    _this2._instant = fixedInstant;
    _this2._zoneId = zoneId;
    return _this2;
  }
  var _proto3 = FixedClock.prototype;
  _proto3.instant = function instant() {
    return this._instant;
  };
  _proto3.millis = function millis() {
    return this._instant.toEpochMilli();
  };
  _proto3.zone = function zone() {
    return this._zoneId;
  };
  _proto3.toString = function toString() {
    return 'FixedClock[]';
  };
  _proto3.equals = function equals(obj) {
    if (obj instanceof FixedClock) {
      return this._instant.equals(obj._instant) && this._zoneId.equals(obj._zoneId);
    }
    return false;
  };
  _proto3.withZone = function withZone(zone) {
    if (zone.equals(this._zoneId)) {
      return this;
    }
    return new FixedClock(this._instant, zone);
  };
  return FixedClock;
}(Clock);
var OffsetClock = function (_Clock3) {
  _inheritsLoose(OffsetClock, _Clock3);
  function OffsetClock(baseClock, offset) {
    var _this3;
    _this3 = _Clock3.call(this) || this;
    _this3._baseClock = baseClock;
    _this3._offset = offset;
    return _this3;
  }
  var _proto4 = OffsetClock.prototype;
  _proto4.zone = function zone() {
    return this._baseClock.zone();
  };
  _proto4.withZone = function withZone(zone) {
    if (zone.equals(this._baseClock.zone())) {
      return this;
    }
    return new OffsetClock(this._baseClock.withZone(zone), this._offset);
  };
  _proto4.millis = function millis() {
    return this._baseClock.millis() + this._offset.toMillis();
  };
  _proto4.instant = function instant() {
    return this._baseClock.instant().plus(this._offset);
  };
  _proto4.equals = function equals(obj) {
    if (obj instanceof OffsetClock) {
      return this._baseClock.equals(obj._baseClock) && this._offset.equals(obj._offset);
    }
    return false;
  };
  _proto4.toString = function toString() {
    return "OffsetClock[" + this._baseClock + "," + this._offset + "]";
  };
  return OffsetClock;
}(Clock);

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var ZoneOffsetTransition = function () {
  ZoneOffsetTransition.of = function of(transition, offsetBefore, offsetAfter) {
    return new ZoneOffsetTransition(transition, offsetBefore, offsetAfter);
  };
  function ZoneOffsetTransition(transition, offsetBefore, offsetAfter) {
    requireNonNull(transition, 'transition');
    requireNonNull(offsetBefore, 'offsetBefore');
    requireNonNull(offsetAfter, 'offsetAfter');
    if (offsetBefore.equals(offsetAfter)) {
      throw new IllegalArgumentException('Offsets must not be equal');
    }
    if (transition.nano() !== 0) {
      throw new IllegalArgumentException('Nano-of-second must be zero');
    }
    if (transition instanceof LocalDateTime) {
      this._transition = transition;
    } else {
      this._transition = LocalDateTime.ofEpochSecond(transition, 0, offsetBefore);
    }
    this._offsetBefore = offsetBefore;
    this._offsetAfter = offsetAfter;
  }
  var _proto = ZoneOffsetTransition.prototype;
  _proto.instant = function instant() {
    return this._transition.toInstant(this._offsetBefore);
  };
  _proto.toEpochSecond = function toEpochSecond() {
    return this._transition.toEpochSecond(this._offsetBefore);
  };
  _proto.dateTimeBefore = function dateTimeBefore() {
    return this._transition;
  };
  _proto.dateTimeAfter = function dateTimeAfter() {
    return this._transition.plusSeconds(this.durationSeconds());
  };
  _proto.offsetBefore = function offsetBefore() {
    return this._offsetBefore;
  };
  _proto.offsetAfter = function offsetAfter() {
    return this._offsetAfter;
  };
  _proto.duration = function duration() {
    return Duration.ofSeconds(this.durationSeconds());
  };
  _proto.durationSeconds = function durationSeconds() {
    return this._offsetAfter.totalSeconds() - this._offsetBefore.totalSeconds();
  };
  _proto.isGap = function isGap() {
    return this._offsetAfter.totalSeconds() > this._offsetBefore.totalSeconds();
  };
  _proto.isOverlap = function isOverlap() {
    return this._offsetAfter.totalSeconds() < this._offsetBefore.totalSeconds();
  };
  _proto.isValidOffset = function isValidOffset(offset) {
    return this.isGap() ? false : this._offsetBefore.equals(offset) || this._offsetAfter.equals(offset);
  };
  _proto.validOffsets = function validOffsets() {
    if (this.isGap()) {
      return [];
    } else {
      return [this._offsetBefore, this._offsetAfter];
    }
  };
  _proto.compareTo = function compareTo(transition) {
    return this.instant().compareTo(transition.instant());
  };
  _proto.equals = function equals(other) {
    if (other === this) {
      return true;
    }
    if (other instanceof ZoneOffsetTransition) {
      var d = other;
      return this._transition.equals(d._transition) && this._offsetBefore.equals(d.offsetBefore()) && this._offsetAfter.equals(d.offsetAfter());
    }
    return false;
  };
  _proto.hashCode = function hashCode() {
    return this._transition.hashCode() ^ this._offsetBefore.hashCode() ^ this._offsetAfter.hashCode() >>> 16;
  };
  _proto.toString = function toString() {
    return "Transition[" + (this.isGap() ? 'Gap' : 'Overlap') + " at " + this._transition.toString() + this._offsetBefore.toString() + " to " + this._offsetAfter + "]";
  };
  return ZoneOffsetTransition;
}();

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
function _init$1() {
  TemporalQueries.ZONE_ID = createTemporalQuery('ZONE_ID', function (temporal) {
    return temporal.query(TemporalQueries.ZONE_ID);
  });
  TemporalQueries.CHRONO = createTemporalQuery('CHRONO', function (temporal) {
    return temporal.query(TemporalQueries.CHRONO);
  });
  TemporalQueries.PRECISION = createTemporalQuery('PRECISION', function (temporal) {
    return temporal.query(TemporalQueries.PRECISION);
  });
  TemporalQueries.OFFSET = createTemporalQuery('OFFSET', function (temporal) {
    if (temporal.isSupported(ChronoField.OFFSET_SECONDS)) {
      return ZoneOffset.ofTotalSeconds(temporal.get(ChronoField.OFFSET_SECONDS));
    }
    return null;
  });
  TemporalQueries.ZONE = createTemporalQuery('ZONE', function (temporal) {
    var zone = temporal.query(TemporalQueries.ZONE_ID);
    return zone != null ? zone : temporal.query(TemporalQueries.OFFSET);
  });
  TemporalQueries.LOCAL_DATE = createTemporalQuery('LOCAL_DATE', function (temporal) {
    if (temporal.isSupported(ChronoField.EPOCH_DAY)) {
      return LocalDate.ofEpochDay(temporal.getLong(ChronoField.EPOCH_DAY));
    }
    return null;
  });
  TemporalQueries.LOCAL_TIME = createTemporalQuery('LOCAL_TIME', function (temporal) {
    if (temporal.isSupported(ChronoField.NANO_OF_DAY)) {
      return LocalTime.ofNanoOfDay(temporal.getLong(ChronoField.NANO_OF_DAY));
    }
    return null;
  });
}

var SystemDefaultZoneRules = function (_ZoneRules) {
  _inheritsLoose(SystemDefaultZoneRules, _ZoneRules);
  function SystemDefaultZoneRules() {
    return _ZoneRules.apply(this, arguments) || this;
  }
  var _proto = SystemDefaultZoneRules.prototype;
  _proto.isFixedOffset = function isFixedOffset() {
    return false;
  };
  _proto.offsetOfInstant = function offsetOfInstant(instant) {
    var offsetInMinutes = new Date(instant.toEpochMilli()).getTimezoneOffset();
    return ZoneOffset.ofTotalMinutes(offsetInMinutes * -1);
  };
  _proto.offsetOfEpochMilli = function offsetOfEpochMilli(epochMilli) {
    var offsetInMinutes = new Date(epochMilli).getTimezoneOffset();
    return ZoneOffset.ofTotalMinutes(offsetInMinutes * -1);
  };
  _proto.offsetOfLocalDateTime = function offsetOfLocalDateTime(localDateTime) {
    var epochMilli = localDateTime.toEpochSecond(ZoneOffset.UTC) * 1000;
    var offsetInMinutesBeforePossibleTransition = new Date(epochMilli).getTimezoneOffset();
    var epochMilliSystemZone = epochMilli + offsetInMinutesBeforePossibleTransition * 60000;
    var offsetInMinutesAfterPossibleTransition = new Date(epochMilliSystemZone).getTimezoneOffset();
    return ZoneOffset.ofTotalMinutes(offsetInMinutesAfterPossibleTransition * -1);
  };
  _proto.validOffsets = function validOffsets(localDateTime) {
    return [this.offsetOfLocalDateTime(localDateTime)];
  };
  _proto.transition = function transition() {
    return null;
  };
  _proto.standardOffset = function standardOffset(instant) {
    return this.offsetOfInstant(instant);
  };
  _proto.daylightSavings = function daylightSavings() {
    this._throwNotSupported();
  };
  _proto.isDaylightSavings = function isDaylightSavings() {
    this._throwNotSupported();
  };
  _proto.isValidOffset = function isValidOffset(dateTime, offset) {
    return this.offsetOfLocalDateTime(dateTime).equals(offset);
  };
  _proto.nextTransition = function nextTransition() {
    this._throwNotSupported();
  };
  _proto.previousTransition = function previousTransition() {
    this._throwNotSupported();
  };
  _proto.transitions = function transitions() {
    this._throwNotSupported();
  };
  _proto.transitionRules = function transitionRules() {
    this._throwNotSupported();
  };
  _proto._throwNotSupported = function _throwNotSupported() {
    throw new DateTimeException('not supported operation');
  };
  _proto.equals = function equals(other) {
    if (this === other || other instanceof SystemDefaultZoneRules) {
      return true;
    } else {
      return false;
    }
  };
  _proto.toString = function toString() {
    return 'SYSTEM';
  };
  return SystemDefaultZoneRules;
}(ZoneRules);

var SystemDefaultZoneId = function (_ZoneId) {
  _inheritsLoose(SystemDefaultZoneId, _ZoneId);
  function SystemDefaultZoneId() {
    var _this;
    _this = _ZoneId.call(this) || this;
    _this._rules = new SystemDefaultZoneRules();
    return _this;
  }
  var _proto = SystemDefaultZoneId.prototype;
  _proto.rules = function rules() {
    return this._rules;
  };
  _proto.equals = function equals(other) {
    if (this === other) {
      return true;
    }
    return false;
  };
  _proto.id = function id() {
    return 'SYSTEM';
  };
  return SystemDefaultZoneId;
}(ZoneId);

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var ZoneIdFactory = function () {
  function ZoneIdFactory() {}
  ZoneIdFactory.systemDefault = function systemDefault() {
    return SYSTEM_DEFAULT_ZONE_ID_INSTANCE;
  };
  ZoneIdFactory.getAvailableZoneIds = function getAvailableZoneIds() {
    return ZoneRulesProvider.getAvailableZoneIds();
  };
  ZoneIdFactory.of = function of(zoneId) {
    requireNonNull(zoneId, 'zoneId');
    if (zoneId === 'Z') {
      return ZoneOffset.UTC;
    }
    if (zoneId.length === 1) {
      throw new DateTimeException("Invalid zone: " + zoneId);
    }
    if (StringUtil.startsWith(zoneId, '+') || StringUtil.startsWith(zoneId, '-')) {
      return ZoneOffset.of(zoneId);
    }
    if (zoneId === 'UTC' || zoneId === 'GMT' || zoneId === 'GMT0' || zoneId === 'UT') {
      return new ZoneRegion(zoneId, ZoneOffset.UTC.rules());
    }
    if (StringUtil.startsWith(zoneId, 'UTC+') || StringUtil.startsWith(zoneId, 'GMT+') || StringUtil.startsWith(zoneId, 'UTC-') || StringUtil.startsWith(zoneId, 'GMT-')) {
      var offset = ZoneOffset.of(zoneId.substring(3));
      if (offset.totalSeconds() === 0) {
        return new ZoneRegion(zoneId.substring(0, 3), offset.rules());
      }
      return new ZoneRegion(zoneId.substring(0, 3) + offset.id(), offset.rules());
    }
    if (StringUtil.startsWith(zoneId, 'UT+') || StringUtil.startsWith(zoneId, 'UT-')) {
      var _offset = ZoneOffset.of(zoneId.substring(2));
      if (_offset.totalSeconds() === 0) {
        return new ZoneRegion('UT', _offset.rules());
      }
      return new ZoneRegion("UT" + _offset.id(), _offset.rules());
    }
    if (zoneId === 'SYSTEM') {
      return ZoneId.systemDefault();
    }
    return ZoneRegion.ofId(zoneId);
  };
  ZoneIdFactory.ofOffset = function ofOffset(prefix, offset) {
    requireNonNull(prefix, 'prefix');
    requireNonNull(offset, 'offset');
    if (prefix.length === 0) {
      return offset;
    }
    if (prefix === 'GMT' || prefix === 'UTC' || prefix === 'UT') {
      if (offset.totalSeconds() === 0) {
        return new ZoneRegion(prefix, offset.rules());
      }
      return new ZoneRegion(prefix + offset.id(), offset.rules());
    }
    throw new IllegalArgumentException("Invalid prefix, must be GMT, UTC or UT: " + prefix);
  };
  ZoneIdFactory.from = function from(temporal) {
    requireNonNull(temporal, 'temporal');
    var obj = temporal.query(TemporalQueries.zone());
    if (obj == null) {
      throw new DateTimeException("Unable to obtain ZoneId from TemporalAccessor: " + temporal + ", type " + (temporal.constructor != null ? temporal.constructor.name : ''));
    }
    return obj;
  };
  return ZoneIdFactory;
}();
var SYSTEM_DEFAULT_ZONE_ID_INSTANCE = null;
function _init() {
  SYSTEM_DEFAULT_ZONE_ID_INSTANCE = new SystemDefaultZoneId();
  ZoneId.systemDefault = ZoneIdFactory.systemDefault;
  ZoneId.getAvailableZoneIds = ZoneIdFactory.getAvailableZoneIds;
  ZoneId.of = ZoneIdFactory.of;
  ZoneId.ofOffset = ZoneIdFactory.ofOffset;
  ZoneId.from = ZoneIdFactory.from;
  ZoneOffset.from = ZoneIdFactory.from;
  ZoneId.SYSTEM = SYSTEM_DEFAULT_ZONE_ID_INSTANCE;
  ZoneId.UTC = ZoneOffset.ofTotalSeconds(0);
}

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var isInit = false;
function init() {
  if (isInit) {
    return;
  }
  isInit = true;
  _init$m();
  _init$n();
  _init$l();
  _init$k();
  _init$3();
  _init$f();
  _init$1();
  _init$j();
  _init$2();
  _init$5();
  _init$4();
  _init$a();
  _init$i();
  _init$b();
  _init$c();
  _init$h();
  _init$g();
  _init$7();
  _init();
  _init$9();
  _init$d();
  _init$e();
  _init$6();
  _init$8();
}
init();

/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var ToNativeJsConverter = function () {
  function ToNativeJsConverter(temporal, zone) {
    var zonedDateTime;
    if (temporal instanceof Instant) {
      this.instant = temporal;
      return;
    } else if (temporal instanceof LocalDate) {
      zone = zone == null ? ZoneId.systemDefault() : zone;
      zonedDateTime = temporal.atStartOfDay(zone);
    } else if (temporal instanceof LocalDateTime) {
      zone = zone == null ? ZoneId.systemDefault() : zone;
      zonedDateTime = temporal.atZone(zone);
    } else if (temporal instanceof ZonedDateTime) {
      if (zone == null) {
        zonedDateTime = temporal;
      } else {
        zonedDateTime = temporal.withZoneSameInstant(zone);
      }
    } else {
      throw new IllegalArgumentException("unsupported instance for convert operation:" + temporal);
    }
    this.instant = zonedDateTime.toInstant();
  }
  var _proto = ToNativeJsConverter.prototype;
  _proto.toDate = function toDate() {
    return new Date(this.instant.toEpochMilli());
  };
  _proto.toEpochMilli = function toEpochMilli() {
    return this.instant.toEpochMilli();
  };
  return ToNativeJsConverter;
}();
function convert(temporal, zone) {
  return new ToNativeJsConverter(temporal, zone);
}

/*
 * @copyright (c) 2015-present, Philipp Thürwächter, Pattrick Hüper & js-joda contributors
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
function nativeJs(date, zone) {
  if (zone === void 0) {
    zone = ZoneId.systemDefault();
  }
  requireNonNull(date, 'date');
  requireNonNull(zone, 'zone');
  if (date instanceof Date) {
    return Instant.ofEpochMilli(date.getTime()).atZone(zone);
  } else if (typeof date.toDate === 'function' && date.toDate() instanceof Date) {
    return Instant.ofEpochMilli(date.toDate().getTime()).atZone(zone);
  }
  throw new IllegalArgumentException('date must be a javascript Date or a moment instance');
}

function bindUse(jsJoda) {
  var used = [];
  return function use(fn) {
    if (!~used.indexOf(fn)) {
      fn(jsJoda);
      used.push(fn);
    }
    return jsJoda;
  };
}

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
var _ = {
  assert: assert$1,
  DateTimeBuilder: DateTimeBuilder,
  DateTimeParseContext: DateTimeParseContext,
  DateTimePrintContext: DateTimePrintContext,
  MathUtil: MathUtil,
  StringUtil: StringUtil,
  StringBuilder: StringBuilder
};
var jsJodaExports = {
  _: _,
  convert: convert,
  nativeJs: nativeJs,
  ArithmeticException: ArithmeticException,
  DateTimeException: DateTimeException,
  DateTimeParseException: DateTimeParseException,
  IllegalArgumentException: IllegalArgumentException,
  IllegalStateException: IllegalStateException,
  UnsupportedTemporalTypeException: UnsupportedTemporalTypeException,
  NullPointerException: NullPointerException,
  Clock: Clock,
  DayOfWeek: DayOfWeek,
  Duration: Duration,
  Instant: Instant,
  LocalDate: LocalDate,
  LocalTime: LocalTime,
  LocalDateTime: LocalDateTime,
  OffsetTime: OffsetTime,
  OffsetDateTime: OffsetDateTime,
  Month: Month,
  MonthDay: MonthDay,
  ParsePosition: ParsePosition,
  Period: Period,
  Year: Year,
  YearConstants: YearConstants,
  YearMonth: YearMonth,
  ZonedDateTime: ZonedDateTime,
  ZoneOffset: ZoneOffset,
  ZoneId: ZoneId,
  ZoneRegion: ZoneRegion,
  ZoneOffsetTransition: ZoneOffsetTransition,
  ZoneRules: ZoneRules,
  ZoneRulesProvider: ZoneRulesProvider,
  ChronoLocalDate: ChronoLocalDate,
  ChronoLocalDateTime: ChronoLocalDateTime,
  ChronoZonedDateTime: ChronoZonedDateTime,
  IsoChronology: IsoChronology,
  ChronoField: ChronoField,
  ChronoUnit: ChronoUnit,
  IsoFields: IsoFields,
  Temporal: Temporal,
  TemporalAccessor: TemporalAccessor,
  TemporalAdjuster: TemporalAdjuster,
  TemporalAdjusters: TemporalAdjusters,
  TemporalAmount: TemporalAmount,
  TemporalField: TemporalField,
  TemporalQueries: TemporalQueries,
  TemporalQuery: TemporalQuery,
  TemporalUnit: TemporalUnit,
  ValueRange: ValueRange,
  DateTimeFormatter: DateTimeFormatter,
  DateTimeFormatterBuilder: DateTimeFormatterBuilder,
  DecimalStyle: DecimalStyle,
  ResolverStyle: ResolverStyle,
  SignStyle: SignStyle,
  TextStyle: TextStyle
};
var use = bindUse(jsJodaExports);
jsJodaExports.use = use;

export { ArithmeticException, ChronoField, ChronoLocalDate, ChronoLocalDateTime, ChronoUnit, ChronoZonedDateTime, Clock, DateTimeException, DateTimeFormatter, DateTimeFormatterBuilder, DateTimeParseException, DayOfWeek, DecimalStyle, Duration, IllegalArgumentException, IllegalStateException, Instant, IsoChronology, IsoFields, LocalDate, LocalDateTime, LocalTime, Month, MonthDay, NullPointerException, OffsetDateTime, OffsetTime, ParsePosition, Period, ResolverStyle, SignStyle, Temporal, TemporalAccessor, TemporalAdjuster, TemporalAdjusters, TemporalAmount, TemporalField, TemporalQueries, TemporalQuery, TemporalUnit, TextStyle, UnsupportedTemporalTypeException, ValueRange, Year, YearConstants, YearMonth, ZoneId, ZoneOffset, ZoneOffsetTransition, ZoneRegion, ZoneRules, ZoneRulesProvider, ZonedDateTime, _, convert, nativeJs, use };
//# sourceMappingURL=js-joda.esm.js.map
