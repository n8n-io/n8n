import { UserError } from 'n8n-workflow';

import type { ContractOrigin, FrozenVersion } from './runtime';
import type { GuestRuntime } from './sandbox';
import type { VersionManifest } from './version';

/** The runtimes that a version can run in. */
export const RUNTIME_NAMES = ['in-process', 'worker', 'wasm', 'container'] as const;

/** One of `RUNTIME_NAMES`. */
export type RuntimeName = (typeof RUNTIME_NAMES)[number];

/** The trust class of a version is its origin, which the host records when it takes the version. */
export type TrustClass = ContractOrigin;

/** `web`: web APIs and host imports only. `image`: the container image of the contract. */
export type Needs = 'web' | 'image';

export const needsOf = ({ contract }: Pick<VersionManifest, 'contract'>): Needs =>
	contract.runtime ? 'image' : 'web';

/** The allowed runtimes of each trust class, the preferred one first. */
export type RuntimeLists = Readonly<Record<TrustClass, readonly RuntimeName[]>>;

/** Which runtimes the host can start. */
export interface RuntimeAvailability {
	/**
	 * Why a runtime cannot start, as a clause for the error, e.g.
	 * `wasm is not available: the sandbox sidecar is not installed`.
	 */
	readonly missing: Readonly<Partial<Record<RuntimeName, string>>>;
	/** The OCI runtime of docker. A container runs community code only with `runsc` (gVisor). */
	readonly containerOci?: 'runc' | 'runsc';
}

export interface RuntimeRequest {
	/** `<id>@<semver>`, for the error. */
	readonly version: string;
	readonly trust: TrustClass;
	readonly needs: Needs;
	readonly kind: VersionManifest['kind'];
	readonly lists: RuntimeLists;
	readonly available: RuntimeAvailability;
}

// The Node guest of worker and container has no trigger world, and only a container has an image.
const serves = (name: RuntimeName, needs: Needs, kind: VersionManifest['kind']) =>
	kind === 'trigger'
		? name === 'in-process' || name === 'wasm'
		: needs === 'image'
			? name === 'container'
			: true;

const missingOf = (
	name: RuntimeName,
	trust: TrustClass,
	{ missing, containerOci }: RuntimeAvailability,
) =>
	missing[name] ??
	(name === 'container' && trust !== 'first-party' && containerOci !== 'runsc'
		? `container runs ${trust} nodes only with runsc, and docker has ${containerOci ?? 'no runsc'}`
		: undefined);

const oneOf = (names: readonly string[]) =>
	names.length === 1 ? names.join('') : `one of ${names.join(', ')}`;

/** The first runtime of the trust class's list that serves the needs and is available. */
export function resolveRuntime({
	version,
	trust,
	needs,
	kind,
	lists,
	available,
}: RuntimeRequest): { readonly runtime: RuntimeName } | { readonly error: string } {
	const servers = RUNTIME_NAMES.filter((name) => serves(name, needs, kind));
	const candidates = lists[trust].filter((name) => servers.includes(name));
	const runtime = candidates.find((name) => !missingOf(name, trust, available));
	if (runtime) return { runtime };
	const need = kind === 'trigger' ? ' trigger' : needs === 'image' ? ', image' : '';
	const why =
		candidates.length > 0
			? candidates.map((name) => missingOf(name, trust, available)).join('; ')
			: `${trust} nodes may not use ${servers.join(' or ')}`;
	return {
		error: `${version} (${trust}${need}) needs ${oneOf(candidates.length > 0 ? candidates : servers)}; ${why}`,
	};
}

/** Where the host runs each version. */
export interface RuntimePolicy {
	/** The allowed runtimes of each trust class. */
	readonly lists: RuntimeLists;
	/** Which runtimes the host can start. */
	readonly available: RuntimeAvailability;
	/**
	 * The runtime of each available name other than `in-process`. The loader calls it for each
	 * version it loads, so the host makes each runtime once and closes it at shutdown. A container
	 * runtime takes the image of the manifest.
	 */
	readonly runtimes: Readonly<
		Partial<Record<Exclude<RuntimeName, 'in-process'>, () => GuestRuntime>>
	>;
	/** Gets one debug line for each version that the loader loads. */
	readonly log?: (message: string) => void;
}

/**
 * The runtime of a version under the policy, by its origin. Throws when no allowed runtime can
 * run it.
 */
export function runtimeNameOf(
	{ lists, available }: RuntimePolicy,
	{ manifest, origin }: Pick<FrozenVersion, 'manifest' | 'origin'>,
): RuntimeName {
	const resolved = resolveRuntime({
		version: `${manifest.id}@${manifest.semver}`,
		trust: origin,
		needs: needsOf(manifest),
		kind: manifest.kind,
		lists,
		available,
	});
	if ('error' in resolved) throw new UserError(resolved.error);
	return resolved.runtime;
}
