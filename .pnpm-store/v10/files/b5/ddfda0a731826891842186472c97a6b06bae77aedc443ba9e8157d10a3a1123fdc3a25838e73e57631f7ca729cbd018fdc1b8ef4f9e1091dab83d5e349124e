'use strict';

const {
  inheritableAttrs,
  attrsGroups,
  presentationNonInheritableGroupAttrs,
} = require('./_collections');

exports.name = 'removeNonInheritableGroupAttrs';
exports.description =
  'removes non-inheritable group’s presentational attributes';

/**
 * Remove non-inheritable group's "presentation" attributes.
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types').Plugin<'removeNonInheritableGroupAttrs'>}
 */
exports.fn = () => {
  return {
    element: {
      enter: (node) => {
        if (node.name === 'g') {
          for (const name of Object.keys(node.attributes)) {
            if (
              attrsGroups.presentation.has(name) &&
              !inheritableAttrs.has(name) &&
              !presentationNonInheritableGroupAttrs.has(name)
            ) {
              delete node.attributes[name];
            }
          }
        }
      },
    },
  };
};
