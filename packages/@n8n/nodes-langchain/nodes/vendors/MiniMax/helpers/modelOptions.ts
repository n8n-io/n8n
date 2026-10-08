import type { INodePropertyOptions } from 'n8n-workflow';

const modelOptionsV1: INodePropertyOptions[] = [
	{ name: 'MiniMax-M2', value: 'MiniMax-M2' },
	{ name: 'MiniMax-M2.1', value: 'MiniMax-M2.1' },
	{ name: 'MiniMax-M2.1-Highspeed', value: 'MiniMax-M2.1-highspeed' },
	{ name: 'MiniMax-M2.5', value: 'MiniMax-M2.5' },
	{ name: 'MiniMax-M2.5-Highspeed', value: 'MiniMax-M2.5-highspeed' },
	{ name: 'MiniMax-M2.7', value: 'MiniMax-M2.7' },
	{ name: 'MiniMax-M2.7-Highspeed', value: 'MiniMax-M2.7-highspeed' },
];

export const minimaxTextModelOptions = {
	v1: modelOptionsV1,
	v1_1: [...modelOptionsV1, { name: 'MiniMax-M3', value: 'MiniMax-M3' }],
} satisfies Record<'v1' | 'v1_1', INodePropertyOptions[]>;
