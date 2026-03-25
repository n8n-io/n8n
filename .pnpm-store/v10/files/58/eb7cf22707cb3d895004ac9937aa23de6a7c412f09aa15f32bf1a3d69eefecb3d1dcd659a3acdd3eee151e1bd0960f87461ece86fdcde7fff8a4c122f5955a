import parseFontFamily from './fontFamily'
import {
  regExpToken,
  SPACE,
  LENGTH,
  UNSUPPORTED_LENGTH_UNIT,
  SLASH,
} from '../tokenTypes'

const NORMAL = regExpToken(/^(normal)$/)
const STYLE = regExpToken(/^(italic)$/)
const WEIGHT = regExpToken(/^([1-9]00|bold)$/)
const VARIANT = regExpToken(/^(small-caps)$/)

const defaultFontStyle = 'normal'
const defaultFontWeight = 'normal'
const defaultFontVariant = []

export default tokenStream => {
  let fontStyle
  let fontWeight
  let fontVariant
  // let fontSize;
  let lineHeight
  // let fontFamily;

  let numStyleWeightVariantMatched = 0
  while (numStyleWeightVariantMatched < 3 && tokenStream.hasTokens()) {
    if (tokenStream.matches(NORMAL)) {
      /* pass */
    } else if (fontStyle === undefined && tokenStream.matches(STYLE)) {
      fontStyle = tokenStream.lastValue
    } else if (fontWeight === undefined && tokenStream.matches(WEIGHT)) {
      fontWeight = tokenStream.lastValue
    } else if (fontVariant === undefined && tokenStream.matches(VARIANT)) {
      fontVariant = [tokenStream.lastValue]
    } else {
      break
    }

    tokenStream.expect(SPACE)
    numStyleWeightVariantMatched += 1
  }

  const fontSize = tokenStream.expect(LENGTH, UNSUPPORTED_LENGTH_UNIT)

  if (tokenStream.matches(SLASH)) {
    lineHeight = tokenStream.expect(LENGTH, UNSUPPORTED_LENGTH_UNIT)
  }

  tokenStream.expect(SPACE)

  const { fontFamily } = parseFontFamily(tokenStream)

  if (fontStyle === undefined) fontStyle = defaultFontStyle
  if (fontWeight === undefined) fontWeight = defaultFontWeight
  if (fontVariant === undefined) fontVariant = defaultFontVariant

  const out = { fontStyle, fontWeight, fontVariant, fontSize, fontFamily }
  if (lineHeight !== undefined) out.lineHeight = lineHeight

  return out
}
