// jscs:disable disallowVar, requireArrayDestructuring
import uniq from "lodash/uniq";
import flatten from "lodash/flatten";
/**
  @hide
*/
export default function (edges) {
  let nodes = uniq(flatten(edges));
  let cursor = nodes.length;
  let sorted = new Array(cursor);
  let visited = {};
  let i = cursor;

  let visit = function (node, i, predecessors) {
    if (predecessors.indexOf(node) >= 0) {
      throw new Error(
        `Cyclic dependency in properties ${JSON.stringify(predecessors)}`
      );
    }

    if (visited[i]) {
      return;
    } else {
      visited[i] = true;
    }

    let outgoing = edges.filter(function (edge) {
      return edge && edge[0] === node;
    });
    i = outgoing.length;
    if (i) {
      let preds = predecessors.concat(node);
      do {
        let pair = outgoing[--i];
        let child = pair[1];
        if (child) {
          visit(child, nodes.indexOf(child), preds);
        }
      } while (i);
    }

    sorted[--cursor] = node;
  };

  while (i--) {
    if (!visited[i]) {
      visit(nodes[i], i, []);
    }
  }

  return sorted.reverse();
}
