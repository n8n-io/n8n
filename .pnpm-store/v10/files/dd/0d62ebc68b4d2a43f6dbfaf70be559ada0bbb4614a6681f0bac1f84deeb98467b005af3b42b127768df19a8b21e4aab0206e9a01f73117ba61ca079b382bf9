'use strict';

/**
 * @typedef {import('../lib//types').PathDataItem} PathDataItem
 */

const { collectStylesheet, computeStyle } = require('../lib/style.js');
const { visit } = require('../lib/xast.js');
const { pathElems } = require('./_collections.js');
const { path2js, js2path } = require('./_path.js');
const { applyTransforms } = require('./applyTransforms.js');
const { cleanupOutData, toFixed } = require('../lib/svgo/tools');

exports.name = 'convertPathData';
exports.description =
  'optimizes path data: writes in shorter form, applies transformations';

/** @type {(data: number[]) => number[]} */
let roundData;
/** @type {number | false} */
let precision;
/** @type {number} */
let error;
/** @type {number} */
let arcThreshold;
/** @type {number} */
let arcTolerance;

/**
 * @typedef {{
 *   applyTransforms: boolean,
 *   applyTransformsStroked: boolean,
 *   makeArcs: {
 *     threshold: number,
 *     tolerance: number,
 *   },
 *   straightCurves: boolean,
 *   convertToQ: boolean,
 *   lineShorthands: boolean,
 *   convertToZ: boolean,
 *   curveSmoothShorthands: boolean,
 *   floatPrecision: number | false,
 *   transformPrecision: number,
 *   smartArcRounding: boolean,
 *   removeUseless: boolean,
 *   collapseRepeated: boolean,
 *   utilizeAbsolute: boolean,
 *   leadingZero: boolean,
 *   negativeExtraSpace: boolean,
 *   noSpaceAfterFlags: boolean,
 *   forceAbsolutePath: boolean,
 * }} InternalParams
 */

/**
 * @typedef {[number, number]} Point
 */

/**
 * @typedef {{
 *   center: Point,
 *   radius: number
 * }} Circle
 */

/**
 * Convert absolute Path to relative,
 * collapse repeated instructions,
 * detect and convert Lineto shorthands,
 * remove useless instructions like "l0,0",
 * trim useless delimiters and leading zeros,
 * decrease accuracy of floating-point numbers.
 *
 * @see https://www.w3.org/TR/SVG11/paths.html#PathData
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types').Plugin<'convertPathData'>}
 */
exports.fn = (root, params) => {
  const {
    // TODO convert to separate plugin in v3
    applyTransforms: _applyTransforms = true,
    applyTransformsStroked = true,
    makeArcs = {
      threshold: 2.5, // coefficient of rounding error
      tolerance: 0.5, // percentage of radius
    },
    straightCurves = true,
    convertToQ = true,
    lineShorthands = true,
    convertToZ = true,
    curveSmoothShorthands = true,
    floatPrecision = 3,
    transformPrecision = 5,
    smartArcRounding = true,
    removeUseless = true,
    collapseRepeated = true,
    utilizeAbsolute = true,
    leadingZero = true,
    negativeExtraSpace = true,
    noSpaceAfterFlags = false, // a20 60 45 0 1 30 20 → a20 60 45 0130 20
    forceAbsolutePath = false,
  } = params;

  /**
   * @type {InternalParams}
   */
  const newParams = {
    applyTransforms: _applyTransforms,
    applyTransformsStroked,
    makeArcs,
    straightCurves,
    convertToQ,
    lineShorthands,
    convertToZ,
    curveSmoothShorthands,
    floatPrecision,
    transformPrecision,
    smartArcRounding,
    removeUseless,
    collapseRepeated,
    utilizeAbsolute,
    leadingZero,
    negativeExtraSpace,
    noSpaceAfterFlags,
    forceAbsolutePath,
  };

  // invoke applyTransforms plugin
  if (_applyTransforms) {
    visit(
      root,
      // @ts-ignore
      applyTransforms(root, {
        transformPrecision,
        applyTransformsStroked,
      }),
    );
  }

  const stylesheet = collectStylesheet(root);
  return {
    element: {
      enter: (node) => {
        if (pathElems.has(node.name) && node.attributes.d != null) {
          const computedStyle = computeStyle(stylesheet, node);
          precision = floatPrecision;
          error =
            precision !== false
              ? +Math.pow(0.1, precision).toFixed(precision)
              : 1e-2;
          roundData =
            precision && precision > 0 && precision < 20 ? strongRound : round;
          if (makeArcs) {
            arcThreshold = makeArcs.threshold;
            arcTolerance = makeArcs.tolerance;
          }
          const hasMarkerMid = computedStyle['marker-mid'] != null;

          const maybeHasStroke =
            computedStyle.stroke &&
            (computedStyle.stroke.type === 'dynamic' ||
              computedStyle.stroke.value !== 'none');
          const maybeHasLinecap =
            computedStyle['stroke-linecap'] &&
            (computedStyle['stroke-linecap'].type === 'dynamic' ||
              computedStyle['stroke-linecap'].value !== 'butt');
          const maybeHasStrokeAndLinecap = maybeHasStroke && maybeHasLinecap;
          const isSafeToUseZ = maybeHasStroke
            ? computedStyle['stroke-linecap']?.type === 'static' &&
              computedStyle['stroke-linecap'].value === 'round' &&
              computedStyle['stroke-linejoin']?.type === 'static' &&
              computedStyle['stroke-linejoin'].value === 'round'
            : true;

          var data = path2js(node);

          // TODO: get rid of functions returns
          if (data.length) {
            convertToRelative(data);

            data = filters(data, newParams, {
              isSafeToUseZ,
              maybeHasStrokeAndLinecap,
              hasMarkerMid,
            });

            if (utilizeAbsolute) {
              data = convertToMixed(data, newParams);
            }

            // @ts-ignore
            js2path(node, data, newParams);
          }
        }
      },
    },
  };
};

