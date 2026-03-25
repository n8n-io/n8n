import { yamlAndJsonSyncReader } from '../../utils';
import { isRef } from '../../ref-utils';

import type { Oas3Decorator } from '../../visitors';
import type { Oas3Operation, Oas3RequestBody, Oas3Response } from '../../typings/openapi';
import type { NonUndefined, ResolveFn, UserContext } from '../../walk';

export const MediaTypeExamplesOverride: Oas3Decorator = ({ operationIds }) => {
  return {
    Operation: {
      enter(operation: Oas3Operation, ctx: UserContext) {
        const operationId = operation.operationId;

        if (!operationId) {
          return;
        }

        const properties = operationIds[operationId];

        if (!properties) {
          return;
        }

        if (properties.responses && operation.responses) {
          for (const responseCode of Object.keys(properties.responses)) {
            const resolvedResponse = checkAndResolveRef<Oas3Response>(
              operation.responses[responseCode],
              ctx.resolve
            );

            if (!resolvedResponse) {
              continue;
            }

            resolvedResponse.content = resolvedResponse.content ? resolvedResponse.content : {};

            Object.keys(properties.responses[responseCode]).forEach((mimeType) => {
              resolvedResponse.content![mimeType] = {
                ...resolvedResponse.content![mimeType],
                examples: yamlAndJsonSyncReader(properties.responses[responseCode][mimeType]),
              };
            });

            operation.responses[responseCode] = resolvedResponse;
          }
        }

        if (properties.request && operation.requestBody) {
          const resolvedRequest = checkAndResolveRef<Oas3RequestBody>(
            operation.requestBody,
            ctx.resolve
          );

          if (!resolvedRequest) {
            return;
          }

          resolvedRequest.content = resolvedRequest.content ? resolvedRequest.content : {};

          Object.keys(properties.request).forEach((mimeType) => {
            resolvedRequest.content[mimeType] = {
              ...resolvedRequest.content[mimeType],
              examples: yamlAndJsonSyncReader(properties.request[mimeType]),
            };
          });
          operation.requestBody = resolvedRequest;
        }
      },
    },
  };
};

function checkAndResolveRef<T extends NonUndefined>(node: any, resolver: ResolveFn): T | undefined {
  if (!isRef(node)) {
    return node;
  }

  const resolved = resolver<T>(node);
  return resolved.error ? undefined : JSON.parse(JSON.stringify(resolved.node));
}
