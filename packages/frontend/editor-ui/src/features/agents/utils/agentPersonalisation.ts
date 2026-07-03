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

const randomRatio = (random: () => number) => clamp(random());
const randomInRange = (random: () => number, min: number, max: number) =>
	min + randomRatio(random) * (max - min);
const randomIndex = (random: () => number, length: number) =>
	Math.min(Math.floor(randomRatio(random) * length), length - 1);

function hexChannel(value: number) {
	return Math.round(clamp(value, 0, 255))
		.toString(16)
		.padStart(2, '0')
		.toUpperCase();
}

function randomVibrantColor(random: () => number) {
	const channelOrder = CHANNEL_ORDERS[randomIndex(random, CHANNEL_ORDERS.length)];
	const channels = [0, 0, 0];

	channels[channelOrder[0]] = randomInRange(random, 210, 255);
	channels[channelOrder[1]] = randomInRange(random, 70, 190);
	channels[channelOrder[2]] = randomInRange(random, 0, 110);

	return `#${channels.map(hexChannel).join('')}`;
}

export function getRandomAgentPersonalisationGradient(
	random: () => number = Math.random,
): AgentPersonalisationGradient {
	const from = randomVibrantColor(random);
	const to = randomVibrantColor(random);

	return {
		from,
		to: to === from ? DEFAULT_AGENT_PERSONALISATION.gradient.to : to,
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
