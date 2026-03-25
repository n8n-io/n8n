import { S3ExpressIdentity } from "../interfaces/S3ExpressIdentity";
export declare class S3ExpressIdentityCacheEntry {
  private _identity;
  isRefreshing: boolean;
  accessed: number;
  constructor(
    _identity: Promise<S3ExpressIdentity>,
    isRefreshing?: boolean,
    accessed?: number
  );
  readonly identity: Promise<S3ExpressIdentity>;
}
