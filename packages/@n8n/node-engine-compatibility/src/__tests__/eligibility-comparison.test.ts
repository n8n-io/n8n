import { describe, expect, it } from 'vitest';

import { setV1Workflow } from './acceptance-fixtures';
import {
	converterCorpus,
	expectEngineAndCheckAccept,
	expectRefusalHolds,
	loadPlaywrightWorkflow,
	playwrightCorpus,
} from './eligibility-comparison';
import { engineRefusals } from './engine-refusals';

describe('engine v2 eligibility check compared with engine v2', () => {
	describe('every workflow engine v2 runs is eligible', () => {
		it.each(playwrightCorpus)('Playwright workflow %s', (file) => {
			expectEngineAndCheckAccept(loadPlaywrightWorkflow(file));
		});

		it.each(converterCorpus)('converter acceptance workflow: %s', (_name, workflow) => {
			expectEngineAndCheckAccept(workflow);
		});
	});

	describe('every refusal in engineRefusals still holds', () => {
		it.each(engineRefusals)('$name', expectRefusalHolds);
	});

	it('fails and names the row to remove when engine v2 runs the workflow', () => {
		const accepted = {
			...engineRefusals[0],
			workflow: setV1Workflow([{ name: 'greeting', value: 'hello', type: 'string' }]),
		};
		expect(() => expectRefusalHolds(accepted)).toThrow('Engine v2 now runs this workflow');
	});
});
