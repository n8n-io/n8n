'use strict';

import color from 'color';
import hex from 'text-hex';

/**
 * Generate a color for a given name. But be reasonably smart about it by
 * understanding name spaces and coloring each namespace a bit lighter so they
 * still have the same base color as the root.
 *
 * @param {string} namespace The namespace
 * @param {string} [delimiter] The delimiter
 * @returns {string} color
 */
export default function colorspace(namespace, delimiter) {
  const split = namespace.split(delimiter || ':');
  let base = hex(split[0]);

  if (!split.length) return base;

  for (let i = 0, l = split.length - 1; i < l; i++) {
    base = color(base)
    .mix(color(hex(split[i + 1])))
    .saturate(1)
    .hex();
  }

  return base;
};