const { keys } = Object
module.exports = object =>
  keys(object).reduce((result, key) => ({ ...result, [object[key]]: key }), {})
