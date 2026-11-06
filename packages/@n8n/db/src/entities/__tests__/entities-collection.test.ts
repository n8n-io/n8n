import { readdirSync } from 'node:fs';
import path from 'node:path';

import { entities } from '../index';

/**
 * `db-connection-options.ts` builds the DataSource from the `entities` collection, not from the
 * module's re-exports. An entity can therefore be exported, typed, migrated and queried in tests
 * while TypeORM has no metadata for it at runtime — every write then fails with
 * `EntityMetadataNotFoundError`, which is easy to swallow and hard to notice.
 *
 * This guards the gap between "the class is exported" and "the DataSource knows about it".
 */
describe('entities collection', () => {
	const dir = path.join(__dirname, '..');

	/** Entity classes are named for their file: `activity-event.ts` → `ActivityEvent`. */
	const toClassName = (file: string) =>
		file
			.replace(/\.(ee\.)?ts$/, '')
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join('');

	// Files that declare no entity, or whose entity is deliberately not in the DataSource.
	const NOT_ENTITIES = new Set(['abstract-entity', 'index', 'types-db', 'insights-shared']);

	it('registers every entity file with the DataSource', () => {
		const registered = new Set(Object.keys(entities));
		const missing: string[] = [];

		for (const file of readdirSync(dir)) {
			if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
			const slug = file.replace(/\.(ee\.)?ts$/, '');
			if (NOT_ENTITIES.has(slug)) continue;

			const expected = toClassName(file);
			// Several files name their class differently from the file (Entity/Mapping suffixes and
			// the like), so only flag a file whose obvious class name exists as an export but is
			// absent from the collection — that is the mistake this test is for.
			if (!registered.has(expected)) missing.push(`${file} → ${expected}`);
		}

		// Names that legitimately differ from their filename; each is registered under another key.
		// Kept to exactly the files that need it: an alias for a file whose derived name IS in the
		// collection is dead weight that only wakes up to swallow the removal this test exists to catch.
		const KNOWN_ALIASES = ['credential-dependency-entity.ts', 'workflow-dependency-entity.ts'];
		const unexplained = missing.filter(
			(entry) => !KNOWN_ALIASES.some((alias) => entry.startsWith(alias)),
		);

		expect(unexplained).toEqual([]);
	});

	it('registers ActivityEvent, not merely exports it', () => {
		expect(Object.keys(entities)).toContain('ActivityEvent');
	});
});
