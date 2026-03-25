import { SPACE, COMMA, LENGTH, NUMBER, ANGLE } from '../tokenTypes'

const oneOfType = tokenType => functionStream => {
  const value = functionStream.expect(tokenType)
  functionStream.expectEmpty()
  return value
}

const singleNumber = oneOfType(NUMBER)
const singleLength = oneOfType(LENGTH)
const singleAngle = oneOfType(ANGLE)
const xyTransformFactory = tokenType => (
  key,
  valueIfOmitted
) => functionStream => {
  const x = functionStream.expect(tokenType)

  let y
  if (functionStream.hasTokens()) {
    functionStream.expect(COMMA)
    y = functionStream.expect(tokenType)
  } else if (valueIfOmitted !== undefined) {
    y = valueIfOmitted
  } else {
    // Assumption, if x === y, then we can omit XY
    // I.e. scale(5) => [{ scale: 5 }] rather than [{ scaleX: 5 }, { scaleY: 5 }]
    return x
  }

  functionStream.expectEmpty()

  return [{ [`${key}Y`]: y }, { [`${key}X`]: x }]
}
const xyNumber = xyTransformFactory(NUMBER)
const xyLength = xyTransformFactory(LENGTH)
const xyAngle = xyTransformFactory(ANGLE)

const partTransforms = {
  perspective: singleNumber,
  scale: xyNumber('scale'),
  scaleX: singleNumber,
  scaleY: singleNumber,
  translate: xyLength('translate', 0),
  translateX: singleLength,
  translateY: singleLength,
  rotate: singleAngle,
  rotateX: singleAngle,
  rotateY: singleAngle,
  rotateZ: singleAngle,
  skewX: singleAngle,
  skewY: singleAngle,
  skew: xyAngle('skew', '0deg'),
}

export default tokenStream => {
  let transforms = []

  let didParseFirst = false
  while (tokenStream.hasTokens()) {
    if (didParseFirst) tokenStream.expect(SPACE)

    const functionStream = tokenStream.expectFunction()
    const { functionName } = functionStream
    let transformedValues = partTransforms[functionName](functionStream)
    if (!Array.isArray(transformedValues)) {
      transformedValues = [{ [functionName]: transformedValues }]
    }
    transforms = transformedValues.concat(transforms)

    didParseFirst = true
  }

  return { transform: transforms }
}
