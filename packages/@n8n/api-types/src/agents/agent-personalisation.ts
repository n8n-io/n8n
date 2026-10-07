import { oklchToRgb, rgbToHex } from '@n8n/utils/color/oklch';

import { DEFAULT_AGENT_PERSONALISATION, type AgentJsonConfig } from './agent-json-config.schema';

export type AgentPersonalisation = NonNullable<AgentJsonConfig['personalisation']>;
type AgentPersonalisationGradient = AgentPersonalisation['gradient'];

const DEFAULT_AGENT_PERSONALISATION_ICON = DEFAULT_AGENT_PERSONALISATION.icon;
const FULL_HUE_TURN = 360;

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const randomRatio = (random: () => number) => {
	const value = random();
	return Number.isFinite(value) ? clamp(value) : 0;
};
const randomInRange = (random: () => number, min: number, max: number) =>
	min + randomRatio(random) * (max - min);
const randomInteger = (random: () => number, min: number, max: number) =>
	Math.round(randomInRange(random, min, max));

function oklchToHex(lightness: number, chroma: number, hue: number) {
	return rgbToHex(oklchToRgb([lightness, chroma, hue]));
}

function randomComplementaryColors(random: () => number) {
	const baseHue = randomInteger(random, 0, FULL_HUE_TURN - 1);
	const complementHue =
		(baseHue + 180 + randomInteger(random, -24, 24) + FULL_HUE_TURN) % FULL_HUE_TURN;

	return {
		from: oklchToHex(randomInRange(random, 0.62, 0.7), randomInRange(random, 0.16, 0.22), baseHue),
		to: oklchToHex(
			randomInRange(random, 0.64, 0.74),
			randomInRange(random, 0.14, 0.2),
			complementHue,
		),
	};
}

function getRandomGradientLayout(random: () => number) {
	return {
		angle: randomInteger(random, 0, 359),
		fromStop: randomInteger(random, 0, 24),
		toStop: randomInteger(random, 76, 100),
	};
}

export function getRandomAgentPersonalisationGradient(
	random: () => number = Math.random,
): AgentPersonalisationGradient {
	const { from, to } = randomComplementaryColors(random);

	return {
		from,
		to: to === from ? DEFAULT_AGENT_PERSONALISATION.gradient.to : to,
		...getRandomGradientLayout(random),
	};
}

export function resolveAgentPersonalisation(
	value?: Partial<AgentPersonalisation> | null,
): AgentPersonalisation {
	return {
		icon: value?.icon ?? DEFAULT_AGENT_PERSONALISATION_ICON,
		gradient: { ...DEFAULT_AGENT_PERSONALISATION.gradient, ...value?.gradient },
	};
}

export function addMissingAgentPersonalisation(
	config: AgentJsonConfig,
	random?: () => number,
): AgentJsonConfig | null {
	const gradient = config.personalisation?.gradient;
	if (
		gradient?.angle !== undefined &&
		gradient.fromStop !== undefined &&
		gradient.toStop !== undefined
	) {
		return null;
	}

	return {
		...config,
		personalisation: {
			icon: config.personalisation?.icon ?? DEFAULT_AGENT_PERSONALISATION_ICON,
			gradient: gradient
				? { ...gradient, ...getRandomGradientLayout(random ?? Math.random) }
				: getRandomAgentPersonalisationGradient(random),
		},
	};
}
