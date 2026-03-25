let Stringifier = require('postcss/lib/stringifier')

class ScssStringifier extends Stringifier {
  comment(node) {
    let left = this.raw(node, 'left', 'commentLeft')
    let right = this.raw(node, 'right', 'commentRight')

    if (node.raws.inline) {
      let text = node.raws.text || node.text
      this.builder('//' + left + text + right, node)
    } else {
      this.builder('/*' + left + node.text + right + '*/', node)
    }
  }

  decl(node, semicolon) {
    if (!node.isNested) {
      super.decl(node, semicolon)
    } else {
      let between = this.raw(node, 'between', 'colon')
      let string = node.prop + between + this.rawValue(node, 'value')
      if (node.important) {
        string += node.raws.important || ' !important'
      }

      this.builder(string + '{', node, 'start')

      let after
      if (node.nodes && node.nodes.length) {
        this.body(node)
        after = this.raw(node, 'after')
      } else {
        after = this.raw(node, 'after', 'emptyBody')
      }
      if (after) this.builder(after)
      this.builder('}', node, 'end')
    }
  }

  rawValue(node, prop) {
    let value = node[prop]
    let raw = node.raws[prop]
    if (raw && raw.value === value) {
      return raw.scss ? raw.scss : raw.raw
    } else {
      return value
    }
  }
}

module.exports = ScssStringifier
