import transformCss from '..'

it('transforms font variant as an array', () => {
  expect(transformCss([['font-variant', 'tabular-nums']])).toEqual({
    fontVariant: ['tabular-nums'],
  })
})

it('transforms multiple font variant as an array', () => {
  expect(
    transformCss([['font-variant', 'tabular-nums oldstyle-nums']])
  ).toEqual({
    fontVariant: ['tabular-nums', 'oldstyle-nums'],
  })
})
