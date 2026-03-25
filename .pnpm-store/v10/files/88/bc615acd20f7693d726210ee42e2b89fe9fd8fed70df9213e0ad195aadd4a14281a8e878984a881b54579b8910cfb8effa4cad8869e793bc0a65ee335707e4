'use strict';

const { detachNodeFromParent } = require('../lib/xast.js');

exports.name = 'removeMetadata';
exports.description = 'removes <metadata>';

/**
 * Remove <metadata>.
 *
 * https://www.w3.org/TR/SVG11/metadata.html
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types').Plugin<'removeMetadata'>}
 */
exports.fn = () => {
  return {
    element: {
      enter: (node, parentNode) => {
        if (node.name === 'metadata') {
          detachNodeFromParent(node, parentNode);
        }
      },
    },
  };
};
