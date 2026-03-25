import { CredentialsProviderError } from "@smithy/property-provider";
export class InstanceMetadataV1FallbackError extends CredentialsProviderError {
    tryNextLink;
    name = "InstanceMetadataV1FallbackError";
    constructor(message, tryNextLink = true) {
        super(message, tryNextLink);
        this.tryNextLink = tryNextLink;
        Object.setPrototypeOf(this, InstanceMetadataV1FallbackError.prototype);
    }
}
