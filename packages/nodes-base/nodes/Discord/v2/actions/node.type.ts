import type { AllEntities, Entity } from 'n8n-workflow';

type DiscordMap = {
	channel: 'getAll' | 'create' | 'update' | 'deleteChannel';
	message: 'deleteMessage' | 'getAll' | 'get' | 'react' | 'send';
	member: 'getAll' | 'roleAdd' | 'roleRemove';
	webhook: 'sendLegacy';
};

export type Discord = AllEntities<DiscordMap>;

export type DiscordChannel = Entity<DiscordMap, 'channel'>;
export type DiscordMessage = Entity<DiscordMap, 'message'>;
export type DiscordMember = Entity<DiscordMap, 'member'>;
export type DiscordWebhook = Entity<DiscordMap, 'webhook'>;
