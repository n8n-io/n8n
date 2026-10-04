import { Service } from '@n8n/di';
import glob from 'fast-glob';
import { CUSTOM_NODES_PACKAGE_NAME } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	OFFICIAL_RISKY_NODE_TYPES,
	ENV_VARS_DOCS_URL,
	NODES_REPORT,
	COMMUNITY_NODES_RISKS_URL,
	NPM_PACKAGE_URL,
} from '@/security-audit/constants';
import type { Risk, RiskReporter } from '@/security-audit/types';
import { getNodeTypes } from '@/security-audit/utils';

import { PackagesRepository } from '../security-audit.repository';

@Service()
export class NodesRiskReporter implements RiskReporter {
	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly packagesRepository: PackagesRepository,
	) {}

	async report(workflows: IWorkflowBase[]) {
		const officialRiskyNodes = getNodeTypes(workflows, (node) =>
			OFFICIAL_RISKY_NODE_TYPES.has(node.type),
		);
		const [{ contractPermissionsOf }, { permissionClassesOf }] = await Promise.all([
			import('@/node-contracts-registry.js'),
			import('@n8n/nodes-base-next'),
		]);
		// A contract node is risky only through what its manifest grants, whatever its origin.
		const broadPermissionNodes = getNodeTypes(workflows, (node) => {
			const permissions = contractPermissionsOf(this.loadNodesAndCredentials.loaders, node);
			return permissions !== undefined && permissionClassesOf(permissions).length > 0;
		});

		const [communityNodes, customNodes] = await Promise.all([
			this.getCommunityNodeDetails(),
			this.getCustomNodeDetails(),
		]);

		const issues = [officialRiskyNodes, broadPermissionNodes, communityNodes, customNodes];

		if (issues.every((i) => i.length === 0)) return null;

		const report: Risk.StandardReport = {
			risk: NODES_REPORT.RISK,
			sections: [],
		};

		const sentenceStart = (length: number) => (length > 1 ? 'These nodes are' : 'This node is');

		if (officialRiskyNodes.length > 0) {
			report.sections.push({
				title: NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES,
				description: [
					sentenceStart(officialRiskyNodes.length),
					"part of n8n's official nodes and may be used to fetch and run any arbitrary code in the host system. This may lead to exploits such as remote code execution.",
				].join(' '),
				recommendation: `Consider reviewing the parameters in these nodes, replacing them with app nodes where possible, and not loading unneeded node types with the NODES_EXCLUDE environment variable. See: ${ENV_VARS_DOCS_URL}`,
				location: officialRiskyNodes,
			});
		}

		if (broadPermissionNodes.length > 0) {
			report.sections.push({
				title: NODES_REPORT.SECTIONS.BROAD_PERMISSION_NODES,
				description: [
					sentenceStart(broadPermissionNodes.length),
					'contract nodes with a broad permission: they may send requests to any address in their input, or run code.',
				].join(' '),
				recommendation: `Consider reviewing the parameters in these nodes, and limiting the permissions with the N8N_NODE_PERMISSIONS_DENY and N8N_NODE_EGRESS_INPUT_HOSTS environment variables. See: ${ENV_VARS_DOCS_URL}`,
				location: broadPermissionNodes,
			});
		}

		if (communityNodes.length > 0) {
			report.sections.push({
				title: NODES_REPORT.SECTIONS.COMMUNITY_NODES,
				description: [
					sentenceStart(communityNodes.length),
					`sourced from the n8n community. Community nodes are not vetted by the n8n team and have full access to the host system. See: ${COMMUNITY_NODES_RISKS_URL}`,
				].join(' '),
				recommendation:
					'Consider reviewing the source code in any community nodes installed in this n8n instance, and uninstalling any community nodes no longer in use.',
				location: communityNodes,
			});
		}

		if (customNodes.length > 0) {
			report.sections.push({
				title: NODES_REPORT.SECTIONS.CUSTOM_NODES,
				description: [
					sentenceStart(communityNodes.length),
					'unpublished and located in the host system. Custom nodes are not vetted by the n8n team and have full access to the host system.',
				].join(' '),
				recommendation:
					'Consider reviewing the source code in any custom node installed in this n8n instance, and removing any custom nodes no longer in use.',
				location: customNodes,
			});
		}

		return report;
	}

	private async getCommunityNodeDetails() {
		const installedPackages = await this.packagesRepository.find({ relations: ['installedNodes'] });

		return installedPackages.reduce<Risk.CommunityNodeDetails[]>((acc, pkg) => {
			pkg.installedNodes.forEach((node) =>
				acc.push({
					kind: 'community',
					nodeType: node.type,
					packageUrl: [NPM_PACKAGE_URL, pkg.packageName].join('/'),
				}),
			);

			return acc;
		}, []);
	}

	private async getCustomNodeDetails() {
		const customNodeTypes: Risk.CustomNodeDetails[] = [];

		for (const customDir of this.loadNodesAndCredentials.getCustomDirectories()) {
			const customNodeFiles = await glob('**/*.node.js', { cwd: customDir, absolute: true });

			for (const nodeFile of customNodeFiles) {
				const [fileName] = path.parse(nodeFile).name.split('.');
				customNodeTypes.push({
					kind: 'custom',
					nodeType: [CUSTOM_NODES_PACKAGE_NAME, fileName].join('.'),
					filePath: nodeFile,
				});
			}
		}

		return customNodeTypes;
	}
}
