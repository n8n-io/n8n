import type { INodeProperties } from 'n8n-workflow';
import { getMappedResult, getMappedExpression } from '../mappingUtils';

const RLC_PARAM: INodeProperties = {
	displayName: 'Base',
	name: 'application',
	type: 'resourceLocator',
	default: {
		mode: 'url',
		value: '',
	},
	required: true,
	description: 'The Airtable Base in which to operate on',
	modes: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9]{2,}',
						errorMessage: 'Not a valid Airtable Base ID',
					},
				},
			],
			placeholder: 'appD3dfaeidke',
			url: '=https://airtable.com/{{$value}}',
		},
	],
};

const STRING_PARAM: INodeProperties = {
	displayName: 'Value',
	name: 'value',
	type: 'string',
	default: '',
	description: 'The string value to write in the property',
};

const SINGLE_DATA_PATH_PARAM: INodeProperties = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: 'propertyName',
	requiresDataPath: 'single',
	description:
		'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
};

const MULTIPLE_DATA_PATH_PARAM: INodeProperties = {
	displayName: 'For Everything Except',
	name: 'exceptWhenMix',
	type: 'string',
	default: '',
	placeholder: 'e.g. id, country',
	hint: 'Enter the names of the input fields as text, separated by commas',
	displayOptions: {
		show: {
			resolve: ['mix'],
		},
	},
	requiresDataPath: 'multiple',
};

const JSON_PARAM: INodeProperties = {
	displayName: 'JSON Payload',
	name: 'payloadJson',
	type: 'json',
	typeOptions: {
		alwaysOpenEditWindow: true,
		editor: 'code',
	},
	default: '',
};

const BOOLEAN_PARAM: INodeProperties = {
	displayName: 'Value',
	name: 'value',
	type: 'boolean',
	default: false,
	description: 'The boolean value to write in the property',
};

const NUMBER_PARAM: INodeProperties = {
	displayName: 'Value',
	name: 'value',
	type: 'number',
	default: 0,
	description: 'The number value to write in the property',
};

