import ast=require("./yamlAST")
'use strict';

/*eslint-disable max-len,no-use-before-define*/

import common              = require('./common');
import YAMLException       = require('./exception');
import Mark                = require('./mark');
import {Schema} from './schema'
import DEFAULT_SAFE_SCHEMA = require('./schema/default_safe');
import DEFAULT_FULL_SCHEMA = require('./schema/default_full');


var _hasOwnProperty = Object.prototype.hasOwnProperty;


var CONTEXT_FLOW_IN   = 1;
var CONTEXT_FLOW_OUT  = 2;
var CONTEXT_BLOCK_IN  = 3;
var CONTEXT_BLOCK_OUT = 4;


var CHOMPING_CLIP  = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP  = 3;


var PATTERN_NON_PRINTABLE         = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS       = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE            = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI               = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;


function is_EOL(c) {
  return (c === 0x0A/* LF */) || (c === 0x0D/* CR */);
}

function is_WHITE_SPACE(c) {
  return (c === 0x09/* Tab */) || (c === 0x20/* Space */);
}

function is_WS_OR_EOL(c) {
  return (c === 0x09/* Tab */) ||
         (c === 0x20/* Space */) ||
         (c === 0x0A/* LF */) ||
         (c === 0x0D/* CR */);
}

function is_FLOW_INDICATOR(c) {
  return 0x2C/* , */ === c ||
         0x5B/* [ */ === c ||
         0x5D/* ] */ === c ||
         0x7B/* { */ === c ||
         0x7D/* } */ === c;
}

function fromHexCode(c) {
  var lc;

  if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
    return c - 0x30;
  }

  /*eslint-disable no-bitwise*/
  lc = c | 0x20;

  if ((0x61/* a */ <= lc) && (lc <= 0x66/* f */)) {
    return lc - 0x61 + 10;
  }

  return -1;
}

function escapedHexLen(c) {
  if (c === 0x78/* x */) { return 2; }
  if (c === 0x75/* u */) { return 4; }
  if (c === 0x55/* U */) { return 8; }
  return 0;
}

function fromDecimalCode(c) {
  if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
    return c - 0x30;
  }

  return -1;
}

function simpleEscapeSequence(c) {
  return (c === 0x30/* 0 */) ? '\x00' :
        (c === 0x61/* a */) ? '\x07' :
        (c === 0x62/* b */) ? '\x08' :
        (c === 0x74/* t */) ? '\x09' :
        (c === 0x09/* Tab */) ? '\x09' :
        (c === 0x6E/* n */) ? '\x0A' :
        (c === 0x76/* v */) ? '\x0B' :
        (c === 0x66/* f */) ? '\x0C' :
        (c === 0x72/* r */) ? '\x0D' :
        (c === 0x65/* e */) ? '\x1B' :
        (c === 0x20/* Space */) ? ' ' :
        (c === 0x22/* " */) ? '\x22' :
        (c === 0x2F/* / */) ? '/' :
        (c === 0x5C/* \ */) ? '\x5C' :
        (c === 0x4E/* N */) ? '\x85' :
        (c === 0x5F/* _ */) ? '\xA0' :
        (c === 0x4C/* L */) ? '\u2028' :
        (c === 0x50/* P */) ? '\u2029' : '';
}

function charFromCodepoint(c) {
  if (c <= 0xFFFF) {
    return String.fromCharCode(c);
  }
  // Encode UTF-16 surrogate pair
  // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
  return String.fromCharCode(((c - 0x010000) >> 10) + 0xD800,
                             ((c - 0x010000) & 0x03FF) + 0xDC00);
}

var simpleEscapeCheck = new Array(256); // integer, for fast access
var simpleEscapeMap = new Array(256);
var customEscapeCheck = new Array(256); // integer, for fast access
var customEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
  customEscapeMap[i] = simpleEscapeMap[i] = simpleEscapeSequence(i);
  simpleEscapeCheck[i] = simpleEscapeMap[i] ? 1 : 0;
  customEscapeCheck[i] = 1;

  if (!simpleEscapeCheck[i]) {
    customEscapeMap[i] = '\\' + String.fromCharCode(i);
  }
}



class State{

    input:string
    filename:string;
    schema: Schema
    errorMap:any={}
    errors:YAMLException[]=[]
    onWarning:()=>any
    legacy:boolean;
    implicitTypes:any
    typeMap:any
    length:number
    position:number
    line:number
    lineStart:number
    lineIndent:number
    documents:ast.YAMLNode[];
    kind:string
    result:ast.YAMLNode
    tag:string
    anchor:string
    anchorMap:{ [name:string]:ast.YAMLNode}
    tagMap:any
    version:string
    checkLineBreaks:boolean
    allowAnyEscape:boolean
    ignoreDuplicateKeys: boolean;

    lines: Line[] = [];

