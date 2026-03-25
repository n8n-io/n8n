function cloneArray(array) {
  var cloned = array.slice(0);

  for (var i = 0, l = cloned.length; i < l; i++) {
    if (Array.isArray(cloned[i]))
      cloned[i] = cloneArray(cloned[i]);
  }

  return cloned;
}

module.exports = cloneArray;
