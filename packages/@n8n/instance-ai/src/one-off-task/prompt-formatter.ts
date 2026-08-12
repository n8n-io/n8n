/**
 * Serializes the frozen {@link OneOffTaskContract} into the one-shot pi
 * prompt. The schema in `contracts.ts` is the contract; this file only
 * decides the prose. Static instructions (role, report format, credential
 * conventions) are baked into the sandbox image — the prompt carries only
 * what changes per run.
 */
import type { OneOffTaskContract } from './contracts';

export function formatOneOffTaskPrompt(contract: OneOffTaskContract): string {
	const sections: string[] = [];

	sections.push('# One-off task', '', '## Goal', '', contract.goal.trim());

	sections.push('', '## Hard constraints', '');
	if (contract.constraints.length === 0) {
		sections.push('- None beyond your baked-in rules.');
	} else {
		for (const constraint of contract.constraints) {
			sections.push(`- ${constraint}`);
		}
	}

	sections.push(
		'',
		'## Verification',
		'',
		contract.verification.trim(),
		'',
		'Verification means read-back: after any write, read the resource back',
		'through the API and compare it with the goal. A 2xx response is not',
		'verification. The task counts as done only when read-back shows the above.',
	);

	sections.push('', '## Credentials available in your environment', '');
	if (contract.credentials.length === 0) {
		sections.push('None injected yet. Request one from the catalog below if the task needs it.');
	} else {
		for (const credential of contract.credentials) {
			const envVars = credential.envVars
				.map((entry) => `\`${entry.envVar}\` (${entry.field})`)
				.join(', ');
			sections.push(`- ${credential.name} (type: ${credential.type}) — env vars: ${envVars}`);
		}
		sections.push(
			'',
			'Read these values from the environment by name. Never print, log, or',
			'include a credential value in any output or in the report.',
		);
	}

	sections.push('', '## Credential catalog', '');
	if (contract.credentialCatalog.length === 0) {
		sections.push('No further credentials are available to request.');
	} else {
		sections.push(
			'Further credentials the user could approve (names and types only).',
			'If the task needs one, exit with a needs_credential report naming it —',
			'never guess values or probe the environment for them.',
			'',
		);
		for (const entry of contract.credentialCatalog) {
			sections.push(`- ${entry.name} (type: ${entry.type})`);
		}
	}

	if (contract.priorReport !== undefined) {
		sections.push(
			'',
			'## Prior task report (context)',
			'',
			'A previous run of this or a related task produced the report below.',
			'Use it as context; do not redo work it already verified.',
			'',
			contract.priorReport.trim(),
		);
	}

	sections.push(
		'',
		'## Finishing',
		'',
		'Your last act must be calling `report_result` with actions taken,',
		'verification evidence, and artifact links.',
	);

	return sections.join('\n');
}
