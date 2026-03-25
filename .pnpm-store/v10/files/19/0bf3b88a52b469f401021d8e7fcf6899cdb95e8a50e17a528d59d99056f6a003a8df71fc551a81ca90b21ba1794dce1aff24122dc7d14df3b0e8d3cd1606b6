"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var ariaSnapshot_exports = {};
__export(ariaSnapshot_exports, {
  KeyParser: () => KeyParser,
  ParserError: () => ParserError,
  ariaNodesEqual: () => ariaNodesEqual,
  findNewNode: () => findNewNode,
  hasPointerCursor: () => hasPointerCursor,
  parseAriaSnapshot: () => parseAriaSnapshot,
  parseAriaSnapshotUnsafe: () => parseAriaSnapshotUnsafe,
  textValue: () => textValue
});
module.exports = __toCommonJS(ariaSnapshot_exports);
function ariaNodesEqual(a, b) {
  if (a.role !== b.role || a.name !== b.name)
    return false;
  if (!ariaPropsEqual(a, b) || hasPointerCursor(a) !== hasPointerCursor(b))
    return false;
  const aKeys = Object.keys(a.props);
  const bKeys = Object.keys(b.props);
  return aKeys.length === bKeys.length && aKeys.every((k) => a.props[k] === b.props[k]);
}
function hasPointerCursor(ariaNode) {
  return ariaNode.box.cursor === "pointer";
}
function ariaPropsEqual(a, b) {
  return a.active === b.active && a.checked === b.checked && a.disabled === b.disabled && a.expanded === b.expanded && a.selected === b.selected && a.level === b.level && a.pressed === b.pressed;
}
function parseAriaSnapshotUnsafe(yaml, text, options = {}) {
  const result = parseAriaSnapshot(yaml, text, options);
  if (result.errors.length)
    throw new Error(result.errors[0].message);
  return result.fragment;
}
function parseAriaSnapshot(yaml, text, options = {}) {
  const lineCounter = new yaml.LineCounter();
  const parseOptions = {
    keepSourceTokens: true,
    lineCounter,
    ...options
  };
  const yamlDoc = yaml.parseDocument(text, parseOptions);
  const errors = [];
  const convertRange = (range) => {
    return [lineCounter.linePos(range[0]), lineCounter.linePos(range[1])];
  };
  const addError = (error) => {
    errors.push({
      message: error.message,
      range: [lineCounter.linePos(error.pos[0]), lineCounter.linePos(error.pos[1])]
    });
  };
  const convertSeq = (container, seq) => {
    for (const item of seq.items) {
      const itemIsString = item instanceof yaml.Scalar && typeof item.value === "string";
      if (itemIsString) {
        const childNode = KeyParser.parse(item, parseOptions, errors);
        if (childNode) {
          container.children = container.children || [];
          container.children.push(childNode);
        }
        continue;
      }
      const itemIsMap = item instanceof yaml.YAMLMap;
      if (itemIsMap) {
        convertMap(container, item);
        continue;
      }
      errors.push({
        message: "Sequence items should be strings or maps",
        range: convertRange(item.range || seq.range)
      });
    }
  };
  const convertMap = (container, map) => {
    for (const entry of map.items) {
      container.children = container.children || [];
      const keyIsString = entry.key instanceof yaml.Scalar && typeof entry.key.value === "string";
      if (!keyIsString) {
        errors.push({
          message: "Only string keys are supported",
          range: convertRange(entry.key.range || map.range)
        });
        continue;
      }
      const key = entry.key;
      const value = entry.value;
      if (key.value === "text") {
        const valueIsString = value instanceof yaml.Scalar && typeof value.value === "string";
        if (!valueIsString) {
          errors.push({
            message: "Text value should be a string",
            range: convertRange(entry.value.range || map.range)
          });
          continue;
        }
        container.children.push({
          kind: "text",
          text: textValue(value.value)
        });
        continue;
      }
      if (key.value === "/children") {
        const valueIsString = value instanceof yaml.Scalar && typeof value.value === "string";
        if (!valueIsString || value.value !== "contain" && value.value !== "equal" && value.value !== "deep-equal") {
          errors.push({
            message: 'Strict value should be "contain", "equal" or "deep-equal"',
            range: convertRange(entry.value.range || map.range)
          });
          continue;
        }
        container.containerMode = value.value;
        continue;
      }
      if (key.value.startsWith("/")) {
        const valueIsString = value instanceof yaml.Scalar && typeof value.value === "string";
        if (!valueIsString) {
          errors.push({
            message: "Property value should be a string",
            range: convertRange(entry.value.range || map.range)
          });
          continue;
        }
        container.props = container.props ?? {};
        container.props[key.value.slice(1)] = textValue(value.value);
        continue;
      }
      const childNode = KeyParser.parse(key, parseOptions, errors);
      if (!childNode)
        continue;
      const valueIsScalar = value instanceof yaml.Scalar;
      if (valueIsScalar) {
        const type = typeof value.value;
        if (type !== "string" && type !== "number" && type !== "boolean") {
          errors.push({
            message: "Node value should be a string or a sequence",
            range: convertRange(entry.value.range || map.range)
          });
          continue;
        }
        container.children.push({
          ...childNode,
          children: [{
            kind: "text",
            text: textValue(String(value.value))
          }]
        });
        continue;
      }
      const valueIsSequence = value instanceof yaml.YAMLSeq;
      if (valueIsSequence) {
        container.children.push(childNode);
        convertSeq(childNode, value);
        continue;
      }
      errors.push({
        message: "Map values should be strings or sequences",
        range: convertRange(entry.value.range || map.range)
      });
    }
  };
  const fragment = { kind: "role", role: "fragment" };
  yamlDoc.errors.forEach(addError);
  if (errors.length)
    return { errors, fragment };
  if (!(yamlDoc.contents instanceof yaml.YAMLSeq)) {
    errors.push({
      message: 'Aria snapshot must be a YAML sequence, elements starting with " -"',
      range: yamlDoc.contents ? convertRange(yamlDoc.contents.range) : [{ line: 0, col: 0 }, { line: 0, col: 0 }]
    });
  }
  if (errors.length)
    return { errors, fragment };
  convertSeq(fragment, yamlDoc.contents);
  if (errors.length)
    return { errors, fragment: emptyFragment };
  if (fragment.children?.length === 1 && (!fragment.containerMode || fragment.containerMode === "contain"))
    return { fragment: fragment.children[0], errors: [] };
  return { fragment, errors: [] };
}
const emptyFragment = { kind: "role", role: "fragment" };
function normalizeWhitespace(text) {
  return text.replace(/[\u200b\u00ad]/g, "").replace(/[\r\n\s\t]+/g, " ").trim();
}
function textValue(value) {
  return {
    raw: value,
    normalized: normalizeWhitespace(value)
  };
}
class KeyParser {
  static parse(text, options, errors) {
    try {
      return new KeyParser(text.value)._parse();
    } catch (e) {
      if (e instanceof ParserError) {
        const message = options.prettyErrors === false ? e.message : e.message + ":\n\n" + text.value + "\n" + " ".repeat(e.pos) + "^\n";
        errors.push({
          message,
          range: [options.lineCounter.linePos(text.range[0]), options.lineCounter.linePos(text.range[0] + e.pos)]
        });
        return null;
      }
      throw e;
    }
  }
  constructor(input) {
    this._input = input;
    this._pos = 0;
    this._length = input.length;
  }
  _peek() {
    return this._input[this._pos] || "";
  }
  _next() {
    if (this._pos < this._length)
      return this._input[this._pos++];
    return null;
  }
  _eof() {
    return this._pos >= this._length;
  }
  _isWhitespace() {
    return !this._eof() && /\s/.test(this._peek());
  }
  _skipWhitespace() {
    while (this._isWhitespace())
      this._pos++;
  }
  _readIdentifier(type) {
    if (this._eof())
      this._throwError(`Unexpected end of input when expecting ${type}`);
    const start = this._pos;
    while (!this._eof() && /[a-zA-Z]/.test(this._peek()))
      this._pos++;
    return this._input.slice(start, this._pos);
  }
  _readString() {
    let result = "";
    let escaped = false;
    while (!this._eof()) {
      const ch = this._next();
      if (escaped) {
        result += ch;
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        return result;
      } else {
        result += ch;
      }
    }
    this._throwError("Unterminated string");
  }
  _throwError(message, offset = 0) {
    throw new ParserError(message, offset || this._pos);
  }
  _readRegex() {
    let result = "";
    let escaped = false;
    let insideClass = false;
    while (!this._eof()) {
      const ch = this._next();
      if (escaped) {
        result += ch;
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
        result += ch;
      } else if (ch === "/" && !insideClass) {
        return { pattern: result };
      } else if (ch === "[") {
        insideClass = true;
        result += ch;
      } else if (ch === "]" && insideClass) {
        result += ch;
        insideClass = false;
      } else {
        result += ch;
      }
    }
    this._throwError("Unterminated regex");
  }
  _readStringOrRegex() {
    const ch = this._peek();
    if (ch === '"') {
      this._next();
      return normalizeWhitespace(this._readString());
    }
    if (ch === "/") {
      this._next();
      return this._readRegex();
    }
    return null;
  }
  _readAttributes(result) {
    let errorPos = this._pos;
    while (true) {
      this._skipWhitespace();
      if (this._peek() === "[") {
        this._next();
        this._skipWhitespace();
        errorPos = this._pos;
        const flagName = this._readIdentifier("attribute");
        this._skipWhitespace();
        let flagValue = "";
        if (this._peek() === "=") {
          this._next();
          this._skipWhitespace();
          errorPos = this._pos;
          while (this._peek() !== "]" && !this._isWhitespace() && !this._eof())
            flagValue += this._next();
        }
        this._skipWhitespace();
        if (this._peek() !== "]")
          this._throwError("Expected ]");
        this._next();
        this._applyAttribute(result, flagName, flagValue || "true", errorPos);
      } else {
        break;
      }
    }
  }
  _parse() {
    this._skipWhitespace();
    const role = this._readIdentifier("role");
    this._skipWhitespace();
    const name = this._readStringOrRegex() || "";
    const result = { kind: "role", role, name };
    this._readAttributes(result);
    this._skipWhitespace();
    if (!this._eof())
      this._throwError("Unexpected input");
    return result;
  }
  _applyAttribute(node, key, value, errorPos) {
    if (key === "checked") {
      this._assert(value === "true" || value === "false" || value === "mixed", 'Value of "checked" attribute must be a boolean or "mixed"', errorPos);
      node.checked = value === "true" ? true : value === "false" ? false : "mixed";
      return;
    }
    if (key === "disabled") {
      this._assert(value === "true" || value === "false", 'Value of "disabled" attribute must be a boolean', errorPos);
      node.disabled = value === "true";
      return;
    }
    if (key === "expanded") {
      this._assert(value === "true" || value === "false", 'Value of "expanded" attribute must be a boolean', errorPos);
      node.expanded = value === "true";
      return;
    }
    if (key === "active") {
      this._assert(value === "true" || value === "false", 'Value of "active" attribute must be a boolean', errorPos);
      node.active = value === "true";
      return;
    }
    if (key === "level") {
      this._assert(!isNaN(Number(value)), 'Value of "level" attribute must be a number', errorPos);
      node.level = Number(value);
      return;
    }
    if (key === "pressed") {
      this._assert(value === "true" || value === "false" || value === "mixed", 'Value of "pressed" attribute must be a boolean or "mixed"', errorPos);
      node.pressed = value === "true" ? true : value === "false" ? false : "mixed";
      return;
    }
    if (key === "selected") {
      this._assert(value === "true" || value === "false", 'Value of "selected" attribute must be a boolean', errorPos);
      node.selected = value === "true";
      return;
    }
    this._assert(false, `Unsupported attribute [${key}]`, errorPos);
  }
  _assert(value, message, valuePos) {
    if (!value)
      this._throwError(message || "Assertion error", valuePos);
  }
}
class ParserError extends Error {
  constructor(message, pos) {
    super(message);
    this.pos = pos;
  }
}
function findNewNode(from, to) {
  function fillMap(root, map, position) {
    let size = 1;
    let childPosition = position + size;
    for (const child of root.children || []) {
      if (typeof child === "string") {
        size++;
        childPosition++;
      } else {
        size += fillMap(child, map, childPosition);
        childPosition += size;
      }
    }
    if (!["none", "presentation", "fragment", "iframe", "generic"].includes(root.role) && root.name) {
      let byRole = map.get(root.role);
      if (!byRole) {
        byRole = /* @__PURE__ */ new Map();
        map.set(root.role, byRole);
      }
      const existing = byRole.get(root.name);
      const sizeAndPosition = size * 100 - position;
      if (!existing || existing.sizeAndPosition < sizeAndPosition)
        byRole.set(root.name, { node: root, sizeAndPosition });
    }
    return size;
  }
  const fromMap = /* @__PURE__ */ new Map();
  if (from)
    fillMap(from, fromMap, 0);
  const toMap = /* @__PURE__ */ new Map();
  fillMap(to, toMap, 0);
  const result = [];
  for (const [role, byRole] of toMap) {
    for (const [name, byName] of byRole) {
      const inFrom = fromMap.get(role)?.get(name);
      if (!inFrom)
        result.push(byName);
    }
  }
  result.sort((a, b) => b.sizeAndPosition - a.sizeAndPosition);
  return result[0]?.node;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  KeyParser,
  ParserError,
  ariaNodesEqual,
  findNewNode,
  hasPointerCursor,
  parseAriaSnapshot,
  parseAriaSnapshotUnsafe,
  textValue
});
