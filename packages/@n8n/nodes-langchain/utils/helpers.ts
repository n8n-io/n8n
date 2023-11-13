import type { IExecuteFunctions } from 'n8n-workflow';

export function getMetadataFiltersValues(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Record<string, never> | undefined {
	const metadata = ctx.getNodeParameter('options.metadata.metadataValues', itemIndex, []) as Array<{
		name: string;
		value: string;
	}>;
	if (metadata.length > 0) {
		return metadata.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
	}

	return undefined;
}
