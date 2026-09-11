import { Service } from '@n8n/di';
import { randomUUID } from 'crypto';

import { CacheService } from '@/services/cache/cache.service';

const SESSION_KEY_PREFIX = 'agents:twilio-voice-session';
const SESSION_TTL_MS = 60_000;

export interface TwilioVoiceSessionTicket {
	agentId: string;
	credentialId: string;
	accountSid: string;
	callSid: string;
	from: string;
	to: string;
}

@Service()
export class TwilioVoiceSessionStore {
	constructor(private readonly cache: CacheService) {}

	async create(ticket: TwilioVoiceSessionTicket): Promise<string> {
		const id = randomUUID();
		await this.cache.set(this.key(id), ticket, SESSION_TTL_MS);
		return id;
	}

	async get(id: string): Promise<TwilioVoiceSessionTicket | undefined> {
		return await this.cache.get<TwilioVoiceSessionTicket>(this.key(id));
	}

	async take(id: string): Promise<TwilioVoiceSessionTicket | undefined> {
		return await this.cache.take<TwilioVoiceSessionTicket>(this.key(id));
	}

	private key(id: string): string {
		return `${SESSION_KEY_PREFIX}:${id}`;
	}
}
