import { NUMBER, SLASH } from '../tokenTypes'

export default tokenStream => {
  let aspectRatio = tokenStream.expect(NUMBER)

  if (tokenStream.hasTokens()) {
    tokenStream.expect(SLASH)
    aspectRatio /= tokenStream.expect(NUMBER)
  }

  return { aspectRatio }
}
