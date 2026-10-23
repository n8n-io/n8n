import { Flags } from '@oclif/core';

import type { PromotionExpectedSource } from '../../client';

const COMMIT_SHA = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

/** The server compares the full SHA, so a short one could never match. */
export async function parseCommitSha(input: string): Promise<string> {
	if (!COMMIT_SHA.test(input)) {
		throw new Error(
			`Expected a full lowercase commit SHA (40 or 64 hex characters), got "${input}"`,
		);
	}
	return input;
}

/** An unset shell variable arrives as an empty value. Fail here, before any request is sent. */
export function parseNonEmpty(label: string) {
	return async (input: string): Promise<string> => {
		if (input.trim() === '') throw new Error(`Expected a non-empty ${label}`);
		return input;
	};
}

/**
 * Flags that pin Apply to the reviewed source. `required: false` makes them
 * optional as a group: pass all three or none.
 */
export function expectedSourceFlags({ required }: { required: boolean }) {
	const group = ['expectedEnvironmentId', 'expectedBranch', 'expectedCommitSha'];
	const others = (name: string) => (required ? undefined : group.filter((flag) => flag !== name));

	return {
		expectedEnvironmentId: Flags.string({
			description: 'Apply environment ID of the reviewed source',
			aliases: ['expected-environment-id'],
			required,
			dependsOn: others('expectedEnvironmentId'),
			parse: parseNonEmpty('environment ID'),
		}),
		expectedBranch: Flags.string({
			description: 'Branch name of the reviewed source',
			aliases: ['expected-branch'],
			required,
			dependsOn: others('expectedBranch'),
			parse: parseNonEmpty('branch name'),
		}),
		expectedCommitSha: Flags.string({
			description: 'Full commit SHA of the reviewed source',
			aliases: ['expected-commit-sha'],
			required,
			dependsOn: others('expectedCommitSha'),
			parse: parseCommitSha,
		}),
	};
}

export function toExpectedSource(flags: {
	expectedEnvironmentId?: string;
	expectedBranch?: string;
	expectedCommitSha?: string;
}): PromotionExpectedSource | undefined {
	const { expectedEnvironmentId, expectedBranch, expectedCommitSha } = flags;
	if (
		expectedEnvironmentId === undefined ||
		expectedBranch === undefined ||
		expectedCommitSha === undefined
	) {
		return undefined;
	}
	return {
		environmentId: expectedEnvironmentId,
		branchName: expectedBranch,
		commitSha: expectedCommitSha,
	};
}
