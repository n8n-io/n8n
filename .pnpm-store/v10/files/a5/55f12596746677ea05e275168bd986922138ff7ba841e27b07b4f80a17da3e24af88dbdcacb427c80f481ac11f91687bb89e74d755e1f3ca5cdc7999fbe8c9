import transformCss from '..'

it('textShadow with all values', () => {
  expect(transformCss([['text-shadow', '10px 20px 30px red']])).toEqual({
    textShadowOffset: { width: 10, height: 20 },
    textShadowRadius: 30,
    textShadowColor: 'red',
  })
})

it('textShadow omitting blur', () => {
  expect(transformCss([['text-shadow', '10px 20px red']])).toEqual({
    textShadowOffset: { width: 10, height: 20 },
    textShadowRadius: 0,
    textShadowColor: 'red',
  })
})

it('textShadow omitting color', () => {
  expect(transformCss([['text-shadow', '10px 20px']])).toEqual({
    textShadowOffset: { width: 10, height: 20 },
    textShadowRadius: 0,
    textShadowColor: 'black',
  })
})

it('textShadow enforces offset-x and offset-y', () => {
  expect(() => transformCss([['text-shadow', 'red']])).toThrow()
  expect(() => transformCss([['text-shadow', '10px red']])).toThrow()
})
