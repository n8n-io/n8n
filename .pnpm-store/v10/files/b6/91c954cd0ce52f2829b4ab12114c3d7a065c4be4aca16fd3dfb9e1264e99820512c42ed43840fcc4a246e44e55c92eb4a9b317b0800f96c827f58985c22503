module.exports = class CovBranch {
  constructor (startLine, startCol, endLine, endCol, count) {
    this.startLine = startLine
    this.startCol = startCol
    this.endLine = endLine
    this.endCol = endCol
    this.count = count
  }

  toIstanbul () {
    const location = {
      start: {
        line: this.startLine,
        column: this.startCol
      },
      end: {
        line: this.endLine,
        column: this.endCol
      }
    }
    return {
      type: 'branch',
      line: this.startLine,
      loc: location,
      locations: [Object.assign({}, location)]
    }
  }
}
