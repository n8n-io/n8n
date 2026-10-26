import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from '../constants';
import {
	loadedCheckFor,
	isCredentialTypeKnown,
	isPackageInstalled,
	packageResolverFor,
	policedTypeFor,
} from '../package-resolver';

/** A minimal stand-in for `LoadNodesAndCredentials`, built from just its public `loaders`. */
function makeRegistry(loaders: LoadNodesAndCredentials['loaders']): LoadNodesAndCredentials {
	return { loaders } as LoadNodesAndCredentials;
}

describe('packageResolverFor', () => {
	it('resolves a node type package by the segment before the first dot', () => {
		const resolvePackage = packageResolverFor(NODE_TYPES_KIND, makeRegistry({}));

		expect(resolvePackage('n8n-nodes-base.slack')).toBe('n8n-nodes-base');
		expect(resolvePackage('@acme/n8n-nodes-acme.thing')).toBe('@acme/n8n-nodes-acme');
	});

	it('resolves a credential type package from the loader that loaded it', () => {
		const registry = makeRegistry({
			'n8n-nodes-base': {
				packageName: 'n8n-nodes-base',
				known: { nodes: {}, credentials: { slackApi: { className: 'SlackApi', sourcePath: '' } } },
			} as unknown as LoadNodesAndCredentials['loaders'][string],
			'@acme/n8n-nodes-acme': {
				packageName: '@acme/n8n-nodes-acme',
				known: { nodes: {}, credentials: { acmeApi: { className: 'AcmeApi', sourcePath: '' } } },
			} as unknown as LoadNodesAndCredentials['loaders'][string],
		});
		const resolvePackage = packageResolverFor(CREDENTIAL_TYPES_KIND, registry);

		expect(resolvePackage('slackApi')).toBe('n8n-nodes-base');
		expect(resolvePackage('acmeApi')).toBe('@acme/n8n-nodes-acme');
	});

	it('resolves an unknown credential type to null, so a package selector never matches it', () => {
		const resolvePackage = packageResolverFor(CREDENTIAL_TYPES_KIND, makeRegistry({}));

		expect(resolvePackage('unknownApi')).toBeNull();
	});

	it('resolves a credential type named after an Object.prototype property to null', () => {
		const registry = makeRegistry({
			'n8n-nodes-base': {
				packageName: 'n8n-nodes-base',
				known: { nodes: {}, credentials: {} },
			} as unknown as LoadNodesAndCredentials['loaders'][string],
		});
		const resolvePackage = packageResolverFor(CREDENTIAL_TYPES_KIND, registry);

		expect(resolvePackage('toString')).toBeNull();
		expect(resolvePackage('constructor')).toBeNull();
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
		const resolvePackage = packageResolverFor(CREDENTIAL_TYPES_KIND, registry);

		// Matches `LoadNodesAndCredentials.getCredential()`, which keeps overwriting as it
		// iterates every loader, so the last one registered wins.
		expect(resolvePackage('sharedApi')).toBe('second');
	});
});

describe('isPackageInstalled', () => {
	it('is true for a package that has a registered loader', () => {
		const registry = makeRegistry({
			'n8n-nodes-base': {} as LoadNodesAndCredentials['loaders'][string],
		});

		expect(isPackageInstalled(registry, 'n8n-nodes-base')).toBe(true);
	});

	it('is false for a package with no registered loader', () => {
		expect(isPackageInstalled(makeRegistry({}), 'n8n-nodes-not-installed')).toBe(false);
	});

	it('is false for a package named after an inherited Object.prototype property', () => {
		expect(isPackageInstalled(makeRegistry({}), 'toString')).toBe(false);
		expect(isPackageInstalled(makeRegistry({}), 'constructor')).toBe(false);
	});
});

