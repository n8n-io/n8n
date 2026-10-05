import { oklchToRgb, resolveAgentPersonalisation, type AgentPersonalisation } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';
import { readFile } from 'node:fs/promises';
import { crc32, deflateSync } from 'node:zlib';

/**
 * Draws the agent's personalisation icon as the two PNGs a Teams app package
 * needs.
 *
 * This is plain JS on purpose. An image library keeps its memory for the life
 * of the process once it is loaded: `@napi-rs/canvas` holds tens of MB, and its
 * native binary is not in the Docker image. `@resvg/resvg-wasm` never gives its
 * wasm memory back. A library is also not necessary: Lucide glyphs are strokes
 * with round caps and joins, so the coverage of a pixel follows from its
 * distance to the path alone.
 */

export interface TeamsAppIcons {
	/** 192×192, full bleed: Teams rounds the corners itself. */
	color: Buffer;
	/** 32×32, white on transparent: Teams rejects any other colour. */
	outline: Buffer;
	accentColor: string;
}

const COLOR_SIZE = 192;
const OUTLINE_SIZE = 32;
/** The glyph share of the tile in `AgentPersonalisationIcon.vue`. */
const GLYPH_RATIO = 0.6;
const VIEWBOX = 24;
const STROKE_WIDTH = 2;

type Point = [number, number];
type Rgb = [number, number, number];
type Gradient = AgentPersonalisation['gradient'];

/** Returns undefined for an icon this cannot draw, so the caller keeps the bundled icons. */
export async function renderTeamsAppIcons(
	personalisation?: AgentPersonalisation | null,
): Promise<TeamsAppIcons | undefined> {
	const { icon, gradient } = resolveAgentPersonalisation(personalisation);
	const body = await lucideBody(icon);
	if (!body) return undefined;

	try {
		const glyph = parseGlyph(body);
		const colorAt = gradientSampler(gradient);
		return {
			color: drawColorIcon(glyph, gradient, colorAt),
			outline: drawOutlineIcon(glyph),
			accentColor: toHex(colorAt(stopProgress(gradient, 0.5))),
		};
	} catch (error) {
		// A later Lucide release can add path syntax this does not parse. That
		// must not block the package download.
		Container.get(Logger).warn('Could not draw the agent icon for the Teams app', {
			icon,
			error,
		});
		return undefined;
	}
}

/**
 * Read for each call instead of imported, so the parsed icon set is not held
 * for the life of the process. Aliases are skipped, as the editor's icon
 * loader skips them. Only stroked icons qualify: the one fill-only icon also
 * uses a larger viewBox.
 */
async function lucideBody(name: string): Promise<string | undefined> {
	const file = await readFile(require.resolve('@iconify-json/lucide/icons.json'), 'utf8');
	const set: unknown = JSON.parse(file);
	const icons = isRecord(set) && isRecord(set.icons) ? set.icons : {};
	const icon = Object.hasOwn(icons, name) ? icons[name] : undefined;
	if (!isRecord(icon) || typeof icon.body !== 'string') return undefined;
	return icon.body.includes('stroke="currentColor"') ? icon.body : undefined;
}

interface Glyph {
	lines: Point[][];
	fills: Point[][];
}

function parseGlyph(body: string): Glyph {
	const glyph: Glyph = { lines: [], fills: [] };
	for (const [, tag, attributes] of body.matchAll(/<(path|circle|ellipse|rect)\b([^>]*)>/g)) {
		const lines = flattenPath(shapeToPath(tag, attributes));
		glyph.lines.push(...lines);
		if (/\bfill="currentColor"/.test(attributes)) glyph.fills.push(...lines);
	}
	return glyph;
}

function shapeToPath(tag: string, attributes: string): string {
	const read = (name: string) => {
		// Not `\\b`: it would also match `width` inside `stroke-width`.
		const value = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1];
		return value === undefined ? undefined : Number(value);
	};

	if (tag === 'path') return /\bd="([^"]*)"/.exec(attributes)?.[1] ?? '';

	if (tag === 'circle' || tag === 'ellipse') {
		const [cx, cy] = [read('cx') ?? 0, read('cy') ?? 0];
		const rx = read('r') ?? read('rx') ?? 0;
		const ry = read('r') ?? read('ry') ?? 0;
		return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
	}

	const [x, y, w, h] = [read('x') ?? 0, read('y') ?? 0, read('width') ?? 0, read('height') ?? 0];
	// Lucide rounds both axes by the same radius, which never exceeds half a side.
	const r = read('rx') ?? read('ry') ?? 0;
	const corner = (ex: number, ey: number) => `A${r} ${r} 0 0 1 ${ex} ${ey}`;
	return [
		`M${x + r} ${y}H${x + w - r}`,
		corner(x + w, y + r),
		`V${y + h - r}`,
		corner(x + w - r, y + h),
		`H${x + r}`,
		corner(x, y + h - r),
		`V${y + r}`,
		corner(x + r, y),
		'Z',
	].join('');
}

