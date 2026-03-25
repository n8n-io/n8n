const fs = require('fs').promises
const { compileTemplate } = require('vue/compiler-sfc')
const { optimize: optimizeSvg } = require('svgo')

module.exports = function svgLoader (options = {}) {
  const { svgoConfig, svgo, defaultImport } = options

  const svgRegex = /\.svg(\?(raw|component|skipsvgo))?$/

  return {
    name: 'svg-loader',
    enforce: 'pre',

    async load (id) {
      if (!id.match(svgRegex)) {
        return
      }

      const [path, query] = id.split('?', 2)

      const importType = query || defaultImport

      if (importType === 'url') {
        return // Use default svg loader
      }

      let svg

      try {
        svg = await fs.readFile(path, 'utf-8')
      } catch (ex) {
        console.warn('\n', `${id} couldn't be loaded by vite-svg-loader, fallback to default loader`)
        return
      }

      if (importType === 'raw') {
        return `export default ${JSON.stringify(svg)}`
      }

      if (svgo !== false && query !== 'skipsvgo') {
        svg = optimizeSvg(svg, {
          ...svgoConfig,
          path
        }).data
      }

      // To prevent compileTemplate from removing the style tag
      svg = svg.replace(/<style/g, '<component is="style"').replace(/<\/style/g, '</component')

      const { code } = compileTemplate({
        id: JSON.stringify(id),
        source: svg,
        filename: path,
        transformAssetUrls: false
      })

      return `${code}\nexport default { render: render }`
    }
  }
}

module.exports.default = module.exports
