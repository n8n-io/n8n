import { deepCopy, type ICredentialType, type INodeTypeDescription } from 'n8n-workflow';
import { CREDENTIAL_ONLY_NODE_PREFIX } from '../constants';

export function getCredentialOnlyNodeType(
	httpNode?: INodeTypeDescription,
	credentialType?: ICredentialType,
): INodeTypeDescription | undefined {
	if (!httpNode || !credentialType?.httpRequestNode) return undefined;

	const {
		docsUrl,
		apiBaseUrl,
		apiBaseUrlPlaceholder,
		name: nodeName,
	} = credentialType.httpRequestNode;

	const credentialOnlyNode = deepCopy(httpNode);

	const httpIcon = httpNode.iconUrl;

	credentialOnlyNode.name = `${CREDENTIAL_ONLY_NODE_PREFIX}.${credentialType.name}`;
	credentialOnlyNode.displayName = nodeName ?? credentialType.displayName;
	credentialOnlyNode.description = 'HTTP request';
	credentialOnlyNode.defaults.name = `${nodeName} HTTP Request`;
	credentialOnlyNode.codex = {};

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
				return {
					...prop,
					default: apiBaseUrl,
					placeholder:
						apiBaseUrlPlaceholder ?? (apiBaseUrl ? `e.g. ${apiBaseUrl}` : prop.placeholder),
				};
			default:
				return prop;
		}
	});

	credentialOnlyNode.properties.splice(1, 0, {
		type: 'notice',
		displayName: `Use the <a target="_blank" href="${docsUrl}">${nodeName} docs</a> to construct your request. We'll take care of the authentication part if you add a ${nodeName} credential below.`,
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
