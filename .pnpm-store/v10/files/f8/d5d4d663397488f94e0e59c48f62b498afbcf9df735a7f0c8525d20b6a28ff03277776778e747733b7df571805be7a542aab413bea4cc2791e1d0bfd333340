const Pool = require("./lib/Pool");
const Deque = require("./lib/Deque");
const PriorityQueue = require("./lib/PriorityQueue");
const DefaultEvictor = require("./lib/DefaultEvictor");
module.exports = {
  Pool: Pool,
  Deque: Deque,
  PriorityQueue: PriorityQueue,
  DefaultEvictor: DefaultEvictor,
  createPool: function(factory, config) {
    return new Pool(DefaultEvictor, Deque, PriorityQueue, factory, config);
  }
};
