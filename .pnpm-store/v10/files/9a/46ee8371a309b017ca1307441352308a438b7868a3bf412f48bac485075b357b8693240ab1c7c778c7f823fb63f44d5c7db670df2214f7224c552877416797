/**
 * Copyright (c) 2021 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { throwIfFalsy } from 'browser/renderer/shared/RendererUtils';

interface IBlockVector {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const blockElementDefinitions: { [index: string]: IBlockVector[] | undefined } = {
  // Block elements (0x2580-0x2590)
  '▀': [{ x: 0, y: 0, w: 8, h: 4 }], // UPPER HALF BLOCK
  '▁': [{ x: 0, y: 7, w: 8, h: 1 }], // LOWER ONE EIGHTH BLOCK
  '▂': [{ x: 0, y: 6, w: 8, h: 2 }], // LOWER ONE QUARTER BLOCK
  '▃': [{ x: 0, y: 5, w: 8, h: 3 }], // LOWER THREE EIGHTHS BLOCK
  '▄': [{ x: 0, y: 4, w: 8, h: 4 }], // LOWER HALF BLOCK
  '▅': [{ x: 0, y: 3, w: 8, h: 5 }], // LOWER FIVE EIGHTHS BLOCK
  '▆': [{ x: 0, y: 2, w: 8, h: 6 }], // LOWER THREE QUARTERS BLOCK
  '▇': [{ x: 0, y: 1, w: 8, h: 7 }], // LOWER SEVEN EIGHTHS BLOCK
  '█': [{ x: 0, y: 0, w: 8, h: 8 }], // FULL BLOCK
  '▉': [{ x: 0, y: 0, w: 7, h: 8 }], // LEFT SEVEN EIGHTHS BLOCK
  '▊': [{ x: 0, y: 0, w: 6, h: 8 }], // LEFT THREE QUARTERS BLOCK
  '▋': [{ x: 0, y: 0, w: 5, h: 8 }], // LEFT FIVE EIGHTHS BLOCK
  '▌': [{ x: 0, y: 0, w: 4, h: 8 }], // LEFT HALF BLOCK
  '▍': [{ x: 0, y: 0, w: 3, h: 8 }], // LEFT THREE EIGHTHS BLOCK
  '▎': [{ x: 0, y: 0, w: 2, h: 8 }], // LEFT ONE QUARTER BLOCK
  '▏': [{ x: 0, y: 0, w: 1, h: 8 }], // LEFT ONE EIGHTH BLOCK
  '▐': [{ x: 4, y: 0, w: 4, h: 8 }], // RIGHT HALF BLOCK

  // Block elements (0x2594-0x2595)
  '▔': [{ x: 0, y: 0, w: 8, h: 1 }], // UPPER ONE EIGHTH BLOCK
  '▕': [{ x: 7, y: 0, w: 1, h: 8 }], // RIGHT ONE EIGHTH BLOCK

  // Terminal graphic characters (0x2596-0x259F)
  '▖': [{ x: 0, y: 4, w: 4, h: 4 }],                             // QUADRANT LOWER LEFT
  '▗': [{ x: 4, y: 4, w: 4, h: 4 }],                             // QUADRANT LOWER RIGHT
  '▘': [{ x: 0, y: 0, w: 4, h: 4 }],                             // QUADRANT UPPER LEFT
  '▙': [{ x: 0, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], // QUADRANT UPPER LEFT AND LOWER LEFT AND LOWER RIGHT
  '▚': [{ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 4, w: 4, h: 4 }], // QUADRANT UPPER LEFT AND LOWER RIGHT
  '▛': [{ x: 0, y: 0, w: 4, h: 8 }, { x: 4, y: 0, w: 4, h: 4 }], // QUADRANT UPPER LEFT AND UPPER RIGHT AND LOWER LEFT
  '▜': [{ x: 0, y: 0, w: 8, h: 4 }, { x: 4, y: 0, w: 4, h: 8 }], // QUADRANT UPPER LEFT AND UPPER RIGHT AND LOWER RIGHT
  '▝': [{ x: 4, y: 0, w: 4, h: 4 }],                             // QUADRANT UPPER RIGHT
  '▞': [{ x: 4, y: 0, w: 4, h: 4 }, { x: 0, y: 4, w: 4, h: 4 }], // QUADRANT UPPER RIGHT AND LOWER LEFT
  '▟': [{ x: 4, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], // QUADRANT UPPER RIGHT AND LOWER LEFT AND LOWER RIGHT

  // VERTICAL ONE EIGHTH BLOCK-2 through VERTICAL ONE EIGHTH BLOCK-7
  '\u{1FB70}': [{ x: 1, y: 0, w: 1, h: 8 }],
  '\u{1FB71}': [{ x: 2, y: 0, w: 1, h: 8 }],
  '\u{1FB72}': [{ x: 3, y: 0, w: 1, h: 8 }],
  '\u{1FB73}': [{ x: 4, y: 0, w: 1, h: 8 }],
  '\u{1FB74}': [{ x: 5, y: 0, w: 1, h: 8 }],
  '\u{1FB75}': [{ x: 6, y: 0, w: 1, h: 8 }],

  // HORIZONTAL ONE EIGHTH BLOCK-2 through HORIZONTAL ONE EIGHTH BLOCK-7
  '\u{1FB76}': [{ x: 0, y: 1, w: 8, h: 1 }],
  '\u{1FB77}': [{ x: 0, y: 2, w: 8, h: 1 }],
  '\u{1FB78}': [{ x: 0, y: 3, w: 8, h: 1 }],
  '\u{1FB79}': [{ x: 0, y: 4, w: 8, h: 1 }],
  '\u{1FB7A}': [{ x: 0, y: 5, w: 8, h: 1 }],
  '\u{1FB7B}': [{ x: 0, y: 6, w: 8, h: 1 }],

  // LEFT AND LOWER ONE EIGHTH BLOCK
  '\u{1FB7C}': [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }],
  // LEFT AND UPPER ONE EIGHTH BLOCK
  '\u{1FB7D}': [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }],
  // RIGHT AND UPPER ONE EIGHTH BLOCK
  '\u{1FB7E}': [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }],
  // RIGHT AND LOWER ONE EIGHTH BLOCK
  '\u{1FB7F}': [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }],
  // UPPER AND LOWER ONE EIGHTH BLOCK
  '\u{1FB80}': [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }],
  // HORIZONTAL ONE EIGHTH BLOCK-1358
  '\u{1FB81}': [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 2, w: 8, h: 1 }, { x: 0, y: 4, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }],

  // UPPER ONE QUARTER BLOCK
  '\u{1FB82}': [{ x: 0, y: 0, w: 8, h: 2 }],
  // UPPER THREE EIGHTHS BLOCK
  '\u{1FB83}': [{ x: 0, y: 0, w: 8, h: 3 }],
  // UPPER FIVE EIGHTHS BLOCK
  '\u{1FB84}': [{ x: 0, y: 0, w: 8, h: 5 }],
  // UPPER THREE QUARTERS BLOCK
  '\u{1FB85}': [{ x: 0, y: 0, w: 8, h: 6 }],
  // UPPER SEVEN EIGHTHS BLOCK
  '\u{1FB86}': [{ x: 0, y: 0, w: 8, h: 7 }],

  // RIGHT ONE QUARTER BLOCK
  '\u{1FB87}': [{ x: 6, y: 0, w: 2, h: 8 }],
  // RIGHT THREE EIGHTHS B0OCK
  '\u{1FB88}': [{ x: 5, y: 0, w: 3, h: 8 }],
  // RIGHT FIVE EIGHTHS BL0CK
  '\u{1FB89}': [{ x: 3, y: 0, w: 5, h: 8 }],
  // RIGHT THREE QUARTERS 0LOCK
  '\u{1FB8A}': [{ x: 2, y: 0, w: 6, h: 8 }],
  // RIGHT SEVEN EIGHTHS B0OCK
  '\u{1FB8B}': [{ x: 1, y: 0, w: 7, h: 8 }],

  // CHECKER BOARD FILL
  '\u{1FB95}': [
    { x: 0, y: 0, w: 2, h: 2 }, { x: 4, y: 0, w: 2, h: 2 },
    { x: 2, y: 2, w: 2, h: 2 }, { x: 6, y: 2, w: 2, h: 2 },
    { x: 0, y: 4, w: 2, h: 2 }, { x: 4, y: 4, w: 2, h: 2 },
    { x: 2, y: 6, w: 2, h: 2 }, { x: 6, y: 6, w: 2, h: 2 }
  ],
  // INVERSE CHECKER BOARD FILL
  '\u{1FB96}': [
    { x: 2, y: 0, w: 2, h: 2 }, { x: 6, y: 0, w: 2, h: 2 },
    { x: 0, y: 2, w: 2, h: 2 }, { x: 4, y: 2, w: 2, h: 2 },
    { x: 2, y: 4, w: 2, h: 2 }, { x: 6, y: 4, w: 2, h: 2 },
    { x: 0, y: 6, w: 2, h: 2 }, { x: 4, y: 6, w: 2, h: 2 }
  ],
  // HEAVY HORIZONTAL FILL (upper middle and lower one quarter block)
  '\u{1FB97}': [{ x: 0, y: 2, w: 8, h: 2 }, { x: 0, y: 6, w: 8, h: 2 }]
};

type PatternDefinition = number[][];

/**
 * Defines the repeating pattern used by special characters, the pattern is made up of a 2d array of
 * pixel values to be filled (1) or not filled (0).
 */
