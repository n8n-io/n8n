'use strict';
/**
* TopoSort function is LICENSE: MIT, everything else is BSD-3-Clause
*/

/*
*  Source: https://simplapi.wordpress.com/2015/08/19/detect-graph-cycle-in-javascript/
* removed dependency on underscore, MER
*/

const recurse = require('./recurse.js').recurse;
const isRef = require('./isref.js').isRef;

/*

Nodes should look like:
var nodes = [
  {  _id: "3",  links: ["8", "10"]      },
  {  _id: "5",  links: ["11"]           },
  {  _id: "7",  links: ["11", "8"]      },
  {  _id: "8",  links: ["9"]            },
  {  _id: "11", links: ["2", "9", "10"] },
  {  _id: "10", links: []               },
  {  _id: "9",  links: []               },
  {  _id: "2",  links: []               }
];

*/

/**
 * Try to get a topological sorting out of directed graph.
 *
 * @typedef {Object} Result
 * @property {array} sort the sort, empty if not found
 * @property {array} nodesWithEdges, will be empty unless a cycle is found
 * @param nodes {Object} A list of nodes, including edges (see below).
 * @return {Result}
*/
function toposort (nodes) {
  // Test if a node has got any incoming edges
  function hasIncomingEdge(list, node) {
    for (var i = 0, l = list.length; i < l; ++i) {
      if (list[i].links.find(function(e,i,a){
        return node._id == e;
      })) return true;
    }
    return false;
  };

  // Kahn's Algorithm
  var L = [],
      S = nodes.filter(function(node) {
        return !hasIncomingEdge(nodes, node);
      }),
      n = null;

  while(S.length) {
    // Remove a node n from S
    n = S.pop();
    // Add n to tail of L
    L.push(n);

    var i = n.links.length;
    while (i--) {
      // Getting the node associated to the current stored id in links
      var m = nodes.find(function(e){
        return n.links[i] === e._id;
      });
      if (!m) throw new Error('Could not find node from link: '+n.links[i]);

      // Remove edge e from the graph
      n.links.pop();

      if (!hasIncomingEdge(nodes, m)) {
        S.push(m);
      }
    }
  }

  // If any of them still have links, there is cycle somewhere
  var nodesWithEdges = nodes.filter(function(node) {
    return node.links.length !== 0;
  });

  // modified to return both the cyclic nodes and the sort
  return {
    sort : nodesWithEdges.length == 0 ? L : null,
    nodesWithEdges : nodesWithEdges
  };
}

/**
* Takes an object and creates a graph of JSON Pointer / References
* @param obj the object to convert
* @param containerName the property containing definitions. Default: definitions
* @return the graph suitable for passing to toposort()
*/
function objToGraph(obj, containerName) {
    if (!containerName) containerName = 'definitions';
    let graph = [];

    for (let p in obj[containerName]) {
        let entry = {};
        entry._id = '#/'+containerName+'/'+p;
        entry.links = [];
        graph.push(entry);
    }

    recurse(obj,{identityDetection:true},function(obj,key,state){
        if (isRef(obj,key)) {
            let ptr = obj[key].replace('/$ref','');
            let spath = state.path.replace('/$ref','');
            let target = graph.find(function(e){
                return e._id === ptr;
            });
            if (target) {
                target.links.push(ptr);
            }
            else {
                target = {};
                target._id = ptr;
                target.links = [];
                target.links.push(ptr);
                graph.push(target);
            }
            let source = graph.find(function(e){
                return e._id === spath;
            });
            if (source) {
                //source.links.push(spath);
            }
            else {
                source = {};
                source._id = spath
                source.links = [];
                graph.push(source);
            }
        }
    });

    return graph;
}

module.exports = {
    toposort : toposort,
    objToGraph : objToGraph
};

