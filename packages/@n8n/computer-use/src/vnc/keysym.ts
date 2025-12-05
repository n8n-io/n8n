/**
 * X11 keysym mapping for converting xdotool-style key names to keysym codes.
 * Based on X11 keysymdef.h
 */

// X11 keysym constants for special keys
export const KEYSYM = {
	// Modifier keys
	Shift_L: 0xffe1,
	Shift_R: 0xffe2,
	Control_L: 0xffe3,
	Control_R: 0xffe4,
	Caps_Lock: 0xffe5,
	Shift_Lock: 0xffe6,
	Meta_L: 0xffe7,
	Meta_R: 0xffe8,
	Alt_L: 0xffe9,
	Alt_R: 0xffea,
	Super_L: 0xffeb,
	Super_R: 0xffec,
	Hyper_L: 0xffed,
	Hyper_R: 0xffee,

	// Navigation keys
	Home: 0xff50,
	Left: 0xff51,
	Up: 0xff52,
	Right: 0xff53,
	Down: 0xff54,
	Page_Up: 0xff55,
	Page_Down: 0xff56,
	End: 0xff57,
	Begin: 0xff58,

	// TTY function keys
	BackSpace: 0xff08,
	Tab: 0xff09,
	Linefeed: 0xff0a,
	Clear: 0xff0b,
	Return: 0xff0d,
	Pause: 0xff13,
	Scroll_Lock: 0xff14,
	Sys_Req: 0xff15,
	Escape: 0xff1b,
	Delete: 0xffff,

	// Misc function keys
	Select: 0xff60,
	Print: 0xff61,
	Execute: 0xff62,
	Insert: 0xff63,
	Undo: 0xff65,
	Redo: 0xff66,
	Menu: 0xff67,
	Find: 0xff68,
	Cancel: 0xff69,
	Help: 0xff6a,
	Break: 0xff6b,
	Num_Lock: 0xff7f,

	// Keypad
	KP_Space: 0xff80,
	KP_Tab: 0xff89,
	KP_Enter: 0xff8d,
	KP_F1: 0xff91,
	KP_F2: 0xff92,
	KP_F3: 0xff93,
	KP_F4: 0xff94,
	KP_Home: 0xff95,
	KP_Left: 0xff96,
	KP_Up: 0xff97,
	KP_Right: 0xff98,
	KP_Down: 0xff99,
	KP_Page_Up: 0xff9a,
	KP_Page_Down: 0xff9b,
	KP_End: 0xff9c,
	KP_Begin: 0xff9d,
	KP_Insert: 0xff9e,
	KP_Delete: 0xff9f,
	KP_Equal: 0xffbd,
	KP_Multiply: 0xffaa,
	KP_Add: 0xffab,
	KP_Separator: 0xffac,
	KP_Subtract: 0xffad,
	KP_Decimal: 0xffae,
	KP_Divide: 0xffaf,
	KP_0: 0xffb0,
	KP_1: 0xffb1,
	KP_2: 0xffb2,
	KP_3: 0xffb3,
	KP_4: 0xffb4,
	KP_5: 0xffb5,
	KP_6: 0xffb6,
	KP_7: 0xffb7,
	KP_8: 0xffb8,
	KP_9: 0xffb9,

	// Function keys
	F1: 0xffbe,
	F2: 0xffbf,
	F3: 0xffc0,
	F4: 0xffc1,
	F5: 0xffc2,
	F6: 0xffc3,
	F7: 0xffc4,
	F8: 0xffc5,
	F9: 0xffc6,
	F10: 0xffc7,
	F11: 0xffc8,
	F12: 0xffc9,
	F13: 0xffca,
	F14: 0xffcb,
	F15: 0xffcc,
	F16: 0xffcd,
	F17: 0xffce,
	F18: 0xffcf,
	F19: 0xffd0,
	F20: 0xffd1,
	F21: 0xffd2,
	F22: 0xffd3,
	F23: 0xffd4,
	F24: 0xffd5,

	// Latin-1 special characters (commonly used)
	space: 0x0020,
	exclam: 0x0021,
	quotedbl: 0x0022,
	numbersign: 0x0023,
	dollar: 0x0024,
	percent: 0x0025,
	ampersand: 0x0026,
	apostrophe: 0x0027,
	parenleft: 0x0028,
	parenright: 0x0029,
	asterisk: 0x002a,
	plus: 0x002b,
	comma: 0x002c,
	minus: 0x002d,
	period: 0x002e,
	slash: 0x002f,
	colon: 0x003a,
	semicolon: 0x003b,
	less: 0x003c,
	equal: 0x003d,
	greater: 0x003e,
	question: 0x003f,
	at: 0x0040,
	bracketleft: 0x005b,
	backslash: 0x005c,
	bracketright: 0x005d,
	asciicircum: 0x005e,
	underscore: 0x005f,
	grave: 0x0060,
	braceleft: 0x007b,
	bar: 0x007c,
	braceright: 0x007d,
	asciitilde: 0x007e,
} as const;

