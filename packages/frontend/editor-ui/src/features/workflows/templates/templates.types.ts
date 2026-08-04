import type { INodeUi } from '@/Interface';
import type { INodeCredentialDescription, INodeCredentialsDetails } from 'n8n-workflow';
import type { TemplateCredentialKey } from './utils/templateTransforms';

export type NodeCredentials = {
	[key: string]: string | INodeCredentialsDetails;
};

/**
 * Node that can either be in a workflow or in a template workflow. These
 * have a bit different shape and this type is used to represent both.
 */
export type BaseNode = Pick<
	INodeUi,
	'name' | 'parameters' | 'position' | 'type' | 'typeVersion'
> & {
	credentials?: NodeCredentials;
};

export type NodeWithCredentials<TNode extends BaseNode> = TNode & {
	credentials: NodeCredentials;
};

export type NodeWithRequiredCredential<TNode extends BaseNode> = {
	node: TNode;
	requiredCredentials: INodeCredentialDescription[];
};

export type CredentialUsages<TNode extends BaseNode = BaseNode> = {
	/**
	 * Key is a combination of the credential name and the credential type name,
	 * e.g. "twitter-twitterOAuth1Api"
	 */
	key: TemplateCredentialKey;
	credentialName: string;
	credentialType: string;
	nodeTypeName: string;
	usedBy: TNode[];
};

export type AppCredentials<TNode extends BaseNode> = {
	appName: string;
	credentials: Array<CredentialUsages<TNode>>;
};

/**
 * The credentials of a node in a template workflow. Map from credential
 * type name to credential name.
 * @example
 * {
 *  twitterOAuth1Api: "Twitter credentials"
 * }
 */
export type NormalizedTemplateNodeCredentials = Record<string, string>;
