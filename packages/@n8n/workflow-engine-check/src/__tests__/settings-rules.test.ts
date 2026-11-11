import type { IWorkflowSettings } from 'n8n-workflow';

import { findSettingsReasons } from '../settings-rules';
import type { EngineV2ReasonCode } from '../types';

describe('findSettingsReasons', () => {
	it.each<{ setting: string; settings: IWorkflowSettings; code: EngineV2ReasonCode }>([
		{
			setting: 'an error workflow id',
			settings: { errorWorkflow: 'wf-123' },
			code: 'ERROR_WORKFLOW',
		},
		{
			setting: 'redaction policy all',
			settings: { redactionPolicy: 'all' },
			code: 'REDACTION_POLICY',
		},
		{
			setting: 'redaction policy non-manual',
			settings: { redactionPolicy: 'non-manual' },
			code: 'REDACTION_POLICY',
		},
		{
			setting: 'redaction policy manual-only',
			settings: { redactionPolicy: 'manual-only' },
			code: 'REDACTION_POLICY',
		},
		{
			setting: 'a credential resolver',
			settings: { credentialResolverId: 'resolver-1' },
			code: 'END_USER_CREDENTIALS',
		},
	])('blocks $setting with code $code', ({ settings, code }) => {
		expect(findSettingsReasons(settings)).toEqual([
			{ code, severity: 'blocking', message: expect.any(String) },
		]);
	});

	it.each<{ setting: string; settings: IWorkflowSettings }>([
		{ setting: 'empty settings', settings: {} },
		{ setting: 'the error workflow set to DEFAULT', settings: { errorWorkflow: 'DEFAULT' } },
		{ setting: 'an empty error workflow', settings: { errorWorkflow: '' } },
		// The runtime never evaluates an expression here, so v1 runs no error workflow either.
		{ setting: 'an error workflow expression', settings: { errorWorkflow: '={{ $json.id }}' } },
		{ setting: 'redaction policy none', settings: { redactionPolicy: 'none' } },
		// The runtime reads a null policy as none.
		{
			setting: 'a null redaction policy',
			settings: { redactionPolicy: null } as unknown as IWorkflowSettings,
		},
		{ setting: 'an empty credential resolver', settings: { credentialResolverId: '' } },
	])('allows $setting', ({ settings }) => {
		expect(findSettingsReasons(settings)).toEqual([]);
	});

	it('reports every blocking setting, not only the first', () => {
		const reasons = findSettingsReasons({
			errorWorkflow: 'wf-123',
			redactionPolicy: 'all',
			credentialResolverId: 'resolver-1',
		});

		expect(reasons.map((reason) => reason.code)).toEqual([
			'ERROR_WORKFLOW',
			'REDACTION_POLICY',
			'END_USER_CREDENTIALS',
		]);
	});
});
