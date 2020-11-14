import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class QuickBase implements ICredentialType {
	name = 'quickbase';
	displayName = 'Quick Base API';
	properties = [{
		displayName: 'Realm',
		name: 'realm',
		type: 'string' as NodePropertyTypes,
		default: ''
	}, {
		displayName: 'User Token',
		name: 'userToken',
		type: 'string' as NodePropertyTypes,
		default: ''
	}];
}
