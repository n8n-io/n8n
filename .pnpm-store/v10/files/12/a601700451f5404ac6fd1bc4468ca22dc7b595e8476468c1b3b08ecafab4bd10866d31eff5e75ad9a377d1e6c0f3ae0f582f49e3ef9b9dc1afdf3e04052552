const missingPlugin = 1000;
const pluginFunction = 1001;
const aborted = 1002;
const noParser = 1003;
const uninitializedParser = 1004;
const filenameNotString = 1005;
const maxFieldsSizeExceeded = 1006;
const maxFieldsExceeded = 1007;
const smallerThanMinFileSize = 1008;
const biggerThanTotalMaxFileSize = 1009;
const noEmptyFiles = 1010;
const missingContentType = 1011;
const malformedMultipart = 1012;
const missingMultipartBoundary = 1013;
const unknownTransferEncoding = 1014;
const maxFilesExceeded = 1015;
const biggerThanMaxFileSize = 1016;
const pluginFailed = 1017;
const cannotCreateDir = 1018;

const FormidableError = class extends Error {
  constructor(message, internalCode, httpCode = 500) {
    super(message);
    this.code = internalCode;
    this.httpCode = httpCode;
  }
};

export {
  missingPlugin,
  pluginFunction,
  aborted,
  noParser,
  uninitializedParser,
  filenameNotString,
  maxFieldsSizeExceeded,
  maxFieldsExceeded,
  maxFilesExceeded,
  smallerThanMinFileSize,
  biggerThanMaxFileSize,
  noEmptyFiles,
  missingContentType,
  malformedMultipart,
  missingMultipartBoundary,
  unknownTransferEncoding,
  biggerThanTotalMaxFileSize,
  pluginFailed,
  cannotCreateDir,
};

export default FormidableError;
