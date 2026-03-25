import { InfoRawReply, InfoReply } from './INFO';
export { IS_READ_ONLY, FIRST_KEY_INDEX } from './INFO';
export declare function transformArguments(key: string): Array<string>;
type InfoDebugRawReply = [
    ...InfoRawReply,
    'keySelfName',
    string,
    'chunks',
    Array<[
        'startTimestamp',
        number,
        'endTimestamp',
        number,
        'samples',
        number,
        'size',
        number,
        'bytesPerSample',
        string
    ]>
];
interface InfoDebugReply extends InfoReply {
    keySelfName: string;
    chunks: Array<{
        startTimestamp: number;
        endTimestamp: number;
        samples: number;
        size: number;
        bytesPerSample: string;
    }>;
}
export declare function transformReply(rawReply: InfoDebugRawReply): InfoDebugReply;