const patternCharacterDefinitions: { [key: string]: PatternDefinition | undefined } = {
  // Shade characters (0x2591-0x2593)
  '░': [ // LIGHT SHADE (25%)
    [1, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 0]
  ],
  '▒': [ // MEDIUM SHADE (50%)
    [1, 0],
    [0, 0],
    [0, 1],
    [0, 0]
  ],
  '▓': [ // DARK SHADE (75%)
    [0, 1],
    [1, 1],
    [1, 0],
    [1, 1]
  ]
};

const enum Shapes {
  /** │ */ TOP_TO_BOTTOM = 'M.5,0 L.5,1',
  /** ─ */ LEFT_TO_RIGHT = 'M0,.5 L1,.5',

  /** └ */ TOP_TO_RIGHT = 'M.5,0 L.5,.5 L1,.5',
  /** ┘ */ TOP_TO_LEFT = 'M.5,0 L.5,.5 L0,.5',
  /** ┐ */ LEFT_TO_BOTTOM = 'M0,.5 L.5,.5 L.5,1',
  /** ┌ */ RIGHT_TO_BOTTOM = 'M0.5,1 L.5,.5 L1,.5',

  /** ╵ */ MIDDLE_TO_TOP = 'M.5,.5 L.5,0',
  /** ╴ */ MIDDLE_TO_LEFT = 'M.5,.5 L0,.5',
  /** ╶ */ MIDDLE_TO_RIGHT = 'M.5,.5 L1,.5',
  /** ╷ */ MIDDLE_TO_BOTTOM = 'M.5,.5 L.5,1',

  /** ┴ */ T_TOP = 'M0,.5 L1,.5 M.5,.5 L.5,0',
  /** ┤ */ T_LEFT = 'M.5,0 L.5,1 M.5,.5 L0,.5',
  /** ├ */ T_RIGHT = 'M.5,0 L.5,1 M.5,.5 L1,.5',
  /** ┬ */ T_BOTTOM = 'M0,.5 L1,.5 M.5,.5 L.5,1',

  /** ┼ */ CROSS = 'M0,.5 L1,.5 M.5,0 L.5,1',

  /** ╌ */ TWO_DASHES_HORIZONTAL = 'M.1,.5 L.4,.5 M.6,.5 L.9,.5', // .2 empty, .3 filled
  /** ┄ */ THREE_DASHES_HORIZONTAL = 'M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5', // .1333 empty, .2 filled
  /** ┉ */ FOUR_DASHES_HORIZONTAL = 'M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5', // .1 empty, .15 filled
  /** ╎ */ TWO_DASHES_VERTICAL = 'M.5,.1 L.5,.4 M.5,.6 L.5,.9',
  /** ┆ */ THREE_DASHES_VERTICAL = 'M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333',
  /** ┊ */ FOUR_DASHES_VERTICAL = 'M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95',
}

const enum Style {
  NORMAL = 1,
  BOLD = 3
}

/**
 * @param xp The percentage of 15% of the x axis.
 * @param yp The percentage of 15% of the x axis on the y axis.
 */
type DrawFunctionDefinition = (xp: number, yp: number) => string;

