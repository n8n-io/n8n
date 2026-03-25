"use strict";

/**
 * @param {import('postcss').Declaration} decl
 * @returns {string}
 */
function getDeclarationValue(decl) {
  const raws = decl.raws;

  return (raws.value && raws.value.raw) || decl.value;
}

module.exports = getDeclarationValue;
