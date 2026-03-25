import * as ts from "typescript"
import {join, dirname, basename, resolve} from "path"
import * as fs from "fs"
import {rollup, RollupBuild, Plugin, SourceMap} from "rollup"
import dts from "rollup-plugin-dts"
import {parse, Node} from "acorn"
import {recursive} from "acorn-walk"

const pkgCache: {[main: string]: Package} = Object.create(null)

function tsFiles(dir: string) {
  return fs.readdirSync(dir).filter(f => /(?<!\.d)\.ts$/.test(f)).map(f => join(dir, f))
}

interface BuildOptions {
  /// Generate sourcemap when generating bundle. defaults to false
  sourceMap?: boolean
  /// Compiler options to pass to TypeScript
  tsOptions?: any
}

class Package {
  readonly root: string
  readonly dirs: readonly string[]
  readonly tests: readonly string[]
  readonly json: any
  readonly lezer: boolean

  constructor(readonly main: string) {
    let src = dirname(main), root = dirname(src), tests = join(root, "test")
    this.root = root
    let dirs = this.dirs = [src]
    if (fs.existsSync(tests)) {
      this.tests = tsFiles(tests)
      dirs.push(tests)
    } else {
      this.tests = []
    }
    this.lezer = fs.readdirSync(src).some(f => /\.grammar$/.test(f))
    this.json = JSON.parse(fs.readFileSync(join(this.root, "package.json"), "utf8"))
  }

  static get(main: string): Package {
    return pkgCache[main] || (pkgCache[main] = new Package(main))
  }
}

const tsDefaultOptions = {
  lib: ["es6", "scripthost", "dom"],
  types: ["mocha"],
  stripInternal: true,
  noUnusedLocals: true,
  strict: true,
  target: "es6",
  module: "es2020",
  newLine: "lf",
  declaration: true,
  moduleResolution: "node"
}

function configFor(pkgs: readonly Package[], extra: readonly string[] = [], options: BuildOptions) {
  let paths: ts.MapLike<string[]> = {}
  for (let pkg of pkgs) paths[pkg.json.name] = [pkg.main]
  let {sourceMap, tsOptions} = options
  return {
    compilerOptions: {paths, ...tsDefaultOptions, ...tsOptions, sourceMap: !!sourceMap, inlineSources: sourceMap},
    include: pkgs.reduce((ds, p) => ds.concat(p.dirs.map(d => join(d, "*.ts"))), [] as string[])
      .concat(extra).map(normalize)
  }
}

function normalize(path: string) {
  return path.replace(/\\/g, "/")
}

class Output {
  files: {[name: string]: string} = Object.create(null)
  changed: string[] = []
  watchers: ((changed: readonly string[]) => void)[] = []
  watchTimeout: any = null

  constructor() { this.write = this.write.bind(this) }

  write(path: string, content: string) {
    let norm = normalize(path)
    if (this.files[norm] == content) return
    this.files[norm] = content
    if (!this.changed.includes(path)) this.changed.push(path)
    if (this.watchTimeout) clearTimeout(this.watchTimeout)
    if (this.watchers.length) this.watchTimeout = setTimeout(() => {
      this.watchers.forEach(w => w(this.changed))
      this.changed = []
    }, 100)
  }

  get(path: string) {
    return this.files[normalize(path)]
  }
}