describe('Mapping Utils', () => {
	describe('getMappedResult', () => {
		it('turns empty string into expression', () => {
			expect(getMappedResult(STRING_PARAM, '{{ $json["Readable date"] }}', '')).toEqual(
				'={{ $json["Readable date"] }}',
			);
		});

		it('keeps spaces when mapping data to fixed value', () => {
			expect(getMappedResult(STRING_PARAM, '{{ $json["Readable date"] }}', '  ')).toEqual(
				'=   {{ $json["Readable date"] }}',
			);
		});

		it('sets expression when mapping to an empty expression', () => {
			expect(getMappedResult(STRING_PARAM, '{{ $json["Readable date"] }}', '=')).toEqual(
				'={{ $json["Readable date"] }}',
			);
		});

		it('keeps spaces when mapping data to expression value', () => {
			expect(getMappedResult(STRING_PARAM, '{{ $json["Readable date"] }}', '=  ')).toEqual(
				'=   {{ $json["Readable date"] }}',
			);
		});

		it('appends to string fixed value and turns into expression', () => {
			expect(getMappedResult(STRING_PARAM, '{{ $json["Readable date"] }}', 'test')).toEqual(
				'=test {{ $json["Readable date"] }}',
			);
		});

		it('appends to json fixed value', () => {
			expect(getMappedResult(JSON_PARAM, '{{ $json["Readable date"] }}', 'test')).toEqual(
				'=test {{ $json["Readable date"] }}',
			);
		});

		it('replaces number value with expression', () => {
			expect(getMappedResult(NUMBER_PARAM, '{{ $json["Readable date"] }}', 0)).toEqual(
				'={{ $json["Readable date"] }}',
			);
		});

		it('replaces boolean value with expression', () => {
			expect(getMappedResult(BOOLEAN_PARAM, '{{ $json["Readable date"] }}', false)).toEqual(
				'={{ $json["Readable date"] }}',
			);
		});

		it('appends existing expression value', () => {
			expect(
				getMappedResult(STRING_PARAM, '{{ $json["Readable date"] }}', '={{$json.test}}'),
			).toEqual('={{$json.test}} {{ $json["Readable date"] }}');
		});

		it('sets data path, replacing if expecting single path', () => {
			expect(
				getMappedResult(SINGLE_DATA_PATH_PARAM, '{{ $json["Readable date"] }}', '={{$json.test}}'),
			).toEqual('["Readable date"]');

			expect(
				getMappedResult(SINGLE_DATA_PATH_PARAM, '{{ $json.path }}', '={{$json.test}}'),
			).toEqual('path');
		});

		it('appends to existing data path, if multiple', () => {
			expect(
				getMappedResult(MULTIPLE_DATA_PATH_PARAM, '{{ $json["Readable date"] }}', 'path'),
			).toEqual('path, ["Readable date"]');
		});

		it('replaces existing dadata path if multiple and is empty expression', () => {
			expect(getMappedResult(MULTIPLE_DATA_PATH_PARAM, '{{ $json.test }}', '=')).toEqual('test');
		});

		it('handles data when dragging from grand-parent nodes', () => {
			expect(
				getMappedResult(
					MULTIPLE_DATA_PATH_PARAM,
					'{{ $node["Schedule Trigger"].json["Day of week"] }}',
					'',
				),
			).toEqual('={{ $node["Schedule Trigger"].json["Day of week"] }}');

			expect(
				getMappedResult(
					SINGLE_DATA_PATH_PARAM,
					'{{ $node["Schedule Trigger"].json["Day of week"] }}',
					'=data',
				),
			).toEqual('=data {{ $node["Schedule Trigger"].json["Day of week"] }}');

			expect(
				getMappedResult(
					SINGLE_DATA_PATH_PARAM,
					'{{ $node["Schedule Trigger"].json["Day of week"] }}',
					'=   ',
				),
			).toEqual('=    {{ $node["Schedule Trigger"].json["Day of week"] }}');
		});

		it('handles RLC values', () => {
			expect(getMappedResult(RLC_PARAM, '{{ test }}', '')).toEqual('={{ test }}');
			expect(getMappedResult(RLC_PARAM, '{{ test }}', '=')).toEqual('={{ test }}');
			expect(getMappedResult(RLC_PARAM, '{{ test }}', '=test')).toEqual('=test {{ test }}');
		});
	});
	describe('getMappedExpression', () => {
		it('should generate a mapped expression with simple array path', () => {
			const input = {
				nodeName: 'nodeName',
				distanceFromActive: 2,
				path: ['sample', 'path'],
			};
			const result = getMappedExpression(input);
			expect(result).toBe('{{ $node.nodeName.json.sample.path }}');
		});

		it('should generate a mapped expression with mixed array path', () => {
			const input = {
				nodeName: 'nodeName',
				distanceFromActive: 2,
				path: ['sample', 0, 'path'],
			};
			const result = getMappedExpression(input);
			expect(result).toBe('{{ $node.nodeName.json.sample[0].path }}');
		});

		it('should generate a mapped expression with special characters in array path', () => {
			const input = {
				nodeName: 'nodeName',
				distanceFromActive: 2,
				path: ['sample', 'path with-space', 'path-with-hyphen'],
			};
			const result = getMappedExpression(input);
			expect(result).toBe(
				"{{ $node.nodeName.json.sample['path with-space']['path-with-hyphen'] }}",
			);
		});

		it('should handle paths with special characters', () => {
			const input = {
				nodeName: 'nodeName',
				distanceFromActive: 2,
				path: [
					'sample',
					'"Execute"',
					'`Execute`',
					"'Execute'",
					'[Execute]',
					'{Execute}',
					'execute?',
					'test,',
					'test:',
					'path.',
				],
			};
			const result = getMappedExpression(input);
			expect(result).toBe(
				"{{ $node.nodeName.json.sample['\"Execute\"']['`Execute`']['\\'Execute\\'']['[Execute]']['{Execute}']['execute?']['test,']['test:']['path.'] }}",
			);
		});

		it('should generate a mapped expression with various path elements', () => {
			const input = {
				nodeName: 'nodeName',
				distanceFromActive: 1,
				path: ['propertyName', 'capitalizedName', 'hyphen-prop'],
			};
			const result = getMappedExpression(input);
			expect(result).toBe("{{ $json.propertyName.capitalizedName['hyphen-prop'] }}");
		});

		it('should generate a mapped expression with a complex path', () => {
			const input = {
				nodeName: 'nodeName',
				distanceFromActive: 1,
				path: ['propertyName', 'capitalizedName', 'stringVal', 'some-value', 'capitalizedProp'],
			};
			const result = getMappedExpression(input);
			expect(result).toBe(
				"{{ $json.propertyName.capitalizedName.stringVal['some-value'].capitalizedProp }}",
			);
		});
	});
});
