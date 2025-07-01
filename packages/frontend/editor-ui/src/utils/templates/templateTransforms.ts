import type {
	IWorkflowTemplateNode,
	IWorkflowTemplateNodeCredentials,
} from '@n8n/rest-api-client/api/templates';

import type { NodeTypeProvider } from '@/utils/nodeTypes/nodeTypeTransforms';
import { getNodeTypeDisplayableCredentials } from '@/utils/nodes/nodeTransforms';
import type { NormalizedTemplateNodeCredentials } from '@/utils/templates/templateTypes';
import type {
	INodeCredentialDescription,
	INodeCredentials,
	INodeCredentialsDetails,
} from 'n8n-workflow';

export type IWorkflowTemplateNodeWithCredentials = IWorkflowTemplateNode &
	Required<Pick<IWorkflowTemplateNode, 'credentials'>>;

const credentialKeySymbol = Symbol('credentialKey');

/**
 * A key that uniquely identifies a credential in a template node.
 * It encodes the credential type name and the credential name.
 * Uses a symbol typing trick to get nominal typing.
 * Use `keyFromCredentialTypeAndName` to create a key.
 */
export type TemplateCredentialKey = string & { [credentialKeySymbol]: never };

export type TemplateNodeWithRequiredCredential = {
	node: IWorkflowTemplateNode;
	requiredCredentials: INodeCredentialDescription[];
};

/**
 * Forms a key from credential type name and credential name
 */
export const keyFromCredentialTypeAndName = (
	credentialTypeName: string,
	credentialName: string,
): TemplateCredentialKey => `${credentialTypeName}-${credentialName}` as TemplateCredentialKey;

/**
 * Normalizes the credentials of a template node. Templates created with
 * different versions of n8n may have different credential formats.
 */
export const normalizeTemplateNodeCredentials = (
	credentials?: IWorkflowTemplateNodeCredentials,
): NormalizedTemplateNodeCredentials => {
	if (!credentials) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(credentials).map(([key, value]) => {
			return typeof value === 'string' ? [key, value] : [key, value.name];
		}),
	);
};

/**
 * Replaces the credentials of a node with the given replacements
 *
 * @example
 * const nodeCredentials = { twitterOAuth1Api: "twitter" };
 * const toReplaceByKey = { 'twitterOAuth1Api-twitter': {
 *   id: "BrEOZ5Cje6VYh9Pc",
 *   name: "X OAuth account"
 * }};
 * replaceTemplateNodeCredentials(nodeCredentials, toReplaceByKey);
 * // => { twitterOAuth1Api: { id: "BrEOZ5Cje6VYh9Pc", name: "X OAuth account" } }
 */
export const getReplacedTemplateNodeCredentials = (
	nodeCredentials: IWorkflowTemplateNodeCredentials | undefined,
	toReplaceByKey: Record<TemplateCredentialKey, INodeCredentialsDetails>,
) => {
	if (!nodeCredentials) {
		return undefined;
	}

	const replacedNodeCredentials: INodeCredentials = {};
	const normalizedCredentials = normalizeTemplateNodeCredentials(nodeCredentials);
	for (const credentialType in normalizedCredentials) {
		const credentialNameInTemplate = normalizedCredentials[credentialType];
		const key = keyFromCredentialTypeAndName(credentialType, credentialNameInTemplate);
		const toReplaceWith = toReplaceByKey[key];
		if (toReplaceWith) {
			replacedNodeCredentials[credentialType] = toReplaceWith;
		}
	}

	return replacedNodeCredentials;
};

/**
 * Returns credentials for the given node that are missing from it
 * but are present in the given replacements
 */
export const getMissingTemplateNodeCredentials = (
	nodeTypeProvider: NodeTypeProvider,
	node: IWorkflowTemplateNode,
	replacementsByKey: Record<TemplateCredentialKey, INodeCredentialsDetails>,
): INodeCredentials => {
	const nodeCredentialsToAdd: INodeCredentials = {};
	const usableCredentials = getNodeTypeDisplayableCredentials(nodeTypeProvider, node);

	for (const usableCred of usableCredentials) {
		const credentialKey = keyFromCredentialTypeAndName(usableCred.name, '');

		if (replacementsByKey[credentialKey]) {
			nodeCredentialsToAdd[usableCred.name] = replacementsByKey[credentialKey];
		}
	}

	return nodeCredentialsToAdd;
};

/**
 * Replaces the credentials of all template workflow nodes with the given
 * replacements
 */
export const replaceAllTemplateNodeCredentials = (
	nodeTypeProvider: NodeTypeProvider,
	nodes: IWorkflowTemplateNode[],
	toReplaceWith: Record<TemplateCredentialKey, INodeCredentialsDetails>,
) => {
	return nodes.map((node) => {
		const replacedCredentials = getReplacedTemplateNodeCredentials(node.credentials, toReplaceWith);
		const newCredentials = getMissingTemplateNodeCredentials(nodeTypeProvider, node, toReplaceWith);

		const credentials = {
			...replacedCredentials,
			...newCredentials,
		};

		return {
			...node,
			credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
		};
	});
};
