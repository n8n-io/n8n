import Connection from '../connection/index.js';
import { Classification } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ClassificationsScheduler extends CommandBase {
    private basedOnProperties?;
    private classifyProperties?;
    private className?;
    private settings?;
    private type?;
    private waitForCompletion;
    private waitTimeout;
    constructor(client: Connection);
    withType: (type: string) => this;
    withSettings: (settings: any) => this;
    withClassName: (className: string) => this;
    withClassifyProperties: (props: string[]) => this;
    withBasedOnProperties: (props: string[]) => this;
    withWaitForCompletion: () => this;
    withWaitTimeout: (timeout: number) => this;
    validateIsSet: (prop: string | undefined | null | any[], name: string, setter: string) => void;
    validateClassName: () => void;
    validateBasedOnProperties: () => void;
    validateClassifyProperties: () => void;
    validate: () => void;
    payload: () => Classification;
    pollForCompletion: (id: any) => Promise<Classification>;
    do: () => Promise<Classification>;
}
