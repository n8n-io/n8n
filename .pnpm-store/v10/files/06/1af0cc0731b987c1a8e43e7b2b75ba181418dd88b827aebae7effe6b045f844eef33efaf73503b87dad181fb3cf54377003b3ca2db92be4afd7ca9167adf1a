module.exports = class CovFunction {
  constructor (name, startLine, startCol, endLine, endCol, count) {
    this.name = name
    this.startLine = startLine
    this.startCol = startCol
    this.endLine = endLine
    this.endCol = endCol
    this.count = count
  }

  toIstanbul () {
    const loc = {
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
      name: this.name,
      decl: loc,
      loc,
      line: this.startLine
    }
  }
}
