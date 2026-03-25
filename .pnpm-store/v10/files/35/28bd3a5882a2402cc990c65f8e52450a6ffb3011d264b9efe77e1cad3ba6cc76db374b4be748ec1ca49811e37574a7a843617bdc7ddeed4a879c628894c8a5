import transformCss from '..'

it('transforms border none', () => {
  expect(transformCss([['border', 'none']])).toEqual({
    borderWidth: 0,
    borderColor: 'black',
    borderStyle: 'solid',
  })
})

it('transforms border shorthand', () => {
  expect(transformCss([['border', '2px dashed #f00']])).toEqual({
    borderWidth: 2,
    borderColor: '#f00',
    borderStyle: 'dashed',
  })
})

it('transforms border shorthand in other order', () => {
  expect(transformCss([['border', '#f00 2px dashed']])).toEqual({
    borderWidth: 2,
    borderColor: '#f00',
    borderStyle: 'dashed',
  })
})

it('transforms border shorthand missing color', () => {
  expect(transformCss([['border', '2px dashed']])).toEqual({
    borderWidth: 2,
    borderColor: 'black',
    borderStyle: 'dashed',
  })
})

it('transforms border shorthand missing style', () => {
  expect(transformCss([['border', '2px #f00']])).toEqual({
    borderWidth: 2,
    borderColor: '#f00',
    borderStyle: 'solid',
  })
})

it('transforms border shorthand missing width', () => {
  expect(transformCss([['border', '#f00 dashed']])).toEqual({
    borderWidth: 1,
    borderColor: '#f00',
    borderStyle: 'dashed',
  })
})

it('transforms border shorthand missing color & width', () => {
  expect(transformCss([['border', 'dashed']])).toEqual({
    borderWidth: 1,
    borderColor: 'black',
    borderStyle: 'dashed',
  })
})

it('transforms border shorthand missing style & width', () => {
  expect(transformCss([['border', '#f00']])).toEqual({
    borderWidth: 1,
    borderColor: '#f00',
    borderStyle: 'solid',
  })
})

it('transforms border shorthand missing color & style', () => {
  expect(transformCss([['border', '2px']])).toEqual({
    borderWidth: 2,
    borderColor: 'black',
    borderStyle: 'solid',
  })
})

it('transforms border for unsupported units', () => {
  expect(transformCss([['border', '3em solid black']])).toEqual({
    borderWidth: '3em',
    borderColor: 'black',
    borderStyle: 'solid',
  })
})

it('does not transform border with percentage width', () => {
  expect(() => transformCss([['border', '3% solid black']])).toThrow()
})