/**
 * Convert absolute path data coordinates to relative.
 *
 * @type {(pathData: PathDataItem[]) => PathDataItem[]}
 */
const convertToRelative = (pathData) => {
  let start = [0, 0];
  let cursor = [0, 0];
  let prevCoords = [0, 0];

  for (let i = 0; i < pathData.length; i += 1) {
    const pathItem = pathData[i];
    let { command, args } = pathItem;

    // moveto (x y)
    if (command === 'm') {
      // update start and cursor
      cursor[0] += args[0];
      cursor[1] += args[1];
      start[0] = cursor[0];
      start[1] = cursor[1];
    }
    if (command === 'M') {
      // M → m
      // skip first moveto
      if (i !== 0) {
        command = 'm';
      }
      args[0] -= cursor[0];
      args[1] -= cursor[1];
      // update start and cursor
      cursor[0] += args[0];
      cursor[1] += args[1];
      start[0] = cursor[0];
      start[1] = cursor[1];
    }

    // lineto (x y)
    if (command === 'l') {
      cursor[0] += args[0];
      cursor[1] += args[1];
    }
    if (command === 'L') {
      // L → l
      command = 'l';
      args[0] -= cursor[0];
      args[1] -= cursor[1];
      cursor[0] += args[0];
      cursor[1] += args[1];
    }

    // horizontal lineto (x)
    if (command === 'h') {
      cursor[0] += args[0];
    }
    if (command === 'H') {
      // H → h
      command = 'h';
      args[0] -= cursor[0];
      cursor[0] += args[0];
    }

    // vertical lineto (y)
    if (command === 'v') {
      cursor[1] += args[0];
    }
    if (command === 'V') {
      // V → v
      command = 'v';
      args[0] -= cursor[1];
      cursor[1] += args[0];
    }

    // curveto (x1 y1 x2 y2 x y)
    if (command === 'c') {
      cursor[0] += args[4];
      cursor[1] += args[5];
    }
    if (command === 'C') {
      // C → c
      command = 'c';
      args[0] -= cursor[0];
      args[1] -= cursor[1];
      args[2] -= cursor[0];
      args[3] -= cursor[1];
      args[4] -= cursor[0];
      args[5] -= cursor[1];
      cursor[0] += args[4];
      cursor[1] += args[5];
    }

    // smooth curveto (x2 y2 x y)
    if (command === 's') {
      cursor[0] += args[2];
      cursor[1] += args[3];
    }
    if (command === 'S') {
      // S → s
      command = 's';
      args[0] -= cursor[0];
      args[1] -= cursor[1];
      args[2] -= cursor[0];
      args[3] -= cursor[1];
      cursor[0] += args[2];
      cursor[1] += args[3];
    }

    // quadratic Bézier curveto (x1 y1 x y)
    if (command === 'q') {
      cursor[0] += args[2];
      cursor[1] += args[3];
    }
    if (command === 'Q') {
      // Q → q
      command = 'q';
      args[0] -= cursor[0];
      args[1] -= cursor[1];
      args[2] -= cursor[0];
      args[3] -= cursor[1];
      cursor[0] += args[2];
      cursor[1] += args[3];
    }

    // smooth quadratic Bézier curveto (x y)
    if (command === 't') {
      cursor[0] += args[0];
      cursor[1] += args[1];
    }
    if (command === 'T') {
      // T → t
      command = 't';
      args[0] -= cursor[0];
      args[1] -= cursor[1];
      cursor[0] += args[0];
      cursor[1] += args[1];
    }

    // elliptical arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
    if (command === 'a') {
      cursor[0] += args[5];
      cursor[1] += args[6];
    }
    if (command === 'A') {
      // A → a
      command = 'a';
      args[5] -= cursor[0];
      args[6] -= cursor[1];
      cursor[0] += args[5];
      cursor[1] += args[6];
    }

    // closepath
    if (command === 'Z' || command === 'z') {
      // reset cursor
      cursor[0] = start[0];
      cursor[1] = start[1];
    }

    pathItem.command = command;
    pathItem.args = args;
    // store absolute coordinates for later use
    // base should preserve reference from other element
    // @ts-ignore
    pathItem.base = prevCoords;
    // @ts-ignore
    pathItem.coords = [cursor[0], cursor[1]];
    // @ts-ignore
    prevCoords = pathItem.coords;
  }

  return pathData;
};

