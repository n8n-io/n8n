"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stats = void 0;
const Stats = (statsAccumulator) => {
    return {
        ExternalDocs: {
            leave() {
                statsAccumulator.externalDocs.total++;
            },
        },
        ref: {
            enter(ref) {
                statsAccumulator.refs.items.add(ref['$ref']);
            },
        },
        Tag: {
            leave(tag) {
                statsAccumulator.tags.items.add(tag.name);
            },
        },
        Link: {
            leave(link) {
                statsAccumulator.links.items.add(link.operationId);
            },
        },
        Root: {
            leave() {
                statsAccumulator.parameters.total = statsAccumulator.parameters.items.size;
                statsAccumulator.refs.total = statsAccumulator.refs.items.size;
                statsAccumulator.links.total = statsAccumulator.links.items.size;
                statsAccumulator.tags.total = statsAccumulator.tags.items.size;
            },
        },
        WebhooksMap: {
            Operation: {
                leave(operation) {
                    statsAccumulator.webhooks.total++;
                    operation.tags &&
                        operation.tags.forEach((tag) => {
                            statsAccumulator.tags.items.add(tag);
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
                    leave(operation) {
                        statsAccumulator.operations.total++;
                        operation.tags &&
                            operation.tags.forEach((tag) => {
                                statsAccumulator.tags.items.add(tag);
                            });
                    },
                },
                Parameter: {
                    leave(parameter) {
                        statsAccumulator.parameters.items.add(parameter.name);
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
exports.Stats = Stats;