describe('policedTypeFor', () => {
	const withKnownCredentials = (
		knownCredentials: LoadNodesAndCredentials['knownCredentials'],
	): LoadNodesAndCredentials => ({ knownCredentials }) as LoadNodesAndCredentials;
	const nodeTypes = {} as NodeTypes;

	it('lists every credential type a type is built on, nearest first', () => {
		const policedType = policedTypeFor(
			CREDENTIAL_TYPES_KIND,
			nodeTypes,
			withKnownCredentials({
				oAuth2Api: { className: '', sourcePath: '' },
				googleOAuth2Api: { className: '', sourcePath: '', extends: ['oAuth2Api'] },
				googleSheetsOAuth2Api: { className: '', sourcePath: '', extends: ['googleOAuth2Api'] },
			}),
		);

		expect(policedType('googleSheetsOAuth2Api')).toEqual({
			name: 'googleSheetsOAuth2Api',
			baseName: 'googleSheetsOAuth2Api',
			ancestors: ['googleOAuth2Api', 'oAuth2Api'],
		});
	});

	it('lists a shared base once when two parents build on it', () => {
		const policedType = policedTypeFor(
			CREDENTIAL_TYPES_KIND,
			nodeTypes,
			withKnownCredentials({
				left: { className: '', sourcePath: '', extends: ['root'] },
				right: { className: '', sourcePath: '', extends: ['root'] },
				both: { className: '', sourcePath: '', extends: ['left', 'right'] },
			}),
		);

		expect(policedType('both').ancestors).toEqual(['left', 'right', 'root']);
	});

	it('stops on a cycle instead of looping', () => {
		const policedType = policedTypeFor(
			CREDENTIAL_TYPES_KIND,
			nodeTypes,
			withKnownCredentials({
				aApi: { className: '', sourcePath: '', extends: ['bApi'] },
				bApi: { className: '', sourcePath: '', extends: ['aApi'] },
			}),
		);

		expect(policedType('aApi').ancestors).toEqual(['bApi']);
	});

	it('gives an unknown credential type no ancestors', () => {
		const policedType = policedTypeFor(CREDENTIAL_TYPES_KIND, nodeTypes, withKnownCredentials({}));

		expect(policedType('toString').ancestors).toEqual([]);
	});
});

describe('isCredentialTypeKnown', () => {
	const registry = {
		knownCredentials: { slackApi: { className: '', sourcePath: '' } },
	} as unknown as LoadNodesAndCredentials;

	it('is true for a known credential type', () => {
		expect(isCredentialTypeKnown(registry, 'slackApi')).toBe(true);
	});

	it('is false for an unknown type, or one named after an Object.prototype property', () => {
		expect(isCredentialTypeKnown(registry, 'unknownApi')).toBe(false);
		expect(isCredentialTypeKnown(registry, 'constructor')).toBe(false);
	});
});

