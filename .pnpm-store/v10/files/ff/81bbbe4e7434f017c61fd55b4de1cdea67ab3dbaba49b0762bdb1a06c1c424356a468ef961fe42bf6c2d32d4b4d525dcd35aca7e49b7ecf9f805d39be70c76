
import __cjs_url__ from 'url';
import __cjs_path__ from 'path';
import __cjs_mod__ from 'module';
const __filename = __cjs_url__.fileURLToPath(import.meta.url);
const __dirname = __cjs_path__.dirname(__filename);
const require = __cjs_mod__.createRequire(import.meta.url);
import { relative, posix, resolve as resolve$1, isAbsolute, dirname, normalize, sep, basename } from 'node:path';
import { existsSync, readdirSync, lstatSync, rmdirSync } from 'node:fs';
import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { cpus } from 'node:os';
import { createParsedCommandLine, resolveVueCompilerOptions, createVueLanguagePlugin } from '@vue/language-core';
import { proxyCreateProgram } from '@volar/typescript';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { getPackageInfoSync, resolveModule } from 'local-pkg';
import { createFilter } from '@rollup/pluginutils';
import debug from 'debug';
import { cyan, yellow, green } from 'kolorist';
import { ExtractorConfig, Extractor } from '@microsoft/api-extractor';
import { compare } from 'compare-versions';
import MagicString from 'magic-string';

