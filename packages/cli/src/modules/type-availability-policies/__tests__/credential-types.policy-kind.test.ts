import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import {
	CredentialTypesPolicyKind,
	credentialTypeCoveringSelectors,
	credentialTypeSelectorMatcher,
} from '../credential-types.policy-kind';
import type { PolicyRule } from '../policy-rule.types';

/** A minimal stand-in for `LoadNodesAndCredentials`, built from just the fields these kinds read. */
function makeRegistry(
	loaders: LoadNodesAndCredentials['loaders'],
	knownCredentials: LoadNodesAndCredentials['knownCredentials'] = {},
): LoadNodesAndCredentials {
	return { loaders, knownCredentials } as unknown as LoadNodesAndCredentials;
}

describe('credentialTypeSelectorMatcher', () => {
	const matches = credentialTypeSelectorMatcher({
		name: 'googleSheetsOAuth2Api',
		package: 'n8n-nodes-base',
		ancestors: ['googleOAuth2Api', 'oAuth2Api'],
	});

	it('matches a name rule only on the exact type name', () => {
		expect(matches({ kind: 'name', value: 'googleSheetsOAuth2Api' })).toBe(true);
		expect(matches({ kind: 'name', value: 'googleOAuth2Api' })).toBe(false);
	});

	it('matches a package rule for its own package', () => {
		expect(matches({ kind: 'package', value: 'n8n-nodes-base' })).toBe(true);
		expect(matches({ kind: 'package', value: 'n8n-nodes-other' })).toBe(false);
	});

	it('never matches a package rule when the package is unknown', () => {
		const unknownPackage = credentialTypeSelectorMatcher({
			name: 'customApi',
			package: null,
			ancestors: [],
		});

		expect(unknownPackage({ kind: 'package', value: 'n8n-nodes-base' })).toBe(false);
	});

	it('matches an extends rule naming the type itself', () => {
		expect(matches({ kind: 'extends', value: 'googleSheetsOAuth2Api' })).toBe(true);
	});

	it('matches an extends rule naming any type in its ancestors', () => {
		expect(matches({ kind: 'extends', value: 'googleOAuth2Api' })).toBe(true);
		expect(matches({ kind: 'extends', value: 'oAuth2Api' })).toBe(true);
	});

	it('does not match an extends rule naming a type outside the chain', () => {
		expect(matches({ kind: 'extends', value: 'slackApi' })).toBe(false);
	});
});

describe('credentialTypeCoveringSelectors', () => {
	const facts = {
		packageOf: (typeName: string) => (typeName === 'slackApi' ? 'n8n-nodes-base' : null),
		ancestorsOf: (typeName: string) =>
			typeName === 'googleSheetsOAuth2Api' ? ['googleOAuth2Api', 'oAuth2Api'] : [],
	};

	it('only covers itself for a package selector', () => {
		expect(
			credentialTypeCoveringSelectors({ kind: 'package', value: 'n8n-nodes-base' }, facts),
		).toEqual([{ kind: 'package', value: 'n8n-nodes-base' }]);
	});

	it('covers an extends selector with itself and every ancestor', () => {
		expect(
			credentialTypeCoveringSelectors({ kind: 'extends', value: 'googleSheetsOAuth2Api' }, facts),
		).toEqual([
			{ kind: 'extends', value: 'googleSheetsOAuth2Api' },
			{ kind: 'extends', value: 'googleOAuth2Api' },
			{ kind: 'extends', value: 'oAuth2Api' },
		]);
	});

	it('covers a name selector with itself, its package, and the extends family', () => {
		expect(credentialTypeCoveringSelectors({ kind: 'name', value: 'slackApi' }, facts)).toEqual([
			{ kind: 'name', value: 'slackApi' },
			{ kind: 'package', value: 'n8n-nodes-base' },
			{ kind: 'extends', value: 'slackApi' },
		]);
	});

	it('omits the package entry for a name selector whose package is unknown', () => {
		expect(
			credentialTypeCoveringSelectors({ kind: 'name', value: 'googleSheetsOAuth2Api' }, facts),
		).toEqual([
			{ kind: 'name', value: 'googleSheetsOAuth2Api' },
			{ kind: 'extends', value: 'googleSheetsOAuth2Api' },
			{ kind: 'extends', value: 'googleOAuth2Api' },
			{ kind: 'extends', value: 'oAuth2Api' },
		]);
	});
});

