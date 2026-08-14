import { z } from 'zod';

export const emphasisValues = ['hero', 'primary', 'secondary', 'muted'] as const;
export const densityValues = ['compact', 'comfortable', 'immersive'] as const;
export const toneValues = ['neutral', 'positive', 'attention', 'active'] as const;
export const orientationValues = ['vertical', 'horizontal'] as const;
export const disclosureValues = ['summary', 'expandable', 'full'] as const;
export const motionValues = ['none', 'pulse', 'flow', 'transfer', 'progress'] as const;
export const variantValues = ['monitoring', 'recovery', 'messaging'] as const;

export const accentValues = [
	'--color--primary',
	'--color--secondary',
	'--color--success',
	'--color--warning',
	'--color--danger',
	'--color--text',
	'--color--info',
] as const;

export const surfaceValues = [
	'--color--background',
	'--color--background--light-1',
	'--color--background--light-2',
	'--color--background--light-3',
	'--color--background--shade-1',
	'--color--background--shade-2',
] as const;

export const radiusValues = [
	'--radius--2xs',
	'--radius--xs',
	'--radius--sm',
	'--radius--md',
	'--radius--lg',
	'--radius--xl',
	'--radius--full',
] as const;

export const padValues = [
	'--spacing--2xs',
	'--spacing--xs',
	'--spacing--sm',
	'--spacing--md',
	'--spacing--lg',
	'--spacing--xl',
	'--spacing--2xl',
] as const;

export const visualPropsSchema = z.object({
	emphasis: z.enum(emphasisValues).optional(),
	density: z.enum(densityValues).optional(),
	tone: z.enum(toneValues).optional(),
	orientation: z.enum(orientationValues).optional(),
	disclosure: z.enum(disclosureValues).optional(),
	motion: z.enum(motionValues).optional(),
	variant: z.enum(variantValues).optional(),
	accent: z.enum(accentValues).optional(),
	surface: z.enum(surfaceValues).optional(),
	radius: z.enum(radiusValues).optional(),
	pad: z.enum(padValues).optional(),
});

export type VisualProps = {
	emphasis?: (typeof emphasisValues)[number];
	density?: (typeof densityValues)[number];
	tone?: (typeof toneValues)[number];
	orientation?: (typeof orientationValues)[number];
	disclosure?: (typeof disclosureValues)[number];
	motion?: (typeof motionValues)[number];
	variant?: (typeof variantValues)[number];
	accent?: (typeof accentValues)[number];
	surface?: (typeof surfaceValues)[number];
	radius?: (typeof radiusValues)[number];
	pad?: (typeof padValues)[number];
};

const accentMap: Record<(typeof accentValues)[number], string> = {
	'--color--primary': 'var(--color--primary)',
	'--color--secondary': 'var(--color--secondary)',
	'--color--success': 'var(--color--success)',
	'--color--warning': 'var(--color--warning)',
	'--color--danger': 'var(--color--danger)',
	'--color--text': 'var(--color--text)',
	'--color--info': 'var(--color--info)',
};

const surfaceMap: Record<(typeof surfaceValues)[number], string> = {
	'--color--background': 'var(--color--background)',
	'--color--background--light-1': 'var(--color--background--light-1)',
	'--color--background--light-2': 'var(--color--background--light-2)',
	'--color--background--light-3': 'var(--color--background--light-3)',
	'--color--background--shade-1': 'var(--color--background--shade-1)',
	'--color--background--shade-2': 'var(--color--background--shade-2)',
};

const radiusMap: Record<(typeof radiusValues)[number], string> = {
	'--radius--2xs': 'var(--radius--2xs)',
	'--radius--xs': 'var(--radius--xs)',
	'--radius--sm': 'var(--radius--sm)',
	'--radius--md': 'var(--radius--md)',
	'--radius--lg': 'var(--radius--lg)',
	'--radius--xl': 'var(--radius--xl)',
	'--radius--full': 'var(--radius--full)',
};

const padMap: Record<(typeof padValues)[number], string> = {
	'--spacing--2xs': 'var(--spacing--2xs)',
	'--spacing--xs': 'var(--spacing--xs)',
	'--spacing--sm': 'var(--spacing--sm)',
	'--spacing--md': 'var(--spacing--md)',
	'--spacing--lg': 'var(--spacing--lg)',
	'--spacing--xl': 'var(--spacing--xl)',
	'--spacing--2xl': 'var(--spacing--2xl)',
};

export function visualStyle(props: VisualProps): Record<string, string> {
	const style: Record<string, string> = {};
	if (props.accent) style['--generative-accent'] = accentMap[props.accent];
	if (props.surface) style['--generative-surface'] = surfaceMap[props.surface];
	if (props.radius) style['--generative-radius'] = radiusMap[props.radius];
	if (props.pad) style['--generative-pad'] = padMap[props.pad];
	return style;
}

export function withVisualProps<T extends z.ZodRawShape>(shape: T) {
	return z.object(shape).merge(visualPropsSchema);
}
