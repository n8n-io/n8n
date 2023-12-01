import type { IWorkflowTemplateNode, IWorkflowTemplateNodeCredentials } from '@/Interface';
import type { NormalizedTemplateNodeCredentials } from '@/utils/templates/templateTypes';
import type { INodeCredentials, INodeCredentialsDetails } from 'n8n-workflow';

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

/**
 * Forms a key from credential type name and credential name
 */
export const keyFromCredentialTypeAndName = (
	credentialTypeName: string,
	credentialName: string,
): TemplateCredentialKey => `${credentialTypeName}-${credentialName}` as TemplateCredentialKey;

/**
 * Checks if a template workflow node has credentials defined
 */
export const hasNodeCredentials = (
	node: IWorkflowTemplateNode,
): node is IWorkflowTemplateNodeWithCredentials =>
	!!node.credentials && Object.keys(node.credentials).length > 0;

/**
 * Normalizes the credentials of a template node. Templates created with
 * different versions of n8n may have different credential formats.
 */
export const normalizeTemplateNodeCredentials = (
	credentials: IWorkflowTemplateNodeCredentials,
): NormalizedTemplateNodeCredentials => {
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
export const replaceTemplateNodeCredentials = (
	nodeCredentials: IWorkflowTemplateNodeCredentials,
	toReplaceByKey: Record<TemplateCredentialKey, INodeCredentialsDetails>,
) => {
	if (!nodeCredentials) {
		return undefined;
	}

	const newNodeCredentials: INodeCredentials = {};
	const normalizedCredentials = normalizeTemplateNodeCredentials(nodeCredentials);
	for (const credentialType in normalizedCredentials) {
		const credentialNameInTemplate = normalizedCredentials[credentialType];
		const key = keyFromCredentialTypeAndName(credentialType, credentialNameInTemplate);
		const toReplaceWith = toReplaceByKey[key];
		if (toReplaceWith) {
			newNodeCredentials[credentialType] = toReplaceWith;
		}
	}

	return newNodeCredentials;
};

/**
 * Replaces the credentials of all template workflow nodes with the given
 * replacements
 */
export const replaceAllTemplateNodeCredentials = (
	nodes: IWorkflowTemplateNode[],
	toReplaceWith: Record<TemplateCredentialKey, INodeCredentialsDetails>,
) => {
	return nodes.map((node) => {
		if (hasNodeCredentials(node)) {
			return {
				...node,
				credentials: replaceTemplateNodeCredentials(node.credentials, toReplaceWith),
			};
		}

		return node;
	});
};
