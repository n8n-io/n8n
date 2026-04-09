import { composeParslet } from './Parslet'
import { Precedence } from '../Precedence'
import { UnexpectedTypeError } from '../errors'
import { assertRootResult } from '../assertTypes'

export const assertsParslet = composeParslet({
  name: 'assertsParslet',
  accept: type => type === 'asserts',
  parsePrefix: (parser) => {
    parser.consume('asserts')

    const left = parser.parseIntermediateType(Precedence.SYMBOL)

    if (left.type !== 'JsdocTypeName') {
      throw new UnexpectedTypeError(left, 'A typescript asserts always has to have a name on the left side.')
    }

    if (!parser.consume('is')) {
      return {
        type: 'JsdocTypeAssertsPlain',
        element: left
      }
    }

    return {
      type: 'JsdocTypeAsserts',
      left,
      right: assertRootResult(parser.parseIntermediateType(Precedence.INFIX))
    }
  }
})
