var tarjan = require("./tarjan");

module.exports = findCycles;

function findCycles(g) {
  return tarjan(g).filter(function(cmpt) {
    return cmpt.length > 1 || (cmpt.length === 1 && g.hasEdge(cmpt[0], cmpt[0]));
  });
}
