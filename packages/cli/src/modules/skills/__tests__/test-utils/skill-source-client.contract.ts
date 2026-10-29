// The cases that every `SkillSourceClient` passes: GitHub, and the in-memory pages fake. The
// fake has no files and no branches. If it cannot pass a case, the case has a git-only
// assumption.
import { jsonParse } from 'n8n-workflow';

import { SkillSourceNotFoundError } from '../../errors/skill-source-not-found.error';
import { SkillSourceUrlError } from '../../errors/skill-source-url.error';
import {
	skillSourceIdentityKey,
	type RemoteSkillRef,
	type SkillSourceAuth,
	type SkillSourceClient,
	type SkillSourceLocator,
} from '../../sources/skill-source-client';
import type { SkillContent } from '../../utils/skill-content-hash';

export type SkillSourceClientSubject = {
	client: SkillSourceClient;
	auth?: SkillSourceAuth;
	/** Publishes the skills in a new source and answers a link to it. */
	publish(skills: SkillContent[]): Promise<string>;
	/** Replaces the content of the published skill with this name. */
	edit(link: string, name: string, content: SkillContent): Promise<void>;
	/** Removes the published skill with this name. */
	remove(link: string, name: string): Promise<void>;
	/** Links that the client must refuse. */
	invalidLinks: string[];
	/** A link that the client can read, to a source that does not exist. */
	missingLink: string;
};

const skill = (name: string, extra: Partial<SkillContent> = {}): SkillContent => ({
	name,
	description: `${name} description`,
	instructions: `Follow ${name}.`,
	frontmatter: null,
	files: [],
	...extra,
});