// xdotool key name aliases (case-insensitive lookup)
const XDOTOOL_ALIASES: Readonly<Record<string, number>> = {
	// Common aliases
	return: KEYSYM.Return,
	enter: KEYSYM.Return,
	backspace: KEYSYM.BackSpace,
	tab: KEYSYM.Tab,
	escape: KEYSYM.Escape,
	esc: KEYSYM.Escape,
	delete: KEYSYM.Delete,
	del: KEYSYM.Delete,
	insert: KEYSYM.Insert,
	ins: KEYSYM.Insert,
	home: KEYSYM.Home,
	end: KEYSYM.End,
	pageup: KEYSYM.Page_Up,
	page_up: KEYSYM.Page_Up,
	prior: KEYSYM.Page_Up,
	pagedown: KEYSYM.Page_Down,
	page_down: KEYSYM.Page_Down,
	next: KEYSYM.Page_Down,
	left: KEYSYM.Left,
	right: KEYSYM.Right,
	up: KEYSYM.Up,
	down: KEYSYM.Down,
	print: KEYSYM.Print,
	print_screen: KEYSYM.Print,
	scroll_lock: KEYSYM.Scroll_Lock,
	scrolllock: KEYSYM.Scroll_Lock,
	pause: KEYSYM.Pause,
	break: KEYSYM.Break,
	num_lock: KEYSYM.Num_Lock,
	numlock: KEYSYM.Num_Lock,
	caps_lock: KEYSYM.Caps_Lock,
	capslock: KEYSYM.Caps_Lock,
	menu: KEYSYM.Menu,

	// Modifier aliases
	shift: KEYSYM.Shift_L,
	shift_l: KEYSYM.Shift_L,
	shift_r: KEYSYM.Shift_R,
	ctrl: KEYSYM.Control_L,
	control: KEYSYM.Control_L,
	control_l: KEYSYM.Control_L,
	control_r: KEYSYM.Control_R,
	alt: KEYSYM.Alt_L,
	alt_l: KEYSYM.Alt_L,
	alt_r: KEYSYM.Alt_R,
	meta: KEYSYM.Meta_L,
	meta_l: KEYSYM.Meta_L,
	meta_r: KEYSYM.Meta_R,
	super: KEYSYM.Super_L,
	super_l: KEYSYM.Super_L,
	super_r: KEYSYM.Super_R,
	hyper: KEYSYM.Hyper_L,
	hyper_l: KEYSYM.Hyper_L,
	hyper_r: KEYSYM.Hyper_R,

	// Function keys (lowercase)
	f1: KEYSYM.F1,
	f2: KEYSYM.F2,
	f3: KEYSYM.F3,
	f4: KEYSYM.F4,
	f5: KEYSYM.F5,
	f6: KEYSYM.F6,
	f7: KEYSYM.F7,
	f8: KEYSYM.F8,
	f9: KEYSYM.F9,
	f10: KEYSYM.F10,
	f11: KEYSYM.F11,
	f12: KEYSYM.F12,
	f13: KEYSYM.F13,
	f14: KEYSYM.F14,
	f15: KEYSYM.F15,
	f16: KEYSYM.F16,
	f17: KEYSYM.F17,
	f18: KEYSYM.F18,
	f19: KEYSYM.F19,
	f20: KEYSYM.F20,
	f21: KEYSYM.F21,
	f22: KEYSYM.F22,
	f23: KEYSYM.F23,
	f24: KEYSYM.F24,

	// Keypad
	kp_enter: KEYSYM.KP_Enter,
	kp_0: KEYSYM.KP_0,
	kp_1: KEYSYM.KP_1,
	kp_2: KEYSYM.KP_2,
	kp_3: KEYSYM.KP_3,
	kp_4: KEYSYM.KP_4,
	kp_5: KEYSYM.KP_5,
	kp_6: KEYSYM.KP_6,
	kp_7: KEYSYM.KP_7,
	kp_8: KEYSYM.KP_8,
	kp_9: KEYSYM.KP_9,
	kp_add: KEYSYM.KP_Add,
	kp_subtract: KEYSYM.KP_Subtract,
	kp_multiply: KEYSYM.KP_Multiply,
	kp_divide: KEYSYM.KP_Divide,
	kp_decimal: KEYSYM.KP_Decimal,

	// Common symbol names
	space: KEYSYM.space,
};

