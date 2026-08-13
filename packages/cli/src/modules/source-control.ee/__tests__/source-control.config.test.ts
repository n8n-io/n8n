import { Container } from '@n8n/di';

import { SourceControlConfig } from '../source-control.config';

describe('SourceControlConfig', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('branchSelectionEnabled', () => {
		test('defaults to false', () => {
			process.env = {};
			expect(Container.get(SourceControlConfig).branchSelectionEnabled).toBe(false);
		});

		test('is true when N8N_SOURCECONTROL_BRANCH_SELECTION_ENABLED=true', () => {
			process.env = { N8N_SOURCECONTROL_BRANCH_SELECTION_ENABLED: 'true' };
			expect(Container.get(SourceControlConfig).branchSelectionEnabled).toBe(true);
		});

		test('is false when N8N_SOURCECONTROL_BRANCH_SELECTION_ENABLED=false', () => {
			process.env = { N8N_SOURCECONTROL_BRANCH_SELECTION_ENABLED: 'false' };
			expect(Container.get(SourceControlConfig).branchSelectionEnabled).toBe(false);
		});
	});
});
