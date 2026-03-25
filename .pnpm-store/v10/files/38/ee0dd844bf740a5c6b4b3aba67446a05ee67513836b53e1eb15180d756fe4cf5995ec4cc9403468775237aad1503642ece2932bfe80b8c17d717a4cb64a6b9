'use strict';

var doctypes = require('doctypes');
var makeError = require('pug-error');
var buildRuntime = require('pug-runtime/build');
var runtime = require('pug-runtime');
var compileAttrs = require('pug-attrs');
var selfClosing = require('void-elements');
var constantinople = require('constantinople');
var stringify = require('js-stringify');
var addWith = require('with');

// This is used to prevent pretty printing inside certain tags
var WHITE_SPACE_SENSITIVE_TAGS = {
  pre: true,
  textarea: true,
};

var INTERNAL_VARIABLES = [
  'pug',
  'pug_mixins',
  'pug_interp',
  'pug_debug_filename',
  'pug_debug_line',
  'pug_debug_sources',
  'pug_html',
];

module.exports = generateCode;
module.exports.CodeGenerator = Compiler;
function generateCode(ast, options) {
  return new Compiler(ast, options).compile();
}

function isConstant(src) {
  return constantinople(src, {pug: runtime, pug_interp: undefined});
}
function toConstant(src) {
  return constantinople.toConstant(src, {pug: runtime, pug_interp: undefined});
}

function isIdentifier(name) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Initialize `Compiler` with the given `node`.
 *
 * @param {Node} node
 * @param {Object} options
 * @api public
 */

function Compiler(node, options) {
  this.options = options = options || {};
  this.node = node;
  this.bufferedConcatenationCount = 0;
  this.hasCompiledDoctype = false;
  this.hasCompiledTag = false;
  this.pp = options.pretty || false;
  if (this.pp && typeof this.pp !== 'string') {
    this.pp = '  ';
  }
  if (this.pp && !/^\s+$/.test(this.pp)) {
    throw new Error(
      'The pretty parameter should either be a boolean or whitespace only string'
    );
  }
  if (this.options.templateName && !isIdentifier(this.options.templateName)) {
    throw new Error(
      'The templateName parameter must be a valid JavaScript identifier if specified.'
    );
  }
  if (
    this.doctype &&
    (this.doctype.includes('<') || this.doctype.includes('>'))
  ) {
    throw new Error('Doctype can not contain "<" or ">"');
  }
  if (this.options.globals && !this.options.globals.every(isIdentifier)) {
    throw new Error(
      'The globals option must be an array of valid JavaScript identifiers if specified.'
    );
  }

  this.debug = false !== options.compileDebug;
  this.indents = 0;
  this.parentIndents = 0;
  this.terse = false;
  this.mixins = {};
  this.dynamicMixins = false;
  this.eachCount = 0;
  if (options.doctype) this.setDoctype(options.doctype);
  this.runtimeFunctionsUsed = [];
  this.inlineRuntimeFunctions = options.inlineRuntimeFunctions || false;
  if (this.debug && this.inlineRuntimeFunctions) {
    this.runtimeFunctionsUsed.push('rethrow');
  }
}

/**
 * Compiler prototype.
 */