    constructor(input:string,options:any){
        this.input = input;

        this.filename  = options['filename']  || null;
        this.schema    = options['schema']    || DEFAULT_FULL_SCHEMA;
        this.onWarning = options['onWarning'] || null;
        this.legacy     = options['legacy']    || false;
        this.allowAnyEscape = options['allowAnyEscape']    || false;
        this.ignoreDuplicateKeys = options['ignoreDuplicateKeys'] || false;

        this.implicitTypes = this.schema.compiledImplicit;
        this.typeMap       = this.schema.compiledTypeMap;

        this.length     = input.length;
        this.position   = 0;
        this.line       = 0;
        this.lineStart  = 0;
        this.lineIndent = 0;

        this.documents = [];

    }
}



function generateError(state, message, isWarning=false) {
  return new YAMLException(
    message,
    new Mark(state.filename, state.input, state.position, state.line, (state.position - state.lineStart)),
    isWarning);
}

function throwErrorFromPosition(state, position: number, message, isWarning=false, toLineEnd=false) {
    var line = positionToLine(state, position);

    if(!line) {
        return;
    }

    var hash = message + position;
    
    if(state.errorMap[hash]) {
        return;
    }
    
    var mark = new Mark(state.filename, state.input, position, line.line, (position - line.start));
    if(toLineEnd){
        mark.toLineEnd = true;
    }
    
    var error = new YAMLException(message, mark, isWarning);
    state.errors.push(error);
}

function throwError(state:State, message) {
    //FIXME
    var error=generateError(state,message);
    var hash=error.message+error.mark.position;
    if (state.errorMap[hash]) {
        return;
    }
    state.errors.push(error);
    state.errorMap[hash]=1;
    var or=state.position;
    while (true){
        if (state.position>=state.input.length-1){
            return;
        }
        var c=state.input.charAt(state.position);
        if (c=='\n'){

            state.position--;
            if (state.position==or){
                state.position+=1;
            }
            return;
        }
        if (c=='\r'){
            state.position--;
            if (state.position==or){
                state.position+=1;
            }
            return;
        }
        state.position++;
    }
  //throw generateError(state, message);
}

function throwWarning(state, message) {
  var error = generateError(state, message);

  if (state.onWarning) {
    state.onWarning.call(null, error);
  } else {
    //throw error;
  }
}


var directiveHandlers = {

  YAML: function handleYamlDirective(state, name, args) {

      var match, major, minor;

      if (null !== state.version) {
        throwError(state, 'duplication of %YAML directive');
      }

      if (1 !== args.length) {
        throwError(state, 'YAML directive accepts exactly one argument');
      }

      match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);

      if (null === match) {
        throwError(state, 'ill-formed argument of the YAML directive');
      }

      major = parseInt(match[1], 10);
      minor = parseInt(match[2], 10);

      if (1 !== major) {
        throwError(state, 'found incompatible YAML document (version 1.2 is required)');
      }

      state.version = args[0];
      state.checkLineBreaks = (minor < 2);

      if (2 !== minor) {
        throwError(state, 'found incompatible YAML document (version 1.2 is required)');
      }
    },

  TAG: function handleTagDirective(state, name, args) {

      var handle, prefix;

      if (2 !== args.length) {
        throwError(state, 'TAG directive accepts exactly two arguments');
      }

      handle = args[0];
      prefix = args[1];

      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(state, 'ill-formed tag handle (first argument) of the TAG directive');
      }

      if (_hasOwnProperty.call(state.tagMap, handle)) {
        throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
      }

      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state, 'ill-formed tag prefix (second argument) of the TAG directive');
      }

      state.tagMap[handle] = prefix;
    }
};


function captureSegment(state:State, start:number, end:number, checkJson:boolean):void {
  var _position, _length, _character, _result;
  var scalar:ast.YAMLScalar=<ast.YAMLScalar>state.result;
  if (scalar.startPosition==-1){
      scalar.startPosition=start;
  }
  if (start <= end) {
    _result = state.input.slice(start, end);

    if (checkJson) {
      for (_position = 0, _length = _result.length;
           _position < _length;
           _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(0x09 === _character ||
              0x20 <= _character && _character <= 0x10FFFF)) {
          throwError(state, 'expected valid JSON character');
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, 'the stream contains non-printable characters');
    }

    scalar.value+=_result;
    scalar.endPosition=end;
  }
}

function mergeMappings(state:State, destination, source) {
  var sourceKeys, key, index, quantity;

  if (!common.isObject(source)) {
    throwError(state, 'cannot merge mappings; the provided source object is unacceptable');
  }

  sourceKeys = Object.keys(source);

  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];

    if (!_hasOwnProperty.call(destination, key)) {
      destination[key] = source[key];
    }
  }
}

