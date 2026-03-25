var splitRE = /\r?\n/g
var emptyRE = /^\s*$/
var needFixRE = /^(\r?\n)*[\t\s]/

module.exports = function deindent (str) {
  if (!needFixRE.test(str)) {
    return str
  }
  var lines = str.split(splitRE)
  var min = Infinity
  var type, cur, c
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (!emptyRE.test(line)) {
      if (!type) {
        c = line.charAt(0)
        if (c === ' ' || c === '\t') {
          type = c
          cur = count(line, type)
          if (cur < min) {
            min = cur
          }
        } else {
          return str
        }
      } else {
        cur = count(line, type)
        if (cur < min) {
          min = cur
        }
      }
    }
  }
  return lines.map(function (line) {
    return line.slice(min)
  }).join('\n')
}

function count (line, type) {
  var i = 0
  while (line.charAt(i) === type) {
    i++
  }
  return i
}
