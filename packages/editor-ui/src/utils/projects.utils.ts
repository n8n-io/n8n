// Splits a project name into first name, last name, and email when it is in the format "First Last <email@domain.com>"
export const splitName = (
	projectName: string,
): {
	firstName: string;
	lastName?: string;
	email?: string;
} => {
	const regex = /^(.+)?\s?<([^>]+)>$/;
	const match = projectName.match(regex);

	if (match) {
		const [_, fullName, email] = match;
		const nameParts = fullName?.trim().split(/\s+/);
		const lastName = nameParts?.pop();
		const firstName = nameParts?.join(' ');
		return { firstName, lastName, email };
	} else {
		const nameParts = projectName.split(/\s+/) ?? [];
		if (nameParts.length < 2) {
			return { firstName: projectName };
		} else {
			const lastName = nameParts.pop();
			const firstName = nameParts.join(' ');
			return { firstName, lastName };
		}
	}
};

export const ProjectTypes = {
	Personal: 'personal',
	Team: 'team',
	Public: 'public',
} as const;
