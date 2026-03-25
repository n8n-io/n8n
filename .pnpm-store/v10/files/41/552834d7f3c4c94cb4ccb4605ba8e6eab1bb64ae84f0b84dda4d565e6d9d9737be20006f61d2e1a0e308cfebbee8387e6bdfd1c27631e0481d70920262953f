
var tokenize = require('./parse').tokenize

module.exports.analyze = function analyzeJSON(input, options) {
  if (options == null) options = {}

  if (!Array.isArray(input)) {
    input = tokenize(input, options)
  }

  var result = {
    has_whitespace: false,
    has_comments: false,
    has_newlines: false,
    has_trailing_comma: false,
    indent: '',
    newline: '\n',
    quote: '"',
    quote_keys: true,
  }

  var stats = {
    indent: {},
    newline: {},
    quote: {},
  }

  for (var i=0; i<input.length; i++) {
    if (input[i].type === 'newline') {
      if (input[i+1] && input[i+1].type === 'whitespace') {
        if (input[i+1].raw[0] === '\t') {
          // if first is tab, then indent is tab
          stats.indent['\t'] = (stats.indent['\t'] || 0) + 1
        }
        if (input[i+1].raw.match(/^\x20+$/)) {
          // if all are spaces, then indent is space
          // this can fail with mixed indent (4, 2 would display 3)
          var ws_len = input[i+1].raw.length
          var indent_len = input[i+1].stack.length + 1
          if (ws_len % indent_len === 0) {
            var t = Array(ws_len / indent_len + 1).join(' ')
            stats.indent[t] = (stats.indent[t] || 0) + 1
          }
        }
      }

      stats.newline[input[i].raw] = (stats.newline[input[i].raw] || 0) + 1
    }

    if (input[i].type === 'newline') {
      result.has_newlines = true
    }
    if (input[i].type === 'whitespace') {
      result.has_whitespace = true
    }
    if (input[i].type === 'comment') {
      result.has_comments = true
    }
    if (input[i].type === 'key') {
      if (input[i].raw[0] !== '"' && input[i].raw[0] !== "'") result.quote_keys = false
    }

    if (input[i].type === 'key' || input[i].type === 'literal') {
      if (input[i].raw[0] === '"' || input[i].raw[0] === "'") {
        stats.quote[input[i].raw[0]] = (stats.quote[input[i].raw[0]] || 0) + 1
      }
    }

    if (input[i].type === 'separator' && input[i].raw === ',') {
      for (var j=i+1; j<input.length; j++) {
        if (input[j].type === 'literal' || input[j].type === 'key') break
        if (input[j].type === 'separator') result.has_trailing_comma = true
      }
    }
  }

  for (var k in stats) {
    if (Object.keys(stats[k]).length) {
      result[k] = Object.keys(stats[k]).reduce(function(a, b) {
        return stats[k][a] > stats[k][b] ? a : b
      })
    }
  }

  return result
}

