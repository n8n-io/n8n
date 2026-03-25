import { regExpToken, SPACE, LINE, COLOR } from '../tokenTypes'

const STYLE = regExpToken(/^(solid|double|dotted|dashed)$/)

const defaultTextDecorationLine = 'none'
const defaultTextDecorationStyle = 'solid'
const defaultTextDecorationColor = 'black'

export default tokenStream => {
  let line
  let style
  let color

  let didParseFirst = false
  while (tokenStream.hasTokens()) {
    if (didParseFirst) tokenStream.expect(SPACE)

    if (line === undefined && tokenStream.matches(LINE)) {
      const lines = [tokenStream.lastValue.toLowerCase()]

      tokenStream.saveRewindPoint()
      if (
        lines[0] !== 'none' &&
        tokenStream.matches(SPACE) &&
        tokenStream.matches(LINE)
      ) {
        lines.push(tokenStream.lastValue.toLowerCase())
        // Underline comes before line-through
        lines.sort().reverse()
      } else {
        tokenStream.rewind()
      }

      line = lines.join(' ')
    } else if (style === undefined && tokenStream.matches(STYLE)) {
      style = tokenStream.lastValue
    } else if (color === undefined && tokenStream.matches(COLOR)) {
      color = tokenStream.lastValue
    } else {
      tokenStream.throw()
    }

    didParseFirst = true
  }

  return {
    textDecorationLine: line !== undefined ? line : defaultTextDecorationLine,
    textDecorationColor:
      color !== undefined ? color : defaultTextDecorationColor,
    textDecorationStyle:
      style !== undefined ? style : defaultTextDecorationStyle,
  }
}
