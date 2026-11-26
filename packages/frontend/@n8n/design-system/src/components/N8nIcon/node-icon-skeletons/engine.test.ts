import { nodeIconSkeletonData, nodeIconSkeletonSlugs } from './data';
import { SkeletonLibrary } from './engine';
import { drawNodeIcon } from './index';
import { nodeIconNames } from '../node-icon-names';

const library = new SkeletonLibrary(nodeIconSkeletonData);
const slugs = [
	...new Set(Object.values(nodeIconSkeletonSlugs).filter((s): s is string => s !== undefined)),
];

describe('SkeletonLibrary', () => {
	it('should have a skeleton for each slug that a node icon uses', () => {
		for (const slug of slugs) {
			expect(library.has(slug), slug).toBe(true);
		}
	});

	it('should draw each icon in both variants at each size from 12px to 24px', () => {
		for (const slug of slugs) {
			for (const variant of ['outline', 'solid'] as const) {
				for (let size = 12; size <= 24; size += 0.5) {
					const body = library.render(slug, variant, size, 'id-');
					expect(body, `${slug} ${variant} ${size}`).toMatch(/<path |<rect /);
				}
			}
		}
	});

	it('should clamp sizes outside 12px to 24px', () => {
		expect(library.render('globe', 'outline', 48, 'id-')).toBe(
			library.render('globe', 'outline', 24, 'id-'),
		);
		expect(library.render('globe', 'outline', 6, 'id-')).toBe(
			library.render('globe', 'outline', 12, 'id-'),
		);
	});

	it('should draw a different shape between two drawn sizes', () => {
		const at16 = library.render('globe', 'outline', 16, 'id-');
		const at20 = library.render('globe', 'outline', 20, 'id-');
		const at24 = library.render('globe', 'outline', 24, 'id-');
		expect(at20).not.toBe(at16);
		expect(at20).not.toBe(at24);
	});

	it('should return null for an unknown slug', () => {
		expect(library.render('not-an-icon', 'outline', 16, 'id-')).toBeNull();
	});
});

describe('drawNodeIcon', () => {
	it('should map node icon names to skeletons', () => {
		for (const name of Object.keys(nodeIconSkeletonSlugs)) {
			expect(nodeIconNames).toContain(name);
		}
	});

	it('should give the viewBox size of the clamped screen size', () => {
		expect(drawNodeIcon('node:http-request', 18.1, 'a-')?.viewBoxSize).toBe(18);
		expect(drawNodeIcon('node:http-request', 96, 'a-')?.viewBoxSize).toBe(24);
		expect(drawNodeIcon('node:http-request', 4, 'a-')?.viewBoxSize).toBe(12);
	});

	it('should give each caller its own mask ids', () => {
		const slugWithMask = Object.entries(nodeIconSkeletonSlugs).find(([name]) =>
			drawNodeIcon(name, 24, 'x-')?.body.includes('<mask'),
		);
		expect(slugWithMask).toBeDefined();
		const [name] = slugWithMask!;
		const first = drawNodeIcon(name, 24, 'first-')!.body;
		const second = drawNodeIcon(name, 24, 'second-')!.body;
		expect(first).toContain('id="first-0"');
		expect(second).toContain('id="second-0"');
		expect(second).not.toContain('first-');
	});

	it('should return null for a node icon with no skeleton', () => {
		expect(drawNodeIcon('node:agent-decision-trigger', 24, 'a-')).toBeNull();
	});
});
