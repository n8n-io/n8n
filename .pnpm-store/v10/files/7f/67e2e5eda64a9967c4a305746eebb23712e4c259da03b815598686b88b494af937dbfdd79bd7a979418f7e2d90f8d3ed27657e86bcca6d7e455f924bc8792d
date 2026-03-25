import type {
  CodeKeywordDefinition,
  // ErrorObject,
  KeywordCxt,
  // KeywordErrorDefinition,
} from "ajv/dist/core"
import {LimitKwd, ExclusiveLimitKwd} from "./limitNumber"

const KWDs: {[K in ExclusiveLimitKwd]: LimitKwd} = {
  exclusiveMaximum: "maximum",
  exclusiveMinimum: "minimum",
}

const def: CodeKeywordDefinition = {
  keyword: Object.keys(KWDs),
  type: "number",
  schemaType: "boolean",
  code({keyword, parentSchema}: KeywordCxt) {
    const limitKwd = KWDs[keyword as ExclusiveLimitKwd]
    if (parentSchema[limitKwd] === undefined) {
      throw new Error(`${keyword} can only be used with ${limitKwd}`)
    }
  },
}

export default def
