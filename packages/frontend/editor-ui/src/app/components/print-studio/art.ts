export type PrintStyle = 'blueprint' | 'minimal' | 'circuit';
export type Palette = 'original' | 'warm' | 'mono';
export interface ArtNode {
	x: number;
	y: number;
}
export interface ArtGraph {
	nodes: ArtNode[];
	edges: Array<[number, number]>;
}

/** Keep only geometry. Source names are used to resolve connections, then discarded. */
export function readGraph(input: unknown): ArtGraph {
	if (!input || typeof input !== 'object' || !('nodes' in input) || !Array.isArray(input.nodes))
		throw new Error('invalid');
	const nodes: ArtNode[] = [];
	const indices = new Map<string, number>();
	for (const node of input.nodes) {
		if (
			!node ||
			typeof node !== 'object' ||
			!('name' in node) ||
			typeof node.name !== 'string' ||
			!('position' in node) ||
			!Array.isArray(node.position)
		)
			continue;
		if ('type' in node && node.type === 'n8n-nodes-base.stickyNote') continue;
		const [x, y] = node.position;
		if (
			typeof x !== 'number' ||
			typeof y !== 'number' ||
			!Number.isFinite(x) ||
			!Number.isFinite(y) ||
			Math.abs(x) > 1e7 ||
			Math.abs(y) > 1e7
		)
			continue;
		indices.set(node.name, nodes.length);
		nodes.push({ x, y });
	}
	if (!nodes.length || nodes.length > 300) throw new Error('invalid');
	const edges: Array<[number, number]> = [];
	if ('connections' in input && input.connections && typeof input.connections === 'object') {
		for (const [name, outputs] of Object.entries(input.connections)) {
			const from = indices.get(name);
			if (from === undefined || !outputs || typeof outputs !== 'object') continue;
			for (const groups of Object.values(outputs)) {
				if (!Array.isArray(groups)) continue;
				for (const group of groups) {
					if (!Array.isArray(group)) continue;
					for (const connection of group) {
						if (
							!connection ||
							typeof connection !== 'object' ||
							typeof connection.node !== 'string'
						)
							continue;
						const to = indices.get(connection.node);
						if (to !== undefined && edges.length < 2000) edges.push([from, to]);
					}
				}
			}
		}
	}
	return { nodes, edges };
}

export function layout(graph: ArtGraph, width = 900, height = 640): ArtGraph {
	const xs = graph.nodes.map((node) => node.x);
	const ys = graph.nodes.map((node) => node.y);
	const minX = Math.min(...xs),
		maxX = Math.max(...xs);
	const minY = Math.min(...ys),
		maxY = Math.max(...ys);
	const scale = Math.min(width / Math.max(maxX - minX, 200), height / Math.max(maxY - minY, 200));
	return {
		nodes: graph.nodes.map(({ x, y }) => ({
			x: (x - (minX + maxX) / 2) * scale + width / 2,
			y: (y - (minY + maxY) / 2) * scale + height / 2,
		})),
		edges: graph.edges,
	};
}

export const palettes = {
	blueprint: {
		original: ['#113d90', '#e5eeff', '#84b4fc'],
		warm: ['#62312c', '#fff0d5', '#dba483'],
		mono: ['#242934', '#f1f2f5', '#9098a5'],
	},
	minimal: {
		original: ['#f5edda', '#ee543a', '#202c2b'],
		warm: ['#f5c348', '#a52a35', '#462a32'],
		mono: ['#f1f0eb', '#272726', '#92918a'],
	},
	circuit: {
		original: ['#102e2c', '#d5bd7d', '#668e7b'],
		warm: ['#2e1928', '#efb77f', '#956f86'],
		mono: ['#171c24', '#d6dce5', '#728192'],
	},
};

