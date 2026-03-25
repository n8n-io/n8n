import {
  AUTO,
  COLOR,
  LENGTH,
  PERCENT,
  UNSUPPORTED_LENGTH_UNIT,
  WORD,
} from '../tokenTypes'
import aspectRatio from './aspectRatio'
import border from './border'
import boxShadow from './boxShadow'
import flex from './flex'
import flexFlow from './flexFlow'
import font from './font'
import fontFamily from './fontFamily'
import fontVariant from './fontVariant'
import placeContent from './placeContent'
import textDecoration from './textDecoration'
import textDecorationLine from './textDecorationLine'
import textShadow from './textShadow'
import transform from './transform'
import { directionFactory, parseShadowOffset } from './util'

const background = tokenStream => ({
  backgroundColor: tokenStream.expect(COLOR),
})
const borderColor = directionFactory({
  types: [COLOR],
  prefix: 'border',
  suffix: 'Color',
})
const borderRadius = directionFactory({
  directions: ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'],
  prefix: 'border',
  suffix: 'Radius',
})
const borderWidth = directionFactory({ prefix: 'border', suffix: 'Width' })
const margin = directionFactory({
  types: [LENGTH, UNSUPPORTED_LENGTH_UNIT, PERCENT, AUTO],
  prefix: 'margin',
})
const padding = directionFactory({ prefix: 'padding' })

const fontWeight = tokenStream => ({
  fontWeight: tokenStream.expect(WORD), // Also match numbers as strings
})
const shadowOffset = tokenStream => ({
  shadowOffset: parseShadowOffset(tokenStream),
})
const textShadowOffset = tokenStream => ({
  textShadowOffset: parseShadowOffset(tokenStream),
})

export default {
  aspectRatio,
  background,
  border,
  borderColor,
  borderRadius,
  borderWidth,
  boxShadow,
  flex,
  flexFlow,
  font,
  fontFamily,
  fontVariant,
  fontWeight,
  margin,
  padding,
  placeContent,
  shadowOffset,
  textShadow,
  textShadowOffset,
  textDecoration,
  textDecorationLine,
  transform,
}
