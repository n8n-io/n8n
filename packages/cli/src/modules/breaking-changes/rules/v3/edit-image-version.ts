import { isNodeParameters } from 'n8n-workflow';
import type { INode, INodeParameters } from 'n8n-workflow';

export const EDIT_IMAGE_NODE_TYPE = 'n8n-nodes-base.editImage';
export const EDIT_IMAGE_TARGET_VERSION = 2;
export const EDIT_IMAGE_DEFAULT_BLUR_RADIUS = 5;

function asParameters(value: unknown): INodeParameters | undefined {
	return isNodeParameters(value) ? value : undefined;
}

export const EDIT_IMAGE_WARNING = {
	blur: 'Blur uses a different algorithm in version 2, so the image can look different.',
	quality:
		'Image quality for PNG and TIFF is no longer applied in version 2. Re-export as JPEG or WebP if you need a quality setting.',
	information:
		'The Get Information operation returns a different output shape in version 2. Update any nodes that read fields such as width or height.',
	text: 'Text rendering uses a different library in version 2, so placement and wrapping can look different.',
	resize:
		'Resize width or height is zero or negative. Version 2 rejects these values, so set positive dimensions before you run the workflow.',
} as const;

export type EditImageWarning = (typeof EDIT_IMAGE_WARNING)[keyof typeof EDIT_IMAGE_WARNING];

/** Returns Edit Image nodes that still run on version 1 or 1.1. */
export function getLegacyEditImageNodes(nodesGroupedByType: Map<string, INode[]>): INode[] {
	return (nodesGroupedByType.get(EDIT_IMAGE_NODE_TYPE) ?? []).filter(
		(node) => node.typeVersion < EDIT_IMAGE_TARGET_VERSION,
	);
}

/**
 * Collects top-level or multi-step operation entries from an Edit Image node.
 * Each entry is the parameter object that carries that operation's fields.
 */
export function getEditImageOperationSteps(parameters: INodeParameters): INodeParameters[] {
	if (parameters.operation === 'multiStep') {
		const operations = asParameters(parameters.operations)?.operations;
		if (!Array.isArray(operations)) return [];
		return operations.flatMap((step) => {
			const params = asParameters(step);
			return params ? [params] : [];
		});
	}

	return [parameters];
}

function isNonPositiveDimension(value: unknown): boolean {
	return typeof value === 'number' && Number.isFinite(value) && value <= 0;
}

function hasIgnoredQuality(parameters: INodeParameters): boolean {
	const options = asParameters(parameters.options);
	if (options?.quality === undefined) return false;
	return (
		options.format === undefined ||
		options.format === 'png' ||
		options.format === 'tiff' ||
		options.format === 'tif'
	);
}

/** Returns only the parameter-specific warnings that apply to this node's saved config. */
export function collectEditImageWarnings(parameters: INodeParameters): EditImageWarning[] {
	const warnings: EditImageWarning[] = [];
	const steps = getEditImageOperationSteps(parameters);

	if (steps.some((step) => step.operation === 'blur')) {
		warnings.push(EDIT_IMAGE_WARNING.blur);
	}
	if (hasIgnoredQuality(parameters)) {
		warnings.push(EDIT_IMAGE_WARNING.quality);
	}
	if (parameters.operation === 'information') {
		warnings.push(EDIT_IMAGE_WARNING.information);
	}
	if (steps.some((step) => step.operation === 'text')) {
		warnings.push(EDIT_IMAGE_WARNING.text);
	}
	if (
		steps.some(
			(step) =>
				step.operation === 'resize' &&
				(isNonPositiveDimension(step.width) || isNonPositiveDimension(step.height)),
		)
	) {
		warnings.push(EDIT_IMAGE_WARNING.resize);
	}

	return warnings;
}

/** Copies legacy Blur into Blur Radius and drops Sigma for one operation step. */
export function migrateEditImageBlurStep(step: INodeParameters): INodeParameters {
	if (step.operation !== 'blur') return step;

	const migrated: INodeParameters = { ...step };
	migrated.blurRadius = migrated.blur ?? EDIT_IMAGE_DEFAULT_BLUR_RADIUS;
	delete migrated.blur;
	delete migrated.sigma;
	return migrated;
}

/** Rewrites blur parameters on a full Edit Image parameter object. */
export function migrateEditImageParameters(parameters: INodeParameters): INodeParameters {
	if (parameters.operation === 'blur') {
		return migrateEditImageBlurStep({ ...parameters });
	}

	const migrated: INodeParameters = { ...parameters };

	if (migrated.operation === 'multiStep') {
		const operations = asParameters(migrated.operations);
		const steps = operations?.operations;
		if (operations && Array.isArray(steps)) {
			const migratedSteps: INodeParameters[] = steps.flatMap((step) => {
				const params = asParameters(step);
				return params ? [migrateEditImageBlurStep(params)] : [];
			});
			migrated.operations = {
				...operations,
				operations: migratedSteps,
			};
		}
	}

	return migrated;
}
