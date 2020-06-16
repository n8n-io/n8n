export const boxApiBaseUri = "https://api.box.com/2.0/";

export const boxApiResourceType = {
    file: "File",
    fileVal: "file",
    folder: "Folder",
    folderVal: "folder"
}

export const folderApiParamType = {
    offset: "Offset",
    offsetVal: "offset",
    limit: "Limit",
    limitVal: "limit",
    folderName: "Folder Name",
    folderNameVal: "name",
    folderParent: "Parent Folder Id",
    folderParentVal: "parent",
    currentFolder: "Folder Id",
    currentFolderVal: "current",
    folderUploadEmail: "Folder Upload Email",
    folderUploadEmailVal: "folderUploadEmail",
    folderDescription: "Folder Description",
    folderDescriptionVal: "description",
    tags: "Tags",
    tagsVal: "tags",
    recursive: "Delete Recursively",
    recursiveVal: "recursive"
}

export const fileApiParamType = {
    currentFile: "File Id",
    currentFileVal: "file",
    fileDescription: "File Description",
    fileDescriptionVal: "description",
    fileName: "File Name",
    fileNameVal: "fileName",
    folder: "Folder Id",
    folderVal: "folder",
    fileVersion: "File Version",
    fileVersionVal: "fileVersion",
    destionationFile: "Destination",
    destionationFileVal: "destination",
    binaryProperty: "Binary Property",
    binaryPropertyVal: "binaryProperty"
}

export const boxApiResourceActionTypes = {
    list: "List",
    listVal: "list",
    create: "Create",
    createVal: "create",
    copy: "Copy",
    copyVal: "copy",
    move: "Move",
    moveVal: "move",
    delete: "Delete",
    deleteVal: "delete",
    modify: "Modify",
    modifyVal: "modify",
    download: "Download",
    downloadVal: "download",
    upload: "Upload",
    uploadVal: "upload"
}

export const boxApiCredentialsProvider = 'boxApi';

export const boxNodeProperties = {
    displayName: 'Box',
    name: 'box',
    group: ['transform'],
    version: 1,
    icon: 'file:box.png',
    description: 'Access data on Box',
    defaults: {
        name: 'Box',
        color: '#772244',
    },
    inputs: ['main'],
    outputs: ['main']
}

export const boxNodeConstants = {
    resource: "resource",
    operation: "operation"
}