import type { SkillContent } from '../../utils/skill-content-hash';

/** A page holds one skill. Its child pages are the reference files, titled by their path under `references/`. */
export type Page = {
	id: string;
	title: string;
	summary: string;
	body: string;
	properties: Record<string, unknown> | null;
	children: Array<{ title: string; body: string }>;
	editCount: number;
};

export const PAGES_HOST = 'pages.test';

/**
 * A pretend Notion-like tool: workspaces with databases of pages, and no files or branches.
 * Tests set it up. `InMemorySkillSourceClient` only reads it, as a real client only reads its
 * remote. Links look like `https://pages.test/<workspace>/<database>`.
 */
export class InMemoryPagesStore {
	private readonly databases = new Map<string, Map<string, Page>>();

	private nextId = 1;

	/** Publishes the skills as a new database and answers its link. */
	publishDatabase(skills: SkillContent[], workspace = 'acme'): string {
		const database = `db${this.nextId++}`;
		const pages = new Map<string, Page>();
		for (const content of skills) {
			const page = toPage(`page${this.nextId++}`, content, 1);
			pages.set(page.id, page);
		}
		this.databases.set(`${workspace}/${database}`, pages);
		return `https://${PAGES_HOST}/${workspace}/${database}`;
	}

	editPage(link: string, title: string, content: SkillContent): void {
		const pages = this.pagesOf(link);
		const page = findByTitle(pages, title);
		if (!page) throw new Error(`No page "${title}"`);
		pages.set(page.id, toPage(page.id, content, page.editCount + 1));
	}

	removePage(link: string, title: string): void {
		const pages = this.pagesOf(link);
		const page = findByTitle(pages, title);
		if (page) pages.delete(page.id);
	}

	/** The pages of a database, or undefined when it does not exist. */
	database(workspace: string, database: string): ReadonlyMap<string, Page> | undefined {
		return this.databases.get(`${workspace}/${database}`);
	}

	private pagesOf(link: string): Map<string, Page> {
		const pages = this.databases.get(new URL(link).pathname.slice(1));
		if (!pages) throw new Error(`No database at ${link}`);
		return pages;
	}
}

function findByTitle(pages: Map<string, Page>, title: string): Page | undefined {
	return [...pages.values()].find((page) => page.title === title);
}

function toPage(id: string, content: SkillContent, editCount: number): Page {
	return {
		id,
		title: content.name,
		summary: content.description,
		body: content.instructions,
		properties: content.frontmatter,
		children: content.files.map((file) => ({
			title: file.path.replace(/^references\//, ''),
			body: file.content,
		})),
		editCount,
	};
}
