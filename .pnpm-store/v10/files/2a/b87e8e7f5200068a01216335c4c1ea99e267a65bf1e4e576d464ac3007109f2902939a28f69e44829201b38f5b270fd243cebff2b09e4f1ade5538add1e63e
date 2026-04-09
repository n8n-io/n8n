import {parser} from "../dist/index.js"
import {fileTests} from "@lezer/generator/dist/test"
import {Tree, TreeFragment} from "@lezer/common"

describe("Incremental parsing", () => {
  // See https://github.com/codemirror/codemirror.next/issues/394
  it("doesn't reuse statements in the wrong body", () => {
    let input = `class StreamWriter:
    def __init__(self):
        pass

def a():
    pass

def b(self):
    """ ${"big block comment to fill up the reuse size quota\n  ".repeat(150)} """
    pass
`
    let ast = parser.parse(input)
    let at = input.indexOf("pass")
    input = input.slice(0, at) + " " + input.slice(at)
    let cache = TreeFragment.applyChanges(TreeFragment.addTree(ast), [{fromA: at, toA: at, fromB: at, toB: at + 1}])
    let ast2 = parser.parse(input, cache)
    if (ast2.toString() != ast.toString()) throw new Error("Malformed tree")

    let lastFunc = ast => {
      let cur = ast.cursor(ast.length)
      while (cur.type.name != "FunctionDefinition") cur.prev()
      return cur.tree
    }
    if (lastFunc(ast) != lastFunc(ast2)) throw new Error("No reuse")
  })
})
