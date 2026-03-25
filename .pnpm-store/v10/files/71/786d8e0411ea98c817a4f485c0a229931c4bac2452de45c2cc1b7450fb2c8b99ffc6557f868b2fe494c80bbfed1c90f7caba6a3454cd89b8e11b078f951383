'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseMediaFeature = parseMediaFeature;
exports.parseMediaQuery = parseMediaQuery;
exports.parseMediaList = parseMediaList;

var _Node = require('./nodes/Node');

var _Node2 = _interopRequireDefault(_Node);

var _Container = require('./nodes/Container');

var _Container2 = _interopRequireDefault(_Container);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Parses a media feature expression, e.g. `max-width: 10px`, `(color)`
 *
 * @param {string} string - the source expression string, can be inside parens
 * @param {Number} index - the index of `string` in the overall input
 *
 * @return {Array} an array of Nodes, the first element being a media feature,
 *    the secont - its value (may be missing)
 */

function parseMediaFeature(string) {
  var index = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

  var modesEntered = [{
    mode: 'normal',
    character: null
  }];
  var result = [];
  var lastModeIndex = 0;
  var mediaFeature = '';
  var colon = null;
  var mediaFeatureValue = null;
  var indexLocal = index;

  var stringNormalized = string;
  // Strip trailing parens (if any), and correct the starting index
  if (string[0] === '(' && string[string.length - 1] === ')') {
    stringNormalized = string.substring(1, string.length - 1);
    indexLocal++;
  }

  for (var i = 0; i < stringNormalized.length; i++) {
    var character = stringNormalized[i];

    // If entering/exiting a string
    if (character === '\'' || character === '"') {
      if (modesEntered[lastModeIndex].isCalculationEnabled === true) {
        modesEntered.push({
          mode: 'string',
          isCalculationEnabled: false,
          character: character
        });
        lastModeIndex++;
      } else if (modesEntered[lastModeIndex].mode === 'string' && modesEntered[lastModeIndex].character === character && stringNormalized[i - 1] !== '\\') {
        modesEntered.pop();
        lastModeIndex--;
      }
    }

    // If entering/exiting interpolation
    if (character === '{') {
      modesEntered.push({
        mode: 'interpolation',
        isCalculationEnabled: true
      });
      lastModeIndex++;
    } else if (character === '}') {
      modesEntered.pop();
      lastModeIndex--;
    }

    // If a : is met outside of a string, function call or interpolation, than
    // this : separates a media feature and a value
    if (modesEntered[lastModeIndex].mode === 'normal' && character === ':') {
      var mediaFeatureValueStr = stringNormalized.substring(i + 1);
      mediaFeatureValue = {
        type: 'value',
        before: /^(\s*)/.exec(mediaFeatureValueStr)[1],
        after: /(\s*)$/.exec(mediaFeatureValueStr)[1],
        value: mediaFeatureValueStr.trim()
      };
      // +1 for the colon
      mediaFeatureValue.sourceIndex = mediaFeatureValue.before.length + i + 1 + indexLocal;
      colon = {
        type: 'colon',
        sourceIndex: i + indexLocal,
        after: mediaFeatureValue.before,
        value: ':' };
      break;
    }

    mediaFeature += character;
  }

  // Forming a media feature node
  mediaFeature = {
    type: 'media-feature',
    before: /^(\s*)/.exec(mediaFeature)[1],
    after: /(\s*)$/.exec(mediaFeature)[1],
    value: mediaFeature.trim()
  };
  mediaFeature.sourceIndex = mediaFeature.before.length + indexLocal;
  result.push(mediaFeature);

  if (colon !== null) {
    colon.before = mediaFeature.after;
    result.push(colon);
  }

  if (mediaFeatureValue !== null) {
    result.push(mediaFeatureValue);
  }

  return result;
}

/**
 * Parses a media query, e.g. `screen and (color)`, `only tv`
 *
 * @param {string} string - the source media query string
 * @param {Number} index - the index of `string` in the overall input
 *
 * @return {Array} an array of Nodes and Containers
 */

