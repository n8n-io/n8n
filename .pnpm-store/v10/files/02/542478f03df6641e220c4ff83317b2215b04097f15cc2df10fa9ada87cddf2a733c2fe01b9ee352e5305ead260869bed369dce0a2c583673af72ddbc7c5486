"use strict"

// external tooling
const valueParser = require("postcss-value-parser")

// extended tooling
const { stringify } = valueParser

function split(params, start) {
  const list = []
  const last = params.reduce((item, node, index) => {
    if (index < start) return ""
    if (node.type === "div" && node.value === ",") {
      list.push(item)
      return ""
    }
    return item + stringify(node)
  }, "")
  list.push(last)
  return list
}

module.exports = function (result, styles) {
  const statements = []
  let nodes = []

  styles.each(node => {
    let stmt
    if (node.type === "atrule") {
      if (node.name === "import") stmt = parseImport(result, node)
      else if (node.name === "media") stmt = parseMedia(result, node)
      else if (node.name === "charset") stmt = parseCharset(result, node)
    }

    if (stmt) {
      if (nodes.length) {
        statements.push({
          type: "nodes",
          nodes,
          media: [],
          layer: [],
        })
        nodes = []
      }
      statements.push(stmt)
    } else nodes.push(node)
  })

  if (nodes.length) {
    statements.push({
      type: "nodes",
      nodes,
      media: [],
      layer: [],
    })
  }

  return statements
}

function parseMedia(result, atRule) {
  const params = valueParser(atRule.params).nodes
  return {
    type: "media",
    node: atRule,
    media: split(params, 0),
    layer: [],
  }
}

function parseCharset(result, atRule) {
  if (atRule.prev()) {
    return result.warn("@charset must precede all other statements", {
      node: atRule,
    })
  }
  return {
    type: "charset",
    node: atRule,
    media: [],
    layer: [],
  }
}

function parseImport(result, atRule) {
  let prev = atRule.prev()
  if (prev) {
    do {
      if (
        prev.type !== "comment" &&
        (prev.type !== "atrule" ||
          (prev.name !== "import" &&
            prev.name !== "charset" &&
            !(prev.name === "layer" && !prev.nodes)))
      ) {
        return result.warn(
          "@import must precede all other statements (besides @charset or empty @layer)",
          { node: atRule }
        )
      }
      prev = prev.prev()
    } while (prev)
  }

  if (atRule.nodes) {
    return result.warn(
      "It looks like you didn't end your @import statement correctly. " +
        "Child nodes are attached to it.",
      { node: atRule }
    )
  }

  const params = valueParser(atRule.params).nodes
  const stmt = {
    type: "import",
    node: atRule,
    media: [],
    layer: [],
  }

  // prettier-ignore
  if (
    !params.length ||
    (
      params[0].type !== "string" ||
      !params[0].value
    ) &&
    (
      params[0].type !== "function" ||
      params[0].value !== "url" ||
      !params[0].nodes.length ||
      !params[0].nodes[0].value
    )
  ) {
    return result.warn(`Unable to find uri in '${  atRule.toString()  }'`, {
      node: atRule,
    })
  }

  if (params[0].type === "string") stmt.uri = params[0].value
  else stmt.uri = params[0].nodes[0].value
  stmt.fullUri = stringify(params[0])

  let remainder = params
  if (remainder.length > 2) {
    if (
      (remainder[2].type === "word" || remainder[2].type === "function") &&
      remainder[2].value === "layer"
    ) {
      if (remainder[1].type !== "space") {
        return result.warn("Invalid import layer statement", { node: atRule })
      }

      if (remainder[2].nodes) {
        stmt.layer = [stringify(remainder[2].nodes)]
      } else {
        stmt.layer = [""]
      }
      remainder = remainder.slice(2)
    }
  }

  if (remainder.length > 2) {
    if (remainder[1].type !== "space") {
      return result.warn("Invalid import media statement", { node: atRule })
    }

    stmt.media = split(remainder, 2)
  }

  return stmt
}