function storeMappingPair(state:State, _result:ast.YamlMap, keyTag, keyNode:ast.YAMLNode,
                          valueNode:ast.YAMLNode):ast.YamlMap {
  var index, quantity;
    if (keyNode==null){
        return;
    }
  //keyNode = String(keyNode);

  if (null === _result) {
    _result = {
        startPosition:keyNode.startPosition,
        endPosition:valueNode.endPosition,
        parent:null,
        errors:[],
        mappings: [],kind:ast.Kind.MAP};
  }

  // if ('tag:yaml.org,2002:merge' === keyTag) {
  //   if (Array.isArray(valueNode)) {
  //    for (index = 0, quantity = (<any>valueNode).length; index < quantity; index += 1) {
  //      mergeMappings(state, _result, valueNode[index]);
  //    }
  //   } else {
  //    mergeMappings(state, _result, valueNode);
  //   }
  // } else {

       var mapping=ast.newMapping(<ast.YAMLScalar>keyNode,valueNode);
       mapping.parent=_result;
       keyNode.parent=mapping;
      if (valueNode!=null) {
          valueNode.parent = mapping;
      }
    
    !state.ignoreDuplicateKeys && _result.mappings.forEach(sibling => {
        if(sibling.key && sibling.key.value === (mapping.key && mapping.key.value)) {
            throwErrorFromPosition(state, mapping.key.startPosition, 'duplicate key');
            throwErrorFromPosition(state, sibling.key.startPosition, 'duplicate key');
        }
    });
        
      _result.mappings.push(mapping)
    _result.endPosition=valueNode? valueNode.endPosition : keyNode.endPosition+1; //FIXME.workaround should be position of ':' indeed
  // }

  return _result;
}

function readLineBreak(state:State) {
  var ch;

  ch = state.input.charCodeAt(state.position);

  if (0x0A/* LF */ === ch) {
    state.position++;
  } else if (0x0D/* CR */ === ch) {
    state.position++;
    if (0x0A/* LF */ === state.input.charCodeAt(state.position)) {
      state.position++;
    }
  } else {
    throwError(state, 'a line break is expected');
  }

  state.line += 1;
  state.lineStart = state.position;
    
    state.lines.push({
        start: state.lineStart,
        line: state.line
    });
}

class Line {
    start: number;
    line: number;
}

function positionToLine(state: State, position: number): Line {
    var line: Line;
    
    for(var i = 0; i < state.lines.length; i++) {
        if(state.lines[i].start > position) {
            break;
        }
        
        line = state.lines[i];
    }

    if(!line) {
        return {
            start: 0,
            line: 0
        }
    }
    
    return line;
}

function skipSeparationSpace(state:State, allowComments, checkIndent) {
  var lineBreaks = 0,
      ch = state.input.charCodeAt(state.position);

  while (0 !== ch) {
    while (is_WHITE_SPACE(ch)) {
      if(ch===0x09/*Tab*/){
        state.errors.push(generateError(state,"Using tabs can lead to unpredictable results",true));
      }
      ch = state.input.charCodeAt(++state.position);
    }

    if (allowComments && 0x23/* # */ === ch) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0x0A/* LF */ && ch !== 0x0D/* CR */ && 0 !== ch);
    }

    if (is_EOL(ch)) {
      readLineBreak(state);

      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;

      while (0x20/* Space */ === ch) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }

  if (-1 !== checkIndent && 0 !== lineBreaks && state.lineIndent < checkIndent) {
    throwWarning(state, 'deficient indentation');
  }

  return lineBreaks;
}

function testDocumentSeparator(state:State) {
  var _position = state.position,
      ch;

  ch = state.input.charCodeAt(_position);

  // Condition state.position === state.lineStart is tested
  // in parent on each call, for efficiency. No needs to test here again.
  if ((0x2D/* - */ === ch || 0x2E/* . */ === ch) &&
      state.input.charCodeAt(_position + 1) === ch &&
      state.input.charCodeAt(_position + 2) === ch) {

    _position += 3;

    ch = state.input.charCodeAt(_position);

    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }

  return false;
}

function writeFoldedLines(state:State,scalar:ast.YAMLScalar, count:number) {
  if (1 === count) {
    scalar.value += ' ';
  } else if (count > 1) {
    scalar.value += common.repeat('\n', count - 1);
  }
}


function readPlainScalar(state:State, nodeIndent, withinFlowCollection) {
  var preceding,
      following,
      captureStart,
      captureEnd,
      hasPendingContent,
      _line,
      _lineStart,
      _lineIndent,
      _kind = state.kind,
      _result = state.result,
      ch;
  var state_result=ast.newScalar();
  state_result.plainScalar=true;
  state.result=state_result;
  ch = state.input.charCodeAt(state.position);

  if (is_WS_OR_EOL(ch)             ||
      is_FLOW_INDICATOR(ch)        ||
      0x23/* # */           === ch ||
      0x26/* & */           === ch ||
      0x2A/* * */           === ch ||
      0x21/* ! */           === ch ||
      0x7C/* | */           === ch ||
      0x3E/* > */           === ch ||
      0x27/* ' */           === ch ||
      0x22/* " */           === ch ||
      0x25/* % */           === ch ||
      0x40/* @ */           === ch ||
      0x60/* ` */           === ch) {
    return false;
  }

  if (0x3F/* ? */ === ch || 0x2D/* - */ === ch) {
    following = state.input.charCodeAt(state.position + 1);

    if (is_WS_OR_EOL(following) ||
        withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }

  state.kind = 'scalar';
  //state.result = '';
  captureStart = captureEnd = state.position;
  hasPendingContent = false;

  while (0 !== ch) {
    if (0x3A/* : */ === ch) {
      following = state.input.charCodeAt(state.position + 1);

      if (is_WS_OR_EOL(following) ||
          withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }

    } else if (0x23/* # */ === ch) {
      preceding = state.input.charCodeAt(state.position - 1);

      if (is_WS_OR_EOL(preceding)) {
        break;
      }

    } else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
               withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;

    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);

      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }

    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state_result,state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }

    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }

    ch = state.input.charCodeAt(++state.position);
      if (state.position>=state.input.length){
          return false;

      }
  }

  captureSegment(state, captureStart, captureEnd, false);

  if (state.result.startPosition!=-1) {
    state_result.rawValue = state.input.substring(state_result.startPosition, state_result.endPosition);
    return true;
  }

  state.kind = _kind;
  state.result = _result;
  return false;
}

