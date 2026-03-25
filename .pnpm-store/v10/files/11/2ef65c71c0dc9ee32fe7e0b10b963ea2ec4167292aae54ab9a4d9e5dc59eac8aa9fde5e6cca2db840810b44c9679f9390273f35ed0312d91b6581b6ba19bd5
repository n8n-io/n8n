import { isNodeRefLike } from "@ts-graphviz/common";
import { AttributesGroup } from "./AttributesGroup.js";
import { DotObject } from "./DotObject.js";
class Edge extends DotObject {
  constructor(targets, attributes) {
    super();
    this.targets = targets;
    if (targets.length < 2 && (isNodeRefLike(targets[0]) && isNodeRefLike(targets[1])) === false) {
      throw Error(
        "The element of Edge target is missing or not satisfied as Edge target."
      );
    }
    this.attributes = new AttributesGroup(attributes);
  }
  get $$type() {
    return "Edge";
  }
  comment;
  attributes;
}
export {
  Edge
};
