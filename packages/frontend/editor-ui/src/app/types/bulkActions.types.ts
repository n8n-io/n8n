export type SharedBulkActionItemStatus = 'completed' | 'unchanged' | 'failed' | 'notAttempted';

export type SharedBulkActionResultItem<
	ResourceType extends string,
	Status extends SharedBulkActionItemStatus = SharedBulkActionItemStatus,
> = {
	id: string;
	resourceType: ResourceType;
	name: string;
	status: Status;
	message?: string;
};

export type SharedBulkActionResult<
	ResourceType extends string,
	Status extends SharedBulkActionItemStatus = SharedBulkActionItemStatus,
> = {
	status: 'completed' | 'partial';
	items: Array<SharedBulkActionResultItem<ResourceType, Status>>;
	/** Mocked operations only touch the local list projection, so consumers skip a server refresh. */
	mocked: boolean;
};
