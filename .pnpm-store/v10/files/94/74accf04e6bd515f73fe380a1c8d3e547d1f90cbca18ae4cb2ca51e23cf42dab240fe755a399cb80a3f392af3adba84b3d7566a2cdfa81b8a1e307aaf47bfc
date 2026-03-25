import type { RequestDocument } from './types.js'
import type { DocumentNode, OperationDefinitionNode } from 'graphql'
import { parse, print } from 'graphql'

/**
 * helpers
 */

const extractOperationName = (document: DocumentNode): string | undefined => {
  let operationName = undefined

  const operationDefinitions = document.definitions.filter(
    (definition) => definition.kind === `OperationDefinition`
  ) as OperationDefinitionNode[]

  if (operationDefinitions.length === 1) {
    operationName = operationDefinitions[0]?.name?.value
  }

  return operationName
}

export const resolveRequestDocument = (
  document: RequestDocument
): { query: string; operationName?: string } => {
  if (typeof document === `string`) {
    let operationName = undefined

    try {
      const parsedDocument = parse(document)
      operationName = extractOperationName(parsedDocument)
    } catch (err) {
      // Failed parsing the document, the operationName will be undefined
    }

    return { query: document, operationName }
  }

  const operationName = extractOperationName(document)

  return { query: print(document), operationName }
}
