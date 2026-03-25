let { Comment } = require('postcss')
let Parser = require('postcss/lib/parser')

let NestedDeclaration = require('./nested-declaration')
let scssTokenizer = require('./scss-tokenize')

class ScssParser extends Parser {
  atrule(token) {
    let name = token[1]
    let prev = token
    while (!this.tokenizer.endOfFile()) {
      let next = this.tokenizer.nextToken()
      if (next[0] === 'word' && next[2] === prev[3] + 1) {
        name += next[1]
        prev = next
      } else {
        this.tokenizer.back(next)
        break
      }
    }

    super.atrule(['at-word', name, token[2], prev[3]])
  }

  comment(token) {
    if (token[4] === 'inline') {
      let node = new Comment()
      this.init(node, token[2])
      node.raws.inline = true
      let pos = this.input.fromOffset(token[3])
      node.source.end = {
        column: pos.col,
        line: pos.line,
        offset: token[3] + 1
      }

      let text = token[1].slice(2)
      if (/^\s*$/.test(text)) {
        node.text = ''
        node.raws.left = text
        node.raws.right = ''
      } else {
        let match = text.match(/^(\s*)([^]*\S)(\s*)$/)
        let fixed = match[2].replace(/(\*\/|\/\*)/g, '*//*')
        node.text = fixed
        node.raws.left = match[1]
        node.raws.right = match[3]
        node.raws.text = match[2]
      }
    } else {
      super.comment(token)
    }
  }

  createTokenizer() {
    this.tokenizer = scssTokenizer(this.input)
  }

  raw(node, prop, tokens, customProperty) {
    super.raw(node, prop, tokens, customProperty)
    if (node.raws[prop]) {
      let scss = node.raws[prop].raw
      node.raws[prop].raw = tokens.reduce((all, i) => {
        if (i[0] === 'comment' && i[4] === 'inline') {
          let text = i[1].slice(2).replace(/(\*\/|\/\*)/g, '*//*')
          return all + '/*' + text + '*/'
        } else {
          return all + i[1]
        }
      }, '')
      if (scss !== node.raws[prop].raw) {
        node.raws[prop].scss = scss
      }
    }
  }

  rule(tokens) {
    let withColon = false
    let brackets = 0
    let value = ''
    for (let i of tokens) {
      if (withColon) {
        if (i[0] !== 'comment' && i[0] !== '{') {
          value += i[1]
        }
      } else if (i[0] === 'space' && i[1].includes('\n')) {
        break
      } else if (i[0] === '(') {
        brackets += 1
      } else if (i[0] === ')') {
        brackets -= 1
      } else if (brackets === 0 && i[0] === ':') {
        withColon = true
      }
    }

    if (!withColon || value.trim() === '' || /^[#:A-Za-z-]/.test(value)) {
      super.rule(tokens)
    } else {
      tokens.pop()
      let node = new NestedDeclaration()
      this.init(node, tokens[0][2])

      let last
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i][0] !== 'space') {
          last = tokens[i]
          break
        }
      }
      if (last[3]) {
        let pos = this.input.fromOffset(last[3])
        node.source.end = {
          column: pos.col,
          line: pos.line,
          offset: last[3] + 1
        }
      } else {
        let pos = this.input.fromOffset(last[2])
        node.source.end = {
          column: pos.col,
          line: pos.line,
          offset: last[2] + 1
        }
      }

      while (tokens[0][0] !== 'word') {
        node.raws.before += tokens.shift()[1]
      }

      if (tokens[0][2]) {
        let pos = this.input.fromOffset(tokens[0][2])
        node.source.start = {
          column: pos.col,
          line: pos.line,
          offset: tokens[0][2]
        }
      }

      node.prop = ''
      while (tokens.length) {
        let type = tokens[0][0]
        if (type === ':' || type === 'space' || type === 'comment') {
          break
        }
        node.prop += tokens.shift()[1]
      }

      node.raws.between = ''

      let token
      while (tokens.length) {
        token = tokens.shift()

        if (token[0] === ':') {
          node.raws.between += token[1]
          break
        } else {
          node.raws.between += token[1]
        }
      }

      if (node.prop[0] === '_' || node.prop[0] === '*') {
        node.raws.before += node.prop[0]
        node.prop = node.prop.slice(1)
      }
      node.raws.between += this.spacesAndCommentsFromStart(tokens)
      this.precheckMissedSemicolon(tokens)

      for (let i = tokens.length - 1; i > 0; i--) {
        token = tokens[i]
        if (token[1] === '!important') {
          node.important = true
          let string = this.stringFrom(tokens, i)
          string = this.spacesFromEnd(tokens) + string
          if (string !== ' !important') {
            node.raws.important = string
          }
          break
        } else if (token[1] === 'important') {
          let cache = tokens.slice(0)
          let str = ''
          for (let j = i; j > 0; j--) {
            let type = cache[j][0]
            if (str.trim().indexOf('!') === 0 && type !== 'space') {
              break
            }
            str = cache.pop()[1] + str
          }
          if (str.trim().indexOf('!') === 0) {
            node.important = true
            node.raws.important = str
            tokens = cache
          }
        }

        if (token[0] !== 'space' && token[0] !== 'comment') {
          break
        }
      }

      this.raw(node, 'value', tokens)

      if (node.value.includes(':')) {
        this.checkMissedSemicolon(tokens)
      }

      this.current = node
    }
  }
}

module.exports = ScssParser
