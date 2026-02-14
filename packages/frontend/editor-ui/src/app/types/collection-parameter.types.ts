export type FixedCollectionRenderVariant =
	| 'nested-multiple-wrapper'
	| 'top-level-multiple'
	| 'nested-single'
	| 'top-level-single'
	| 'legacy-multiple'
	| 'legacy-single';

export type CollectionRenderVariant = 'new-ui' | 'legacy-ui';

export type CollapsedDefaultState = 'all' | 'first-expanded' | 'none';
