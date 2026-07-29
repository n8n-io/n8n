export const BENCHMARK_VARIANTS = [
	{
		id: 'eval-json-schema-generic-batch',
		name: 'JSON Schema',
		flavor: 'generic-batch',
	},
	{
		id: 'eval-action-lookup',
		name: 'Node Catalog',
		flavor: 'action-lookup',
	},
	{
		id: 'eval-gmail-json-schema-generic-batch',
		name: 'JSON Schema',
		flavor: 'generic-batch',
	},
	{
		id: 'eval-gmail-action-lookup',
		name: 'Node Catalog',
		flavor: 'action-lookup',
	},
] as const;

export type BenchmarkFlavor = (typeof BENCHMARK_VARIANTS)[number]['flavor'];

export function getBenchmarkVariant(id: string) {
	return BENCHMARK_VARIANTS.find((variant) => variant.id === id);
}
