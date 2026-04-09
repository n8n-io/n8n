import { composeParslet } from './Parslet'
import { Precedence } from '../Precedence'
import { assertArrayOrTupleResult } from '../assertTypes'

export const readonlyArrayParslet = composeParslet({
  name: 'readonlyArrayParslet',
  accept: type => type === 'readonly',
  parsePrefix: parser => {
    parser.consume('readonly')
    return {
      type: 'JsdocTypeReadonlyArray',
      element: assertArrayOrTupleResult(parser.parseIntermediateType(Precedence.ALL))
    }
  }
})
