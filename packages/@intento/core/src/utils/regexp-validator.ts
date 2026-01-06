export class RegExpValidator {
	static isValidPattern(pattern: string): boolean {
		try {
			const match = pattern.match(/^\/(.+)\/([gimusy]*)$/);
			new RegExp(match![1], match![2]);
			return true;
		} catch {
			return false;
		}
	}
}
