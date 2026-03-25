/**
 * @see https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
 */
export type ITSLogicIsAny<T, Y = true, N = false> = 0 extends (1 & T) ? Y : N;
export type ITSLogicNotAny<T, Y = true, N = false> = ITSLogicIsAny<T, N, Y>;