const windowsSlashRE = /\\+/g;
function slash(p) {
  return p.replace(windowsSlashRE, "/");
}
function resolveConfigDir(path, configDir) {
  return path.replace("${configDir}", configDir);
}
function normalizePath(id) {
  return posix.normalize(slash(id));
}
function resolve(...paths) {
  return normalizePath(resolve$1(...paths));
}
function isNativeObj(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
function isRegExp(value) {
  return Object.prototype.toString.call(value) === "[object RegExp]";
}
function isPromise(value) {
  return !!value && (typeof value === "function" || typeof value === "object") && typeof value.then === "function";
}
async function unwrapPromise(maybePromise) {
  return isPromise(maybePromise) ? await maybePromise : maybePromise;
}
function ensureAbsolute(path, root) {
  return normalizePath(path ? isAbsolute(path) ? path : resolve(root, path) : root);
}
function ensureArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}
async function runParallel(maxConcurrency, source, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of source) {
    const p = Promise.resolve().then(() => iteratorFn(item, source));
    ret.push(p);
    if (maxConcurrency <= source.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}
const speRE = /[\\/]/;
function queryPublicPath(paths) {
  if (paths.length === 0) {
    return "";
  } else if (paths.length === 1) {
    return dirname(paths[0]);
  }
  let publicPath = normalize(dirname(paths[0])) + sep;
  let publicUnits = publicPath.split(speRE);
  let index = publicUnits.length - 1;
  for (const path of paths.slice(1)) {
    if (!index) {
      return publicPath;
    }
    const dirPath = normalize(dirname(path)) + sep;
    if (dirPath.startsWith(publicPath)) {
      continue;
    }
    const units = dirPath.split(speRE);
    if (units.length < index) {
      publicPath = dirPath;
      publicUnits = units;
      continue;
    }
    for (let i = 0; i <= index; ++i) {
      if (publicUnits[i] !== units[i]) {
        if (!i) {
          return "";
        }
        index = i - 1;
        publicUnits = publicUnits.slice(0, index + 1);
        publicPath = publicUnits.join(sep) + sep;
        break;
      }
    }
  }
  return publicPath.slice(0, -1);
}
function removeDirIfEmpty(dir) {
  if (!existsSync(dir)) {
    return;
  }
  let onlyHasDir = true;
  for (const file of readdirSync(dir)) {
    const abs = resolve(dir, file);
    if (lstatSync(abs).isDirectory()) {
      if (!removeDirIfEmpty(abs)) {
        onlyHasDir = false;
      }
    } else {
      onlyHasDir = false;
    }
  }
  if (onlyHasDir) {
    rmdirSync(dir);
  }
  return onlyHasDir;
}
function getTsConfig(tsConfigPath, readFileSync) {
  const baseConfig = ts.readConfigFile(tsConfigPath, readFileSync).config ?? {};
  const tsConfig = {
    ...baseConfig,
    compilerOptions: {}
  };
  if (tsConfig.extends) {
    ensureArray(tsConfig.extends).forEach((configPath) => {
      const config = getTsConfig(ensureAbsolute(configPath, dirname(tsConfigPath)), readFileSync);
      Object.assign(tsConfig.compilerOptions, config.compilerOptions);
      if (!tsConfig.include) {
        tsConfig.include = config.include;
      }
      if (!tsConfig.exclude) {
        tsConfig.exclude = config.exclude;
      }
    });
  }
  Object.assign(tsConfig.compilerOptions, baseConfig.compilerOptions);
  return tsConfig;
}
function getTsLibFolder() {
  const libFolder = tryGetPackageInfo("typescript")?.rootPath;
  return libFolder && normalizePath(libFolder);
}
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
function base64Encode(number) {
  if (number >= 0 && number < BASE64_ALPHABET.length) {
    return BASE64_ALPHABET[number];
  }
  throw new TypeError("Base64 integer must be between 0 and 63: " + number);
}
const VLQ_BASE_SHIFT = 5;
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;
const VLQ_BASE_MASK = VLQ_BASE - 1;
const VLQ_CONTINUATION_BIT = VLQ_BASE;
function toVLQSigned(number) {
  return number < 0 ? (-number << 1) + 1 : (number << 1) + 0;
}
function base64VLQEncode(numbers) {
  let encoded = "";
  for (const number of numbers) {
    let vlq = toVLQSigned(number);
    let digit;
    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64Encode(digit);
    } while (vlq > 0);
  }
  return encoded;
}
const pkgPathCache = /* @__PURE__ */ new Map();
function tryGetPkgPath(beginPath) {
  beginPath = normalizePath(beginPath);
  if (pkgPathCache.has(beginPath)) {
    return pkgPathCache.get(beginPath);
  }
  const pkgPath = resolve(beginPath, "package.json");
  if (existsSync(pkgPath)) {
    pkgPathCache.set(beginPath, pkgPath);
    return pkgPath;
  }
  const parentDir = normalizePath(dirname(beginPath));
  if (!parentDir || parentDir === beginPath) {
    pkgPathCache.set(beginPath, undefined);
    return;
  }
  return tryGetPkgPath(parentDir);
}
function toCapitalCase(value) {
  value = value.trim().replace(/\s+/g, "-");
  value = value.replace(/-+(\w)/g, (_, char) => char ? char.toUpperCase() : "");
  return (value.charAt(0).toLocaleUpperCase() + value.slice(1)).replace(
    /[^\w]/g,
    ""
  );
}
function findTypesPath(...pkgs) {
  let path;
  for (const pkg of pkgs) {
    if (typeof pkg !== "object") continue;
    path = pkg.types || pkg.typings || pkg.exports?.types || pkg.exports?.["."]?.types || pkg.exports?.["./"]?.types;
    if (path) return path;
  }
}
function setModuleResolution(options) {
  if (options.moduleResolution) return;
  const module = typeof options.module === "number" ? options.module : options.target ?? ts.ScriptTarget.ES5 >= 2 ? ts.ModuleKind.ES2015 : ts.ModuleKind.CommonJS;
  let moduleResolution;
  switch (module) {
    case ts.ModuleKind.CommonJS:
      moduleResolution = ts.ModuleResolutionKind.Node10;
      break;
    case ts.ModuleKind.Node16:
      moduleResolution = ts.ModuleResolutionKind.Node16;
      break;
    case ts.ModuleKind.NodeNext:
      moduleResolution = ts.ModuleResolutionKind.NodeNext;
      break;
    default:
      moduleResolution = ts.version.startsWith("5") ? ts.ModuleResolutionKind.Bundler : ts.ModuleResolutionKind.Classic;
      break;
  }
  options.moduleResolution = moduleResolution;
}
function editSourceMapDir(content, fromDir, toDir) {
  const relativeOutDir = relative(fromDir, toDir);
  if (relativeOutDir) {
    try {
      const sourceMap = JSON.parse(content);
      sourceMap.sources = sourceMap.sources.map((source) => {
        return normalizePath(relative(relativeOutDir, source));
      });
      return JSON.stringify(sourceMap);
    } catch (e) {
      return false;
    }
  }
  return true;
}
const regexpSymbolRE = /([$.\\+?()[\]!<=|{}^,])/g;
const asteriskRE = /[*]+/g;
function parseTsAliases(basePath, paths) {
  const result = [];
  for (const [pathWithAsterisk, replacements] of Object.entries(paths)) {
    const find = new RegExp(
      `^${pathWithAsterisk.replace(regexpSymbolRE, "\\$1").replace(asteriskRE, "(?!\\.{1,2}\\/)([^*]+)")}$`
    );
    let index = 1;
    result.push({
      find,
      replacement: ensureAbsolute(
        replacements[0].replace(asteriskRE, () => `$${index++}`),
        basePath
      )
    });
  }
  return result;
}
const rootAsteriskImportRE = /^(?!\.{1,2}\/)([^*]+)$/;
function isAliasGlobal(alias) {
  return alias.find.toString() === rootAsteriskImportRE.toString();
}
function importResolves(path) {
  const files = [
    // js
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    // ts
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".d.ts",
    // json
    ".json",
    // vue
    ".vue",
    ".vue.d.ts",
    // svelte
    ".svelte"
  ];
  for (const ext of files) {
    if (existsSync(path + ext)) {
      return true;
    }
  }
  return false;
}
function tryGetPackageInfo(name) {
  if (process.versions.pnp) {
    const targetRequire = createRequire(import.meta.url);
    try {
      return getPackageInfoSync(
        targetRequire.resolve(`${name}/package.json`, { paths: [process.cwd()] })
      );
    } catch (e) {
    }
  }
  try {
    return getPackageInfoSync(name) ?? getPackageInfoSync(name, { paths: [resolveModule(name) || process.cwd()] });
  } catch (e) {
  }
}

const hasVue = !!tryGetPackageInfo("vue");
const createProgram = !hasVue ? ts.createProgram : proxyCreateProgram(ts, ts.createProgram, (ts2, options) => {
  const { configFilePath } = options.options;
  const vueOptions = typeof configFilePath === "string" ? createParsedCommandLine(ts2, ts2.sys, configFilePath.replace(/\\/g, "/")).vueOptions : resolveVueCompilerOptions({});
  const vueLanguagePlugin = createVueLanguagePlugin(
    ts2,
    options.options,
    vueOptions,
    (id) => id
  );
  return [vueLanguagePlugin];
});

