export interface IFileDownloadSuccessful {
    success: boolean
}

export interface ICopyFile {
    name: string;
    parent: {
        id: string;
    },
    version?: string
}

export interface IBoxFileEntry {
    type: string;
    id: string;
    file_version: {
        type: string;
        id: string;
        sha1: string;
    };
    sequence_id: string;
    etag: string;
    sha1: string;
    name: string;
    descripion: string;
    size: number;
    parent: {
        type: string;
        id: string;
        sequence_id: string;
        etag: string;
        sha1: string;
        name: string;
    }
    item_status: string;
}

export interface IFileCopySuccessful {
    success: boolean
}

export interface IFileModifySuccessful {
    success: boolean
}

export interface IFileDeleteSuccessful {
    success: boolean
}

export interface IModifyFile {
    name: string;
    description: string;
    parent: {
        id: string;
    }
}