import postcss from 'postcss'
import postcssNested from 'postcss-nested'
import postcssJs from 'postcss-js'

export default function parseObjectStyles(styles) {
  if (!Array.isArray(styles)) {
    return parseObjectStyles([styles])
  }

  return styles.flatMap((style) => {
    return postcss([
      postcssNested({
        bubble: ['screen'],
      }),
    ]).process(style, {
      parser: postcssJs,
    }).root.nodes
  })
}
