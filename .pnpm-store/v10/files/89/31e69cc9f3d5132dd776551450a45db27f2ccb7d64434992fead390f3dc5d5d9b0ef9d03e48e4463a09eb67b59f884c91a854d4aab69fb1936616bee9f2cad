let postcss = require('postcss')

let parse = require('./parser')
let processResult = require('./process-result')

module.exports = function (plugins) {
  let processor = postcss(plugins)
  return input => {
    let result = processor.process(input, { parser: parse, from: undefined })
    return processResult(result)
  }
}
