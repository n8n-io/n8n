export type TokenBucketError = string
export type Fail<T> = (error: T) => void
export type Success<T> = (error: null, data: T) => void
export type RemoveTokensCallback = Fail<TokenBucketError> | Success<number>

type Interval = number | 'second' | 'sec' | 'minute' | 'min' | 'hour' | 'hr' | 'day'

export declare class TokenBucket {
  constructor(bucketSize: number, tokensPerInterval: number, interval: Interval, parentBucket?: TokenBucket)

  removeTokens(count: number, callback: RemoveTokensCallback): void
  tryRemoveTokens(count: number): boolean
  drip(): boolean
}

export declare class RateLimiter {
  constructor(tokensPerInterval: number, interval: Interval, fireImmediately?: boolean)

  removeTokens(count: number, callback: RemoveTokensCallback): void
  tryRemoveTokens(count: number): boolean
  getTokensRemaining(): number
}
