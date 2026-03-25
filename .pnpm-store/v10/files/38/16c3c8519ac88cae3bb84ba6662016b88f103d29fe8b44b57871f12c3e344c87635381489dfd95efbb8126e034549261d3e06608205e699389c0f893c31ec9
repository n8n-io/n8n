
var single = exports.single = function (s) {
  return "'" + s.replace(/\\|'/g, function (m) { return '\\'+m })+"'"
}

var double = exports.double = function (s) {
  return '"' + s.replace(/\\|"/g, function (m) { return '\\'+m })+'"'
}

exports.quote = function (s) {
  return  /'/.test(s) ? double(s) : single(s)
}

exports.unquote = function (s) {
  var quote = s[0]
  var single = quote === "'"
  return s.substring(1, s.length - 1)
      .replace(/\\\\/g, '\\')
      .replace(single ? /\\'/g : /\\"/g, quote)
}

