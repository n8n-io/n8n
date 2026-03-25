define(['./_setup'], function (_setup) {

  // Chunk a single array into multiple arrays, each containing `count` or fewer
  // items.
  function chunk(array, count) {
    if (count == null || count < 1) return [];
    var result = [];
    var i = 0, length = array.length;
    while (i < length) {
      result.push(_setup.slice.call(array, i, i += count));
    }
    return result;
  }

  return chunk;

});
