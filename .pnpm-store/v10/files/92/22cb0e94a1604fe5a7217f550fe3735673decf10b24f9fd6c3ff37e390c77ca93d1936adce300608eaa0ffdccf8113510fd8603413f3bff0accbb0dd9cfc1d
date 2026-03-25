const { info, debug } = require('./debug');
const utils = require('./utils');

class Cell {
  /**
   * A representation of a cell within the table.
   * Implementations must have `init` and `draw` methods,
   * as well as `colSpan`, `rowSpan`, `desiredHeight` and `desiredWidth` properties.
   * @param options
   * @constructor
   */
  constructor(options) {
    this.setOptions(options);

    /**
     * Each cell will have it's `x` and `y` values set by the `layout-manager` prior to
     * `init` being called;
     * @type {Number}
     */
    this.x = null;
    this.y = null;
  }

  setOptions(options) {
    if (['boolean', 'number', 'bigint', 'string'].indexOf(typeof options) !== -1) {
      options = { content: '' + options };
    }
    options = options || {};
    this.options = options;
    let content = options.content;
    if (['boolean', 'number', 'bigint', 'string'].indexOf(typeof content) !== -1) {
      this.content = String(content);
    } else if (!content) {
      this.content = this.options.href || '';
    } else {
      throw new Error('Content needs to be a primitive, got: ' + typeof content);
    }
    this.colSpan = options.colSpan || 1;
    this.rowSpan = options.rowSpan || 1;
    if (this.options.href) {
      Object.defineProperty(this, 'href', {
        get() {
          return this.options.href;
        },
      });
    }
  }

  mergeTableOptions(tableOptions, cells) {
    this.cells = cells;

    let optionsChars = this.options.chars || {};
    let tableChars = tableOptions.chars;
    let chars = (this.chars = {});
    CHAR_NAMES.forEach(function (name) {
      setOption(optionsChars, tableChars, name, chars);
    });

    this.truncate = this.options.truncate || tableOptions.truncate;

    let style = (this.options.style = this.options.style || {});
    let tableStyle = tableOptions.style;
    setOption(style, tableStyle, 'padding-left', this);
    setOption(style, tableStyle, 'padding-right', this);
    this.head = style.head || tableStyle.head;
    this.border = style.border || tableStyle.border;

    this.fixedWidth = tableOptions.colWidths[this.x];
    this.lines = this.computeLines(tableOptions);

    this.desiredWidth = utils.strlen(this.content) + this.paddingLeft + this.paddingRight;
    this.desiredHeight = this.lines.length;
  }

  computeLines(tableOptions) {
    const tableWordWrap = tableOptions.wordWrap || tableOptions.textWrap;
    const { wordWrap = tableWordWrap } = this.options;
    if (this.fixedWidth && wordWrap) {
      this.fixedWidth -= this.paddingLeft + this.paddingRight;
      if (this.colSpan) {
        let i = 1;
        while (i < this.colSpan) {
          this.fixedWidth += tableOptions.colWidths[this.x + i];
          i++;
        }
      }
      const { wrapOnWordBoundary: tableWrapOnWordBoundary = true } = tableOptions;
      const { wrapOnWordBoundary = tableWrapOnWordBoundary } = this.options;
      return this.wrapLines(utils.wordWrap(this.fixedWidth, this.content, wrapOnWordBoundary));
    }
    return this.wrapLines(this.content.split('\n'));
  }

  wrapLines(computedLines) {
    const lines = utils.colorizeLines(computedLines);
    if (this.href) {
      return lines.map((line) => utils.hyperlink(this.href, line));
    }
    return lines;
  }

  /**
   * Initializes the Cells data structure.
   *
   * @param tableOptions - A fully populated set of tableOptions.
   * In addition to the standard default values, tableOptions must have fully populated the
   * `colWidths` and `rowWidths` arrays. Those arrays must have lengths equal to the number
   * of columns or rows (respectively) in this table, and each array item must be a Number.
   *
   */
  init(tableOptions) {
    let x = this.x;
    let y = this.y;
    this.widths = tableOptions.colWidths.slice(x, x + this.colSpan);
    this.heights = tableOptions.rowHeights.slice(y, y + this.rowSpan);
    this.width = this.widths.reduce(sumPlusOne, -1);
    this.height = this.heights.reduce(sumPlusOne, -1);

    this.hAlign = this.options.hAlign || tableOptions.colAligns[x];
    this.vAlign = this.options.vAlign || tableOptions.rowAligns[y];

    this.drawRight = x + this.colSpan == tableOptions.colWidths.length;
  }

