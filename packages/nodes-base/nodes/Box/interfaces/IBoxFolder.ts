export interface IBoxFolderEntry {
    type: string;
    id: string;
    sequence_id: string;
    etag: string;
    name: String;
}

export interface IFolderItems {
    total_count: number;
    entries: Array<IBoxFolderEntry>,
    offset: number,
    limit: number
}

export interface IBoxFolderResponse {
    item_collection: IFolderItems;
}

export interface IAddFolder {
    name: string;
    parent: {
        id: string;
    },
    folder_upload_email?: {
        access: string
    }
}

export interface IModifyFolder {
    name: string;
    description: string;
    parent: {
        id: string;
    },
    folder_upload_email?: {
        access: string
    },
    tags: Array<string>
}

export interface ICopyFolder {
    name: string;
    parent: {
        id: string;
    }
}

export interface IFolderCopySuccessful {
    success: boolean
}

export interface IFolderModifySuccessful {
    success: boolean
}

export interface IFolderDeleteSuccessful {
    success: boolean
}