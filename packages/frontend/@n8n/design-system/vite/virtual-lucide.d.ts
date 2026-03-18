declare module 'virtual:lucide-icon-loader' {
	const loaders: Record<string, () => Promise<{ default: string | null }>>;
	export default loaders;
}

declare module 'virtual:lucide-icons' {
	const bodies: Record<string, string>;
	export default bodies;
}
