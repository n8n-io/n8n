import { GAuthClient } from "./auth.js";
import { BlobStoreAIStudioFileBase, BlobStoreGoogleCloudStorageBase } from "@langchain/google-common/experimental/media";

//#region src/media.ts
var BlobStoreGoogleCloudStorage = class extends BlobStoreGoogleCloudStorageBase {
	buildClient(fields) {
		return new GAuthClient(fields);
	}
};
var BlobStoreAIStudioFile = class extends BlobStoreAIStudioFileBase {
	buildAbstractedClient(fields) {
		return new GAuthClient(fields);
	}
};

//#endregion
export { BlobStoreAIStudioFile, BlobStoreGoogleCloudStorage };
//# sourceMappingURL=media.js.map