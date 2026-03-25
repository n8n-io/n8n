'use strict';

const { detachNodeFromParent } = require('../lib/xast.js');

exports.name = 'removeComments';
exports.description = 'removes comments';

/**
 * If a comment matches one of the following patterns, it will be
 * preserved by default. Particularly for copyright/license information.
 */
const DEFAULT_PRESERVE_PATTERNS = [/^!/];

/**
 * Remove comments.
 *
 * @example
 * <!-- Generator: Adobe Illustrator 15.0.0, SVG Export
 * Plug-In . SVG Version: 6.00 Build 0)  -->
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types').Plugin<'removeComments'>}
 */
exports.fn = (_root, params) => {
  const { preservePatterns = DEFAULT_PRESERVE_PATTERNS } = params;

  return {
    comment: {
      enter: (node, parentNode) => {
        if (preservePatterns) {
          if (!Array.isArray(preservePatterns)) {
            throw Error(
              `Expected array in removeComments preservePatterns parameter but received ${preservePatterns}`,
            );
          }

          const matches = preservePatterns.some((pattern) => {
            return new RegExp(pattern).test(node.value);
          });

          if (matches) {
            return;
          }
        }

        detachNodeFromParent(node, parentNode);
      },
    },
  };
};
