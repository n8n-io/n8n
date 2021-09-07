import {ICredentialType, INodeProperties} from 'n8n-workflow';


export class SeaTableApi implements ICredentialType {
		name = 'seatableApi';
		displayName = 'SeaTable API';
		documentationUrl = 'seatable';
		properties: INodeProperties[] = [
				{
						displayName: 'Server',
						name: 'server',
						type: 'string',
						default: 'https://',
				},
				{
						displayName: 'API Token (of a Base)',
						name: 'token',
						type: 'string',
						default: '',
				},
		];
}
