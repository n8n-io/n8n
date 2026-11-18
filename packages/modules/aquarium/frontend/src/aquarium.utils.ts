/** Personal projects are named `First Last <email>`. Show only the name part. */
export function displayProjectName(name: string): string {
	return name.replace(/\s*<[^<>]*>\s*$/, '').trim() || name;
}
