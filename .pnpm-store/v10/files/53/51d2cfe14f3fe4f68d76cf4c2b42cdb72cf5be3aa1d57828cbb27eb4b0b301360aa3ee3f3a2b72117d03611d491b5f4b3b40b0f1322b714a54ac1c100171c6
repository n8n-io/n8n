"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const GraphBase = require("./GraphBase.cjs");
class RootGraph extends GraphBase.GraphBase {
  get $$type() {
    return "Graph";
  }
  id;
  strict;
  constructor(...args) {
    super();
    this.id = args.find((arg) => typeof arg === "string");
    this.strict = args.find((arg) => typeof arg === "boolean") ?? false;
    const attributes = args.find(
      (arg) => typeof arg === "object" && arg !== null
    );
    if (attributes !== void 0) {
      this.apply(attributes);
    }
  }
}
exports.RootGraph = RootGraph;
