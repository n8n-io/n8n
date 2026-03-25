import transformCss from '..'

it('transforms border color with multiple values', () => {
  expect(transformCss([['border-color', 'red yellow green blue']])).toEqual({
    borderTopColor: 'red',
    borderRightColor: 'yellow',
    borderBottomColor: 'green',
    borderLeftColor: 'blue',
  })
})

it('transforms border color with hex color', () => {
  expect(transformCss([['border-color', '#f00']])).toEqual({
    borderBottomColor: '#f00',
    borderLeftColor: '#f00',
    borderRightColor: '#f00',
    borderTopColor: '#f00',
  })
})

it('transforms border color with rgb color', () => {
  expect(transformCss([['border-color', 'rgb(255, 0, 0)']])).toEqual({
    borderBottomColor: 'rgb(255, 0, 0)',
    borderLeftColor: 'rgb(255, 0, 0)',
    borderRightColor: 'rgb(255, 0, 0)',
    borderTopColor: 'rgb(255, 0, 0)',
  })
})

it('transforms border color with rgba color', () => {
  expect(transformCss([['border-color', 'rgba(255, 0, 0, 0.1)']])).toEqual({
    borderBottomColor: 'rgba(255, 0, 0, 0.1)',
    borderLeftColor: 'rgba(255, 0, 0, 0.1)',
    borderRightColor: 'rgba(255, 0, 0, 0.1)',
    borderTopColor: 'rgba(255, 0, 0, 0.1)',
  })
})
