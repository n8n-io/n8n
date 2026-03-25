import transformCss from '..'

it('transforms a single transform value with number', () => {
  expect(transformCss([['transform', 'scaleX(5)']])).toEqual({
    transform: [{ scaleX: 5 }],
  })
})

it('transforms a single transform value with string', () => {
  expect(transformCss([['transform', 'rotate(5deg)']])).toEqual({
    transform: [{ rotate: '5deg' }],
  })
})

it('transforms multiple transform values', () => {
  expect(transformCss([['transform', 'scaleX(5) skewX(1deg)']])).toEqual({
    transform: [{ skewX: '1deg' }, { scaleX: 5 }],
  })
})

it('transforms scale(number, number) to scaleX and scaleY', () => {
  expect(transformCss([['transform', 'scale(2, 3)']])).toEqual({
    transform: [{ scaleY: 3 }, { scaleX: 2 }],
  })
})

it('transforms scale(number) to scale', () => {
  expect(transformCss([['transform', 'scale(5)']])).toEqual({
    transform: [{ scale: 5 }],
  })
})

it('transforms translate(length, length) to translateX and translateY', () => {
  expect(transformCss([['transform', 'translate(2px, 3px)']])).toEqual({
    transform: [{ translateY: 3 }, { translateX: 2 }],
  })
})

it('transforms translate(length) to translateX and translateY', () => {
  expect(transformCss([['transform', 'translate(5px)']])).toEqual({
    transform: [{ translateY: 0 }, { translateX: 5 }],
  })
})

it('transforms skew(angle, angle) to skewX and skewY', () => {
  expect(transformCss([['transform', 'skew(2deg, 3deg)']])).toEqual({
    transform: [{ skewY: '3deg' }, { skewX: '2deg' }],
  })
})

it('transforms skew(angle) to skewX and skewY', () => {
  expect(transformCss([['transform', 'skew(5deg)']])).toEqual({
    transform: [{ skewY: '0deg' }, { skewX: '5deg' }],
  })
})
