import { Comment, Fragment, Text, type VNode } from 'vue';

export function archetypeSections(nodes: VNode[] | undefined): VNode[] {
	if (!nodes) return [];

	return nodes.flatMap((node) => {
		if (node.type === Comment) return [];
		if (node.type === Text && typeof node.children === 'string' && node.children.trim() === '') {
			return [];
		}
		if (node.type === Fragment && Array.isArray(node.children)) {
			return archetypeSections(node.children as VNode[]);
		}
		return [node];
	});
}
