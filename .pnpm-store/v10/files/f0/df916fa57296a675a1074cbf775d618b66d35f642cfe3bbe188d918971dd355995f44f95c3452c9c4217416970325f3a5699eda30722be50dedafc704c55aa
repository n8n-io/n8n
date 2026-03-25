'use strict';

const which = require("which")

function whichOrUndefined(executable) {
  try {
    return which.sync(executable)
  } catch (error) {
  }
}

module.exports = whichOrUndefined
