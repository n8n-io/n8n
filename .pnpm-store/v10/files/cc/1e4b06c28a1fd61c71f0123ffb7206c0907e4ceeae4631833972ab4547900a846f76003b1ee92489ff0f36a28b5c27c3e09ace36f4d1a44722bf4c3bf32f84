'use strict';

/**
 * @typedef {import('../lib/types').XastElement} XastElement
 */

const { visitSkip } = require('../lib/xast.js');
const { hasScripts, findReferences } = require('../lib/svgo/tools');

exports.name = 'cleanupIds';
exports.description = 'removes unused IDs and minifies used';

const generateIdChars = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];
const maxIdIndex = generateIdChars.length - 1;

/**
 * Check if an ID starts with any one of a list of strings.
 *
 * @type {(string: string, prefixes: string[]) => boolean}
 */
const hasStringPrefix = (string, prefixes) => {
  for (const prefix of prefixes) {
    if (string.startsWith(prefix)) {
      return true;
    }
  }
  return false;
};

/**
 * Generate unique minimal ID.
 *
 * @param {?number[]} currentId
 * @returns {number[]}
 */
const generateId = (currentId) => {
  if (currentId == null) {
    return [0];
  }
  currentId[currentId.length - 1] += 1;
  for (let i = currentId.length - 1; i > 0; i--) {
    if (currentId[i] > maxIdIndex) {
      currentId[i] = 0;
      if (currentId[i - 1] !== undefined) {
        currentId[i - 1]++;
      }
    }
  }
  if (currentId[0] > maxIdIndex) {
    currentId[0] = 0;
    currentId.unshift(0);
  }
  return currentId;
};

/**
 * Get string from generated ID array.
 *
 * @type {(arr: number[]) => string}
 */
const getIdString = (arr) => {
  return arr.map((i) => generateIdChars[i]).join('');
};

/**
 * Remove unused and minify used IDs
 * (only if there are no any <style> or <script>).
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types').Plugin<'cleanupIds'>}
 */
exports.fn = (_root, params) => {
  const {
    remove = true,
    minify = true,
    preserve = [],
    preservePrefixes = [],
    force = false,
  } = params;
  const preserveIds = new Set(
    Array.isArray(preserve) ? preserve : preserve ? [preserve] : [],
  );
  const preserveIdPrefixes = Array.isArray(preservePrefixes)
    ? preservePrefixes
    : preservePrefixes
      ? [preservePrefixes]
      : [];
  /**
   * @type {Map<string, XastElement>}
   */
  const nodeById = new Map();
  /**
   * @type {Map<string, {element: XastElement, name: string }[]>}
   */
  const referencesById = new Map();
  let deoptimized = false;

  return {
    element: {
      enter: (node) => {
        if (!force) {
          // deoptimize if style or scripts are present
          if (
            (node.name === 'style' && node.children.length !== 0) ||
            hasScripts(node)
          ) {
            deoptimized = true;
            return;
          }

          // avoid removing IDs if the whole SVG consists only of defs
          if (node.name === 'svg') {
            let hasDefsOnly = true;
            for (const child of node.children) {
              if (child.type !== 'element' || child.name !== 'defs') {
                hasDefsOnly = false;
                break;
              }
            }
            if (hasDefsOnly) {
              return visitSkip;
            }
          }
        }

        for (const [name, value] of Object.entries(node.attributes)) {
          if (name === 'id') {
            // collect all ids
            const id = value;
            if (nodeById.has(id)) {
              delete node.attributes.id; // remove repeated id
            } else {
              nodeById.set(id, node);
            }
          } else {
            const ids = findReferences(name, value);
            for (const id of ids) {
              let refs = referencesById.get(id);
              if (refs == null) {
                refs = [];
                referencesById.set(id, refs);
              }
              refs.push({ element: node, name });
            }
          }
        }
      },
    },

    root: {
      exit: () => {
        if (deoptimized) {
          return;
        }
        /**
         * @param {string} id
         * @returns {boolean}
         */
        const isIdPreserved = (id) =>
          preserveIds.has(id) || hasStringPrefix(id, preserveIdPrefixes);
        /** @type {?number[]} */
        let currentId = null;
        for (const [id, refs] of referencesById) {
          const node = nodeById.get(id);
          if (node != null) {
            // replace referenced IDs with the minified ones
            if (minify && isIdPreserved(id) === false) {
              /** @type {?string} */
              let currentIdString = null;
              do {
                currentId = generateId(currentId);
                currentIdString = getIdString(currentId);
              } while (
                isIdPreserved(currentIdString) ||
                (referencesById.has(currentIdString) &&
                  nodeById.get(currentIdString) == null)
              );
              node.attributes.id = currentIdString;
              for (const { element, name } of refs) {
                const value = element.attributes[name];
                if (value.includes('#')) {
                  // replace id in href and url()
                  element.attributes[name] = value.replace(
                    `#${encodeURI(id)}`,
                    `#${currentIdString}`,
                  );
                } else {
                  // replace id in begin attribute
                  element.attributes[name] = value.replace(
                    `${id}.`,
                    `${currentIdString}.`,
                  );
                }
              }
            }
            // keep referenced node
            nodeById.delete(id);
          }
        }
        // remove non-referenced IDs attributes from elements
        if (remove) {
          for (const [id, node] of nodeById) {
            if (isIdPreserved(id) === false) {
              delete node.attributes.id;
            }
          }
        }
      },
    },
  };
};
