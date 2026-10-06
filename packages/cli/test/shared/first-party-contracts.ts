import {
	bundledCredentialsOf as credentialsOfDir,
	embeddedStoreDirOf,
	versionsOf as versionsOfDir,
	type SourcePackage,
} from '@n8n/node-sdk/registry';

import { FALLBACK_PACKAGE, firstPartyCatalog, firstPartyPackages } from '@/node-contracts-catalog';

/** The first-party packages that the host loads, in catalog order. */
export const FIRST_PARTY_PACKAGES = firstPartyPackages();

/** The first-party package of an id: the package that ships it, else the fallback package. */
export const packageOf = (id: string): SourcePackage =>
	firstPartyCatalog().packageOf(id) ??
	FIRST_PARTY_PACKAGES.find(({ name }) => name === FALLBACK_PACKAGE) ?? {
		name: FALLBACK_PACKAGE,
		dir: '',
	};

/** The embedded versions of an action, from its package or from `dir`. */
export const versionsOf = (id: string, dir = embeddedStoreDirOf(packageOf(id))) =>
	versionsOfDir(id, dir);

/** The embedded credential manifests of the store `dir`, or of every first-party package. */
export const bundledCredentialsOf = (dir?: string) =>
	dir
		? credentialsOfDir(dir)
		: FIRST_PARTY_PACKAGES.flatMap((pkg) => credentialsOfDir(embeddedStoreDirOf(pkg)));
