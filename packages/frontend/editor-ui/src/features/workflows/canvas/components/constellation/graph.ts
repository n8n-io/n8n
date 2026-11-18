import { isRecord } from '@n8n/utils/is-record';

export interface ChartStar {
	name: string;
	x: number;
	y: number;
	degree: number;
}

export interface ChartConnection {
	from: number;
	to: number;
	auxiliary: boolean;
}

export interface ConstellationGraph {
	stars: ChartStar[];
	connections: ChartConnection[];
}

// Copy only display data. Parameters and credentials never enter the artwork.
export function createConstellation(workflow: unknown): ConstellationGraph {
	if (!isRecord(workflow) || !Array.isArray(workflow.nodes)) {
		throw new Error('Invalid workflow');
	}
	const stars: ChartStar[] = [];
	for (const node of workflow.nodes) {
		if (!isRecord(node) || node.type === 'n8n-nodes-base.stickyNote') continue;
		if (
			typeof node.name !== 'string' ||
			!Array.isArray(node.position) ||
			typeof node.position[0] !== 'number' ||
			typeof node.position[1] !== 'number' ||
			!Number.isFinite(node.position[0]) ||
			!Number.isFinite(node.position[1])
		)
			continue;
		stars.push({ name: node.name, x: node.position[0], y: node.position[1], degree: 0 });
	}
	const names = new Map(stars.map((star, index) => [star.name, index]));
	const connections: ChartConnection[] = [];
	if (isRecord(workflow.connections)) {
		for (const [source, types] of Object.entries(workflow.connections)) {
			const from = names.get(source);
			if (from === undefined || !isRecord(types)) continue;
			for (const [type, outputs] of Object.entries(types)) {
				if (!Array.isArray(outputs)) continue;
				for (const output of outputs) {
					if (!Array.isArray(output)) continue;
					for (const target of output) {
						if (!isRecord(target) || typeof target.node !== 'string') continue;
						const to = names.get(target.node);
						if (to === undefined) continue;
						connections.push({ from, to, auxiliary: type !== 'main' });
						stars[from].degree++;
						stars[to].degree++;
					}
				}
			}
		}
	}
	if (stars.length) {
		const minX = Math.min(...stars.map((star) => star.x));
		const maxX = Math.max(...stars.map((star) => star.x));
		const minY = Math.min(...stars.map((star) => star.y));
		const maxY = Math.max(...stars.map((star) => star.y));
		const scale = Math.min(1120 / Math.max(maxX - minX, 1), 480 / Math.max(maxY - minY, 1), 2);
		for (const star of stars) {
			star.x = 800 + (star.x - (minX + maxX) / 2) * scale;
			star.y = 485 + (star.y - (minY + maxY) / 2) * scale;
		}
	}
	return { stars, connections };
}

export const backgroundStars = Array.from({ length: 260 }, (_, index) => {
	// A fixed field keeps the artwork stable across renders and downloads.
	const noise = (seed: number) => {
		const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
		return value - Math.floor(value);
	};
	return {
		x: noise(index + 1) * 1600,
		y: noise(index + 401) * 1000,
		r: 0.4 + noise(index + 801) * 1.2,
	};
});
