"use strict"

// builtin tooling
const path = require("path")

// placeholder tooling
let sugarss

module.exports = function processContent(
  result,
  content,
  filename,
  options,
  postcss
) {
  const { plugins } = options
  const ext = path.extname(filename)

  const parserList = []

  // SugarSS support:
  if (ext === ".sss") {
    if (!sugarss) {
      try {
        sugarss = require("sugarss")
      } catch {} // Ignore
    }
    if (sugarss)
      return runPostcss(postcss, content, filename, plugins, [sugarss])
  }

  // Syntax support:
  if (result.opts.syntax?.parse) {
    parserList.push(result.opts.syntax.parse)
  }

  // Parser support:
  if (result.opts.parser) parserList.push(result.opts.parser)
  // Try the default as a last resort:
  parserList.push(null)

  return runPostcss(postcss, content, filename, plugins, parserList)
}

function runPostcss(postcss, content, filename, plugins, parsers, index) {
  if (!index) index = 0
  return postcss(plugins)
    .process(content, {
      from: filename,
      parser: parsers[index],
    })
    .catch(err => {
      // If there's an error, try the next parser
      index++
      // If there are no parsers left, throw it
      if (index === parsers.length) throw err
      return runPostcss(postcss, content, filename, plugins, parsers, index)
    })
}