/**
 * This contains the definitions of all box drawing characters in the format of SVG paths (ie. the
 * svg d attribute).
 */
export const boxDrawingDefinitions: { [character: string]: { [fontWeight: number]: string | DrawFunctionDefinition } | undefined } = {
  // Uniform normal and bold
  '─': { [Style.NORMAL]: Shapes.LEFT_TO_RIGHT },
  '━': { [Style.BOLD]:   Shapes.LEFT_TO_RIGHT },
  '│': { [Style.NORMAL]: Shapes.TOP_TO_BOTTOM },
  '┃': { [Style.BOLD]:   Shapes.TOP_TO_BOTTOM },
  '┌': { [Style.NORMAL]: Shapes.RIGHT_TO_BOTTOM },
  '┏': { [Style.BOLD]:   Shapes.RIGHT_TO_BOTTOM },
  '┐': { [Style.NORMAL]: Shapes.LEFT_TO_BOTTOM },
  '┓': { [Style.BOLD]:   Shapes.LEFT_TO_BOTTOM },
  '└': { [Style.NORMAL]: Shapes.TOP_TO_RIGHT },
  '┗': { [Style.BOLD]:   Shapes.TOP_TO_RIGHT },
  '┘': { [Style.NORMAL]: Shapes.TOP_TO_LEFT },
  '┛': { [Style.BOLD]:   Shapes.TOP_TO_LEFT },
  '├': { [Style.NORMAL]: Shapes.T_RIGHT },
  '┣': { [Style.BOLD]:   Shapes.T_RIGHT },
  '┤': { [Style.NORMAL]: Shapes.T_LEFT },
  '┫': { [Style.BOLD]:   Shapes.T_LEFT },
  '┬': { [Style.NORMAL]: Shapes.T_BOTTOM },
  '┳': { [Style.BOLD]:   Shapes.T_BOTTOM },
  '┴': { [Style.NORMAL]: Shapes.T_TOP },
  '┻': { [Style.BOLD]:   Shapes.T_TOP },
  '┼': { [Style.NORMAL]: Shapes.CROSS },
  '╋': { [Style.BOLD]:   Shapes.CROSS },
  '╴': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT },
  '╸': { [Style.BOLD]:   Shapes.MIDDLE_TO_LEFT },
  '╵': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP },
  '╹': { [Style.BOLD]:   Shapes.MIDDLE_TO_TOP },
  '╶': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT },
  '╺': { [Style.BOLD]:   Shapes.MIDDLE_TO_RIGHT },
  '╷': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM },
  '╻': { [Style.BOLD]:   Shapes.MIDDLE_TO_BOTTOM },

  // Double border
  '═': { [Style.NORMAL]: (xp, yp) => `M0,${.5 - yp} L1,${.5 - yp} M0,${.5 + yp} L1,${.5 + yp}` },
  '║': { [Style.NORMAL]: (xp, yp) => `M${.5 - xp},0 L${.5 - xp},1 M${.5 + xp},0 L${.5 + xp},1` },
  '╒': { [Style.NORMAL]: (xp, yp) => `M.5,1 L.5,${.5 - yp} L1,${.5 - yp} M.5,${.5 + yp} L1,${.5 + yp}` },
  '╓': { [Style.NORMAL]: (xp, yp) => `M${.5 - xp},1 L${.5 - xp},.5 L1,.5 M${.5 + xp},.5 L${.5 + xp},1` },
  '╔': { [Style.NORMAL]: (xp, yp) => `M1,${.5 - yp} L${.5 - xp},${.5 - yp} L${.5 - xp},1 M1,${.5 + yp} L${.5 + xp},${.5 + yp} L${.5 + xp},1` },
  '╕': { [Style.NORMAL]: (xp, yp) => `M0,${.5 - yp} L.5,${.5 - yp} L.5,1 M0,${.5 + yp} L.5,${.5 + yp}` },
  '╖': { [Style.NORMAL]: (xp, yp) => `M${.5 + xp},1 L${.5 + xp},.5 L0,.5 M${.5 - xp},.5 L${.5 - xp},1` },
  '╗': { [Style.NORMAL]: (xp, yp) => `M0,${.5 + yp} L${.5 - xp},${.5 + yp} L${.5 - xp},1 M0,${.5 - yp} L${.5 + xp},${.5 - yp} L${.5 + xp},1` },
  '╘': { [Style.NORMAL]: (xp, yp) => `M.5,0 L.5,${.5 + yp} L1,${.5 + yp} M.5,${.5 - yp} L1,${.5 - yp}` },
  '╙': { [Style.NORMAL]: (xp, yp) => `M1,.5 L${.5 - xp},.5 L${.5 - xp},0 M${.5 + xp},.5 L${.5 + xp},0` },
  '╚': { [Style.NORMAL]: (xp, yp) => `M1,${.5 - yp} L${.5 + xp},${.5 - yp} L${.5 + xp},0 M1,${.5 + yp} L${.5 - xp},${.5 + yp} L${.5 - xp},0` },
  '╛': { [Style.NORMAL]: (xp, yp) => `M0,${.5 + yp} L.5,${.5 + yp} L.5,0 M0,${.5 - yp} L.5,${.5 - yp}` },
  '╜': { [Style.NORMAL]: (xp, yp) => `M0,.5 L${.5 + xp},.5 L${.5 + xp},0 M${.5 - xp},.5 L${.5 - xp},0` },
  '╝': { [Style.NORMAL]: (xp, yp) => `M0,${.5 - yp} L${.5 - xp},${.5 - yp} L${.5 - xp},0 M0,${.5 + yp} L${.5 + xp},${.5 + yp} L${.5 + xp},0` },
  '╞': { [Style.NORMAL]: (xp, yp) => `${Shapes.TOP_TO_BOTTOM} M.5,${.5 - yp} L1,${.5 - yp} M.5,${.5 + yp} L1,${.5 + yp}` },
  '╟': { [Style.NORMAL]: (xp, yp) => `M${.5 - xp},0 L${.5 - xp},1 M${.5 + xp},0 L${.5 + xp},1 M${.5 + xp},.5 L1,.5` },
  '╠': { [Style.NORMAL]: (xp, yp) => `M${.5 - xp},0 L${.5 - xp},1 M1,${.5 + yp} L${.5 + xp},${.5 + yp} L${.5 + xp},1 M1,${.5 - yp} L${.5 + xp},${.5 - yp} L${.5 + xp},0` },
  '╡': { [Style.NORMAL]: (xp, yp) => `${Shapes.TOP_TO_BOTTOM} M0,${.5 - yp} L.5,${.5 - yp} M0,${.5 + yp} L.5,${.5 + yp}` },
  '╢': { [Style.NORMAL]: (xp, yp) => `M0,.5 L${.5 - xp},.5 M${.5 - xp},0 L${.5 - xp},1 M${.5 + xp},0 L${.5 + xp},1` },
  '╣': { [Style.NORMAL]: (xp, yp) => `M${.5 + xp},0 L${.5 + xp},1 M0,${.5 + yp} L${.5 - xp},${.5 + yp} L${.5 - xp},1 M0,${.5 - yp} L${.5 - xp},${.5 - yp} L${.5 - xp},0` },
  '╤': { [Style.NORMAL]: (xp, yp) => `M0,${.5 - yp} L1,${.5 - yp} M0,${.5 + yp} L1,${.5 + yp} M.5,${.5 + yp} L.5,1` },
  '╥': { [Style.NORMAL]: (xp, yp) => `${Shapes.LEFT_TO_RIGHT} M${.5 - xp},.5 L${.5 - xp},1 M${.5 + xp},.5 L${.5 + xp},1` },
  '╦': { [Style.NORMAL]: (xp, yp) => `M0,${.5 - yp} L1,${.5 - yp} M0,${.5 + yp} L${.5 - xp},${.5 + yp} L${.5 - xp},1 M1,${.5 + yp} L${.5 + xp},${.5 + yp} L${.5 + xp},1` },
  '╧': { [Style.NORMAL]: (xp, yp) => `M.5,0 L.5,${.5 - yp} M0,${.5 - yp} L1,${.5 - yp} M0,${.5 + yp} L1,${.5 + yp}` },
  '╨': { [Style.NORMAL]: (xp, yp) => `${Shapes.LEFT_TO_RIGHT} M${.5 - xp},.5 L${.5 - xp},0 M${.5 + xp},.5 L${.5 + xp},0` },
  '╩': { [Style.NORMAL]: (xp, yp) => `M0,${.5 + yp} L1,${.5 + yp} M0,${.5 - yp} L${.5 - xp},${.5 - yp} L${.5 - xp},0 M1,${.5 - yp} L${.5 + xp},${.5 - yp} L${.5 + xp},0` },
  '╪': { [Style.NORMAL]: (xp, yp) => `${Shapes.TOP_TO_BOTTOM} M0,${.5 - yp} L1,${.5 - yp} M0,${.5 + yp} L1,${.5 + yp}` },
  '╫': { [Style.NORMAL]: (xp, yp) => `${Shapes.LEFT_TO_RIGHT} M${.5 - xp},0 L${.5 - xp},1 M${.5 + xp},0 L${.5 + xp},1` },
  '╬': { [Style.NORMAL]: (xp, yp) => `M0,${.5 + yp} L${.5 - xp},${.5 + yp} L${.5 - xp},1 M1,${.5 + yp} L${.5 + xp},${.5 + yp} L${.5 + xp},1 M0,${.5 - yp} L${.5 - xp},${.5 - yp} L${.5 - xp},0 M1,${.5 - yp} L${.5 + xp},${.5 - yp} L${.5 + xp},0` },

  // Diagonal
  '╱': { [Style.NORMAL]: 'M1,0 L0,1' },
  '╲': { [Style.NORMAL]: 'M0,0 L1,1' },
  '╳': { [Style.NORMAL]: 'M1,0 L0,1 M0,0 L1,1' },

  // Mixed weight
  '╼': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT,                                [Style.BOLD]: Shapes.MIDDLE_TO_RIGHT },
  '╽': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP,                                 [Style.BOLD]: Shapes.MIDDLE_TO_BOTTOM },
  '╾': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT,                               [Style.BOLD]: Shapes.MIDDLE_TO_LEFT },
  '╿': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM,                              [Style.BOLD]: Shapes.MIDDLE_TO_TOP },
  '┍': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM,                              [Style.BOLD]: Shapes.MIDDLE_TO_RIGHT },
  '┎': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT,                               [Style.BOLD]: Shapes.MIDDLE_TO_BOTTOM },
  '┑': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM,                              [Style.BOLD]: Shapes.MIDDLE_TO_LEFT },
  '┒': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT,                                [Style.BOLD]: Shapes.MIDDLE_TO_BOTTOM },
  '┕': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP,                                 [Style.BOLD]: Shapes.MIDDLE_TO_RIGHT },
  '┖': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT,                               [Style.BOLD]: Shapes.MIDDLE_TO_TOP },
  '┙': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP,                                 [Style.BOLD]: Shapes.MIDDLE_TO_LEFT },
  '┚': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT,                                [Style.BOLD]: Shapes.MIDDLE_TO_TOP },
  '┝': { [Style.NORMAL]: Shapes.TOP_TO_BOTTOM,                                 [Style.BOLD]: Shapes.MIDDLE_TO_RIGHT },
  '┞': { [Style.NORMAL]: Shapes.RIGHT_TO_BOTTOM,                               [Style.BOLD]: Shapes.MIDDLE_TO_TOP },
  '┟': { [Style.NORMAL]: Shapes.TOP_TO_RIGHT,                                  [Style.BOLD]: Shapes.MIDDLE_TO_BOTTOM },
  '┠': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT,                               [Style.BOLD]: Shapes.TOP_TO_BOTTOM },
  '┡': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM,                              [Style.BOLD]: Shapes.TOP_TO_RIGHT },
  '┢': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP,                                 [Style.BOLD]: Shapes.RIGHT_TO_BOTTOM },
  '┥': { [Style.NORMAL]: Shapes.TOP_TO_BOTTOM,                                 [Style.BOLD]: Shapes.MIDDLE_TO_LEFT },
  '┦': { [Style.NORMAL]: Shapes.LEFT_TO_BOTTOM,                                [Style.BOLD]: Shapes.MIDDLE_TO_TOP },
  '┧': { [Style.NORMAL]: Shapes.TOP_TO_LEFT,                                   [Style.BOLD]: Shapes.MIDDLE_TO_BOTTOM },
  '┨': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT,                                [Style.BOLD]: Shapes.TOP_TO_BOTTOM },
  '┩': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM,                              [Style.BOLD]: Shapes.TOP_TO_LEFT },
  '┪': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP,                                 [Style.BOLD]: Shapes.LEFT_TO_BOTTOM },
  '┭': { [Style.NORMAL]: Shapes.RIGHT_TO_BOTTOM,                               [Style.BOLD]: Shapes.MIDDLE_TO_LEFT },
  '┮': { [Style.NORMAL]: Shapes.LEFT_TO_BOTTOM,                                [Style.BOLD]: Shapes.MIDDLE_TO_RIGHT },
  '┯': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM,                              [Style.BOLD]: Shapes.LEFT_TO_RIGHT },
  '┰': { [Style.NORMAL]: Shapes.LEFT_TO_RIGHT,                                 [Style.BOLD]: Shapes.MIDDLE_TO_BOTTOM },
  '┱': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT,                               [Style.BOLD]: Shapes.LEFT_TO_BOTTOM },
  '┲': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT,                                [Style.BOLD]: Shapes.RIGHT_TO_BOTTOM },
  '┵': { [Style.NORMAL]: Shapes.TOP_TO_RIGHT,                                  [Style.BOLD]: Shapes.MIDDLE_TO_LEFT },
  '┶': { [Style.NORMAL]: Shapes.TOP_TO_LEFT,                                   [Style.BOLD]: Shapes.MIDDLE_TO_RIGHT },
  '┷': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP,                                 [Style.BOLD]: Shapes.LEFT_TO_RIGHT },
  '┸': { [Style.NORMAL]: Shapes.LEFT_TO_RIGHT,                                 [Style.BOLD]: Shapes.MIDDLE_TO_TOP },
  '┹': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT,                               [Style.BOLD]: Shapes.TOP_TO_LEFT },
  '┺': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT,                                [Style.BOLD]: Shapes.TOP_TO_RIGHT },
  '┽': { [Style.NORMAL]: `${Shapes.TOP_TO_BOTTOM} ${Shapes.MIDDLE_TO_RIGHT}`,  [Style.BOLD]: Shapes.MIDDLE_TO_LEFT },
  '┾': { [Style.NORMAL]: `${Shapes.TOP_TO_BOTTOM} ${Shapes.MIDDLE_TO_LEFT}`,   [Style.BOLD]: Shapes.MIDDLE_TO_RIGHT },
  '┿': { [Style.NORMAL]: Shapes.TOP_TO_BOTTOM,                                 [Style.BOLD]: Shapes.LEFT_TO_RIGHT },
  '╀': { [Style.NORMAL]: `${Shapes.LEFT_TO_RIGHT} ${Shapes.MIDDLE_TO_BOTTOM}`, [Style.BOLD]: Shapes.MIDDLE_TO_TOP },
  '╁': { [Style.NORMAL]: `${Shapes.MIDDLE_TO_TOP} ${Shapes.LEFT_TO_RIGHT}`,    [Style.BOLD]: Shapes.MIDDLE_TO_BOTTOM },
  '╂': { [Style.NORMAL]: Shapes.LEFT_TO_RIGHT,                                 [Style.BOLD]: Shapes.TOP_TO_BOTTOM },
  '╃': { [Style.NORMAL]: Shapes.RIGHT_TO_BOTTOM,                               [Style.BOLD]: Shapes.TOP_TO_LEFT },
  '╄': { [Style.NORMAL]: Shapes.LEFT_TO_BOTTOM,                                [Style.BOLD]: Shapes.TOP_TO_RIGHT },
  '╅': { [Style.NORMAL]: Shapes.TOP_TO_RIGHT,                                  [Style.BOLD]: Shapes.LEFT_TO_BOTTOM },
  '╆': { [Style.NORMAL]: Shapes.TOP_TO_LEFT,                                   [Style.BOLD]: Shapes.RIGHT_TO_BOTTOM },
  '╇': { [Style.NORMAL]: Shapes.MIDDLE_TO_BOTTOM,                              [Style.BOLD]: `${Shapes.MIDDLE_TO_TOP} ${Shapes.LEFT_TO_RIGHT}` },
  '╈': { [Style.NORMAL]: Shapes.MIDDLE_TO_TOP,                                 [Style.BOLD]: `${Shapes.LEFT_TO_RIGHT} ${Shapes.MIDDLE_TO_BOTTOM}` },
  '╉': { [Style.NORMAL]: Shapes.MIDDLE_TO_RIGHT,                               [Style.BOLD]: `${Shapes.TOP_TO_BOTTOM} ${Shapes.MIDDLE_TO_LEFT}` },
  '╊': { [Style.NORMAL]: Shapes.MIDDLE_TO_LEFT,                                [Style.BOLD]: `${Shapes.TOP_TO_BOTTOM} ${Shapes.MIDDLE_TO_RIGHT}` },

  // Dashed
  '╌': { [Style.NORMAL]: Shapes.TWO_DASHES_HORIZONTAL },
  '╍': { [Style.BOLD]:   Shapes.TWO_DASHES_HORIZONTAL },
  '┄': { [Style.NORMAL]: Shapes.THREE_DASHES_HORIZONTAL },
  '┅': { [Style.BOLD]:   Shapes.THREE_DASHES_HORIZONTAL },
  '┈': { [Style.NORMAL]: Shapes.FOUR_DASHES_HORIZONTAL },
  '┉': { [Style.BOLD]:   Shapes.FOUR_DASHES_HORIZONTAL },
  '╎': { [Style.NORMAL]: Shapes.TWO_DASHES_VERTICAL },
  '╏': { [Style.BOLD]:   Shapes.TWO_DASHES_VERTICAL },
  '┆': { [Style.NORMAL]: Shapes.THREE_DASHES_VERTICAL  },
  '┇': { [Style.BOLD]:   Shapes.THREE_DASHES_VERTICAL },
  '┊': { [Style.NORMAL]: Shapes.FOUR_DASHES_VERTICAL },
  '┋': { [Style.BOLD]:   Shapes.FOUR_DASHES_VERTICAL },

  // Curved
  '╭': { [Style.NORMAL]: (xp, yp) => `M.5,1 L.5,${.5 + (yp / .15 * .5)} C.5,${.5 + (yp / .15 * .5)},.5,.5,1,.5` },
  '╮': { [Style.NORMAL]: (xp, yp) => `M.5,1 L.5,${.5 + (yp / .15 * .5)} C.5,${.5 + (yp / .15 * .5)},.5,.5,0,.5` },
  '╯': { [Style.NORMAL]: (xp, yp) => `M.5,0 L.5,${.5 - (yp / .15 * .5)} C.5,${.5 - (yp / .15 * .5)},.5,.5,0,.5` },
  '╰': { [Style.NORMAL]: (xp, yp) => `M.5,0 L.5,${.5 - (yp / .15 * .5)} C.5,${.5 - (yp / .15 * .5)},.5,.5,1,.5` }
};