describe('CredentialTypesPolicyKind', () => {
	describe('knownTypeNames', () => {
		it('lists the keys the loader registry reports as known credentials', () => {
			const kind = new CredentialTypesPolicyKind(
				makeRegistry(
					{},
					{
						slackApi: { className: 'SlackApi', sourcePath: '' },
						oAuth2Api: { className: 'OAuth2Api', sourcePath: '' },
					},
				),
			);

			expect(kind.knownTypeNames()).toEqual(['slackApi', 'oAuth2Api']);
		});
	});

	describe('packageOf', () => {
		it('resolves a credential type package from the loader that loaded it', () => {
			const registry = makeRegistry({
				'n8n-nodes-base': {
					packageName: 'n8n-nodes-base',
					known: {
						nodes: {},
						credentials: { slackApi: { className: 'SlackApi', sourcePath: '' } },
					},
				} as unknown as LoadNodesAndCredentials['loaders'][string],
				'@acme/n8n-nodes-acme': {
					packageName: '@acme/n8n-nodes-acme',
					known: { nodes: {}, credentials: { acmeApi: { className: 'AcmeApi', sourcePath: '' } } },
				} as unknown as LoadNodesAndCredentials['loaders'][string],
			});
			const kind = new CredentialTypesPolicyKind(registry);

			expect(kind.packageOf('slackApi')).toBe('n8n-nodes-base');
			expect(kind.packageOf('acmeApi')).toBe('@acme/n8n-nodes-acme');
		});

		it('resolves to null for a credential type no loader registered', () => {
			const kind = new CredentialTypesPolicyKind(makeRegistry({}));

			expect(kind.packageOf('unknownApi')).toBeNull();
		});

		it('resolves to null for a credential type named after an Object.prototype property', () => {
			const registry = makeRegistry({
				'n8n-nodes-base': {
					packageName: 'n8n-nodes-base',
					known: { nodes: {}, credentials: {} },
				} as unknown as LoadNodesAndCredentials['loaders'][string],
			});
			const kind = new CredentialTypesPolicyKind(registry);

			expect(kind.packageOf('toString')).toBeNull();
			expect(kind.packageOf('constructor')).toBeNull();
		});

		it('resolves to the last loader when two packages register the same credential type', () => {
			const registry = makeRegistry({
				first: {
					packageName: 'first',
					known: { nodes: {}, credentials: { sharedApi: { className: 'Shared', sourcePath: '' } } },
				} as unknown as LoadNodesAndCredentials['loaders'][string],
				second: {
					packageName: 'second',
					known: { nodes: {}, credentials: { sharedApi: { className: 'Shared', sourcePath: '' } } },
				} as unknown as LoadNodesAndCredentials['loaders'][string],
			});
			const kind = new CredentialTypesPolicyKind(registry);

			// Matches `LoadNodesAndCredentials.getCredential()`, which keeps overwriting as it
			// iterates every loader, so the last one registered wins.
			expect(kind.packageOf('sharedApi')).toBe('second');
		});
	});

	describe('ancestorsOf', () => {
		it('lists every credential type a type is built on, nearest first', () => {
			const kind = new CredentialTypesPolicyKind(
				makeRegistry(
					{},
					{
						oAuth2Api: { className: '', sourcePath: '' },
						googleOAuth2Api: { className: '', sourcePath: '', extends: ['oAuth2Api'] },
						googleSheetsOAuth2Api: {
							className: '',
							sourcePath: '',
							extends: ['googleOAuth2Api'],
						},
					},
				),
			);

			expect(kind.ancestorsOf('googleSheetsOAuth2Api')).toEqual(['googleOAuth2Api', 'oAuth2Api']);
		});

		it('lists a shared base once when two parents build on it', () => {
			const kind = new CredentialTypesPolicyKind(
				makeRegistry(
					{},
					{
						left: { className: '', sourcePath: '', extends: ['root'] },
						right: { className: '', sourcePath: '', extends: ['root'] },
						both: { className: '', sourcePath: '', extends: ['left', 'right'] },
					},
				),
			);

			expect(kind.ancestorsOf('both')).toEqual(['left', 'right', 'root']);
		});

		it('stops on a cycle instead of looping', () => {
			const kind = new CredentialTypesPolicyKind(
				makeRegistry(
					{},
					{
						aApi: { className: '', sourcePath: '', extends: ['bApi'] },
						bApi: { className: '', sourcePath: '', extends: ['aApi'] },
					},
				),
			);

			expect(kind.ancestorsOf('aApi')).toEqual(['bApi']);
		});

		it('gives an unknown credential type no ancestors', () => {
			const kind = new CredentialTypesPolicyKind(makeRegistry({}));

			expect(kind.ancestorsOf('toString')).toEqual([]);
		});
	});

	describe('assertWritable', () => {
		const rule = (overrides: Partial<PolicyRule> & Pick<PolicyRule, 'selector'>): PolicyRule => ({
			id: 'r1',
			action: 'allow',
			...overrides,
		});

		it('does not throw for a name, package, or extends rule naming known, installed types', () => {
			const kind = new CredentialTypesPolicyKind(
				makeRegistry(
					{ 'n8n-nodes-base': {} as LoadNodesAndCredentials['loaders'][string] },
					{ oAuth2Api: { className: '', sourcePath: '' } },
				),
			);

			expect(() =>
				kind.assertWritable([
					rule({ selector: { kind: 'name', value: 'slackApi' } }),
					rule({ selector: { kind: 'package', value: 'n8n-nodes-base' } }),
					rule({ selector: { kind: 'extends', value: 'oAuth2Api' } }),
				]),
			).not.toThrow();
		});

		it('rejects a package rule naming a package that is not installed', () => {
			const kind = new CredentialTypesPolicyKind(makeRegistry({}));

			expect(() =>
				kind.assertWritable([
					rule({ selector: { kind: 'package', value: 'n8n-nodes-not-installed' } }),
				]),
			).toThrow(/^Package rule names a package that is not installed:/);
		});

		it('rejects an extends rule whose base is not a known credential type', () => {
			const kind = new CredentialTypesPolicyKind(makeRegistry({}));

			expect(() =>
				kind.assertWritable([rule({ selector: { kind: 'extends', value: 'unknownApi' } })]),
			).toThrow('Extends rule names a credential type that is not installed: unknownApi');
		});
	});
});
