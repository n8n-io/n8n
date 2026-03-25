import transformCss from '..'

it('transforms shadow offsets', () => {
  expect(transformCss([['shadow-offset', '10px 5px']])).toEqual({
    shadowOffset: { width: 10, height: 5 },
  })
})

it('transforms text shadow offsets', () => {
  expect(transformCss([['text-shadow-offset', '10px 5px']])).toEqual({
    textShadowOffset: { width: 10, height: 5 },
  })
})