function readSingleQuotedScalar(state:State, nodeIndent) {
  var ch,
      captureStart, captureEnd;

  ch = state.input.charCodeAt(state.position);

  if (0x27/* ' */ !== ch) {
    return false;
  }
  var scalar=ast.newScalar();
  scalar.singleQuoted=true;
  state.kind = 'scalar';
  state.result = scalar;
    scalar.startPosition=state.position;

    state.position++;
  captureStart = captureEnd = state.position;

  while (0 !== (ch = state.input.charCodeAt(state.position))) {
      //console.log('ch: <' + String.fromCharCode(ch) + '>');
      if (0x27/* ' */ === ch) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);

      //console.log('next: <' + String.fromCharCode(ch) + '>');
          scalar.endPosition=state.position;
          if (0x27/* ' */ === ch) {
          captureStart = captureEnd = state.position;
          state.position++;
      } else {
        return true;
      }

    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, scalar,skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;

    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, 'unexpected end of the document within a single quoted scalar');

    } else {
      state.position++;
      captureEnd = state.position;
      scalar.endPosition=state.position;
    }
  }

  throwError(state, 'unexpected end of the stream within a single quoted scalar');
}

function readDoubleQuotedScalar(state:State, nodeIndent:number) {
  var captureStart,
      captureEnd,
      hexLength,
      hexResult,
      tmp, tmpEsc,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (0x22/* " */ !== ch) {
    return false;
  }

  state.kind = 'scalar';
  var scalar=ast.newScalar();
  scalar.doubleQuoted=true;
  state.result = scalar;
    scalar.startPosition=state.position;
    state.position++;
    captureStart = captureEnd = state.position;
  while (0 !== (ch = state.input.charCodeAt(state.position))) {
    if (0x22/* " */ === ch) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
        scalar.endPosition=state.position;
        scalar.rawValue = state.input.substring(scalar.startPosition, scalar.endPosition);
        return true;

    } else if (0x5C/* \ */ === ch) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);

      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);

        // TODO: rework to inline fn with no type cast?
      } else if (ch < 256 && (state.allowAnyEscape ? customEscapeCheck[ch] : simpleEscapeCheck[ch])) {
        scalar.value += (state.allowAnyEscape ? customEscapeMap[ch] : simpleEscapeMap[ch]);
        state.position++;

      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;

        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);

          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;

          } else {
            throwError(state, 'expected hexadecimal character');
          }
        }

        scalar.value += charFromCodepoint(hexResult);

        state.position++;

      } else {
        throwError(state, 'unknown escape sequence');
      }

      captureStart = captureEnd = state.position;

    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, scalar,skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;

    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, 'unexpected end of the document within a double quoted scalar');

    } else {
      state.position++;
      captureEnd = state.position;
    }
  }

  throwError(state, 'unexpected end of the stream within a double quoted scalar');
}

function readFlowCollection(state:State, nodeIndent) {
  var readNext = true,
      _line,
      _tag     = state.tag,
      _result:ast.YAMLNode,
      _anchor  = state.anchor,
      following,
      terminator,
      isPair,
      isExplicitPair,
      isMapping,
      keyNode,
      keyTag,
      valueNode,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x5B/* [ */) {
    terminator = 0x5D;/* ] */
    isMapping = false;
    _result = ast.newItems();
    _result.startPosition=state.position
  } else if (ch === 0x7B/* { */) {
    terminator = 0x7D;/* } */
    isMapping = true;
    _result = ast.newMap();
    _result.startPosition=state.position
  } else {
    return false;
  }

  if (null !== state.anchor) {
    _result.anchorId=state.anchor;
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(++state.position);

  while (0 !== ch) {
    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? 'mapping' : 'sequence';
      state.result = _result;
      _result.endPosition=state.position
      return true;
    } else if (!readNext) {
       var p=state.position
      throwError(state, 'missed comma between flow collection entries');
        state.position=p+1;
    }

    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;

    if (0x3F/* ? */ === ch) {
      following = state.input.charCodeAt(state.position + 1);

      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }

    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if ((isExplicitPair || state.line === _line) && 0x3A/* : */ === ch) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }

    if (isMapping) {
      storeMappingPair(state, (<ast.YamlMap>_result), keyTag, keyNode, valueNode);
    } else if (isPair) {
        var mp=storeMappingPair(state, null, keyTag, keyNode, valueNode);
        mp.parent=_result;
        (<ast.YAMLSequence>_result).items.push(mp);
    } else {
        if(keyNode) {
            keyNode.parent = _result;
        }
        (<ast.YAMLSequence>_result).items.push(keyNode);
    }
    _result.endPosition=state.position+1/*need to add one more char*/;
    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if (0x2C/* , */ === ch) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }

  throwError(state, 'unexpected end of the stream within a flow collection');
}

