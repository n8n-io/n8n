import { isNodeModel, isForwardRefNode, createModelsContext } from "@ts-graphviz/common";
class Builder {
  /**
   * Constructor of Builder
   * @param options - Options to initialize Builder
   */
  constructor(options) {
    this.options = options;
  }
  /**
   * Get the current file range or null
   * @internal
   */
  getLocation() {
    return this.options?.locationFunction?.() ?? null;
  }
  /**
   * Create an {@link ASTNode} of the specified type
   *
   * @param type - Type of the {@link ASTNode}
   * @param props - Properties of the {@link ASTNode}
   * @param children - Children of the {@link ASTNode}
   * @returns An {@link ASTNode}
   */
  createElement(type, props, children = []) {
    return {
      location: this.getLocation(),
      ...props,
      type,
      children
    };
  }
}
const createElement = Builder.prototype.createElement.bind(new Builder());
const AttributeListPrintPlugin = {
  match(ast) {
    return ast.type === "AttributeList";
  },
  *print(context, ast) {
    if (ast.children.length === 0) {
      yield `${ast.kind.toLocaleLowerCase()} [];`;
    } else {
      yield `${ast.kind.toLocaleLowerCase()} [`;
      yield* context.printChildren(ast.children);
      yield "];";
    }
  }
};
const AttributePrintPlugin = {
  match(ast) {
    return ast.type === "Attribute";
  },
  *print(context, ast) {
    yield* context.print(ast.key);
    yield " = ";
    yield* context.print(ast.value);
    yield ";";
  }
};
const EOL_PATTERN = /\r?\n/;
const paddingMap = {
  Block: " * ",
  Macro: "# ",
  Slash: "// "
};
const CommentPrintPlugin = {
  match(ast) {
    return ast.type === "Comment";
  },
  *print(context, ast) {
    const padding = paddingMap[ast.kind];
    if (ast.kind === "Block") {
      yield* ["/**", context.EOL];
    }
    const lines = ast.value.split(EOL_PATTERN);
    const lineLength = lines.length;
    for (let i = 0; i < lineLength; i++) {
      yield padding;
      yield lines[i];
      if (i < lineLength - 1) {
        yield context.EOL;
      }
    }
    if (ast.kind === "Block") {
      yield* [context.EOL, " */"];
    }
  }
};
const DotPrintPlugin = {
  match(ast) {
    return ast.type === "Dot";
  },
  *print(context, ast) {
    yield* context.join(ast.children, context.EOL);
  }
};
const EdgePrintPlugin = {
  match(ast) {
    return ast.type === "Edge";
  },
  *print(context, ast) {
    yield* context.join(ast.targets, context.directed ? " -> " : " -- ");
    if (ast.children.length === 0) {
      yield ";";
    } else {
      yield " [";
      yield* context.printChildren(ast.children);
      yield "];";
    }
  }
};
const GraphPrintPlugin = {
  match(ast) {
    return ast.type === "Graph";
  },
  *print(context, ast) {
    context.directed = ast.directed;
    if (ast.strict) {
      yield "strict ";
    }
    yield ast.directed ? "digraph " : "graph ";
    if (ast.id) {
      yield* context.print(ast.id);
      yield " ";
    }
    yield "{";
    if (ast.children.length >= 1) {
      yield* context.printChildren(ast.children);
    }
    yield "}";
  }
};
const escape = (value) => value.replace(/(?<!\\)"|[\r\n]/g, escapeReplacer);
const escapeMap = {
  "\r": String.raw`\r`,
  "\n": String.raw`\n`,
  '"': String.raw`\"`
};
function escapeReplacer(match) {
  return escapeMap[match];
}
const LiteralPrintPlugin = {
  match(ast) {
    return ast.type === "Literal";
  },
  *print(context, ast) {
    switch (ast.quoted) {
      case "html":
        yield "<";
        yield ast.value;
        yield ">";
        return;
      case true:
        yield '"';
        yield escape(ast.value);
        yield '"';
        return;
      default:
        yield ast.value;
        return;
    }
  }
};
const NodePrintPlugin = {
  match(ast) {
    return ast.type === "Node";
  },
  *print(context, ast) {
    yield* context.print(ast.id);
    if (ast.children.length >= 1) {
      yield " [";
      yield* context.printChildren(ast.children);
      yield "]";
    }
    yield ";";
  }
};
const NodeRefGroupPrintPlugin = {
  match(ast) {
    return ast.type === "NodeRefGroup";
  },
  *print(context, ast) {
    yield "{";
    yield* context.join(ast.children, " ");
    yield "}";
  }
};
const NodeRefPrintPlugin = {
  match(ast) {
    return ast.type === "NodeRef";
  },
  *print(context, ast) {
    yield* context.print(ast.id);
    if (ast.port) {
      yield ":";
      yield* context.print(ast.port);
    }
    if (ast.compass) {
      yield ":";
      yield* context.print(ast.compass);
    }
  }
};
const SubgraphPrintPlugin = {
  match(ast) {
    return ast.type === "Subgraph";
  },
  *print(context, ast) {
    yield "subgraph";
    if (ast.id) {
      yield " ";
      yield* context.print(ast.id);
    }
    yield " {";
    if (ast.children.length >= 1) {
      yield* context.printChildren(ast.children);
    }
    yield "}";
  }
};
const defaultPlugins$2 = [
  AttributeListPrintPlugin,
  AttributePrintPlugin,
  CommentPrintPlugin,
  DotPrintPlugin,
  EdgePrintPlugin,
  GraphPrintPlugin,
  LiteralPrintPlugin,
  NodePrintPlugin,
  NodeRefGroupPrintPlugin,
  NodeRefPrintPlugin,
  SubgraphPrintPlugin
];
class Printer {
  /**
   * @param options Options to be used when generating the DOT string.
   */
  constructor(options = {}) {
    this.options = options;
  }
  /** @internal */
  #plugins = [...defaultPlugins$2];
  /**
   * Generates a DOT string from an ASTNode.
   * @param ast The ASTNode to be converted into a DOT string.
   * @returns The DOT string generated from the ASTNode.
   */
  print(ast) {
    return Array.from(this.toChunks(ast)).join("");
  }
  toChunks(ast) {
    const plugins = [...this.#plugins];
    const {
      indentSize = 2,
      indentStyle = "space",
      endOfLine = "lf"
    } = this.options;
    const EOL = endOfLine === "crlf" ? "\r\n" : "\n";
    const PADDING = indentStyle === "space" ? " ".repeat(indentSize) : "	";
    const context = {
      directed: true,
      EOL,
      *printChildren(children) {
        yield* indent(function* () {
          yield EOL;
          yield* context.join(children, EOL);
        });
        yield EOL;
      },
      *print(a) {
        for (const plugin of plugins) {
          if (plugin.match(a)) {
            yield* plugin.print(this, a);
            return;
          }
        }
        throw new Error(
          `No matching plugin found for AST node: ${JSON.stringify(a)}`
        );
      },
      *join(array, separator) {
        const childrenLength = array.length;
        for (let i = 0; i < childrenLength; i++) {
          yield* context.print(array[i]);
          if (i < childrenLength - 1) {
            yield separator;
          }
        }
      }
    };
    return {
      [Symbol.iterator]: function* () {
        yield* context.print(ast);
      }
    };
    function* indent(tokens) {
      for (const token of tokens()) {
        yield token;
        if (token === EOL) {
          yield PADDING;
        }
      }
    }
  }
}
function stringify(ast, options) {
  const result = new Printer(options).print(ast);
  if (!result) {
    throw new Error();
  }
  return result;
}
const peggyParser = (
  // @generated by Peggy 4.0.3.
  //
  // https://peggyjs.org/
  // @ts-ignore
  function() {
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s = this.location.start;
        var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
        var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", offset_s.line.toString().length, " ");
          var line = src[s.line - 1];
          var last = s.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        // @ts-ignore
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        // @ts-ignore
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        // @ts-ignore
        any: function() {
          return "any character";
        },
        // @ts-ignore
        end: function() {
          return "end of input";
        },
        // @ts-ignore
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s) {
        return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s) {
        return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { Dot: peg$parseDot, Graph: peg$parseGraph, Subgraph: peg$parseSubgraph, Node: peg$parseNode, Edge: peg$parseEdge, AttributeList: peg$parseAttributeList, Attribute: peg$parseAttribute, ClusterStatements: peg$parseClusterStatements };
      var peg$startRuleFunction = peg$parseDot;
      var peg$c0 = "strict";
      var peg$c1 = "graph";
      var peg$c2 = "digraph";
      var peg$c3 = "{";
      var peg$c4 = "}";
      var peg$c6 = "node";
      var peg$c7 = "edge";
      var peg$c8 = "=";
      var peg$c9 = "[";
      var peg$c10 = "]";
      var peg$c11 = "->";
      var peg$c12 = "--";
      var peg$c13 = ":";
      var peg$c14 = "subgraph";
      var peg$c15 = "n";
      var peg$c16 = "ne";
      var peg$c17 = "e";
      var peg$c18 = "se";
      var peg$c19 = "s";
      var peg$c20 = "sw";
      var peg$c21 = "w";
      var peg$c22 = "nw";
      var peg$c23 = '"';
      var peg$c24 = "/*";
      var peg$c25 = "*/";
      var peg$c26 = "//";
      var peg$c27 = "#";
      var peg$c28 = "-";
      var peg$c29 = ".";
      var peg$c30 = "<";
      var peg$c31 = ">";
      var peg$c32 = "\\";
      var peg$c33 = "\n";
      var peg$c34 = "\r\n";
      var peg$r0 = /^[,;]/;
      var peg$r1 = /^[$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376-\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E-\u066F\u0671-\u06D3\u06D5\u06E5-\u06E6\u06EE-\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4-\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0-\u0AE1\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B35-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58-\u0C59\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0-\u0CE1\u0CF1-\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32-\u0E33\u0E40-\u0E46\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065-\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE-\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5-\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A-\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5-\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40-\uFB41\uFB43-\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/;
      var peg$r2 = /^[$0-9A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376-\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u0660-\u0669\u066E-\u066F\u0671-\u06D3\u06D5\u06E5-\u06E6\u06EE-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07C0-\u07EA\u07F4-\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC-\u09DD\u09DF-\u09E1\u09E6-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A66-\u0A6F\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0-\u0AE1\u0AE6-\u0AEF\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B35-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B66-\u0B6F\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0BE6-\u0BEF\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58-\u0C59\u0C60-\u0C61\u0C66-\u0C6F\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0-\u0CE1\u0CE6-\u0CEF\u0CF1-\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60-\u0D61\u0D66-\u0D6F\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32-\u0E33\u0E40-\u0E46\u0E50-\u0E59\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F20-\u0F29\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F-\u1049\u1050-\u1055\u105A-\u105D\u1061\u1065-\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u17E0-\u17E9\u1810-\u1819\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u19D0-\u19D9\u1A00-\u1A16\u1A20-\u1A54\u1A80-\u1A89\u1A90-\u1A99\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B50-\u1B59\u1B83-\u1BA0\u1BAE-\u1BE5\u1C00-\u1C23\u1C40-\u1C49\u1C4D-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5-\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8D0-\uA8D9\uA8F2-\uA8F7\uA8FB\uA900-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF-\uA9D9\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5-\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40-\uFB41\uFB43-\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/;
      var peg$r3 = /^[0-9]/;
      var peg$r4 = /^[<>]/;
      var peg$r5 = /^[\n\r"\u2028-\u2029]/;
      var peg$r7 = /^[\r\u2028-\u2029]/;
      var peg$r9 = /^[\t-\n\r ]/;
      var peg$r10 = /^[\n\r]/;
      var peg$r11 = /^[ \t]/;
      var peg$e0 = peg$literalExpectation("strict", true);
      var peg$e1 = peg$literalExpectation("graph", true);
      var peg$e2 = peg$literalExpectation("digraph", true);
      var peg$e3 = peg$literalExpectation("{", false);
      var peg$e4 = peg$literalExpectation("}", false);
      var peg$e5 = peg$literalExpectation(";", false);
      var peg$e6 = peg$literalExpectation("node", true);
      var peg$e7 = peg$literalExpectation("edge", true);
      var peg$e8 = peg$literalExpectation("=", false);
      var peg$e9 = peg$classExpectation([",", ";"], false, false);
      var peg$e10 = peg$literalExpectation("[", false);
      var peg$e11 = peg$literalExpectation("]", false);
      var peg$e12 = peg$literalExpectation("->", false);
      var peg$e13 = peg$literalExpectation("--", false);
      var peg$e14 = peg$otherExpectation("port");
      var peg$e15 = peg$literalExpectation(":", false);
      var peg$e16 = peg$literalExpectation("subgraph", true);
      var peg$e17 = peg$literalExpectation("n", false);
      var peg$e18 = peg$literalExpectation("ne", false);
      var peg$e19 = peg$literalExpectation("e", false);
      var peg$e20 = peg$literalExpectation("se", false);
      var peg$e21 = peg$literalExpectation("s", false);
      var peg$e22 = peg$literalExpectation("sw", false);
      var peg$e23 = peg$literalExpectation("w", false);
      var peg$e24 = peg$literalExpectation("nw", false);
      var peg$e25 = peg$literalExpectation('"', false);
      var peg$e26 = peg$literalExpectation("/*", false);
      var peg$e27 = peg$literalExpectation("*/", false);
      var peg$e28 = peg$anyExpectation();
      var peg$e29 = peg$literalExpectation("//", false);
      var peg$e30 = peg$literalExpectation("#", false);
      var peg$e31 = peg$otherExpectation("UNICODE_STRING");
      var peg$e32 = peg$classExpectation(["$", ["A", "Z"], "_", ["a", "z"], "ª", "µ", "º", ["À", "Ö"], ["Ø", "ö"], ["ø", "ˁ"], ["ˆ", "ˑ"], ["ˠ", "ˤ"], "ˬ", "ˮ", ["Ͱ", "ʹ"], ["Ͷ", "ͷ"], ["ͺ", "ͽ"], "Ά", ["Έ", "Ί"], "Ό", ["Ύ", "Ρ"], ["Σ", "ϵ"], ["Ϸ", "ҁ"], ["Ҋ", "ԧ"], ["Ա", "Ֆ"], "ՙ", ["ա", "և"], ["א", "ת"], ["װ", "ײ"], ["ؠ", "ي"], ["ٮ", "ٯ"], ["ٱ", "ۓ"], "ە", ["ۥ", "ۦ"], ["ۮ", "ۯ"], ["ۺ", "ۼ"], "ۿ", "ܐ", ["ܒ", "ܯ"], ["ݍ", "ޥ"], "ޱ", ["ߊ", "ߪ"], ["ߴ", "ߵ"], "ߺ", ["ࠀ", "ࠕ"], "ࠚ", "ࠤ", "ࠨ", ["ࡀ", "ࡘ"], "ࢠ", ["ࢢ", "ࢬ"], ["ऄ", "ह"], "ऽ", "ॐ", ["क़", "ॡ"], ["ॱ", "ॷ"], ["ॹ", "ॿ"], ["অ", "ঌ"], ["এ", "ঐ"], ["ও", "ন"], ["প", "র"], "ল", ["শ", "হ"], "ঽ", "ৎ", ["ড়", "ঢ়"], ["য়", "ৡ"], ["ৰ", "ৱ"], ["ਅ", "ਊ"], ["ਏ", "ਐ"], ["ਓ", "ਨ"], ["ਪ", "ਰ"], ["ਲ", "ਲ਼"], ["ਵ", "ਸ਼"], ["ਸ", "ਹ"], ["ਖ਼", "ੜ"], "ਫ਼", ["ੲ", "ੴ"], ["અ", "ઍ"], ["એ", "ઑ"], ["ઓ", "ન"], ["પ", "ર"], ["લ", "ળ"], ["વ", "હ"], "ઽ", "ૐ", ["ૠ", "ૡ"], ["ଅ", "ଌ"], ["ଏ", "ଐ"], ["ଓ", "ନ"], ["ପ", "ର"], ["ଲ", "ଳ"], ["ଵ", "ହ"], "ଽ", ["ଡ଼", "ଢ଼"], ["ୟ", "ୡ"], "ୱ", "ஃ", ["அ", "ஊ"], ["எ", "ஐ"], ["ஒ", "க"], ["ங", "ச"], "ஜ", ["ஞ", "ட"], ["ண", "த"], ["ந", "ப"], ["ம", "ஹ"], "ௐ", ["అ", "ఌ"], ["ఎ", "ఐ"], ["ఒ", "న"], ["ప", "ళ"], ["వ", "హ"], "ఽ", ["ౘ", "ౙ"], ["ౠ", "ౡ"], ["ಅ", "ಌ"], ["ಎ", "ಐ"], ["ಒ", "ನ"], ["ಪ", "ಳ"], ["ವ", "ಹ"], "ಽ", "ೞ", ["ೠ", "ೡ"], ["ೱ", "ೲ"], ["അ", "ഌ"], ["എ", "ഐ"], ["ഒ", "ഺ"], "ഽ", "ൎ", ["ൠ", "ൡ"], ["ൺ", "ൿ"], ["අ", "ඖ"], ["ක", "න"], ["ඳ", "ර"], "ල", ["ව", "ෆ"], ["ก", "ะ"], ["า", "ำ"], ["เ", "ๆ"], ["ກ", "ຂ"], "ຄ", ["ງ", "ຈ"], "ຊ", "ຍ", ["ດ", "ທ"], ["ນ", "ຟ"], ["ມ", "ຣ"], "ລ", "ວ", ["ສ", "ຫ"], ["ອ", "ະ"], ["າ", "ຳ"], "ຽ", ["ເ", "ໄ"], "ໆ", ["ໜ", "ໟ"], "ༀ", ["ཀ", "ཇ"], ["ཉ", "ཬ"], ["ྈ", "ྌ"], ["က", "ဪ"], "ဿ", ["ၐ", "ၕ"], ["ၚ", "ၝ"], "ၡ", ["ၥ", "ၦ"], ["ၮ", "ၰ"], ["ၵ", "ႁ"], "ႎ", ["Ⴀ", "Ⴥ"], "Ⴧ", "Ⴭ", ["ა", "ჺ"], ["ჼ", "ቈ"], ["ቊ", "ቍ"], ["ቐ", "ቖ"], "ቘ", ["ቚ", "ቝ"], ["በ", "ኈ"], ["ኊ", "ኍ"], ["ነ", "ኰ"], ["ኲ", "ኵ"], ["ኸ", "ኾ"], "ዀ", ["ዂ", "ዅ"], ["ወ", "ዖ"], ["ዘ", "ጐ"], ["ጒ", "ጕ"], ["ጘ", "ፚ"], ["ᎀ", "ᎏ"], ["Ꭰ", "Ᏼ"], ["ᐁ", "ᙬ"], ["ᙯ", "ᙿ"], ["ᚁ", "ᚚ"], ["ᚠ", "ᛪ"], ["ᛮ", "ᛰ"], ["ᜀ", "ᜌ"], ["ᜎ", "ᜑ"], ["ᜠ", "ᜱ"], ["ᝀ", "ᝑ"], ["ᝠ", "ᝬ"], ["ᝮ", "ᝰ"], ["ក", "ឳ"], "ៗ", "ៜ", ["ᠠ", "ᡷ"], ["ᢀ", "ᢨ"], "ᢪ", ["ᢰ", "ᣵ"], ["ᤀ", "ᤜ"], ["ᥐ", "ᥭ"], ["ᥰ", "ᥴ"], ["ᦀ", "ᦫ"], ["ᧁ", "ᧇ"], ["ᨀ", "ᨖ"], ["ᨠ", "ᩔ"], "ᪧ", ["ᬅ", "ᬳ"], ["ᭅ", "ᭋ"], ["ᮃ", "ᮠ"], ["ᮮ", "ᮯ"], ["ᮺ", "ᯥ"], ["ᰀ", "ᰣ"], ["ᱍ", "ᱏ"], ["ᱚ", "ᱽ"], ["ᳩ", "ᳬ"], ["ᳮ", "ᳱ"], ["ᳵ", "ᳶ"], ["ᴀ", "ᶿ"], ["Ḁ", "ἕ"], ["Ἐ", "Ἕ"], ["ἠ", "ὅ"], ["Ὀ", "Ὅ"], ["ὐ", "ὗ"], "Ὑ", "Ὓ", "Ὕ", ["Ὗ", "ώ"], ["ᾀ", "ᾴ"], ["ᾶ", "ᾼ"], "ι", ["ῂ", "ῄ"], ["ῆ", "ῌ"], ["ῐ", "ΐ"], ["ῖ", "Ί"], ["ῠ", "Ῥ"], ["ῲ", "ῴ"], ["ῶ", "ῼ"], "ⁱ", "ⁿ", ["ₐ", "ₜ"], "ℂ", "ℇ", ["ℊ", "ℓ"], "ℕ", ["ℙ", "ℝ"], "ℤ", "Ω", "ℨ", ["K", "ℭ"], ["ℯ", "ℹ"], ["ℼ", "ℿ"], ["ⅅ", "ⅉ"], "ⅎ", ["Ⅰ", "ↈ"], ["Ⰰ", "Ⱞ"], ["ⰰ", "ⱞ"], ["Ⱡ", "ⳤ"], ["Ⳬ", "ⳮ"], ["Ⳳ", "ⳳ"], ["ⴀ", "ⴥ"], "ⴧ", "ⴭ", ["ⴰ", "ⵧ"], "ⵯ", ["ⶀ", "ⶖ"], ["ⶠ", "ⶦ"], ["ⶨ", "ⶮ"], ["ⶰ", "ⶶ"], ["ⶸ", "ⶾ"], ["ⷀ", "ⷆ"], ["ⷈ", "ⷎ"], ["ⷐ", "ⷖ"], ["ⷘ", "ⷞ"], "ⸯ", ["々", "〇"], ["〡", "〩"], ["〱", "〵"], ["〸", "〼"], ["ぁ", "ゖ"], ["ゝ", "ゟ"], ["ァ", "ヺ"], ["ー", "ヿ"], ["ㄅ", "ㄭ"], ["ㄱ", "ㆎ"], ["ㆠ", "ㆺ"], ["ㇰ", "ㇿ"], ["㐀", "䶵"], ["一", "鿌"], ["ꀀ", "ꒌ"], ["ꓐ", "ꓽ"], ["ꔀ", "ꘌ"], ["ꘐ", "ꘟ"], ["ꘪ", "ꘫ"], ["Ꙁ", "ꙮ"], ["ꙿ", "ꚗ"], ["ꚠ", "ꛯ"], ["ꜗ", "ꜟ"], ["Ꜣ", "ꞈ"], ["Ꞌ", "ꞎ"], ["Ꞑ", "ꞓ"], ["Ꞡ", "Ɦ"], ["ꟸ", "ꠁ"], ["ꠃ", "ꠅ"], ["ꠇ", "ꠊ"], ["ꠌ", "ꠢ"], ["ꡀ", "ꡳ"], ["ꢂ", "ꢳ"], ["ꣲ", "ꣷ"], "ꣻ", ["ꤊ", "ꤥ"], ["ꤰ", "ꥆ"], ["ꥠ", "ꥼ"], ["ꦄ", "ꦲ"], "ꧏ", ["ꨀ", "ꨨ"], ["ꩀ", "ꩂ"], ["ꩄ", "ꩋ"], ["ꩠ", "ꩶ"], "ꩺ", ["ꪀ", "ꪯ"], "ꪱ", ["ꪵ", "ꪶ"], ["ꪹ", "ꪽ"], "ꫀ", "ꫂ", ["ꫛ", "ꫝ"], ["ꫠ", "ꫪ"], ["ꫲ", "ꫴ"], ["ꬁ", "ꬆ"], ["ꬉ", "ꬎ"], ["ꬑ", "ꬖ"], ["ꬠ", "ꬦ"], ["ꬨ", "ꬮ"], ["ꯀ", "ꯢ"], ["가", "힣"], ["ힰ", "ퟆ"], ["ퟋ", "ퟻ"], ["豈", "舘"], ["並", "龎"], ["ﬀ", "ﬆ"], ["ﬓ", "ﬗ"], "יִ", ["ײַ", "ﬨ"], ["שׁ", "זּ"], ["טּ", "לּ"], "מּ", ["נּ", "סּ"], ["ףּ", "פּ"], ["צּ", "ﮱ"], ["ﯓ", "ﴽ"], ["ﵐ", "ﶏ"], ["ﶒ", "ﷇ"], ["ﷰ", "ﷻ"], ["ﹰ", "ﹴ"], ["ﹶ", "ﻼ"], ["Ａ", "Ｚ"], ["ａ", "ｚ"], ["ｦ", "ﾾ"], ["ￂ", "ￇ"], ["ￊ", "ￏ"], ["ￒ", "ￗ"], ["ￚ", "ￜ"]], false, false);
      var peg$e33 = peg$classExpectation(["$", ["0", "9"], ["A", "Z"], "_", ["a", "z"], "ª", "µ", "º", ["À", "Ö"], ["Ø", "ö"], ["ø", "ˁ"], ["ˆ", "ˑ"], ["ˠ", "ˤ"], "ˬ", "ˮ", ["Ͱ", "ʹ"], ["Ͷ", "ͷ"], ["ͺ", "ͽ"], "Ά", ["Έ", "Ί"], "Ό", ["Ύ", "Ρ"], ["Σ", "ϵ"], ["Ϸ", "ҁ"], ["Ҋ", "ԧ"], ["Ա", "Ֆ"], "ՙ", ["ա", "և"], ["א", "ת"], ["װ", "ײ"], ["ؠ", "ي"], ["٠", "٩"], ["ٮ", "ٯ"], ["ٱ", "ۓ"], "ە", ["ۥ", "ۦ"], ["ۮ", "ۼ"], "ۿ", "ܐ", ["ܒ", "ܯ"], ["ݍ", "ޥ"], "ޱ", ["߀", "ߪ"], ["ߴ", "ߵ"], "ߺ", ["ࠀ", "ࠕ"], "ࠚ", "ࠤ", "ࠨ", ["ࡀ", "ࡘ"], "ࢠ", ["ࢢ", "ࢬ"], ["ऄ", "ह"], "ऽ", "ॐ", ["क़", "ॡ"], ["०", "९"], ["ॱ", "ॷ"], ["ॹ", "ॿ"], ["অ", "ঌ"], ["এ", "ঐ"], ["ও", "ন"], ["প", "র"], "ল", ["শ", "হ"], "ঽ", "ৎ", ["ড়", "ঢ়"], ["য়", "ৡ"], ["০", "ৱ"], ["ਅ", "ਊ"], ["ਏ", "ਐ"], ["ਓ", "ਨ"], ["ਪ", "ਰ"], ["ਲ", "ਲ਼"], ["ਵ", "ਸ਼"], ["ਸ", "ਹ"], ["ਖ਼", "ੜ"], "ਫ਼", ["੦", "੯"], ["ੲ", "ੴ"], ["અ", "ઍ"], ["એ", "ઑ"], ["ઓ", "ન"], ["પ", "ર"], ["લ", "ળ"], ["વ", "હ"], "ઽ", "ૐ", ["ૠ", "ૡ"], ["૦", "૯"], ["ଅ", "ଌ"], ["ଏ", "ଐ"], ["ଓ", "ନ"], ["ପ", "ର"], ["ଲ", "ଳ"], ["ଵ", "ହ"], "ଽ", ["ଡ଼", "ଢ଼"], ["ୟ", "ୡ"], ["୦", "୯"], "ୱ", "ஃ", ["அ", "ஊ"], ["எ", "ஐ"], ["ஒ", "க"], ["ங", "ச"], "ஜ", ["ஞ", "ட"], ["ண", "த"], ["ந", "ப"], ["ம", "ஹ"], "ௐ", ["௦", "௯"], ["అ", "ఌ"], ["ఎ", "ఐ"], ["ఒ", "న"], ["ప", "ళ"], ["వ", "హ"], "ఽ", ["ౘ", "ౙ"], ["ౠ", "ౡ"], ["౦", "౯"], ["ಅ", "ಌ"], ["ಎ", "ಐ"], ["ಒ", "ನ"], ["ಪ", "ಳ"], ["ವ", "ಹ"], "ಽ", "ೞ", ["ೠ", "ೡ"], ["೦", "೯"], ["ೱ", "ೲ"], ["അ", "ഌ"], ["എ", "ഐ"], ["ഒ", "ഺ"], "ഽ", "ൎ", ["ൠ", "ൡ"], ["൦", "൯"], ["ൺ", "ൿ"], ["අ", "ඖ"], ["ක", "න"], ["ඳ", "ර"], "ල", ["ව", "ෆ"], ["ก", "ะ"], ["า", "ำ"], ["เ", "ๆ"], ["๐", "๙"], ["ກ", "ຂ"], "ຄ", ["ງ", "ຈ"], "ຊ", "ຍ", ["ດ", "ທ"], ["ນ", "ຟ"], ["ມ", "ຣ"], "ລ", "ວ", ["ສ", "ຫ"], ["ອ", "ະ"], ["າ", "ຳ"], "ຽ", ["ເ", "ໄ"], "ໆ", ["໐", "໙"], ["ໜ", "ໟ"], "ༀ", ["༠", "༩"], ["ཀ", "ཇ"], ["ཉ", "ཬ"], ["ྈ", "ྌ"], ["က", "ဪ"], ["ဿ", "၉"], ["ၐ", "ၕ"], ["ၚ", "ၝ"], "ၡ", ["ၥ", "ၦ"], ["ၮ", "ၰ"], ["ၵ", "ႁ"], "ႎ", ["႐", "႙"], ["Ⴀ", "Ⴥ"], "Ⴧ", "Ⴭ", ["ა", "ჺ"], ["ჼ", "ቈ"], ["ቊ", "ቍ"], ["ቐ", "ቖ"], "ቘ", ["ቚ", "ቝ"], ["በ", "ኈ"], ["ኊ", "ኍ"], ["ነ", "ኰ"], ["ኲ", "ኵ"], ["ኸ", "ኾ"], "ዀ", ["ዂ", "ዅ"], ["ወ", "ዖ"], ["ዘ", "ጐ"], ["ጒ", "ጕ"], ["ጘ", "ፚ"], ["ᎀ", "ᎏ"], ["Ꭰ", "Ᏼ"], ["ᐁ", "ᙬ"], ["ᙯ", "ᙿ"], ["ᚁ", "ᚚ"], ["ᚠ", "ᛪ"], ["ᛮ", "ᛰ"], ["ᜀ", "ᜌ"], ["ᜎ", "ᜑ"], ["ᜠ", "ᜱ"], ["ᝀ", "ᝑ"], ["ᝠ", "ᝬ"], ["ᝮ", "ᝰ"], ["ក", "ឳ"], "ៗ", "ៜ", ["០", "៩"], ["᠐", "᠙"], ["ᠠ", "ᡷ"], ["ᢀ", "ᢨ"], "ᢪ", ["ᢰ", "ᣵ"], ["ᤀ", "ᤜ"], ["᥆", "ᥭ"], ["ᥰ", "ᥴ"], ["ᦀ", "ᦫ"], ["ᧁ", "ᧇ"], ["᧐", "᧙"], ["ᨀ", "ᨖ"], ["ᨠ", "ᩔ"], ["᪀", "᪉"], ["᪐", "᪙"], "ᪧ", ["ᬅ", "ᬳ"], ["ᭅ", "ᭋ"], ["᭐", "᭙"], ["ᮃ", "ᮠ"], ["ᮮ", "ᯥ"], ["ᰀ", "ᰣ"], ["᱀", "᱉"], ["ᱍ", "ᱽ"], ["ᳩ", "ᳬ"], ["ᳮ", "ᳱ"], ["ᳵ", "ᳶ"], ["ᴀ", "ᶿ"], ["Ḁ", "ἕ"], ["Ἐ", "Ἕ"], ["ἠ", "ὅ"], ["Ὀ", "Ὅ"], ["ὐ", "ὗ"], "Ὑ", "Ὓ", "Ὕ", ["Ὗ", "ώ"], ["ᾀ", "ᾴ"], ["ᾶ", "ᾼ"], "ι", ["ῂ", "ῄ"], ["ῆ", "ῌ"], ["ῐ", "ΐ"], ["ῖ", "Ί"], ["ῠ", "Ῥ"], ["ῲ", "ῴ"], ["ῶ", "ῼ"], "ⁱ", "ⁿ", ["ₐ", "ₜ"], "ℂ", "ℇ", ["ℊ", "ℓ"], "ℕ", ["ℙ", "ℝ"], "ℤ", "Ω", "ℨ", ["K", "ℭ"], ["ℯ", "ℹ"], ["ℼ", "ℿ"], ["ⅅ", "ⅉ"], "ⅎ", ["Ⅰ", "ↈ"], ["Ⰰ", "Ⱞ"], ["ⰰ", "ⱞ"], ["Ⱡ", "ⳤ"], ["Ⳬ", "ⳮ"], ["Ⳳ", "ⳳ"], ["ⴀ", "ⴥ"], "ⴧ", "ⴭ", ["ⴰ", "ⵧ"], "ⵯ", ["ⶀ", "ⶖ"], ["ⶠ", "ⶦ"], ["ⶨ", "ⶮ"], ["ⶰ", "ⶶ"], ["ⶸ", "ⶾ"], ["ⷀ", "ⷆ"], ["ⷈ", "ⷎ"], ["ⷐ", "ⷖ"], ["ⷘ", "ⷞ"], "ⸯ", ["々", "〇"], ["〡", "〩"], ["〱", "〵"], ["〸", "〼"], ["ぁ", "ゖ"], ["ゝ", "ゟ"], ["ァ", "ヺ"], ["ー", "ヿ"], ["ㄅ", "ㄭ"], ["ㄱ", "ㆎ"], ["ㆠ", "ㆺ"], ["ㇰ", "ㇿ"], ["㐀", "䶵"], ["一", "鿌"], ["ꀀ", "ꒌ"], ["ꓐ", "ꓽ"], ["ꔀ", "ꘌ"], ["ꘐ", "ꘫ"], ["Ꙁ", "ꙮ"], ["ꙿ", "ꚗ"], ["ꚠ", "ꛯ"], ["ꜗ", "ꜟ"], ["Ꜣ", "ꞈ"], ["Ꞌ", "ꞎ"], ["Ꞑ", "ꞓ"], ["Ꞡ", "Ɦ"], ["ꟸ", "ꠁ"], ["ꠃ", "ꠅ"], ["ꠇ", "ꠊ"], ["ꠌ", "ꠢ"], ["ꡀ", "ꡳ"], ["ꢂ", "ꢳ"], ["꣐", "꣙"], ["ꣲ", "ꣷ"], "ꣻ", ["꤀", "ꤥ"], ["ꤰ", "ꥆ"], ["ꥠ", "ꥼ"], ["ꦄ", "ꦲ"], ["ꧏ", "꧙"], ["ꨀ", "ꨨ"], ["ꩀ", "ꩂ"], ["ꩄ", "ꩋ"], ["꩐", "꩙"], ["ꩠ", "ꩶ"], "ꩺ", ["ꪀ", "ꪯ"], "ꪱ", ["ꪵ", "ꪶ"], ["ꪹ", "ꪽ"], "ꫀ", "ꫂ", ["ꫛ", "ꫝ"], ["ꫠ", "ꫪ"], ["ꫲ", "ꫴ"], ["ꬁ", "ꬆ"], ["ꬉ", "ꬎ"], ["ꬑ", "ꬖ"], ["ꬠ", "ꬦ"], ["ꬨ", "ꬮ"], ["ꯀ", "ꯢ"], ["꯰", "꯹"], ["가", "힣"], ["ힰ", "ퟆ"], ["ퟋ", "ퟻ"], ["豈", "舘"], ["並", "龎"], ["ﬀ", "ﬆ"], ["ﬓ", "ﬗ"], "יִ", ["ײַ", "ﬨ"], ["שׁ", "זּ"], ["טּ", "לּ"], "מּ", ["נּ", "סּ"], ["ףּ", "פּ"], ["צּ", "ﮱ"], ["ﯓ", "ﴽ"], ["ﵐ", "ﶏ"], ["ﶒ", "ﷇ"], ["ﷰ", "ﷻ"], ["ﹰ", "ﹴ"], ["ﹶ", "ﻼ"], ["０", "９"], ["Ａ", "Ｚ"], ["ａ", "ｚ"], ["ｦ", "ﾾ"], ["ￂ", "ￇ"], ["ￊ", "ￏ"], ["ￒ", "ￗ"], ["ￚ", "ￜ"]], false, false);
      var peg$e34 = peg$otherExpectation("NUMBER");
      var peg$e35 = peg$literalExpectation("-", false);
      var peg$e36 = peg$literalExpectation(".", false);
      var peg$e37 = peg$classExpectation([["0", "9"]], false, false);
      var peg$e38 = peg$literalExpectation("<", false);
      var peg$e39 = peg$literalExpectation(">", false);
      var peg$e40 = peg$classExpectation(["<", ">"], false, false);
      var peg$e41 = peg$classExpectation(["\n", "\r", '"', ["\u2028", "\u2029"]], false, false);
      var peg$e42 = peg$literalExpectation("\\", false);
      var peg$e44 = peg$otherExpectation("end of line");
      var peg$e45 = peg$literalExpectation("\n", false);
      var peg$e46 = peg$literalExpectation("\r\n", false);
      var peg$e47 = peg$classExpectation(["\r", ["\u2028", "\u2029"]], false, false);
      var peg$e50 = peg$otherExpectation("whitespace");
      var peg$e51 = peg$otherExpectation("WHITESPACE");
      var peg$e52 = peg$classExpectation([["	", "\n"], "\r", " "], false, false);
      var peg$e53 = peg$classExpectation(["\n", "\r"], false, false);
      var peg$e54 = peg$classExpectation([" ", "	"], false, false);
      var peg$f0 = function(v) {
        return v;
      };
      var peg$f1 = function(v) {
        return v;
      };
      var peg$f2 = function(v) {
        return v;
      };
      var peg$f3 = function(v) {
        return v;
      };
      var peg$f4 = function(v) {
        return v;
      };
      var peg$f5 = function(v) {
        return v;
      };
      var peg$f6 = function(v) {
        return v;
      };
      var peg$f7 = function(v) {
        return v;
      };
      var peg$f8 = function(v) {
        return v;
      };
      var peg$f9 = function(v) {
        return v;
      };
      var peg$f10 = function(c1, graph, c2) {
        return b.createElement("Dot", {}, [...c1, graph, ...c2]);
      };
      var peg$f11 = function(_strict, _kind, id, children) {
        const strict = !!_strict;
        const kind = _kind.toLowerCase();
        const directed = kind === "digraph";
        for (const edgeop of edgeops) {
          if (directed) {
            if (edgeop.operator !== "->") {
              error(`In digraph, it's necessary to describe with "->" operator to create edge.`, edgeop.location);
            }
          } else {
            if (edgeop.operator !== "--") {
              error(`In graph, it's necessary to describe with "--" operator to create edge.`, edgeop.location);
            }
          }
        }
        return b.createElement(
          // @ts-ignore
          "Graph",
          // @ts-ignore
          id !== null ? {
            // @ts-ignore
            id,
            // @ts-ignore
            directed,
            // @ts-ignore
            strict
          } : {
            // @ts-ignore
            directed,
            // @ts-ignore
            strict
          },
          // @ts-ignore
          children
        );
      };
      var peg$f12 = function(keyValue) {
        return b.createElement(
          // @ts-ignore
          "Attribute",
          {
            // @ts-ignore
            ...keyValue
          },
          []
        );
      };
      var peg$f13 = function(_kind, children) {
        return b.createElement(
          // @ts-ignore
          "AttributeList",
          {
            // @ts-ignore
            kind: `${_kind.slice(0, 1).toUpperCase()}${_kind.slice(1).toLowerCase()}`
          },
          // @ts-ignore
          children
        );
      };
      var peg$f14 = function(id, rhs, _children) {
        return b.createElement(
          // @ts-ignore
          // @ts-ignore
          "Edge",
          {
            // @ts-ignore
            targets: [id, ...rhs]
          },
          // @ts-ignore
          _children ?? []
        );
      };
      var peg$f15 = function(id, _children) {
        return b.createElement(
          // @ts-ignore
          "Node",
          {
            // @ts-ignore
            id
          },
          // @ts-ignore
          _children ?? []
        );
      };
      var peg$f16 = function(key, value) {
        return { key, value };
      };
      var peg$f17 = function(kv) {
        return b.createElement(
          // @ts-ignore
          "Attribute",
          {
            // @ts-ignore
            ...kv,
            // @ts-ignore
            location: location()
          },
          []
        );
      };
      var peg$f18 = function(list) {
        return list;
      };
      var peg$f19 = function(id, v) {
        return v;
      };
      var peg$f20 = function(id, rest) {
        return b.createElement("NodeRefGroup", {}, [id, ...rest]);
      };
      var peg$f21 = function(operator) {
        return { operator, location: location() };
      };
      var peg$f22 = function(edgeop, id, rest) {
        edgeops.push(edgeop);
        return [id].concat(rest || []);
      };
      var peg$f23 = function(id, port) {
        return b.createElement(
          // @ts-ignore
          "NodeRef",
          {
            // @ts-ignore
            id,
            // @ts-ignore
            ...port
          },
          []
        );
      };
      var peg$f24 = function(port, compass) {
        return compass;
      };
      var peg$f25 = function(port, compass) {
        if (["n", "ne", "e", "se", "s", "sw", "w", "nw"].includes(port)) {
          return { compass: port };
        } else if (compass) {
          return { port, compass };
        }
        return { port };
      };
      var peg$f26 = function(id) {
        return id;
      };
      var peg$f27 = function(id, _children) {
        const children = _children ?? [];
        return b.createElement("Subgraph", id ? { id } : {}, children);
      };
      var peg$f28 = function(value) {
        return { value, quoted: false };
      };
      var peg$f29 = function(value) {
        return { value, quoted: true };
      };
      var peg$f30 = function(v) {
        return b.createElement(
          // @ts-ignore
          "Literal",
          {
            // @ts-ignore
            ...v
          },
          []
        );
      };
      var peg$f31 = function(value) {
        return b.createElement(
          // @ts-ignore
          "Literal",
          {
            // @ts-ignore
            value,
            // @ts-ignore
            quoted: false
          },
          []
        );
      };
      var peg$f32 = function(v) {
        return v;
      };
      var peg$f33 = function(v) {
        return b.createElement(
          // @ts-ignore
          "Comment",
          {
            // @ts-ignore
            kind: "Block",
            // @ts-ignore
            value: dedent(v.join("").replace(/[ \t]*\*/g, ""))
          },
          []
        );
      };
      var peg$f34 = function(lines) {
        return b.createElement(
          // @ts-ignore
          "Comment",
          {
            // @ts-ignore
            kind: "Slash",
            // @ts-ignore
            value: dedent(lines.join("\n"))
          },
          []
        );
      };
      var peg$f35 = function(v) {
        return v;
      };
      var peg$f36 = function(v) {
        return v.join("");
      };
      var peg$f37 = function(lines) {
        return b.createElement(
          // @ts-ignore
          "Comment",
          {
            // @ts-ignore
            kind: "Macro",
            // @ts-ignore
            value: dedent(lines.join("\n"))
          },
          []
        );
      };
      var peg$f38 = function(v) {
        return v;
      };
      var peg$f39 = function(v) {
        return v.join("");
      };
      var peg$f40 = function(first, rest) {
        return first + rest.join("");
      };
      var peg$f41 = function(first, rest) {
        return first + rest;
      };
      var peg$f42 = function(n) {
        return text();
      };
      var peg$f43 = function(v) {
        return b.createElement(
          // @ts-ignore
          "Literal",
          {
            // @ts-ignore
            value: v.slice(1, v.length - 1),
            // @ts-ignore
            quoted: "html"
          },
          []
        );
      };
      var peg$f44 = function(v) {
        return "<" + v.join("") + ">";
      };
      var peg$f45 = function(v) {
        return v;
      };
      var peg$f46 = function(v) {
        return v.join("");
      };
      var peg$f47 = function(chars) {
        return b.createElement(
          // @ts-ignore
          "Literal",
          {
            // @ts-ignore
            value: chars.join(""),
            // @ts-ignore
            quoted: true
          },
          []
        );
      };
      var peg$f48 = function() {
        return text();
      };
      var peg$f49 = function(v) {
        return v[1] === '"' ? '"' : v[0] + v[1];
      };
      var peg$f50 = function() {
        return "";
      };
      var peg$currPos = options.peg$currPos | 0;
      var peg$savedPos = peg$currPos;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = peg$currPos;
      var peg$maxFailExpected = options.peg$maxFailExpected || [];
      var peg$silentFails = options.peg$silentFails | 0;
      var peg$result;
      if (options.startRule) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          if (pos >= peg$posDetailsCache.length) {
            p = peg$posDetailsCache.length - 1;
          } else {
            p = pos;
            while (!peg$posDetailsCache[--p]) {
            }
          }
          details = peg$posDetailsCache[p];
          details = {
            // @ts-ignore
            line: details.line,
            // @ts-ignore
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos, offset2) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        var res = {
          // @ts-ignore
          source: peg$source,
          // @ts-ignore
          start: {
            // @ts-ignore
            offset: startPos,
            // @ts-ignore
            line: startPosDetails.line,
            // @ts-ignore
            column: startPosDetails.column
          },
          // @ts-ignore
          end: {
            // @ts-ignore
            offset: endPos,
            // @ts-ignore
            line: endPosDetails.line,
            // @ts-ignore
            column: endPosDetails.column
          }
        };
        return res;
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          // @ts-ignore
          peg$SyntaxError.buildMessage(expected2, found),
          // @ts-ignore
          expected2,
          // @ts-ignore
          found,
          // @ts-ignore
          location2
        );
      }
      function peg$parseDot() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_dot();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f0(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseGraph() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_graph();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f1(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseNode() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_node();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f2(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseAttributeList() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_attributes();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f3(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseAttribute() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_attribute();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f4(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEdge() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_edge();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f5(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseSubgraph() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_subgraph();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f6(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseNodeRef() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_node_ref();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f7(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseAttibutesItem() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_attibutes_item();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f8(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseComment() {
        var s0, s2;
        s0 = peg$currPos;
        peg$parse__();
        s2 = peg$parse_comment();
        if (s2 !== peg$FAILED) {
          peg$parse__();
          peg$savedPos = s0;
          s0 = peg$f9(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseClusterStatements() {
        var s0, s1;
        s0 = [];
        s1 = peg$parseAttribute();
        if (s1 === peg$FAILED) {
          s1 = peg$parseAttributeList();
          if (s1 === peg$FAILED) {
            s1 = peg$parseEdge();
            if (s1 === peg$FAILED) {
              s1 = peg$parseSubgraph();
              if (s1 === peg$FAILED) {
                s1 = peg$parseNode();
                if (s1 === peg$FAILED) {
                  s1 = peg$parseComment();
                }
              }
            }
          }
        }
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parseAttribute();
          if (s1 === peg$FAILED) {
            s1 = peg$parseAttributeList();
            if (s1 === peg$FAILED) {
              s1 = peg$parseEdge();
              if (s1 === peg$FAILED) {
                s1 = peg$parseSubgraph();
                if (s1 === peg$FAILED) {
                  s1 = peg$parseNode();
                  if (s1 === peg$FAILED) {
                    s1 = peg$parseComment();
                  }
                }
              }
            }
          }
        }
        return s0;
      }
      function peg$parse_dot() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseComment();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseComment();
        }
        s2 = peg$parseGraph();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseComment();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseComment();
          }
          peg$savedPos = s0;
          s0 = peg$f10(s1, s2, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_graph() {
        var s0, s1, s3, s5, s7, s8, s10;
        s0 = peg$currPos;
        s1 = input.substr(peg$currPos, 6);
        if (s1.toLowerCase() === peg$c0) {
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        peg$parse_();
        s3 = input.substr(peg$currPos, 5);
        if (s3.toLowerCase() === peg$c1) {
          peg$currPos += 5;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s3 === peg$FAILED) {
          s3 = input.substr(peg$currPos, 7);
          if (s3.toLowerCase() === peg$c2) {
            peg$currPos += 7;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
        }
        if (s3 !== peg$FAILED) {
          peg$parse_();
          s5 = peg$parse_literal();
          if (s5 === peg$FAILED) {
            s5 = null;
          }
          peg$parse__();
          if (input.charCodeAt(peg$currPos) === 123) {
            s7 = peg$c3;
            peg$currPos++;
          } else {
            s7 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e3);
            }
          }
          if (s7 !== peg$FAILED) {
            s8 = peg$parseClusterStatements();
            peg$parse__();
            if (input.charCodeAt(peg$currPos) === 125) {
              s10 = peg$c4;
              peg$currPos++;
            } else {
              s10 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e4);
              }
            }
            if (s10 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f11(s1, s3, s5, s8);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_attribute() {
        var s0, s1;
        s0 = peg$currPos;
        s1 = peg$parse_key_value();
        if (s1 !== peg$FAILED) {
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 59) {
            peg$currPos++;
          } else {
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
          peg$savedPos = s0;
          s0 = peg$f12(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_attributes() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = input.substr(peg$currPos, 5);
        if (s1.toLowerCase() === peg$c1) {
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s1 === peg$FAILED) {
          s1 = input.substr(peg$currPos, 4);
          if (s1.toLowerCase() === peg$c6) {
            peg$currPos += 4;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e6);
            }
          }
          if (s1 === peg$FAILED) {
            s1 = input.substr(peg$currPos, 4);
            if (s1.toLowerCase() === peg$c7) {
              peg$currPos += 4;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e7);
              }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_attribute_list();
          if (s2 !== peg$FAILED) {
            peg$parse_();
            if (input.charCodeAt(peg$currPos) === 59) {
              peg$currPos++;
            } else {
              if (peg$silentFails === 0) {
                peg$fail(peg$e5);
              }
            }
            peg$savedPos = s0;
            s0 = peg$f13(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_edge() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parse_edge_target();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_edge_rhs();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_attribute_list();
            if (s3 === peg$FAILED) {
              s3 = null;
            }
            peg$parse_();
            if (input.charCodeAt(peg$currPos) === 59) {
              peg$currPos++;
            } else {
              if (peg$silentFails === 0) {
                peg$fail(peg$e5);
              }
            }
            peg$savedPos = s0;
            s0 = peg$f14(s1, s2, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_node() {
        var s0, s1, s3;
        s0 = peg$currPos;
        s1 = peg$parse_literal();
        if (s1 !== peg$FAILED) {
          peg$parse_();
          s3 = peg$parse_attribute_list();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 59) {
            peg$currPos++;
          } else {
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
          peg$savedPos = s0;
          s0 = peg$f15(s1, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_key_value() {
        var s0, s1, s3, s5;
        s0 = peg$currPos;
        s1 = peg$parse_literal();
        if (s1 !== peg$FAILED) {
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 61) {
            s3 = peg$c8;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e8);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$parse_();
            s5 = peg$parse_literal();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f16(s1, s5);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_attibutes_item() {
        var s0, s1, s3;
        s0 = peg$currPos;
        s1 = peg$parse_key_value();
        if (s1 !== peg$FAILED) {
          peg$parse_();
          s3 = input.charAt(peg$currPos);
          if (peg$r0.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e9);
            }
          }
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f17(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_attribute_list() {
        var s0, s2, s3, s4, s5;
        s0 = peg$currPos;
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 91) {
          s2 = peg$c9;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseAttibutesItem();
          if (s4 === peg$FAILED) {
            s4 = peg$parseComment();
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseAttibutesItem();
            if (s4 === peg$FAILED) {
              s4 = peg$parseComment();
            }
          }
          s4 = peg$parse__();
          if (input.charCodeAt(peg$currPos) === 93) {
            s5 = peg$c10;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e11);
            }
          }
          if (s5 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f18(s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_edge_target_group() {
        var s0, s1, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
          s1 = peg$c3;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseNodeRef();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$currPos;
            s5 = input.charAt(peg$currPos);
            if (peg$r0.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e9);
              }
            }
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            s6 = peg$parseNodeRef();
            if (s6 !== peg$FAILED) {
              peg$savedPos = s4;
              s4 = peg$f19(s2, s6);
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$currPos;
              s5 = input.charAt(peg$currPos);
              if (peg$r0.test(s5)) {
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e9);
                }
              }
              if (s5 === peg$FAILED) {
                s5 = null;
              }
              s6 = peg$parseNodeRef();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s4 = peg$f19(s2, s6);
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            }
            s4 = input.charAt(peg$currPos);
            if (peg$r0.test(s4)) {
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e9);
              }
            }
            if (s4 === peg$FAILED) {
              s4 = null;
            }
            s5 = peg$parse__();
            if (input.charCodeAt(peg$currPos) === 125) {
              s6 = peg$c4;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e4);
              }
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f20(s2, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_edge_target() {
        var s0;
        s0 = peg$parse_edge_target_group();
        if (s0 === peg$FAILED) {
          s0 = peg$parseNodeRef();
        }
        return s0;
      }
      function peg$parse_edge_operator() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c11) {
          s1 = peg$c11;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c12) {
            s1 = peg$c12;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e13);
            }
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f21(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parse_edge_rhs() {
        var s0, s2, s4, s6;
        s0 = peg$currPos;
        peg$parse_();
        s2 = peg$parse_edge_operator();
        if (s2 !== peg$FAILED) {
          peg$parse_();
          s4 = peg$parse_edge_target();
          if (s4 !== peg$FAILED) {
            peg$parse_();
            s6 = peg$parse_edge_rhs();
            if (s6 === peg$FAILED) {
              s6 = null;
            }
            peg$savedPos = s0;
            s0 = peg$f22(s2, s4, s6);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_node_ref() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parse_literal();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_port();
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f23(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_port() {
        var s0, s1, s2, s3, s4, s5;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 58) {
          s1 = peg$c13;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e15);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_literal();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 58) {
              s4 = peg$c13;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e15);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_compass();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f24(s2, s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 === peg$FAILED) {
              s3 = null;
            }
            peg$savedPos = s0;
            s0 = peg$f25(s2, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        return s0;
      }
      function peg$parse_subgraph_id() {
        var s0, s1, s3;
        s0 = peg$currPos;
        s1 = input.substr(peg$currPos, 8);
        if (s1.toLowerCase() === peg$c14) {
          peg$currPos += 8;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$parse_();
          s3 = peg$parse_literal();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$parse_();
          peg$savedPos = s0;
          s0 = peg$f26(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_subgraph() {
        var s0, s1, s2, s3, s5;
        s0 = peg$currPos;
        s1 = peg$parse_subgraph_id();
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        if (input.charCodeAt(peg$currPos) === 123) {
          s2 = peg$c3;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseClusterStatements();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$parse__();
          if (input.charCodeAt(peg$currPos) === 125) {
            s5 = peg$c4;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e4);
            }
          }
          if (s5 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f27(s1, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_compass_keyword() {
        var s0;
        if (input.charCodeAt(peg$currPos) === 110) {
          s0 = peg$c15;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e17);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c16) {
            s0 = peg$c16;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e18);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 101) {
              s0 = peg$c17;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e19);
              }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c18) {
                s0 = peg$c18;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e20);
                }
              }
              if (s0 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 115) {
                  s0 = peg$c19;
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e21);
                  }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c20) {
                    s0 = peg$c20;
                    peg$currPos += 2;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e22);
                    }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 119) {
                      s0 = peg$c21;
                      peg$currPos++;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e23);
                      }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c22) {
                        s0 = peg$c22;
                        peg$currPos += 2;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e24);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return s0;
      }
      function peg$parse_compass() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$parse_compass_keyword();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s1;
          s2 = peg$f28(s2);
        }
        s1 = s2;
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 34) {
            s2 = peg$c23;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e25);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_compass_keyword();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 34) {
                s4 = peg$c23;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e25);
                }
              }
              if (s4 !== peg$FAILED) {
                peg$savedPos = s1;
                s1 = peg$f29(s3);
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f30(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parse_literal() {
        var s0, s1;
        s0 = peg$parseQUOTED_STRING();
        if (s0 === peg$FAILED) {
          s0 = peg$parseHTML_STRING();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parseSTRING();
            if (s1 === peg$FAILED) {
              s1 = peg$parseNUMBER_STRING();
              if (s1 === peg$FAILED) {
                s1 = peg$parseNUMBER();
              }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$f31(s1);
            }
            s0 = s1;
          }
        }
        return s0;
      }
      function peg$parse_comment() {
        var s0;
        s0 = peg$parse_block_comment();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_slash_comment();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_macro_comment();
          }
        }
        return s0;
      }
      function peg$parse_block_comment() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c24) {
          s1 = peg$c24;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e26);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          if (input.substr(peg$currPos, 2) === peg$c25) {
            s5 = peg$c25;
            peg$currPos += 2;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e27);
            }
          }
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e28);
              }
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f32(s5);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            if (input.substr(peg$currPos, 2) === peg$c25) {
              s5 = peg$c25;
              peg$currPos += 2;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e27);
              }
            }
            peg$silentFails--;
            if (s5 === peg$FAILED) {
              s4 = void 0;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e28);
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f32(s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          if (input.substr(peg$currPos, 2) === peg$c25) {
            s3 = peg$c25;
            peg$currPos += 2;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e27);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f33(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_slash_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_slash_comment_line();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_slash_comment_line();
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f34(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parse_slash_comment_line() {
        var s0, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        peg$parse_();
        if (input.substr(peg$currPos, 2) === peg$c26) {
          s2 = peg$c26;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e29);
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parse_newline();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e28);
              }
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s4;
              s4 = peg$f35(s6);
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parse_newline();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e28);
                }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s4 = peg$f35(s6);
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          s4 = peg$parse_newline();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f36(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_macro_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_macro_comment_line();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_macro_comment_line();
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f37(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parse_macro_comment_line() {
        var s0, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 35) {
          s2 = peg$c27;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e30);
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parse_newline();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e28);
              }
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s4;
              s4 = peg$f38(s6);
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parse_newline();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e28);
                }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s4 = peg$f38(s6);
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          s4 = peg$parse_newline();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f39(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseSTRING() {
        var s0, s1, s2, s3;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parseStringStart();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseStringPart();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseStringPart();
          }
          peg$savedPos = s0;
          s0 = peg$f40(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e31);
          }
        }
        return s0;
      }
      function peg$parseNUMBER_STRING() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseNUMBER();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseSTRING();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f41(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseStringStart() {
        var s0;
        s0 = input.charAt(peg$currPos);
        if (peg$r1.test(s0)) {
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e32);
          }
        }
        return s0;
      }
      function peg$parseStringPart() {
        var s0;
        s0 = input.charAt(peg$currPos);
        if (peg$r2.test(s0)) {
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e33);
          }
        }
        return s0;
      }
      function peg$parseNUMBER() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c28;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e35);
          }
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s4 = peg$c29;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e36);
          }
        }
        if (s4 !== peg$FAILED) {
          s5 = [];
          s6 = input.charAt(peg$currPos);
          if (peg$r3.test(s6)) {
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e37);
            }
          }
          if (s6 !== peg$FAILED) {
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = input.charAt(peg$currPos);
              if (peg$r3.test(s6)) {
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e37);
                }
              }
            }
          } else {
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = [];
          s5 = input.charAt(peg$currPos);
          if (peg$r3.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e37);
            }
          }
          if (s5 !== peg$FAILED) {
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = input.charAt(peg$currPos);
              if (peg$r3.test(s5)) {
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e37);
                }
              }
            }
          } else {
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 46) {
              s6 = peg$c29;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e36);
              }
            }
            if (s6 !== peg$FAILED) {
              s7 = [];
              s8 = input.charAt(peg$currPos);
              if (peg$r3.test(s8)) {
                peg$currPos++;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e37);
                }
              }
              while (s8 !== peg$FAILED) {
                s7.push(s8);
                s8 = input.charAt(peg$currPos);
                if (peg$r3.test(s8)) {
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e37);
                  }
                }
              }
              s6 = [s6, s7];
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f42();
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e34);
          }
        }
        return s0;
      }
      function peg$parseHTML_STRING() {
        var s0, s1;
        s0 = peg$currPos;
        s1 = peg$parsehtml_raw_string();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f43(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parsehtml_raw_string() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 60) {
          s1 = peg$c30;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e38);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsehtml_char();
          if (s3 === peg$FAILED) {
            s3 = peg$parsehtml_raw_string();
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsehtml_char();
            if (s3 === peg$FAILED) {
              s3 = peg$parsehtml_raw_string();
            }
          }
          if (input.charCodeAt(peg$currPos) === 62) {
            s3 = peg$c31;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e39);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f44(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsehtml_char() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$currPos;
        peg$silentFails++;
        s4 = input.charAt(peg$currPos);
        if (peg$r4.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e40);
          }
        }
        peg$silentFails--;
        if (s4 === peg$FAILED) {
          s3 = void 0;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e28);
            }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s2;
            s2 = peg$f45(s4);
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$currPos;
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = input.charAt(peg$currPos);
            if (peg$r4.test(s4)) {
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e40);
              }
            }
            peg$silentFails--;
            if (s4 === peg$FAILED) {
              s3 = void 0;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e28);
                }
              }
              if (s4 !== peg$FAILED) {
                peg$savedPos = s2;
                s2 = peg$f45(s4);
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f46(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseQUOTED_STRING() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
          s1 = peg$c23;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e25);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseDoubleStringCharacter();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDoubleStringCharacter();
          }
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c23;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e25);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f47(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseDoubleStringCharacter() {
        var s0, s1, s2;
        s0 = peg$parseQuoteEscape();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          peg$silentFails++;
          s2 = input.charAt(peg$currPos);
          if (peg$r5.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e41);
            }
          }
          peg$silentFails--;
          if (s2 === peg$FAILED) {
            s1 = void 0;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseSourceCharacter();
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f48();
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$parseLineContinuation();
          }
        }
        return s0;
      }
      function peg$parseQuoteEscape() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s2 = peg$c32;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e42);
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e28);
            }
          }
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f49(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseLineContinuation() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s1 = peg$c32;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e42);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseLineTerminatorSequence();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f50();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseLineTerminatorSequence() {
        var s0;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 10) {
          s0 = peg$c33;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e45);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c34) {
            s0 = peg$c34;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e46);
            }
          }
          if (s0 === peg$FAILED) {
            s0 = input.charAt(peg$currPos);
            if (peg$r7.test(s0)) {
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e47);
              }
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          if (peg$silentFails === 0) {
            peg$fail(peg$e44);
          }
        }
        return s0;
      }
      function peg$parseSourceCharacter() {
        var s0;
        if (input.length > peg$currPos) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e28);
          }
        }
        return s0;
      }
      function peg$parse_() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        s1 = peg$parse_whitespace();
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parse_whitespace();
        }
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e50);
        }
        return s0;
      }
      function peg$parse__() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        s1 = input.charAt(peg$currPos);
        if (peg$r9.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e52);
          }
        }
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = input.charAt(peg$currPos);
          if (peg$r9.test(s1)) {
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e52);
            }
          }
        }
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e51);
        }
        return s0;
      }
      function peg$parse_newline() {
        var s0;
        s0 = input.charAt(peg$currPos);
        if (peg$r10.test(s0)) {
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e53);
          }
        }
        return s0;
      }
      function peg$parse_whitespace() {
        var s0;
        s0 = input.charAt(peg$currPos);
        if (peg$r11.test(s0)) {
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e54);
          }
        }
        return s0;
      }
      function dedent(value) {
        const str = value.trim();
        const matches = str.match(/\n([\t ]+|(?!\s).)/g);
        if (matches) {
          const indentLengths = matches.map((match) => match.match(/[\t ]/g)?.length ?? 0);
          const pattern = new RegExp(`
[	 ]{${Math.min(...indentLengths)}}`, "g");
          return str.replace(pattern, "\n");
        }
        return str;
      }
      const edgeops = [];
      const b = new Builder({
        // @ts-ignore
        locationFunction: location
      });
      peg$result = peg$startRuleFunction();
      if (options.peg$library) {
        return (
          /** @type {any} */
          {
            // @ts-ignore
            peg$result,
            // @ts-ignore
            peg$currPos,
            // @ts-ignore
            peg$FAILED,
            // @ts-ignore
            peg$maxFailExpected,
            // @ts-ignore
            peg$maxFailPos
          }
        );
      }
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          // @ts-ignore
          peg$maxFailExpected,
          // @ts-ignore
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          // @ts-ignore
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      StartRules: ["Dot", "Graph", "Subgraph", "Node", "Edge", "AttributeList", "Attribute", "ClusterStatements"],
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
peggyParser.SyntaxError.prototype.name = "PeggySyntaxError";
const parse$1 = peggyParser.parse;
const PeggySyntaxError = peggyParser.SyntaxError;
function parse(input, options) {
  try {
    return parse$1(input, options);
  } catch (e) {
    if (e instanceof PeggySyntaxError) {
      throw new DotSyntaxError(e.message, {
        cause: e
      });
    }
    throw new Error("Unexpected parse error", {
      cause: e
    });
  }
}
class DotSyntaxError extends SyntaxError {
  constructor(...args) {
    super(...args);
    this.name = "DotSyntaxError";
  }
}
function convertAttribute(key, value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const isHTMLLike = /^<.+>$/ms.test(trimmed);
    if (isHTMLLike) {
      return createElement(
        "Attribute",
        {
          key: createElement("Literal", { value: key, quoted: false }, []),
          value: createElement(
            "Literal",
            { value: trimmed.slice(1, trimmed.length - 1), quoted: "html" },
            []
          )
        },
        []
      );
    }
    return createElement(
      "Attribute",
      {
        key: createElement("Literal", { value: key, quoted: false }, []),
        value: createElement("Literal", { value, quoted: true }, [])
      },
      []
    );
  }
  return createElement(
    "Attribute",
    {
      key: createElement("Literal", { value: key, quoted: false }, []),
      value: createElement(
        "Literal",
        { value: String(value), quoted: false },
        []
      )
    },
    []
  );
}
function convertComment(value, kind) {
  return createElement(
    "Comment",
    {
      kind,
      value
    },
    []
  );
}
function convertClusterChildren(context, model) {
  return Array.from(
    function* () {
      for (const [key, value] of model.values) {
        yield convertAttribute(key, value);
      }
      for (const attrs of Object.values(model.attributes)) {
        if (attrs.size > 0) {
          if (attrs.comment) {
            yield convertComment(attrs.comment, context.commentKind);
          }
          yield context.convert(attrs);
        }
      }
      for (const node of model.nodes) {
        if (node.comment) {
          yield convertComment(node.comment, context.commentKind);
        }
        yield context.convert(node);
      }
      for (const subgraph of model.subgraphs) {
        if (subgraph.comment) {
          yield convertComment(subgraph.comment, context.commentKind);
        }
        yield context.convert(subgraph);
      }
      for (const edge of model.edges) {
        if (edge.comment) {
          yield convertComment(edge.comment, context.commentKind);
        }
        yield context.convert(edge);
      }
    }()
  );
}
const AttributeListPlugin = {
  match(model) {
    return model.$$type === "AttributeList";
  },
  convert(context, model) {
    return createElement(
      "AttributeList",
      {
        kind: model.$$kind
      },
      model.values.map(([key, value]) => convertAttribute(key, value))
    );
  }
};
const EdgePlugin$1 = {
  match(model) {
    return model.$$type === "Edge";
  },
  convert(context, model) {
    return createElement(
      "Edge",
      {
        targets: model.targets.map((target) => {
          if (isNodeModel(target)) {
            return createElement(
              "NodeRef",
              {
                id: createElement(
                  "Literal",
                  {
                    value: target.id,
                    quoted: true
                  },
                  []
                )
              },
              []
            );
          }
          if (isForwardRefNode(target)) {
            return createElement(
              "NodeRef",
              {
                id: createElement(
                  "Literal",
                  {
                    value: target.id,
                    quoted: true
                  },
                  []
                ),
                port: target.port ? createElement(
                  "Literal",
                  {
                    value: target.port,
                    quoted: true
                  },
                  []
                ) : void 0,
                compass: target.compass ? createElement(
                  "Literal",
                  {
                    value: target.compass,
                    quoted: true
                  },
                  []
                ) : void 0
              },
              []
            );
          }
          return createElement(
            "NodeRefGroup",
            {},
            target.map((n) => {
              if (isNodeModel(n)) {
                return createElement(
                  "NodeRef",
                  {
                    id: createElement(
                      "Literal",
                      {
                        value: n.id,
                        quoted: true
                      },
                      []
                    )
                  },
                  []
                );
              }
              return createElement(
                "NodeRef",
                {
                  id: createElement(
                    "Literal",
                    {
                      value: n.id,
                      quoted: true
                    },
                    []
                  ),
                  port: n.port ? createElement(
                    "Literal",
                    {
                      value: n.port,
                      quoted: true
                    },
                    []
                  ) : void 0,
                  compass: n.compass ? createElement(
                    "Literal",
                    {
                      value: n.compass,
                      quoted: true
                    },
                    []
                  ) : void 0
                },
                []
              );
            })
          );
        })
      },
      [
        ...model.attributes.comment ? [convertComment(model.attributes.comment, context.commentKind)] : [],
        ...model.attributes.values.map(
          ([key, value]) => convertAttribute(key, value)
        )
      ]
    );
  }
};
const GraphPlugin$1 = {
  match(model) {
    return model.$$type === "Graph";
  },
  convert(context, model) {
    return createElement("Dot", {}, [
      ...model.comment ? [convertComment(model.comment, context.commentKind)] : [],
      createElement(
        "Graph",
        {
          directed: model.directed,
          strict: model.strict,
          id: model.id ? createElement(
            "Literal",
            {
              value: model.id,
              quoted: true
            },
            []
          ) : void 0
        },
        convertClusterChildren(context, model)
      )
    ]);
  }
};
const NodePlugin$1 = {
  match(model) {
    return model.$$type === "Node";
  },
  convert(context, model) {
    return createElement(
      "Node",
      {
        id: createElement(
          "Literal",
          {
            value: model.id,
            quoted: true
          },
          []
        )
      },
      [
        ...model.attributes.comment ? [convertComment(model.attributes.comment, context.commentKind)] : [],
        ...model.attributes.values.map(
          ([key, value]) => convertAttribute(key, value)
        )
      ]
    );
  }
};
const SubgraphPlugin$1 = {
  match(model) {
    return model.$$type === "Subgraph";
  },
  convert(context, model) {
    return createElement(
      "Subgraph",
      {
        id: model.id ? createElement(
          "Literal",
          {
            value: model.id,
            quoted: true
          },
          []
        ) : void 0
      },
      convertClusterChildren(context, model)
    );
  }
};
const defaultPlugins$1 = [
  AttributeListPlugin,
  EdgePlugin$1,
  NodePlugin$1,
  GraphPlugin$1,
  SubgraphPlugin$1
];
class FromModelConverter {
  constructor(options = {}) {
    this.options = options;
  }
  /** @hidden */
  #plugins = [...defaultPlugins$1];
  /**
   * Converts a DotObjectModel into an AST.
   *
   * @param model The {@link DotObjectModel} to be converted.
   * @returns The AST generated from the model.
   */
  convert(model) {
    const plugins = [...this.#plugins];
    const { commentKind = "Slash" } = this.options;
    const context = {
      commentKind,
      convert(m) {
        for (const plugin of plugins) {
          if (plugin.match(m)) {
            return plugin.convert(context, m);
          }
        }
        throw Error();
      }
    };
    return context.convert(model);
  }
}
function fromModel(model, options) {
  return new FromModelConverter(options).convert(model);
}
class CommentHolder {
  comment = null;
  set(comment) {
    this.comment = comment;
  }
  reset() {
    this.comment = null;
  }
  apply(model, location) {
    if (location && this.comment?.location) {
      if (this.comment?.kind === "Block") {
        if (this.comment.location.end.line === location.start.line - 1) {
          model.comment = this.comment.value;
        }
      } else {
        if (this.comment.location.end.line === location.start.line) {
          model.comment = this.comment.value;
        }
      }
    } else {
      model.comment = this.comment?.value;
    }
    this.reset();
  }
}
const DotPlugin = {
  match(ast) {
    return ast.type === "Dot";
  },
  convert(context, ast) {
    const commentHolder = new CommentHolder();
    for (const stmt of ast.children) {
      switch (stmt.type) {
        case "Comment":
          commentHolder.set(stmt);
          break;
        case "Graph": {
          const graph = context.convert(stmt);
          commentHolder.apply(graph, stmt.location);
          return graph;
        }
      }
    }
    throw Error();
  }
};
function convertToEdgeTargetTuple(edge) {
  return edge.targets.map((t) => {
    switch (t.type) {
      case "NodeRef":
        return {
          id: t.id.value,
          port: t.port?.value,
          compass: t.compass?.value
        };
      case "NodeRefGroup":
        return t.children.map((t2) => ({
          id: t2.id.value,
          port: t2.port?.value,
          compass: t2.compass?.value
        }));
    }
  });
}
const EdgePlugin = {
  match(ast) {
    return ast.type === "Edge";
  },
  convert(context, ast) {
    const edge = new context.models.Edge(
      convertToEdgeTargetTuple(ast),
      ast.children.filter(
        (v) => v.type === "Attribute"
      ).reduce(
        (acc, curr) => {
          acc[curr.key.value] = curr.value.value;
          return acc;
        },
        {}
      )
    );
    return edge;
  }
};
function applyStatements(graph, statements) {
  const commentHolder = new CommentHolder();
  for (const stmt of statements) {
    switch (stmt.type) {
      case "Subgraph": {
        const subgraph = stmt.id ? graph.subgraph(stmt.id.value) : graph.subgraph();
        applyStatements(subgraph, stmt.children);
        commentHolder.apply(subgraph, stmt.location);
        break;
      }
      case "Attribute":
        graph.set(stmt.key.value, stmt.value.value);
        commentHolder.reset();
        break;
      case "Node":
        commentHolder.apply(
          graph.node(
            stmt.id.value,
            stmt.children.filter(
              (v) => v.type === "Attribute"
            ).reduce(
              (acc, curr) => {
                acc[curr.key.value] = curr.value.value;
                return acc;
              },
              {}
            )
          ),
          stmt.location
        );
        break;
      case "Edge":
        commentHolder.apply(
          graph.edge(
            convertToEdgeTargetTuple(stmt),
            stmt.children.filter(
              (v) => v.type === "Attribute"
            ).reduce(
              (acc, curr) => {
                acc[curr.key.value] = curr.value.value;
                return acc;
              },
              {}
            )
          ),
          stmt.location
        );
        break;
      case "AttributeList": {
        const attrs = stmt.children.filter(
          (v) => v.type === "Attribute"
        ).reduce(
          (acc, curr) => {
            acc[curr.key.value] = curr.value.value;
            return acc;
          },
          {}
        );
        switch (stmt.kind) {
          case "Edge":
            graph.edge(attrs);
            break;
          case "Node":
            graph.node(attrs);
            break;
          case "Graph":
            graph.graph(attrs);
            break;
        }
        commentHolder.reset();
        break;
      }
      case "Comment":
        commentHolder.set(stmt);
    }
  }
}
const GraphPlugin = {
  match(ast) {
    return ast.type === "Graph";
  },
  convert(context, ast) {
    const G = ast.directed ? context.models.Digraph : context.models.Graph;
    const graph = new G(ast.id?.value, ast.strict);
    applyStatements(graph, ast.children);
    return graph;
  }
};
const NodePlugin = {
  match(ast) {
    return ast.type === "Node";
  },
  convert(context, ast) {
    const node = new context.models.Node(
      ast.id.value,
      ast.children.filter(
        (v) => v.type === "Attribute"
      ).reduce(
        (acc, curr) => {
          acc[curr.key.value] = curr.value.value;
          return acc;
        },
        {}
      )
    );
    return node;
  }
};
const SubgraphPlugin = {
  match(ast) {
    return ast.type === "Subgraph";
  },
  convert(context, ast) {
    const subgraph = new context.models.Subgraph(ast.id?.value);
    applyStatements(subgraph, ast.children);
    return subgraph;
  }
};
const defaultPlugins = [
  NodePlugin,
  EdgePlugin,
  SubgraphPlugin,
  GraphPlugin,
  DotPlugin
];
class ToModelConverter {
  constructor(options = {}) {
    this.options = options;
  }
  /** @hidden */
  plugins = [
    ...defaultPlugins
  ];
  /**
   * Convert AST to Model.
   *
   * @param ast AST node.
   */
  convert(ast) {
    const plugins = [...this.plugins];
    const context = {
      models: createModelsContext(this.options.models ?? {}),
      convert(m) {
        for (const plugin of plugins) {
          if (plugin.match(m)) {
            return plugin.convert(context, m);
          }
        }
        throw Error();
      }
    };
    return context.convert(ast);
  }
}
function toModel(ast, options) {
  return new ToModelConverter(options).convert(ast);
}
export {
  Builder,
  DotSyntaxError,
  FromModelConverter,
  Printer,
  ToModelConverter,
  createElement,
  fromModel,
  parse,
  stringify,
  toModel
};
