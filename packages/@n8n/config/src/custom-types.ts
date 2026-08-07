abstract class StringArray<T extends string> extends Array<T> {
	constructor(str: string, delimiter: string) {
		super();
		const parsed = str.split(delimiter) as this;
		return parsed.filter((i) => typeof i === 'string' && i.length);
	}
}

export class CommaSeparatedStringArray<T extends string> extends StringArray<T> {
	constructor(str: string) {
		super(str, ',');
	}
}

export class ColonSeparatedStringArray<T extends string = string> extends StringArray<T> {
	constructor(str: string) {
		super(str, ':');
		return ColonSeparatedStringArray.rejoinWindowsPaths(this);
	}

	/**
	 * After splitting by ':', rejoin segments that were split on a Windows
	 * drive-letter colon (e.g. 'C:\path' was split into ['C', '\path']).
	 * A drive letter is a single ASCII letter whose next segment starts with
	 * a backslash or forward slash.
	 */
	private static rejoinWindowsPaths<T extends string>(parts: T[]): T[] {
		const result: T[] = [];
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (
				part.length === 1 &&
				/^[a-zA-Z]$/.test(part) &&
				i + 1 < parts.length &&
				/^[\\\/]/.test(parts[i + 1])
			) {
				// Rejoin the drive letter with the rest of the path
				result.push((part + ':' + parts[i + 1]) as T);
				i++; // Skip the next segment since we merged it
			} else {
				result.push(part);
			}
		}
		return result;
	}
}
