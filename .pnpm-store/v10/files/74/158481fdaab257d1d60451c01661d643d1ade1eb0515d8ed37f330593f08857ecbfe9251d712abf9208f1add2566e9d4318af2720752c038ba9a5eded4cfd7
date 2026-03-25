// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

const importHooks = [] // TODO should this be a Set?
const setters = new WeakMap()
const getters = new WeakMap()
const specifiers = new Map()
const toHook = []

const proxyHandler = {
  set (target, name, value) {
    return setters.get(target)[name](value)
  },

  get (target, name) {
    if (name === Symbol.toStringTag) {
      return 'Module'
    }

    const getter = getters.get(target)[name]

    if (typeof getter === 'function') {
      return getter()
    }
  },

  defineProperty (target, property, descriptor) {
    if ((!('value' in descriptor))) {
      throw new Error('Getters/setters are not supported for exports property descriptors.')
    }

    return setters.get(target)[property](descriptor.value)
  }
}

function register (name, namespace, set, get, specifier) {
  specifiers.set(name, specifier)
  setters.set(namespace, set)
  getters.set(namespace, get)
  const proxy = new Proxy(namespace, proxyHandler)
  importHooks.forEach(hook => hook(name, proxy))
  toHook.push([name, proxy])
}

let experimentalPatchInternals = false

function getExperimentalPatchInternals () {
  return experimentalPatchInternals
}

function setExperimentalPatchInternals (value) {
  experimentalPatchInternals = value
}

exports.register = register
exports.importHooks = importHooks
exports.specifiers = specifiers
exports.toHook = toHook
exports.getExperimentalPatchInternals = getExperimentalPatchInternals
exports.setExperimentalPatchInternals = setExperimentalPatchInternals
