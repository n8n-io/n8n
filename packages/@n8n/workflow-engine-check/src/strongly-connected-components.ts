/**
 * Splits the nodes into groups whose members can all reach each other along
 * `successors`. A node on no cycle is a group of one. Tarjan's algorithm:
 * https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
 */
export function findStronglyConnectedComponents(
	nodeNames: readonly string[],
	successors: (nodeName: string) => readonly string[],
): string[][] {
	const indexByName = new Map<string, number>();
	const lowlinkByName = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	const components: string[][] = [];

	const visit = (name: string): void => {
		const index = indexByName.size;
		indexByName.set(name, index);
		lowlinkByName.set(name, index);
		stack.push(name);
		onStack.add(name);

		for (const next of successors(name)) {
			if (!indexByName.has(next)) {
				visit(next);
				lowlinkByName.set(name, Math.min(lowlinkByName.get(name)!, lowlinkByName.get(next)!));
			} else if (onStack.has(next)) {
				lowlinkByName.set(name, Math.min(lowlinkByName.get(name)!, indexByName.get(next)!));
			}
		}

		if (lowlinkByName.get(name) === index) {
			const component: string[] = [];
			let member: string;
			do {
				member = stack.pop()!;
				onStack.delete(member);
				component.push(member);
			} while (member !== name);
			components.push(component);
		}
	};

	for (const name of nodeNames) {
		if (!indexByName.has(name)) visit(name);
	}

	return components;
}
