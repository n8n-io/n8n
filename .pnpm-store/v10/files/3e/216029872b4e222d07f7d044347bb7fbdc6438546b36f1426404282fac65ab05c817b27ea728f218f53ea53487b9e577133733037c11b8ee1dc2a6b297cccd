import transformCss from '..'

it('transforms flex shorthand with 3 values', () => {
  expect(transformCss([['flex', '1 2 3px']])).toEqual({
    flexGrow: 1,
    flexShrink: 2,
    flexBasis: 3,
  })
})

it('transforms flex shorthand with 3 values in reverse order', () => {
  expect(transformCss([['flex', '3px 1 2']])).toEqual({
    flexGrow: 1,
    flexShrink: 2,
    flexBasis: 3,
  })
})

it('transforms flex shorthand with 2 values of flex-grow and flex-shrink', () => {
  expect(transformCss([['flex', '1 2']])).toEqual({
    flexGrow: 1,
    flexShrink: 2,
    flexBasis: 0,
  })
})

it('transforms flex shorthand with 2 values of flex-grow and flex-basis', () => {
  expect(transformCss([['flex', '2 2px']])).toEqual({
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 2,
  })
})

it('transforms flex shorthand with 2 values of flex-grow and flex-basis (reversed)', () => {
  expect(transformCss([['flex', '2px 2']])).toEqual({
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 2,
  })
})

it('transforms flex shorthand with 1 value of flex-grow', () => {
  expect(transformCss([['flex', '2']])).toEqual({
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
  })
})

it('transforms flex shorthand with 1 value of flex-basis', () => {
  expect(transformCss([['flex', '10px']])).toEqual({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 10,
  })
})

/*
A unitless zero that is not already preceded by two flex factors must be interpreted as a flex
factor. To avoid misinterpretation or invalid declarations, authors must specify a zero
<‘flex-basis’> component with a unit or precede it by two flex factors.
*/
it('transforms flex shorthand with flex-grow/shrink taking priority over basis', () => {
  expect(transformCss([['flex', '0 1 0']])).toEqual({
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 0,
  })
})

it('transforms flex shorthand with flex-basis set to auto', () => {
  expect(transformCss([['flex', '0 1 auto']])).toEqual({
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
  })
})

it('transforms flex shorthand with flex-basis set to percent', () => {
  expect(transformCss([['flex', '1 2 30%']])).toEqual({
    flexGrow: 1,
    flexShrink: 2,
    flexBasis: '30%',
  })
})

it('transforms flex shorthand with flex-basis set to unsupported unit', () => {
  expect(transformCss([['flex', '1 2 30em']])).toEqual({
    flexGrow: 1,
    flexShrink: 2,
    flexBasis: '30em',
  })
})

it('transforms flex shorthand with flex-basis set to auto appearing first', () => {
  expect(transformCss([['flex', 'auto 0 1']])).toEqual({
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
  })
})

it('transforms flex auto keyword', () => {
  expect(transformCss([['flex', 'auto']])).toEqual({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
  })
})

it('transforms flex none keyword', () => {
  expect(transformCss([['flex', 'none']])).toEqual({
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  })
})

it('does not transform invalid flex', () => {
  expect(() => transformCss([['flex', '1 2px 3']])).toThrow()
})
