var VueModule = require('vue')

// get the real Vue https://github.com/vueuse/vue-demi/issues/192
var Vue = VueModule.default || VueModule

exports.Vue = Vue
exports.Vue2 = Vue
exports.isVue2 = true
exports.isVue3 = false
exports.install = function () {}
exports.warn = Vue.util.warn

// createApp polyfill
exports.createApp = function (rootComponent, rootProps) {
  var vm
  var provide = {}
  var app = {
    config: Vue.config,
    use: Vue.use.bind(Vue),
    mixin: Vue.mixin.bind(Vue),
    component: Vue.component.bind(Vue),
    provide: function (key, value) {
      provide[key] = value
      return this
    },
    directive: function (name, dir) {
      if (dir) {
        Vue.directive(name, dir)
        return app
      } else {
        return Vue.directive(name)
      }
    },
    mount: function (el, hydrating) {
      if (!vm) {
        vm = new Vue(Object.assign({ propsData: rootProps }, rootComponent, { provide: Object.assign(provide, rootComponent.provide) }))
        vm.$mount(el, hydrating)
        return vm
      } else {
        return vm
      }
    },
    unmount: function () {
      if (vm) {
        vm.$destroy()
        vm = undefined
      }
    },
  }
  return app
}

Object.keys(VueModule).forEach(function (key) {
  exports[key] = VueModule[key]
})

// Not implemented https://github.com/vuejs/core/pull/8111, falls back to getCurrentInstance()
exports.hasInjectionContext = function() {
  return !!VueModule.getCurrentInstance()
}