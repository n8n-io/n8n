import { RedisCommandArguments } from '.';
import { FunctionListItemReply, FunctionListRawItemReply } from './generic-transformers';
export declare function transformArguments(pattern?: string): RedisCommandArguments;
type FunctionListWithCodeRawItemReply = [
    ...FunctionListRawItemReply,
    'library_code',
    string
];
interface FunctionListWithCodeItemReply extends FunctionListItemReply {
    libraryCode: string;
}
export declare function transformReply(reply: Array<FunctionListWithCodeRawItemReply>): Array<FunctionListWithCodeItemReply>;
export {};
