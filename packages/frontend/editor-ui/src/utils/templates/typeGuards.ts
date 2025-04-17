import type {
	ITemplatesCollection,
	ITemplatesCollectionFull,
	ITemplatesWorkflow,
} from '@/Interface';

export function isTemplatesWorkflow(
	template: ITemplatesWorkflow | ITemplatesCollection | ITemplatesCollectionFull | null,
): template is ITemplatesWorkflow {
	return !!template && 'totalViews' in template;
}

export function isFullTemplatesCollection(
	template: ITemplatesWorkflow | ITemplatesCollectionFull | ITemplatesCollection | null,
): template is ITemplatesCollectionFull {
	return !!template && 'description' in template && 'categories' in template;
}
