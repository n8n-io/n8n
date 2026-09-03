import type { EventBus } from '@n8n/utils/event-bus';
import type {
	INode,
	INodeProperties,
	NodeParameterValueType,
	NodePropertyTypes,
} from 'n8n-workflow';
import type { Component } from 'vue';

/**
 * The `parameter.type` value a module claims. Deliberately the closed
 * `NodePropertyTypes` union: a key the frontend accepts but a node author cannot
 * declare would be a false surface. Widening the union later is additive.
 */
export type ParameterInputType = NodePropertyTypes;

/**
 * Props the shell passes to every contributed parameter input. The names and
 * types match what `ParameterInput.vue` already passes to its built-in
 * resource-locator branch, so an extracted component needs no adapter.
 */
export type ParameterInputProps = {
	parameter: INodeProperties;
	modelValue: NodeParameterValueType;
	path: string;
	node?: INode;
	displayTitle: string;
	isReadOnly: boolean;
	isValueExpression: boolean;
	expressionDisplayValue: string;
	expressionComputedValue: unknown;
	/** `undefined` until the async resolution of `loadOptionsDependsOn` settles. */
	dependentParametersValues?: string | null;
	/**
	 * The parameter's validation issues, for an input that wants to place them
	 * itself. The shell also draws `ParameterIssues` below the input for every
	 * type outside the resource-locator family, so an input that renders these
	 * shows them twice.
	 */
	parameterIssues: string[];
	droppable: boolean;
	eventBus?: EventBus;
};

/** Events the shell listens for on a contributed parameter input. */
export type ParameterInputEmits = {
	// Vue fixes the v-model event name; it cannot be camelCase.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:modelValue': [value: NodeParameterValueType];
	modalOpenerClick: [];
	focus: [];
	blur: [];
	drop: [value: string];
};

/**
 * Capabilities the input takes over from `ParameterInputFull` / `ParameterInputWrapper`.
 *
 * These exist because `parameter.type` drives behaviour outside the render
 * branch too — the expression toggle, the drop target and the from-AI override.
 * An input that wins only the render branch would render correctly and still get
 * the wrong capabilities. Every default keeps today's behaviour, so an input that
 * needs none of it declares nothing.
 */
export type ParameterInputCapabilities = {
	/**
	 * The input draws its own expression editor, so the shell does not swap in
	 * `ExpressionParameterInput` and does not show the expression selector for a
	 * parameter whose modes are list-only.
	 */
	ownsExpressionRendering?: boolean;
	/** The input owns the from-AI override, so the shell hides its own toggle. */
	ownsFromAiOverride?: boolean;
	/** The shell refuses drag-and-drop onto the field. */
	disableDrop?: boolean;
};

/**
 * A component the shell can drive with `ParameterInputProps`. Typing the
 * contribution against it makes the prop contract a compiler check rather than
 * a comment: a component declaring an incompatible prop is rejected at the
 * registry boundary.
 */
export type ParameterInputComponent = Component<ParameterInputProps>;

export type ParameterInputContribution = {
	/** The `parameter.type` this entry renders. Also the registry key. */
	type: ParameterInputType;
	/**
	 * Lazy on purpose: a `() => import()` keeps the module's `*.module.ts`
	 * import-light (design §5.2) and keeps the component out of the shell chunk.
	 *
	 * A bare function here is read as the loader, following `ModalDefinition`. So a
	 * functional component must be wrapped (`defineComponent(fn)`) or it is called
	 * as a loader and never renders.
	 */
	component: ParameterInputComponent | (() => Promise<ParameterInputComponent>);
	capabilities?: ParameterInputCapabilities;
};
