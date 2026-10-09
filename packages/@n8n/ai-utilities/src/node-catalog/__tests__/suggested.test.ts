import { NodeTypeParser } from '../node-type-parser';
import { getSuggestedNodes } from '../suggested';
import { suggestedNodesData } from '../suggested-nodes-data';

describe('getSuggestedNodes — excluded node ids', () => {
	const category = Object.keys(suggestedNodesData).find(
		(key) => suggestedNodesData[key].nodes.length > 1,
	)!;
	const [excluded, kept] = suggestedNodesData[category].nodes;
	const parser = new NodeTypeParser([]);

	it('lists every curated node when nothing is excluded', () => {
		const output = getSuggestedNodes(parser, [category]);

		expect(output).toContain(`- ${excluded.name}`);
		expect(output).toContain(`- ${kept.name}`);
	});

	it('leaves excluded node ids out, such as the ones a policy restricts', () => {
		const output = getSuggestedNodes(parser, [category], {
			excludedNodeIds: new Set([excluded.name]),
		});

		expect(output).not.toContain(`- ${excluded.name}\n`);
		expect(output).toContain(`- ${kept.name}`);
	});
});