/**
 * Main filters loop.
 *
 * @type {(
 *   path: PathDataItem[],
 *   params: InternalParams,
 *   aux: { isSafeToUseZ: boolean, maybeHasStrokeAndLinecap: boolean, hasMarkerMid: boolean }
 * ) => PathDataItem[]}
 */
function filters(
  path,
  params,
  { isSafeToUseZ, maybeHasStrokeAndLinecap, hasMarkerMid },
) {
  const stringify = data2Path.bind(null, params);
  const relSubpoint = [0, 0];
  const pathBase = [0, 0];
  /** @type {any} */
  let prev = {};
  /** @type {Point | undefined} */
  let prevQControlPoint;

  path = path.filter(function (item, index, path) {
    const qControlPoint = prevQControlPoint;
    prevQControlPoint = undefined;

    let command = item.command;
    let data = item.args;
    let next = path[index + 1];

    if (command !== 'Z' && command !== 'z') {
      var sdata = data,
        circle;

      if (command === 's') {
        sdata = [0, 0].concat(data);

        const pdata = prev.args;
        const n = pdata.length;

        // (-x, -y) of the prev tangent point relative to the current point
        sdata[0] = pdata[n - 2] - pdata[n - 4];
        sdata[1] = pdata[n - 1] - pdata[n - 3];
      }

      // convert curves to arcs if possible
      if (
        params.makeArcs &&
        (command == 'c' || command == 's') &&
        isConvex(sdata) &&
        (circle = findCircle(sdata))
      ) {
        var r = roundData([circle.radius])[0],
          angle = findArcAngle(sdata, circle),
          sweep = sdata[5] * sdata[0] - sdata[4] * sdata[1] > 0 ? 1 : 0,
          /**
           * @type {PathDataItem}
           */
          arc = {
            command: 'a',
            args: [r, r, 0, 0, sweep, sdata[4], sdata[5]],
            // @ts-ignore
            coords: item.coords.slice(),
            // @ts-ignore
            base: item.base,
          },
          /**
           * @type {PathDataItem[]}
           */
          output = [arc],
          // relative coordinates to adjust the found circle
          /**
           * @type {Point}
           */
          relCenter = [
            circle.center[0] - sdata[4],
            circle.center[1] - sdata[5],
          ],
          relCircle = { center: relCenter, radius: circle.radius },
          arcCurves = [item],
          hasPrev = 0,
          suffix = '',
          nextLonghand;

        if (
          (prev.command == 'c' &&
            isConvex(prev.args) &&
            isArcPrev(prev.args, circle)) ||
          (prev.command == 'a' && prev.sdata && isArcPrev(prev.sdata, circle))
        ) {
          arcCurves.unshift(prev);
          // @ts-ignore
          arc.base = prev.base;
          // @ts-ignore
          arc.args[5] = arc.coords[0] - arc.base[0];
          // @ts-ignore
          arc.args[6] = arc.coords[1] - arc.base[1];
          var prevData = prev.command == 'a' ? prev.sdata : prev.args;
          var prevAngle = findArcAngle(prevData, {
            center: [
              prevData[4] + circle.center[0],
              prevData[5] + circle.center[1],
            ],
            radius: circle.radius,
          });
          angle += prevAngle;
          if (angle > Math.PI) arc.args[3] = 1;
          hasPrev = 1;
        }

        // check if next curves are fitting the arc
        for (
          var j = index;
          (next = path[++j]) && (next.command === 'c' || next.command === 's');

        ) {
          var nextData = next.args;
          if (next.command == 's') {
            nextLonghand = makeLonghand(
              { command: 's', args: next.args.slice() },
              path[j - 1].args,
            );
            nextData = nextLonghand.args;
            nextLonghand.args = nextData.slice(0, 2);
            suffix = stringify([nextLonghand]);
          }
          if (isConvex(nextData) && isArc(nextData, relCircle)) {
            angle += findArcAngle(nextData, relCircle);
            if (angle - 2 * Math.PI > 1e-3) break; // more than 360°
            if (angle > Math.PI) arc.args[3] = 1;
            arcCurves.push(next);
            if (2 * Math.PI - angle > 1e-3) {
              // less than 360°
              // @ts-ignore
              arc.coords = next.coords;
              // @ts-ignore
              arc.args[5] = arc.coords[0] - arc.base[0];
              // @ts-ignore
              arc.args[6] = arc.coords[1] - arc.base[1];
            } else {
              // full circle, make a half-circle arc and add a second one
              arc.args[5] = 2 * (relCircle.center[0] - nextData[4]);
              arc.args[6] = 2 * (relCircle.center[1] - nextData[5]);
              // @ts-ignore
              arc.coords = [
                // @ts-ignore
                arc.base[0] + arc.args[5],
                // @ts-ignore
                arc.base[1] + arc.args[6],
              ];
              arc = {
                command: 'a',
                args: [
                  r,
                  r,
                  0,
                  0,
                  sweep,
                  // @ts-ignore
                  next.coords[0] - arc.coords[0],
                  // @ts-ignore
                  next.coords[1] - arc.coords[1],
                ],
                // @ts-ignore
                coords: next.coords,
                // @ts-ignore
                base: arc.coords,
              };
              output.push(arc);
              j++;
              break;
            }
            relCenter[0] -= nextData[4];
            relCenter[1] -= nextData[5];
          } else break;
        }

        if ((stringify(output) + suffix).length < stringify(arcCurves).length) {
          if (path[j] && path[j].command == 's') {
            makeLonghand(path[j], path[j - 1].args);
          }
          if (hasPrev) {
            var prevArc = output.shift();
            // @ts-ignore
            roundData(prevArc.args);
            // @ts-ignore
            relSubpoint[0] += prevArc.args[5] - prev.args[prev.args.length - 2];
            // @ts-ignore
            relSubpoint[1] += prevArc.args[6] - prev.args[prev.args.length - 1];
            prev.command = 'a';
            // @ts-ignore
            prev.args = prevArc.args;
            // @ts-ignore
            item.base = prev.coords = prevArc.coords;
          }
          // @ts-ignore
          arc = output.shift();
          if (arcCurves.length == 1) {
            // @ts-ignore
            item.sdata = sdata.slice(); // preserve curve data for future checks
          } else if (arcCurves.length - 1 - hasPrev > 0) {
            // filter out consumed next items
            path.splice(index + 1, arcCurves.length - 1 - hasPrev, ...output);
          }
          if (!arc) return false;
          command = 'a';
          data = arc.args;
          // @ts-ignore
          item.coords = arc.coords;
        }
      }

      // Rounding relative coordinates, taking in account accumulating error
      // to get closer to absolute coordinates. Sum of rounded value remains same:
      // l .25 3 .25 2 .25 3 .25 2 -> l .3 3 .2 2 .3 3 .2 2
      if (precision !== false) {
        if (
          command === 'm' ||
          command === 'l' ||
          command === 't' ||
          command === 'q' ||
          command === 's' ||
          command === 'c'
        ) {
          for (var i = data.length; i--; ) {
            // @ts-ignore
            data[i] += item.base[i % 2] - relSubpoint[i % 2];
          }
        } else if (command == 'h') {
          // @ts-ignore
          data[0] += item.base[0] - relSubpoint[0];
        } else if (command == 'v') {
          // @ts-ignore
          data[0] += item.base[1] - relSubpoint[1];
        } else if (command == 'a') {
          // @ts-ignore
          data[5] += item.base[0] - relSubpoint[0];
          // @ts-ignore
          data[6] += item.base[1] - relSubpoint[1];
        }
        roundData(data);

        if (command == 'h') relSubpoint[0] += data[0];
        else if (command == 'v') relSubpoint[1] += data[0];
        else {
          relSubpoint[0] += data[data.length - 2];
          relSubpoint[1] += data[data.length - 1];
        }
        roundData(relSubpoint);

        if (command === 'M' || command === 'm') {
          pathBase[0] = relSubpoint[0];
          pathBase[1] = relSubpoint[1];
        }
      }

      // round arc radius more accurately
      // eg m 0 0 a 1234.567 1234.567 0 0 1 10 0 -> m 0 0 a 1235 1235 0 0 1 10 0
      const sagitta = command === 'a' ? calculateSagitta(data) : undefined;
      if (params.smartArcRounding && sagitta !== undefined && precision) {
        for (let precisionNew = precision; precisionNew >= 0; precisionNew--) {
          const radius = toFixed(data[0], precisionNew);
          const sagittaNew = /** @type {number} */ (
            calculateSagitta([radius, radius, ...data.slice(2)])
          );
          if (Math.abs(sagitta - sagittaNew) < error) {
            data[0] = radius;
            data[1] = radius;
          } else {
            break;
          }
        }
      }

      // convert straight curves into lines segments
      if (params.straightCurves) {
        if (
          (command === 'c' && isCurveStraightLine(data)) ||
          (command === 's' && isCurveStraightLine(sdata))
        ) {
          if (next && next.command == 's') makeLonghand(next, data); // fix up next curve
          command = 'l';
          data = data.slice(-2);
        } else if (command === 'q' && isCurveStraightLine(data)) {
          if (next && next.command == 't') makeLonghand(next, data); // fix up next curve
          command = 'l';
          data = data.slice(-2);
        } else if (
          command === 't' &&
          prev.command !== 'q' &&
          prev.command !== 't'
        ) {
          command = 'l';
          data = data.slice(-2);
        } else if (
          command === 'a' &&
          (data[0] === 0 ||
            data[1] === 0 ||
            (sagitta !== undefined && sagitta < error))
        ) {
          command = 'l';
          data = data.slice(-2);
        }
      }

      // degree-lower c to q when possible
      // m 0 12 C 4 4 8 4 12 12 → M 0 12 Q 6 0 12 12
      if (params.convertToQ && command == 'c') {
        const x1 =
          // @ts-ignore
          0.75 * (item.base[0] + data[0]) - 0.25 * item.base[0];
        const x2 =
          // @ts-ignore
          0.75 * (item.base[0] + data[2]) - 0.25 * (item.base[0] + data[4]);
        if (Math.abs(x1 - x2) < error * 2) {
          const y1 =
            // @ts-ignore
            0.75 * (item.base[1] + data[1]) - 0.25 * item.base[1];
          const y2 =
            // @ts-ignore
            0.75 * (item.base[1] + data[3]) - 0.25 * (item.base[1] + data[5]);
          if (Math.abs(y1 - y2) < error * 2) {
            const newData = data.slice();
            newData.splice(
              0,
              4,
              // @ts-ignore
              x1 + x2 - item.base[0],
              // @ts-ignore
              y1 + y2 - item.base[1],
            );
            roundData(newData);
            const originalLength = cleanupOutData(data, params).length,
              newLength = cleanupOutData(newData, params).length;
            if (newLength < originalLength) {
              command = 'q';
              data = newData;
              if (next && next.command == 's') makeLonghand(next, data); // fix up next curve
            }
          }
        }
      }

      // horizontal and vertical line shorthands
      // l 50 0 → h 50
      // l 0 50 → v 50
      if (params.lineShorthands && command === 'l') {
        if (data[1] === 0) {
          command = 'h';
          data.pop();
        } else if (data[0] === 0) {
          command = 'v';
          data.shift();
        }
      }

      // collapse repeated commands
      // h 20 h 30 -> h 50
      if (
        params.collapseRepeated &&
        hasMarkerMid === false &&
        (command === 'm' || command === 'h' || command === 'v') &&
        prev.command &&
        command == prev.command.toLowerCase() &&
        ((command != 'h' && command != 'v') ||
          prev.args[0] >= 0 == data[0] >= 0)
      ) {
        prev.args[0] += data[0];
        if (command != 'h' && command != 'v') {
          prev.args[1] += data[1];
        }
        // @ts-ignore
        prev.coords = item.coords;
        path[index] = prev;
        return false;
      }

      // convert curves into smooth shorthands
      if (params.curveSmoothShorthands && prev.command) {
        // curveto
        if (command === 'c') {
          // c + c → c + s
          if (
            prev.command === 'c' &&
            Math.abs(data[0] - -(prev.args[2] - prev.args[4])) < error &&
            Math.abs(data[1] - -(prev.args[3] - prev.args[5])) < error
          ) {
            command = 's';
            data = data.slice(2);
          }

          // s + c → s + s
          else if (
            prev.command === 's' &&
            Math.abs(data[0] - -(prev.args[0] - prev.args[2])) < error &&
            Math.abs(data[1] - -(prev.args[1] - prev.args[3])) < error
          ) {
            command = 's';
            data = data.slice(2);
          }

          // [^cs] + c → [^cs] + s
          else if (
            prev.command !== 'c' &&
            prev.command !== 's' &&
            Math.abs(data[0]) < error &&
            Math.abs(data[1]) < error
          ) {
            command = 's';
            data = data.slice(2);
          }
        }

        // quadratic Bézier curveto
        else if (command === 'q') {
          // q + q → q + t
          if (
            prev.command === 'q' &&
            Math.abs(data[0] - (prev.args[2] - prev.args[0])) < error &&
            Math.abs(data[1] - (prev.args[3] - prev.args[1])) < error
          ) {
            command = 't';
            data = data.slice(2);
          }

          // t + q → t + t
          else if (prev.command === 't') {
            const predictedControlPoint = reflectPoint(
              // @ts-ignore
              qControlPoint,
              // @ts-ignore
              item.base,
            );
            const realControlPoint = [
              // @ts-ignore
              data[0] + item.base[0],
              // @ts-ignore
              data[1] + item.base[1],
            ];
            if (
              Math.abs(predictedControlPoint[0] - realControlPoint[0]) <
                error &&
              Math.abs(predictedControlPoint[1] - realControlPoint[1]) < error
            ) {
              command = 't';
              data = data.slice(2);
            }
          }
        }
      }

      // remove useless non-first path segments
      if (params.removeUseless && !maybeHasStrokeAndLinecap) {
        // l 0,0 / h 0 / v 0 / q 0,0 0,0 / t 0,0 / c 0,0 0,0 0,0 / s 0,0 0,0
        if (
          (command === 'l' ||
            command === 'h' ||
            command === 'v' ||
            command === 'q' ||
            command === 't' ||
            command === 'c' ||
            command === 's') &&
          data.every(function (i) {
            return i === 0;
          })
        ) {
          path[index] = prev;
          return false;
        }

        // a 25,25 -30 0,1 0,0
        if (command === 'a' && data[5] === 0 && data[6] === 0) {
          path[index] = prev;
          return false;
        }
      }

      // convert going home to z
      // m 0 0 h 5 v 5 l -5 -5 -> m 0 0 h 5 v 5 z
      if (
        params.convertToZ &&
        (isSafeToUseZ || next?.command === 'Z' || next?.command === 'z') &&
        (command === 'l' || command === 'h' || command === 'v')
      ) {
        if (
          // @ts-ignore
          Math.abs(pathBase[0] - item.coords[0]) < error &&
          // @ts-ignore
          Math.abs(pathBase[1] - item.coords[1]) < error
        ) {
          command = 'z';
          data = [];
        }
      }

      item.command = command;
      item.args = data;
    } else {
      // z resets coordinates
      relSubpoint[0] = pathBase[0];
      relSubpoint[1] = pathBase[1];
      if (prev.command === 'Z' || prev.command === 'z') return false;
    }
    if (
      (command === 'Z' || command === 'z') &&
      params.removeUseless &&
      isSafeToUseZ &&
      // @ts-ignore
      Math.abs(item.base[0] - item.coords[0]) < error / 10 &&
      // @ts-ignore
      Math.abs(item.base[1] - item.coords[1]) < error / 10
    )
      return false;

    if (command === 'q') {
      // @ts-ignore
      prevQControlPoint = [data[0] + item.base[0], data[1] + item.base[1]];
    } else if (command === 't') {
      if (qControlPoint) {
        // @ts-ignore
        prevQControlPoint = reflectPoint(qControlPoint, item.base);
      } else {
        // @ts-ignore
        prevQControlPoint = item.coords;
      }
    }
    prev = item;
    return true;
  });

  return path;
}

