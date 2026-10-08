import type {
	NextNodeActionConfig,
	NextNodeActionVersion,
	NextNodeInstanceVersion,
	NextNodeParent,
} from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import {
	NodeContractVersionRepository,
	ProjectRepository,
	type CredentialsEntity,
	UserRepository,
	type NodeContractVersion,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { PackedAction } from '@n8n/node-sdk/pack';
import type { ExecutionFixture, VersionManifest } from '@n8n/node-sdk/registry';
import { isRecord } from '@n8n/utils/is-record';
import type { JsonSchema } from '@n8n/workflow-sdk';
import { createHash } from 'node:crypto';
import {
	isNodeParameters,
	UnexpectedError,
	UserError,
	type IDataObject,
	type INodeTypes,
} from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { EphemeralNodeExecutor } from '@/node-execution';
import {
	FALLBACK_PACKAGE,
	firstPartyCatalog,
	parentNode,
	parentNodes,
	customActionCredentialTypeOf,
} from '@/node-contracts-catalog';
import { ContractNodeLoader, NodeContractsStore } from '@/node-contracts-registry';
import { NodeTypes } from '@/node-types';

/** One run of a draft: the items, or the error. A run without an error gives its fixture. */
export interface DraftTestResult {
	readonly status: 'success' | 'error';
	readonly items: readonly IDataObject[];
	readonly error?: string;
	/** What publish needs: the parameters, the responses in order, and the output. */
	readonly fixture?: ExecutionFixture;
	/** The output schema that the items show, for the form to trim. */
	readonly outputSchema?: JsonSchema;
}

/** A stored custom action version: its row and its manifest. */
interface CustomVersion {
	readonly row: NodeContractVersion;
	readonly manifest: VersionManifest;
}

/**
 * The custom actions of this instance: HTTP guest versions that a user made in the form. They are
 * `private` rows of the node contracts store, so the contract loader serves them as node types
 * and pins keep each workflow on its version.
 */
@Service()
export class NextNodesInstanceService {
	constructor(
		private readonly repository: NodeContractVersionRepository,
		private readonly store: NodeContractsStore,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly projectRepository: ProjectRepository,
		private readonly userRepository: UserRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly executor: EphemeralNodeExecutor,
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsService: CredentialsService,
	) {}

	/** The custom action versions, newest first. */
	private async versions(): Promise<CustomVersion[]> {
		const { compareSemver, parseManifest } = await import('@n8n/node-sdk/registry');
		return (await this.repository.findAllForExport())
			.filter(({ origin, kind }) => origin === 'private' && kind === 'action')
			.flatMap((row) => {
				const manifest = parseManifest(row.manifest);
				return manifest.guest === 'http' ? [{ row, manifest }] : [];
			})
			.sort((a, b) => compareSemver(b.manifest.semver, a.manifest.semver));
	}

	/** The newest custom version of an id, of one major when given. */
	private newestOf(
		versions: readonly CustomVersion[],
		id: string,
		major?: number,
	): CustomVersion | undefined {
		return versions.find(
			({ manifest }) =>
				manifest.id === id && (major === undefined || manifest.contract.version === major),
		);
	}

	/** The versions of this instance, newest first. */
	async list(): Promise<NextNodeInstanceVersion[]> {
		const versions = await this.versions();
		const ids = [...new Set(versions.flatMap(({ row }) => row.createdById ?? []))];
		const users = new Map(
			(ids.length ? await this.userRepository.findManyByIds(ids) : []).map((user) => [
				user.id,
				{
					name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
					email: user.email,
				},
			]),
		);
		const [{ diffContracts }, store] = await Promise.all([
			import('@n8n/node-sdk/registry'),
			this.store.open(),
		]);
		const yanked = await Promise.all(
			versions.map(
				async ({ row, manifest }) =>
					(await store.withdrawal({ manifest, origin: row.origin })) !== undefined,
			),
		);
		// Newest first, so the version before an entry is the next entry of the same id.
		const changesOf = (manifest: VersionManifest, index: number) => {
			const before = versions.slice(index + 1).find((entry) => entry.manifest.id === manifest.id);
			return before
				? diffContracts(before.manifest.contract, manifest.contract).changes.map(({ text }) => text)
				: [];
		};
		return versions.map(({ row, manifest }, index) => ({
			actionId: manifest.id,
			semver: manifest.semver,
			node: manifest.contract.node,
			displayName: `${manifest.contract.nodeDisplayName}: ${manifest.contract.action}`,
			action: manifest.contract.action,
			summary: manifest.contract.summary,
			status: yanked[index] ? 'hidden' : 'published',
			createdAt: row.createdAt.toISOString(),
			publishedBy: users.get(row.createdById ?? '') ?? null,
			changes: changesOf(manifest, index),
		}));
	}

	/**
	 * Packs an HTTP guest config as the next version of its action, checks it against the newest
	 * version of the same major (the bump and the fixtures), stores it as a `private` version, and
	 * reloads the node types on every main.
	 */
	async publish(
		config: unknown,
		fixtures: unknown,
		options: { readonly userId: string },
	): Promise<VersionManifest> {
		const [{ checkPublish }, { manifestTextOf, parseFixtures }] = await Promise.all([
			import('@n8n/node-sdk/publish'),
			import('@n8n/node-sdk/registry'),
		]);
		const versions = await this.versions();
		const packed = await this.nextVersionOf(config, versions);
		const { manifest } = packed;
		// One id names one action: the AI builder and the node types resolve actions by id.
		if (firstPartyCatalog().packageOf(manifest.id)) {
			throw new UserError(`n8n ships ${manifest.id}, so this instance cannot publish it`);
		}
		const known = versions.find((entry) => entry.manifest.bundleHash === manifest.bundleHash);
		if (known) {
			throw new UserError(`${manifest.id}@${known.manifest.semver} already has this config`);
		}
		const previous = this.newestOf(versions, manifest.id, manifest.contract.version);
		await checkPublish(previous?.manifest, packed, parseFixtures(JSON.stringify(fixtures)));
		const manifestText = manifestTextOf(manifest);
		await this.repository.insertNew([
			{
				digest: `sha256:${createHash('sha256').update(manifestText).digest('hex')}`,
				contractId: manifest.id,
				version: manifest.semver,
				kind: 'action',
				manifest: manifestText,
				bundle: packed.bundle,
				fixtures: JSON.stringify(fixtures),
				signatures: [],
				published: new Date(),
				origin: 'private',
				createdById: options.userId,
			},
		]);
		await this.reloadEverywhere();
		return manifest;
	}

	/**
	 * Packs `config` as the next version of its action, so the author never picks a number: a
	 * patch when the contract stays, a minor for an additive change, else a new major. A config
	 * has no migration of old input, so a change that old input fails is refused.
	 */
	private async nextVersionOf(
		config: unknown,
		versions: readonly CustomVersion[],
	): Promise<PackedAction> {
		const contract = isRecord(config) && isRecord(config.contract) ? config.contract : undefined;
		const latest =
			typeof contract?.id === 'string' ? this.newestOf(versions, contract.id) : undefined;
		if (!isRecord(config) || !contract || !latest) return await this.pack(config);
		const { diffContracts, parseSemver } = await import('@n8n/node-sdk/registry');
		const { major, minor, patch } = parseSemver(latest.manifest.semver);
		const as = async (version: number, nextMinor: number, nextPatch: number) =>
			await this.pack({
				...config,
				version: `${version}.${nextMinor}.${nextPatch}`,
				contract: { ...contract, version },
			});
		const same = await as(major, minor, patch);
		const diff = diffContracts(latest.manifest.contract, same.manifest.contract);
		// The same config keeps its version, so publish refuses it as known.
		if (diff.kind === 'patch') {
			return same.manifest.bundleHash === latest.manifest.bundleHash
				? same
				: await as(major, minor, patch + 1);
		}
		if (diff.kind === 'minor') return await as(major, minor + 1, 0);
		if (diff.breaksInput) {
			const changes = diff.changes.map(({ text }) => text).join('; ');
			throw new UserError(
				`This change stops the action from running in workflows that use it (${changes}). Keep the inputs, or make a new action.`,
			);
		}
		return await as(major + 1, 0, 0);
	}

	/**
	 * Runs a draft once with the user's credential, without publishing it. The run takes the
	 * request path of n8n nodes, so the SSRF policy of the instance applies.
	 */
	async test(
		config: unknown,
		params: unknown,
		credentialId: string | undefined,
		user: User,
	): Promise<DraftTestResult> {
		if (!isNodeParameters(params)) throw new UserError('The parameters are not node parameters');
		const [{ draftNodeTypeOf, nodeDescriptionOf, nodeNameOf }, { fixtureRouteOf }] =
			await Promise.all([import('@n8n/node-sdk/host'), import('@n8n/node-sdk/testing')]);
		const { manifest, bundle } = await this.pack(config);
		const credential = await this.credentialOf(manifest, credentialId, user);
		const routes: Array<ReturnType<typeof fixtureRouteOf>> = [];
		const draft = draftNodeTypeOf(
			{ manifest, origin: 'private', readBundle: async () => bundle },
			this.runtime(),
			(request, response) => routes.push(fixtureRouteOf(request, response)),
		);
		const type = `${FALLBACK_PACKAGE}.${nodeNameOf(manifest.id)}`;
		const nodeTypes: INodeTypes = {
			getByName: (name) => (name === type ? draft : this.nodeTypes.getByName(name)),
			getByNameAndVersion: (name, version) =>
				name === type ? draft : this.nodeTypes.getByNameAndVersion(name, version),
			getKnownTypes: () => this.nodeTypes.getKnownTypes(),
		};
		const selects = nodeDescriptionOf(manifest).properties.some(
			({ name }) => name === 'authentication',
		);
		const parameters = {
			...params,
			...(credential && selects ? { authentication: credential.type } : {}),
		};
		const project = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
		const result = await this.executor.executeUnloaded(
			{
				projectId: project.id,
				nodeType: type,
				nodeTypeVersion: manifest.contract.version,
				nodeParameters: parameters,
				credentials: credential && {
					[credential.type]: { id: credential.id, name: credential.name },
				},
				nodeName: manifest.contract.action,
				nodeTypes,
			},
			[{ json: {} }],
		);
		const items = result.data.map(({ json }) => json);
		if (result.status === 'error') return { status: 'error', items, error: result.error };
		const urlFields = credential ? await this.urlFieldsOf(credential, bundle) : {};
		const fixture = {
			name: 'test',
			params: parameters,
			routes,
			// The replay needs the base URL of the credential, e.g. a GitHub Enterprise server.
			...(Object.keys(urlFields).length > 0 ? { credential: urlFields } : {}),
			output: items,
		};
		const { sampleSchemaOf } = await import('@n8n/workflow-sdk');
		return { status: 'success', items, fixture, outputSchema: sampleSchemaOf(items) };
	}

	/**
	 * The stored fields of a credential that the base URL of its type reads, e.g. `server`. The
	 * config declares them as fields, and the publish gate refuses a secret field in a fixture.
	 */
	private async urlFieldsOf(credential: CredentialsEntity, bundle: string) {
		const config: unknown = JSON.parse(bundle);
		const types = isRecord(config) && Array.isArray(config.credentials) ? config.credentials : [];
		const type = types.find((entry) => isRecord(entry) && entry.name === credential.type);
		const names = isRecord(type) && isRecord(type.fields) ? Object.keys(type.fields) : [];
		if (names.length === 0) return {};
		const data = await this.credentialsService.decrypt(credential, true);
		return Object.fromEntries(names.flatMap((name) => (name in data ? [[name, data[name]]] : [])));
	}

	/** The one host runtime of the contract loaders. */
	private runtime() {
		const loader = Object.values(this.loadNodesAndCredentials.loaders).find(
			(candidate): candidate is ContractNodeLoader => candidate instanceof ContractNodeLoader,
		);
		if (!loader) throw new UnexpectedError('Node contracts are not loaded');
		return loader.runtime;
	}

	/** The config of the newest version of an action, for the form to make the next version. */
	async configOf(actionId: string): Promise<NextNodeActionConfig> {
		const newest = this.newestOf(await this.versions(), actionId);
		if (!newest?.row.bundle) throw new NotFoundError(`This instance has not published ${actionId}`);
		const config: unknown = JSON.parse(newest.row.bundle);
		if (!isRecord(config)) throw new UnexpectedError(`The config of ${actionId} is not an object`);
		return { semver: newest.manifest.semver, config };
	}

	/** The versions of an action major that a save can lock, newest first, see `ContractStore.majorVersionsOf`. */
	async majorVersionsOf(actionId: string, major: number): Promise<NextNodeActionVersion[]> {
		const versions = await (await this.store.open()).majorVersionsOf(actionId, major);
		if (versions.length === 0)
			throw new NotFoundError(`n8n knows no version of ${actionId} ${major}.x`);
		return versions;
	}

	/** The shipped nodes that a custom action can extend, by name. */
	parents(): NextNodeParent[] {
		return parentNodes()
			.flatMap((parent) =>
				parent.extendable
					? [
							{
								id: parent.id,
								displayName: parent.displayName,
								credentialTypes: parent.credentials.map(({ name }) => name),
								resources: Object.fromEntries(
									Object.entries(parent.resources).map(([name, input]) => [
										name,
										Object.keys(input.properties),
									]),
								),
							},
						]
					: [],
			)
			.sort((a, b) => a.displayName.localeCompare(b.displayName));
	}

	/** The credential of a test run, when the user can read it and the draft takes its type. */
	private async credentialOf(
		manifest: VersionManifest,
		credentialId: string | undefined,
		user: User,
	) {
		if (credentialId === undefined) return undefined;
		const credential = await this.credentialsFinder.findCredentialForUser(credentialId, user, [
			'credential:read',
		]);
		if (!credential) throw new UserError('You cannot use this credential');
		if (!manifest.contract.credentials.includes(credential.type)) {
			throw new UserError(
				`${manifest.id} takes ${manifest.contract.credentials.join(', ') || 'no credential'}, not ${credential.type}`,
			);
		}
		return credential;
	}

	/**
	 * Packs a config with the shipped node it extends and n8n's credential types, with the hosts
	 * of their credential manifests, as the runtime takes them.
	 */
	private async pack(config: unknown) {
		const { packHttpGuest } = await import('@n8n/node-sdk/pack');
		const typeOf = customActionCredentialTypeOf((name) => this.credentialTypes.recognizes(name));
		const contract = isRecord(config) && isRecord(config.contract) ? config.contract : {};
		const extended = isRecord(config) && typeof config.extends === 'string' ? config.extends : '';
		const parent = extended ? parentNode(extended) : undefined;
		const names = [
			...(Array.isArray(contract.credentials) ? contract.credentials : []),
			...(parent?.extendable ? parent.credentials.map(({ name }) => name) : []),
		].filter((name): name is string => typeof name === 'string');
		const manifests = new Map(
			await Promise.all(
				names.map(async (name) => [name, await this.runtime().credentialManifestOf(name)] as const),
			),
		);
		return await packHttpGuest(config, {
			parentOf: parentNode,
			credentialTypeOf: (name) => {
				const type = typeOf(name);
				const manifest = manifests.get(name);
				// The base URL template and its fields come with the type; the manifest knows the hosts.
				return type && manifest?.hosts ? { ...type, hosts: manifest.hosts } : type;
			},
		});
	}

	/**
	 * Takes an action out of the nodes panel: it yanks every version. Pinned nodes keep running
	 * their version.
	 */
	async hide(actionId: string) {
		const own = (await this.versions()).filter(({ manifest }) => manifest.id === actionId);
		if (own.length === 0) throw new UserError(`This instance has no action ${actionId}`);
		const at = new Date().toISOString();
		await (await this.store.open()).addOwnStatuses(
			own.map(({ manifest }) => ({
				id: actionId,
				yank: manifest.semver,
				reason: 'Hidden on this instance',
				at,
			})),
		);
		await this.reloadEverywhere();
	}

	private async reloadEverywhere() {
		await this.loadNodesAndCredentials.refreshNodeTypes();
		await this.store.reloadOtherMains();
	}
}
