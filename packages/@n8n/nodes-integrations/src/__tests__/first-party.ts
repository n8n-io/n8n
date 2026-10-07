import type { Action, Trigger } from '@n8n/node-sdk';
import { contractsOfPackage } from '@n8n/node-sdk/pack';
import {
	bundledCredentialsOf as credentialsOfDir,
	bundledIdsOf as idsOfDir,
	contractCatalogOf,
	embeddedStoreDirOf,
	versionsOf as versionsOfDir,
	type SourcePackage,
} from '@n8n/node-sdk/registry';
import path from 'node:path';

export const nodesCore: SourcePackage = {
	name: '@n8n/nodes-core',
	dir: path.dirname(require.resolve('@n8n/nodes-core/package.json')),
};
export const nodesIntegrations: SourcePackage = {
	name: '@n8n/nodes-integrations',
	dir: path.resolve(__dirname, '../..'),
};

/** The first-party packages, in catalog order. The checks run over both: they share one store format. */
export const FIRST_PARTY_PACKAGES: readonly SourcePackage[] = [nodesCore, nodesIntegrations];

const catalog = contractCatalogOf(FIRST_PARTY_PACKAGES);

/** The package whose embedded store has the id. */
export const packageOf = (id: string): SourcePackage => catalog.packageOf(id) ?? nodesIntegrations;

/** The embedded versions of an action, from its package or from `dir`. */
export const versionsOf = (id: string, dir = embeddedStoreDirOf(packageOf(id))) =>
	versionsOfDir(id, dir);

/** The bundled ids of the store `dir`, or of every first-party package. */
export const bundledIdsOf = (dir?: string) =>
	dir ? idsOfDir(dir) : FIRST_PARTY_PACKAGES.flatMap((pkg) => idsOfDir(embeddedStoreDirOf(pkg)));

/** The credential manifests of every first-party package. */
export const bundledCredentialsOf = () =>
	FIRST_PARTY_PACKAGES.flatMap((pkg) => credentialsOfDir(embeddedStoreDirOf(pkg)));

/** The source contracts of a package, as the build finds them in its action files. */
export interface SourceContracts {
	readonly actions: readonly Action[];
	readonly triggers: readonly Trigger[];
	readonly natives: ReadonlyArray<Action | Trigger>;
}

export async function sourceOf(pkg: SourcePackage): Promise<SourceContracts> {
	const { entries, natives } = await contractsOfPackage(pkg);
	const contracts = entries.map(({ action }) => action);
	return {
		actions: contracts.filter((contract): contract is Action => !('kind' in contract)),
		triggers: contracts.filter((contract): contract is Trigger => 'kind' in contract),
		natives,
	};
}
