import type {
	CreateGitConnectionDto,
	GitConnectionType,
	GitKeyGeneratorType,
	UpdateGitConnectionDto,
} from '@n8n/api-types';

import type { GitConnection } from './gitConnections.api';

export type GitConnectionFormState = {
	name: string;
	repositoryUrl: string;
	branchName: string;
	connectionType: GitConnectionType;
	keyGeneratorType: GitKeyGeneratorType;
	username: string;
	password: string;
};

export function buildCreatePayload(form: GitConnectionFormState): CreateGitConnectionDto {
	const payload: CreateGitConnectionDto = {
		name: form.name.trim(),
		repositoryUrl: form.repositoryUrl.trim(),
		connectionType: form.connectionType,
	};

	const branchName = form.branchName.trim();
	if (branchName) {
		payload.branchName = branchName;
	}

	if (form.connectionType === 'ssh') {
		payload.keyGeneratorType = form.keyGeneratorType;
	} else {
		payload.username = form.username.trim();
		payload.password = form.password;
	}

	return payload;
}

export function buildUpdatePayload(
	form: GitConnectionFormState,
	current: GitConnection,
): UpdateGitConnectionDto {
	const payload: UpdateGitConnectionDto = {};

	const name = form.name.trim();
	if (name !== current.name) {
		payload.name = name;
	}

	const repositoryUrl = form.repositoryUrl.trim();
	if (repositoryUrl !== current.repositoryUrl) {
		payload.repositoryUrl = repositoryUrl;
	}

	// The API has no way to clear a branch (`min(1)`, not nullable), so a blank
	// field means "leave as is" rather than "remove".
	const branchName = form.branchName.trim();
	if (branchName && branchName !== current.branchName) {
		payload.branchName = branchName;
	}

	if (form.connectionType !== current.connectionType) {
		payload.connectionType = form.connectionType;
	}

	if (form.connectionType === 'ssh') {
		// ssh -> ssh rejects a changed key type; only a switch to ssh mints a key.
		if (current.connectionType !== 'ssh') {
			payload.keyGeneratorType = form.keyGeneratorType;
		}
	} else if (form.username.trim() && form.password.trim()) {
		payload.username = form.username.trim();
		payload.password = form.password;
	}

	return payload;
}