const dtsRE$1 = /\.d\.(m|c)?tsx?$/;
function rollupDeclarationFiles({
  root,
  configPath,
  compilerOptions,
  outDir,
  entryPath,
  fileName,
  libFolder,
  rollupConfig = {},
  rollupOptions = {}
}) {
  const configObjectFullPath = resolve(root, "api-extractor.json");
  if (!dtsRE$1.test(fileName)) {
    fileName += ".d.ts";
  }
  if (/preserve/i.test(compilerOptions.module)) {
    compilerOptions = { ...compilerOptions, module: "ESNext" };
  }
  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      ...rollupConfig,
      projectFolder: root,
      mainEntryPointFilePath: entryPath,
      compiler: {
        tsconfigFilePath: configPath,
        overrideTsconfig: {
          $schema: "http://json.schemastore.org/tsconfig",
          compilerOptions
        }
      },
      apiReport: {
        enabled: false,
        reportFileName: "<unscopedPackageName>.api.md",
        ...rollupConfig.apiReport
      },
      docModel: {
        enabled: false,
        ...rollupConfig.docModel
      },
      dtsRollup: {
        enabled: true,
        publicTrimmedFilePath: resolve(outDir, fileName)
      },
      tsdocMetadata: {
        enabled: false,
        ...rollupConfig.tsdocMetadata
      },
      messages: {
        compilerMessageReporting: {
          default: {
            logLevel: "none"
          }
        },
        extractorMessageReporting: {
          default: {
            logLevel: "none"
          }
        },
        ...rollupConfig.messages
      }
    },
    configObjectFullPath,
    packageJsonFullPath: tryGetPkgPath(configObjectFullPath)
  });
  return Extractor.invoke(extractorConfig, {
    localBuild: false,
    showVerboseMessages: false,
    showDiagnostics: false,
    typescriptCompilerFolder: libFolder,
    ...rollupOptions
  });
}

const jsonRE = /\.json$/;
function JsonResolver() {
  return {
    name: "json",
    supports(id) {
      return jsonRE.test(id);
    },
    transform({ id, root, program }) {
      const sourceFile = program.getSourceFile(id);
      if (!sourceFile) return [];
      return [
        {
          path: relative(root, `${id}.d.ts`),
          content: `declare const _default: ${sourceFile.text};

export default _default;
`
        }
      ];
    }
  };
}

const svelteRE = /\.svelte$/;
let lowerVersion;
function querySvelteVersion() {
  if (typeof lowerVersion === "boolean") return;
  try {
    const version = tryGetPackageInfo("svelte")?.version;
    lowerVersion = version ? compare(version, "4.0.0", "<") : false;
  } catch (e) {
    lowerVersion = false;
  }
}
function SvelteResolver() {
  return {
    name: "svelte",
    supports(id) {
      return svelteRE.test(id);
    },
    transform({ id, root }) {
      querySvelteVersion();
      return [
        {
          path: relative(root, `${id}.d.ts`),
          content: `export { ${lowerVersion ? "SvelteComponentTyped" : "SvelteComponent"} as default } from 'svelte';
`
        }
      ];
    }
  };
}

const vueRE = /\.vue$/;
function VueResolver() {
  return {
    name: "vue",
    supports(id) {
      return vueRE.test(id);
    },
    transform({ id, code, program }) {
      const sourceFile = program.getSourceFile(id) || program.getSourceFile(id + ".ts") || program.getSourceFile(id + ".js") || program.getSourceFile(id + ".tsx") || program.getSourceFile(id + ".jsx");
      if (!sourceFile) return [];
      const outputs = [];
      const { emitSkipped, diagnostics } = program.emit(
        sourceFile,
        (path, content) => {
          outputs.push({ path, content });
        },
        undefined,
        true
      );
      if (!program.getCompilerOptions().declarationMap) {
        return {
          outputs,
          emitSkipped,
          diagnostics
        };
      }
      const [beforeScript] = code.split(/\s*<script.*>/);
      const beforeLines = beforeScript.split("\n").length;
      for (const output of outputs) {
        if (output.path.endsWith(".map")) {
          try {
            const sourceMap = JSON.parse(output.content);
            sourceMap.sources = sourceMap.sources.map(
              (source) => source.replace(/\.vue\.ts$/, ".vue")
            );
            if (beforeScript && beforeScript !== code && beforeLines) {
              sourceMap.mappings = `${base64VLQEncode([0, 0, beforeLines, 0])};${sourceMap.mappings}`;
            }
            output.content = JSON.stringify(sourceMap);
          } catch (e) {
          }
        }
      }
      return {
        outputs,
        emitSkipped,
        diagnostics
      };
    }
  };
}

function parseResolvers(resolvers) {
  const nameMap = /* @__PURE__ */ new Map();
  for (const resolver of resolvers) {
    resolver.name && nameMap.set(resolver.name, resolver);
  }
  return Array.from(nameMap.values());
}

