const { switchVersion, loadModule } = require('./utils')

const Vue = loadModule('vue')

if (!Vue || typeof Vue.version !== 'string') {
  console.warn('[vue-demi] Vue is not found. Please run "npm install vue" to install.')
}
else if (Vue.version.startsWith('2.7.')) {
  switchVersion(2.7)
}
else if (Vue.version.startsWith('2.')) {
  switchVersion(2)
}
else if (Vue.version.startsWith('3.')) {
  switchVersion(3)
}
else {
  console.warn(`[vue-demi] Vue version v${Vue.version} is not supported.`)
}
