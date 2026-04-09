import { composeParslet } from './Parslet'
import { Precedence } from '../Precedence'

export const typeOfParslet = composeParslet({
  name: 'typeOfParslet',
  accept: type => type === 'typeof',
  parsePrefix: parser => {
    parser.consume('typeof')
    return {
      type: 'JsdocTypeTypeof',
      element: parser.parseType(Precedence.KEY_OF_TYPE_OF)
    }
  }
})
