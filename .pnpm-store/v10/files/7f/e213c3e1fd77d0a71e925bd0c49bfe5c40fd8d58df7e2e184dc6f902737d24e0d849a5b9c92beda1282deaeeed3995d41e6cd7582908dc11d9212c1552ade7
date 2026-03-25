const SYMBOL_MATCH = 'SYMBOL_MATCH'

export default class TokenStream {
  constructor(nodes, parent) {
    this.index = 0
    this.nodes = nodes
    this.functionName = parent != null ? parent.value : null
    this.lastValue = null
    this.rewindIndex = -1
  }

  hasTokens() {
    return this.index <= this.nodes.length - 1
  }

  [SYMBOL_MATCH](...tokenDescriptors) {
    if (!this.hasTokens()) return null

    const node = this.nodes[this.index]

    for (let i = 0; i < tokenDescriptors.length; i += 1) {
      const tokenDescriptor = tokenDescriptors[i]
      const value = tokenDescriptor(node)
      if (value !== null) {
        this.index += 1
        this.lastValue = value
        return value
      }
    }

    return null
  }

  matches(...tokenDescriptors) {
    return this[SYMBOL_MATCH](...tokenDescriptors) !== null
  }

  expect(...tokenDescriptors) {
    const value = this[SYMBOL_MATCH](...tokenDescriptors)
    return value !== null ? value : this.throw()
  }

  matchesFunction() {
    const node = this.nodes[this.index]
    if (node.type !== 'function') return null
    const value = new TokenStream(node.nodes, node)
    this.index += 1
    this.lastValue = null
    return value
  }

  expectFunction() {
    const value = this.matchesFunction()
    return value !== null ? value : this.throw()
  }

  expectEmpty() {
    if (this.hasTokens()) this.throw()
  }

  throw() {
    throw new Error(`Unexpected token type: ${this.nodes[this.index].type}`)
  }

  saveRewindPoint() {
    this.rewindIndex = this.index
  }

  rewind() {
    if (this.rewindIndex === -1) throw new Error('Internal error')
    this.index = this.rewindIndex
    this.lastValue = null
  }
}
