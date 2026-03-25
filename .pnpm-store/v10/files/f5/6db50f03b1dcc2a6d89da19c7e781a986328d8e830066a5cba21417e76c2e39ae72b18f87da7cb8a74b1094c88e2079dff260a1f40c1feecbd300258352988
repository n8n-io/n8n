var Vue = require('vue')
var VueCompositionAPI = require('@vue/composition-api')

function install(_vue) {
  var vueLib = _vue || Vue
  if (vueLib && 'default' in vueLib) {
    vueLib = vueLib.default
  }

  if (vueLib && !vueLib['__composition_api_installed__']) {
    if (VueCompositionAPI && 'default' in VueCompositionAPI)
      vueLib.use(VueCompositionAPI.default)
    else if (VueCompositionAPI)
      vueLib.use(VueCompositionAPI)
  }
}

install(Vue)

Object.keys(VueCompositionAPI).forEach(function(key) {
  exports[key] = VueCompositionAPI[key]
})

exports.Vue = Vue
exports.Vue2 = Vue
exports.isVue2 = true
exports.isVue3 = false
exports.install = install
exports.version = Vue.version

// Not implemented https://github.com/vuejs/core/pull/8111, falls back to getCurrentInstance()
exports.hasInjectionContext = function () {
  return !!VueCompositionAPI.getCurrentInstance()
}
