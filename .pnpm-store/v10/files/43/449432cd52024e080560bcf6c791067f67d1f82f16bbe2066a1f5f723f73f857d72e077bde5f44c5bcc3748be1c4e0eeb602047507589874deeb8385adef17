import {
  LENGTH,
  UNSUPPORTED_LENGTH_UNIT,
  PERCENT,
  COLOR,
  SPACE,
  NONE,
} from '../tokenTypes'

export const directionFactory = ({
  types = [LENGTH, UNSUPPORTED_LENGTH_UNIT, PERCENT],
  directions = ['Top', 'Right', 'Bottom', 'Left'],
  prefix = '',
  suffix = '',
}) => tokenStream => {
  const values = []

  // borderWidth doesn't currently allow a percent value, but may do in the future
  values.push(tokenStream.expect(...types))

  while (values.length < 4 && tokenStream.hasTokens()) {
    tokenStream.expect(SPACE)
    values.push(tokenStream.expect(...types))
  }

  tokenStream.expectEmpty()

  const [top, right = top, bottom = top, left = right] = values

  const keyFor = n => `${prefix}${directions[n]}${suffix}`

  return {
    [keyFor(0)]: top,
    [keyFor(1)]: right,
    [keyFor(2)]: bottom,
    [keyFor(3)]: left,
  }
}

export const parseShadowOffset = tokenStream => {
  const width = tokenStream.expect(LENGTH)
  const height = tokenStream.matches(SPACE) ? tokenStream.expect(LENGTH) : width
  tokenStream.expectEmpty()
  return { width, height }
}

export const parseShadow = tokenStream => {
  let offsetX
  let offsetY
  let radius
  let color

  if (tokenStream.matches(NONE)) {
    tokenStream.expectEmpty()
    return {
      offset: { width: 0, height: 0 },
      radius: 0,
      color: 'black',
    }
  }

  let didParseFirst = false
  while (tokenStream.hasTokens()) {
    if (didParseFirst) tokenStream.expect(SPACE)

    if (
      offsetX === undefined &&
      tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT)
    ) {
      offsetX = tokenStream.lastValue
      tokenStream.expect(SPACE)
      offsetY = tokenStream.expect(LENGTH, UNSUPPORTED_LENGTH_UNIT)

      tokenStream.saveRewindPoint()
      if (
        tokenStream.matches(SPACE) &&
        tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT)
      ) {
        radius = tokenStream.lastValue
      } else {
        tokenStream.rewind()
      }
    } else if (color === undefined && tokenStream.matches(COLOR)) {
      color = tokenStream.lastValue
    } else {
      tokenStream.throw()
    }

    didParseFirst = true
  }

  if (offsetX === undefined) tokenStream.throw()

  return {
    offset: { width: offsetX, height: offsetY },
    radius: radius !== undefined ? radius : 0,
    color: color !== undefined ? color : 'black',
  }
}
