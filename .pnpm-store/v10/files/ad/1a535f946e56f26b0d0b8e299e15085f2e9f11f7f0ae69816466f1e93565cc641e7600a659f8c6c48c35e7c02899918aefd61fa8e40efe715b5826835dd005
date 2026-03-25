// given an input that may or may not be an object, return an object that has
// a copy of every defined property listed in 'copy'. if the input is not an
// object, assign it to the property named by 'wrap'
const getOptions = (input, { copy, wrap }) => {
  const result = {}

  if (input && typeof input === 'object') {
    for (const prop of copy) {
      if (input[prop] !== undefined) {
        result[prop] = input[prop]
      }
    }
  } else {
    result[wrap] = input
  }

  return result
}

module.exports = getOptions
