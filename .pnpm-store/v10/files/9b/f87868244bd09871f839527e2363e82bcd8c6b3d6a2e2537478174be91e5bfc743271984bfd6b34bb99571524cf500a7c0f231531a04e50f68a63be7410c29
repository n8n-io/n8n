// @flow
import memoize from '@emotion/memoize'

declare var codegen: { require: string => RegExp }

const reactPropsRegex = codegen.require('./props')

// https://esbench.com/bench/5bfee68a4cd7e6009ef61d23
const isPropValid = /* #__PURE__ */ memoize(
  prop =>
    reactPropsRegex.test(prop) ||
    (prop.charCodeAt(0) === 111 /* o */ &&
      prop.charCodeAt(1) === 110 /* n */ &&
      prop.charCodeAt(2) < 91) /* Z+1 */
)

export default isPropValid
