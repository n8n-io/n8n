function formatPosition(metadata) {
  var line = metadata[0];
  var column = metadata[1];
  var source = metadata[2];

  return source ?
    source + ':' + line + ':' + column :
    line + ':' + column;
}

module.exports = formatPosition;
