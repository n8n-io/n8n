import type { Reporter } from 'vitest/reporters';

export class PhaseReporter implements Reporter {
	private firstModuleStart?: string;
	private lastModuleEnd?: string;

	onTestModuleStart() {
		this.firstModuleStart ??= new Date().toISOString();
	}

	onTestModuleEnd() {
		this.lastModuleEnd = new Date().toISOString();
	}

	onTestRunEnd() {
		if (!this.firstModuleStart || !this.lastModuleEnd) return;
		process.stdout.write(
			`N8N_VITEST_PHASE ${JSON.stringify({ version: 1, firstModuleStart: this.firstModuleStart, lastModuleEnd: this.lastModuleEnd })}\n`,
		);
	}
}
