import { DEFAULT_AGENT_PERSONALISATION, type AgentJsonConfig } from '@n8n/api-types';

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

function hexChannel(value: number) {
	return Math.round(clamp(value, 0, 1) * 255)
		.toString(16)
		.padStart(2, '0')
		.toUpperCase();
}

function linearSrgbToSrgb(value: number) {
	return value >= 0.0031308 ? 1.055 * Math.pow(value, 1 / 2.4) - 0.055 : 12.92 * value;
}

function oklchToHex(lightness: number, chroma: number, hue: number) {
	const hueRadians = (hue * Math.PI) / 180;
	const a = chroma * Math.cos(hueRadians);
	const b = chroma * Math.sin(hueRadians);

	const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;

	const l = l_ ** 3;
	const m = m_ ** 3;
	const s = s_ ** 3;

	const red = linearSrgbToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
	const green = linearSrgbToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
	const blue = linearSrgbToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

	return `#${[red, green, blue].map(hexChannel).join('')}`;
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
