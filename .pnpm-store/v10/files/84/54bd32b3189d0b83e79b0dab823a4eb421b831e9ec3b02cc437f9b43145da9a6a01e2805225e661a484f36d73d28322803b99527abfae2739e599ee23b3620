import transformCss from '..'

it('transforms font-family with double quotes', () => {
  expect(transformCss([['font-family', '"Helvetica Neue"']])).toEqual({
    fontFamily: 'Helvetica Neue',
  })
})

it('transforms font-family with single quotes', () => {
  expect(transformCss([['font-family', "'Helvetica Neue'"]])).toEqual({
    fontFamily: 'Helvetica Neue',
  })
})

it('transforms font-family without quotes', () => {
  expect(transformCss([['font-family', 'Helvetica Neue']])).toEqual({
    fontFamily: 'Helvetica Neue',
  })
})

it('transforms font-family with quotes with otherwise invalid values', () => {
  expect(transformCss([['font-family', '"Goudy Bookletter 1911"']])).toEqual({
    fontFamily: 'Goudy Bookletter 1911',
  })
})

it('transforms font-family with quotes with escaped values', () => {
  expect(transformCss([['font-family', '"test\\A test"']])).toEqual({
    fontFamily: 'test\ntest',
  })
})

it('transforms font-family with quotes with escaped quote', () => {
  expect(transformCss([['font-family', '"test\\"test"']])).toEqual({
    fontFamily: 'test"test',
  })
})

it('does not transform invalid unquoted font-family', () => {
  expect(() =>
    transformCss([['font-family', 'Goudy Bookletter 1911']])
  ).toThrow()
})
