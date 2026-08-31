import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	extractDefinedCustomProperties,
	getPrimitiveColorFamilies,
	getSemanticColorTokenNames,
} from './cssTokenSource';

const cssDir = resolve(dirname(fileURLToPath(import.meta.url)), '../css');
const primitivesSource = readFileSync(resolve(cssDir, '_primitives.scss'), 'utf8');
const tokensSource = readFileSync(resolve(cssDir, '_tokens.scss'), 'utf8');

describe('cssTokenSource', () => {
	describe('getPrimitiveColorFamilies', () => {
		const families = getPrimitiveColorFamilies(primitivesSource);
		const familyIds = families.map((family) => family.id);

		it('includes every current primitive hue, including gold, slate, and alpha scales', () => {
			expect(familyIds).toEqual(
				expect.arrayContaining([
					'neutral',
					'red',
					'orange',
					'orange-alpha',
					'yellow',
					'green',
					'mint',
					'blue',
					'purple',
					'pink',
					'gold',
					'slate',
					'white-alpha',
					'black-alpha',
				]),
			);
		});

		it('maps scale steps from _primitives.scss rather than a hardcoded grid', () => {
			const gold = families.find((family) => family.id === 'gold');
			expect(gold?.scale[50]).toBe('--color--gold-50');
			expect(gold?.scale[500]).toBe('--color--gold-500');
			expect(gold?.scale[150]).toBeUndefined();

			const goldAlpha = families.find((family) => family.id === 'gold-alpha');
			expect(goldAlpha?.extras.map((extra) => extra.token)).toContain('--color--gold-alpha-020');
		});

		it('omits solid white and black so the 50–950 columns stay aligned', () => {
			const neutral = families.find((family) => family.id === 'neutral');
			expect(neutral?.scale[50]).toBe('--color--neutral-50');
			expect(neutral?.extras).toEqual([]);
		});

		it('does not list deprecated primitive colours', () => {
			const tokens = families.flatMap((family) => [
				...Object.values(family.scale),
				...family.extras.map((extra) => extra.token),
			]);
			expect(tokens).not.toContain('--color--neutral-125');
			expect(tokens).not.toContain('--color--neutral-850');
		});
	});

	describe('getSemanticColorTokenNames', () => {
		const names = getSemanticColorTokenNames(tokensSource);

		it('lists semantic colour tokens defined in _tokens.scss', () => {
			expect(names).toEqual(
				expect.arrayContaining([
					'--text-color',
					'--text-color--subtle',
					'--text-color--disabled',
					'--background--surface',
					'--background--subtle',
					'--icon-color',
					'--border-color--stronger',
					'--button--color--background--primary',
					'--canvas--color--background',
				]),
			);
		});

		it('does not list primitive scales or non-colour tokens from the same file', () => {
			expect(names).not.toContain('--color--orange-500');
			expect(names).not.toContain('--focus--border-width');
			expect(names).not.toContain('--assistant--text-message--collapsed--max-height');
		});

		it('only includes names that are actually defined in _tokens.scss', () => {
			const defined = new Set(extractDefinedCustomProperties(tokensSource));
			for (const name of names) {
				expect(defined.has(name)).toBe(true);
			}
		});
	});
});
