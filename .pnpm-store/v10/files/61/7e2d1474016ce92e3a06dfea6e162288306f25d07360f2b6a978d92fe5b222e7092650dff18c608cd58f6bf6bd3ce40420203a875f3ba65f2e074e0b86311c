var Marker = require('../../../tokenizer/marker');

function isMergeableShorthand(shorthand) {
  if (shorthand.name != 'font') {
    return true;
  }

  return shorthand.value[0][1].indexOf(Marker.INTERNAL) == -1;
}

module.exports = isMergeableShorthand;
