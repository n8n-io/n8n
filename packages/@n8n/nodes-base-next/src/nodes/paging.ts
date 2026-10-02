import { int, variant, type Infer } from '@n8n/node-sdk';

/**
 * The one paging input of the list actions in this package: every page, or the first `max`
 * items. An SDK candidate: the SDK can own it with the declarative list binding.
 */
export const paging = variant('mode', {
	all: {},
	limit: { max: int().with({ minimum: 1 }) },
}).default({ mode: 'limit', max: 50 });

/** The item limit for `paginate`: undefined for every page. */
export const limitOf = (value: Infer<typeof paging>) =>
	value.mode === 'limit' ? value.max : undefined;
