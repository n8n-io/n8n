import * as path from 'node:path';

import type { CheckReport } from './evaluate-offline';

const REPORT_FORMATS = ['text', 'json', 'github'] as const;
const FAIL_ON = ['block', 'warn', 'never'] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];
export type FailOn = (typeof FAIL_ON)[number];

export function toReportFormat(value: string): ReportFormat {
	return REPORT_FORMATS.find((format) => format === value) ?? 'text';
}

export function toFailOn(value: string): FailOn {
	return FAIL_ON.find((option) => option === value) ?? 'block';
}

export function shouldFail({ summary }: CheckReport, failOn: FailOn): boolean {
	if (failOn === 'never') return false;
	if (failOn === 'warn') return summary.blocking + summary.warnings > 0;
	return summary.blocking > 0;
}

function displayPath(source: string | null): string {
	if (!source) return '(request)';
	const relative = path.relative(process.cwd(), source);
	return relative.startsWith('..') ? source : relative;
}

/** GitHub Actions workflow commands need these characters escaped in the message. */
function escapeAnnotation(text: string): string {
	return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(text: string): string {
	return escapeAnnotation(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

export function formatReport(report: CheckReport, format: ReportFormat, failOn: FailOn): string {
	if (format === 'json') return JSON.stringify(report, null, 2);

	const lines: string[] = [];
	for (const result of report.results) {
		const active = result.findings.filter((finding) => !finding.exempted);
		if (format === 'github') {
			for (const finding of active) {
				const level = finding.severity === 'block' ? 'error' : 'warning';
				const file = result.source ? `file=${escapeProperty(displayPath(result.source))},` : '';
				const title = escapeProperty(`Workflow rule ${finding.ruleId}`);
				lines.push(`::${level} ${file}title=${title}::${escapeAnnotation(finding.message)}`);
			}
			continue;
		}

		const mark = result.blocking > 0 ? '✖' : active.length > 0 ? '!' : '✔';
		lines.push(`${mark} ${displayPath(result.source)}  ${result.workflowName}`);
		for (const finding of active) {
			const where = finding.nodeName ? ` [${finding.nodeName}]` : '';
			lines.push(`    ${finding.severity.padEnd(5)} ${finding.ruleId}${where}  ${finding.message}`);
		}
	}

	const { workflows, blocking, warnings } = report.summary;
	const failed = shouldFail(report, failOn);
	const summary = `${workflows} workflow${workflows === 1 ? '' : 's'} checked: ${blocking} blocking, ${warnings} warning${warnings === 1 ? '' : 's'}. ${failed ? 'Failed.' : 'Passed.'}`;
	if (format === 'github') {
		lines.push(
			failed
				? `::error title=Workflow Rules::${summary}`
				: `::notice title=Workflow Rules::${summary}`,
		);
	} else {
		lines.push('', summary);
	}
	return lines.join('\n');
}
