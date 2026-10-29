// Experiment cleanup (119_surface_assistant_on_workflow_error)
// Builds the animated border drawn around the "Fix with n8n Assistant" button.
export interface NudgeOutlineInput {
	width: number;
	height: number;
	radius: number;
	stroke: number;
	bottomRadius?: number;
}

export interface NudgeOutline {
	d: string;
	strokeD: string;
	viewBox: string;
	svgWidth: number;
	svgHeight: number;
	pad: number;
	stroke: number;
}

function coordinate(value: number): string {
	const rounded = Math.round(value * 100) / 100;
	return String(rounded);
}

function flatBottomPath(width: number, height: number, radius: number): string {
	return [
		`M ${coordinate(radius)} 0`,
		`H ${coordinate(width - radius)}`,
		`A ${coordinate(radius)} ${coordinate(radius)} 0 0 1 ${coordinate(width)} ${coordinate(radius)}`,
		`V ${coordinate(height)}`,
		'H 0',
		`V ${coordinate(radius)}`,
		`A ${coordinate(radius)} ${coordinate(radius)} 0 0 1 ${coordinate(radius)} 0`,
	].join(' ');
}

function roundedBottomPath(
	width: number,
	height: number,
	topRadius: number,
	bottomRadius: number,
): string {
	return [
		`M ${coordinate(topRadius)} 0`,
		`H ${coordinate(width - topRadius)}`,
		`A ${coordinate(topRadius)} ${coordinate(topRadius)} 0 0 1 ${coordinate(width)} ${coordinate(topRadius)}`,
		`V ${coordinate(height - bottomRadius)}`,
		`A ${coordinate(bottomRadius)} ${coordinate(bottomRadius)} 0 0 1 ${coordinate(width - bottomRadius)} ${coordinate(height)}`,
		`H ${coordinate(bottomRadius)}`,
		`A ${coordinate(bottomRadius)} ${coordinate(bottomRadius)} 0 0 1 0 ${coordinate(height - bottomRadius)}`,
		`V ${coordinate(topRadius)}`,
		`A ${coordinate(topRadius)} ${coordinate(topRadius)} 0 0 1 ${coordinate(topRadius)} 0`,
	].join(' ');
}

export function buildNudgeOutline(input: NudgeOutlineInput): NudgeOutline | undefined {
	const { width, height, stroke } = input;
	if (width <= 0 || height <= 0 || stroke <= 0) return undefined;

	const topRadius = Math.min(input.radius, width / 2, height);
	let bottomRadius = Math.min(Math.max(input.bottomRadius ?? 0, 0), width / 2, height);
	if (topRadius + bottomRadius > height && bottomRadius > 0) {
		bottomRadius = Math.max(height - topRadius, 0);
	}

	const topStraight = width - topRadius * 2;
	if (topStraight <= 0) return undefined;
	if (bottomRadius > 0 && width - bottomRadius * 2 <= 0) return undefined;

	const pad = stroke / 2;
	const d =
		bottomRadius > 0
			? roundedBottomPath(width, height, topRadius, bottomRadius)
			: flatBottomPath(width, height, topRadius);
	const continued = d.replace(/^M\s+\S+\s+\S+\s*/, '');

	return {
		d,
		strokeD: `${d} ${continued}`,
		viewBox: `${coordinate(-pad)} ${coordinate(-pad)} ${coordinate(width + stroke)} ${coordinate(height + stroke)}`,
		svgWidth: width + stroke,
		svgHeight: height + stroke,
		pad,
		stroke,
	};
}
