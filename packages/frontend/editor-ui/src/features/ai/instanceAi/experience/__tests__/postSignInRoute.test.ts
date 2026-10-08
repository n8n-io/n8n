import { describe, expect, it } from 'vitest';
import { VIEWS } from '@/app/constants';
import { APP_ROOT_PATH, postSignInRoute } from '../postSignInRoute';

// The input has two values only, so these cases cover the whole domain.
describe('postSignInRoute', () => {
	it('opens the app root, which leads to the Assistant, when experience modes are on', () => {
		expect(postSignInRoute({ experienceEnabled: true })).toBe('/');
		expect(APP_ROOT_PATH).toBe('/');
	});

	it('opens the overview when experience modes are off', () => {
		expect(postSignInRoute({ experienceEnabled: false })).toEqual({ name: VIEWS.HOMEPAGE });
	});

	it('gives a new route object on each call, so a caller cannot change the next result', () => {
		const first = postSignInRoute({ experienceEnabled: false });
		const second = postSignInRoute({ experienceEnabled: false });

		expect(first).not.toBe(second);
	});
});
