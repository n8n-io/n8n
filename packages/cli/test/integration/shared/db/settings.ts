import type { Settings } from '@/databases/entities/Settings';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import Container from 'typedi';

const getRepo = () => Container.get(SettingsRepository);

export async function createSettings(attributes: Settings) {
	const settingsEntity = getRepo().create(attributes);
	const settings = await getRepo().save(settingsEntity);

	return settings;
}

export async function getSettingsByKey(key: string) {
	return await getRepo().findOneBy({ key });
}
