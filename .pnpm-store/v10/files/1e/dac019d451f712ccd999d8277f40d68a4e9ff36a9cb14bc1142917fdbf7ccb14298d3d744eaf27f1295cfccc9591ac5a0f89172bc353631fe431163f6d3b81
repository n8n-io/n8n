import {
  AwsCredentialIdentity,
  HttpRequest as IHttpRequest,
} from "@smithy/types";
import { S3ExpressIdentity } from "../interfaces/S3ExpressIdentity";
export declare const signS3Express: (
  s3ExpressIdentity: S3ExpressIdentity,
  signingOptions: {
    signingDate: Date;
    signingRegion: string;
    signingService: string;
  },
  request: IHttpRequest,
  sigV4MultiRegionSigner: {
    signWithCredentials(
      req: IHttpRequest,
      identity: AwsCredentialIdentity,
      opts?: Partial<typeof signingOptions>
    ): Promise<IHttpRequest>;
  }
) => Promise<IHttpRequest>;
