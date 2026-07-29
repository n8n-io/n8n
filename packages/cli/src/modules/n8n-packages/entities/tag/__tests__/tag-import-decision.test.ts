import { decideTagImportAction } from '../tag-import-decision';

const source = { id: 'tag-1', name: 'prod' };
const sameIdSameName = { id: 'tag-1', name: 'prod' };
const sameIdOtherName = { id: 'tag-1', name: 'production' };
const otherIdSameName = { id: 'tag-2', name: 'prod' };

describe('decideTagImportAction', () => {
	describe('tag exists on the target with the same id and name (exact match)', () => {
		it('attaches to the existing tag regardless of policy', () => {
			expect(decideTagImportAction(source, sameIdSameName, undefined, 'create', 'skip')).toEqual({
				action: 'attach',
				target: sameIdSameName,
			});
		});

		it('matches the trimmed package name', () => {
			expect(
				decideTagImportAction(
					{ id: 'tag-1', name: '  prod  ' },
					sameIdSameName,
					undefined,
					'create',
					'fail',
				),
			).toEqual({ action: 'attach', target: sameIdSameName });
		});
	});

	describe('tag exists on the target with the same id but a different name (rename drift)', () => {
		it('gates under fail, reporting both names', () => {
			expect(decideTagImportAction(source, sameIdOtherName, undefined, 'create', 'fail')).toEqual({
				action: 'fail',
				failure: {
					kind: 'rename-drift',
					sourceId: 'tag-1',
					name: 'prod',
					existingName: 'production',
				},
			});
		});

		it('drops under skip', () => {
			expect(decideTagImportAction(source, sameIdOtherName, undefined, 'create', 'skip')).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});

		it('renames the target tag to the package name under rename', () => {
			expect(decideTagImportAction(source, sameIdOtherName, undefined, 'create', 'rename')).toEqual(
				{
					action: 'rename',
					rename: { id: 'tag-1', from: 'production', to: 'prod' },
				},
			);
		});

		it('degrades rename to a gate when another tag holds the wanted name', () => {
			expect(
				decideTagImportAction(source, sameIdOtherName, otherIdSameName, 'create', 'rename'),
			).toEqual({
				action: 'fail',
				failure: {
					kind: 'rename-drift',
					sourceId: 'tag-1',
					name: 'prod',
					existingName: 'production',
					existingTagId: 'tag-2',
				},
			});
		});
	});

	describe('tag missing from the target, name free (create happy path)', () => {
		it('creates with the source id and trimmed name under create', () => {
			expect(
				decideTagImportAction(
					{ id: 'tag-1', name: ' prod ' },
					undefined,
					undefined,
					'create',
					'fail',
				),
			).toEqual({ action: 'create', tag: { id: 'tag-1', name: 'prod' } });
		});

		it('drops under do-nothing', () => {
			expect(decideTagImportAction(source, undefined, undefined, 'do-nothing', 'fail')).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});
	});

	describe('tag missing from the target, name taken by a different tag (name collision, e.g. tag created manually on the target)', () => {
		it('drops under do-nothing, never conflicting', () => {
			expect(
				decideTagImportAction(source, undefined, otherIdSameName, 'do-nothing', 'fail'),
			).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});

		it('gates under create + fail', () => {
			expect(decideTagImportAction(source, undefined, otherIdSameName, 'create', 'fail')).toEqual({
				action: 'fail',
				failure: {
					kind: 'name-collision',
					sourceId: 'tag-1',
					name: 'prod',
					existingTagId: 'tag-2',
				},
			});
		});

		it('gates under create + rename (renaming would need id reconciliation)', () => {
			expect(decideTagImportAction(source, undefined, otherIdSameName, 'create', 'rename')).toEqual(
				{
					action: 'fail',
					failure: {
						kind: 'name-collision',
						sourceId: 'tag-1',
						name: 'prod',
						existingTagId: 'tag-2',
					},
				},
			);
		});

		it('drops under create + skip', () => {
			expect(decideTagImportAction(source, undefined, otherIdSameName, 'create', 'skip')).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});
	});

	describe('tag name validation (only when the import would write the name)', () => {
		it('creates a 24-character name but gates a 25-character one', () => {
			const ok = 'a'.repeat(24);
			const tooLong = 'a'.repeat(25);
			expect(
				decideTagImportAction({ id: 't', name: ok }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'create',
				tag: { id: 't', name: ok },
			});
			expect(
				decideTagImportAction({ id: 't', name: tooLong }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'fail',
				failure: { kind: 'invalid-name', sourceId: 't', name: tooLong },
			});
		});

		it('counts code points, not UTF-16 units: 24 emoji create, 25 gate', () => {
			const ok = '😀'.repeat(24);
			const tooLong = '😀'.repeat(25);
			expect(
				decideTagImportAction({ id: 't', name: ok }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'create',
				tag: { id: 't', name: ok },
			});
			expect(
				decideTagImportAction({ id: 't', name: tooLong }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'fail',
				failure: { kind: 'invalid-name', sourceId: 't', name: tooLong },
			});
		});

		it('gates a name containing a lone UTF-16 surrogate', () => {
			const loneSurrogate = 'pr\ud800od';
			expect(
				decideTagImportAction(
					{ id: 't', name: loneSurrogate },
					undefined,
					undefined,
					'create',
					'fail',
				),
			).toEqual({
				action: 'fail',
				failure: { kind: 'invalid-name', sourceId: 't', name: loneSurrogate },
			});
		});

		it('accepts a ZWJ-joined emoji name', () => {
			const family = '👨‍👩‍👧';
			expect(
				decideTagImportAction({ id: 't', name: family }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'create',
				tag: { id: 't', name: family },
			});
		});

		it('gates a whitespace-only name on create', () => {
			expect(
				decideTagImportAction({ id: 't', name: '   ' }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'fail',
				failure: { kind: 'invalid-name', sourceId: 't', name: '' },
			});
		});

		it('gates a name with control characters on rename', () => {
			expect(
				decideTagImportAction(
					{ id: 'tag-1', name: 'pr' + String.fromCharCode(7) + 'od' },
					sameIdOtherName,
					undefined,
					'create',
					'rename',
				),
			).toEqual({
				action: 'fail',
				failure: {
					kind: 'invalid-name',
					sourceId: 'tag-1',
					name: 'pr' + String.fromCharCode(7) + 'od',
				},
			});
		});

		it('does not validate a dropped tag', () => {
			expect(
				decideTagImportAction(
					{ id: 't', name: 'a'.repeat(25) },
					undefined,
					undefined,
					'do-nothing',
					'fail',
				),
			).toEqual({ action: 'drop', tag: { id: 't', name: 'a'.repeat(25) } });
		});
	});

	describe('tag id validation (only when the import would create the tag)', () => {
		it('creates a 36-character id but gates a 37-character one', () => {
			const ok = 'i'.repeat(36);
			const tooLong = 'i'.repeat(37);
			expect(
				decideTagImportAction({ id: ok, name: 'prod' }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'create',
				tag: { id: ok, name: 'prod' },
			});
			expect(
				decideTagImportAction(
					{ id: tooLong, name: 'prod' },
					undefined,
					undefined,
					'create',
					'fail',
				),
			).toEqual({
				action: 'fail',
				failure: { kind: 'invalid-id', sourceId: tooLong, name: 'prod' },
			});
		});
	});
});
