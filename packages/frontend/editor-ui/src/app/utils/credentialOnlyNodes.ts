import { deepCopy, type ICredentialType, type INodeTypeDescription } from 'n8n-workflow';
import { CREDENTIAL_ONLY_NODE_PREFIX } from '../constants';
import { i18n } from '@n8n/i18n';

export function isCredentialOnlyNodeType(nodeTypeName: string): boolean {
	return nodeTypeName?.startsWith(CREDENTIAL_ONLY_NODE_PREFIX) ?? false;
}

export function getCredentialTypeName(nodeTypeName: string): string {
	return nodeTypeName.split('.')[1];
}

export function getCredentialOnlyNodeTypeName(credentialTypeName: string): string {
	return `${CREDENTIAL_ONLY_NODE_PREFIX}.${credentialTypeName}`;
}

export function getCredentialOnlyNodeType(
	httpNode?: INodeTypeDescription | null,
	credentialType?: ICredentialType,
): INodeTypeDescription | undefined {
	const { httpRequestNode } = credentialType ?? {};
	if (!httpNode || !credentialType || !httpRequestNode) return undefined;

	const { docsUrl, name: displayName } = httpRequestNode;

	const credentialOnlyNode = deepCopy(httpNode);

	const httpIcon = httpNode.iconUrl;

	credentialOnlyNode.name = getCredentialOnlyNodeTypeName(credentialType.name);
	credentialOnlyNode.extendsCredential = credentialType.name;
	credentialOnlyNode.displayName = displayName ?? credentialType.displayName;
	credentialOnlyNode.description = 'HTTP request';
	credentialOnlyNode.defaults.name = `${displayName} HTTP Request`;
	credentialOnlyNode.codex = {
		...credentialOnlyNode.codex,
		alias: [],
		categories: [],
		subcategories: {},
	};

	credentialOnlyNode.credentials = [{ name: credentialType.name, required: true }];

	if (credentialType.icon ?? credentialType.iconUrl) {
		credentialOnlyNode.icon = credentialType.icon;
		credentialOnlyNode.iconUrl = credentialType.iconUrl;
		credentialOnlyNode.badgeIconUrl = httpIcon;
	} else {
		credentialOnlyNode.iconUrl = httpIcon;
	}

	credentialOnlyNode.properties = httpNode.properties.map((prop) => {
		switch (prop.name) {
			case 'authentication':
				return { ...prop, type: 'hidden', default: 'predefinedCredentialType' };
			case 'nodeCredentialType':
				return { ...prop, type: 'hidden', default: credentialType.name };
			case 'url':
				const properties = { ...prop };
				if ('apiBaseUrl' in httpRequestNode) {
					const { apiBaseUrl } = httpRequestNode;
					properties.default = apiBaseUrl;
					properties.placeholder = apiBaseUrl ? `e.g. ${apiBaseUrl}` : prop.placeholder;
				} else {
					properties.placeholder = httpRequestNode.apiBaseUrlPlaceholder;
				}
				return properties;
			default:
				return prop;
		}
	});

	credentialOnlyNode.properties.splice(1, 0, {
		type: 'notice',
		displayName: i18n.baseText('ndv.httpRequest.credentialOnly.docsNotice', {
			interpolate: { nodeName: displayName, docsUrl },
		}),
		name: 'httpVariantWarning',
		default: '',
	});

	credentialOnlyNode.properties.splice(4, 0, {
		type: 'credentials',
		displayName: '',
		name: '',
		default: '',
	});

	return credentialOnlyNode;
}
