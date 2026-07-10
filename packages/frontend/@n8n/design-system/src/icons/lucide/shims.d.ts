declare module 'virtual:lucide-icons' {
	const bucketLoaders: ReadonlyArray<() => Promise<{ default: Record<string, string> }>>;
	export default bucketLoaders;
}

declare module 'virtual:lucide-icons/body/*' {
	const body: string;
	export default body;
}
