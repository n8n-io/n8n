import {
  NONE,
  AUTO,
  NUMBER,
  LENGTH,
  UNSUPPORTED_LENGTH_UNIT,
  PERCENT,
  SPACE,
} from '../tokenTypes'

const defaultFlexGrow = 1
const defaultFlexShrink = 1
const defaultFlexBasis = 0

export default tokenStream => {
  let flexGrow
  let flexShrink
  let flexBasis

  if (tokenStream.matches(NONE)) {
    tokenStream.expectEmpty()
    return { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }
  }

  tokenStream.saveRewindPoint()
  if (tokenStream.matches(AUTO) && !tokenStream.hasTokens()) {
    return { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' }
  }
  tokenStream.rewind()

  let partsParsed = 0
  while (partsParsed < 2 && tokenStream.hasTokens()) {
    if (partsParsed !== 0) tokenStream.expect(SPACE)

    if (flexGrow === undefined && tokenStream.matches(NUMBER)) {
      flexGrow = tokenStream.lastValue

      tokenStream.saveRewindPoint()
      if (tokenStream.matches(SPACE) && tokenStream.matches(NUMBER)) {
        flexShrink = tokenStream.lastValue
      } else {
        tokenStream.rewind()
      }
    } else if (
      flexBasis === undefined &&
      tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT, PERCENT)
    ) {
      flexBasis = tokenStream.lastValue
    } else if (flexBasis === undefined && tokenStream.matches(AUTO)) {
      flexBasis = 'auto'
    } else {
      tokenStream.throw()
    }

    partsParsed += 1
  }

  tokenStream.expectEmpty()

  if (flexGrow === undefined) flexGrow = defaultFlexGrow
  if (flexShrink === undefined) flexShrink = defaultFlexShrink
  if (flexBasis === undefined) flexBasis = defaultFlexBasis

  return { flexGrow, flexShrink, flexBasis }
}
