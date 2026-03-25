import * as iitm from '../../hook.mjs'
import * as tsNode from 'ts-node/esm.mjs'

const makeNext = (loader, fnName, parentResolveOrLoad) => {
  return (specifierOrUrl, context) => {
    return loader[fnName](specifierOrUrl, context, parentResolveOrLoad)
  }
}

export async function resolve (specifier, context, defaultResolve) {
  const next = makeNext(tsNode, 'resolve', defaultResolve)
  return iitm.resolve(specifier, context, next)
}

export async function load (url, context, defaultLoad) {
  const next = makeNext(tsNode, 'load', defaultLoad)
  return iitm.load(url, context, next)
}
