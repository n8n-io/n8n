'use strict'

module.exports = byteaToBinary

function byteaToBinary (input) {
  if (/^\\x/.test(input)) {
    return byteaHexFormatToBinary(input)
  }
  return byteaEscapeFormatToBinary(input)
}

function byteaHexFormatToBinary (input) {
  return Buffer.from(input.substr(2), 'hex')
}

function byteaEscapeFormatToBinary (input) {
  let output = ''
  let i = 0
  while (i < input.length) {
    if (input[i] !== '\\') {
      output += input[i]
      ++i
    } else {
      if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
        output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8))
        i += 4
      } else {
        let backslashes = 1
        while (i + backslashes < input.length && input[i + backslashes] === '\\') {
          backslashes++
        }
        for (let k = 0; k < Math.floor(backslashes / 2); ++k) {
          output += '\\'
        }
        i += Math.floor(backslashes / 2) * 2
      }
    }
  }
  return Buffer.from(output, 'binary')
}
