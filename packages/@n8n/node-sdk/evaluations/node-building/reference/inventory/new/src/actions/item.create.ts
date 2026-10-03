import { isHttpError, matches, path, t } from '@n8n/node-sdk';

import { items } from '../inventory.node';

const common = { id: t.str(), sku: t.str(), name: t.str(), status: t.str(), createdAt: t.str() };

const physical = t.obj({
	...common,
	kind: t.lit('physical'),
	weight: t.obj({ value: t.num(), unit: t.lit('g') }),
	dimensions: t.obj({ length: t.num(), width: t.num(), height: t.num(), unit: t.lit('cm') }),
});

const digital = t.obj({ ...common, kind: t.lit('digital'), downloadUrl: t.str() });

const item = t.union(physical, digital);

const validationErrors = t
	.obj({
		errors: t.arr(t.obj({ field: t.str(), message: t.str() })),
	})
	.with({ additionalProperties: true });

export const createItem = items.action('create', {
	action: 'Create an item',
	summary: 'Create a physical or a digital inventory item.',
	flow: { effect: 'write', cardinality: 'per-item' },
	input: {
		kind: t.oneOf('physical', 'digital').default('physical'),
		sku: t.str(),
		name: t.str(),
		weightGrams: t.num().optional(),
		lengthCm: t.num().optional(),
		widthCm: t.num().optional(),
		heightCm: t.num().optional(),
		downloadUrl: t.str().optional(),
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
			.request({ method: 'POST', path: path`/items`, body })
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
