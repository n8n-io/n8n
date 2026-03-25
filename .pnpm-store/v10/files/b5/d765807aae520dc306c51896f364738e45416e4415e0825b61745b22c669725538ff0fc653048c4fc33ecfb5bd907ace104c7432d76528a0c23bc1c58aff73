import type { Oas3Parameter, OasRef, Oas3Tag } from '../../typings/openapi';
import type { Oas2Parameter } from '../../typings/swagger';
import type { StatsAccumulator } from '../../typings/common';

export const Stats = (statsAccumulator: StatsAccumulator) => {
  return {
    ExternalDocs: {
      leave() {
        statsAccumulator.externalDocs.total++;
      },
    },
    ref: {
      enter(ref: OasRef) {
        statsAccumulator.refs.items!.add(ref['$ref']);
      },
    },
    Tag: {
      leave(tag: Oas3Tag) {
        statsAccumulator.tags.items!.add(tag.name);
      },
    },
    Link: {
      leave(link: any) {
        statsAccumulator.links.items!.add(link.operationId);
      },
    },
    Root: {
      leave() {
        statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        statsAccumulator.links.total = statsAccumulator.links.items!.size;
        statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
      },
    },
    WebhooksMap: {
      Operation: {
        leave(operation: any) {
          statsAccumulator.webhooks.total++;
          operation.tags &&
            operation.tags.forEach((tag: string) => {
              statsAccumulator.tags.items!.add(tag);
            });
        },
      },
    },
    Paths: {
      PathItem: {
        leave() {
          statsAccumulator.pathItems.total++;
        },
        Operation: {
          leave(operation: any) {
            statsAccumulator.operations.total++;
            operation.tags &&
              operation.tags.forEach((tag: string) => {
                statsAccumulator.tags.items!.add(tag);
              });
          },
        },
        Parameter: {
          leave(parameter: Oas2Parameter | Oas3Parameter) {
            statsAccumulator.parameters.items!.add(parameter.name);
          },
        },
      },
    },
    NamedSchemas: {
      Schema: {
        leave() {
          statsAccumulator.schemas.total++;
        },
      },
    },
  };
};