interface IVectorShape {
  d: string;
  type: VectorType;
  leftPadding?: number;
  rightPadding?: number;
}

const enum VectorType {
  FILL,
  STROKE
}

/**
 * This contains the definitions of the primarily used box drawing characters as vector shapes. The
 * reason these characters are defined specially is to avoid common problems if a user's font has
 * not been patched with powerline characters and also to get pixel perfect rendering as rendering
 * issues can occur around AA/SPAA.
 *
 * The line variants draw beyond the cell and get clipped to ensure the end of the line is not
 * visible.
 *
 * Original symbols defined in https://github.com/powerline/fontpatcher
 */
export const powerlineDefinitions: { [index: string]: IVectorShape } = {
  // Right triangle solid
  '\u{E0B0}': { d: 'M0,0 L1,.5 L0,1', type: VectorType.FILL, rightPadding: 2 },
  // Right triangle line
  '\u{E0B1}': { d: 'M-1,-.5 L1,.5 L-1,1.5', type: VectorType.STROKE, leftPadding: 1, rightPadding: 1 },
  // Left triangle solid
  '\u{E0B2}': { d: 'M1,0 L0,.5 L1,1', type: VectorType.FILL, leftPadding: 2 },
  // Left triangle line
  '\u{E0B3}': { d: 'M2,-.5 L0,.5 L2,1.5', type: VectorType.STROKE, leftPadding: 1, rightPadding: 1 },
  // Right semi-circle solid
  '\u{E0B4}': { d: 'M0,0 L0,1 C0.552,1,1,0.776,1,.5 C1,0.224,0.552,0,0,0', type: VectorType.FILL, rightPadding: 1 },
  // Right semi-circle line
  '\u{E0B5}': { d: 'M.2,1 C.422,1,.8,.826,.78,.5 C.8,.174,0.422,0,.2,0', type: VectorType.STROKE, rightPadding: 1 },
  // Left semi-circle solid
  '\u{E0B6}': { d: 'M1,0 L1,1 C0.448,1,0,0.776,0,.5 C0,0.224,0.448,0,1,0', type: VectorType.FILL, leftPadding: 1 },
  // Left semi-circle line
  '\u{E0B7}': { d: 'M.8,1 C0.578,1,0.2,.826,.22,.5 C0.2,0.174,0.578,0,0.8,0', type: VectorType.STROKE, leftPadding: 1 },
  // Lower left triangle
  '\u{E0B8}': { d: 'M-.5,-.5 L1.5,1.5 L-.5,1.5', type: VectorType.FILL },
  // Backslash separator
  '\u{E0B9}': { d: 'M-.5,-.5 L1.5,1.5', type: VectorType.STROKE, leftPadding: 1, rightPadding: 1 },
  // Lower right triangle
  '\u{E0BA}': { d: 'M1.5,-.5 L-.5,1.5 L1.5,1.5', type: VectorType.FILL },
  // Upper left triangle
  '\u{E0BC}': { d: 'M1.5,-.5 L-.5,1.5 L-.5,-.5', type: VectorType.FILL },
  // Forward slash separator
  '\u{E0BD}': { d: 'M1.5,-.5 L-.5,1.5', type: VectorType.STROKE, leftPadding: 1, rightPadding: 1 },
  // Upper right triangle
  '\u{E0BE}': { d: 'M-.5,-.5 L1.5,1.5 L1.5,-.5', type: VectorType.FILL }
};
// Forward slash separator redundant
powerlineDefinitions['\u{E0BB}'] = powerlineDefinitions['\u{E0BD}'];
// Backslash separator redundant
powerlineDefinitions['\u{E0BF}'] = powerlineDefinitions['\u{E0B9}'];

