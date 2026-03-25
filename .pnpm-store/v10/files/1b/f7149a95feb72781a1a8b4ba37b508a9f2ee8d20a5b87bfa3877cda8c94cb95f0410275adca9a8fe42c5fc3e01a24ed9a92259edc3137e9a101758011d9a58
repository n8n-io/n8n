const RootModelsContext = Object.seal({
  // NOTE: RootModelsContext is also initialized after the model class is declared in the '@ts-graphviz/core/register-default' module.
  Graph: null,
  Digraph: null,
  Subgraph: null,
  Node: null,
  Edge: null
});
function createModelsContext(models) {
  return Object.assign(
    Object.seal(Object.assign({}, RootModelsContext)),
    models
  );
}
function isForwardRefNode(object) {
  return typeof object === "object" && object !== null && typeof object.id === "string";
}
function isNodeModel(object) {
  return typeof object === "object" && object !== null && object.$$type === "Node" && typeof object.id === "string";
}
function isNodeRef(node) {
  return isNodeModel(node) || isForwardRefNode(node);
}
function isNodeRefLike(node) {
  return typeof node === "string" || isNodeRef(node);
}
function isNodeRefGroupLike(target) {
  return Array.isArray(target) && target.every(isNodeRefLike);
}
function isCompass(c) {
  return ["n", "ne", "e", "se", "s", "sw", "w", "nw", "c"].includes(c);
}
function toNodeRef(target) {
  if (isNodeRef(target)) {
    return target;
  }
  const [id, port, compass] = target.split(":");
  if (isCompass(compass)) {
    return { id, port, compass };
  }
  return { id, port };
}
function toNodeRefGroup(targets) {
  if (targets.length < 1) {
    throw Error("EdgeTargets must have at least 1 elements.");
  }
  if (!targets.every((target) => isNodeRefLike(target))) {
    throw Error(
      "The element of Edge target is missing or not satisfied as Edge target."
    );
  }
  return targets.map((t) => toNodeRef(t));
}
export {
  RootModelsContext,
  createModelsContext,
  isCompass,
  isForwardRefNode,
  isNodeModel,
  isNodeRef,
  isNodeRefGroupLike,
  isNodeRefLike,
  toNodeRef,
  toNodeRefGroup
};
