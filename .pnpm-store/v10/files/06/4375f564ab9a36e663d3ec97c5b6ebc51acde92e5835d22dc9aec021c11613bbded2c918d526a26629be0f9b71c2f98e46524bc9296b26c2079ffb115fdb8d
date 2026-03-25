import { parseShadow } from './util'

export default tokenStream => {
  const { offset, radius, color } = parseShadow(tokenStream)
  return {
    shadowOffset: offset,
    shadowRadius: radius,
    shadowColor: color,
    shadowOpacity: 1,
  }
}