/**
 * Try drawing a custom block element or box drawing character, returning whether it was
 * successfully drawn.
 */
export function tryDrawCustomChar(
  ctx: CanvasRenderingContext2D,
  c: string,
  xOffset: number,
  yOffset: number,
  deviceCellWidth: number,
  deviceCellHeight: number,
  fontSize: number,
  devicePixelRatio: number
): boolean {
  const blockElementDefinition = blockElementDefinitions[c];
  if (blockElementDefinition) {
    drawBlockElementChar(ctx, blockElementDefinition, xOffset, yOffset, deviceCellWidth, deviceCellHeight);
    return true;
  }

  const patternDefinition = patternCharacterDefinitions[c];
  if (patternDefinition) {
    drawPatternChar(ctx, patternDefinition, xOffset, yOffset, deviceCellWidth, deviceCellHeight);
    return true;
  }

  const boxDrawingDefinition = boxDrawingDefinitions[c];
  if (boxDrawingDefinition) {
    drawBoxDrawingChar(ctx, boxDrawingDefinition, xOffset, yOffset, deviceCellWidth, deviceCellHeight, devicePixelRatio);
    return true;
  }

  const powerlineDefinition = powerlineDefinitions[c];
  if (powerlineDefinition) {
    drawPowerlineChar(ctx, powerlineDefinition, xOffset, yOffset, deviceCellWidth, deviceCellHeight, fontSize, devicePixelRatio);
    return true;
  }

  return false;
}