export function renderSvg(graph: ArtGraph, style: PrintStyle, palette: Palette): string {
	const [bg, ink, muted] = palettes[style][palette];
	const g = layout(graph, 840, 570);
	const nodes = g.nodes.map((n) => ({ x: n.x + 180, y: n.y + 410 }));
	const pieces: string[] = [];
	if (style === 'blueprint') {
		pieces.push(
			`<defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="${ink}" stroke-opacity=".13"/></pattern></defs><rect width="1200" height="1500" fill="url(#grid)"/><rect x="64" y="64" width="1072" height="1372" fill="none" stroke="${ink}" stroke-width="2"/>`,
		);
		for (const n of nodes)
			pieces.push(
				`<path d="M${n.x} 330V1100 M125 ${n.y}H1075" stroke="${ink}" stroke-opacity=".14" stroke-dasharray="4 8"/>`,
			);
	} else if (style === 'minimal') {
		pieces.push(
			`<circle cx="1020" cy="180" r="230" fill="${ink}"/><path d="M80 1250H1120" stroke="${muted}" stroke-width="3"/>`,
		);
	} else {
		pieces.push(
			`<defs><pattern id="etch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="${ink}" stroke-opacity=".035"/></pattern></defs><rect width="1200" height="1500" fill="url(#etch)"/><rect x="50" y="50" width="1100" height="1400" rx="24" fill="none" stroke="${muted}"/>`,
		);
		for (const [x, y] of [
			[80, 80],
			[1120, 80],
			[80, 1420],
			[1120, 1420],
		])
			pieces.push(
				`<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${ink}"/><path d="M${x - 6} ${y}h12" stroke="${ink}"/>`,
			);
	}
	for (const [from, to] of g.edges) {
		const a = nodes[from],
			b = nodes[to];
		const mid = (a.x + b.x) / 2;
		const d =
			style === 'circuit'
				? `M${a.x} ${a.y}H${mid - 20}L${mid + 20} ${b.y}H${b.x}`
				: `M${a.x} ${a.y}C${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}`;
		pieces.push(
			`<path d="${d}" fill="none" stroke="${style === 'minimal' ? muted : ink}" stroke-width="${style === 'minimal' ? 16 : style === 'circuit' ? 5 : 2}" stroke-linecap="round"/>`,
		);
		if (style === 'circuit')
			pieces.push(`<path d="${d}" fill="none" stroke="${bg}" stroke-width="1"/>`);
	}
	for (const [i, n] of nodes.entries()) {
		if (style === 'minimal')
			pieces.push(
				i % 3 === 1
					? `<rect x="${n.x - 40}" y="${n.y - 40}" width="80" height="80" fill="${ink}" transform="rotate(45 ${n.x} ${n.y})"/>`
					: `<circle cx="${n.x}" cy="${n.y}" r="45" fill="${ink}"/><circle cx="${n.x}" cy="${n.y}" r="13" fill="${bg}"/>`,
			);
		else if (style === 'blueprint')
			pieces.push(
				`<rect x="${n.x - 30}" y="${n.y - 30}" width="60" height="60" rx="9" fill="${bg}" stroke="${ink}" stroke-width="2"/><path d="M${n.x - 14} ${n.y}h28 M${n.x} ${n.y - 14}v28" stroke="${ink}"/><circle cx="${n.x}" cy="${n.y}" r="44" fill="none" stroke="${ink}" stroke-dasharray="2 7"/><text x="${n.x}" y="${n.y + 67}" text-anchor="middle" font-size="13">${String(i + 1).padStart(2, '0')}</text>`,
			);
		else {
			pieces.push(
				`<rect x="${n.x - 29}" y="${n.y - 29}" width="58" height="58" rx="4" fill="${bg}" stroke="${ink}" stroke-width="3"/><rect x="${n.x - 19}" y="${n.y - 19}" width="38" height="38" fill="none" stroke="${muted}"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle" font-size="14">${String(i + 1).padStart(2, '0')}</text>`,
			);
			for (const offset of [-18, -6, 6, 18])
				pieces.push(
					`<path d="M${n.x + offset} ${n.y - 40}v11 M${n.x + offset} ${n.y + 29}v11 M${n.x - 40} ${n.y + offset}h11 M${n.x + 29} ${n.y + offset}h11" stroke="${ink}" stroke-width="3"/>`,
				);
		}
	}
	const title =
		style === 'blueprint' ? 'THE SHAPE' : style === 'minimal' ? 'Form follows' : 'CONNECTED';
	const subtitle =
		style === 'blueprint' ? 'OF A WORKFLOW' : style === 'minimal' ? 'workflow.' : 'BY DESIGN';
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500"><rect width="1200" height="1500" fill="${bg}"/><g fill="${ink}" font-family="${style === 'minimal' ? 'Arial, sans-serif' : 'monospace'}">${pieces.join('')}<text x="110" y="${style === 'minimal' ? 170 : 180}" font-size="${style === 'minimal' ? 88 : 60}" font-weight="700" letter-spacing="${style === 'minimal' ? -4 : 4}">${title}</text><text x="110" y="${style === 'minimal' ? 265 : 255}" font-size="${style === 'minimal' ? 88 : 60}" font-weight="700" letter-spacing="${style === 'minimal' ? -4 : 4}">${subtitle}</text><path d="M110 1180H1090" stroke="${muted}"/><text x="110" y="1230" font-size="16" letter-spacing="3">${String(graph.nodes.length).padStart(2, '0')} / ${String(graph.edges.length).padStart(2, '0')}</text><text x="110" y="1350" font-size="18" letter-spacing="4">n8n / HACKMATION</text><text x="1090" y="1350" text-anchor="end" font-size="14">${style.toUpperCase()} — 001</text></g></svg>`;
}

export async function renderPng(svg: string): Promise<Blob> {
	const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
	try {
		const image = new Image();
		image.src = url;
		await image.decode();
		const canvas = document.createElement('canvas');
		canvas.width = 3600;
		canvas.height = 4500;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('canvas');
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return await new Promise((resolve, reject) =>
			canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png'),
		);
	} finally {
		URL.revokeObjectURL(url);
	}
}

export function download(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
