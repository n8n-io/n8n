import {
	TimeOffProperties,
} from '../../Interfaces';

export const timeOffGetEmployeePoliciesDescription: TimeOffProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getEmployeePolicies',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'Employee ID',
	},
];
