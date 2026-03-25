import transformCss from '..'

it('transforms font', () => {
  expect(
    transformCss([['font', 'bold italic small-caps 16px/18px "Helvetica"']])
  ).toEqual({
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontVariant: ['small-caps'],
    lineHeight: 18,
  })
})

it('transforms font missing font-variant', () => {
  expect(transformCss([['font', 'bold italic 16px/18px "Helvetica"']])).toEqual(
    {
      fontFamily: 'Helvetica',
      fontSize: 16,
      fontWeight: 'bold',
      fontStyle: 'italic',
      fontVariant: [],
      lineHeight: 18,
    }
  )
})

it('transforms font missing font-style', () => {
  expect(
    transformCss([['font', 'bold small-caps 16px/18px "Helvetica"']])
  ).toEqual({
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'normal',
    fontVariant: ['small-caps'],
    lineHeight: 18,
  })
})

it('transforms font missing font-weight', () => {
  expect(
    transformCss([['font', 'italic small-caps 16px/18px "Helvetica"']])
  ).toEqual({
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'italic',
    fontVariant: ['small-caps'],
    lineHeight: 18,
  })
})

it('transforms font with font-weight normal', () => {
  expect(transformCss([['font', 'normal 16px/18px "Helvetica"']])).toEqual({
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: [],
    lineHeight: 18,
  })
})

it('transforms font with font-weight and font-style normal', () => {
  expect(
    transformCss([['font', 'normal normal 16px/18px "Helvetica"']])
  ).toEqual({
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: [],
    lineHeight: 18,
  })
})

it('transforms font with no font-weight, font-style, and font-variant', () => {
  expect(transformCss([['font', '16px/18px "Helvetica"']])).toEqual({
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: [],
    lineHeight: 18,
  })
})

it('omits line height if not specified', () => {
  expect(transformCss([['font', '16px "Helvetica"']])).toEqual({
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: [],
  })
})

it('does not allow line height as multiple', () => {
  expect(() => {
    transformCss([['font', '16px/1.5 "Helvetica"']])
  }).toThrow()
})

it('transforms font without quotes', () => {
  expect(
    transformCss([['font', 'bold italic small-caps 16px/18px Helvetica Neue']])
  ).toEqual({
    fontFamily: 'Helvetica Neue',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontVariant: ['small-caps'],
    lineHeight: 18,
  })
})
