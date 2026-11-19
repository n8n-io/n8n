import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { ChatAppearanceSchema, type ChatAppearance } from './webhook-channel.service';

export interface ChatTheme {
	id: string;
	name: string;
	appearance: ChatAppearance;
	updatedAt: string;
}

const THEMES_KEY = 'agentChatThemes';
export const ChatThemeInputSchema = z.object({
	name: z.string().trim().min(1).max(60),
	appearance: ChatAppearanceSchema,
});

/**
 * SPIKE (agent-chat-embed): named chat themes for the whole instance. A chat surface
 * can reference one by `themeId`; a change to the theme then applies to every chat
 * that uses it.
 * ponytail: one JSON row in the settings table, read-modify-write. The product needs
 * a table (id, name, appearance, timestamps, created by) and its own permission scope.
 */
@Service()
export class ChatThemeService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async list(): Promise<ChatTheme[]> {
		const row = await this.settingsRepository.findByKey(THEMES_KEY);
		return row ? (JSON.parse(row.value) as ChatTheme[]) : [];
	}

	async find(id: string | null | undefined) {
		return id ? (await this.list()).find((theme) => theme.id === id) : undefined;
	}

	async create(input: z.infer<typeof ChatThemeInputSchema>) {
		const theme: ChatTheme = { id: randomUUID(), ...input, updatedAt: new Date().toISOString() };
		await this.save([...(await this.list()), theme]);
		return theme;
	}

	async update(id: string, change: Partial<z.infer<typeof ChatThemeInputSchema>>) {
		const themes = await this.list();
		const theme = themes.find((entry) => entry.id === id);
		if (!theme) return undefined;
		Object.assign(theme, change, { updatedAt: new Date().toISOString() });
		await this.save(themes);
		return theme;
	}

	async delete(id: string) {
		await this.save((await this.list()).filter((theme) => theme.id !== id));
	}

	/** Chat surfaces (agent × channel) whose settings reference each theme. */
	async usage(): Promise<Record<string, number>> {
		const counts: Record<string, number> = {};
		for (const row of await this.settingsRepository.findByKeyPrefix('agentChatSurface.')) {
			const themeId = (JSON.parse(row.value) as { themeId?: string | null }).themeId;
			if (themeId) counts[themeId] = (counts[themeId] ?? 0) + 1;
		}
		return counts;
	}

	private async save(themes: ChatTheme[]) {
		await this.settingsRepository.upsertByKey(THEMES_KEY, JSON.stringify(themes), false, {});
	}
}