const globSuffixRE = /^((?:.*\.[^.]+)|(?:\*+))$/;
function normalizeGlob(path) {
  if (/[\\/]$/.test(path)) {
    return path + "**";
  } else if (!globSuffixRE.test(path.split(/[\\/]/).pop())) {
    return path + "/**";
  }
  return path;
}
function walkSourceFile(sourceFile, callback) {
  function walkNode(node, parent, callback2) {
    if (callback2(node, parent) !== false) {
      node.forEachChild((child) => walkNode(child, node, callback2));
    }
  }
  sourceFile.forEachChild((child) => walkNode(child, sourceFile, callback));
}
function isAliasMatch(alias, importer) {
  if (isRegExp(alias.find)) return alias.find.test(importer);
  if (importer.length < alias.find.length) return false;
  if (importer === alias.find) return true;
  return importer.indexOf(alias.find) === 0 && (alias.find.endsWith("/") || importer.substring(alias.find.length)[0] === "/");
}
function transformAlias(importer, dir, aliases, aliasesExclude) {
  if (aliases?.length && !aliasesExclude.some((e) => isRegExp(e) ? e.test(importer) : String(e) === importer)) {
    const matchedAlias = aliases.find((alias) => isAliasMatch(alias, importer));
    if (matchedAlias) {
      const replacement = isAbsolute(matchedAlias.replacement) ? normalizePath(relative(dir, matchedAlias.replacement)) : normalizePath(matchedAlias.replacement);
      const endsWithSlash = typeof matchedAlias.find === "string" ? matchedAlias.find.endsWith("/") : importer.match(matchedAlias.find)[0].endsWith("/");
      const truthPath = importer.replace(
        matchedAlias.find,
        replacement + (endsWithSlash ? "/" : "")
      );
      const absolutePath = resolve$1(dir, truthPath);
      const normalizedPath = normalizePath(relative(dir, absolutePath));
      const resultPath = normalizedPath.startsWith(".") ? normalizedPath : `./${normalizedPath}`;
      if (!isAliasGlobal(matchedAlias)) return resultPath;
      if (importResolves(absolutePath)) return resultPath;
    }
  }
  return importer;
}
const vlsRE = /^_?__VLS_/;
function isVLSNode(node) {
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.some(
      (d) => ts.isIdentifier(d.name) && vlsRE.test(`${d.name.escapedText}`)
    );
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return vlsRE.test(`${node.name.escapedText}`);
  }
  if (ts.isFunctionDeclaration(node)) {
    return !!node.name && vlsRE.test(`${node.name.escapedText}`);
  }
  return false;
}
function transformCode(options) {
  const s = new MagicString(options.content);
  const ast = ts.createSourceFile("a.ts", options.content, ts.ScriptTarget.Latest);
  const dir = dirname(options.filePath);
  const importMap = /* @__PURE__ */ new Map();
  const usedDefault = /* @__PURE__ */ new Map();
  const declareModules = [];
  const toLibName = (origin) => {
    const name = transformAlias(origin, dir, options.aliases, options.aliasesExclude);
    return options.cleanVueFileName ? name.replace(/\.vue$/, "") : name;
  };
  let indexCount = 0;
  let importCount = 0;
  walkSourceFile(ast, (node, parent) => {
    if (ts.isImportDeclaration(node)) {
      if (!node.importClause) {
        options.clearPureImport && s.remove(node.pos, node.end);
        ++importCount;
      } else if (ts.isStringLiteral(node.moduleSpecifier) && (node.importClause.name || node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings))) {
        const libName = toLibName(node.moduleSpecifier.text);
        const importSet = importMap.get(libName) ?? importMap.set(libName, /* @__PURE__ */ new Set()).get(libName);
        if (node.importClause.name && !usedDefault.has(libName)) {
          const usedType = node.importClause.name.escapedText;
          usedDefault.set(libName, usedType);
          importSet.add(`default as ${usedType}`);
        }
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach((element) => {
            if (element.propertyName) {
              importSet.add(`${element.propertyName.getText(ast)} as ${element.name.escapedText}`);
            } else {
              importSet.add(element.name.escapedText);
            }
          });
        }
        s.remove(node.pos, node.end);
        ++importCount;
      }
      return false;
    }
    if (ts.isImportTypeNode(node) && node.qualifier && ts.isLiteralTypeNode(node.argument) && ts.isIdentifier(node.qualifier) && ts.isStringLiteral(node.argument.literal)) {
      const libName = toLibName(node.argument.literal.text);
      if (!options.staticImport) {
        s.update(node.argument.literal.pos, node.argument.literal.end, `'${libName}'`);
        return !!node.typeArguments;
      }
      const importSet = importMap.get(libName) ?? importMap.set(libName, /* @__PURE__ */ new Set()).get(libName);
      let usedType = node.qualifier.escapedText;
      if (usedType === "default") {
        usedType = usedDefault.get(libName) ?? usedDefault.set(libName, `__DTS_DEFAULT_${indexCount++}__`).get(libName);
        importSet.add(`default as ${usedType}`);
        s.update(node.qualifier.pos, node.qualifier.end, usedType);
      } else {
        importSet.add(usedType);
      }
      if (ts.isImportTypeNode(parent) && parent.typeArguments && parent.typeArguments[0] === node) {
        s.remove(node.pos, node.argument.end + 2);
      } else {
        s.update(node.pos, node.argument.end + 2, " ");
      }
      return !!node.typeArguments;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
      s.update(
        node.arguments[0].pos,
        node.arguments[0].end,
        `'${toLibName(node.arguments[0].text)}'`
      );
      return false;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      s.update(
        node.moduleSpecifier.pos,
        node.moduleSpecifier.end,
        ` '${toLibName(node.moduleSpecifier.text)}'`
      );
      return false;
    }
    if (ts.isModuleDeclaration(node) && node.body && ts.isModuleBlock(node.body)) {
      if (ts.isIdentifier(node.name) && node.name.escapedText === "global" && node.body.statements.some(isVLSNode)) {
        s.remove(node.pos, node.end);
      } else if (ts.isStringLiteral(node.name)) {
        const libName = toLibName(node.name.text);
        if (libName !== node.name.text) {
          s.update(node.name.pos, node.name.end, ` '${libName}'`);
        }
        if (!libName.startsWith(".") && node.modifiers?.[0] && node.modifiers[0].kind === ts.SyntaxKind.DeclareKeyword && !node.body.statements.some(
          (s2) => ts.isExportAssignment(s2) || ts.isExportDeclaration(s2) || ts.isImportDeclaration(s2)
        )) {
          declareModules.push(s.slice(node.pos, node.end + 1));
        }
      }
      return false;
    }
  });
  let prependImports = "";
  importMap.forEach((importSet, libName) => {
    prependImports += `import { ${Array.from(importSet).join(", ")} } from '${libName}';
`;
  });
  s.trimStart("\n").prepend(prependImports);
  return {
    content: s.toString(),
    declareModules,
    diffLineCount: importMap.size && importCount < importMap.size ? importMap.size - importCount : null
  };
}
function hasNormalExport(content) {
  const ast = ts.createSourceFile("a.ts", content, ts.ScriptTarget.Latest);
  let has = false;
  walkSourceFile(ast, (node) => {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          if (element.name.getText(ast) !== "default") {
            has = true;
            break;
          }
        }
      } else {
        has = true;
      }
    } else if ("modifiers" in node && Array.isArray(node.modifiers) && node.modifiers.length > 1) {
      for (let i = 0, len = node.modifiers.length; i < len; ++i) {
        if (node.modifiers[i].kind === ts.SyntaxKind.ExportKeyword && node.modifiers[i + 1]?.kind !== ts.SyntaxKind.DefaultKeyword) {
          has = true;
          break;
        }
      }
    }
    return false;
  });
  return has;
}
function hasExportDefault(content) {
  const ast = ts.createSourceFile("a.ts", content, ts.ScriptTarget.Latest);
  let has = false;
  walkSourceFile(ast, (node) => {
    if (ts.isExportAssignment(node)) {
      has = true;
    } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        if (element.name.getText(ast) === "default") {
          has = true;
          break;
        }
      }
    } else if ("modifiers" in node && Array.isArray(node.modifiers) && node.modifiers.length > 1) {
      for (let i = 0, len = node.modifiers.length; i < len; ++i) {
        if (node.modifiers[i].kind === ts.SyntaxKind.ExportKeyword && node.modifiers[i + 1]?.kind === ts.SyntaxKind.DefaultKeyword) {
          has = true;
          break;
        }
      }
    }
    return false;
  });
  return has;
}

