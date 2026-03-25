"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common = require("@ts-graphviz/common");
const AttributesGroup = require("./AttributesGroup.cjs");
const DotObject = require("./DotObject.cjs");
class Edge extends DotObject.DotObject {
  constructor(targets, attributes) {
    super();
    this.targets = targets;
    if (targets.length < 2 && (common.isNodeRefLike(targets[0]) && common.isNodeRefLike(targets[1])) === false) {
      throw Error(
        "The element of Edge target is missing or not satisfied as Edge target."
      );
    }
    this.attributes = new AttributesGroup.AttributesGroup(attributes);
  }
  get $$type() {
    return "Edge";
  }
  comment;
  attributes;
}
exports.Edge = Edge;
