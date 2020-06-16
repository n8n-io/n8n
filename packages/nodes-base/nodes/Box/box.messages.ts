export const boxApiErrorMessages = {
    CredentialsNotFoundError: "Box Api credentials were not found or were invalid. Please verify.",
    FolderNameOrParentMissingError: "Please provide a valid folder name and parent id",
    FolderIdOrParentMissingError: "Please provide folder and parent folder id",
    FileIdOrDeestinationFileMissingError: "Please provide a valid file id / destination file",
    DuplicateFolderNameError: "Folder already exists in the parent. Please verify.",
    DuplicateFileNameError: "File already exists in the parent. Please verify.",
    FolderNotFoundError: "The parent folder was not found.",
    InvalidPermissionsError: "The user/application does not have permission to perform the selected action",
    BadRequestError: "Bad reqest",
    LongRunningProcessError: "The operation is taking > 60 seconds. The operation is still in progress.",
    FolderNameTooLongError: "The folder name was too long",
    FileNotFoundError: "File or Folder was not found. Please verify the file/folder id",
    FolderNameInvalidError: "The folder name is invalid. Please check for invalid/special characters in the file",
    FolderNotEmptyForDeleteError: "Selected folder was not empty. Please set recursive = true for recursive deletion.",
    FileRetryError: "Please retry. This can occur when the file was uploaded immediately before the download request.",
    InvalidParamsError: "Invalid data. Please verify input.",
    OperationBlockedError: "The destination or source folder is locked due to another move, copy, delete or restore operation in process."
}