export interface IBoxApiFolderOptions {
    limit: number;
    offset: number;
}

export interface IBoxApiAddFolderOptions {
    name: string;
    parent: string;
    folderUploadEmail: string;
}

export interface IBoxApiCopyFolderOptions {
    name: string;
    parent: string;
    folder: string;
}

export interface IBoxApiModifyFolderOptions{
    name: string;
    description:string;
    parent: string;
    folder: string;
    tags:Array<string>,
    folderUploadEmail: string;
}

export interface IBoxApiDeleteFolderOptions{
    folder: string;
    recursive:boolean;
}