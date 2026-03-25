import transformCss from '..'

it('transforms text-decoration into text-decoration- properties', () => {
  expect(transformCss([['text-decoration', 'underline dotted red']])).toEqual({
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: 'red',
  })
})

it('transforms text-decoration without color', () => {
  expect(transformCss([['text-decoration', 'underline dotted']])).toEqual({
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: 'black',
  })
})

it('transforms text-decoration without style', () => {
  expect(transformCss([['text-decoration', 'underline red']])).toEqual({
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
    textDecorationColor: 'red',
  })
})

it('transforms text-decoration without style and color', () => {
  expect(transformCss([['text-decoration', 'underline']])).toEqual({
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
    textDecorationColor: 'black',
  })
})

it('transforms text-decoration with two line properties', () => {
  expect(
    transformCss([['text-decoration', 'underline line-through dashed red']])
  ).toEqual({
    textDecorationLine: 'underline line-through',
    textDecorationStyle: 'dashed',
    textDecorationColor: 'red',
  })
})

it('transforms text-decoration in different order', () => {
  expect(
    transformCss([['text-decoration', 'dashed red underline line-through']])
  ).toEqual({
    textDecorationLine: 'underline line-through',
    textDecorationStyle: 'dashed',
    textDecorationColor: 'red',
  })
})

it('transforms text-decoration with ine in different order', () => {
  expect(transformCss([['text-decoration', 'line-through underline']])).toEqual(
    {
      textDecorationLine: 'underline line-through',
      textDecorationStyle: 'solid',
      textDecorationColor: 'black',
    }
  )
})

it('transforms text-decoration with none', () => {
  expect(transformCss([['text-decoration', 'none']])).toEqual({
    textDecorationLine: 'none',
    textDecorationStyle: 'solid',
    textDecorationColor: 'black',
  })
})

it('transforms text-decoration with none as part of multiple terms', () => {
  expect(transformCss([['text-decoration', 'yellow none']])).toEqual({
    textDecorationLine: 'none',
    textDecorationStyle: 'solid',
    textDecorationColor: 'yellow',
  })
})

it('transforms text-decoration with none in capitals', () => {
  expect(transformCss([['text-decoration', 'yellow NONE']])).toEqual({
    textDecorationLine: 'none',
    textDecorationStyle: 'solid',
    textDecorationColor: 'yellow',
  })
})

it('transforms text-decoration with style in capitals', () => {
  expect(
    transformCss([['text-decoration', 'yellow UNDERLINE LINE-THROUGH']])
  ).toEqual({
    textDecorationLine: 'underline line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: 'yellow',
  })
})

it('does not transform text-decoration if multiple colors are used', () => {
  expect(() =>
    transformCss([['text-decoration', 'underline red yellow']])
  ).toThrow()
})
