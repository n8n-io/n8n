var dijkstra = require("./dijkstra");

module.exports = dijkstraAll;

function dijkstraAll(g, weightFunc, edgeFunc) {
  return g.nodes().reduce(function(acc, v) {
    acc[v] = dijkstra(g, v, weightFunc, edgeFunc);
    return acc;
  }, {});
}
