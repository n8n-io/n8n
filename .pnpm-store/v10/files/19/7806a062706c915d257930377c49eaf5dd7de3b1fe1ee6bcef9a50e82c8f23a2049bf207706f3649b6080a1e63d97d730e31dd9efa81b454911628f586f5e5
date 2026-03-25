function truthy(d) {
  return d
};

function first(array, callback, context) {
  var callback = callback || truthy
    , context = context || array
    , value

  for (var i = 0, l = array.length; i < l; i += 1) {
    if (value = callback.call(context, array[i], i)) return array[i]
  }
};

module.exports = first