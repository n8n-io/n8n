import path from 'node:path';

import {
	bundledCredentialsOf,
	contractCatalogOf,
	embeddedCompatTypeOf,
	versionsOf,
} from '../catalog';
import { hostRuntime } from '../runtime';
import { needsOf } from '../runtime-policy';
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

// The JS actions. Only `wasm` runs a WASM component.
const actionManifests = firstParty.entries.flatMap(({ manifest }) =>
	'bundleHash' in manifest && manifest.kind !== 'trigger' && needsOf(manifest) !== 'component'
		? [manifest]
		: [],
);

export const firstPartyActionIds = actionManifests.map(({ id }) => id);

// Only a container serves an action with an image.
export const firstPartyImageActionIds = actionManifests
	.filter((manifest) => needsOf(manifest) === 'image')
	.map(({ id }) => id);

export const firstPartyActionIdsWithoutImage = firstPartyActionIds.filter(
	(id) => !firstPartyImageActionIds.includes(id),
);

const credentialManifests = new Map(
	FIRST_PARTY.flatMap((pkg) => bundledCredentialsOf(embeddedStoreDirOf(pkg))).map(
		({ manifest }) => [manifest.name, manifest],
	),
);

export const firstPartyRuntime = () =>
	hostRuntime({ credentialManifestOf: async (name) => credentialManifests.get(name) });

export const firstPartyCredentialType = (name: string) => embeddedCompatTypeOf(firstParty, name);
