import { SkillSourceNotFoundError } from '../../errors/skill-source-not-found.error';
import { SkillSourceUrlError } from '../../errors/skill-source-url.error';
import {
	SkillSourceClient,
	type FetchedSkill,
	type RemoteSkillRef,
	type SkillSourceAuth,
	type SkillSourceCapabilities,
	type SkillSourceIdentity,
	type SkillSourceLocator,
} from '../../sources/skill-source-client';
import { PAGES_HOST, type InMemoryPagesStore, type Page } from './in-memory-pages-store';

const PAGE_SIZE = 2;

/**
 * Reads skills from an `InMemoryPagesStore`, a source with no files and no branches. The core
 * must work with it as with GitHub. If a contract case needs files or branches to pass, the
 * case has a git-only assumption.
 *
 * Discovery answers two pages at a time, so callers must follow `next`.
 */
export class InMemorySkillSourceClient extends SkillSourceClient {
	readonly type = 'pages';

	readonly credentialTypes = [];

	readonly capabilities: SkillSourceCapabilities = {
		discovery: 'listing',
		changeDetection: 'skill',
		pinnedFetch: false,
		history: false,
		importFidelity: 'lossless',
	};

	constructor(private readonly store: InMemoryPagesStore) {
		super();
	}

	async parseLocator(input: string): Promise<SkillSourceLocator> {
		const match = /^https:\/\/pages\.test\/([^/\s]+)\/([^/\s]+)\/?$/.exec(input.trim());
		if (!match) throw new SkillSourceUrlError('This is not a link to a pages database.');
		const [, workspace, database] = match;
		if (!this.store.database(workspace, database)) {
			throw new SkillSourceNotFoundError('The database does not exist.');
		}
		return { workspace, database };
	}

	identity(locator: SkillSourceLocator): SkillSourceIdentity {
		const { workspace, database } = readLocator(locator);
		return { type: this.type, host: PAGES_HOST, owner: workspace, repository: database };
	}

	webUrl(locator: SkillSourceLocator, ref?: RemoteSkillRef): string {
		const { workspace, database } = readLocator(locator);
		const base = `https://${PAGES_HOST}/${workspace}/${database}`;
		return ref ? `${base}/${pageIdOf(ref)}` : base;
	}

	async discover(
		locator: SkillSourceLocator,
		_auth?: SkillSourceAuth,
		cursor?: string,
	): Promise<{ items: RemoteSkillRef[]; next?: string }> {
		const ids = [...this.pagesAt(locator).keys()];
		const start = cursor ? Number(cursor) : 0;
		const end = start + PAGE_SIZE;
		const items = ids.slice(start, end).map((pageId) => ({ pageId }));
		return end < ids.length ? { items, next: String(end) } : { items };
	}

	async fetchLatest(locator: SkillSourceLocator, ref: RemoteSkillRef): Promise<FetchedSkill> {
		const page = this.pagesAt(locator).get(pageIdOf(ref));
		if (!page) throw new SkillSourceNotFoundError('The page does not exist.');
		return {
			content: toSkillContent(page),
			revision: `${page.id}@${page.editCount}`,
			fidelity: [],
			skippedFiles: [],
		};
	}

	private pagesAt(locator: SkillSourceLocator): ReadonlyMap<string, Page> {
		const { workspace, database } = readLocator(locator);
		const pages = this.store.database(workspace, database);
		if (!pages) throw new SkillSourceNotFoundError('The database does not exist.');
		return pages;
	}
}

function toSkillContent(page: Page): FetchedSkill['content'] {
	return {
		name: page.title,
		description: page.summary,
		instructions: page.body,
		frontmatter: page.properties,
		files: page.children.map((child) => ({
			path: `references/${child.title}`,
			content: child.body,
		})),
	};
}

function readLocator(locator: SkillSourceLocator): { workspace: string; database: string } {
	const { workspace, database } = locator;
	if (typeof workspace !== 'string' || typeof database !== 'string') {
		throw new Error('Not a pages locator');
	}
	return { workspace, database };
}

function pageIdOf(ref: RemoteSkillRef): string {
	if (typeof ref.pageId !== 'string') throw new Error('Not a pages ref');
	return ref.pageId;
}
