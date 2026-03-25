(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Dumper, Inline, Utils;

Utils = require('./Utils');

Inline = require('./Inline');

Dumper = (function() {
  function Dumper() {}

  Dumper.indentation = 4;

  Dumper.prototype.dump = function(input, inline, indent, exceptionOnInvalidType, objectEncoder) {
    var i, key, len, output, prefix, value, willBeInlined;
    if (inline == null) {
      inline = 0;
    }
    if (indent == null) {
      indent = 0;
    }
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = false;
    }
    if (objectEncoder == null) {
      objectEncoder = null;
    }
    output = '';
    prefix = (indent ? Utils.strRepeat(' ', indent) : '');
    if (inline <= 0 || typeof input !== 'object' || input instanceof Date || Utils.isEmpty(input)) {
      output += prefix + Inline.dump(input, exceptionOnInvalidType, objectEncoder);
    } else {
      if (input instanceof Array) {
        for (i = 0, len = input.length; i < len; i++) {
          value = input[i];
          willBeInlined = inline - 1 <= 0 || typeof value !== 'object' || Utils.isEmpty(value);
          output += prefix + '-' + (willBeInlined ? ' ' : "\n") + this.dump(value, inline - 1, (willBeInlined ? 0 : indent + this.indentation), exceptionOnInvalidType, objectEncoder) + (willBeInlined ? "\n" : '');
        }
      } else {
        for (key in input) {
          value = input[key];
          willBeInlined = inline - 1 <= 0 || typeof value !== 'object' || Utils.isEmpty(value);
          output += prefix + Inline.dump(key, exceptionOnInvalidType, objectEncoder) + ':' + (willBeInlined ? ' ' : "\n") + this.dump(value, inline - 1, (willBeInlined ? 0 : indent + this.indentation), exceptionOnInvalidType, objectEncoder) + (willBeInlined ? "\n" : '');
        }
      }
    }
    return output;
  };

  return Dumper;

})();

module.exports = Dumper;


},{"./Inline":6,"./Utils":10}],2:[function(require,module,exports){
var Escaper, Pattern;

Pattern = require('./Pattern');

Escaper = (function() {
  var ch;

  function Escaper() {}

  Escaper.LIST_ESCAPEES = ['\\', '\\\\', '\\"', '"', "\x00", "\x01", "\x02", "\x03", "\x04", "\x05", "\x06", "\x07", "\x08", "\x09", "\x0a", "\x0b", "\x0c", "\x0d", "\x0e", "\x0f", "\x10", "\x11", "\x12", "\x13", "\x14", "\x15", "\x16", "\x17", "\x18", "\x19", "\x1a", "\x1b", "\x1c", "\x1d", "\x1e", "\x1f", (ch = String.fromCharCode)(0x0085), ch(0x00A0), ch(0x2028), ch(0x2029)];

  Escaper.LIST_ESCAPED = ['\\\\', '\\"', '\\"', '\\"', "\\0", "\\x01", "\\x02", "\\x03", "\\x04", "\\x05", "\\x06", "\\a", "\\b", "\\t", "\\n", "\\v", "\\f", "\\r", "\\x0e", "\\x0f", "\\x10", "\\x11", "\\x12", "\\x13", "\\x14", "\\x15", "\\x16", "\\x17", "\\x18", "\\x19", "\\x1a", "\\e", "\\x1c", "\\x1d", "\\x1e", "\\x1f", "\\N", "\\_", "\\L", "\\P"];

  Escaper.MAPPING_ESCAPEES_TO_ESCAPED = (function() {
    var i, j, mapping, ref;
    mapping = {};
    for (i = j = 0, ref = Escaper.LIST_ESCAPEES.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      mapping[Escaper.LIST_ESCAPEES[i]] = Escaper.LIST_ESCAPED[i];
    }
    return mapping;
  })();

  Escaper.PATTERN_CHARACTERS_TO_ESCAPE = new Pattern('[\\x00-\\x1f]|\xc2\x85|\xc2\xa0|\xe2\x80\xa8|\xe2\x80\xa9');

  Escaper.PATTERN_MAPPING_ESCAPEES = new Pattern(Escaper.LIST_ESCAPEES.join('|').split('\\').join('\\\\'));

  Escaper.PATTERN_SINGLE_QUOTING = new Pattern('[\\s\'":{}[\\],&*#?]|^[-?|<>=!%@`]');

  Escaper.requiresDoubleQuoting = function(value) {
    return this.PATTERN_CHARACTERS_TO_ESCAPE.test(value);
  };

  Escaper.escapeWithDoubleQuotes = function(value) {
    var result;
    result = this.PATTERN_MAPPING_ESCAPEES.replace(value, (function(_this) {
      return function(str) {
        return _this.MAPPING_ESCAPEES_TO_ESCAPED[str];
      };
    })(this));
    return '"' + result + '"';
  };

  Escaper.requiresSingleQuoting = function(value) {
    return this.PATTERN_SINGLE_QUOTING.test(value);
  };

  Escaper.escapeWithSingleQuotes = function(value) {
    return "'" + value.replace(/'/g, "''") + "'";
  };

  return Escaper;

})();

module.exports = Escaper;


},{"./Pattern":8}],3:[function(require,module,exports){
var DumpException,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

DumpException = (function(superClass) {
  extend(DumpException, superClass);

  function DumpException(message, parsedLine, snippet) {
    this.message = message;
    this.parsedLine = parsedLine;
    this.snippet = snippet;
  }

  DumpException.prototype.toString = function() {
    if ((this.parsedLine != null) && (this.snippet != null)) {
      return '<DumpException> ' + this.message + ' (line ' + this.parsedLine + ': \'' + this.snippet + '\')';
    } else {
      return '<DumpException> ' + this.message;
    }
  };

  return DumpException;

})(Error);

module.exports = DumpException;


},{}],4:[function(require,module,exports){
var ParseException,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ParseException = (function(superClass) {
  extend(ParseException, superClass);

  function ParseException(message, parsedLine, snippet) {
    this.message = message;
    this.parsedLine = parsedLine;
    this.snippet = snippet;
  }

  ParseException.prototype.toString = function() {
    if ((this.parsedLine != null) && (this.snippet != null)) {
      return '<ParseException> ' + this.message + ' (line ' + this.parsedLine + ': \'' + this.snippet + '\')';
    } else {
      return '<ParseException> ' + this.message;
    }
  };

  return ParseException;

})(Error);

module.exports = ParseException;


},{}],5:[function(require,module,exports){
var ParseMore,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ParseMore = (function(superClass) {
  extend(ParseMore, superClass);

  function ParseMore(message, parsedLine, snippet) {
    this.message = message;
    this.parsedLine = parsedLine;
    this.snippet = snippet;
  }

  ParseMore.prototype.toString = function() {
    if ((this.parsedLine != null) && (this.snippet != null)) {
      return '<ParseMore> ' + this.message + ' (line ' + this.parsedLine + ': \'' + this.snippet + '\')';
    } else {
      return '<ParseMore> ' + this.message;
    }
  };

  return ParseMore;

})(Error);

module.exports = ParseMore;


},{}],6:[function(require,module,exports){
var DumpException, Escaper, Inline, ParseException, ParseMore, Pattern, Unescaper, Utils,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Pattern = require('./Pattern');

Unescaper = require('./Unescaper');

Escaper = require('./Escaper');

Utils = require('./Utils');

ParseException = require('./Exception/ParseException');

ParseMore = require('./Exception/ParseMore');

DumpException = require('./Exception/DumpException');

Inline = (function() {
  function Inline() {}

  Inline.REGEX_QUOTED_STRING = '(?:"(?:[^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|\'(?:[^\']*(?:\'\'[^\']*)*)\')';

  Inline.PATTERN_TRAILING_COMMENTS = new Pattern('^\\s*#.*$');

  Inline.PATTERN_QUOTED_SCALAR = new Pattern('^' + Inline.REGEX_QUOTED_STRING);

  Inline.PATTERN_THOUSAND_NUMERIC_SCALAR = new Pattern('^(-|\\+)?[0-9,]+(\\.[0-9]+)?$');

  Inline.PATTERN_SCALAR_BY_DELIMITERS = {};

  Inline.settings = {};

  Inline.configure = function(exceptionOnInvalidType, objectDecoder) {
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = null;
    }
    if (objectDecoder == null) {
      objectDecoder = null;
    }
    this.settings.exceptionOnInvalidType = exceptionOnInvalidType;
    this.settings.objectDecoder = objectDecoder;
  };

  Inline.parse = function(value, exceptionOnInvalidType, objectDecoder) {
    var context, result;
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = false;
    }
    if (objectDecoder == null) {
      objectDecoder = null;
    }
    this.settings.exceptionOnInvalidType = exceptionOnInvalidType;
    this.settings.objectDecoder = objectDecoder;
    if (value == null) {
      return '';
    }
    value = Utils.trim(value);
    if (0 === value.length) {
      return '';
    }
    context = {
      exceptionOnInvalidType: exceptionOnInvalidType,
      objectDecoder: objectDecoder,
      i: 0
    };
    switch (value.charAt(0)) {
      case '[':
        result = this.parseSequence(value, context);
        ++context.i;
        break;
      case '{':
        result = this.parseMapping(value, context);
        ++context.i;
        break;
      default:
        result = this.parseScalar(value, null, ['"', "'"], context);
    }
    if (this.PATTERN_TRAILING_COMMENTS.replace(value.slice(context.i), '') !== '') {
      throw new ParseException('Unexpected characters near "' + value.slice(context.i) + '".');
    }
    return result;
  };

  Inline.dump = function(value, exceptionOnInvalidType, objectEncoder) {
    var ref, result, type;
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = false;
    }
    if (objectEncoder == null) {
      objectEncoder = null;
    }
    if (value == null) {
      return 'null';
    }
    type = typeof value;
    if (type === 'object') {
      if (value instanceof Date) {
        return value.toISOString();
      } else if (objectEncoder != null) {
        result = objectEncoder(value);
        if (typeof result === 'string' || (result != null)) {
          return result;
        }
      }
      return this.dumpObject(value);
    }
    if (type === 'boolean') {
      return (value ? 'true' : 'false');
    }
    if (Utils.isDigits(value)) {
      return (type === 'string' ? "'" + value + "'" : String(parseInt(value)));
    }
    if (Utils.isNumeric(value)) {
      return (type === 'string' ? "'" + value + "'" : String(parseFloat(value)));
    }
    if (type === 'number') {
      return (value === Infinity ? '.Inf' : (value === -Infinity ? '-.Inf' : (isNaN(value) ? '.NaN' : value)));
    }
    if (Escaper.requiresDoubleQuoting(value)) {
      return Escaper.escapeWithDoubleQuotes(value);
    }
    if (Escaper.requiresSingleQuoting(value)) {
      return Escaper.escapeWithSingleQuotes(value);
    }
    if ('' === value) {
      return '""';
    }
    if (Utils.PATTERN_DATE.test(value)) {
      return "'" + value + "'";
    }
    if ((ref = value.toLowerCase()) === 'null' || ref === '~' || ref === 'true' || ref === 'false') {
      return "'" + value + "'";
    }
    return value;
  };

  Inline.dumpObject = function(value, exceptionOnInvalidType, objectSupport) {
    var j, key, len1, output, val;
    if (objectSupport == null) {
      objectSupport = null;
    }
    if (value instanceof Array) {
      output = [];
      for (j = 0, len1 = value.length; j < len1; j++) {
        val = value[j];
        output.push(this.dump(val));
      }
      return '[' + output.join(', ') + ']';
    } else {
      output = [];
      for (key in value) {
        val = value[key];
        output.push(this.dump(key) + ': ' + this.dump(val));
      }
      return '{' + output.join(', ') + '}';
    }
  };

  Inline.parseScalar = function(scalar, delimiters, stringDelimiters, context, evaluate) {
    var i, joinedDelimiters, match, output, pattern, ref, ref1, strpos, tmp;
    if (delimiters == null) {
      delimiters = null;
    }
    if (stringDelimiters == null) {
      stringDelimiters = ['"', "'"];
    }
    if (context == null) {
      context = null;
    }
    if (evaluate == null) {
      evaluate = true;
    }
    if (context == null) {
      context = {
        exceptionOnInvalidType: this.settings.exceptionOnInvalidType,
        objectDecoder: this.settings.objectDecoder,
        i: 0
      };
    }
    i = context.i;
    if (ref = scalar.charAt(i), indexOf.call(stringDelimiters, ref) >= 0) {
      output = this.parseQuotedScalar(scalar, context);
      i = context.i;
      if (delimiters != null) {
        tmp = Utils.ltrim(scalar.slice(i), ' ');
        if (!(ref1 = tmp.charAt(0), indexOf.call(delimiters, ref1) >= 0)) {
          throw new ParseException('Unexpected characters (' + scalar.slice(i) + ').');
        }
      }
    } else {
      if (!delimiters) {
        output = scalar.slice(i);
        i += output.length;
        strpos = output.indexOf(' #');
        if (strpos !== -1) {
          output = Utils.rtrim(output.slice(0, strpos));
        }
      } else {
        joinedDelimiters = delimiters.join('|');
        pattern = this.PATTERN_SCALAR_BY_DELIMITERS[joinedDelimiters];
        if (pattern == null) {
          pattern = new Pattern('^(.+?)(' + joinedDelimiters + ')');
          this.PATTERN_SCALAR_BY_DELIMITERS[joinedDelimiters] = pattern;
        }
        if (match = pattern.exec(scalar.slice(i))) {
          output = match[1];
          i += output.length;
        } else {
          throw new ParseException('Malformed inline YAML string (' + scalar + ').');
        }
      }
      if (evaluate) {
        output = this.evaluateScalar(output, context);
      }
    }
    context.i = i;
    return output;
  };

  Inline.parseQuotedScalar = function(scalar, context) {
    var i, match, output;
    i = context.i;
    if (!(match = this.PATTERN_QUOTED_SCALAR.exec(scalar.slice(i)))) {
      throw new ParseMore('Malformed inline YAML string (' + scalar.slice(i) + ').');
    }
    output = match[0].substr(1, match[0].length - 2);
    if ('"' === scalar.charAt(i)) {
      output = Unescaper.unescapeDoubleQuotedString(output);
    } else {
      output = Unescaper.unescapeSingleQuotedString(output);
    }
    i += match[0].length;
    context.i = i;
    return output;
  };

  Inline.parseSequence = function(sequence, context) {
    var e, error, i, isQuoted, len, output, ref, value;
    output = [];
    len = sequence.length;
    i = context.i;
    i += 1;
    while (i < len) {
      context.i = i;
      switch (sequence.charAt(i)) {
        case '[':
          output.push(this.parseSequence(sequence, context));
          i = context.i;
          break;
        case '{':
          output.push(this.parseMapping(sequence, context));
          i = context.i;
          break;
        case ']':
          return output;
        case ',':
        case ' ':
        case "\n":
          break;
        default:
          isQuoted = ((ref = sequence.charAt(i)) === '"' || ref === "'");
          value = this.parseScalar(sequence, [',', ']'], ['"', "'"], context);
          i = context.i;
          if (!isQuoted && typeof value === 'string' && (value.indexOf(': ') !== -1 || value.indexOf(":\n") !== -1)) {
            try {
              value = this.parseMapping('{' + value + '}');
            } catch (error) {
              e = error;
            }
          }
          output.push(value);
          --i;
      }
      ++i;
    }
    throw new ParseMore('Malformed inline YAML string ' + sequence);
  };

  Inline.parseMapping = function(mapping, context) {
    var done, i, key, len, output, shouldContinueWhileLoop, value;
    output = {};
    len = mapping.length;
    i = context.i;
    i += 1;
    shouldContinueWhileLoop = false;
    while (i < len) {
      context.i = i;
      switch (mapping.charAt(i)) {
        case ' ':
        case ',':
        case "\n":
          ++i;
          context.i = i;
          shouldContinueWhileLoop = true;
          break;
        case '}':
          return output;
      }
      if (shouldContinueWhileLoop) {
        shouldContinueWhileLoop = false;
        continue;
      }
      key = this.parseScalar(mapping, [':', ' ', "\n"], ['"', "'"], context, false);
      i = context.i;
      done = false;
      while (i < len) {
        context.i = i;
        switch (mapping.charAt(i)) {
          case '[':
            value = this.parseSequence(mapping, context);
            i = context.i;
            if (output[key] === void 0) {
              output[key] = value;
            }
            done = true;
            break;
          case '{':
            value = this.parseMapping(mapping, context);
            i = context.i;
            if (output[key] === void 0) {
              output[key] = value;
            }
            done = true;
            break;
          case ':':
          case ' ':
          case "\n":
            break;
          default:
            value = this.parseScalar(mapping, [',', '}'], ['"', "'"], context);
            i = context.i;
            if (output[key] === void 0) {
              output[key] = value;
            }
            done = true;
            --i;
        }
        ++i;
        if (done) {
          break;
        }
      }
    }
    throw new ParseMore('Malformed inline YAML string ' + mapping);
  };

  Inline.evaluateScalar = function(scalar, context) {
    var cast, date, exceptionOnInvalidType, firstChar, firstSpace, firstWord, objectDecoder, raw, scalarLower, subValue, trimmedScalar;
    scalar = Utils.trim(scalar);
    scalarLower = scalar.toLowerCase();
    switch (scalarLower) {
      case 'null':
      case '':
      case '~':
        return null;
      case 'true':
        return true;
      case 'false':
        return false;
      case '.inf':
        return Infinity;
      case '.nan':
        return NaN;
      case '-.inf':
        return Infinity;
      default:
        firstChar = scalarLower.charAt(0);
        switch (firstChar) {
          case '!':
            firstSpace = scalar.indexOf(' ');
            if (firstSpace === -1) {
              firstWord = scalarLower;
            } else {
              firstWord = scalarLower.slice(0, firstSpace);
            }
            switch (firstWord) {
              case '!':
                if (firstSpace !== -1) {
                  return parseInt(this.parseScalar(scalar.slice(2)));
                }
                return null;
              case '!str':
                return Utils.ltrim(scalar.slice(4));
              case '!!str':
                return Utils.ltrim(scalar.slice(5));
              case '!!int':
                return parseInt(this.parseScalar(scalar.slice(5)));
              case '!!bool':
                return Utils.parseBoolean(this.parseScalar(scalar.slice(6)), false);
              case '!!float':
                return parseFloat(this.parseScalar(scalar.slice(7)));
              case '!!timestamp':
                return Utils.stringToDate(Utils.ltrim(scalar.slice(11)));
              default:
                if (context == null) {
                  context = {
                    exceptionOnInvalidType: this.settings.exceptionOnInvalidType,
                    objectDecoder: this.settings.objectDecoder,
                    i: 0
                  };
                }
                objectDecoder = context.objectDecoder, exceptionOnInvalidType = context.exceptionOnInvalidType;
                if (objectDecoder) {
                  trimmedScalar = Utils.rtrim(scalar);
                  firstSpace = trimmedScalar.indexOf(' ');
                  if (firstSpace === -1) {
                    return objectDecoder(trimmedScalar, null);
                  } else {
                    subValue = Utils.ltrim(trimmedScalar.slice(firstSpace + 1));
                    if (!(subValue.length > 0)) {
                      subValue = null;
                    }
                    return objectDecoder(trimmedScalar.slice(0, firstSpace), subValue);
                  }
                }
                if (exceptionOnInvalidType) {
                  throw new ParseException('Custom object support when parsing a YAML file has been disabled.');
                }
                return null;
            }
            break;
          case '0':
            if ('0x' === scalar.slice(0, 2)) {
              return Utils.hexDec(scalar);
            } else if (Utils.isDigits(scalar)) {
              return Utils.octDec(scalar);
            } else if (Utils.isNumeric(scalar)) {
              return parseFloat(scalar);
            } else {
              return scalar;
            }
            break;
          case '+':
            if (Utils.isDigits(scalar)) {
              raw = scalar;
              cast = parseInt(raw);
              if (raw === String(cast)) {
                return cast;
              } else {
                return raw;
              }
            } else if (Utils.isNumeric(scalar)) {
              return parseFloat(scalar);
            } else if (this.PATTERN_THOUSAND_NUMERIC_SCALAR.test(scalar)) {
              return parseFloat(scalar.replace(',', ''));
            }
            return scalar;
          case '-':
            if (Utils.isDigits(scalar.slice(1))) {
              if ('0' === scalar.charAt(1)) {
                return -Utils.octDec(scalar.slice(1));
              } else {
                raw = scalar.slice(1);
                cast = parseInt(raw);
                if (raw === String(cast)) {
                  return -cast;
                } else {
                  return -raw;
                }
              }
            } else if (Utils.isNumeric(scalar)) {
              return parseFloat(scalar);
            } else if (this.PATTERN_THOUSAND_NUMERIC_SCALAR.test(scalar)) {
              return parseFloat(scalar.replace(',', ''));
            }
            return scalar;
          default:
            if (date = Utils.stringToDate(scalar)) {
              return date;
            } else if (Utils.isNumeric(scalar)) {
              return parseFloat(scalar);
            } else if (this.PATTERN_THOUSAND_NUMERIC_SCALAR.test(scalar)) {
              return parseFloat(scalar.replace(',', ''));
            }
            return scalar;
        }
    }
  };

  return Inline;

})();