function readBlockScalar(state:State, nodeIndent) {
  var captureStart,
      folding,
      chomping       = CHOMPING_CLIP,
      detectedIndent = false,
      textIndent     = nodeIndent,
      emptyLines     = 0,
      atMoreIndented = false,
      tmp,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x7C/* | */) {
    folding = false;
  } else if (ch === 0x3E/* > */) {
    folding = true;
  } else {
    return false;
  }
  var sc=ast.newScalar();
  state.kind = 'scalar';
  state.result = sc;
  sc.startPosition=state.position
  while (0 !== ch) {
    ch = state.input.charCodeAt(++state.position);

    if (0x2B/* + */ === ch || 0x2D/* - */ === ch) {
      if (CHOMPING_CLIP === chomping) {
        chomping = (0x2B/* + */ === ch) ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, 'repeat of a chomping mode identifier');
      }

    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, 'bad explicit indentation width of a block scalar; it cannot be less than one');
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, 'repeat of an indentation width identifier');
      }

    } else {
      break;
    }
  }

  if (is_WHITE_SPACE(ch)) {
    do { ch = state.input.charCodeAt(++state.position); }
    while (is_WHITE_SPACE(ch));

    if (0x23/* # */ === ch) {
      do { ch = state.input.charCodeAt(++state.position); }
      while (!is_EOL(ch) && (0 !== ch));
    }
  }

  while (0 !== ch) {
    readLineBreak(state);
    state.lineIndent = 0;

    ch = state.input.charCodeAt(state.position);

    while ((!detectedIndent || state.lineIndent < textIndent) &&
           (0x20/* Space */ === ch)) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }

    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }

    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }

    // End of the scalar.
    if (state.lineIndent < textIndent) {

      // Perform the chomping.
      if (chomping === CHOMPING_KEEP) {
        sc.value+= common.repeat('\n', emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (detectedIndent) { // i.e. only if the scalar is not empty.
          sc.value += '\n';
        }
      }

      // Break this `while` cycle and go to the funciton's epilogue.
      break;
    }

    // Folded style: use fancy rules to handle line breaks.
    if (folding) {

      // Lines starting with white space characters (more-indented lines) are not folded.
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        sc.value += common.repeat('\n', emptyLines + 1);

      // End of more-indented block.
      } else if (atMoreIndented) {
        atMoreIndented = false;
        sc.value += common.repeat('\n', emptyLines + 1);

      // Just one line break - perceive as the same line.
      } else if (0 === emptyLines) {
        if (detectedIndent) { // i.e. only if we have already read some scalar content.
          sc.value += ' ';
        }

      // Several line breaks - perceive as different lines.
      } else {
        sc.value += common.repeat('\n', emptyLines);
      }

    // Literal style: just add exact number of line breaks between content lines.
    } else if (detectedIndent) {
      // If current line isn't the first one - count line break from the last content line.
      sc.value += common.repeat('\n', emptyLines + 1);
    } else {
      // In case of the first content line - count only empty lines.
    }

    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;

    while (!is_EOL(ch) && (0 !== ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    captureSegment(state, captureStart, state.position, false);
  }
  sc.endPosition=state.position;
  var i=state.position-1;
  var needMinus=false;
  while (true){
      var c=state.input[i];
      if (c=='\r'||c=='\n'){
          if (needMinus) {
              i--;
          }
          break;
      }
      if (c!=' '&&c!='\t'){
          break;
      }
      i--;
      //needMinus=true;

  }
  sc.endPosition=i;
  sc.rawValue = state.input.substring(sc.startPosition, sc.endPosition);
  return true;
}

function readBlockSequence(state:State, nodeIndent) {
  var _line,
      _tag      = state.tag,
      _anchor   = state.anchor,
      _result   = ast.newItems(),
      following,
      detected  = false,
      ch;

  if (null !== state.anchor) {
      _result.anchorId=state.anchor;
    state.anchorMap[state.anchor] = _result;
  }
  _result.startPosition=state.position;
  ch = state.input.charCodeAt(state.position);

  while (0 !== ch) {

    if (0x2D/* - */ !== ch) {
      break;
    }

    following = state.input.charCodeAt(state.position + 1);

    if (!is_WS_OR_EOL(following)) {
      break;
    }

    detected = true;
    state.position++;

    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.items.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }

    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    if(state.result) {
      state.result.parent = _result;
      _result.items.push(state.result);
    }
    skipSeparationSpace(state, true, -1);

    ch = state.input.charCodeAt(state.position);

    if ((state.line === _line || state.lineIndent > nodeIndent) && (0 !== ch)) {
      throwError(state, 'bad indentation of a sequence entry');
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  _result.endPosition=state.position
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = 'sequence';
    state.result = _result;
    _result.endPosition=state.position;
    return true;
  }
  return false;
}

