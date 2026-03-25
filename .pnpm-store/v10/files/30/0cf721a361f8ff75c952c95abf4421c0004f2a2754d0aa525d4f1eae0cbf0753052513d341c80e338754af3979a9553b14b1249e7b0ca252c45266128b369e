import { parseShadow } from './util'

export default tokenStream => {
  const { offset, radius, color } = parseShadow(tokenStream)
  return {
    textShadowOffset: offset,
    textShadowRadius: radius,
    textShadowColor: color,
  }
}
