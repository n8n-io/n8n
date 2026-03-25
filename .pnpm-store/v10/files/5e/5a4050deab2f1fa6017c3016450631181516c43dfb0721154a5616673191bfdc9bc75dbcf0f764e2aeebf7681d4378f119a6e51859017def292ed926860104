import { setCredentialFeature } from "@aws-sdk/core/client";
import { fromInstanceMetadata as _fromInstanceMetadata, } from "@smithy/credential-provider-imds";
export const fromInstanceMetadata = (init) => {
    init?.logger?.debug("@smithy/credential-provider-imds", "fromInstanceMetadata");
    return async () => _fromInstanceMetadata(init)().then((creds) => setCredentialFeature(creds, "CREDENTIALS_IMDS", "0"));
};
