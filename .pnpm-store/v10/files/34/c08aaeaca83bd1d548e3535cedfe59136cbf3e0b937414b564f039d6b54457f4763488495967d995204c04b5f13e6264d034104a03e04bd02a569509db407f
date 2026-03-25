import Vue from 'vue'
import VueCompositionAPI, { getCurrentInstance } from '@vue/composition-api/dist/vue-composition-api.mjs'

function install(_vue) {
  _vue = _vue || Vue
  if (_vue && !_vue['__composition_api_installed__'])
    _vue.use(VueCompositionAPI)
}

install(Vue)

var isVue2 = true
var isVue3 = false
var Vue2 = Vue
var version = Vue.version

/**VCA-EXPORTS**/
export * from '@vue/composition-api/dist/vue-composition-api.mjs'
/**VCA-EXPORTS**/

export {
  Vue,
  Vue2,
  isVue2,
  isVue3,
  version,
  install,
}


// Vue 3 components mock
function createMockComponent(name) {
  return {
    setup() {
      throw new Error('[vue-demi] ' + name + ' is not supported in Vue 2. It\'s provided to avoid compiler errors.')
    }
  }
}
export var Fragment = /*#__PURE__*/ createMockComponent('Fragment')
export var Transition = /*#__PURE__*/ createMockComponent('Transition')
export var TransitionGroup = /*#__PURE__*/ createMockComponent('TransitionGroup')
export var Teleport = /*#__PURE__*/ createMockComponent('Teleport')
export var Suspense = /*#__PURE__*/ createMockComponent('Suspense')
export var KeepAlive = /*#__PURE__*/ createMockComponent('KeepAlive')

// Not implemented https://github.com/vuejs/core/pull/8111, falls back to getCurrentInstance()
export function hasInjectionContext() {
  return !!getCurrentInstance()
}
