var SUPPORTED_COMPACT_BLOCK_MATCHER = /^@media\W/;

function tidyBlock(values, spaceAfterClosingBrace) {
  var withoutSpaceAfterClosingBrace;
  var i;

  for (i = values.length - 1; i >= 0; i--) {
    withoutSpaceAfterClosingBrace = !spaceAfterClosingBrace && SUPPORTED_COMPACT_BLOCK_MATCHER.test(values[i][1]);

    values[i][1] = values[i][1]
      .replace(/\n|\r\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/(,|:|\() /g, '$1')
      .replace(/ \)/g, ')')
      .replace(/'([a-zA-Z][a-zA-Z\d\-_]+)'/, '$1')
      .replace(/"([a-zA-Z][a-zA-Z\d\-_]+)"/, '$1')
      .replace(withoutSpaceAfterClosingBrace ? /\) /g : null, ')');
  }

  return values;
}

module.exports = tidyBlock;
