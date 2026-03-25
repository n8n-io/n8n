import Connection from '../connection/index.js';
import { WeaviateObjectsList } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { ObjectsPath } from './path.js';
export default class Getter extends CommandBase {
    private additional;
    private after;
    private className?;
    private limit?;
    private tenant?;
    private objectsPath;
    constructor(client: Connection, objectsPath: ObjectsPath);
    withClassName: (className: string) => this;
    withAfter: (id: string) => this;
    withLimit: (limit: number) => this;
    withTenant: (tenant: string) => this;
    extendAdditional: (prop: string) => this;
    withAdditional: (additionalFlag: any) => this;
    withVector: () => this;
    validate(): void;
    do: () => Promise<WeaviateObjectsList>;
}