const jsRE = /\.(m|c)?jsx?$/;
const tsRE = /\.(m|c)?tsx?$/;
const dtsRE = /\.d\.(m|c)?tsx?$/;
const tjsRE = /\.(m|c)?(t|j)sx?$/;
const mtjsRE = /\.m(t|j)sx?$/;
const ctjsRE = /\.c(t|j)sx?$/;
const fullRelativeRE = /^\.\.?\//;
const defaultIndex = "index.d.ts";
const pluginName = "vite:dts";
const logPrefix = cyan(`[${pluginName}]`);
const bundleDebug = debug("vite-plugin-dts:bundle");
const fixedCompilerOptions = {
  noEmit: false,
  declaration: true,
  emitDeclarationOnly: true,
  checkJs: false,
  skipLibCheck: true,
  preserveSymlinks: false,
  noEmitOnError: undefined,
  target: ts.ScriptTarget.ESNext
};
const noop = () => {
};
const extPrefix = (file) => mtjsRE.test(file) ? "m" : ctjsRE.test(file) ? "c" : "";
const tsToDts = (path) => `${path.replace(tsRE, "")}.d.ts`;
function dtsPlugin(options = {}) {
  const {
    tsconfigPath,
    logLevel,
    staticImport = false,
    clearPureImport = true,
    cleanVueFileName = false,
    insertTypesEntry = false,
    rollupTypes = false,
    pathsToAliases = true,
    aliasesExclude = [],
    rollupOptions = {},
    copyDtsFiles = false,
    declarationOnly = false,
    strictOutput = true,
    afterDiagnostic = noop,
    beforeWriteFile = noop,
    afterRollup = noop,
    afterBuild = noop
  } = options;
  let root = ensureAbsolute(options.root ?? "", process.cwd());
  let publicRoot = "";
  let entryRoot = options.entryRoot ?? "";
  let configPath;
  let compilerOptions;
  let rawCompilerOptions;
  let outDirs;
  let entries;
  let include;
  let exclude;
  let aliases;
  let libName;
  let indexName;
  let logger;
  let host;
  let program;
  let filter;
  let rootNames = [];
  let rebuildProgram;
  let bundled = false;
  let timeRecord = 0;
  const resolvers = parseResolvers([
    JsonResolver(),
    VueResolver(),
    SvelteResolver(),
    ...options.resolvers || []
  ]);
  const rootFiles = /* @__PURE__ */ new Set();
  const outputFiles = /* @__PURE__ */ new Map();
  const transformedFiles = /* @__PURE__ */ new Set();
  const diagnostics = [];
  const setOutputFile = (path, content) => {
    outputFiles.set(path, content);
  };
  const rollupConfig = { ...options.rollupConfig || {} };
  rollupConfig.bundledPackages = rollupConfig.bundledPackages || options.bundledPackages || [];
  const cleanPath = (path, emittedFiles) => {
    const newPath = path.replace(".vue.d.ts", ".d.ts");
    return !emittedFiles.has(newPath) && cleanVueFileName ? newPath : path;
  };
  return {
    name: pluginName,
    apply: "build",
    enforce: "pre",
    config(config) {
      const aliasOptions = config?.resolve?.alias ?? [];
      if (isNativeObj(aliasOptions)) {
        aliases = Object.entries(aliasOptions).map(([key, value]) => {
          return { find: key, replacement: value };
        });
      } else {
        aliases = ensureArray(aliasOptions).map((alias) => ({ ...alias }));
      }
      if (aliasesExclude.length > 0) {
        aliases = aliases.filter(
          ({ find }) => !aliasesExclude.some(
            (aliasExclude) => aliasExclude && (isRegExp(find) ? find.toString() === aliasExclude.toString() : isRegExp(aliasExclude) ? find.match(aliasExclude)?.[0] : find === aliasExclude)
          )
        );
      }
      for (const alias of aliases) {
        alias.replacement = resolve(alias.replacement);
      }
    },
    async configResolved(config) {
      logger = logLevel ? (await import('vite')).createLogger(logLevel, { allowClearScreen: config.clearScreen }) : config.logger;
      root = ensureAbsolute(options.root ?? "", config.root);
      if (config.build.lib) {
        const input = typeof config.build.lib.entry === "string" ? [config.build.lib.entry] : config.build.lib.entry;
        if (Array.isArray(input)) {
          entries = input.reduce(
            (prev, current) => {
              prev[basename(current)] = current;
              return prev;
            },
            {}
          );
        } else {
          entries = { ...input };
        }
        const filename = config.build.lib.fileName ?? defaultIndex;
        const entry = typeof config.build.lib.entry === "string" ? config.build.lib.entry : Object.keys(config.build.lib.entry)[0];
        libName = config.build.lib.name || "_default";
        indexName = typeof filename === "string" ? filename : filename("es", entry);
        if (!dtsRE.test(indexName)) {
          indexName = `${indexName.replace(tjsRE, "")}.d.${extPrefix(indexName)}ts`;
        }
      } else {
        logger.warn(
          `
${logPrefix} ${yellow(
            "You are building a library that may not need to generate declaration files."
          )}
`
        );
        libName = "_default";
        indexName = defaultIndex;
      }
      if (!options.outDir) {
        outDirs = [ensureAbsolute(config.build.outDir, root)];
      }
      bundleDebug("parse vite config");
    },
    options(options2) {
      if (entries) return;
      const input = typeof options2.input === "string" ? [options2.input] : options2.input;
      if (Array.isArray(input)) {
        entries = input.reduce(
          (prev, current) => {
            prev[basename(current)] = current;
            return prev;
          },
          {}
        );
      } else {
        entries = { ...input };
      }
      logger = logger || console;
      aliases = aliases || [];
      libName = "_default";
      indexName = defaultIndex;
      bundleDebug("parse options");
    },
    async buildStart() {
      if (program) return;
      bundleDebug("begin buildStart");
      timeRecord = 0;
      const startTime = Date.now();
      configPath = tsconfigPath ? ensureAbsolute(tsconfigPath, root) : ts.findConfigFile(root, ts.sys.fileExists);
      const content = configPath ? createParsedCommandLine(ts, ts.sys, configPath) : undefined;
      compilerOptions = {
        ...content?.options || {},
        ...options.compilerOptions || {},
        ...fixedCompilerOptions,
        outDir: ".",
        declarationDir: "."
      };
      rawCompilerOptions = content?.raw.compilerOptions || {};
      if (content?.fileNames.find((name) => name.endsWith(".vue"))) {
        setModuleResolution(compilerOptions);
      }
      if (!outDirs) {
        outDirs = options.outDir ? ensureArray(options.outDir).map((d) => ensureAbsolute(d, root)) : [
          ensureAbsolute(
            content?.raw.compilerOptions?.outDir ? resolveConfigDir(content.raw.compilerOptions.outDir, root) : "dist",
            root
          )
        ];
      }
      const {
        // Here we are using the default value to set the `baseUrl` to the current directory if no value exists. This is
        // the same behavior as the TS Compiler. See TS source:
        // https://github.com/microsoft/TypeScript/blob/3386e943215613c40f68ba0b108cda1ddb7faee1/src/compiler/utilities.ts#L6493-L6501
        baseUrl = compilerOptions.paths ? process.cwd() : undefined,
        paths
      } = compilerOptions;
      if (pathsToAliases && baseUrl && paths) {
        aliases.push(
          ...parseTsAliases(
            ensureAbsolute(
              resolveConfigDir(baseUrl, root),
              configPath ? dirname(configPath) : root
            ),
            paths
          )
        );
      }
      const computeGlobs = (rootGlobs, tsGlobs, defaultGlob) => {
        if (rootGlobs?.length) {
          return ensureArray(rootGlobs).map(
            (glob) => normalizeGlob(ensureAbsolute(resolveConfigDir(glob, root), root))
          );
        }
        return ensureArray(tsGlobs?.length ? tsGlobs : defaultGlob).map(
          (glob) => normalizeGlob(
            ensureAbsolute(resolveConfigDir(glob, root), configPath ? dirname(configPath) : root)
          )
        );
      };
      include = computeGlobs(
        options.include,
        [...ensureArray(content?.raw.include ?? []), ...ensureArray(content?.raw.files ?? [])],
        "**/*"
      );
      exclude = computeGlobs(options.exclude, content?.raw.exclude, "node_modules/**");
      filter = createFilter(include, exclude);
      rootNames = [
        ...new Set(
          Object.values(entries).map((entry) => ensureAbsolute(entry, root)).concat(content?.fileNames.filter(filter) || []).map(normalizePath)
        )
      ];
      host = ts.createCompilerHost(compilerOptions);
      program = (rebuildProgram = () => createProgram({
        host,
        rootNames,
        options: compilerOptions,
        projectReferences: content?.projectReferences
      }))();
      libName = toCapitalCase(libName || "_default");
      indexName = indexName || defaultIndex;
      const maybeEmitted = (sourceFile) => {
        return !(compilerOptions.noEmitForJsFiles && jsRE.test(sourceFile.fileName)) && !sourceFile.isDeclarationFile && !program.isSourceFileFromExternalLibrary(sourceFile);
      };
      publicRoot = compilerOptions.rootDir ? ensureAbsolute(resolveConfigDir(compilerOptions.rootDir, root), root) : compilerOptions.composite && compilerOptions.configFilePath ? dirname(compilerOptions.configFilePath) : queryPublicPath(
        program.getSourceFiles().filter(maybeEmitted).map((sourceFile) => sourceFile.fileName)
      );
      publicRoot = normalizePath(publicRoot);
      entryRoot = entryRoot || publicRoot;
      entryRoot = ensureAbsolute(entryRoot, root);
      diagnostics.push(
        ...program.getDeclarationDiagnostics(),
        ...program.getSemanticDiagnostics(),
        ...program.getSyntacticDiagnostics()
      );
      for (const file of rootNames) {
        this.addWatchFile(file);
        rootFiles.add(file);
      }
      bundleDebug("create ts program");
      timeRecord += Date.now() - startTime;
    },
    async transform(code, id) {
      let resolver;
      id = normalizePath(id).split("?")[0];
      if (!host || !program || !filter(id) || !(resolver = resolvers.find((r) => r.supports(id))) && !tjsRE.test(id) || transformedFiles.has(id)) {
        return;
      }
      const startTime = Date.now();
      const outDir = outDirs[0];
      rootFiles.delete(id);
      transformedFiles.add(id);
      if (resolver) {
        const result = await resolver.transform({
          id,
          code,
          root: publicRoot,
          outDir,
          host,
          program
        });
        let output;
        if (Array.isArray(result)) {
          output = result;
        } else {
          output = result.outputs;
          if (result.emitSkipped && result.diagnostics?.length) {
            diagnostics.push(...result.diagnostics);
          }
        }
        for (const { path, content } of output) {
          setOutputFile(
            resolve(publicRoot, relative(outDir, ensureAbsolute(path, outDir))),
            content
          );
        }
      } else {
        const sourceFile = program.getSourceFile(id);
        if (sourceFile) {
          const result = program.emit(
            sourceFile,
            (name, text) => {
              setOutputFile(
                resolve(publicRoot, relative(outDir, ensureAbsolute(name, outDir))),
                text
              );
            },
            undefined,
            true
          );
          if (result.emitSkipped && result.diagnostics.length) {
            diagnostics.push(...result.diagnostics);
          }
        }
      }
      const dtsId = id.replace(tjsRE, "") + ".d.ts";
      const dtsSourceFile = program.getSourceFile(dtsId);
      dtsSourceFile && filter(dtsSourceFile.fileName) && setOutputFile(normalizePath(dtsSourceFile.fileName), dtsSourceFile.getFullText());
      timeRecord += Date.now() - startTime;
    },
    watchChange(id) {
      id = normalizePath(id);
      if (!host || !program || !filter(id) || !resolvers.find((r) => r.supports(id)) && !tjsRE.test(id)) {
        return;
      }
      id = id.split("?")[0];
      const sourceFile = host.getSourceFile(id, ts.ScriptTarget.ESNext);
      if (sourceFile) {
        for (const file of rootNames) {
          rootFiles.add(file);
        }
        rootFiles.add(normalizePath(sourceFile.fileName));
        bundled = false;
        timeRecord = 0;
        program = rebuildProgram();
      }
    },
    async writeBundle() {
      transformedFiles.clear();
      if (!host || !program || bundled) return;
      bundled = true;
      bundleDebug("begin writeBundle");
      logger.info(green(`
${logPrefix} Start generate declaration files...`));
      const startTime = Date.now();
      if (diagnostics?.length) {
        logger.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
      }
      if (typeof afterDiagnostic === "function") {
        await unwrapPromise(afterDiagnostic(diagnostics));
      }
      const outDir = outDirs[0];
      const emittedFiles = /* @__PURE__ */ new Map();
      const declareModules = [];
      const writeOutput = async (path, content, outDir2, record = true) => {
        if (typeof beforeWriteFile === "function") {
          const result = await unwrapPromise(beforeWriteFile(path, content));
          if (result === false) return;
          if (result) {
            path = result.filePath || path;
            content = result.content ?? content;
          }
        }
        path = normalizePath(path);
        const dir = normalizePath(dirname(path));
        if (strictOutput && !dir.startsWith(normalizePath(outDir2))) {
          logger.warn(`${logPrefix} ${yellow("Outside emitted:")} ${path}`);
          return;
        }
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }
        await writeFile(path, content, "utf-8");
        record && emittedFiles.set(path, content);
      };
      const sourceFiles = program.getSourceFiles();
      for (const sourceFile of sourceFiles) {
        if (!filter(sourceFile.fileName)) continue;
        if (copyDtsFiles && dtsRE.test(sourceFile.fileName)) {
          setOutputFile(normalizePath(sourceFile.fileName), sourceFile.getFullText());
        }
        if (rootFiles.has(sourceFile.fileName)) {
          program.emit(
            sourceFile,
            (name, text) => {
              setOutputFile(
                resolve(publicRoot, relative(outDir, ensureAbsolute(name, outDir))),
                text
              );
            },
            undefined,
            true
          );
          rootFiles.delete(sourceFile.fileName);
        }
      }
      bundleDebug("emit output patch");
      const currentDir = host.getCurrentDirectory();
      const declarationFiles = /* @__PURE__ */ new Map();
      const mapFiles = /* @__PURE__ */ new Map();
      const prependMappings = /* @__PURE__ */ new Map();
      for (const [filePath, content] of outputFiles.entries()) {
        if (filePath.endsWith(".map")) {
          mapFiles.set(filePath, content);
        } else {
          declarationFiles.set(filePath, content);
        }
      }
      await runParallel(
        cpus().length,
        Array.from(declarationFiles.entries()),
        async ([filePath, content]) => {
          const newFilePath = resolve(
            outDir,
            relative(
              entryRoot,
              cleanVueFileName ? filePath.replace(".vue.d.ts", ".d.ts") : filePath
            )
          );
          if (content) {
            const result = transformCode({
              filePath,
              content,
              aliases,
              aliasesExclude,
              staticImport,
              clearPureImport,
              cleanVueFileName
            });
            content = result.content;
            declareModules.push(...result.declareModules);
            if (result.diffLineCount) {
              prependMappings.set(`${newFilePath}.map`, ";".repeat(result.diffLineCount));
            }
          }
          await writeOutput(newFilePath, content, outDir);
        }
      );
      await runParallel(
        cpus().length,
        Array.from(mapFiles.entries()),
        async ([filePath, content]) => {
          const baseDir = dirname(filePath);
          filePath = resolve(
            outDir,
            relative(
              entryRoot,
              cleanVueFileName ? filePath.replace(".vue.d.ts", ".d.ts") : filePath
            )
          );
          try {
            const sourceMap = JSON.parse(content);
            sourceMap.sources = sourceMap.sources.map((source) => {
              return normalizePath(
                relative(
                  dirname(filePath),
                  resolve(currentDir, relative(publicRoot, baseDir), source)
                )
              );
            });
            if (prependMappings.has(filePath)) {
              sourceMap.mappings = `${prependMappings.get(filePath)}${sourceMap.mappings}`;
            }
            content = JSON.stringify(sourceMap);
          } catch (e) {
            logger.warn(`${logPrefix} ${yellow("Processing source map fail:")} ${filePath}`);
          }
          await writeOutput(filePath, content, outDir);
        }
      );
      bundleDebug("write output");
      if (insertTypesEntry || rollupTypes) {
        const pkgPath = tryGetPkgPath(root);
        let pkg;
        try {
          pkg = pkgPath && existsSync(pkgPath) ? JSON.parse(await readFile(pkgPath, "utf-8")) : {};
        } catch (e) {
        }
        const entryNames = Object.keys(entries);
        const types = findTypesPath(pkg.publishConfig, pkg);
        const multiple = entryNames.length > 1;
        let typesPath = cleanPath(
          types ? resolve(root, types) : resolve(outDir, indexName),
          emittedFiles
        );
        if (!multiple && !dtsRE.test(typesPath)) {
          logger.warn(
            `
${logPrefix} ${yellow(
              "The resolved path of type entry is not ending with '.d.ts'."
            )}
`
          );
          typesPath = `${typesPath.replace(tjsRE, "")}.d.${extPrefix(typesPath)}ts`;
        }
        for (const name of entryNames) {
          const entryDtsPath = multiple ? cleanPath(resolve(outDir, tsToDts(name)), emittedFiles) : typesPath;
          if (existsSync(entryDtsPath)) continue;
          const sourceEntry = normalizePath(
            cleanPath(resolve(outDir, relative(entryRoot, tsToDts(entries[name]))), emittedFiles)
          );
          let fromPath = normalizePath(relative(dirname(entryDtsPath), sourceEntry));
          fromPath = fromPath.replace(dtsRE, "");
          fromPath = fullRelativeRE.test(fromPath) ? fromPath : `./${fromPath}`;
          let content = "export {}\n";
          if (emittedFiles.has(sourceEntry)) {
            if (hasNormalExport(emittedFiles.get(sourceEntry))) {
              content = `export * from '${fromPath}'
${content}`;
            }
            if (hasExportDefault(emittedFiles.get(sourceEntry))) {
              content += `import ${libName} from '${fromPath}'
export default ${libName}
${content}`;
            }
          }
          await writeOutput(cleanPath(entryDtsPath, emittedFiles), content, outDir);
        }
        bundleDebug("insert index");
        if (rollupTypes) {
          logger.info(green(`${logPrefix} Start rollup declaration files...`));
          const rollupFiles = /* @__PURE__ */ new Set();
          const compilerOptions2 = configPath ? getTsConfig(configPath, host.readFile).compilerOptions : rawCompilerOptions;
          const rollup = async (path) => {
            const result = rollupDeclarationFiles({
              root: publicRoot,
              configPath,
              compilerOptions: compilerOptions2,
              outDir,
              entryPath: path,
              fileName: basename(path),
              libFolder: getTsLibFolder(),
              rollupConfig,
              rollupOptions
            });
            emittedFiles.delete(path);
            rollupFiles.add(path);
            if (typeof afterRollup === "function") {
              await unwrapPromise(afterRollup(result));
            }
          };
          if (multiple) {
            await runParallel(cpus().length, entryNames, async (name) => {
              await rollup(cleanPath(resolve(outDir, tsToDts(name)), emittedFiles));
            });
          } else {
            await rollup(typesPath);
          }
          await runParallel(cpus().length, Array.from(emittedFiles.keys()), (f) => unlink(f));
          removeDirIfEmpty(outDir);
          emittedFiles.clear();
          const declared = declareModules.join("\n");
          await runParallel(cpus().length, [...rollupFiles], async (filePath) => {
            await writeOutput(
              filePath,
              await readFile(filePath, "utf-8") + (declared ? `
${declared}` : ""),
              dirname(filePath)
            );
          });
          bundleDebug("rollup output");
        }
      }
      if (outDirs.length > 1) {
        const extraOutDirs = outDirs.slice(1);
        await runParallel(cpus().length, Array.from(emittedFiles), async ([wroteFile, content]) => {
          const relativePath = relative(outDir, wroteFile);
          await Promise.all(
            extraOutDirs.map(async (targetOutDir) => {
              const path = resolve(targetOutDir, relativePath);
              if (wroteFile.endsWith(".map")) {
                if (!editSourceMapDir(content, outDir, targetOutDir)) {
                  logger.warn(`${logPrefix} ${yellow("Processing source map fail:")} ${path}`);
                }
              }
              await writeOutput(path, content, targetOutDir, false);
            })
          );
        });
      }
      diagnostics.length = 0;
      if (typeof afterBuild === "function") {
        await unwrapPromise(afterBuild(emittedFiles));
      }
      bundleDebug("finish");
      logger.info(
        green(`${logPrefix} Declaration files built in ${timeRecord + Date.now() - startTime}ms.
`)
      );
    },
    generateBundle(_, bundle) {
      if (declarationOnly) {
        for (const id of Object.keys(bundle)) {
          delete bundle[id];
        }
      }
    }
  };
}

export { dtsPlugin as default, editSourceMapDir };
