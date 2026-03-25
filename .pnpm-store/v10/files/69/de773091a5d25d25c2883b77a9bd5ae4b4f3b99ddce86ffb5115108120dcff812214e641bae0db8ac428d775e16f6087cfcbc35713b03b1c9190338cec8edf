import transformCss from '..'

it('transforms font weights as strings', () => {
  expect(transformCss([['font-weight', '400']])).toEqual({ fontWeight: '400' })
  expect(transformCss([['font-weight', 'bold']])).toEqual({
    fontWeight: 'bold',
  })
})
