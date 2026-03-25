import Vue from 'vue'
import { getCurrentInstance } from 'vue'

var isVue2 = true
var isVue3 = false
var Vue2 = Vue
var warn = Vue.util.warn

function install() {}

// createApp polyfill
export function createApp(rootComponent, rootProps) {
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

export {
  Vue,
  Vue2,
  isVue2,
  isVue3,
  install,
  warn
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

export * from 'vue'

// Not implemented https://github.com/vuejs/core/pull/8111, falls back to getCurrentInstance()
export function hasInjectionContext() {
  return !!getCurrentInstance()
}
