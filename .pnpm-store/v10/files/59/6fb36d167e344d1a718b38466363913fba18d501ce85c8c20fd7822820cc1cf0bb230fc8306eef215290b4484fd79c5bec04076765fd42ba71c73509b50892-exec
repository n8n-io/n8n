"use strict"
// builtin tooling
const path = require("path")

// internal tooling
const joinMedia = require("./lib/join-media")
const joinLayer = require("./lib/join-layer")
const resolveId = require("./lib/resolve-id")
const loadContent = require("./lib/load-content")
const processContent = require("./lib/process-content")
const parseStatements = require("./lib/parse-statements")
const assignLayerNames = require("./lib/assign-layer-names")
const dataURL = require("./lib/data-url")

function AtImport(options) {
  options = {
    root: process.cwd(),
    path: [],
    skipDuplicates: true,
    resolve: resolveId,
    load: loadContent,
    plugins: [],
    addModulesDirectories: [],
    nameLayer: null,
    ...options,
  }

  options.root = path.resolve(options.root)

  // convert string to an array of a single element
  if (typeof options.path === "string") options.path = [options.path]

  if (!Array.isArray(options.path)) options.path = []

  options.path = options.path.map(p => path.resolve(options.root, p))

  return {
    postcssPlugin: "postcss-import",
    Once(styles, { result, atRule, postcss }) {
      const state = {
        importedFiles: {},
        hashFiles: {},
        rootFilename: null,
        anonymousLayerCounter: 0,
      }

      if (styles.source?.input?.file) {
        state.rootFilename = styles.source.input.file
        state.importedFiles[styles.source.input.file] = {}
      }

      if (options.plugins && !Array.isArray(options.plugins)) {
        throw new Error("plugins option must be an array")
      }

      if (options.nameLayer && typeof options.nameLayer !== "function") {
        throw new Error("nameLayer option must be a function")
      }

      return parseStyles(result, styles, options, state, [], []).then(
        bundle => {
          applyRaws(bundle)
          applyMedia(bundle)
          applyStyles(bundle, styles)
        }
      )

      function applyRaws(bundle) {
        bundle.forEach((stmt, index) => {
          if (index === 0) return

          if (stmt.parent) {
            const { before } = stmt.parent.node.raws
            if (stmt.type === "nodes") stmt.nodes[0].raws.before = before
            else stmt.node.raws.before = before
          } else if (stmt.type === "nodes") {
            stmt.nodes[0].raws.before = stmt.nodes[0].raws.before || "\n"
          }
        })
      }

      function applyMedia(bundle) {
        bundle.forEach(stmt => {
          if (
            (!stmt.media.length && !stmt.layer.length) ||
            stmt.type === "charset"
          ) {
            return
          }

          if (stmt.layer.length > 1) {
            assignLayerNames(stmt.layer, stmt.node, state, options)
          }

          if (stmt.type === "import") {
            const parts = [stmt.fullUri]

            const media = stmt.media.join(", ")

            if (stmt.layer.length) {
              const layerName = stmt.layer.join(".")

              let layerParams = "layer"
              if (layerName) {
                layerParams = `layer(${layerName})`
              }

              parts.push(layerParams)
            }

            if (media) {
              parts.push(media)
            }

            stmt.node.params = parts.join(" ")
          } else if (stmt.type === "media") {
            if (stmt.layer.length) {
              const layerNode = atRule({
                name: "layer",
                params: stmt.layer.join("."),
                source: stmt.node.source,
              })

              if (stmt.parentMedia?.length) {
                const mediaNode = atRule({
                  name: "media",
                  params: stmt.parentMedia.join(", "),
                  source: stmt.node.source,
                })

                mediaNode.append(layerNode)
                layerNode.append(stmt.node)
                stmt.node = mediaNode
              } else {
                layerNode.append(stmt.node)
                stmt.node = layerNode
              }
            } else {
              stmt.node.params = stmt.media.join(", ")
            }
          } else {
            const { nodes } = stmt
            const { parent } = nodes[0]

            let outerAtRule
            let innerAtRule
            if (stmt.media.length && stmt.layer.length) {
              const mediaNode = atRule({
                name: "media",
                params: stmt.media.join(", "),
                source: parent.source,
              })

              const layerNode = atRule({
                name: "layer",
                params: stmt.layer.join("."),
                source: parent.source,
              })

              mediaNode.append(layerNode)
              innerAtRule = layerNode
              outerAtRule = mediaNode
            } else if (stmt.media.length) {
              const mediaNode = atRule({
                name: "media",
                params: stmt.media.join(", "),
                source: parent.source,
              })

              innerAtRule = mediaNode
              outerAtRule = mediaNode
            } else if (stmt.layer.length) {
              const layerNode = atRule({
                name: "layer",
                params: stmt.layer.join("."),
                source: parent.source,
              })

              innerAtRule = layerNode
              outerAtRule = layerNode
            }

            parent.insertBefore(nodes[0], outerAtRule)

            // remove nodes
            nodes.forEach(node => {
              node.parent = undefined
            })

            // better output
            nodes[0].raws.before = nodes[0].raws.before || "\n"

            // wrap new rules with media query and/or layer at rule
            innerAtRule.append(nodes)

            stmt.type = "media"
            stmt.node = outerAtRule
            delete stmt.nodes
          }
        })
      }

      function applyStyles(bundle, styles) {
        styles.nodes = []

        // Strip additional statements.
        bundle.forEach(stmt => {
          if (["charset", "import", "media"].includes(stmt.type)) {
            stmt.node.parent = undefined
            styles.append(stmt.node)
          } else if (stmt.type === "nodes") {
            stmt.nodes.forEach(node => {
              node.parent = undefined
              styles.append(node)
            })
          }
        })
      }

      function parseStyles(result, styles, options, state, media, layer) {
        const statements = parseStatements(result, styles)

        return Promise.resolve(statements)
          .then(stmts => {
            // process each statement in series
            return stmts.reduce((promise, stmt) => {
              return promise.then(() => {
                stmt.media = joinMedia(media, stmt.media || [])
                stmt.parentMedia = media
                stmt.layer = joinLayer(layer, stmt.layer || [])

                // skip protocol base uri (protocol://url) or protocol-relative
                if (
                  stmt.type !== "import" ||
                  /^(?:[a-z]+:)?\/\//i.test(stmt.uri)
                ) {
                  return
                }

                if (options.filter && !options.filter(stmt.uri)) {
                  // rejected by filter
                  return
                }

                return resolveImportId(result, stmt, options, state)
              })
            }, Promise.resolve())
          })
          .then(() => {
            let charset
            const imports = []
            const bundle = []

            function handleCharset(stmt) {
              if (!charset) charset = stmt
              // charsets aren't case-sensitive, so convert to lower case to compare
              else if (
                stmt.node.params.toLowerCase() !==
                charset.node.params.toLowerCase()
              ) {
                throw new Error(
                  `Incompatable @charset statements:
  ${stmt.node.params} specified in ${stmt.node.source.input.file}
  ${charset.node.params} specified in ${charset.node.source.input.file}`
                )
              }
            }

            // squash statements and their children
            statements.forEach(stmt => {
              if (stmt.type === "charset") handleCharset(stmt)
              else if (stmt.type === "import") {
                if (stmt.children) {
                  stmt.children.forEach((child, index) => {
                    if (child.type === "import") imports.push(child)
                    else if (child.type === "charset") handleCharset(child)
                    else bundle.push(child)
                    // For better output
                    if (index === 0) child.parent = stmt
                  })
                } else imports.push(stmt)
              } else if (stmt.type === "media" || stmt.type === "nodes") {
                bundle.push(stmt)
              }
            })

            return charset
              ? [charset, ...imports.concat(bundle)]
              : imports.concat(bundle)
          })
      }

      function resolveImportId(result, stmt, options, state) {
        if (dataURL.isValid(stmt.uri)) {
          return loadImportContent(result, stmt, stmt.uri, options, state).then(
            result => {
              stmt.children = result
            }
          )
        }

        const atRule = stmt.node
        let sourceFile
        if (atRule.source?.input?.file) {
          sourceFile = atRule.source.input.file
        }
        const base = sourceFile
          ? path.dirname(atRule.source.input.file)
          : options.root

        return Promise.resolve(options.resolve(stmt.uri, base, options))
          .then(paths => {
            if (!Array.isArray(paths)) paths = [paths]
            // Ensure that each path is absolute:
            return Promise.all(
              paths.map(file => {
                return !path.isAbsolute(file)
                  ? resolveId(file, base, options)
                  : file
              })
            )
          })
          .then(resolved => {
            // Add dependency messages:
            resolved.forEach(file => {
              result.messages.push({
                type: "dependency",
                plugin: "postcss-import",
                file,
                parent: sourceFile,
              })
            })

            return Promise.all(
              resolved.map(file => {
                return loadImportContent(result, stmt, file, options, state)
              })
            )
          })
          .then(result => {
            // Merge loaded statements
            stmt.children = result.reduce((result, statements) => {
              return statements ? result.concat(statements) : result
            }, [])
          })
      }

      function loadImportContent(result, stmt, filename, options, state) {
        const atRule = stmt.node
        const { media, layer } = stmt

        assignLayerNames(layer, atRule, state, options)

        if (options.skipDuplicates) {
          // skip files already imported at the same scope
          if (state.importedFiles[filename]?.[media]?.[layer]) {
            return
          }

          // save imported files to skip them next time
          if (!state.importedFiles[filename]) {
            state.importedFiles[filename] = {}
          }
          if (!state.importedFiles[filename][media]) {
            state.importedFiles[filename][media] = {}
          }
          state.importedFiles[filename][media][layer] = true
        }

        return Promise.resolve(options.load(filename, options)).then(
          content => {
            if (content.trim() === "") {
              result.warn(`${filename} is empty`, { node: atRule })
              return
            }

            // skip previous imported files not containing @import rules
            if (state.hashFiles[content]?.[media]?.[layer]) {
              return
            }

            return processContent(
              result,
              content,
              filename,
              options,
              postcss
            ).then(importedResult => {
              const styles = importedResult.root
              result.messages = result.messages.concat(importedResult.messages)

              if (options.skipDuplicates) {
                const hasImport = styles.some(child => {
                  return child.type === "atrule" && child.name === "import"
                })
                if (!hasImport) {
                  // save hash files to skip them next time
                  if (!state.hashFiles[content]) {
                    state.hashFiles[content] = {}
                  }
                  if (!state.hashFiles[content][media]) {
                    state.hashFiles[content][media] = {}
                  }
                  state.hashFiles[content][media][layer] = true
                }
              }

              // recursion: import @import from imported file
              return parseStyles(result, styles, options, state, media, layer)
            })
          }
        )
      }
    },
  }
}

AtImport.postcss = true

module.exports = AtImport
