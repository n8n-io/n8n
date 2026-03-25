'use strict';

const { pathElems, referencesProps } = require('./_collections.js');
const { includesUrlReference } = require('../lib/svgo/tools.js');

exports.name = 'moveGroupAttrsToElems';
exports.description = 'moves some group attributes to the content elements';

const pathElemsWithGroupsAndText = [...pathElems, 'g', 'text'];

/**
 * Move group attrs to the content elements.
 *
 * @example
 * <g transform="scale(2)">
 *     <path transform="rotate(45)" d="M0,0 L10,20"/>
 *     <path transform="translate(10, 20)" d="M0,10 L20,30"/>
 * </g>
 *                          ⬇
 * <g>
 *     <path transform="scale(2) rotate(45)" d="M0,0 L10,20"/>
 *     <path transform="scale(2) translate(10, 20)" d="M0,10 L20,30"/>
 * </g>
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types').Plugin<'moveGroupAttrsToElems'>}
 */
exports.fn = () => {
  return {
    element: {
      enter: (node) => {
        // move group transform attr to content's pathElems
        if (
          node.name === 'g' &&
          node.children.length !== 0 &&
          node.attributes.transform != null &&
          Object.entries(node.attributes).some(
            ([name, value]) =>
              referencesProps.has(name) && includesUrlReference(value),
          ) === false &&
          node.children.every(
            (child) =>
              child.type === 'element' &&
              pathElemsWithGroupsAndText.includes(child.name) &&
              child.attributes.id == null,
          )
        ) {
          for (const child of node.children) {
            const value = node.attributes.transform;
            if (child.type === 'element') {
              if (child.attributes.transform != null) {
                child.attributes.transform = `${value} ${child.attributes.transform}`;
              } else {
                child.attributes.transform = value;
              }
            }
          }

          delete node.attributes.transform;
        }
      },
    },
  };
};