function parseMediaQuery(string) {
  var index = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

  var result = [];

  // How many timies the parser entered parens/curly braces
  var localLevel = 0;
  // Has any keyword, media type, media feature expression or interpolation
  // ('element' hereafter) started
  var insideSomeValue = false;
  var node = void 0;

  function resetNode() {
    return {
      before: '',
      after: '',
      value: ''
    };
  }

  node = resetNode();

  for (var i = 0; i < string.length; i++) {
    var character = string[i];
    // If not yet entered any element
    if (!insideSomeValue) {
      if (character.search(/\s/) !== -1) {
        // A whitespace
        // Don't form 'after' yet; will do it later
        node.before += character;
      } else {
        // Not a whitespace - entering an element
        // Expression start
        if (character === '(') {
          node.type = 'media-feature-expression';
          localLevel++;
        }
        node.value = character;
        node.sourceIndex = index + i;
        insideSomeValue = true;
      }
    } else {
      // Already in the middle of some alement
      node.value += character;

      // Here parens just increase localLevel and don't trigger a start of
      // a media feature expression (since they can't be nested)
      // Interpolation start
      if (character === '{' || character === '(') {
        localLevel++;
      }
      // Interpolation/function call/media feature expression end
      if (character === ')' || character === '}') {
        localLevel--;
      }
    }

    // If exited all parens/curlies and the next symbol
    if (insideSomeValue && localLevel === 0 && (character === ')' || i === string.length - 1 || string[i + 1].search(/\s/) !== -1)) {
      if (['not', 'only', 'and'].indexOf(node.value) !== -1) {
        node.type = 'keyword';
      }
      // if it's an expression, parse its contents
      if (node.type === 'media-feature-expression') {
        node.nodes = parseMediaFeature(node.value, node.sourceIndex);
      }
      result.push(Array.isArray(node.nodes) ? new _Container2.default(node) : new _Node2.default(node));
      node = resetNode();
      insideSomeValue = false;
    }
  }

  // Now process the result array - to specify undefined types of the nodes
  // and specify the `after` prop
  for (var _i = 0; _i < result.length; _i++) {
    node = result[_i];
    if (_i > 0) {
      result[_i - 1].after = node.before;
    }

    // Node types. Might not be set because contains interpolation/function
    // calls or fully consists of them
    if (node.type === undefined) {
      if (_i > 0) {
        // only `and` can follow an expression
        if (result[_i - 1].type === 'media-feature-expression') {
          node.type = 'keyword';
          continue;
        }
        // Anything after 'only|not' is a media type
        if (result[_i - 1].value === 'not' || result[_i - 1].value === 'only') {
          node.type = 'media-type';
          continue;
        }
        // Anything after 'and' is an expression
        if (result[_i - 1].value === 'and') {
          node.type = 'media-feature-expression';
          continue;
        }

        if (result[_i - 1].type === 'media-type') {
          // if it is the last element - it might be an expression
          // or 'and' depending on what is after it
          if (!result[_i + 1]) {
            node.type = 'media-feature-expression';
          } else {
            node.type = result[_i + 1].type === 'media-feature-expression' ? 'keyword' : 'media-feature-expression';
          }
        }
      }

      if (_i === 0) {
        // `screen`, `fn( ... )`, `#{ ... }`. Not an expression, since then
        // its type would have been set by now
        if (!result[_i + 1]) {
          node.type = 'media-type';
          continue;
        }

        // `screen and` or `#{...} (max-width: 10px)`
        if (result[_i + 1] && (result[_i + 1].type === 'media-feature-expression' || result[_i + 1].type === 'keyword')) {
          node.type = 'media-type';
          continue;
        }
        if (result[_i + 2]) {
          // `screen and (color) ...`
          if (result[_i + 2].type === 'media-feature-expression') {
            node.type = 'media-type';
            result[_i + 1].type = 'keyword';
            continue;
          }
          // `only screen and ...`
          if (result[_i + 2].type === 'keyword') {
            node.type = 'keyword';
            result[_i + 1].type = 'media-type';
            continue;
          }
        }
        if (result[_i + 3]) {
          // `screen and (color) ...`
          if (result[_i + 3].type === 'media-feature-expression') {
            node.type = 'keyword';
            result[_i + 1].type = 'media-type';
            result[_i + 2].type = 'keyword';
            continue;
          }
        }
      }
    }
  }
  return result;
}

/**
 * Parses a media query list. Takes a possible `url()` at the start into
 * account, and divides the list into media queries that are parsed separately
 *
 * @param {string} string - the source media query list string
 *
 * @return {Array} an array of Nodes/Containers
 */

function parseMediaList(string) {
  var result = [];
  var interimIndex = 0;
  var levelLocal = 0;

  // Check for a `url(...)` part (if it is contents of an @import rule)
  var doesHaveUrl = /^(\s*)url\s*\(/.exec(string);
  if (doesHaveUrl !== null) {
    var i = doesHaveUrl[0].length;
    var parenthesesLv = 1;
    while (parenthesesLv > 0) {
      var character = string[i];
      if (character === '(') {
        parenthesesLv++;
      }
      if (character === ')') {
        parenthesesLv--;
      }
      i++;
    }
    result.unshift(new _Node2.default({
      type: 'url',
      value: string.substring(0, i).trim(),
      sourceIndex: doesHaveUrl[1].length,
      before: doesHaveUrl[1],
      after: /^(\s*)/.exec(string.substring(i))[1]
    }));
    interimIndex = i;
  }

  // Start processing the media query list
  for (var _i2 = interimIndex; _i2 < string.length; _i2++) {
    var _character = string[_i2];

    // Dividing the media query list into comma-separated media queries
    // Only count commas that are outside of any parens
    // (i.e., not part of function call params list, etc.)
    if (_character === '(') {
      levelLocal++;
    }
    if (_character === ')') {
      levelLocal--;
    }
    if (levelLocal === 0 && _character === ',') {
      var _mediaQueryString = string.substring(interimIndex, _i2);
      var _spaceBefore = /^(\s*)/.exec(_mediaQueryString)[1];
      result.push(new _Container2.default({
        type: 'media-query',
        value: _mediaQueryString.trim(),
        sourceIndex: interimIndex + _spaceBefore.length,
        nodes: parseMediaQuery(_mediaQueryString, interimIndex),
        before: _spaceBefore,
        after: /(\s*)$/.exec(_mediaQueryString)[1]
      }));
      interimIndex = _i2 + 1;
    }
  }

  var mediaQueryString = string.substring(interimIndex);
  var spaceBefore = /^(\s*)/.exec(mediaQueryString)[1];
  result.push(new _Container2.default({
    type: 'media-query',
    value: mediaQueryString.trim(),
    sourceIndex: interimIndex + spaceBefore.length,
    nodes: parseMediaQuery(mediaQueryString, interimIndex),
    before: spaceBefore,
    after: /(\s*)$/.exec(mediaQueryString)[1]
  }));

  return result;
}