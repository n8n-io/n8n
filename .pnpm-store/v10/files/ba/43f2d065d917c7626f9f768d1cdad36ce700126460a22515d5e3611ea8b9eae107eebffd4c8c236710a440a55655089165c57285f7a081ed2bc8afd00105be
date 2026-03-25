const pth = require("path"), fs = require("fs")
const resolve = require("resolve")
const {parse: parseURL} = require("url")
const crypto = require("crypto")
const acorn = require("acorn"), walk = require("acorn-walk")

class Cached {
  constructor(content, mimetype) {
    this.content = content
    this.headers = {
      "content-type": mimetype + "; charset=utf-8",
      "etag": '"' + hash(content) + '"'
    }
  }
}

class ModuleServer {
  constructor(options) {
    this.root = unwin(options.root)
    this.self = findSelf(this.root)
    this.maxDepth = options.maxDepth == null ? 1 : options.maxDepth
    this.prefix = options.prefix || "_m"
    this.prefixTest = new RegExp(`^/${this.prefix}/(.*)`)
    if (this.root.charAt(this.root.length - 1) != "/") this.root += "/"
    // Maps from paths (relative to root dir) to cache entries
    this.cache = Object.create(null)
    this.handleRequest = this.handleRequest.bind(this)
  }

  handleRequest(req, resp) {
    let url = parseURL(req.url)
    let handle = this.prefixTest.exec(url.pathname)
    if (!handle) return false

    let send = (status, text, headers) => {
      let hds = {"access-control-allow-origin": "*",
                 "x-request-url": req.url}
      if (!headers || typeof headers == "string") hds["content-type"] = headers || "text/plain"
      else Object.assign(hds, headers)
      resp.writeHead(status, hds)
      resp.end(text)
    }

    // Modules paths in URLs represent "up one directory" as "__".
    // Convert them to ".." for filesystem path resolution.
    let path = undash(handle[1])
    let cached = this.cache[path]
    if (!cached) {
      if (countParentRefs(path) > this.maxDepth) { send(403, "Access denied"); return true }
      let fullPath = unwin(pth.resolve(this.root, path)), code
      try { code = fs.readFileSync(fullPath, "utf8") }
      catch { send(404, "Not found"); return true }
      if (/\.map$/.test(fullPath)) {
        cached = this.cache[path] = new Cached(code, "application/json")
      } else {
        let {code: resolvedCode, error} = this.resolveImports(fullPath, code)
        if (error) { send(500, error); return true }
        cached = this.cache[path] = new Cached(resolvedCode, "application/javascript")
      }
      // Drop cache entry when the file changes.
      let watching = fs.watch(fullPath, () => {
        watching.close()
        this.cache[path] = null
      })
    }
    let noneMatch = req.headers["if-none-match"]
    if (noneMatch && noneMatch.indexOf(cached.headers.etag) > -1) { send(304, null); return true }
    send(200, cached.content, cached.headers)
    return true
  }

  // Resolve a module path to a relative filepath where
  // the module's file exists.
  resolveModule(basePath, path) {
    let resolved
    if (path == this.self) {
      path = "."
      basePath = this.root
    }
    try { resolved = resolveMod(path, basePath) }
    catch(e) { return {error: e.toString()} }

    // Builtin modules resolve to strings like "fs". Try again with
    // slash which makes it possible to locally install an equivalent.
    if (resolved.indexOf("/") == -1) {
      try { resolved = resolveMod(path + "/", basePath) }
      catch(e) { return {error: e.toString()} }
    }

    return {path: "/" + this.prefix + "/" + unwin(pth.relative(this.root, resolved))}
  }

  resolveImports(basePath, code) {
    let patches = [], ast
    try { ast = acorn.parse(code, {sourceType: "module", ecmaVersion: "latest"}) }
    catch(error) { return {error: error.toString()} }
    let patchSrc = (node) => {
      if (!node.source) return
      let orig = (0, eval)(code.slice(node.source.start, node.source.end))
      let {error, path} = this.resolveModule(pth.dirname(basePath), orig)
      if (error) return {error}
      patches.push({from: node.source.start, to: node.source.end, text: JSON.stringify(dash(path))})
    }
    walk.simple(ast, {
      ExportNamedDeclaration: patchSrc,
      ImportDeclaration: patchSrc,
      ImportExpression: node => {
        if (node.source.type == "Literal") {
          let {error, path} = this.resolveModule(pth.dirname(basePath), node.source.value)
          if (!error)
            patches.push({from: node.source.start, to: node.source.end, text: JSON.stringify(dash(path))})
        }
      }
    })
    for (let patch of patches.sort((a, b) => b.from - a.from))
      code = code.slice(0, patch.from) + patch.text + code.slice(patch.to)
    return {code}
  }
}
module.exports = ModuleServer

function dash(path) { return path.replace(/(^|\/)\.\.(?=$|\/)/g, "$1__") }
function undash(path) { return path.replace(/(^|\/)__(?=$|\/)/g, "$1..") }

const unwin = pth.sep == "\\" ? s => s.replace(/\\/g, "/") : s => s

function packageFilter(pkg) {
  if (pkg.module) pkg.main = pkg.module
  else if (pkg.jnext) pkg.main = pkg.jsnext
  return pkg
}

function resolveMod(path, base) {
  return fs.realpathSync(resolve.sync(path, {basedir: base, packageFilter}))
}

function hash(str) {
  let sum = crypto.createHash("sha1")
  sum.update(str)
  return sum.digest("hex")
}

function countParentRefs(path) {
  let re = /(^|\/)\.\.(?=\/|$)/g, count = 0
  while (re.exec(path)) count++
  return count
}

function findSelf(dir) {
  for (;;) {
    let pkg = pth.join(dir, "package.json"), json
    try { json = JSON.parse(fs.readFileSync(pkg, "utf8")) }
    catch {}
    if (json) return json.name
    let next = pth.dirname(dir)
    if (next == dir) return null
    dir = next
  }
}