function flattenPath(d: string): Point[][] {
	const lines: Point[][] = [];
	let line: Point[] = [];
	let [x, y] = [0, 0];
	let start: Point = [0, 0];
	// The control point a following S (after C or S) or T (after Q or T) reflects.
	let control: { point: Point; cubic: boolean } | null = null;
	let command = '';
	let position = 0;

	const skipSeparators = () => {
		while (position < d.length && /[\s,]/.test(d[position])) position++;
	};
	const readNumber = () => {
		skipSeparators();
		const match = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;
		match.lastIndex = position;
		const found = match.exec(d);
		if (!found) throw new UnexpectedError(`Expected a number at ${position} in "${d}"`);
		position = match.lastIndex;
		return Number(found[0]);
	};
	// Minified arcs pack their flags together with the next number, as in `a2 2 0 012 2`.
	const flag = () => {
		skipSeparators();
		return d[position++] === '1';
	};
	const lineTo = (nx: number, ny: number) => {
		line.push([nx, ny]);
		[x, y] = [nx, ny];
	};
	const reflected = (cubic: boolean): Point =>
		control?.cubic === cubic ? [2 * x - control.point[0], 2 * y - control.point[1]] : [x, y];
	const curveTo = (points: Point[], steps: number) => {
		const from: Point = [x, y];
		for (let step = 1; step <= steps; step++) {
			lineTo(...bezierPoint([from, ...points], step / steps));
		}
	};

	while (true) {
		skipSeparators();
		if (position >= d.length) break;
		if (/[a-zA-Z]/.test(d[position])) command = d[position++];

		const relative = command === command.toLowerCase();
		const [ox, oy] = relative ? [x, y] : [0, 0];
		const point = (): Point => [readNumber() + ox, readNumber() + oy];
		const upper = command.toUpperCase();

		if (upper === 'M') {
			line = [];
			lines.push(line);
			lineTo(...point());
			start = [x, y];
			// Pairs after a move are implicit line commands.
			command = relative ? 'l' : 'L';
		} else if (upper === 'L') lineTo(...point());
		else if (upper === 'H') lineTo(readNumber() + ox, y);
		else if (upper === 'V') lineTo(x, readNumber() + oy);
		else if (upper === 'C' || upper === 'S') {
			const first = upper === 'C' ? point() : reflected(true);
			const second = point();
			curveTo([first, second, point()], 16);
			control = { point: second, cubic: true };
			continue;
		} else if (upper === 'Q' || upper === 'T') {
			const handle = upper === 'Q' ? point() : reflected(false);
			curveTo([handle, point()], 12);
			control = { point: handle, cubic: false };
			continue;
		} else if (upper === 'A') {
			const [rx, ry, rotation] = [readNumber(), readNumber(), readNumber()];
			const [large, sweep] = [flag(), flag()];
			for (const p of arcPoints([x, y], point(), rx, ry, rotation, large, sweep)) lineTo(...p);
		} else if (upper === 'Z') lineTo(...start);
		else throw new UnexpectedError(`Unsupported path command "${command}" in "${d}"`);
		control = null;
	}
	return lines;
}

function bezierPoint(points: Point[], t: number): Point {
	// De Casteljau: works for quadratic and cubic curves alike.
	let current = points;
	while (current.length > 1) {
		current = current
			.slice(1)
			.map(
				(p, i): Point => [
					current[i][0] + (p[0] - current[i][0]) * t,
					current[i][1] + (p[1] - current[i][1]) * t,
				],
			);
	}
	return current[0];
}

