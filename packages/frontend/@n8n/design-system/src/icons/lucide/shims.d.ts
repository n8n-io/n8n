declare module 'virtual:lucide-icons' {
	const bucketLoaders: ReadonlyArray<() => Promise<{ default: Record<string, string> }>>;
	export default bucketLoaders;
}
