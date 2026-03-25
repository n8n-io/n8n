'use strict';

exports.name = 'removeDimensions';
exports.description =
  'removes width and height in presence of viewBox (opposite to removeViewBox, disable it first)';

/**
 * Remove width/height attributes and add the viewBox attribute if it's missing
 *
 * @example
 * <svg width="100" height="50" />
 *   ↓
 * <svg viewBox="0 0 100 50" />
 *
 * @author Benny Schudel
 *
 * @type {import('./plugins-types').Plugin<'removeDimensions'>}
 */
exports.fn = () => {
  return {
    element: {
      enter: (node) => {
        if (node.name === 'svg') {
          if (node.attributes.viewBox != null) {
            delete node.attributes.width;
            delete node.attributes.height;
          } else if (
            node.attributes.width != null &&
            node.attributes.height != null &&
            Number.isNaN(Number(node.attributes.width)) === false &&
            Number.isNaN(Number(node.attributes.height)) === false
          ) {
            const width = Number(node.attributes.width);
            const height = Number(node.attributes.height);
            node.attributes.viewBox = `0 0 ${width} ${height}`;
            delete node.attributes.width;
            delete node.attributes.height;
          }
        }
      },
    },
  };
};
