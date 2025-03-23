import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeConnectionType,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { getDbConnection } from '@utils/db';
import moment = require('moment');

export class Contacts implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contact Filter Node',
		name: 'contactFilterNode',
		group: ['transform'],
		version: 1,
		description: 'Filters data based on selected Contact Email and Contact Status.',
		defaults: {
			name: 'Contact Filter Node',
			color: '#1F72E5',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Search Contact',
				name: 'search',
				type: 'string',
				placeholder: 'Search Contact by Name & Email',
				required: false,
				default: '',
				description: 'Search Contact by Name and Email.',
			},
			{
				displayName: 'Select Contact(s) Status',
				name: 'status',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactStatus',
				},
				required: false,
				default: [],
				description: 'Choose one or more contact status.',
			},
			{
				displayName: 'Select Contact(s) Priority',
				name: 'priority',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactPriority',
				},
				required: false,
				default: [],
				description: 'Choose one or more contact priority.',
			},
			{
				displayName: 'Select Contact(s) Labels',
				name: 'label',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactLabels',
				},
				required: false,
				default: [],
				description: 'Choose one or more contact labels.',
			},
			{
				displayName: 'Select Contact(s) Source',
				name: 'lead_source',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactSource',
				},
				required: false,
				default: [],
				description: 'Choose one or more contact source.',
			},
			{
				displayName: 'Select Contact(s) Type',
				name: 'type',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactType',
				},
				required: false,
				default: [],
				description: 'Choose one or more contact type.',
			},
			{
				displayName: 'Created On',
				name: 'createdOn',
				type: 'fixedCollection',
				placeholder: 'Select Date Range',
				description: 'Choose a date range for when the contact was created.',
				default: {},
				options: [
					{
						name: 'range',
						displayName: 'Date Range',
						values: [
							{
								displayName: 'From',
								name: 'from',
								type: 'dateTime',
								required: false,
								default: '',
							},
							{
								displayName: 'To',
								name: 'to',
								type: 'dateTime',
								required: false,
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Last Activity',
				name: 'lastActivity',
				type: 'fixedCollection',
				placeholder: 'Select Date Range',
				description: 'Choose a date range for the last activity of the contact.',
				default: {},
				options: [
					{
						name: 'range',
						displayName: 'Date Range',
						values: [
							{
								displayName: 'From',
								name: 'from',
								type: 'dateTime',
								required: false,
								default: '',
							},
							{
								displayName: 'To',
								name: 'to',
								type: 'dateTime',
								required: false,
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Pages',
				name: 'pages',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTotalPages',
				},
				required: false,
				default: 1,
			},
		],
	};

	methods = {
		loadOptions: {
			async getContactStatus() {
				return [
					{
						name: 'Not Contacted',
						value: 'not-contacted',
					},
					{
						name: 'Contacted',
						value: 'contacted',
					},
					{
						name: 'Call Back',
						value: 'call-back',
					},
				];
			},

			async getContactPriority() {
				return [
					{
						name: '5 Very High',
						value: 'very-high',
					},
					{
						name: '4 High',
						value: 'high',
					},
					{
						name: '3 Medium',
						value: 'medium',
					},
					{
						name: '2 Low',
						value: 'low',
					},
					{
						name: '1 Very Low',
						value: 'very-low',
					},
					{
						name: '0 Not Enough Information',
						value: 'no-enough-information',
					},
				];
			},

			async getContactLabels() {
				// const connection = await getDbConnection();
				// const [agents] = await connection.execute('SELECT id, email FROM customers_and_leads limit 30') as any[];
				// return agents.map((agent: any) => ({
				//     name: agent.email,
				//     value: agent.id,
				// }));
				return [
					{
						name: 'ITest',
						value: 1,
					},
					{
						name: 'LTest',
						value: 2,
					},
				];
			},

			async getContactSource() {
				return [
					{
						name: 'CSV',
						value: 'csv',
					},
					{
						name: 'Manual',
						value: 'manual',
					},
					{
						name: 'Sales Agent',
						value: 'sales-agent',
					},
					{
						name: 'Support Agent',
						value: 'support-agent',
					},
				];
			},

			async getContactType() {
				return [
					{
						name: 'Lead',
						value: 'lead',
					},
					{
						name: 'Customer',
						value: 'contact',
					},
				];
			},

			async getTotalPages(this: ILoadOptionsFunctions) {
				const connection = await getDbConnection();
				const { rawQuery, recordsPerPage } = generatContactQuery(this);

				const countQuery = `SELECT count(*) as totalRecords FROM (${rawQuery}) as temp`;

				const [totalResult] = (await connection.execute(countQuery)) as any[];

				const totalRecords = totalResult[0].totalRecords;
				const totalPages = Math.ceil(totalRecords / recordsPerPage);

				return Array.from({ length: totalPages }, (_, i) => ({
					name: `Page ${i + 1}`,
					value: i + 1,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const connection = await getDbConnection();
		const { rawQuery, orderBy, recordsPerPage, offset } = generatContactQuery(this);
		const query = `${rawQuery} ORDER BY ${orderBy} LIMIT ${recordsPerPage} OFFSET ${offset}`;

		// Execute Query
		const [data] = (await connection.execute(query)) as any[];

		return [this.helpers.returnJsonArray(data)];
	}
}
function generatContactQuery(node: IExecuteFunctions | ILoadOptionsFunctions) {
	const search = node.getNodeParameter('search', 0) as any;
	const status = node.getNodeParameter('status', 0) as any[];
	const priority = node.getNodeParameter('priority', 0) as any[];
	const labels = node.getNodeParameter('label', 0) as any[];
	const source = node.getNodeParameter('lead_source', 0) as any[];
	const type = node.getNodeParameter('type', 0) as any[];
	const createdOn = node.getNodeParameter('createdOn', 0, {}) as {
		range?: { from?: string; to?: string };
	};
	const lastActivity = node.getNodeParameter('lastActivity', 0, {}) as {
		range?: { from?: string; to?: string };
	};
	const currentPage = node.getNodeParameter('pages', 0) as number;

	const createdOnFrom = createdOn?.range?.from || null;
	const createdOnTo = createdOn?.range?.to || null;
	const lastActivityFrom = lastActivity?.range?.from || null;
	const lastActivityTo = lastActivity?.range?.to || null;

	const recordsPerPage = 10;

	const offset = (currentPage - 1) * recordsPerPage;

	const filters = { status, priority, label: labels, lead_source: source, type };

	const whereCondition: string[] = [];
	const havingCondition: string[] = [];

	// Search Query (Name, Email, Phone)
	if (search) {
		havingCondition.push(
			`(t1.name LIKE '%${search}%' OR t1.email LIKE '%${search}%' OR t1.phone_number LIKE '%${search}%')`,
		);
	}

	// Created On Date Range
	if (createdOn) {
		if (createdOnFrom && createdOnTo) {
			whereCondition.push(
				`t1.created_at BETWEEN "${createdOnFrom}" AND "${addDaysToDate(createdOnTo)}"`,
			);
		} else if (createdOnFrom) {
			whereCondition.push(`t1.created_at >= "${createdOnFrom}"`);
		} else if (createdOnTo) {
			whereCondition.push(`t1.created_at <= "${addDaysToDate(createdOnTo)}"`);
		}
	}

	// Last Activity Date Range
	if (lastActivity) {
		if (lastActivityFrom && lastActivityTo) {
			whereCondition.push(
				`t1.updated_at BETWEEN "${lastActivityFrom}" AND "${addDaysToDate(lastActivityTo)}"`,
			);
		} else if (lastActivityFrom) {
			whereCondition.push(`t1.updated_at >= "${lastActivityFrom}"`);
		} else if (lastActivityTo) {
			whereCondition.push(`t1.updated_at <= "${addDaysToDate(lastActivityTo)}"`);
		}
	}

	if (filters['label'] && filters['label'].length) {
		whereCondition.push(
			`cll.label_id in (${filters['label'].map((data) => `'${data}'`).join(', ')})`,
		);
	}

	if (filters['type'] && filters['type'].length) {
		whereCondition.push(`t1.type in (${filters['type'].map((data) => `'${data}'`).join(', ')})`);
	}

	if (filters['priority'] && filters['priority'].length) {
		whereCondition.push(
			`t1.priority in (${filters['priority'].map((data) => `'${data}'`).join(', ')})`,
		);
	}

	if (filters['status'] && filters['status'].length) {
		whereCondition.push(
			`t1.status in (${filters['status'].map((data) => `'${data}'`).join(', ')})`,
		);
	}

	if (filters['lead_source'] && filters['lead_source'].length) {
		whereCondition.push(
			`t1.lead_source in (${filters['lead_source'].map((data) => `'${data}'`).join(', ')})`,
		);
	}

	// Sort & Pagination
	let orderBy = `t1.updated_at DESC`;

	// Generate Query
	const rawQuery = getLeadsRawQuery(whereCondition, havingCondition);

	return { rawQuery, orderBy, recordsPerPage, offset };
}

export const getLeadsRawQuery = (whereCondition: string[] = [], havingCondition: string[] = []) => {
	return `
      SELECT 
           t1.name as Name, t1.phone_number as Phone, t1.email as Email, t1.company_name as Company, t1.job_title as "Job Title", t1.product_of_interest as "Product Interest", t1.priority as Priority, t1.updated_at as "Last Activity", t1.created_at as "Created On", t1.lead_source as Source, t1.status as "Lead Status", t1.type as Type,
          CONCAT(
              IFNULL(t1.street, ''),
              ' ',
              IFNULL(t1.city, ''),
              ' ',
              IFNULL(t1.state, ''),
              ' ',
              IFNULL(t1.country, ''),
              ' ',
              IFNULL(t1.postal_code, '')
          ) as address,
          GROUP_CONCAT(DISTINCT l.name ORDER BY l.name ASC SEPARATOR ', ') AS labels
       FROM 
          customers_and_leads t1
          LEFT JOIN customers_and_leads_labels cll on t1.id = cll.customers_and_leads_id
          LEFT JOIN labels l on cll.label_id = l.id
          LEFT JOIN JSON_TABLE(
              t1.custom_fields,
              '$[*]' COLUMNS (
                  label VARCHAR(100) PATH '$.label',
                  value VARCHAR(200) PATH '$.value'
              )
          ) AS j1 on 1 = 1
      ${whereCondition.length ? `WHERE ${whereCondition.join(' AND ')}` : ''}
      GROUP BY t1.id
      ${havingCondition.length ? `HAVING ${havingCondition.join(' AND ')}` : ''}
    `;
};

export const addDaysToDate = (date: string, daysToAdd = 1, dateFormat = 'YYYY-MM-DD') => {
	return moment(date, dateFormat).add(daysToAdd, 'days').format(dateFormat);
};
