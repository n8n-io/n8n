let postcss = require('postcss')

let processResult = require('./process-result')
let parse = require('./parser')

module.exports = function (plugins) {
  let processor = postcss(plugins)
  return input => {
    let result = processor.process(input, { parser: parse, from: undefined })
    return processResult(result)
  }
}