const byName = (contents: SkillContent[]) =>
	[...contents]
		.map((content) => ({
			...content,
			files: [...content.files].sort((a, b) => a.path.localeCompare(b.path)),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

/**
 * Runs the contract cases. `subject` is called in each case, after the caller's
 * `beforeEach`, so the caller sets up and clears the source around each case.
 */
export function describeSkillSourceClientContract(subject: () => SkillSourceClientSubject) {
	async function discoverAll(
		client: SkillSourceClient,
		locator: SkillSourceLocator,
		auth?: SkillSourceAuth,
	): Promise<RemoteSkillRef[]> {
		const refs: RemoteSkillRef[] = [];
		let cursor: string | undefined;
		do {
			const page = await client.discover(locator, auth, cursor);
			refs.push(...page.items);
			cursor = page.next;
		} while (cursor !== undefined);
		return refs;
	}

	async function findRef(
		client: SkillSourceClient,
		locator: SkillSourceLocator,
		name: string,
		auth?: SkillSourceAuth,
	): Promise<RemoteSkillRef> {
		for (const ref of await discoverAll(client, locator, auth)) {
			if ((await client.fetchLatest(locator, ref, auth)).content.name === name) return ref;
		}
		throw new Error(`No skill named "${name}"`);
	}

	describe('SkillSourceClient contract', () => {
		it('finds every published skill and fetches its content', async () => {
			const { client, auth, publish } = subject();
			const published = [
				skill('Brand voice', {
					frontmatter: { 'allowed-tools': ['Read'], license: 'MIT' },
					files: [
						{ path: 'references/tone.md', content: '# Tone\n\nBe brief.\n' },
						{ path: 'references/guides/style.markdown', content: '# Style\n' },
					],
				}),
				skill('Release notes'),
				skill('Support replies'),
			];
			const locator = await client.parseLocator(await publish(published), auth);

			const refs = await discoverAll(client, locator, auth);
			const fetched = await Promise.all(
				refs.map(async (ref) => (await client.fetchLatest(locator, ref, auth)).content),
			);

			expect(refs).toHaveLength(3);
			expect(byName(fetched)).toEqual(byName(published));
		});

		it('pages through the skills with no gap and no duplicate, and resumes from a cursor', async () => {
			const { client, auth, publish } = subject();
			const names = ['A', 'B', 'C', 'D', 'E'];
			const locator = await client.parseLocator(
				await publish(names.map((name) => skill(name))),
				auth,
			);

			const refs = await discoverAll(client, locator, auth);
			const fetched = await Promise.all(
				refs.map(async (ref) => (await client.fetchLatest(locator, ref, auth)).content.name),
			);
			const first = await client.discover(locator, auth);

			expect(new Set(refs.map((ref) => JSON.stringify(ref))).size).toBe(refs.length);
			expect(fetched.sort()).toEqual(names);
			if (first.next !== undefined) {
				const again = await client.discover(locator, auth, first.next);
				const repeat = await client.discover(locator, auth, first.next);
				expect(repeat).toEqual(again);
			}
		});

		it('finds no skills in an empty source', async () => {
			const { client, auth, publish } = subject();
			const locator = await client.parseLocator(await publish([]), auth);

			expect(await discoverAll(client, locator, auth)).toEqual([]);
		});

		it('handles the links that it publishes, and no other source type', async () => {
			const { client, publish, missingLink } = subject();
			const link = await publish([skill('Mine')]);

			expect(client.handles(link)).toBe(true);
			expect(client.handles(missingLink)).toBe(true);
			expect(client.handles('https://example.com/acme/skills')).toBe(false);
		});

		it('fetches every skill at the revision that discover gave', async () => {
			const { client, auth, publish, edit } = subject();
			const link = await publish([skill('Pinned')]);
			const locator = await client.parseLocator(link, auth);
			const page = await client.discover(locator, auth);
			await edit(link, 'Pinned', skill('Pinned', { instructions: 'Edited after discover.' }));

			const fetched = await client.fetchLatest(locator, page.items[0], auth, page.revision);

			// A source without a revision reads its current content.
			if (page.revision !== undefined) {
				expect(fetched.content).toEqual(skill('Pinned'));
				expect(fetched.revision).toBe(page.revision);
			} else {
				expect(fetched.content).toEqual(
					skill('Pinned', { instructions: 'Edited after discover.' }),
				);
			}
		});

		it('refuses a link that it cannot read', async () => {
			const { client, auth, invalidLinks } = subject();

			for (const link of ['not a link', ...invalidLinks]) {
				await expect(client.parseLocator(link, auth)).rejects.toThrow(SkillSourceUrlError);
			}
		});

		it('fails with SkillSourceNotFoundError for a source that does not exist', async () => {
			const { client, auth, missingLink } = subject();

			await expect(client.parseLocator(missingLink, auth)).rejects.toThrow(
				SkillSourceNotFoundError,
			);
		});

		it('gives one identity for each source, the same for every parse', async () => {
			const { client, auth, publish } = subject();
			const first = await publish([skill('One')]);
			const second = await publish([skill('Two')]);

			const firstKey = skillSourceIdentityKey(
				client.identity(await client.parseLocator(first, auth)),
			);
			const againKey = skillSourceIdentityKey(
				client.identity(await client.parseLocator(first, auth)),
			);
			const secondKey = skillSourceIdentityKey(
				client.identity(await client.parseLocator(second, auth)),
			);

			expect(againKey).toBe(firstKey);
			expect(secondKey).not.toBe(firstKey);
			expect(firstKey).toBe(firstKey.toLowerCase());
		});

		it('reads with a locator and a ref that were stored as JSON', async () => {
			const { client, auth, publish } = subject();
			const locator = await client.parseLocator(await publish([skill('Stored')]), auth);
			const [ref] = await discoverAll(client, locator, auth);

			// A JSON column keeps only what JSON can hold.
			const stored = <T>(value: T): T => jsonParse<T>(JSON.stringify(value));
			const fetched = await client.fetchLatest(stored(locator), stored(ref), auth);

			expect(fetched.content).toEqual(skill('Stored'));
		});

		it('keeps the revision while the skill does not change, and moves it on a change', async () => {
			const { client, auth, publish, edit } = subject();
			const link = await publish([skill('Changing'), skill('Steady')]);
			const locator = await client.parseLocator(link, auth);
			const ref = await findRef(client, locator, 'Changing', auth);

			const before = await client.fetchLatest(locator, ref, auth);
			const unchanged = await client.fetchLatest(locator, ref, auth);
			await edit(link, 'Changing', skill('Changing', { instructions: 'New steps.' }));
			const after = await client.fetchLatest(locator, ref, auth);

			expect(unchanged.revision).toBe(before.revision);
			expect(after.revision).not.toBe(before.revision);
			expect(after.content.instructions).toBe('New steps.');
		});

		it('fails with SkillSourceNotFoundError for a skill that was removed', async () => {
			const { client, auth, publish, remove } = subject();
			const link = await publish([skill('Gone'), skill('Kept')]);
			const locator = await client.parseLocator(link, auth);
			const ref = await findRef(client, locator, 'Gone', auth);

			await remove(link, 'Gone');

			await expect(client.fetchLatest(locator, ref, auth)).rejects.toThrow(
				SkillSourceNotFoundError,
			);
		});

		it('names the source and gives each skill its own location', async () => {
			const { client, auth, publish } = subject();
			const locator = await client.parseLocator(await publish([skill('One'), skill('Two')]), auth);
			const refs = await discoverAll(client, locator, auth);

			expect(client.describe(locator).label).not.toBe('');
			expect(new Set(refs.map((ref) => client.location(ref))).size).toBe(refs.length);
		});

		it('gives https links to the source and to each skill', async () => {
			const { client, auth, publish } = subject();
			const locator = await client.parseLocator(await publish([skill('Linked')]), auth);
			const [ref] = await discoverAll(client, locator, auth);

			expect(new URL(client.webUrl(locator)).protocol).toBe('https:');
			expect(new URL(client.webUrl(locator, ref)).protocol).toBe('https:');
			expect(client.webUrl(locator, ref)).not.toBe(client.webUrl(locator));
		});
	});
}
