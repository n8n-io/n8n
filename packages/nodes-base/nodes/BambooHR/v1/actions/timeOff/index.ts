import * as adjustTime from './adjustTime';
import * as assign from './assign';
import * as changeStatus from './changeStatus';
import * as createHistory from './createHistory';
import * as createRequest from './createRequest';
import * as estimateFutureTime from './estimateFutureTime';
import * as getEmployeeOut from './getEmployeeOut';
import * as getEmployeePolicies from './getEmployeePolicies';
import * as getAllPolicies from './getAllPolicies';
import * as getRequests from './getRequests';
import * as getTypes from './getTypes';


import { INodeProperties } from 'n8n-workflow';

export {
	adjustTime,
	assign,
	changeStatus,
	createHistory,
	createRequest,
	estimateFutureTime,
	getEmployeeOut,
	getEmployeePolicies,
	getAllPolicies,
	getRequests,
	getTypes
};


export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'timeOff',
				],
			},
		},
		options: [
			{
				name: 'Adjust Time',
				value: 'adjustTime',
				description: 'Adjust Time Off Balance',
			},
			{
				name: 'Assign',
				value: 'assign',
				description: 'Assign Time Off Policies for an Employee',
			},
			{
				name: 'Change Status',
				value: 'changeStatus',
				description: 'Change a Request Status',
			},
			{
				name: 'Create History',
				value: 'createHistory',
				description: 'Add a Time Off History Item For Time Off Request',
			},
			{
				name: 'Create Request',
				value: 'createRequest',
				description: 'Add a Time Off Request',
			},
			{
				name: 'Estimate Future Time',
				value: 'estimateFutureTime',
				description: 'Estimate Future Time Off Balances',
			},
			{
				name: 'Get Employee Out',
				value: 'getEmployeeOut',
				description: 'Get a list of employees who will be out, and company holidays, for a period of time',
			},
			{
				name: 'Get Employee Policies',
				value: 'getEmployeePolicies',
				description: 'List Time Off Policies for Employee',
			},
			{
				name: 'Get All Policies',
				value: 'getAllPolicies',
				description: 'Get Time Off Policies',
			},
			{
				name: 'Get Requests',
				value: 'getRequests',
				description: 'Get Time Off Requests',
			},
			{
				name: 'Get Types',
				value: 'getTypes',
				description: 'Get Time Off Types',
			},
		],
		default: 'create',
	},
	...adjustTime.description,
	...assign.description,
	...changeStatus.description,
	...createHistory.description,
	...createRequest.description,
	...estimateFutureTime.description,
	...getEmployeeOut.description,
	...getEmployeePolicies.description,
	...getAllPolicies.description,
	...getRequests.description,
	...getTypes.description,
];
