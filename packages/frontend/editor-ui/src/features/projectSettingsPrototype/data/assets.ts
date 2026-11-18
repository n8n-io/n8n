/**
 * n8n's own node, credential, and provider images, bundled with the
 * prototype so they resolve under any base path a test instance uses.
 */
const files = import.meta.glob<string>('../assets/**/*.{svg,webp}', {
	eager: true,
	query: '?url',
	import: 'default',
});

export function asset(path: string): string {
	return files[`../assets/${path}`] ?? '';
}