// Direct KEYSYM lookup map (for case-sensitive names like "Return", "BackSpace")
const KEYSYM_MAP: Readonly<Record<string, number>> = Object.entries(KEYSYM).reduce(
	(acc, [key, value]) => {
		acc[key] = value;
		acc[key.toLowerCase()] = value;
		return acc;
	},
	{} as Record<string, number>,
);

/**
 * Result of parsing a key specification
 */
export interface ParsedKey {
	/** The keysym code for the main key */
	readonly keysym: number;
	/** Modifier keysyms that should be held during the key press */
	readonly modifiers: readonly number[];
}

/**
 * Convert a single character to its keysym code.
 * ASCII printable characters (0x20-0x7E) map directly.
 * Unicode characters above 0xFF use the formula: 0x01000000 + codepoint
 */
export function charToKeysym(char: string): number {
	if (char.length !== 1) {
		throw new Error(`Expected single character, got "${char}"`);
	}

	const code = char.charCodeAt(0);

	// ASCII printable range maps directly to keysym
	if (code >= 0x20 && code <= 0x7e) {
		return code;
	}

	// Latin-1 supplement (0x80-0xFF) maps directly
	if (code >= 0x80 && code <= 0xff) {
		return code;
	}

	// Unicode keysym: 0x01000000 + Unicode codepoint
	return 0x01000000 + code;
}

/**
 * Convert a key name (like "Return", "BackSpace", "a", "F1") to its keysym code.
 * Case-insensitive for named keys.
 */
export function keyNameToKeysym(name: string): number {
	// Check xdotool aliases first (case-insensitive)
	const aliasKey = name.toLowerCase();
	const aliasValue = XDOTOOL_ALIASES[aliasKey];
	if (aliasValue !== undefined) {
		return aliasValue;
	}

	// Check direct KEYSYM map (handles both cases)
	const keysymValue = KEYSYM_MAP[name];
	if (keysymValue !== undefined) {
		return keysymValue;
	}

	// Single character - use character conversion
	if (name.length === 1) {
		return charToKeysym(name);
	}

	throw new Error(`Unknown key name: "${name}"`);
}

/**
 * Check if a key name is a modifier key
 */
function isModifierName(name: string): boolean {
	const lower = name.toLowerCase();
	return (
		lower === 'ctrl' ||
		lower === 'control' ||
		lower === 'shift' ||
		lower === 'alt' ||
		lower === 'meta' ||
		lower === 'super' ||
		lower === 'hyper'
	);
}

/**
 * Get the keysym for a modifier name
 */
function getModifierKeysym(name: string): number {
	const lower = name.toLowerCase();
	switch (lower) {
		case 'ctrl':
		case 'control':
			return KEYSYM.Control_L;
		case 'shift':
			return KEYSYM.Shift_L;
		case 'alt':
			return KEYSYM.Alt_L;
		case 'meta':
			return KEYSYM.Meta_L;
		case 'super':
			return KEYSYM.Super_L;
		case 'hyper':
			return KEYSYM.Hyper_L;
		default:
			throw new Error(`Unknown modifier: "${name}"`);
	}
}

/**
 * Parse an xdotool-style key specification like "ctrl+shift+a" or "Return".
 * Returns the main keysym and any modifier keysyms.
 */
export function parseKeySpec(keySpec: string): ParsedKey {
	const parts = keySpec.split('+');

	if (parts.length === 0) {
		throw new Error('Empty key specification');
	}

	const modifiers: number[] = [];
	let mainKey: string | undefined;

	for (const part of parts) {
		const trimmed = part.trim();
		if (trimmed.length === 0) {
			continue;
		}

		if (isModifierName(trimmed) && mainKey === undefined) {
			// This is a modifier
			modifiers.push(getModifierKeysym(trimmed));
		} else {
			// This is the main key
			if (mainKey !== undefined) {
				// If we already have a main key, treat this as another key combination
				// For xdotool compatibility, "a+b" means press a, then b
				// But for simplicity, we'll treat the last non-modifier as the main key
				modifiers.push(keyNameToKeysym(mainKey));
			}
			mainKey = trimmed;
		}
	}

	if (mainKey === undefined) {
		// All parts were modifiers - use the last modifier as the main key
		if (modifiers.length > 0) {
			const lastModifier = modifiers.pop();
			if (lastModifier !== undefined) {
				return {
					keysym: lastModifier,
					modifiers,
				};
			}
		}
		throw new Error(`No key found in specification: "${keySpec}"`);
	}

	return {
		keysym: keyNameToKeysym(mainKey),
		modifiers,
	};
}

/**
 * Convert a string of text to a sequence of keysyms for typing.
 * Each character becomes a keysym.
 */
export function textToKeysyms(text: string): readonly number[] {
	const keysyms: number[] = [];
	for (const char of text) {
		keysyms.push(charToKeysym(char));
	}
	return keysyms;
}
