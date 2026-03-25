import transformCss from '..'

it('handles regular aspect ratio values', () => {
  expect(transformCss([['aspect-ratio', '1.5']])).toEqual({
    aspectRatio: 1.5,
  })
})

it('handles CSS-style aspect ratios', () => {
  expect(transformCss([['aspect-ratio', '3 / 2']])).toEqual({
    aspectRatio: 1.5,
  })
})

it('handles CSS-style aspect ratios without spaces', () => {
  expect(transformCss([['aspect-ratio', '3/2']])).toEqual({
    aspectRatio: 1.5,
  })
})

it('throws when omitting second value after slash', () => {
  expect(() => transformCss([['aspect-ratio', '3/']])).toThrow()
})
