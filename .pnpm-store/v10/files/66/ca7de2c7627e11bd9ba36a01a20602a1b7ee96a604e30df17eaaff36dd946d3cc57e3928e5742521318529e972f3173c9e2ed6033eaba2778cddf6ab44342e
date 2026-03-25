"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const AttributesGroup = require("./AttributesGroup.cjs");
const DotObject = require("./DotObject.cjs");
class Node extends DotObject.DotObject {
  constructor(id, attributes) {
    super();
    this.id = id;
    this.attributes = new AttributesGroup.AttributesGroup(attributes);
  }
  get $$type() {
    return "Node";
  }
  comment;
  attributes;
  port(port) {
    if (typeof port === "string") {
      return { id: this.id, port };
    }
    return { id: this.id, ...port };
  }
}
exports.Node = Node;