Compiler.prototype = {
  runtime: function(name) {
    if (this.inlineRuntimeFunctions) {
      this.runtimeFunctionsUsed.push(name);
      return 'pug_' + name;
    } else {
      return 'pug.' + name;
    }
  },

  error: function(message, code, node) {
    var err = makeError(code, message, {
      line: node.line,
      column: node.column,
      filename: node.filename,
    });
    throw err;
  },

  /**
   * Compile parse tree to JavaScript.
   *
   * @api public
   */

  compile: function() {
    this.buf = [];
    if (this.pp) this.buf.push('var pug_indent = [];');
    this.lastBufferedIdx = -1;
    this.visit(this.node);
    if (!this.dynamicMixins) {
      // if there are no dynamic mixins we can remove any un-used mixins
      var mixinNames = Object.keys(this.mixins);
      for (var i = 0; i < mixinNames.length; i++) {
        var mixin = this.mixins[mixinNames[i]];
        if (!mixin.used) {
          for (var x = 0; x < mixin.instances.length; x++) {
            for (
              var y = mixin.instances[x].start;
              y < mixin.instances[x].end;
              y++
            ) {
              this.buf[y] = '';
            }
          }
        }
      }
    }
    var js = this.buf.join('\n');
    var globals = this.options.globals
      ? this.options.globals.concat(INTERNAL_VARIABLES)
      : INTERNAL_VARIABLES;
    if (this.options.self) {
      js = 'var self = locals || {};' + js;
    } else {
      js = addWith(
        'locals || {}',
        js,
        globals.concat(
          this.runtimeFunctionsUsed.map(function(name) {
            return 'pug_' + name;
          })
        )
      );
    }
    if (this.debug) {
      if (this.options.includeSources) {
        js =
          'var pug_debug_sources = ' +
          stringify(this.options.includeSources) +
          ';\n' +
          js;
      }
      js =
        'var pug_debug_filename, pug_debug_line;' +
        'try {' +
        js +
        '} catch (err) {' +
        (this.inlineRuntimeFunctions ? 'pug_rethrow' : 'pug.rethrow') +
        '(err, pug_debug_filename, pug_debug_line' +
        (this.options.includeSources
          ? ', pug_debug_sources[pug_debug_filename]'
          : '') +
        ');' +
        '}';
    }

    return (
      buildRuntime(this.runtimeFunctionsUsed) +
      'function ' +
      (this.options.templateName || 'template') +
      '(locals) {var pug_html = "", pug_mixins = {}, pug_interp;' +
      js +
      ';return pug_html;}'
    );
  },

  /**
   * Sets the default doctype `name`. Sets terse mode to `true` when
   * html 5 is used, causing self-closing tags to end with ">" vs "/>",
   * and boolean attributes are not mirrored.
   *
   * @param {string} name
   * @api public
   */

  setDoctype: function(name) {
    this.doctype = doctypes[name.toLowerCase()] || '<!DOCTYPE ' + name + '>';
    this.terse = this.doctype.toLowerCase() == '<!doctype html>';
    this.xml = 0 == this.doctype.indexOf('<?xml');
  },

  /**
   * Buffer the given `str` exactly as is or with interpolation
   *
   * @param {String} str
   * @param {Boolean} interpolate
   * @api public
   */

  buffer: function(str) {
    var self = this;

    str = stringify(str);
    str = str.substr(1, str.length - 2);

    if (
      this.lastBufferedIdx == this.buf.length &&
      this.bufferedConcatenationCount < 100
    ) {
      if (this.lastBufferedType === 'code') {
        this.lastBuffered += ' + "';
        this.bufferedConcatenationCount++;
      }
      this.lastBufferedType = 'text';
      this.lastBuffered += str;
      this.buf[this.lastBufferedIdx - 1] =
        'pug_html = pug_html + ' +
        this.bufferStartChar +
        this.lastBuffered +
        '";';
    } else {
      this.bufferedConcatenationCount = 0;
      this.buf.push('pug_html = pug_html + "' + str + '";');
      this.lastBufferedType = 'text';
      this.bufferStartChar = '"';
      this.lastBuffered = str;
      this.lastBufferedIdx = this.buf.length;
    }
  },

  /**
   * Buffer the given `src` so it is evaluated at run time
   *
   * @param {String} src
   * @api public
   */

  bufferExpression: function(src) {
    if (isConstant(src)) {
      return this.buffer(toConstant(src) + '');
    }
    if (
      this.lastBufferedIdx == this.buf.length &&
      this.bufferedConcatenationCount < 100
    ) {
      this.bufferedConcatenationCount++;
      if (this.lastBufferedType === 'text') this.lastBuffered += '"';
      this.lastBufferedType = 'code';
      this.lastBuffered += ' + (' + src + ')';
      this.buf[this.lastBufferedIdx - 1] =
        'pug_html = pug_html + (' +
        this.bufferStartChar +
        this.lastBuffered +
        ');';
    } else {
      this.bufferedConcatenationCount = 0;
      this.buf.push('pug_html = pug_html + (' + src + ');');
      this.lastBufferedType = 'code';
      this.bufferStartChar = '';
      this.lastBuffered = '(' + src + ')';
      this.lastBufferedIdx = this.buf.length;
    }
  },

  /**
   * Buffer an indent based on the current `indent`
   * property and an additional `offset`.
   *
   * @param {Number} offset
   * @param {Boolean} newline
   * @api public
   */

  prettyIndent: function(offset, newline) {
    offset = offset || 0;
    newline = newline ? '\n' : '';
    this.buffer(newline + Array(this.indents + offset).join(this.pp));
    if (this.parentIndents)
      this.buf.push('pug_html = pug_html + pug_indent.join("");');
  },

  /**
   * Visit `node`.
   *
   * @param {Node} node
   * @api public
   */

  visit: function(node, parent) {
    var debug = this.debug;

    if (!node) {
      var msg;
      if (parent) {
        msg =
          'A child of ' +
          parent.type +
          ' (' +
          (parent.filename || 'Pug') +
          ':' +
          parent.line +
          ')';
      } else {
        msg = 'A top-level node';
      }
      msg += ' is ' + node + ', expected a Pug AST Node.';
      throw new TypeError(msg);
    }

    if (debug && node.debug !== false && node.type !== 'Block') {
      if (node.line) {
        var js = ';pug_debug_line = ' + node.line;
        if (node.filename)
          js += ';pug_debug_filename = ' + stringify(node.filename);
        this.buf.push(js + ';');
      }
    }

    if (!this['visit' + node.type]) {
      var msg;
      if (parent) {
        msg = 'A child of ' + parent.type;
      } else {
        msg = 'A top-level node';
      }
      msg +=
        ' (' +
        (node.filename || 'Pug') +
        ':' +
        node.line +
        ')' +
        ' is of type ' +
        node.type +
        ',' +
        ' which is not supported by pug-code-gen.';
      switch (node.type) {
        case 'Filter':
          msg += ' Please use pug-filters to preprocess this AST.';
          break;
        case 'Extends':
        case 'Include':
        case 'NamedBlock':
        case 'FileReference': // unlikely but for the sake of completeness
          msg += ' Please use pug-linker to preprocess this AST.';
          break;
      }
      throw new TypeError(msg);
    }

    this.visitNode(node);
  },

  /**
   * Visit `node`.
   *
   * @param {Node} node
   * @api public
   */

  visitNode: function(node) {
    return this['visit' + node.type](node);
  },

  /**
   * Visit case `node`.
   *
   * @param {Literal} node
   * @api public
   */

  visitCase: function(node) {
    this.buf.push('switch (' + node.expr + '){');
    this.visit(node.block, node);
    this.buf.push('}');
  },

  /**
   * Visit when `node`.
   *
   * @param {Literal} node
   * @api public
   */

  visitWhen: function(node) {
    if ('default' == node.expr) {
      this.buf.push('default:');
    } else {
      this.buf.push('case ' + node.expr + ':');
    }
    if (node.block) {
      this.visit(node.block, node);
      this.buf.push('  break;');
    }
  },

  /**
   * Visit literal `node`.
   *
   * @param {Literal} node
   * @api public
   */

  visitLiteral: function(node) {
    this.buffer(node.str);
  },

  visitNamedBlock: function(block) {
    return this.visitBlock(block);
  },
  /**
   * Visit all nodes in `block`.
   *
   * @param {Block} block
   * @api public
   */

  visitBlock: function(block) {
    var escapePrettyMode = this.escapePrettyMode;
    var pp = this.pp;

    // Pretty print multi-line text
    if (
      pp &&
      block.nodes.length > 1 &&
      !escapePrettyMode &&
      block.nodes[0].type === 'Text' &&
      block.nodes[1].type === 'Text'
    ) {
      this.prettyIndent(1, true);
    }
    for (var i = 0; i < block.nodes.length; ++i) {
      // Pretty print text
      if (
        pp &&
        i > 0 &&
        !escapePrettyMode &&
        block.nodes[i].type === 'Text' &&
        block.nodes[i - 1].type === 'Text' &&
        /\n$/.test(block.nodes[i - 1].val)
      ) {
        this.prettyIndent(1, false);
      }
      this.visit(block.nodes[i], block);
    }
  },

  /**
   * Visit a mixin's `block` keyword.
   *
   * @param {MixinBlock} block
   * @api public
   */

  visitMixinBlock: function(block) {
    if (this.pp)
      this.buf.push(
        'pug_indent.push(' +
          stringify(Array(this.indents + 1).join(this.pp)) +
          ');'
      );
    this.buf.push('block && block();');
    if (this.pp) this.buf.push('pug_indent.pop();');
  },

  /**
   * Visit `doctype`. Sets terse mode to `true` when html 5
   * is used, causing self-closing tags to end with ">" vs "/>",
   * and boolean attributes are not mirrored.
   *
   * @param {Doctype} doctype
   * @api public
   */

  visitDoctype: function(doctype) {
    if (doctype && (doctype.val || !this.doctype)) {
      this.setDoctype(doctype.val || 'html');
    }

    if (this.doctype) this.buffer(this.doctype);
    this.hasCompiledDoctype = true;
  },

  /**
   * Visit `mixin`, generating a function that
   * may be called within the template.
   *
   * @param {Mixin} mixin
   * @api public
   */

  visitMixin: function(mixin) {
    var name = 'pug_mixins[';
    var args = mixin.args || '';
    var block = mixin.block;
    var attrs = mixin.attrs;
    var attrsBlocks = this.attributeBlocks(mixin.attributeBlocks);
    var pp = this.pp;
    var dynamic = mixin.name[0] === '#';
    var key = mixin.name;
    if (dynamic) this.dynamicMixins = true;
    name +=
      (dynamic
        ? mixin.name.substr(2, mixin.name.length - 3)
        : '"' + mixin.name + '"') + ']';

    this.mixins[key] = this.mixins[key] || {used: false, instances: []};
    if (mixin.call) {
      this.mixins[key].used = true;
      if (pp)
        this.buf.push(
          'pug_indent.push(' +
            stringify(Array(this.indents + 1).join(pp)) +
            ');'
        );
      if (block || attrs.length || attrsBlocks.length) {
        this.buf.push(name + '.call({');

        if (block) {
          this.buf.push('block: function(){');

          // Render block with no indents, dynamically added when rendered
          this.parentIndents++;
          var _indents = this.indents;
          this.indents = 0;
          this.visit(mixin.block, mixin);
          this.indents = _indents;
          this.parentIndents--;

          if (attrs.length || attrsBlocks.length) {
            this.buf.push('},');
          } else {
            this.buf.push('}');
          }
        }

        if (attrsBlocks.length) {
          if (attrs.length) {
            var val = this.attrs(attrs);
            attrsBlocks.unshift(val);
          }
          if (attrsBlocks.length > 1) {
            this.buf.push(
              'attributes: ' +
                this.runtime('merge') +
                '([' +
                attrsBlocks.join(',') +
                '])'
            );
          } else {
            this.buf.push('attributes: ' + attrsBlocks[0]);
          }
        } else if (attrs.length) {
          var val = this.attrs(attrs);
          this.buf.push('attributes: ' + val);
        }

        if (args) {
          this.buf.push('}, ' + args + ');');
        } else {
          this.buf.push('});');
        }
      } else {
        this.buf.push(name + '(' + args + ');');
      }
      if (pp) this.buf.push('pug_indent.pop();');
    } else {
      var mixin_start = this.buf.length;
      args = args ? args.split(',') : [];
      var rest;
      if (args.length && /^\.\.\./.test(args[args.length - 1].trim())) {
        rest = args
          .pop()
          .trim()
          .replace(/^\.\.\./, '');
      }
      // we need use pug_interp here for v8: https://code.google.com/p/v8/issues/detail?id=4165
      // once fixed, use this: this.buf.push(name + ' = function(' + args.join(',') + '){');
      this.buf.push(name + ' = pug_interp = function(' + args.join(',') + '){');
      this.buf.push(
        'var block = (this && this.block), attributes = (this && this.attributes) || {};'
      );
      if (rest) {
        this.buf.push('var ' + rest + ' = [];');
        this.buf.push(
          'for (pug_interp = ' +
            args.length +
            '; pug_interp < arguments.length; pug_interp++) {'
        );
        this.buf.push('  ' + rest + '.push(arguments[pug_interp]);');
        this.buf.push('}');
      }
      this.parentIndents++;
      this.visit(block, mixin);
      this.parentIndents--;
      this.buf.push('};');
      var mixin_end = this.buf.length;
      this.mixins[key].instances.push({start: mixin_start, end: mixin_end});
    }
  },

  /**
   * Visit `tag` buffering tag markup, generating
   * attributes, visiting the `tag`'s code and block.
   *
   * @param {Tag} tag
   * @param {boolean} interpolated
   * @api public
   */

  visitTag: function(tag, interpolated) {
    this.indents++;
    var name = tag.name,
      pp = this.pp,
      self = this;

    function bufferName() {
      if (interpolated) self.bufferExpression(tag.expr);
      else self.buffer(name);
    }

    if (WHITE_SPACE_SENSITIVE_TAGS[tag.name] === true)
      this.escapePrettyMode = true;

    if (!this.hasCompiledTag) {
      if (!this.hasCompiledDoctype && 'html' == name) {
        this.visitDoctype();
      }
      this.hasCompiledTag = true;
    }

    // pretty print
    if (pp && !tag.isInline) this.prettyIndent(0, true);
    if (tag.selfClosing || (!this.xml && selfClosing[tag.name])) {
      this.buffer('<');
      bufferName();
      this.visitAttributes(
        tag.attrs,
        this.attributeBlocks(tag.attributeBlocks)
      );
      if (this.terse && !tag.selfClosing) {
        this.buffer('>');
      } else {
        this.buffer('/>');
      }
      // if it is non-empty throw an error
      if (
        tag.code ||
        (tag.block &&
          !(tag.block.type === 'Block' && tag.block.nodes.length === 0) &&
          tag.block.nodes.some(function(tag) {
            return tag.type !== 'Text' || !/^\s*$/.test(tag.val);
          }))
      ) {
        this.error(
          name +
            ' is a self closing element: <' +
            name +
            '/> but contains nested content.',
          'SELF_CLOSING_CONTENT',
          tag
        );
      }
    } else {
      // Optimize attributes buffering
      this.buffer('<');
      bufferName();
      this.visitAttributes(
        tag.attrs,
        this.attributeBlocks(tag.attributeBlocks)
      );
      this.buffer('>');
      if (tag.code) this.visitCode(tag.code);
      this.visit(tag.block, tag);

      // pretty print
      if (
        pp &&
        !tag.isInline &&
        WHITE_SPACE_SENSITIVE_TAGS[tag.name] !== true &&
        !tagCanInline(tag)
      )
        this.prettyIndent(0, true);

      this.buffer('</');
      bufferName();
      this.buffer('>');
    }

    if (WHITE_SPACE_SENSITIVE_TAGS[tag.name] === true)
      this.escapePrettyMode = false;

    this.indents--;
  },

  /**
   * Visit InterpolatedTag.
   *
   * @param {InterpolatedTag} tag
   * @api public
   */

  visitInterpolatedTag: function(tag) {
    return this.visitTag(tag, true);
  },

  /**
   * Visit `text` node.
   *
   * @param {Text} text
   * @api public
   */

  visitText: function(text) {
    this.buffer(text.val);
  },

  /**
   * Visit a `comment`, only buffering when the buffer flag is set.
   *
   * @param {Comment} comment
   * @api public
   */

  visitComment: function(comment) {
    if (!comment.buffer) return;
    if (this.pp) this.prettyIndent(1, true);
    this.buffer('<!--' + comment.val + '-->');
  },

  /**
   * Visit a `YieldBlock`.
   *
   * This is necessary since we allow compiling a file with `yield`.
   *
   * @param {YieldBlock} block
   * @api public
   */

  visitYieldBlock: function(block) {},

  /**
   * Visit a `BlockComment`.
   *
   * @param {Comment} comment
   * @api public
   */

  visitBlockComment: function(comment) {
    if (!comment.buffer) return;
    if (this.pp) this.prettyIndent(1, true);
    this.buffer('<!--' + (comment.val || ''));
    this.visit(comment.block, comment);
    if (this.pp) this.prettyIndent(1, true);
    this.buffer('-->');
  },

  /**
   * Visit `code`, respecting buffer / escape flags.
   * If the code is followed by a block, wrap it in
   * a self-calling function.
   *
   * @param {Code} code
   * @api public
   */

  visitCode: function(code) {
    // Wrap code blocks with {}.
    // we only wrap unbuffered code blocks ATM
    // since they are usually flow control

    // Buffer code
    if (code.buffer) {
      var val = code.val.trim();
      val = 'null == (pug_interp = ' + val + ') ? "" : pug_interp';
      if (code.mustEscape !== false)
        val = this.runtime('escape') + '(' + val + ')';
      this.bufferExpression(val);
    } else {
      this.buf.push(code.val);
    }

    // Block support
    if (code.block) {
      if (!code.buffer) this.buf.push('{');
      this.visit(code.block, code);
      if (!code.buffer) this.buf.push('}');
    }
  },

  /**
   * Visit `Conditional`.
   *
   * @param {Conditional} cond
   * @api public
   */

  visitConditional: function(cond) {
    var test = cond.test;
    this.buf.push('if (' + test + ') {');
    this.visit(cond.consequent, cond);
    this.buf.push('}');
    if (cond.alternate) {
      if (cond.alternate.type === 'Conditional') {
        this.buf.push('else');
        this.visitConditional(cond.alternate);
      } else {
        this.buf.push('else {');
        this.visit(cond.alternate, cond);
        this.buf.push('}');
      }
    }
  },

  /**
   * Visit `While`.
   *
   * @param {While} loop
   * @api public
   */

  visitWhile: function(loop) {
    var test = loop.test;
    this.buf.push('while (' + test + ') {');
    this.visit(loop.block, loop);
    this.buf.push('}');
  },

  /**
   * Visit `each` block.
   *
   * @param {Each} each
   * @api public
   */

  visitEach: function(each) {
    var indexVarName = each.key || 'pug_index' + this.eachCount;
    this.eachCount++;

    this.buf.push(
      '' +
        '// iterate ' +
        each.obj +
        '\n' +
        ';(function(){\n' +
        '  var $$obj = ' +
        each.obj +
        ';\n' +
        "  if ('number' == typeof $$obj.length) {"
    );

    if (each.alternate) {
      this.buf.push('    if ($$obj.length) {');
    }

    this.buf.push(
      '' +
        '      for (var ' +
        indexVarName +
        ' = 0, $$l = $$obj.length; ' +
        indexVarName +
        ' < $$l; ' +
        indexVarName +
        '++) {\n' +
        '        var ' +
        each.val +
        ' = $$obj[' +
        indexVarName +
        '];'
    );

    this.visit(each.block, each);

    this.buf.push('      }');

    if (each.alternate) {
      this.buf.push('    } else {');
      this.visit(each.alternate, each);
      this.buf.push('    }');
    }

    this.buf.push(
      '' +
        '  } else {\n' +
        '    var $$l = 0;\n' +
        '    for (var ' +
        indexVarName +
        ' in $$obj) {\n' +
        '      $$l++;\n' +
        '      var ' +
        each.val +
        ' = $$obj[' +
        indexVarName +
        '];'
    );

    this.visit(each.block, each);

    this.buf.push('    }');
    if (each.alternate) {
      this.buf.push('    if ($$l === 0) {');
      this.visit(each.alternate, each);
      this.buf.push('    }');
    }
    this.buf.push('  }\n}).call(this);\n');
  },

  visitEachOf: function(each) {
    this.buf.push(
      '' +
        '// iterate ' +
        each.obj +
        '\n' +
        'for (const ' +
        each.val +
        ' of ' +
        each.obj +
        ') {\n'
    );

    this.visit(each.block, each);

    this.buf.push('}\n');
  },

  /**
   * Visit `attrs`.
   *
   * @param {Array} attrs
   * @api public
   */

  visitAttributes: function(attrs, attributeBlocks) {
    if (attributeBlocks.length) {
      if (attrs.length) {
        var val = this.attrs(attrs);
        attributeBlocks.unshift(val);
      }
      if (attributeBlocks.length > 1) {
        this.bufferExpression(
          this.runtime('attrs') +
            '(' +
            this.runtime('merge') +
            '([' +
            attributeBlocks.join(',') +
            ']), ' +
            stringify(this.terse) +
            ')'
        );
      } else {
        this.bufferExpression(
          this.runtime('attrs') +
            '(' +
            attributeBlocks[0] +
            ', ' +
            stringify(this.terse) +
            ')'
        );
      }
    } else if (attrs.length) {
      this.attrs(attrs, true);
    }
  },

  /**
   * Compile attributes.
   */

  attrs: function(attrs, buffer) {
    var res = compileAttrs(attrs, {
      terse: this.terse,
      format: buffer ? 'html' : 'object',
      runtime: this.runtime.bind(this),
    });
    if (buffer) {
      this.bufferExpression(res);
    }
    return res;
  },

  /**
   * Compile attribute blocks.
   */

  attributeBlocks: function(attributeBlocks) {
    return (
      attributeBlocks &&
      attributeBlocks.slice().map(function(attrBlock) {
        return attrBlock.val;
      })
    );
  },
};

function tagCanInline(tag) {
  function isInline(node) {
    // Recurse if the node is a block
    if (node.type === 'Block') return node.nodes.every(isInline);
    // When there is a YieldBlock here, it is an indication that the file is
    // expected to be included but is not. If this is the case, the block
    // must be empty.
    if (node.type === 'YieldBlock') return true;
    return (node.type === 'Text' && !/\n/.test(node.val)) || node.isInline;
  }

  return tag.block.nodes.every(isInline);
}
