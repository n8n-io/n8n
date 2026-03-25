import {resolve, dirname} from "path"
import {promises as fs} from "fs"
import {buildParserFile} from "./index.js"

export function lezer(config = {}) {
  let built = Object.create(null)

  return {
    name: "rollup-plugin-lezer",

    resolveId(source, importer) {
      let m = /^([^\0].*\.grammar)(\.terms)?$/.exec(source)
      if (!m) return null
      let id = resolve(importer ? dirname(importer) : process.cwd(), m[1])
      return m[2] ? `\0${id}.terms` : id
    },

    load(id) {
      let m = /^\0?(.*\.grammar)(\.terms)?$/.exec(id)
      if (!m) return null
      if (!m[2]) this.addWatchFile(id)
      let base = m[1]
      let build = built[base] || (built[base] = fs.readFile(base, "utf8").then(code => buildParserFile(code, {
        fileName: base,
        moduleStyle: "es",
        exportName: config.exportName,
        warn: message => this.warn(message)
      })))
      return build.then(result => m[2] ? result.terms : result.parser)
    },

    watchChange(id) {
      if (built[id]) built[id] = null
    }
  }
}

export const rollup = lezer