/** Endpoint to centre conversion from the SVG spec, appendix F.6.5. */
function arcPoints(
	[x1, y1]: Point,
	[x2, y2]: Point,
	rx: number,
	ry: number,
	rotation: number,
	large: boolean,
	sweep: boolean,
): Point[] {
	if (rx === 0 || ry === 0) return [[x2, y2]];
	const phi = (rotation * Math.PI) / 180;
	const [cos, sin] = [Math.cos(phi), Math.sin(phi)];
	const [dx, dy] = [(x1 - x2) / 2, (y1 - y2) / 2];
	const [px, py] = [cos * dx + sin * dy, -sin * dx + cos * dy];

	[rx, ry] = [Math.abs(rx), Math.abs(ry)];
	const scale = (px * px) / (rx * rx) + (py * py) / (ry * ry);
	if (scale > 1) [rx, ry] = [rx * Math.sqrt(scale), ry * Math.sqrt(scale)];

	const numerator = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
	const denominator = rx * rx * py * py + ry * ry * px * px;
	const factor = Math.sqrt(Math.max(0, numerator / denominator)) * (large === sweep ? -1 : 1);
	const [cxp, cyp] = [(factor * rx * py) / ry, (-factor * ry * px) / rx];
	const [cx, cy] = [cos * cxp - sin * cyp + (x1 + x2) / 2, sin * cxp + cos * cyp + (y1 + y2) / 2];

	const angle = (ux: number, uy: number, vx: number, vy: number) =>
		Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
	const [ux, uy] = [(px - cxp) / rx, (py - cyp) / ry];
	const startAngle = angle(1, 0, ux, uy);
	let sweepAngle = angle(ux, uy, (-px - cxp) / rx, (-py - cyp) / ry);
	if (!sweep && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
	if (sweep && sweepAngle < 0) sweepAngle += 2 * Math.PI;

	// About one segment per half unit of arc length, which is sub-pixel at 192px.
	const steps = Math.max(4, Math.ceil(Math.abs(sweepAngle) * Math.max(rx, ry) * 2));
	const points: Point[] = [];
	for (let step = 1; step <= steps; step++) {
		const a = startAngle + (sweepAngle * step) / steps;
		const [ex, ey] = [rx * Math.cos(a), ry * Math.sin(a)];
		points.push([cx + ex * cos - ey * sin, cy + ex * sin + ey * cos]);
	}
	return points;
}

function glyphMask(glyph: Glyph, size: number): Float32Array {
	const scale = size / VIEWBOX;
	const halfWidth = (STROKE_WIDTH * scale) / 2;
	const mask = new Float32Array(size * size);
	const scaled = (line: Point[]) => line.map(([x, y]): Point => [x * scale, y * scale]);

	// A subpath that is only a move paints nothing, as in a browser.
	for (const line of glyph.lines.map(scaled)) {
		for (let i = 1; i < line.length; i++)
			strokeSegment(mask, size, line[i - 1], line[i], halfWidth);
	}
	for (const outline of glyph.fills.map(scaled)) fillPolygon(mask, size, outline);
	return mask;
}

function strokeSegment(
	mask: Float32Array,
	size: number,
	[ax, ay]: Point,
	[bx, by]: Point,
	halfWidth: number,
) {
	const reach = halfWidth + 1;
	const [dx, dy] = [bx - ax, by - ay];
	const lengthSquared = dx * dx + dy * dy;
	const [x0, x1] = [
		Math.max(0, Math.floor(Math.min(ax, bx) - reach)),
		Math.min(size - 1, Math.ceil(Math.max(ax, bx) + reach)),
	];
	const [y0, y1] = [
		Math.max(0, Math.floor(Math.min(ay, by) - reach)),
		Math.min(size - 1, Math.ceil(Math.max(ay, by) + reach)),
	];

	for (let py = y0; py <= y1; py++) {
		for (let px = x0; px <= x1; px++) {
			const [cx, cy] = [px + 0.5, py + 0.5];
			const t = lengthSquared
				? Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / lengthSquared))
				: 0;
			const distance = Math.hypot(cx - ax - t * dx, cy - ay - t * dy);
			// A one-pixel ramp at the edge anti-aliases the stroke.
			const coverage = Math.max(0, Math.min(1, halfWidth - distance + 0.5));
			const index = py * size + px;
			if (coverage > mask[index]) mask[index] = coverage;
		}
	}
}

