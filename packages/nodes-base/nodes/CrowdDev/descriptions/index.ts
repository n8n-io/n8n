import type { INodeProperties } from 'n8n-workflow';
import { resources } from './resources';
import { activityOperations, activityFields } from './activityFields';
import { memberFields, memberOperations } from './memberFields';
import { noteFields, noteOperations } from './noteFields';
import { organizationFields, organizationOperations } from './organizationFields';
import { taskFields, taskOperations } from './taskFields';
import { automationFields, automationOperations } from './automationFields';

export const allProperties: INodeProperties[] = [
	resources,
	activityOperations,
	memberOperations,
	noteOperations,
	organizationOperations,
	taskOperations,
	automationOperations,
	...activityFields,
	...memberFields,
	...noteFields,
	...organizationFields,
	...taskFields,
	...automationFields,
];
