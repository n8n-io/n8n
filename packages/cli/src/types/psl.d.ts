declare module 'psl' {
	export function get(domain: string): string | null;
	export function isValid(domain: string): boolean;
}
