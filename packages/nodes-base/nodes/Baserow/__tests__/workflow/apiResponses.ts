export const fieldsResponse = [
	{
		id: 3799030,
		table_id: 482710,
		name: 'Name',
		order: 0,
		type: 'text',
		primary: true,
		read_only: false,
		immutable_type: false,
		immutable_properties: false,
		description: null,
		text_default: '',
	},
	{
		id: 3799031,
		table_id: 482710,
		name: 'Notes',
		order: 1,
		type: 'long_text',
		primary: false,
		read_only: false,
		immutable_type: false,
		immutable_properties: false,
		description: null,
		long_text_enable_rich_text: false,
	},
	{
		id: 3799032,
		table_id: 482710,
		name: 'Active',
		order: 2,
		type: 'boolean',
		primary: false,
		read_only: false,
		immutable_type: false,
		immutable_properties: false,
		description: null,
	},
];
export const getResponse = {
	id: 1,
	order: '1.00000000000000000000',
	field_3799030: 'Foo',
	field_3799031: 'bar',
	field_3799032: false,
};

export const getAllResponse = {
	count: 2,
	next: null,
	previous: null,
	results: [
		{
			id: 1,
			order: '1.00000000000000000000',
			field_3799030: 'Foo',
			field_3799031: 'bar',
			field_3799032: false,
		},
		{
			id: 2,
			order: '2.00000000000000000000',
			field_3799030: 'Bar',
			field_3799031: 'foo',
			field_3799032: true,
		},
	],
};

export const createResponse = {
	id: 3,
	order: '3.00000000000000000000',
	field_3799030: 'Nathan',
	field_3799031: 'testing',
	field_3799032: false,
};

export const updateResponse = {
	id: 3,
	order: '3.00000000000000000000',
	field_3799030: 'Nathan',
	field_3799031: 'testing',
	field_3799032: true,
};