/**
 * Writes data in shortest form using absolute or relative coordinates.
 *
 * @type {(path: PathDataItem[], params: InternalParams) => PathDataItem[]}
 */
function convertToMixed(path, params) {
  var prev = path[0];

  path = path.filter(function (item, index) {
    if (index == 0) return true;
    if (item.command === 'Z' || item.command === 'z') {
      prev = item;
      return true;
    }

    var command = item.command,
      data = item.args,
      adata = data.slice(),
      rdata = data.slice();

    if (
      command === 'm' ||
      command === 'l' ||
      command === 't' ||
      command === 'q' ||
      command === 's' ||
      command === 'c'
    ) {
      for (var i = adata.length; i--; ) {
        // @ts-ignore
        adata[i] += item.base[i % 2];
      }
    } else if (command == 'h') {
      // @ts-ignore
      adata[0] += item.base[0];
    } else if (command == 'v') {
      // @ts-ignore
      adata[0] += item.base[1];
    } else if (command == 'a') {
      // @ts-ignore
      adata[5] += item.base[0];
      // @ts-ignore
      adata[6] += item.base[1];
    }

    roundData(adata);
    roundData(rdata);

    var absoluteDataStr = cleanupOutData(adata, params),
      relativeDataStr = cleanupOutData(rdata, params);

    // Convert to absolute coordinates if it's shorter or forceAbsolutePath is true.
    // v-20 -> V0
    // Don't convert if it fits following previous command.
    // l20 30-10-50 instead of l20 30L20 30
    if (
      params.forceAbsolutePath ||
      (absoluteDataStr.length < relativeDataStr.length &&
        !(
          params.negativeExtraSpace &&
          command == prev.command &&
          prev.command.charCodeAt(0) > 96 &&
          absoluteDataStr.length == relativeDataStr.length - 1 &&
          (data[0] < 0 ||
            (Math.floor(data[0]) === 0 &&
              !Number.isInteger(data[0]) &&
              prev.args[prev.args.length - 1] % 1))
        ))
    ) {
      // @ts-ignore
      item.command = command.toUpperCase();
      item.args = adata;
    }

    prev = item;
    return true;
  });

  return path;
}

