import { GoogleAbstractedClient } from "@langchain/google-common";
import { GoogleAuthOptions } from "google-auth-library";
import { BlobStoreAIStudioFileBase, BlobStoreAIStudioFileBaseParams, BlobStoreGoogleCloudStorageBase, BlobStoreGoogleCloudStorageBaseParams } from "@langchain/google-common/experimental/media";

//#region src/media.d.ts
interface BlobStoreGoogleCloudStorageParams extends BlobStoreGoogleCloudStorageBaseParams<GoogleAuthOptions> {}
declare class BlobStoreGoogleCloudStorage extends BlobStoreGoogleCloudStorageBase<GoogleAuthOptions> {
  buildClient(fields?: BlobStoreGoogleCloudStorageParams): GoogleAbstractedClient;
}
interface BlobStoreAIStudioFileParams extends BlobStoreAIStudioFileBaseParams<GoogleAuthOptions> {}
declare class BlobStoreAIStudioFile extends BlobStoreAIStudioFileBase<GoogleAuthOptions> {
  buildAbstractedClient(fields?: BlobStoreAIStudioFileParams): GoogleAbstractedClient;
}
//#endregion
export { BlobStoreAIStudioFile, BlobStoreAIStudioFileParams, BlobStoreGoogleCloudStorage, BlobStoreGoogleCloudStorageParams };
//# sourceMappingURL=media.d.cts.map