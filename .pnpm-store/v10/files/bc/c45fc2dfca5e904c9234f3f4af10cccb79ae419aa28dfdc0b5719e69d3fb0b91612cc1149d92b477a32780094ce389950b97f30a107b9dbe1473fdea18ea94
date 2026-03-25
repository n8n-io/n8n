import transformCss from '..'

it('transforms flexFlow shorthand with two values', () => {
  expect(transformCss([['flex-flow', 'column wrap']])).toEqual({
    flexDirection: 'column',
    flexWrap: 'wrap',
  })
})

it('transforms flexFlow shorthand missing flexDirection', () => {
  expect(transformCss([['flex-flow', 'wrap']])).toEqual({
    flexDirection: 'row',
    flexWrap: 'wrap',
  })
})

it('transforms flexFlow shorthand missing flexWrap', () => {
  expect(transformCss([['flex-flow', 'column']])).toEqual({
    flexDirection: 'column',
    flexWrap: 'nowrap',
  })
})