/**
 * Checks if curve is convex. Control points of such a curve must form
 * a convex quadrilateral with diagonals crosspoint inside of it.
 *
 * @type {(data: number[]) => boolean}
 */
function isConvex(data) {
  var center = getIntersection([
    0,
    0,
    data[2],
    data[3],
    data[0],
    data[1],
    data[4],
    data[5],
  ]);

  return (
    center != null &&
    data[2] < center[0] == center[0] < 0 &&
    data[3] < center[1] == center[1] < 0 &&
    data[4] < center[0] == center[0] < data[0] &&
    data[5] < center[1] == center[1] < data[1]
  );
}

/**
 * Computes lines equations by two points and returns their intersection point.
 *
 * @type {(coords: number[]) => undefined | Point}
 */
function getIntersection(coords) {
  // Prev line equation parameters.
  var a1 = coords[1] - coords[3], // y1 - y2
    b1 = coords[2] - coords[0], // x2 - x1
    c1 = coords[0] * coords[3] - coords[2] * coords[1], // x1 * y2 - x2 * y1
    // Next line equation parameters
    a2 = coords[5] - coords[7], // y1 - y2
    b2 = coords[6] - coords[4], // x2 - x1
    c2 = coords[4] * coords[7] - coords[5] * coords[6], // x1 * y2 - x2 * y1
    denom = a1 * b2 - a2 * b1;

  if (!denom) return; // parallel lines haven't an intersection

  /**
   * @type {Point}
   */
  var cross = [(b1 * c2 - b2 * c1) / denom, (a1 * c2 - a2 * c1) / -denom];
  if (
    !isNaN(cross[0]) &&
    !isNaN(cross[1]) &&
    isFinite(cross[0]) &&
    isFinite(cross[1])
  ) {
    return cross;
  }
}

