import type { DataTableFilter, IDataTableProjectService, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { SoftmaxModel } from './classifier';

export const CLASSIFIERS_TABLE = 'learning_switch_classifiers';

export type InputType = 'text' | 'image';

export type StoredClassifier = SoftmaxModel & {
	inputType: InputType;
	embeddingModel: string;
	classes: string[];
	exampleCount: number;
	trainedAt: string;
};

const isNumberArray = (value: unknown): value is number[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'number');

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');

function isStoredClassifier(value: unknown): value is StoredClassifier {
	if (typeof value !== 'object' || value === null) return false;
	const candidate: Record<string, unknown> = { ...value };
	return (
		(candidate.inputType === 'text' || candidate.inputType === 'image') &&
		typeof candidate.embeddingModel === 'string' &&
		isStringArray(candidate.classes) &&
		isNumberArray(candidate.bias) &&
		Array.isArray(candidate.weights) &&
		candidate.weights.every(isNumberArray) &&
		typeof candidate.scale === 'number' &&
		(candidate.center === undefined || isNumberArray(candidate.center))
	);
}

const byName = (name: string): DataTableFilter => ({
	type: 'and',
	filters: [{ columnName: 'name', condition: 'eq', value: name }],
});

async function getTable(
	ctx: IExecuteFunctions,
	{ create }: { create: boolean },
): Promise<IDataTableProjectService | undefined> {
	const { getDataTableAggregateProxy, getDataTableProxy } = ctx.helpers;
	if (!getDataTableAggregateProxy || !getDataTableProxy) {
		throw new NodeOperationError(ctx.getNode(), 'Data tables are not available on this instance');
	}

	const aggregate = await getDataTableAggregateProxy();
	const { data } = await aggregate.getManyAndCount({ filter: { name: CLASSIFIERS_TABLE } });
	const existing = data.find((table) => table.name === CLASSIFIERS_TABLE);
	if (existing) return await getDataTableProxy(existing.id);
	if (!create) return undefined;

	const table = await aggregate.createDataTable({
		name: CLASSIFIERS_TABLE,
		columns: [
			{ name: 'name', type: 'string' },
			{ name: 'classifier', type: 'string' },
		],
	});
	return await getDataTableProxy(table.id);
}

export async function saveClassifier(
	ctx: IExecuteFunctions,
	name: string,
	classifier: StoredClassifier,
): Promise<void> {
	const table = await getTable(ctx, { create: true });
	await table?.upsertRow({
		filter: byName(name),
		data: { name, classifier: JSON.stringify(classifier) },
	});
}

export async function loadClassifier(
	ctx: IExecuteFunctions,
	name: string,
): Promise<StoredClassifier> {
	const notFound = new NodeOperationError(ctx.getNode(), `No trained classifier "${name}"`, {
		description: `Run this node with the Train operation first. Trained classifiers are in the "${CLASSIFIERS_TABLE}" data table.`,
	});

	const table = await getTable(ctx, { create: false });
	if (!table) throw notFound;

	const { data } = await table.getManyRowsAndCount({ filter: byName(name), take: 1 });
	const serialized = data[0]?.classifier;
	if (typeof serialized !== 'string') throw notFound;

	const parsed: unknown = JSON.parse(serialized);
	if (!isStoredClassifier(parsed)) {
		throw new NodeOperationError(ctx.getNode(), `The stored classifier "${name}" is not valid`, {
			description: 'Train it again to replace the stored data.',
		});
	}
	return parsed;
}
