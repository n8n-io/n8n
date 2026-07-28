import { decideTag } from '../tag-import-decision';

const source = { id: 'tag-1', name: 'prod' };
const sameIdSameName = { id: 'tag-1', name: 'prod' };
const sameIdOtherName = { id: 'tag-1', name: 'production' };
const otherIdSameName = { id: 'tag-2', name: 'prod' };

describe('decideTag', () => {
	describe('id match, name equal (exact match)', () => {
		it('attaches to the existing tag regardless of policy', () => {
			expect(decideTag(source, sameIdSameName, undefined, 'create', 'skip')).toEqual({
				action: 'attach',
				target: sameIdSameName,
			});
		});

		it('matches the trimmed package name', () => {
			expect(
				decideTag({ id: 'tag-1', name: '  prod  ' }, sameIdSameName, undefined, 'create', 'fail'),
			).toEqual({ action: 'attach', target: sameIdSameName });
		});
	});

	describe('id match, name differs (rename drift)', () => {
		it('gates under fail, reporting both names', () => {
			expect(decideTag(source, sameIdOtherName, undefined, 'create', 'fail')).toEqual({
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
			expect(decideTag(source, sameIdOtherName, undefined, 'create', 'skip')).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});

		it('renames the target tag to the package name under rename', () => {
			expect(decideTag(source, sameIdOtherName, undefined, 'create', 'rename')).toEqual({
				action: 'rename',
				rename: { id: 'tag-1', from: 'production', to: 'prod' },
			});
		});

		it('degrades rename to a gate when another tag holds the wanted name', () => {
			expect(decideTag(source, sameIdOtherName, otherIdSameName, 'create', 'rename')).toEqual({
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

	describe('id absent, name free', () => {
		it('creates with the source id and trimmed name under create', () => {
			expect(
				decideTag({ id: 'tag-1', name: ' prod ' }, undefined, undefined, 'create', 'fail'),
			).toEqual({ action: 'create', tag: { id: 'tag-1', name: 'prod' } });
		});

		it('drops under do-nothing', () => {
			expect(decideTag(source, undefined, undefined, 'do-nothing', 'fail')).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});
	});

	describe('id absent, name held by a different tag (name collision)', () => {
		it('drops under do-nothing, never conflicting', () => {
			expect(decideTag(source, undefined, otherIdSameName, 'do-nothing', 'fail')).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});

		it('gates under create + fail', () => {
			expect(decideTag(source, undefined, otherIdSameName, 'create', 'fail')).toEqual({
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
			expect(decideTag(source, undefined, otherIdSameName, 'create', 'rename')).toEqual({
				action: 'fail',
				failure: {
					kind: 'name-collision',
					sourceId: 'tag-1',
					name: 'prod',
					existingTagId: 'tag-2',
				},
			});
		});

		it('drops under create + skip', () => {
			expect(decideTag(source, undefined, otherIdSameName, 'create', 'skip')).toEqual({
				action: 'drop',
				tag: { id: 'tag-1', name: 'prod' },
			});
		});
	});

	describe('name validation (only when the plan would write)', () => {
		it('creates a 24-character name but gates a 25-character one', () => {
			const ok = 'a'.repeat(24);
			const tooLong = 'a'.repeat(25);
			expect(decideTag({ id: 't', name: ok }, undefined, undefined, 'create', 'fail')).toEqual({
				action: 'create',
				tag: { id: 't', name: ok },
			});
			expect(decideTag({ id: 't', name: tooLong }, undefined, undefined, 'create', 'fail')).toEqual(
				{
					action: 'fail',
					failure: { kind: 'invalid-name', sourceId: 't', name: tooLong },
				},
			);
		});

		it('gates a whitespace-only name on create', () => {
			expect(decideTag({ id: 't', name: '   ' }, undefined, undefined, 'create', 'fail')).toEqual({
				action: 'fail',
				failure: { kind: 'invalid-name', sourceId: 't', name: '' },
			});
		});

		it('gates a name with control characters on rename', () => {
			expect(
				decideTag(
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
				decideTag({ id: 't', name: 'a'.repeat(25) }, undefined, undefined, 'do-nothing', 'fail'),
			).toEqual({ action: 'drop', tag: { id: 't', name: 'a'.repeat(25) } });
		});
	});

	describe('id validation (creations only)', () => {
		it('creates a 64-character id but gates a 65-character one', () => {
			const ok = 'i'.repeat(64);
			const tooLong = 'i'.repeat(65);
			expect(decideTag({ id: ok, name: 'prod' }, undefined, undefined, 'create', 'fail')).toEqual({
				action: 'create',
				tag: { id: ok, name: 'prod' },
			});
			expect(
				decideTag({ id: tooLong, name: 'prod' }, undefined, undefined, 'create', 'fail'),
			).toEqual({
				action: 'fail',
				failure: { kind: 'invalid-id', sourceId: tooLong, name: 'prod' },
			});
		});
	});
});
