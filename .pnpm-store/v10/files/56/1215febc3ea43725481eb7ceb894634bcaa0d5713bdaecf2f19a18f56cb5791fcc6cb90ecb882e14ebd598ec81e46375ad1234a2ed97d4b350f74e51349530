export type CodePoint = number;

export type Emoticon = string;

export type Gender = 0 | 1;

export type GenderKey = 'female' | 'male';

export type Group = number;

export type GroupKey =
	| 'activities'
	| 'animals-nature'
	| 'component'
	| 'flags'
	| 'food-drink'
	| 'objects'
	| 'people-body'
	| 'smileys-emotion'
	| 'symbols'
	| 'travel-places';

export type Hexcode = string;

export type Presentation = 0 | 1;

export type PresentationKey = 'emoji' | 'text';

export type Qualifier = 0 | 1 | 2;

export type Shortcode = string;

export type ShortcodePreset =
	| 'cldr-native'
	| 'cldr'
	| 'discord'
	| 'emojibase-legacy'
	| 'emojibase-native'
	| 'emojibase'
	| 'github'
	| 'iamcal'
	| 'joypixels'
	| 'slack';

export type LocalizedShortcodePreset = `${Locale}/${ShortcodePreset}`;

export type SkinTone = 1 | 2 | 3 | 4 | 5;

export type SkinToneKey = 'dark' | 'light' | 'medium-dark' | 'medium-light' | 'medium';

export type Subgroup = number;

export type SubgroupKey =
	| 'alphanum'
	| 'animal-amphibian'
	| 'animal-bird'
	| 'animal-bug'
	| 'animal-mammal'
	| 'animal-marine'
	| 'animal-reptile'
	| 'arrow'
	| 'arts-crafts'
	| 'av-symbol'
	| 'award-medal'
	| 'body-parts'
	| 'book-paper'
	| 'cat-face'
	| 'clothing'
	| 'computer'
	| 'country-flag'
	| 'currency'
	| 'dishware'
	| 'drink'
	| 'emotion'
	| 'event'
	| 'face-affection'
	| 'face-concerned'
	| 'face-costume'
	| 'face-glasses'
	| 'face-hand'
	| 'face-hat'
	| 'face-negative'
	| 'face-neutral-skeptical'
	| 'face-sleepy'
	| 'face-smiling'
	| 'face-tongue'
	| 'face-unwell'
	| 'family'
	| 'flag'
	| 'food-asian'
	| 'food-fruit'
	| 'food-prepared'
	| 'food-sweet'
	| 'food-vegetable'
	| 'game'
	| 'gender'
	| 'geometric'
	| 'hair-style'
	| 'hand-fingers-closed'
	| 'hand-fingers-open'
	| 'hand-fingers-partial'
	| 'hand-prop'
	| 'hand-single-finger'
	| 'hands'
	| 'heart'
	| 'hotel'
	| 'household'
	| 'keycap'
	| 'light-video'
	| 'lock'
	| 'mail'
	| 'math'
	| 'medical'
	| 'money'
	| 'monkey-face'
	| 'music'
	| 'musical-instrument'
	| 'office'
	| 'other-object'
	| 'other-symbol'
	| 'person-activity'
	| 'person-fantasy'
	| 'person-gesture'
	| 'person-resting'
	| 'person-role'
	| 'person-sport'
	| 'person-symbol'
	| 'person'
	| 'phone'
	| 'place-building'
	| 'place-geographic'
	| 'place-map'
	| 'place-other'
	| 'place-religious'
	| 'plant-flower'
	| 'plant-other'
	| 'punctuation'
	| 'religion'
	| 'science'
	| 'skin-tone'
	| 'sky-weather'
	| 'sound'
	| 'sport'
	| 'subdivision-flag'
	| 'time'
	| 'tool'
	| 'transport-air'
	| 'transport-ground'
	| 'transport-sign'
	| 'transport-water'
	| 'warning'
	| 'writing'
	| 'zodiac';

export type Unicode = string;

export interface CompactEmoji
	extends Pick<
		Emoji,
		'emoticon' | 'group' | 'hexcode' | 'label' | 'order' | 'shortcodes' | 'tags'
	> {
	/** List of skin tones as emoji objects. */
	skins?: CompactEmoji[];
	/** Either the emoji or text presentation Unicode character. */
	unicode: Unicode;
}

export type FlatCompactEmoji = Omit<CompactEmoji, 'skins'>;

