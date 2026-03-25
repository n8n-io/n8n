import Mark = require("./mark");
declare class YAMLException {
    message: string;
    reason: string;
    name: string;
    mark: Mark;
    isWarning: boolean;
    private static CLASS_IDENTIFIER;
    static isInstance(instance: any): instance is YAMLException;
    getClassIdentifier(): string[];
    constructor(reason: string, mark?: Mark, isWarning?: boolean);
    toString(compact?: boolean): any;
}
export = YAMLException;
