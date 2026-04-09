import { composeParslet } from './Parslet'
import { Precedence } from '../Precedence'
import { UnexpectedTypeError } from '../errors'
import type { FunctionResult } from '../result/RootResult'
import type { TypeParameterResult } from '../result/NonRootResult'

export const genericArrowFunctionParslet = composeParslet({
  name: 'genericArrowFunctionParslet',
  accept: type => type === '<',
  parsePrefix: (parser) => {
    const typeParameters: TypeParameterResult[] = []
    parser.consume('<')

    do {
      let defaultValue
      let name = parser.parseIntermediateType(Precedence.SYMBOL)
      if (name.type === 'JsdocTypeOptional') {
        name = name.element
        defaultValue = parser.parseType(Precedence.SYMBOL)
      }
      if (name.type !== 'JsdocTypeName') {
        throw new UnexpectedTypeError(name)
      }
      let constraint
      if (parser.consume('extends')) {
        constraint = parser.parseType(Precedence.SYMBOL)
        // Got an equal sign
        if (constraint.type === 'JsdocTypeOptional') {
          constraint = constraint.element
          defaultValue = parser.parseType(Precedence.SYMBOL)
        }
      }

      const typeParameter: TypeParameterResult = {
        type: 'JsdocTypeTypeParameter',
        name
      }

      if (constraint !== undefined) {
        typeParameter.constraint = constraint
      }

      if (defaultValue !== undefined) {
        typeParameter.defaultValue = defaultValue
      }

      typeParameters.push(typeParameter)

      if (parser.consume('>')) {
        break
      }
    } while (parser.consume(','))

    const functionBase = parser.parseIntermediateType(Precedence.SYMBOL) as FunctionResult
    functionBase.typeParameters = typeParameters

    return functionBase
  }
})
