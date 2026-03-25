#!/usr/bin/env node
import * as fs from 'fs'
import * as object from '../object.js'
import * as env from '../environment.js'

const script = env.getParam('--script', './test.js')
const includeDeps = env.getParam('--include-dependencies', '').split(',').filter(d => d.length)
const customImportsPath = env.getParam('--custom-imports', '')

/**
 * @type {Object<string,string>}
 */
const exports = {}
/**
 * @type {Object<string,Object<string,string>>}
 */
const scopes = {}

/**
 * @param {any} v
 * @param {string} k
 * @param {string} pkgName
 * @param {string} pathPrefix
 * @param {Object<string,string>} importMap
 */
const extractModMap = (v, k, pkgName, pathPrefix, importMap) => {
  if (k[0] !== '.') return
  if (typeof v === 'object') {
    extractModMap(v.browser || v.import || v.module || v.default, k, pkgName, pathPrefix, importMap)
  } else if (v && v[0] === '.') {
    importMap[pkgName + k.slice(1)] = pathPrefix + v.slice(1)
  }
}

/**
 * @param {string} s
 */
const _maybeAddRelPrefix = s => (s[0] !== '.' ? './' : '') + s

/**
 * @param {any} pkgJson
 * @param {string} pathPrefix
 * @param {Object<string,string>} importMap
 */
const readPkg = (pkgJson, pathPrefix, importMap) => {
  if (pkgJson.exports == null && pkgJson.main != null) {
    importMap[pkgJson.name] = pathPrefix + _maybeAddRelPrefix(pkgJson.main).slice(1)
  }
  object.forEach(pkgJson.exports, (v, k) => extractModMap(v, k, pkgJson.name, pathPrefix, importMap))
  object.forEach(pkgJson.dependencies, (_v, depName) => {
    const nextImportMap = pathPrefix === '.' ? exports : (scopes[pathPrefix + '/'] || (scopes[pathPrefix + '/'] = {}))
    const prefix = `./node_modules/${depName}`
    const depPkgJson = JSON.parse(fs.readFileSync(prefix + '/package.json', { encoding: 'utf8' }))
    readPkg(depPkgJson, prefix, nextImportMap)
  })
}

const rootPkgJson = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf8' }))
readPkg(rootPkgJson, '.', exports)
includeDeps.forEach(depName => {
  const prefix = `./node_modules/${depName}`
  const depPkgJson = JSON.parse(fs.readFileSync(`${prefix}/package.json`, { encoding: 'utf8' }))
  readPkg(depPkgJson, prefix, exports)
})

const customImports = {}
if (customImportsPath !== '') {
  object.assign(customImports, JSON.parse(fs.readFileSync(customImportsPath, { encoding: 'utf8' })))
}

const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Testing ${rootPkgJson.name}</title>
  <script type="importmap">
    {
      "imports": ${JSON.stringify(object.assign({}, exports, customImports), null, 2)},
      "scopes": ${JSON.stringify(scopes, null, 2)}
    }
  </script>
</head>
<body>
  <script type="module" src="${script}"></script>
</body>
</html>
`

console.log(testHtml)
