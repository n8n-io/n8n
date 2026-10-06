import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { FIRST_PARTY_PACKAGES, nodeTypeOf, toolTypeOf, versionsOf } from '@n8n/nodes-integrations';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { ContractNodeLoader } from '@/node-contracts-registry';
import { NODES_REPORT } from '@/security-audit/constants';
import { NodesRiskReporter } from '@/security-audit/risk-reporters/nodes-risk-reporter';
import type { PackagesRepository } from '@/security-audit/security-audit.repository';
import type { Risk } from '@/security-audit/types';

const nodeOf = (name: string, id: string, type = nodeTypeOf({ id })): INode => ({
	id: name,
	name,
	type,
	typeVersion: versionsOf(id)[0]?.manifest.contract.version ?? 0,
	position: [0, 0],
	parameters: {},
});

const auditContractNodes = async () => {
	mockInstance(Logger);
	const loaders = FIRST_PARTY_PACKAGES.map(
		(pkg) =>
			new ContractNodeLoader(
				[],
				[],
				async () => ({ versions: async () => new Map(), credentials: async () => new Map() }),
				[],
				undefined,
				undefined,
				pkg,
			),
	);
	await Promise.all(loaders.map(async (loader) => await loader.loadAll()));
	const loadNodesAndCredentials = Object.assign(mock<LoadNodesAndCredentials>(), {
		loaders: Object.fromEntries(loaders.map((loader) => [loader.packageName, loader])),
	});
	loadNodesAndCredentials.getCustomDirectories.mockReturnValue([]);
	const packagesRepository = mock<PackagesRepository>();
	packagesRepository.find.mockResolvedValue([]);
	const workflow = mock<IWorkflowBase>({
		id: 'wf',
		name: 'Audit',
		nodes: [
			nodeOf('GET', 'httpRequest.get'),
			nodeOf('GET tool', 'httpRequest.get', toolTypeOf({ id: 'httpRequest.get' })),
			nodeOf('Code', 'code.javaScript'),
			nodeOf('Notion', 'notion.databasePage.getAll'),
		],
	});

	return await new NodesRiskReporter(loadNodesAndCredentials, packagesRepository).report([
		workflow,
	]);
};

test('reports no contract nodes with node contracts disabled', async () => {
	const { instanceAi } = Container.get(GlobalConfig);
	instanceAi.nodeContractsEnabled = false;
	try {
		expect(await auditContractNodes()).toBeNull();
	} finally {
		instanceAi.nodeContractsEnabled = true;
	}
});

test('lists the contract nodes with a URL from input or code, and not the ones with fixed hosts', async () => {
	const report = await auditContractNodes();

	const section = (report as Risk.StandardReport | null)?.sections.find(
		({ title }) => title === NODES_REPORT.SECTIONS.BROAD_PERMISSION_NODES,
	);
	expect(section?.location.map((location) => 'nodeName' in location && location.nodeName)).toEqual([
		'GET',
		'GET tool',
		'Code',
	]);
});
