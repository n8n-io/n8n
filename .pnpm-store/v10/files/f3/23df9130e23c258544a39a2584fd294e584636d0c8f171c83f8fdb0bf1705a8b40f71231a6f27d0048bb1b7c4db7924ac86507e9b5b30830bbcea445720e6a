#!/usr/bin/env node
// @ts-ignore
import jsdoc from 'jsdoc-api'
import * as fs from 'fs'

const firstTagContentRegex = /<\w>([^<]+)<\/\w>([^]*)/
const jsdocReturnRegex = /\* @return {(.*)}/
const jsdocTypeRegex = /\* @type {(.*)}/

const files = fs.readdirSync('./').filter(file => /(?<!(test|config))\.js$/.test(file))

const _ltregex = /</g
const _rtregex = />/g
/**
 * @param {string} s
 */
const toSafeHtml = s => s.replace(_ltregex, '&lt;').replace(_rtregex, '&gt;')

const READMEcontent = fs.readFileSync('./README.md', 'utf8')

jsdoc.explain({
  files,
  configure: '.jsdoc.json'
}).then(/** @param {Array<any>} json */ json => {
  const strBuilder = []
  /**
   * @type {Object<string, { items: Array<any>, name: string, description: string }>}
   */
  const modules = {}
  json.forEach(item => {
    if (item.meta && item.meta.filename) {
      const mod = modules[item.meta.filename] || (modules[item.meta.filename] = { items: [], name: item.meta.filename.slice(0, -3), description: '' })
      if (item.kind === 'module') {
        mod.name = item.name
        mod.description = item.description || ''
      } else {
        mod.items.push(item)
      }
    }
  })
  /**
   * @type {Object<string,string>}
   */
  const classDescriptions = {}
  for (const fileName in modules) {
    const mod = modules[fileName]
    const items = mod.items
    const desc = firstTagContentRegex.exec(mod.description)
    const descHead = desc ? desc[1] : ''
    const descRest = desc ? desc[2] : ''
    strBuilder.push(`<details><summary><b>[lib0/${mod.name}]</b> ${descHead}</summary>`)
    strBuilder.push(`<pre>import * as ${mod.name} from 'lib0/${fileName.slice(0, -3)}'</pre>`)
    if (descRest.length > 0) {
      strBuilder.push(descRest)
    }
    strBuilder.push('<dl>')
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.ignore && item.scope !== 'inner' && item.name[0] !== '_' && item.longname.indexOf('~') < 0) {
        // strBuilder.push(JSON.stringify(item)) // output json for debugging
        switch (item.kind) {
          case 'class': {
            if (item.params == null) {
              classDescriptions[item.longname] = item.classdesc
              break
            }
          }
          // eslint-disable-next-line
          case 'constant': {
            if (item.params == null && item.returns == null) {
              const typeEval = jsdocTypeRegex.exec(item.comment)
              strBuilder.push(`<b><code>${item.longname.slice(7)}${typeEval ? (': ' + toSafeHtml(typeEval[1])) : ''}</code></b><br>`)
              if (item.description) {
                strBuilder.push(`<dd>${item.description}</dd>`)
              }
              break
            }
          }
          // eslint-disable-next-line
          case 'function': {
            /**
             * @param {string} name
             */
            const getOriginalParamTypeDecl = name => {
              const regval = new RegExp('@param {(.*)} \\[?' + name + '\\]?[^\\w]*').exec(item.comment)
              return regval ? regval[1] : null
            }
            if (item.params == null && item.returns == null) {
              break
            }
            const paramVal = (item.params || []).map(/** @param {any} ret */ ret => `${ret.name}: ${getOriginalParamTypeDecl(ret.name) || ret.type.names.join('|')}`).join(', ')
            const evalReturnRegex = jsdocReturnRegex.exec(item.comment)
            const returnVal = evalReturnRegex ? `: ${evalReturnRegex[1]}` : (item.returns ? item.returns.map(/** @param {any} r */ r => r.type.names.join('|')).join('|') : '')
            strBuilder.push(`<b><code>${item.kind === 'class' ? 'new ' : ''}${item.longname.slice(7)}(${toSafeHtml(paramVal)})${toSafeHtml(returnVal)}</code></b><br>`)
            const desc = item.description || item.classdesc || classDescriptions[item.longname] || null
            if (desc) {
              strBuilder.push(`<dd>${desc}</dd>`)
            }
            break
          }
          case 'member': {
            if (item.type) {
              strBuilder.push(`<b><code>${item.longname.slice(7)}: ${toSafeHtml(/** @type {RegExpExecArray} */ (jsdocTypeRegex.exec(item.comment))[1])}</code></b><br>`)
              if (item.description) {
                strBuilder.push(`<dd>${item.description}</dd>`)
              }
            }
          }
        }
      }
    }
    strBuilder.push('</dl>')
    strBuilder.push('</details>')
  }
  const replaceReadme = READMEcontent.replace(/<details>[^]*<\/details>/, strBuilder.join('\n'))
  fs.writeFileSync('./README.md', replaceReadme)
})
