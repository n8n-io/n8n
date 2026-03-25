var Marker = require('./marker');
var Token = require('./token');

var formatPosition = require('../utils/format-position');

var Level = {
  BLOCK: 'block',
  COMMENT: 'comment',
  DOUBLE_QUOTE: 'double-quote',
  RULE: 'rule',
  SINGLE_QUOTE: 'single-quote'
};

var AT_RULES = [
  '@charset',
  '@import'
];

var BLOCK_RULES = [
  '@-moz-document',
  '@document',
  '@-moz-keyframes',
  '@-ms-keyframes',
  '@-o-keyframes',
  '@-webkit-keyframes',
  '@keyframes',
  '@media',
  '@supports'
];

var IGNORE_END_COMMENT_PATTERN = /\/\* clean\-css ignore:end \*\/$/;
var IGNORE_START_COMMENT_PATTERN = /^\/\* clean\-css ignore:start \*\//;

var PAGE_MARGIN_BOXES = [
  '@bottom-center',
  '@bottom-left',
  '@bottom-left-corner',
  '@bottom-right',
  '@bottom-right-corner',
  '@left-bottom',
  '@left-middle',
  '@left-top',
  '@right-bottom',
  '@right-middle',
  '@right-top',
  '@top-center',
  '@top-left',
  '@top-left-corner',
  '@top-right',
  '@top-right-corner'
];

var EXTRA_PAGE_BOXES = [
  '@footnote',
  '@footnotes',
  '@left',
  '@page-float-bottom',
  '@page-float-top',
  '@right'
];

var REPEAT_PATTERN = /^\[\s{0,31}\d+\s{0,31}\]$/;
var RULE_WORD_SEPARATOR_PATTERN = /[\s\(]/;
var TAIL_BROKEN_VALUE_PATTERN = /[\s|\}]*$/;

function tokenize(source, externalContext) {
  var internalContext = {
    level: Level.BLOCK,
    position: {
      source: externalContext.source || undefined,
      line: 1,
      column: 0,
      index: 0
    }
  };

  return intoTokens(source, externalContext, internalContext, false);
}

