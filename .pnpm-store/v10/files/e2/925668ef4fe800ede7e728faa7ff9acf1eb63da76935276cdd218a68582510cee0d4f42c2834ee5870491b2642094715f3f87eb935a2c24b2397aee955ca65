interface VersionParams {
  organizationId: string;
  name: string;
  version: string;
}

export interface PrepareFileuploadParams extends VersionParams {
  filesHash: string;
  filename: string;
  isUpsert?: boolean;
}

export interface PushApiParams extends VersionParams {
  rootFilePath: string;
  filePaths: string[];
  branch?: string;
  isUpsert?: boolean;
  isPublic?: boolean;
  batchId?: string;
  batchSize?: number;
}

export interface PrepareFileuploadOKResponse {
  filePath: string;
  signedUploadUrl: string;
}

export interface NotFoundProblemResponse {
  status: 404;
  title: 'Not Found';
  code: 'ORGANIZATION_NOT_FOUND' | 'API_VERSION_NOT_FOUND';
}
