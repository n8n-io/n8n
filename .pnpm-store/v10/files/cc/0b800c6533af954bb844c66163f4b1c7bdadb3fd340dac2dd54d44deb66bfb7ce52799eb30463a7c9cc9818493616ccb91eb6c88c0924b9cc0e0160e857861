[//]: # "This README.md file is auto-generated, all changes to this file will be lost."
[//]: # "To regenerate it, use `python -m synthtool`."
<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# [Google Cloud Storage: Node.js Client](https://github.com/googleapis/nodejs-storage)

[![release level](https://img.shields.io/badge/release%20level-stable-brightgreen.svg?style=flat)](https://cloud.google.com/terms/launch-stages)
[![npm version](https://img.shields.io/npm/v/@google-cloud/storage.svg)](https://www.npmjs.org/package/@google-cloud/storage)




> Node.js idiomatic client for [Cloud Storage][product-docs].

[Cloud Storage](https://cloud.google.com/storage/docs) allows world-wide
storage and retrieval of any amount of data at any time. You can use Google
Cloud Storage for a range of scenarios including serving website content,
storing data for archival and disaster recovery, or distributing large data
objects to users via direct download.


A comprehensive list of changes in each version may be found in
[the CHANGELOG](https://github.com/googleapis/nodejs-storage/blob/main/CHANGELOG.md).

* [Google Cloud Storage Node.js Client API Reference][client-docs]
* [Google Cloud Storage Documentation][product-docs]
* [github.com/googleapis/nodejs-storage](https://github.com/googleapis/nodejs-storage)

Read more about the client libraries for Cloud APIs, including the older
Google APIs Client Libraries, in [Client Libraries Explained][explained].

[explained]: https://cloud.google.com/apis/docs/client-libraries-explained

**Table of contents:**


* [Quickstart](#quickstart)
  * [Before you begin](#before-you-begin)
  * [Installing the client library](#installing-the-client-library)
  * [Using the client library](#using-the-client-library)
* [Samples](#samples)
* [Versioning](#versioning)
* [Contributing](#contributing)
* [License](#license)

## Quickstart

### Before you begin

1.  [Select or create a Cloud Platform project][projects].
1.  [Enable billing for your project][billing].
1.  [Enable the Google Cloud Storage API][enable_api].
1.  [Set up authentication with a service account][auth] so you can access the
    API from your local workstation.

### Installing the client library

```bash
npm install @google-cloud/storage
```


### Using the client library

```javascript
// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

// For more information on ways to initialize Storage, please see
// https://googleapis.dev/nodejs/storage/latest/Storage.html

// Creates a client using Application Default Credentials
const storage = new Storage();

// Creates a client from a Google service account key
// const storage = new Storage({keyFilename: 'key.json'});

/**
 * TODO(developer): Uncomment these variables before running the sample.
 */
// The ID of your GCS bucket
// const bucketName = 'your-unique-bucket-name';

async function createBucket() {
  // Creates the new bucket
  await storage.createBucket(bucketName);
  console.log(`Bucket ${bucketName} created.`);
}

createBucket().catch(console.error);

```



## Samples

Samples are in the [`samples/`](https://github.com/googleapis/nodejs-storage/tree/main/samples) directory. Each sample's `README.md` has instructions for running its sample.

| Sample                      | Source Code                       | Try it |
| --------------------------- | --------------------------------- | ------ |
| Add Bucket Conditional Binding | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/addBucketConditionalBinding.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/addBucketConditionalBinding.js,samples/README.md) |
| Add Bucket Default Owner Acl | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/addBucketDefaultOwnerAcl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/addBucketDefaultOwnerAcl.js,samples/README.md) |
| Add Bucket Iam Member | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/addBucketIamMember.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/addBucketIamMember.js,samples/README.md) |
| Storage Add Bucket Label. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/addBucketLabel.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/addBucketLabel.js,samples/README.md) |
| Add Bucket Owner Acl | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/addBucketOwnerAcl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/addBucketOwnerAcl.js,samples/README.md) |
| Bucket Website Configuration. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/addBucketWebsiteConfiguration.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/addBucketWebsiteConfiguration.js,samples/README.md) |
| Add File Owner Acl | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/addFileOwnerAcl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/addFileOwnerAcl.js,samples/README.md) |
| Storage Get Bucket Metadata. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/bucketMetadata.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/bucketMetadata.js,samples/README.md) |
| Change Bucket's Default Storage Class. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/changeDefaultStorageClass.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/changeDefaultStorageClass.js,samples/README.md) |
| Storage File Convert CSEK to CMEK. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/changeFileCSEKToCMEK.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/changeFileCSEKToCMEK.js,samples/README.md) |
| Storage Combine files. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/composeFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/composeFile.js,samples/README.md) |
| Storage Configure Bucket Cors. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/configureBucketCors.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/configureBucketCors.js,samples/README.md) |
| Configure Retries | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/configureRetries.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/configureRetries.js,samples/README.md) |
| Copy File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/copyFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/copyFile.js,samples/README.md) |
| Copy Old Version Of File. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/copyOldVersionOfFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/copyOldVersionOfFile.js,samples/README.md) |
| Create a Dual-Region Bucket | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/createBucketWithDualRegion.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/createBucketWithDualRegion.js,samples/README.md) |
| Create a hierarchical namespace enabled bucket | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/createBucketWithHierarchicalNamespace.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/createBucketWithHierarchicalNamespace.js,samples/README.md) |
| Create a Bucket with object retention enabled. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/createBucketWithObjectRetention.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/createBucketWithObjectRetention.js,samples/README.md) |
| Create Bucket With Storage Class and Location. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/createBucketWithStorageClassAndLocation.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/createBucketWithStorageClassAndLocation.js,samples/README.md) |
| Create Bucket With Turbo Replication | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/createBucketWithTurboReplication.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/createBucketWithTurboReplication.js,samples/README.md) |
| Create New Bucket | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/createNewBucket.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/createNewBucket.js,samples/README.md) |
| Create Notification | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/createNotification.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/createNotification.js,samples/README.md) |
| Delete Bucket | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/deleteBucket.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/deleteBucket.js,samples/README.md) |
| Delete File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/deleteFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/deleteFile.js,samples/README.md) |
| Delete Notification | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/deleteNotification.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/deleteNotification.js,samples/README.md) |
| Delete Old Version Of File. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/deleteOldVersionOfFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/deleteOldVersionOfFile.js,samples/README.md) |
| Disable Bucket Lifecycle Management | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/disableBucketLifecycleManagement.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/disableBucketLifecycleManagement.js,samples/README.md) |
| Storage Disable Bucket Versioning. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/disableBucketVersioning.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/disableBucketVersioning.js,samples/README.md) |
| Disable Default Event Based Hold | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/disableDefaultEventBasedHold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/disableDefaultEventBasedHold.js,samples/README.md) |
| Disable Requester Pays | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/disableRequesterPays.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/disableRequesterPays.js,samples/README.md) |
| Disable Uniform Bucket Level Access | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/disableUniformBucketLevelAccess.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/disableUniformBucketLevelAccess.js,samples/README.md) |
| Download Byte Range | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadByteRange.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadByteRange.js,samples/README.md) |
| Download Encrypted File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadEncryptedFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadEncryptedFile.js,samples/README.md) |
| Download File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadFile.js,samples/README.md) |
| Download a File in Chunks With Transfer Manager | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadFileInChunksWithTransferManager.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadFileInChunksWithTransferManager.js,samples/README.md) |
| Download File Using Requester Pays | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadFileUsingRequesterPays.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadFileUsingRequesterPays.js,samples/README.md) |
| Download Folder With Transfer Manager | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadFolderWithTransferManager.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadFolderWithTransferManager.js,samples/README.md) |
| Download Into Memory | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadIntoMemory.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadIntoMemory.js,samples/README.md) |
| Download Many Files With Transfer Manager | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadManyFilesWithTransferManager.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadManyFilesWithTransferManager.js,samples/README.md) |
| Storage Download Public File. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadPublicFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/downloadPublicFile.js,samples/README.md) |
| Enable Bucket Lifecycle Management | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/enableBucketLifecycleManagement.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/enableBucketLifecycleManagement.js,samples/README.md) |
| Storage Enable Bucket Versioning. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/enableBucketVersioning.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/enableBucketVersioning.js,samples/README.md) |
| Enable Default Event Based Hold | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/enableDefaultEventBasedHold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/enableDefaultEventBasedHold.js,samples/README.md) |
| Enable Default KMS Key | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/enableDefaultKMSKey.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/enableDefaultKMSKey.js,samples/README.md) |
| Enable Requester Pays | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/enableRequesterPays.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/enableRequesterPays.js,samples/README.md) |
| Enable Uniform Bucket Level Access | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/enableUniformBucketLevelAccess.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/enableUniformBucketLevelAccess.js,samples/README.md) |
| Change File's Storage Class. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/fileChangeStorageClass.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/fileChangeStorageClass.js,samples/README.md) |
| Storage Set File Metadata. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/fileSetMetadata.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/fileSetMetadata.js,samples/README.md) |
| Generate Encryption Key | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/generateEncryptionKey.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/generateEncryptionKey.js,samples/README.md) |
| Generate Signed Url | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/generateSignedUrl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/generateSignedUrl.js,samples/README.md) |
| Generate V4 Read Signed Url | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/generateV4ReadSignedUrl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/generateV4ReadSignedUrl.js,samples/README.md) |
| Generate V4 Signed Policy | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/generateV4SignedPolicy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/generateV4SignedPolicy.js,samples/README.md) |
| Generate V4 Upload Signed Url | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/generateV4UploadSignedUrl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/generateV4UploadSignedUrl.js,samples/README.md) |
| Get Autoclass | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getAutoclass.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getAutoclass.js,samples/README.md) |
| Get Default Event Based Hold | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getDefaultEventBasedHold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getDefaultEventBasedHold.js,samples/README.md) |
| Get Metadata | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getMetadata.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getMetadata.js,samples/README.md) |
| Get Metadata Notifications | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getMetadataNotifications.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getMetadataNotifications.js,samples/README.md) |
| Get Public Access Prevention | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getPublicAccessPrevention.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getPublicAccessPrevention.js,samples/README.md) |
| Get RPO | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getRPO.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getRPO.js,samples/README.md) |
| Get Requester Pays Status | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getRequesterPaysStatus.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getRequesterPaysStatus.js,samples/README.md) |
| Get Retention Policy | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getRetentionPolicy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getRetentionPolicy.js,samples/README.md) |
| Storage Get Service Account. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getServiceAccount.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getServiceAccount.js,samples/README.md) |
| Get Uniform Bucket Level Access | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/getUniformBucketLevelAccess.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/getUniformBucketLevelAccess.js,samples/README.md) |
| Activate HMAC SA Key. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/hmacKeyActivate.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/hmacKeyActivate.js,samples/README.md) |
| Create HMAC SA Key. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/hmacKeyCreate.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/hmacKeyCreate.js,samples/README.md) |
| Deactivate HMAC SA Key. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/hmacKeyDeactivate.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/hmacKeyDeactivate.js,samples/README.md) |
| Delete HMAC SA Key. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/hmacKeyDelete.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/hmacKeyDelete.js,samples/README.md) |
| Get HMAC SA Key Metadata. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/hmacKeyGet.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/hmacKeyGet.js,samples/README.md) |
| List HMAC SA Keys Metadata. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/hmacKeysList.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/hmacKeysList.js,samples/README.md) |
| List Buckets | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/listBuckets.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/listBuckets.js,samples/README.md) |
| List Files | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/listFiles.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/listFiles.js,samples/README.md) |
| List Files By Prefix | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/listFilesByPrefix.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/listFilesByPrefix.js,samples/README.md) |
| List Files Paginate | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/listFilesPaginate.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/listFilesPaginate.js,samples/README.md) |
| List Files with Old Versions. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/listFilesWithOldVersions.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/listFilesWithOldVersions.js,samples/README.md) |
| List Notifications | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/listNotifications.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/listNotifications.js,samples/README.md) |
| Lock Retention Policy | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/lockRetentionPolicy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/lockRetentionPolicy.js,samples/README.md) |
| Storage Make Bucket Public. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/makeBucketPublic.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/makeBucketPublic.js,samples/README.md) |
| Make Public | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/makePublic.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/makePublic.js,samples/README.md) |
| Move File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/moveFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/moveFile.js,samples/README.md) |
| Print Bucket Acl | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/printBucketAcl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/printBucketAcl.js,samples/README.md) |
| Print Bucket Acl For User | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/printBucketAclForUser.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/printBucketAclForUser.js,samples/README.md) |
| Print File Acl | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/printFileAcl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/printFileAcl.js,samples/README.md) |
| Print File Acl For User | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/printFileAclForUser.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/printFileAclForUser.js,samples/README.md) |
| Quickstart | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/quickstart.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/quickstart.js,samples/README.md) |
| Release Event Based Hold | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/releaseEventBasedHold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/releaseEventBasedHold.js,samples/README.md) |
| Release Temporary Hold | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/releaseTemporaryHold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/releaseTemporaryHold.js,samples/README.md) |
| Remove Bucket Conditional Binding | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeBucketConditionalBinding.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeBucketConditionalBinding.js,samples/README.md) |
| Storage Remove Bucket Cors Configuration. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeBucketCors.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeBucketCors.js,samples/README.md) |
| Remove Bucket Default Owner | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeBucketDefaultOwner.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeBucketDefaultOwner.js,samples/README.md) |
| Remove Bucket Iam Member | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeBucketIamMember.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeBucketIamMember.js,samples/README.md) |
| Storage Remove Bucket Label. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeBucketLabel.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeBucketLabel.js,samples/README.md) |
| Remove Bucket Owner Acl | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeBucketOwnerAcl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeBucketOwnerAcl.js,samples/README.md) |
| Remove Default KMS Key. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeDefaultKMSKey.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeDefaultKMSKey.js,samples/README.md) |
| Remove File Owner Acl | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeFileOwnerAcl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeFileOwnerAcl.js,samples/README.md) |
| Remove Retention Policy | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/removeRetentionPolicy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/removeRetentionPolicy.js,samples/README.md) |
| Rename File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/renameFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/renameFile.js,samples/README.md) |
| Rotate Encryption Key | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/rotateEncryptionKey.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/rotateEncryptionKey.js,samples/README.md) |
| Set Autoclass | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setAutoclass.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setAutoclass.js,samples/README.md) |
| Set Client Endpoint | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setClientEndpoint.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setClientEndpoint.js,samples/README.md) |
| Set Event Based Hold | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setEventBasedHold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setEventBasedHold.js,samples/README.md) |
| Set the object retention policy of a File. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setObjectRetentionPolicy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setObjectRetentionPolicy.js,samples/README.md) |
| Set Public Access Prevention Enforced | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setPublicAccessPreventionEnforced.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setPublicAccessPreventionEnforced.js,samples/README.md) |
| Set Public Access Prevention Inherited | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setPublicAccessPreventionInherited.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setPublicAccessPreventionInherited.js,samples/README.md) |
| Set RPO Async Turbo | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setRPOAsyncTurbo.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setRPOAsyncTurbo.js,samples/README.md) |
| Set RPO Default | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setRPODefault.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setRPODefault.js,samples/README.md) |
| Set Retention Policy | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setRetentionPolicy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setRetentionPolicy.js,samples/README.md) |
| Set Temporary Hold | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/setTemporaryHold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/setTemporaryHold.js,samples/README.md) |
| Stream File Download | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/streamFileDownload.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/streamFileDownload.js,samples/README.md) |
| Stream File Upload | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/streamFileUpload.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/streamFileUpload.js,samples/README.md) |
| Upload a directory to a bucket. | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadDirectory.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadDirectory.js,samples/README.md) |
| Upload Directory With Transfer Manager | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadDirectoryWithTransferManager.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadDirectoryWithTransferManager.js,samples/README.md) |
| Upload Encrypted File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadEncryptedFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadEncryptedFile.js,samples/README.md) |
| Upload File | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadFile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadFile.js,samples/README.md) |
| Upload a File in Chunks With Transfer Manager | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadFileInChunksWithTransferManager.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadFileInChunksWithTransferManager.js,samples/README.md) |
| Upload File With Kms Key | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadFileWithKmsKey.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadFileWithKmsKey.js,samples/README.md) |
| Upload From Memory | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadFromMemory.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadFromMemory.js,samples/README.md) |
| Upload Many Files With Transfer Manager | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadManyFilesWithTransferManager.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadManyFilesWithTransferManager.js,samples/README.md) |
| Upload Without Authentication | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadWithoutAuthentication.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadWithoutAuthentication.js,samples/README.md) |
| Upload Without Authentication Signed Url | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadWithoutAuthenticationSignedUrl.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/uploadWithoutAuthenticationSignedUrl.js,samples/README.md) |
| View Bucket Iam Members | [source code](https://github.com/googleapis/nodejs-storage/blob/main/samples/viewBucketIamMembers.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/nodejs-storage&page=editor&open_in_editor=samples/viewBucketIamMembers.js,samples/README.md) |



The [Google Cloud Storage Node.js Client API Reference][client-docs] documentation
also contains samples.

## Supported Node.js Versions

Our client libraries follow the [Node.js release schedule](https://github.com/nodejs/release#release-schedule).
Libraries are compatible with all current _active_ and _maintenance_ versions of
Node.js.
If you are using an end-of-life version of Node.js, we recommend that you update
as soon as possible to an actively supported LTS version.

Google's client libraries support legacy versions of Node.js runtimes on a
best-efforts basis with the following warnings:

* Legacy versions are not tested in continuous integration.
* Some security patches and features cannot be backported.
* Dependencies cannot be kept up-to-date.

Client libraries targeting some end-of-life versions of Node.js are available, and
can be installed through npm [dist-tags](https://docs.npmjs.com/cli/dist-tag).
The dist-tags follow the naming convention `legacy-(version)`.
For example, `npm install @google-cloud/storage@legacy-8` installs client libraries
for versions compatible with Node.js 8.

## Versioning

This library follows [Semantic Versioning](http://semver.org/).



This library is considered to be **stable**. The code surface will not change in backwards-incompatible ways
unless absolutely necessary (e.g. because of critical security issues) or with
an extensive deprecation period. Issues and requests against **stable** libraries
are addressed with the highest priority.






More Information: [Google Cloud Platform Launch Stages][launch_stages]

[launch_stages]: https://cloud.google.com/terms/launch-stages

## Contributing

Contributions welcome! See the [Contributing Guide](https://github.com/googleapis/nodejs-storage/blob/main/CONTRIBUTING.md).

Please note that this `README.md`, the `samples/README.md`,
and a variety of configuration files in this repository (including `.nycrc` and `tsconfig.json`)
are generated from a central template. To edit one of these files, make an edit
to its templates in
[directory](https://github.com/googleapis/synthtool).

## License

Apache Version 2.0

See [LICENSE](https://github.com/googleapis/nodejs-storage/blob/main/LICENSE)

[client-docs]: https://googleapis.dev/nodejs/storage/latest
[product-docs]: https://cloud.google.com/storage
[shell_img]: https://gstatic.com/cloudssh/images/open-btn.png
[projects]: https://console.cloud.google.com/project
[billing]: https://support.google.com/cloud/answer/6293499#enable-billing
[enable_api]: https://console.cloud.google.com/flows/enableapi?apiid=storage-api.googleapis.com
[auth]: https://cloud.google.com/docs/authentication/getting-started