  /**
   * Draws the given line of the cell.
   * This default implementation defers to methods `drawTop`, `drawBottom`, `drawLine` and `drawEmpty`.
   * @param lineNum - can be `top`, `bottom` or a numerical line number.
   * @param spanningCell - will be a number if being called from a RowSpanCell, and will represent how
   * many rows below it's being called from. Otherwise it's undefined.
   * @returns {String} The representation of this line.
   */
  draw(lineNum, spanningCell) {
    if (lineNum == 'top') return this.drawTop(this.drawRight);
    if (lineNum == 'bottom') return this.drawBottom(this.drawRight);
    let content = utils.truncate(this.content, 10, this.truncate);
    if (!lineNum) {
      info(`${this.y}-${this.x}: ${this.rowSpan - lineNum}x${this.colSpan} Cell ${content}`);
    } else {
      // debug(`${lineNum}-${this.x}: 1x${this.colSpan} RowSpanCell ${content}`);
    }
    let padLen = Math.max(this.height - this.lines.length, 0);
    let padTop;
    switch (this.vAlign) {
      case 'center':
        padTop = Math.ceil(padLen / 2);
        break;
      case 'bottom':
        padTop = padLen;
        break;
      default:
        padTop = 0;
    }
    if (lineNum < padTop || lineNum >= padTop + this.lines.length) {
      return this.drawEmpty(this.drawRight, spanningCell);
    }
    let forceTruncation = this.lines.length > this.height && lineNum + 1 >= this.height;
    return this.drawLine(lineNum - padTop, this.drawRight, forceTruncation, spanningCell);
  }

  /**
   * Renders the top line of the cell.
   * @param drawRight - true if this method should render the right edge of the cell.
   * @returns {String}
   */
  drawTop(drawRight) {
    let content = [];
    if (this.cells) {
      //TODO: cells should always exist - some tests don't fill it in though
      this.widths.forEach(function (width, index) {
        content.push(this._topLeftChar(index));
        content.push(utils.repeat(this.chars[this.y == 0 ? 'top' : 'mid'], width));
      }, this);
    } else {
      content.push(this._topLeftChar(0));
      content.push(utils.repeat(this.chars[this.y == 0 ? 'top' : 'mid'], this.width));
    }
    if (drawRight) {
      content.push(this.chars[this.y == 0 ? 'topRight' : 'rightMid']);
    }
    return this.wrapWithStyleColors('border', content.join(''));
  }

  _topLeftChar(offset) {
    let x = this.x + offset;
    let leftChar;
    if (this.y == 0) {
      leftChar = x == 0 ? 'topLeft' : offset == 0 ? 'topMid' : 'top';
    } else {
      if (x == 0) {
        leftChar = 'leftMid';
      } else {
        leftChar = offset == 0 ? 'midMid' : 'bottomMid';
        if (this.cells) {
          //TODO: cells should always exist - some tests don't fill it in though
          let spanAbove = this.cells[this.y - 1][x] instanceof Cell.ColSpanCell;
          if (spanAbove) {
            leftChar = offset == 0 ? 'topMid' : 'mid';
          }
          if (offset == 0) {
            let i = 1;
            while (this.cells[this.y][x - i] instanceof Cell.ColSpanCell) {
              i++;
            }
            if (this.cells[this.y][x - i] instanceof Cell.RowSpanCell) {
              leftChar = 'leftMid';
            }
          }
        }
      }
    }
    return this.chars[leftChar];
  }

  wrapWithStyleColors(styleProperty, content) {
    if (this[styleProperty] && this[styleProperty].length) {
      try {
        let colors = require('@colors/colors/safe');
        for (let i = this[styleProperty].length - 1; i >= 0; i--) {
          colors = colors[this[styleProperty][i]];
        }
        return colors(content);
      } catch (e) {
        return content;
      }
    } else {
      return content;
    }
  }

  /**
   * Renders a line of text.
   * @param lineNum - Which line of text to render. This is not necessarily the line within the cell.
   * There may be top-padding above the first line of text.
   * @param drawRight - true if this method should render the right edge of the cell.
   * @param forceTruncationSymbol - `true` if the rendered text should end with the truncation symbol even
   * if the text fits. This is used when the cell is vertically truncated. If `false` the text should
   * only include the truncation symbol if the text will not fit horizontally within the cell width.
   * @param spanningCell - a number of if being called from a RowSpanCell. (how many rows below). otherwise undefined.
   * @returns {String}
   */
  drawLine(lineNum, drawRight, forceTruncationSymbol, spanningCell) {
    let left = this.chars[this.x == 0 ? 'left' : 'middle'];
    if (this.x && spanningCell && this.cells) {
      let cellLeft = this.cells[this.y + spanningCell][this.x - 1];
      while (cellLeft instanceof ColSpanCell) {
        cellLeft = this.cells[cellLeft.y][cellLeft.x - 1];
      }
      if (!(cellLeft instanceof RowSpanCell)) {
        left = this.chars['rightMid'];
      }
    }
    let leftPadding = utils.repeat(' ', this.paddingLeft);
    let right = drawRight ? this.chars['right'] : '';
    let rightPadding = utils.repeat(' ', this.paddingRight);
    let line = this.lines[lineNum];
    let len = this.width - (this.paddingLeft + this.paddingRight);
    if (forceTruncationSymbol) line += this.truncate || '…';
    let content = utils.truncate(line, len, this.truncate);
    content = utils.pad(content, len, ' ', this.hAlign);
    content = leftPadding + content + rightPadding;
    return this.stylizeLine(left, content, right);
  }

