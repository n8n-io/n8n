const require_auth = require('./auth.cjs');
let _langchain_google_common_experimental_media = require("@langchain/google-common/experimental/media");

//#region src/media.ts
var BlobStoreGoogleCloudStorage = class extends _langchain_google_common_experimental_media.BlobStoreGoogleCloudStorageBase {
	buildClient(fields) {
		return new require_auth.GAuthClient(fields);
	}
};
var BlobStoreAIStudioFile = class extends _langchain_google_common_experimental_media.BlobStoreAIStudioFileBase {
	buildAbstractedClient(fields) {
		return new require_auth.GAuthClient(fields);
	}
};

//#endregion
exports.BlobStoreAIStudioFile = BlobStoreAIStudioFile;
exports.BlobStoreGoogleCloudStorage = BlobStoreGoogleCloudStorage;
//# sourceMappingURL=media.cjs.map