/**
 * Decrease accuracy of floating-point numbers
 * in path data keeping a specified number of decimals.
 * Smart rounds values like 2.3491 to 2.35 instead of 2.349.
 * Doesn't apply "smartness" if the number precision fits already.
 *
 * @type {(data: number[]) => number[]}
 */
function strongRound(data) {
  const precisionNum = precision || 0;
  for (let i = data.length; i-- > 0; ) {
    const fixed = toFixed(data[i], precisionNum);
    if (fixed !== data[i]) {
      const rounded = toFixed(data[i], precisionNum - 1);
      data[i] =
        toFixed(Math.abs(rounded - data[i]), precisionNum + 1) >= error
          ? fixed
          : rounded;
    }
  }
  return data;
}

/**
 * Simple rounding function if precision is 0.
 *
 * @type {(data: number[]) => number[]}
 */
function round(data) {
  for (var i = data.length; i-- > 0; ) {
    data[i] = Math.round(data[i]);
  }
  return data;
}

/**
 * Checks if a curve is a straight line by measuring distance
 * from middle points to the line formed by end points.
 *
 * @type {(data: number[]) => boolean}
 */
function isCurveStraightLine(data) {
  // Get line equation a·x + b·y + c = 0 coefficients a, b (c = 0) by start and end points.
  var i = data.length - 2,
    a = -data[i + 1], // y1 − y2 (y1 = 0)
    b = data[i], // x2 − x1 (x1 = 0)
    d = 1 / (a * a + b * b); // same part for all points

  if (i <= 1 || !isFinite(d)) return false; // curve that ends at start point isn't the case

  // Distance from point (x0, y0) to the line is sqrt((c − a·x0 − b·y0)² / (a² + b²))
  while ((i -= 2) >= 0) {
    if (Math.sqrt(Math.pow(a * data[i] + b * data[i + 1], 2) * d) > error)
      return false;
  }

  return true;
}

