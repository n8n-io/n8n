"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  XmlNode: () => XmlNode,
  XmlText: () => XmlText
});
module.exports = __toCommonJS(index_exports);

// src/escape-attribute.ts
function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeAttribute, "escapeAttribute");

// src/escape-element.ts
function escapeElement(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r/g, "&#x0D;").replace(/\n/g, "&#x0A;").replace(/\u0085/g, "&#x85;").replace(/\u2028/, "&#x2028;");
}
__name(escapeElement, "escapeElement");

// src/XmlText.ts
var XmlText = class {
  constructor(value) {
    this.value = value;
  }
  static {
    __name(this, "XmlText");
  }
  toString() {
    return escapeElement("" + this.value);
  }
};

// src/XmlNode.ts
var XmlNode = class _XmlNode {
  constructor(name, children = []) {
    this.name = name;
    this.children = children;
  }
  static {
    __name(this, "XmlNode");
  }
  attributes = {};
  static of(name, childText, withName) {
    const node = new _XmlNode(name);
    if (childText !== void 0) {
      node.addChildNode(new XmlText(childText));
    }
    if (withName !== void 0) {
      node.withName(withName);
    }
    return node;
  }
  withName(name) {
    this.name = name;
    return this;
  }
  addAttribute(name, value) {
    this.attributes[name] = value;
    return this;
  }
  addChildNode(child) {
    this.children.push(child);
    return this;
  }
  removeAttribute(name) {
    delete this.attributes[name];
    return this;
  }
  /**
   * @internal
   * Alias of {@link XmlNode#withName(string)} for codegen brevity.
   */
  n(name) {
    this.name = name;
    return this;
  }
  /**
   * @internal
   * Alias of {@link XmlNode#addChildNode(string)} for codegen brevity.
   */
  c(child) {
    this.children.push(child);
    return this;
  }
  /**
   * @internal
   * Checked version of {@link XmlNode#addAttribute(string)} for codegen brevity.
   */
  a(name, value) {
    if (value != null) {
      this.attributes[name] = value;
    }
    return this;
  }
  /**
   * Create a child node.
   * Used in serialization of string fields.
   * @internal
   */
  cc(input, field, withName = field) {
    if (input[field] != null) {
      const node = _XmlNode.of(field, input[field]).withName(withName);
      this.c(node);
    }
  }
  /**
   * Creates list child nodes.
   * @internal
   */
  l(input, listName, memberName, valueProvider) {
    if (input[listName] != null) {
      const nodes = valueProvider();
      nodes.map((node) => {
        node.withName(memberName);
        this.c(node);
      });
    }
  }
  /**
   * Creates list child nodes with container.
   * @internal
   */
  lc(input, listName, memberName, valueProvider) {
    if (input[listName] != null) {
      const nodes = valueProvider();
      const containerNode = new _XmlNode(memberName);
      nodes.map((node) => {
        containerNode.c(node);
      });
      this.c(containerNode);
    }
  }
  toString() {
    const hasChildren = Boolean(this.children.length);
    let xmlText = `<${this.name}`;
    const attributes = this.attributes;
    for (const attributeName of Object.keys(attributes)) {
      const attribute = attributes[attributeName];
      if (attribute != null) {
        xmlText += ` ${attributeName}="${escapeAttribute("" + attribute)}"`;
      }
    }
    return xmlText += !hasChildren ? "/>" : `>${this.children.map((c) => c.toString()).join("")}</${this.name}>`;
  }
};
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  XmlNode,
  XmlText
});

