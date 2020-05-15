import { INodeProperties } from "n8n-workflow";

export const adInsightsOperations = [
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'insightsReport'
				]
			}
		},
		options: [
			{
				name: 'Ad',
				value: 'ad'
			},
			{
				name: 'Ad Account',
				value: 'adAccount'
			},
			{
				name: 'Ad Campaign',
				value: 'adCampaign'
			},
			{
				name: 'Ad Set',
				value: 'adSet'
			}
		],
		default: 'ad',
		description: 'The description text',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				type: [
					'adAccount', 'adCampaign', 'adSet', 'ad'
				],
			},
		},
		options: [
            {
				name: 'Create',
				value: 'create',
				description: 'Create a insights report run.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an insights report.',
            }
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const adInsightsFields = [

/* -------------------------------------------------------------------------- */
/*                                ad*:get/create                      		  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ad ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				type: [
					'ad'
				],
				operation: [
					'create'
				]
			},
		},
		description: 'ID of ad account to get.',
	},
	{
		displayName: 'Ad set ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				type: [
					'adAccount', 'adCampaign', 'adSet', 'ad'
				],
				operation: [
					'get'
				]
			},
		},
		description: 'ID of ad account to get.',
	},
	{
		displayName: 'Ad set ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				type: [
					'adSet'
				],
				operation: [
					'create'
				]
			},
		},
		description: 'Set ad ID to create report from.',
	},
	{
		displayName: 'Campaign ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				type: [
					'adAccount', 'adCampaign'
				],
				operation: [
					'create'
				]
			},
		},
		description: 'ID of ad account to',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: 'Insert JSON data instead of manual parameter selection.',
		displayOptions: {
			show: {
				resource: [
					'insightsReport'
				],
				type: [
					'ad', 'adAccount', 'adCampaign', 'adSet'
				],
				operation: [
					'create', 'get'
				]
			}
		}
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true
		},
		default: '',
		displayOptions: {
			show: {
				type: [
					'ad', 'adAccount', 'adCampaign', 'adSet'
				],
				operation: [
					'create', 'get'
				],
				jsonParameters: [
					true,
				]
			}
		}
	},
    {
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				type: [
					'ad', 'adAccount', 'adCampaign', 'adSet'
				],
				operation: [
					'create', 'get'
				],
				jsonParameters: [
					false,
				]
			},
		},
		options: [
			{
				displayName: 'Action Attribution Windows',
				name: 'actionAttributionWindows',
                type: 'fixedCollection',
                default: 'properties',
                description: 'Determines what is the attribution window for the actions.',
				options: [
                    {
                        displayName: 'Properties',
                        name: 'properties',
                        values: [
                            {
                                displayName: 'View',
                                name: 'view',
                                type: 'options',
                                required: true,
                                default: '1d_view',
                                description: 'Determines the scope of which insights are returned to you. I.e: 1 day will return all actions that happened 1 day after someone viewed the ad.',
                                options: [
                                    {
                                        name: '1 Day',
                                        value: '1d_view'
                                    },
                                    {
                                        name: '7 Days',
                                        value: '1d_view'
                                    },
                                    {
                                        name: '28 Days',
                                        value: '1d_view'
                                    },
                                ]
                            },
                            {
                                displayName: 'Click',
                                name: 'click',
                                type: 'options',
                                required: true,
                                default: '1d_click',
                                description: 'Determines the scope of which insights are returned to you. I.e: 1 day will return all actions that happened 1 day after someone clicked the ad.',
                                options: [
                                    {
                                        name: '1 Day',
                                        value: '1d_click'
                                    },
                                    {
                                        name: '7 Days',
                                        value: '7d_click'
                                    },
                                    {
                                        name: '28 Days',
                                        value: '28d_click'
                                    },
                                ]
                            },
                            
                        ]
                    },
                    
				],
			},
			{
				displayName: 'Action Breakdowns',
				name: 'actionBreakdowns',
				type: 'fixedCollection',
				default: 'breakdowns',
				description: 'How to break down action results. Supports more than one breakdowns.',
				options: [
					{
						displayName: 'Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Breakdowns',
								name: 'breakdowns',
								type: 'options',
								default: 'action_type',
								typeOptions: {
									multipleValues: true
								},
								options: [
									{
										name: 'Action Device',
										value: 'action_device'
									},
									{
										name: 'Action Canvas Component',
										value: 'action_canvas_component_name'
									},
									{
										name: 'Action Carousel Card ID',
										value: 'action_carousel_card_id'
									},
									{
										name: 'Action Carousel Card Name',
										value: 'action_carousel_card_name'
									},
									{
										name: 'Action Destination',
										value: 'action_destination'
									},
									{
										name: 'Action Reaction',
										value: 'action_reaction'
									},
									{
										name: 'Action Target ID',
										value: 'action_target_id'
									},
									{
										name: 'Action Type',
										value: 'action_type'
									},
									{
										name: 'Action Video Sound',
										value: 'action_video_sound'
									},
									{
										name: 'Action Video Type',
										value: 'action_video_type'
									},
								]
							}
						]
					}
				]
			},
			{
				displayName: 'Action Report Time',
				name: 'actionReportTime',
				type: 'options',
				description: 'Determines the report time of action stats. For example, if a person saw the ad on Jan 1st but converted on Jan 2nd, when you select impression, you see a conversion on Jan 1st. When you select conversion, you see a conversion on Jan 2nd.',
				default: 'impression',
				options: [
					{
						name: 'Impression',
						value: 'impression'
					},
					{
						name: 'Conversion',
						value: 'conversion'
					}
				]
			},
			{
				displayName: 'Breakdowns',
				name: 'breakdowns',
				type: 'string',
				description: 'Comma separated items to dictate how results are broken down. For more than one breakdown, only certain combinations are available: https://developers.facebook.com/docs/marketing-api/insights/breakdowns#combiningbreakdowns .',
				placeholder: 'age'
			},
			{
				displayName: 'Date Preset',
				name: 'datePreset',
				type: 'options',
				description: 'Represents a relative time range. This field is ignored if Time Range or Time Ranges is specified.',
				default: 'today',
				options: [
					{
						name: 'Today',
						value: 'today'
					},
					{
						name: 'Yesterday',
						value: 'yesterday'
					},
					{
						name: 'This Month',
						value: 'this_month'
					},
					{
						name: 'Last Month',
						value: 'last_month'
					},
					{
						name: 'This Quarter',
						value: 'this_quarter'
					},
					{
						name: 'Lifetime',
						value: 'lifetime'
					},
					{
						name: 'Last 3 Days',
						value: 'last_3d'
					},
					{
						name: 'Last 7 Days',
						value: 'last_7d'
					},
					{
						name: 'Last 14 Days',
						value: 'last_14d'
					},
					{
						name: 'Last 28 Days',
						value: 'last_28d'
					},
					{
						name: 'Last 30 Days',
						value: 'last_30d'
					},
					{
						name: 'Last 90 Days',
						value: 'last_90d'
					},
					{
						name: 'Last Week (Mon-Sun)',
						value: 'last_week_mon_sun'
					},
					{
						name: 'Last Week (Sun-Sat)',
						value: 'last_week_sun_sat'
					},
					{
						name: 'Last Quarter',
						value: 'last_quarter'
					},
					{
						name: 'Last Year',
						value: 'last_year'
					},
					{
						name: 'This Week (Mon-Today)',
						value: 'this_week_mon_today'
					},
					{
						name: 'This Week (Sun-Today)',
						value: 'this_week_sun_today'
					},
					{
						name: 'This Year',
						value: 'this_year'
					},
				]
			},
			{
				displayName: 'Default Summary',
				name: 'defaultSummary',
				type: 'boolean',
				default: false,
				description: 'Determine whether to return a summary. If summary is set, this param is be ignored; otherwise, a summary section with the same fields as specified by fields will be included in the summary section.',
			},
			{
				displayName: 'Export Columns',
				name: 'exportColumns',
				type: 'string',
				default: '',
				description: 'Comma separated fields on the exporting report file. It is an optional param. Exporting columns are equal to the param fields, if you leave this param blank.',
				placeholder: 'column1,column2'
			},
			{
				displayName: 'Export Format',
				name: 'exportFormat',
				type: 'options',
				description: 'Set the format of exporting report file. If the export_format is set, Report file is asyncrhonizely generated.',
				default: 'csv',
				options: [
					{
						name: 'CSV',
						value: 'csv'
					},
					{
						name: 'XLS',
						value: 'xls'
					}
				]
			},
			{
				displayName: 'Export Name',
				name: 'exportName',
				type: 'string',
				default: '',
				description: 'Set the file name of the exporting report.',
				placeholder: 'reportfile',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma separated fields to be retrieved. Default behavior is to return impressions and spend.',
				placeholder: 'field1,field2,field3',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				description: 'Filters on the report data. This parameter is an array of filter objects.',
				typeOptions: {
					multipleValues: true
				},
				options: [
					{
						displayName: 'Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								placeholder: 'Field',
								required: true
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'EQUAL',
								options: [
									{
										name: 'Equal',
										value: 'EQUAL'
									},
									{
										name: 'Not Equal',
										value: 'NOT_EQUAL'
									},
									{
										name: 'Greater Than',
										value: 'GREATER_THAN'
									},
									{
										name: 'Greater Than or Equal',
										value: 'GREATER_THAN_OR_EQUAL'
									},
									{
										name: 'Less Than',
										value: 'LESS_THAN'
									},
									{
										name: 'Less Than or Equal',
										value: 'LESS_THAN_OR_EQUAL'
									},
									{
										name: 'In Range',
										value: 'IN_RANGE'
									},
									{
										name: 'Not in Range',
										value: 'NOT_IN_RANGE'
									},
									{
										name: 'Contain',
										value: 'CONTAIN'
									},
									{
										name: 'Not Contain',
										value: 'NOT_CONTAIN'
									},
									{
										name: 'In',
										value: 'IN'
									},
									{
										name: 'Not In',
										value: 'NOT_IN'
									},
									{
										name: 'Starts With',
										value: 'STARTS_WITH'
									},
									{
										name: 'Any',
										value: 'ANY'
									},
									{
										name: 'All',
										value: 'ALL'
									},
									{
										name: 'After',
										value: 'AFTER'
									},
									{
										name: 'Before',
										value: 'BEFORE'
									},
									{
										name: 'On or After',
										value: 'ON_OR_AFTER'
									},
									{
										name: 'On or Before',
										value: 'ON_OR_BEFORE'
									},
									{
										name: 'None',
										value: 'NONE'
									},
								]
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'Value',
								required: true
							},
						]
					}
				]
			},
			{
				displayName: 'Level',
				name: 'level',
				type: 'options',
				description: 'Represents the level of result.',
				default: 'ad',
				options: [
					{
						name: 'Ad',
						value: 'ad'
					},
					{
						name: 'Adset',
						value: 'adset'
					},
					{
						name: 'Campaign',
						value: 'campaign'
					},
					{
						name: 'Account',
						value: 'account'
					},
				]
			},
			{
				displayName: 'Product ID Limit',
				name: 'productIdLimit',
				type: 'number',
				default: 10,
				description: 'Maximum number of product ids to be returned for each ad when breakdown by product_id.',
				typeOptions: {
					minValue: 0
				}
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'fixedCollection',
				default: 'properties',
				description: 'Field to sort the result, and direction of sorting.',
				options: [
					{
						displayName: 'Sort Options',
						name: 'properties',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'field',
								description: 'Type of item being sorted.',
								required: true,
								options: [
									{
										name: 'Field',
										value: 'field'
									},
									{
										name: 'Action',
										value: 'action'
									}
								]
							},
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description: 'Field name.',
								placeholder: 'Field',
								required: true
							},
							{
								displayName: 'Order',
								name: 'order',
								type: 'options',
								default: 'ascending',
								description: 'Sort order.',
								required: true,
								options: [
									{
										name: 'Ascending',
										value: 'ascending'
									},
									{
										name: 'Descending',
										value: 'descending'
									}
								]
							}
						]
					}
				]
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				description: 'If this param is used, a summary section will be included, with the comma separated fields listed in this param.',
				placeholder: 'field1,field2,field3',
			},
			{
				displayName: 'Summary Action Breakdowns',
				name: 'summaryActionBreakdowns',
				type: 'fixedCollection',
				default: 'breakdowns',
				description: 'How to break down summary action results. Supports more than one breakdowns.',
				options: [
					{
						displayName: 'Breakdown Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Breakdowns',
								name: 'breakdowns',
								type: 'options',
								default: 'action_type',
								typeOptions: {
									multipleValues: true
								},
								options: [
									{
										name: 'Action Device',
										value: 'action_device'
									},
									{
										name: 'Action Canvas Component',
										value: 'action_canvas_component_name'
									},
									{
										name: 'Action Carousel Card ID',
										value: 'action_carousel_card_id'
									},
									{
										name: 'Action Carousel Card Name',
										value: 'action_carousel_card_name'
									},
									{
										name: 'Action Destination',
										value: 'action_destination'
									},
									{
										name: 'Action Reaction',
										value: 'action_reaction'
									},
									{
										name: 'Action Target ID',
										value: 'action_target_id'
									},
									{
										name: 'Action Type',
										value: 'action_type'
									},
									{
										name: 'Action Video Sound',
										value: 'action_video_sound'
									},
									{
										name: 'Action Video Type',
										value: 'action_video_type'
									},
								]
							}
						]
					}
				]
			},
			{
				displayName: 'Time Increment',
				name: 'timeIncrement',
				type: 'fixedCollection',
				default: 'properties',
				description: 'If it is an integer, it is the number of days from 1 to 90. After you pick a reporting period by using time_range or date_preset, you may choose to have the results for the whole period, or have results for smaller time slices. If "all_days" is used, it means one result set for the whole period. If "monthly" is used, you will get one result set for each calendar month in the given period. Or you can have one result set for each N-day period specified by this param. This param is ignored if time_ranges is specified.',
				options: [
					{
						displayName: 'Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Custom',
								name: 'custom',
								type: 'boolean',
								default: false,
								description: 'Determines if to use pre-defined options or set custom amount of days.',
							},
							{
								displayName: 'Increment',
								name: 'increment',
								type: 'options',
								default: 'all_days',
								description: 'If it is an integer, it is the number of days from 1 to 90. After you pick a reporting period by using time_range or date_preset, you may choose to have the results for the whole period, or have results for smaller time slices. If "all_days" is used, it means one result set for the whole period. If "monthly" is used, you will get one result set for each calendar month in the given period. Or you can have one result set for each N-day period specified by this param. This param is ignored if time_ranges is specified.',
								displayOptions: {
									show: {
										custom: [
											false
										]
									}
								},
								options: [
									{
										name: 'All Days',
										value: 'all_days'
									},
									{
										name: 'Monthly',
										value: 'monthly'
									},
								]
							},
							{
								displayName: 'Set days',
								name: 'setDays',
								type: 'number',
								default: 30,
								description: 'Integer between 1 and 90 to determine increment.',
								displayOptions: {
									show: {
										custom: [
											true
										]
									}
								},
								typeOptions: {
									minValue: 1,
									maxValue: 90
								}

							},
						]
					}
				]
			},
			{
				displayName: 'Time Range',
				name: 'timeRange',
				type: 'fixedCollection',
				default: 'properties',
				description: 'A single time range object. This param is ignored if time_ranges is provided.',
				options: [
					{
						displayName: 'Time Range Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Since',
								name: 'since',
								type: 'dateTime',
								default: '',
								description: 'A date in the format of "YYYY-MM-DD", which means from the beginning midnight of that day.',
								required: true
							},
							{
								displayName: 'Until',
								name: 'until',
								type: 'dateTime',
								default: '',
								description: 'A date in the format of "YYYY-MM-DD", which means to the beginning midnight of the following day.',
								required: true
							},
						]
					}
				]
			},
			{
				displayName: 'Time Ranges',
				name: 'timeRanges',
				type: 'fixedCollection',
				default: 'properties',
				description: 'Array of time range objects. Time ranges can overlap, for example to return cumulative insights. Each time range will have one result set. You cannot have more granular results with time_increment setting in this case.If time_ranges is specified, date_preset, time_range and time_increment are ignored.',
				typeOptions: {
					multipleValues: true
				},
				options: [
					{
						displayName: 'Time Range Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Since',
								name: 'since',
								type: 'dateTime',
								default: '',
								description: 'A date in the format of "YYYY-MM-DD", which means from the beginning midnight of that day.',
								required: true
							},
							{
								displayName: 'Until',
								name: 'until',
								type: 'dateTime',
								default: '',
								description: 'A date in the format of "YYYY-MM-DD", which means to the beginning midnight of the following day.',
								required: true
							},
						]
					}
				]
			},
			{
				displayName: 'Use Account Attribution Setting',
				name: 'useAccountAttributionSetting',
				type: 'boolean',
				default: false,
				description: 'When this parameter is set to true, your ads results will be shown using the attribution settings defined for the ad account.',
			},
        ]
	},
] as INodeProperties[];