module.exports = Inline;


},{"./Escaper":2,"./Exception/DumpException":3,"./Exception/ParseException":4,"./Exception/ParseMore":5,"./Pattern":8,"./Unescaper":9,"./Utils":10}],7:[function(require,module,exports){
var Inline, ParseException, ParseMore, Parser, Pattern, Utils;

Inline = require('./Inline');

Pattern = require('./Pattern');

Utils = require('./Utils');

ParseException = require('./Exception/ParseException');

ParseMore = require('./Exception/ParseMore');

Parser = (function() {
  Parser.prototype.PATTERN_FOLDED_SCALAR_ALL = new Pattern('^(?:(?<type>![^\\|>]*)\\s+)?(?<separator>\\||>)(?<modifiers>\\+|\\-|\\d+|\\+\\d+|\\-\\d+|\\d+\\+|\\d+\\-)?(?<comments> +#.*)?$');

  Parser.prototype.PATTERN_FOLDED_SCALAR_END = new Pattern('(?<separator>\\||>)(?<modifiers>\\+|\\-|\\d+|\\+\\d+|\\-\\d+|\\d+\\+|\\d+\\-)?(?<comments> +#.*)?$');

  Parser.prototype.PATTERN_SEQUENCE_ITEM = new Pattern('^\\-((?<leadspaces>\\s+)(?<value>.+?))?\\s*$');

  Parser.prototype.PATTERN_ANCHOR_VALUE = new Pattern('^&(?<ref>[^ ]+) *(?<value>.*)');

  Parser.prototype.PATTERN_COMPACT_NOTATION = new Pattern('^(?<key>' + Inline.REGEX_QUOTED_STRING + '|[^ \'"\\{\\[].*?) *\\:(\\s+(?<value>.+?))?\\s*$');

  Parser.prototype.PATTERN_MAPPING_ITEM = new Pattern('^(?<key>' + Inline.REGEX_QUOTED_STRING + '|[^ \'"\\[\\{].*?) *\\:(\\s+(?<value>.+?))?\\s*$');

  Parser.prototype.PATTERN_DECIMAL = new Pattern('\\d+');

  Parser.prototype.PATTERN_INDENT_SPACES = new Pattern('^ +');

  Parser.prototype.PATTERN_TRAILING_LINES = new Pattern('(\n*)$');

  Parser.prototype.PATTERN_YAML_HEADER = new Pattern('^\\%YAML[: ][\\d\\.]+.*\n', 'm');

  Parser.prototype.PATTERN_LEADING_COMMENTS = new Pattern('^(\\#.*?\n)+', 'm');

  Parser.prototype.PATTERN_DOCUMENT_MARKER_START = new Pattern('^\\-\\-\\-.*?\n', 'm');

  Parser.prototype.PATTERN_DOCUMENT_MARKER_END = new Pattern('^\\.\\.\\.\\s*$', 'm');

  Parser.prototype.PATTERN_FOLDED_SCALAR_BY_INDENTATION = {};

  Parser.prototype.CONTEXT_NONE = 0;

  Parser.prototype.CONTEXT_SEQUENCE = 1;

  Parser.prototype.CONTEXT_MAPPING = 2;

  function Parser(offset) {
    this.offset = offset != null ? offset : 0;
    this.lines = [];
    this.currentLineNb = -1;
    this.currentLine = '';
    this.refs = {};
  }

  Parser.prototype.parse = function(value, exceptionOnInvalidType, objectDecoder) {
    var alias, allowOverwrite, block, c, context, data, e, error, error1, error2, first, i, indent, isRef, j, k, key, l, lastKey, len, len1, len2, len3, lineCount, m, matches, mergeNode, n, name, parsed, parsedItem, parser, ref, ref1, ref2, refName, refValue, val, values;
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = false;
    }
    if (objectDecoder == null) {
      objectDecoder = null;
    }
    this.currentLineNb = -1;
    this.currentLine = '';
    this.lines = this.cleanup(value).split("\n");
    data = null;
    context = this.CONTEXT_NONE;
    allowOverwrite = false;
    while (this.moveToNextLine()) {
      if (this.isCurrentLineEmpty()) {
        continue;
      }
      if ("\t" === this.currentLine[0]) {
        throw new ParseException('A YAML file cannot contain tabs as indentation.', this.getRealCurrentLineNb() + 1, this.currentLine);
      }
      isRef = mergeNode = false;
      if (values = this.PATTERN_SEQUENCE_ITEM.exec(this.currentLine)) {
        if (this.CONTEXT_MAPPING === context) {
          throw new ParseException('You cannot define a sequence item when in a mapping');
        }
        context = this.CONTEXT_SEQUENCE;
        if (data == null) {
          data = [];
        }
        if ((values.value != null) && (matches = this.PATTERN_ANCHOR_VALUE.exec(values.value))) {
          isRef = matches.ref;
          values.value = matches.value;
        }
        if (!(values.value != null) || '' === Utils.trim(values.value, ' ') || Utils.ltrim(values.value, ' ').indexOf('#') === 0) {
          if (this.currentLineNb < this.lines.length - 1 && !this.isNextLineUnIndentedCollection()) {
            c = this.getRealCurrentLineNb() + 1;
            parser = new Parser(c);
            parser.refs = this.refs;
            data.push(parser.parse(this.getNextEmbedBlock(null, true), exceptionOnInvalidType, objectDecoder));
          } else {
            data.push(null);
          }
        } else {
          if (((ref = values.leadspaces) != null ? ref.length : void 0) && (matches = this.PATTERN_COMPACT_NOTATION.exec(values.value))) {
            c = this.getRealCurrentLineNb();
            parser = new Parser(c);
            parser.refs = this.refs;
            block = values.value;
            indent = this.getCurrentLineIndentation();
            if (this.isNextLineIndented(false)) {
              block += "\n" + this.getNextEmbedBlock(indent + values.leadspaces.length + 1, true);
            }
            data.push(parser.parse(block, exceptionOnInvalidType, objectDecoder));
          } else {
            data.push(this.parseValue(values.value, exceptionOnInvalidType, objectDecoder));
          }
        }
      } else if ((values = this.PATTERN_MAPPING_ITEM.exec(this.currentLine)) && values.key.indexOf(' #') === -1) {
        if (this.CONTEXT_SEQUENCE === context) {
          throw new ParseException('You cannot define a mapping item when in a sequence');
        }
        context = this.CONTEXT_MAPPING;
        if (data == null) {
          data = {};
        }
        Inline.configure(exceptionOnInvalidType, objectDecoder);
        try {
          key = Inline.parseScalar(values.key);
        } catch (error) {
          e = error;
          e.parsedLine = this.getRealCurrentLineNb() + 1;
          e.snippet = this.currentLine;
          throw e;
        }
        if ('<<' === key) {
          mergeNode = true;
          allowOverwrite = true;
          if (((ref1 = values.value) != null ? ref1.indexOf('*') : void 0) === 0) {
            refName = values.value.slice(1);
            if (this.refs[refName] == null) {
              throw new ParseException('Reference "' + refName + '" does not exist.', this.getRealCurrentLineNb() + 1, this.currentLine);
            }
            refValue = this.refs[refName];
            if (typeof refValue !== 'object') {
              throw new ParseException('YAML merge keys used with a scalar value instead of an object.', this.getRealCurrentLineNb() + 1, this.currentLine);
            }
            if (refValue instanceof Array) {
              for (i = j = 0, len = refValue.length; j < len; i = ++j) {
                value = refValue[i];
                if (data[name = String(i)] == null) {
                  data[name] = value;
                }
              }
            } else {
              for (key in refValue) {
                value = refValue[key];
                if (data[key] == null) {
                  data[key] = value;
                }
              }
            }
          } else {
            if ((values.value != null) && values.value !== '') {
              value = values.value;
            } else {
              value = this.getNextEmbedBlock();
            }
            c = this.getRealCurrentLineNb() + 1;
            parser = new Parser(c);
            parser.refs = this.refs;
            parsed = parser.parse(value, exceptionOnInvalidType);
            if (typeof parsed !== 'object') {
              throw new ParseException('YAML merge keys used with a scalar value instead of an object.', this.getRealCurrentLineNb() + 1, this.currentLine);
            }
            if (parsed instanceof Array) {
              for (l = 0, len1 = parsed.length; l < len1; l++) {
                parsedItem = parsed[l];
                if (typeof parsedItem !== 'object') {
                  throw new ParseException('Merge items must be objects.', this.getRealCurrentLineNb() + 1, parsedItem);
                }
                if (parsedItem instanceof Array) {
                  for (i = m = 0, len2 = parsedItem.length; m < len2; i = ++m) {
                    value = parsedItem[i];
                    k = String(i);
                    if (!data.hasOwnProperty(k)) {
                      data[k] = value;
                    }
                  }
                } else {
                  for (key in parsedItem) {
                    value = parsedItem[key];
                    if (!data.hasOwnProperty(key)) {
                      data[key] = value;
                    }
                  }
                }
              }
            } else {
              for (key in parsed) {
                value = parsed[key];
                if (!data.hasOwnProperty(key)) {
                  data[key] = value;
                }
              }
            }
          }
        } else if ((values.value != null) && (matches = this.PATTERN_ANCHOR_VALUE.exec(values.value))) {
          isRef = matches.ref;
          values.value = matches.value;
        }
        if (mergeNode) {

        } else if (!(values.value != null) || '' === Utils.trim(values.value, ' ') || Utils.ltrim(values.value, ' ').indexOf('#') === 0) {
          if (!(this.isNextLineIndented()) && !(this.isNextLineUnIndentedCollection())) {
            if (allowOverwrite || data[key] === void 0) {
              data[key] = null;
            }
          } else {
            c = this.getRealCurrentLineNb() + 1;
            parser = new Parser(c);
            parser.refs = this.refs;
            val = parser.parse(this.getNextEmbedBlock(), exceptionOnInvalidType, objectDecoder);
            if (allowOverwrite || data[key] === void 0) {
              data[key] = val;
            }
          }
        } else {
          val = this.parseValue(values.value, exceptionOnInvalidType, objectDecoder);
          if (allowOverwrite || data[key] === void 0) {
            data[key] = val;
          }
        }
      } else {
        lineCount = this.lines.length;
        if (1 === lineCount || (2 === lineCount && Utils.isEmpty(this.lines[1]))) {
          try {
            value = Inline.parse(this.lines[0], exceptionOnInvalidType, objectDecoder);
          } catch (error1) {
            e = error1;
            e.parsedLine = this.getRealCurrentLineNb() + 1;
            e.snippet = this.currentLine;
            throw e;
          }
          if (typeof value === 'object') {
            if (value instanceof Array) {
              first = value[0];
            } else {
              for (key in value) {
                first = value[key];
                break;
              }
            }
            if (typeof first === 'string' && first.indexOf('*') === 0) {
              data = [];
              for (n = 0, len3 = value.length; n < len3; n++) {
                alias = value[n];
                data.push(this.refs[alias.slice(1)]);
              }
              value = data;
            }
          }
          return value;
        } else if ((ref2 = Utils.ltrim(value).charAt(0)) === '[' || ref2 === '{') {
          try {
            return Inline.parse(value, exceptionOnInvalidType, objectDecoder);
          } catch (error2) {
            e = error2;
            e.parsedLine = this.getRealCurrentLineNb() + 1;
            e.snippet = this.currentLine;
            throw e;
          }
        }
        throw new ParseException('Unable to parse.', this.getRealCurrentLineNb() + 1, this.currentLine);
      }
      if (isRef) {
        if (data instanceof Array) {
          this.refs[isRef] = data[data.length - 1];
        } else {
          lastKey = null;
          for (key in data) {
            lastKey = key;
          }
          this.refs[isRef] = data[lastKey];
        }
      }
    }
    if (Utils.isEmpty(data)) {
      return null;
    } else {
      return data;
    }
  };

  Parser.prototype.getRealCurrentLineNb = function() {
    return this.currentLineNb + this.offset;
  };

  Parser.prototype.getCurrentLineIndentation = function() {
    return this.currentLine.length - Utils.ltrim(this.currentLine, ' ').length;
  };

  Parser.prototype.getNextEmbedBlock = function(indentation, includeUnindentedCollection) {
    var data, indent, isItUnindentedCollection, newIndent, removeComments, removeCommentsPattern, unindentedEmbedBlock;
    if (indentation == null) {
      indentation = null;
    }
    if (includeUnindentedCollection == null) {
      includeUnindentedCollection = false;
    }
    this.moveToNextLine();
    if (indentation == null) {
      newIndent = this.getCurrentLineIndentation();
      unindentedEmbedBlock = this.isStringUnIndentedCollectionItem(this.currentLine);
      if (!(this.isCurrentLineEmpty()) && 0 === newIndent && !unindentedEmbedBlock) {
        throw new ParseException('Indentation problem.', this.getRealCurrentLineNb() + 1, this.currentLine);
      }
    } else {
      newIndent = indentation;
    }
    data = [this.currentLine.slice(newIndent)];
    if (!includeUnindentedCollection) {
      isItUnindentedCollection = this.isStringUnIndentedCollectionItem(this.currentLine);
    }
    removeCommentsPattern = this.PATTERN_FOLDED_SCALAR_END;
    removeComments = !removeCommentsPattern.test(this.currentLine);
    while (this.moveToNextLine()) {
      indent = this.getCurrentLineIndentation();
      if (indent === newIndent) {
        removeComments = !removeCommentsPattern.test(this.currentLine);
      }
      if (removeComments && this.isCurrentLineComment()) {
        continue;
      }
      if (this.isCurrentLineBlank()) {
        data.push(this.currentLine.slice(newIndent));
        continue;
      }
      if (isItUnindentedCollection && !this.isStringUnIndentedCollectionItem(this.currentLine) && indent === newIndent) {
        this.moveToPreviousLine();
        break;
      }
      if (indent >= newIndent) {
        data.push(this.currentLine.slice(newIndent));
      } else if (Utils.ltrim(this.currentLine).charAt(0) === '#') {

      } else if (0 === indent) {
        this.moveToPreviousLine();
        break;
      } else {
        throw new ParseException('Indentation problem.', this.getRealCurrentLineNb() + 1, this.currentLine);
      }
    }
    return data.join("\n");
  };

  Parser.prototype.moveToNextLine = function() {
    if (this.currentLineNb >= this.lines.length - 1) {
      return false;
    }
    this.currentLine = this.lines[++this.currentLineNb];
    return true;
  };

  Parser.prototype.moveToPreviousLine = function() {
    this.currentLine = this.lines[--this.currentLineNb];
  };

  Parser.prototype.parseValue = function(value, exceptionOnInvalidType, objectDecoder) {
    var e, error, foldedIndent, matches, modifiers, pos, ref, ref1, val;
    if (0 === value.indexOf('*')) {
      pos = value.indexOf('#');
      if (pos !== -1) {
        value = value.substr(1, pos - 2);
      } else {
        value = value.slice(1);
      }
      if (this.refs[value] === void 0) {
        throw new ParseException('Reference "' + value + '" does not exist.', this.currentLine);
      }
      return this.refs[value];
    }
    if (matches = this.PATTERN_FOLDED_SCALAR_ALL.exec(value)) {
      modifiers = (ref = matches.modifiers) != null ? ref : '';
      foldedIndent = Math.abs(parseInt(modifiers));
      if (isNaN(foldedIndent)) {
        foldedIndent = 0;
      }
      val = this.parseFoldedScalar(matches.separator, this.PATTERN_DECIMAL.replace(modifiers, ''), foldedIndent);
      if (matches.type != null) {
        Inline.configure(exceptionOnInvalidType, objectDecoder);
        return Inline.parseScalar(matches.type + ' ' + val);
      } else {
        return val;
      }
    }
    if ((ref1 = value.charAt(0)) === '[' || ref1 === '{' || ref1 === '"' || ref1 === "'") {
      while (true) {
        try {
          return Inline.parse(value, exceptionOnInvalidType, objectDecoder);
        } catch (error) {
          e = error;
          if (e instanceof ParseMore && this.moveToNextLine()) {
            value += "\n" + Utils.trim(this.currentLine, ' ');
          } else {
            e.parsedLine = this.getRealCurrentLineNb() + 1;
            e.snippet = this.currentLine;
            throw e;
          }
        }
      }
    } else {
      if (this.isNextLineIndented()) {
        value += "\n" + this.getNextEmbedBlock();
      }
      return Inline.parse(value, exceptionOnInvalidType, objectDecoder);
    }
  };

  Parser.prototype.parseFoldedScalar = function(separator, indicator, indentation) {
    var isCurrentLineBlank, j, len, line, matches, newText, notEOF, pattern, ref, text;
    if (indicator == null) {
      indicator = '';
    }
    if (indentation == null) {
      indentation = 0;
    }
    notEOF = this.moveToNextLine();
    if (!notEOF) {
      return '';
    }
    isCurrentLineBlank = this.isCurrentLineBlank();
    text = '';
    while (notEOF && isCurrentLineBlank) {
      if (notEOF = this.moveToNextLine()) {
        text += "\n";
        isCurrentLineBlank = this.isCurrentLineBlank();
      }
    }
    if (0 === indentation) {
      if (matches = this.PATTERN_INDENT_SPACES.exec(this.currentLine)) {
        indentation = matches[0].length;
      }
    }
    if (indentation > 0) {
      pattern = this.PATTERN_FOLDED_SCALAR_BY_INDENTATION[indentation];
      if (pattern == null) {
        pattern = new Pattern('^ {' + indentation + '}(.*)$');
        Parser.prototype.PATTERN_FOLDED_SCALAR_BY_INDENTATION[indentation] = pattern;
      }
      while (notEOF && (isCurrentLineBlank || (matches = pattern.exec(this.currentLine)))) {
        if (isCurrentLineBlank) {
          text += this.currentLine.slice(indentation);
        } else {
          text += matches[1];
        }
        if (notEOF = this.moveToNextLine()) {
          text += "\n";
          isCurrentLineBlank = this.isCurrentLineBlank();
        }
      }
    } else if (notEOF) {
      text += "\n";
    }
    if (notEOF) {
      this.moveToPreviousLine();
    }
    if ('>' === separator) {
      newText = '';
      ref = text.split("\n");
      for (j = 0, len = ref.length; j < len; j++) {
        line = ref[j];
        if (line.length === 0 || line.charAt(0) === ' ') {
          newText = Utils.rtrim(newText, ' ') + line + "\n";
        } else {
          newText += line + ' ';
        }
      }
      text = newText;
    }
    if ('+' !== indicator) {
      text = Utils.rtrim(text);
    }
    if ('' === indicator) {
      text = this.PATTERN_TRAILING_LINES.replace(text, "\n");
    } else if ('-' === indicator) {
      text = this.PATTERN_TRAILING_LINES.replace(text, '');
    }
    return text;
  };

  Parser.prototype.isNextLineIndented = function(ignoreComments) {
    var EOF, currentIndentation, ret;
    if (ignoreComments == null) {
      ignoreComments = true;
    }
    currentIndentation = this.getCurrentLineIndentation();
    EOF = !this.moveToNextLine();
    if (ignoreComments) {
      while (!EOF && this.isCurrentLineEmpty()) {
        EOF = !this.moveToNextLine();
      }
    } else {
      while (!EOF && this.isCurrentLineBlank()) {
        EOF = !this.moveToNextLine();
      }
    }
    if (EOF) {
      return false;
    }
    ret = false;
    if (this.getCurrentLineIndentation() > currentIndentation) {
      ret = true;
    }
    this.moveToPreviousLine();
    return ret;
  };

  Parser.prototype.isCurrentLineEmpty = function() {
    var trimmedLine;
    trimmedLine = Utils.trim(this.currentLine, ' ');
    return trimmedLine.length === 0 || trimmedLine.charAt(0) === '#';
  };

  Parser.prototype.isCurrentLineBlank = function() {
    return '' === Utils.trim(this.currentLine, ' ');
  };

  Parser.prototype.isCurrentLineComment = function() {
    var ltrimmedLine;
    ltrimmedLine = Utils.ltrim(this.currentLine, ' ');
    return ltrimmedLine.charAt(0) === '#';
  };

  Parser.prototype.cleanup = function(value) {
    var count, i, indent, j, l, len, len1, line, lines, ref, ref1, ref2, smallestIndent, trimmedValue;
    if (value.indexOf("\r") !== -1) {
      value = value.split("\r\n").join("\n").split("\r").join("\n");
    }
    count = 0;
    ref = this.PATTERN_YAML_HEADER.replaceAll(value, ''), value = ref[0], count = ref[1];
    this.offset += count;
    ref1 = this.PATTERN_LEADING_COMMENTS.replaceAll(value, '', 1), trimmedValue = ref1[0], count = ref1[1];
    if (count === 1) {
      this.offset += Utils.subStrCount(value, "\n") - Utils.subStrCount(trimmedValue, "\n");
      value = trimmedValue;
    }
    ref2 = this.PATTERN_DOCUMENT_MARKER_START.replaceAll(value, '', 1), trimmedValue = ref2[0], count = ref2[1];
    if (count === 1) {
      this.offset += Utils.subStrCount(value, "\n") - Utils.subStrCount(trimmedValue, "\n");
      value = trimmedValue;
      value = this.PATTERN_DOCUMENT_MARKER_END.replace(value, '');
    }
    lines = value.split("\n");
    smallestIndent = -1;
    for (j = 0, len = lines.length; j < len; j++) {
      line = lines[j];
      if (Utils.trim(line, ' ').length === 0) {
        continue;
      }
      indent = line.length - Utils.ltrim(line).length;
      if (smallestIndent === -1 || indent < smallestIndent) {
        smallestIndent = indent;
      }
    }
    if (smallestIndent > 0) {
      for (i = l = 0, len1 = lines.length; l < len1; i = ++l) {
        line = lines[i];
        lines[i] = line.slice(smallestIndent);
      }
      value = lines.join("\n");
    }
    return value;
  };

  Parser.prototype.isNextLineUnIndentedCollection = function(currentIndentation) {
    var notEOF, ret;
    if (currentIndentation == null) {
      currentIndentation = null;
    }
    if (currentIndentation == null) {
      currentIndentation = this.getCurrentLineIndentation();
    }
    notEOF = this.moveToNextLine();
    while (notEOF && this.isCurrentLineEmpty()) {
      notEOF = this.moveToNextLine();
    }
    if (false === notEOF) {
      return false;
    }
    ret = false;
    if (this.getCurrentLineIndentation() === currentIndentation && this.isStringUnIndentedCollectionItem(this.currentLine)) {
      ret = true;
    }
    this.moveToPreviousLine();
    return ret;
  };

  Parser.prototype.isStringUnIndentedCollectionItem = function() {
    return this.currentLine === '-' || this.currentLine.slice(0, 2) === '- ';
  };

  return Parser;

})();

module.exports = Parser;


},{"./Exception/ParseException":4,"./Exception/ParseMore":5,"./Inline":6,"./Pattern":8,"./Utils":10}],8:[function(require,module,exports){
var Pattern;

Pattern = (function() {
  Pattern.prototype.regex = null;

  Pattern.prototype.rawRegex = null;

  Pattern.prototype.cleanedRegex = null;

  Pattern.prototype.mapping = null;

  function Pattern(rawRegex, modifiers) {
    var _char, capturingBracketNumber, cleanedRegex, i, len, mapping, name, part, subChar;
    if (modifiers == null) {
      modifiers = '';
    }
    cleanedRegex = '';
    len = rawRegex.length;
    mapping = null;
    capturingBracketNumber = 0;
    i = 0;
    while (i < len) {
      _char = rawRegex.charAt(i);
      if (_char === '\\') {
        cleanedRegex += rawRegex.slice(i, +(i + 1) + 1 || 9e9);
        i++;
      } else if (_char === '(') {
        if (i < len - 2) {
          part = rawRegex.slice(i, +(i + 2) + 1 || 9e9);
          if (part === '(?:') {
            i += 2;
            cleanedRegex += part;
          } else if (part === '(?<') {
            capturingBracketNumber++;
            i += 2;
            name = '';
            while (i + 1 < len) {
              subChar = rawRegex.charAt(i + 1);
              if (subChar === '>') {
                cleanedRegex += '(';
                i++;
                if (name.length > 0) {
                  if (mapping == null) {
                    mapping = {};
                  }
                  mapping[name] = capturingBracketNumber;
                }
                break;
              } else {
                name += subChar;
              }
              i++;
            }
          } else {
            cleanedRegex += _char;
            capturingBracketNumber++;
          }
        } else {
          cleanedRegex += _char;
        }
      } else {
        cleanedRegex += _char;
      }
      i++;
    }
    this.rawRegex = rawRegex;
    this.cleanedRegex = cleanedRegex;
    this.regex = new RegExp(this.cleanedRegex, 'g' + modifiers.replace('g', ''));
    this.mapping = mapping;
  }

  Pattern.prototype.exec = function(str) {
    var index, matches, name, ref;
    this.regex.lastIndex = 0;
    matches = this.regex.exec(str);
    if (matches == null) {
      return null;
    }
    if (this.mapping != null) {
      ref = this.mapping;
      for (name in ref) {
        index = ref[name];
        matches[name] = matches[index];
      }
    }
    return matches;
  };

  Pattern.prototype.test = function(str) {
    this.regex.lastIndex = 0;
    return this.regex.test(str);
  };

  Pattern.prototype.replace = function(str, replacement) {
    this.regex.lastIndex = 0;
    return str.replace(this.regex, replacement);
  };

  Pattern.prototype.replaceAll = function(str, replacement, limit) {
    var count;
    if (limit == null) {
      limit = 0;
    }
    this.regex.lastIndex = 0;
    count = 0;
    while (this.regex.test(str) && (limit === 0 || count < limit)) {
      this.regex.lastIndex = 0;
      str = str.replace(this.regex, replacement);
      count++;
    }
    return [str, count];
  };

  return Pattern;

})();

module.exports = Pattern;


},{}],9:[function(require,module,exports){
var Pattern, Unescaper, Utils;

Utils = require('./Utils');

Pattern = require('./Pattern');

Unescaper = (function() {
  function Unescaper() {}

  Unescaper.PATTERN_ESCAPED_CHARACTER = new Pattern('\\\\([0abt\tnvfre "\\/\\\\N_LP]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})');

  Unescaper.unescapeSingleQuotedString = function(value) {
    return value.replace(/\'\'/g, '\'');
  };

  Unescaper.unescapeDoubleQuotedString = function(value) {
    if (this._unescapeCallback == null) {
      this._unescapeCallback = (function(_this) {
        return function(str) {
          return _this.unescapeCharacter(str);
        };
      })(this);
    }
    return this.PATTERN_ESCAPED_CHARACTER.replace(value, this._unescapeCallback);
  };

  Unescaper.unescapeCharacter = function(value) {
    var ch;
    ch = String.fromCharCode;
    switch (value.charAt(1)) {
      case '0':
        return ch(0);
      case 'a':
        return ch(7);
      case 'b':
        return ch(8);
      case 't':
        return "\t";
      case "\t":
        return "\t";
      case 'n':
        return "\n";
      case 'v':
        return ch(11);
      case 'f':
        return ch(12);
      case 'r':
        return ch(13);
      case 'e':
        return ch(27);
      case ' ':
        return ' ';
      case '"':
        return '"';
      case '/':
        return '/';
      case '\\':
        return '\\';
      case 'N':
        return ch(0x0085);
      case '_':
        return ch(0x00A0);
      case 'L':
        return ch(0x2028);
      case 'P':
        return ch(0x2029);
      case 'x':
        return Utils.utf8chr(Utils.hexDec(value.substr(2, 2)));
      case 'u':
        return Utils.utf8chr(Utils.hexDec(value.substr(2, 4)));
      case 'U':
        return Utils.utf8chr(Utils.hexDec(value.substr(2, 8)));
      default:
        return '';
    }
  };

  return Unescaper;

})();

module.exports = Unescaper;


},{"./Pattern":8,"./Utils":10}],10:[function(require,module,exports){
var Pattern, Utils,
  hasProp = {}.hasOwnProperty;

Pattern = require('./Pattern');

Utils = (function() {
  function Utils() {}

  Utils.REGEX_LEFT_TRIM_BY_CHAR = {};

  Utils.REGEX_RIGHT_TRIM_BY_CHAR = {};

  Utils.REGEX_SPACES = /\s+/g;

  Utils.REGEX_DIGITS = /^\d+$/;

  Utils.REGEX_OCTAL = /[^0-7]/gi;

  Utils.REGEX_HEXADECIMAL = /[^a-f0-9]/gi;

  Utils.PATTERN_DATE = new Pattern('^' + '(?<year>[0-9][0-9][0-9][0-9])' + '-(?<month>[0-9][0-9]?)' + '-(?<day>[0-9][0-9]?)' + '(?:(?:[Tt]|[ \t]+)' + '(?<hour>[0-9][0-9]?)' + ':(?<minute>[0-9][0-9])' + ':(?<second>[0-9][0-9])' + '(?:\.(?<fraction>[0-9]*))?' + '(?:[ \t]*(?<tz>Z|(?<tz_sign>[-+])(?<tz_hour>[0-9][0-9]?)' + '(?::(?<tz_minute>[0-9][0-9]))?))?)?' + '$', 'i');

  Utils.LOCAL_TIMEZONE_OFFSET = new Date().getTimezoneOffset() * 60 * 1000;

  Utils.trim = function(str, _char) {
    var regexLeft, regexRight;
    if (_char == null) {
      _char = '\\s';
    }
    regexLeft = this.REGEX_LEFT_TRIM_BY_CHAR[_char];
    if (regexLeft == null) {
      this.REGEX_LEFT_TRIM_BY_CHAR[_char] = regexLeft = new RegExp('^' + _char + '' + _char + '*');
    }
    regexLeft.lastIndex = 0;
    regexRight = this.REGEX_RIGHT_TRIM_BY_CHAR[_char];
    if (regexRight == null) {
      this.REGEX_RIGHT_TRIM_BY_CHAR[_char] = regexRight = new RegExp(_char + '' + _char + '*$');
    }
    regexRight.lastIndex = 0;
    return str.replace(regexLeft, '').replace(regexRight, '');
  };

  Utils.ltrim = function(str, _char) {
    var regexLeft;
    if (_char == null) {
      _char = '\\s';
    }
    regexLeft = this.REGEX_LEFT_TRIM_BY_CHAR[_char];
    if (regexLeft == null) {
      this.REGEX_LEFT_TRIM_BY_CHAR[_char] = regexLeft = new RegExp('^' + _char + '' + _char + '*');
    }
    regexLeft.lastIndex = 0;
    return str.replace(regexLeft, '');
  };

  Utils.rtrim = function(str, _char) {
    var regexRight;
    if (_char == null) {
      _char = '\\s';
    }
    regexRight = this.REGEX_RIGHT_TRIM_BY_CHAR[_char];
    if (regexRight == null) {
      this.REGEX_RIGHT_TRIM_BY_CHAR[_char] = regexRight = new RegExp(_char + '' + _char + '*$');
    }
    regexRight.lastIndex = 0;
    return str.replace(regexRight, '');
  };

  Utils.isEmpty = function(value) {
    return !value || value === '' || value === '0' || (value instanceof Array && value.length === 0) || this.isEmptyObject(value);
  };

  Utils.isEmptyObject = function(value) {
    var k;
    return value instanceof Object && ((function() {
      var results;
      results = [];
      for (k in value) {
        if (!hasProp.call(value, k)) continue;
        results.push(k);
      }
      return results;
    })()).length === 0;
  };

  Utils.subStrCount = function(string, subString, start, length) {
    var c, i, j, len, ref, sublen;
    c = 0;
    string = '' + string;
    subString = '' + subString;
    if (start != null) {
      string = string.slice(start);
    }
    if (length != null) {
      string = string.slice(0, length);
    }
    len = string.length;
    sublen = subString.length;
    for (i = j = 0, ref = len; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      if (subString === string.slice(i, sublen)) {
        c++;
        i += sublen - 1;
      }
    }
    return c;
  };

  Utils.isDigits = function(input) {
    this.REGEX_DIGITS.lastIndex = 0;
    return this.REGEX_DIGITS.test(input);
  };

  Utils.octDec = function(input) {
    this.REGEX_OCTAL.lastIndex = 0;
    return parseInt((input + '').replace(this.REGEX_OCTAL, ''), 8);
  };

  Utils.hexDec = function(input) {
    this.REGEX_HEXADECIMAL.lastIndex = 0;
    input = this.trim(input);
    if ((input + '').slice(0, 2) === '0x') {
      input = (input + '').slice(2);
    }
    return parseInt((input + '').replace(this.REGEX_HEXADECIMAL, ''), 16);
  };

  Utils.utf8chr = function(c) {
    var ch;
    ch = String.fromCharCode;
    if (0x80 > (c %= 0x200000)) {
      return ch(c);
    }
    if (0x800 > c) {
      return ch(0xC0 | c >> 6) + ch(0x80 | c & 0x3F);
    }
    if (0x10000 > c) {
      return ch(0xE0 | c >> 12) + ch(0x80 | c >> 6 & 0x3F) + ch(0x80 | c & 0x3F);
    }
    return ch(0xF0 | c >> 18) + ch(0x80 | c >> 12 & 0x3F) + ch(0x80 | c >> 6 & 0x3F) + ch(0x80 | c & 0x3F);
  };

  Utils.parseBoolean = function(input, strict) {
    var lowerInput;
    if (strict == null) {
      strict = true;
    }
    if (typeof input === 'string') {
      lowerInput = input.toLowerCase();
      if (!strict) {
        if (lowerInput === 'no') {
          return false;
        }
      }
      if (lowerInput === '0') {
        return false;
      }
      if (lowerInput === 'false') {
        return false;
      }
      if (lowerInput === '') {
        return false;
      }
      return true;
    }
    return !!input;
  };

  Utils.isNumeric = function(input) {
    this.REGEX_SPACES.lastIndex = 0;
    return typeof input === 'number' || typeof input === 'string' && !isNaN(input) && input.replace(this.REGEX_SPACES, '') !== '';
  };

  Utils.stringToDate = function(str) {
    var date, day, fraction, hour, info, minute, month, second, tz_hour, tz_minute, tz_offset, year;
    if (!(str != null ? str.length : void 0)) {
      return null;
    }
    info = this.PATTERN_DATE.exec(str);
    if (!info) {
      return null;
    }
    year = parseInt(info.year, 10);
    month = parseInt(info.month, 10) - 1;
    day = parseInt(info.day, 10);
    if (info.hour == null) {
      date = new Date(Date.UTC(year, month, day));
      return date;
    }
    hour = parseInt(info.hour, 10);
    minute = parseInt(info.minute, 10);
    second = parseInt(info.second, 10);
    if (info.fraction != null) {
      fraction = info.fraction.slice(0, 3);
      while (fraction.length < 3) {
        fraction += '0';
      }
      fraction = parseInt(fraction, 10);
    } else {
      fraction = 0;
    }
    if (info.tz != null) {
      tz_hour = parseInt(info.tz_hour, 10);
      if (info.tz_minute != null) {
        tz_minute = parseInt(info.tz_minute, 10);
      } else {
        tz_minute = 0;
      }
      tz_offset = (tz_hour * 60 + tz_minute) * 60000;
      if ('-' === info.tz_sign) {
        tz_offset *= -1;
      }
    }
    date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (tz_offset) {
      date.setTime(date.getTime() - tz_offset);
    }
    return date;
  };

  Utils.strRepeat = function(str, number) {
    var i, res;
    res = '';
    i = 0;
    while (i < number) {
      res += str;
      i++;
    }
    return res;
  };

  Utils.getStringFromFile = function(path, callback) {
    var data, fs, j, len1, name, ref, req, xhr;
    if (callback == null) {
      callback = null;
    }
    xhr = null;
    if (typeof window !== "undefined" && window !== null) {
      if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
      } else if (window.ActiveXObject) {
        ref = ["Msxml2.XMLHTTP.6.0", "Msxml2.XMLHTTP.3.0", "Msxml2.XMLHTTP", "Microsoft.XMLHTTP"];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          name = ref[j];
          try {
            xhr = new ActiveXObject(name);
          } catch (undefined) {}
        }
      }
    }
    if (xhr != null) {
      if (callback != null) {
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
              return callback(xhr.responseText);
            } else {
              return callback(null);
            }
          }
        };
        xhr.open('GET', path, true);
        return xhr.send(null);
      } else {
        xhr.open('GET', path, false);
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0) {
          return xhr.responseText;
        }
        return null;
      }
    } else {
      req = require;
      fs = req('fs');
      if (callback != null) {
        return fs.readFile(path, function(err, data) {
          if (err) {
            return callback(null);
          } else {
            return callback(String(data));
          }
        });
      } else {
        data = fs.readFileSync(path);
        if (data != null) {
          return String(data);
        }
        return null;
      }
    }
  };

  return Utils;

})();

module.exports = Utils;


},{"./Pattern":8}],11:[function(require,module,exports){
var Dumper, Parser, Utils, Yaml;

Parser = require('./Parser');

Dumper = require('./Dumper');

Utils = require('./Utils');

Yaml = (function() {
  function Yaml() {}

  Yaml.parse = function(input, exceptionOnInvalidType, objectDecoder) {
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = false;
    }
    if (objectDecoder == null) {
      objectDecoder = null;
    }
    return new Parser().parse(input, exceptionOnInvalidType, objectDecoder);
  };

  Yaml.parseFile = function(path, callback, exceptionOnInvalidType, objectDecoder) {
    var input;
    if (callback == null) {
      callback = null;
    }
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = false;
    }
    if (objectDecoder == null) {
      objectDecoder = null;
    }
    if (callback != null) {
      return Utils.getStringFromFile(path, (function(_this) {
        return function(input) {
          var result;
          result = null;
          if (input != null) {
            result = _this.parse(input, exceptionOnInvalidType, objectDecoder);
          }
          callback(result);
        };
      })(this));
    } else {
      input = Utils.getStringFromFile(path);
      if (input != null) {
        return this.parse(input, exceptionOnInvalidType, objectDecoder);
      }
      return null;
    }
  };

  Yaml.dump = function(input, inline, indent, exceptionOnInvalidType, objectEncoder) {
    var yaml;
    if (inline == null) {
      inline = 2;
    }
    if (indent == null) {
      indent = 4;
    }
    if (exceptionOnInvalidType == null) {
      exceptionOnInvalidType = false;
    }
    if (objectEncoder == null) {
      objectEncoder = null;
    }
    yaml = new Dumper();
    yaml.indentation = indent;
    return yaml.dump(input, inline, 0, exceptionOnInvalidType, objectEncoder);
  };

  Yaml.stringify = function(input, inline, indent, exceptionOnInvalidType, objectEncoder) {
    return this.dump(input, inline, indent, exceptionOnInvalidType, objectEncoder);
  };

  Yaml.load = function(path, callback, exceptionOnInvalidType, objectDecoder) {
    return this.parseFile(path, callback, exceptionOnInvalidType, objectDecoder);
  };

  return Yaml;

})();

if (typeof window !== "undefined" && window !== null) {
  window.YAML = Yaml;
}

if (typeof window === "undefined" || window === null) {
  this.YAML = Yaml;
}

