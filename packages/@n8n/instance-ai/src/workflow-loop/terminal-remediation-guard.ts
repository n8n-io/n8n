import type { RemediationMetadata } from './workflow-loop-state';

export interface TerminalRemediationGuard {
	get(): RemediationMetadata | undefined;
	record(remediation: RemediationMetadata | undefined): RemediationMetadata | undefined;
}

export function createTerminalRemediationGuard(
	onTerminal?: (remediation: RemediationMetadata) => void,
): TerminalRemediationGuard {
	let terminalRemediation: RemediationMetadata | undefined;

	return {
		get: () => terminalRemediation,
		record: (remediation) => {
			if (!remediation || remediation.shouldEdit || terminalRemediation) {
				return terminalRemediation;
			}

			terminalRemediation = remediation;
			onTerminal?.(remediation);
			return terminalRemediation;
		},
	};
}