function drawBlockElementChar(
  ctx: CanvasRenderingContext2D,
  charDefinition: IBlockVector[],
  xOffset: number,
  yOffset: number,
  deviceCellWidth: number,
  deviceCellHeight: number
): void {
  for (let i = 0; i < charDefinition.length; i++) {
    const box = charDefinition[i];
    const xEighth = deviceCellWidth / 8;
    const yEighth = deviceCellHeight / 8;
    ctx.fillRect(
      xOffset + box.x * xEighth,
      yOffset + box.y * yEighth,
      box.w * xEighth,
      box.h * yEighth
    );
  }
}

const cachedPatterns: Map<PatternDefinition, Map</* fillStyle */string, CanvasPattern>> = new Map();

function drawPatternChar(
  ctx: CanvasRenderingContext2D,
  charDefinition: number[][],
  xOffset: number,
  yOffset: number,
  deviceCellWidth: number,
  deviceCellHeight: number
): void {
  let patternSet = cachedPatterns.get(charDefinition);
  if (!patternSet) {
    patternSet = new Map();
    cachedPatterns.set(charDefinition, patternSet);
  }
  const fillStyle = ctx.fillStyle;
  if (typeof fillStyle !== 'string') {
    throw new Error(`Unexpected fillStyle type "${fillStyle}"`);
  }
  let pattern = patternSet.get(fillStyle);
  if (!pattern) {
    const width = charDefinition[0].length;
    const height = charDefinition.length;
    const tmpCanvas = ctx.canvas.ownerDocument.createElement('canvas');
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = throwIfFalsy(tmpCanvas.getContext('2d'));
    const imageData = new ImageData(width, height);

    // Extract rgba from fillStyle
    let r: number;
    let g: number;
    let b: number;
    let a: number;
    if (fillStyle.startsWith('#')) {
      r = parseInt(fillStyle.slice(1, 3), 16);
      g = parseInt(fillStyle.slice(3, 5), 16);
      b = parseInt(fillStyle.slice(5, 7), 16);
      a = fillStyle.length > 7 && parseInt(fillStyle.slice(7, 9), 16) || 1;
    } else if (fillStyle.startsWith('rgba')) {
      ([r, g, b, a] = fillStyle.substring(5, fillStyle.length - 1).split(',').map(e => parseFloat(e)));
    } else {
      throw new Error(`Unexpected fillStyle color format "${fillStyle}" when drawing pattern glyph`);
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        imageData.data[(y * width + x) * 4    ] = r;
        imageData.data[(y * width + x) * 4 + 1] = g;
        imageData.data[(y * width + x) * 4 + 2] = b;
        imageData.data[(y * width + x) * 4 + 3] = charDefinition[y][x] * (a * 255);
      }
    }
    tmpCtx.putImageData(imageData, 0, 0);
    pattern = throwIfFalsy(ctx.createPattern(tmpCanvas, null));
    patternSet.set(fillStyle, pattern);
  }
  ctx.fillStyle = pattern;
  ctx.fillRect(xOffset, yOffset, deviceCellWidth, deviceCellHeight);
}

