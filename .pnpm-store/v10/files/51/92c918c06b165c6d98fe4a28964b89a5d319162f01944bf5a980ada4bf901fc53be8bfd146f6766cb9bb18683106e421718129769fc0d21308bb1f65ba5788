"use strict"

// external tooling
const resolve = require("resolve")

const moduleDirectories = ["web_modules", "node_modules"]

function resolveModule(id, opts) {
  return new Promise((res, rej) => {
    resolve(id, opts, (err, path) => (err ? rej(err) : res(path)))
  })
}

module.exports = function (id, base, options) {
  const paths = options.path

  const resolveOpts = {
    basedir: base,
    moduleDirectory: moduleDirectories.concat(options.addModulesDirectories),
    paths,
    extensions: [".css"],
    packageFilter: function processPackage(pkg) {
      if (pkg.style) pkg.main = pkg.style
      else if (!pkg.main || !/\.css$/.test(pkg.main)) pkg.main = "index.css"
      return pkg
    },
    preserveSymlinks: false,
  }

  return resolveModule(`./${id}`, resolveOpts)
    .catch(() => resolveModule(id, resolveOpts))
    .catch(() => {
      if (paths.indexOf(base) === -1) paths.unshift(base)

      throw new Error(
        `Failed to find '${id}'
  in [
    ${paths.join(",\n        ")}
  ]`
      )
    })
}
