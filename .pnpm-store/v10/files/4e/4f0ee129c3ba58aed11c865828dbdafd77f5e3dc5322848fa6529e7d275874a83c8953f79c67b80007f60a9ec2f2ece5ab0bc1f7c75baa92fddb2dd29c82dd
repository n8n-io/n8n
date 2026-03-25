let postcss = require('postcss')

let processResult = require('./process-result')
let parse = require('./parser')

module.exports = function async(plugins) {
  let processor = postcss(plugins)
  return async input => {
    let result = await processor.process(input, {
      parser: parse,
      from: undefined
    })
    return processResult(result)
  }
}