/**
 * Draws the following box drawing characters by mapping a subset of SVG d attribute instructions to
 * canvas draw calls.
 *
 * Box styles:       ┎┰┒┍┯┑╓╥╖╒╤╕ ┏┳┓┌┲┓┌┬┐┏┱┐
 * ┌─┬─┐ ┏━┳━┓ ╔═╦═╗ ┠╂┨┝┿┥╟╫╢╞╪╡ ┡╇┩├╊┫┢╈┪┣╉┤
 * │ │ │ ┃ ┃ ┃ ║ ║ ║ ┖┸┚┕┷┙╙╨╜╘╧╛ └┴┘└┺┛┗┻┛┗┹┘
 * ├─┼─┤ ┣━╋━┫ ╠═╬═╣ ┏┱┐┌┲┓┌┬┐┌┬┐ ┏┳┓┌┮┓┌┬┐┏┭┐
 * │ │ │ ┃ ┃ ┃ ║ ║ ║ ┡╃┤├╄┩├╆┪┢╅┤ ┞╀┦├┾┫┟╁┧┣┽┤
 * └─┴─┘ ┗━┻━┛ ╚═╩═╝ └┴┘└┴┘└┺┛┗┹┘ └┴┘└┶┛┗┻┛┗┵┘
 *
 * Other:
 * ╭─╮ ╲ ╱ ╷╻╎╏┆┇┊┋ ╺╾╴ ╌╌╌ ┄┄┄ ┈┈┈
 * │ │  ╳  ╽╿╎╏┆┇┊┋ ╶╼╸ ╍╍╍ ┅┅┅ ┉┉┉
 * ╰─╯ ╱ ╲ ╹╵╎╏┆┇┊┋
 *
 * All box drawing characters:
 * ─ ━ │ ┃ ┄ ┅ ┆ ┇ ┈ ┉ ┊ ┋ ┌ ┍ ┎ ┏
 * ┐ ┑ ┒ ┓ └ ┕ ┖ ┗ ┘ ┙ ┚ ┛ ├ ┝ ┞ ┟
 * ┠ ┡ ┢ ┣ ┤ ┥ ┦ ┧ ┨ ┩ ┪ ┫ ┬ ┭ ┮ ┯
 * ┰ ┱ ┲ ┳ ┴ ┵ ┶ ┷ ┸ ┹ ┺ ┻ ┼ ┽ ┾ ┿
 * ╀ ╁ ╂ ╃ ╄ ╅ ╆ ╇ ╈ ╉ ╊ ╋ ╌ ╍ ╎ ╏
 * ═ ║ ╒ ╓ ╔ ╕ ╖ ╗ ╘ ╙ ╚ ╛ ╜ ╝ ╞ ╟
 * ╠ ╡ ╢ ╣ ╤ ╥ ╦ ╧ ╨ ╩ ╪ ╫ ╬ ╭ ╮ ╯
 * ╰ ╱ ╲ ╳ ╴ ╵ ╶ ╷ ╸ ╹ ╺ ╻ ╼ ╽ ╾ ╿
 *
 * ---
 *
 * Box drawing alignment tests:                                          █
 *                                                                       ▉
 *   ╔══╦══╗  ┌──┬──┐  ╭──┬──╮  ╭──┬──╮  ┏━━┳━━┓  ┎┒┏┑   ╷  ╻ ┏┯┓ ┌┰┐    ▊ ╱╲╱╲╳╳╳
 *   ║┌─╨─┐║  │╔═╧═╗│  │╒═╪═╕│  │╓─╁─╖│  ┃┌─╂─┐┃  ┗╃╄┙  ╶┼╴╺╋╸┠┼┨ ┝╋┥    ▋ ╲╱╲╱╳╳╳
 *   ║│╲ ╱│║  │║   ║│  ││ │ ││  │║ ┃ ║│  ┃│ ╿ │┃  ┍╅╆┓   ╵  ╹ ┗┷┛ └┸┘    ▌ ╱╲╱╲╳╳╳
 *   ╠╡ ╳ ╞╣  ├╢   ╟┤  ├┼─┼─┼┤  ├╫─╂─╫┤  ┣┿╾┼╼┿┫  ┕┛┖┚     ┌┄┄┐ ╎ ┏┅┅┓ ┋ ▍ ╲╱╲╱╳╳╳
 *   ║│╱ ╲│║  │║   ║│  ││ │ ││  │║ ┃ ║│  ┃│ ╽ │┃  ░░▒▒▓▓██ ┊  ┆ ╎ ╏  ┇ ┋ ▎
 *   ║└─╥─┘║  │╚═╤═╝│  │╘═╪═╛│  │╙─╀─╜│  ┃└─╂─┘┃  ░░▒▒▓▓██ ┊  ┆ ╎ ╏  ┇ ┋ ▏
 *   ╚══╩══╝  └──┴──┘  ╰──┴──╯  ╰──┴──╯  ┗━━┻━━┛           └╌╌┘ ╎ ┗╍╍┛ ┋  ▁▂▃▄▅▆▇█
 *
 * Source: https://www.w3.org/2001/06/utf-8-test/UTF-8-demo.html
 */
