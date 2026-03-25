"use strict";
const DOMException = require("./webidl2js-wrapper.js");

const sharedGlobalObject = { Array, Error, Object, Promise, String, TypeError };
DOMException.install(sharedGlobalObject, ["Window"]);

module.exports = sharedGlobalObject.DOMException;
