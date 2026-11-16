import { LazyPackageDirectoryLoader } from 'n8n-core';
import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import path from 'node:path';

class CredentialTypeLoader extends LazyPackageDirectoryLoader {
	constructor() {
		super(path.dirname(require.resolve('n8n-nodes-base/package.json')));
		this.known.credentials = this.readJSONSync('dist/known/credentials.json');
	}
}

let loader: CredentialTypeLoader | undefined;

function credentialLoader() {
	loader ??= new CredentialTypeLoader();
	return loader;
}

export function isKnownCredentialType(type: string): boolean {
	return Object.hasOwn(credentialLoader().known.credentials, type);
}

export function getCredentialType(type: string): ICredentialType {
	return credentialLoader().getCredential(type).type;
}

export function getParentTypes(type: string): string[] {
	const parents = credentialLoader().known.credentials[type]?.extends ?? [];
	return parents.flatMap((parent) => [parent, ...getParentTypes(parent)]);
}

export function getCredentialProperties(type: string): INodeProperties[] {
	const credentialType = getCredentialType(type);
	if (!credentialType.extends) return credentialType.properties;

	const properties: INodeProperties[] = [];
	for (const parent of credentialType.extends) {
		NodeHelpers.mergeNodeProperties(properties, getCredentialProperties(parent));
	}
	NodeHelpers.mergeNodeProperties(properties, credentialType.properties);
	return properties;
}
