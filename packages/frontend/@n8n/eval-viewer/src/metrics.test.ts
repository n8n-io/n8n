import { describe, expect, it } from 'vitest';

import { summarizeFirstBuilds } from './metrics';
import type { FirstBuild } from './schema';

const build = (overrides: Partial<FirstBuild>): FirstBuild => ({
	firstOk: true,
	oneShot: true,
	callsToFirstSave: 1,
	rebuilds: 0,
	verifies: 1,
	scenarioPasses: [],
	...overrides,
});

describe('summarizeFirstBuilds', () => {
	it('follows the definitions of firstbuild.py', () => {
		const summary = summarizeFirstBuilds([
			build({ scenarioPasses: [true, true] }),
			build({ scenarioPasses: [true, false] }),
			build({
				firstOk: false,
				oneShot: false,
				callsToFirstSave: 2,
				rebuilds: 1,
				scenarioPasses: [true],
			}),
			build({ firstOk: false, oneShot: false, callsToFirstSave: null, verifies: 0 }),
		]);
		expect(summary).toEqual({
			builds: 4,
			firstOk: 2,
			oneShot: 2,
			callsToFirstSave: 4 / 3,
			rebuilds: 0.25,
			verifies: 0.75,
			withScenarios: 3,
			firstTryCorrect: 1,
			oneShotScenPass: 3,
			oneShotScenN: 4,
			scenPass: 4,
			scenN: 5,
		});
	});
});
