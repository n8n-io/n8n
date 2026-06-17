import { type IconName } from '../N8nIcon/icons';

export type IconOrEmoji =
	| {
			type: 'icon';
			/** Icon name — can be a registered IconName or any Lucide icon name */
			value: IconName | (string & {});
			/** Optional CSS variable name for icon color (e.g. '--node--icon--color--blue') */
			color?: string;
	  }
	| {
			type: 'emoji';
			/** Emoji unicode character (may include skin tone modifier) */
			value: string;
	  };

export function isIconOrEmoji(icon: unknown): icon is IconOrEmoji {
	return (
		typeof icon === 'object' &&
		icon !== null &&
		'type' in icon &&
		(icon.type === 'icon' || icon.type === 'emoji') &&
		'value' in icon &&
		typeof icon.value === 'string'
	);
}
