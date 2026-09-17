import { describe, it, expect } from 'vitest';
import {
	buildCredentialRows,
	CREDENTIAL_GROUP_HEADER_PREFIX,
	type CredentialDropdownOption,
} from '../useNodeCredentialOptions';

const option = (id: string, accessRoute?: 'personal' | 'project'): CredentialDropdownOption =>
	({ id, name: id, accessRoute, typeDisplayName: 'Gmail' }) as CredentialDropdownOption;

/** Compact shape for asserting the row sequence. */
const shape = (options: CredentialDropdownOption[]) =>
	buildCredentialRows(options).map((row) =>
		row.kind === 'header' ? `# ${row.route}` : row.option.id,
	);

describe('buildCredentialRows', () => {
	it('puts the caller-owned credentials under their own heading, first', () => {
		expect(shape([option('api-key', 'project'), option('my-google', 'personal')])).toEqual([
			'# personal',
			'my-google',
			'# project',
			'api-key',
		]);
	});

	it('omits the heading of a group with no options', () => {
		expect(shape([option('api-key', 'project')])).toEqual(['# project', 'api-key']);
	});

	// Hosts that supply their own already-scoped list (e.g. the Instance AI setup
	// card) do not set a route.
	it('treats an option with no route as a project credential', () => {
		expect(shape([option('unlabelled')])).toEqual(['# project', 'unlabelled']);
	});

	it('returns nothing for an empty list, so no headings render', () => {
		expect(buildCredentialRows([])).toEqual([]);
	});

	it('gives headings a sentinel value that cannot collide with a credential id', () => {
		const [header] = buildCredentialRows([option('c1', 'personal')]);

		expect(header).toEqual({
			kind: 'header',
			route: 'personal',
			value: `${CREDENTIAL_GROUP_HEADER_PREFIX}personal`,
		});
	});
});
