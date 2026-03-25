"use strict"

const dataURLRegexp = /^data:text\/css;base64,/i

function isValid(url) {
  return dataURLRegexp.test(url)
}

function contents(url) {
  // "data:text/css;base64,".length === 21
  return Buffer.from(url.slice(21), "base64").toString()
}

module.exports = {
  isValid,
  contents,
}