function readBlockMapping(state:State, nodeIndent, flowIndent) {
  var following,
      allowCompact,
      _line,
      _tag          = state.tag,
      _anchor       = state.anchor,
      _result       = ast.newMap(),
      keyTag        = null,
      keyNode       = null,
      valueNode     = null,
      atExplicitKey = false,
      detected      = false,
      ch;
    _result.startPosition=state.position
  if (null !== state.anchor) {
      _result.anchorId=state.anchor;
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(state.position);

  while (0 !== ch) {
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line; // Save the current line.

    //
    // Explicit notation case. There are two separate blocks:
    // first for the key (denoted by "?") and second for the value (denoted by ":")
    //
    if ((0x3F/* ? */ === ch || 0x3A/* : */  === ch) && is_WS_OR_EOL(following)) {

      if (0x3F/* ? */ === ch) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, keyTag, keyNode, null);
          keyTag = keyNode = valueNode = null;
        }

        detected = true;
        atExplicitKey = true;
        allowCompact = true;

      } else if (atExplicitKey) {
        // i.e. 0x3A/* : */ === character after the explicit key.
        atExplicitKey = false;
        allowCompact = true;

      } else {
        throwError(state, 'incomplete explicit mapping pair; a key node is missed');
      }

      state.position += 1;
      ch = following;

    //
    // Implicit notation case. Flow-style node as the key first, then ":", and the value.
    //
    } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {

      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);

        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }

        if (0x3A/* : */ === ch) {
          ch = state.input.charCodeAt(++state.position);

          if (!is_WS_OR_EOL(ch)) {
            throwError(state, 'a whitespace character is expected after the key-value separator within a block mapping');
          }

          if (atExplicitKey) {
            storeMappingPair(state, _result, keyTag, keyNode, null);
            keyTag = keyNode = valueNode = null;
          }

          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;

        } else if (state.position == state.lineStart && testDocumentSeparator(state)) {
          break; // Reading is done. Go to the epilogue.
        } else if (detected) {
          throwError(state, 'can not read an implicit mapping pair; a colon is missed');

        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true; // Keep the result of `composeNode`.
        }

      } else if (detected) {
        throwError(state, 'can not read a block mapping entry; a multiline key may not be an implicit key');
        while (state.position>0){
            ch = state.input.charCodeAt(--state.position);
            if (is_EOL(ch)){
                state.position++;
                break;
            }
        }
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true; // Keep the result of `composeNode`.
      }

    } else {
      break; // Reading is done. Go to the epilogue.
    }

    //
    // Common reading code for both explicit and implicit notations.
    //
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }

      if (!atExplicitKey) {
        storeMappingPair(state, _result, keyTag, keyNode, valueNode);
        keyTag = keyNode = valueNode = null;
      }

      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }

    if (state.lineIndent > nodeIndent && (0 !== ch)) {
      throwError(state, 'bad indentation of a mapping entry');
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }

  //
  // Epilogue.
  //

  // Special case: last mapping's node contains only the key in explicit notation.
  if (atExplicitKey) {
    storeMappingPair(state, _result, keyTag, keyNode, null);
  }

  // Expose the resulting mapping.
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = 'mapping';
    state.result = _result;
  }

  return detected;
}

function readTagProperty(state:State) {
  var _position,
      isVerbatim = false,
      isNamed    = false,
      tagHandle,
      tagName,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (0x21/* ! */ !== ch) {
    return false;
  }

  if (null !== state.tag) {
    throwError(state, 'duplication of a tag property');
  }

  ch = state.input.charCodeAt(++state.position);

  if (0x3C/* < */ === ch) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);

  } else if (0x21/* ! */ === ch) {
    isNamed = true;
    tagHandle = '!!';
    ch = state.input.charCodeAt(++state.position);

  } else {
    tagHandle = '!';
  }

  _position = state.position;

  if (isVerbatim) {
    do { ch = state.input.charCodeAt(++state.position); }
    while (0 !== ch && 0x3E/* > */ !== ch);

    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, 'unexpected end of the stream within a verbatim tag');
    }
  } else {
    while (0 !== ch && !is_WS_OR_EOL(ch)) {

      if (0x21/* ! */ === ch) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);

          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, 'named tag handle cannot contain such characters');
          }

          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, 'tag suffix cannot contain exclamation marks');
        }
      }

      ch = state.input.charCodeAt(++state.position);
    }

    tagName = state.input.slice(_position, state.position);

    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, 'tag suffix cannot contain flow indicator characters');
    }
  }

  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, 'tag name cannot contain such characters: ' + tagName);
  }

  if (isVerbatim) {
    state.tag = tagName;

  } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;

  } else if ('!' === tagHandle) {
    state.tag = '!' + tagName;

  } else if ('!!' === tagHandle) {
    state.tag = 'tag:yaml.org,2002:' + tagName;

  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }

  return true;
}

