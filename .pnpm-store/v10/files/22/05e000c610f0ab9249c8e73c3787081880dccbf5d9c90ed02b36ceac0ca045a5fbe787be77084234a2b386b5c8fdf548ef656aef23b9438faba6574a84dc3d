// adapted from http://nedbatchelder.com/blog/200712.html#e20071211T054956

var NUMBER_PATTERN = /([0-9]+)/;

function naturalCompare(value1, value2) {
  var keys1 = ('' + value1).split(NUMBER_PATTERN).map(tryParseInt);
  var keys2 = ('' + value2).split(NUMBER_PATTERN).map(tryParseInt);
  var key1;
  var key2;
  var compareFirst = Math.min(keys1.length, keys2.length);
  var i, l;

  for (i = 0, l = compareFirst; i < l; i++) {
    key1 = keys1[i];
    key2 = keys2[i];

    if (key1 != key2) {
      return key1 > key2 ? 1 : -1;
    }
  }

  return keys1.length > keys2.length ? 1 : (keys1.length == keys2.length ? 0 : -1);
}

function tryParseInt(value) {
  return ('' + parseInt(value)) == value ?
    parseInt(value) :
    value;
}

module.exports = naturalCompare;
