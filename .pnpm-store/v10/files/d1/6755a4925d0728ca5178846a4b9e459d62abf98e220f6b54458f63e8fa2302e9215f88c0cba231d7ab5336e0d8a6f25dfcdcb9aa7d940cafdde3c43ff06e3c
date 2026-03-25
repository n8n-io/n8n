import type {CodeKeywordDefinition, ErrorObject, KeywordErrorDefinition} from "../../types"
import type {KeywordCxt} from "../../compile/validate"
import {usePattern} from "../code"
import {_, str} from "../../compile/codegen"

export type PatternError = ErrorObject<"pattern", {pattern: string}, string | {$data: string}>

const error: KeywordErrorDefinition = {
  message: ({schemaCode}) => str`must match pattern "${schemaCode}"`,
  params: ({schemaCode}) => _`{pattern: ${schemaCode}}`,
}

const def: CodeKeywordDefinition = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: true,
  error,
  code(cxt: KeywordCxt) {
    const {data, $data, schema, schemaCode, it} = cxt
    // TODO regexp should be wrapped in try/catchs
    const u = it.opts.unicodeRegExp ? "u" : ""
    const regExp = $data ? _`(new RegExp(${schemaCode}, ${u}))` : usePattern(cxt, schema)
    cxt.fail$data(_`!${regExp}.test(${data})`)
  },
}

export default def