function readAndMangleComments(dirs: readonly string[]) {
  return (name: string) => {
    let file = ts.sys.readFile(name)
    if (file && dirs.includes(dirname(name)))
      file = file.replace(/(?<=^|\n)(?:([ \t]*)\/\/\/.*\n)+/g, (comment, space) => {
        comment = comment.replace(/\]\(#/g, "](https://codemirror.net/6/docs/ref/#")
        return `${space}/**\n${space}${comment.slice(space.length).replace(/\/\/\/ ?/g, "")}${space}*/\n`
      })
    return file
  }
}

function runTS(dirs: readonly string[], tsconfig: any) {
  let config = ts.parseJsonConfigFileContent(tsconfig, ts.sys, dirname(dirs[0]))
  let host = ts.createCompilerHost(config.options)
  host.readFile = readAndMangleComments(dirs)
  let program = ts.createProgram({rootNames: config.fileNames, options: config.options, host})
  let out = new Output, result = program.emit(undefined, out.write)
  return result.emitSkipped ? null : out
}

const tsFormatHost = {
  getCanonicalFileName: (path: string) => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => "\n"
}

function watchTS(dirs: readonly string[], tsconfig: any) {
  let out = new Output, mangle = readAndMangleComments(dirs)
  let dummyConf = join(dirname(dirname(dirs[0])), "TSCONFIG.json")
  ts.createWatchProgram(ts.createWatchCompilerHost(
    dummyConf,
    undefined,
    Object.assign({}, ts.sys, {
      writeFile: out.write,
      readFile: (name: string) => {
        return name == dummyConf ? JSON.stringify(tsconfig) : mangle(name)
      }
    }),
    ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    diag => console.error(ts.formatDiagnostic(diag, tsFormatHost)),
    diag => console.info(ts.flattenDiagnosticMessageText(diag.messageText, "\n"))
  ))
  return out
}

function external(id: string) { return id != "tslib" && !/^(\.?\/|\w:)/.test(id) }

function outputPlugin(output: Output, ext: string, base: Plugin) {
  let {resolveId, load} = base
  return {
    ...base,
    resolveId(source: string, base: string | undefined, options: any) {
      let full = base && source[0] == "." ? resolve(dirname(base), source) : source
      if (!/\.\w+$/.test(full)) full += ext
      if (output.get(full)) return full
      return resolveId ? resolveId.call(this, source, base, options) : undefined
    },
    load(file: string) {
      let code = output.get(file)
      return code ? {code, map: output.get(file + '.map')} : (load && load.call(this, file))
    }
  } as Plugin
}

const pure = "/*@__PURE__*/"

function addPureComments(code: string) {
  let patches: {from: number, to?: number, insert: string}[] = []
  function walkCall(node: any, c: (node: Node, state?: any) => void) {
    node.arguments.forEach((n: any) => c(n))
    c(node.callee)
  }
  function addPure(pos: number) {
    let last = patches.length ? patches[patches.length - 1] : null
    if (!last || last.from != pos || last.insert != pure)
      patches.push({from: pos, insert: pure})
  }

  recursive(parse(code, {ecmaVersion: 2020, sourceType: "module"}), null, {
    CallExpression(node: any, _s, c) {
      walkCall(node, c)
      let m
      addPure(node.start)
      // TS-style enum
      if (node.callee.type == "FunctionExpression" && node.callee.params.length == 1 &&
          (m = /\bvar (\w+);\s*$/.exec(code.slice(node.start - 100, node.start))) &&
          m[1] == node.callee.params[0].name) {
        patches.push({from: m.index + 4 + m[1].length + (node.start - 100), to: node.start, insert: " = "})
        patches.push({from: node.callee.body.end - 1, insert: "return " + m[1]})
      }
    },
    NewExpression(node, _s, c) {
      walkCall(node, c)
      addPure(node.start)
    },
    Function() {},
    Class() {}
  })
  patches.sort((a, b) => a.from - b.from)
  for (let pos = 0, i = 0, result = "";; i++) {
    let next = i == patches.length ? null : patches[i]
    let nextPos = next ? next.from : code.length
    result += code.slice(pos, nextPos)
    if (!next) return result
    result += next.insert
    pos = next.to ?? nextPos
  }
}

async function emit(bundle: RollupBuild, conf: any, makePure = false) {
  let result = await bundle.generate(conf)
  let dir = dirname(conf.file)
  await fs.promises.mkdir(dir, {recursive: true}).catch(() => null)
  for (let file of result.output) {
    let content = (file as any).code || (file as any).source
    if (makePure) content = addPureComments(content)
    let sourceMap: SourceMap = (file as any).map
    if (sourceMap) {
      content = content + `\n//# sourceMappingURL=${file.fileName}.map`
      await fs.promises.writeFile(join(dir, file.fileName + ".map"), sourceMap.toString())
    }
    await fs.promises.writeFile(join(dir, file.fileName), content)
  }
}

async function bundle(pkg: Package, compiled: Output, options: BuildOptions) {
  let bundle = await rollup({
    input: pkg.main.replace(/\.ts$/, ".js"),
    external,
    plugins: [
      // @ts-ignore
      outputPlugin(compiled, ".js", pkg.lezer ? (await import("@lezer/generator/rollup")).lezer() : {name: "dummy"})
    ]
  })
  let dist = join(pkg.root, "dist")
  await emit(bundle, {
    format: "esm",
    file: join(dist, "index.js"),
    externalLiveBindings: false,
    sourcemap: options.sourceMap
  }, !options.sourceMap) // makePure set to false when generating source map since this manipulates output after source map is generated

  await emit(bundle, {
    format: "cjs",
    file: join(dist, "index.cjs"),
    sourcemap: options.sourceMap
  })

  let tscBundle = await rollup({
    input: pkg.main.replace(/\.ts$/, ".d.ts"),
    plugins: [outputPlugin(compiled, ".d.ts", {name: "dummy"}), dts()],
    onwarn(warning, warn) {
      if (warning.code != "CIRCULAR_DEPENDENCY" && warning.code != "UNUSED_EXTERNAL_IMPORT")
        warn(warning)
    }
  })
  await emit(tscBundle, {
    format: "esm",
    file: join(dist, "index.d.ts")
  })
}

function allDirs(pkgs: readonly Package[]) {
  return pkgs.reduce((a, p) => a.concat(p.dirs), [] as string[])
}

export async function build(main: string | readonly string[], options: BuildOptions = {}) {
  let pkgs = typeof main == "string" ? [Package.get(main)] : main.map(Package.get)
  let compiled = runTS(allDirs(pkgs), configFor(pkgs, undefined, options))
  if (!compiled) return false
  for (let pkg of pkgs) {
    await bundle(pkg, compiled, options)
    for (let file of pkg.tests.map(f => f.replace(/\.ts$/, ".js")))
      fs.writeFileSync(file, compiled.get(file))
  }
  return true
}

export function watch(mains: readonly string[], extra: readonly string[] = [], options: BuildOptions = {}) {
  let extraNorm = extra.map(normalize)
  let pkgs = mains.map(Package.get)
  let out = watchTS(allDirs(pkgs), configFor(pkgs, extra, options))
  out.watchers.push(writeFor)
  writeFor(Object.keys(out.files))

  async function writeFor(files: readonly string[]) {
    let changedPkgs: Package[] = [], changedFiles: string[] = []
    for (let file of files) {
      let ts = file.replace(/\.d\.ts$|\.js$|\.js.map$/, ".ts")
      if (extraNorm.includes(ts)) {
        changedFiles.push(file)
      } else {
        let root = dirname(dirname(file))
        let pkg = pkgs.find(p => normalize(p.root) == root)
        if (!pkg)
          throw new Error("No package found for " + file)
        if (pkg.tests.includes(ts)) changedFiles.push(file)
        else if (!changedPkgs.includes(pkg)) changedPkgs.push(pkg)
      }
    }
    for (let file of changedFiles) if (/\.(js|map)$/.test(file)) fs.writeFileSync(file, out.get(file))
    console.log("Bundling " + pkgs.map(p => basename(p.root)).join(", "))
    for (let pkg of changedPkgs) {
      try { await bundle(pkg, out, options) }
      catch(e) { console.error(`Failed to bundle ${basename(pkg.root)}:\n${e}`) }
    }
    console.log("Bundling done.")
  }
}
