const { switchVersion } = require('./utils')

const version = process.argv[2]
const vueEntry = process.argv[3] || 'vue'

if (version === '2.7') {
  switchVersion(2.7, vueEntry)
  console.log(`[vue-demi] Switched for Vue 2.7 (entry: "${vueEntry}")`)
} else if (version === '2') {
  switchVersion(2, vueEntry)
  console.log(`[vue-demi] Switched for Vue 2 (entry: "${vueEntry}")`)
} else if (version === '3') {
  switchVersion(3, vueEntry)
  console.log(`[vue-demi] Switched for Vue 3 (entry: "${vueEntry}")`)
} else {
  console.warn(`[vue-demi] expecting version "2" or "2.7" or "3" but got "${version}"`)
  process.exit(1)
}