function readAnchorProperty(state:State) {
  var _position,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (0x26/* & */ !== ch) {
    return false;
  }

  if (null !== state.anchor) {
    throwError(state, 'duplication of an anchor property');
  }

  ch = state.input.charCodeAt(++state.position);
  _position = state.position;

  while (0 !== ch && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  if (state.position === _position) {
    throwError(state, 'name of an anchor node must contain at least one character');
  }

  state.anchor = state.input.slice(_position, state.position);
  return true;
}

function readAlias(state:State) {
  var _position, alias,
      len = state.length,
      input = state.input,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (0x2A/* * */ !== ch) {
    return false;
  }

  ch = state.input.charCodeAt(++state.position);
  _position = state.position;

  while (0 !== ch && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  if (state.position <= _position) {
    throwError(state, 'name of an alias node must contain at least one character');
    state.position=_position+1;
  }
  alias = state.input.slice(_position, state.position);

  if (!state.anchorMap.hasOwnProperty(alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
    if (state.position<=_position){
        state.position=_position+1;
    }
  }

  state.result = ast.newAnchorRef(alias,_position,state.position,state.anchorMap[alias]);
  skipSeparationSpace(state, true, -1);
  return true;
}

function composeNode(state:State, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles,
      allowBlockScalars,
      allowBlockCollections,
      indentStatus = 1, // 1: this>parent, 0: this=parent, -1: this<parent
      atNewLine  = false,
      hasContent = false,
      typeIndex,
      typeQuantity,
      type,
      flowIndent,
      blockIndent,
      _result;

  state.tag    = null;
  state.anchor = null;
  state.kind   = null;
  state.result = null;

  allowBlockStyles = allowBlockScalars = allowBlockCollections =
    CONTEXT_BLOCK_OUT === nodeContext ||
    CONTEXT_BLOCK_IN  === nodeContext;

  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;

      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }

  let tagStart = state.position;
  let tagColumn = state.position - state.lineStart;
  if (1 === indentStatus) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;

        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }

  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }

  if (1 === indentStatus || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }

    blockIndent = state.position - state.lineStart;

    if (1 === indentStatus) {
      if (allowBlockCollections &&
          (readBlockSequence(state, blockIndent) ||
           readBlockMapping(state, blockIndent, flowIndent)) ||
          readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
            readSingleQuotedScalar(state, flowIndent) ||
            readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;

        } else if (readAlias(state)) {
          hasContent = true;

          if (null !== state.tag || null !== state.anchor) {
            throwError(state, 'alias node should not have any properties');
          }

        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;

          if (null === state.tag) {
            state.tag = '?';
          }
        }

        if (null !== state.anchor) {
          state.anchorMap[state.anchor] = state.result;
          state.result.anchorId=state.anchor
        }
      }
    } else if (0 === indentStatus) {
      // Special case: block sequences are allowed to have same indentation level as the parent.
      // http://www.yaml.org/spec/1.2/spec.html#id2799784
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }

  if (null !== state.tag && '!' !== state.tag) {
    if (state.tag=="!include"){
        if (!state.result){
            state.result=ast.newScalar();
            state.result.startPosition=state.position;
            state.result.endPosition=state.position;
            throwError(state,"!include without value");
        }
        state.result.kind=ast.Kind.INCLUDE_REF
    }
    else if ('?' === state.tag) {
      for (typeIndex = 0, typeQuantity = state.implicitTypes.length;
           typeIndex < typeQuantity;
           typeIndex += 1) {
        type = state.implicitTypes[typeIndex];

        // Implicit resolving is not allowed for non-scalar types, and '?'
        // non-specific tag is only assigned to plain scalars. So, it isn't
        // needed to check for 'kind' conformity.
        var vl=state.result['value'];
        if (type.resolve(vl)) { // `state.result` updated in resolver if matched
          state.result.valueObject = type.construct(state.result['value']);
          state.tag = type.tag;
          if (null !== state.anchor) {
            state.result.anchorId=state.anchor
            state.anchorMap[state.anchor] = state.result;
          }
          break;
        }
      }
    } else if (_hasOwnProperty.call(state.typeMap, state.tag)) {
      type = state.typeMap[state.tag];

      if (null !== state.result && type.kind !== state.kind) {
        throwError(state, 'unacceptable node kind for !<' + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
      }

      if (!type.resolve(state.result)) { // `state.result` updated in resolver if matched
        throwError(state, 'cannot resolve a node with !<' + state.tag + '> explicit tag');
      } else {
        state.result = type.construct(state.result);
        if (null !== state.anchor) {
          state.result.anchorId=state.anchor
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else {
      throwErrorFromPosition(state,tagStart,'unknown tag <' + state.tag + '>',false,true);
    }
  }

  return null !== state.tag || null !== state.anchor || hasContent;
}

function readDocument(state:State) {
  var documentStart = state.position,
      _position,
      directiveName,
      directiveArgs,
      hasDirectives = false,
      ch;

  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = {};
  state.anchorMap = {};

  while (0 !== (ch = state.input.charCodeAt(state.position))) {
    skipSeparationSpace(state, true, -1);

    ch = state.input.charCodeAt(state.position);

    if (state.lineIndent > 0 || 0x25/* % */ !== ch) {
      break;
    }

    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;

    while (0 !== ch && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];

    if (directiveName.length < 1) {
      throwError(state, 'directive name must not be less than one character in length');
    }

    while (0 !== ch) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      if (0x23/* # */ === ch) {
        do { ch = state.input.charCodeAt(++state.position); }
        while (0 !== ch && !is_EOL(ch));
        break;
      }

      if (is_EOL(ch)) {
        break;
      }

      _position = state.position;

      while (0 !== ch && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      directiveArgs.push(state.input.slice(_position, state.position));
    }

    if (0 !== ch) {
      readLineBreak(state);
    }

    if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
      state.position++;
    }
  }

  skipSeparationSpace(state, true, -1);

  if (0 === state.lineIndent &&
      0x2D/* - */ === state.input.charCodeAt(state.position) &&
      0x2D/* - */ === state.input.charCodeAt(state.position + 1) &&
      0x2D/* - */ === state.input.charCodeAt(state.position + 2)) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);

  } else if (hasDirectives) {
    throwError(state, 'directives end mark is expected');
  }

  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);

  if (state.checkLineBreaks &&
      PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, 'non-ASCII line breaks are interpreted as content');
  }

  state.documents.push(<any>state.result);

  if (state.position === state.lineStart && testDocumentSeparator(state)) {

    if (0x2E/* . */ === state.input.charCodeAt(state.position)) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }

  if (state.position < (state.length - 1)) {
    throwError(state, 'end of the stream or a document separator is expected');
  } else {
    return;
  }
}


