import transformCss, { getStylesForProperty } from '..'

it('transforms numbers', () => {
  expect(transformCss([['z-index', '0']])).toEqual({ zIndex: 0 })
})

it('warns if missing units on unspecialized transform', () => {
  const consoleSpy = jest
    .spyOn(global.console, 'warn')
    .mockImplementation(() => {
      // Silence the warning from the test output
    })

  transformCss([['top', '1']])
  expect(consoleSpy).toHaveBeenCalledWith(
    'Expected style "top: 1" to contain units'
  )

  consoleSpy.mockRestore()
})

it('does not warn for unitless 0 length on unspecialized transform', () => {
  const consoleSpy = jest.spyOn(global.console, 'warn')

  transformCss([['top', '0']])
  expect(consoleSpy).not.toHaveBeenCalled()

  consoleSpy.mockRestore()
})

it('warns if adding etraneous units on unspecialized transform', () => {
  const consoleSpy = jest
    .spyOn(global.console, 'warn')
    .mockImplementation(() => {
      // Silence the warning from the test output
    })

  transformCss([['opacity', '1px']])
  expect(consoleSpy).toHaveBeenCalledWith(
    'Expected style "opacity: 1px" to be unitless'
  )

  consoleSpy.mockRestore()
})

it('does not warn for unitless 0 length on unitless transform', () => {
  const consoleSpy = jest.spyOn(global.console, 'warn')

  transformCss([['opacity', '0']])
  expect(consoleSpy).not.toHaveBeenCalled()

  consoleSpy.mockRestore()
})

it('allows pixels in unspecialized transform', () => {
  expect(transformCss([['top', '0px']])).toEqual({ top: 0 })
})

it('allows boolean values', () => {
  expect(
    transformCss([
      ['boolTrue1', 'true'],
      ['boolTrue2', 'TRUE'],
      ['boolFalse1', 'false'],
      ['boolFalse2', 'FALSE'],
    ])
  ).toEqual({
    boolTrue1: true,
    boolTrue2: true,
    boolFalse1: false,
    boolFalse2: false,
  })
})

it('allows null values', () => {
  expect(transformCss([['null1', 'null'], ['null2', 'NULL']])).toEqual({
    null1: null,
    null2: null,
  })
})

it('allows undefined values', () => {
  expect(
    transformCss([['undefined1', 'undefined'], ['undefined2', 'UNDEFINED']])
  ).toEqual({
    undefined1: undefined,
    undefined2: undefined,
  })
})

it('allows CSS custom properties to pass through', () => {
  expect(transformCss([['--my-prop', '0%']])).toEqual({ '--my-prop': '0%' })
})

it('allows percent in unspecialized transform', () => {
  expect(transformCss([['top', '0%']])).toEqual({ top: '0%' })
})

it('allows decimal values', () => {
  expect(getStylesForProperty('margin', '0.5px').marginTop).toBe(0.5)
  expect(getStylesForProperty('margin', '1.5px').marginTop).toBe(1.5)
  expect(getStylesForProperty('margin', '10.5px').marginTop).toBe(10.5)
  expect(getStylesForProperty('margin', '100.5px').marginTop).toBe(100.5)
  expect(getStylesForProperty('margin', '-0.5px').marginTop).toBe(-0.5)
  expect(getStylesForProperty('margin', '-1.5px').marginTop).toBe(-1.5)
  expect(getStylesForProperty('margin', '-10.5px').marginTop).toBe(-10.5)
  expect(getStylesForProperty('margin', '-100.5px').marginTop).toBe(-100.5)
  expect(getStylesForProperty('margin', '.5px').marginTop).toBe(0.5)
  expect(getStylesForProperty('margin', '-.5px').marginTop).toBe(-0.5)
})

it('allows decimal values in transformed values', () => {
  expect(transformCss([['border-radius', '1.5px']])).toEqual({
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
    borderBottomRightRadius: 1.5,
    borderBottomLeftRadius: 1.5,
  })
})

it('allows negative values in transformed values', () => {
  expect(transformCss([['border-radius', '-1.5px']])).toEqual({
    borderTopLeftRadius: -1.5,
    borderTopRightRadius: -1.5,
    borderBottomRightRadius: -1.5,
    borderBottomLeftRadius: -1.5,
  })
})

it('allows uppercase units', () => {
  expect(transformCss([['top', '0PX']])).toEqual({ top: 0 })
  expect(transformCss([['transform', 'rotate(30DEG)']])).toEqual({
    transform: [{ rotate: '30deg' }],
  })
})

it('allows percent values in transformed values', () => {
  expect(transformCss([['margin', '10%']])).toEqual({
    marginTop: '10%',
    marginRight: '10%',
    marginBottom: '10%',
    marginLeft: '10%',
  })
})

it('allows color values in transformed border-color values', () => {
  expect(transformCss([['border-color', 'red']])).toEqual({
    borderTopColor: 'red',
    borderRightColor: 'red',
    borderBottomColor: 'red',
    borderLeftColor: 'red',
  })
})

it('allows omitting units for 0', () => {
  expect(transformCss([['margin', '10px 0']])).toEqual({
    marginTop: 10,
    marginRight: 0,
    marginBottom: 10,
    marginLeft: 0,
  })
})

it('transforms strings', () => {
  expect(transformCss([['color', 'red']])).toEqual({ color: 'red' })
})

it('converts to camel-case', () => {
  expect(transformCss([['background-color', 'red']])).toEqual({
    backgroundColor: 'red',
  })
})

it('transforms background to backgroundColor', () => {
  expect(transformCss([['background', '#f00']])).toEqual({
    backgroundColor: '#f00',
  })
})

it('transforms background to backgroundColor with rgb', () => {
  expect(transformCss([['background', 'rgb(255, 0, 0)']])).toEqual({
    backgroundColor: 'rgb(255, 0, 0)',
  })
})

it('transforms background to backgroundColor with named colour', () => {
  expect(transformCss([['background', 'red']])).toEqual({
    backgroundColor: 'red',
  })
})

it('allows blacklisting shorthands', () => {
  const actualStyles = transformCss(
    [['border-radius', '50px']],
    ['borderRadius']
  )
  expect(actualStyles).toEqual({ borderRadius: 50 })
})

it('throws useful errors', () => {
  expect(() => transformCss([['margin', '10']])).toThrow(
    'Failed to parse declaration "margin: 10"'
  )
})
