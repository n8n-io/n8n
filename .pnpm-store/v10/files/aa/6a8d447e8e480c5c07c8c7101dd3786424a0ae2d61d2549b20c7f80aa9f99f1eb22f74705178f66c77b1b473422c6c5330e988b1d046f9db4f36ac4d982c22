const { h, Fragment } = require('vue')

function jsx(type, props, key) {
  const { children } = props
  delete props.children
  if (arguments.length > 2) {
    props.key = key
  }
  return h(type, props, children)
}

exports.jsx = jsx
exports.jsxs = jsx
exports.jsxDEV = jsx
exports.Fragment = Fragment
