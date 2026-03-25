import { h, Fragment } from 'vue'

function jsx(type, props, key) {
  const { children } = props
  delete props.children
  if (arguments.length > 2) {
    props.key = key
  }
  return h(type, props, children)
}

export { Fragment, jsx, jsx as jsxs, jsx as jsxDEV }
