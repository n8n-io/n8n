const fs = require('fs')
const path = require('path')

const dir = path.resolve(__dirname, '..', 'lib')

function loadModule(name) {
  try {
    return require(name)
  } catch (e) {
    return undefined
  }
}

function copy(name, version, vue) {
  vue = vue || 'vue'
  const src = path.join(dir, `v${version}`, name)
  const dest = path.join(dir, name)
  let content = fs.readFileSync(src, 'utf-8')
  content = content.replace(/'vue'/g, `'${vue}'`)
  // unlink for pnpm, #92
  try {
    fs.unlinkSync(dest)
  } catch (error) { }
  fs.writeFileSync(dest, content, 'utf-8')
}

function updateVue2API() {
  const ignoreList = ['version', 'default']
  const VCA = loadModule('@vue/composition-api')
  if (!VCA) {
    console.warn('[vue-demi] Composition API plugin is not found. Please run "npm install @vue/composition-api" to install.')
    return
  }

  const exports = Object.keys(VCA).filter(i => !ignoreList.includes(i))

  const esmPath = path.join(dir, 'index.mjs')
  let content = fs.readFileSync(esmPath, 'utf-8')

  content = content.replace(
    /\/\*\*VCA-EXPORTS\*\*\/[\s\S]+\/\*\*VCA-EXPORTS\*\*\//m,
`/**VCA-EXPORTS**/
export { ${exports.join(', ')} } from '@vue/composition-api/dist/vue-composition-api.mjs'
/**VCA-EXPORTS**/`
    )

  fs.writeFileSync(esmPath, content, 'utf-8')
  
}

function switchVersion(version, vue) {
  copy('index.cjs', version, vue)
  copy('index.mjs', version, vue)
  copy('index.d.ts', version, vue)

  if (version === 2)
    updateVue2API()
}


module.exports.loadModule = loadModule
module.exports.switchVersion = switchVersion
