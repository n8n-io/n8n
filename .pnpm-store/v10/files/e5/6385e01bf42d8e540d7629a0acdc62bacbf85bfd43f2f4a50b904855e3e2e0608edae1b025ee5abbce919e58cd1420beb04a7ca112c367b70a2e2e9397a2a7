import { j as _inherits, k as _createSuper, c as _classCallCheck, T as Type, b as _createClass, R as Range, N as Node, g as YAMLSemanticError, l as _get, m as _getPrototypeOf, Y as YAMLSyntaxError, C as Char, e as _defineProperty, P as PlainValue } from './PlainValue-b8036b75.js';

var BlankLine = /*#__PURE__*/function (_Node) {
  _inherits(BlankLine, _Node);

  var _super = _createSuper(BlankLine);

  function BlankLine() {
    _classCallCheck(this, BlankLine);

    return _super.call(this, Type.BLANK_LINE);
  }
  /* istanbul ignore next */


  _createClass(BlankLine, [{
    key: "includesTrailingLines",
    get: function get() {
      // This is never called from anywhere, but if it were,
      // this is the value it should return.
      return true;
    }
    /**
     * Parses a blank line from the source
     *
     * @param {ParseContext} context
     * @param {number} start - Index of first \n character
     * @returns {number} - Index of the character after this
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      this.range = new Range(start, start + 1);
      return start + 1;
    }
  }]);

  return BlankLine;
}(Node);

var CollectionItem = /*#__PURE__*/function (_Node) {
  _inherits(CollectionItem, _Node);

  var _super = _createSuper(CollectionItem);

  function CollectionItem(type, props) {
    var _this;

    _classCallCheck(this, CollectionItem);

    _this = _super.call(this, type, props);
    _this.node = null;
    return _this;
  }

  _createClass(CollectionItem, [{
    key: "includesTrailingLines",
    get: function get() {
      return !!this.node && this.node.includesTrailingLines;
    }
    /**
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var parseNode = context.parseNode,
          src = context.src;
      var atLineStart = context.atLineStart,
          lineStart = context.lineStart;
      if (!atLineStart && this.type === Type.SEQ_ITEM) this.error = new YAMLSemanticError(this, 'Sequence items must not have preceding content on the same line');
      var indent = atLineStart ? start - lineStart : context.indent;
      var offset = Node.endOfWhiteSpace(src, start + 1);
      var ch = src[offset];
      var inlineComment = ch === '#';
      var comments = [];
      var blankLine = null;

      while (ch === '\n' || ch === '#') {
        if (ch === '#') {
          var _end = Node.endOfLine(src, offset + 1);

          comments.push(new Range(offset, _end));
          offset = _end;
        } else {
          atLineStart = true;
          lineStart = offset + 1;
          var wsEnd = Node.endOfWhiteSpace(src, lineStart);

          if (src[wsEnd] === '\n' && comments.length === 0) {
            blankLine = new BlankLine();
            lineStart = blankLine.parse({
              src: src
            }, lineStart);
          }

          offset = Node.endOfIndent(src, lineStart);
        }

        ch = src[offset];
      }

      if (Node.nextNodeIsIndented(ch, offset - (lineStart + indent), this.type !== Type.SEQ_ITEM)) {
        this.node = parseNode({
          atLineStart: atLineStart,
          inCollection: false,
          indent: indent,
          lineStart: lineStart,
          parent: this
        }, offset);
      } else if (ch && lineStart > start + 1) {
        offset = lineStart - 1;
      }

      if (this.node) {
        if (blankLine) {
          // Only blank lines preceding non-empty nodes are captured. Note that
          // this means that collection item range start indices do not always
          // increase monotonically. -- eemeli/yaml#126
          var items = context.parent.items || context.parent.contents;
          if (items) items.push(blankLine);
        }

        if (comments.length) Array.prototype.push.apply(this.props, comments);
        offset = this.node.range.end;
      } else {
        if (inlineComment) {
          var c = comments[0];
          this.props.push(c);
          offset = c.end;
        } else {
          offset = Node.endOfLine(src, start + 1);
        }
      }

      var end = this.node ? this.node.valueRange.end : offset;
      this.valueRange = new Range(start, end);
      return offset;
    }
  }, {
    key: "setOrigRanges",
    value: function setOrigRanges(cr, offset) {
      offset = _get(_getPrototypeOf(CollectionItem.prototype), "setOrigRanges", this).call(this, cr, offset);
      return this.node ? this.node.setOrigRanges(cr, offset) : offset;
    }
  }, {
    key: "toString",
    value: function toString() {
      var src = this.context.src,
          node = this.node,
          range = this.range,
          value = this.value;
      if (value != null) return value;
      var str = node ? src.slice(range.start, node.range.start) + String(node) : src.slice(range.start, range.end);
      return Node.addStringTerminator(src, range.end, str);
    }
  }]);

  return CollectionItem;
}(Node);

var Comment = /*#__PURE__*/function (_Node) {
  _inherits(Comment, _Node);

  var _super = _createSuper(Comment);

  function Comment() {
    _classCallCheck(this, Comment);

    return _super.call(this, Type.COMMENT);
  }
  /**
   * Parses a comment line from the source
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this scalar
   */


  _createClass(Comment, [{
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var offset = this.parseComment(start);
      this.range = new Range(start, offset);
      return offset;
    }
  }]);

  return Comment;
}(Node);

function grabCollectionEndComments(node) {
  var cnode = node;

  while (cnode instanceof CollectionItem) {
    cnode = cnode.node;
  }

  if (!(cnode instanceof Collection)) return null;
  var len = cnode.items.length;
  var ci = -1;

  for (var i = len - 1; i >= 0; --i) {
    var n = cnode.items[i];

    if (n.type === Type.COMMENT) {
      // Keep sufficiently indented comments with preceding node
      var _n$context = n.context,
          indent = _n$context.indent,
          lineStart = _n$context.lineStart;
      if (indent > 0 && n.range.start >= lineStart + indent) break;
      ci = i;
    } else if (n.type === Type.BLANK_LINE) ci = i;else break;
  }

  if (ci === -1) return null;
  var ca = cnode.items.splice(ci, len - ci);
  var prevEnd = ca[0].range.start;

  while (true) {
    cnode.range.end = prevEnd;
    if (cnode.valueRange && cnode.valueRange.end > prevEnd) cnode.valueRange.end = prevEnd;
    if (cnode === node) break;
    cnode = cnode.context.parent;
  }

  return ca;
}
var Collection = /*#__PURE__*/function (_Node) {
  _inherits(Collection, _Node);

  var _super = _createSuper(Collection);

  function Collection(firstItem) {
    var _this;

    _classCallCheck(this, Collection);

    _this = _super.call(this, firstItem.type === Type.SEQ_ITEM ? Type.SEQ : Type.MAP);

    for (var i = firstItem.props.length - 1; i >= 0; --i) {
      if (firstItem.props[i].start < firstItem.context.lineStart) {
        // props on previous line are assumed by the collection
        _this.props = firstItem.props.slice(0, i + 1);
        firstItem.props = firstItem.props.slice(i + 1);
        var itemRange = firstItem.props[0] || firstItem.valueRange;
        firstItem.range.start = itemRange.start;
        break;
      }
    }

    _this.items = [firstItem];
    var ec = grabCollectionEndComments(firstItem);
    if (ec) Array.prototype.push.apply(_this.items, ec);
    return _this;
  }

  _createClass(Collection, [{
    key: "includesTrailingLines",
    get: function get() {
      return this.items.length > 0;
    }
    /**
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var parseNode = context.parseNode,
          src = context.src; // It's easier to recalculate lineStart here rather than tracking down the
      // last context from which to read it -- eemeli/yaml#2

      var lineStart = Node.startOfLine(src, start);
      var firstItem = this.items[0]; // First-item context needs to be correct for later comment handling
      // -- eemeli/yaml#17

      firstItem.context.parent = this;
      this.valueRange = Range.copy(firstItem.valueRange);
      var indent = firstItem.range.start - firstItem.context.lineStart;
      var offset = start;
      offset = Node.normalizeOffset(src, offset);
      var ch = src[offset];
      var atLineStart = Node.endOfWhiteSpace(src, lineStart) === offset;
      var prevIncludesTrailingLines = false;

      while (ch) {
        while (ch === '\n' || ch === '#') {
          if (atLineStart && ch === '\n' && !prevIncludesTrailingLines) {
            var blankLine = new BlankLine();
            offset = blankLine.parse({
              src: src
            }, offset);
            this.valueRange.end = offset;

            if (offset >= src.length) {
              ch = null;
              break;
            }

            this.items.push(blankLine);
            offset -= 1; // blankLine.parse() consumes terminal newline
          } else if (ch === '#') {
            if (offset < lineStart + indent && !Collection.nextContentHasIndent(src, offset, indent)) {
              return offset;
            }

            var comment = new Comment();
            offset = comment.parse({
              indent: indent,
              lineStart: lineStart,
              src: src
            }, offset);
            this.items.push(comment);
            this.valueRange.end = offset;

            if (offset >= src.length) {
              ch = null;
              break;
            }
          }

          lineStart = offset + 1;
          offset = Node.endOfIndent(src, lineStart);

          if (Node.atBlank(src, offset)) {
            var wsEnd = Node.endOfWhiteSpace(src, offset);
            var next = src[wsEnd];

            if (!next || next === '\n' || next === '#') {
              offset = wsEnd;
            }
          }

          ch = src[offset];
          atLineStart = true;
        }

        if (!ch) {
          break;
        }

        if (offset !== lineStart + indent && (atLineStart || ch !== ':')) {
          if (offset < lineStart + indent) {
            if (lineStart > start) offset = lineStart;
            break;
          } else if (!this.error) {
            var msg = 'All collection items must start at the same column';
            this.error = new YAMLSyntaxError(this, msg);
          }
        }

        if (firstItem.type === Type.SEQ_ITEM) {
          if (ch !== '-') {
            if (lineStart > start) offset = lineStart;
            break;
          }
        } else if (ch === '-' && !this.error) {
          // map key may start with -, as long as it's followed by a non-whitespace char
          var _next = src[offset + 1];

          if (!_next || _next === '\n' || _next === '\t' || _next === ' ') {
            var _msg = 'A collection cannot be both a mapping and a sequence';
            this.error = new YAMLSyntaxError(this, _msg);
          }
        }

        var node = parseNode({
          atLineStart: atLineStart,
          inCollection: true,
          indent: indent,
          lineStart: lineStart,
          parent: this
        }, offset);
        if (!node) return offset; // at next document start

        this.items.push(node);
        this.valueRange.end = node.valueRange.end;
        offset = Node.normalizeOffset(src, node.range.end);
        ch = src[offset];
        atLineStart = false;
        prevIncludesTrailingLines = node.includesTrailingLines; // Need to reset lineStart and atLineStart here if preceding node's range
        // has advanced to check the current line's indentation level
        // -- eemeli/yaml#10 & eemeli/yaml#38

        if (ch) {
          var ls = offset - 1;
          var prev = src[ls];

          while (prev === ' ' || prev === '\t') {
            prev = src[--ls];
          }

          if (prev === '\n') {
            lineStart = ls + 1;
            atLineStart = true;
          }
        }

        var ec = grabCollectionEndComments(node);
        if (ec) Array.prototype.push.apply(this.items, ec);
      }

      return offset;
    }
  }, {
    key: "setOrigRanges",
    value: function setOrigRanges(cr, offset) {
      offset = _get(_getPrototypeOf(Collection.prototype), "setOrigRanges", this).call(this, cr, offset);
      this.items.forEach(function (node) {
        offset = node.setOrigRanges(cr, offset);
      });
      return offset;
    }
  }, {
    key: "toString",
    value: function toString() {
      var src = this.context.src,
          items = this.items,
          range = this.range,
          value = this.value;
      if (value != null) return value;
      var str = src.slice(range.start, items[0].range.start) + String(items[0]);

      for (var i = 1; i < items.length; ++i) {
        var item = items[i];
        var _item$context = item.context,
            atLineStart = _item$context.atLineStart,
            indent = _item$context.indent;
        if (atLineStart) for (var _i = 0; _i < indent; ++_i) {
          str += ' ';
        }
        str += String(item);
      }

      return Node.addStringTerminator(src, range.end, str);
    }
  }], [{
    key: "nextContentHasIndent",
    value: function nextContentHasIndent(src, offset, indent) {
      var lineStart = Node.endOfLine(src, offset) + 1;
      offset = Node.endOfWhiteSpace(src, lineStart);
      var ch = src[offset];
      if (!ch) return false;
      if (offset >= lineStart + indent) return true;
      if (ch !== '#' && ch !== '\n') return false;
      return Collection.nextContentHasIndent(src, offset, indent);
    }
  }]);

  return Collection;
}(Node);

var Directive = /*#__PURE__*/function (_Node) {
  _inherits(Directive, _Node);

  var _super = _createSuper(Directive);

  function Directive() {
    var _this;

    _classCallCheck(this, Directive);

    _this = _super.call(this, Type.DIRECTIVE);
    _this.name = null;
    return _this;
  }

  _createClass(Directive, [{
    key: "parameters",
    get: function get() {
      var raw = this.rawValue;
      return raw ? raw.trim().split(/[ \t]+/) : [];
    }
  }, {
    key: "parseName",
    value: function parseName(start) {
      var src = this.context.src;
      var offset = start;
      var ch = src[offset];

      while (ch && ch !== '\n' && ch !== '\t' && ch !== ' ') {
        ch = src[offset += 1];
      }

      this.name = src.slice(start, offset);
      return offset;
    }
  }, {
    key: "parseParameters",
    value: function parseParameters(start) {
      var src = this.context.src;
      var offset = start;
      var ch = src[offset];

      while (ch && ch !== '\n' && ch !== '#') {
        ch = src[offset += 1];
      }

      this.valueRange = new Range(start, offset);
      return offset;
    }
  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var offset = this.parseName(start + 1);
      offset = this.parseParameters(offset);
      offset = this.parseComment(offset);
      this.range = new Range(start, offset);
      return offset;
    }
  }]);

  return Directive;
}(Node);

var Document = /*#__PURE__*/function (_Node) {
  _inherits(Document, _Node);

  var _super = _createSuper(Document);

  function Document() {
    var _this;

    _classCallCheck(this, Document);

    _this = _super.call(this, Type.DOCUMENT);
    _this.directives = null;
    _this.contents = null;
    _this.directivesEndMarker = null;
    _this.documentEndMarker = null;
    return _this;
  }

  _createClass(Document, [{
    key: "parseDirectives",
    value: function parseDirectives(start) {
      var src = this.context.src;
      this.directives = [];
      var atLineStart = true;
      var hasDirectives = false;
      var offset = start;

      while (!Node.atDocumentBoundary(src, offset, Char.DIRECTIVES_END)) {
        offset = Document.startCommentOrEndBlankLine(src, offset);

        switch (src[offset]) {
          case '\n':
            if (atLineStart) {
              var blankLine = new BlankLine();
              offset = blankLine.parse({
                src: src
              }, offset);

              if (offset < src.length) {
                this.directives.push(blankLine);
              }
            } else {
              offset += 1;
              atLineStart = true;
            }

            break;

          case '#':
            {
              var comment = new Comment();
              offset = comment.parse({
                src: src
              }, offset);
              this.directives.push(comment);
              atLineStart = false;
            }
            break;

          case '%':
            {
              var directive = new Directive();
              offset = directive.parse({
                parent: this,
                src: src
              }, offset);
              this.directives.push(directive);
              hasDirectives = true;
              atLineStart = false;
            }
            break;

          default:
            if (hasDirectives) {
              this.error = new YAMLSemanticError(this, 'Missing directives-end indicator line');
            } else if (this.directives.length > 0) {
              this.contents = this.directives;
              this.directives = [];
            }

            return offset;
        }
      }

      if (src[offset]) {
        this.directivesEndMarker = new Range(offset, offset + 3);
        return offset + 3;
      }

      if (hasDirectives) {
        this.error = new YAMLSemanticError(this, 'Missing directives-end indicator line');
      } else if (this.directives.length > 0) {
        this.contents = this.directives;
        this.directives = [];
      }

      return offset;
    }
  }, {
    key: "parseContents",
    value: function parseContents(start) {
      var _this$context = this.context,
          parseNode = _this$context.parseNode,
          src = _this$context.src;
      if (!this.contents) this.contents = [];
      var lineStart = start;

      while (src[lineStart - 1] === '-') {
        lineStart -= 1;
      }

      var offset = Node.endOfWhiteSpace(src, start);
      var atLineStart = lineStart === start;
      this.valueRange = new Range(offset);

      while (!Node.atDocumentBoundary(src, offset, Char.DOCUMENT_END)) {
        switch (src[offset]) {
          case '\n':
            if (atLineStart) {
              var blankLine = new BlankLine();
              offset = blankLine.parse({
                src: src
              }, offset);

              if (offset < src.length) {
                this.contents.push(blankLine);
              }
            } else {
              offset += 1;
              atLineStart = true;
            }

            lineStart = offset;
            break;

          case '#':
            {
              var comment = new Comment();
              offset = comment.parse({
                src: src
              }, offset);
              this.contents.push(comment);
              atLineStart = false;
            }
            break;

          default:
            {
              var iEnd = Node.endOfIndent(src, offset);
              var context = {
                atLineStart: atLineStart,
                indent: -1,
                inFlow: false,
                inCollection: false,
                lineStart: lineStart,
                parent: this
              };
              var node = parseNode(context, iEnd);
              if (!node) return this.valueRange.end = iEnd; // at next document start

              this.contents.push(node);
              offset = node.range.end;
              atLineStart = false;
              var ec = grabCollectionEndComments(node);
              if (ec) Array.prototype.push.apply(this.contents, ec);
            }
        }

        offset = Document.startCommentOrEndBlankLine(src, offset);
      }

      this.valueRange.end = offset;

      if (src[offset]) {
        this.documentEndMarker = new Range(offset, offset + 3);
        offset += 3;

        if (src[offset]) {
          offset = Node.endOfWhiteSpace(src, offset);

          if (src[offset] === '#') {
            var _comment = new Comment();

            offset = _comment.parse({
              src: src
            }, offset);
            this.contents.push(_comment);
          }

          switch (src[offset]) {
            case '\n':
              offset += 1;
              break;

            case undefined:
              break;

            default:
              this.error = new YAMLSyntaxError(this, 'Document end marker line cannot have a non-comment suffix');
          }
        }
      }

      return offset;
    }
    /**
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      context.root = this;
      this.context = context;
      var src = context.src;
      var offset = src.charCodeAt(start) === 0xfeff ? start + 1 : start; // skip BOM

      offset = this.parseDirectives(offset);
      offset = this.parseContents(offset);
      return offset;
    }
  }, {
    key: "setOrigRanges",
    value: function setOrigRanges(cr, offset) {
      offset = _get(_getPrototypeOf(Document.prototype), "setOrigRanges", this).call(this, cr, offset);
      this.directives.forEach(function (node) {
        offset = node.setOrigRanges(cr, offset);
      });
      if (this.directivesEndMarker) offset = this.directivesEndMarker.setOrigRange(cr, offset);
      this.contents.forEach(function (node) {
        offset = node.setOrigRanges(cr, offset);
      });
      if (this.documentEndMarker) offset = this.documentEndMarker.setOrigRange(cr, offset);
      return offset;
    }
  }, {
    key: "toString",
    value: function toString() {
      var contents = this.contents,
          directives = this.directives,
          value = this.value;
      if (value != null) return value;
      var str = directives.join('');

      if (contents.length > 0) {
        if (directives.length > 0 || contents[0].type === Type.COMMENT) str += '---\n';
        str += contents.join('');
      }

      if (str[str.length - 1] !== '\n') str += '\n';
      return str;
    }
  }], [{
    key: "startCommentOrEndBlankLine",
    value: function startCommentOrEndBlankLine(src, start) {
      var offset = Node.endOfWhiteSpace(src, start);
      var ch = src[offset];
      return ch === '#' || ch === '\n' ? offset : start;
    }
  }]);

  return Document;
}(Node);

var Alias = /*#__PURE__*/function (_Node) {
  _inherits(Alias, _Node);

  var _super = _createSuper(Alias);

  function Alias() {
    _classCallCheck(this, Alias);

    return _super.apply(this, arguments);
  }

  _createClass(Alias, [{
    key: "parse",
    value:
    /**
     * Parses an *alias from the source
     *
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this scalar
     */
    function parse(context, start) {
      this.context = context;
      var src = context.src;
      var offset = Node.endOfIdentifier(src, start + 1);
      this.valueRange = new Range(start + 1, offset);
      offset = Node.endOfWhiteSpace(src, offset);
      offset = this.parseComment(offset);
      return offset;
    }
  }]);

  return Alias;
}(Node);

var Chomp = {
  CLIP: 'CLIP',
  KEEP: 'KEEP',
  STRIP: 'STRIP'
};
var BlockValue = /*#__PURE__*/function (_Node) {
  _inherits(BlockValue, _Node);

  var _super = _createSuper(BlockValue);

  function BlockValue(type, props) {
    var _this;

    _classCallCheck(this, BlockValue);

    _this = _super.call(this, type, props);
    _this.blockIndent = null;
    _this.chomping = Chomp.CLIP;
    _this.header = null;
    return _this;
  }

  _createClass(BlockValue, [{
    key: "includesTrailingLines",
    get: function get() {
      return this.chomping === Chomp.KEEP;
    }
  }, {
    key: "strValue",
    get: function get() {
      if (!this.valueRange || !this.context) return null;
      var _this$valueRange = this.valueRange,
          start = _this$valueRange.start,
          end = _this$valueRange.end;
      var _this$context = this.context,
          indent = _this$context.indent,
          src = _this$context.src;
      if (this.valueRange.isEmpty()) return '';
      var lastNewLine = null;
      var ch = src[end - 1];

      while (ch === '\n' || ch === '\t' || ch === ' ') {
        end -= 1;

        if (end <= start) {
          if (this.chomping === Chomp.KEEP) break;else return ''; // probably never happens
        }

        if (ch === '\n') lastNewLine = end;
        ch = src[end - 1];
      }

      var keepStart = end + 1;

      if (lastNewLine) {
        if (this.chomping === Chomp.KEEP) {
          keepStart = lastNewLine;
          end = this.valueRange.end;
        } else {
          end = lastNewLine;
        }
      }

      var bi = indent + this.blockIndent;
      var folded = this.type === Type.BLOCK_FOLDED;
      var atStart = true;
      var str = '';
      var sep = '';
      var prevMoreIndented = false;

      for (var i = start; i < end; ++i) {
        for (var j = 0; j < bi; ++j) {
          if (src[i] !== ' ') break;
          i += 1;
        }

        var _ch = src[i];

        if (_ch === '\n') {
          if (sep === '\n') str += '\n';else sep = '\n';
        } else {
          var lineEnd = Node.endOfLine(src, i);
          var line = src.slice(i, lineEnd);
          i = lineEnd;

          if (folded && (_ch === ' ' || _ch === '\t') && i < keepStart) {
            if (sep === ' ') sep = '\n';else if (!prevMoreIndented && !atStart && sep === '\n') sep = '\n\n';
            str += sep + line; //+ ((lineEnd < end && src[lineEnd]) || '')

            sep = lineEnd < end && src[lineEnd] || '';
            prevMoreIndented = true;
          } else {
            str += sep + line;
            sep = folded && i < keepStart ? ' ' : '\n';
            prevMoreIndented = false;
          }

          if (atStart && line !== '') atStart = false;
        }
      }

      return this.chomping === Chomp.STRIP ? str : str + '\n';
    }
  }, {
    key: "parseBlockHeader",
    value: function parseBlockHeader(start) {
      var src = this.context.src;
      var offset = start + 1;
      var bi = '';

      while (true) {
        var ch = src[offset];

        switch (ch) {
          case '-':
            this.chomping = Chomp.STRIP;
            break;

          case '+':
            this.chomping = Chomp.KEEP;
            break;

          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            bi += ch;
            break;

          default:
            this.blockIndent = Number(bi) || null;
            this.header = new Range(start, offset);
            return offset;
        }

        offset += 1;
      }
    }
  }, {
    key: "parseBlockValue",
    value: function parseBlockValue(start) {
      var _this$context2 = this.context,
          indent = _this$context2.indent,
          src = _this$context2.src;
      var explicit = !!this.blockIndent;
      var offset = start;
      var valueEnd = start;
      var minBlockIndent = 1;

      for (var ch = src[offset]; ch === '\n'; ch = src[offset]) {
        offset += 1;
        if (Node.atDocumentBoundary(src, offset)) break;
        var end = Node.endOfBlockIndent(src, indent, offset); // should not include tab?

        if (end === null) break;
        var _ch2 = src[end];
        var lineIndent = end - (offset + indent);

        if (!this.blockIndent) {
          // no explicit block indent, none yet detected
          if (src[end] !== '\n') {
            // first line with non-whitespace content
            if (lineIndent < minBlockIndent) {
              var msg = 'Block scalars with more-indented leading empty lines must use an explicit indentation indicator';
              this.error = new YAMLSemanticError(this, msg);
            }

            this.blockIndent = lineIndent;
          } else if (lineIndent > minBlockIndent) {
            // empty line with more whitespace
            minBlockIndent = lineIndent;
          }
        } else if (_ch2 && _ch2 !== '\n' && lineIndent < this.blockIndent) {
          if (src[end] === '#') break;

          if (!this.error) {
            var _src = explicit ? 'explicit indentation indicator' : 'first line';

            var _msg = "Block scalars must not be less indented than their ".concat(_src);

            this.error = new YAMLSemanticError(this, _msg);
          }
        }

        if (src[end] === '\n') {
          offset = end;
        } else {
          offset = valueEnd = Node.endOfLine(src, end);
        }
      }

      if (this.chomping !== Chomp.KEEP) {
        offset = src[valueEnd] ? valueEnd + 1 : valueEnd;
      }

      this.valueRange = new Range(start + 1, offset);
      return offset;
    }
    /**
     * Parses a block value from the source
     *
     * Accepted forms are:
     * ```
     * BS
     * block
     * lines
     *
     * BS #comment
     * block
     * lines
     * ```
     * where the block style BS matches the regexp `[|>][-+1-9]*` and block lines
     * are empty or have an indent level greater than `indent`.
     *
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this block
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var src = context.src;
      var offset = this.parseBlockHeader(start);
      offset = Node.endOfWhiteSpace(src, offset);
      offset = this.parseComment(offset);
      offset = this.parseBlockValue(offset);
      return offset;
    }
  }, {
    key: "setOrigRanges",
    value: function setOrigRanges(cr, offset) {
      offset = _get(_getPrototypeOf(BlockValue.prototype), "setOrigRanges", this).call(this, cr, offset);
      return this.header ? this.header.setOrigRange(cr, offset) : offset;
    }
  }]);

  return BlockValue;
}(Node);

var FlowCollection = /*#__PURE__*/function (_Node) {
  _inherits(FlowCollection, _Node);

  var _super = _createSuper(FlowCollection);

  function FlowCollection(type, props) {
    var _this;

    _classCallCheck(this, FlowCollection);

    _this = _super.call(this, type, props);
    _this.items = null;
    return _this;
  }

  _createClass(FlowCollection, [{
    key: "prevNodeIsJsonLike",
    value: function prevNodeIsJsonLike() {
      var idx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.items.length;
      var node = this.items[idx - 1];
      return !!node && (node.jsonLike || node.type === Type.COMMENT && this.prevNodeIsJsonLike(idx - 1));
    }
    /**
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var parseNode = context.parseNode,
          src = context.src;
      var indent = context.indent,
          lineStart = context.lineStart;
      var char = src[start]; // { or [

      this.items = [{
        char: char,
        offset: start
      }];
      var offset = Node.endOfWhiteSpace(src, start + 1);
      char = src[offset];

      while (char && char !== ']' && char !== '}') {
        switch (char) {
          case '\n':
            {
              lineStart = offset + 1;
              var wsEnd = Node.endOfWhiteSpace(src, lineStart);

              if (src[wsEnd] === '\n') {
                var blankLine = new BlankLine();
                lineStart = blankLine.parse({
                  src: src
                }, lineStart);
                this.items.push(blankLine);
              }

              offset = Node.endOfIndent(src, lineStart);

              if (offset <= lineStart + indent) {
                char = src[offset];

                if (offset < lineStart + indent || char !== ']' && char !== '}') {
                  var msg = 'Insufficient indentation in flow collection';
                  this.error = new YAMLSemanticError(this, msg);
                }
              }
            }
            break;

          case ',':
            {
              this.items.push({
                char: char,
                offset: offset
              });
              offset += 1;
            }
            break;

          case '#':
            {
              var comment = new Comment();
              offset = comment.parse({
                src: src
              }, offset);
              this.items.push(comment);
            }
            break;

          case '?':
          case ':':
            {
              var next = src[offset + 1];

              if (next === '\n' || next === '\t' || next === ' ' || next === ',' || // in-flow : after JSON-like key does not need to be followed by whitespace
              char === ':' && this.prevNodeIsJsonLike()) {
                this.items.push({
                  char: char,
                  offset: offset
                });
                offset += 1;
                break;
              }
            }
          // fallthrough

          default:
            {
              var node = parseNode({
                atLineStart: false,
                inCollection: false,
                inFlow: true,
                indent: -1,
                lineStart: lineStart,
                parent: this
              }, offset);

              if (!node) {
                // at next document start
                this.valueRange = new Range(start, offset);
                return offset;
              }

              this.items.push(node);
              offset = Node.normalizeOffset(src, node.range.end);
            }
        }

        offset = Node.endOfWhiteSpace(src, offset);
        char = src[offset];
      }

      this.valueRange = new Range(start, offset + 1);

      if (char) {
        this.items.push({
          char: char,
          offset: offset
        });
        offset = Node.endOfWhiteSpace(src, offset + 1);
        offset = this.parseComment(offset);
      }

      return offset;
    }
  }, {
    key: "setOrigRanges",
    value: function setOrigRanges(cr, offset) {
      offset = _get(_getPrototypeOf(FlowCollection.prototype), "setOrigRanges", this).call(this, cr, offset);
      this.items.forEach(function (node) {
        if (node instanceof Node) {
          offset = node.setOrigRanges(cr, offset);
        } else if (cr.length === 0) {
          node.origOffset = node.offset;
        } else {
          var i = offset;

          while (i < cr.length) {
            if (cr[i] > node.offset) break;else ++i;
          }

          node.origOffset = node.offset + i;
          offset = i;
        }
      });
      return offset;
    }
  }, {
    key: "toString",
    value: function toString() {
      var src = this.context.src,
          items = this.items,
          range = this.range,
          value = this.value;
      if (value != null) return value;
      var nodes = items.filter(function (item) {
        return item instanceof Node;
      });
      var str = '';
      var prevEnd = range.start;
      nodes.forEach(function (node) {
        var prefix = src.slice(prevEnd, node.range.start);
        prevEnd = node.range.end;
        str += prefix + String(node);

        if (str[str.length - 1] === '\n' && src[prevEnd - 1] !== '\n' && src[prevEnd] === '\n') {
          // Comment range does not include the terminal newline, but its
          // stringified value does. Without this fix, newlines at comment ends
          // get duplicated.
          prevEnd += 1;
        }
      });
      str += src.slice(prevEnd, range.end);
      return Node.addStringTerminator(src, range.end, str);
    }
  }]);

  return FlowCollection;
}(Node);

var QuoteDouble = /*#__PURE__*/function (_Node) {
  _inherits(QuoteDouble, _Node);

  var _super = _createSuper(QuoteDouble);

  function QuoteDouble() {
    _classCallCheck(this, QuoteDouble);

    return _super.apply(this, arguments);
  }

  _createClass(QuoteDouble, [{
    key: "strValue",
    get:
    /**
     * @returns {string | { str: string, errors: YAMLSyntaxError[] }}
     */
    function get() {
      if (!this.valueRange || !this.context) return null;
      var errors = [];
      var _this$valueRange = this.valueRange,
          start = _this$valueRange.start,
          end = _this$valueRange.end;
      var _this$context = this.context,
          indent = _this$context.indent,
          src = _this$context.src;
      if (src[end - 1] !== '"') errors.push(new YAMLSyntaxError(this, 'Missing closing "quote')); // Using String#replace is too painful with escaped newlines preceded by
      // escaped backslashes; also, this should be faster.

      var str = '';

      for (var i = start + 1; i < end - 1; ++i) {
        var ch = src[i];

        if (ch === '\n') {
          if (Node.atDocumentBoundary(src, i + 1)) errors.push(new YAMLSemanticError(this, 'Document boundary indicators are not allowed within string values'));

          var _Node$foldNewline = Node.foldNewline(src, i, indent),
              fold = _Node$foldNewline.fold,
              offset = _Node$foldNewline.offset,
              error = _Node$foldNewline.error;

          str += fold;
          i = offset;
          if (error) errors.push(new YAMLSemanticError(this, 'Multi-line double-quoted string needs to be sufficiently indented'));
        } else if (ch === '\\') {
          i += 1;

          switch (src[i]) {
            case '0':
              str += '\0';
              break;
            // null character

            case 'a':
              str += '\x07';
              break;
            // bell character

            case 'b':
              str += '\b';
              break;
            // backspace

            case 'e':
              str += '\x1b';
              break;
            // escape character

            case 'f':
              str += '\f';
              break;
            // form feed

            case 'n':
              str += '\n';
              break;
            // line feed

            case 'r':
              str += '\r';
              break;
            // carriage return

            case 't':
              str += '\t';
              break;
            // horizontal tab

            case 'v':
              str += '\v';
              break;
            // vertical tab

            case 'N':
              str += "\x85";
              break;
            // Unicode next line

            case '_':
              str += "\xA0";
              break;
            // Unicode non-breaking space

            case 'L':
              str += "\u2028";
              break;
            // Unicode line separator

            case 'P':
              str += "\u2029";
              break;
            // Unicode paragraph separator

            case ' ':
              str += ' ';
              break;

            case '"':
              str += '"';
              break;

            case '/':
              str += '/';
              break;

            case '\\':
              str += '\\';
              break;

            case '\t':
              str += '\t';
              break;

            case 'x':
              str += this.parseCharCode(i + 1, 2, errors);
              i += 2;
              break;

            case 'u':
              str += this.parseCharCode(i + 1, 4, errors);
              i += 4;
              break;

            case 'U':
              str += this.parseCharCode(i + 1, 8, errors);
              i += 8;
              break;

            case '\n':
              // skip escaped newlines, but still trim the following line
              while (src[i + 1] === ' ' || src[i + 1] === '\t') {
                i += 1;
              }

              break;

            default:
              errors.push(new YAMLSyntaxError(this, "Invalid escape sequence ".concat(src.substr(i - 1, 2))));
              str += '\\' + src[i];
          }
        } else if (ch === ' ' || ch === '\t') {
          // trim trailing whitespace
          var wsStart = i;
          var next = src[i + 1];

          while (next === ' ' || next === '\t') {
            i += 1;
            next = src[i + 1];
          }

          if (next !== '\n') str += i > wsStart ? src.slice(wsStart, i + 1) : ch;
        } else {
          str += ch;
        }
      }

      return errors.length > 0 ? {
        errors: errors,
        str: str
      } : str;
    }
  }, {
    key: "parseCharCode",
    value: function parseCharCode(offset, length, errors) {
      var src = this.context.src;
      var cc = src.substr(offset, length);
      var ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      var code = ok ? parseInt(cc, 16) : NaN;

      if (isNaN(code)) {
        errors.push(new YAMLSyntaxError(this, "Invalid escape sequence ".concat(src.substr(offset - 2, length + 2))));
        return src.substr(offset - 2, length + 2);
      }

      return String.fromCodePoint(code);
    }
    /**
     * Parses a "double quoted" value from the source
     *
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this scalar
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var src = context.src;
      var offset = QuoteDouble.endOfQuote(src, start + 1);
      this.valueRange = new Range(start, offset);
      offset = Node.endOfWhiteSpace(src, offset);
      offset = this.parseComment(offset);
      return offset;
    }
  }], [{
    key: "endOfQuote",
    value: function endOfQuote(src, offset) {
      var ch = src[offset];

      while (ch && ch !== '"') {
        offset += ch === '\\' ? 2 : 1;
        ch = src[offset];
      }

      return offset + 1;
    }
  }]);

  return QuoteDouble;
}(Node);

var QuoteSingle = /*#__PURE__*/function (_Node) {
  _inherits(QuoteSingle, _Node);

  var _super = _createSuper(QuoteSingle);

  function QuoteSingle() {
    _classCallCheck(this, QuoteSingle);

    return _super.apply(this, arguments);
  }

  _createClass(QuoteSingle, [{
    key: "strValue",
    get:
    /**
     * @returns {string | { str: string, errors: YAMLSyntaxError[] }}
     */
    function get() {
      if (!this.valueRange || !this.context) return null;
      var errors = [];
      var _this$valueRange = this.valueRange,
          start = _this$valueRange.start,
          end = _this$valueRange.end;
      var _this$context = this.context,
          indent = _this$context.indent,
          src = _this$context.src;
      if (src[end - 1] !== "'") errors.push(new YAMLSyntaxError(this, "Missing closing 'quote"));
      var str = '';

      for (var i = start + 1; i < end - 1; ++i) {
        var ch = src[i];

        if (ch === '\n') {
          if (Node.atDocumentBoundary(src, i + 1)) errors.push(new YAMLSemanticError(this, 'Document boundary indicators are not allowed within string values'));

          var _Node$foldNewline = Node.foldNewline(src, i, indent),
              fold = _Node$foldNewline.fold,
              offset = _Node$foldNewline.offset,
              error = _Node$foldNewline.error;

          str += fold;
          i = offset;
          if (error) errors.push(new YAMLSemanticError(this, 'Multi-line single-quoted string needs to be sufficiently indented'));
        } else if (ch === "'") {
          str += ch;
          i += 1;
          if (src[i] !== "'") errors.push(new YAMLSyntaxError(this, 'Unescaped single quote? This should not happen.'));
        } else if (ch === ' ' || ch === '\t') {
          // trim trailing whitespace
          var wsStart = i;
          var next = src[i + 1];

          while (next === ' ' || next === '\t') {
            i += 1;
            next = src[i + 1];
          }

          if (next !== '\n') str += i > wsStart ? src.slice(wsStart, i + 1) : ch;
        } else {
          str += ch;
        }
      }

      return errors.length > 0 ? {
        errors: errors,
        str: str
      } : str;
    }
    /**
     * Parses a 'single quoted' value from the source
     *
     * @param {ParseContext} context
     * @param {number} start - Index of first character
     * @returns {number} - Index of the character after this scalar
     */

  }, {
    key: "parse",
    value: function parse(context, start) {
      this.context = context;
      var src = context.src;
      var offset = QuoteSingle.endOfQuote(src, start + 1);
      this.valueRange = new Range(start, offset);
      offset = Node.endOfWhiteSpace(src, offset);
      offset = this.parseComment(offset);
      return offset;
    }
  }], [{
    key: "endOfQuote",
    value: function endOfQuote(src, offset) {
      var ch = src[offset];

      while (ch) {
        if (ch === "'") {
          if (src[offset + 1] !== "'") break;
          ch = src[offset += 2];
        } else {
          ch = src[offset += 1];
        }
      }

      return offset + 1;
    }
  }]);

  return QuoteSingle;
}(Node);

function createNewNode(type, props) {
  switch (type) {
    case Type.ALIAS:
      return new Alias(type, props);

    case Type.BLOCK_FOLDED:
    case Type.BLOCK_LITERAL:
      return new BlockValue(type, props);

    case Type.FLOW_MAP:
    case Type.FLOW_SEQ:
      return new FlowCollection(type, props);

    case Type.MAP_KEY:
    case Type.MAP_VALUE:
    case Type.SEQ_ITEM:
      return new CollectionItem(type, props);

    case Type.COMMENT:
    case Type.PLAIN:
      return new PlainValue(type, props);

    case Type.QUOTE_DOUBLE:
      return new QuoteDouble(type, props);

    case Type.QUOTE_SINGLE:
      return new QuoteSingle(type, props);

    /* istanbul ignore next */

    default:
      return null;
    // should never happen
  }
}
/**
 * @param {boolean} atLineStart - Node starts at beginning of line
 * @param {boolean} inFlow - true if currently in a flow context
 * @param {boolean} inCollection - true if currently in a collection context
 * @param {number} indent - Current level of indentation
 * @param {number} lineStart - Start of the current line
 * @param {Node} parent - The parent of the node
 * @param {string} src - Source of the YAML document
 */


var ParseContext = /*#__PURE__*/function () {
  function ParseContext() {
    var _this = this;

    var orig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        atLineStart = _ref.atLineStart,
        inCollection = _ref.inCollection,
        inFlow = _ref.inFlow,
        indent = _ref.indent,
        lineStart = _ref.lineStart,
        parent = _ref.parent;

    _classCallCheck(this, ParseContext);

    _defineProperty(this, "parseNode", function (overlay, start) {
      if (Node.atDocumentBoundary(_this.src, start)) return null;
      var context = new ParseContext(_this, overlay);

      var _context$parseProps = context.parseProps(start),
          props = _context$parseProps.props,
          type = _context$parseProps.type,
          valueStart = _context$parseProps.valueStart;

      var node = createNewNode(type, props);
      var offset = node.parse(context, valueStart);
      node.range = new Range(start, offset);
      /* istanbul ignore if */

      if (offset <= start) {
        // This should never happen, but if it does, let's make sure to at least
        // step one character forward to avoid a busy loop.
        node.error = new Error("Node#parse consumed no characters");
        node.error.parseEnd = offset;
        node.error.source = node;
        node.range.end = start + 1;
      }

      if (context.nodeStartsCollection(node)) {
        if (!node.error && !context.atLineStart && context.parent.type === Type.DOCUMENT) {
          node.error = new YAMLSyntaxError(node, 'Block collection must not have preceding content here (e.g. directives-end indicator)');
        }

        var collection = new Collection(node);
        offset = collection.parse(new ParseContext(context), offset);
        collection.range = new Range(start, offset);
        return collection;
      }

      return node;
    });

    this.atLineStart = atLineStart != null ? atLineStart : orig.atLineStart || false;
    this.inCollection = inCollection != null ? inCollection : orig.inCollection || false;
    this.inFlow = inFlow != null ? inFlow : orig.inFlow || false;
    this.indent = indent != null ? indent : orig.indent;
    this.lineStart = lineStart != null ? lineStart : orig.lineStart;
    this.parent = parent != null ? parent : orig.parent || {};
    this.root = orig.root;
    this.src = orig.src;
  }

  _createClass(ParseContext, [{
    key: "nodeStartsCollection",
    value: function nodeStartsCollection(node) {
      var inCollection = this.inCollection,
          inFlow = this.inFlow,
          src = this.src;
      if (inCollection || inFlow) return false;
      if (node instanceof CollectionItem) return true; // check for implicit key

      var offset = node.range.end;
      if (src[offset] === '\n' || src[offset - 1] === '\n') return false;
      offset = Node.endOfWhiteSpace(src, offset);
      return src[offset] === ':';
    } // Anchor and tag are before type, which determines the node implementation
    // class; hence this intermediate step.

  }, {
    key: "parseProps",
    value: function parseProps(offset) {
      var inFlow = this.inFlow,
          parent = this.parent,
          src = this.src;
      var props = [];
      var lineHasProps = false;
      offset = this.atLineStart ? Node.endOfIndent(src, offset) : Node.endOfWhiteSpace(src, offset);
      var ch = src[offset];

      while (ch === Char.ANCHOR || ch === Char.COMMENT || ch === Char.TAG || ch === '\n') {
        if (ch === '\n') {
          var inEnd = offset;
          var lineStart = void 0;

          do {
            lineStart = inEnd + 1;
            inEnd = Node.endOfIndent(src, lineStart);
          } while (src[inEnd] === '\n');

          var indentDiff = inEnd - (lineStart + this.indent);
          var noIndicatorAsIndent = parent.type === Type.SEQ_ITEM && parent.context.atLineStart;
          if (src[inEnd] !== '#' && !Node.nextNodeIsIndented(src[inEnd], indentDiff, !noIndicatorAsIndent)) break;
          this.atLineStart = true;
          this.lineStart = lineStart;
          lineHasProps = false;
          offset = inEnd;
        } else if (ch === Char.COMMENT) {
          var end = Node.endOfLine(src, offset + 1);
          props.push(new Range(offset, end));
          offset = end;
        } else {
          var _end = Node.endOfIdentifier(src, offset + 1);

          if (ch === Char.TAG && src[_end] === ',' && /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+,\d\d\d\d(-\d\d){0,2}\/\S/.test(src.slice(offset + 1, _end + 13))) {
            // Let's presume we're dealing with a YAML 1.0 domain tag here, rather
            // than an empty but 'foo.bar' private-tagged node in a flow collection
            // followed without whitespace by a plain string starting with a year
            // or date divided by something.
            _end = Node.endOfIdentifier(src, _end + 5);
          }

          props.push(new Range(offset, _end));
          lineHasProps = true;
          offset = Node.endOfWhiteSpace(src, _end);
        }

        ch = src[offset];
      } // '- &a : b' has an anchor on an empty node


      if (lineHasProps && ch === ':' && Node.atBlank(src, offset + 1, true)) offset -= 1;
      var type = ParseContext.parseType(src, offset, inFlow);
      return {
        props: props,
        type: type,
        valueStart: offset
      };
    }
    /**
     * Parses a node from the source
     * @param {ParseContext} overlay
     * @param {number} start - Index of first non-whitespace character for the node
     * @returns {?Node} - null if at a document boundary
     */

  }], [{
    key: "parseType",
    value: function parseType(src, offset, inFlow) {
      switch (src[offset]) {
        case '*':
          return Type.ALIAS;

        case '>':
          return Type.BLOCK_FOLDED;

        case '|':
          return Type.BLOCK_LITERAL;

        case '{':
          return Type.FLOW_MAP;

        case '[':
          return Type.FLOW_SEQ;

        case '?':
          return !inFlow && Node.atBlank(src, offset + 1, true) ? Type.MAP_KEY : Type.PLAIN;

        case ':':
          return !inFlow && Node.atBlank(src, offset + 1, true) ? Type.MAP_VALUE : Type.PLAIN;

        case '-':
          return !inFlow && Node.atBlank(src, offset + 1, true) ? Type.SEQ_ITEM : Type.PLAIN;

        case '"':
          return Type.QUOTE_DOUBLE;

        case "'":
          return Type.QUOTE_SINGLE;

        default:
          return Type.PLAIN;
      }
    }
  }]);

  return ParseContext;
}();

// Published as 'yaml/parse-cst'
function parse(src) {
  var cr = [];

  if (src.indexOf('\r') !== -1) {
    src = src.replace(/\r\n?/g, function (match, offset) {
      if (match.length > 1) cr.push(offset);
      return '\n';
    });
  }

  var documents = [];
  var offset = 0;

  do {
    var doc = new Document();
    var context = new ParseContext({
      src: src
    });
    offset = doc.parse(context, offset);
    documents.push(doc);
  } while (offset < src.length);

  documents.setOrigRanges = function () {
    if (cr.length === 0) return false;

    for (var i = 1; i < cr.length; ++i) {
      cr[i] -= i;
    }

    var crOffset = 0;

    for (var _i = 0; _i < documents.length; ++_i) {
      crOffset = documents[_i].setOrigRanges(cr, crOffset);
    }

    cr.splice(0, cr.length);
    return true;
  };

  documents.toString = function () {
    return documents.join('...\n');
  };

  return documents;
}

export { parse };
