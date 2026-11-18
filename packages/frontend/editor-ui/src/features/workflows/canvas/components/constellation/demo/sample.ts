const positions: Array<[string, string, number, number]> = [
	['Schedule Trigger', 'scheduleTrigger', 0, 200],
	['Get new orders', 'httpRequest', 180, 200],
	['Validate order', 'if', 360, 200],
	['Enrich customer', 'httpRequest', 540, 30],
	['Route by region', 'switch', 720, 30],
	['Europe warehouse', 'postgres', 900, -120],
	['Americas warehouse', 'postgres', 940, 140],
	['Merge inventory', 'merge', 1140, 0],
	['Send confirmation', 'gmail', 1320, -80],
	['Update CRM', 'hubspot', 1320, 160],
	['Flag for review', 'set', 540, 440],
	['Notify operations', 'slack', 780, 540],
	['Create support ticket', 'zendesk', 960, 400],
];
const links: Array<[number, number, number?]> = [
	[0, 1],
	[1, 2],
	[2, 3],
	[2, 10, 1],
	[3, 4],
	[4, 5],
	[4, 6, 1],
	[5, 7],
	[6, 7],
	[7, 8],
	[7, 9],
	[10, 11],
	[11, 12],
];
const connections: Record<
	string,
	{ main: Array<Array<{ node: string; type: string; index: number }>> }
> = {};
for (const [from, to, output = 0] of links) {
	const source = positions[from][0];
	connections[source] ??= { main: [] };
	connections[source].main[output] ??= [];
	connections[source].main[output].push({ node: positions[to][0], type: 'main', index: 0 });
}
export const sampleWorkflow = {
	name: 'Order orchestration',
	nodes: positions.map(([name, type, x, y], index) => ({
		id: `sample-${index}`,
		name,
		type: `n8n-nodes-base.${type}`,
		typeVersion: 1,
		position: [x, y],
		parameters: {},
	})),
	connections,
};
