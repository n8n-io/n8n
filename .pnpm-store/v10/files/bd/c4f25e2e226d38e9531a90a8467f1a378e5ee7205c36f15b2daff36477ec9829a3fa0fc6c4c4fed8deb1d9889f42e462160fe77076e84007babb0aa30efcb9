import { Version1Options } from './types.js';
type V1State = {
    node?: Uint8Array;
    clockseq?: number;
    msecs?: number;
    nsecs?: number;
};
declare function v1(options?: Version1Options, buf?: undefined, offset?: number): string;
declare function v1<Buf extends Uint8Array = Uint8Array>(options: Version1Options | undefined, buf: Buf, offset?: number): Buf;
export declare function updateV1State(state: V1State, now: number, rnds: Uint8Array): V1State;
export default v1;
