module.exports = class CovLine {
  constructor (line, startCol, lineStr) {
    this.line = line
    // note that startCol and endCol are absolute positions
    // within a file, not relative to the line.
    this.startCol = startCol

    // the line length itself does not include the newline characters,
    // these are however taken into account when enumerating absolute offset.
    const matchedNewLineChar = lineStr.match(/\r?\n$/u)
    const newLineLength = matchedNewLineChar ? matchedNewLineChar[0].length : 0
    this.endCol = startCol + lineStr.length - newLineLength

    // we start with all lines having been executed, and work
    // backwards zeroing out lines based on V8 output.
    this.count = 1

    // set by source.js during parsing, if /* c8 ignore next */ is found.
    this.ignore = false
  }

  toIstanbul () {
    return {
      start: {
        line: this.line,
        column: 0
      },
      end: {
        line: this.line,
        column: this.endCol - this.startCol
      }
    }
  }
}
