import { d as defaultTagPrefix, _ as _createForOfIteratorHelper, a as _typeof, b as _createClass, c as _classCallCheck, e as _defineProperty, Y as YAMLSyntaxError, T as Type, f as YAMLWarning, g as YAMLSemanticError, h as _slicedToArray, i as YAMLError, j as _inherits, k as _createSuper } from './PlainValue-b8036b75.js';
import { parse as parse$1 } from './parse-cst.js';
import { b as binaryOptions, a as boolOptions, i as intOptions, n as nullOptions, s as strOptions, N as Node, P as Pair, S as Scalar, c as stringifyString, A as Alias, Y as YAMLSeq, d as YAMLMap, M as Merge, C as Collection, r as resolveNode, e as isEmptyPath, t as toJSON, f as addComment } from './resolveSeq-492ab440.js';
import { S as Schema } from './Schema-e94716c8.js';
import { w as warn } from './warnings-df54cb69.js';

var defaultOptions = {
  anchorPrefix: 'a',
  customTags: null,
  indent: 2,
  indentSeq: true,
  keepCstNodes: false,
  keepNodeTypes: true,
  keepBlobsInJSON: true,
  mapAsMap: false,
  maxAliasCount: 100,
  prettyErrors: false,
  // TODO Set true in v2
  simpleKeys: false,
  version: '1.2'
};
var scalarOptions = {
  get binary() {
    return binaryOptions;
  },

  set binary(opt) {
    Object.assign(binaryOptions, opt);
  },

  get bool() {
    return boolOptions;
  },

  set bool(opt) {
    Object.assign(boolOptions, opt);
  },

  get int() {
    return intOptions;
  },

  set int(opt) {
    Object.assign(intOptions, opt);
  },

  get null() {
    return nullOptions;
  },

  set null(opt) {
    Object.assign(nullOptions, opt);
  },

  get str() {
    return strOptions;
  },

  set str(opt) {
    Object.assign(strOptions, opt);
  }

};
var documentOptions = {
  '1.0': {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: defaultTagPrefix
    }, {
      handle: '!!',
      prefix: 'tag:private.yaml.org,2002:'
    }]
  },
  1.1: {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: defaultTagPrefix
    }]
  },
  1.2: {
    schema: 'core',
    merge: false,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: defaultTagPrefix
    }]
  }
};

function stringifyTag(doc, tag) {
  if ((doc.version || doc.options.version) === '1.0') {
    var priv = tag.match(/^tag:private\.yaml\.org,2002:([^:/]+)$/);
    if (priv) return '!' + priv[1];
    var vocab = tag.match(/^tag:([a-zA-Z0-9-]+)\.yaml\.org,2002:(.*)/);
    return vocab ? "!".concat(vocab[1], "/").concat(vocab[2]) : "!".concat(tag.replace(/^tag:/, ''));
  }

  var p = doc.tagPrefixes.find(function (p) {
    return tag.indexOf(p.prefix) === 0;
  });

  if (!p) {
    var dtp = doc.getDefaults().tagPrefixes;
    p = dtp && dtp.find(function (p) {
      return tag.indexOf(p.prefix) === 0;
    });
  }

  if (!p) return tag[0] === '!' ? tag : "!<".concat(tag, ">");
  var suffix = tag.substr(p.prefix.length).replace(/[!,[\]{}]/g, function (ch) {
    return {
      '!': '%21',
      ',': '%2C',
      '[': '%5B',
      ']': '%5D',
      '{': '%7B',
      '}': '%7D'
    }[ch];
  });
  return p.handle + suffix;
}

function getTagObject(tags, item) {
  if (item instanceof Alias) return Alias;

  if (item.tag) {
    var match = tags.filter(function (t) {
      return t.tag === item.tag;
    });
    if (match.length > 0) return match.find(function (t) {
      return t.format === item.format;
    }) || match[0];
  }

  var tagObj, obj;

  if (item instanceof Scalar) {
    obj = item.value; // TODO: deprecate/remove class check

    var _match = tags.filter(function (t) {
      return t.identify && t.identify(obj) || t.class && obj instanceof t.class;
    });

    tagObj = _match.find(function (t) {
      return t.format === item.format;
    }) || _match.find(function (t) {
      return !t.format;
    });
  } else {
    obj = item;
    tagObj = tags.find(function (t) {
      return t.nodeClass && obj instanceof t.nodeClass;
    });
  }

  if (!tagObj) {
    var name = obj && obj.constructor ? obj.constructor.name : _typeof(obj);
    throw new Error("Tag not resolved for ".concat(name, " value"));
  }

  return tagObj;
} // needs to be called before value stringifier to allow for circular anchor refs


