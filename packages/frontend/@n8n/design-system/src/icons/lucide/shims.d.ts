declare module 'virtual:lucide-icons' {
	const loaders: Record<string, () => Promise<{ default: string | null }>>;
	export default loaders;
}
