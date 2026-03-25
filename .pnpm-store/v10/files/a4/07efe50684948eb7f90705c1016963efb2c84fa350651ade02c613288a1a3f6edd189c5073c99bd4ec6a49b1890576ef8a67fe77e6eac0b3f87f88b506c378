import { ConfigGetResult, ConfigListSummary, ConfigValues } from '../../../typings';
export declare class ConfigList implements ConfigListSummary {
    files: string[];
    values: {
        [fileName: string]: ConfigValues;
    };
    private _all;
    get all(): ConfigValues;
    addFile(file: string): ConfigValues;
    addValue(file: string, key: string, value: string): void;
}
export declare function configListParser(text: string): ConfigList;
export declare function configGetParser(text: string, key: string): ConfigGetResult;
