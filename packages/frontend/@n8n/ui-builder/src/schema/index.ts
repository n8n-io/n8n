/**
 * The definition format on its own: no Vue, no n8n, nothing to render with.
 *
 * Exposed as `@n8n/ui-builder/schema` so the node can validate what it is about
 * to serve and the workflow SDK can generate the authoring types, neither of
 * which can load the renderer.
 */
export {
	UI_KIT_SPEC,
	getComponentSpec,
	specFor,
	regionNamesOf,
} from './kit-spec';

export {
	validateUiDefinition,
	isUiDefinition,
	formatUiDefinitionIssues,
	isExpression,
	type UiDefinitionIssue,
} from './validate';

export { uiDefinitionTypeSource } from './codegen';

export {
	ACTION_PROP_TYPE,
	DEFAULT_REGION,
	ROUTE_PROP_TYPE,
	STATE_PATH_PROP_TYPE,
	type UiAction,
	type UiActionError,
	type UiActionRequest,
	type UiActionStep,
	type UiComponentSpec,
	type UiNavigateStep,
	type UiNode,
	type UiNotifyStep,
	type UiPageInfo,
	type UiProperty,
	type UiPropertyDefault,
	type UiPropertyType,
	type UiRegion,
	type UiResponseBinding,
	type UiRoute,
	type UiScope,
	type UiSetStep,
	type UiState,
	type UiToast,
	type UiTree,
	type UiValuePropertyType,
	type UiWebhookStep,
} from './types';