function intoTokens(source, externalContext, internalContext, isNested) {
  var allTokens = [];
  var newTokens = allTokens;
  var lastToken;
  var ruleToken;
  var ruleTokens = [];
  var propertyToken;
  var metadata;
  var metadatas = [];
  var level = internalContext.level;
  var levels = [];
  var buffer = [];
  var buffers = [];
  var serializedBuffer;
  var serializedBufferPart;
  var roundBracketLevel = 0;
  var isQuoted;
  var isSpace;
  var isNewLineNix;
  var isNewLineWin;
  var isCarriageReturn;
  var isCommentStart;
  var wasCommentStart = false;
  var isCommentEnd;
  var wasCommentEnd = false;
  var isCommentEndMarker;
  var isEscaped;
  var wasEscaped = false;
  var isRaw = false;
  var seekingValue = false;
  var seekingPropertyBlockClosing = false;
  var position = internalContext.position;
  var lastCommentStartAt;

  for (; position.index < source.length; position.index++) {
    var character = source[position.index];

    isQuoted = level == Level.SINGLE_QUOTE || level == Level.DOUBLE_QUOTE;
    isSpace = character == Marker.SPACE || character == Marker.TAB;
    isNewLineNix = character == Marker.NEW_LINE_NIX;
    isNewLineWin = character == Marker.NEW_LINE_NIX && source[position.index - 1] == Marker.CARRIAGE_RETURN;
    isCarriageReturn = character == Marker.CARRIAGE_RETURN && source[position.index + 1] && source[position.index + 1] != Marker.NEW_LINE_NIX;
    isCommentStart = !wasCommentEnd && level != Level.COMMENT && !isQuoted && character == Marker.ASTERISK && source[position.index - 1] == Marker.FORWARD_SLASH;
    isCommentEndMarker = !wasCommentStart && !isQuoted && character == Marker.FORWARD_SLASH && source[position.index - 1] == Marker.ASTERISK;
    isCommentEnd = level == Level.COMMENT && isCommentEndMarker;
    roundBracketLevel = Math.max(roundBracketLevel, 0);

    metadata = buffer.length === 0 ?
      [position.line, position.column, position.source] :
      metadata;

    if (isEscaped) {
      // previous character was a backslash
      buffer.push(character);
    } else if (!isCommentEnd && level == Level.COMMENT) {
      buffer.push(character);
    } else if (!isCommentStart && !isCommentEnd && isRaw) {
      buffer.push(character);
    } else if (isCommentStart && (level == Level.BLOCK || level == Level.RULE) && buffer.length > 1) {
      // comment start within block preceded by some content, e.g. div/*<--
      metadatas.push(metadata);
      buffer.push(character);
      buffers.push(buffer.slice(0, buffer.length - 2));

      buffer = buffer.slice(buffer.length - 2);
      metadata = [position.line, position.column - 1, position.source];

      levels.push(level);
      level = Level.COMMENT;
    } else if (isCommentStart) {
      // comment start, e.g. /*<--
      levels.push(level);
      level = Level.COMMENT;
      buffer.push(character);
    } else if (isCommentEnd && isIgnoreStartComment(buffer)) {
      // ignore:start comment end, e.g. /* clean-css ignore:start */<--
      serializedBuffer = buffer.join('').trim() + character;
      lastToken = [Token.COMMENT, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]];
      newTokens.push(lastToken);

      isRaw = true;
      metadata = metadatas.pop() || null;
      buffer = buffers.pop() || [];
    } else if (isCommentEnd && isIgnoreEndComment(buffer)) {
      // ignore:start comment end, e.g. /* clean-css ignore:end */<--
      serializedBuffer = buffer.join('') + character;
      lastCommentStartAt = serializedBuffer.lastIndexOf(Marker.FORWARD_SLASH + Marker.ASTERISK);

      serializedBufferPart = serializedBuffer.substring(0, lastCommentStartAt);
      lastToken = [Token.RAW, serializedBufferPart, [originalMetadata(metadata, serializedBufferPart, externalContext)]];
      newTokens.push(lastToken);

      serializedBufferPart = serializedBuffer.substring(lastCommentStartAt);
      metadata = [position.line, position.column - serializedBufferPart.length + 1, position.source];
      lastToken = [Token.COMMENT, serializedBufferPart, [originalMetadata(metadata, serializedBufferPart, externalContext)]];
      newTokens.push(lastToken);

      isRaw = false;
      level = levels.pop();
      metadata = metadatas.pop() || null;
      buffer = buffers.pop() || [];
    } else if (isCommentEnd) {
      // comment end, e.g. /* comment */<--
      serializedBuffer = buffer.join('').trim() + character;
      lastToken = [Token.COMMENT, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]];
      newTokens.push(lastToken);

      level = levels.pop();
      metadata = metadatas.pop() || null;
      buffer = buffers.pop() || [];
    } else if (isCommentEndMarker && source[position.index + 1] != Marker.ASTERISK) {
      externalContext.warnings.push('Unexpected \'*/\' at ' + formatPosition([position.line, position.column, position.source]) + '.');
      buffer = [];
    } else if (character == Marker.SINGLE_QUOTE && !isQuoted) {
      // single quotation start, e.g. a[href^='https<--
      levels.push(level);
      level = Level.SINGLE_QUOTE;
      buffer.push(character);
    } else if (character == Marker.SINGLE_QUOTE && level == Level.SINGLE_QUOTE) {
      // single quotation end, e.g. a[href^='https'<--
      level = levels.pop();
      buffer.push(character);
    } else if (character == Marker.DOUBLE_QUOTE && !isQuoted) {
      // double quotation start, e.g. a[href^="<--
      levels.push(level);
      level = Level.DOUBLE_QUOTE;
      buffer.push(character);
    } else if (character == Marker.DOUBLE_QUOTE && level == Level.DOUBLE_QUOTE) {
      // double quotation end, e.g. a[href^="https"<--
      level = levels.pop();
      buffer.push(character);
    } else if (!isCommentStart && !isCommentEnd && character != Marker.CLOSE_ROUND_BRACKET && character != Marker.OPEN_ROUND_BRACKET && level != Level.COMMENT && !isQuoted && roundBracketLevel > 0) {
      // character inside any function, e.g. hsla(.<--
      buffer.push(character);
    } else if (character == Marker.OPEN_ROUND_BRACKET && !isQuoted && level != Level.COMMENT && !seekingValue) {
      // round open bracket, e.g. @import url(<--
      buffer.push(character);

      roundBracketLevel++;
    } else if (character == Marker.CLOSE_ROUND_BRACKET && !isQuoted && level != Level.COMMENT && !seekingValue) {
      // round open bracket, e.g. @import url(test.css)<--
      buffer.push(character);

      roundBracketLevel--;
    } else if (character == Marker.SEMICOLON && level == Level.BLOCK && buffer[0] == Marker.AT) {
      // semicolon ending rule at block level, e.g. @import '...';<--
      serializedBuffer = buffer.join('').trim();
      allTokens.push([Token.AT_RULE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

      buffer = [];
    } else if (character == Marker.COMMA && level == Level.BLOCK && ruleToken) {
      // comma separator at block level, e.g. a,div,<--
      serializedBuffer = buffer.join('').trim();
      ruleToken[1].push([tokenScopeFrom(ruleToken[0]), serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext, ruleToken[1].length)]]);

      buffer = [];
    } else if (character == Marker.COMMA && level == Level.BLOCK && tokenTypeFrom(buffer) == Token.AT_RULE) {
      // comma separator at block level, e.g. @import url(...) screen,<--
      // keep iterating as end semicolon will create the token
      buffer.push(character);
    } else if (character == Marker.COMMA && level == Level.BLOCK) {
      // comma separator at block level, e.g. a,<--
      ruleToken = [tokenTypeFrom(buffer), [], []];
      serializedBuffer = buffer.join('').trim();
      ruleToken[1].push([tokenScopeFrom(ruleToken[0]), serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext, 0)]]);

      buffer = [];
    } else if (character == Marker.OPEN_CURLY_BRACKET && level == Level.BLOCK && ruleToken && ruleToken[0] == Token.NESTED_BLOCK) {
      // open brace opening at-rule at block level, e.g. @media{<--
      serializedBuffer = buffer.join('').trim();
      ruleToken[1].push([Token.NESTED_BLOCK_SCOPE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      allTokens.push(ruleToken);

      levels.push(level);
      position.column++;
      position.index++;
      buffer = [];

      ruleToken[2] = intoTokens(source, externalContext, internalContext, true);
      ruleToken = null;
    } else if (character == Marker.OPEN_CURLY_BRACKET && level == Level.BLOCK && tokenTypeFrom(buffer) == Token.NESTED_BLOCK) {
      // open brace opening at-rule at block level, e.g. @media{<--
      serializedBuffer = buffer.join('').trim();
      ruleToken = ruleToken || [Token.NESTED_BLOCK, [], []];
      ruleToken[1].push([Token.NESTED_BLOCK_SCOPE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      allTokens.push(ruleToken);

      levels.push(level);
      position.column++;
      position.index++;
      buffer = [];

      ruleToken[2] = intoTokens(source, externalContext, internalContext, true);
      ruleToken = null;
    } else if (character == Marker.OPEN_CURLY_BRACKET && level == Level.BLOCK) {
      // open brace opening rule at block level, e.g. div{<--
      serializedBuffer = buffer.join('').trim();
      ruleToken = ruleToken || [tokenTypeFrom(buffer), [], []];
      ruleToken[1].push([tokenScopeFrom(ruleToken[0]), serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext, ruleToken[1].length)]]);
      newTokens = ruleToken[2];
      allTokens.push(ruleToken);

      levels.push(level);
      level = Level.RULE;
      buffer = [];
    } else if (character == Marker.OPEN_CURLY_BRACKET && level == Level.RULE && seekingValue) {
      // open brace opening rule at rule level, e.g. div{--variable:{<--
      ruleTokens.push(ruleToken);
      ruleToken = [Token.PROPERTY_BLOCK, []];
      propertyToken.push(ruleToken);
      newTokens = ruleToken[1];

      levels.push(level);
      level = Level.RULE;
      seekingValue = false;
    } else if (character == Marker.OPEN_CURLY_BRACKET && level == Level.RULE && isPageMarginBox(buffer)) {
      // open brace opening page-margin box at rule level, e.g. @page{@top-center{<--
      serializedBuffer = buffer.join('').trim();
      ruleTokens.push(ruleToken);
      ruleToken = [Token.AT_RULE_BLOCK, [], []];
      ruleToken[1].push([Token.AT_RULE_BLOCK_SCOPE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      newTokens.push(ruleToken);
      newTokens = ruleToken[2];

      levels.push(level);
      level = Level.RULE;
      buffer = [];
    } else if (character == Marker.COLON && level == Level.RULE && !seekingValue) {
      // colon at rule level, e.g. a{color:<--
      serializedBuffer = buffer.join('').trim();
      propertyToken = [Token.PROPERTY, [Token.PROPERTY_NAME, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]];
      newTokens.push(propertyToken);

      seekingValue = true;
      buffer = [];
    } else if (character == Marker.SEMICOLON && level == Level.RULE && propertyToken && ruleTokens.length > 0 && buffer.length > 0 && buffer[0] == Marker.AT) {
      // semicolon at rule level for at-rule, e.g. a{--color:{@apply(--other-color);<--
      serializedBuffer = buffer.join('').trim();
      ruleToken[1].push([Token.AT_RULE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

      buffer = [];
    } else if (character == Marker.SEMICOLON && level == Level.RULE && propertyToken && buffer.length > 0) {
      // semicolon at rule level, e.g. a{color:red;<--
      serializedBuffer = buffer.join('').trim();
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

      propertyToken = null;
      seekingValue = false;
      buffer = [];
    } else if (character == Marker.SEMICOLON && level == Level.RULE && propertyToken && buffer.length === 0) {
      // semicolon after bracketed value at rule level, e.g. a{color:rgb(...);<--
      propertyToken = null;
      seekingValue = false;
    } else if (character == Marker.SEMICOLON && level == Level.RULE && buffer.length > 0 && buffer[0] == Marker.AT) {
      // semicolon for at-rule at rule level, e.g. a{@apply(--variable);<--
      serializedBuffer = buffer.join('');
      newTokens.push([Token.AT_RULE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

      seekingValue = false;
      buffer = [];
    } else if (character == Marker.SEMICOLON && level == Level.RULE && seekingPropertyBlockClosing) {
      // close brace after a property block at rule level, e.g. a{--custom:{color:red;};<--
      seekingPropertyBlockClosing = false;
      buffer = [];
    } else if (character == Marker.SEMICOLON && level == Level.RULE && buffer.length === 0) {
      // stray semicolon at rule level, e.g. a{;<--
      // noop
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.RULE && propertyToken && seekingValue && buffer.length > 0 && ruleTokens.length > 0) {
      // close brace at rule level, e.g. a{--color:{color:red}<--
      serializedBuffer = buffer.join('');
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      propertyToken = null;
      ruleToken = ruleTokens.pop();
      newTokens = ruleToken[2];

      level = levels.pop();
      seekingValue = false;
      buffer = [];
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.RULE && propertyToken && buffer.length > 0 && buffer[0] == Marker.AT && ruleTokens.length > 0) {
      // close brace at rule level for at-rule, e.g. a{--color:{@apply(--other-color)}<--
      serializedBuffer = buffer.join('');
      ruleToken[1].push([Token.AT_RULE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      propertyToken = null;
      ruleToken = ruleTokens.pop();
      newTokens = ruleToken[2];

      level = levels.pop();
      seekingValue = false;
      buffer = [];
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.RULE && propertyToken && ruleTokens.length > 0) {
      // close brace at rule level after space, e.g. a{--color:{color:red }<--
      propertyToken = null;
      ruleToken = ruleTokens.pop();
      newTokens = ruleToken[2];

      level = levels.pop();
      seekingValue = false;
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.RULE && propertyToken && buffer.length > 0) {
      // close brace at rule level, e.g. a{color:red}<--
      serializedBuffer = buffer.join('');
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      propertyToken = null;
      ruleToken = ruleTokens.pop();
      newTokens = allTokens;

      level = levels.pop();
      seekingValue = false;
      buffer = [];
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.RULE && buffer.length > 0 && buffer[0] == Marker.AT) {
      // close brace after at-rule at rule level, e.g. a{@apply(--variable)}<--
      propertyToken = null;
      ruleToken = null;
      serializedBuffer = buffer.join('').trim();
      newTokens.push([Token.AT_RULE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      newTokens = allTokens;

      level = levels.pop();
      seekingValue = false;
      buffer = [];
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.RULE && levels[levels.length - 1] == Level.RULE) {
      // close brace after a property block at rule level, e.g. a{--custom:{color:red;}<--
      propertyToken = null;
      ruleToken = ruleTokens.pop();
      newTokens = ruleToken[2];

      level = levels.pop();
      seekingValue = false;
      seekingPropertyBlockClosing = true;
      buffer = [];
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.RULE) {
      // close brace after a rule, e.g. a{color:red;}<--
      propertyToken = null;
      ruleToken = null;
      newTokens = allTokens;

      level = levels.pop();
      seekingValue = false;
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.BLOCK && !isNested && position.index <= source.length - 1) {
      // stray close brace at block level, e.g. a{color:red}color:blue}<--
      externalContext.warnings.push('Unexpected \'}\' at ' + formatPosition([position.line, position.column, position.source]) + '.');
      buffer.push(character);
    } else if (character == Marker.CLOSE_CURLY_BRACKET && level == Level.BLOCK) {
      // close brace at block level, e.g. @media screen {...}<--
      break;
    } else if (character == Marker.OPEN_ROUND_BRACKET && level == Level.RULE && seekingValue) {
      // round open bracket, e.g. a{color:hsla(<--
      buffer.push(character);
      roundBracketLevel++;
    } else if (character == Marker.CLOSE_ROUND_BRACKET && level == Level.RULE && seekingValue && roundBracketLevel == 1) {
      // round close bracket, e.g. a{color:hsla(0,0%,0%)<--
      buffer.push(character);
      serializedBuffer = buffer.join('').trim();
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

      roundBracketLevel--;
      buffer = [];
    } else if (character == Marker.CLOSE_ROUND_BRACKET && level == Level.RULE && seekingValue) {
      // round close bracket within other brackets, e.g. a{width:calc((10rem / 2)<--
      buffer.push(character);
      roundBracketLevel--;
    } else if (character == Marker.FORWARD_SLASH && source[position.index + 1] != Marker.ASTERISK && level == Level.RULE && seekingValue && buffer.length > 0) {
      // forward slash within a property, e.g. a{background:url(image.png) 0 0/<--
      serializedBuffer = buffer.join('').trim();
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      propertyToken.push([Token.PROPERTY_VALUE, character, [[position.line, position.column, position.source]]]);

      buffer = [];
    } else if (character == Marker.FORWARD_SLASH && source[position.index + 1] != Marker.ASTERISK && level == Level.RULE && seekingValue) {
      // forward slash within a property after space, e.g. a{background:url(image.png) 0 0 /<--
      propertyToken.push([Token.PROPERTY_VALUE, character, [[position.line, position.column, position.source]]]);

      buffer = [];
    } else if (character == Marker.COMMA && level == Level.RULE && seekingValue && buffer.length > 0) {
      // comma within a property, e.g. a{background:url(image.png),<--
      serializedBuffer = buffer.join('').trim();
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);
      propertyToken.push([Token.PROPERTY_VALUE, character, [[position.line, position.column, position.source]]]);

      buffer = [];
    } else if (character == Marker.COMMA && level == Level.RULE && seekingValue) {
      // comma within a property after space, e.g. a{background:url(image.png) ,<--
      propertyToken.push([Token.PROPERTY_VALUE, character, [[position.line, position.column, position.source]]]);

      buffer = [];
    } else if (character == Marker.CLOSE_SQUARE_BRACKET && propertyToken && propertyToken.length > 1 && buffer.length > 0 && isRepeatToken(buffer)) {
      buffer.push(character);
      serializedBuffer = buffer.join('').trim();
      propertyToken[propertyToken.length - 1][1] += serializedBuffer;

      buffer = [];
    } else if ((isSpace || (isNewLineNix && !isNewLineWin)) && level == Level.RULE && seekingValue && propertyToken && buffer.length > 0) {
      // space or *nix newline within property, e.g. a{margin:0 <--
      serializedBuffer = buffer.join('').trim();
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

      buffer = [];
    } else if (isNewLineWin && level == Level.RULE && seekingValue && propertyToken && buffer.length > 1) {
      // win newline within property, e.g. a{margin:0\r\n<--
      serializedBuffer = buffer.join('').trim();
      propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

      buffer = [];
    } else if (isNewLineWin && level == Level.RULE && seekingValue) {
      // win newline
      buffer = [];
    } else if (buffer.length == 1 && isNewLineWin) {
      // ignore windows newline which is composed of two characters
      buffer.pop();
    } else if (buffer.length > 0 || !isSpace && !isNewLineNix && !isNewLineWin && !isCarriageReturn) {
      // any character
      buffer.push(character);
    }

    wasEscaped = isEscaped;
    isEscaped = !wasEscaped && character == Marker.BACK_SLASH;
    wasCommentStart = isCommentStart;
    wasCommentEnd = isCommentEnd;

    position.line = (isNewLineWin || isNewLineNix || isCarriageReturn) ? position.line + 1 : position.line;
    position.column = (isNewLineWin || isNewLineNix || isCarriageReturn) ? 0 : position.column + 1;
  }

  if (seekingValue) {
    externalContext.warnings.push('Missing \'}\' at ' + formatPosition([position.line, position.column, position.source]) + '.');
  }

  if (seekingValue && buffer.length > 0) {
    serializedBuffer = buffer.join('').replace(TAIL_BROKEN_VALUE_PATTERN, '');
    propertyToken.push([Token.PROPERTY_VALUE, serializedBuffer, [originalMetadata(metadata, serializedBuffer, externalContext)]]);

    buffer = [];
  }

  if (buffer.length > 0) {
    externalContext.warnings.push('Invalid character(s) \'' + buffer.join('') + '\' at ' + formatPosition(metadata) + '. Ignoring.');
  }

  return allTokens;
}

function isIgnoreStartComment(buffer) {
  return IGNORE_START_COMMENT_PATTERN.test(buffer.join('') + Marker.FORWARD_SLASH);
}

function isIgnoreEndComment(buffer) {
  return IGNORE_END_COMMENT_PATTERN.test(buffer.join('') + Marker.FORWARD_SLASH);
}

function originalMetadata(metadata, value, externalContext, selectorFallbacks) {
  var source = metadata[2];

  return externalContext.inputSourceMapTracker.isTracking(source) ?
    externalContext.inputSourceMapTracker.originalPositionFor(metadata, value.length, selectorFallbacks) :
    metadata;
}

function tokenTypeFrom(buffer) {
  var isAtRule = buffer[0] == Marker.AT || buffer[0] == Marker.UNDERSCORE;
  var ruleWord = buffer.join('').split(RULE_WORD_SEPARATOR_PATTERN)[0];

  if (isAtRule && BLOCK_RULES.indexOf(ruleWord) > -1) {
    return Token.NESTED_BLOCK;
  } else if (isAtRule && AT_RULES.indexOf(ruleWord) > -1) {
    return Token.AT_RULE;
  } else if (isAtRule) {
    return Token.AT_RULE_BLOCK;
  } else {
    return Token.RULE;
  }
}

function tokenScopeFrom(tokenType) {
  if (tokenType == Token.RULE) {
    return Token.RULE_SCOPE;
  } else if (tokenType == Token.NESTED_BLOCK) {
    return Token.NESTED_BLOCK_SCOPE;
  } else if (tokenType == Token.AT_RULE_BLOCK) {
    return Token.AT_RULE_BLOCK_SCOPE;
  }
}

function isPageMarginBox(buffer) {
  var serializedBuffer = buffer.join('').trim();

  return PAGE_MARGIN_BOXES.indexOf(serializedBuffer) > -1 || EXTRA_PAGE_BOXES.indexOf(serializedBuffer) > -1;
}

function isRepeatToken(buffer) {
  return REPEAT_PATTERN.test(buffer.join('') + Marker.CLOSE_SQUARE_BRACKET);
}

module.exports = tokenize;
