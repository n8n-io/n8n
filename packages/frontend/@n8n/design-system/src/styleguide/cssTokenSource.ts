/**
 * Colour docs tables read token *names* from the SCSS sources so the styleguide
 * stays in sync with `_primitives.scss` and `_tokens.scss`. Live values still
 * come from computed styles so light/dark updates.
 */

export const PRIMITIVE_SCALE_STEPS = [
	'50',
	'100',
	'150',
	'200',
	'250',
	'300',
	'400',
	'500',
	'600',
	'700',
	'800',
	'900',
	'950',
] as const;

export type PrimitiveScaleStep = (typeof PRIMITIVE_SCALE_STEPS)[number];

export type PrimitiveColorFamily = {
	id: string;
	label: string;
	scale: Partial<Record<PrimitiveScaleStep, string>>;
	extras: Array<{ step: string; token: string }>;
};

const SCALE_STEP_SET = new Set<string>(PRIMITIVE_SCALE_STEPS);

const FAMILY_ORDER = [
	'neutral',
	'red',
	'red-alpha',
	'orange',
	'orange-alpha',
	'yellow',
	'green',
	'green-alpha',
	'mint',
	'blue',
	'purple',
	'purple-alpha',
	'pink',
	'gold',
	'gold-alpha',
	'slate',
	'slate-alpha',
	'white-alpha',
	'black-alpha',
];

const NON_COLOR_TOKEN =
	/--(?:spacing|font-size|font-weight|font-family|line-height|letter-spacing|radius|height|width|duration|easing|padding|margin|shadow|size)(?:--|$)/;

export function extractDefinedCustomProperties(scss: string): string[] {
	const deprecatedIndex = scss.indexOf('/* deprecated */');
	const source = deprecatedIndex === -1 ? scss : scss.slice(0, deprecatedIndex);
	const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '\n').replace(/\/\/.*$/gm, '');

	const names: string[] = [];
	const seen = new Set<string>();

	for (const match of withoutComments.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
		const name = match[1];
		if (name !== undefined && !seen.has(name)) {
			seen.add(name);
			names.push(name);
		}
	}

	return names;
}

export const isColorChannelToken = (name: string) =>
	name.endsWith('--h') || name.endsWith('--s') || name.endsWith('--l');

export const isLikelyColorTokenName = (name: string) => {
	if (isColorChannelToken(name) || NON_COLOR_TOKEN.test(name)) {
		return false;
	}

	return (
		name.includes('color') ||
		name.includes('background') ||
		name.includes('fill') ||
		name.includes('stroke')
	);
};

const humanize = (value: string) =>
	value
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

const splitPrimitiveColorToken = (name: string): { family: string; step: string } | null => {
	if (!name.startsWith('--color--')) {
		return null;
	}

	const rest = name.slice('--color--'.length);
	const lastDash = rest.lastIndexOf('-');
	if (lastDash <= 0) {
		return null;
	}

	return {
		family: rest.slice(0, lastDash),
		step: rest.slice(lastDash + 1),
	};
};

export function getPrimitiveColorFamilies(primitivesSource: string): PrimitiveColorFamily[] {
	const families = new Map<
		string,
		{
			scale: Partial<Record<PrimitiveScaleStep, string>>;
			extras: Array<{ step: string; token: string }>;
		}
	>();

	for (const token of extractDefinedCustomProperties(primitivesSource)) {
		const parts = splitPrimitiveColorToken(token);
		if (!parts) {
			continue;
		}

		const family = families.get(parts.family) ?? { scale: {}, extras: [] };

		if (SCALE_STEP_SET.has(parts.step)) {
			family.scale[parts.step as PrimitiveScaleStep] = token;
		} else if (parts.step !== 'white' && parts.step !== 'black') {
			// Solid white/black sit off the 50–950 columns and throw the grid out of alignment.
			family.extras.push({ step: parts.step, token });
		}

		families.set(parts.family, family);
	}

	return [...families.entries()]
		.map(([id, family]) => ({
			id,
			label: humanize(id),
			scale: family.scale,
			extras: family.extras,
		}))
		.sort((a, b) => {
			const aOrder = FAMILY_ORDER.indexOf(a.id);
			const bOrder = FAMILY_ORDER.indexOf(b.id);

			if (aOrder !== bOrder) {
				if (aOrder === -1) {
					return 1;
				}
				if (bOrder === -1) {
					return -1;
				}
				return aOrder - bOrder;
			}

			return a.id.localeCompare(b.id);
		});
}

export function getSemanticColorTokenNames(tokensSource: string): string[] {
	return extractDefinedCustomProperties(tokensSource).filter(
		(name) => isLikelyColorTokenName(name) && splitPrimitiveColorToken(name) === null,
	);
}
