'use strict';

/**
 * @typedef {import('../lib/types').PathDataItem} PathDataItem
 * @typedef {import('../lib/types').XastElement} XastElement
 */

const { collectStylesheet, computeStyle } = require('../lib/style.js');
const {
  transformsMultiply,
  transform2js,
  transformArc,
} = require('./_transforms.js');
const { path2js } = require('./_path.js');
const {
  removeLeadingZero,
  includesUrlReference,
} = require('../lib/svgo/tools.js');
const { referencesProps, attrsGroupsDefaults } = require('./_collections.js');

/**
 * @typedef {PathDataItem[]} PathData
 * @typedef {number[]} Matrix
 */

const regNumericValues = /[-+]?(\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

/**
 * Apply transformation(s) to the Path data.
 *
 * @type {import('../lib/types').Plugin<{
 *   transformPrecision: number,
 *   applyTransformsStroked: boolean,
 * }>}
 */
const applyTransforms = (root, params) => {
  const stylesheet = collectStylesheet(root);
  return {
    element: {
      enter: (node) => {
        if (node.attributes.d == null) {
          return;
        }

        // stroke and stroke-width can be redefined with <use>
        if (node.attributes.id != null) {
          return;
        }

        // if there are no 'stroke' attr and references to other objects such as
        // gradients or clip-path which are also subjects to transform.
        if (
          node.attributes.transform == null ||
          node.attributes.transform === '' ||
          // styles are not considered when applying transform
          // can be fixed properly with new style engine
          node.attributes.style != null ||
          Object.entries(node.attributes).some(
            ([name, value]) =>
              referencesProps.has(name) && includesUrlReference(value),
          )
        ) {
          return;
        }

        const computedStyle = computeStyle(stylesheet, node);
        const transformStyle = computedStyle.transform;

        // Transform overridden in <style> tag which is not considered
        if (
          transformStyle.type === 'static' &&
          transformStyle.value !== node.attributes.transform
        ) {
          return;
        }

        const matrix = transformsMultiply(
          transform2js(node.attributes.transform),
        );

        const stroke =
          computedStyle.stroke?.type === 'static'
            ? computedStyle.stroke.value
            : null;

        const strokeWidth =
          computedStyle['stroke-width']?.type === 'static'
            ? computedStyle['stroke-width'].value
            : null;
        const transformPrecision = params.transformPrecision;

        if (
          computedStyle.stroke?.type === 'dynamic' ||
          computedStyle['stroke-width']?.type === 'dynamic'
        ) {
          return;
        }

        const scale = Number(
          Math.sqrt(
            matrix.data[0] * matrix.data[0] + matrix.data[1] * matrix.data[1],
          ).toFixed(transformPrecision),
        );

        if (stroke && stroke != 'none') {
          if (!params.applyTransformsStroked) {
            return;
          }

          // stroke cannot be transformed with different vertical and horizontal scale or skew
          if (
            (matrix.data[0] !== matrix.data[3] ||
              matrix.data[1] !== -matrix.data[2]) &&
            (matrix.data[0] !== -matrix.data[3] ||
              matrix.data[1] !== matrix.data[2])
          ) {
            return;
          }

          // apply transform to stroke-width, stroke-dashoffset and stroke-dasharray
          if (scale !== 1) {
            if (node.attributes['vector-effect'] !== 'non-scaling-stroke') {
              node.attributes['stroke-width'] = (
                strokeWidth || attrsGroupsDefaults.presentation['stroke-width']
              )
                .trim()
                .replace(regNumericValues, (num) =>
                  removeLeadingZero(Number(num) * scale),
                );

              if (node.attributes['stroke-dashoffset'] != null) {
                node.attributes['stroke-dashoffset'] = node.attributes[
                  'stroke-dashoffset'
                ]
                  .trim()
                  .replace(regNumericValues, (num) =>
                    removeLeadingZero(Number(num) * scale),
                  );
              }

              if (node.attributes['stroke-dasharray'] != null) {
                node.attributes['stroke-dasharray'] = node.attributes[
                  'stroke-dasharray'
                ]
                  .trim()
                  .replace(regNumericValues, (num) =>
                    removeLeadingZero(Number(num) * scale),
                  );
              }
            }
          }
        }

        const pathData = path2js(node);
        applyMatrixToPathData(pathData, matrix.data);

        // remove transform attr
        delete node.attributes.transform;
      },
    },
  };
};
exports.applyTransforms = applyTransforms;

/**
 * @type {(matrix: Matrix, x: number, y: number) => [number, number]}
 */
const transformAbsolutePoint = (matrix, x, y) => {
  const newX = matrix[0] * x + matrix[2] * y + matrix[4];
  const newY = matrix[1] * x + matrix[3] * y + matrix[5];
  return [newX, newY];
};

/**
 * @type {(matrix: Matrix, x: number, y: number) => [number, number]}
 */
const transformRelativePoint = (matrix, x, y) => {
  const newX = matrix[0] * x + matrix[2] * y;
  const newY = matrix[1] * x + matrix[3] * y;
  return [newX, newY];
};

/**
 * @type {(pathData: PathData, matrix: Matrix) => void}
 */
const applyMatrixToPathData = (pathData, matrix) => {
  /**
   * @type {[number, number]}
   */
  const start = [0, 0];
  /**
   * @type {[number, number]}
   */
  const cursor = [0, 0];

  for (const pathItem of pathData) {
    let { command, args } = pathItem;

    // moveto (x y)
    if (command === 'M') {
      cursor[0] = args[0];
      cursor[1] = args[1];
      start[0] = cursor[0];
      start[1] = cursor[1];
      const [x, y] = transformAbsolutePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }
    if (command === 'm') {
      cursor[0] += args[0];
      cursor[1] += args[1];
      start[0] = cursor[0];
      start[1] = cursor[1];
      const [x, y] = transformRelativePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }

    // horizontal lineto (x)
    // convert to lineto to handle two-dimentional transforms
    if (command === 'H') {
      command = 'L';
      args = [args[0], cursor[1]];
    }
    if (command === 'h') {
      command = 'l';
      args = [args[0], 0];
    }

    // vertical lineto (y)
    // convert to lineto to handle two-dimentional transforms
    if (command === 'V') {
      command = 'L';
      args = [cursor[0], args[0]];
    }
    if (command === 'v') {
      command = 'l';
      args = [0, args[0]];
    }

    // lineto (x y)
    if (command === 'L') {
      cursor[0] = args[0];
      cursor[1] = args[1];
      const [x, y] = transformAbsolutePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }
    if (command === 'l') {
      cursor[0] += args[0];
      cursor[1] += args[1];
      const [x, y] = transformRelativePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }

    // curveto (x1 y1 x2 y2 x y)
    if (command === 'C') {
      cursor[0] = args[4];
      cursor[1] = args[5];
      const [x1, y1] = transformAbsolutePoint(matrix, args[0], args[1]);
      const [x2, y2] = transformAbsolutePoint(matrix, args[2], args[3]);
      const [x, y] = transformAbsolutePoint(matrix, args[4], args[5]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x2;
      args[3] = y2;
      args[4] = x;
      args[5] = y;
    }
    if (command === 'c') {
      cursor[0] += args[4];
      cursor[1] += args[5];
      const [x1, y1] = transformRelativePoint(matrix, args[0], args[1]);
      const [x2, y2] = transformRelativePoint(matrix, args[2], args[3]);
      const [x, y] = transformRelativePoint(matrix, args[4], args[5]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x2;
      args[3] = y2;
      args[4] = x;
      args[5] = y;
    }

    // smooth curveto (x2 y2 x y)
    if (command === 'S') {
      cursor[0] = args[2];
      cursor[1] = args[3];
      const [x2, y2] = transformAbsolutePoint(matrix, args[0], args[1]);
      const [x, y] = transformAbsolutePoint(matrix, args[2], args[3]);
      args[0] = x2;
      args[1] = y2;
      args[2] = x;
      args[3] = y;
    }
    if (command === 's') {
      cursor[0] += args[2];
      cursor[1] += args[3];
      const [x2, y2] = transformRelativePoint(matrix, args[0], args[1]);
      const [x, y] = transformRelativePoint(matrix, args[2], args[3]);
      args[0] = x2;
      args[1] = y2;
      args[2] = x;
      args[3] = y;
    }

    // quadratic Bézier curveto (x1 y1 x y)
    if (command === 'Q') {
      cursor[0] = args[2];
      cursor[1] = args[3];
      const [x1, y1] = transformAbsolutePoint(matrix, args[0], args[1]);
      const [x, y] = transformAbsolutePoint(matrix, args[2], args[3]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x;
      args[3] = y;
    }
    if (command === 'q') {
      cursor[0] += args[2];
      cursor[1] += args[3];
      const [x1, y1] = transformRelativePoint(matrix, args[0], args[1]);
      const [x, y] = transformRelativePoint(matrix, args[2], args[3]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x;
      args[3] = y;
    }

    // smooth quadratic Bézier curveto (x y)
    if (command === 'T') {
      cursor[0] = args[0];
      cursor[1] = args[1];
      const [x, y] = transformAbsolutePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }
    if (command === 't') {
      cursor[0] += args[0];
      cursor[1] += args[1];
      const [x, y] = transformRelativePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }

    // elliptical arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
    if (command === 'A') {
      transformArc(cursor, args, matrix);
      cursor[0] = args[5];
      cursor[1] = args[6];
      // reduce number of digits in rotation angle
      if (Math.abs(args[2]) > 80) {
        const a = args[0];
        const rotation = args[2];
        args[0] = args[1];
        args[1] = a;
        args[2] = rotation + (rotation > 0 ? -90 : 90);
      }
      const [x, y] = transformAbsolutePoint(matrix, args[5], args[6]);
      args[5] = x;
      args[6] = y;
    }
    if (command === 'a') {
      transformArc([0, 0], args, matrix);
      cursor[0] += args[5];
      cursor[1] += args[6];
      // reduce number of digits in rotation angle
      if (Math.abs(args[2]) > 80) {
        const a = args[0];
        const rotation = args[2];
        args[0] = args[1];
        args[1] = a;
        args[2] = rotation + (rotation > 0 ? -90 : 90);
      }
      const [x, y] = transformRelativePoint(matrix, args[5], args[6]);
      args[5] = x;
      args[6] = y;
    }

    // closepath
    if (command === 'z' || command === 'Z') {
      cursor[0] = start[0];
      cursor[1] = start[1];
    }

    pathItem.command = command;
    pathItem.args = args;
  }
};
