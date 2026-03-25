"use strict";

let greedyFAS = require("./greedy-fas");
let uniqueId = require("./util").uniqueId;

module.exports = {
  run: run,
  undo: undo
};

function run(g) {
  let fas = (g.graph().acyclicer === "greedy"
    ? greedyFAS(g, weightFn(g))
    : dfsFAS(g));
  fas.forEach(e => {
    let label = g.edge(e);
    g.removeEdge(e);
    label.forwardName = e.name;
    label.reversed = true;
    g.setEdge(e.w, e.v, label, uniqueId("rev"));
  });

  function weightFn(g) {
    return e => {
      return g.edge(e).weight;
    };
  }
}

function dfsFAS(g) {
  let fas = [];
  let stack = {};
  let visited = {};

  function dfs(v) {
    if (Object.hasOwn(visited, v)) {
      return;
    }
    visited[v] = true;
    stack[v] = true;
    g.outEdges(v).forEach(e => {
      if (Object.hasOwn(stack, e.w)) {
        fas.push(e);
      } else {
        dfs(e.w);
      }
    });
    delete stack[v];
  }

  g.nodes().forEach(dfs);
  return fas;
}

function undo(g) {
  g.edges().forEach(e => {
    let label = g.edge(e);
    if (label.reversed) {
      g.removeEdge(e);

      let forwardName = label.forwardName;
      delete label.reversed;
      delete label.forwardName;
      g.setEdge(e.w, e.v, label, forwardName);
    }
  });
}
