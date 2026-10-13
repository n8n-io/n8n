/** Avatar colour pairs from avvvatars (MIT, github.com/nusu/avvvatars): background, ink. */
const PALETTE: Array<[string, string]> = [
	['#D8E8F3', '#222A54'],
	['#E7F9F3', '#216E55'],
	['#EBE6EF', '#AB133E'],
	['#F2FFD1', '#526E0C'],
	['#FDEFE2', '#C56511'],
	['#E6F0FF', '#1D4FB0'],
	['#FDE2E4', '#A31636'],
	['#E2F4FD', '#0F5E7A'],
];

export function avatarColors(seed: string): { bg: string; fg: string } {
	let hash = 0;
	for (let index = 0; index < seed.length; index++) {
		hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
	}
	const [bg, fg] = PALETTE[hash % PALETTE.length];
	return { bg, fg };
}

export function initialsOf(name: string, explicit?: string): string {
	if (explicit?.trim()) return explicit.trim().slice(0, 3).toUpperCase();
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
