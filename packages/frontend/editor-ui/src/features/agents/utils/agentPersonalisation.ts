import { DEFAULT_AGENT_PERSONALISATION, type AgentJsonConfig } from '@n8n/api-types';

export type AgentPersonalisation = NonNullable<AgentJsonConfig['personalisation']>;
type AgentPersonalisationGradient = AgentPersonalisation['gradient'];

const CHANNEL_ORDERS = [
	[0, 1, 2],
	[0, 2, 1],
	[1, 0, 2],
	[1, 2, 0],
	[2, 0, 1],
	[2, 1, 0],
] as const;

const DEFAULT_AGENT_PERSONALISATION_ICON = DEFAULT_AGENT_PERSONALISATION.icon;

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const randomRatio = (random: () => number) => {
	const value = random();
	return Number.isFinite(value) ? clamp(value) : 0;
};
const randomInRange = (random: () => number, min: number, max: number) =>
	min + randomRatio(random) * (max - min);
const randomIndex = (random: () => number, length: number) =>
	Math.min(Math.floor(randomRatio(random) * length), length - 1);
const randomInteger = (random: () => number, min: number, max: number) =>
	Math.round(randomInRange(random, min, max));

function hexChannel(value: number) {
	return Math.round(clamp(value, 0, 255))
		.toString(16)
		.padStart(2, '0')
		.toUpperCase();
}

function randomVibrantColor(random: () => number) {
	const channelOrder =
		CHANNEL_ORDERS[randomIndex(random, CHANNEL_ORDERS.length)] ?? CHANNEL_ORDERS[0];
	const channels = [0, 0, 0];

	channels[channelOrder[0]] = randomInRange(random, 210, 255);
	channels[channelOrder[1]] = randomInRange(random, 70, 190);
	channels[channelOrder[2]] = randomInRange(random, 0, 110);

	return `#${channels.map(hexChannel).join('')}`;
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
	const from = randomVibrantColor(random);
	const to = randomVibrantColor(random);

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
