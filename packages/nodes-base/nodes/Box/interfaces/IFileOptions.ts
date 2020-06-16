export interface IBoxApiDownloadFileOptions {
    file: string;
    destination: string;
}

export interface IBoxApiCopyFileOptions {
    file: string;
    parent: string;
    version: string;
    name: string;
}

export interface IBoxApiModifyFileOptions {
    file: string;
    name: string;
    parent: string;
    description: string;
}

export interface IBoxApiDeleteOptions {
    file: string;
}