export interface Emoji {
	/** Emoji presentation unicode character. */
	emoji: Unicode;
	/** If applicable, an emoticon representing the emoji character. */
	emoticon?: Emoticon | Emoticon[];
	/** If applicable, the gender of the emoji character. `0` for female, `1` for male. */
	gender?: Gender;
	/** The categorical group the emoji belongs to. Undefined for uncategorized emojis. */
	group?: Group;
	/**
	 * The hexadecimal representation of the emoji Unicode codepoint. If the emoji supports both
	 * emoji and text variations, the hexcode will not include the variation selector. If a
	 * multi-person, multi-gender, or skin tone variation, the hexcode will include zero width
	 * joiners and variation selectors.
	 */
	hexcode: Hexcode;
	/** A localized description, provided by CLDR, primarily used for text-to-speech (TTS) and accessibility. */
	label: string;
	/** The order in which emoji should be displayed on a device, through a keyboard or emoji picker. Undefined for unordered emojis. */
	order?: number;
	/** List of shortcodes without surrounding colons. */
	shortcodes?: Shortcode[];
	/** If applicable, an array of emoji objects for each skin tone modification, starting at light skin, and ending with dark skin. Also includes multi-skin tones. */
	skins?: Emoji[];
	/** The categorical subgroup the emoji belongs to. Undefined for uncategorized emojis. */
	subgroup?: Subgroup;
	/** An array of localized keywords, provided by CLDR, to use for searching and filtering. */
	tags?: string[];
	/** Text presentation unicode character. */
	text: Unicode;
	/**
	 * If applicable, the skin tone of the emoji character. `1` for light skin, `2` for medium-light
	 * skin, `3` for medium skin, `4` for medium-dark skin, and 5 for dark skin. Multi-person skin
	 * tones will be an array of values.
	 */
	tone?: SkinTone | SkinTone[];
	/** The default presentation of the emoji character. `0` for text, `1` for emoji. */
	type: Presentation;
	/** Version the emoji was added. */
	version: number;
}

export type FlatEmoji = Omit<Emoji, 'skins'>;

export interface EmojiLike {
	hexcode: string;
	shortcodes?: string[];
	skins?: EmojiLike[];
}

export interface GroupDataset {
	groups: Record<string, string>;
	subgroups: Record<string, string>;
	hierarchy: Record<string, number[]>;
}

export type VersionDataset = Record<string, string[]>;

export type ShortcodesDataset = Record<Hexcode, string[] | string>;

export type HexcodesDataset = Record<Hexcode, Record<Hexcode, Qualifier>>;

export interface SkinToneMessage {
	key: SkinToneKey;
	message: string;
}

export interface GroupMessage {
	key: GroupKey;
	message: string;
	order: number;
}

export interface SubgroupMessage {
	key: SubgroupKey;
	message: string;
	order: number;
}

export interface MessagesDataset {
	groups: GroupMessage[];
	skinTones: SkinToneMessage[];
	subgroups: SubgroupMessage[];
}

export type Locale =
	| 'bn'
	| 'da'
	| 'de'
	| 'en-gb'
	| 'en'
	| 'es-mx'
	| 'es'
	| 'et'
	| 'fi'
	| 'fr'
	| 'hi'
	| 'hu'
	| 'it'
	| 'ja'
	| 'ko'
	| 'lt'
	| 'ms'
	| 'nb'
	| 'nl'
	| 'pl'
	| 'pt'
	| 'ru'
	| 'sv'
	| 'th'
	| 'uk'
	| 'vi'
	| 'zh-hant'
	| 'zh';

// OPTIONS

export interface PermutationOptions {
	isFace?: boolean;
	withNose?: boolean;
}

export type CDNUrlFn = (path: string, version: string) => string;

export interface FetchFromCDNOptions extends RequestInit {
	/** Cache the response in local storage instead of session storage. Defaults to `false`. */
	local?: boolean;
	/** The release version to fetch. Defaults to `latest`. */
	version?: string;
	/** The url from which to load the JSON files */
	cdnUrl?: CDNUrlFn | string;
}

export interface FetchEmojisOptions extends FetchFromCDNOptions {
	/** List of shortcode presets to load and merge into the emojis dataset. Defaults to an empty list. */
	shortcodes?: (LocalizedShortcodePreset | ShortcodePreset)[];
}

export interface FetchEmojisExpandedOptions extends FetchEmojisOptions {
	/** Load the compact dataset instead of the full dataset. Defaults to `false`. */
	compact?: boolean;
	/** Flatten the dataset (moving skin tones to the root). Defaults to `false`. */
	flat?: boolean;
}