function stringifyProps(node, tagObj, _ref) {
  var anchors = _ref.anchors,
      doc = _ref.doc;
  var props = [];
  var anchor = doc.anchors.getName(node);

  if (anchor) {
    anchors[anchor] = node;
    props.push("&".concat(anchor));
  }

  if (node.tag) {
    props.push(stringifyTag(doc, node.tag));
  } else if (!tagObj.default) {
    props.push(stringifyTag(doc, tagObj.tag));
  }

  return props.join(' ');
}

function stringify$1(item, ctx, onComment, onChompKeep) {
  var _ctx$doc = ctx.doc,
      anchors = _ctx$doc.anchors,
      schema = _ctx$doc.schema;
  var tagObj;

  if (!(item instanceof Node)) {
    var createCtx = {
      aliasNodes: [],
      onTagObj: function onTagObj(o) {
        return tagObj = o;
      },
      prevObjects: new Map()
    };
    item = schema.createNode(item, true, null, createCtx);

    var _iterator = _createForOfIteratorHelper(createCtx.aliasNodes),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var alias = _step.value;
        alias.source = alias.source.node;
        var name = anchors.getName(alias.source);

        if (!name) {
          name = anchors.newName();
          anchors.map[name] = alias.source;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  if (item instanceof Pair) return item.toString(ctx, onComment, onChompKeep);
  if (!tagObj) tagObj = getTagObject(schema.tags, item);
  var props = stringifyProps(item, tagObj, ctx);
  if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart || 0) + props.length + 1;
  var str = typeof tagObj.stringify === 'function' ? tagObj.stringify(item, ctx, onComment, onChompKeep) : item instanceof Scalar ? stringifyString(item, ctx, onComment, onChompKeep) : item.toString(ctx, onComment, onChompKeep);
  if (!props) return str;
  return item instanceof Scalar || str[0] === '{' || str[0] === '[' ? "".concat(props, " ").concat(str) : "".concat(props, "\n").concat(ctx.indent).concat(str);
}

var Anchors = /*#__PURE__*/function () {
  function Anchors(prefix) {
    _classCallCheck(this, Anchors);

    _defineProperty(this, "map", Object.create(null));

    this.prefix = prefix;
  }

  _createClass(Anchors, [{
    key: "createAlias",
    value: function createAlias(node, name) {
      this.setAnchor(node, name);
      return new Alias(node);
    }
  }, {
    key: "createMergePair",
    value: function createMergePair() {
      var _this = this;

      var merge = new Merge();

      for (var _len = arguments.length, sources = new Array(_len), _key = 0; _key < _len; _key++) {
        sources[_key] = arguments[_key];
      }

      merge.value.items = sources.map(function (s) {
        if (s instanceof Alias) {
          if (s.source instanceof YAMLMap) return s;
        } else if (s instanceof YAMLMap) {
          return _this.createAlias(s);
        }

        throw new Error('Merge sources must be Map nodes or their Aliases');
      });
      return merge;
    }
  }, {
    key: "getName",
    value: function getName(node) {
      var map = this.map;
      return Object.keys(map).find(function (a) {
        return map[a] === node;
      });
    }
  }, {
    key: "getNames",
    value: function getNames() {
      return Object.keys(this.map);
    }
  }, {
    key: "getNode",
    value: function getNode(name) {
      return this.map[name];
    }
  }, {
    key: "newName",
    value: function newName(prefix) {
      if (!prefix) prefix = this.prefix;
      var names = Object.keys(this.map);

      for (var i = 1; true; ++i) {
        var name = "".concat(prefix).concat(i);
        if (!names.includes(name)) return name;
      }
    } // During parsing, map & aliases contain CST nodes

  }, {
    key: "resolveNodes",
    value: function resolveNodes() {
      var map = this.map,
          _cstAliases = this._cstAliases;
      Object.keys(map).forEach(function (a) {
        map[a] = map[a].resolved;
      });

      _cstAliases.forEach(function (a) {
        a.source = a.source.resolved;
      });

      delete this._cstAliases;
    }
  }, {
    key: "setAnchor",
    value: function setAnchor(node, name) {
      if (node != null && !Anchors.validAnchorNode(node)) {
        throw new Error('Anchors may only be set for Scalar, Seq and Map nodes');
      }

      if (name && /[\x00-\x19\s,[\]{}]/.test(name)) {
        throw new Error('Anchor names must not contain whitespace or control characters');
      }

      var map = this.map;
      var prev = node && Object.keys(map).find(function (a) {
        return map[a] === node;
      });

      if (prev) {
        if (!name) {
          return prev;
        } else if (prev !== name) {
          delete map[prev];
          map[name] = node;
        }
      } else {
        if (!name) {
          if (!node) return null;
          name = this.newName();
        }

        map[name] = node;
      }

      return name;
    }
  }], [{
    key: "validAnchorNode",
    value: function validAnchorNode(node) {
      return node instanceof Scalar || node instanceof YAMLSeq || node instanceof YAMLMap;
    }
  }]);

  return Anchors;
}();

var visit = function visit(node, tags) {
  if (node && _typeof(node) === 'object') {
    var tag = node.tag;

    if (node instanceof Collection) {
      if (tag) tags[tag] = true;
      node.items.forEach(function (n) {
        return visit(n, tags);
      });
    } else if (node instanceof Pair) {
      visit(node.key, tags);
      visit(node.value, tags);
    } else if (node instanceof Scalar) {
      if (tag) tags[tag] = true;
    }
  }

  return tags;
};

var listTagNames = function listTagNames(node) {
  return Object.keys(visit(node, {}));
};

function parseContents(doc, contents) {
  var comments = {
    before: [],
    after: []
  };
  var body = undefined;
  var spaceBefore = false;

  var _iterator = _createForOfIteratorHelper(contents),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var node = _step.value;

      if (node.valueRange) {
        if (body !== undefined) {
          var msg = 'Document contains trailing content not separated by a ... or --- line';
          doc.errors.push(new YAMLSyntaxError(node, msg));
          break;
        }

        var res = resolveNode(doc, node);

        if (spaceBefore) {
          res.spaceBefore = true;
          spaceBefore = false;
        }

        body = res;
      } else if (node.comment !== null) {
        var cc = body === undefined ? comments.before : comments.after;
        cc.push(node.comment);
      } else if (node.type === Type.BLANK_LINE) {
        spaceBefore = true;

        if (body === undefined && comments.before.length > 0 && !doc.commentBefore) {
          // space-separated comments at start are parsed as document comments
          doc.commentBefore = comments.before.join('\n');
          comments.before = [];
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  doc.contents = body || null;

  if (!body) {
    doc.comment = comments.before.concat(comments.after).join('\n') || null;
  } else {
    var cb = comments.before.join('\n');

    if (cb) {
      var cbNode = body instanceof Collection && body.items[0] ? body.items[0] : body;
      cbNode.commentBefore = cbNode.commentBefore ? "".concat(cb, "\n").concat(cbNode.commentBefore) : cb;
    }

    doc.comment = comments.after.join('\n') || null;
  }
}

function resolveTagDirective(_ref, directive) {
  var tagPrefixes = _ref.tagPrefixes;

  var _directive$parameters = _slicedToArray(directive.parameters, 2),
      handle = _directive$parameters[0],
      prefix = _directive$parameters[1];

  if (!handle || !prefix) {
    var msg = 'Insufficient parameters given for %TAG directive';
    throw new YAMLSemanticError(directive, msg);
  }

  if (tagPrefixes.some(function (p) {
    return p.handle === handle;
  })) {
    var _msg = 'The %TAG directive must only be given at most once per handle in the same document.';
    throw new YAMLSemanticError(directive, _msg);
  }

  return {
    handle: handle,
    prefix: prefix
  };
}

function resolveYamlDirective(doc, directive) {
  var _directive$parameters2 = _slicedToArray(directive.parameters, 1),
      version = _directive$parameters2[0];

  if (directive.name === 'YAML:1.0') version = '1.0';

  if (!version) {
    var msg = 'Insufficient parameters given for %YAML directive';
    throw new YAMLSemanticError(directive, msg);
  }

  if (!documentOptions[version]) {
    var v0 = doc.version || doc.options.version;

    var _msg2 = "Document will be parsed as YAML ".concat(v0, " rather than YAML ").concat(version);

    doc.warnings.push(new YAMLWarning(directive, _msg2));
  }

  return version;
}

function parseDirectives(doc, directives, prevDoc) {
  var directiveComments = [];
  var hasDirectives = false;

  var _iterator = _createForOfIteratorHelper(directives),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var directive = _step.value;
      var comment = directive.comment,
          name = directive.name;

      switch (name) {
        case 'TAG':
          try {
            doc.tagPrefixes.push(resolveTagDirective(doc, directive));
          } catch (error) {
            doc.errors.push(error);
          }

          hasDirectives = true;
          break;

        case 'YAML':
        case 'YAML:1.0':
          if (doc.version) {
            var msg = 'The %YAML directive must only be given at most once per document.';
            doc.errors.push(new YAMLSemanticError(directive, msg));
          }

          try {
            doc.version = resolveYamlDirective(doc, directive);
          } catch (error) {
            doc.errors.push(error);
          }

          hasDirectives = true;
          break;

        default:
          if (name) {
            var _msg3 = "YAML only supports %TAG and %YAML directives, and not %".concat(name);

            doc.warnings.push(new YAMLWarning(directive, _msg3));
          }

      }

      if (comment) directiveComments.push(comment);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  if (prevDoc && !hasDirectives && '1.1' === (doc.version || prevDoc.version || doc.options.version)) {
    var copyTagPrefix = function copyTagPrefix(_ref2) {
      var handle = _ref2.handle,
          prefix = _ref2.prefix;
      return {
        handle: handle,
        prefix: prefix
      };
    };

    doc.tagPrefixes = prevDoc.tagPrefixes.map(copyTagPrefix);
    doc.version = prevDoc.version;
  }

  doc.commentBefore = directiveComments.join('\n') || null;
}

function assertCollection(contents) {
  if (contents instanceof Collection) return true;
  throw new Error('Expected a YAML collection as document contents');
}

var Document$1 = /*#__PURE__*/function () {
  function Document(options) {
    _classCallCheck(this, Document);

    this.anchors = new Anchors(options.anchorPrefix);
    this.commentBefore = null;
    this.comment = null;
    this.contents = null;
    this.directivesEndMarker = null;
    this.errors = [];
    this.options = options;
    this.schema = null;
    this.tagPrefixes = [];
    this.version = null;
    this.warnings = [];
  }

  _createClass(Document, [{
    key: "add",
    value: function add(value) {
      assertCollection(this.contents);
      return this.contents.add(value);
    }
  }, {
    key: "addIn",
    value: function addIn(path, value) {
      assertCollection(this.contents);
      this.contents.addIn(path, value);
    }
  }, {
    key: "delete",
    value: function _delete(key) {
      assertCollection(this.contents);
      return this.contents.delete(key);
    }
  }, {
    key: "deleteIn",
    value: function deleteIn(path) {
      if (isEmptyPath(path)) {
        if (this.contents == null) return false;
        this.contents = null;
        return true;
      }

      assertCollection(this.contents);
      return this.contents.deleteIn(path);
    }
  }, {
    key: "getDefaults",
    value: function getDefaults() {
      return Document.defaults[this.version] || Document.defaults[this.options.version] || {};
    }
  }, {
    key: "get",
    value: function get(key, keepScalar) {
      return this.contents instanceof Collection ? this.contents.get(key, keepScalar) : undefined;
    }
  }, {
    key: "getIn",
    value: function getIn(path, keepScalar) {
      if (isEmptyPath(path)) return !keepScalar && this.contents instanceof Scalar ? this.contents.value : this.contents;
      return this.contents instanceof Collection ? this.contents.getIn(path, keepScalar) : undefined;
    }
  }, {
    key: "has",
    value: function has(key) {
      return this.contents instanceof Collection ? this.contents.has(key) : false;
    }
  }, {
    key: "hasIn",
    value: function hasIn(path) {
      if (isEmptyPath(path)) return this.contents !== undefined;
      return this.contents instanceof Collection ? this.contents.hasIn(path) : false;
    }
  }, {
    key: "set",
    value: function set(key, value) {
      assertCollection(this.contents);
      this.contents.set(key, value);
    }
  }, {
    key: "setIn",
    value: function setIn(path, value) {
      if (isEmptyPath(path)) this.contents = value;else {
        assertCollection(this.contents);
        this.contents.setIn(path, value);
      }
    }
  }, {
    key: "setSchema",
    value: function setSchema(id, customTags) {
      if (!id && !customTags && this.schema) return;
      if (typeof id === 'number') id = id.toFixed(1);

      if (id === '1.0' || id === '1.1' || id === '1.2') {
        if (this.version) this.version = id;else this.options.version = id;
        delete this.options.schema;
      } else if (id && typeof id === 'string') {
        this.options.schema = id;
      }

      if (Array.isArray(customTags)) this.options.customTags = customTags;
      var opt = Object.assign({}, this.getDefaults(), this.options);
      this.schema = new Schema(opt);
    }
  }, {
    key: "parse",
    value: function parse(node, prevDoc) {
      if (this.options.keepCstNodes) this.cstNode = node;
      if (this.options.keepNodeTypes) this.type = 'DOCUMENT';
      var _node$directives = node.directives,
          directives = _node$directives === void 0 ? [] : _node$directives,
          _node$contents = node.contents,
          contents = _node$contents === void 0 ? [] : _node$contents,
          directivesEndMarker = node.directivesEndMarker,
          error = node.error,
          valueRange = node.valueRange;

      if (error) {
        if (!error.source) error.source = this;
        this.errors.push(error);
      }

      parseDirectives(this, directives, prevDoc);
      if (directivesEndMarker) this.directivesEndMarker = true;
      this.range = valueRange ? [valueRange.start, valueRange.end] : null;
      this.setSchema();
      this.anchors._cstAliases = [];
      parseContents(this, contents);
      this.anchors.resolveNodes();

      if (this.options.prettyErrors) {
        var _iterator = _createForOfIteratorHelper(this.errors),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var _error = _step.value;
            if (_error instanceof YAMLError) _error.makePretty();
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        var _iterator2 = _createForOfIteratorHelper(this.warnings),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var warn = _step2.value;
            if (warn instanceof YAMLError) warn.makePretty();
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }

      return this;
    }
  }, {
    key: "listNonDefaultTags",
    value: function listNonDefaultTags() {
      return listTagNames(this.contents).filter(function (t) {
        return t.indexOf(Schema.defaultPrefix) !== 0;
      });
    }
  }, {
    key: "setTagPrefix",
    value: function setTagPrefix(handle, prefix) {
      if (handle[0] !== '!' || handle[handle.length - 1] !== '!') throw new Error('Handle must start and end with !');

      if (prefix) {
        var prev = this.tagPrefixes.find(function (p) {
          return p.handle === handle;
        });
        if (prev) prev.prefix = prefix;else this.tagPrefixes.push({
          handle: handle,
          prefix: prefix
        });
      } else {
        this.tagPrefixes = this.tagPrefixes.filter(function (p) {
          return p.handle !== handle;
        });
      }
    }
  }, {
    key: "toJSON",
    value: function toJSON$1(arg, onAnchor) {
      var _this = this;

      var _this$options = this.options,
          keepBlobsInJSON = _this$options.keepBlobsInJSON,
          mapAsMap = _this$options.mapAsMap,
          maxAliasCount = _this$options.maxAliasCount;
      var keep = keepBlobsInJSON && (typeof arg !== 'string' || !(this.contents instanceof Scalar));
      var ctx = {
        doc: this,
        indentStep: '  ',
        keep: keep,
        mapAsMap: keep && !!mapAsMap,
        maxAliasCount: maxAliasCount,
        stringify: stringify$1 // Requiring directly in Pair would create circular dependencies

      };
      var anchorNames = Object.keys(this.anchors.map);
      if (anchorNames.length > 0) ctx.anchors = new Map(anchorNames.map(function (name) {
        return [_this.anchors.map[name], {
          alias: [],
          aliasCount: 0,
          count: 1
        }];
      }));

      var res = toJSON(this.contents, arg, ctx);

      if (typeof onAnchor === 'function' && ctx.anchors) {
        var _iterator3 = _createForOfIteratorHelper(ctx.anchors.values()),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var _step3$value = _step3.value,
                count = _step3$value.count,
                _res = _step3$value.res;
            onAnchor(_res, count);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }

      return res;
    }
  }, {
    key: "toString",
    value: function toString() {
      if (this.errors.length > 0) throw new Error('Document with errors cannot be stringified');
      var indentSize = this.options.indent;

      if (!Number.isInteger(indentSize) || indentSize <= 0) {
        var s = JSON.stringify(indentSize);
        throw new Error("\"indent\" option must be a positive integer, not ".concat(s));
      }

      this.setSchema();
      var lines = [];
      var hasDirectives = false;

      if (this.version) {
        var vd = '%YAML 1.2';

        if (this.schema.name === 'yaml-1.1') {
          if (this.version === '1.0') vd = '%YAML:1.0';else if (this.version === '1.1') vd = '%YAML 1.1';
        }

        lines.push(vd);
        hasDirectives = true;
      }

      var tagNames = this.listNonDefaultTags();
      this.tagPrefixes.forEach(function (_ref) {
        var handle = _ref.handle,
            prefix = _ref.prefix;

        if (tagNames.some(function (t) {
          return t.indexOf(prefix) === 0;
        })) {
          lines.push("%TAG ".concat(handle, " ").concat(prefix));
          hasDirectives = true;
        }
      });
      if (hasDirectives || this.directivesEndMarker) lines.push('---');

      if (this.commentBefore) {
        if (hasDirectives || !this.directivesEndMarker) lines.unshift('');
        lines.unshift(this.commentBefore.replace(/^/gm, '#'));
      }

      var ctx = {
        anchors: Object.create(null),
        doc: this,
        indent: '',
        indentStep: ' '.repeat(indentSize),
        stringify: stringify$1 // Requiring directly in nodes would create circular dependencies

      };
      var chompKeep = false;
      var contentComment = null;

      if (this.contents) {
        if (this.contents instanceof Node) {
          if (this.contents.spaceBefore && (hasDirectives || this.directivesEndMarker)) lines.push('');
          if (this.contents.commentBefore) lines.push(this.contents.commentBefore.replace(/^/gm, '#')); // top-level block scalars need to be indented if followed by a comment

          ctx.forceBlockIndent = !!this.comment;
          contentComment = this.contents.comment;
        }

        var onChompKeep = contentComment ? null : function () {
          return chompKeep = true;
        };
        var body = stringify$1(this.contents, ctx, function () {
          return contentComment = null;
        }, onChompKeep);
        lines.push(addComment(body, '', contentComment));
      } else if (this.contents !== undefined) {
        lines.push(stringify$1(this.contents, ctx));
      }

      if (this.comment) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '') lines.push('');
        lines.push(this.comment.replace(/^/gm, '#'));
      }

      return lines.join('\n') + '\n';
    }
  }]);

  return Document;
}();

_defineProperty(Document$1, "defaults", documentOptions);

function createNode(value) {
  var wrapScalars = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var tag = arguments.length > 2 ? arguments[2] : undefined;

  if (tag === undefined && typeof wrapScalars === 'string') {
    tag = wrapScalars;
    wrapScalars = true;
  }

  var options = Object.assign({}, Document$1.defaults[defaultOptions.version], defaultOptions);
  var schema = new Schema(options);
  return schema.createNode(value, wrapScalars, tag);
}

var Document = /*#__PURE__*/function (_YAMLDocument) {
  _inherits(Document, _YAMLDocument);

  var _super = _createSuper(Document);

  function Document(options) {
    _classCallCheck(this, Document);

    return _super.call(this, Object.assign({}, defaultOptions, options));
  }

  return Document;
}(Document$1);

function parseAllDocuments(src, options) {
  var stream = [];
  var prev;

  var _iterator = _createForOfIteratorHelper(parse$1(src)),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var cstDoc = _step.value;
      var doc = new Document(options);
      doc.parse(cstDoc, prev);
      stream.push(doc);
      prev = doc;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return stream;
}

function parseDocument(src, options) {
  var cst = parse$1(src);
  var doc = new Document(options).parse(cst[0]);

  if (cst.length > 1) {
    var errMsg = 'Source contains multiple documents; please use YAML.parseAllDocuments()';
    doc.errors.unshift(new YAMLSemanticError(cst[1], errMsg));
  }

  return doc;
}

function parse(src, options) {
  var doc = parseDocument(src, options);
  doc.warnings.forEach(function (warning) {
    return warn(warning);
  });
  if (doc.errors.length > 0) throw doc.errors[0];
  return doc.toJSON();
}

function stringify(value, options) {
  var doc = new Document(options);
  doc.contents = value;
  return String(doc);
}

var YAML = {
  createNode: createNode,
  defaultOptions: defaultOptions,
  Document: Document,
  parse: parse,
  parseAllDocuments: parseAllDocuments,
  parseCST: parse$1,
  parseDocument: parseDocument,
  scalarOptions: scalarOptions,
  stringify: stringify
};

export { YAML };
