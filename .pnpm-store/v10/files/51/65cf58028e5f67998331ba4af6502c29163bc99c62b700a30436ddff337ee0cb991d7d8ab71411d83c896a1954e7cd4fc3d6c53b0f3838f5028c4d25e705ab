import { GraphBase } from "./GraphBase.js";
class Subgraph extends GraphBase {
  get $$type() {
    return "Subgraph";
  }
  id;
  constructor(...args) {
    super();
    this.id = args.find((arg) => typeof arg === "string");
    const attributes = args.find(
      (arg) => typeof arg === "object" && arg !== null
    );
    if (attributes !== void 0) {
      this.apply(attributes);
    }
  }
  isSubgraphCluster() {
    if (typeof this.id === "string") {
      return this.id.startsWith("cluster");
    }
    return false;
  }
}
export {
  Subgraph
};
