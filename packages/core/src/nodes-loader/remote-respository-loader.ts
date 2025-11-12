import crypto from 'crypto';
import {
	type ICredentialType,
	type ICredentialTypeData,
	type INodeTypeData,
	type INodeTypeDescription,
	type KnownNodesAndCredentials,
	type Logger,
} from 'n8n-workflow';

import type { ILoader, Types } from './loader';

type NodeRepositoryManifest = {
	name: string;
	maintainer: string;
	nodes: Array<{
		url: string;
	}>;
	credentials: Array<{
		url: string;
	}>;
};

export class RemoteRepositoryLoader implements ILoader {
	packageName: string;
	isLazyLoaded = false;

	types: Types = { credentials: [], nodes: [] };
	known: KnownNodesAndCredentials = { credentials: {}, nodes: {} };
	credentialTypes: ICredentialTypeData = {};
	nodeTypes: INodeTypeData = {};

	constructor(
		readonly repositoryUrl: string,
		private logger: Logger,
	) {
		const repositoryHash = crypto.hash('sha256', repositoryUrl, 'hex').substring(0, 8);
		this.packageName = `remote:${repositoryHash}`;
	}

	async loadAll(): Promise<void> {
		const manifest = await fetch(this.repositoryUrl, {
			signal: AbortSignal.timeout(5000),
		}).then(async (res) => (await res.json()) as NodeRepositoryManifest);

		const nodePromises = manifest.nodes.map(async (node) => {
			const nodeDescription = await fetch(node.url, {
				signal: AbortSignal.timeout(5000),
			}).then(async (res) => (await res.json()) as INodeTypeDescription);
			// TODO: validate against JSON schema

			return nodeDescription;
		});

		const nodes = await Promise.allSettled(nodePromises);

		this.logger.debug('Loaded remote nodes', { repository: manifest.name, nodes });

		nodes
			.filter((node) => node.status === 'rejected')
			.forEach((node) => {
				this.logger.error(
					`Failed to load node from remote repository ${manifest.name}: ${node.reason}`,
				);
			});

		const nodeDescriptions = nodes
			.filter((node) => node.status === 'fulfilled')
			.map((node) => node.value);

		this.types.nodes = this.types.nodes.concat(nodeDescriptions);

		for (const nodeDescription of nodeDescriptions) {
			this.known.nodes[nodeDescription.name] = {
				className: '',
				sourcePath: '',
			};

			this.nodeTypes[nodeDescription.name] = {
				type: { description: nodeDescription },
				sourcePath: '',
			};
		}

		const credentialPromises = manifest.credentials.map(async (credential) => {
			const credentialDescription = await fetch(credential.url, {
				signal: AbortSignal.timeout(5000),
			}).then(async (res) => (await res.json()) as ICredentialType);
			// TODO: validate against JSON schema

			return credentialDescription;
		});

		const credentials = await Promise.allSettled(credentialPromises);

		credentials
			.filter((credential) => credential.status === 'rejected')
			.forEach((credential) => {
				this.logger.error(
					`Failed to load credential from remote repository ${manifest.name}: ${credential.reason}`,
				);
			});

		const credentialDescriptions = credentials
			.filter((credential) => credential.status === 'fulfilled')
			.map((credential) => credential.value);

		this.types.credentials = this.types.credentials.concat(credentialDescriptions);

		for (const credentialDescription of credentialDescriptions) {
			this.known.credentials[credentialDescription.name] = {
				className: '',
				sourcePath: '',
				extends: credentialDescription.extends,
				supportedNodes: [],
			};

			this.credentialTypes[credentialDescription.name] = {
				type: credentialDescription,
				sourcePath: '',
			};
		}

		this.logger.debug(
			`Loaded remote node repository ${manifest.name} with ${nodeDescriptions.length} nodes and ${credentialDescriptions.length} credentials.`,
		);
	}

	reset(): void {
		this.types = { credentials: [], nodes: [] };
		this.known = { credentials: {}, nodes: {} };
		this.credentialTypes = {};
		this.nodeTypes = {};
	}

	getCredential(credentialType: string) {
		return this.credentialTypes[credentialType];
	}

	getNode(nodeType: string) {
		return this.nodeTypes[nodeType];
	}
}
