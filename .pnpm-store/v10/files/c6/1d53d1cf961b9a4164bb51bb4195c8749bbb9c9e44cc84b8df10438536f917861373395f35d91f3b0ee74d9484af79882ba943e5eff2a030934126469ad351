import { Version7Options } from './types.js';
type V7State = {
    msecs?: number;
    seq?: number;
};
declare function v7(options?: Version7Options, buf?: undefined, offset?: number): string;
declare function v7<TBuf extends Uint8Array = Uint8Array>(options: Version7Options | undefined, buf: TBuf, offset?: number): TBuf;
export declare function updateV7State(state: V7State, now: number, rnds: Uint8Array): V7State;
export default v7;