function drawBoxDrawingChar(
  ctx: CanvasRenderingContext2D,
  charDefinition: { [fontWeight: number]: string | ((xp: number, yp: number) => string) },
  xOffset: number,
  yOffset: number,
  deviceCellWidth: number,
  deviceCellHeight: number,
  devicePixelRatio: number
): void {
  ctx.strokeStyle = ctx.fillStyle;
  for (const [fontWeight, instructions] of Object.entries(charDefinition)) {
    ctx.beginPath();
    ctx.lineWidth = devicePixelRatio * Number.parseInt(fontWeight);
    let actualInstructions: string;
    if (typeof instructions === 'function') {
      const xp = .15;
      const yp = .15 / deviceCellHeight * deviceCellWidth;
      actualInstructions = instructions(xp, yp);
    } else {
      actualInstructions = instructions;
    }
    for (const instruction of actualInstructions.split(' ')) {
      const type = instruction[0];
      const f = svgToCanvasInstructionMap[type];
      if (!f) {
        console.error(`Could not find drawing instructions for "${type}"`);
        continue;
      }
      const args: string[] = instruction.substring(1).split(',');
      if (!args[0] || !args[1]) {
        continue;
      }
      f(ctx, translateArgs(args, deviceCellWidth, deviceCellHeight, xOffset, yOffset, true, devicePixelRatio));
    }
    ctx.stroke();
    ctx.closePath();
  }
}

function drawPowerlineChar(
  ctx: CanvasRenderingContext2D,
  charDefinition: IVectorShape,
  xOffset: number,
  yOffset: number,
  deviceCellWidth: number,
  deviceCellHeight: number,
  fontSize: number,
  devicePixelRatio: number
): void {
  // Clip the cell to make sure drawing doesn't occur beyond bounds
  const clipRegion = new Path2D();
  clipRegion.rect(xOffset, yOffset, deviceCellWidth, deviceCellHeight);
  ctx.clip(clipRegion);

  ctx.beginPath();
  // Scale the stroke with DPR and font size
  const cssLineWidth = fontSize / 12;
  ctx.lineWidth = devicePixelRatio * cssLineWidth;
  for (const instruction of charDefinition.d.split(' ')) {
    const type = instruction[0];
    const f = svgToCanvasInstructionMap[type];
    if (!f) {
      console.error(`Could not find drawing instructions for "${type}"`);
      continue;
    }
    const args: string[] = instruction.substring(1).split(',');
    if (!args[0] || !args[1]) {
      continue;
    }
    f(ctx, translateArgs(
      args,
      deviceCellWidth,
      deviceCellHeight,
      xOffset,
      yOffset,
      false,
      devicePixelRatio,
      (charDefinition.leftPadding ?? 0) * (cssLineWidth / 2),
      (charDefinition.rightPadding ?? 0) * (cssLineWidth / 2)
    ));
  }
  if (charDefinition.type === VectorType.STROKE) {
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke();
  } else {
    ctx.fill();
  }
  ctx.closePath();
}

function clamp(value: number, max: number, min: number = 0): number {
  return Math.max(Math.min(value, max), min);
}

const svgToCanvasInstructionMap: { [index: string]: any } = {
  'C': (ctx: CanvasRenderingContext2D, args: number[]) => ctx.bezierCurveTo(args[0], args[1], args[2], args[3], args[4], args[5]),
  'L': (ctx: CanvasRenderingContext2D, args: number[]) => ctx.lineTo(args[0], args[1]),
  'M': (ctx: CanvasRenderingContext2D, args: number[]) => ctx.moveTo(args[0], args[1])
};

function translateArgs(args: string[], cellWidth: number, cellHeight: number, xOffset: number, yOffset: number, doClamp: boolean, devicePixelRatio: number, leftPadding: number = 0, rightPadding: number = 0): number[] {
  const result = args.map(e => parseFloat(e) || parseInt(e));

  if (result.length < 2) {
    throw new Error('Too few arguments for instruction');
  }

  for (let x = 0; x < result.length; x += 2) {
    // Translate from 0-1 to 0-cellWidth
    result[x] *= cellWidth - (leftPadding * devicePixelRatio) - (rightPadding * devicePixelRatio);
    // Ensure coordinate doesn't escape cell bounds and round to the nearest 0.5 to ensure a crisp
    // line at 100% devicePixelRatio
    if (doClamp && result[x] !== 0) {
      result[x] = clamp(Math.round(result[x] + 0.5) - 0.5, cellWidth, 0);
    }
    // Apply the cell's offset (ie. x*cellWidth)
    result[x] += xOffset + (leftPadding * devicePixelRatio);
  }

  for (let y = 1; y < result.length; y += 2) {
    // Translate from 0-1 to 0-cellHeight
    result[y] *= cellHeight;
    // Ensure coordinate doesn't escape cell bounds and round to the nearest 0.5 to ensure a crisp
    // line at 100% devicePixelRatio
    if (doClamp && result[y] !== 0) {
      result[y] = clamp(Math.round(result[y] + 0.5) - 0.5, cellHeight, 0);
    }
    // Apply the cell's offset (ie. x*cellHeight)
    result[y] += yOffset;
  }

  return result;
}
