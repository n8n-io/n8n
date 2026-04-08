import { type IconName } from '../N8nIcon/icons';

export type IconOrEmoji =
	| {
			type: 'icon';
			value: IconName;
	  }
	| {
			type: 'emoji';
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
