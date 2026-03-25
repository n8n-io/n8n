import transformCss from '..'

it('transforms place content', () => {
  expect(transformCss([['place-content', 'center center']])).toEqual({
    alignContent: 'center',
    justifyContent: 'center',
  })
})

it('transforms place content with one value', () => {
  expect(transformCss([['place-content', 'center']])).toEqual({
    alignContent: 'center',
    justifyContent: 'stretch',
  })
})

it('does not allow justify content without align content', () => {
  expect(() => transformCss([['place-content', 'space-evenly']])).toThrow()
})
