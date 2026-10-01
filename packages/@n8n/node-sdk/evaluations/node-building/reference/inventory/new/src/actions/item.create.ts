import { arr, isHttpError, lit, matches, num, obj, oneOf, str, union } from '@n8n/node-sdk';

import { items } from '../inventory.node';

const common = { id: str(), sku: str(), name: str(), status: str(), createdAt: str() };

const physical = obj({
	...common,
	kind: lit('physical'),
	weight: obj({ value: num(), unit: lit('g') }),
	dimensions: obj({ length: num(), width: num(), height: num(), unit: lit('cm') }),
});

const digital = obj({ ...common, kind: lit('digital'), downloadUrl: str() });

const item = union(physical, digital);

const validationErrors = obj({
	errors: arr(obj({ field: str(), message: str() })),
}).with({ additionalProperties: true });

export const createItem = items.action('create', {
	action: 'Create an item',
	summary: 'Create a physical or a digital inventory item.',
	flow: { effect: 'write', cardinality: 'per-item' },
	input: {
		kind: oneOf('physical', 'digital').default('physical'),
		sku: str(),
		name: str(),
		weightGrams: num().optional(),
		lengthCm: num().optional(),
		widthCm: num().optional(),
		heightCm: num().optional(),
		downloadUrl: str().optional(),
	},
	output: item,
	async run({ input, http }) {
		const base = { kind: input.kind, sku: input.sku, name: input.name };
		const body =
			input.kind === 'physical'
				? {
						...base,
						weight: { value: input.weightGrams, unit: 'g' },
						dimensions: {
							length: input.lengthCm,
							width: input.widthCm,
							height: input.heightCm,
							unit: 'cm',
						},
					}
				: { ...base, downloadUrl: input.downloadUrl };
		const created = await http
			.request({ method: 'POST', path: '/items', body })
			.catch((error: unknown) => {
				if (isHttpError(error) && error.status === 422 && matches(validationErrors, error.body)) {
					const fields = error.body.errors.map(({ field, message }) => `${field}: ${message}`);
					throw new Error(`Invalid item: ${fields.join('; ')}`);
				}
				throw error;
			});
		if (!matches(item, created)) throw new Error('Inventory returned an unexpected item');
		return created;
	},
});
