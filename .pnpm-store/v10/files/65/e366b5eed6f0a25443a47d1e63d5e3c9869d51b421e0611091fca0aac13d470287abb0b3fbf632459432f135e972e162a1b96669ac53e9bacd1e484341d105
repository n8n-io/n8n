import transformCss from '..'

it('transforms box-shadow into shadow- properties', () => {
  expect(transformCss([['box-shadow', '10px 20px 30px red']])).toEqual({
    shadowOffset: { width: 10, height: 20 },
    shadowRadius: 30,
    shadowColor: 'red',
    shadowOpacity: 1,
  })
})

it('transforms box-shadow without blur-radius', () => {
  expect(transformCss([['box-shadow', '10px 20px red']])).toEqual({
    shadowOffset: { width: 10, height: 20 },
    shadowRadius: 0,
    shadowColor: 'red',
    shadowOpacity: 1,
  })
})

it('transforms box-shadow without color', () => {
  expect(transformCss([['box-shadow', '10px 20px']])).toEqual({
    shadowOffset: { width: 10, height: 20 },
    shadowRadius: 0,
    shadowColor: 'black',
    shadowOpacity: 1,
  })
})

it('transforms box-shadow with rgb color', () => {
  expect(
    transformCss([['box-shadow', '10px 20px rgb(100, 100, 100)']])
  ).toEqual({
    shadowOffset: { width: 10, height: 20 },
    shadowRadius: 0,
    shadowColor: 'rgb(100, 100, 100)',
    shadowOpacity: 1,
  })
})

it('transforms box-shadow with rgba color', () => {
  expect(
    transformCss([['box-shadow', '10px 20px rgba(100, 100, 100, 0.5)']])
  ).toEqual({
    shadowOffset: { width: 10, height: 20 },
    shadowRadius: 0,
    shadowColor: 'rgba(100, 100, 100, 0.5)',
    shadowOpacity: 1,
  })
})

it('transforms box-shadow with hsl color', () => {
  expect(
    transformCss([['box-shadow', '10px 20px hsl(120, 100%, 50%)']])
  ).toEqual({
    shadowOffset: { width: 10, height: 20 },
    shadowRadius: 0,
    shadowColor: 'hsl(120, 100%, 50%)',
    shadowOpacity: 1,
  })
})

it('transforms box-shadow with hsla color', () => {
  expect(
    transformCss([['box-shadow', '10px 20px hsla(120, 100%, 50%, 0.7)']])
  ).toEqual({
    shadowOffset: { width: 10, height: 20 },
    shadowRadius: 0,
    shadowColor: 'hsla(120, 100%, 50%, 0.7)',
    shadowOpacity: 1,
  })
})

it('transforms box-shadow and throws if multiple colors are used', () => {
  expect(() =>
    transformCss([['box-shadow', '0 0 0 red yellow green blue']])
  ).toThrow()
})

it('transforms box-shadow enforces offset to be present', () => {
  expect(() => transformCss([['box-shadow', 'red']])).toThrow()
  expect(() => transformCss([['box-shadow', '10px red']])).toThrow()
})
