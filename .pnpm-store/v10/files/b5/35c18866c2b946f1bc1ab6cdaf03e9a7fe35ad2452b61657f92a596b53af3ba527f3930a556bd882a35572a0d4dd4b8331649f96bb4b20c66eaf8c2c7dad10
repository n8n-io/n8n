import transformCss from '..'

// List of units from:
// https://developer.mozilla.org/en-US/docs/Web/CSS/length
const lengthUnits = [
  'ch',
  'em',
  'ex',
  'rem',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'cm',
  'mm',
  'in',
  'pc',
  'pt',
]

lengthUnits.forEach(unit => {
  const value = `2${unit}`

  it('allows CSS length units in transformed values', () => {
    expect(transformCss([['margin', value]])).toEqual({
      marginTop: value,
      marginRight: value,
      marginBottom: value,
      marginLeft: value,
    })
    expect(transformCss([['padding', value]])).toEqual({
      paddingTop: value,
      paddingRight: value,
      paddingBottom: value,
      paddingLeft: value,
    })
  })

  it('allows CSS length units with 0 and unit', () => {
    expect(transformCss([['padding', `0${unit}`]])).toEqual({
      paddingTop: `0${unit}`,
      paddingRight: `0${unit}`,
      paddingBottom: `0${unit}`,
      paddingLeft: `0${unit}`,
    })
  })

  it('allows mixed units in transformed values', () => {
    expect(transformCss([['margin', `10px ${value}`]])).toEqual({
      marginTop: 10,
      marginRight: value,
      marginBottom: 10,
      marginLeft: value,
    })
  })

  it('allows units to be used with border shorthand property', () => {
    expect(transformCss([['border', `#f00 ${value} dashed`]])).toEqual({
      borderWidth: value,
      borderColor: '#f00',
      borderStyle: 'dashed',
    })

    expect(transformCss([['border', value]])).toEqual({
      borderWidth: value,
      borderColor: 'black',
      borderStyle: 'solid',
    })
  })

  it('allows units to be used with border-width', () => {
    expect(transformCss([['border-width', `1px 2px ${value} 4px`]])).toEqual({
      borderTopWidth: 1,
      borderRightWidth: 2,
      borderBottomWidth: value,
      borderLeftWidth: 4,
    })
  })

  it('allows units to be used with border-radius', () => {
    expect(transformCss([['border-radius', `1px ${value} 3px 4px`]])).toEqual({
      borderTopLeftRadius: 1,
      borderTopRightRadius: value,
      borderBottomRightRadius: 3,
      borderBottomLeftRadius: 4,
    })
  })

  it('allows units to be used with font-size', () => {
    expect(transformCss([['font-size', value]])).toEqual({
      fontSize: value,
    })
  })

  it('allows units to be used with font shorthand property', () => {
    expect(
      transformCss([['font', `bold italic ${value}/${value} "Helvetica"`]])
    ).toEqual({
      fontFamily: 'Helvetica',
      fontSize: value,
      fontWeight: 'bold',
      fontStyle: 'italic',
      fontVariant: [],
      lineHeight: value,
    })
  })

  it('allows untis to be used with text-shadow ', () => {
    expect(transformCss([['text-shadow', `10px ${value} red`]])).toEqual({
      textShadowOffset: { width: 10, height: value },
      textShadowRadius: 0,
      textShadowColor: 'red',
    })
  })

  it('allows untis to be used with box-shadow', () => {
    expect(
      transformCss([['box-shadow', `10px ${value} ${value} red`]])
    ).toEqual({
      shadowOffset: { width: 10, height: value },
      shadowRadius: value,
      shadowColor: 'red',
      shadowOpacity: 1,
    })
  })
})

it('throws for unit that is not supported', () => {
  expect(() => transformCss([['margin', '10ic']])).toThrow(
    'Failed to parse declaration "margin: 10ic"'
  )
})
