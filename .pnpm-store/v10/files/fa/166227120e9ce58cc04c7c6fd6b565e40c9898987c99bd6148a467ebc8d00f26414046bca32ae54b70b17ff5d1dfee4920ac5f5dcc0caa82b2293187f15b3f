import { AttributesGroup } from "./AttributesGroup.js";
import { DotObject } from "./DotObject.js";
class Node extends DotObject {
  constructor(id, attributes) {
    super();
    this.id = id;
    this.attributes = new AttributesGroup(attributes);
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
export {
  Node
};
