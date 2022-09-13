import {
	TColumnType,
	TColumnValue,
	TDtableMetadataColumns,
	TDtableMetadataTables,
	TSeaTableServerEdition,
	TSeaTableServerVersion,
} from './types';

export interface IApi {
	server: string;
	token: string;
	appAccessToken?: IAppAccessToken;
	info?: IServerInfo;
}

export interface IServerInfo {
	version: TSeaTableServerVersion;
	edition: TSeaTableServerEdition;
}

export interface IAppAccessToken {
	app_name: string;
	access_token: string;
	dtable_uuid: string;
	dtable_server: string;
	dtable_socket: string;
	workspace_id: number;
	dtable_name: string;
}

export interface IDtableMetadataColumn {
	key: string;
	name: string;
	type: TColumnType;
	editable: boolean;
}

export interface TDtableViewColumn {
	_id: string;
	name: string;
}

export interface IDtableMetadataTable {
	_id: string;
	name: string;
	columns: TDtableMetadataColumns;
}

export interface IDtableMetadata {
	tables: TDtableMetadataTables;
	version: string;
	format_version: string;
}

export interface IEndpointVariables {
	[name: string]: string | undefined;
}

export interface IRowObject {
	[name: string]: TColumnValue;
}

export interface IRow extends IRowObject {
	_id: string;
	_ctime: string;
	_mtime: string;
	_seq?: number;
}

export interface IName {
	name: string;
}

type TOperation = 'cloudHosted' | 'selfHosted';

export interface ICredential {
	token: string;
	domain: string;
	environment: TOperation;
}

interface IBase {
	dtable_uuid: string;
	access_token: string;
}

export interface ICtx {
	base?: IBase;
	credentials?: ICredential;
}

export interface IRowResponse {
	metadata: [
		{
			key: string;
			name: string;
		},
	];
	results: IRow[];
}
