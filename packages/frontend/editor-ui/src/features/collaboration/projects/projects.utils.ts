import { truncate } from '@n8n/utils/string/truncate';

// Splits a project name into first name, last name, and email when it is in the format "First Last <email@domain.com>"
export const splitName = (
	projectName = '',
): {
	name?: string;
	email?: string;
} => {
	const regex = /^(.*?)(?:\s*<([^>]+)>)?$/;
	const match = projectName.match(regex);
	const [, name, email] = match ?? [];
	return { name: name.trim() || undefined, email };
};

export const MAX_NAME_LENGTH = 25;

export const getTruncatedProjectName = (projectName: string | null | undefined): string => {
	const { name, email } = splitName(projectName ?? '');
	return truncate(name ?? email ?? '', MAX_NAME_LENGTH);
};

export const enum ResourceType {
	Credential = 'credential',
	Workflow = 'workflow',
}
