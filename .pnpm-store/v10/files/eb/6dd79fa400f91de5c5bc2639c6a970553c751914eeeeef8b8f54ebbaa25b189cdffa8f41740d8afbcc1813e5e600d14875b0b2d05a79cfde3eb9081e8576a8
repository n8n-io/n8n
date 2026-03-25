import transformCss from '..'

it('transforms text-decoration-line with underline line-through', () => {
  expect(
    transformCss([['text-decoration-line', 'underline line-through']])
  ).toEqual({
    textDecorationLine: 'underline line-through',
  })
})

it('transforms text-decoration-line with line-through underline', () => {
  expect(
    transformCss([['text-decoration-line', 'line-through underline']])
  ).toEqual({
    textDecorationLine: 'underline line-through',
  })
})

it('transforms text-decoration-line with none', () => {
  expect(transformCss([['text-decoration-line', 'none']])).toEqual({
    textDecorationLine: 'none',
  })
})