/**
 * Calculates the sagitta of an arc if possible.
 *
 * @type {(data: number[]) => number | undefined}
 * @see https://wikipedia.org/wiki/Sagitta_(geometry)#Formulas
 */
function calculateSagitta(data) {
  if (data[3] === 1) return undefined;
  const [rx, ry] = data;
  if (Math.abs(rx - ry) > error) return undefined;
  const chord = Math.sqrt(data[5] ** 2 + data[6] ** 2);
  if (chord > rx * 2) return undefined;
  return rx - Math.sqrt(rx ** 2 - 0.25 * chord ** 2);
}

/**
 * Converts next curve from shorthand to full form using the current curve data.
 *
 * @type {(item: PathDataItem, data: number[]) => PathDataItem}
 */
function makeLonghand(item, data) {
  switch (item.command) {
    case 's':
      item.command = 'c';
      break;
    case 't':
      item.command = 'q';
      break;
  }
  item.args.unshift(
    data[data.length - 2] - data[data.length - 4],
    data[data.length - 1] - data[data.length - 3],
  );
  return item;
}

/**
 * Returns distance between two points
 *
 * @type {(point1: Point, point2: Point) => number}
 */
function getDistance(point1, point2) {
  return Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
}

/**
 * Reflects point across another point.
 *
 * @param {Point} controlPoint
 * @param {Point} base
 * @returns {Point}
 */