describe('loadedCheckFor', () => {
	/** Stands in for `NodeTypes.resolveBaseName`: `slackTool` is a synthetic variant of `slack`. */
	const nodeTypes = {
		resolveBaseName: (name: string) => ({
			baseName: name === 'n8n-nodes-base.slackTool' ? 'n8n-nodes-base.slack' : name,
			isSyntheticTool: name === 'n8n-nodes-base.slackTool',
		}),
	} as unknown as NodeTypes;

	/** A stand-in for `LoadNodesAndCredentials`, built from just the fields this check reads. */
	function makeFullRegistry(overrides: {
		loaders?: LoadNodesAndCredentials['loaders'];
		knownNodes?: LoadNodesAndCredentials['knownNodes'];
		knownCredentials?: LoadNodesAndCredentials['knownCredentials'];
	}): LoadNodesAndCredentials {
		return {
			loaders: overrides.loaders ?? {},
			knownNodes: overrides.knownNodes ?? {},
			knownCredentials: overrides.knownCredentials ?? {},
		} as unknown as LoadNodesAndCredentials;
	}

	describe('package selector', () => {
		it('is true for a package that has a registered loader', () => {
			const registry = makeFullRegistry({
				loaders: { 'n8n-nodes-base': {} as LoadNodesAndCredentials['loaders'][string] },
			});
			const isLoaded = loadedCheckFor(NODE_TYPES_KIND, nodeTypes, registry);

			expect(isLoaded({ kind: 'package', value: 'n8n-nodes-base' })).toBe(true);
		});

		it('is false for a package with no registered loader', () => {
			const isLoaded = loadedCheckFor(NODE_TYPES_KIND, nodeTypes, makeFullRegistry({}));

			expect(isLoaded({ kind: 'package', value: 'n8n-nodes-not-installed' })).toBe(false);
		});

		it('is false for a package named after an inherited Object.prototype property', () => {
			const isLoaded = loadedCheckFor(NODE_TYPES_KIND, nodeTypes, makeFullRegistry({}));

			expect(isLoaded({ kind: 'package', value: 'constructor' })).toBe(false);
		});
	});

	describe('extends selector', () => {
		it('is true for a known credential type, checked the same way for either kind', () => {
			const registry = makeFullRegistry({
				knownCredentials: { oAuth2Api: { className: '', sourcePath: '' } },
			});
			const selector = { kind: 'extends', value: 'oAuth2Api' } as const;

			expect(loadedCheckFor(NODE_TYPES_KIND, nodeTypes, registry)(selector)).toBe(true);
			expect(loadedCheckFor(CREDENTIAL_TYPES_KIND, {} as NodeTypes, registry)(selector)).toBe(true);
		});

		it('is false for an unknown credential type', () => {
			const isLoaded = loadedCheckFor(CREDENTIAL_TYPES_KIND, {} as NodeTypes, makeFullRegistry({}));

			expect(isLoaded({ kind: 'extends', value: 'unknownApi' })).toBe(false);
		});

		it('is false for a value named after an inherited Object.prototype property', () => {
			const isLoaded = loadedCheckFor(CREDENTIAL_TYPES_KIND, {} as NodeTypes, makeFullRegistry({}));

			expect(isLoaded({ kind: 'extends', value: 'constructor' })).toBe(false);
		});
	});

	describe('name selector, node-types kind', () => {
		it('is true when the resolved base name is a known node', () => {
			const registry = makeFullRegistry({
				knownNodes: { 'n8n-nodes-base.slack': { className: '', sourcePath: '' } },
			});
			const isLoaded = loadedCheckFor(NODE_TYPES_KIND, nodeTypes, registry);

			expect(isLoaded({ kind: 'name', value: 'n8n-nodes-base.slack' })).toBe(true);
		});

		it('is false when the resolved base name is not a known node', () => {
			const isLoaded = loadedCheckFor(NODE_TYPES_KIND, nodeTypes, makeFullRegistry({}));

			expect(isLoaded({ kind: 'name', value: 'n8n-nodes-base.slack' })).toBe(false);
		});

		it('treats a synthetic tool variant as installed when its base node is known', () => {
			const registry = makeFullRegistry({
				knownNodes: { 'n8n-nodes-base.slack': { className: '', sourcePath: '' } },
			});
			const isLoaded = loadedCheckFor(NODE_TYPES_KIND, nodeTypes, registry);

			expect(isLoaded({ kind: 'name', value: 'n8n-nodes-base.slackTool' })).toBe(true);
		});

		it('is false for a name resolving to an inherited Object.prototype property', () => {
			const isLoaded = loadedCheckFor(NODE_TYPES_KIND, nodeTypes, makeFullRegistry({}));

			expect(isLoaded({ kind: 'name', value: 'constructor' })).toBe(false);
		});
	});

	describe('name selector, credential-types kind', () => {
		it('is true when the value is a known credential type', () => {
			const registry = makeFullRegistry({
				knownCredentials: { slackApi: { className: '', sourcePath: '' } },
			});
			const isLoaded = loadedCheckFor(CREDENTIAL_TYPES_KIND, {} as NodeTypes, registry);

			expect(isLoaded({ kind: 'name', value: 'slackApi' })).toBe(true);
		});

		it('is false when the value is not a known credential type', () => {
			const isLoaded = loadedCheckFor(CREDENTIAL_TYPES_KIND, {} as NodeTypes, makeFullRegistry({}));

			expect(isLoaded({ kind: 'name', value: 'unknownApi' })).toBe(false);
		});
	});
});
