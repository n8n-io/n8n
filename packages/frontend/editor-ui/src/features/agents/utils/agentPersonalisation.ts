import type { AgentJsonConfig } from '../types';

export type AgentPersonalisation = NonNullable<AgentJsonConfig['personalisation']>;

type AgentPersonalisationGradient = AgentPersonalisation['gradient'];

export const DEFAULT_AGENT_PERSONALISATION_ICON = 'bot';

const HUE_OFFSET_RANGES = [
	{ min: 22, max: 42 },
	{ min: 44, max: 72 },
	{ min: 78, max: 118 },
	{ min: 128, max: 168 },
];

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function randomRatio(random: () => number) {
	const value = random();
	return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
}

function randomIndex(random: () => number, length: number) {
	return Math.min(Math.floor(randomRatio(random) * length), length - 1);
}

function randomInRange(random: () => number, min: number, max: number) {
	return min + randomRatio(random) * (max - min);
}

function normalizeHue(hue: number) {
	return ((hue % 360) + 360) % 360;
}

function toHexChannel(value: number) {
	return Math.round(clamp(value, 0, 255))
		.toString(16)
		.padStart(2, '0')
		.toUpperCase();
}

function hslToHex(hue: number, saturation: number, lightness: number) {
	const normalizedHue = normalizeHue(hue) / 60;
	const saturationRatio = clamp(saturation, 0, 100) / 100;
	const lightnessRatio = clamp(lightness, 0, 100) / 100;
	const chroma = (1 - Math.abs(2 * lightnessRatio - 1)) * saturationRatio;
	const x = chroma * (1 - Math.abs((normalizedHue % 2) - 1));
	const m = lightnessRatio - chroma / 2;

	let red = 0;
	let green = 0;
	let blue = 0;

	if (normalizedHue < 1) {
		red = chroma;
		green = x;
	} else if (normalizedHue < 2) {
		red = x;
		green = chroma;
	} else if (normalizedHue < 3) {
		green = chroma;
		blue = x;
	} else if (normalizedHue < 4) {
		green = x;
		blue = chroma;
	} else if (normalizedHue < 5) {
		red = x;
		blue = chroma;
	} else {
		red = chroma;
		blue = x;
	}

	return `#${toHexChannel((red + m) * 255)}${toHexChannel(
		(green + m) * 255,
	)}${toHexChannel((blue + m) * 255)}`;
}

export function getRandomAgentPersonalisationGradient(
	random: () => number = Math.random,
): AgentPersonalisationGradient {
	const baseHue = randomInRange(random, 0, 360);
	const offsetRange =
		HUE_OFFSET_RANGES[randomIndex(random, HUE_OFFSET_RANGES.length)] ?? HUE_OFFSET_RANGES[0];
	const hueOffset = randomInRange(random, offsetRange.min, offsetRange.max);
	const direction = randomRatio(random) < 0.5 ? -1 : 1;

	return {
		from: hslToHex(baseHue, randomInRange(random, 84, 98), randomInRange(random, 48, 60)),
		to: hslToHex(
			baseHue + direction * hueOffset,
			randomInRange(random, 84, 98),
			randomInRange(random, 50, 64),
		),
	};
}

export function createDefaultAgentPersonalisation(random?: () => number): AgentPersonalisation {
	return {
		icon: DEFAULT_AGENT_PERSONALISATION_ICON,
		gradient: getRandomAgentPersonalisationGradient(random),
	};
}

export function addMissingAgentPersonalisation(
	config: AgentJsonConfig,
	random?: () => number,
): AgentJsonConfig | null {
	if (config.personalisation?.gradient) return null;

	return {
		...config,
		personalisation: {
			icon: config.personalisation?.icon ?? DEFAULT_AGENT_PERSONALISATION_ICON,
			gradient: getRandomAgentPersonalisationGradient(random),
		},
	};
}
