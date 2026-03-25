function topsort(g) {
  var visited = {};
  var stack = {};
  var results = [];

  function visit(node) {
    if (Object.hasOwn(stack, node)) {
      throw new CycleException();
    }

    if (!Object.hasOwn(visited, node)) {
      stack[node] = true;
      visited[node] = true;
      g.predecessors(node).forEach(visit);
      delete stack[node];
      results.push(node);
    }
  }

  g.sinks().forEach(visit);

  if (Object.keys(visited).length !== g.nodeCount()) {
    throw new CycleException();
  }

  return results;
}

class CycleException extends Error {
  constructor() {
    super(...arguments);
  }
}

module.exports = topsort;
topsort.CycleException = CycleException;
