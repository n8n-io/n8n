#!/usr/bin/env node
/**
 * contrib-runway check — evaluate a ticket against policies/n8n.yaml
 *
 * Usage:
 *   npx tsx src/check.ts [path-to-ticket.yaml]
 *
 * Defaults to examples/approved-ticket.yaml when no path is given.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

import { writeEvidenceReport } from './evidence.js';
import type { CheckResult, Policy, Ticket } from './types.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadYaml<T>(filePath: string): T {
	return parseYaml(readFileSync(filePath, 'utf8')) as T;
}

function isPathLikeRestrictedArea(area: string): boolean {
	return area.includes('/') || area.startsWith('packages');
}

function matchesRestrictedArea(ticketArea: string, restrictedArea: string): boolean {
	const normalizedTicketArea = ticketArea.trim();
	const normalizedRestrictedArea = restrictedArea.trim();

	if (isPathLikeRestrictedArea(normalizedRestrictedArea)) {
		return (
			normalizedTicketArea === normalizedRestrictedArea ||
			normalizedTicketArea.startsWith(`${normalizedRestrictedArea}/`)
		);
	}

	const ticketSegments = normalizedTicketArea.split('/');
	const lastSegment = ticketSegments.at(-1) ?? normalizedTicketArea;

	return (
		lastSegment.toLowerCase() === normalizedRestrictedArea.toLowerCase() ||
		normalizedTicketArea.toLowerCase().includes(`/${normalizedRestrictedArea.toLowerCase()}/`) ||
		normalizedTicketArea.toLowerCase().endsWith(`/${normalizedRestrictedArea.toLowerCase()}`)
	);
}

export function isAreaRestricted(ticketArea: string, restrictedAreas: string[]): boolean {
	return restrictedAreas.some((restrictedArea) =>
		matchesRestrictedArea(ticketArea, restrictedArea),
	);
}

export function isTicketApproved(ticket: Ticket, policy: Policy): boolean {
	if (!policy.allowed_change.requires_approval) {
		return true;
	}
	return ticket.status.trim().toLowerCase() === 'approved';
}

export function getRequiredTests(ticket: Ticket, policy: Policy): string[] {
	switch (ticket.type.trim().toLowerCase()) {
		case 'bug':
			return [...policy.bug_fix_requirements];
		default:
			return [];
	}
}

export function checkTicket(ticket: Ticket, policy: Policy): CheckResult {
	const approved = isTicketApproved(ticket, policy);
	const areaRestricted = isAreaRestricted(ticket.area, policy.restricted_areas);
	const requiredTests = getRequiredTests(ticket, policy);
	const blockReasons: string[] = [];

	if (!approved) {
		blockReasons.push('Ticket is not approved.');
	}
	if (areaRestricted) {
		blockReasons.push(`Area "${ticket.area}" is restricted by policy.`);
	}

	const status = blockReasons.length === 0 ? 'READY' : 'BLOCKED';

	return {
		ticketId: ticket.id,
		approved,
		areaRestricted,
		requiredTests,
		allowedReadPaths: status === 'READY' ? (ticket.allowed_read_paths ?? []) : [],
		allowedWritePaths: status === 'READY' ? (ticket.allowed_write_paths ?? []) : [],
		status,
		blockReasons,
	};
}

function formatPathList(label: string, paths: string[]): string[] {
	const lines = [`${label}:`];
	if (paths.length === 0) {
		lines.push('  - none');
	} else {
		for (const path of paths) {
			lines.push(`  - ${path}`);
		}
	}
	return lines;
}

export function formatCheck(result: CheckResult): string {
	const lines = [
		`Ticket: ${result.ticketId}`,
		`Approved: ${result.approved ? 'yes' : 'no'}`,
		`Area restricted: ${result.areaRestricted ? 'yes' : 'no'}`,
		'Required tests:',
	];

	if (result.requiredTests.length === 0) {
		lines.push('  - none');
	} else {
		for (const test of result.requiredTests) {
			lines.push(`  - ${test}`);
		}
	}

	lines.push(
		...formatPathList('Allowed read paths', result.allowedReadPaths),
		...formatPathList('Allowed write paths', result.allowedWritePaths),
		'',
		`Result: ${result.status}`,
	);

	if (result.blockReasons.length > 0) {
		lines.push('Block reasons:');
		for (const reason of result.blockReasons) {
			lines.push(`  - ${reason}`);
		}
	}

	return lines.join('\n');
}

function main(): void {
	const ticketPath = resolve(
		process.argv[2] ?? join(packageRoot, 'examples', 'approved-ticket.yaml'),
	);
	const policyPath = join(packageRoot, 'policies', 'n8n.yaml');

	const ticket = loadYaml<Ticket>(ticketPath);
	const policy = loadYaml<Policy>(policyPath);
	const result = checkTicket(ticket, policy);
	const evidencePath = writeEvidenceReport(result);

	console.log(formatCheck(result));
	console.log(`\nEvidence written: ${evidencePath}`);
	process.exit(result.status === 'READY' ? 0 : 1);
}

const isDirectRun =
	process.argv[1] !== undefined &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
	main();
}
