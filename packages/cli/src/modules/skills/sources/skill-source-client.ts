import type { SkillContent } from '../utils/skill-content-hash';

/**
 * Where the skills of a source are, as the client parsed it from a link. Only the client reads
 * it. The core stores it as JSON and compares nothing in it.
 */
export type SkillSourceLocator = Record<string, unknown>;

/** Where one skill is in a source, such as its folder. Opaque to the core, as the locator is. */
export type RemoteSkillRef = Record<string, unknown>;

/**
 * The one structured value of a source, because the duplicate rules compare it. Two links to
 * the same repository give the same identity.
 */
export type SkillSourceIdentity = {
	/** The source type, such as `github`. */
	type: string;
	host: string;
	owner: string;
	repository: string;
};

/**
 * Access for a private source. The service resolves the n8n credential, and the client turns
 * it into this with `authFrom`. `credentialType` tells the client what kind of token it is.
 */
export type SkillSourceAuth = {
	token: string;
	credentialType: string;
	/** The n8n credential. A client keys its caches by it, as a fresh token changes each time. */
	credentialId?: string;
};

/** One repository that a credential can read, for the repository select. */
export type SkillSourceRepository = {
	owner: string;
	name: string;
	private: boolean;
	/** A link that `parseLocator` reads. */
	url: string;
};

/** A part of the remote skill that the content of an n8n skill cannot hold. */
export type SkillSourceFidelityWarning = { code: string; detail: string };

/** What the core can expect from a source type. */
export type SkillSourceCapabilities = {
	/** `listing`: one source has many skills. `single`: a source is one skill. */
	discovery: 'listing' | 'single';
	/** What tells the core that something changed, before it fetches. */
	changeDetection: 'source' | 'skill' | 'both' | 'content-hash';
	/** Whether the client can fetch the content of an older revision. */
	pinnedFetch: boolean;
	/** Whether the client can describe the changes between two revisions. */
	history: boolean;
	/** `lossy`: a conversion to skill content can drop parts. */
	importFidelity: 'lossless' | 'lossy';
};

export type FetchedSkill = {
	content: SkillContent;
	/** Opaque. Equal revisions mean equal content. The core compares content hashes, not these. */
	revision: string;
	fidelity: SkillSourceFidelityWarning[];
	/** Paths of the remote files that the content leaves out, such as scripts. */
	skippedFiles: string[];
};

/**
 * Reads skills from one type of source, such as GitHub. A client only parses links, lists
 * skills and fetches one skill. It never writes skills: `SkillSyncService` compares hashes,
 * builds diffs and writes through `SkillService`.
 *
 * No source SDK type and no TypeORM type crosses this class. `describeSkillSourceClientContract`
 * in `__tests__/test-utils/` holds the cases that every client passes.
 */
export abstract class SkillSourceClient {
	/** The value of `skill_source.type`, such as `github`. */
	abstract readonly type: string;

	/** The n8n credential types that can read a private source. */
	abstract readonly credentialTypes: readonly string[];

	/**
	 * The access of a decrypted credential of one of `credentialTypes`. Throws
	 * `SkillSourceReadError` with `credential_invalid` for a credential that this client cannot
	 * use, such as one without a token or for another host.
	 */
	abstract authFrom(credential: {
		id?: string;
		type: string;
		data: Record<string, unknown>;
	}): SkillSourceAuth;

	/**
	 * Refuses a decrypted credential that this client cannot use, such as one for another
	 * host, with the errors of `authFrom`. It runs before a fresh token is minted, so the
	 * credential sends no request for a source that refuses it.
	 */
	checkCredential?(credential: { type: string; data: Record<string, unknown> }): void;

	/**
	 * The repositories that the access can read, sorted, and whether there are more than the
	 * client lists. Only for source types where a credential can browse its sources.
	 */
	listRepositories?(
		auth: SkillSourceAuth,
	): Promise<{ repositories: SkillSourceRepository[]; truncated: boolean }>;

	abstract readonly capabilities: SkillSourceCapabilities;

	/**
	 * Whether the link is for this source type, such as a github.com link for GitHub. A cheap
	 * check with no request. The service picks the client that handles a link, and that
	 * client's `parseLocator` explains what is wrong with it.
	 */
	abstract handles(input: string): boolean;

	/**
	 * Parses a link that a user pasted. Async, because a branch name can contain "/" and needs
	 * a lookup. Throws `SkillSourceUrlError` for a link that this client cannot read, and
	 * `SkillSourceNotFoundError` for a source that is not there.
	 */
	abstract parseLocator(input: string, auth?: SkillSourceAuth): Promise<SkillSourceLocator>;

	abstract identity(locator: SkillSourceLocator): SkillSourceIdentity;

	/**
	 * How the picker names a source: a label such as `owner/repository`, the branch (null for
	 * a source type without branches), and the folder that the link points to.
	 */
	abstract describe(locator: SkillSourceLocator): {
		label: string;
		ref: string | null;
		path: string;
	};

	/** Where one skill is in the source, such as its folder, for the picker. */
	abstract location(ref: RemoteSkillRef): string;

	/** A page in the source that a user can open, for the source or for one skill. */
	abstract webUrl(locator: SkillSourceLocator, ref?: RemoteSkillRef): string;

	/**
	 * One page of the skills in the source. Call again with `next` until it is undefined.
	 * `truncated` is true when the source has more skills than the client lists. `revision`,
	 * when the client has one, is the revision of the whole source that the page lists.
	 */
	abstract discover(
		locator: SkillSourceLocator,
		auth?: SkillSourceAuth,
		cursor?: string,
	): Promise<{
		items: RemoteSkillRef[];
		next?: string;
		truncated?: boolean;
		/** Skills that the client did not list, as they are deeper than it looks. */
		tooDeep?: number;
		revision?: string;
	}>;

	/**
	 * The current content of one skill. Throws `SkillSourceNotFoundError` when it is gone.
	 * With `revision` from `discover`, the client may read the skill at that revision, so the
	 * fetches of one import read the same state of the source without asking for it again.
	 */
	abstract fetchLatest(
		locator: SkillSourceLocator,
		ref: RemoteSkillRef,
		auth?: SkillSourceAuth,
		revision?: string,
	): Promise<FetchedSkill>;
}

/** The `skill_source.identityKey` of an identity, in lower case. */
export function skillSourceIdentityKey(identity: SkillSourceIdentity): string {
	const { type, host, owner, repository } = identity;
	return `${type}:${host}/${owner}/${repository}`.toLowerCase();
}
