import { AUTHENTICATION } from '@n8n/node-sdk/host';
import {
	UnexpectedError,
	type IExecuteFunctions,
	type INodeProperties,
	type INodeType,
} from 'n8n-workflow';

/** A resource and operation of a legacy node that a contract action runs. */
export interface MigratedSlot {
	readonly resource: string;
	readonly operation: string;
	/** One version of the action's node type, from `toVersionedNodeType`. */
	readonly action: INodeType;
}

export interface MigrateVersionOptions {
	/** One version of the legacy node. It runs every slot that no contract action owns. */
	readonly legacy: INodeType;
	readonly version: number;
	readonly slots: readonly MigratedSlot[];
}

type Slot = Pick<MigratedSlot, 'resource' | 'operation'>;

const SLOT_KEYS = ['resource', 'operation'] as const;

const allows = (values: readonly unknown[] | undefined, value: string) =>
	values === undefined || values.includes(value);

/** A property can show on the slot. Conditions on other parameters are ignored. */
const showsOn = ({ displayOptions }: INodeProperties, { resource, operation }: Slot) =>
	allows(displayOptions?.show?.resource, resource) &&
	allows(displayOptions?.show?.operation, operation);

// A rule that migrate cannot read could show a legacy field on an owned slot, or hide one
// on a legacy slot.
function assertMigratable({ name, displayOptions }: INodeProperties) {
	const show = displayOptions?.show;
	if (show?.['@version'] !== undefined) {
		throw new UnexpectedError(`Cannot migrate "${name}": it shows by node version`);
	}
	const conditional = SLOT_KEYS.some((key) =>
		show?.[key]?.some((value) => typeof value === 'object' && value !== null),
	);
	if (conditional) {
		throw new UnexpectedError(`Cannot migrate "${name}": its resource or operation is a condition`);
	}
}

/** The legacy property without the owned slot. A property that shows only there goes. */
function withoutSlot(property: INodeProperties, slot: Slot): INodeProperties[] {
	const show = property.displayOptions?.show;
	if (!showsOn(property, slot) || show?.operation === undefined) return [property];
	if (show.resource?.length !== 1) {
		throw new UnexpectedError(
			`Cannot hide "${property.name}" for ${slot.resource}.${slot.operation}: it shows for more than one resource`,
		);
	}
	const operation = show.operation.filter((value) => value !== slot.operation);
	if (operation.length === 0) return [];
	return [
		{
			...property,
			displayOptions: { ...property.displayOptions, show: { ...show, operation } },
		},
	];
}

/** The operation option of the slot shows the action's name, e.g. "Get many database pages". */
function withActionLabel(property: INodeProperties, { resource, operation, action }: MigratedSlot) {
	const label = action.description.defaults.name;
	if (property.name !== 'operation' || !property.options || !label) return property;
	if (!allows(property.displayOptions?.show?.resource, resource)) return property;
	const options = property.options.map((option) =>
		'value' in option && option.value === operation ? { ...option, action: label } : option,
	);
	return { ...property, options };
}

const hasOperation = (properties: readonly INodeProperties[], { resource, operation }: Slot) =>
	properties.some(
		(property) =>
			property.name === 'operation' &&
			allows(property.displayOptions?.show?.resource, resource) &&
			property.options?.some((option) => 'value' in option && option.value === operation),
	);

/**
 * One version of a legacy node where contract actions run some resource/operation slots.
 * The legacy fields of an owned slot go, and the action's fields show for that slot only.
 * The legacy credential selector stays; the action runs with the credential that the node has.
 * The node keeps the legacy methods and adds the lookup methods of the actions.
 *
 * Field names: an action field may reuse the name of a legacy field of another slot, because
 * n8n reads the one field that shows. It must not reuse the name of a legacy field that shows
 * on its own slot, such as `resource` or `authentication`: the two would share one value.
 */
export function migrateVersion({ legacy, version, slots }: MigrateVersionOptions): INodeType {
	const legacyProperties = legacy.description.properties;
	legacyProperties.forEach(assertMigratable);
	const missing = slots.find((slot) => !hasOperation(legacyProperties, slot));
	if (missing) {
		throw new UnexpectedError(
			`${legacy.description.name} has no operation ${missing.resource}.${missing.operation}`,
		);
	}

	const kept = slots.reduce(
		(properties, slot) =>
			properties
				.flatMap((property) => withoutSlot(property, slot))
				.map((property) => withActionLabel(property, slot)),
		legacyProperties,
	);
	const actionProperties = slots.flatMap((slot) => {
		const shared = new Set(
			kept.filter((property) => showsOn(property, slot)).map(({ name }) => name),
		);
		return slot.action.description.properties
			.filter(({ name }) => name !== AUTHENTICATION)
			.map((property): INodeProperties => {
				if (shared.has(property.name)) {
					throw new UnexpectedError(
						`The field "${property.name}" of ${slot.resource}.${slot.operation} has the name of a legacy field on the same slot`,
					);
				}
				const { displayOptions } = property;
				const show = {
					...displayOptions?.show,
					resource: [slot.resource],
					operation: [slot.operation],
				};
				return { ...property, displayOptions: { ...displayOptions, show } };
			});
	});

	// The union of the credentials is the legacy list, because each action uses a subset of it.
	const credentials = legacy.description.credentials ?? [];
	const foreign = slots
		.flatMap(({ action }) => action.description.credentials ?? [])
		.find(({ name }) => !credentials.some((credential) => credential.name === name));
	if (foreign) {
		throw new UnexpectedError(
			`${legacy.description.name} has no credential ${foreign.name}, which a migrated action uses`,
		);
	}

	const run = legacy.execute;
	if (!run) throw new UnexpectedError(`${legacy.description.name} has no execute method`);
	// The resource locators and field lookups of an action call its own methods, by resource id.
	const listSearch = slots.reduce(
		(all, { action }) => ({ ...action.methods?.listSearch, ...all }),
		legacy.methods?.listSearch ?? {},
	);
	const loadOptions = slots.reduce(
		(all, { action }) => ({ ...action.methods?.loadOptions, ...all }),
		legacy.methods?.loadOptions ?? {},
	);
	const methods = slots.some(({ action }) => action.methods)
		? {
				...legacy.methods,
				...(Object.keys(listSearch).length > 0 ? { listSearch } : {}),
				...(Object.keys(loadOptions).length > 0 ? { loadOptions } : {}),
			}
		: legacy.methods;
	return {
		description: {
			...legacy.description,
			version,
			credentials,
			properties: [...kept, ...actionProperties],
		},
		methods,
		async execute(this: IExecuteFunctions) {
			// The legacy router also reads the slot of item 0.
			const resource = this.getNodeParameter('resource', 0);
			const operation = this.getNodeParameter('operation', 0);
			const owned = slots.find((slot) => slot.resource === resource && slot.operation === operation)
				?.action.execute;
			return await (owned ?? run).call(this);
		},
	};
}
