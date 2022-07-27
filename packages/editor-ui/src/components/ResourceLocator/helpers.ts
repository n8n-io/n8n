
const RESOURCE_LOCATOR_MODE_LABEL_MAPPING: { [key: string]: string } = {
	'id': 	'parameterInput.resourceLocator.mode.id',
	'url': 	'parameterInput.resourceLocator.mode.url',
	'list': 'parameterInput.resourceLocator.mode.list',
};

export const getParameterModeLabel = (type: string) : string | null => {
	return RESOURCE_LOCATOR_MODE_LABEL_MAPPING[type] || null;
};
