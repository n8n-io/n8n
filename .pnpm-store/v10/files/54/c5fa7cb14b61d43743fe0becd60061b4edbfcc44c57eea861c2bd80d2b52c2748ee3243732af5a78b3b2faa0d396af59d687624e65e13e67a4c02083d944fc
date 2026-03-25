let postcss = require('postcss')

let IMPORTANT = /\s*!important\s*$/i

let UNITLESS = {
  'box-flex': true,
  'box-flex-group': true,
  'column-count': true,
  'flex': true,
  'flex-grow': true,
  'flex-positive': true,
  'flex-shrink': true,
  'flex-negative': true,
  'font-weight': true,
  'line-clamp': true,
  'line-height': true,
  'opacity': true,
  'order': true,
  'orphans': true,
  'tab-size': true,
  'widows': true,
  'z-index': true,
  'zoom': true,
  'fill-opacity': true,
  'stroke-dashoffset': true,
  'stroke-opacity': true,
  'stroke-width': true
}

function dashify(str) {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/^ms-/, '-ms-')
    .toLowerCase()
}

function decl(parent, name, value) {
  if (value === false || value === null) return

  if (!name.startsWith('--')) {
    name = dashify(name)
  }

  if (typeof value === 'number') {
    if (value === 0 || UNITLESS[name]) {
      value = value.toString()
    } else {
      value += 'px'
    }
  }

  if (name === 'css-float') name = 'float'

  if (IMPORTANT.test(value)) {
    value = value.replace(IMPORTANT, '')
    parent.push(postcss.decl({ prop: name, value, important: true }))
  } else {
    parent.push(postcss.decl({ prop: name, value }))
  }
}

function atRule(parent, parts, value) {
  let node = postcss.atRule({ name: parts[1], params: parts[3] || '' })
  if (typeof value === 'object') {
    node.nodes = []
    parse(value, node)
  }
  parent.push(node)
}

function parse(obj, parent) {
  let name, value, node
  for (name in obj) {
    value = obj[name]
    if (value === null || typeof value === 'undefined') {
      continue
    } else if (name[0] === '@') {
      let parts = name.match(/@(\S+)(\s+([\W\w]*)\s*)?/)
      if (Array.isArray(value)) {
        for (let i of value) {
          atRule(parent, parts, i)
        }
      } else {
        atRule(parent, parts, value)
      }
    } else if (Array.isArray(value)) {
      for (let i of value) {
        decl(parent, name, i)
      }
    } else if (typeof value === 'object') {
      node = postcss.rule({ selector: name })
      parse(value, node)
      parent.push(node)
    } else {
      decl(parent, name, value)
    }
  }
}

module.exports = function (obj) {
  let root = postcss.root()
  parse(obj, root)
  return root
}
