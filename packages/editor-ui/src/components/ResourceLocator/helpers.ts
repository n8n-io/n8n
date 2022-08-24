import {
	INodeProperties,
	INodePropertyMode,
	INodePropertyModeValidation,
	INodePropertyRegexValidation,
} from 'n8n-workflow';

const RESOURCE_LOCATOR_MODE_LABEL_MAPPING: { [key: string]: string } = {
	'id': 	'resourceLocator.mode.id',
	'url': 	'resourceLocator.mode.url',
	'list': 'resourceLocator.mode.list',
};

export const getParameterModeLabel = (type: string) : string | null => {
	return RESOURCE_LOCATOR_MODE_LABEL_MAPPING[type] || null;
};

// Validates resource locator node parameters based on validation ruled defined in each parameter mode
export const validateResourceLocatorParameter = (displayValue: string, parameterMode: INodePropertyMode) : string[] => {
	const validationErrors: string[] = [];
	// Each mode can have multiple validations specified
	if (parameterMode.validation) {
		for (const validation of parameterMode.validation) {
			// Currently only regex validation is supported on the front-end
			if (validation && (validation as INodePropertyModeValidation).type === 'regex') {
				const regexValidation = validation as INodePropertyRegexValidation;
				const regex = new RegExp(`^${regexValidation.properties.regex}$`);

				if (!regex.test(displayValue)) {
					validationErrors.push(regexValidation.properties.errorMessage);
				}
			}
		}
	}

	return validationErrors;
};

export const hasOnlyListMode = (parameter: INodeProperties) : boolean => {
	return parameter.modes !== undefined && parameter.modes.length === 1 && parameter.modes[0].name === 'list';
};
