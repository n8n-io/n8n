import type {
	Gender,
	GroupKey,
	Locale,
	PermutationOptions,
	Presentation,
	Qualifier,
	SkinTone,
	SkinToneKey,
} from './types';

export const SEQUENCE_REMOVAL_PATTERN = /200D|FE0E|FE0F/g;

// Use numbers instead of string values, as the filesize is greatly reduced.

export const TEXT: Presentation = 0;
export const EMOJI: Presentation = 1;

export const FEMALE: Gender = 0;
export const MALE: Gender = 1;

export const FULLY_QUALIFIED: Qualifier = 0;
export const MINIMALLY_QUALIFIED: Qualifier = 1;
export const UNQUALIFIED: Qualifier = 2;

export const LIGHT_SKIN: SkinTone = 1;
export const MEDIUM_LIGHT_SKIN: SkinTone = 2;
export const MEDIUM_SKIN: SkinTone = 3;
export const MEDIUM_DARK_SKIN: SkinTone = 4;
export const DARK_SKIN: SkinTone = 5;

export const GROUP_KEY_SMILEYS_EMOTION: GroupKey = 'smileys-emotion';
export const GROUP_KEY_PEOPLE_BODY: GroupKey = 'people-body';
export const GROUP_KEY_ANIMALS_NATURE: GroupKey = 'animals-nature';
export const GROUP_KEY_FOOD_DRINK: GroupKey = 'food-drink';
export const GROUP_KEY_TRAVEL_PLACES: GroupKey = 'travel-places';
export const GROUP_KEY_ACTIVITIES: GroupKey = 'activities';
export const GROUP_KEY_OBJECTS: GroupKey = 'objects';
export const GROUP_KEY_SYMBOLS: GroupKey = 'symbols';
export const GROUP_KEY_FLAGS: GroupKey = 'flags';
export const GROUP_KEY_COMPONENT: GroupKey = 'component';

export const SKIN_KEY_LIGHT: SkinToneKey = 'light';
export const SKIN_KEY_MEDIUM_LIGHT: SkinToneKey = 'medium-light';
export const SKIN_KEY_MEDIUM: SkinToneKey = 'medium';
export const SKIN_KEY_MEDIUM_DARK: SkinToneKey = 'medium-dark';
export const SKIN_KEY_DARK: SkinToneKey = 'dark';

// Important release versions and locales in generating accurate data.

export const LATEST_EMOJI_VERSION = '17.0';
export const LATEST_UNICODE_VERSION = '17.0.0';
export const LATEST_CLDR_VERSION = '48';

export const FIRST_UNICODE_EMOJI_VERSION = '6.0.0';
export const EMOJI_VERSIONS = [
	'1.0',
	'2.0',
	'3.0',
	'4.0',
	'5.0',
	'11.0',
	'12.0',
	'12.1',
	'13.0',
	'13.1',
	'14.0',
	'15.0',
	'15.1',
	'16.0',
	'17.0',
];
export const UNICODE_VERSIONS = [
	'6.0',
	'6.1',
	'6.2',
	'6.3',
	'7.0',
	'8.0',
	'9.0',
	'10.0',
	'11.0',
	'12.0',
	'12.1',
	'13.0',
	'14.0',
	'15.0',
	'15.1',
	'16.0',
	'17.0',
];

export const SUPPORTED_LOCALES: Locale[] = [
	'bn', // Bangla
	'da', // Danish
	'de', // German
	'en', // English
	'en-gb', // English (Great Britain)
	'es', // Spanish
	'es-mx', // Spanish (Mexico)
	'et', // Estonian
	'fi', // Finnish
	'fr', // French
	'hi', // Hindi
	'hu', // Hungarian
	'it', // Italian
	'ja', // Japanese
	'ko', // Korean
	'lt', // Lithuanian
	'ms', // Malay
	'nb', // Norwegian
	'nl', // Dutch
	'pl', // Polish
	'pt', // Portuguese
	'ru', // Russian
	'sv', // Swedish
	'th', // Thai
	'uk', // Ukrainian
	'vi', // Vietnamese
	'zh', // Chinese
	'zh-hant', // Chinese (Traditional)
];

// Special options for emoticon permutations.

export const EMOTICON_OPTIONS: Record<string, PermutationOptions> = {
	// 🧙‍♂️ man mage
	':{>': { withNose: false },
	// 💔 broken heart
	'</3': { isFace: false },
	// ❤️ red heart
	'<3': { isFace: false },
	// 🤘 sign of the horns
	'\\m/': { isFace: false },
	'\\M/': { isFace: false },
	// 👹 ogre
	'0)': { withNose: false },
};
