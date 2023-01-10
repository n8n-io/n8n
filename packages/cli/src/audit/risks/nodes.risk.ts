import * as path from 'path';
import glob from 'fast-glob';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { getNodeTypes } from '@/audit/utils';
import { getAllInstalledPackages } from '@/CommunityNodes/packageModel';
import {
	OFFICIAL_RISKY_NODE_TYPES,
	ENV_VARS_DOCS_URL,
	NODES_REPORT,
	COMMUNITY_NODES_RISKS_URL,
	NPM_PACKAGE_URL,
} from '@/audit/constants';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { Risk } from '@/audit/types';

async function getCommunityNodeDetails() {
	const installedPackages = await getAllInstalledPackages();

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

async function getCustomNodeDetails() {
	const customNodeTypes: Risk.CustomNodeDetails[] = [];

	for (const customDir of LoadNodesAndCredentials().getCustomDirectories()) {
		const customNodeFiles = await glob('**/*.node.js', { cwd: customDir, absolute: true });

		for (const nodeFile of customNodeFiles) {
			const [fileName] = path.parse(nodeFile).name.split('.');
			customNodeTypes.push({
				kind: 'custom',
				nodeType: ['CUSTOM', fileName].join('.'),
				filePath: nodeFile,
			});
		}
	}

	return customNodeTypes;
}

export async function reportNodesRisk(workflows: WorkflowEntity[]) {
	const officialRiskyNodes = getNodeTypes(workflows, (node) =>
		OFFICIAL_RISKY_NODE_TYPES.has(node.type),
	);

	const [communityNodes, customNodes] = await Promise.all([
		getCommunityNodeDetails(),
		getCustomNodeDetails(),
	]);

	const issues = [officialRiskyNodes, communityNodes, customNodes];

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