  stylizeLine(left, content, right) {
    left = this.wrapWithStyleColors('border', left);
    right = this.wrapWithStyleColors('border', right);
    if (this.y === 0) {
      content = this.wrapWithStyleColors('head', content);
    }
    return left + content + right;
  }

  /**
   * Renders the bottom line of the cell.
   * @param drawRight - true if this method should render the right edge of the cell.
   * @returns {String}
   */
  drawBottom(drawRight) {
    let left = this.chars[this.x == 0 ? 'bottomLeft' : 'bottomMid'];
    let content = utils.repeat(this.chars.bottom, this.width);
    let right = drawRight ? this.chars['bottomRight'] : '';
    return this.wrapWithStyleColors('border', left + content + right);
  }

  /**
   * Renders a blank line of text within the cell. Used for top and/or bottom padding.
   * @param drawRight - true if this method should render the right edge of the cell.
   * @param spanningCell - a number of if being called from a RowSpanCell. (how many rows below). otherwise undefined.
   * @returns {String}
   */
  drawEmpty(drawRight, spanningCell) {
    let left = this.chars[this.x == 0 ? 'left' : 'middle'];
    if (this.x && spanningCell && this.cells) {
      let cellLeft = this.cells[this.y + spanningCell][this.x - 1];
      while (cellLeft instanceof ColSpanCell) {
        cellLeft = this.cells[cellLeft.y][cellLeft.x - 1];
      }
      if (!(cellLeft instanceof RowSpanCell)) {
        left = this.chars['rightMid'];
      }
    }
    let right = drawRight ? this.chars['right'] : '';
    let content = utils.repeat(' ', this.width);
    return this.stylizeLine(left, content, right);
  }
}

class ColSpanCell {
  /**
   * A Cell that doesn't do anything. It just draws empty lines.
   * Used as a placeholder in column spanning.
   * @constructor
   */
  constructor() {}

  draw(lineNum) {
    if (typeof lineNum === 'number') {
      debug(`${this.y}-${this.x}: 1x1 ColSpanCell`);
    }
    return '';
  }

  init() {}

  mergeTableOptions() {}
}

class RowSpanCell {
  /**
   * A placeholder Cell for a Cell that spans multiple rows.
   * It delegates rendering to the original cell, but adds the appropriate offset.
   * @param originalCell
   * @constructor
   */
  constructor(originalCell) {
    this.originalCell = originalCell;
  }

  init(tableOptions) {
    let y = this.y;
    let originalY = this.originalCell.y;
    this.cellOffset = y - originalY;
    this.offset = findDimension(tableOptions.rowHeights, originalY, this.cellOffset);
  }

  draw(lineNum) {
    if (lineNum == 'top') {
      return this.originalCell.draw(this.offset, this.cellOffset);
    }
    if (lineNum == 'bottom') {
      return this.originalCell.draw('bottom');
    }
    debug(`${this.y}-${this.x}: 1x${this.colSpan} RowSpanCell for ${this.originalCell.content}`);
    return this.originalCell.draw(this.offset + 1 + lineNum);
  }

  mergeTableOptions() {}
}

function firstDefined(...args) {
  return args.filter((v) => v !== undefined && v !== null).shift();
}

// HELPER FUNCTIONS
function setOption(objA, objB, nameB, targetObj) {
  let nameA = nameB.split('-');
  if (nameA.length > 1) {
    nameA[1] = nameA[1].charAt(0).toUpperCase() + nameA[1].substr(1);
    nameA = nameA.join('');
    targetObj[nameA] = firstDefined(objA[nameA], objA[nameB], objB[nameA], objB[nameB]);
  } else {
    targetObj[nameB] = firstDefined(objA[nameB], objB[nameB]);
  }
}

function findDimension(dimensionTable, startingIndex, span) {
  let ret = dimensionTable[startingIndex];
  for (let i = 1; i < span; i++) {
    ret += 1 + dimensionTable[startingIndex + i];
  }
  return ret;
}

function sumPlusOne(a, b) {
  return a + b + 1;
}

let CHAR_NAMES = [
  'top',
  'top-mid',
  'top-left',
  'top-right',
  'bottom',
  'bottom-mid',
  'bottom-left',
  'bottom-right',
  'left',
  'left-mid',
  'mid',
  'mid-mid',
  'right',
  'right-mid',
  'middle',
];

module.exports = Cell;
module.exports.ColSpanCell = ColSpanCell;
module.exports.RowSpanCell = RowSpanCell;
