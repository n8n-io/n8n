import type {
	PromotionDataTableChange,
	PromotionDirection,
	PromotionResource,
	PromotionResourceDetail,
	SerializedDataTableColumn,
} from '@n8n/api-types';

/** Turns the package files of a resource into what its change card shows. */

export type DetailSide = 'before' | 'after';

/**
 * The content of one side. `absent` means that side has no file, so the resource is added or
 * deleted. `unreadable` means a file exists, but it does not match the package format.
 */
export type SideState<Content> =
	| { kind: 'content'; content: Content }
	| { kind: 'absent' }
	| { kind: 'unreadable' };

export function sideState<Detail extends PromotionResourceDetail>(
	detail: Detail,
	side: DetailSide,
): SideState<NonNullable<Detail[DetailSide]>> {
	const content = detail[side];
	if (content !== null && content !== undefined) return { kind: 'content', content };
	return detail.revision[side] === null ? { kind: 'absent' } : { kind: 'unreadable' };
}

export function hasUnreadableSide(detail: PromotionResourceDetail): boolean {
	return (
		sideState(detail, 'before').kind === 'unreadable' ||
		sideState(detail, 'after').kind === 'unreadable'
	);
}

const FIELD_IDS = ['name', 'description', 'icon', 'location', 'type', 'data', 'value'] as const;

export type FieldId = (typeof FIELD_IDS)[number];

export type FieldChange = { field: FieldId; before?: string; after?: string };

export type FieldContext = {
	direction: PromotionDirection;
	/** The preview resource. Its `change` wins over file differences. */
	resource: PromotionResource;
	/** The display name of a project or folder, for locations. */
	containerName: (key: string) => string;
};

function fieldsOf(
	detail: PromotionResourceDetail,
	side: DetailSide,
): Partial<Record<FieldId, string>> {
	switch (detail.type) {
		case 'project': {
			const project = detail[side];
			if (!project) return {};
			return { name: project.name, description: project.description, icon: project.icon?.value };
		}
		case 'folder': {
			const folder = detail[side];
			return folder ? { name: folder.name } : {};
		}
		case 'credential': {
			const credential = detail[side];
			if (!credential) return {};
			return {
				name: credential.name,
				type: credential.type,
				data: credential.data ? JSON.stringify(credential.data, null, 2) : undefined,
			};
		}
		case 'variable': {
			const variable = detail[side];
			if (!variable) return {};
			return { name: variable.name, type: variable.type, value: variable.value };
		}
		case 'tag': {
			const tag = detail[side];
			return tag ? { name: tag.name } : {};
		}
		case 'dataTable':
		case 'workflow':
			// Data table and workflow cards show their own change views.
			return {};
	}
}

/** Moves come from the preview resource, which already applies the operation rules. */
function locationOf(
	{ resource, containerName }: FieldContext,
	side: DetailSide,
): Partial<Record<FieldId, string>> {
	if (resource.previousParentKey === undefined) return {};
	const key = side === 'before' ? resource.previousParentKey : resource.parentKey;
	return key === null ? {} : { location: containerName(key) };
}

/**
 * The fields that the operation changes. An unchanged resource has none, even when its two files
 * differ, because the operation keeps the local value.
 */
export function describeFieldChanges(
	detail: PromotionResourceDetail,
	context: FieldContext,
): FieldChange[] {
	const { direction, resource } = context;
	if (resource.change === 'unchanged') return [];

	const before = { ...fieldsOf(detail, 'before'), ...locationOf(context, 'before') };
	const after = { ...fieldsOf(detail, 'after'), ...locationOf(context, 'after') };
	// Apply keeps the name of an existing folder, so only its move remains.
	const locationOnly =
		direction === 'apply' && resource.change === 'modified' && detail.type === 'folder';

	return FIELD_IDS.filter((field) => !locationOnly || field === 'location')
		.filter((field) => before[field] !== after[field])
		.map((field) => ({ field, before: before[field], after: after[field] }));
}

/** The rename and move of a workflow. The workflow diff shows the rest. */
export function describeWorkflowFieldChanges(context: FieldContext): FieldChange[] {
	const { resource } = context;
	const changes: FieldChange[] = [];
	if (resource.previousName !== undefined) {
		changes.push({ field: 'name', before: resource.previousName, after: resource.name });
	}
	if (resource.previousParentKey !== undefined) {
		const before = locationOf(context, 'before').location;
		const after = locationOf(context, 'after').location;
		changes.push({ field: 'location', before, after });
	}
	return changes;
}

export type DataTableDescription = {
	/** Column changes of a table that exists on both sides. */
	changes: PromotionDataTableChange[];
	/**
	 * True when the card warns about changes that remove data. Promote cannot know the table on the
	 * instance that applies the branch, so only Apply warns.
	 */
	warnsAboutDataLoss: boolean;
	/** The columns of a table that the operation creates. */
	addedColumns: SerializedDataTableColumn[];
};

export function describeDataTable(
	detail: Extract<PromotionResourceDetail, { type: 'dataTable' }>,
	resource: PromotionResource,
	direction: PromotionDirection,
): DataTableDescription {
	const changes = resource.change === 'modified' ? (detail.dataTableChanges ?? []) : [];
	const after = sideState(detail, 'after');
	const addedColumns =
		resource.change === 'added' && after.kind === 'content'
			? [...after.content.columns].sort((a, b) => a.index - b.index)
			: [];
	return { changes, warnsAboutDataLoss: direction === 'apply', addedColumns };
}

/** True when the files changed after the preview loaded, so the card can be out of date. */
export function isStaleDetail(detail: PromotionResourceDetail, resource: PromotionResource) {
	return (
		detail.revision.before !== resource.revision.before ||
		detail.revision.after !== resource.revision.after
	);
}
