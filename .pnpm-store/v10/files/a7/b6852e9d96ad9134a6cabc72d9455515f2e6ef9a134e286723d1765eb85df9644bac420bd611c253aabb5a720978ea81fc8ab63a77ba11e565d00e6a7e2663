import type {CodeKeywordDefinition, AnySchemaObject, KeywordErrorDefinition} from "../../types"
import type {KeywordCxt} from "../../compile/validate"
import {_, getProperty, Name} from "../../compile/codegen"
import {DiscrError, DiscrErrorObj} from "../discriminator/types"
import {resolveRef, SchemaEnv} from "../../compile"
import {schemaHasRulesButRef} from "../../compile/util"

export type DiscriminatorError = DiscrErrorObj<DiscrError.Tag> | DiscrErrorObj<DiscrError.Mapping>

const error: KeywordErrorDefinition = {
  message: ({params: {discrError, tagName}}) =>
    discrError === DiscrError.Tag
      ? `tag "${tagName}" must be string`
      : `value of tag "${tagName}" must be in oneOf or anyOf`,
  params: ({params: {discrError, tag, tagName}}) =>
    _`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`,
}

const def: CodeKeywordDefinition = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error,
  code(cxt: KeywordCxt) {
    const {gen, data, schema, parentSchema, it} = cxt

    const keyword = parentSchema.oneOf ? "oneOf" : parentSchema.anyOf ? "anyOf" : undefined

    if (!it.opts.discriminator) {
      throw new Error("discriminator: requires discriminator option")
    }
    const tagName = schema.propertyName
    if (typeof tagName != "string") throw new Error("discriminator: requires propertyName")
    if (!keyword) throw new Error("discriminator: requires oneOf or anyOf composite keyword")
    const parentSchemaVariants = parentSchema[keyword]
    const valid = gen.let("valid", false)
    const tag = gen.const("tag", _`${data}${getProperty(tagName)}`)
    gen.if(
      _`typeof ${tag} == "string"`,
      () => validateMapping(),
      () => cxt.error(false, {discrError: DiscrError.Tag, tag, tagName})
    )
    cxt.ok(valid)

    function validateMapping(): void {
      const mapping = getMapping()
      gen.if(false)
      for (const tagValue in mapping) {
        gen.elseIf(_`${tag} === ${tagValue}`)
        gen.assign(valid, applyTagSchema(mapping[tagValue]))
      }
      gen.else()
      cxt.error(false, {discrError: DiscrError.Mapping, tag, tagName})
      gen.endIf()
    }

    function applyTagSchema(schemaProp?: number): Name {
      const _valid = gen.name("valid")
      const schCxt = cxt.subschema({keyword, schemaProp}, _valid)
      cxt.mergeEvaluated(schCxt, Name)
      return _valid
    }

    function getMapping(): {[T in string]?: number} {
      const discriminatorMapping: {[T in string]?: number} = {}
      const topRequired = hasRequired(parentSchema)
      let tagRequired = true
      for (let i = 0; i < parentSchemaVariants.length; i++) {
        let sch = parentSchemaVariants[i]
        const schRef = sch?.$ref

        if (schRef && schema.mapping) {
          const {mapping} = schema
          const matchedKeys = Object.keys(mapping).filter((key) => mapping[key] === sch.$ref)

          if (matchedKeys.length) {
            for (const key of matchedKeys) {
              addMapping(key, i)
            }
            continue
          }
        }

        if (schRef && !schemaHasRulesButRef(sch, it.self.RULES)) {
          sch = resolveRef.call(it.self, it.schemaEnv.root, it.baseId, schRef)
          if (sch instanceof SchemaEnv) sch = sch.schema
        }
        const propSch = sch?.properties?.[tagName]

        if (typeof propSch != "object") {
          throw new Error(
            `discriminator: ${keyword} subschemas (or referenced schemas) must have "properties/${tagName}" or match mapping`
          )
        }
        tagRequired = tagRequired && (topRequired || hasRequired(sch))
        addMappings(propSch, i)
      }
      if (!tagRequired) throw new Error(`discriminator: "${tagName}" must be required`)
      return discriminatorMapping

      function hasRequired({required}: AnySchemaObject): boolean {
        return Array.isArray(required) && required.includes(tagName)
      }

      function addMappings(sch: AnySchemaObject, i: number): void {
        if (sch.const) {
          addMapping(sch.const, i)
        } else if (sch.enum) {
          for (const tagValue of sch.enum) {
            addMapping(tagValue, i)
          }
        } else {
          throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`)
        }
      }

      function addMapping(tagValue: unknown, i: number): void {
        if (typeof tagValue != "string" || tagValue in discriminatorMapping) {
          throw new Error(`discriminator: "${tagName}" values must be unique strings`)
        }
        discriminatorMapping[tagValue] = i
      }
    }
  },
}

export default def
