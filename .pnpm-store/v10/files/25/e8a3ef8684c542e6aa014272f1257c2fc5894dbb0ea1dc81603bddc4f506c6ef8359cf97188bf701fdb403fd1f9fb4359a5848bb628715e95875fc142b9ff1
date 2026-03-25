import type {Vocabulary} from "ajv/dist/core"
import coreVocabulary from "./core"
import validationDraft4 from "./validation"
import getApplicatorVocabulary from "ajv/dist/vocabularies/applicator"
import formatVocabulary from "ajv/dist/vocabularies/format"

const metadataVocabulary: Vocabulary = ["title", "description", "default"]

const draft4Vocabularies: Vocabulary[] = [
  coreVocabulary,
  validationDraft4,
  getApplicatorVocabulary(),
  formatVocabulary,
  metadataVocabulary,
]

export default draft4Vocabularies