/** Even-odd fill. The stroke drawn along the same outline anti-aliases its edge. */
function fillPolygon(mask: Float32Array, size: number, outline: Point[]) {
	for (let py = 0; py < size; py++) {
		for (let px = 0; px < size; px++) {
			const [cx, cy] = [px + 0.5, py + 0.5];
			let inside = false;
			for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
				const [[xi, yi], [xj, yj]] = [outline[i], outline[j]];
				if (yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
			}
			if (inside) mask[py * size + px] = 1;
		}
	}
}

/** Where a point at `position` (0..1 along the gradient line) falls between the two stops. */
function stopProgress({ fromStop, toStop }: Gradient, position: number): number {
	return Math.max(0, Math.min(1, (position - fromStop / 100) / ((toStop - fromStop) / 100)));
}

/**
 * Interpolates in oklch, as the editor does. Random agent gradients pair
 * complementary hues, which sRGB mixing would turn grey in the middle.
 */
function gradientSampler({ from, to }: Gradient): (progress: number) => Rgb {
	const [l1, c1, h1] = toOklch(parseHex(from));
	const [l2, c2, h2] = toOklch(parseHex(to));
	// A grey has no hue of its own, so it takes the other colour's.
	const [hueFrom, hueTo] = [c1 < 1e-4 ? h2 : h1, c2 < 1e-4 ? h1 : h2];
	const hueDelta = ((hueTo - hueFrom + 540) % 360) - 180;
	return (t) => oklchToRgb(l1 + (l2 - l1) * t, c1 + (c2 - c1) * t, hueFrom + hueDelta * t);
}

function parseHex(hex: string): Rgb {
	const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16);
	return [channel(1), channel(3), channel(5)];
}

function toHex(rgb: Rgb): string {
	return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** sRGB → oklch, using Björn Ottosson's matrices. */
function toOklch([r, g, b]: Rgb): Rgb {
	const [lr, lg, lb] = [r, g, b].map((c) => toLinear(c / 255));
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI];
}

function drawColorIcon(
	glyph: Glyph,
	gradient: Gradient,
	colorAt: (progress: number) => Rgb,
): Buffer {
	const size = COLOR_SIZE;
	const glyphSize = Math.round(size * GLYPH_RATIO);
	const offset = Math.round((size - glyphSize) / 2);
	const mask = glyphMask(glyph, glyphSize);

	// CSS angles point up at 0deg and turn clockwise. The gradient line is long
	// enough that the stops land exactly on the corners.
	const radians = (gradient.angle * Math.PI) / 180;
	const [ux, uy] = [Math.sin(radians), -Math.cos(radians)];
	const lineLength = size * (Math.abs(ux) + Math.abs(uy));
	// Colours along the gradient line, so oklch is converted once per step, not per pixel.
	const palette = Array.from({ length: 256 }, (_, i) => colorAt(i / 255));

	const pixels = Buffer.alloc(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const position = ((x + 0.5 - size / 2) * ux + (y + 0.5 - size / 2) * uy) / lineLength + 0.5;
			const background = palette[Math.round(stopProgress(gradient, position) * 255)];
			const [gx, gy] = [x - offset, y - offset];
			const coverage =
				gx >= 0 && gy >= 0 && gx < glyphSize && gy < glyphSize ? mask[gy * glyphSize + gx] : 0;
			const index = (y * size + x) * 4;
			for (let channel = 0; channel < 3; channel++) {
				pixels[index + channel] = Math.round(background[channel] * (1 - coverage) + 255 * coverage);
			}
			pixels[index + 3] = 255;
		}
	}
	return encodePng(size, size, pixels);
}

function drawOutlineIcon(glyph: Glyph): Buffer {
	const mask = glyphMask(glyph, OUTLINE_SIZE);
	const pixels = Buffer.alloc(mask.length * 4, 255);
	for (let i = 0; i < mask.length; i++) pixels[i * 4 + 3] = Math.round(mask[i] * 255);
	return encodePng(OUTLINE_SIZE, OUTLINE_SIZE, pixels);
}

/** 8-bit RGBA, no interlacing, and filter 0 on every row. */
function encodePng(width: number, height: number, rgba: Buffer): Buffer {
	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++)
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);

	const chunk = (type: string, data: Buffer) => {
		const out = Buffer.alloc(12 + data.length);
		out.writeUInt32BE(data.length, 0);
		out.write(type, 4, 'ascii');
		data.copy(out, 8);
		out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
		return out;
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 6; // colour type: RGBA

	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0)),
	]);
}
