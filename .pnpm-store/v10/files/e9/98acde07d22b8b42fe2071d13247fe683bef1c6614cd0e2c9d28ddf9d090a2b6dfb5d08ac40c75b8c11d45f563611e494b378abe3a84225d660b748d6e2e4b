const depth = require('../lib/helpers/colorDepth')
const Errors = require('../lib/helpers/errors')

const colors16 = new Map([
  ['amber', 33],
  ['blue', 34],
  ['gray', 37],
  ['green', 32],
  ['olive', 33],
  ['orangered', 33], // mapped to yellow/brown
  ['plum', 35], // mapped to magenta
  ['red', 31],
  ['electricblue', 36],
  ['dodgerblue', 36]
])

const colors256 = new Map([
  ['amber', 136],
  ['blue', 21],
  ['gray', 244],
  ['green', 34],
  ['olive', 142],
  ['orangered', 130], // burnished copper
  ['plum', 182],
  ['red', 124], // brighter garnet
  ['electricblue', 45],
  ['dodgerblue', 33]
])

const colorsTrueColor = new Map([
  ['amber', [236, 213, 63]],
  ['orangered', [138, 90, 43]], // #8A5A2B burnished copper
  ['red', [140, 35, 50]] // #8C2332 brighter garnet
])

function getColor (color) {
  const colorDepth = depth.getColorDepth()
  if (!colors256.has(color)) {
    throw new Errors({ color }).invalidColor()
  }
  if (colorDepth >= 24 && colorsTrueColor.has(color)) {
    const [r, g, b] = colorsTrueColor.get(color)
    return (message) => `\x1b[38;2;${r};${g};${b}m${message}\x1b[39m`
  }
  if (colorDepth >= 8) {
    const code = colors256.get(color)
    return (message) => `\x1b[38;5;${code}m${message}\x1b[39m`
  }
  if (colorDepth >= 4) {
    const code = colors16.get(color)
    return (message) => `\x1b[${code}m${message}\x1b[39m`
  }
  return (message) => message
}

function bold (message) {
  if (depth.getColorDepth() >= 4) {
    return `\x1b[1m${message}\x1b[22m`
  }

  return message
}

module.exports = {
  getColor,
  bold
}
