import {
  regExpToken,
  NONE,
  COLOR,
  LENGTH,
  UNSUPPORTED_LENGTH_UNIT,
  SPACE,
} from '../tokenTypes'

const BORDER_STYLE = regExpToken(/^(solid|dashed|dotted)$/)

const defaultBorderWidth = 1
const defaultBorderColor = 'black'
const defaultBorderStyle = 'solid'

export default tokenStream => {
  let borderWidth
  let borderColor
  let borderStyle

  if (tokenStream.matches(NONE)) {
    tokenStream.expectEmpty()
    return { borderWidth: 0, borderColor: 'black', borderStyle: 'solid' }
  }

  let partsParsed = 0
  while (partsParsed < 3 && tokenStream.hasTokens()) {
    if (partsParsed !== 0) tokenStream.expect(SPACE)

    if (
      borderWidth === undefined &&
      tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT)
    ) {
      borderWidth = tokenStream.lastValue
    } else if (borderColor === undefined && tokenStream.matches(COLOR)) {
      borderColor = tokenStream.lastValue
    } else if (borderStyle === undefined && tokenStream.matches(BORDER_STYLE)) {
      borderStyle = tokenStream.lastValue
    } else {
      tokenStream.throw()
    }

    partsParsed += 1
  }

  tokenStream.expectEmpty()

  if (borderWidth === undefined) borderWidth = defaultBorderWidth
  if (borderColor === undefined) borderColor = defaultBorderColor
  if (borderStyle === undefined) borderStyle = defaultBorderStyle

  return { borderWidth, borderColor, borderStyle }
}
