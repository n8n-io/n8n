import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

import { propertiesDescription } from '../description';

describe('Guardrails description', () => {
	it('describes threshold violations using at-or-above wording', () => {
		const guardrailsProperty = propertiesDescription.find(
			(property): property is INodePropertyCollection => property.name === 'guardrails',
		);
		const jailbreakOption = guardrailsProperty?.options?.find(
			(option): option is INodePropertyOptions => option.name === 'jailbreak',
		);
		const [fixedCollectionValue] = (jailbreakOption?.options ?? []) as Array<
			{ values?: INodeProperties[] } | undefined
		>;
		const fixedCollectionValues = fixedCollectionValue as
			| { values?: INodeProperties[] }
			| undefined;
		const thresholdOption = fixedCollectionValues?.values?.find(
			(property): property is INodeProperties => property.name === 'threshold',
		);

		expect(thresholdOption?.hint).toBe(
			'Flagged inputs with confidence at or above this threshold will be treated as violations',
		);
	});
});
