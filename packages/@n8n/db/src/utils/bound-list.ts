export function bindStringList(isPostgres: boolean, values: string[]): string[] | string {
	return isPostgres ? values : JSON.stringify(values);
}

export function inBoundStringList(isPostgres: boolean, parameter: string): string {
	return isPostgres
		? `= ANY(CAST(:${parameter} AS text[]))`
		: `IN (SELECT value FROM json_each(:${parameter}))`;
}
