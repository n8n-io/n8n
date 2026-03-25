import type { Oas3Parameter, OasRef, Oas3Tag } from '../../typings/openapi';
import type { Oas2Parameter } from '../../typings/swagger';
import type { StatsAccumulator } from '../../typings/common';
export declare const Stats: (statsAccumulator: StatsAccumulator) => {
    ExternalDocs: {
        leave(): void;
    };
    ref: {
        enter(ref: OasRef): void;
    };
    Tag: {
        leave(tag: Oas3Tag): void;
    };
    Link: {
        leave(link: any): void;
    };
    Root: {
        leave(): void;
    };
    WebhooksMap: {
        Operation: {
            leave(operation: any): void;
        };
    };
    Paths: {
        PathItem: {
            leave(): void;
            Operation: {
                leave(operation: any): void;
            };
            Parameter: {
                leave(parameter: Oas2Parameter | Oas3Parameter): void;
            };
        };
    };
    NamedSchemas: {
        Schema: {
            leave(): void;
        };
    };
};
