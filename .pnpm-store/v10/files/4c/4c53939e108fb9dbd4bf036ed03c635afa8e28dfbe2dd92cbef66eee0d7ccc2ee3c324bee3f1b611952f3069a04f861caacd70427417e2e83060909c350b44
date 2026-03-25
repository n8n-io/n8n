const path = require('path')

class ArrayToTree {
  constructor (arr) {
    this.arr = arr
  }

  run () {
    const tree = {}

    for (let i = 0; i < this.arr.length; i++) {
      const normalizedPath = path.normalize(this.arr[i]) // normalize any strange paths
      const parts = normalizedPath.split(path.sep) // use the platform-specific path segment separator
      let current = tree

      for (let j = 0; j < parts.length; j++) {
        const part = parts[j]
        current[part] = current[part] || {}
        current = current[part]
      }
    }

    return tree
  }
}

module.exports = ArrayToTree
