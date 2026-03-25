"use strict"

module.exports = function (parentLayer, childLayer) {
  if (!parentLayer.length && childLayer.length) return childLayer
  if (parentLayer.length && !childLayer.length) return parentLayer
  if (!parentLayer.length && !childLayer.length) return []

  return parentLayer.concat(childLayer)
}