function loadDocuments(input:string, options) {
  input = String(input);
  options = options || {};

  let inputLength = input.length;
  if (inputLength !== 0) {

    // Add tailing `\n` if not exists
    if (0x0A/* LF */ !== input.charCodeAt(inputLength - 1) &&
        0x0D/* CR */ !== input.charCodeAt(inputLength - 1)) {
      input += '\n';
    }

    // Strip BOM
    if (input.charCodeAt(0) === 0xFEFF) {
      input = input.slice(1);
    }
  }

  var state = new State(input, options);

  // Use 0 as string terminator. That significantly simplifies bounds check.
  state.input += '\0';

  while (0x20/* Space */ === state.input.charCodeAt(state.position)) {
    state.lineIndent += 1;
    state.position += 1;
  }

  while (state.position < (state.length - 1)) {
    var q=state.position
    readDocument(state);
    if (state.position<=q){
        for (;state.position<state.length-1;state.position++){
            var c=state.input.charAt(state.position)
            if (c=='\n'){
                break;
            }
        }
        //skip to the new lne
    }
  }

  let documents = state.documents;
  let docsCount = documents.length;
  if(docsCount>0){
    //last document takes the file till the end
    documents[docsCount-1].endPosition = inputLength;
  }

  for(let x of documents){
    x.errors=state.errors;
    if(x.startPosition>x.endPosition){
      x.startPosition = x.endPosition;
    }
  }
  return documents;
}


export function loadAll(input: string, iterator: (document: ast.YAMLNode) => void, options: LoadOptions = {}) {
  var documents = loadDocuments(input, options), index, length;

  for (index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}


export function load(input:string, options: LoadOptions = {}): ast.YAMLNode {
  var documents = loadDocuments(input, options), index, length;

  if (0 === documents.length) {
    /*eslint-disable no-undefined*/
    return undefined;
  } else if (1 === documents.length) {
      return documents[0];
  }
    var e=new YAMLException('expected a single document in the stream, but found more');
    e.mark=new Mark("","",0,0,0);
    e.mark.position=documents[0].endPosition;
    documents[0].errors.push(e);
    //it is an artifact which is caused by the fact that we are checking next char before stopping parse


    return documents[0];
}


export function safeLoadAll(input: string, output: (document: ast.YAMLNode) => void, options: LoadOptions = {}) {
  loadAll(input, output, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}


export function safeLoad(input:string, options: LoadOptions = {}): ast.YAMLNode {
  return load(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}

export interface LoadOptions{
  filename?: string,
  schema?: any,
  onWarning?: () => any,
  legacy?: boolean,
  allowAnyEscape?: boolean,
  ignoreDuplicateKeys?: boolean
}

declare var module:any;

module.exports.loadAll     = loadAll;
module.exports.load        = load;
module.exports.safeLoadAll = safeLoadAll;
module.exports.safeLoad    = safeLoad;
