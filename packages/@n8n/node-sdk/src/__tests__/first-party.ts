import path from 'node:path';

import {
	bundledCredentialsOf,
	contractCatalogOf,
	embeddedCompatTypeOf,
	versionsOf,
} from '../catalog';
import { hostRuntime } from '../runtime';
import { embeddedStoreDirOf } from '../store';

const FIRST_PARTY = ['nodes-core', 'nodes-integrations'].map((name) => ({
	name: `@n8n/${name}`,
	dir: path.resolve(__dirname, '../../..', name),
}));

export const firstParty = contractCatalogOf(FIRST_PARTY);

export const firstPartyVersionsOf = (id: string) => {
	const pkg = firstParty.packageOf(id);
	return pkg ? versionsOf(id, embeddedStoreDirOf(pkg)) : [];
};

export const fixturesFileOf = (id: string) =>
	path.join(firstParty.packageOf(id)?.dir ?? '', 'fixtures', `${id}.json`);

export const firstPartyActionIds = firstParty.entries.flatMap(({ manifest }) =>
	'bundleHash' in manifest && manifest.kind !== 'trigger' ? [manifest.id] : [],
);

const credentialManifests = new Map(
	FIRST_PARTY.flatMap((pkg) => bundledCredentialsOf(embeddedStoreDirOf(pkg))).map(
		({ manifest }) => [manifest.name, manifest],
	),
);

export const firstPartyRuntime = () =>
	hostRuntime({ credentialManifestOf: async (name) => credentialManifests.get(name) });

export const firstPartyCredentialType = (name: string) => embeddedCompatTypeOf(firstParty, name);
