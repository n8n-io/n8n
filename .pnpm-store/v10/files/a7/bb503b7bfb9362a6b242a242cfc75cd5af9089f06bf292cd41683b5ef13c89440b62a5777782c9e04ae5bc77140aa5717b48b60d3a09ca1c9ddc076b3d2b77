"use strict"

const readCache = require("read-cache")
const dataURL = require("./data-url")

module.exports = filename => {
  if (dataURL.isValid(filename)) {
    return dataURL.contents(filename)
  }

  return readCache(filename, "utf-8")
}
