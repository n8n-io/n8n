import { LangChainBaseMessage } from "../schemas.js";
export declare function isLangChainMessage(message?: any): message is LangChainBaseMessage;
interface ConvertedData {
    content: string;
    [key: string]: any;
}
export declare function convertLangChainMessageToExample(message: LangChainBaseMessage): {
    type: string;
    data: ConvertedData;
};
export {};
