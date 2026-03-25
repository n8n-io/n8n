import type {
  CodeKeywordDefinition,
  ErrorObject,
  KeywordCxt,
  KeywordErrorDefinition,
} from "ajv/dist/core"
import type {KeywordErrorCxt} from "ajv/dist/types"
import {_, str, Code} from "ajv/dist/core"
import {operators} from "ajv/dist/compile/codegen"

const ops = operators

export type LimitKwd = "maximum" | "minimum"

export type ExclusiveLimitKwd = "exclusiveMaximum" | "exclusiveMinimum"

type Comparison = "<=" | ">=" | "<" | ">"

interface KwdOp {
  okStr: Comparison
  ok: Code
  fail: Code
}

interface KwdDef {
  exclusive: ExclusiveLimitKwd
  ops: [KwdOp, KwdOp]
}

const KWDs: {[K in LimitKwd]: KwdDef} = {
  maximum: {
    exclusive: "exclusiveMaximum",
    ops: [
      {okStr: "<=", ok: ops.LTE, fail: ops.GT},
      {okStr: "<", ok: ops.LT, fail: ops.GTE},
    ],
  },
  minimum: {
    exclusive: "exclusiveMinimum",
    ops: [
      {okStr: ">=", ok: ops.GTE, fail: ops.LT},
      {okStr: ">", ok: ops.GT, fail: ops.LTE},
    ],
  },
}

export type LimitNumberError = ErrorObject<
  LimitKwd,
  {limit: number; comparison: Comparison},
  number | {$data: string}
>

const error: KeywordErrorDefinition = {
  message: (cxt) => str`must be ${kwdOp(cxt).okStr} ${cxt.schemaCode}`,
  params: (cxt) => _`{comparison: ${kwdOp(cxt).okStr}, limit: ${cxt.schemaCode}}`,
}

const def: CodeKeywordDefinition = {
  keyword: Object.keys(KWDs),
  type: "number",
  schemaType: "number",
  $data: true,
  error,
  code(cxt: KeywordCxt) {
    const {data, schemaCode} = cxt
    cxt.fail$data(_`${data} ${kwdOp(cxt).fail} ${schemaCode} || isNaN(${data})`)
  },
}

function kwdOp(cxt: KeywordErrorCxt): KwdOp {
  const keyword = cxt.keyword as LimitKwd
  const opsIdx = cxt.parentSchema?.[KWDs[keyword].exclusive] ? 1 : 0
  return KWDs[keyword].ops[opsIdx]
}

export default def
