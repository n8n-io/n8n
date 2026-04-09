import { AwsIdentityProperties } from "@aws-sdk/types";
import { AwsCredentialIdentity, ParsedIniData } from "@smithy/types";
import { FromIniInit } from "./fromIni";
export declare const isLoginProfile: (data: ParsedIniData[string]) => boolean;
export declare const resolveLoginCredentials: (
  profileName: string,
  options: FromIniInit,
  callerClientConfig?: AwsIdentityProperties["callerClientConfig"]
) => Promise<AwsCredentialIdentity>;
