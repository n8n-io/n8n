"use strict"

module.exports = function (layer, node, state, options) {
  layer.forEach((layerPart, i) => {
    if (layerPart.trim() === "") {
      if (options.nameLayer) {
        layer[i] = options
          .nameLayer(state.anonymousLayerCounter++, state.rootFilename)
          .toString()
      } else {
        throw node.error(
          `When using anonymous layers in @import you must also set the "nameLayer" plugin option`
        )
      }
    }
  })
}
