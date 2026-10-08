/** One version of an action that this instance published, as the Nodes settings page lists it. */
export interface NextNodeInstanceVersion {
	/** E.g. `acme.greeting.get`. */
	readonly actionId: string;
	readonly semver: string;
	/** The id of the node that groups the action, e.g. `acme`. */
	readonly node: string;
	/** The node type name in the n8n UI, e.g. `Acme: Get a greeting`. */
	readonly displayName: string;
	/** The action name, e.g. `Get a greeting`. */
	readonly action: string;
	readonly summary: string;
	/** A hidden action is out of the node creator. Workflows that locked it keep running it. */
	readonly status: 'published' | 'hidden';
	readonly createdAt: string;
	/** Who published the version, so users know whom to ask about it. `null`: a deleted user. */
	readonly publishedBy: { readonly name: string; readonly email: string } | null;
	/**
	 * What changed in the inputs and outputs since the version before, e.g. `input lang added`.
	 * Empty for the first version, and for a version that changed only the request.
	 */
	readonly changes: readonly string[];
}

/** One test run of a draft: its items or its error. A run without an error gives a fixture. */
export interface NextNodeDraftTestResult {
	readonly status: 'success' | 'error';
	readonly items: ReadonlyArray<Record<string, unknown>>;
	readonly error?: string;
	/** The execution fixture that publish takes. The client sends it back as it is. */
	readonly fixture?: Record<string, unknown>;
	/** The JSON Schema that the items show. */
	readonly outputSchema?: Record<string, unknown>;
}

/** A node that n8n ships and that a custom action can extend, e.g. GitHub. */
export interface NextNodeParent {
	/** E.g. `github`. */
	readonly id: string;
	readonly displayName: string;
	/** The credential types of the node. An action that extends it takes them all. */
	readonly credentialTypes: readonly string[];
	/** The input fields that each resource shares, by resource, e.g. `issue: [owner, repository]`. */
	readonly resources: Readonly<Record<string, readonly string[]>>;
}

/** The newest version of an action and its HTTP guest config, which the form edits. */
export interface NextNodeActionConfig {
	readonly semver: string;
	readonly config: Record<string, unknown>;
}

/** A version of an action major that a save can lock, as the editor lists it. */
export interface NextNodeActionVersion {
	readonly version: string;
	readonly digest: string;
	/** The node contract that the version implements, e.g. `2.11.0`. */
	readonly nodeContract: string;
	/** Set when a yank or revoke line applies to the version. A save does not lock it. */
	readonly withdrawn?: 'yanked' | 'revoked';
}
