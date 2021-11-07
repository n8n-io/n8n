import {
	INodeProperties,
} from 'n8n-workflow';

export const transactionOperations = [
{
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	displayOptions: {
		show: {
			resource: [
			'payment',
			'revenue',
			],
		},
	},
	options: [
		{
			name: 'Create',
			value: 'create',
			description: 'Create a payment/revenue',
		},
		{
			name: 'GetAll',
			value: 'getAll',
			description: 'Get all paymnet/revenue',
		},
	],
	default: 'create',
	description: 'The operation to perform.',
},
] as INodeProperties[];

export const transactionFields = [
	{
		displayName: 'Account Name',
		name: 'account_id',
		default: '',
		placeholder: '1',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getAccounts',
		},
		displayOptions: {
			show: {
				resource: [
				'payment',
				'revenue',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Account ID',
	},
	{
		displayName: 'Category Name',
		name: 'category_id',
		default: '',
		placeholder : "1",
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCategories',
		},
		displayOptions: {
			show: {
				resource: [
				'payment',
				'revenue',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Category ID',
	},
	{
		displayName: 'Payed At',
		name: 'paid_at',
		type: 'string' ,
		default: '',
		placeholder: "2021-04-15 13:25:53",
		required: true,
		displayOptions: {
			show: {
				resource: [
				'revenue',
				'payment',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Payed At',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string' ,
		default: '',
		placeholder: "10",
		required: true,
		displayOptions: {
			show: {
				resource: [
				'payment',
				'revenue',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Amount',
	},
	{
		displayName: 'Currency Code',
		name: 'currency_code',
		type: 'string' ,
		default: '',
		placeholder: "USD",
		required: true,
		displayOptions: {
			show: {
				resource: [
				'payment',
				'revenue',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Currency Code',
	},
	{
		displayName: 'Currency Rate',
		name: 'currency_rate',
		type: 'string' ,
		default: '',
		placeholder: "1",
		required: true,
		displayOptions: {
			show: {
				resource: [
				'payment',
				'revenue',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Currency Rate',
	},
	{
		displayName: 'Payment Method',
		name: 'payment_method',
		type: 'string' ,
		default: '',
		placeholder: "cash",
		required: true,
		displayOptions: {
			show: {
				resource: [
				'revenue',
				'payment',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Reference Payment',
	},
] as INodeProperties[];
