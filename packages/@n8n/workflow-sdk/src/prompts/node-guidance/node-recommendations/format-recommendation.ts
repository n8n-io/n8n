import type { NodeRecommendation } from './types';

function wrapSection(tag: string, content: string): string {
	return `<${tag}>\n${content}\n</${tag}>`;
}

export function formatRecommendation(rec: NodeRecommendation): string {
	const sections: string[] = [
		wrapSection('default_node', rec.defaultNode),
		wrapSection('operations', rec.operations.map((op) => `- ${op}`).join('\n')),
		wrapSection('reasoning', rec.reasoning),
	];

	if (rec.connectedNodes && rec.connectedNodes.length > 0) {
		const connectedContent = rec.connectedNodes
			.map((cn) => {
				const desc = cn.description ? ` - ${cn.description}` : '';
				return `- ${cn.nodeType} (connection: ${cn.connectionType})${desc}`;
			})
			.join('\n');
		sections.push(wrapSection('connected_nodes', connectedContent));
	}

	if (rec.note) {
		sections.push(wrapSection('note', rec.note));
	}

	return sections.join('\n\n');
}
