const fs = require('fs')
const { switchVersion, loadModule } = require('./utils.cjs')

const Vue = loadModule('vue')

if (fs.existsSync('.local'))
  console.log('Currently, it is the local development environment, not doing anything.')

else if (!Vue || typeof Vue.version !== 'string')
  console.warn('[v-code-diff] Vue is not found. Please run "npm install vue" to install.')

else if (Vue.version.startsWith('2.7.'))
  switchVersion('2.7')

else if (Vue.version.startsWith('2.'))
  switchVersion('2')

else if (Vue.version.startsWith('3.'))
  switchVersion('3')

else console.warn(`[v-code-diff] Vue version v${Vue.version} is not suppported.`)