function reflectPoint(controlPoint, base) {
  return [2 * base[0] - controlPoint[0], 2 * base[1] - controlPoint[1]];
}

/**
 * Returns coordinates of the curve point corresponding to the certain t
 * a·(1 - t)³·p1 + b·(1 - t)²·t·p2 + c·(1 - t)·t²·p3 + d·t³·p4,
 * where pN are control points and p1 is zero due to relative coordinates.
 *
 * @type {(curve: number[], t: number) => Point}
 */
function getCubicBezierPoint(curve, t) {
  var sqrT = t * t,
    cubT = sqrT * t,
    mt = 1 - t,
    sqrMt = mt * mt;

  return [
    3 * sqrMt * t * curve[0] + 3 * mt * sqrT * curve[2] + cubT * curve[4],
    3 * sqrMt * t * curve[1] + 3 * mt * sqrT * curve[3] + cubT * curve[5],
  ];
}

/**
 * Finds circle by 3 points of the curve and checks if the curve fits the found circle.
 *
 * @type {(curve: number[]) => undefined | Circle}
 */
function findCircle(curve) {
  var midPoint = getCubicBezierPoint(curve, 1 / 2),
    m1 = [midPoint[0] / 2, midPoint[1] / 2],
    m2 = [(midPoint[0] + curve[4]) / 2, (midPoint[1] + curve[5]) / 2],
    center = getIntersection([
      m1[0],
      m1[1],
      m1[0] + m1[1],
      m1[1] - m1[0],
      m2[0],
      m2[1],
      m2[0] + (m2[1] - midPoint[1]),
      m2[1] - (m2[0] - midPoint[0]),
    ]),
    radius = center && getDistance([0, 0], center),
    // @ts-ignore
    tolerance = Math.min(arcThreshold * error, (arcTolerance * radius) / 100);

  if (
    center &&
    // @ts-ignore
    radius < 1e15 &&
    [1 / 4, 3 / 4].every(function (point) {
      return (
        Math.abs(
          // @ts-ignore
          getDistance(getCubicBezierPoint(curve, point), center) - radius,
        ) <= tolerance
      );
    })
  )
    // @ts-ignore
    return { center: center, radius: radius };
}

/**
 * Checks if a curve fits the given circle.
 *
 * @type {(curve: number[], circle: Circle) => boolean}
 */
function isArc(curve, circle) {
  var tolerance = Math.min(
    arcThreshold * error,
    (arcTolerance * circle.radius) / 100,
  );

  return [0, 1 / 4, 1 / 2, 3 / 4, 1].every(function (point) {
    return (
      Math.abs(
        getDistance(getCubicBezierPoint(curve, point), circle.center) -
          circle.radius,
      ) <= tolerance
    );
  });
}

/**
 * Checks if a previous curve fits the given circle.
 *
 * @type {(curve: number[], circle: Circle) => boolean}
 */
function isArcPrev(curve, circle) {
  return isArc(curve, {
    center: [circle.center[0] + curve[4], circle.center[1] + curve[5]],
    radius: circle.radius,
  });
}

/**
 * Finds angle of a curve fitting the given arc.

 * @type {(curve: number[], relCircle: Circle) => number}
 */
function findArcAngle(curve, relCircle) {
  var x1 = -relCircle.center[0],
    y1 = -relCircle.center[1],
    x2 = curve[4] - relCircle.center[0],
    y2 = curve[5] - relCircle.center[1];

  return Math.acos(
    (x1 * x2 + y1 * y2) / Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)),
  );
}

/**
 * Converts given path data to string.
 *
 * @type {(params: InternalParams, pathData: PathDataItem[]) => string}
 */
function data2Path(params, pathData) {
  return pathData.reduce(function (pathString, item) {
    var strData = '';
    if (item.args) {
      strData = cleanupOutData(roundData(item.args.slice()), params);
    }
    return pathString + item.command + strData;
  }, '');
}
