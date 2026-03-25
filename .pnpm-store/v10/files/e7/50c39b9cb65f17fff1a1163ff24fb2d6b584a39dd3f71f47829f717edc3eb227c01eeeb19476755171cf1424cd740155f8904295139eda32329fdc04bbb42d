// @flow
function constructGradientValue(literals: Array<string>, ...substitutions: Array<string>): string {
  let template = ''
  for (let i = 0; i < literals.length; i += 1) {
    template += literals[i]
    if (i === substitutions.length - 1 && substitutions[i]) {
      const definedValues = substitutions.filter(substitute => !!substitute)
      // Adds leading coma if properties preceed color-stops
      if (definedValues.length > 1) {
        template = template.slice(0, -1)
        template += `, ${substitutions[i]}`
        // No trailing space if color-stops is the only param provided
      } else if (definedValues.length === 1) {
        template += `${substitutions[i]}`
      }
    } else if (substitutions[i]) {
      template += `${substitutions[i]} `
    }
  }
  return template.trim()
}

export default constructGradientValue
