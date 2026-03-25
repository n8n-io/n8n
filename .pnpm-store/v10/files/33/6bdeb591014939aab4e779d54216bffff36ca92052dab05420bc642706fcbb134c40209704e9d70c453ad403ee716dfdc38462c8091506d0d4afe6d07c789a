import { AwsCredentialIdentity, AwsIdentityProperties } from "@aws-sdk/types";
import { IniSection } from "@smithy/types";
import { FromLoginCredentialsInit } from "./types";
export declare class LoginCredentialsFetcher {
  private readonly profileData;
  private readonly init?;
  private readonly callerClientConfig?;
  private static readonly REFRESH_THRESHOLD;
  constructor(
    profileData: IniSection,
    init?: FromLoginCredentialsInit | undefined,
    callerClientConfig?: AwsIdentityProperties["callerClientConfig"]
  );
  loadCredentials(): Promise<AwsCredentialIdentity>;
  private readonly logger: any;
  private readonly loginSession: any;
  private refresh;
  private loadToken;
  private saveToken;
  private getTokenFilePath;
  private derToRawSignature;
  private createDPoPInterceptor;
  private generateDpop;
}