module.exports = Yaml;


},{"./Dumper":1,"./Parser":7,"./Utils":10}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9EdW1wZXIuY29mZmVlIiwic3JjL0VzY2FwZXIuY29mZmVlIiwic3JjL0V4Y2VwdGlvbi9EdW1wRXhjZXB0aW9uLmNvZmZlZSIsInNyYy9FeGNlcHRpb24vUGFyc2VFeGNlcHRpb24uY29mZmVlIiwic3JjL0V4Y2VwdGlvbi9QYXJzZU1vcmUuY29mZmVlIiwic3JjL0lubGluZS5jb2ZmZWUiLCJzcmMvUGFyc2VyLmNvZmZlZSIsInNyYy9QYXR0ZXJuLmNvZmZlZSIsInNyYy9VbmVzY2FwZXIuY29mZmVlIiwic3JjL1V0aWxzLmNvZmZlZSIsInNyYy9ZYW1sLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBLElBQUE7O0FBQUEsS0FBQSxHQUFVLE9BQUEsQ0FBUSxTQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsVUFBUjs7QUFJSjs7O0VBR0YsTUFBQyxDQUFBLFdBQUQsR0FBZ0I7O21CQWFoQixJQUFBLEdBQU0sU0FBQyxLQUFELEVBQVEsTUFBUixFQUFvQixNQUFwQixFQUFnQyxzQkFBaEMsRUFBZ0UsYUFBaEU7QUFDRixRQUFBOztNQURVLFNBQVM7OztNQUFHLFNBQVM7OztNQUFHLHlCQUF5Qjs7O01BQU8sZ0JBQWdCOztJQUNsRixNQUFBLEdBQVM7SUFDVCxNQUFBLEdBQVMsQ0FBSSxNQUFILEdBQWUsS0FBSyxDQUFDLFNBQU4sQ0FBZ0IsR0FBaEIsRUFBcUIsTUFBckIsQ0FBZixHQUFpRCxFQUFsRDtJQUVULElBQUcsTUFBQSxJQUFVLENBQVYsSUFBZSxPQUFPLEtBQVAsS0FBbUIsUUFBbEMsSUFBOEMsS0FBQSxZQUFpQixJQUEvRCxJQUF1RSxLQUFLLENBQUMsT0FBTixDQUFjLEtBQWQsQ0FBMUU7TUFDSSxNQUFBLElBQVUsTUFBQSxHQUFTLE1BQU0s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c0JBQTdCLEVBQXFELGFBQXJEO0VBREM7O0VBTVosSUFBQyxDQUFBLElBQUQsR0FBTyxTQUFDLElBQUQsRUFBTyxRQUFQLEVBQWlCLHNCQUFqQixFQUF5QyxhQUF6QztBQUNILFdBQU8sSUFBQyxDQUFBLFNBQUQsQ0FBVyxJQUFYLEVBQWlCLFFBQWpCLEVBQTJCLHNCQUEzQixFQUFtRCxhQUFuRDtFQURKOzs7Ozs7O0VBS1gsTUFBTSxDQUFFLElBQVIsR0FBZTs7O0FBR2YsSUFBTyxnREFBUDtFQUNJLElBQUMsQ0FBQSxJQUFELEdBQVEsS0FEWjs7O0FBR0EsTUFBTSxDQUFDLE9BQVAsR0FBaUIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5VdGlscyAgID0gcmVxdWlyZSAnLi9VdGlscydcbklubGluZSAgPSByZXF1aXJlICcuL0lubGluZSdcblxuIyBEdW1wZXIgZHVtcHMgSmF2YVNjcmlwdCB2YXJpYWJsZXMgdG8gWUFNTCBzdHJpbmdzLlxuI1xuY2xhc3MgRHVtcGVyXG5cbiAgICAjIFRoZSBhbW91bnQgb2Ygc3BhY2VzIHRvIHVzZSBmb3IgaW5kZW50YXRpb24gb2YgbmVzdGVkIG5vZGVzLlxuICAgIEBpbmRlbnRhdGlvbjogICA0XG5cblxuICAgICMgRHVtcHMgYSBKYXZhU2NyaXB0IHZhbHVlIHRvIFlBTUwuXG4gICAgI1xuICAgICMgQHBhcmFtIFtPYmplY3RdICAgaW5wdXQgICAgICAgICAgICAgICAgICAgVGhlIEphdmFTY3JpcHQgdmFsdWVcbiAgICAjIEBwYXJhbSBbSW50ZWdlcl0gIGlubGluZSAgICAgICAgICAgICAgICAgIFRoZSBsZXZlbCB3aGVyZSB5b3Ugc3dpdGNoIHRvIGlubGluZSBZQU1MXG4gICAgIyBAcGFyYW0gW0ludGVnZXJdICBpbmRlbnQgICAgICAgICAgICAgICAgICBUaGUgbGV2ZWwgb2YgaW5kZW50YXRpb24gKHVzZWQgaW50ZXJuYWxseSlcbiAgICAjIEBwYXJhbSBbQm9vbGVhbl0gIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgIHRydWUgaWYgYW4gZXhjZXB0aW9uIG11c3QgYmUgdGhyb3duIG9uIGludmFsaWQgdHlwZXMgKGEgSmF2YVNjcmlwdCByZXNvdXJjZSBvciBvYmplY3QpLCBmYWxzZSBvdGhlcndpc2VcbiAgICAjIEBwYXJhbSBbRnVuY3Rpb25dIG9iamVjdEVuY29kZXIgICAgICAgICAgIEEgZnVuY3Rpb24gdG8gc2VyaWFsaXplIGN1c3RvbSBvYmplY3RzLCBudWxsIG90aGVyd2lzZVxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gIFRoZSBZQU1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBKYXZhU2NyaXB0IHZhbHVlXG4gICAgI1xuICAgIGR1bXA6IChpbnB1dCwgaW5saW5lID0gMCwgaW5kZW50ID0gMCwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSA9IGZhbHNlLCBvYmplY3RFbmNvZGVyID0gbnVsbCkgLT5cbiAgICAgICAgb3V0cHV0ID0gJydcbiAgICAgICAgcHJlZml4ID0gKGlmIGluZGVudCB0aGVuIFV0aWxzLnN0clJlcGVhdCgnICcsIGluZGVudCkgZWxzZSAnJylcblxuICAgICAgICBpZiBpbmxpbmUgPD0gMCBvciB0eXBlb2YoaW5wdXQpIGlzbnQgJ29iamVjdCcgb3IgaW5wdXQgaW5zdGFuY2VvZiBEYXRlIG9yIFV0aWxzLmlzRW1wdHkoaW5wdXQpXG4gICAgICAgICAgICBvdXRwdXQgKz0gcHJlZml4ICsgSW5saW5lLmR1bXAoaW5wdXQsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdEVuY29kZXIpXG4gICAgICAgIFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBpZiBpbnB1dCBpbnN0YW5jZW9mIEFycmF5XG4gICAgICAgICAgICAgICAgZm9yIHZhbHVlIGluIGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHdpbGxCZUlubGluZWQgPSAoaW5saW5lIC0gMSA8PSAwIG9yIHR5cGVvZih2YWx1ZSkgaXNudCAnb2JqZWN0JyBvciBVdGlscy5pc0VtcHR5KHZhbHVlKSlcblxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgKz1cbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZpeCArXG4gICAgICAgICAgICAgICAgICAgICAgICAnLScgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGlmIHdpbGxCZUlubGluZWQgdGhlbiAnICcgZWxzZSBcIlxcblwiKSArXG4gICAgICAgICAgICAgICAgICAgICAgICBAZHVtcCh2YWx1ZSwgaW5saW5lIC0gMSwgKGlmIHdpbGxCZUlubGluZWQgdGhlbiAwIGVsc2UgaW5kZW50ICsgQGluZGVudGF0aW9uKSwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSwgb2JqZWN0RW5jb2RlcikgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGlmIHdpbGxCZUlubGluZWQgdGhlbiBcIlxcblwiIGVsc2UgJycpXG5cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBmb3Iga2V5LCB2YWx1ZSBvZiBpbnB1dFxuICAgICAgICAgICAgICAgICAgICB3aWxsQmVJbmxpbmVkID0gKGlubGluZSAtIDEgPD0gMCBvciB0eXBlb2YodmFsdWUpIGlzbnQgJ29iamVjdCcgb3IgVXRpbHMuaXNFbXB0eSh2YWx1ZSkpXG5cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0ICs9XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmaXggK1xuICAgICAgICAgICAgICAgICAgICAgICAgSW5saW5lLmR1bXAoa2V5LCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3RFbmNvZGVyKSArICc6JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAoaWYgd2lsbEJlSW5saW5lZCB0aGVuICcgJyBlbHNlIFwiXFxuXCIpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIEBkdW1wKHZhbHVlLCBpbmxpbmUgLSAxLCAoaWYgd2lsbEJlSW5saW5lZCB0aGVuIDAgZWxzZSBpbmRlbnQgKyBAaW5kZW50YXRpb24pLCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3RFbmNvZGVyKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoaWYgd2lsbEJlSW5saW5lZCB0aGVuIFwiXFxuXCIgZWxzZSAnJylcblxuICAgICAgICByZXR1cm4gb3V0cHV0XG5cblxubW9kdWxlLmV4cG9ydHMgPSBEdW1wZXJcbiIsIlxuUGF0dGVybiA9IHJlcXVpcmUgJy4vUGF0dGVybidcblxuIyBFc2NhcGVyIGVuY2Fwc3VsYXRlcyBlc2NhcGluZyBydWxlcyBmb3Igc2luZ2xlXG4jIGFuZCBkb3VibGUtcXVvdGVkIFlBTUwgc3RyaW5ncy5cbmNsYXNzIEVzY2FwZXJcblxuICAgICMgTWFwcGluZyBhcnJheXMgZm9yIGVzY2FwaW5nIGEgZG91YmxlIHF1b3RlZCBzdHJpbmcuIFRoZSBiYWNrc2xhc2ggaXNcbiAgICAjIGZpcnN0IHRvIGVuc3VyZSBwcm9wZXIgZXNjYXBpbmcuXG4gICAgQExJU1RfRVNDQVBFRVM6ICAgICAgICAgICAgICAgICBbJ1xcXFwnLCAnXFxcXFxcXFwnLCAnXFxcXFwiJywgJ1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlxceDAwXCIsICBcIlxceDAxXCIsICBcIlxceDAyXCIsICBcIlxceDAzXCIsICBcIlxceDA0XCIsICBcIlxceDA1XCIsICBcIlxceDA2XCIsICBcIlxceDA3XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcXHgwOFwiLCAgXCJcXHgwOVwiLCAgXCJcXHgwYVwiLCAgXCJcXHgwYlwiLCAgXCJcXHgwY1wiLCAgXCJcXHgwZFwiLCAgXCJcXHgwZVwiLCAgXCJcXHgwZlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiXFx4MTBcIiwgIFwiXFx4MTFcIiwgIFwiXFx4MTJcIiwgIFwiXFx4MTNcIiwgIFwiXFx4MTRcIiwgIFwiXFx4MTVcIiwgIFwiXFx4MTZcIiwgIFwiXFx4MTdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlxceDE4XCIsICBcIlxceDE5XCIsICBcIlxceDFhXCIsICBcIlxceDFiXCIsICBcIlxceDFjXCIsICBcIlxceDFkXCIsICBcIlxceDFlXCIsICBcIlxceDFmXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNoID0gU3RyaW5nLmZyb21DaGFyQ29kZSkoMHgwMDg1KSwgY2goMHgwMEEwKSwgY2goMHgyMDI4KSwgY2goMHgyMDI5KV1cbiAgICBATElTVF9FU0NBUEVEOiAgICAgICAgICAgICAgICAgIFsnXFxcXFxcXFwnLCAnXFxcXFwiJywgJ1xcXFxcIicsICdcXFxcXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiXFxcXDBcIiwgICBcIlxcXFx4MDFcIiwgXCJcXFxceDAyXCIsIFwiXFxcXHgwM1wiLCBcIlxcXFx4MDRcIiwgXCJcXFxceDA1XCIsIFwiXFxcXHgwNlwiLCBcIlxcXFxhXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcXFxcYlwiLCAgIFwiXFxcXHRcIiwgICBcIlxcXFxuXCIsICAgXCJcXFxcdlwiLCAgIFwiXFxcXGZcIiwgICBcIlxcXFxyXCIsICAgXCJcXFxceDBlXCIsIFwiXFxcXHgwZlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiXFxcXHgxMFwiLCBcIlxcXFx4MTFcIiwgXCJcXFxceDEyXCIsIFwiXFxcXHgxM1wiLCBcIlxcXFx4MTRcIiwgXCJcXFxceDE1XCIsIFwiXFxcXHgxNlwiLCBcIlxcXFx4MTdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlxcXFx4MThcIiwgXCJcXFxceDE5XCIsIFwiXFxcXHgxYVwiLCBcIlxcXFxlXCIsICAgXCJcXFxceDFjXCIsIFwiXFxcXHgxZFwiLCBcIlxcXFx4MWVcIiwgXCJcXFxceDFmXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcXFxcTlwiLCBcIlxcXFxfXCIsIFwiXFxcXExcIiwgXCJcXFxcUFwiXVxuXG4gICAgQE1BUFBJTkdfRVNDQVBFRVNfVE9fRVNDQVBFRDogICBkbyA9PlxuICAgICAgICBtYXBwaW5nID0ge31cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5ATElTVF9FU0NBUEVFUy5sZW5ndGhdXG4gICAgICAgICAgICBtYXBwaW5nW0BMSVNUX0VTQ0FQRUVTW2ldXSA9IEBMSVNUX0VTQ0FQRURbaV1cbiAgICAgICAgcmV0dXJuIG1hcHBpbmdcblxuICAgICMgQ2hhcmFjdGVycyB0aGF0IHdvdWxkIGNhdXNlIGEgZHVtcGVkIHN0cmluZyB0byByZXF1aXJlIGRvdWJsZSBxdW90aW5nLlxuICAgIEBQQVRURVJOX0NIQVJBQ1RFUlNfVE9fRVNDQVBFOiAgbmV3IFBhdHRlcm4gJ1tcXFxceDAwLVxcXFx4MWZdfFxceGMyXFx4ODV8XFx4YzJcXHhhMHxcXHhlMlxceDgwXFx4YTh8XFx4ZTJcXHg4MFxceGE5J1xuXG4gICAgIyBPdGhlciBwcmVjb21waWxlZCBwYXR0ZXJuc1xuICAgIEBQQVRURVJOX01BUFBJTkdfRVNDQVBFRVM6ICAgICAgbmV3IFBhdHRlcm4gQExJU1RfRVNDQVBFRVMuam9pbignfCcpLnNwbGl0KCdcXFxcJykuam9pbignXFxcXFxcXFwnKVxuICAgIEBQQVRURVJOX1NJTkdMRV9RVU9USU5HOiAgICAgICAgbmV3IFBhdHRlcm4gJ1tcXFxcc1xcJ1wiOnt9W1xcXFxdLCYqIz9dfF5bLT98PD49ISVAYF0nXG5cblxuXG4gICAgIyBEZXRlcm1pbmVzIGlmIGEgSmF2YVNjcmlwdCB2YWx1ZSB3b3VsZCByZXF1aXJlIGRvdWJsZSBxdW90aW5nIGluIFlBTUwuXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddICAgdmFsdWUgICBBIEphdmFTY3JpcHQgdmFsdWUgdmFsdWVcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtCb29sZWFuXSB0cnVlICAgIGlmIHRoZSB2YWx1ZSB3b3VsZCByZXF1aXJlIGRvdWJsZSBxdW90ZXMuXG4gICAgI1xuICAgIEByZXF1aXJlc0RvdWJsZVF1b3Rpbmc6ICh2YWx1ZSkgLT5cbiAgICAgICAgcmV0dXJuIEBQQVRURVJOX0NIQVJBQ1RFUlNfVE9fRVNDQVBFLnRlc3QgdmFsdWVcblxuXG4gICAgIyBFc2NhcGVzIGFuZCBzdXJyb3VuZHMgYSBKYXZhU2NyaXB0IHZhbHVlIHdpdGggZG91YmxlIHF1b3Rlcy5cbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICB2YWx1ZSAgIEEgSmF2YVNjcmlwdCB2YWx1ZVxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gIFRoZSBxdW90ZWQsIGVzY2FwZWQgc3RyaW5nXG4gICAgI1xuICAgIEBlc2NhcGVXaXRoRG91YmxlUXVvdGVzOiAodmFsdWUpIC0+XG4gICAgICAgIHJlc3VsdCA9IEBQQVRURVJOX01BUFBJTkdfRVNDQVBFRVMucmVwbGFjZSB2YWx1ZSwgKHN0cikgPT5cbiAgICAgICAgICAgIHJldHVybiBATUFQUElOR19FU0NBUEVFU19UT19FU0NBUEVEW3N0cl1cbiAgICAgICAgcmV0dXJuICdcIicrcmVzdWx0KydcIidcblxuXG4gICAgIyBEZXRlcm1pbmVzIGlmIGEgSmF2YVNjcmlwdCB2YWx1ZSB3b3VsZCByZXF1aXJlIHNpbmdsZSBxdW90aW5nIGluIFlBTUwuXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddICAgdmFsdWUgICBBIEphdmFTY3JpcHQgdmFsdWVcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtCb29sZWFuXSB0cnVlIGlmIHRoZSB2YWx1ZSB3b3VsZCByZXF1aXJlIHNpbmdsZSBxdW90ZXMuXG4gICAgI1xuICAgIEByZXF1aXJlc1NpbmdsZVF1b3Rpbmc6ICh2YWx1ZSkgLT5cbiAgICAgICAgcmV0dXJuIEBQQVRURVJOX1NJTkdMRV9RVU9USU5HLnRlc3QgdmFsdWVcblxuXG4gICAgIyBFc2NhcGVzIGFuZCBzdXJyb3VuZHMgYSBKYXZhU2NyaXB0IHZhbHVlIHdpdGggc2luZ2xlIHF1b3Rlcy5cbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICB2YWx1ZSAgIEEgSmF2YVNjcmlwdCB2YWx1ZVxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gIFRoZSBxdW90ZWQsIGVzY2FwZWQgc3RyaW5nXG4gICAgI1xuICAgIEBlc2NhcGVXaXRoU2luZ2xlUXVvdGVzOiAodmFsdWUpIC0+XG4gICAgICAgIHJldHVybiBcIidcIit2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJydcIikrXCInXCJcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEVzY2FwZXJcbiIsIlxuY2xhc3MgRHVtcEV4Y2VwdGlvbiBleHRlbmRzIEVycm9yXG5cbiAgICBjb25zdHJ1Y3RvcjogKEBtZXNzYWdlLCBAcGFyc2VkTGluZSwgQHNuaXBwZXQpIC0+XG5cbiAgICB0b1N0cmluZzogLT5cbiAgICAgICAgaWYgQHBhcnNlZExpbmU/IGFuZCBAc25pcHBldD9cbiAgICAgICAgICAgIHJldHVybiAnPER1bXBFeGNlcHRpb24+ICcgKyBAbWVzc2FnZSArICcgKGxpbmUgJyArIEBwYXJzZWRMaW5lICsgJzogXFwnJyArIEBzbmlwcGV0ICsgJ1xcJyknXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiAnPER1bXBFeGNlcHRpb24+ICcgKyBAbWVzc2FnZVxuXG5tb2R1bGUuZXhwb3J0cyA9IER1bXBFeGNlcHRpb25cbiIsIlxuY2xhc3MgUGFyc2VFeGNlcHRpb24gZXh0ZW5kcyBFcnJvclxuXG4gICAgY29uc3RydWN0b3I6IChAbWVzc2FnZSwgQHBhcnNlZExpbmUsIEBzbmlwcGV0KSAtPlxuXG4gICAgdG9TdHJpbmc6IC0+XG4gICAgICAgIGlmIEBwYXJzZWRMaW5lPyBhbmQgQHNuaXBwZXQ/XG4gICAgICAgICAgICByZXR1cm4gJzxQYXJzZUV4Y2VwdGlvbj4gJyArIEBtZXNzYWdlICsgJyAobGluZSAnICsgQHBhcnNlZExpbmUgKyAnOiBcXCcnICsgQHNuaXBwZXQgKyAnXFwnKSdcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuICc8UGFyc2VFeGNlcHRpb24+ICcgKyBAbWVzc2FnZVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlRXhjZXB0aW9uXG4iLCJcbmNsYXNzIFBhcnNlTW9yZSBleHRlbmRzIEVycm9yXG5cbiAgICBjb25zdHJ1Y3RvcjogKEBtZXNzYWdlLCBAcGFyc2VkTGluZSwgQHNuaXBwZXQpIC0+XG5cbiAgICB0b1N0cmluZzogLT5cbiAgICAgICAgaWYgQHBhcnNlZExpbmU/IGFuZCBAc25pcHBldD9cbiAgICAgICAgICAgIHJldHVybiAnPFBhcnNlTW9yZT4gJyArIEBtZXNzYWdlICsgJyAobGluZSAnICsgQHBhcnNlZExpbmUgKyAnOiBcXCcnICsgQHNuaXBwZXQgKyAnXFwnKSdcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuICc8UGFyc2VNb3JlPiAnICsgQG1lc3NhZ2VcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJzZU1vcmVcbiIsIlxuUGF0dGVybiAgICAgICAgID0gcmVxdWlyZSAnLi9QYXR0ZXJuJ1xuVW5lc2NhcGVyICAgICAgID0gcmVxdWlyZSAnLi9VbmVzY2FwZXInXG5Fc2NhcGVyICAgICAgICAgPSByZXF1aXJlICcuL0VzY2FwZXInXG5VdGlscyAgICAgICAgICAgPSByZXF1aXJlICcuL1V0aWxzJ1xuUGFyc2VFeGNlcHRpb24gID0gcmVxdWlyZSAnLi9FeGNlcHRpb24vUGFyc2VFeGNlcHRpb24nXG5QYXJzZU1vcmUgICAgICAgPSByZXF1aXJlICcuL0V4Y2VwdGlvbi9QYXJzZU1vcmUnXG5EdW1wRXhjZXB0aW9uICAgPSByZXF1aXJlICcuL0V4Y2VwdGlvbi9EdW1wRXhjZXB0aW9uJ1xuXG4jIElubGluZSBZQU1MIHBhcnNpbmcgYW5kIGR1bXBpbmdcbmNsYXNzIElubGluZVxuXG4gICAgIyBRdW90ZWQgc3RyaW5nIHJlZ3VsYXIgZXhwcmVzc2lvblxuICAgIEBSRUdFWF9RVU9URURfU1RSSU5HOiAgICAgICAgICAgICAgICcoPzpcIig/OlteXCJcXFxcXFxcXF0qKD86XFxcXFxcXFwuW15cIlxcXFxcXFxcXSopKilcInxcXCcoPzpbXlxcJ10qKD86XFwnXFwnW15cXCddKikqKVxcJyknXG5cbiAgICAjIFByZS1jb21waWxlZCBwYXR0ZXJuc1xuICAgICNcbiAgICBAUEFUVEVSTl9UUkFJTElOR19DT01NRU5UUzogICAgICAgICBuZXcgUGF0dGVybiAnXlxcXFxzKiMuKiQnXG4gICAgQFBBVFRFUk5fUVVPVEVEX1NDQUxBUjogICAgICAgICAgICAgbmV3IFBhdHRlcm4gJ14nK0BSRUdFWF9RVU9URURfU1RSSU5HXG4gICAgQFBBVFRFUk5fVEhPVVNBTkRfTlVNRVJJQ19TQ0FMQVI6ICAgbmV3IFBhdHRlcm4gJ14oLXxcXFxcKyk/WzAtOSxdKyhcXFxcLlswLTldKyk/JCdcbiAgICBAUEFUVEVSTl9TQ0FMQVJfQllfREVMSU1JVEVSUzogICAgICB7fVxuXG4gICAgIyBTZXR0aW5nc1xuICAgIEBzZXR0aW5nczoge31cblxuXG4gICAgIyBDb25maWd1cmUgWUFNTCBpbmxpbmUuXG4gICAgI1xuICAgICMgQHBhcmFtIFtCb29sZWFuXSAgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSAgdHJ1ZSBpZiBhbiBleGNlcHRpb24gbXVzdCBiZSB0aHJvd24gb24gaW52YWxpZCB0eXBlcyAoYSBKYXZhU2NyaXB0IHJlc291cmNlIG9yIG9iamVjdCksIGZhbHNlIG90aGVyd2lzZVxuICAgICMgQHBhcmFtIFtGdW5jdGlvbl0gb2JqZWN0RGVjb2RlciAgICAgICAgICAgQSBmdW5jdGlvbiB0byBkZXNlcmlhbGl6ZSBjdXN0b20gb2JqZWN0cywgbnVsbCBvdGhlcndpc2VcbiAgICAjXG4gICAgQGNvbmZpZ3VyZTogKGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgPSBudWxsLCBvYmplY3REZWNvZGVyID0gbnVsbCkgLT5cbiAgICAgICAgIyBVcGRhdGUgc2V0dGluZ3NcbiAgICAgICAgQHNldHRpbmdzLmV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgPSBleGNlcHRpb25PbkludmFsaWRUeXBlXG4gICAgICAgIEBzZXR0aW5ncy5vYmplY3REZWNvZGVyID0gb2JqZWN0RGVjb2RlclxuICAgICAgICByZXR1cm5cblxuXG4gICAgIyBDb252ZXJ0cyBhIFlBTUwgc3RyaW5nIHRvIGEgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddICAgdmFsdWUgICAgICAgICAgICAgICAgICAgQSBZQU1MIHN0cmluZ1xuICAgICMgQHBhcmFtIFtCb29sZWFuXSAgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSAgdHJ1ZSBpZiBhbiBleGNlcHRpb24gbXVzdCBiZSB0aHJvd24gb24gaW52YWxpZCB0eXBlcyAoYSBKYXZhU2NyaXB0IHJlc291cmNlIG9yIG9iamVjdCksIGZhbHNlIG90aGVyd2lzZVxuICAgICMgQHBhcmFtIFtGdW5jdGlvbl0gb2JqZWN0RGVjb2RlciAgICAgICAgICAgQSBmdW5jdGlvbiB0byBkZXNlcmlhbGl6ZSBjdXN0b20gb2JqZWN0cywgbnVsbCBvdGhlcndpc2VcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtPYmplY3RdICBBIEphdmFTY3JpcHQgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgWUFNTCBzdHJpbmdcbiAgICAjXG4gICAgIyBAdGhyb3cgW1BhcnNlRXhjZXB0aW9uXVxuICAgICNcbiAgICBAcGFyc2U6ICh2YWx1ZSwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSA9IGZhbHNlLCBvYmplY3REZWNvZGVyID0gbnVsbCkgLT5cbiAgICAgICAgIyBVcGRhdGUgc2V0dGluZ3MgZnJvbSBsYXN0IGNhbGwgb2YgSW5saW5lLnBhcnNlKClcbiAgICAgICAgQHNldHRpbmdzLmV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgPSBleGNlcHRpb25PbkludmFsaWRUeXBlXG4gICAgICAgIEBzZXR0aW5ncy5vYmplY3REZWNvZGVyID0gb2JqZWN0RGVjb2RlclxuXG4gICAgICAgIGlmIG5vdCB2YWx1ZT9cbiAgICAgICAgICAgIHJldHVybiAnJ1xuXG4gICAgICAgIHZhbHVlID0gVXRpbHMudHJpbSB2YWx1ZVxuXG4gICAgICAgIGlmIDAgaXMgdmFsdWUubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm4gJydcblxuICAgICAgICAjIEtlZXAgYSBjb250ZXh0IG9iamVjdCB0byBwYXNzIHRocm91Z2ggc3RhdGljIG1ldGhvZHNcbiAgICAgICAgY29udGV4dCA9IHtleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyLCBpOiAwfVxuXG4gICAgICAgIHN3aXRjaCB2YWx1ZS5jaGFyQXQoMClcbiAgICAgICAgICAgIHdoZW4gJ1snXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gQHBhcnNlU2VxdWVuY2UgdmFsdWUsIGNvbnRleHRcbiAgICAgICAgICAgICAgICArK2NvbnRleHQuaVxuICAgICAgICAgICAgd2hlbiAneydcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBAcGFyc2VNYXBwaW5nIHZhbHVlLCBjb250ZXh0XG4gICAgICAgICAgICAgICAgKytjb250ZXh0LmlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBAcGFyc2VTY2FsYXIgdmFsdWUsIG51bGwsIFsnXCInLCBcIidcIl0sIGNvbnRleHRcblxuICAgICAgICAjIFNvbWUgY29tbWVudHMgYXJlIGFsbG93ZWQgYXQgdGhlIGVuZFxuICAgICAgICBpZiBAUEFUVEVSTl9UUkFJTElOR19DT01NRU5UUy5yZXBsYWNlKHZhbHVlW2NvbnRleHQuaS4uXSwgJycpIGlzbnQgJydcbiAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZUV4Y2VwdGlvbiAnVW5leHBlY3RlZCBjaGFyYWN0ZXJzIG5lYXIgXCInK3ZhbHVlW2NvbnRleHQuaS4uXSsnXCIuJ1xuXG4gICAgICAgIHJldHVybiByZXN1bHRcblxuXG4gICAgIyBEdW1wcyBhIGdpdmVuIEphdmFTY3JpcHQgdmFyaWFibGUgdG8gYSBZQU1MIHN0cmluZy5cbiAgICAjXG4gICAgIyBAcGFyYW0gW09iamVjdF0gICB2YWx1ZSAgICAgICAgICAgICAgICAgICBUaGUgSmF2YVNjcmlwdCB2YXJpYWJsZSB0byBjb252ZXJ0XG4gICAgIyBAcGFyYW0gW0Jvb2xlYW5dICBleGNlcHRpb25PbkludmFsaWRUeXBlICB0cnVlIGlmIGFuIGV4Y2VwdGlvbiBtdXN0IGJlIHRocm93biBvbiBpbnZhbGlkIHR5cGVzIChhIEphdmFTY3JpcHQgcmVzb3VyY2Ugb3Igb2JqZWN0KSwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgIyBAcGFyYW0gW0Z1bmN0aW9uXSBvYmplY3RFbmNvZGVyICAgICAgICAgICBBIGZ1bmN0aW9uIHRvIHNlcmlhbGl6ZSBjdXN0b20gb2JqZWN0cywgbnVsbCBvdGhlcndpc2VcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddICBUaGUgWUFNTCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBKYXZhU2NyaXB0IG9iamVjdFxuICAgICNcbiAgICAjIEB0aHJvdyBbRHVtcEV4Y2VwdGlvbl1cbiAgICAjXG4gICAgQGR1bXA6ICh2YWx1ZSwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSA9IGZhbHNlLCBvYmplY3RFbmNvZGVyID0gbnVsbCkgLT5cbiAgICAgICAgaWYgbm90IHZhbHVlP1xuICAgICAgICAgICAgcmV0dXJuICdudWxsJ1xuICAgICAgICB0eXBlID0gdHlwZW9mIHZhbHVlXG4gICAgICAgIGlmIHR5cGUgaXMgJ29iamVjdCdcbiAgICAgICAgICAgIGlmIHZhbHVlIGluc3RhbmNlb2YgRGF0ZVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICBlbHNlIGlmIG9iamVjdEVuY29kZXI/XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gb2JqZWN0RW5jb2RlciB2YWx1ZVxuICAgICAgICAgICAgICAgIGlmIHR5cGVvZiByZXN1bHQgaXMgJ3N0cmluZycgb3IgcmVzdWx0P1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICAgICAgICByZXR1cm4gQGR1bXBPYmplY3QgdmFsdWVcbiAgICAgICAgaWYgdHlwZSBpcyAnYm9vbGVhbidcbiAgICAgICAgICAgIHJldHVybiAoaWYgdmFsdWUgdGhlbiAndHJ1ZScgZWxzZSAnZmFsc2UnKVxuICAgICAgICBpZiBVdGlscy5pc0RpZ2l0cyh2YWx1ZSlcbiAgICAgICAgICAgIHJldHVybiAoaWYgdHlwZSBpcyAnc3RyaW5nJyB0aGVuIFwiJ1wiK3ZhbHVlK1wiJ1wiIGVsc2UgU3RyaW5nKHBhcnNlSW50KHZhbHVlKSkpXG4gICAgICAgIGlmIFV0aWxzLmlzTnVtZXJpYyh2YWx1ZSlcbiAgICAgICAgICAgIHJldHVybiAoaWYgdHlwZSBpcyAnc3RyaW5nJyB0aGVuIFwiJ1wiK3ZhbHVlK1wiJ1wiIGVsc2UgU3RyaW5nKHBhcnNlRmxvYXQodmFsdWUpKSlcbiAgICAgICAgaWYgdHlwZSBpcyAnbnVtYmVyJ1xuICAgICAgICAgICAgcmV0dXJuIChpZiB2YWx1ZSBpcyBJbmZpbml0eSB0aGVuICcuSW5mJyBlbHNlIChpZiB2YWx1ZSBpcyAtSW5maW5pdHkgdGhlbiAnLS5JbmYnIGVsc2UgKGlmIGlzTmFOKHZhbHVlKSB0aGVuICcuTmFOJyBlbHNlIHZhbHVlKSkpXG4gICAgICAgIGlmIEVzY2FwZXIucmVxdWlyZXNEb3VibGVRdW90aW5nIHZhbHVlXG4gICAgICAgICAgICByZXR1cm4gRXNjYXBlci5lc2NhcGVXaXRoRG91YmxlUXVvdGVzIHZhbHVlXG4gICAgICAgIGlmIEVzY2FwZXIucmVxdWlyZXNTaW5nbGVRdW90aW5nIHZhbHVlXG4gICAgICAgICAgICByZXR1cm4gRXNjYXBlci5lc2NhcGVXaXRoU2luZ2xlUXVvdGVzIHZhbHVlXG4gICAgICAgIGlmICcnIGlzIHZhbHVlXG4gICAgICAgICAgICByZXR1cm4gJ1wiXCInXG4gICAgICAgIGlmIFV0aWxzLlBBVFRFUk5fREFURS50ZXN0IHZhbHVlXG4gICAgICAgICAgICByZXR1cm4gXCInXCIrdmFsdWUrXCInXCI7XG4gICAgICAgIGlmIHZhbHVlLnRvTG93ZXJDYXNlKCkgaW4gWydudWxsJywnficsJ3RydWUnLCdmYWxzZSddXG4gICAgICAgICAgICByZXR1cm4gXCInXCIrdmFsdWUrXCInXCJcbiAgICAgICAgIyBEZWZhdWx0XG4gICAgICAgIHJldHVybiB2YWx1ZTtcblxuXG4gICAgIyBEdW1wcyBhIEphdmFTY3JpcHQgb2JqZWN0IHRvIGEgWUFNTCBzdHJpbmcuXG4gICAgI1xuICAgICMgQHBhcmFtIFtPYmplY3RdICAgdmFsdWUgICAgICAgICAgICAgICAgICAgVGhlIEphdmFTY3JpcHQgb2JqZWN0IHRvIGR1bXBcbiAgICAjIEBwYXJhbSBbQm9vbGVhbl0gIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgIHRydWUgaWYgYW4gZXhjZXB0aW9uIG11c3QgYmUgdGhyb3duIG9uIGludmFsaWQgdHlwZXMgKGEgSmF2YVNjcmlwdCByZXNvdXJjZSBvciBvYmplY3QpLCBmYWxzZSBvdGhlcndpc2VcbiAgICAjIEBwYXJhbSBbRnVuY3Rpb25dIG9iamVjdEVuY29kZXIgICAgICAgICAgIEEgZnVuY3Rpb24gZG8gc2VyaWFsaXplIGN1c3RvbSBvYmplY3RzLCBudWxsIG90aGVyd2lzZVxuICAgICNcbiAgICAjIEByZXR1cm4gc3RyaW5nIFRoZSBZQU1MIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIEphdmFTY3JpcHQgb2JqZWN0XG4gICAgI1xuICAgIEBkdW1wT2JqZWN0OiAodmFsdWUsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdFN1cHBvcnQgPSBudWxsKSAtPlxuICAgICAgICAjIEFycmF5XG4gICAgICAgIGlmIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlcbiAgICAgICAgICAgIG91dHB1dCA9IFtdXG4gICAgICAgICAgICBmb3IgdmFsIGluIHZhbHVlXG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2ggQGR1bXAgdmFsXG4gICAgICAgICAgICByZXR1cm4gJ1snK291dHB1dC5qb2luKCcsICcpKyddJ1xuXG4gICAgICAgICMgTWFwcGluZ1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBvdXRwdXQgPSBbXVxuICAgICAgICAgICAgZm9yIGtleSwgdmFsIG9mIHZhbHVlXG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2ggQGR1bXAoa2V5KSsnOiAnK0BkdW1wKHZhbClcbiAgICAgICAgICAgIHJldHVybiAneycrb3V0cHV0LmpvaW4oJywgJykrJ30nXG5cblxuICAgICMgUGFyc2VzIGEgc2NhbGFyIHRvIGEgWUFNTCBzdHJpbmcuXG4gICAgI1xuICAgICMgQHBhcmFtIFtPYmplY3RdICAgc2NhbGFyXG4gICAgIyBAcGFyYW0gW0FycmF5XSAgICBkZWxpbWl0ZXJzXG4gICAgIyBAcGFyYW0gW0FycmF5XSAgICBzdHJpbmdEZWxpbWl0ZXJzXG4gICAgIyBAcGFyYW0gW09iamVjdF0gICBjb250ZXh0XG4gICAgIyBAcGFyYW0gW0Jvb2xlYW5dICBldmFsdWF0ZVxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gIEEgWUFNTCBzdHJpbmdcbiAgICAjXG4gICAgIyBAdGhyb3cgW1BhcnNlRXhjZXB0aW9uXSBXaGVuIG1hbGZvcm1lZCBpbmxpbmUgWUFNTCBzdHJpbmcgaXMgcGFyc2VkXG4gICAgI1xuICAgIEBwYXJzZVNjYWxhcjogKHNjYWxhciwgZGVsaW1pdGVycyA9IG51bGwsIHN0cmluZ0RlbGltaXRlcnMgPSBbJ1wiJywgXCInXCJdLCBjb250ZXh0ID0gbnVsbCwgZXZhbHVhdGUgPSB0cnVlKSAtPlxuICAgICAgICB1bmxlc3MgY29udGV4dD9cbiAgICAgICAgICAgIGNvbnRleHQgPSBleGNlcHRpb25PbkludmFsaWRUeXBlOiBAc2V0dGluZ3MuZXhjZXB0aW9uT25JbnZhbGlkVHlwZSwgb2JqZWN0RGVjb2RlcjogQHNldHRpbmdzLm9iamVjdERlY29kZXIsIGk6IDBcbiAgICAgICAge2l9ID0gY29udGV4dFxuXG4gICAgICAgIGlmIHNjYWxhci5jaGFyQXQoaSkgaW4gc3RyaW5nRGVsaW1pdGVyc1xuICAgICAgICAgICAgIyBRdW90ZWQgc2NhbGFyXG4gICAgICAgICAgICBvdXRwdXQgPSBAcGFyc2VRdW90ZWRTY2FsYXIgc2NhbGFyLCBjb250ZXh0XG4gICAgICAgICAgICB7aX0gPSBjb250ZXh0XG5cbiAgICAgICAgICAgIGlmIGRlbGltaXRlcnM/XG4gICAgICAgICAgICAgICAgdG1wID0gVXRpbHMubHRyaW0gc2NhbGFyW2kuLl0sICcgJ1xuICAgICAgICAgICAgICAgIGlmIG5vdCh0bXAuY2hhckF0KDApIGluIGRlbGltaXRlcnMpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZUV4Y2VwdGlvbiAnVW5leHBlY3RlZCBjaGFyYWN0ZXJzICgnK3NjYWxhcltpLi5dKycpLidcblxuICAgICAgICBlbHNlXG4gICAgICAgICAgICAjIFwibm9ybWFsXCIgc3RyaW5nXG4gICAgICAgICAgICBpZiBub3QgZGVsaW1pdGVyc1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IHNjYWxhcltpLi5dXG4gICAgICAgICAgICAgICAgaSArPSBvdXRwdXQubGVuZ3RoXG5cbiAgICAgICAgICAgICAgICAjIFJlbW92ZSBjb21tZW50c1xuICAgICAgICAgICAgICAgIHN0cnBvcyA9IG91dHB1dC5pbmRleE9mICcgIydcbiAgICAgICAgICAgICAgICBpZiBzdHJwb3MgaXNudCAtMVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgPSBVdGlscy5ydHJpbSBvdXRwdXRbMC4uLnN0cnBvc11cblxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGpvaW5lZERlbGltaXRlcnMgPSBkZWxpbWl0ZXJzLmpvaW4oJ3wnKVxuICAgICAgICAgICAgICAgIHBhdHRlcm4gPSBAUEFUVEVSTl9TQ0FMQVJfQllfREVMSU1JVEVSU1tqb2luZWREZWxpbWl0ZXJzXVxuICAgICAgICAgICAgICAgIHVubGVzcyBwYXR0ZXJuP1xuICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuID0gbmV3IFBhdHRlcm4gJ14oLis/KSgnK2pvaW5lZERlbGltaXRlcnMrJyknXG4gICAgICAgICAgICAgICAgICAgIEBQQVRURVJOX1NDQUxBUl9CWV9ERUxJTUlURVJTW2pvaW5lZERlbGltaXRlcnNdID0gcGF0dGVyblxuICAgICAgICAgICAgICAgIGlmIG1hdGNoID0gcGF0dGVybi5leGVjIHNjYWxhcltpLi5dXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCA9IG1hdGNoWzFdXG4gICAgICAgICAgICAgICAgICAgIGkgKz0gb3V0cHV0Lmxlbmd0aFxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlRXhjZXB0aW9uICdNYWxmb3JtZWQgaW5saW5lIFlBTUwgc3RyaW5nICgnK3NjYWxhcisnKS4nXG5cblxuICAgICAgICAgICAgaWYgZXZhbHVhdGVcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSBAZXZhbHVhdGVTY2FsYXIgb3V0cHV0LCBjb250ZXh0XG5cbiAgICAgICAgY29udGV4dC5pID0gaVxuICAgICAgICByZXR1cm4gb3V0cHV0XG5cblxuICAgICMgUGFyc2VzIGEgcXVvdGVkIHNjYWxhciB0byBZQU1MLlxuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSAgIHNjYWxhclxuICAgICMgQHBhcmFtIFtPYmplY3RdICAgY29udGV4dFxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gIEEgWUFNTCBzdHJpbmdcbiAgICAjXG4gICAgIyBAdGhyb3cgW1BhcnNlTW9yZV0gV2hlbiBtYWxmb3JtZWQgaW5saW5lIFlBTUwgc3RyaW5nIGlzIHBhcnNlZFxuICAgICNcbiAgICBAcGFyc2VRdW90ZWRTY2FsYXI6IChzY2FsYXIsIGNvbnRleHQpIC0+XG4gICAgICAgIHtpfSA9IGNvbnRleHRcblxuICAgICAgICB1bmxlc3MgbWF0Y2ggPSBAUEFUVEVSTl9RVU9URURfU0NBTEFSLmV4ZWMgc2NhbGFyW2kuLl1cbiAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZU1vcmUgJ01hbGZvcm1lZCBpbmxpbmUgWUFNTCBzdHJpbmcgKCcrc2NhbGFyW2kuLl0rJykuJ1xuXG4gICAgICAgIG91dHB1dCA9IG1hdGNoWzBdLnN1YnN0cigxLCBtYXRjaFswXS5sZW5ndGggLSAyKVxuXG4gICAgICAgIGlmICdcIicgaXMgc2NhbGFyLmNoYXJBdChpKVxuICAgICAgICAgICAgb3V0cHV0ID0gVW5lc2NhcGVyLnVuZXNjYXBlRG91YmxlUXVvdGVkU3RyaW5nIG91dHB1dFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBvdXRwdXQgPSBVbmVzY2FwZXIudW5lc2NhcGVTaW5nbGVRdW90ZWRTdHJpbmcgb3V0cHV0XG5cbiAgICAgICAgaSArPSBtYXRjaFswXS5sZW5ndGhcblxuICAgICAgICBjb250ZXh0LmkgPSBpXG4gICAgICAgIHJldHVybiBvdXRwdXRcblxuXG4gICAgIyBQYXJzZXMgYSBzZXF1ZW5jZSB0byBhIFlBTUwgc3RyaW5nLlxuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSAgIHNlcXVlbmNlXG4gICAgIyBAcGFyYW0gW09iamVjdF0gICBjb250ZXh0XG4gICAgI1xuICAgICMgQHJldHVybiBbU3RyaW5nXSAgQSBZQU1MIHN0cmluZ1xuICAgICNcbiAgICAjIEB0aHJvdyBbUGFyc2VNb3JlXSBXaGVuIG1hbGZvcm1lZCBpbmxpbmUgWUFNTCBzdHJpbmcgaXMgcGFyc2VkXG4gICAgI1xuICAgIEBwYXJzZVNlcXVlbmNlOiAoc2VxdWVuY2UsIGNvbnRleHQpIC0+XG4gICAgICAgIG91dHB1dCA9IFtdXG4gICAgICAgIGxlbiA9IHNlcXVlbmNlLmxlbmd0aFxuICAgICAgICB7aX0gPSBjb250ZXh0XG4gICAgICAgIGkgKz0gMVxuXG4gICAgICAgICMgW2ZvbywgYmFyLCAuLi5dXG4gICAgICAgIHdoaWxlIGkgPCBsZW5cbiAgICAgICAgICAgIGNvbnRleHQuaSA9IGlcbiAgICAgICAgICAgIHN3aXRjaCBzZXF1ZW5jZS5jaGFyQXQoaSlcbiAgICAgICAgICAgICAgICB3aGVuICdbJ1xuICAgICAgICAgICAgICAgICAgICAjIE5lc3RlZCBzZXF1ZW5jZVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCBAcGFyc2VTZXF1ZW5jZSBzZXF1ZW5jZSwgY29udGV4dFxuICAgICAgICAgICAgICAgICAgICB7aX0gPSBjb250ZXh0XG4gICAgICAgICAgICAgICAgd2hlbiAneydcbiAgICAgICAgICAgICAgICAgICAgIyBOZXN0ZWQgbWFwcGluZ1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCBAcGFyc2VNYXBwaW5nIHNlcXVlbmNlLCBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgIHtpfSA9IGNvbnRleHRcbiAgICAgICAgICAgICAgICB3aGVuICddJ1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3V0cHV0XG4gICAgICAgICAgICAgICAgd2hlbiAnLCcsICcgJywgXCJcXG5cIlxuICAgICAgICAgICAgICAgICAgICAjIERvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGlzUXVvdGVkID0gKHNlcXVlbmNlLmNoYXJBdChpKSBpbiBbJ1wiJywgXCInXCJdKVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IEBwYXJzZVNjYWxhciBzZXF1ZW5jZSwgWycsJywgJ10nXSwgWydcIicsIFwiJ1wiXSwgY29udGV4dFxuICAgICAgICAgICAgICAgICAgICB7aX0gPSBjb250ZXh0XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgbm90KGlzUXVvdGVkKSBhbmQgdHlwZW9mKHZhbHVlKSBpcyAnc3RyaW5nJyBhbmQgKHZhbHVlLmluZGV4T2YoJzogJykgaXNudCAtMSBvciB2YWx1ZS5pbmRleE9mKFwiOlxcblwiKSBpc250IC0xKVxuICAgICAgICAgICAgICAgICAgICAgICAgIyBFbWJlZGRlZCBtYXBwaW5nP1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBAcGFyc2VNYXBwaW5nICd7Jyt2YWx1ZSsnfSdcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIE5vLCBpdCdzIG5vdFxuXG5cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2ggdmFsdWVcblxuICAgICAgICAgICAgICAgICAgICAtLWlcblxuICAgICAgICAgICAgKytpXG5cbiAgICAgICAgdGhyb3cgbmV3IFBhcnNlTW9yZSAnTWFsZm9ybWVkIGlubGluZSBZQU1MIHN0cmluZyAnK3NlcXVlbmNlXG5cblxuICAgICMgUGFyc2VzIGEgbWFwcGluZyB0byBhIFlBTUwgc3RyaW5nLlxuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSAgIG1hcHBpbmdcbiAgICAjIEBwYXJhbSBbT2JqZWN0XSAgIGNvbnRleHRcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddICBBIFlBTUwgc3RyaW5nXG4gICAgI1xuICAgICMgQHRocm93IFtQYXJzZU1vcmVdIFdoZW4gbWFsZm9ybWVkIGlubGluZSBZQU1MIHN0cmluZyBpcyBwYXJzZWRcbiAgICAjXG4gICAgQHBhcnNlTWFwcGluZzogKG1hcHBpbmcsIGNvbnRleHQpIC0+XG4gICAgICAgIG91dHB1dCA9IHt9XG4gICAgICAgIGxlbiA9IG1hcHBpbmcubGVuZ3RoXG4gICAgICAgIHtpfSA9IGNvbnRleHRcbiAgICAgICAgaSArPSAxXG5cbiAgICAgICAgIyB7Zm9vOiBiYXIsIGJhcjpmb28sIC4uLn1cbiAgICAgICAgc2hvdWxkQ29udGludWVXaGlsZUxvb3AgPSBmYWxzZVxuICAgICAgICB3aGlsZSBpIDwgbGVuXG4gICAgICAgICAgICBjb250ZXh0LmkgPSBpXG4gICAgICAgICAgICBzd2l0Y2ggbWFwcGluZy5jaGFyQXQoaSlcbiAgICAgICAgICAgICAgICB3aGVuICcgJywgJywnLCBcIlxcblwiXG4gICAgICAgICAgICAgICAgICAgICsraVxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmkgPSBpXG4gICAgICAgICAgICAgICAgICAgIHNob3VsZENvbnRpbnVlV2hpbGVMb29wID0gdHJ1ZVxuICAgICAgICAgICAgICAgIHdoZW4gJ30nXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdXRwdXRcblxuICAgICAgICAgICAgaWYgc2hvdWxkQ29udGludWVXaGlsZUxvb3BcbiAgICAgICAgICAgICAgICBzaG91bGRDb250aW51ZVdoaWxlTG9vcCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgY29udGludWVcblxuICAgICAgICAgICAgIyBLZXlcbiAgICAgICAgICAgIGtleSA9IEBwYXJzZVNjYWxhciBtYXBwaW5nLCBbJzonLCAnICcsIFwiXFxuXCJdLCBbJ1wiJywgXCInXCJdLCBjb250ZXh0LCBmYWxzZVxuICAgICAgICAgICAge2l9ID0gY29udGV4dFxuXG4gICAgICAgICAgICAjIFZhbHVlXG4gICAgICAgICAgICBkb25lID0gZmFsc2VcblxuICAgICAgICAgICAgd2hpbGUgaSA8IGxlblxuICAgICAgICAgICAgICAgIGNvbnRleHQuaSA9IGlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggbWFwcGluZy5jaGFyQXQoaSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAnWydcbiAgICAgICAgICAgICAgICAgICAgICAgICMgTmVzdGVkIHNlcXVlbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IEBwYXJzZVNlcXVlbmNlIG1hcHBpbmcsIGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIHtpfSA9IGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICMgU3BlYzogS2V5cyBNVVNUIGJlIHVuaXF1ZTsgZmlyc3Qgb25lIHdpbnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAjIFBhcnNlciBjYW5ub3QgYWJvcnQgdGhpcyBtYXBwaW5nIGVhcmxpZXIsIHNpbmNlIGxpbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICAjIGFyZSBwcm9jZXNzZWQgc2VxdWVudGlhbGx5LlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgb3V0cHV0W2tleV0gPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2tleV0gPSB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAneydcbiAgICAgICAgICAgICAgICAgICAgICAgICMgTmVzdGVkIG1hcHBpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gQHBhcnNlTWFwcGluZyBtYXBwaW5nLCBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB7aX0gPSBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAjIFNwZWM6IEtleXMgTVVTVCBiZSB1bmlxdWU7IGZpcnN0IG9uZSB3aW5zLlxuICAgICAgICAgICAgICAgICAgICAgICAgIyBQYXJzZXIgY2Fubm90IGFib3J0IHRoaXMgbWFwcGluZyBlYXJsaWVyLCBzaW5jZSBsaW5lc1xuICAgICAgICAgICAgICAgICAgICAgICAgIyBhcmUgcHJvY2Vzc2VkIHNlcXVlbnRpYWxseS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIG91dHB1dFtrZXldID09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dFtrZXldID0gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gJzonLCAnICcsIFwiXFxuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICMgRG8gbm90aGluZ1xuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IEBwYXJzZVNjYWxhciBtYXBwaW5nLCBbJywnLCAnfSddLCBbJ1wiJywgXCInXCJdLCBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB7aX0gPSBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAjIFNwZWM6IEtleXMgTVVTVCBiZSB1bmlxdWU7IGZpcnN0IG9uZSB3aW5zLlxuICAgICAgICAgICAgICAgICAgICAgICAgIyBQYXJzZXIgY2Fubm90IGFib3J0IHRoaXMgbWFwcGluZyBlYXJsaWVyLCBzaW5jZSBsaW5lc1xuICAgICAgICAgICAgICAgICAgICAgICAgIyBhcmUgcHJvY2Vzc2VkIHNlcXVlbnRpYWxseS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIG91dHB1dFtrZXldID09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dFtrZXldID0gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAtLWlcblxuICAgICAgICAgICAgICAgICsraVxuXG4gICAgICAgICAgICAgICAgaWYgZG9uZVxuICAgICAgICAgICAgICAgICAgICBicmVha1xuXG4gICAgICAgIHRocm93IG5ldyBQYXJzZU1vcmUgJ01hbGZvcm1lZCBpbmxpbmUgWUFNTCBzdHJpbmcgJyttYXBwaW5nXG5cblxuICAgICMgRXZhbHVhdGVzIHNjYWxhcnMgYW5kIHJlcGxhY2VzIG1hZ2ljIHZhbHVlcy5cbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICBzY2FsYXJcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddICBBIFlBTUwgc3RyaW5nXG4gICAgI1xuICAgIEBldmFsdWF0ZVNjYWxhcjogKHNjYWxhciwgY29udGV4dCkgLT5cbiAgICAgICAgc2NhbGFyID0gVXRpbHMudHJpbShzY2FsYXIpXG4gICAgICAgIHNjYWxhckxvd2VyID0gc2NhbGFyLnRvTG93ZXJDYXNlKClcblxuICAgICAgICBzd2l0Y2ggc2NhbGFyTG93ZXJcbiAgICAgICAgICAgIHdoZW4gJ251bGwnLCAnJywgJ34nXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgICAgIHdoZW4gJ3RydWUnXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIHdoZW4gJ2ZhbHNlJ1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgd2hlbiAnLmluZidcbiAgICAgICAgICAgICAgICByZXR1cm4gSW5maW5pdHlcbiAgICAgICAgICAgIHdoZW4gJy5uYW4nXG4gICAgICAgICAgICAgICAgcmV0dXJuIE5hTlxuICAgICAgICAgICAgd2hlbiAnLS5pbmYnXG4gICAgICAgICAgICAgICAgcmV0dXJuIEluZmluaXR5XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZmlyc3RDaGFyID0gc2NhbGFyTG93ZXIuY2hhckF0KDApXG4gICAgICAgICAgICAgICAgc3dpdGNoIGZpcnN0Q2hhclxuICAgICAgICAgICAgICAgICAgICB3aGVuICchJ1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RTcGFjZSA9IHNjYWxhci5pbmRleE9mKCcgJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIGZpcnN0U3BhY2UgaXMgLTFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFdvcmQgPSBzY2FsYXJMb3dlclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0V29yZCA9IHNjYWxhckxvd2VyWzAuLi5maXJzdFNwYWNlXVxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIGZpcnN0V29yZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gJyEnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGZpcnN0U3BhY2UgaXNudCAtMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50IEBwYXJzZVNjYWxhcihzY2FsYXJbMi4uXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVuICchc3RyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbHMubHRyaW0gc2NhbGFyWzQuLl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVuICchIXN0cidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLmx0cmltIHNjYWxhcls1Li5dXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAnISFpbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludChAcGFyc2VTY2FsYXIoc2NhbGFyWzUuLl0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gJyEhYm9vbCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLnBhcnNlQm9vbGVhbihAcGFyc2VTY2FsYXIoc2NhbGFyWzYuLl0pLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVuICchIWZsb2F0J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChAcGFyc2VTY2FsYXIoc2NhbGFyWzcuLl0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gJyEhdGltZXN0YW1wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbHMuc3RyaW5nVG9EYXRlKFV0aWxzLmx0cmltKHNjYWxhclsxMS4uXSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmxlc3MgY29udGV4dD9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQgPSBleGNlcHRpb25PbkludmFsaWRUeXBlOiBAc2V0dGluZ3MuZXhjZXB0aW9uT25JbnZhbGlkVHlwZSwgb2JqZWN0RGVjb2RlcjogQHNldHRpbmdzLm9iamVjdERlY29kZXIsIGk6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge29iamVjdERlY29kZXIsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGV9ID0gY29udGV4dFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIG9iamVjdERlY29kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgSWYgb2JqZWN0RGVjb2RlciBmdW5jdGlvbiBpcyBnaXZlbiwgd2UgY2FuIGRvIGN1c3RvbSBkZWNvZGluZyBvZiBjdXN0b20gdHlwZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaW1tZWRTY2FsYXIgPSBVdGlscy5ydHJpbSBzY2FsYXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0U3BhY2UgPSB0cmltbWVkU2NhbGFyLmluZGV4T2YoJyAnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgZmlyc3RTcGFjZSBpcyAtMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3REZWNvZGVyIHRyaW1tZWRTY2FsYXIsIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJWYWx1ZSA9IFV0aWxzLmx0cmltIHRyaW1tZWRTY2FsYXJbZmlyc3RTcGFjZSsxLi5dXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5sZXNzIHN1YlZhbHVlLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ViVmFsdWUgPSBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdERlY29kZXIgdHJpbW1lZFNjYWxhclswLi4uZmlyc3RTcGFjZV0sIHN1YlZhbHVlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgZXhjZXB0aW9uT25JbnZhbGlkVHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlRXhjZXB0aW9uICdDdXN0b20gb2JqZWN0IHN1cHBvcnQgd2hlbiBwYXJzaW5nIGEgWUFNTCBmaWxlIGhhcyBiZWVuIGRpc2FibGVkLidcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICAgICAgICAgICAgICB3aGVuICcwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgJzB4JyBpcyBzY2FsYXJbMC4uLjJdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLmhleERlYyBzY2FsYXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgVXRpbHMuaXNEaWdpdHMgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLm9jdERlYyBzY2FsYXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgVXRpbHMuaXNOdW1lcmljIHNjYWxhclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZsb2F0IHNjYWxhclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzY2FsYXJcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAnKydcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIFV0aWxzLmlzRGlnaXRzIHNjYWxhclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhdyA9IHNjYWxhclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc3QgPSBwYXJzZUludChyYXcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgcmF3IGlzIFN0cmluZyhjYXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJhd1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiBVdGlscy5pc051bWVyaWMgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIEBQQVRURVJOX1RIT1VTQU5EX05VTUVSSUNfU0NBTEFSLnRlc3Qgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2NhbGFyLnJlcGxhY2UoJywnLCAnJykpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gJy0nXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBVdGlscy5pc0RpZ2l0cyhzY2FsYXJbMS4uXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAnMCcgaXMgc2NhbGFyLmNoYXJBdCgxKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gLVV0aWxzLm9jdERlYyhzY2FsYXJbMS4uXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhdyA9IHNjYWxhclsxLi5dXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc3QgPSBwYXJzZUludChyYXcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIHJhdyBpcyBTdHJpbmcoY2FzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtY2FzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gLXJhd1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiBVdGlscy5pc051bWVyaWMgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIEBQQVRURVJOX1RIT1VTQU5EX05VTUVSSUNfU0NBTEFSLnRlc3Qgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2NhbGFyLnJlcGxhY2UoJywnLCAnJykpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIGRhdGUgPSBVdGlscy5zdHJpbmdUb0RhdGUoc2NhbGFyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIFV0aWxzLmlzTnVtZXJpYyhzY2FsYXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIEBQQVRURVJOX1RIT1VTQU5EX05VTUVSSUNfU0NBTEFSLnRlc3Qgc2NhbGFyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc2NhbGFyLnJlcGxhY2UoJywnLCAnJykpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NhbGFyXG5cbm1vZHVsZS5leHBvcnRzID0gSW5saW5lXG4iLCJcbklubGluZSAgICAgICAgICA9IHJlcXVpcmUgJy4vSW5saW5lJ1xuUGF0dGVybiAgICAgICAgID0gcmVxdWlyZSAnLi9QYXR0ZXJuJ1xuVXRpbHMgICAgICAgICAgID0gcmVxdWlyZSAnLi9VdGlscydcblBhcnNlRXhjZXB0aW9uICA9IHJlcXVpcmUgJy4vRXhjZXB0aW9uL1BhcnNlRXhjZXB0aW9uJ1xuUGFyc2VNb3JlICAgICAgID0gcmVxdWlyZSAnLi9FeGNlcHRpb24vUGFyc2VNb3JlJ1xuXG4jIFBhcnNlciBwYXJzZXMgWUFNTCBzdHJpbmdzIHRvIGNvbnZlcnQgdGhlbSB0byBKYXZhU2NyaXB0IG9iamVjdHMuXG4jXG5jbGFzcyBQYXJzZXJcblxuICAgICMgUHJlLWNvbXBpbGVkIHBhdHRlcm5zXG4gICAgI1xuICAgIFBBVFRFUk5fRk9MREVEX1NDQUxBUl9BTEw6ICAgICAgICAgICAgICBuZXcgUGF0dGVybiAnXig/Oig/PHR5cGU+IVteXFxcXHw+XSopXFxcXHMrKT8oPzxzZXBhcmF0b3I+XFxcXHx8PikoPzxtb2RpZmllcnM+XFxcXCt8XFxcXC18XFxcXGQrfFxcXFwrXFxcXGQrfFxcXFwtXFxcXGQrfFxcXFxkK1xcXFwrfFxcXFxkK1xcXFwtKT8oPzxjb21tZW50cz4gKyMuKik/JCdcbiAgICBQQVRURVJOX0ZPTERFRF9TQ0FMQVJfRU5EOiAgICAgICAgICAgICAgbmV3IFBhdHRlcm4gJyg/PHNlcGFyYXRvcj5cXFxcfHw+KSg/PG1vZGlmaWVycz5cXFxcK3xcXFxcLXxcXFxcZCt8XFxcXCtcXFxcZCt8XFxcXC1cXFxcZCt8XFxcXGQrXFxcXCt8XFxcXGQrXFxcXC0pPyg/PGNvbW1lbnRzPiArIy4qKT8kJ1xuICAgIFBBVFRFUk5fU0VRVUVOQ0VfSVRFTTogICAgICAgICAgICAgICAgICBuZXcgUGF0dGVybiAnXlxcXFwtKCg/PGxlYWRzcGFjZXM+XFxcXHMrKSg/PHZhbHVlPi4rPykpP1xcXFxzKiQnXG4gICAgUEFUVEVSTl9BTkNIT1JfVkFMVUU6ICAgICAgICAgICAgICAgICAgIG5ldyBQYXR0ZXJuICdeJig/PHJlZj5bXiBdKykgKig/PHZhbHVlPi4qKSdcbiAgICBQQVRURVJOX0NPTVBBQ1RfTk9UQVRJT046ICAgICAgICAgICAgICAgbmV3IFBhdHRlcm4gJ14oPzxrZXk+JytJbmxpbmUuUkVHRVhfUVVPVEVEX1NUUklORysnfFteIFxcJ1wiXFxcXHtcXFxcW10uKj8pICpcXFxcOihcXFxccysoPzx2YWx1ZT4uKz8pKT9cXFxccyokJ1xuICAgIFBBVFRFUk5fTUFQUElOR19JVEVNOiAgICAgICAgICAgICAgICAgICBuZXcgUGF0dGVybiAnXig/PGtleT4nK0lubGluZS5SRUdFWF9RVU9URURfU1RSSU5HKyd8W14gXFwnXCJcXFxcW1xcXFx7XS4qPykgKlxcXFw6KFxcXFxzKyg/PHZhbHVlPi4rPykpP1xcXFxzKiQnXG4gICAgUEFUVEVSTl9ERUNJTUFMOiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQYXR0ZXJuICdcXFxcZCsnXG4gICAgUEFUVEVSTl9JTkRFTlRfU1BBQ0VTOiAgICAgICAgICAgICAgICAgIG5ldyBQYXR0ZXJuICdeICsnXG4gICAgUEFUVEVSTl9UUkFJTElOR19MSU5FUzogICAgICAgICAgICAgICAgIG5ldyBQYXR0ZXJuICcoXFxuKikkJ1xuICAgIFBBVFRFUk5fWUFNTF9IRUFERVI6ICAgICAgICAgICAgICAgICAgICBuZXcgUGF0dGVybiAnXlxcXFwlWUFNTFs6IF1bXFxcXGRcXFxcLl0rLipcXG4nLCAnbSdcbiAgICBQQVRURVJOX0xFQURJTkdfQ09NTUVOVFM6ICAgICAgICAgICAgICAgbmV3IFBhdHRlcm4gJ14oXFxcXCMuKj9cXG4pKycsICdtJ1xuICAgIFBBVFRFUk5fRE9DVU1FTlRfTUFSS0VSX1NUQVJUOiAgICAgICAgICBuZXcgUGF0dGVybiAnXlxcXFwtXFxcXC1cXFxcLS4qP1xcbicsICdtJ1xuICAgIFBBVFRFUk5fRE9DVU1FTlRfTUFSS0VSX0VORDogICAgICAgICAgICBuZXcgUGF0dGVybiAnXlxcXFwuXFxcXC5cXFxcLlxcXFxzKiQnLCAnbSdcbiAgICBQQVRURVJOX0ZPTERFRF9TQ0FMQVJfQllfSU5ERU5UQVRJT046ICAge31cblxuICAgICMgQ29udGV4dCB0eXBlc1xuICAgICNcbiAgICBDT05URVhUX05PTkU6ICAgICAgIDBcbiAgICBDT05URVhUX1NFUVVFTkNFOiAgIDFcbiAgICBDT05URVhUX01BUFBJTkc6ICAgIDJcblxuXG4gICAgIyBDb25zdHJ1Y3RvclxuICAgICNcbiAgICAjIEBwYXJhbSBbSW50ZWdlcl0gIG9mZnNldCAgVGhlIG9mZnNldCBvZiBZQU1MIGRvY3VtZW50ICh1c2VkIGZvciBsaW5lIG51bWJlcnMgaW4gZXJyb3IgbWVzc2FnZXMpXG4gICAgI1xuICAgIGNvbnN0cnVjdG9yOiAoQG9mZnNldCA9IDApIC0+XG4gICAgICAgIEBsaW5lcyAgICAgICAgICA9IFtdXG4gICAgICAgIEBjdXJyZW50TGluZU5iICA9IC0xXG4gICAgICAgIEBjdXJyZW50TGluZSAgICA9ICcnXG4gICAgICAgIEByZWZzICAgICAgICAgICA9IHt9XG5cblxuICAgICMgUGFyc2VzIGEgWUFNTCBzdHJpbmcgdG8gYSBKYXZhU2NyaXB0IHZhbHVlLlxuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSAgIHZhbHVlICAgICAgICAgICAgICAgICAgIEEgWUFNTCBzdHJpbmdcbiAgICAjIEBwYXJhbSBbQm9vbGVhbl0gIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgIHRydWUgaWYgYW4gZXhjZXB0aW9uIG11c3QgYmUgdGhyb3duIG9uIGludmFsaWQgdHlwZXMgKGEgSmF2YVNjcmlwdCByZXNvdXJjZSBvciBvYmplY3QpLCBmYWxzZSBvdGhlcndpc2VcbiAgICAjIEBwYXJhbSBbRnVuY3Rpb25dIG9iamVjdERlY29kZXIgICAgICAgICAgIEEgZnVuY3Rpb24gdG8gZGVzZXJpYWxpemUgY3VzdG9tIG9iamVjdHMsIG51bGwgb3RoZXJ3aXNlXG4gICAgI1xuICAgICMgQHJldHVybiBbT2JqZWN0XSAgQSBKYXZhU2NyaXB0IHZhbHVlXG4gICAgI1xuICAgICMgQHRocm93IFtQYXJzZUV4Y2VwdGlvbl0gSWYgdGhlIFlBTUwgaXMgbm90IHZhbGlkXG4gICAgI1xuICAgIHBhcnNlOiAodmFsdWUsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgPSBmYWxzZSwgb2JqZWN0RGVjb2RlciA9IG51bGwpIC0+XG4gICAgICAgIEBjdXJyZW50TGluZU5iID0gLTFcbiAgICAgICAgQGN1cnJlbnRMaW5lID0gJydcbiAgICAgICAgQGxpbmVzID0gQGNsZWFudXAodmFsdWUpLnNwbGl0IFwiXFxuXCJcblxuICAgICAgICBkYXRhID0gbnVsbFxuICAgICAgICBjb250ZXh0ID0gQENPTlRFWFRfTk9ORVxuICAgICAgICBhbGxvd092ZXJ3cml0ZSA9IGZhbHNlXG4gICAgICAgIHdoaWxlIEBtb3ZlVG9OZXh0TGluZSgpXG4gICAgICAgICAgICBpZiBAaXNDdXJyZW50TGluZUVtcHR5KClcbiAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAjIFRhYj9cbiAgICAgICAgICAgIGlmIFwiXFx0XCIgaXMgQGN1cnJlbnRMaW5lWzBdXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlRXhjZXB0aW9uICdBIFlBTUwgZmlsZSBjYW5ub3QgY29udGFpbiB0YWJzIGFzIGluZGVudGF0aW9uLicsIEBnZXRSZWFsQ3VycmVudExpbmVOYigpICsgMSwgQGN1cnJlbnRMaW5lXG5cbiAgICAgICAgICAgIGlzUmVmID0gbWVyZ2VOb2RlID0gZmFsc2VcbiAgICAgICAgICAgIGlmIHZhbHVlcyA9IEBQQVRURVJOX1NFUVVFTkNFX0lURU0uZXhlYyBAY3VycmVudExpbmVcbiAgICAgICAgICAgICAgICBpZiBAQ09OVEVYVF9NQVBQSU5HIGlzIGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlRXhjZXB0aW9uICdZb3UgY2Fubm90IGRlZmluZSBhIHNlcXVlbmNlIGl0ZW0gd2hlbiBpbiBhIG1hcHBpbmcnXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IEBDT05URVhUX1NFUVVFTkNFXG4gICAgICAgICAgICAgICAgZGF0YSA/PSBbXVxuXG4gICAgICAgICAgICAgICAgaWYgdmFsdWVzLnZhbHVlPyBhbmQgbWF0Y2hlcyA9IEBQQVRURVJOX0FOQ0hPUl9WQUxVRS5leGVjIHZhbHVlcy52YWx1ZVxuICAgICAgICAgICAgICAgICAgICBpc1JlZiA9IG1hdGNoZXMucmVmXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy52YWx1ZSA9IG1hdGNoZXMudmFsdWVcblxuICAgICAgICAgICAgICAgICMgQXJyYXlcbiAgICAgICAgICAgICAgICBpZiBub3QodmFsdWVzLnZhbHVlPykgb3IgJycgaXMgVXRpbHMudHJpbSh2YWx1ZXMudmFsdWUsICcgJykgb3IgVXRpbHMubHRyaW0odmFsdWVzLnZhbHVlLCAnICcpLmluZGV4T2YoJyMnKSBpcyAwXG4gICAgICAgICAgICAgICAgICAgIGlmIEBjdXJyZW50TGluZU5iIDwgQGxpbmVzLmxlbmd0aCAtIDEgYW5kIG5vdCBAaXNOZXh0TGluZVVuSW5kZW50ZWRDb2xsZWN0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBAZ2V0UmVhbEN1cnJlbnRMaW5lTmIoKSArIDFcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlciA9IG5ldyBQYXJzZXIgY1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyLnJlZnMgPSBAcmVmc1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoIHBhcnNlci5wYXJzZShAZ2V0TmV4dEVtYmVkQmxvY2sobnVsbCwgdHJ1ZSksIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdERlY29kZXIpXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaCBudWxsXG5cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGlmIHZhbHVlcy5sZWFkc3BhY2VzPy5sZW5ndGggYW5kIG1hdGNoZXMgPSBAUEFUVEVSTl9DT01QQUNUX05PVEFUSU9OLmV4ZWMgdmFsdWVzLnZhbHVlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICMgVGhpcyBpcyBhIGNvbXBhY3Qgbm90YXRpb24gZWxlbWVudCwgYWRkIHRvIG5leHQgYmxvY2sgYW5kIHBhcnNlXG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gQGdldFJlYWxDdXJyZW50TGluZU5iKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlciA9IG5ldyBQYXJzZXIgY1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyLnJlZnMgPSBAcmVmc1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jayA9IHZhbHVlcy52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZW50ID0gQGdldEN1cnJlbnRMaW5lSW5kZW50YXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgQGlzTmV4dExpbmVJbmRlbnRlZChmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9jayArPSBcIlxcblwiK0BnZXROZXh0RW1iZWRCbG9jayhpbmRlbnQgKyB2YWx1ZXMubGVhZHNwYWNlcy5sZW5ndGggKyAxLCB0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnB1c2ggcGFyc2VyLnBhcnNlIGJsb2NrLCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoIEBwYXJzZVZhbHVlIHZhbHVlcy52YWx1ZSwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSwgb2JqZWN0RGVjb2RlclxuXG4gICAgICAgICAgICBlbHNlIGlmICh2YWx1ZXMgPSBAUEFUVEVSTl9NQVBQSU5HX0lURU0uZXhlYyBAY3VycmVudExpbmUpIGFuZCB2YWx1ZXMua2V5LmluZGV4T2YoJyAjJykgaXMgLTFcbiAgICAgICAgICAgICAgICBpZiBAQ09OVEVYVF9TRVFVRU5DRSBpcyBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZUV4Y2VwdGlvbiAnWW91IGNhbm5vdCBkZWZpbmUgYSBtYXBwaW5nIGl0ZW0gd2hlbiBpbiBhIHNlcXVlbmNlJ1xuICAgICAgICAgICAgICAgIGNvbnRleHQgPSBAQ09OVEVYVF9NQVBQSU5HXG4gICAgICAgICAgICAgICAgZGF0YSA/PSB7fVxuXG4gICAgICAgICAgICAgICAgIyBGb3JjZSBjb3JyZWN0IHNldHRpbmdzXG4gICAgICAgICAgICAgICAgSW5saW5lLmNvbmZpZ3VyZSBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyXG4gICAgICAgICAgICAgICAgdHJ5XG4gICAgICAgICAgICAgICAgICAgIGtleSA9IElubGluZS5wYXJzZVNjYWxhciB2YWx1ZXMua2V5XG4gICAgICAgICAgICAgICAgY2F0Y2ggZVxuICAgICAgICAgICAgICAgICAgICBlLnBhcnNlZExpbmUgPSBAZ2V0UmVhbEN1cnJlbnRMaW5lTmIoKSArIDFcbiAgICAgICAgICAgICAgICAgICAgZS5zbmlwcGV0ID0gQGN1cnJlbnRMaW5lXG5cbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZVxuXG4gICAgICAgICAgICAgICAgaWYgJzw8JyBpcyBrZXlcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VOb2RlID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBhbGxvd092ZXJ3cml0ZSA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgaWYgdmFsdWVzLnZhbHVlPy5pbmRleE9mKCcqJykgaXMgMFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVmTmFtZSA9IHZhbHVlcy52YWx1ZVsxLi5dXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmxlc3MgQHJlZnNbcmVmTmFtZV0/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlRXhjZXB0aW9uICdSZWZlcmVuY2UgXCInK3JlZk5hbWUrJ1wiIGRvZXMgbm90IGV4aXN0LicsIEBnZXRSZWFsQ3VycmVudExpbmVOYigpICsgMSwgQGN1cnJlbnRMaW5lXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZlZhbHVlID0gQHJlZnNbcmVmTmFtZV1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgdHlwZW9mIHJlZlZhbHVlIGlzbnQgJ29iamVjdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUGFyc2VFeGNlcHRpb24gJ1lBTUwgbWVyZ2Uga2V5cyB1c2VkIHdpdGggYSBzY2FsYXIgdmFsdWUgaW5zdGVhZCBvZiBhbiBvYmplY3QuJywgQGdldFJlYWxDdXJyZW50TGluZU5iKCkgKyAxLCBAY3VycmVudExpbmVcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgcmVmVmFsdWUgaW5zdGFuY2VvZiBBcnJheVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgTWVyZ2UgYXJyYXkgd2l0aCBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgdmFsdWUsIGkgaW4gcmVmVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtTdHJpbmcoaSldID89IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBNZXJnZSBvYmplY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIGtleSwgdmFsdWUgb2YgcmVmVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID89IHZhbHVlXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgdmFsdWVzLnZhbHVlPyBhbmQgdmFsdWVzLnZhbHVlIGlzbnQgJydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlcy52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gQGdldE5leHRFbWJlZEJsb2NrKClcblxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IEBnZXRSZWFsQ3VycmVudExpbmVOYigpICsgMVxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyID0gbmV3IFBhcnNlciBjXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXIucmVmcyA9IEByZWZzXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWQgPSBwYXJzZXIucGFyc2UgdmFsdWUsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGVcblxuICAgICAgICAgICAgICAgICAgICAgICAgdW5sZXNzIHR5cGVvZiBwYXJzZWQgaXMgJ29iamVjdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUGFyc2VFeGNlcHRpb24gJ1lBTUwgbWVyZ2Uga2V5cyB1c2VkIHdpdGggYSBzY2FsYXIgdmFsdWUgaW5zdGVhZCBvZiBhbiBvYmplY3QuJywgQGdldFJlYWxDdXJyZW50TGluZU5iKCkgKyAxLCBAY3VycmVudExpbmVcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgcGFyc2VkIGluc3RhbmNlb2YgQXJyYXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIElmIHRoZSB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIG1lcmdlIGtleSBpcyBhIHNlcXVlbmNlLCB0aGVuIHRoaXMgc2VxdWVuY2UgaXMgZXhwZWN0ZWQgdG8gY29udGFpbiBtYXBwaW5nIG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBhbmQgZWFjaCBvZiB0aGVzZSBub2RlcyBpcyBtZXJnZWQgaW4gdHVybiBhY2NvcmRpbmcgdG8gaXRzIG9yZGVyIGluIHRoZSBzZXF1ZW5jZS4gS2V5cyBpbiBtYXBwaW5nIG5vZGVzIGVhcmxpZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIGluIHRoZSBzZXF1ZW5jZSBvdmVycmlkZSBrZXlzIHNwZWNpZmllZCBpbiBsYXRlciBtYXBwaW5nIG5vZGVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciBwYXJzZWRJdGVtIGluIHBhcnNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmxlc3MgdHlwZW9mIHBhcnNlZEl0ZW0gaXMgJ29iamVjdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZUV4Y2VwdGlvbiAnTWVyZ2UgaXRlbXMgbXVzdCBiZSBvYmplY3RzLicsIEBnZXRSZWFsQ3VycmVudExpbmVOYigpICsgMSwgcGFyc2VkSXRlbVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIHBhcnNlZEl0ZW0gaW5zdGFuY2VvZiBBcnJheVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBNZXJnZSBhcnJheSB3aXRoIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIHZhbHVlLCBpIGluIHBhcnNlZEl0ZW1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrID0gU3RyaW5nKGkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5sZXNzIGRhdGEuaGFzT3duUHJvcGVydHkoaylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrXSA9IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgTWVyZ2Ugb2JqZWN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIGtleSwgdmFsdWUgb2YgcGFyc2VkSXRlbVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVubGVzcyBkYXRhLmhhc093blByb3BlcnR5KGtleSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gdmFsdWVcblxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgSWYgdGhlIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUga2V5IGlzIGEgc2luZ2xlIG1hcHBpbmcgbm9kZSwgZWFjaCBvZiBpdHMga2V5L3ZhbHVlIHBhaXJzIGlzIGluc2VydGVkIGludG8gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBjdXJyZW50IG1hcHBpbmcsIHVubGVzcyB0aGUga2V5IGFscmVhZHkgZXhpc3RzIGluIGl0LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciBrZXksIHZhbHVlIG9mIHBhcnNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmxlc3MgZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSB2YWx1ZVxuXG4gICAgICAgICAgICAgICAgZWxzZSBpZiB2YWx1ZXMudmFsdWU/IGFuZCBtYXRjaGVzID0gQFBBVFRFUk5fQU5DSE9SX1ZBTFVFLmV4ZWMgdmFsdWVzLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGlzUmVmID0gbWF0Y2hlcy5yZWZcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnZhbHVlID0gbWF0Y2hlcy52YWx1ZVxuXG5cbiAgICAgICAgICAgICAgICBpZiBtZXJnZU5vZGVcbiAgICAgICAgICAgICAgICAgICAgIyBNZXJnZSBrZXlzXG4gICAgICAgICAgICAgICAgZWxzZSBpZiBub3QodmFsdWVzLnZhbHVlPykgb3IgJycgaXMgVXRpbHMudHJpbSh2YWx1ZXMudmFsdWUsICcgJykgb3IgVXRpbHMubHRyaW0odmFsdWVzLnZhbHVlLCAnICcpLmluZGV4T2YoJyMnKSBpcyAwXG4gICAgICAgICAgICAgICAgICAgICMgSGFzaFxuICAgICAgICAgICAgICAgICAgICAjIGlmIG5leHQgbGluZSBpcyBsZXNzIGluZGVudGVkIG9yIGVxdWFsLCB0aGVuIGl0IG1lYW5zIHRoYXQgdGhlIGN1cnJlbnQgdmFsdWUgaXMgbnVsbFxuICAgICAgICAgICAgICAgICAgICBpZiBub3QoQGlzTmV4dExpbmVJbmRlbnRlZCgpKSBhbmQgbm90KEBpc05leHRMaW5lVW5JbmRlbnRlZENvbGxlY3Rpb24oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICMgU3BlYzogS2V5cyBNVVNUIGJlIHVuaXF1ZTsgZmlyc3Qgb25lIHdpbnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAjIEJ1dCBvdmVyd3JpdGluZyBpcyBhbGxvd2VkIHdoZW4gYSBtZXJnZSBub2RlIGlzIHVzZWQgaW4gY3VycmVudCBibG9jay5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIGFsbG93T3ZlcndyaXRlIG9yIGRhdGFba2V5XSBpcyB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSBudWxsXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IEBnZXRSZWFsQ3VycmVudExpbmVOYigpICsgMVxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyID0gbmV3IFBhcnNlciBjXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXIucmVmcyA9IEByZWZzXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBwYXJzZXIucGFyc2UgQGdldE5leHRFbWJlZEJsb2NrKCksIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdERlY29kZXJcblxuICAgICAgICAgICAgICAgICAgICAgICAgIyBTcGVjOiBLZXlzIE1VU1QgYmUgdW5pcXVlOyBmaXJzdCBvbmUgd2lucy5cbiAgICAgICAgICAgICAgICAgICAgICAgICMgQnV0IG92ZXJ3cml0aW5nIGlzIGFsbG93ZWQgd2hlbiBhIG1lcmdlIG5vZGUgaXMgdXNlZCBpbiBjdXJyZW50IGJsb2NrLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgYWxsb3dPdmVyd3JpdGUgb3IgZGF0YVtrZXldIGlzIHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9IHZhbFxuXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICB2YWwgPSBAcGFyc2VWYWx1ZSB2YWx1ZXMudmFsdWUsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdERlY29kZXJcblxuICAgICAgICAgICAgICAgICAgICAjIFNwZWM6IEtleXMgTVVTVCBiZSB1bmlxdWU7IGZpcnN0IG9uZSB3aW5zLlxuICAgICAgICAgICAgICAgICAgICAjIEJ1dCBvdmVyd3JpdGluZyBpcyBhbGxvd2VkIHdoZW4gYSBtZXJnZSBub2RlIGlzIHVzZWQgaW4gY3VycmVudCBibG9jay5cbiAgICAgICAgICAgICAgICAgICAgaWYgYWxsb3dPdmVyd3JpdGUgb3IgZGF0YVtrZXldIGlzIHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gdmFsXG5cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAjIDEtbGluZXIgb3B0aW9uYWxseSBmb2xsb3dlZCBieSBuZXdsaW5lXG4gICAgICAgICAgICAgICAgbGluZUNvdW50ID0gQGxpbmVzLmxlbmd0aFxuICAgICAgICAgICAgICAgIGlmIDEgaXMgbGluZUNvdW50IG9yICgyIGlzIGxpbmVDb3VudCBhbmQgVXRpbHMuaXNFbXB0eShAbGluZXNbMV0pKVxuICAgICAgICAgICAgICAgICAgICB0cnlcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gSW5saW5lLnBhcnNlIEBsaW5lc1swXSwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSwgb2JqZWN0RGVjb2RlclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCBlXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnBhcnNlZExpbmUgPSBAZ2V0UmVhbEN1cnJlbnRMaW5lTmIoKSArIDFcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc25pcHBldCA9IEBjdXJyZW50TGluZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgdHlwZW9mIHZhbHVlIGlzICdvYmplY3QnXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiB2YWx1ZSBpbnN0YW5jZW9mIEFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3QgPSB2YWx1ZVswXVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciBrZXkgb2YgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3QgPSB2YWx1ZVtrZXldXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIHR5cGVvZiBmaXJzdCBpcyAnc3RyaW5nJyBhbmQgZmlyc3QuaW5kZXhPZignKicpIGlzIDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gW11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgYWxpYXMgaW4gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoIEByZWZzW2FsaWFzWzEuLl1dXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBkYXRhXG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlXG5cbiAgICAgICAgICAgICAgICBlbHNlIGlmIFV0aWxzLmx0cmltKHZhbHVlKS5jaGFyQXQoMCkgaW4gWydbJywgJ3snXVxuICAgICAgICAgICAgICAgICAgICB0cnlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJbmxpbmUucGFyc2UgdmFsdWUsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdERlY29kZXJcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggZVxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wYXJzZWRMaW5lID0gQGdldFJlYWxDdXJyZW50TGluZU5iKCkgKyAxXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnNuaXBwZXQgPSBAY3VycmVudExpbmVcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZVxuXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlRXhjZXB0aW9uICdVbmFibGUgdG8gcGFyc2UuJywgQGdldFJlYWxDdXJyZW50TGluZU5iKCkgKyAxLCBAY3VycmVudExpbmVcblxuICAgICAgICAgICAgaWYgaXNSZWZcbiAgICAgICAgICAgICAgICBpZiBkYXRhIGluc3RhbmNlb2YgQXJyYXlcbiAgICAgICAgICAgICAgICAgICAgQHJlZnNbaXNSZWZdID0gZGF0YVtkYXRhLmxlbmd0aC0xXVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgbGFzdEtleSA9IG51bGxcbiAgICAgICAgICAgICAgICAgICAgZm9yIGtleSBvZiBkYXRhXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0S2V5ID0ga2V5XG4gICAgICAgICAgICAgICAgICAgIEByZWZzW2lzUmVmXSA9IGRhdGFbbGFzdEtleV1cblxuXG4gICAgICAgIGlmIFV0aWxzLmlzRW1wdHkoZGF0YSlcbiAgICAgICAgICAgIHJldHVybiBudWxsXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBkYXRhXG5cblxuXG4gICAgIyBSZXR1cm5zIHRoZSBjdXJyZW50IGxpbmUgbnVtYmVyICh0YWtlcyB0aGUgb2Zmc2V0IGludG8gYWNjb3VudCkuXG4gICAgI1xuICAgICMgQHJldHVybiBbSW50ZWdlcl0gICAgIFRoZSBjdXJyZW50IGxpbmUgbnVtYmVyXG4gICAgI1xuICAgIGdldFJlYWxDdXJyZW50TGluZU5iOiAtPlxuICAgICAgICByZXR1cm4gQGN1cnJlbnRMaW5lTmIgKyBAb2Zmc2V0XG5cblxuICAgICMgUmV0dXJucyB0aGUgY3VycmVudCBsaW5lIGluZGVudGF0aW9uLlxuICAgICNcbiAgICAjIEByZXR1cm4gW0ludGVnZXJdICAgICBUaGUgY3VycmVudCBsaW5lIGluZGVudGF0aW9uXG4gICAgI1xuICAgIGdldEN1cnJlbnRMaW5lSW5kZW50YXRpb246IC0+XG4gICAgICAgIHJldHVybiBAY3VycmVudExpbmUubGVuZ3RoIC0gVXRpbHMubHRyaW0oQGN1cnJlbnRMaW5lLCAnICcpLmxlbmd0aFxuXG5cbiAgICAjIFJldHVybnMgdGhlIG5leHQgZW1iZWQgYmxvY2sgb2YgWUFNTC5cbiAgICAjXG4gICAgIyBAcGFyYW0gW0ludGVnZXJdICAgICAgICAgIGluZGVudGF0aW9uIFRoZSBpbmRlbnQgbGV2ZWwgYXQgd2hpY2ggdGhlIGJsb2NrIGlzIHRvIGJlIHJlYWQsIG9yIG51bGwgZm9yIGRlZmF1bHRcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddICAgICAgICAgIEEgWUFNTCBzdHJpbmdcbiAgICAjXG4gICAgIyBAdGhyb3cgW1BhcnNlRXhjZXB0aW9uXSAgIFdoZW4gaW5kZW50YXRpb24gcHJvYmxlbSBhcmUgZGV0ZWN0ZWRcbiAgICAjXG4gICAgZ2V0TmV4dEVtYmVkQmxvY2s6IChpbmRlbnRhdGlvbiA9IG51bGwsIGluY2x1ZGVVbmluZGVudGVkQ29sbGVjdGlvbiA9IGZhbHNlKSAtPlxuICAgICAgICBAbW92ZVRvTmV4dExpbmUoKVxuXG4gICAgICAgIGlmIG5vdCBpbmRlbnRhdGlvbj9cbiAgICAgICAgICAgIG5ld0luZGVudCA9IEBnZXRDdXJyZW50TGluZUluZGVudGF0aW9uKClcblxuICAgICAgICAgICAgdW5pbmRlbnRlZEVtYmVkQmxvY2sgPSBAaXNTdHJpbmdVbkluZGVudGVkQ29sbGVjdGlvbkl0ZW0gQGN1cnJlbnRMaW5lXG5cbiAgICAgICAgICAgIGlmIG5vdChAaXNDdXJyZW50TGluZUVtcHR5KCkpIGFuZCAwIGlzIG5ld0luZGVudCBhbmQgbm90KHVuaW5kZW50ZWRFbWJlZEJsb2NrKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZUV4Y2VwdGlvbiAnSW5kZW50YXRpb24gcHJvYmxlbS4nLCBAZ2V0UmVhbEN1cnJlbnRMaW5lTmIoKSArIDEsIEBjdXJyZW50TGluZVxuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIG5ld0luZGVudCA9IGluZGVudGF0aW9uXG5cblxuICAgICAgICBkYXRhID0gW0BjdXJyZW50TGluZVtuZXdJbmRlbnQuLl1dXG5cbiAgICAgICAgdW5sZXNzIGluY2x1ZGVVbmluZGVudGVkQ29sbGVjdGlvblxuICAgICAgICAgICAgaXNJdFVuaW5kZW50ZWRDb2xsZWN0aW9uID0gQGlzU3RyaW5nVW5JbmRlbnRlZENvbGxlY3Rpb25JdGVtIEBjdXJyZW50TGluZVxuXG4gICAgICAgICMgQ29tbWVudHMgbXVzdCBub3QgYmUgcmVtb3ZlZCBpbnNpZGUgYSBzdHJpbmcgYmxvY2sgKGllLiBhZnRlciBhIGxpbmUgZW5kaW5nIHdpdGggXCJ8XCIpXG4gICAgICAgICMgVGhleSBtdXN0IG5vdCBiZSByZW1vdmVkIGluc2lkZSBhIHN1Yi1lbWJlZGRlZCBibG9jayBhcyB3ZWxsXG4gICAgICAgIHJlbW92ZUNvbW1lbnRzUGF0dGVybiA9IEBQQVRURVJOX0ZPTERFRF9TQ0FMQVJfRU5EXG4gICAgICAgIHJlbW92ZUNvbW1lbnRzID0gbm90IHJlbW92ZUNvbW1lbnRzUGF0dGVybi50ZXN0IEBjdXJyZW50TGluZVxuXG4gICAgICAgIHdoaWxlIEBtb3ZlVG9OZXh0TGluZSgpXG4gICAgICAgICAgICBpbmRlbnQgPSBAZ2V0Q3VycmVudExpbmVJbmRlbnRhdGlvbigpXG5cbiAgICAgICAgICAgIGlmIGluZGVudCBpcyBuZXdJbmRlbnRcbiAgICAgICAgICAgICAgICByZW1vdmVDb21tZW50cyA9IG5vdCByZW1vdmVDb21tZW50c1BhdHRlcm4udGVzdCBAY3VycmVudExpbmVcblxuICAgICAgICAgICAgaWYgcmVtb3ZlQ29tbWVudHMgYW5kIEBpc0N1cnJlbnRMaW5lQ29tbWVudCgpXG4gICAgICAgICAgICAgICAgY29udGludWVcblxuICAgICAgICAgICAgaWYgQGlzQ3VycmVudExpbmVCbGFuaygpXG4gICAgICAgICAgICAgICAgZGF0YS5wdXNoIEBjdXJyZW50TGluZVtuZXdJbmRlbnQuLl1cbiAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICBpZiBpc0l0VW5pbmRlbnRlZENvbGxlY3Rpb24gYW5kIG5vdCBAaXNTdHJpbmdVbkluZGVudGVkQ29sbGVjdGlvbkl0ZW0oQGN1cnJlbnRMaW5lKSBhbmQgaW5kZW50IGlzIG5ld0luZGVudFxuICAgICAgICAgICAgICAgIEBtb3ZlVG9QcmV2aW91c0xpbmUoKVxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICAgIGlmIGluZGVudCA+PSBuZXdJbmRlbnRcbiAgICAgICAgICAgICAgICBkYXRhLnB1c2ggQGN1cnJlbnRMaW5lW25ld0luZGVudC4uXVxuICAgICAgICAgICAgZWxzZSBpZiBVdGlscy5sdHJpbShAY3VycmVudExpbmUpLmNoYXJBdCgwKSBpcyAnIydcbiAgICAgICAgICAgICAgICAjIERvbid0IGFkZCBsaW5lIHdpdGggY29tbWVudHNcbiAgICAgICAgICAgIGVsc2UgaWYgMCBpcyBpbmRlbnRcbiAgICAgICAgICAgICAgICBAbW92ZVRvUHJldmlvdXNMaW5lKClcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZUV4Y2VwdGlvbiAnSW5kZW50YXRpb24gcHJvYmxlbS4nLCBAZ2V0UmVhbEN1cnJlbnRMaW5lTmIoKSArIDEsIEBjdXJyZW50TGluZVxuXG5cbiAgICAgICAgcmV0dXJuIGRhdGEuam9pbiBcIlxcblwiXG5cblxuICAgICMgTW92ZXMgdGhlIHBhcnNlciB0byB0aGUgbmV4dCBsaW5lLlxuICAgICNcbiAgICAjIEByZXR1cm4gW0Jvb2xlYW5dXG4gICAgI1xuICAgIG1vdmVUb05leHRMaW5lOiAtPlxuICAgICAgICBpZiBAY3VycmVudExpbmVOYiA+PSBAbGluZXMubGVuZ3RoIC0gMVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgICAgQGN1cnJlbnRMaW5lID0gQGxpbmVzWysrQGN1cnJlbnRMaW5lTmJdO1xuXG4gICAgICAgIHJldHVybiB0cnVlXG5cblxuICAgICMgTW92ZXMgdGhlIHBhcnNlciB0byB0aGUgcHJldmlvdXMgbGluZS5cbiAgICAjXG4gICAgbW92ZVRvUHJldmlvdXNMaW5lOiAtPlxuICAgICAgICBAY3VycmVudExpbmUgPSBAbGluZXNbLS1AY3VycmVudExpbmVOYl1cbiAgICAgICAgcmV0dXJuXG5cblxuICAgICMgUGFyc2VzIGEgWUFNTCB2YWx1ZS5cbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICB2YWx1ZSAgICAgICAgICAgICAgICAgICBBIFlBTUwgdmFsdWVcbiAgICAjIEBwYXJhbSBbQm9vbGVhbl0gIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgIHRydWUgaWYgYW4gZXhjZXB0aW9uIG11c3QgYmUgdGhyb3duIG9uIGludmFsaWQgdHlwZXMgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgIyBAcGFyYW0gW0Z1bmN0aW9uXSBvYmplY3REZWNvZGVyICAgICAgICAgICBBIGZ1bmN0aW9uIHRvIGRlc2VyaWFsaXplIGN1c3RvbSBvYmplY3RzLCBudWxsIG90aGVyd2lzZVxuICAgICNcbiAgICAjIEByZXR1cm4gW09iamVjdF0gQSBKYXZhU2NyaXB0IHZhbHVlXG4gICAgI1xuICAgICMgQHRocm93IFtQYXJzZUV4Y2VwdGlvbl0gV2hlbiByZWZlcmVuY2UgZG9lcyBub3QgZXhpc3RcbiAgICAjXG4gICAgcGFyc2VWYWx1ZTogKHZhbHVlLCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyKSAtPlxuICAgICAgICBpZiAwIGlzIHZhbHVlLmluZGV4T2YoJyonKVxuICAgICAgICAgICAgcG9zID0gdmFsdWUuaW5kZXhPZiAnIydcbiAgICAgICAgICAgIGlmIHBvcyBpc250IC0xXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHIoMSwgcG9zLTIpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVsxLi5dXG5cbiAgICAgICAgICAgIGlmIEByZWZzW3ZhbHVlXSBpcyB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUGFyc2VFeGNlcHRpb24gJ1JlZmVyZW5jZSBcIicrdmFsdWUrJ1wiIGRvZXMgbm90IGV4aXN0LicsIEBjdXJyZW50TGluZVxuXG4gICAgICAgICAgICByZXR1cm4gQHJlZnNbdmFsdWVdXG5cblxuICAgICAgICBpZiBtYXRjaGVzID0gQFBBVFRFUk5fRk9MREVEX1NDQUxBUl9BTEwuZXhlYyB2YWx1ZVxuICAgICAgICAgICAgbW9kaWZpZXJzID0gbWF0Y2hlcy5tb2RpZmllcnMgPyAnJ1xuXG4gICAgICAgICAgICBmb2xkZWRJbmRlbnQgPSBNYXRoLmFicyhwYXJzZUludChtb2RpZmllcnMpKVxuICAgICAgICAgICAgaWYgaXNOYU4oZm9sZGVkSW5kZW50KSB0aGVuIGZvbGRlZEluZGVudCA9IDBcbiAgICAgICAgICAgIHZhbCA9IEBwYXJzZUZvbGRlZFNjYWxhciBtYXRjaGVzLnNlcGFyYXRvciwgQFBBVFRFUk5fREVDSU1BTC5yZXBsYWNlKG1vZGlmaWVycywgJycpLCBmb2xkZWRJbmRlbnRcbiAgICAgICAgICAgIGlmIG1hdGNoZXMudHlwZT9cbiAgICAgICAgICAgICAgICAjIEZvcmNlIGNvcnJlY3Qgc2V0dGluZ3NcbiAgICAgICAgICAgICAgICBJbmxpbmUuY29uZmlndXJlIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdERlY29kZXJcbiAgICAgICAgICAgICAgICByZXR1cm4gSW5saW5lLnBhcnNlU2NhbGFyIG1hdGNoZXMudHlwZSsnICcrdmFsXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbFxuXG4gICAgICAgICMgVmFsdWUgY2FuIGJlIG11bHRpbGluZSBjb21wYWN0IHNlcXVlbmNlIG9yIG1hcHBpbmcgb3Igc3RyaW5nXG4gICAgICAgIGlmIHZhbHVlLmNoYXJBdCgwKSBpbiBbJ1snLCAneycsICdcIicsIFwiJ1wiXVxuICAgICAgICAgICAgd2hpbGUgdHJ1ZVxuICAgICAgICAgICAgICAgIHRyeVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSW5saW5lLnBhcnNlIHZhbHVlLCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyXG4gICAgICAgICAgICAgICAgY2F0Y2ggZVxuICAgICAgICAgICAgICAgICAgICBpZiBlIGluc3RhbmNlb2YgUGFyc2VNb3JlIGFuZCBAbW92ZVRvTmV4dExpbmUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gXCJcXG5cIiArIFV0aWxzLnRyaW0oQGN1cnJlbnRMaW5lLCAnICcpXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucGFyc2VkTGluZSA9IEBnZXRSZWFsQ3VycmVudExpbmVOYigpICsgMVxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zbmlwcGV0ID0gQGN1cnJlbnRMaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGlmIEBpc05leHRMaW5lSW5kZW50ZWQoKVxuICAgICAgICAgICAgICAgIHZhbHVlICs9IFwiXFxuXCIgKyBAZ2V0TmV4dEVtYmVkQmxvY2soKVxuICAgICAgICAgICAgcmV0dXJuIElubGluZS5wYXJzZSB2YWx1ZSwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSwgb2JqZWN0RGVjb2RlclxuXG4gICAgICAgIHJldHVyblxuXG5cbiAgICAjIFBhcnNlcyBhIGZvbGRlZCBzY2FsYXIuXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddICAgICAgIHNlcGFyYXRvciAgIFRoZSBzZXBhcmF0b3IgdGhhdCB3YXMgdXNlZCB0byBiZWdpbiB0aGlzIGZvbGRlZCBzY2FsYXIgKHwgb3IgPilcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSAgICAgICBpbmRpY2F0b3IgICBUaGUgaW5kaWNhdG9yIHRoYXQgd2FzIHVzZWQgdG8gYmVnaW4gdGhpcyBmb2xkZWQgc2NhbGFyICgrIG9yIC0pXG4gICAgIyBAcGFyYW0gW0ludGVnZXJdICAgICAgaW5kZW50YXRpb24gVGhlIGluZGVudGF0aW9uIHRoYXQgd2FzIHVzZWQgdG8gYmVnaW4gdGhpcyBmb2xkZWQgc2NhbGFyXG4gICAgI1xuICAgICMgQHJldHVybiBbU3RyaW5nXSAgICAgIFRoZSB0ZXh0IHZhbHVlXG4gICAgI1xuICAgIHBhcnNlRm9sZGVkU2NhbGFyOiAoc2VwYXJhdG9yLCBpbmRpY2F0b3IgPSAnJywgaW5kZW50YXRpb24gPSAwKSAtPlxuICAgICAgICBub3RFT0YgPSBAbW92ZVRvTmV4dExpbmUoKVxuICAgICAgICBpZiBub3Qgbm90RU9GXG4gICAgICAgICAgICByZXR1cm4gJydcblxuICAgICAgICBpc0N1cnJlbnRMaW5lQmxhbmsgPSBAaXNDdXJyZW50TGluZUJsYW5rKClcbiAgICAgICAgdGV4dCA9ICcnXG5cbiAgICAgICAgIyBMZWFkaW5nIGJsYW5rIGxpbmVzIGFyZSBjb25zdW1lZCBiZWZvcmUgZGV0ZXJtaW5pbmcgaW5kZW50YXRpb25cbiAgICAgICAgd2hpbGUgbm90RU9GIGFuZCBpc0N1cnJlbnRMaW5lQmxhbmtcbiAgICAgICAgICAgICMgbmV3bGluZSBvbmx5IGlmIG5vdCBFT0ZcbiAgICAgICAgICAgIGlmIG5vdEVPRiA9IEBtb3ZlVG9OZXh0TGluZSgpXG4gICAgICAgICAgICAgICAgdGV4dCArPSBcIlxcblwiXG4gICAgICAgICAgICAgICAgaXNDdXJyZW50TGluZUJsYW5rID0gQGlzQ3VycmVudExpbmVCbGFuaygpXG5cblxuICAgICAgICAjIERldGVybWluZSBpbmRlbnRhdGlvbiBpZiBub3Qgc3BlY2lmaWVkXG4gICAgICAgIGlmIDAgaXMgaW5kZW50YXRpb25cbiAgICAgICAgICAgIGlmIG1hdGNoZXMgPSBAUEFUVEVSTl9JTkRFTlRfU1BBQ0VTLmV4ZWMgQGN1cnJlbnRMaW5lXG4gICAgICAgICAgICAgICAgaW5kZW50YXRpb24gPSBtYXRjaGVzWzBdLmxlbmd0aFxuXG5cbiAgICAgICAgaWYgaW5kZW50YXRpb24gPiAwXG4gICAgICAgICAgICBwYXR0ZXJuID0gQFBBVFRFUk5fRk9MREVEX1NDQUxBUl9CWV9JTkRFTlRBVElPTltpbmRlbnRhdGlvbl1cbiAgICAgICAgICAgIHVubGVzcyBwYXR0ZXJuP1xuICAgICAgICAgICAgICAgIHBhdHRlcm4gPSBuZXcgUGF0dGVybiAnXiB7JytpbmRlbnRhdGlvbisnfSguKikkJ1xuICAgICAgICAgICAgICAgIFBhcnNlcjo6UEFUVEVSTl9GT0xERURfU0NBTEFSX0JZX0lOREVOVEFUSU9OW2luZGVudGF0aW9uXSA9IHBhdHRlcm5cblxuICAgICAgICAgICAgd2hpbGUgbm90RU9GIGFuZCAoaXNDdXJyZW50TGluZUJsYW5rIG9yIG1hdGNoZXMgPSBwYXR0ZXJuLmV4ZWMgQGN1cnJlbnRMaW5lKVxuICAgICAgICAgICAgICAgIGlmIGlzQ3VycmVudExpbmVCbGFua1xuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IEBjdXJyZW50TGluZVtpbmRlbnRhdGlvbi4uXVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgdGV4dCArPSBtYXRjaGVzWzFdXG5cbiAgICAgICAgICAgICAgICAjIG5ld2xpbmUgb25seSBpZiBub3QgRU9GXG4gICAgICAgICAgICAgICAgaWYgbm90RU9GID0gQG1vdmVUb05leHRMaW5lKClcbiAgICAgICAgICAgICAgICAgICAgdGV4dCArPSBcIlxcblwiXG4gICAgICAgICAgICAgICAgICAgIGlzQ3VycmVudExpbmVCbGFuayA9IEBpc0N1cnJlbnRMaW5lQmxhbmsoKVxuXG4gICAgICAgIGVsc2UgaWYgbm90RU9GXG4gICAgICAgICAgICB0ZXh0ICs9IFwiXFxuXCJcblxuXG4gICAgICAgIGlmIG5vdEVPRlxuICAgICAgICAgICAgQG1vdmVUb1ByZXZpb3VzTGluZSgpXG5cblxuICAgICAgICAjIFJlbW92ZSBsaW5lIGJyZWFrcyBvZiBlYWNoIGxpbmVzIGV4Y2VwdCB0aGUgZW1wdHkgYW5kIG1vcmUgaW5kZW50ZWQgb25lc1xuICAgICAgICBpZiAnPicgaXMgc2VwYXJhdG9yXG4gICAgICAgICAgICBuZXdUZXh0ID0gJydcbiAgICAgICAgICAgIGZvciBsaW5lIGluIHRleHQuc3BsaXQgXCJcXG5cIlxuICAgICAgICAgICAgICAgIGlmIGxpbmUubGVuZ3RoIGlzIDAgb3IgbGluZS5jaGFyQXQoMCkgaXMgJyAnXG4gICAgICAgICAgICAgICAgICAgIG5ld1RleHQgPSBVdGlscy5ydHJpbShuZXdUZXh0LCAnICcpICsgbGluZSArIFwiXFxuXCJcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG5ld1RleHQgKz0gbGluZSArICcgJ1xuICAgICAgICAgICAgdGV4dCA9IG5ld1RleHRcblxuICAgICAgICBpZiAnKycgaXNudCBpbmRpY2F0b3JcbiAgICAgICAgICAgICMgUmVtb3ZlIGFueSBleHRyYSBzcGFjZSBvciBuZXcgbGluZSBhcyB3ZSBhcmUgYWRkaW5nIHRoZW0gYWZ0ZXJcbiAgICAgICAgICAgIHRleHQgPSBVdGlscy5ydHJpbSh0ZXh0KVxuXG4gICAgICAgICMgRGVhbCB3aXRoIHRyYWlsaW5nIG5ld2xpbmVzIGFzIGluZGljYXRlZFxuICAgICAgICBpZiAnJyBpcyBpbmRpY2F0b3JcbiAgICAgICAgICAgIHRleHQgPSBAUEFUVEVSTl9UUkFJTElOR19MSU5FUy5yZXBsYWNlIHRleHQsIFwiXFxuXCJcbiAgICAgICAgZWxzZSBpZiAnLScgaXMgaW5kaWNhdG9yXG4gICAgICAgICAgICB0ZXh0ID0gQFBBVFRFUk5fVFJBSUxJTkdfTElORVMucmVwbGFjZSB0ZXh0LCAnJ1xuXG4gICAgICAgIHJldHVybiB0ZXh0XG5cblxuICAgICMgUmV0dXJucyB0cnVlIGlmIHRoZSBuZXh0IGxpbmUgaXMgaW5kZW50ZWQuXG4gICAgI1xuICAgICMgQHJldHVybiBbQm9vbGVhbl0gICAgIFJldHVybnMgdHJ1ZSBpZiB0aGUgbmV4dCBsaW5lIGlzIGluZGVudGVkLCBmYWxzZSBvdGhlcndpc2VcbiAgICAjXG4gICAgaXNOZXh0TGluZUluZGVudGVkOiAoaWdub3JlQ29tbWVudHMgPSB0cnVlKSAtPlxuICAgICAgICBjdXJyZW50SW5kZW50YXRpb24gPSBAZ2V0Q3VycmVudExpbmVJbmRlbnRhdGlvbigpXG4gICAgICAgIEVPRiA9IG5vdCBAbW92ZVRvTmV4dExpbmUoKVxuXG4gICAgICAgIGlmIGlnbm9yZUNvbW1lbnRzXG4gICAgICAgICAgICB3aGlsZSBub3QoRU9GKSBhbmQgQGlzQ3VycmVudExpbmVFbXB0eSgpXG4gICAgICAgICAgICAgICAgRU9GID0gbm90IEBtb3ZlVG9OZXh0TGluZSgpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHdoaWxlIG5vdChFT0YpIGFuZCBAaXNDdXJyZW50TGluZUJsYW5rKClcbiAgICAgICAgICAgICAgICBFT0YgPSBub3QgQG1vdmVUb05leHRMaW5lKClcblxuICAgICAgICBpZiBFT0ZcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAgIHJldCA9IGZhbHNlXG4gICAgICAgIGlmIEBnZXRDdXJyZW50TGluZUluZGVudGF0aW9uKCkgPiBjdXJyZW50SW5kZW50YXRpb25cbiAgICAgICAgICAgIHJldCA9IHRydWVcblxuICAgICAgICBAbW92ZVRvUHJldmlvdXNMaW5lKClcblxuICAgICAgICByZXR1cm4gcmV0XG5cblxuICAgICMgUmV0dXJucyB0cnVlIGlmIHRoZSBjdXJyZW50IGxpbmUgaXMgYmxhbmsgb3IgaWYgaXQgaXMgYSBjb21tZW50IGxpbmUuXG4gICAgI1xuICAgICMgQHJldHVybiBbQm9vbGVhbl0gICAgIFJldHVybnMgdHJ1ZSBpZiB0aGUgY3VycmVudCBsaW5lIGlzIGVtcHR5IG9yIGlmIGl0IGlzIGEgY29tbWVudCBsaW5lLCBmYWxzZSBvdGhlcndpc2VcbiAgICAjXG4gICAgaXNDdXJyZW50TGluZUVtcHR5OiAtPlxuICAgICAgICB0cmltbWVkTGluZSA9IFV0aWxzLnRyaW0oQGN1cnJlbnRMaW5lLCAnICcpXG4gICAgICAgIHJldHVybiB0cmltbWVkTGluZS5sZW5ndGggaXMgMCBvciB0cmltbWVkTGluZS5jaGFyQXQoMCkgaXMgJyMnXG5cblxuICAgICMgUmV0dXJucyB0cnVlIGlmIHRoZSBjdXJyZW50IGxpbmUgaXMgYmxhbmsuXG4gICAgI1xuICAgICMgQHJldHVybiBbQm9vbGVhbl0gICAgIFJldHVybnMgdHJ1ZSBpZiB0aGUgY3VycmVudCBsaW5lIGlzIGJsYW5rLCBmYWxzZSBvdGhlcndpc2VcbiAgICAjXG4gICAgaXNDdXJyZW50TGluZUJsYW5rOiAtPlxuICAgICAgICByZXR1cm4gJycgaXMgVXRpbHMudHJpbShAY3VycmVudExpbmUsICcgJylcblxuXG4gICAgIyBSZXR1cm5zIHRydWUgaWYgdGhlIGN1cnJlbnQgbGluZSBpcyBhIGNvbW1lbnQgbGluZS5cbiAgICAjXG4gICAgIyBAcmV0dXJuIFtCb29sZWFuXSAgICAgUmV0dXJucyB0cnVlIGlmIHRoZSBjdXJyZW50IGxpbmUgaXMgYSBjb21tZW50IGxpbmUsIGZhbHNlIG90aGVyd2lzZVxuICAgICNcbiAgICBpc0N1cnJlbnRMaW5lQ29tbWVudDogLT5cbiAgICAgICAgIyBDaGVja2luZyBleHBsaWNpdGx5IHRoZSBmaXJzdCBjaGFyIG9mIHRoZSB0cmltIGlzIGZhc3RlciB0aGFuIGxvb3BzIG9yIHN0cnBvc1xuICAgICAgICBsdHJpbW1lZExpbmUgPSBVdGlscy5sdHJpbShAY3VycmVudExpbmUsICcgJylcblxuICAgICAgICByZXR1cm4gbHRyaW1tZWRMaW5lLmNoYXJBdCgwKSBpcyAnIydcblxuXG4gICAgIyBDbGVhbnVwcyBhIFlBTUwgc3RyaW5nIHRvIGJlIHBhcnNlZC5cbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICB2YWx1ZSBUaGUgaW5wdXQgWUFNTCBzdHJpbmdcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddICBBIGNsZWFuZWQgdXAgWUFNTCBzdHJpbmdcbiAgICAjXG4gICAgY2xlYW51cDogKHZhbHVlKSAtPlxuICAgICAgICBpZiB2YWx1ZS5pbmRleE9mKFwiXFxyXCIpIGlzbnQgLTFcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3BsaXQoXCJcXHJcXG5cIikuam9pbihcIlxcblwiKS5zcGxpdChcIlxcclwiKS5qb2luKFwiXFxuXCIpXG5cbiAgICAgICAgIyBTdHJpcCBZQU1MIGhlYWRlclxuICAgICAgICBjb3VudCA9IDBcbiAgICAgICAgW3ZhbHVlLCBjb3VudF0gPSBAUEFUVEVSTl9ZQU1MX0hFQURFUi5yZXBsYWNlQWxsIHZhbHVlLCAnJ1xuICAgICAgICBAb2Zmc2V0ICs9IGNvdW50XG5cbiAgICAgICAgIyBSZW1vdmUgbGVhZGluZyBjb21tZW50c1xuICAgICAgICBbdHJpbW1lZFZhbHVlLCBjb3VudF0gPSBAUEFUVEVSTl9MRUFESU5HX0NPTU1FTlRTLnJlcGxhY2VBbGwgdmFsdWUsICcnLCAxXG4gICAgICAgIGlmIGNvdW50IGlzIDFcbiAgICAgICAgICAgICMgSXRlbXMgaGF2ZSBiZWVuIHJlbW92ZWQsIHVwZGF0ZSB0aGUgb2Zmc2V0XG4gICAgICAgICAgICBAb2Zmc2V0ICs9IFV0aWxzLnN1YlN0ckNvdW50KHZhbHVlLCBcIlxcblwiKSAtIFV0aWxzLnN1YlN0ckNvdW50KHRyaW1tZWRWYWx1ZSwgXCJcXG5cIilcbiAgICAgICAgICAgIHZhbHVlID0gdHJpbW1lZFZhbHVlXG5cbiAgICAgICAgIyBSZW1vdmUgc3RhcnQgb2YgdGhlIGRvY3VtZW50IG1hcmtlciAoLS0tKVxuICAgICAgICBbdHJpbW1lZFZhbHVlLCBjb3VudF0gPSBAUEFUVEVSTl9ET0NVTUVOVF9NQVJLRVJfU1RBUlQucmVwbGFjZUFsbCB2YWx1ZSwgJycsIDFcbiAgICAgICAgaWYgY291bnQgaXMgMVxuICAgICAgICAgICAgIyBJdGVtcyBoYXZlIGJlZW4gcmVtb3ZlZCwgdXBkYXRlIHRoZSBvZmZzZXRcbiAgICAgICAgICAgIEBvZmZzZXQgKz0gVXRpbHMuc3ViU3RyQ291bnQodmFsdWUsIFwiXFxuXCIpIC0gVXRpbHMuc3ViU3RyQ291bnQodHJpbW1lZFZhbHVlLCBcIlxcblwiKVxuICAgICAgICAgICAgdmFsdWUgPSB0cmltbWVkVmFsdWVcblxuICAgICAgICAgICAgIyBSZW1vdmUgZW5kIG9mIHRoZSBkb2N1bWVudCBtYXJrZXIgKC4uLilcbiAgICAgICAgICAgIHZhbHVlID0gQFBBVFRFUk5fRE9DVU1FTlRfTUFSS0VSX0VORC5yZXBsYWNlIHZhbHVlLCAnJ1xuXG4gICAgICAgICMgRW5zdXJlIHRoZSBibG9jayBpcyBub3QgaW5kZW50ZWRcbiAgICAgICAgbGluZXMgPSB2YWx1ZS5zcGxpdChcIlxcblwiKVxuICAgICAgICBzbWFsbGVzdEluZGVudCA9IC0xXG4gICAgICAgIGZvciBsaW5lIGluIGxpbmVzXG4gICAgICAgICAgICBjb250aW51ZSBpZiBVdGlscy50cmltKGxpbmUsICcgJykubGVuZ3RoID09IDBcbiAgICAgICAgICAgIGluZGVudCA9IGxpbmUubGVuZ3RoIC0gVXRpbHMubHRyaW0obGluZSkubGVuZ3RoXG4gICAgICAgICAgICBpZiBzbWFsbGVzdEluZGVudCBpcyAtMSBvciBpbmRlbnQgPCBzbWFsbGVzdEluZGVudFxuICAgICAgICAgICAgICAgIHNtYWxsZXN0SW5kZW50ID0gaW5kZW50XG4gICAgICAgIGlmIHNtYWxsZXN0SW5kZW50ID4gMFxuICAgICAgICAgICAgZm9yIGxpbmUsIGkgaW4gbGluZXNcbiAgICAgICAgICAgICAgICBsaW5lc1tpXSA9IGxpbmVbc21hbGxlc3RJbmRlbnQuLl1cbiAgICAgICAgICAgIHZhbHVlID0gbGluZXMuam9pbihcIlxcblwiKVxuXG4gICAgICAgIHJldHVybiB2YWx1ZVxuXG5cbiAgICAjIFJldHVybnMgdHJ1ZSBpZiB0aGUgbmV4dCBsaW5lIHN0YXJ0cyB1bmluZGVudGVkIGNvbGxlY3Rpb25cbiAgICAjXG4gICAgIyBAcmV0dXJuIFtCb29sZWFuXSAgICAgUmV0dXJucyB0cnVlIGlmIHRoZSBuZXh0IGxpbmUgc3RhcnRzIHVuaW5kZW50ZWQgY29sbGVjdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgI1xuICAgIGlzTmV4dExpbmVVbkluZGVudGVkQ29sbGVjdGlvbjogKGN1cnJlbnRJbmRlbnRhdGlvbiA9IG51bGwpIC0+XG4gICAgICAgIGN1cnJlbnRJbmRlbnRhdGlvbiA/PSBAZ2V0Q3VycmVudExpbmVJbmRlbnRhdGlvbigpXG4gICAgICAgIG5vdEVPRiA9IEBtb3ZlVG9OZXh0TGluZSgpXG5cbiAgICAgICAgd2hpbGUgbm90RU9GIGFuZCBAaXNDdXJyZW50TGluZUVtcHR5KClcbiAgICAgICAgICAgIG5vdEVPRiA9IEBtb3ZlVG9OZXh0TGluZSgpXG5cbiAgICAgICAgaWYgZmFsc2UgaXMgbm90RU9GXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgICByZXQgPSBmYWxzZVxuICAgICAgICBpZiBAZ2V0Q3VycmVudExpbmVJbmRlbnRhdGlvbigpIGlzIGN1cnJlbnRJbmRlbnRhdGlvbiBhbmQgQGlzU3RyaW5nVW5JbmRlbnRlZENvbGxlY3Rpb25JdGVtKEBjdXJyZW50TGluZSlcbiAgICAgICAgICAgIHJldCA9IHRydWVcblxuICAgICAgICBAbW92ZVRvUHJldmlvdXNMaW5lKClcblxuICAgICAgICByZXR1cm4gcmV0XG5cblxuICAgICMgUmV0dXJucyB0cnVlIGlmIHRoZSBzdHJpbmcgaXMgdW4taW5kZW50ZWQgY29sbGVjdGlvbiBpdGVtXG4gICAgI1xuICAgICMgQHJldHVybiBbQm9vbGVhbl0gICAgIFJldHVybnMgdHJ1ZSBpZiB0aGUgc3RyaW5nIGlzIHVuLWluZGVudGVkIGNvbGxlY3Rpb24gaXRlbSwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgI1xuICAgIGlzU3RyaW5nVW5JbmRlbnRlZENvbGxlY3Rpb25JdGVtOiAtPlxuICAgICAgICByZXR1cm4gQGN1cnJlbnRMaW5lIGlzICctJyBvciBAY3VycmVudExpbmVbMC4uLjJdIGlzICctICdcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlclxuIiwiXG4jIFBhdHRlcm4gaXMgYSB6ZXJvLWNvbmZsaWN0IHdyYXBwZXIgZXh0ZW5kaW5nIFJlZ0V4cCBmZWF0dXJlc1xuIyBpbiBvcmRlciB0byBtYWtlIFlBTUwgcGFyc2luZyByZWdleCBtb3JlIGV4cHJlc3NpdmUuXG4jXG5jbGFzcyBQYXR0ZXJuXG5cbiAgICAjIEBwcm9wZXJ0eSBbUmVnRXhwXSBUaGUgUmVnRXhwIGluc3RhbmNlXG4gICAgcmVnZXg6ICAgICAgICAgIG51bGxcblxuICAgICMgQHByb3BlcnR5IFtTdHJpbmddIFRoZSByYXcgcmVnZXggc3RyaW5nXG4gICAgcmF3UmVnZXg6ICAgICAgIG51bGxcblxuICAgICMgQHByb3BlcnR5IFtTdHJpbmddIFRoZSBjbGVhbmVkIHJlZ2V4IHN0cmluZyAodXNlZCB0byBjcmVhdGUgdGhlIFJlZ0V4cCBpbnN0YW5jZSlcbiAgICBjbGVhbmVkUmVnZXg6ICAgbnVsbFxuXG4gICAgIyBAcHJvcGVydHkgW09iamVjdF0gVGhlIGRpY3Rpb25hcnkgbWFwcGluZyBuYW1lcyB0byBjYXB0dXJpbmcgYnJhY2tldCBudW1iZXJzXG4gICAgbWFwcGluZzogICAgICAgIG51bGxcblxuICAgICMgQ29uc3RydWN0b3JcbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gcmF3UmVnZXggVGhlIHJhdyByZWdleCBzdHJpbmcgZGVmaW5pbmcgdGhlIHBhdHRlcm5cbiAgICAjXG4gICAgY29uc3RydWN0b3I6IChyYXdSZWdleCwgbW9kaWZpZXJzID0gJycpIC0+XG4gICAgICAgIGNsZWFuZWRSZWdleCA9ICcnXG4gICAgICAgIGxlbiA9IHJhd1JlZ2V4Lmxlbmd0aFxuICAgICAgICBtYXBwaW5nID0gbnVsbFxuXG4gICAgICAgICMgQ2xlYW51cCByYXcgcmVnZXggYW5kIGNvbXB1dGUgbWFwcGluZ1xuICAgICAgICBjYXB0dXJpbmdCcmFja2V0TnVtYmVyID0gMFxuICAgICAgICBpID0gMFxuICAgICAgICB3aGlsZSBpIDwgbGVuXG4gICAgICAgICAgICBfY2hhciA9IHJhd1JlZ2V4LmNoYXJBdChpKVxuICAgICAgICAgICAgaWYgX2NoYXIgaXMgJ1xcXFwnXG4gICAgICAgICAgICAgICAgIyBJZ25vcmUgbmV4dCBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICBjbGVhbmVkUmVnZXggKz0gcmF3UmVnZXhbaS4uaSsxXVxuICAgICAgICAgICAgICAgIGkrK1xuICAgICAgICAgICAgZWxzZSBpZiBfY2hhciBpcyAnKCdcbiAgICAgICAgICAgICAgICAjIEluY3JlYXNlIGJyYWNrZXQgbnVtYmVyLCBvbmx5IGlmIGl0IGlzIGNhcHR1cmluZ1xuICAgICAgICAgICAgICAgIGlmIGkgPCBsZW4gLSAyXG4gICAgICAgICAgICAgICAgICAgIHBhcnQgPSByYXdSZWdleFtpLi5pKzJdXG4gICAgICAgICAgICAgICAgICAgIGlmIHBhcnQgaXMgJyg/OidcbiAgICAgICAgICAgICAgICAgICAgICAgICMgTm9uLWNhcHR1cmluZyBicmFja2V0XG4gICAgICAgICAgICAgICAgICAgICAgICBpICs9IDJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFuZWRSZWdleCArPSBwYXJ0XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgcGFydCBpcyAnKD88J1xuICAgICAgICAgICAgICAgICAgICAgICAgIyBDYXB0dXJpbmcgYnJhY2tldCB3aXRoIHBvc3NpYmx5IGEgbmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdHVyaW5nQnJhY2tldE51bWJlcisrXG4gICAgICAgICAgICAgICAgICAgICAgICBpICs9IDJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgaSArIDEgPCBsZW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJDaGFyID0gcmF3UmVnZXguY2hhckF0KGkgKyAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIHN1YkNoYXIgaXMgJz4nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFuZWRSZWdleCArPSAnKCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIG5hbWUubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBBc3NvY2lhdGUgYSBuYW1lIHdpdGggYSBjYXB0dXJpbmcgYnJhY2tldCBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcHBpbmcgPz0ge31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcHBpbmdbbmFtZV0gPSBjYXB0dXJpbmdCcmFja2V0TnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lICs9IHN1YkNoYXJcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrK1xuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhbmVkUmVnZXggKz0gX2NoYXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcHR1cmluZ0JyYWNrZXROdW1iZXIrK1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgY2xlYW5lZFJlZ2V4ICs9IF9jaGFyXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY2xlYW5lZFJlZ2V4ICs9IF9jaGFyXG5cbiAgICAgICAgICAgIGkrK1xuXG4gICAgICAgIEByYXdSZWdleCA9IHJhd1JlZ2V4XG4gICAgICAgIEBjbGVhbmVkUmVnZXggPSBjbGVhbmVkUmVnZXhcbiAgICAgICAgQHJlZ2V4ID0gbmV3IFJlZ0V4cCBAY2xlYW5lZFJlZ2V4LCAnZycrbW9kaWZpZXJzLnJlcGxhY2UoJ2cnLCAnJylcbiAgICAgICAgQG1hcHBpbmcgPSBtYXBwaW5nXG5cblxuICAgICMgRXhlY3V0ZXMgdGhlIHBhdHRlcm4ncyByZWdleCBhbmQgcmV0dXJucyB0aGUgbWF0Y2hpbmcgdmFsdWVzXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddIHN0ciBUaGUgc3RyaW5nIHRvIHVzZSB0byBleGVjdXRlIHRoZSBwYXR0ZXJuXG4gICAgI1xuICAgICMgQHJldHVybiBbQXJyYXldIFRoZSBtYXRjaGluZyB2YWx1ZXMgZXh0cmFjdGVkIGZyb20gY2FwdHVyaW5nIGJyYWNrZXRzIG9yIG51bGwgaWYgbm90aGluZyBtYXRjaGVkXG4gICAgI1xuICAgIGV4ZWM6IChzdHIpIC0+XG4gICAgICAgIEByZWdleC5sYXN0SW5kZXggPSAwXG4gICAgICAgIG1hdGNoZXMgPSBAcmVnZXguZXhlYyBzdHJcblxuICAgICAgICBpZiBub3QgbWF0Y2hlcz9cbiAgICAgICAgICAgIHJldHVybiBudWxsXG5cbiAgICAgICAgaWYgQG1hcHBpbmc/XG4gICAgICAgICAgICBmb3IgbmFtZSwgaW5kZXggb2YgQG1hcHBpbmdcbiAgICAgICAgICAgICAgICBtYXRjaGVzW25hbWVdID0gbWF0Y2hlc1tpbmRleF1cblxuICAgICAgICByZXR1cm4gbWF0Y2hlc1xuXG5cbiAgICAjIFRlc3RzIHRoZSBwYXR0ZXJuJ3MgcmVnZXhcbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gc3RyIFRoZSBzdHJpbmcgdG8gdXNlIHRvIHRlc3QgdGhlIHBhdHRlcm5cbiAgICAjXG4gICAgIyBAcmV0dXJuIFtCb29sZWFuXSB0cnVlIGlmIHRoZSBzdHJpbmcgbWF0Y2hlZFxuICAgICNcbiAgICB0ZXN0OiAoc3RyKSAtPlxuICAgICAgICBAcmVnZXgubGFzdEluZGV4ID0gMFxuICAgICAgICByZXR1cm4gQHJlZ2V4LnRlc3Qgc3RyXG5cblxuICAgICMgUmVwbGFjZXMgb2NjdXJlbmNlcyBtYXRjaGluZyB3aXRoIHRoZSBwYXR0ZXJuJ3MgcmVnZXggd2l0aCByZXBsYWNlbWVudFxuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSBzdHIgVGhlIHNvdXJjZSBzdHJpbmcgdG8gcGVyZm9ybSByZXBsYWNlbWVudHNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSByZXBsYWNlbWVudCBUaGUgc3RyaW5nIHRvIHVzZSBpbiBwbGFjZSBvZiBlYWNoIHJlcGxhY2VkIG9jY3VyZW5jZS5cbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddIFRoZSByZXBsYWNlZCBzdHJpbmdcbiAgICAjXG4gICAgcmVwbGFjZTogKHN0ciwgcmVwbGFjZW1lbnQpIC0+XG4gICAgICAgIEByZWdleC5sYXN0SW5kZXggPSAwXG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSBAcmVnZXgsIHJlcGxhY2VtZW50XG5cblxuICAgICMgUmVwbGFjZXMgb2NjdXJlbmNlcyBtYXRjaGluZyB3aXRoIHRoZSBwYXR0ZXJuJ3MgcmVnZXggd2l0aCByZXBsYWNlbWVudCBhbmRcbiAgICAjIGdldCBib3RoIHRoZSByZXBsYWNlZCBzdHJpbmcgYW5kIHRoZSBudW1iZXIgb2YgcmVwbGFjZWQgb2NjdXJlbmNlcyBpbiB0aGUgc3RyaW5nLlxuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSBzdHIgVGhlIHNvdXJjZSBzdHJpbmcgdG8gcGVyZm9ybSByZXBsYWNlbWVudHNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSByZXBsYWNlbWVudCBUaGUgc3RyaW5nIHRvIHVzZSBpbiBwbGFjZSBvZiBlYWNoIHJlcGxhY2VkIG9jY3VyZW5jZS5cbiAgICAjIEBwYXJhbSBbSW50ZWdlcl0gbGltaXQgVGhlIG1heGltdW0gbnVtYmVyIG9mIG9jY3VyZW5jZXMgdG8gcmVwbGFjZSAoMCBtZWFucyBpbmZpbml0ZSBudW1iZXIgb2Ygb2NjdXJlbmNlcylcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtBcnJheV0gQSBkZXN0cnVjdHVyYWJsZSBhcnJheSBjb250YWluaW5nIHRoZSByZXBsYWNlZCBzdHJpbmcgYW5kIHRoZSBudW1iZXIgb2YgcmVwbGFjZWQgb2NjdXJlbmNlcy4gRm9yIGluc3RhbmNlOiBbXCJteSByZXBsYWNlZCBzdHJpbmdcIiwgMl1cbiAgICAjXG4gICAgcmVwbGFjZUFsbDogKHN0ciwgcmVwbGFjZW1lbnQsIGxpbWl0ID0gMCkgLT5cbiAgICAgICAgQHJlZ2V4Lmxhc3RJbmRleCA9IDBcbiAgICAgICAgY291bnQgPSAwXG4gICAgICAgIHdoaWxlIEByZWdleC50ZXN0KHN0cikgYW5kIChsaW1pdCBpcyAwIG9yIGNvdW50IDwgbGltaXQpXG4gICAgICAgICAgICBAcmVnZXgubGFzdEluZGV4ID0gMFxuICAgICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UgQHJlZ2V4LCByZXBsYWNlbWVudFxuICAgICAgICAgICAgY291bnQrK1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIFtzdHIsIGNvdW50XVxuXG5cbm1vZHVsZS5leHBvcnRzID0gUGF0dGVyblxuXG4iLCJcblV0aWxzICAgPSByZXF1aXJlICcuL1V0aWxzJ1xuUGF0dGVybiA9IHJlcXVpcmUgJy4vUGF0dGVybidcblxuIyBVbmVzY2FwZXIgZW5jYXBzdWxhdGVzIHVuZXNjYXBpbmcgcnVsZXMgZm9yIHNpbmdsZSBhbmQgZG91YmxlLXF1b3RlZCBZQU1MIHN0cmluZ3MuXG4jXG5jbGFzcyBVbmVzY2FwZXJcblxuICAgICMgUmVnZXggZnJhZ21lbnQgdGhhdCBtYXRjaGVzIGFuIGVzY2FwZWQgY2hhcmFjdGVyIGluXG4gICAgIyBhIGRvdWJsZSBxdW90ZWQgc3RyaW5nLlxuICAgIEBQQVRURVJOX0VTQ0FQRURfQ0hBUkFDVEVSOiAgICAgbmV3IFBhdHRlcm4gJ1xcXFxcXFxcKFswYWJ0XFx0bnZmcmUgXCJcXFxcL1xcXFxcXFxcTl9MUF18eFswLTlhLWZBLUZdezJ9fHVbMC05YS1mQS1GXXs0fXxVWzAtOWEtZkEtRl17OH0pJztcblxuXG4gICAgIyBVbmVzY2FwZXMgYSBzaW5nbGUgcXVvdGVkIHN0cmluZy5cbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICAgICAgdmFsdWUgQSBzaW5nbGUgcXVvdGVkIHN0cmluZy5cbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddICAgICAgVGhlIHVuZXNjYXBlZCBzdHJpbmcuXG4gICAgI1xuICAgIEB1bmVzY2FwZVNpbmdsZVF1b3RlZFN0cmluZzogKHZhbHVlKSAtPlxuICAgICAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvXFwnXFwnL2csICdcXCcnKVxuXG5cbiAgICAjIFVuZXNjYXBlcyBhIGRvdWJsZSBxdW90ZWQgc3RyaW5nLlxuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSAgICAgICB2YWx1ZSBBIGRvdWJsZSBxdW90ZWQgc3RyaW5nLlxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gICAgICBUaGUgdW5lc2NhcGVkIHN0cmluZy5cbiAgICAjXG4gICAgQHVuZXNjYXBlRG91YmxlUXVvdGVkU3RyaW5nOiAodmFsdWUpIC0+XG4gICAgICAgIEBfdW5lc2NhcGVDYWxsYmFjayA/PSAoc3RyKSA9PlxuICAgICAgICAgICAgcmV0dXJuIEB1bmVzY2FwZUNoYXJhY3RlcihzdHIpXG5cbiAgICAgICAgIyBFdmFsdWF0ZSB0aGUgc3RyaW5nXG4gICAgICAgIHJldHVybiBAUEFUVEVSTl9FU0NBUEVEX0NIQVJBQ1RFUi5yZXBsYWNlIHZhbHVlLCBAX3VuZXNjYXBlQ2FsbGJhY2tcblxuXG4gICAgIyBVbmVzY2FwZXMgYSBjaGFyYWN0ZXIgdGhhdCB3YXMgZm91bmQgaW4gYSBkb3VibGUtcXVvdGVkIHN0cmluZ1xuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSAgICAgICB2YWx1ZSBBbiBlc2NhcGVkIGNoYXJhY3RlclxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gICAgICBUaGUgdW5lc2NhcGVkIGNoYXJhY3RlclxuICAgICNcbiAgICBAdW5lc2NhcGVDaGFyYWN0ZXI6ICh2YWx1ZSkgLT5cbiAgICAgICAgY2ggPSBTdHJpbmcuZnJvbUNoYXJDb2RlXG4gICAgICAgIHN3aXRjaCB2YWx1ZS5jaGFyQXQoMSlcbiAgICAgICAgICAgIHdoZW4gJzAnXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoKDApXG4gICAgICAgICAgICB3aGVuICdhJ1xuICAgICAgICAgICAgICAgIHJldHVybiBjaCg3KVxuICAgICAgICAgICAgd2hlbiAnYidcbiAgICAgICAgICAgICAgICByZXR1cm4gY2goOClcbiAgICAgICAgICAgIHdoZW4gJ3QnXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXFx0XCJcbiAgICAgICAgICAgIHdoZW4gXCJcXHRcIlxuICAgICAgICAgICAgICAgIHJldHVybiBcIlxcdFwiXG4gICAgICAgICAgICB3aGVuICduJ1xuICAgICAgICAgICAgICAgIHJldHVybiBcIlxcblwiXG4gICAgICAgICAgICB3aGVuICd2J1xuICAgICAgICAgICAgICAgIHJldHVybiBjaCgxMSlcbiAgICAgICAgICAgIHdoZW4gJ2YnXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoKDEyKVxuICAgICAgICAgICAgd2hlbiAncidcbiAgICAgICAgICAgICAgICByZXR1cm4gY2goMTMpXG4gICAgICAgICAgICB3aGVuICdlJ1xuICAgICAgICAgICAgICAgIHJldHVybiBjaCgyNylcbiAgICAgICAgICAgIHdoZW4gJyAnXG4gICAgICAgICAgICAgICAgcmV0dXJuICcgJ1xuICAgICAgICAgICAgd2hlbiAnXCInXG4gICAgICAgICAgICAgICAgcmV0dXJuICdcIidcbiAgICAgICAgICAgIHdoZW4gJy8nXG4gICAgICAgICAgICAgICAgcmV0dXJuICcvJ1xuICAgICAgICAgICAgd2hlbiAnXFxcXCdcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1xcXFwnXG4gICAgICAgICAgICB3aGVuICdOJ1xuICAgICAgICAgICAgICAgICMgVSswMDg1IE5FWFQgTElORVxuICAgICAgICAgICAgICAgIHJldHVybiBjaCgweDAwODUpXG4gICAgICAgICAgICB3aGVuICdfJ1xuICAgICAgICAgICAgICAgICMgVSswMEEwIE5PLUJSRUFLIFNQQUNFXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoKDB4MDBBMClcbiAgICAgICAgICAgIHdoZW4gJ0wnXG4gICAgICAgICAgICAgICAgIyBVKzIwMjggTElORSBTRVBBUkFUT1JcbiAgICAgICAgICAgICAgICByZXR1cm4gY2goMHgyMDI4KVxuICAgICAgICAgICAgd2hlbiAnUCdcbiAgICAgICAgICAgICAgICAjIFUrMjAyOSBQQVJBR1JBUEggU0VQQVJBVE9SXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoKDB4MjAyOSlcbiAgICAgICAgICAgIHdoZW4gJ3gnXG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLnV0ZjhjaHIoVXRpbHMuaGV4RGVjKHZhbHVlLnN1YnN0cigyLCAyKSkpXG4gICAgICAgICAgICB3aGVuICd1J1xuICAgICAgICAgICAgICAgIHJldHVybiBVdGlscy51dGY4Y2hyKFV0aWxzLmhleERlYyh2YWx1ZS5zdWJzdHIoMiwgNCkpKVxuICAgICAgICAgICAgd2hlbiAnVSdcbiAgICAgICAgICAgICAgICByZXR1cm4gVXRpbHMudXRmOGNocihVdGlscy5oZXhEZWModmFsdWUuc3Vic3RyKDIsIDgpKSlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gJydcblxubW9kdWxlLmV4cG9ydHMgPSBVbmVzY2FwZXJcbiIsIlxuUGF0dGVybiA9IHJlcXVpcmUgJy4vUGF0dGVybidcblxuIyBBIGJ1bmNoIG9mIHV0aWxpdHkgbWV0aG9kc1xuI1xuY2xhc3MgVXRpbHNcblxuICAgIEBSRUdFWF9MRUZUX1RSSU1fQllfQ0hBUjogICB7fVxuICAgIEBSRUdFWF9SSUdIVF9UUklNX0JZX0NIQVI6ICB7fVxuICAgIEBSRUdFWF9TUEFDRVM6ICAgICAgICAgICAgICAvXFxzKy9nXG4gICAgQFJFR0VYX0RJR0lUUzogICAgICAgICAgICAgIC9eXFxkKyQvXG4gICAgQFJFR0VYX09DVEFMOiAgICAgICAgICAgICAgIC9bXjAtN10vZ2lcbiAgICBAUkVHRVhfSEVYQURFQ0lNQUw6ICAgICAgICAgL1teYS1mMC05XS9naVxuXG4gICAgIyBQcmVjb21waWxlZCBkYXRlIHBhdHRlcm5cbiAgICBAUEFUVEVSTl9EQVRFOiAgICAgICAgICAgICAgbmV3IFBhdHRlcm4gJ14nK1xuICAgICAgICAgICAgJyg/PHllYXI+WzAtOV1bMC05XVswLTldWzAtOV0pJytcbiAgICAgICAgICAgICctKD88bW9udGg+WzAtOV1bMC05XT8pJytcbiAgICAgICAgICAgICctKD88ZGF5PlswLTldWzAtOV0/KScrXG4gICAgICAgICAgICAnKD86KD86W1R0XXxbIFxcdF0rKScrXG4gICAgICAgICAgICAnKD88aG91cj5bMC05XVswLTldPyknK1xuICAgICAgICAgICAgJzooPzxtaW51dGU+WzAtOV1bMC05XSknK1xuICAgICAgICAgICAgJzooPzxzZWNvbmQ+WzAtOV1bMC05XSknK1xuICAgICAgICAgICAgJyg/OlxcLig/PGZyYWN0aW9uPlswLTldKikpPycrXG4gICAgICAgICAgICAnKD86WyBcXHRdKig/PHR6Plp8KD88dHpfc2lnbj5bLStdKSg/PHR6X2hvdXI+WzAtOV1bMC05XT8pJytcbiAgICAgICAgICAgICcoPzo6KD88dHpfbWludXRlPlswLTldWzAtOV0pKT8pKT8pPycrXG4gICAgICAgICAgICAnJCcsICdpJ1xuXG4gICAgIyBMb2NhbCB0aW1lem9uZSBvZmZzZXQgaW4gbXNcbiAgICBATE9DQUxfVElNRVpPTkVfT0ZGU0VUOiAgICAgbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAgKiAxMDAwXG5cbiAgICAjIFRyaW1zIHRoZSBnaXZlbiBzdHJpbmcgb24gYm90aCBzaWRlc1xuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSBzdHIgVGhlIHN0cmluZyB0byB0cmltXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gX2NoYXIgVGhlIGNoYXJhY3RlciB0byB1c2UgZm9yIHRyaW1taW5nIChkZWZhdWx0OiAnXFxcXHMnKVxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gQSB0cmltbWVkIHN0cmluZ1xuICAgICNcbiAgICBAdHJpbTogKHN0ciwgX2NoYXIgPSAnXFxcXHMnKSAtPlxuICAgICAgICByZWdleExlZnQgPSBAUkVHRVhfTEVGVF9UUklNX0JZX0NIQVJbX2NoYXJdXG4gICAgICAgIHVubGVzcyByZWdleExlZnQ/XG4gICAgICAgICAgICBAUkVHRVhfTEVGVF9UUklNX0JZX0NIQVJbX2NoYXJdID0gcmVnZXhMZWZ0ID0gbmV3IFJlZ0V4cCAnXicrX2NoYXIrJycrX2NoYXIrJyonXG4gICAgICAgIHJlZ2V4TGVmdC5sYXN0SW5kZXggPSAwXG4gICAgICAgIHJlZ2V4UmlnaHQgPSBAUkVHRVhfUklHSFRfVFJJTV9CWV9DSEFSW19jaGFyXVxuICAgICAgICB1bmxlc3MgcmVnZXhSaWdodD9cbiAgICAgICAgICAgIEBSRUdFWF9SSUdIVF9UUklNX0JZX0NIQVJbX2NoYXJdID0gcmVnZXhSaWdodCA9IG5ldyBSZWdFeHAgX2NoYXIrJycrX2NoYXIrJyokJ1xuICAgICAgICByZWdleFJpZ2h0Lmxhc3RJbmRleCA9IDBcbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKHJlZ2V4TGVmdCwgJycpLnJlcGxhY2UocmVnZXhSaWdodCwgJycpXG5cblxuICAgICMgVHJpbXMgdGhlIGdpdmVuIHN0cmluZyBvbiB0aGUgbGVmdCBzaWRlXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddIHN0ciBUaGUgc3RyaW5nIHRvIHRyaW1cbiAgICAjIEBwYXJhbSBbU3RyaW5nXSBfY2hhciBUaGUgY2hhcmFjdGVyIHRvIHVzZSBmb3IgdHJpbW1pbmcgKGRlZmF1bHQ6ICdcXFxccycpXG4gICAgI1xuICAgICMgQHJldHVybiBbU3RyaW5nXSBBIHRyaW1tZWQgc3RyaW5nXG4gICAgI1xuICAgIEBsdHJpbTogKHN0ciwgX2NoYXIgPSAnXFxcXHMnKSAtPlxuICAgICAgICByZWdleExlZnQgPSBAUkVHRVhfTEVGVF9UUklNX0JZX0NIQVJbX2NoYXJdXG4gICAgICAgIHVubGVzcyByZWdleExlZnQ/XG4gICAgICAgICAgICBAUkVHRVhfTEVGVF9UUklNX0JZX0NIQVJbX2NoYXJdID0gcmVnZXhMZWZ0ID0gbmV3IFJlZ0V4cCAnXicrX2NoYXIrJycrX2NoYXIrJyonXG4gICAgICAgIHJlZ2V4TGVmdC5sYXN0SW5kZXggPSAwXG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZShyZWdleExlZnQsICcnKVxuXG5cbiAgICAjIFRyaW1zIHRoZSBnaXZlbiBzdHJpbmcgb24gdGhlIHJpZ2h0IHNpZGVcbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gc3RyIFRoZSBzdHJpbmcgdG8gdHJpbVxuICAgICMgQHBhcmFtIFtTdHJpbmddIF9jaGFyIFRoZSBjaGFyYWN0ZXIgdG8gdXNlIGZvciB0cmltbWluZyAoZGVmYXVsdDogJ1xcXFxzJylcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddIEEgdHJpbW1lZCBzdHJpbmdcbiAgICAjXG4gICAgQHJ0cmltOiAoc3RyLCBfY2hhciA9ICdcXFxccycpIC0+XG4gICAgICAgIHJlZ2V4UmlnaHQgPSBAUkVHRVhfUklHSFRfVFJJTV9CWV9DSEFSW19jaGFyXVxuICAgICAgICB1bmxlc3MgcmVnZXhSaWdodD9cbiAgICAgICAgICAgIEBSRUdFWF9SSUdIVF9UUklNX0JZX0NIQVJbX2NoYXJdID0gcmVnZXhSaWdodCA9IG5ldyBSZWdFeHAgX2NoYXIrJycrX2NoYXIrJyokJ1xuICAgICAgICByZWdleFJpZ2h0Lmxhc3RJbmRleCA9IDBcbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKHJlZ2V4UmlnaHQsICcnKVxuXG5cbiAgICAjIENoZWNrcyBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgZW1wdHkgKG51bGwsIHVuZGVmaW5lZCwgZW1wdHkgc3RyaW5nLCBzdHJpbmcgJzAnLCBlbXB0eSBBcnJheSwgZW1wdHkgT2JqZWN0KVxuICAgICNcbiAgICAjIEBwYXJhbSBbT2JqZWN0XSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2tcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtCb29sZWFuXSB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBlbXB0eVxuICAgICNcbiAgICBAaXNFbXB0eTogKHZhbHVlKSAtPlxuICAgICAgICByZXR1cm4gbm90KHZhbHVlKSBvciB2YWx1ZSBpcyAnJyBvciB2YWx1ZSBpcyAnMCcgb3IgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkgYW5kIHZhbHVlLmxlbmd0aCBpcyAwKSBvciBAaXNFbXB0eU9iamVjdCh2YWx1ZSlcblxuICAgICMgQ2hlY2tzIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBhbiBlbXB0eSBvYmplY3RcbiAgICAjXG4gICAgIyBAcGFyYW0gW09iamVjdF0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrXG4gICAgI1xuICAgICMgQHJldHVybiBbQm9vbGVhbl0gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgZW1wdHkgYW5kIGlzIGFuIG9iamVjdFxuICAgICNcbiAgICBAaXNFbXB0eU9iamVjdDogKHZhbHVlKSAtPlxuICAgICAgICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBPYmplY3QgYW5kIChrIGZvciBvd24gayBvZiB2YWx1ZSkubGVuZ3RoIGlzIDBcblxuICAgICMgQ291bnRzIHRoZSBudW1iZXIgb2Ygb2NjdXJlbmNlcyBvZiBzdWJTdHJpbmcgaW5zaWRlIHN0cmluZ1xuICAgICNcbiAgICAjIEBwYXJhbSBbU3RyaW5nXSBzdHJpbmcgVGhlIHN0cmluZyB3aGVyZSB0byBjb3VudCBvY2N1cmVuY2VzXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gc3ViU3RyaW5nIFRoZSBzdWJTdHJpbmcgdG8gY291bnRcbiAgICAjIEBwYXJhbSBbSW50ZWdlcl0gc3RhcnQgVGhlIHN0YXJ0IGluZGV4XG4gICAgIyBAcGFyYW0gW0ludGVnZXJdIGxlbmd0aCBUaGUgc3RyaW5nIGxlbmd0aCB1bnRpbCB3aGVyZSB0byBjb3VudFxuICAgICNcbiAgICAjIEByZXR1cm4gW0ludGVnZXJdIFRoZSBudW1iZXIgb2Ygb2NjdXJlbmNlc1xuICAgICNcbiAgICBAc3ViU3RyQ291bnQ6IChzdHJpbmcsIHN1YlN0cmluZywgc3RhcnQsIGxlbmd0aCkgLT5cbiAgICAgICAgYyA9IDBcblxuICAgICAgICBzdHJpbmcgPSAnJyArIHN0cmluZ1xuICAgICAgICBzdWJTdHJpbmcgPSAnJyArIHN1YlN0cmluZ1xuXG4gICAgICAgIGlmIHN0YXJ0P1xuICAgICAgICAgICAgc3RyaW5nID0gc3RyaW5nW3N0YXJ0Li5dXG4gICAgICAgIGlmIGxlbmd0aD9cbiAgICAgICAgICAgIHN0cmluZyA9IHN0cmluZ1swLi4ubGVuZ3RoXVxuXG4gICAgICAgIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgICAgICAgc3VibGVuID0gc3ViU3RyaW5nLmxlbmd0aFxuICAgICAgICBmb3IgaSBpbiBbMC4uLmxlbl1cbiAgICAgICAgICAgIGlmIHN1YlN0cmluZyBpcyBzdHJpbmdbaS4uLnN1Ymxlbl1cbiAgICAgICAgICAgICAgICBjKytcbiAgICAgICAgICAgICAgICBpICs9IHN1YmxlbiAtIDFcblxuICAgICAgICByZXR1cm4gY1xuXG5cbiAgICAjIFJldHVybnMgdHJ1ZSBpZiBpbnB1dCBpcyBvbmx5IGNvbXBvc2VkIG9mIGRpZ2l0c1xuICAgICNcbiAgICAjIEBwYXJhbSBbT2JqZWN0XSBpbnB1dCBUaGUgdmFsdWUgdG8gdGVzdFxuICAgICNcbiAgICAjIEByZXR1cm4gW0Jvb2xlYW5dIHRydWUgaWYgaW5wdXQgaXMgb25seSBjb21wb3NlZCBvZiBkaWdpdHNcbiAgICAjXG4gICAgQGlzRGlnaXRzOiAoaW5wdXQpIC0+XG4gICAgICAgIEBSRUdFWF9ESUdJVFMubGFzdEluZGV4ID0gMFxuICAgICAgICByZXR1cm4gQFJFR0VYX0RJR0lUUy50ZXN0IGlucHV0XG5cblxuICAgICMgRGVjb2RlIG9jdGFsIHZhbHVlXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddIGlucHV0IFRoZSB2YWx1ZSB0byBkZWNvZGVcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtJbnRlZ2VyXSBUaGUgZGVjb2RlZCB2YWx1ZVxuICAgICNcbiAgICBAb2N0RGVjOiAoaW5wdXQpIC0+XG4gICAgICAgIEBSRUdFWF9PQ1RBTC5sYXN0SW5kZXggPSAwXG4gICAgICAgIHJldHVybiBwYXJzZUludCgoaW5wdXQrJycpLnJlcGxhY2UoQFJFR0VYX09DVEFMLCAnJyksIDgpXG5cblxuICAgICMgRGVjb2RlIGhleGFkZWNpbWFsIHZhbHVlXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddIGlucHV0IFRoZSB2YWx1ZSB0byBkZWNvZGVcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtJbnRlZ2VyXSBUaGUgZGVjb2RlZCB2YWx1ZVxuICAgICNcbiAgICBAaGV4RGVjOiAoaW5wdXQpIC0+XG4gICAgICAgIEBSRUdFWF9IRVhBREVDSU1BTC5sYXN0SW5kZXggPSAwXG4gICAgICAgIGlucHV0ID0gQHRyaW0oaW5wdXQpXG4gICAgICAgIGlmIChpbnB1dCsnJylbMC4uLjJdIGlzICcweCcgdGhlbiBpbnB1dCA9IChpbnB1dCsnJylbMi4uXVxuICAgICAgICByZXR1cm4gcGFyc2VJbnQoKGlucHV0KycnKS5yZXBsYWNlKEBSRUdFWF9IRVhBREVDSU1BTCwgJycpLCAxNilcblxuXG4gICAgIyBHZXQgdGhlIFVURi04IGNoYXJhY3RlciBmb3IgdGhlIGdpdmVuIGNvZGUgcG9pbnQuXG4gICAgI1xuICAgICMgQHBhcmFtIFtJbnRlZ2VyXSBjIFRoZSB1bmljb2RlIGNvZGUgcG9pbnRcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddIFRoZSBjb3JyZXNwb25kaW5nIFVURi04IGNoYXJhY3RlclxuICAgICNcbiAgICBAdXRmOGNocjogKGMpIC0+XG4gICAgICAgIGNoID0gU3RyaW5nLmZyb21DaGFyQ29kZVxuICAgICAgICBpZiAweDgwID4gKGMgJT0gMHgyMDAwMDApXG4gICAgICAgICAgICByZXR1cm4gY2goYylcbiAgICAgICAgaWYgMHg4MDAgPiBjXG4gICAgICAgICAgICByZXR1cm4gY2goMHhDMCB8IGM+PjYpICsgY2goMHg4MCB8IGMgJiAweDNGKVxuICAgICAgICBpZiAweDEwMDAwID4gY1xuICAgICAgICAgICAgcmV0dXJuIGNoKDB4RTAgfCBjPj4xMikgKyBjaCgweDgwIHwgYz4+NiAmIDB4M0YpICsgY2goMHg4MCB8IGMgJiAweDNGKVxuXG4gICAgICAgIHJldHVybiBjaCgweEYwIHwgYz4+MTgpICsgY2goMHg4MCB8IGM+PjEyICYgMHgzRikgKyBjaCgweDgwIHwgYz4+NiAmIDB4M0YpICsgY2goMHg4MCB8IGMgJiAweDNGKVxuXG5cbiAgICAjIFJldHVybnMgdGhlIGJvb2xlYW4gdmFsdWUgZXF1aXZhbGVudCB0byB0aGUgZ2l2ZW4gaW5wdXRcbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ3xPYmplY3RdICAgIGlucHV0ICAgICAgIFRoZSBpbnB1dCB2YWx1ZVxuICAgICMgQHBhcmFtIFtCb29sZWFuXSAgICAgICAgICBzdHJpY3QgICAgICBJZiBzZXQgdG8gZmFsc2UsIGFjY2VwdCAneWVzJyBhbmQgJ25vJyBhcyBib29sZWFuIHZhbHVlc1xuICAgICNcbiAgICAjIEByZXR1cm4gW0Jvb2xlYW5dICAgICAgICAgdGhlIGJvb2xlYW4gdmFsdWVcbiAgICAjXG4gICAgQHBhcnNlQm9vbGVhbjogKGlucHV0LCBzdHJpY3QgPSB0cnVlKSAtPlxuICAgICAgICBpZiB0eXBlb2YoaW5wdXQpIGlzICdzdHJpbmcnXG4gICAgICAgICAgICBsb3dlcklucHV0ID0gaW5wdXQudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgaWYgbm90IHN0cmljdFxuICAgICAgICAgICAgICAgIGlmIGxvd2VySW5wdXQgaXMgJ25vJyB0aGVuIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgaWYgbG93ZXJJbnB1dCBpcyAnMCcgdGhlbiByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIGlmIGxvd2VySW5wdXQgaXMgJ2ZhbHNlJyB0aGVuIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgaWYgbG93ZXJJbnB1dCBpcyAnJyB0aGVuIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgcmV0dXJuICEhaW5wdXRcblxuXG5cbiAgICAjIFJldHVybnMgdHJ1ZSBpZiBpbnB1dCBpcyBudW1lcmljXG4gICAgI1xuICAgICMgQHBhcmFtIFtPYmplY3RdIGlucHV0IFRoZSB2YWx1ZSB0byB0ZXN0XG4gICAgI1xuICAgICMgQHJldHVybiBbQm9vbGVhbl0gdHJ1ZSBpZiBpbnB1dCBpcyBudW1lcmljXG4gICAgI1xuICAgIEBpc051bWVyaWM6IChpbnB1dCkgLT5cbiAgICAgICAgQFJFR0VYX1NQQUNFUy5sYXN0SW5kZXggPSAwXG4gICAgICAgIHJldHVybiB0eXBlb2YoaW5wdXQpIGlzICdudW1iZXInIG9yIHR5cGVvZihpbnB1dCkgaXMgJ3N0cmluZycgYW5kICFpc05hTihpbnB1dCkgYW5kIGlucHV0LnJlcGxhY2UoQFJFR0VYX1NQQUNFUywgJycpIGlzbnQgJydcblxuXG4gICAgIyBSZXR1cm5zIGEgcGFyc2VkIGRhdGUgZnJvbSB0aGUgZ2l2ZW4gc3RyaW5nXG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddIHN0ciBUaGUgZGF0ZSBzdHJpbmcgdG8gcGFyc2VcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtEYXRlXSBUaGUgcGFyc2VkIGRhdGUgb3IgbnVsbCBpZiBwYXJzaW5nIGZhaWxlZFxuICAgICNcbiAgICBAc3RyaW5nVG9EYXRlOiAoc3RyKSAtPlxuICAgICAgICB1bmxlc3Mgc3RyPy5sZW5ndGhcbiAgICAgICAgICAgIHJldHVybiBudWxsXG5cbiAgICAgICAgIyBQZXJmb3JtIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuXG4gICAgICAgIGluZm8gPSBAUEFUVEVSTl9EQVRFLmV4ZWMgc3RyXG4gICAgICAgIHVubGVzcyBpbmZvXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgICAgICMgRXh0cmFjdCB5ZWFyLCBtb250aCwgZGF5XG4gICAgICAgIHllYXIgPSBwYXJzZUludCBpbmZvLnllYXIsIDEwXG4gICAgICAgIG1vbnRoID0gcGFyc2VJbnQoaW5mby5tb250aCwgMTApIC0gMSAjIEluIGphdmFzY3JpcHQsIGphbnVhcnkgaXMgMCwgZmVicnVhcnkgMSwgZXRjLi4uXG4gICAgICAgIGRheSA9IHBhcnNlSW50IGluZm8uZGF5LCAxMFxuXG4gICAgICAgICMgSWYgbm8gaG91ciBpcyBnaXZlbiwgcmV0dXJuIGEgZGF0ZSB3aXRoIGRheSBwcmVjaXNpb25cbiAgICAgICAgdW5sZXNzIGluZm8uaG91cj9cbiAgICAgICAgICAgIGRhdGUgPSBuZXcgRGF0ZSBEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5KVxuICAgICAgICAgICAgcmV0dXJuIGRhdGVcblxuICAgICAgICAjIEV4dHJhY3QgaG91ciwgbWludXRlLCBzZWNvbmRcbiAgICAgICAgaG91ciA9IHBhcnNlSW50IGluZm8uaG91ciwgMTBcbiAgICAgICAgbWludXRlID0gcGFyc2VJbnQgaW5mby5taW51dGUsIDEwXG4gICAgICAgIHNlY29uZCA9IHBhcnNlSW50IGluZm8uc2Vjb25kLCAxMFxuXG4gICAgICAgICMgRXh0cmFjdCBmcmFjdGlvbiwgaWYgZ2l2ZW5cbiAgICAgICAgaWYgaW5mby5mcmFjdGlvbj9cbiAgICAgICAgICAgIGZyYWN0aW9uID0gaW5mby5mcmFjdGlvblswLi4uM11cbiAgICAgICAgICAgIHdoaWxlIGZyYWN0aW9uLmxlbmd0aCA8IDNcbiAgICAgICAgICAgICAgICBmcmFjdGlvbiArPSAnMCdcbiAgICAgICAgICAgIGZyYWN0aW9uID0gcGFyc2VJbnQgZnJhY3Rpb24sIDEwXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGZyYWN0aW9uID0gMFxuXG4gICAgICAgICMgQ29tcHV0ZSB0aW1lem9uZSBvZmZzZXQgaWYgZ2l2ZW5cbiAgICAgICAgaWYgaW5mby50ej9cbiAgICAgICAgICAgIHR6X2hvdXIgPSBwYXJzZUludCBpbmZvLnR6X2hvdXIsIDEwXG4gICAgICAgICAgICBpZiBpbmZvLnR6X21pbnV0ZT9cbiAgICAgICAgICAgICAgICB0el9taW51dGUgPSBwYXJzZUludCBpbmZvLnR6X21pbnV0ZSwgMTBcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0el9taW51dGUgPSAwXG5cbiAgICAgICAgICAgICMgQ29tcHV0ZSB0aW1lem9uZSBkZWx0YSBpbiBtc1xuICAgICAgICAgICAgdHpfb2Zmc2V0ID0gKHR6X2hvdXIgKiA2MCArIHR6X21pbnV0ZSkgKiA2MDAwMFxuICAgICAgICAgICAgaWYgJy0nIGlzIGluZm8udHpfc2lnblxuICAgICAgICAgICAgICAgIHR6X29mZnNldCAqPSAtMVxuXG4gICAgICAgICMgQ29tcHV0ZSBkYXRlXG4gICAgICAgIGRhdGUgPSBuZXcgRGF0ZSBEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgZnJhY3Rpb24pXG4gICAgICAgIGlmIHR6X29mZnNldFxuICAgICAgICAgICAgZGF0ZS5zZXRUaW1lIGRhdGUuZ2V0VGltZSgpIC0gdHpfb2Zmc2V0XG5cbiAgICAgICAgcmV0dXJuIGRhdGVcblxuXG4gICAgIyBSZXBlYXRzIHRoZSBnaXZlbiBzdHJpbmcgYSBudW1iZXIgb2YgdGltZXNcbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICBzdHIgICAgIFRoZSBzdHJpbmcgdG8gcmVwZWF0XG4gICAgIyBAcGFyYW0gW0ludGVnZXJdICBudW1iZXIgIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcmVwZWF0IHRoZSBzdHJpbmdcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtTdHJpbmddICBUaGUgcmVwZWF0ZWQgc3RyaW5nXG4gICAgI1xuICAgIEBzdHJSZXBlYXQ6IChzdHIsIG51bWJlcikgLT5cbiAgICAgICAgcmVzID0gJydcbiAgICAgICAgaSA9IDBcbiAgICAgICAgd2hpbGUgaSA8IG51bWJlclxuICAgICAgICAgICAgcmVzICs9IHN0clxuICAgICAgICAgICAgaSsrXG4gICAgICAgIHJldHVybiByZXNcblxuXG4gICAgIyBSZWFkcyB0aGUgZGF0YSBmcm9tIHRoZSBnaXZlbiBmaWxlIHBhdGggYW5kIHJldHVybnMgdGhlIHJlc3VsdCBhcyBzdHJpbmdcbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICBwYXRoICAgICAgICBUaGUgcGF0aCB0byB0aGUgZmlsZVxuICAgICMgQHBhcmFtIFtGdW5jdGlvbl0gY2FsbGJhY2sgICAgQSBjYWxsYmFjayB0byByZWFkIGZpbGUgYXN5bmNocm9ub3VzbHkgKG9wdGlvbmFsKVxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gIFRoZSByZXN1bHRpbmcgZGF0YSBhcyBzdHJpbmdcbiAgICAjXG4gICAgQGdldFN0cmluZ0Zyb21GaWxlOiAocGF0aCwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgICAgICB4aHIgPSBudWxsXG4gICAgICAgIGlmIHdpbmRvdz9cbiAgICAgICAgICAgIGlmIHdpbmRvdy5YTUxIdHRwUmVxdWVzdFxuICAgICAgICAgICAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICAgICAgICBlbHNlIGlmIHdpbmRvdy5BY3RpdmVYT2JqZWN0XG4gICAgICAgICAgICAgICAgZm9yIG5hbWUgaW4gW1wiTXN4bWwyLlhNTEhUVFAuNi4wXCIsIFwiTXN4bWwyLlhNTEhUVFAuMy4wXCIsIFwiTXN4bWwyLlhNTEhUVFBcIiwgXCJNaWNyb3NvZnQuWE1MSFRUUFwiXVxuICAgICAgICAgICAgICAgICAgICB0cnlcbiAgICAgICAgICAgICAgICAgICAgICAgIHhociA9IG5ldyBBY3RpdmVYT2JqZWN0KG5hbWUpXG5cbiAgICAgICAgaWYgeGhyP1xuICAgICAgICAgICAgIyBCcm93c2VyXG4gICAgICAgICAgICBpZiBjYWxsYmFjaz9cbiAgICAgICAgICAgICAgICAjIEFzeW5jXG4gICAgICAgICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IC0+XG4gICAgICAgICAgICAgICAgICAgIGlmIHhoci5yZWFkeVN0YXRlIGlzIDRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIHhoci5zdGF0dXMgaXMgMjAwIG9yIHhoci5zdGF0dXMgaXMgMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHhoci5yZXNwb25zZVRleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgICAgICAgICAgICB4aHIub3BlbiAnR0VUJywgcGF0aCwgdHJ1ZVxuICAgICAgICAgICAgICAgIHhoci5zZW5kIG51bGxcblxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICMgU3luY1xuICAgICAgICAgICAgICAgIHhoci5vcGVuICdHRVQnLCBwYXRoLCBmYWxzZVxuICAgICAgICAgICAgICAgIHhoci5zZW5kIG51bGxcblxuICAgICAgICAgICAgICAgIGlmIHhoci5zdGF0dXMgaXMgMjAwIG9yIHhoci5zdGF0dXMgPT0gMFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geGhyLnJlc3BvbnNlVGV4dFxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgIyBOb2RlLmpzLWxpa2VcbiAgICAgICAgICAgIHJlcSA9IHJlcXVpcmVcbiAgICAgICAgICAgIGZzID0gcmVxKCdmcycpICMgUHJldmVudCBicm93c2VyaWZ5IGZyb20gdHJ5aW5nIHRvIGxvYWQgJ2ZzJyBtb2R1bGVcbiAgICAgICAgICAgIGlmIGNhbGxiYWNrP1xuICAgICAgICAgICAgICAgICMgQXN5bmNcbiAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZSBwYXRoLCAoZXJyLCBkYXRhKSAtPlxuICAgICAgICAgICAgICAgICAgICBpZiBlcnJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrIG51bGxcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgU3RyaW5nKGRhdGEpXG5cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAjIFN5bmNcbiAgICAgICAgICAgICAgICBkYXRhID0gZnMucmVhZEZpbGVTeW5jIHBhdGhcbiAgICAgICAgICAgICAgICBpZiBkYXRhP1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGxcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHNcbiIsIlxuUGFyc2VyID0gcmVxdWlyZSAnLi9QYXJzZXInXG5EdW1wZXIgPSByZXF1aXJlICcuL0R1bXBlcidcblV0aWxzICA9IHJlcXVpcmUgJy4vVXRpbHMnXG5cbiMgWWFtbCBvZmZlcnMgY29udmVuaWVuY2UgbWV0aG9kcyB0byBsb2FkIGFuZCBkdW1wIFlBTUwuXG4jXG5jbGFzcyBZYW1sXG5cbiAgICAjIFBhcnNlcyBZQU1MIGludG8gYSBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICAjXG4gICAgIyBUaGUgcGFyc2UgbWV0aG9kLCB3aGVuIHN1cHBsaWVkIHdpdGggYSBZQU1MIHN0cmluZyxcbiAgICAjIHdpbGwgZG8gaXRzIGJlc3QgdG8gY29udmVydCBZQU1MIGluIGEgZmlsZSBpbnRvIGEgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgI1xuICAgICMgIFVzYWdlOlxuICAgICMgICAgIG15T2JqZWN0ID0gWWFtbC5wYXJzZSgnc29tZTogeWFtbCcpO1xuICAgICMgICAgIGNvbnNvbGUubG9nKG15T2JqZWN0KTtcbiAgICAjXG4gICAgIyBAcGFyYW0gW1N0cmluZ10gICBpbnB1dCAgICAgICAgICAgICAgICAgICBBIHN0cmluZyBjb250YWluaW5nIFlBTUxcbiAgICAjIEBwYXJhbSBbQm9vbGVhbl0gIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgIHRydWUgaWYgYW4gZXhjZXB0aW9uIG11c3QgYmUgdGhyb3duIG9uIGludmFsaWQgdHlwZXMsIGZhbHNlIG90aGVyd2lzZVxuICAgICMgQHBhcmFtIFtGdW5jdGlvbl0gb2JqZWN0RGVjb2RlciAgICAgICAgICAgQSBmdW5jdGlvbiB0byBkZXNlcmlhbGl6ZSBjdXN0b20gb2JqZWN0cywgbnVsbCBvdGhlcndpc2VcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtPYmplY3RdICBUaGUgWUFNTCBjb252ZXJ0ZWQgdG8gYSBKYXZhU2NyaXB0IG9iamVjdFxuICAgICNcbiAgICAjIEB0aHJvdyBbUGFyc2VFeGNlcHRpb25dIElmIHRoZSBZQU1MIGlzIG5vdCB2YWxpZFxuICAgICNcbiAgICBAcGFyc2U6IChpbnB1dCwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSA9IGZhbHNlLCBvYmplY3REZWNvZGVyID0gbnVsbCkgLT5cbiAgICAgICAgcmV0dXJuIG5ldyBQYXJzZXIoKS5wYXJzZShpbnB1dCwgZXhjZXB0aW9uT25JbnZhbGlkVHlwZSwgb2JqZWN0RGVjb2RlcilcblxuXG4gICAgIyBQYXJzZXMgWUFNTCBmcm9tIGZpbGUgcGF0aCBpbnRvIGEgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgI1xuICAgICMgVGhlIHBhcnNlRmlsZSBtZXRob2QsIHdoZW4gc3VwcGxpZWQgd2l0aCBhIFlBTUwgZmlsZSxcbiAgICAjIHdpbGwgZG8gaXRzIGJlc3QgdG8gY29udmVydCBZQU1MIGluIGEgZmlsZSBpbnRvIGEgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgI1xuICAgICMgIFVzYWdlOlxuICAgICMgICAgIG15T2JqZWN0ID0gWWFtbC5wYXJzZUZpbGUoJ2NvbmZpZy55bWwnKTtcbiAgICAjICAgICBjb25zb2xlLmxvZyhteU9iamVjdCk7XG4gICAgI1xuICAgICMgQHBhcmFtIFtTdHJpbmddICAgcGF0aCAgICAgICAgICAgICAgICAgICAgQSBmaWxlIHBhdGggcG9pbnRpbmcgdG8gYSB2YWxpZCBZQU1MIGZpbGVcbiAgICAjIEBwYXJhbSBbQm9vbGVhbl0gIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgIHRydWUgaWYgYW4gZXhjZXB0aW9uIG11c3QgYmUgdGhyb3duIG9uIGludmFsaWQgdHlwZXMsIGZhbHNlIG90aGVyd2lzZVxuICAgICMgQHBhcmFtIFtGdW5jdGlvbl0gb2JqZWN0RGVjb2RlciAgICAgICAgICAgQSBmdW5jdGlvbiB0byBkZXNlcmlhbGl6ZSBjdXN0b20gb2JqZWN0cywgbnVsbCBvdGhlcndpc2VcbiAgICAjXG4gICAgIyBAcmV0dXJuIFtPYmplY3RdICBUaGUgWUFNTCBjb252ZXJ0ZWQgdG8gYSBKYXZhU2NyaXB0IG9iamVjdCBvciBudWxsIGlmIHRoZSBmaWxlIGRvZXNuJ3QgZXhpc3QuXG4gICAgI1xuICAgICMgQHRocm93IFtQYXJzZUV4Y2VwdGlvbl0gSWYgdGhlIFlBTUwgaXMgbm90IHZhbGlkXG4gICAgI1xuICAgIEBwYXJzZUZpbGU6IChwYXRoLCBjYWxsYmFjayA9IG51bGwsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgPSBmYWxzZSwgb2JqZWN0RGVjb2RlciA9IG51bGwpIC0+XG4gICAgICAgIGlmIGNhbGxiYWNrP1xuICAgICAgICAgICAgIyBBc3luY1xuICAgICAgICAgICAgVXRpbHMuZ2V0U3RyaW5nRnJvbUZpbGUgcGF0aCwgKGlucHV0KSA9PlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG51bGxcbiAgICAgICAgICAgICAgICBpZiBpbnB1dD9cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gQHBhcnNlIGlucHV0LCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgcmVzdWx0XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgICMgU3luY1xuICAgICAgICAgICAgaW5wdXQgPSBVdGlscy5nZXRTdHJpbmdGcm9tRmlsZSBwYXRoXG4gICAgICAgICAgICBpZiBpbnB1dD9cbiAgICAgICAgICAgICAgICByZXR1cm4gQHBhcnNlIGlucHV0LCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxuXG5cbiAgICAjIER1bXBzIGEgSmF2YVNjcmlwdCBvYmplY3QgdG8gYSBZQU1MIHN0cmluZy5cbiAgICAjXG4gICAgIyBUaGUgZHVtcCBtZXRob2QsIHdoZW4gc3VwcGxpZWQgd2l0aCBhbiBvYmplY3QsIHdpbGwgZG8gaXRzIGJlc3RcbiAgICAjIHRvIGNvbnZlcnQgdGhlIG9iamVjdCBpbnRvIGZyaWVuZGx5IFlBTUwuXG4gICAgI1xuICAgICMgQHBhcmFtIFtPYmplY3RdICAgaW5wdXQgICAgICAgICAgICAgICAgICAgSmF2YVNjcmlwdCBvYmplY3RcbiAgICAjIEBwYXJhbSBbSW50ZWdlcl0gIGlubGluZSAgICAgICAgICAgICAgICAgIFRoZSBsZXZlbCB3aGVyZSB5b3Ugc3dpdGNoIHRvIGlubGluZSBZQU1MXG4gICAgIyBAcGFyYW0gW0ludGVnZXJdICBpbmRlbnQgICAgICAgICAgICAgICAgICBUaGUgYW1vdW50IG9mIHNwYWNlcyB0byB1c2UgZm9yIGluZGVudGF0aW9uIG9mIG5lc3RlZCBub2Rlcy5cbiAgICAjIEBwYXJhbSBbQm9vbGVhbl0gIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUgIHRydWUgaWYgYW4gZXhjZXB0aW9uIG11c3QgYmUgdGhyb3duIG9uIGludmFsaWQgdHlwZXMgKGEgSmF2YVNjcmlwdCByZXNvdXJjZSBvciBvYmplY3QpLCBmYWxzZSBvdGhlcndpc2VcbiAgICAjIEBwYXJhbSBbRnVuY3Rpb25dIG9iamVjdEVuY29kZXIgICAgICAgICAgIEEgZnVuY3Rpb24gdG8gc2VyaWFsaXplIGN1c3RvbSBvYmplY3RzLCBudWxsIG90aGVyd2lzZVxuICAgICNcbiAgICAjIEByZXR1cm4gW1N0cmluZ10gIEEgWUFNTCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBvcmlnaW5hbCBKYXZhU2NyaXB0IG9iamVjdFxuICAgICNcbiAgICBAZHVtcDogKGlucHV0LCBpbmxpbmUgPSAyLCBpbmRlbnQgPSA0LCBleGNlcHRpb25PbkludmFsaWRUeXBlID0gZmFsc2UsIG9iamVjdEVuY29kZXIgPSBudWxsKSAtPlxuICAgICAgICB5YW1sID0gbmV3IER1bXBlcigpXG4gICAgICAgIHlhbWwuaW5kZW50YXRpb24gPSBpbmRlbnRcblxuICAgICAgICByZXR1cm4geWFtbC5kdW1wKGlucHV0LCBpbmxpbmUsIDAsIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdEVuY29kZXIpXG5cblxuICAgICMgQWxpYXMgb2YgZHVtcCgpIG1ldGhvZCBmb3IgY29tcGF0aWJpbGl0eSByZWFzb25zLlxuICAgICNcbiAgICBAc3RyaW5naWZ5OiAoaW5wdXQsIGlubGluZSwgaW5kZW50LCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3RFbmNvZGVyKSAtPlxuICAgICAgICByZXR1cm4gQGR1bXAgaW5wdXQsIGlubGluZSwgaW5kZW50LCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3RFbmNvZGVyXG5cblxuICAgICMgQWxpYXMgb2YgcGFyc2VGaWxlKCkgbWV0aG9kIGZvciBjb21wYXRpYmlsaXR5IHJlYXNvbnMuXG4gICAgI1xuICAgIEBsb2FkOiAocGF0aCwgY2FsbGJhY2ssIGV4Y2VwdGlvbk9uSW52YWxpZFR5cGUsIG9iamVjdERlY29kZXIpIC0+XG4gICAgICAgIHJldHVybiBAcGFyc2VGaWxlIHBhdGgsIGNhbGxiYWNrLCBleGNlcHRpb25PbkludmFsaWRUeXBlLCBvYmplY3REZWNvZGVyXG5cblxuIyBFeHBvc2UgWUFNTCBuYW1lc3BhY2UgdG8gYnJvd3Nlclxud2luZG93Py5ZQU1MID0gWWFtbFxuXG4jIE5vdCBpbiB0aGUgYnJvd3Nlcj9cbnVubGVzcyB3aW5kb3c/XG4gICAgQFlBTUwgPSBZYW1sXG5cbm1vZHVsZS5leHBvcnRzID0gWWFtbFxuIl19
