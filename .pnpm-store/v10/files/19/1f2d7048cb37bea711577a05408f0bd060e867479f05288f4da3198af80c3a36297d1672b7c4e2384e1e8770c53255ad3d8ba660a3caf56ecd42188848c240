const DoublyLinkedList = require('./doubly_linked_list');

/**
 * An LRU cache used to store chunks.
 * 
 * !! This cache is not fully implemented and not used at this time !!
 *
 * @param capacity the cache size in terms of the number of chunks.
 * @constructor
 */
function ChunkCache(capacity) {
  this._capacity = capacity;

  // create a map and a doubly linked list to track the cached chunks
  this._map = {};
  this._list = new DoublyLinkedList();
}

/**
 * Adds a chunk to the cache.
 *
 * @param chunk
 */
ChunkCache.prototype.put = function (chunk) {
  let evictedNode;
  let evictedChunk;

  const map = this._map;
  const list = this._list;
  const chunkId = chunk.getId();

  // if we already have the chunk in the cache, remove the corresponding node
  // from the list
  if (Object.prototype.hasOwnProperty.call(map, chunkId) && map[chunkId]) {
    list.remove(map[chunkId]);
  }

  // append the chunk to the list and put the corresponding node in the map
  map[chunkId] = list.insertEnd(chunk);

  // if we've exceeded the cache capacity
  if (list.getLength() > this._capacity) {
    // remove the current head of the list
    evictedNode = list.getHead();
    list.remove(evictedNode);

    // evict the chunk associated with the removed node
    evictedChunk = evictedNode.getValue();
    delete map[evictedChunk.getId()];

    // clear the rows from the evicted chunk
    // TODO: should the force flag be set to true here?
    evictedChunk.clearRows();
  }
};

module.exports = ChunkCache;