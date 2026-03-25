"use strict";

/**
 * Executes a provided function once for each CSS block element.
 *
 * @param {Root|Document} root - root element of file.
 * @param {function} cb - Function to execute for each CSS block element
 */
module.exports = function (root, cb) {
  // class `Document` is a part of `postcss-html`,
  // It is collection of roots in HTML File.
  // See: https://github.com/gucong3000/postcss-html/blob/master/lib/document.js
  if (root.constructor.name === "Document") {
    root.nodes.forEach(cb);
  } else {
    cb(root);
  }
};
