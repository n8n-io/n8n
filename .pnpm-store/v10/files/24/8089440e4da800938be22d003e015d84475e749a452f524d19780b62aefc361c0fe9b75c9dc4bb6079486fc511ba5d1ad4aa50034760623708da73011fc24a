'use strict';

const { detachNodeFromParent } = require('../lib/xast.js');

exports.name = 'removeXMLProcInst';
exports.description = 'removes XML processing instructions';

/**
 * Remove XML Processing Instruction.
 *
 * @example
 * <?xml version="1.0" encoding="utf-8"?>
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types').Plugin<'removeXMLProcInst'>}
 */
exports.fn = () => {
  return {
    instruction: {
      enter: (node, parentNode) => {
        if (node.name === 'xml') {
          detachNodeFromParent(node, parentNode);
        }
      },
    },
  };
};
