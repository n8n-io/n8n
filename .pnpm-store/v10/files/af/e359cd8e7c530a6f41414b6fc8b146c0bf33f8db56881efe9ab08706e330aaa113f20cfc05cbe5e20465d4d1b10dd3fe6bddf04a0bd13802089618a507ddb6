interface ExtractorField {
    key: string;
    localPath: string[] | string[][];
    attributes: string[];
    index?: string[];
    attributePath?: string[];
    context?: boolean;
}
export type ExtractorFields = ExtractorField[];
export declare const loginRequestFields: ExtractorFields;
export declare const loginResponseStatusFields: {
    key: string;
    localPath: string[];
    attributes: string[];
}[];
export declare const logoutResponseStatusFields: {
    key: string;
    localPath: string[];
    attributes: string[];
}[];
export declare const loginResponseFields: ((assertion: any) => ExtractorFields);
export declare const logoutRequestFields: ExtractorFields;
export declare const logoutResponseFields: ExtractorFields;
export declare function extract(context: string, fields: any): any;
export {};
